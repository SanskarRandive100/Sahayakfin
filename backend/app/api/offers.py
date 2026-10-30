from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import finance, scoring
from app.db import get_db
from app.finance.offers import default_tenure
from app.errors import AppError
from app.models import Lender, Loan, Offer, Product, Repayment, User
from app.schemas import AcceptIn
from app.security.deps import current_user
from app.services import clock
from app.services.audit import audit
from app.services.reminders import loan_out
from app.services.scoring_service import _jsonable, latest_run
from app.services.txn_store import load_txns

router = APIRouter(tags=["offers"])

MAX_REQUEST_PAISE = 10_000_000  # ₹1,00,000


def lender_dict(l: Lender) -> dict:
    return {"id": l.id, "name": l.name, "min_band": l.min_band, "min_weeks": l.min_weeks,
            "max_amount_paise": l.max_amount_paise}


def product_dict(p: Product, lender: Lender | None) -> dict:
    max_paise = p.max_paise
    if lender is not None and lender.max_amount_paise:
        max_paise = min(max_paise, lender.max_amount_paise)  # the lender's current rule caps the product
    return {"id": p.id, "lender_id": p.lender_id, "kind": p.kind, "name": p.name, "min_paise": p.min_paise,
            "max_paise": max_paise, "rate_pct": p.rate_pct, "fee_pct": p.fee_pct, "tenures": list(p.tenures or [])}


def insurance_out(p: Product) -> dict:
    return {"id": p.id, "name": p.name, "provider": p.provider, "premium_paise": p.premium_paise,
            "premium_period": p.premium_period, "cover_paise": p.cover_paise,
            "is_govt_scheme": p.is_govt_scheme, "demo": True}


def market(db: Session) -> tuple[list[dict], list[dict]]:
    lenders = db.query(Lender).order_by(Lender.name).all()
    by_id = {l.id: l for l in lenders}
    products = [product_dict(p, by_id.get(p.lender_id))
                for p in db.query(Product).filter(Product.kind == "LOAN").order_by(Product.name)]
    return [lender_dict(l) for l in lenders], products


def _date(v) -> date:
    return v if isinstance(v, date) else date.fromisoformat(str(v))


@router.get("/offers")
def get_offers(requested_paise: int = Query(1_000_000), user: User = Depends(current_user),
               db: Session = Depends(get_db)):
    if requested_paise <= 0 or requested_paise > MAX_REQUEST_PAISE:
        raise AppError("VALIDATION_ERROR", 422, "Amount must be between ₹1 and ₹1,00,000.")
    run = latest_run(db, user.id)
    txns = load_txns(db, user.id)
    if run is None or not txns:
        raise AppError("NO_SCORE")
    afford = scoring.affordability(txns)
    lenders, products = market(db)
    matched = finance.match_offers(run.result, afford, lenders, products, requested_paise)

    loans = []
    for o in matched:
        # Reuse an unchanged unaccepted quote so refreshes preserve IDs and do not grow the table.
        candidates = db.query(Offer).filter(
            Offer.user_id == user.id, Offer.product_id == o["product_id"], Offer.score_run_id == run.id,
            Offer.requested_paise == requested_paise, Offer.status == "OFFERED",
            Offer.amount_paise == int(o["amount_paise"]), Offer.weeks == int(o["weeks"]),
            Offer.eligible == o["eligible"]).order_by(Offer.created_at.desc()).all()
        quote = _jsonable(o["kfs"])
        row = next((candidate for candidate in candidates if candidate.kfs == quote), None)
        if row is None:
            row = Offer(user_id=user.id, product_id=o["product_id"], score_run_id=run.id,
                        amount_paise=int(o["amount_paise"]), requested_paise=requested_paise, weeks=int(o["weeks"]),
                        kfs=quote, eligible=o["eligible"], status="OFFERED")
            db.add(row)
            db.flush()
        loans.append(_jsonable({"id": row.id, **o}))
    db.commit()

    insurance = [insurance_out(p) for p in db.query(Product).filter(Product.kind == "INSURANCE")
                 .order_by(Product.is_govt_scheme.desc(), Product.name)]
    loan_max = afford.get("loan_max_paise") or {}
    # RBI's microfinance cap as a 26-week loan amount at 24%: the upper edge of the website's safe-zone meter.
    rbi_cap_amount = finance.loan_max(max(0, int(afford.get("rbi_cap_weekly_paise", 0))), 24, 26)
    return {"requested_paise": requested_paise,
            "safe_amount_paise": loan_max.get("26", loan_max.get(26, 0)),
            "safe_amount_52_paise": int(loan_max.get("52", 0) or 0),
            "safe_weekly_paise": int(afford.get("safe_weekly_paise") or 0),
            "rbi_cap_amount_paise": int(rbi_cap_amount),
            "loans": loans,
            "stretch": _jsonable(stretch_options(run.result, afford, txns, lenders, products, requested_paise,
                                                 int(rbi_cap_amount))),
            "insurance": insurance}


def stretch_options(score: dict, afford: dict, txns, lenders: list[dict], products: list[dict],
                    requested_paise: int, rbi_cap_amount_paise: int) -> list[dict]:
    """Quotes at the full requested amount for lenders whose band/history rules pass. Not pre-approved:
    the instalment is above the safe weekly payment, so each card carries its risks."""
    rank = {"BUILDING": 0, "FAIR": 1, "GOOD": 2, "STRONG": 3}
    safe = int(afford.get("safe_weekly_paise") or 0)
    band, weeks_obs = score.get("band"), int(score.get("weeks_observed") or 0)
    if score.get("score") is None or band is None or requested_paise > rbi_cap_amount_paise:
        return []
    if requested_paise <= int((afford.get("loan_max_paise") or {}).get("26", 0) or 0):
        return []  # the request is already safe: nothing to stretch to
    by_id = {l["id"]: l for l in lenders}
    out = []
    for p in products:
        lender = by_id.get(p["lender_id"])
        if (lender is None or rank.get(band, -1) < rank.get(lender["min_band"], 0)
                or weeks_obs < lender["min_weeks"] or p["max_paise"] < requested_paise
                or requested_paise < (p["min_paise"] or 0)):
            continue
        tenures = list(p["tenures"] or [26])
        for weeks in [w for w in (26, 52) if w in tenures] or [default_tenure(tenures)]:
            card = finance.kfs(requested_paise, p["rate_pct"], p["fee_pct"], weeks)
            inst = int(card["instalment_paise"])
            st = scoring.stress_test(txns, 0, inst)
            out.append({"lender": {"id": lender["id"], "name": lender["name"]}, "product_id": p["id"],
                        "amount_paise": requested_paise, "weeks": weeks, "frequency": "WEEKLY",
                        "rate_pct": p["rate_pct"], "fee_pct": p["fee_pct"], "kfs": card,
                        "eligible": "NEEDS_APPROVAL",
                        "risk": {"weekly_over_safe_paise": max(0, inst - safe),
                                 "weeks_covered": st["weeks_covered"], "weeks_total": st["weeks_total"],
                                 "light": st["light"]}})
    out.sort(key=lambda o: (o["weeks"], o["kfs"]["instalment_paise"]))
    return out


@router.post("/offers/{offer_id}/accept")
def accept_offer(offer_id: str, body: AcceptIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    offer = db.get(Offer, offer_id)
    if offer is None or offer.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    if offer.status != "OFFERED" or offer.eligible not in ("ELIGIBLE", "NEEDS_REVIEW"):
        raise AppError("OFFER_NOT_ACCEPTABLE")
    product = db.get(Product, offer.product_id)
    lender = db.get(Lender, product.lender_id) if product and product.lender_id else None
    if product is None or lender is None:
        raise AppError("OFFER_NOT_ACCEPTABLE")
    pd = product_dict(product, lender)
    if pd["tenures"] and body.weeks not in pd["tenures"]:
        raise AppError("VALIDATION_ERROR", 422, f"weeks must be one of {pd['tenures']}")
    if not (pd["min_paise"] or 0) <= body.amount_paise <= (pd["max_paise"] or body.amount_paise):
        raise AppError("OFFER_NOT_ACCEPTABLE", 400, "This amount is outside the lender's limits.")

    txns = load_txns(db, user.id)
    if not txns:
        raise AppError("NO_SCORE")
    afford = scoring.affordability(txns)
    # Re-evaluate the current score and lender rules, rather than trusting an old quote.
    # Compute from the live consent-backed rows: a retained score may predate erasure.
    score = _jsonable(scoring.compute_score(txns))
    rank = {"BUILDING": 0, "FAIR": 1, "GOOD": 2, "STRONG": 3}
    if (score.get("score") is None or score.get("confidence") == "NONE"
            or rank.get(score.get("band"), -1) < rank.get(lender.min_band, 0)
            or int(score.get("weeks_observed") or 0) < lender.min_weeks):
        raise AppError("OFFER_NOT_ACCEPTABLE")
    kfs = _jsonable(finance.kfs(body.amount_paise, pd["rate_pct"], pd["fee_pct"], body.weeks))
    if kfs["instalment_paise"] > int(afford.get("safe_weekly_paise", 0)):
        raise AppError("EXCEEDS_SAFE_INSTALMENT")

    weekday = afford.get("payout_weekday") or "MON"
    rows = finance.schedule(body.amount_paise, pd["rate_pct"], body.weeks, clock.today(), weekday)
    loan = Loan(user_id=user.id, offer_id=offer.id, principal_paise=body.amount_paise,
                instalment_paise=int(kfs["instalment_paise"]), weeks=body.weeks, start_date=clock.today(),
                payout_weekday=weekday, created_at=clock.now())
    db.add(loan)
    db.flush()
    for r in rows:
        db.add(Repayment(loan_id=loan.id, seq=int(r["seq"]), due_date=_date(r["due_date"]),
                         amount_paise=int(r["amount_paise"]), status="UPCOMING"))
    offer.status, offer.amount_paise, offer.weeks, offer.kfs = "ACCEPTED", body.amount_paise, body.weeks, kfs
    audit(db, user, "LOAN_ACCEPTED", user.id)
    db.commit()
    db.refresh(loan)
    return loan_out(db, loan)

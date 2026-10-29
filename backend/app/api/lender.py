"""Lender view: score summaries only. Never transactions, names, phones, payee tokens or balances."""
import hashlib

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.errors import AppError
from app.models import Lender, LenderShare, Offer, User
from app.schemas import LenderRulesIn
from app.security.deps import require_role
from app.services.audit import audit
from app.services.scoring_service import latest_run
from app.services.txn_store import load_txns

router = APIRouter(prefix="/lender", tags=["lender"])

BAND_RANK = {"BUILDING": 0, "FAIR": 1, "GOOD": 2, "STRONG": 3}


def applicant_ref(user_id: str, lender_id: str) -> str:
    return "APP-" + hashlib.sha256((user_id + lender_id).encode()).hexdigest()[:4].upper()


def is_eligible(summary: dict, rules: dict) -> bool:
    band = summary.get("band")
    if summary.get("score") is None or band is None or summary.get("confidence") == "NONE":
        return False
    return (BAND_RANK.get(band, -1) >= BAND_RANK[rules["min_band"]]
            and (summary.get("weeks_observed") or 0) >= rules["min_weeks"]
            and (summary.get("safe_weekly_paise") or 0) > 0)


def rules_of(l: Lender) -> dict:
    return {"min_band": l.min_band, "max_amount_paise": l.max_amount_paise, "min_weeks": l.min_weeks}


def own_lender(db: Session, user: User) -> Lender:
    lender = db.get(Lender, user.lender_id) if user.lender_id else None
    if lender is None:
        raise AppError("FORBIDDEN", 403)
    return lender


def summaries(db: Session, lender: Lender) -> list[dict]:
    """Internal summaries (with weeks_observed, needed for eligibility) of users who shared with this lender."""
    shares = (db.query(LenderShare).filter(LenderShare.lender_id == lender.id, LenderShare.revoked_at.is_(None))
              .order_by(LenderShare.created_at).all())
    out, seen = [], set()
    for s in shares:
        if s.user_id in seen:
            continue
        seen.add(s.user_id)
        run = latest_run(db, s.user_id)
        if run is None:
            continue
        txns = load_txns(db, s.user_id)
        safe = int(scoring.affordability(txns).get("safe_weekly_paise", 0)) if txns else 0
        last_offer = (db.query(Offer).filter(Offer.user_id == s.user_id)
                      .order_by(Offer.created_at.desc()).first())
        r = run.result
        out.append({"user_id": s.user_id, "applicant_ref": applicant_ref(s.user_id, lender.id),
                    "score": r.get("score"), "band": r.get("band"), "confidence": r.get("confidence"),
                    "reasons": [x.get("code") for x in r.get("reasons", [])], "safe_weekly_paise": safe,
                    "requested_paise": last_offer.requested_paise if last_offer else 1_000_000,
                    "weeks_observed": r.get("weeks_observed")})
    return out


PUBLIC_KEYS = ("applicant_ref", "score", "band", "confidence", "reasons", "safe_weekly_paise",
               "requested_paise", "eligible")


@router.get("/applicants")
def applicants(user: User = Depends(require_role("LENDER")), db: Session = Depends(get_db)):
    lender = own_lender(db, user)
    rules = rules_of(lender)
    out = []
    for s in summaries(db, lender):
        s["eligible"] = is_eligible(s, rules)
        audit(db, user, "VIEW_SCORE_SUMMARY", s["user_id"], actor_name=lender.name)
        out.append({k: s[k] for k in PUBLIC_KEYS})
    db.commit()
    return out


@router.put("/rules")
def put_rules(body: LenderRulesIn, user: User = Depends(require_role("LENDER")), db: Session = Depends(get_db)):
    lender = own_lender(db, user)
    apps = summaries(db, lender)
    before = sum(is_eligible(a, rules_of(lender)) for a in apps)
    lender.min_band, lender.max_amount_paise, lender.min_weeks = body.min_band, body.max_amount_paise, body.min_weeks
    after = sum(is_eligible(a, rules_of(lender)) for a in apps)
    db.commit()
    return {"rules": rules_of(lender), "eligible_before": before, "eligible_after": after}

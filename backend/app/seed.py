"""Idempotent seed (keyed on phone hash / names). `python -m app.seed --reset` drops everything and reseeds."""
import argparse
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import Consent, Lender, Product, User
from app.security.hashing import phone_hash

log = logging.getLogger("sahayakfin")

PERSONAS = [  # phone, display_name, slug (CONTRACTS §1)
    ("9000000001", "Ravi Shinde", "ravi"),
    ("9000000002", "Sunita Jadhav", "sunita"),
    ("9000000003", "Arjun Mehta", "arjun"),
    ("9000000004", "Meena Pawar", "meena"),
]
LENDERS = [  # name, min_band, min_weeks, lender phone, product (CONTRACTS §4.2)
    ("MFI Alpha", "FAIR", 8, "9999999991",
     dict(name="Alpha Weekly", min_paise=200_000, max_paise=1_000_000, rate_pct=24, fee_pct=2.0, tenures=[13, 26, 52])),
    ("MFI Beta", "GOOD", 10, "9999999992",
     dict(name="Beta Flexi", min_paise=500_000, max_paise=2_500_000, rate_pct=21, fee_pct=1.0, tenures=[26, 52])),
    ("MFI Gamma", "STRONG", 12, "9999999993",
     dict(name="Gamma Growth", min_paise=1_000_000, max_paise=5_000_000, rate_pct=18, fee_pct=1.5, tenures=[26, 52])),
]
INSURANCE = [
    dict(name="Accident cover (PMSBY)", provider="Govt scheme · info only", premium_paise=2_000,
         premium_period="YEAR", cover_paise=20_000_000, is_govt_scheme=True),
    dict(name="Suraksha Mini", provider="Hospital cash (demo)", premium_paise=1_000,
         premium_period="WEEK", cover_paise=500_000, is_govt_scheme=False),
    dict(name="Pahiya Protect", provider="Bike breakdown income cover (demo)", premium_paise=1_500,
         premium_period="WEEK", cover_paise=150_000, is_govt_scheme=False),
]
DATA_PERSONAS = ("sunita", "arjun", "meena")  # Ravi stays empty for the live demo


def _user(db: Session, phone: str, **fields) -> User:
    h = phone_hash(phone)
    u = db.query(User).filter(User.phone_hash == h).first()
    if u is None:
        u = User(phone_hash=h, phone_last4=phone[-4:], **fields)
        db.add(u)
    else:
        for k, v in fields.items():
            setattr(u, k, v)
    db.flush()
    return u


def seed_base(db: Session) -> None:
    for name, min_band, min_weeks, phone, prod in LENDERS:
        lender = db.query(Lender).filter(Lender.name == name).first()
        if lender is None:
            lender = Lender(name=name, min_band=min_band, min_weeks=min_weeks, max_amount_paise=prod["max_paise"])
            db.add(lender)
            db.flush()
        p = db.query(Product).filter(Product.name == prod["name"]).first()
        if p is None:
            db.add(Product(lender_id=lender.id, kind="LOAN", provider=name, **prod))
        _user(db, phone, display_name=name, role="LENDER", lender_id=lender.id)
    for ins in INSURANCE:
        if db.query(Product).filter(Product.name == ins["name"]).first() is None:
            db.add(Product(kind="INSURANCE", **ins))
    for phone, name, slug in PERSONAS:
        _user(db, phone, display_name=name, role="USER", persona_slug=slug)
    db.commit()


def seed_persona_data(db: Session) -> int:
    """Loads Sunita, Arjun and Meena through the AA pipeline, each with an ACTIVE consent, shared with all lenders."""
    from app.api.privacy import share_with
    from app.api.consents import create_consent
    from app.schemas import ConsentIn
    from app.services.pipeline import run_pipeline

    loaded = 0
    lenders = db.query(Lender).all()
    for phone, _, slug in PERSONAS:
        if slug not in DATA_PERSONAS:
            continue
        path = settings.samples_dir / f"{slug}.aa.json"
        if not path.is_file():
            log.warning("seed: %s not found, skipping persona data", path.name)
            continue
        user = db.query(User).filter(User.phone_hash == phone_hash(phone)).one()
        if db.query(Consent).filter(Consent.user_id == user.id, Consent.status == "ACTIVE").first():
            continue  # already has data
        consent = create_consent(db, user, ConsentIn(range_days=90, data_life_days=90))
        run_pipeline(db, user, consent, path.read_bytes(), path.name, None)
        for lender in lenders:
            share_with(db, user, lender, consent.id)
        db.commit()
        loaded += 1
    return loaded


def seed(with_data: bool = False) -> None:
    with SessionLocal() as db:
        seed_base(db)
        if with_data:
            try:
                seed_persona_data(db)
            except Exception as e:  # noqa: BLE001  (the app must still start without demo data)
                db.rollback()
                log.warning("seed: persona data skipped (%s)", type(e).__name__)


def reset(with_data: bool = True) -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    from app.services import clock
    clock.reset()
    seed(with_data=with_data)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Seed the SahayakFin database.")
    ap.add_argument("--reset", action="store_true", help="drop all tables, recreate and seed with demo data")
    ap.add_argument("--no-data", action="store_true", help="skip loading persona data")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    if args.reset:
        reset(with_data=not args.no_data)
    else:
        Base.metadata.create_all(engine)
        seed(with_data=not args.no_data)
    print("seeded")

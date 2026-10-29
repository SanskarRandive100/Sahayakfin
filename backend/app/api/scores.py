from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.errors import AppError
from app.models import User
from app.schemas import StressIn, WhatIfIn
from app.security.deps import active_consent, current_user
from app.services.scoring_service import _jsonable, require_latest, rescore, run_out
from app.services.txn_store import load_txns

router = APIRouter(tags=["scores"])

TIP_CODES = {"SAVE_EVERY_WEEK", "PAY_BILLS_ON_TIME", "KEEP_SURPLUS_WEEKS", "STEADY_INCOME", "ADD_MORE_HISTORY"}


@router.post("/scores")
def post_score(user: User = Depends(current_user), db: Session = Depends(get_db)):
    out = rescore(db, user)
    db.commit()
    return out


@router.get("/scores/latest")
def latest(user: User = Depends(current_user), db: Session = Depends(get_db)):
    out = run_out(require_latest(db, user.id))
    if active_consent(db, user) is None:
        out["consent_revoked"] = True
    return out


def _txns_or_no_score(db: Session, user: User):
    txns = load_txns(db, user.id)
    if not txns:
        raise AppError("NO_SCORE")
    return txns


@router.post("/scores/what-if")
def what_if(body: WhatIfIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.tip_code not in TIP_CODES:
        raise AppError("BAD_TIP")
    return _jsonable(scoring.what_if(_txns_or_no_score(db, user), body.tip_code))


@router.get("/affordability")
def affordability(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _jsonable(scoring.affordability(_txns_or_no_score(db, user)))


@router.post("/affordability/stress")
def stress(body: StressIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _jsonable(scoring.stress_test(_txns_or_no_score(db, user), body.shock, body.weekly_instalment_paise))

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.errors import AppError
from app.models import Goal, User
from app.schemas import GoalIn
from app.security.deps import current_user
from app.services import clock
from app.services.scoring_service import _jsonable
from app.services.txn_store import load_txns

router = APIRouter(tags=["wellness"])


def goal_out(g: Goal) -> dict:
    remaining = max(0, g.target_paise - g.saved_paise)
    return {"id": g.id, "name": g.name, "target_paise": g.target_paise, "weekly_target_paise": g.weekly_target_paise,
            "saved_paise": g.saved_paise,
            "weeks_left": math.ceil(remaining / g.weekly_target_paise) if g.weekly_target_paise else 0}


def latest_goal(db: Session, user_id: str) -> Goal | None:
    return db.query(Goal).filter(Goal.user_id == user_id).order_by(Goal.created_at.desc()).first()


@router.get("/wellness/weekly")
def weekly(weeks: int = Query(4, ge=1, le=12), user: User = Depends(current_user), db: Session = Depends(get_db)):
    txns = load_txns(db, user.id)
    if not txns:
        raise AppError("NO_SCORE")
    out = _jsonable(scoring.weekly_breakdown(txns, weeks))
    g = latest_goal(db, user.id)
    out["nudges"] = _jsonable(scoring.nudges(txns, clock.today(), goal_out(g) if g else None))
    return out


@router.post("/goals")
def create_goal(body: GoalIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    txns = load_txns(db, user.id)
    surplus = int(scoring.affordability(txns).get("median_weekly_surplus_paise", 0)) if txns else 0
    weekly = max(2000, int(round(0.10 * max(0, surplus) / 1000.0)) * 1000)
    g = Goal(user_id=user.id, name=body.name.strip(), target_paise=body.target_paise,
             weekly_target_paise=weekly, saved_paise=0, created_at=clock.now())
    db.add(g)
    db.commit()
    return goal_out(g)


@router.get("/goals")
def list_goals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).all()
    return [goal_out(g) for g in rows]

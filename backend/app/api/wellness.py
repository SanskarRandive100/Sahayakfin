import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import scoring
from app.db import get_db
from app.errors import AppError
from app.models import Goal, User
from app.schemas import ContributeIn, GoalIn
from app.scoring import goals as goals_math
from app.services.audit import audit
from app.security.deps import current_user
from app.services import clock
from app.services.scoring_service import _jsonable
from app.services.txn_store import load_txns

router = APIRouter(tags=["wellness"])


def goal_out(g: Goal, txns=None) -> dict:
    remaining = max(0, g.target_paise - g.saved_paise)
    out = {"id": g.id, "name": g.name, "target_paise": g.target_paise, "weekly_target_paise": g.weekly_target_paise,
           "saved_paise": g.saved_paise,
           "weeks_left": math.ceil(remaining / g.weekly_target_paise) if g.weekly_target_paise else 0,
           "target_date": g.target_date.isoformat() if g.target_date else None,
           "required_weekly_paise": None, "status": None, "suggested_date": None,
           "suggested_amount_paise": None, "median_weekly_surplus_paise": None, "suggestions": []}
    if txns:
        surplus = int(scoring.affordability(txns).get("median_weekly_surplus_paise", 0))
        out["median_weekly_surplus_paise"] = surplus
        out["suggestions"] = goals_math.saving_suggestions(scoring.weekly_breakdown(txns, 4))
        if g.target_date:
            plan = goals_math.plan_goal(g.target_paise, g.saved_paise, g.target_date, clock.today(), surplus)
            out.update(plan)
            out["weekly_target_paise"] = plan["required_weekly_paise"]
    return out


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
    if body.target_date is not None and (body.target_date - clock.today()).days < 14:
        raise AppError("VALIDATION_ERROR", 422, "Choose a date at least 2 weeks from today.")
    if body.saved_paise >= body.target_paise:
        raise AppError("VALIDATION_ERROR", 422, "Already saved must be less than the target.")
    g = Goal(user_id=user.id, name=body.name.strip(), target_paise=body.target_paise,
             weekly_target_paise=weekly, saved_paise=body.saved_paise, target_date=body.target_date,
             created_at=clock.now())
    db.add(g)
    db.commit()
    return goal_out(g, txns)


@router.post("/goals/{goal_id}/contribute")
def contribute(goal_id: str, body: ContributeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = db.get(Goal, goal_id)
    if g is None or g.user_id != user.id:
        raise AppError("NOT_FOUND", 404)
    g.saved_paise = int(g.saved_paise or 0) + body.amount_paise
    audit(db, user, "GOAL_CONTRIBUTION", user.id)
    db.commit()
    return goal_out(g, load_txns(db, user.id))


@router.get("/goals")
def list_goals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).all()
    txns = load_txns(db, user.id) if rows else []
    return [goal_out(g, txns) for g in rows]

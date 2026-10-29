from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import user_out
from app.db import get_db
from app.models import Loan, ScoreRun, User
from app.schemas import MePatch
from app.security.deps import active_consent, current_user

router = APIRouter(tags=["me"])


@router.get("/me")
def get_me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {
        "user": user_out(user),
        "has_active_consent": active_consent(db, user) is not None,
        "has_score": db.query(ScoreRun.id).filter(ScoreRun.user_id == user.id).first() is not None,
        "has_loan": db.query(Loan.id).filter(Loan.user_id == user.id).first() is not None,
    }


@router.patch("/me")
def patch_me(body: MePatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.language = body.language
    db.commit()
    return user_out(user)

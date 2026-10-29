from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import AppError
from app.models import User
from app.schemas import OtpRequest, OtpVerify
from app.security.hashing import mask_phone, phone_hash
from app.security.jwt import create_token
from app.security.ratelimit import otp_limiter

router = APIRouter(prefix="/auth", tags=["auth"])

DEMO_OTP = "123456"


def user_out(u: User) -> dict:
    return {"id": u.id, "display_name": u.display_name, "phone_masked": mask_phone(u.phone_last4),
            "language": u.language, "role": u.role}


@router.post("/otp/request")
def otp_request(body: OtpRequest):
    if not otp_limiter.allow(body.phone):
        raise AppError("TOO_MANY_REQUESTS", 429)
    return {"request_id": uuid4().hex, "demo_otp": DEMO_OTP}


@router.post("/otp/verify")
def otp_verify(body: OtpVerify, db: Session = Depends(get_db)):
    if body.otp != DEMO_OTP:
        raise AppError("OTP_INVALID", 401)
    h = phone_hash(body.phone)
    user = db.query(User).filter(User.phone_hash == h).first()
    if user is None:
        user = User(phone_hash=h, phone_last4=body.phone[-4:], display_name="Guest", role="USER")
        db.add(user)
        db.commit()
    return {"access_token": create_token(user), "user": user_out(user)}

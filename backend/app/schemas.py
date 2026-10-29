"""Pydantic request models. Responses are plain dicts matching CONTRACTS §5."""
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.security.hashing import normalise_phone


class OtpRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)

    @field_validator("phone")
    @classmethod
    def _ten_digits(cls, v: str) -> str:
        p = normalise_phone(v)
        if len(p) != 10:
            raise ValueError("phone must have 10 digits")
        return p


class OtpVerify(OtpRequest):
    otp: str = Field(min_length=4, max_length=8)


class MePatch(BaseModel):
    language: Literal["en", "hi", "mr"]


class ConsentIn(BaseModel):
    purpose: Literal["LOAN_ASSESSMENT"] = "LOAN_ASSESSMENT"
    fi_types: list[Literal["DEPOSIT"]] = ["DEPOSIT"]
    range_days: int = Field(90, ge=30, le=365)
    data_life_days: int = Field(30, ge=1, le=90)
    fetch_type: Literal["ONETIME", "PERIODIC"] = "ONETIME"


class AaFetchIn(BaseModel):
    consent_id: str
    persona: str


class RecategoriseIn(BaseModel):
    category: str


class WhatIfIn(BaseModel):
    tip_code: str


class StressIn(BaseModel):
    shock: float
    weekly_instalment_paise: int = Field(ge=0)

    @field_validator("shock")
    @classmethod
    def _shock(cls, v: float) -> float:
        if round(v, 2) not in (0.0, 0.1, 0.2, 0.3):  # 0 = "no income drop", the risk graph's baseline
            raise ValueError("shock must be 0, 0.1, 0.2 or 0.3")
        return round(v, 2)


class AcceptIn(BaseModel):
    amount_paise: int = Field(gt=0)
    weeks: int = Field(gt=0, le=104)


class AdvanceClockIn(BaseModel):
    days: int = Field(ge=1, le=30)


class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    target_paise: int = Field(ge=500, le=10_000_000)


class ShareIn(BaseModel):
    lender_id: str


class LenderRulesIn(BaseModel):
    min_band: Literal["STRONG", "GOOD", "FAIR", "BUILDING"]
    max_amount_paise: int = Field(gt=0, le=10_000_000)
    min_weeks: int = Field(ge=1, le=52)

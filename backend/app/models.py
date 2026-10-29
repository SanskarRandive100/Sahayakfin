"""All tables of CONTRACTS §6 (SQLAlchemy 2.0 typed mappings, generic types only)."""
from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _id() -> str:
    return uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    """SQLite drops tzinfo; everything is stored as UTC, so re-attach it."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


ID = String(32)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    phone_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    phone_last4: Mapped[str] = mapped_column(String(4))
    display_name: Mapped[str] = mapped_column(String(80), default="Guest")
    role: Mapped[str] = mapped_column(String(10), default="USER")
    lender_id: Mapped[Optional[str]] = mapped_column(ID, ForeignKey("lenders.id"), nullable=True)
    language: Mapped[str] = mapped_column(String(5), default="en")
    persona_slug: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Consent(Base):
    __tablename__ = "consents"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    purpose: Mapped[str] = mapped_column(String(40))
    fi_types: Mapped[list] = mapped_column(JSON, default=list)
    range_from: Mapped[date] = mapped_column(Date)
    range_to: Mapped[date] = mapped_column(Date)
    data_life_days: Mapped[int] = mapped_column(Integer)
    fetch_type: Mapped[str] = mapped_column(String(20), default="ONETIME")
    status: Mapped[str] = mapped_column(String(10), default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    sources: Mapped[list["DataSource"]] = relationship(
        back_populates="consent", cascade="all, delete-orphan", passive_deletes=True)


class DataSource(Base):
    __tablename__ = "data_sources"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    consent_id: Mapped[str] = mapped_column(ID, ForeignKey("consents.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(10))
    file_sha256: Mapped[str] = mapped_column(String(64))
    period_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    weeks_covered: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    consent: Mapped[Consent] = relationship(back_populates="sources")
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="source", cascade="all, delete-orphan", passive_deletes=True)


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    source_id: Mapped[str] = mapped_column(ID, ForeignKey("data_sources.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    txn_date: Mapped[date] = mapped_column(Date, index=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    direction: Mapped[str] = mapped_column(String(2))
    narration_enc: Mapped[str] = mapped_column(String(2000))
    payee_token: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    channel: Mapped[str] = mapped_column(String(10))
    category: Mapped[str] = mapped_column(String(30))
    kind: Mapped[str] = mapped_column(String(10))
    balance_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    flags: Mapped[list] = mapped_column(JSON, default=list)
    user_corrected: Mapped[bool] = mapped_column(Boolean, default=False)

    source: Mapped[DataSource] = relationship(back_populates="transactions")


class ScoreRun(Base):
    __tablename__ = "score_runs"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    band: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    confidence: Mapped[str] = mapped_column(String(10))
    result: Mapped[dict] = mapped_column(JSON)
    engine_version: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Lender(Base):
    __tablename__ = "lenders"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    min_band: Mapped[str] = mapped_column(String(10))
    min_weeks: Mapped[int] = mapped_column(Integer)
    max_amount_paise: Mapped[int] = mapped_column(BigInteger)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    lender_id: Mapped[Optional[str]] = mapped_column(ID, ForeignKey("lenders.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(10))  # LOAN | INSURANCE
    name: Mapped[str] = mapped_column(String(80), unique=True)
    provider: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    min_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    max_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    rate_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fee_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tenures: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    premium_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    premium_period: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    cover_paise: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    is_govt_scheme: Mapped[bool] = mapped_column(Boolean, default=False)


class Offer(Base):
    __tablename__ = "offers"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[str] = mapped_column(ID, ForeignKey("products.id"))
    score_run_id: Mapped[Optional[str]] = mapped_column(ID, ForeignKey("score_runs.id", ondelete="SET NULL"),
                                                        nullable=True)
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    requested_paise: Mapped[int] = mapped_column(BigInteger, default=1_000_000)
    weeks: Mapped[int] = mapped_column(Integer)
    kfs: Mapped[dict] = mapped_column(JSON)
    eligible: Mapped[str] = mapped_column(String(15))
    status: Mapped[str] = mapped_column(String(10), default="OFFERED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Loan(Base):
    __tablename__ = "loans"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    offer_id: Mapped[str] = mapped_column(ID, ForeignKey("offers.id", ondelete="CASCADE"))
    principal_paise: Mapped[int] = mapped_column(BigInteger)
    instalment_paise: Mapped[int] = mapped_column(BigInteger)
    weeks: Mapped[int] = mapped_column(Integer)
    start_date: Mapped[date] = mapped_column(Date)
    payout_weekday: Mapped[str] = mapped_column(String(3))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    repayments: Mapped[list["Repayment"]] = relationship(
        back_populates="loan", cascade="all, delete-orphan", passive_deletes=True,
        order_by="Repayment.seq")


class Repayment(Base):
    __tablename__ = "repayments"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    loan_id: Mapped[str] = mapped_column(ID, ForeignKey("loans.id", ondelete="CASCADE"), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[date] = mapped_column(Date)
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    status: Mapped[str] = mapped_column(String(10), default="UPCOMING")
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    loan: Mapped[Loan] = relationship(back_populates="repayments")
    reminders: Mapped[list["Reminder"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class Reminder(Base):
    __tablename__ = "reminders"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    repayment_id: Mapped[str] = mapped_column(ID, ForeignKey("repayments.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(30))
    params: Mapped[dict] = mapped_column(JSON)
    send_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent: Mapped[bool] = mapped_column(Boolean, default=False)


class Goal(Base):
    __tablename__ = "goals"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    target_paise: Mapped[int] = mapped_column(BigInteger)
    weekly_target_paise: Mapped[int] = mapped_column(BigInteger)
    saved_paise: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LenderShare(Base):
    __tablename__ = "lender_shares"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ID, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lender_id: Mapped[str] = mapped_column(ID, ForeignKey("lenders.id"), index=True)
    consent_id: Mapped[Optional[str]] = mapped_column(ID, ForeignKey("consents.id", ondelete="SET NULL"),
                                                      nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[str] = mapped_column(ID, primary_key=True, default=_id)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    actor_role: Mapped[str] = mapped_column(String(10))
    actor_id: Mapped[Optional[str]] = mapped_column(ID, nullable=True)
    actor_name: Mapped[str] = mapped_column(String(80))
    subject_user_id: Mapped[Optional[str]] = mapped_column(ID, index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(30))
    purpose: Mapped[str] = mapped_column(String(80))

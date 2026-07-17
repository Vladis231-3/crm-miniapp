from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, LargeBinary, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

OWNER_PROFIT_PENDING = "pending"
OWNER_PROFIT_PAID = "paid"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    telegram_id: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(64))
    car: Mapped[str] = mapped_column(String(120), default="")
    plate: Mapped[str] = mapped_column(String(32), default="")
    plate_type: Mapped[str] = mapped_column(String(16), default="russian")
    notes: Mapped[str] = mapped_column(Text, default="")
    debt_balance: Mapped[int] = mapped_column(Integer, default=0)
    admin_rating: Mapped[int] = mapped_column(Integer, default=0)
    admin_note: Mapped[str] = mapped_column(Text, default="")
    referral_source: Mapped[str] = mapped_column(String(64), default="")
    registered: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    bookings: Mapped[list["Booking"]] = relationship(back_populates="client")


class StaffUser(Base):
    __tablename__ = "staff_users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(160), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    experience: Mapped[str] = mapped_column(String(120), default="")
    specialty: Mapped[str] = mapped_column(String(255), default="")
    about: Mapped[str] = mapped_column(Text, default="")
    telegram_chat_id: Mapped[str] = mapped_column(String(64), default="")
    is_primary_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_code_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    two_factor_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    login_locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    extra_roles: Mapped[list[str]] = mapped_column(JSON, default=list)
    default_percent: Mapped[float] = mapped_column(Numeric(7, 5), default=0)
    salary_base: Mapped[int] = mapped_column(Integer, default=0)
    salary_per_shift: Mapped[int] = mapped_column(Integer, default=0)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    assignments: Mapped[list["BookingWorker"]] = relationship(back_populates="worker")
    penalties: Mapped[list["Penalty"]] = relationship(
        back_populates="worker",
        foreign_keys="Penalty.worker_id",
    )
    payroll_entries: Mapped[list["PayrollEntry"]] = relationship(
        back_populates="worker",
        foreign_keys="PayrollEntry.worker_id",
    )
    incomes: Mapped[list["Income"]] = relationship(back_populates="created_by")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(120))
    price: Mapped[int] = mapped_column(Integer)
    duration: Mapped[int] = mapped_column(Integer)
    resource_group: Mapped[str] = mapped_column(String(64), default="wash")
    wash_type: Mapped[str] = mapped_column(String(32), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    material_consumption: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_fixed_master: Mapped[bool] = mapped_column(Boolean, default=False)


class Box(Base):
    __tablename__ = "boxes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    resource_group: Mapped[str] = mapped_column(String(64), default="wash")
    price_per_hour: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str] = mapped_column(Text, default="")


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day_index: Mapped[int] = mapped_column(Integer)
    day_label: Mapped[str] = mapped_column(String(8))
    open_time: Mapped[str] = mapped_column(String(8))
    close_time: Mapped[str] = mapped_column(String(8))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), ForeignKey("clients.id", ondelete="CASCADE"))
    client_name: Mapped[str] = mapped_column(String(120))
    client_phone: Mapped[str] = mapped_column(String(64))
    service: Mapped[str] = mapped_column(String(120))
    service_id: Mapped[str] = mapped_column(String(36))
    date: Mapped[str] = mapped_column(String(16))
    time: Mapped[str] = mapped_column(String(8))
    duration: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32))
    box: Mapped[str] = mapped_column(String(120))
    payment_type: Mapped[str] = mapped_column(String(32))
    payment_settled: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    car: Mapped[str | None] = mapped_column(String(120), nullable=True)
    plate: Mapped[str | None] = mapped_column(String(32), nullable=True)
    plate_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    services: Mapped[list[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    client: Mapped[Client] = relationship(back_populates="bookings")
    worker_links: Mapped[list["BookingWorker"]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    additional_services: Mapped[list["BookingAdditionalService"]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )


class BookingWorker(Base):
    __tablename__ = "booking_workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(String(64), ForeignKey("bookings.id", ondelete="CASCADE"))
    worker_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id", ondelete="CASCADE"))
    worker_name: Mapped[str] = mapped_column(String(120))
    percent: Mapped[int] = mapped_column(Integer)

    booking: Mapped[Booking] = relationship(back_populates="worker_links")
    worker: Mapped[StaffUser] = relationship(back_populates="assignments")


class BookingAdditionalService(Base):
    __tablename__ = "booking_additional_services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    booking_id: Mapped[str] = mapped_column(String(64), ForeignKey("bookings.id", ondelete="CASCADE"))
    service_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[int] = mapped_column(Integer)
    duration: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    booking: Mapped[Booking] = relationship(back_populates="additional_services")
    worker_links: Mapped[list["AdditionalServiceWorker"]] = relationship(
        back_populates="additional_service",
        cascade="all, delete-orphan",
    )


class AdditionalServiceWorker(Base):
    __tablename__ = "additional_service_workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    additional_service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("booking_additional_services.id", ondelete="CASCADE")
    )
    worker_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id", ondelete="CASCADE"))
    worker_name: Mapped[str] = mapped_column(String(120))
    percent: Mapped[int] = mapped_column(Integer)

    additional_service: Mapped[BookingAdditionalService] = relationship(back_populates="worker_links")
    worker: Mapped[StaffUser] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    recipient_role: Mapped[str] = mapped_column(String(32))
    recipient_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class StockItem(Base):
    __tablename__ = "stock_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    qty: Mapped[int] = mapped_column(Integer)
    unit: Mapped[str] = mapped_column(String(16))
    unit_price: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    amount: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(120))
    date: Mapped[str] = mapped_column(String(16))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_group: Mapped[str] = mapped_column(String(64), default="wash")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class Penalty(Base):
    __tablename__ = "penalties"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    worker_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id"))
    owner_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id"))
    title: Mapped[str] = mapped_column(String(160))
    reason: Mapped[str] = mapped_column(Text)
    amount: Mapped[int] = mapped_column(Integer, default=0)
    score: Mapped[int] = mapped_column(Integer, default=5)
    active_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    worker: Mapped[StaffUser] = relationship(
        back_populates="penalties",
        foreign_keys=[worker_id],
    )


class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    worker_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id"))
    actor_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id"))
    actor_role: Mapped[str] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(32))
    amount: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    worker: Mapped[StaffUser] = relationship(
        back_populates="payroll_entries",
        foreign_keys=[worker_id],
    )


class TelegramLinkCode(Base):
    __tablename__ = "telegram_link_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(64), ForeignKey("staff_users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(100))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DataConsent(Base):
    __tablename__ = "data_consent"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    telegram_id: Mapped[str] = mapped_column(String(64), unique=True)
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Income(Base):
    __tablename__ = "incomes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    amount: Mapped[int] = mapped_column(Integer)
    source: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("staff_users.id")
    )
    date: Mapped[str] = mapped_column(String(16))
    resource_group: Mapped[str] = mapped_column(String(64), default="wash")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    created_by: Mapped["StaffUser"] = relationship(back_populates="incomes")


class WeeklyArchive(Base):
    __tablename__ = "weekly_archives"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_start: Mapped[str] = mapped_column(String(16))
    week_end: Mapped[str] = mapped_column(String(16))
    total_revenue: Mapped[int] = mapped_column(Integer, default=0)
    total_income: Mapped[int] = mapped_column(Integer, default=0)
    total_expense: Mapped[int] = mapped_column(Integer, default=0)
    booking_count: Mapped[int] = mapped_column(Integer, default=0)
    income_count: Mapped[int] = mapped_column(Integer, default=0)
    expense_count: Mapped[int] = mapped_column(Integer, default=0)
    piggy_bank_balance: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class PiggyBankTransaction(Base):
    __tablename__ = "piggy_bank_transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    booking_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[int] = mapped_column(Integer)
    transaction_type: Mapped[str] = mapped_column(String(32))
    purpose: Mapped[str] = mapped_column(String(255))
    material_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    material_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date: Mapped[str] = mapped_column(String(16))
    resource_group: Mapped[str] = mapped_column(String(64), default="detailing")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class OwnerProfitShare(Base):
    __tablename__ = "owner_profit_shares"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    booking_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("bookings.id", ondelete="CASCADE")
    )
    owner_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("staff_users.id", ondelete="CASCADE")
    )
    amount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default=OWNER_PROFIT_PENDING)
    date: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

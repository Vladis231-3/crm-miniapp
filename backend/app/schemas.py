from __future__ import annotations

from datetime import datetime
from decimal import Decimal
import re

from .date_utils import parse_dmy
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


Role = Literal["client", "admin", "worker", "owner", "accountant"]
PlateType = Literal["russian", "motorcycle", "foreign"]
StaffRole = Literal["admin", "worker", "owner", "accountant"]
EmployeeRole = Literal["admin", "worker", "accountant"]
BookingStatus = Literal[
    "new",
    "confirmed",
    "scheduled",
    "in_progress",
    "completed",
    "no_show",
    "cancelled",
    "admin_review",
]
PaymentType = Literal["cash", "transfer", "invoice", "credit"]
PayrollEntryKind = Literal["bonus", "advance", "deduction", "payout", "adjustment"]

NAME_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' -]{1,59}$")
REPEATED_LETTERS_PATTERN = re.compile(r"([A-Za-zА-Яа-яЁё])\1{3,}")
VEHICLE_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$")
REPEATED_VEHICLE_PATTERN = re.compile(r"([A-Za-zА-Яа-яЁё0-9])\1{3,}")
PLATE_LATIN_TO_CYRILLIC = {
    "a": "а",
    "b": "в",
    "c": "с",
    "e": "е",
    "h": "н",
    "k": "к",
    "m": "м",
    "o": "о",
    "p": "р",
    "t": "т",
    "x": "х",
    "y": "у",
}
PLATE_PATTERN = re.compile(r"^[авекмнорстух]\d{3}[авекмнорстух]{2}$")
MOTORCYCLE_PLATE_PATTERN = re.compile(r"^\d{4}[авекмнорстух]{2}\d{2,3}$")


def normalize_person_name(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    if len(normalized) < 1:
        raise ValueError("Введите настоящее имя")
    if not NAME_PATTERN.fullmatch(normalized):
        raise ValueError("Имя должно содержать только буквы, цифры, пробелы или дефис")
    return normalized


def normalize_phone_digits(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10:
        digits = f"7{digits}"
    elif len(digits) == 11 and digits[0] in {"7", "8"}:
        digits = f"7{digits[1:]}"
    else:
        raise ValueError("Введите реальный номер телефона")
    if digits[1] in {"0", "1"}:
        raise ValueError("Введите реальный номер телефона")
    return digits


def normalize_phone(value: str) -> str:
    digits = normalize_phone_digits(value)
    return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"


def normalize_vehicle_name(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    letters_only = "".join(char for char in normalized if char.isalpha())
    if not normalized:
        raise ValueError("Введите автомобиль")
    if len(letters_only) < 2:
        raise ValueError("Введите реальный автомобиль")
    if not VEHICLE_PATTERN.fullmatch(normalized):
        raise ValueError("Введите марку и модель без лишних символов")
    if normalized.isdigit():
        raise ValueError("Введите марку и модель автомобиля")
    if REPEATED_VEHICLE_PATTERN.search(normalized):
        raise ValueError("Введите реальный автомобиль")
    return normalized


def normalize_plate(value: str, plate_type: str = "russian") -> str:
    if plate_type == "foreign":
        normalized = re.sub(r"[^A-Za-z0-9]", "", value).lower()
        if not normalized:
            raise ValueError("Enter vehicle plate")
        if len(normalized) < 2 or len(normalized) > 15:
            raise ValueError("Foreign plate must be 2-15 characters")
        return normalized

    cleaned = re.sub(r"\s+", "", value).lower()
    latin_map = {
        "a": "а",
        "b": "в",
        "c": "с",
        "e": "е",
        "h": "н",
        "k": "к",
        "m": "м",
        "o": "о",
        "p": "р",
        "t": "т",
        "x": "х",
        "y": "у",
        "а": "а",
        "в": "в",
        "с": "с",
        "е": "е",
        "н": "н",
        "к": "к",
        "м": "м",
        "о": "о",
        "р": "р",
        "т": "т",
        "х": "х",
        "у": "у",
        "ё": "е",
    }
    normalized_chars: list[str] = []
    for char in cleaned:
        if char in latin_map:
            normalized_chars.append(latin_map[char])
        elif char.isdigit():
            normalized_chars.append(char)
    normalized = "".join(normalized_chars)
    if not normalized:
        raise ValueError("Enter vehicle plate")
    if len(normalized) > 9:
        raise ValueError("Номерной знак слишком длинный (максимум 9 символов)")
    if plate_type == "russian":
        if not re.fullmatch(
            r"^[авекмнорстух]\d{3}[авекмнорстух]{2}(?:\d{2,3})?$", normalized
        ):
            raise ValueError("Enter plate as а123вс77 or а123вс777")
    elif plate_type == "motorcycle":
        if not re.fullmatch(
            r"^\d{4}[авекмнорстух]{2}\d{2,3}$", normalized
        ):
            raise ValueError("Enter plate as 1234ав77")
    else:
        raise ValueError(f"Unknown plate type: {plate_type}")
    return normalized


class ClientVehiclePayload(BaseModel):
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    isMain: bool = False

    @model_validator(mode="after")
    def validate_vehicle(self) -> "ClientVehiclePayload":
        if self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class ClientProfilePayload(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    registered: bool = True
    phoneVerified: bool = False


class ClientProfileInput(BaseModel):
    name: str
    phone: str = ""
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    registered: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "ClientProfileInput":
        if self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class ClientSummaryPayload(BaseModel):
    id: str
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    notes: str = ""
    debtBalance: int = 0
    adminRating: int = Field(default=0, ge=0, le=5)
    adminNote: str = ""
    referralSource: str = ""
    depositActive: bool = False
    depositMonthly: int = 0
    depositStartMonth: str = ""
    depositPlan: str = "fee"
    depositWashesIncluded: int = 0
    depositWashesCarryover: bool = False
    depositMinBalance: int = 0
    depositBillingDay: int = 1
    depositWashPrice: int = 0
    createdAt: datetime


class ClientCreateRequest(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    notes: str = ""
    referralSource: str = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "ClientCreateRequest":
        if self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class WorkerPayload(BaseModel):
    id: str
    role: StaffRole
    name: str
    experience: str
    defaultPercent: float = Field(ge=0, le=100, default=0)
    salaryBase: int = 0
    salaryPerShift: int = 0
    available: bool
    active: bool = True
    phone: str = ""
    email: str = ""
    city: str = ""
    specialty: str = ""
    about: str = ""
    telegramChatId: str = ""
    payrollSummary: WorkerPayrollSummaryPayload | None = None


class PayrollEntryPayload(BaseModel):
    id: str
    workerId: str
    kind: PayrollEntryKind
    amount: int
    note: str = ""
    createdAt: datetime
    createdByRole: StaffRole
    createdByName: str
    entryDate: str | None = None


class WorkerPayrollBookingPayload(BaseModel):
    bookingId: str
    service: str
    date: str
    time: str
    price: int
    percent: float
    earned: int
    overrideEarned: int | None = None
    car: str | None = None
    plate: str | None = None


class WorkerPayrollSummaryPayload(BaseModel):
    completedBookings: int = 0
    completedRevenue: int = 0
    accruedFromBookings: int = 0
    baseSalary: int = 0
    shiftPayTotal: int = 0
    shiftCount: int = 0
    bonusTotal: int = 0
    adjustmentTotal: int = 0
    advanceTotal: int = 0
    deductionTotal: int = 0
    payoutTotal: int = 0
    totalAccrued: int = 0
    totalDeducted: int = 0
    balance: int = 0
    bookingItems: list[WorkerPayrollBookingPayload] = Field(default_factory=list)
    entries: list[PayrollEntryPayload] = Field(default_factory=list)


# --- Salary detail schemas ---

SalaryPeriod = Literal["day", "week", "month", "all", "custom"]
SalarySegment = Literal["all", "wash", "detailing"]


class SalaryBookingItem(BaseModel):
    id: str
    date: str
    time: str
    service: str
    serviceId: str | None = None
    box: str
    price: int
    earned: int
    percent: float
    linkId: int | None = None
    overrideEarned: int | None = None
    payType: str = "percent"
    resourceGroup: str
    car: str | None = None
    plate: str | None = None
    clientName: str | None = None
    paymentType: str | None = None
    paymentSettled: bool | None = None


class SalaryPayoutItem(BaseModel):
    id: str
    amount: int
    note: str
    createdAt: datetime
    createdBy: str


class SalaryDetailResponse(BaseModel):
    workerId: str
    workerName: str
    salaryBase: int
    salaryPerShift: int
    defaultPercent: float
    active: bool
    totalEarned: int
    totalPaid: int
    balanceToPay: int
    completedBookingsCount: int
    shiftCount: int
    shiftDates: list[str] = Field(default_factory=list)  # DD.MM.YYYY, по убыванию
    bookings: list[SalaryBookingItem] = Field(default_factory=list)
    payouts: list[SalaryPayoutItem] = Field(default_factory=list)
    entries: list[PayrollEntryPayload] = Field(default_factory=list)


class PaySalaryRequest(BaseModel):
    period: SalaryPeriod = "month"
    dateFrom: str | None = None
    dateTo: str | None = None
    segment: SalarySegment = "all"
    amount: int = Field(ge=1, le=10_000_000)
    note: str = ""


class PaySalaryResponse(BaseModel):
    message: str
    payoutId: str
    newBalance: int
    expenseId: str


class BookingWorkerPayload(BaseModel):
    workerId: str
    workerName: str
    percent: float = Field(ge=0, le=100, default=0)
    payType: str = "percent"
    fixedAmount: int | None = None


class BookingServiceItem(BaseModel):
    name: str
    serviceId: str
    price: float
    duration: int


class AdditionalServiceWorkerPayload(BaseModel):
    workerId: str
    workerName: str
    percent: int = Field(ge=0, le=100, default=0)
    payType: str = "percent"
    fixedAmount: int | None = None


class AdditionalServicePayload(BaseModel):
    id: str
    serviceId: str | None = None
    name: str
    price: int
    duration: int
    status: str = "pending"
    priceMode: str = "add"
    isOutsource: bool = False
    outsourceAmount: int | None = None
    createdAt: datetime
    workers: list[AdditionalServiceWorkerPayload] = Field(default_factory=list)


class AddAdditionalServiceRequest(BaseModel):
    serviceId: str | None = None
    name: str
    price: int
    duration: int
    priceMode: str = "add"
    isOutsource: bool = False
    outsourceAmount: int | None = None
    workers: list[AdditionalServiceWorkerPayload] = Field(default_factory=list)


class UpdateAdditionalServiceRequest(BaseModel):
    name: str | None = None
    price: int | None = None
    duration: int | None = None
    priceMode: str | None = None
    isOutsource: bool | None = None
    outsourceAmount: int | None = None
    workers: list[AdditionalServiceWorkerPayload] | None = None


class BookingPayload(BaseModel):
    id: str
    clientId: str
    clientName: str
    clientPhone: str
    service: str
    serviceId: str
    date: str
    time: str
    duration: int
    price: int
    status: BookingStatus
    workers: list[BookingWorkerPayload]
    box: str
    paymentType: PaymentType
    paymentSettled: bool = False
    createdAt: datetime
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    plateType: str = "russian"
    services: list[BookingServiceItem] = Field(default_factory=list)
    additionalServices: list[AdditionalServicePayload] = Field(default_factory=list)
    materials: list[BookingMaterialPayload] = Field(default_factory=list)
    materialsWrittenOff: bool = False
    startedAt: datetime | None = None
    completedAt: datetime | None = None
    source: str | None = None


class WorkerCalendarBookingPayload(BaseModel):
    id: str
    clientName: str
    service: str
    serviceId: str
    date: str
    time: str
    duration: int
    status: BookingStatus
    box: str
    workers: list[BookingWorkerPayload]
    car: str | None = None
    plate: str | None = None
    source: str | None = None


class BookingAvailabilitySlotPayload(BaseModel):
    time: str
    available: bool
    freeBoxes: int = 0
    occupiedBoxes: int = 0


class BookingAvailabilityPayload(BaseModel):
    date: str
    duration: int
    slots: list[BookingAvailabilitySlotPayload]


class NotificationPayload(BaseModel):
    id: str
    recipientRole: Role
    recipientId: str | None = None
    message: str
    read: bool
    createdAt: datetime


class StockCategoryPayload(BaseModel):
    id: str
    name: str
    parentId: str | None = None


class StockItemPayload(BaseModel):
    id: str
    name: str
    qty: float
    unit: str
    unitPrice: float
    category: str
    categoryId: str | None = None


class BookingMaterialPayload(BaseModel):
    id: str
    stockItemId: str | None = None
    name: str
    qty: float
    unit: str
    unitPrice: float


class ShiftChecklistItemPayload(BaseModel):
    stockItemId: str
    name: str
    unit: str
    startQty: float | None = None
    endQty: float | None = None
    actualQty: float = Field(ge=0)


class ShiftChecklistPayload(BaseModel):
    id: str
    workerId: str
    workerName: str
    phase: Literal["start", "end"]
    note: str = ""
    createdAt: datetime
    items: list[ShiftChecklistItemPayload] = Field(default_factory=list)


class ShiftChecklistSubmitItem(BaseModel):
    stockItemId: str
    actualQty: float = Field(ge=0)


class ShiftChecklistSubmitRequest(BaseModel):
    phase: Literal["start", "end"]
    note: str = ""
    items: list[ShiftChecklistSubmitItem] = Field(default_factory=list)


class AdminShiftInspectionSupplyPayload(BaseModel):
    stockItemId: str
    name: str
    category: str
    unit: str
    qty: float = Field(ge=0)
    checked: bool = False


class AdminShiftInspectionMasterPayload(BaseModel):
    workerId: str
    workerName: str
    checked: bool = False


class AdminShiftInspectionPayload(BaseModel):
    id: str
    adminId: str
    adminName: str
    status: Literal["pending", "approved", "rejected"]
    createdAt: datetime
    reviewedAt: datetime | None = None
    floorPhotoUrl: str
    clothsReady: bool = False
    suppliesChecked: bool = False
    note: str = ""
    issueNote: str = ""
    ownerDecisionBy: str | None = None
    supplies: list[AdminShiftInspectionSupplyPayload] = Field(default_factory=list)
    masters: list[AdminShiftInspectionMasterPayload] = Field(default_factory=list)


class AdminShiftInspectionSubmitSupply(BaseModel):
    stockItemId: str
    checked: bool = False


class AdminShiftInspectionSubmitMaster(BaseModel):
    workerId: str
    checked: bool = False


class AdminShiftInspectionSubmitRequest(BaseModel):
    floorPhotoUrl: str = Field(min_length=10)
    clothsReady: bool
    supplies: list[AdminShiftInspectionSubmitSupply] = Field(default_factory=list)
    masters: list[AdminShiftInspectionSubmitMaster] = Field(default_factory=list)
    note: str = ""


class AdminShiftInspectionReviewRequest(BaseModel):
    action: Literal["approved", "rejected"]
    issueNote: str = ""


class OwnerShiftOpeningRequest(BaseModel):
    masterIds: list[str] = Field(default_factory=list)
    note: str = ""


class ExpensePayload(BaseModel):
    id: str
    title: str
    amount: float
    category: str
    date: str
    note: str | None = None
    resourceGroup: str = "wash"


class PenaltyPayload(BaseModel):
    id: str
    workerId: str
    workerName: str
    ownerId: str
    title: str
    reason: str
    createdAt: datetime
    activeUntil: datetime
    revokedAt: datetime | None = None


class TelegramLinkCodePayload(BaseModel):
    code: str
    expiresAt: datetime
    linked: bool


class ServicePayload(BaseModel):
    id: str
    name: str
    category: str
    price: int
    duration: int
    resourceGroup: str = "wash"
    washType: str = ""
    desc: str = Field(default="")
    active: bool = True
    materialConsumption: int | None = None
    isFixedMaster: bool = False
    masterPayType: str = ""
    masterPayValue: int = 0
    piggyPayType: str = ""
    piggyPayValue: int = 0
    ownerPayType: str = ""
    ownerPayValue: int = 0
    ownerSplitEnabled: bool = True
    materials: list[dict] = Field(default_factory=list)
    splitOrder: list[str] = Field(default_factory=list)
    piggyTarget: str = ""


class DetailingRequestCreateRequest(BaseModel):
    serviceId: str
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    plateType: str = "russian"

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_vehicle_name(value)

    @model_validator(mode="after")
    def validate_plate_field(self) -> "DetailingRequestCreateRequest":
        if self.plate is not None:
            if not self.plate.strip():
                self.plate = None
            else:
                self.plate = normalize_plate(self.plate, self.plateType)
        return self


class BoxPayload(BaseModel):
    id: str
    name: str
    resourceGroup: str = "wash"
    pricePerHour: int
    active: bool
    description: str = ""


class SchedulePayload(BaseModel):
    dayIndex: int
    day: str
    open: str
    close: str
    active: bool


class AdminNotificationSettings(BaseModel):
    newBooking: bool
    cancelled: bool
    paymentDue: bool
    workerAssigned: bool
    reminders: bool


class AdminProfilePayload(BaseModel):
    name: str
    email: str
    phone: str
    telegramChatId: str = ""


class WorkerNotificationSettings(BaseModel):
    newTask: bool
    taskUpdate: bool
    payment: bool
    reminders: bool
    sms: bool


class WorkerProfilePayload(BaseModel):
    name: str
    phone: str
    email: str
    city: str
    experience: str
    specialty: str
    about: str
    percent: float = Field(ge=0, le=100, default=0)


class OperatingMode(str, Enum):
    open = "open"
    closed = "closed"
    maintenance = "maintenance"

class OwnerCompanyPayload(BaseModel):
    name: str
    legalName: str
    inn: str
    address: str
    phone: str
    email: str
    operatingMode: OperatingMode = OperatingMode.open


class OwnerNotificationSettings(BaseModel):
    telegramBot: bool
    emailReports: bool
    smsReminders: bool
    lowStock: bool
    dailyReport: bool
    weeklyReport: bool
    bookingReminders: bool = True


class OwnerIntegrationsPayload(BaseModel):
    telegram: bool
    yookassa: bool
    amoCrm: bool
    googleCalendar: bool


class GoogleCredentialsPayload(BaseModel):
    """Учётные данные Google OAuth, вводимые владельцем через UI (без правки .env)."""

    clientId: str = ""
    clientSecret: str = ""
    redirectUri: str = ""


class OwnerSecurityPayload(BaseModel):
    twoFactor: bool


class AuthSessionPayload(BaseModel):
    id: str
    device: str
    ipAddress: str
    createdAt: datetime
    lastSeenAt: datetime
    current: bool


class EmployeeSettingPayload(BaseModel):
    id: str
    role: EmployeeRole = "worker"
    name: str
    percent: float = Field(ge=0, le=100, default=0)
    salaryBase: int
    salaryPerShift: int = 0
    active: bool
    telegramChatId: str = ""


class WorkerCreateRequest(BaseModel):
    role: EmployeeRole = "worker"
    name: str
    login: str
    password: str = Field(max_length=128)
    percent: float = Field(default=0, ge=0, le=100)
    salaryBase: int = 0
    phone: str = ""
    email: str = ""
    telegramChatId: str = ""


class PayrollEntryCreateRequest(BaseModel):
    workerId: str
    kind: PayrollEntryKind
    amount: float
    note: str = ""
    # Период, к которому относится операция: операция будет учтена в зарплате
    # выбранного периода (entry_date = конец периода), а не по дате создания.
    period: SalaryPeriod | None = None
    dateFrom: str | None = None
    dateTo: str | None = None

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str) -> str:
        return value.strip()


class PayrollEntryUpdateRequest(BaseModel):
    amount: int
    note: str = ""

    @field_validator("note")
    @classmethod
    def validate_note(cls, value: str) -> str:
        return value.strip()


class SettingsBundlePayload(BaseModel):
    adminProfile: AdminProfilePayload
    adminNotificationSettings: AdminNotificationSettings
    ownerCompany: OwnerCompanyPayload
    ownerNotificationSettings: OwnerNotificationSettings
    ownerIntegrations: OwnerIntegrationsPayload
    ownerSecurity: OwnerSecurityPayload
    workerNotificationSettings: dict[str, WorkerNotificationSettings]


class SessionPayload(BaseModel):
    role: Role
    actorId: str
    sessionId: str = ""
    login: str | None = None
    displayName: str


class BootstrapPayload(BaseModel):
    session: SessionPayload
    clientProfile: ClientProfilePayload | None = None
    staffProfile: WorkerPayload | None = None
    clients: list[ClientSummaryPayload]
    bookings: list[BookingPayload]
    notifications: list[NotificationPayload]
    stockItems: list[StockItemPayload]
    stockCategories: list[StockCategoryPayload]
    expenses: list[ExpensePayload]
    penalties: list[PenaltyPayload]
    workers: list[WorkerPayload]
    services: list[ServicePayload]
    boxes: list[BoxPayload]
    schedule: list[SchedulePayload]
    settings: SettingsBundlePayload


class ClientRegisterRequest(BaseModel):
    name: str = ""
    phone: str = ""
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    registered: bool = True
    initData: str = ""
    profile: ClientProfileInput | None = None

    @model_validator(mode="before")
    @classmethod
    def lift_profile(cls, raw: Any) -> Any:
        if isinstance(raw, dict) and isinstance(raw.get("profile"), dict):
            merged = {**raw["profile"], **raw}
            merged.pop("profile", None)
            return merged
        return raw

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Имя обязательно")
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "ClientRegisterRequest":
        if self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class ConsentRecordPayload(BaseModel):
    consented: bool
    consentedAt: str = ""


class ConsentCheckResponse(BaseModel):
    consented: bool


class StaffLinkRequest(BaseModel):
    login: str
    password: str = Field(max_length=128)


class SwitchRoleRequest(BaseModel):
    targetRole: StaffRole


class BookingCreateRequest(BaseModel):
    clientId: str
    clientName: str
    clientPhone: str
    service: str
    serviceId: str
    date: str
    time: str
    duration: int
    price: int
    status: BookingStatus
    workers: list[BookingWorkerPayload] = Field(default_factory=list)
    box: str
    paymentType: PaymentType
    paymentSettled: bool = False
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    plateType: str = "russian"
    referralSource: str = ""
    notifyWorkers: bool = False
    materials: list[BookingMaterialPayload] = Field(default_factory=list)

    @field_validator("clientName")
    @classmethod
    def validate_client_name(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_person_name(value)

    @field_validator("clientPhone")
    @classmethod
    def validate_client_phone(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "BookingCreateRequest":
        if self.car is not None and self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate is not None and self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class AddBookingServiceRequest(BaseModel):
    name: str
    serviceId: str
    price: int
    duration: int


class BookingUpdateRequest(BaseModel):
    clientName: str | None = None
    clientPhone: str | None = None
    service: str | None = None
    serviceId: str | None = None
    date: str | None = None
    time: str | None = None
    duration: int | None = None
    price: int | None = None
    status: BookingStatus | None = None
    workers: list[BookingWorkerPayload] | None = None
    box: str | None = None
    paymentType: PaymentType | None = None
    paymentSettled: bool | None = None
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    plateType: str | None = None
    notifyWorkers: bool | None = None
    isOutsource: bool | None = None
    materials: list[BookingMaterialPayload] | None = None

    @field_validator("clientName")
    @classmethod
    def validate_client_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_person_name(value)

    @field_validator("clientPhone")
    @classmethod
    def validate_client_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "BookingUpdateRequest":
        if self.car is not None and not self.car.strip():
            self.car = ""
        if self.car is not None and self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate is not None and not self.plate.strip():
            self.plate = ""
        if self.plate is not None and self.plate.strip():
            plate_type = self.plateType if self.plateType else "russian"
            self.plate = normalize_plate(self.plate, plate_type)
        return self


class ClientCardUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    car: str | None = None
    plate: str | None = None
    plateType: str | None = None
    vehicles: list[ClientVehiclePayload] | None = None
    notes: str | None = None
    debtBalance: int | None = None
    adminRating: int | None = Field(default=None, ge=0, le=5)
    adminNote: str | None = None
    referralSource: str | None = None
    depositActive: bool | None = None
    depositMonthly: int | None = None
    depositStartMonth: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        return normalize_phone(value)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "ClientCardUpdateRequest":
        if self.car is not None and not self.car.strip():
            self.car = ""
        if self.car is not None and self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate is not None and not self.plate.strip():
            self.plate = ""
        if self.plate is not None and self.plate.strip():
            plate_type = self.plateType if self.plateType else "russian"
            self.plate = normalize_plate(self.plate, plate_type)
        return self


class NotificationCreateRequest(BaseModel):
    recipientRole: Role
    recipientId: str | None = None
    message: str
    read: bool = False


class ReadAllNotificationsRequest(BaseModel):
    role: Role


class StockItemCreateRequest(BaseModel):
    name: str
    qty: float = Field(ge=0)
    unit: str
    unitPrice: float = Field(ge=0)
    category: str
    categoryId: str | None = None


class StockItemUpdateRequest(BaseModel):
    name: str | None = None
    qty: float | None = Field(default=None, ge=0)
    unit: str | None = None
    unitPrice: float | None = Field(default=None, ge=0)
    category: str | None = None
    categoryId: str | None = None


class StockCategoryCreateRequest(BaseModel):
    name: str
    parentId: str | None = None


class StockCategoryUpdateRequest(BaseModel):
    name: str | None = None
    parentId: str | None = None


class StockWriteOffRequest(BaseModel):
    qty: float = Field(gt=0)


class StockWriteOffPayload(BaseModel):
    id: str
    stockItemId: str | None = None
    stockItemName: str
    qty: float
    unit: str
    unitPrice: float
    totalCost: float
    source: str
    bookingId: str | None = None
    bookingService: str | None = None
    bookingClientName: str | None = None
    bookingDate: str | None = None
    bookingWorkerNames: str | None = None
    note: str | None = None
    createdAt: str


class IncomeCreateRequest(BaseModel):
    amount: int = Field(ge=1, le=10_000_000)
    source: str = Field(min_length=1, max_length=255)
    note: str | None = None
    date: str  # DD.MM.YYYY
    resourceGroup: str = "wash"

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("source не может быть пустым или состоять только из пробелов")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value.strip()


class IncomePayload(BaseModel):
    id: str
    amount: float
    source: str
    note: str | None
    createdById: str
    date: str
    resourceGroup: str = "wash"
    createdAt: datetime


class ExpenseCreateRequest(BaseModel):
    title: str
    amount: Decimal = Field(ge=1, le=10_000_000)
    category: str
    date: str
    note: str | None = None
    resourceGroup: str = "wash"

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value.strip()


class PenaltyCreateRequest(BaseModel):
    workerId: str
    title: str = Field(min_length=1, max_length=160)
    reason: str = Field(min_length=1, max_length=1000)


class OwnerReminderDispatchRequest(BaseModel):
    targetDate: str | None = None
    force: bool = False


class OwnerReminderDispatchPayload(BaseModel):
    message: str
    targetDate: str
    clientReminders: int
    workerReminders: int
    telegramDelivered: int


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(max_length=128)
    newPassword: str = Field(max_length=128)


class OwnerDatabaseResetPreviewPayload(BaseModel):
    ownersPreserved: int
    employeesDeleted: int
    clientsDeleted: int
    bookingsDeleted: int
    notificationsDeleted: int
    stockItemsDeleted: int
    expensesDeleted: int
    penaltiesDeleted: int
    servicesReset: int
    boxesReset: int
    scheduleReset: int
    settingsReset: int


class OwnerDatabaseResetStartRequest(BaseModel):
    password: str


class OwnerDatabaseResetApproveRequest(BaseModel):
    requestId: str
    creatorCode: str
    confirmationPhrase: str


class OwnerDatabaseResetExecuteRequest(BaseModel):
    requestId: str


class OwnerDatabaseResetStartPayload(BaseModel):
    requestId: str
    creatorCodeExpiresAt: datetime
    confirmationPhrase: str
    preview: OwnerDatabaseResetPreviewPayload
    warnings: list[str]
    message: str


class OwnerDatabaseResetApprovePayload(BaseModel):
    requestId: str
    finalizeAfter: datetime
    preview: OwnerDatabaseResetPreviewPayload
    warnings: list[str]
    message: str


class OwnerDatabaseResetExecutePayload(BaseModel):
    message: str
    preview: OwnerDatabaseResetPreviewPayload


class ContentAboutPayload(BaseModel):
    text: str
    features: list[str] = []
    image: str = ""


class ContentServicePayload(BaseModel):
    title: str
    subtitle: str = ""
    description: str = ""
    price: str = ""
    features: list[str] = []
    image: str = ""
    accent: str = "#2563eb"
    category: str = ""


class ContentWorksPayload(BaseModel):
    title: str
    description: str = ""
    image_url: str = ""


class ContentStatsPayload(BaseModel):
    value: str = "4.9"
    label: str = "Средний рейтинг"


class ContentTitlePayload(BaseModel):
    before: str = "Ваш автомобиль заслуживает "
    highlight: str = "лучшего"
    after: str = " ухода"

    def to_full_title(self) -> str:
        return f"{self.before}{self.highlight}{self.after}"


class ContentHeroPayload(BaseModel):
    backgroundImage: str = ""
    badgeText: str = "ATMOSFERA ДЕТЕЙЛИНГ"
    title: ContentTitlePayload = ContentTitlePayload()
    subtitle: str = "Премиум мойка и детейлинг для безупречного блеска вашего авто."
    button1Text: str = "Наши услуги"
    button1Action: str = "services"
    button2Text: str = "Записаться"
    button2Action: str = "contact"
    stats: list[ContentStatsPayload] = [
        ContentStatsPayload(value="4.9", label="Средний рейтинг"),
        ContentStatsPayload(value="15 мин", label="Экспресс-мойка"),
        ContentStatsPayload(value="100%", label="Довольных клиентов"),
    ]


class ContentPayload(BaseModel):
    hero: ContentHeroPayload = ContentHeroPayload()
    about: ContentAboutPayload = ContentAboutPayload(text="")
    services: list[ContentServicePayload] = []
    works: list[ContentWorksPayload] = []


class ContactPayload(BaseModel):
    name: str
    phone: str = ""
    service: str = ""
    message: str = ""


class ResetPasswordRequest(BaseModel):
    newPassword: str = Field(max_length=128)


class GenericMessage(BaseModel):
    message: str


class TelegramDeliveryResult(BaseModel):
    owner_id: str
    success: bool
    error: str | None = None


class TelegramBroadcastPayload(BaseModel):
    results: list[TelegramDeliveryResult]
    delivered: int
    failed: int


class OwnerExportDeliveryPayload(BaseModel):
    message: str
    fileName: str
    telegramSent: bool
    telegramChatId: str | None = None


class ShiftAttendancePayload(BaseModel):
    workerId: str
    workerName: str
    shiftCount: int
    shiftDates: list[str]  # DD.MM.YYYY, отсортированный по убыванию


JsonDict = dict[str, Any]



class ExpenseUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, ge=1, le=10_000_000)
    category: str | None = Field(default=None, max_length=100)
    date: str | None = None  # DD.MM.YYYY
    note: str | None = Field(default=None, max_length=1000)
    resourceGroup: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("title не может быть пустым или состоять только из пробелов")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("date должна быть в формате DD.MM.YYYY")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "ExpenseUpdateRequest":
        if all(v is None for v in [self.title, self.amount, self.category, self.date, self.note]):
            raise ValueError("Необходимо передать хотя бы одно поле для обновления")
        return self


class IncomeUpdateRequest(BaseModel):
    amount: Decimal | None = Field(default=None, ge=1, le=10_000_000)
    source: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=1000)  # явный null очищает поле
    date: str | None = None  # DD.MM.YYYY
    resourceGroup: str | None = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("source не может быть пустым или состоять только из пробелов")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("date должна быть в формате DD.MM.YYYY")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "IncomeUpdateRequest":
        # Use model_fields_set to detect explicitly provided fields (including null).
        # This allows {"note": null} to pass as a valid "clear note" request.
        if not self.model_fields_set:
            raise ValueError("Необходимо передать хотя бы одно поле для обновления")
        return self


class PiggyBankTransactionPayload(BaseModel):
    id: str
    bookingId: str | None = None
    amount: float
    transactionType: str
    purpose: str
    materialName: str | None = None
    materialCost: float | None = None
    date: str
    resourceGroup: str = "detailing"
    createdAt: datetime
    bookingInfo: str | None = None
    bookingClientName: str | None = None
    bookingService: str | None = None
    bookingDate: str | None = None
    bookingTime: str | None = None
    bookingCar: str | None = None
    bookingPlate: str | None = None
    bookingPrice: float | None = None
    bookingStatus: str | None = None


class PiggyBankWithdrawRequest(BaseModel):
    bookingId: str
    materialName: str = Field(min_length=1, max_length=255)
    materialCost: float = Field(ge=1, le=10_000_000)
    purpose: str = ""
    date: str

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value.strip()


class PiggyBankAdjustRequest(BaseModel):
    resourceGroup: str = Field(pattern=r"^(wash|detailing|general)$")
    amount: float = Field(ge=-10_000_000, le=10_000_000)
    purpose: str = ""
    date: str = ""

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        stripped = value.strip()
        if stripped and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", stripped):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return stripped


class PiggyBankWashBreakdown(BaseModel):
    selfServiceRevenue: float = 0
    selfServiceMaster: float = 0
    selfServicePiggy: float = 0
    classicRevenue: float = 0
    classicMaster: float = 0
    classicPiggy: float = 0
    totalRevenue: float = 0
    totalMaster: float = 0
    totalPiggy: float = 0
    washNetPiggy: float = 0


class PiggyBankDetailingBreakdown(BaseModel):
    detailingRevenue: float = 0
    detailingMaster: float = 0
    deposits24Percent: float = 0
    materialWithdrawals: float = 0
    materialRepayments: float = 0
    netPiggy: float = 0
    detailingExpenses: float = 0
    detailingIncomes: float = 0


class PiggyBankResponse(BaseModel):
    balance: float = 0
    transactions: list[PiggyBankTransactionPayload] = Field(default_factory=list)
    wash: PiggyBankWashBreakdown | None = None
    detailing: PiggyBankDetailingBreakdown | None = None
    masterDailyOutputs: float = 0
    washExpenses: float = 0
    washIncomes: float = 0
    detailingExpenses: float = 0
    detailingIncomes: float = 0
    remainingInPiggyBank: float = 0
    combinedBalance: float = 0
    archives: list[WeeklyArchivePayload] = Field(default_factory=list)
    ownerProfitShares: list[OwnerProfitShareItem] = Field(default_factory=list)
    ownerProfitTotal: float = 0
    ownerProfitPaid: float = 0
    ownerProfitBalance: float = 0


class WeeklyArchivePayload(BaseModel):
    id: int
    weekStart: str
    weekEnd: str
    totalRevenue: float = 0
    totalIncome: float = 0
    totalExpense: float = 0
    bookingCount: int = 0
    incomeCount: int = 0
    expenseCount: int = 0
    piggyBankBalance: float = 0
    createdAt: datetime


class WalletResponse(BaseModel):
    weekStart: str
    weekEnd: str
    revenue: float = 0
    totalIncome: float = 0
    totalExpense: float = 0
    profit: float = 0
    bookingCount: int = 0
    incomes: list[IncomePayload] = Field(default_factory=list)
    expenses: list[ExpensePayload] = Field(default_factory=list)
    piggyBankBalance: float = 0
    archives: list[WeeklyArchivePayload] = Field(default_factory=list)


# --- Owner Profit Share schemas ---


class OwnerProfitShareItem(BaseModel):
    id: str
    bookingId: str
    service: str = ""
    clientName: str = ""
    clientPhone: str = ""
    date: str
    time: str = ""
    price: float = 0
    amount: float
    status: str
    createdAt: datetime
    workerName: str = ""
    car: str = ""
    plate: str = ""


class OwnerProfitShareSummary(BaseModel):
    ownerId: str
    ownerName: str
    totalAccrued: float = 0
    totalPaid: float = 0
    balanceToPay: float = 0
    shares: list[OwnerProfitShareItem] = Field(default_factory=list)


class OwnerSalaryDetailResponse(BaseModel):
    owners: list[OwnerProfitShareSummary] = Field(default_factory=list)
    totalAccrued: float = 0
    totalPaid: float = 0
    totalBalanceToPay: float = 0


class PayOwnerSalaryRequest(BaseModel):
    ownerId: str
    amount: Decimal = Field(ge=1, le=10_000_000)
    note: str = ""


class PayOwnerSalaryResponse(BaseModel):
    message: str
    payoutId: str
    expenseId: str
    newBalance: float


class OverrideEarnedRequest(BaseModel):
    overrideEarned: int | None = None


class BookingHistoryItem(BaseModel):
    id: str
    date: str
    time: str
    service: str
    clientName: str
    car: str | None = None
    plate: str | None = None
    box: str
    price: int
    status: BookingStatus
    paymentType: str
    paymentSettled: bool = False
    workers: list[BookingWorkerPayload] = Field(default_factory=list)
    createdAt: datetime


class BookingTotalsWorkerItem(BaseModel):
    workerId: str
    workerName: str
    bookingCount: int = 0
    accruedFromBookings: int = 0
    baseSalary: int = 0
    shiftPayTotal: int = 0
    shiftCount: int = 0
    bonusTotal: int = 0
    adjustmentTotal: int = 0
    advanceTotal: int = 0
    deductionTotal: int = 0
    payoutTotal: int = 0
    totalAccrued: int = 0
    totalDeducted: int = 0
    balance: int = 0


class BookingTotalsOwnerItem(BaseModel):
    ownerId: str
    ownerName: str
    totalAccrued: int = 0
    totalPaid: int = 0
    bookingCount: int = 0

class BookingTotalsPiggyItem(BaseModel):
    resourceGroup: str
    amount: int = 0
    bookingCount: int = 0


class BookingHistoryTotals(BaseModel):
    workers: list[BookingTotalsWorkerItem] = Field(default_factory=list)
    owners: list[BookingTotalsOwnerItem] = Field(default_factory=list)
    piggy: list[BookingTotalsPiggyItem] = Field(default_factory=list)


class BookingMoneySplitWorkerItem(BaseModel):
    linkId: int
    workerId: str
    workerName: str
    percent: float = 0
    payType: str = "percent"
    fixedAmount: int | None = None
    earned: int = 0
    overrideEarned: int | None = None


class BookingMoneySplitOwnerItem(BaseModel):
    ownerId: str
    ownerName: str
    amount: float = 0
    status: str = "pending"
    shareId: str | None = None


class BookingPiggyTxItem(BaseModel):
    id: str
    amount: float
    transactionType: str
    purpose: str
    resourceGroup: str = ""
    date: str = ""


class BookingAdditionalServiceItem(BaseModel):
    name: str
    price: int
    priceMode: str = "add"
    duration: int = 0
    isOutsource: bool = False
    outsourceAmount: int | None = None


class BookingAsvcPiggyItem(BaseModel):
    name: str
    resourceGroup: str = ""
    amount: int = 0


class BookingAsvcWorkerItem(BaseModel):
    linkId: int
    workerId: str
    workerName: str
    percent: float = 0
    payType: str = "percent"
    fixedAmount: int | None = None
    earned: int = 0
    additionalServiceName: str = ""


class BookingMoneySplitDetail(BaseModel):
    id: str
    clientName: str
    clientPhone: str
    service: str
    serviceId: str
    date: str
    time: str
    box: str
    price: int
    status: BookingStatus
    paymentType: str
    paymentSettled: bool = False
    resourceGroup: str = ""
    mainPrice: int = 0
    additionalServices: list[BookingAdditionalServiceItem] = Field(default_factory=list)
    additionalTotal: int = 0
    subtractTotal: int = 0
    splitBase: int = 0
    materialsCost: int = 0
    materialsCostAuto: int = 0
    materialsCostOverride: int | None = None
    net: int = 0
    masterTotal: int = 0
    masterTotalAuto: int = 0
    masterByWorker: dict[str, int] = Field(default_factory=dict)
    asvcMasterPayTotal: int = 0
    asvcPiggyDeposits: list[BookingAsvcPiggyItem] = Field(default_factory=list)
    asvcOwnerExtra: int = 0
    asvcWorkers: list[BookingAsvcWorkerItem] = Field(default_factory=list)
    piggyDeposit: int = 0
    piggyDepositAuto: int = 0
    ownersTotal: int = 0
    ownersTotalAuto: int = 0
    ownerByOwner: dict[str, int] = Field(default_factory=dict)
    ownerByOwnerAuto: dict[str, int] = Field(default_factory=dict)
    masterPayType: str = ""
    masterPayValue: int = 0
    piggyPayType: str = ""
    piggyPayValue: int = 0
    piggyTarget: str = ""
    hasCustom: bool = False
    workers: list[BookingMoneySplitWorkerItem] = Field(default_factory=list)
    piggyTransactions: list[BookingPiggyTxItem] = Field(default_factory=list)
    ownerShares: list[BookingMoneySplitOwnerItem] = Field(default_factory=list)
    canEdit: bool = True


class BookingWorkerEarnedUpdate(BaseModel):
    linkId: int
    overrideEarned: int | None = Field(default=None, ge=0, le=10_000_000)


class BookingMoneySplitOwnerUpdate(BaseModel):
    ownerId: str
    amount: float = Field(ge=0, le=10_000_000)


class BookingMoneySplitUpdateRequest(BaseModel):
    workers: list[BookingWorkerEarnedUpdate] = Field(default_factory=list)
    materialsCost: int | None = Field(default=None, ge=0, le=10_000_000)
    piggyDeposit: int | None = Field(default=None, ge=0, le=10_000_000)
    owners: list[BookingMoneySplitOwnerUpdate] = Field(default_factory=list)


# --- Archive (главная библиотека и картотека) schemas ---


class ArchiveBookingWorkerItem(BaseModel):
    workerId: str
    workerName: str
    percent: float = 0
    payType: str = "percent"
    fixedAmount: float | None = None
    earned: int = 0
    additionalServiceName: str | None = None


class ArchiveAdditionalServiceItem(BaseModel):
    name: str
    price: int
    priceMode: str = "add"


class ArchiveBookingItem(BaseModel):
    id: str
    date: str
    time: str
    service: str
    clientName: str
    clientPhone: str = ""
    clientId: str | None = None
    car: str | None = None
    plate: str | None = None
    box: str
    price: int
    net: int = 0
    status: BookingStatus
    paymentType: str = ""
    paymentSettled: bool = False
    resourceGroup: str = ""
    masterTotal: int = 0
    piggyDeposit: int = 0
    ownersTotal: int = 0
    materialsCost: int = 0
    workers: list[ArchiveBookingWorkerItem] = Field(default_factory=list)
    asvcWorkers: list[ArchiveBookingWorkerItem] = Field(default_factory=list)
    additionalServices: list[ArchiveAdditionalServiceItem] = Field(default_factory=list)
    createdAt: datetime


class ArchivePayrollItem(BaseModel):
    workerId: str
    workerName: str
    bookingCount: int = 0
    accruedFromBookings: int = 0
    baseSalary: int = 0
    shiftPayTotal: int = 0
    shiftCount: int = 0
    bonusTotal: int = 0
    adjustmentTotal: int = 0
    advanceTotal: int = 0
    deductionTotal: int = 0
    payoutTotal: int = 0
    totalAccrued: int = 0
    totalDeducted: int = 0
    balance: int = 0


class ArchiveOwnerItem(BaseModel):
    ownerId: str
    ownerName: str
    totalAccrued: int = 0
    totalPaid: int = 0
    bookingCount: int = 0


class ArchiveSummary(BaseModel):
    revenue: int = 0
    net: int = 0
    totalIncome: int = 0
    totalExpense: int = 0
    profit: int = 0
    masterTotal: int = 0
    piggyDeposit: int = 0
    ownersAccrued: int = 0
    ownersPaid: int = 0
    bookingCount: int = 0
    incomeCount: int = 0
    expenseCount: int = 0
    piggyTxCount: int = 0


class ArchiveResponse(BaseModel):
    dateFrom: str = ""
    dateTo: str = ""
    summary: ArchiveSummary = Field(default_factory=ArchiveSummary)
    bookings: list[ArchiveBookingItem] = Field(default_factory=list)
    incomes: list[IncomePayload] = Field(default_factory=list)
    expenses: list[ExpensePayload] = Field(default_factory=list)
    piggyTransactions: list[PiggyBankTransactionPayload] = Field(default_factory=list)
    payroll: list[ArchivePayrollItem] = Field(default_factory=list)
    owners: list[ArchiveOwnerItem] = Field(default_factory=list)


# --- Deposit (абонентские клиенты / цех малярка) ---

DEPOSIT_PLANS = {"fee", "washes", "per_wash", "unlimited"}


class DepositSubscriptionUpdateRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=64)
    depositActive: bool | None = None
    depositMonthly: int | None = Field(default=None, ge=0, le=100_000_000)
    depositStartMonth: str = ""
    depositPlan: str = ""
    depositWashesIncluded: int | None = Field(default=None, ge=0, le=100_000)
    depositWashesCarryover: bool | None = None
    depositMinBalance: int | None = Field(default=None, ge=0, le=100_000_000)
    depositBillingDay: int | None = Field(default=None, ge=1, le=31)
    depositWashPrice: int | None = Field(default=None, ge=0, le=100_000_000)

    @field_validator("depositPlan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        value = value.strip()
        if value and value not in DEPOSIT_PLANS:
            raise ValueError("Неизвестный тип абонемента")
        return value


class DepositTopUpRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=64)
    amount: float = Field(ge=1, le=100_000_000)
    date: str = ""
    note: str = ""

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        value = value.strip()
        if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value


class DepositAdjustRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=64)
    amount: float = Field(ge=-100_000_000, le=100_000_000)
    note: str = ""
    date: str = ""

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        value = value.strip()
        if value and not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value


class DepositWashRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=64)
    car: str = ""
    plate: str = ""
    plateType: str = "russian"
    price: float = Field(ge=1, le=10_000_000)
    date: str = ""
    time: str = ""
    duration: int = Field(default=30, ge=1)
    serviceId: str = ""
    service: str = ""
    workerId: str = ""
    workerName: str = ""
    workerPercent: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def validate_vehicle(self) -> "DepositWashRequest":
        if not self.car.strip() and not self.plate.strip():
            raise ValueError("Укажите марку авто или гос.номер")
        if self.car.strip():
            self.car = normalize_vehicle_name(self.car)
        if self.plate.strip():
            self.plate = normalize_plate(self.plate, self.plateType)
        return self


class DepositSettleRequest(BaseModel):
    clientId: str = Field(min_length=1, max_length=64)
    month: str

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: str) -> str:
        if not re.fullmatch(r"\d{2}\.\d{4}", value.strip()):
            raise ValueError("Месяц должен быть в формате ММ.ГГГГ")
        return value.strip()


class DepositTransactionPayload(BaseModel):
    id: str
    clientId: str
    date: str
    transaction_type: str
    amount: float
    balance_after: float
    description: str = ""
    bookingId: str | None = None
    createdById: str | None = None
    createdAt: datetime
    car: str = ""
    plate: str = ""


class DepositMonthPayload(BaseModel):
    id: str
    clientId: str
    month: str
    subscription: float = 0
    washTotal: float = 0
    balanceAfter: float = 0
    carryoverWashes: int = 0
    closedAt: datetime | None = None


class DepositStats(BaseModel):
    totalTopUps: float = 0
    totalWashDebits: float = 0
    totalAdjustments: float = 0
    totalWashCount: int = 0
    avgWashPrice: float = 0
    monthsActive: int = 0
    startMonth: str = ""


class DepositMonthBreakdown(BaseModel):
    month: str
    washTotal: float = 0
    washCount: int = 0
    subscription: float = 0
    washLimit: int = 0
    carriedWashes: int = 0
    topUp: float = 0
    adjust: float = 0
    closed: bool = False
    balanceStart: float = 0
    balanceAfter: float = 0


class DepositOverview(BaseModel):
    clientId: str
    clientName: str
    depositActive: bool
    depositMonthly: int = 0
    depositStartMonth: str = ""
    depositPlan: str = "fee"
    depositWashesIncluded: int = 0
    depositWashesCarryover: bool = False
    depositMinBalance: int = 0
    depositBillingDay: int = 1
    depositWashPrice: int = 0
    balance: float = 0
    monthLabel: str = ""
    monthWashTotal: float = 0
    monthWashCount: int = 0
    monthSubscription: float = 0
    monthPayable: float = 0
    planWashLimit: int = 0
    washesLeft: int = 0
    carriedWashes: int = 0
    needsTopUp: bool = False
    monthPending: bool = False
    stats: DepositStats = Field(default_factory=DepositStats)
    transactions: list[DepositTransactionPayload] = Field(default_factory=list)
    closedMonths: list[DepositMonthPayload] = Field(default_factory=list)
    monthRows: list[DepositMonthBreakdown] = Field(default_factory=list)


class DepositSummaryItem(BaseModel):
    clientId: str
    clientName: str
    depositMonthly: int = 0
    balance: float = 0
    active: bool = False
    depositPlan: str = "fee"
    monthLabel: str = ""
    monthWashCount: int = 0
    planWashLimit: int = 0
    washesLeft: int = 0
    needsTopUp: bool = False
    monthPending: bool = False
    startMonth: str = ""
    owners: list[ArchiveOwnerItem] = Field(default_factory=list)

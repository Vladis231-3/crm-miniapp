from __future__ import annotations

from datetime import datetime
import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


Role = Literal["client", "admin", "worker", "owner", "accountant"]
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
PaymentType = Literal["cash", "card", "online"]
PayrollEntryKind = Literal["bonus", "advance", "deduction", "payout", "adjustment"]

NAME_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё' -]{1,59}$")
REPEATED_LETTERS_PATTERN = re.compile(r"([A-Za-zА-Яа-яЁё])\1{3,}")
VEHICLE_PATTERN = re.compile(r"^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$")
REPEATED_VEHICLE_PATTERN = re.compile(r"([A-Za-zА-Яа-яЁё0-9])\1{3,}")
PLATE_LATIN_TO_CYRILLIC = {
    "A": "А",
    "B": "В",
    "C": "С",
    "E": "Е",
    "H": "Н",
    "K": "К",
    "M": "М",
    "O": "О",
    "P": "Р",
    "T": "Т",
    "X": "Х",
    "Y": "У",
}
PLATE_PATTERN = re.compile(r"^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}$")


def normalize_person_name(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip()
    letters_only = "".join(char for char in normalized if char.isalpha())
    if len(letters_only) < 2:
        raise ValueError("Введите настоящее имя")
    if any(char.isdigit() for char in normalized):
        raise ValueError("Имя не должно содержать цифры")
    if not NAME_PATTERN.fullmatch(normalized):
        raise ValueError("Имя должно содержать только буквы")
    if len(set(letter.lower() for letter in letters_only)) < 2:
        raise ValueError("Введите настоящее имя")
    if REPEATED_LETTERS_PATTERN.search(letters_only):
        raise ValueError("Введите настоящее имя")
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


def normalize_plate(value: str) -> str:
    cleaned = re.sub(r"\s+", "", value).upper()
    latin_map = {
        "A": "A",
        "B": "B",
        "C": "C",
        "E": "E",
        "H": "H",
        "K": "K",
        "M": "M",
        "O": "O",
        "P": "P",
        "T": "T",
        "X": "X",
        "Y": "Y",
        "А": "A",
        "В": "B",
        "С": "C",
        "Е": "E",
        "Н": "H",
        "К": "K",
        "М": "M",
        "О": "O",
        "Р": "P",
        "Т": "T",
        "Х": "X",
        "У": "Y",
    }
    normalized_chars: list[str] = []
    for char in cleaned:
        if char in latin_map:
            normalized_chars.append(latin_map[char])
        elif char.isdigit() or ("A" <= char <= "Z"):
            normalized_chars.append(char)
    normalized = "".join(normalized_chars)
    if not normalized:
        raise ValueError("Enter vehicle plate")
    if len(normalized) > 9:
        raise ValueError("Номерной знак слишком длинный (максимум 9 символов)")
    if not re.fullmatch(
        r"^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}(?:\d{2,3})?$", normalized
    ):
        raise ValueError("Enter plate as A123BC77 or A123BC777")
    return normalized


class ClientVehiclePayload(BaseModel):
    car: str = ""
    plate: str = ""

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str) -> str:
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_plate(value)


class ClientProfilePayload(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    registered: bool = True
    phoneVerified: bool = False


class ClientProfileInput(BaseModel):
    name: str
    phone: str = ""
    car: str = ""
    plate: str = ""
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    registered: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class ClientSummaryPayload(BaseModel):
    id: str
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    vehicles: list[ClientVehiclePayload] = Field(default_factory=list)
    notes: str = ""
    debtBalance: int = 0
    adminRating: int = Field(default=0, ge=0, le=5)
    adminNote: str = ""
    referralSource: str = ""


class ClientCreateRequest(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
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

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str) -> str:
        if not value.strip():
            return ""
        return normalize_plate(value)


class WorkerPayload(BaseModel):
    id: str
    role: StaffRole
    name: str
    experience: str
    defaultPercent: float = Field(ge=0, le=40, default=0)
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


class WorkerPayrollBookingPayload(BaseModel):
    bookingId: str
    service: str
    date: str
    time: str
    price: int
    percent: float
    earned: int


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

SalaryPeriod = Literal["day", "week", "month", "all"]
SalarySegment = Literal["all", "wash", "detailing"]


class SalaryBookingItem(BaseModel):
    id: str
    date: str
    time: str
    service: str
    box: str
    price: int
    earned: int
    percent: float
    resourceGroup: str


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
    percent: float = Field(ge=0, le=40, default=0)


class BookingServiceItem(BaseModel):
    name: str
    serviceId: str
    price: int = Field(ge=0)
    duration: int = Field(gt=0)


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
    paymentSettled: bool = True
    createdAt: datetime
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    services: list[BookingServiceItem] = Field(default_factory=list)


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


class StockItemPayload(BaseModel):
    id: str
    name: str
    qty: int
    unit: str
    unitPrice: int
    category: str


class ShiftChecklistItemPayload(BaseModel):
    stockItemId: str
    name: str
    unit: str
    startQty: int | None = None
    endQty: int | None = None
    actualQty: int = Field(ge=0)


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
    actualQty: int = Field(ge=0)


class ShiftChecklistSubmitRequest(BaseModel):
    phase: Literal["start", "end"]
    note: str = ""
    items: list[ShiftChecklistSubmitItem] = Field(default_factory=list)


class AdminShiftInspectionSupplyPayload(BaseModel):
    stockItemId: str
    name: str
    category: str
    unit: str
    qty: int = Field(ge=0)
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


class ExpensePayload(BaseModel):
    id: str
    title: str
    amount: int
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


class DetailingRequestCreateRequest(BaseModel):
    serviceId: str
    notes: str | None = None
    car: str | None = None
    plate: str | None = None

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_plate(value)


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
    percent: float = Field(ge=0, le=40, default=0)


class OwnerCompanyPayload(BaseModel):
    name: str
    legalName: str
    inn: str
    address: str
    phone: str
    email: str


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
    percent: float = Field(ge=0, le=40, default=0)
    salaryBase: int
    salaryPerShift: int = 0
    active: bool
    telegramChatId: str = ""


class WorkerCreateRequest(BaseModel):
    role: EmployeeRole = "worker"
    name: str
    login: str
    password: str = Field(max_length=128)
    percent: float = Field(default=0, ge=0, le=40)
    salaryBase: int = 0
    phone: str = ""
    email: str = ""
    telegramChatId: str = ""


class PayrollEntryCreateRequest(BaseModel):
    workerId: str
    kind: PayrollEntryKind
    amount: int
    note: str = ""

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
    expenses: list[ExpensePayload]
    penalties: list[PenaltyPayload]
    workers: list[WorkerPayload]
    services: list[ServicePayload]
    boxes: list[BoxPayload]
    schedule: list[SchedulePayload]
    settings: SettingsBundlePayload


class ClientRegisterRequest(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Имя обязательно")
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


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
    duration: int = Field(gt=0)
    price: int = Field(ge=0)
    status: BookingStatus
    workers: list[BookingWorkerPayload] = Field(default_factory=list)
    box: str
    paymentType: PaymentType
    paymentSettled: bool = True
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    notifyWorkers: bool = False

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

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str:
        if value is None or not value.strip():
            return ""
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str:
        if value is None or not value.strip():
            return ""
        return normalize_plate(value)


class AddBookingServiceRequest(BaseModel):
    name: str
    serviceId: str
    price: int = Field(ge=0)
    duration: int = Field(gt=0)


class BookingUpdateRequest(BaseModel):
    clientName: str | None = None
    clientPhone: str | None = None
    service: str | None = None
    serviceId: str | None = None
    date: str | None = None
    time: str | None = None
    duration: int | None = Field(default=None, gt=0)
    price: int | None = Field(default=None, ge=0)
    status: BookingStatus | None = None
    workers: list[BookingWorkerPayload] | None = None
    box: str | None = None
    paymentType: PaymentType | None = None
    paymentSettled: bool | None = None
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    notifyWorkers: bool | None = None

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

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            return ""
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            return ""
        return normalize_plate(value)


class ClientCardUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    car: str | None = None
    plate: str | None = None
    notes: str | None = None
    debtBalance: int | None = None
    adminRating: int | None = Field(default=None, ge=0, le=5)
    adminNote: str | None = None
    referralSource: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_person_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_phone(value)

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            return ""
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.strip():
            return ""
        return normalize_plate(value)


class NotificationCreateRequest(BaseModel):
    recipientRole: Role
    recipientId: str | None = None
    message: str
    read: bool = False


class ReadAllNotificationsRequest(BaseModel):
    role: Role


class StockItemCreateRequest(BaseModel):
    name: str
    qty: int = Field(ge=0)
    unit: str
    unitPrice: int = Field(ge=0)
    category: str


class StockItemUpdateRequest(BaseModel):
    name: str | None = None
    qty: int | None = Field(default=None, ge=0)
    unit: str | None = None
    unitPrice: int | None = Field(default=None, ge=0)
    category: str | None = None


class StockWriteOffRequest(BaseModel):
    qty: int = Field(gt=0)


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
    amount: int
    source: str
    note: str | None
    createdById: str
    date: str
    resourceGroup: str = "wash"
    createdAt: datetime


class ExpenseCreateRequest(BaseModel):
    title: str
    amount: int = Field(ge=1, le=10_000_000)
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
    amount: int | None = Field(default=None, ge=1, le=10_000_000)
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
    amount: int | None = Field(default=None, ge=1, le=10_000_000)
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
    amount: int
    transactionType: str
    purpose: str
    materialName: str | None = None
    materialCost: int | None = None
    date: str
    resourceGroup: str = "detailing"
    createdAt: datetime
    bookingInfo: str | None = None


class PiggyBankWithdrawRequest(BaseModel):
    bookingId: str
    materialName: str = Field(min_length=1, max_length=255)
    materialCost: int = Field(ge=1, le=10_000_000)
    purpose: str = ""
    date: str

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if not re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value.strip()):
            raise ValueError("Дата должна быть в формате ДД.ММ.ГГГГ")
        return value.strip()


class PiggyBankWashBreakdown(BaseModel):
    selfServiceRevenue: int = 0
    selfServiceMaster: int = 0
    selfServicePiggy: int = 0
    classicRevenue: int = 0
    classicMaster: int = 0
    classicPiggy: int = 0
    totalRevenue: int = 0
    totalMaster: int = 0
    totalPiggy: int = 0


class PiggyBankDetailingBreakdown(BaseModel):
    detailingRevenue: int = 0
    detailingMaster: int = 0
    deposits24Percent: int = 0
    materialWithdrawals: int = 0
    materialRepayments: int = 0
    netPiggy: int = 0
    detailingExpenses: int = 0
    detailingIncomes: int = 0


class PiggyBankResponse(BaseModel):
    balance: int = 0
    transactions: list[PiggyBankTransactionPayload] = Field(default_factory=list)
    wash: PiggyBankWashBreakdown | None = None
    detailing: PiggyBankDetailingBreakdown | None = None
    masterDailyOutputs: int = 0
    washExpenses: int = 0
    washIncomes: int = 0
    detailingExpenses: int = 0
    detailingIncomes: int = 0
    remainingInPiggyBank: int = 0
    archives: list[WeeklyArchivePayload] = Field(default_factory=list)


class WeeklyArchivePayload(BaseModel):
    id: int
    weekStart: str
    weekEnd: str
    totalRevenue: int = 0
    totalIncome: int = 0
    totalExpense: int = 0
    bookingCount: int = 0
    incomeCount: int = 0
    expenseCount: int = 0
    piggyBankBalance: int = 0
    createdAt: datetime


class WalletResponse(BaseModel):
    weekStart: str
    weekEnd: str
    revenue: int = 0
    totalIncome: int = 0
    totalExpense: int = 0
    profit: int = 0
    bookingCount: int = 0
    incomes: list[IncomePayload] = Field(default_factory=list)
    expenses: list[ExpensePayload] = Field(default_factory=list)
    piggyBankBalance: int = 0
    archives: list[WeeklyArchivePayload] = Field(default_factory=list)

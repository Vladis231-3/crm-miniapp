from __future__ import annotations

from datetime import datetime
import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Role = Literal["client", "admin", "worker", "owner"]
StaffRole = Literal["admin", "worker", "owner"]
EmployeeRole = Literal["admin", "worker"]
BookingStatus = Literal["new", "confirmed", "scheduled", "in_progress", "completed", "no_show", "cancelled", "admin_review"]
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
    normalized_chars: list[str] = []
    for char in cleaned:
        if char in PLATE_LATIN_TO_CYRILLIC:
            normalized_chars.append(PLATE_LATIN_TO_CYRILLIC[char])
        elif char.isdigit() or char in "АВЕКМНОРСТУХ":
            normalized_chars.append(char)
    normalized = "".join(normalized_chars)[:6]
    if not normalized:
        raise ValueError("Введите госномер")
    if not PLATE_PATTERN.fullmatch(normalized):
        raise ValueError("Введите номер в формате У999УУ")
    return normalized


class ClientProfilePayload(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
    registered: bool = True


class ClientProfileInput(BaseModel):
    name: str
    phone: str
    car: str = ""
    plate: str = ""
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
    notes: str = ""
    debtBalance: int = 0
    adminRating: int = Field(default=0, ge=0, le=5)
    adminNote: str = ""


class WorkerPayload(BaseModel):
    id: str
    role: StaffRole
    name: str
    experience: str
    defaultPercent: int = Field(ge=0, le=40)
    salaryBase: int = 0
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
    percent: int
    earned: int


class WorkerPayrollSummaryPayload(BaseModel):
    completedBookings: int = 0
    completedRevenue: int = 0
    accruedFromBookings: int = 0
    baseSalary: int = 0
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


class BookingWorkerPayload(BaseModel):
    workerId: str
    workerName: str
    percent: int = Field(ge=0, le=40)


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
    createdAt: datetime
    notes: str | None = None
    car: str | None = None
    plate: str | None = None


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


class ExpensePayload(BaseModel):
    id: str
    title: str
    amount: int
    category: str
    date: str
    note: str | None = None


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
    percent: int = Field(ge=0, le=40)


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
    percent: int = Field(ge=0, le=40)
    salaryBase: int
    active: bool
    telegramChatId: str = ""


class WorkerCreateRequest(BaseModel):
    role: EmployeeRole = "worker"
    name: str
    login: str
    password: str
    percent: int = Field(default=40, ge=0, le=40)
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
    sessionId: str
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


class ClientAuthRequest(BaseModel):
    profile: ClientProfileInput
    initData: str | None = None


class StaffLoginRequest(BaseModel):
    login: str
    password: str
    twoFactorCode: str | None = None


class TelegramOwnerAuthRequest(BaseModel):
    initData: str


class AuthResponse(BaseModel):
    token: str
    role: Role
    actorId: str
    bootstrap: BootstrapPayload


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
    notes: str | None = None
    car: str | None = None
    plate: str | None = None
    notifyWorkers: bool = False

    @field_validator("clientName")
    @classmethod
    def validate_client_name(cls, value: str) -> str:
        return normalize_person_name(value)

    @field_validator("clientPhone")
    @classmethod
    def validate_client_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("car")
    @classmethod
    def validate_car(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Введите автомобиль")
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Введите госномер")
        return normalize_plate(value)


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
        return normalize_vehicle_name(value)

    @field_validator("plate")
    @classmethod
    def validate_plate(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_plate(value)


class ClientCardUpdateRequest(BaseModel):
    notes: str | None = None
    debtBalance: int | None = None
    adminRating: int | None = Field(default=None, ge=0, le=5)
    adminNote: str | None = None


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


class ExpenseCreateRequest(BaseModel):
    title: str
    amount: int = Field(ge=0)
    category: str
    date: str
    note: str | None = None


class PenaltyCreateRequest(BaseModel):
    workerId: str
    title: str
    reason: str


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
    currentPassword: str
    newPassword: str


class OwnerDatabaseResetPreviewPayload(BaseModel):
    ownersPreserved: int
    employeesDeleted: int
    clientsDeleted: int
    bookingsDeleted: int
    notificationsDeleted: int
    stockItemsDeleted: int
    expensesDeleted: int
    penaltiesDeleted: int
    sessionsClosed: int
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


class GenericMessage(BaseModel):
    message: str


class OwnerExportDeliveryPayload(BaseModel):
    message: str
    fileName: str
    telegramSent: bool
    telegramChatId: str | None = None


JsonDict = dict[str, Any]

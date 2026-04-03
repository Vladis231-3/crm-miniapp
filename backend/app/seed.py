from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AppSetting, Box, ScheduleEntry, Service, StaffUser
from .security import hash_password


def seed_database(db: Session) -> None:
    if not db.scalar(select(StaffUser.id).limit(1)):
        staff = [
            StaffUser(
                id="admin-1",
                login="admin",
                password_hash=hash_password("admin"),
                role="admin",
                name="Администратор",
                phone="+7 (900) 000-00-00",
                email="admin@atmosfera.ru",
                city="Москва",
                experience="7 лет",
                specialty="Управление записями",
                about="Координирует загрузку боксов и работу смены.",
                default_percent=0,
                salary_base=0,
                available=True,
                active=True,
            ),
            StaffUser(
                id="w1",
                login="ivan",
                password_hash=hash_password("master"),
                role="worker",
                name="Иван",
                phone="+7 (912) 555-44-33",
                email="ivan@atmosfera.ru",
                city="Москва",
                experience="5 лет",
                specialty="Детейлинг, полировка стекол",
                about="Специализируется на полировке и восстановительных работах.",
                default_percent=30,
                salary_base=0,
                available=True,
                active=True,
            ),
            StaffUser(
                id="w2",
                login="oleg",
                password_hash=hash_password("master"),
                role="worker",
                name="Олег",
                phone="+7 (915) 222-11-00",
                email="oleg@atmosfera.ru",
                city="Москва",
                experience="ученик",
                specialty="Мойка, подготовка авто",
                about="Помогает на мойке и подготовке машин.",
                default_percent=10,
                salary_base=25000,
                available=True,
                active=True,
            ),
            StaffUser(
                id="w3",
                login="andrey",
                password_hash=hash_password("master"),
                role="worker",
                name="Андрей",
                phone="+7 (926) 700-11-22",
                email="andrey@atmosfera.ru",
                city="Москва",
                experience="3 года",
                specialty="Ремонт стекла",
                about="Занимается восстановлением и ремонтом автостекла.",
                default_percent=25,
                salary_base=0,
                available=False,
                active=False,
            ),
            StaffUser(
                id="owner-1",
                login="owner",
                password_hash=hash_password("owner"),
                role="owner",
                name="Владелец",
                phone="+7 (495) 000-00-00",
                email="info@atmosfera.ru",
                city="Москва",
                experience="12 лет",
                specialty="Управление бизнесом",
                about="Отвечает за развитие сервиса и финансовые показатели.",
                default_percent=0,
                salary_base=0,
                available=True,
                active=True,
            ),
        ]
        db.add_all(staff)

    if not db.scalar(select(Service.id).limit(1)):
        services = [
            Service(id="s1", name="Мойка базовая", category="Мойка", price=1200, duration=30, description="Полная ручная мойка кузова, стекол и дисков.", active=True),
            Service(id="s2", name="Полировка стекла", category="Детейлинг", price=3500, duration=60, description="Устранение царапин и замутнений, нанесение гидрофобного покрытия.", active=True),
            Service(id="s3", name="Ремонт лобового стекла", category="Ремонт стекла", price=7000, duration=90, description="Устранение сколов и трещин до 5 см.", active=True),
            Service(id="s4", name="Аренда бокса", category="Аренда бокса", price=600, duration=60, description="Аренда бокса с подъемником и инструментами.", active=True),
            Service(id="s5", name="Мойка + полировка", category="Детейлинг", price=4200, duration=90, description="Комплекс: ручная мойка, полировка кузова и стекол.", active=True),
            Service(id="s6", name="Химчистка салона", category="Детейлинг", price=5500, duration=120, description="Глубокая чистка всех поверхностей салона.", active=False),
        ]
        db.add_all(services)

    if not db.scalar(select(Box.id).limit(1)):
        boxes = [
            Box(id="box-1", name="Бокс 1", price_per_hour=600, active=True, description="Основной бокс"),
            Box(id="box-2", name="Бокс 2", price_per_hour=600, active=True, description="С подъемником"),
            Box(id="box-3", name="Бокс 3", price_per_hour=700, active=True, description="Премиум бокс"),
        ]
        db.add_all(boxes)

    if not db.scalar(select(ScheduleEntry.id).limit(1)):
        schedule_entries = [
            ScheduleEntry(day_index=0, day_label="Пн", open_time="09:00", close_time="21:00", active=True),
            ScheduleEntry(day_index=1, day_label="Вт", open_time="09:00", close_time="21:00", active=True),
            ScheduleEntry(day_index=2, day_label="Ср", open_time="09:00", close_time="21:00", active=True),
            ScheduleEntry(day_index=3, day_label="Чт", open_time="09:00", close_time="21:00", active=True),
            ScheduleEntry(day_index=4, day_label="Пт", open_time="09:00", close_time="22:00", active=True),
            ScheduleEntry(day_index=5, day_label="Сб", open_time="09:00", close_time="22:00", active=True),
            ScheduleEntry(day_index=6, day_label="Вс", open_time="10:00", close_time="20:00", active=False),
        ]
        db.add_all(schedule_entries)

    existing_settings = {row.key for row in db.scalars(select(AppSetting)).all()}
    worker_notification_settings = {
        "w1": {"newTask": True, "taskUpdate": True, "payment": True, "reminders": False, "sms": False},
        "w2": {"newTask": True, "taskUpdate": True, "payment": False, "reminders": False, "sms": False},
        "w3": {"newTask": True, "taskUpdate": True, "payment": False, "reminders": False, "sms": False},
    }
    settings = [
        AppSetting(key="admin_profile", value={"name": "Администратор", "email": "admin@atmosfera.ru", "phone": "+7 (900) 000-00-00"}),
        AppSetting(key="admin_notification_settings", value={"newBooking": True, "cancelled": True, "paymentDue": False, "workerAssigned": True, "reminders": True}),
        AppSetting(key="owner_company", value={"name": "ATMOSFERA", "legalName": "", "inn": "", "address": "", "phone": "+7 (495) 000-00-00", "email": "info@atmosfera.ru"}),
        AppSetting(key="owner_notification_settings", value={"telegramBot": True, "emailReports": True, "smsReminders": False, "lowStock": True, "dailyReport": True, "weeklyReport": False, "bookingReminders": True}),
        AppSetting(key="owner_integrations", value={"telegram": True, "yookassa": False, "amoCrm": False, "googleCalendar": False}),
        AppSetting(key="owner_security", value={"twoFactor": True}),
        AppSetting(key="worker_notification_settings", value=worker_notification_settings),
    ]
    for item in settings:
        if item.key not in existing_settings:
            db.add(item)

    db.flush()

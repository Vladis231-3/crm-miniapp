/**
 * Обучающий сценарий мини-помощника (training-версия CRM).
 *
 * Шаги ищут элементы по CSS-селекторам (`data-training` атрибуты).
 * Каждый шаг может иметь `role` и `navigate` — помощник сам переключит
 * страницу/раздел и подсветит нужное место. Если элемент не найден — шаг пропускается.
 */

import type { TourStep, IntroSlide } from './tourTypes';

export type { TourStep, IntroSlide };

/** Вступление: Муся приветствует и рассказывает о продукте (показывается при заходе). */
export const TRAINING_INTRO: IntroSlide[] = [
  {
    title: 'Привет! Я — Муся 🤖',
    text: 'Я помощник ATMOSFERA. Покажу вам всё — летаю по экранам, подсвечиваю нужные места и объясняю, за что они отвечают.',
  },
  {
    title: 'ATMOSFERA — детейлинг-центр и мойка в Казани',
    text: 'Качество, которое чувствуется с первого взгляда: профессиональная мойка, детейлинг и уход — под одной крышей.',
  },
  {
    title: 'Всё в одном приложении',
    text: 'Запись онлайн, история визитов и статусы — без звонков. Муся проведёт вас по всем ролям: клиент, админ, мастер, владелец. Выберите роль — и полетели!',
  },
];

/** Полный сценарий: welcome + client + admin + worker + owner */
export const TRAINING_SCRIPT: TourStep[] = [
  // ═══════════════════════════════════════════════════════════
  //  ПРИВЕТСТВИЕ / ВХОД
  // ═══════════════════════════════════════════════════════════
  {
    role: 'welcome',
    target: '[data-training="welcome-logo"]',
    title: 'Логотип студии',
    text: 'ATMOSFERA — ваш автокомплекс: мойка, детейлинг и ремонт. Отсюда начинается управление.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-features"]',
    title: 'Наши направления',
    text: 'Ремонт, детейлинг и мойка — три опоры сервиса. Нажмите «Начать», чтобы войти.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-start"]',
    title: 'Вход в приложение',
    text: 'Кнопка «Начать» открывает форму входа. Данные сохранятся в профиле — повторно заполнять не придётся.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-name"]',
    title: 'Ваше имя',
    text: 'Укажите имя — так администратор будет знать, к кому обращаться при записи.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-car"]',
    title: 'Ваш автомобиль',
    text: 'Марка и модель авто. Мастер сразу будет знать, с какой машиной работает.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-plate"]',
    title: 'Гос. номер',
    text: 'Номер нужен для поиска авто и истории визитов. Данные не передаются третьим лицам.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-staff"]',
    title: 'Служебный вход',
    text: 'Для сотрудников: здесь администратор, мастер или владелец привязывают аккаунт к Telegram.',
  },
  {
    role: 'welcome',
    target: '[data-training="welcome-theme"]',
    title: 'Тема оформления',
    text: 'Переключайте светлую и тёмную тему — как удобнее глазу.',
  },

  // ═══════════════════════════════════════════════════════════
  //  КЛИЕНТ
  // ═══════════════════════════════════════════════════════════
  {
    role: 'client',
    target: '[data-training="client-header"]',
    title: 'Ваш профиль',
    text: 'Имя и авто в шапке. Если данные изменились — обновите их в разделе «Профиль».',
  },
  {
    role: 'client',
    target: '[data-training="client-bell"]',
    title: 'Уведомления',
    text: 'Колокольчик — статусы записей: подтверждена, выполняется, завершена. Красный бейдж — непрочитанные.',
  },
  {
    role: 'client',
    target: '[data-training="client-search"]',
    title: 'Поиск услуги',
    text: 'Начните вводить «мойка» или «полировка» — каталог сразу отфильтруется.',
  },
  {
    role: 'client',
    target: '[data-training="client-categories"]',
    title: 'Категории услуг',
    text: 'Быстрая фильтрация: мойка, детейлинг, аренда бокса и другие направления.',
  },
  {
    role: 'client',
    target: '[data-training="client-services"]',
    title: 'Каталог услуг',
    text: 'Карточка: цена, время и описание. Нажмите «Записаться», чтобы выбрать дату и время.',
  },
  {
    role: 'client',
    navigate: { app: 'client', page: 'detail' },
    target: '[data-training="client-detail"]',
    title: 'Детали услуги',
    text: 'Здесь цена, длительность и описание. Выберите автомобиль для записи и нажмите «Выбрать время».',
  },
  {
    role: 'client',
    navigate: { app: 'client', page: 'slots' },
    target: '[data-training="client-slots"]',
    title: 'Выбор времени',
    text: 'Сетка слотов на выбранную дату. Зелёные — свободно, красные — занято. Учитываются боксы и график работы.',
  },
  {
    role: 'client',
    target: '[data-training="client-nav"]',
    title: 'Навигация клиента',
    text: 'Три раздела: «Каталог» — запись, «Мои записи» — статусы и история, «Профиль» — данные и машины.',
  },
  {
    role: 'client',
    navigate: { app: 'client', page: 'bookings' },
    target: '[data-training="client-bookings"]',
    title: 'Мои записи',
    text: 'Предстоящие и прошедшие визиты, средний чек и любимая услуга. Отсюда можно отменить запись.',
  },
  {
    role: 'client',
    navigate: { app: 'client', page: 'profile' },
    target: '[data-training="client-profile"]',
    title: 'Профиль и авто',
    text: 'Редактируйте имя, телефон и список авто. Основной авто помечается флагом «главный».',
  },

  // ═══════════════════════════════════════════════════════════
  //  АДМИНИСТРАТОР
  // ═══════════════════════════════════════════════════════════
  {
    role: 'admin',
    target: '[data-training="admin-plus"]',
    title: 'Быстрая новая запись',
    text: 'Плюс в шапке открывает форму создания записи: клиент, услуга, время, мастера — за пару нажатий.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-bell"]',
    title: 'Уведомления администратора',
    text: 'Новые записи, отмены, жалобы. Бейдж — количество непрочитанных.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-hero"]',
    title: 'Управление днём',
    text: 'Сводка по сегодняшнему дню: всего записей, в работе, ожидают и завершены.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-exceptions"]',
    title: 'Требует внимания',
    text: 'Записи без мастера и непрочитанные уведомления — то, что нельзя оставлять без контроля.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-pulse"]',
    title: 'Ближайшие слоты',
    text: 'Первые записи дня по времени. Клик открывает карточку брони.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-new-booking"]',
    title: 'Быстрые действия',
    text: 'Шорткаты: новая запись, поиск клиентов и склад — не нужно искать раздел в меню.',
  },
  {
    role: 'admin',
    navigate: { app: 'admin', page: 'calendar' },
    target: '[data-training="admin-calendar"]',
    title: 'Расписание — календарь',
    text: 'Сетка по часам и боксам. Видно загрузку, свободные окна и кто где работает.',
  },
  {
    role: 'admin',
    navigate: { app: 'admin', page: 'stats' },
    target: '[data-training="admin-stats"]',
    title: 'Статистика',
    text: 'Графики по выручке, статусам и оплате. Средний чек, конверсия и загрузка по мастерам.',
  },
  {
    role: 'admin',
    navigate: { app: 'admin', page: 'clients' },
    target: '[data-training="admin-clients"]',
    title: 'Клиенты',
    text: 'Поиск по телефону/номеру, карточки клиентов, история визитов, рейтинг и заметки.',
  },
  {
    role: 'admin',
    navigate: { app: 'admin', page: 'stock' },
    target: '[data-training="admin-stock"]',
    title: 'Склад',
    text: 'Остатки по категориям, списание, история списаний и контроль «химии».',
  },
  {
    role: 'admin',
    navigate: { app: 'admin', page: 'settings', section: 'boxes' },
    target: '[data-training="admin-settings"]',
    title: 'Настройки',
    text: 'Боксы, график, услуги, зарплаты, уведомления и чек-лист смены. Всё — в одном разделе.',
  },
  {
    role: 'admin',
    target: '[data-training="admin-nav"]',
    title: 'Разделы администратора',
    text: 'Нижнее меню: Расписание, Статистика, Клиенты, Склад, Настройки. Весь день — в один тап.',
  },

  // ═══════════════════════════════════════════════════════════
  //  МАСТЕР
  // ═══════════════════════════════════════════════════════════
  {
    role: 'worker',
    target: '[data-training="worker-header"]',
    title: 'Шапка мастера',
    text: 'Дата, фильтр «Только мои» и уведомления. Всё для контроля смены.',
  },
  {
    role: 'worker',
    target: '[data-training="worker-hero"]',
    title: 'Герой смены',
    text: 'Прогресс за сегодня: сколько задач на смену, в работе и готово. Кнопка «Открыть текущую».',
  },
  {
    role: 'worker',
    target: '[data-training="worker-next"]',
    title: 'Дальше по времени',
    text: 'Ближайшие задачи по времени. Тап — открывает детали заказа.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'today' },
    target: '[data-training="worker-today-list"]',
    title: 'Задачи на сегодня',
    text: 'Карточки задач: время, клиент, услуга, статус и авто. Кнопки «Начать» / «Завершить» / «Детали».',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'today' },
    target: '[data-training="worker-today-list"]',
    title: 'Детали заказа',
    text: 'Нажмите «Детали» на карточке — откроется состав заказа, оплата, материалы, коллеги и таймер. Сейчас подсвечен список задач.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'schedule' },
    target: '[data-training="worker-schedule"]',
    title: 'Расписание',
    text: 'Ближайшие дни: что, когда и с кем. Удобно планировать смену.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'calendar' },
    target: '[data-training="worker-calendar"]',
    title: 'Календарь',
    text: 'Месячный календарь с задачами. Точка — есть записи. Тап по дню — детали.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'cars' },
    target: '[data-training="worker-cars"]',
    title: 'Машины',
    text: 'Поиск по госномеру/марке: а123вс777 или BMW. Находит все записи с этим авто.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'earnings' },
    target: '[data-training="worker-earnings"]',
    title: 'Заработок',
    text: 'Период, сегмент, календарь и список. Видно начисления, премии, штрафы и баланс к выплате.',
  },
  {
    role: 'worker',
    navigate: { app: 'worker', tab: 'profile' },
    target: '[data-training="worker-profile"]',
    title: 'Профиль мастера',
    text: 'Личные данные, уведомления, история, безопасность и чек-лист смены (химия на старт/финиш).',
  },
  {
    role: 'worker',
    target: '[data-training="worker-nav"]',
    title: 'Навигация мастера',
    text: 'Сегодня, Расписание, Календарь, Машины, Заработок, Профиль — вся смена под рукой.',
  },

  // ═══════════════════════════════════════════════════════════
  //  ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════
  {
    role: 'owner',
    target: '[data-training="owner-header"]',
    title: 'Шапка владельца',
    text: 'Уведомления, тема и быстрый доступ. Бейдж — сколько непрочитанных.',
  },
  {
    role: 'owner',
    target: '[data-training="owner-nav"]',
    title: 'Навигация владельца',
    text: 'Дашборд, Календарь, Зарплаты, Склад, Отчёты, Копилка, Клиенты, Настройки — центр управления бизнесом.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'dashboard' },
    target: '[data-training="owner-dashboard"]',
    title: 'Дашборд — пульс бизнеса',
    text: 'Выручка, прибыль, записи и статусы. За неделю видно тренд.',
  },
  {
    role: 'owner',
    target: '[data-training="owner-kpi"]',
    title: 'KPI-карточки',
    text: 'Клик по карточке открывает детали: список записей, расходы или топ услуг.',
  },
  {
    role: 'owner',
    target: '[data-training="owner-charts"]',
    title: 'Графики',
    text: 'Выручка по дням, воронка статусов и платежи. Наведите — увидите точные цифры.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'calendar' },
    target: '[data-training="owner-calendar"]',
    title: 'Календарь владельца',
    text: 'Месяц и день: загрузка по часам, кто в боксах, свободные слоты. Месячный вид подсвечивает загруженность цветом.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'payroll' },
    target: '[data-training="owner-payroll"]',
    title: 'Зарплаты мастеров',
    text: 'Период, сегмент и поиск. Таблица: начисления, смены, премии/штрафы/авансы и баланс к выплате.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'salary-detail' },
    target: '[data-training="owner-payroll-detail"]',
    title: 'Детализация мастера',
    text: 'Записи, выплаты и корректировки. Можно начислить премию, аванс, штраф или скорректировать выплату.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'stock' },
    target: '[data-training="owner-stock"]',
    title: 'Склад',
    text: 'Остатки, категории, списание и история. Контроль химии и расходников.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'reports' },
    target: '[data-training="owner-reports"]',
    title: 'Отчёты и выгрузки',
    text: 'Период и экспорт: Excel/PDF, отправка в Telegram. Отчёты по сегментам (мойка/детейлинг).',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'piggy-bank' },
    target: '[data-training="owner-piggy"]',
    title: 'Копилка',
    text: 'Баланс по мойке и детейлингу, коррекции и списания на материалы. Видно, сколько осталось в копилке.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'settings', section: 'clients' },
    target: '[data-training="owner-settings-clients"]',
    title: 'Клиенты владельца',
    text: 'База клиентов с балансами, депозитами и историей. Поиск по телефону и номеру авто.',
  },
  {
    role: 'owner',
    navigate: { app: 'owner', page: 'settings', section: 'company' },
    target: '[data-training="owner-settings"]',
    title: 'Настройки',
    text: 'Компания, график, боксы, услуги, сотрудники, интеграции (Telegram/Google Calendar), безопасность и финансы.',
  },

  // ── Финал (показывается после любой роли) ─────────────────────────────
  {
    role: 'all',
    title: 'Тур завершён! — Муся',
    text: 'Отлично! Я — Муся, покажу ещё. Выберите другую роль у меня — полечу по её окнам и всё подсветю.',
  },
];

/** Фильтр шагов по роли */
export function stepsForRole(role: TourRole): TourStep[] {
  return TRAINING_SCRIPT.filter(s => !s.role || s.role === role || s.role === 'all' || role === 'all');
}

/** Все роли кроме welcome/all */
export const TRAINING_ROLES: TourRole[] = ['client', 'admin', 'worker', 'owner'];

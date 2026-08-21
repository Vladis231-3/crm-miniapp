/**
 * Заглушки для обучения (/help) — фронт без БД.
 * Только демо-данные в памяти, ни одного запроса к бэку.
 * Пользователь без регистрации видит интерфейс и тур, но реальные данные не утекают.
 */
import type {
  Booking,
  RegisteredClient,
  Worker,
  Service,
  Box,
  ScheduleDay,
  StockItem,
  StockCategory,
  Expense,
  Income,
  Penalty,
  Notification,
  SettingsBundle,
  ContentData,
} from '../context/AppContext';

export const HELP_STUB_TODAY = '15.08.2026';
export const HELP_TOMORROW = '16.08.2026';

export const helpWorkers: Worker[] = [
  {
    id: 'w1',
    role: 'worker',
    name: 'Иван',
    experience: '5 лет',
    defaultPercent: 30,
    salaryBase: 0,
    salaryPerShift: 1500,
    available: true,
    active: true,
    phone: '+7 (900) 111-22-33',
    email: 'ivan@demo.atmosfera',
    city: 'Казань',
    specialty: 'Детейлинг',
    about: 'Демо-мастер',
    telegramChatId: '',
  },
  {
    id: 'w2',
    role: 'worker',
    name: 'Олег',
    experience: 'ученик',
    defaultPercent: 15,
    salaryBase: 25000,
    salaryPerShift: 1200,
    available: true,
    active: true,
    phone: '+7 (900) 222-33-44',
    email: 'oleg@demo.atmosfera',
    city: 'Казань',
    specialty: 'Мойка',
    about: 'Демо-мастер',
    telegramChatId: '',
  },
  {
    id: 'admin-1',
    role: 'admin',
    name: 'Администратор',
    experience: '7 лет',
    defaultPercent: 0,
    salaryBase: 0,
    salaryPerShift: 0,
    available: true,
    active: true,
    phone: '+7 (900) 000-00-00',
    email: 'admin@demo.atmosfera',
    city: 'Казань',
    specialty: 'Управление',
    about: 'Демо-админ',
    telegramChatId: '',
  },
  {
    id: 'owner-1',
    role: 'owner',
    name: 'Владелец',
    experience: '12 лет',
    defaultPercent: 0,
    salaryBase: 0,
    salaryPerShift: 0,
    available: true,
    active: true,
    phone: '+7 (900) 999-88-77',
    email: 'owner@demo.atmosfera',
    city: 'Казань',
    specialty: 'Управление бизнесом',
    about: 'Демо-владелец',
    telegramChatId: '',
  },
];

export const helpServices: Service[] = [
  { id: 's1', name: 'Мойка базовая', category: 'Мойка', price: 1200, duration: 30, resourceGroup: 'wash', washType: 'classic', desc: 'Демо: ручная мойка кузова', active: true, materialConsumption: 100, isFixedMaster: false },
  { id: 's2', name: 'Полировка стекла', category: 'Детейлинг', price: 3500, duration: 60, resourceGroup: 'detailing', washType: '', desc: 'Демо: полировка', active: true, materialConsumption: 200, isFixedMaster: false },
  { id: 's3', name: 'Ремонт лобового', category: 'Ремонт стекла', price: 7000, duration: 90, resourceGroup: 'wash', washType: '', desc: 'Демо: ремонт сколов', active: true, materialConsumption: null, isFixedMaster: false },
  { id: 's4', name: 'Аренда бокса', category: 'Аренда бокса', price: 600, duration: 60, resourceGroup: 'wash', washType: '', desc: 'Демо: аренда', active: true, materialConsumption: null, isFixedMaster: false },
  { id: 's5', name: 'Химчистка салона', category: 'Детейлинг', price: 5500, duration: 120, resourceGroup: 'detailing', washType: '', desc: 'Демо: химчистка', active: false, materialConsumption: 300, isFixedMaster: false },
];

export const helpBoxes: Box[] = [
  { id: 'box-1', name: 'Бокс 1', resourceGroup: 'wash', pricePerHour: 600, active: true, description: 'Демо-бокс мойки' },
  { id: 'box-2', name: 'Бокс 2', resourceGroup: 'wash', pricePerHour: 600, active: true, description: 'Демо-бокс' },
  { id: 'box-3', name: 'Детейлинг зона', resourceGroup: 'detailing', pricePerHour: 700, active: true, description: 'Демо-зона детейлинга' },
];

export const helpSchedule: ScheduleDay[] = [
  { dayIndex: 0, day: 'Сб', open: '09:00', close: '22:00', active: true },
  { dayIndex: 1, day: 'Вс', open: '10:00', close: '20:00', active: false },
  { dayIndex: 2, day: 'Пн', open: '09:00', close: '21:00', active: true },
  { dayIndex: 3, day: 'Вт', open: '09:00', close: '21:00', active: true },
  { dayIndex: 4, day: 'Ср', open: '09:00', close: '21:00', active: true },
  { dayIndex: 5, day: 'Чт', open: '09:00', close: '21:00', active: true },
  { dayIndex: 6, day: 'Пт', open: '09:00', close: '22:00', active: true },
];

export const helpClients: RegisteredClient[] = [
  {
    id: 'c1',
    name: 'Алексей Петров',
    phone: '+7 (900) 123-45-67',
    car: 'Toyota Camry',
    plate: 'A123BC 16',
    plateType: 'russian',
    vehicles: [{ car: 'Toyota Camry', plate: 'A123BC 16', plateType: 'russian', isMain: true }],
    notes: 'Демо-клиент',
    debtBalance: 0,
    adminRating: 5,
    adminNote: '',
    referralSource: '2GIS',
    createdAt: new Date('2026-08-01'),
  },
  {
    id: 'c2',
    name: 'Марина Иванова',
    phone: '+7 (900) 765-43-21',
    car: 'BMW X5',
    plate: 'B456DE 16',
    plateType: 'russian',
    vehicles: [{ car: 'BMW X5', plate: 'B456DE 16', plateType: 'russian', isMain: true }],
    notes: '',
    debtBalance: 1200,
    adminRating: 4,
    adminNote: 'Постоянный клиент',
    referralSource: 'Instagram',
    createdAt: new Date('2026-08-10'),
  },
];

export const helpBookings: Booking[] = [
  {
    id: 'b1',
    clientId: 'c1',
    clientName: 'Алексей Петров',
    clientPhone: '+7 (900) 123-45-67',
    service: 'Мойка базовая',
    serviceId: 's1',
    date: HELP_STUB_TODAY,
    time: '10:00',
    duration: 30,
    price: 1200,
    status: 'confirmed',
    workers: [{ workerId: 'w1', workerName: 'Иван', percent: 30 }],
    box: 'Бокс 1',
    paymentType: 'cash',
    paymentSettled: false,
    isOutsource: false,
    outsourceAmount: 0,
    createdAt: new Date(),
    car: 'Toyota Camry',
    plate: 'A123BC 16',
    plateType: 'russian',
    services: [],
    additionalServices: [],
    materials: [],
    materialsWrittenOff: false,
    source: 'manual',
    referralSource: '2GIS',
    isRepeatVisit: false,
  },
  {
    id: 'b2',
    clientId: 'c2',
    clientName: 'Марина Иванова',
    clientPhone: '+7 (900) 765-43-21',
    service: 'Полировка стекла',
    serviceId: 's2',
    date: HELP_STUB_TODAY,
    time: '11:30',
    duration: 60,
    price: 3500,
    status: 'in_progress',
    workers: [{ workerId: 'w1', workerName: 'Иван', percent: 25 }],
    box: 'Детейлинг зона',
    paymentType: 'transfer',
    paymentSettled: false,
    isOutsource: false,
    outsourceAmount: 0,
    createdAt: new Date(),
    car: 'BMW X5',
    plate: 'B456DE 16',
    plateType: 'russian',
    services: [],
    additionalServices: [
      {
        id: 'as1',
        serviceId: null,
        name: 'Нанесение гидрофоба',
        price: 800,
        duration: 15,
        status: 'new',
        priceMode: 'add',
        isOutsource: false,
        createdAt: new Date(),
        workers: [{ workerId: 'w2', workerName: 'Олег', percent: 15 }],
      },
    ],
    materials: [{ id: 'm1', name: 'Полироль', qty: 1, unit: 'шт', unitPrice: 200 }],
    materialsWrittenOff: false,
    source: 'manual',
    referralSource: 'Instagram',
    isRepeatVisit: true,
  },
  {
    id: 'b3',
    clientId: 'c1',
    clientName: 'Алексей Петров',
    clientPhone: '+7 (900) 123-45-67',
    service: 'Химчистка салона',
    serviceId: 's5',
    date: '14.08.2026',
    time: '14:00',
    duration: 120,
    price: 5500,
    status: 'completed',
    workers: [{ workerId: 'w2', workerName: 'Олег', percent: 15 }],
    box: 'Детейлинг зона',
    paymentType: 'cash',
    paymentSettled: true,
    isOutsource: false,
    outsourceAmount: 0,
    createdAt: new Date('2026-08-14'),
    car: 'Toyota Camry',
    plate: 'A123BC 16',
    plateType: 'russian',
    services: [],
    additionalServices: [],
    materials: [],
    materialsWrittenOff: true,
  },
];

export const helpStockCategories: StockCategory[] = [
  { id: 'sc-chemistry', name: 'Химия' },
  { id: 'sc-shampoo', name: 'Шампуни', parentId: 'sc-chemistry' },
];

export const helpStockItems: StockItem[] = [
  { id: 'st1', name: 'Автошампунь', qty: 12, unit: 'л', unitPrice: 400, category: 'Химия', categoryId: 'sc-shampoo' },
  { id: 'st2', name: 'Микрофибра', qty: 30, unit: 'шт', unitPrice: 120, category: 'Расходники' },
];

export const helpExpenses: Expense[] = [
  { id: 'e1', title: 'Аренда', amount: 50000, category: 'Аренда', date: HELP_STUB_TODAY, note: 'Демо', resourceGroup: 'wash' },
];

export const helpIncomes: Income[] = [
  { id: 'i1', amount: 10000, source: 'Допродажи', note: 'Демо', createdById: 'owner-1', date: HELP_STUB_TODAY, createdAt: HELP_STUB_TODAY, resourceGroup: 'wash' },
];

export const helpPenalties: Penalty[] = [];
export const helpNotifications: Notification[] = [
  { id: 'n1', recipientRole: 'admin', message: 'Демо: новая запись на сегодня 10:00', read: false, createdAt: new Date() },
  { id: 'n2', recipientRole: 'owner', message: 'Демо: отчёт за неделю готов', read: false, createdAt: new Date() },
  { id: 'n3', recipientRole: 'worker', recipientId: 'w1', message: 'Демо: вам назначена задача', read: false, createdAt: new Date() },
  { id: 'n4', recipientRole: 'client', recipientId: 'c1', message: 'Демо: запись подтверждена', read: false, createdAt: new Date() },
];

export const helpSettings: SettingsBundle = {
  adminProfile: { name: 'Администратор (демо)', email: 'admin@demo', phone: '+7 (900) 000-00-00', telegramChatId: '' },
  adminNotificationSettings: { newBooking: true, cancelled: true, paymentDue: false, workerAssigned: true, reminders: true },
  ownerCompany: { name: 'ATMOSFERA (демо)', legalName: 'ИП Демо', inn: '1234567890', address: 'Казань, демо 1', phone: '+7 (900) 000-00-00', email: 'demo@atmosfera.ru', operatingMode: 'open' },
  ownerNotificationSettings: { telegramBot: true, emailReports: true, smsReminders: false, lowStock: true, dailyReport: true, weeklyReport: false, bookingReminders: true },
  ownerIntegrations: { telegram: true, yookassa: false, amoCrm: false, googleCalendar: false },
  ownerSecurity: { twoFactor: false },
  workerNotificationSettings: {
    w1: { newTask: true, taskUpdate: true, payment: true, reminders: true, sms: false },
  },
};

export const helpContent: ContentData = {
  hero: {
    backgroundImage: '',
    badgeText: 'ATMOSFERA ДЕТЕЙЛИНГ (ДЕМО)',
    title: { before: 'Ваш автомобиль заслуживает ', highlight: 'лучшего', after: ' ухода' },
    subtitle: 'Демо-режим: все данные — заглушки, без доступа к реальной БД.',
    button1Text: 'Наши услуги',
    button1Action: 'services',
    button2Text: 'Записаться',
    button2Action: 'contact',
    stats: [
      { value: '4.9', label: 'Рейтинг (демо)' },
      { value: '15 мин', label: 'Экспресс (демо)' },
      { value: '100%', label: 'Довольных (демо)' },
    ],
  },
  about: { text: 'Демо ATMOSFERA — только фронт и заглушки.', features: [], image: '' },
  services: [],
  works: [],
};

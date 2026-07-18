import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiDownload, apiRequest, getTelegramInitData, getTelegramWebApp } from '../api';
import { getScheduleDayIndex, getUpcomingDates, isPastTimeSlot, parseFlexibleDate } from '../utils/date';

export type Role = 'client' | 'admin' | 'worker' | 'owner' | 'accountant';
export type BookingStatus = 'new' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled' | 'admin_review';
export type PaymentType = 'cash' | 'transfer' | 'invoice';

export interface SessionInfo {
  role: Role;
  actorId: string;
  sessionId: string;
  login?: string | null;
  displayName: string;
}

export interface ClientProfile {
  name: string;
  phone: string;
  car: string;
  plate: string;
  plateType?: string;
  vehicles?: Array<{ car: string; plate: string; plateType?: string }>;
  registered: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  ipAddress: string;
  createdAt: Date;
  lastSeenAt: Date;
  current: boolean;
}

export interface RegisteredClient {
  id: string;
  name: string;
  phone: string;
  car: string;
  plate: string;
  plateType?: string;
  vehicles?: Array<{ car: string; plate: string; plateType?: string }>;
  notes: string;
  debtBalance: number;
  adminRating: number;
  adminNote: string;
  referralSource: string;
}

export interface ClientCreateInput {
  name: string;
  phone: string;
  car?: string;
  plate?: string;
  plateType?: string;
  notes?: string;
  referralSource?: string;
}

export interface Worker {
  id: string;
  role: 'admin' | 'worker' | 'owner' | 'accountant';
  name: string;
  experience: string;
  defaultPercent: number | '';
  salaryBase: number;
  salaryPerShift: number;
  available: boolean;
  active: boolean;
  phone: string;
  email: string;
  city: string;
  specialty: string;
  about: string;
  telegramChatId: string;
  extraRoles?: string[];
  payrollSummary?: WorkerPayrollSummary;
}

export type PayrollEntryKind = 'bonus' | 'advance' | 'deduction' | 'payout' | 'adjustment';

export interface PayrollEntry {
  id: string;
  workerId: string;
  kind: PayrollEntryKind;
  amount: number;
  note: string;
  createdAt: Date;
  createdByRole: 'admin' | 'worker' | 'owner' | 'accountant';
  createdByName: string;
}

export interface WorkerPayrollBooking {
  bookingId: string;
  service: string;
  date: string;
  time: string;
  price: number;
  percent: number | '';
  car?: string;
  plate?: string;
}

export interface WorkerPayrollSummary {
  completedBookings: number;
  completedRevenue: number;
  accruedFromBookings: number;
  baseSalary: number;
  bonusTotal: number;
  adjustmentTotal: number;
  advanceTotal: number;
  deductionTotal: number;
  payoutTotal: number;
  totalAccrued: number;
  totalDeducted: number;
  balance: number;
  bookingItems: WorkerPayrollBooking[];
  entries: PayrollEntry[];
}

export interface BookingServiceItem {
  name: string;
  serviceId: string;
  price: number;
  duration: number;
}

export interface AdditionalServiceWorker {
  workerId: string;
  workerName: string;
  percent: number;
}

export interface AdditionalService {
  id: string;
  serviceId: string | null;
  name: string;
  price: number;
  duration: number;
  status: string;
  createdAt: Date;
  workers: AdditionalServiceWorker[];
}

export interface AddAdditionalServiceInput {
  serviceId?: string | null;
  name: string;
  price: number;
  duration: number;
  workers: AdditionalServiceWorker[];
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  service: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: BookingStatus;
  workers: { workerId: string; workerName: string; percent: number | '' }[];
  box: string;
  paymentType: PaymentType;
  paymentSettled: boolean;
  isOutsource: boolean;
  outsourceAmount: number;
  createdAt: Date;
  notes?: string;
  car?: string;
  plate?: string;
  plateType?: string;
  services: BookingServiceItem[];
  additionalServices: AdditionalService[];
}

export interface BookingSlotAvailability {
  time: string;
  available: boolean;
  freeBoxes: number;
  occupiedBoxes: number;
}

export type BookingCreateInput = Omit<Booking, 'id' | 'createdAt'> & {
  notifyWorkers?: boolean;
  services?: BookingServiceItem[];
};

export type BookingUpdateInput = Partial<Booking> & {
  notifyWorkers?: boolean;
  services?: BookingServiceItem[];
};

export interface Notification {
  id: string;
  recipientRole: Role;
  recipientId?: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface StockItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  category: string;
}

export interface ShiftChecklistItem {
  stockItemId: string;
  name: string;
  unit: string;
  startQty?: number | null;
  endQty?: number | null;
  actualQty: number;
}

export interface ShiftChecklist {
  id: string;
  workerId: string;
  workerName: string;
  phase: 'start' | 'end';
  note: string;
  createdAt: Date;
  items: ShiftChecklistItem[];
}

export interface AdminShiftInspectionSupply {
  stockItemId: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  checked: boolean;
}

export interface AdminShiftInspectionMaster {
  workerId: string;
  workerName: string;
  checked: boolean;
}

export interface AdminShiftInspection {
  id: string;
  adminId: string;
  adminName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date | null;
  floorPhotoUrl: string;
  clothsReady: boolean;
  suppliesChecked: boolean;
  note: string;
  issueNote: string;
  ownerDecisionBy?: string | null;
  supplies: AdminShiftInspectionSupply[];
  masters: AdminShiftInspectionMaster[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  resourceGroup?: string;
}

export interface Income {
  id: string;
  amount: number;
  source: string;
  note?: string | null;
  createdById: string;
  date: string;
  createdAt: string;
  resourceGroup?: string;
}

export interface Penalty {
  id: string;
  workerId: string;
  workerName: string;
  ownerId: string;
  title: string;
  reason: string;
  createdAt: Date;
  activeUntil: Date;
  revokedAt?: Date | null;
}

export interface TelegramLinkCode {
  code: string;
  expiresAt: Date;
  linked: boolean;
}

export type OwnerExportKind = 'report' | 'pdf';
export type OwnerReportPeriod = 'daily' | 'weekly';
export type OwnerReportSegment = 'wash' | 'detailing';
export interface OwnerExportParams {
  segment?: 'all' | 'wash' | 'detailing';
  date_from?: string;
  date_to?: string;
}

export interface OwnerExportDelivery {
  message: string;
  fileName: string;
  telegramSent: boolean;
  telegramChatId?: string | null;
}

export interface OwnerDatabaseResetPreview {
  ownersPreserved: number;
  employeesDeleted: number;
  clientsDeleted: number;
  bookingsDeleted: number;
  notificationsDeleted: number;
  stockItemsDeleted: number;
  expensesDeleted: number;
  penaltiesDeleted: number;
  servicesReset: number;
  boxesReset: number;
  scheduleReset: number;
  settingsReset: number;
}

export interface OwnerDatabaseResetStart {
  requestId: string;
  creatorCodeExpiresAt: Date;
  confirmationPhrase: string;
  preview: OwnerDatabaseResetPreview;
  warnings: string[];
  message: string;
}

export interface OwnerDatabaseResetApproval {
  requestId: string;
  finalizeAfter: Date;
  preview: OwnerDatabaseResetPreview;
  warnings: string[];
  message: string;
}

export interface OwnerDatabaseResetResult {
  message: string;
  preview: OwnerDatabaseResetPreview;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  resourceGroup: string;
  washType: string;
  desc: string;
  active: boolean;
  materialConsumption: number | null;
  isFixedMaster: boolean;
}

export interface Box {
  id: string;
  name: string;
  resourceGroup: string;
  pricePerHour: number;
  active: boolean;
  description: string;
}

export interface ScheduleDay {
  dayIndex: number;
  day: string;
  open: string;
  close: string;
  active: boolean;
}

export interface AdminNotificationSettings {
  newBooking: boolean;
  cancelled: boolean;
  paymentDue: boolean;
  workerAssigned: boolean;
  reminders: boolean;
}

export interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  telegramChatId: string;
}

export interface WorkerNotificationSettings {
  newTask: boolean;
  taskUpdate: boolean;
  payment: boolean;
  reminders: boolean;
  sms: boolean;
}

export interface WorkerProfile {
  name: string;
  phone: string;
  email: string;
  city: string;
  experience: string;
  specialty: string;
  about: string;
  percent: number | '';
}

export interface OwnerCompany {
  name: string;
  legalName: string;
  inn: string;
  address: string;
  phone: string;
  email: string;
}

export interface OwnerNotificationSettings {
  telegramBot: boolean;
  emailReports: boolean;
  smsReminders: boolean;
  lowStock: boolean;
  dailyReport: boolean;
  weeklyReport: boolean;
  bookingReminders: boolean;
}

export interface OwnerReminderDispatchResult {
  message: string;
  targetDate: string;
  clientReminders: number;
  workerReminders: number;
  telegramDelivered: number;
}

export interface OwnerIntegrations {
  telegram: boolean;
  yookassa: boolean;
  amoCrm: boolean;
  googleCalendar: boolean;
}

export interface OwnerSecurity {
  twoFactor: boolean;
}

export interface EmployeeSetting {
  id: string;
  role: 'admin' | 'worker' | 'accountant';
  name: string;
  percent: number | '';
  salaryBase: number;
  salaryPerShift: number;
  active: boolean;
  telegramChatId: string;
}

export interface WorkerCreateInput {
  role: 'admin' | 'worker' | 'accountant';
  name: string;
  login: string;
  password: string;
  percent: number | '';
  salaryBase: number;
  phone?: string;
  email?: string;
  telegramChatId: string;
}

export interface PayrollEntryCreateInput {
  workerId: string;
  kind: PayrollEntryKind;
  amount: number;
  note: string;
}

export interface ContentStats {
  value: string;
  label: string;
}

export interface ContentHero {
  backgroundImage: string;
  badgeText: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  button1Text: string;
  button1Action: string;
  button2Text: string;
  button2Action: string;
  stats: ContentStats[];
}

export interface ContentAbout {
  text: string;
  features: string[];
  image: string;
}

export interface ContentService {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  features: string[];
  image: string;
  accent: string;
  category: string;
}

export interface ContentWorks {
  title: string;
  description: string;
  image_url: string;
}

export interface ContentData {
  hero: ContentHero;
  about: ContentAbout;
  services: ContentService[];
  works: ContentWorks[];
}

export interface SettingsBundle {
  adminProfile: AdminProfile;
  adminNotificationSettings: AdminNotificationSettings;
  ownerCompany: OwnerCompany;
  ownerNotificationSettings: OwnerNotificationSettings;
  ownerIntegrations: OwnerIntegrations;
  ownerSecurity: OwnerSecurity;
  workerNotificationSettings: Record<string, WorkerNotificationSettings>;
}

interface BootstrapPayload {
  session: SessionInfo;
  clientProfile: ClientProfile | null;
  staffProfile: Worker | null;
  clients: RegisteredClient[];
  bookings: Array<Omit<Booking, 'createdAt'> & { createdAt: string }>;
  notifications: Array<Omit<Notification, 'createdAt'> & { createdAt: string }>;
  stockItems: StockItem[];
  expenses: Expense[];
  penalties: Array<Omit<Penalty, 'createdAt' | 'activeUntil' | 'revokedAt'> & { createdAt: string; activeUntil: string; revokedAt?: string | null }>;
  workers: Worker[];
  services: Service[];
  boxes: Box[];
  schedule: ScheduleDay[];
  settings: SettingsBundle;
}

interface AppContextType {
  loading: boolean;
  authLoading: boolean;
  error: string | null;
  session: SessionInfo | null;
  activeSessions: ActiveSession[];
  isDark: boolean;
  toggleTheme: () => void;
  logout: () => void;
  clientProfile: ClientProfile;
  staffProfile: Worker | null;
  clients: RegisteredClient[];
  bookings: Booking[];
  notifications: Notification[];
  stockItems: StockItem[];
  expenses: Expense[];
  incomes: Income[];
  penalties: Penalty[];
  workers: Worker[];
  services: Service[];
  boxes: Box[];
  schedule: ScheduleDay[];
  settings: SettingsBundle;
  upcomingDates: string[];
  todayLabel: string;
  tomorrowLabel: string;
  getTimeSlotsForDate: (date: string, options?: { durationMinutes?: number; boxName?: string; resourceGroup?: string }) => string[];
  getBookingAvailabilityForDate: (date: string, options?: { durationMinutes?: number; serviceId?: string; resourceGroup?: string }) => Promise<BookingSlotAvailability[]>;
  loginClient: (profile: { name: string; car?: string; plate?: string; registered?: boolean }) => Promise<Role>;
  linkStaff: (login: string, password: string) => Promise<Role>;
  switchRole: (targetRole: Role) => Promise<void>;
  updateClientProfile: (profile: Partial<ClientProfile>) => Promise<void>;
  addClient: (client: ClientCreateInput) => Promise<RegisteredClient>;
  updateClientCard: (clientId: string, updates: Partial<Pick<RegisteredClient, 'name' | 'phone' | 'car' | 'plate' | 'notes' | 'debtBalance' | 'adminRating' | 'adminNote' | 'referralSource'> & { vehicles?: Array<{ car: string; plate: string }> }>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addBooking: (booking: BookingCreateInput) => Promise<Booking>;
  updateBooking: (id: string, updates: BookingUpdateInput) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  addBookingService: (bookingId: string, service: Omit<BookingServiceItem, 'serviceId'> & { serviceId: string }) => Promise<Booking>;
  addBookingAdditionalService: (bookingId: string, service: AddAdditionalServiceInput) => Promise<Booking>;
  removeBookingAdditionalService: (bookingId: string, additionalServiceId: string) => Promise<Booking>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (role: Role) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id'>) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  writeOffStock: (id: string, qty: number) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addIncome: (income: { amount: number; source: string; note?: string; date: string; serviceCategory?: string }) => Promise<void>;
  updateExpense: (id: string, patch: { title?: string; amount?: number; category?: string; date?: string; note?: string | null }) => Promise<void>;
  updateIncome: (id: string, patch: { amount?: number; source?: string; note?: string | null; date?: string }) => Promise<void>;
  addPenalty: (penalty: Omit<Penalty, 'id' | 'createdAt' | 'activeUntil' | 'revokedAt' | 'workerName' | 'ownerId'>) => Promise<void>;
  revokePenalty: (penaltyId: string) => Promise<void>;
  revokeAllPenalties: (workerId: string) => Promise<void>;
  createTelegramLinkCode: () => Promise<TelegramLinkCode>;
  downloadOwnerExport: (kind: OwnerExportKind, params?: OwnerExportParams) => Promise<string>;
  sendOwnerExportToTelegram: (kind: OwnerExportKind, params?: OwnerExportParams) => Promise<OwnerExportDelivery>;
  sendOwnerSummaryReport: (period: OwnerReportPeriod, segment: OwnerReportSegment) => Promise<string>;
    dispatchOwnerReminders: (options?: { targetDate?: string; force?: boolean }) => Promise<OwnerReminderDispatchResult>;
    remindAdminAboutInactiveClients: () => Promise<string>;
  saveServices: (services: Service[]) => Promise<void>;
  saveBoxes: (boxes: Box[]) => Promise<void>;
  saveSchedule: (schedule: ScheduleDay[]) => Promise<void>;
  saveAdminProfile: (profile: AdminProfile) => Promise<void>;
  saveAdminNotificationSettings: (settings: AdminNotificationSettings) => Promise<void>;
  saveWorkerProfile: (workerId: string, profile: WorkerProfile) => Promise<void>;
  saveWorkerNotificationSettings: (workerId: string, settings: WorkerNotificationSettings) => Promise<void>;
  saveOwnerCompany: (company: OwnerCompany) => Promise<void>;
  saveOwnerNotificationSettings: (settings: OwnerNotificationSettings) => Promise<void>;
  saveOwnerIntegrations: (settings: OwnerIntegrations) => Promise<void>;
  saveOwnerSecurity: (settings: OwnerSecurity) => Promise<void>;
  saveWorkerSettings: (settings: EmployeeSetting[]) => Promise<void>;
  saveAdminWorkerPayroll: (settings: EmployeeSetting[]) => Promise<void>;
  saveContent: (content: ContentData) => Promise<void>;
  createPayrollEntry: (entry: PayrollEntryCreateInput) => Promise<void>;
  listShiftChecklists: () => Promise<ShiftChecklist[]>;
  submitShiftChecklist: (payload: { phase: 'start' | 'end'; note?: string; items: Array<{ stockItemId: string; actualQty: number }> }) => Promise<ShiftChecklist>;
  listAdminShiftInspections: () => Promise<AdminShiftInspection[]>;
  submitAdminShiftInspection: (payload: {
    floorPhotoUrl: string;
    clothsReady: boolean;
    supplies: Array<{ stockItemId: string; checked: boolean }>;
    masters: Array<{ workerId: string; checked: boolean }>;
    note?: string;
  }) => Promise<AdminShiftInspection>;
  hireWorker: (worker: WorkerCreateInput) => Promise<Worker>;
  fireWorker: (workerId: string) => Promise<void>;
  resetWorkerPassword: (workerId: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestOwnerDatabaseReset: (password: string) => Promise<OwnerDatabaseResetStart>;
  approveOwnerDatabaseReset: (requestId: string, creatorCode: string, confirmationPhrase: string) => Promise<OwnerDatabaseResetApproval>;
  executeOwnerDatabaseReset: (requestId: string) => Promise<OwnerDatabaseResetResult>;
  refreshBootstrap: () => Promise<void>;
  refreshActiveSessions: () => Promise<void>;
  checkConsent: () => Promise<boolean>;
  submitConsent: () => Promise<void>;
}

const EMPTY_CLIENT_PROFILE: ClientProfile = { name: '', phone: '', car: '', plate: '', vehicles: [], registered: false };
const EMPTY_WORKER_NOTIFICATIONS: WorkerNotificationSettings = { newTask: true, taskUpdate: true, payment: true, reminders: false, sms: false };
const EMPTY_SETTINGS: SettingsBundle = {
  adminProfile: { name: 'Администратор', email: '', phone: '', telegramChatId: '' },
  adminNotificationSettings: { newBooking: true, cancelled: true, paymentDue: false, workerAssigned: true, reminders: true },
  ownerCompany: { name: 'ATMOSFERA', legalName: '', inn: '', address: '', phone: '', email: '' },
  ownerNotificationSettings: { telegramBot: true, emailReports: true, smsReminders: false, lowStock: true, dailyReport: true, weeklyReport: false, bookingReminders: true },
  ownerIntegrations: { telegram: true, yookassa: false, amoCrm: false, googleCalendar: false },
  ownerSecurity: { twoFactor: false },
  workerNotificationSettings: {},
};

export const EMPTY_CONTENT: ContentData = {
  hero: {
    backgroundImage: '',
    badgeText: 'ATMOSFERA ДЕТЕЙЛИНГ',
    title: 'Ваш автомобиль заслуживает лучшего ухода',
    titleHighlight: 'лучшего',
    subtitle: 'Премиум мойка и детейлинг для безупречного блеска вашего авто.',
    button1Text: 'Наши услуги',
    button1Action: 'services',
    button2Text: 'Записаться',
    button2Action: 'contact',
    stats: [
      { value: '4.9', label: 'Средний рейтинг' },
      { value: '15 мин', label: 'Экспресс-мойка' },
      { value: '100%', label: 'Довольных клиентов' },
    ],
  },
  about: { text: '', features: [], image: '' },
  services: [],
  works: [],
};
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['new', 'confirmed', 'scheduled', 'in_progress'];

function timeToMinutes(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildTimeSlots(openMinutes: number, closeMinutes: number, stepMinutes = 30): string[] {
  const slots: string[] = [];
  for (let current = openMinutes; current + stepMinutes <= closeMinutes; current += stepMinutes) {
    slots.push(minutesToTime(current));
  }
  return slots;
}

function timeRangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

const AppContext = createContext<AppContextType | null>(null);

function normalizeWorker(worker: Worker) {
  return {
    ...worker,
    payrollSummary: worker.payrollSummary ? {
      ...worker.payrollSummary,
      bookingItems: worker.payrollSummary.bookingItems || [],
      entries: (worker.payrollSummary.entries || []).map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
      })),
    } : undefined,
  };
}

function normalizeBootstrap(bootstrap: BootstrapPayload) {
  return {
    ...bootstrap,
    bookings: bootstrap.bookings.map((booking) => ({
      ...booking,
      createdAt: new Date(booking.createdAt),
      additionalServices: (booking.additionalServices || []).map((as) => ({
        ...as,
        createdAt: new Date(as.createdAt),
      })),
    })),
    notifications: bootstrap.notifications.map((notification) => ({ ...notification, createdAt: new Date(notification.createdAt) })),
    penalties: bootstrap.penalties.map((penalty) => ({
      ...penalty,
      createdAt: new Date(penalty.createdAt),
      activeUntil: new Date(penalty.activeUntil),
      revokedAt: penalty.revokedAt ? new Date(penalty.revokedAt) : null,
    })),
    staffProfile: bootstrap.staffProfile ? normalizeWorker(bootstrap.staffProfile) : null,
    workers: bootstrap.workers.map((worker) => normalizeWorker(worker)),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile>(EMPTY_CLIENT_PROFILE);
  const [staffProfile, setStaffProfile] = useState<Worker | null>(null);
  const [clients, setClients] = useState<RegisteredClient[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [settings, setSettings] = useState<SettingsBundle>(EMPTY_SETTINGS);
  const [content, setContent] = useState<ContentData>(EMPTY_CONTENT);

  const upcomingDates = getUpcomingDates(10);
  const todayLabel = upcomingDates[0];
  const tomorrowLabel = upcomingDates[1] || upcomingDates[0];

  function applyBootstrap(bootstrap: BootstrapPayload) {
    const normalized = normalizeBootstrap(bootstrap);
    setSession(normalized.session);
    setClientProfile(normalized.clientProfile || EMPTY_CLIENT_PROFILE);
    setStaffProfile(normalized.staffProfile || null);
    setClients(normalized.clients);
    setBookings(normalized.bookings);
    setNotifications(normalized.notifications);
    setStockItems(normalized.stockItems);
    setExpenses(normalized.expenses);
    setPenalties(normalized.penalties);
    setWorkers(normalized.workers);
    setServices(normalized.services);
    setBoxes(normalized.boxes);
    setSchedule(normalized.schedule);
    setSettings({
      ...EMPTY_SETTINGS,
      ...normalized.settings,
      adminProfile: { ...EMPTY_SETTINGS.adminProfile, ...normalized.settings.adminProfile },
      adminNotificationSettings: { ...EMPTY_SETTINGS.adminNotificationSettings, ...normalized.settings.adminNotificationSettings },
      ownerCompany: { ...EMPTY_SETTINGS.ownerCompany, ...normalized.settings.ownerCompany },
      ownerNotificationSettings: { ...EMPTY_SETTINGS.ownerNotificationSettings, ...normalized.settings.ownerNotificationSettings },
      ownerIntegrations: { ...EMPTY_SETTINGS.ownerIntegrations, ...normalized.settings.ownerIntegrations },
      ownerSecurity: { ...EMPTY_SETTINGS.ownerSecurity, ...normalized.settings.ownerSecurity },
      workerNotificationSettings: normalized.settings.workerNotificationSettings || {},
    });
  }

  async function refreshBootstrap() {
    const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/session');
    applyBootstrap(bootstrap);
  }

  function handleError(nextError: unknown) {
    const message = nextError instanceof Error ? nextError.message : 'Не удалось выполнить запрос';
    setError(message);
    throw nextError;
  }

  async function restoreSession() {
    try {
      const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/session');
      applyBootstrap(bootstrap);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshActiveSessions() {
    setActiveSessions([]);
  }

  function applyTelegramTheme(tg: NonNullable<ReturnType<typeof getTelegramWebApp>>) {
    setIsDark(tg.colorScheme === 'dark');
    const root = document.documentElement;
    const theme = tg.themeParams as Record<string, string> | undefined;
    if (theme) {
      Object.entries(theme).forEach(([key, value]) => {
        const cssVar = `--tg-${key.replace(/_/g, '-')}`;
        root.style.setProperty(cssVar, value);
      });
    }
  }

  useEffect(() => {
    const tg = getTelegramWebApp();
    let onThemeChange: (() => void) | undefined;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      applyTelegramTheme(tg);
      onThemeChange = () => applyTelegramTheme(tg);
      tg.onEvent?.('themeChanged', onThemeChange);
    }
    void restoreSession();
    return () => {
      if (tg && onThemeChange) {
        tg.offEvent?.('themeChanged', onThemeChange);
      }
    };
  }, []);

  async function logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
    }
    setSession(null);
    setActiveSessions([]);
    setClientProfile(EMPTY_CLIENT_PROFILE);
    setStaffProfile(null);
    setClients([]);
    setBookings([]);
    setNotifications([]);
    setStockItems([]);
    setExpenses([]);
    setPenalties([]);
    setWorkers([]);
    setServices([]);
    setBoxes([]);
    setSchedule([]);
    setSettings(EMPTY_SETTINGS);
    setContent(EMPTY_CONTENT);
    setError(null);
  }

  async function loginClient(profile: { name: string; car?: string; plate?: string; registered?: boolean }) {
    try {
      setAuthLoading(true);
      setError(null);
      const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/client', {
        method: 'POST',
        body: profile,
      });
      applyBootstrap(bootstrap);
      return bootstrap.session.role;
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

  async function linkStaff(login: string, password: string) {
    try {
      setAuthLoading(true);
      setError(null);
      const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/staff/link', {
        method: 'POST',
        body: { login, password },
      });
      applyBootstrap(bootstrap);
      return bootstrap.session.role;
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

  async function switchRole(targetRole: Role) {
    try {
      setAuthLoading(true);
      setError(null);
      const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/switch-role', {
        method: 'POST',
        body: { targetRole },
      });
      applyBootstrap(bootstrap);
      window.location.reload();
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

    async function updateClientProfile(profile: Partial<ClientProfile>) {
      const payload = { ...clientProfile, ...profile };
      const saved = await apiRequest<ClientProfile>('/api/clients/me', { method: 'PATCH', body: payload });
      setClientProfile(saved);
    }

  async function remindAdminAboutInactiveClients() {
      const response = await apiRequest<{ message: string }>('/api/owner/inactive-clients/remind-admin', { method: 'POST' });
      return response.message;
    }

  async function addClient(client: ClientCreateInput) {
    const created = await apiRequest<RegisteredClient>('/api/clients', { method: 'POST', body: client });
    setClients((current) => [created, ...current]);
    return created;
  }

  async function updateClientCard(clientId: string, updates: Partial<Pick<RegisteredClient, 'name' | 'phone' | 'car' | 'plate' | 'plateType' | 'notes' | 'debtBalance' | 'adminRating' | 'adminNote' | 'referralSource'> & { vehicles?: Array<{ car: string; plate: string; plateType?: string }> }>) {
    const saved = await apiRequest<RegisteredClient>(`/api/clients/${clientId}/card`, { method: 'PATCH', body: updates });
    setClients((current) => current.map((client) => (client.id === clientId ? saved : client)));
  }

  async function deleteClient(clientId: string) {
    await apiRequest<{ message: string }>(`/api/clients/${clientId}`, { method: 'DELETE' });
    setClients((current) => current.filter((client) => client.id !== clientId));
  }

  async function addBooking(booking: BookingCreateInput) {
    const created = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [await apiRequest<BootstrapPayload['bookings'][number]>('/api/bookings', { method: 'POST', body: booking })],
      notifications: [],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).bookings[0];
    setBookings((current) => [created, ...current]);
    if (created.clientId) {
      setClients((current) => {
        const existingClient = current.find((client) => client.id === created.clientId);
        const nextClient = {
          id: created.clientId,
          name: created.clientName,
          phone: created.clientPhone,
          car: created.car || '',
          plate: created.plate || '',
          plateType: created.plateType || 'russian',
          vehicles: existingClient?.vehicles || [],
          notes: existingClient?.notes || '',
          debtBalance: existingClient?.debtBalance || 0,
          adminRating: existingClient?.adminRating || 0,
          adminNote: existingClient?.adminNote || '',
        };
        if (current.some((client) => client.id === created.clientId)) {
          return current.map((client) => (client.id === created.clientId ? { ...client, ...nextClient } : client));
        }
        return [nextClient, ...current];
      });
    }
    return created;
  }

  async function updateBooking(id: string, updates: BookingUpdateInput) {
    const updated = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [await apiRequest<BootstrapPayload['bookings'][number]>(`/api/bookings/${id}`, { method: 'PATCH', body: updates })],
      notifications: [],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).bookings[0];
    setBookings((current) => current.map((booking) => (booking.id === id ? updated : booking)));
    if (updated.clientId) {
      setClients((current) => current.map((client) => (
        client.id === updated.clientId
          ? { ...client, name: updated.clientName, phone: updated.clientPhone, car: updated.car || '', plate: updated.plate || '' }
          : client
      )));
    }
  }

  async function deleteBooking(id: string) {
    await apiRequest<{ message: string }>(`/api/bookings/${id}`, { method: 'DELETE' });
    setBookings((current) => current.filter((booking) => booking.id !== id));
  }

  async function addBookingService(bookingId: string, service: Omit<BookingServiceItem, 'serviceId'> & { serviceId: string }) {
    const updated = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [await apiRequest<BootstrapPayload['bookings'][number]>(`/api/bookings/${bookingId}/services`, { method: 'POST', body: service })],
      notifications: [],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).bookings[0];
    setBookings((current) => current.map((booking) => (booking.id === bookingId ? updated : booking)));
    return updated;
  }

  async function addBookingAdditionalService(bookingId: string, service: AddAdditionalServiceInput) {
    const updated = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [await apiRequest<BootstrapPayload['bookings'][number]>(`/api/bookings/${bookingId}/additional-services`, { method: 'POST', body: service })],
      notifications: [],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).bookings[0];
    setBookings((current) => current.map((booking) => (booking.id === bookingId ? updated : booking)));
    return updated;
  }

  async function removeBookingAdditionalService(bookingId: string, additionalServiceId: string) {
    const updated = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [await apiRequest<BootstrapPayload['bookings'][number]>(`/api/bookings/${bookingId}/additional-services/${additionalServiceId}`, { method: 'DELETE' })],
      notifications: [],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).bookings[0];
    setBookings((current) => current.map((booking) => (booking.id === bookingId ? updated : booking)));
    return updated;
  }

  async function addNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
    const created = normalizeBootstrap({
      session: session as SessionInfo,
      clientProfile,
      staffProfile,
      clients: [],
      bookings: [],
      notifications: [await apiRequest<BootstrapPayload['notifications'][number]>('/api/notifications', { method: 'POST', body: notification })],
      stockItems: [],
      expenses: [],
      penalties: [],
      workers: [],
      services: [],
      boxes: [],
      schedule: [],
      settings,
    }).notifications[0];
    setNotifications((current) => [created, ...current]);
  }

  async function markNotificationRead(id: string) {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications((current) => current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));
  }

  async function markAllNotificationsRead(role: Role) {
    await apiRequest('/api/notifications/read-all', { method: 'POST', body: { role } });
    setNotifications((current) => current.map((notification) => {
      if (role === 'accountant') {
        if (notification.recipientRole !== 'accountant' && notification.recipientRole !== 'admin') return notification;
      } else if (notification.recipientRole !== role) {
        return notification;
      }
      if (role === 'client' && notification.recipientId !== session?.actorId) return notification;
      if (role === 'worker' && notification.recipientId !== session?.actorId) return notification;
      return { ...notification, read: true };
    }));
  }

  async function addStockItem(item: Omit<StockItem, 'id'>) {
    const created = await apiRequest<StockItem>('/api/stock-items', { method: 'POST', body: item });
    setStockItems((current) => [...current, created]);
  }

  async function updateStockItem(id: string, updates: Partial<StockItem>) {
    const updated = await apiRequest<StockItem>(`/api/stock-items/${id}`, { method: 'PATCH', body: updates });
    setStockItems((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  async function writeOffStock(id: string, qty: number) {
    const updated = await apiRequest<StockItem>(`/api/stock-items/${id}/write-off`, { method: 'POST', body: { qty } });
    setStockItems((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  async function deleteStockItem(id: string) {
    await apiRequest<{ message: string }>(`/api/stock-items/${id}`, { method: 'DELETE' });
    setStockItems((current) => current.filter((item) => item.id !== id));
  }

  async function addExpense(expense: Omit<Expense, 'id'>) {
    const created = await apiRequest<Expense>('/api/expenses', { method: 'POST', body: expense });
    setExpenses((current) => [created, ...current]);
  }

  async function addIncome(income: { amount: number; source: string; note?: string; date: string; resourceGroup?: string }) {
    const created = await apiRequest<Income>('/api/owner/incomes', { method: 'POST', body: income });
    setIncomes((current) => [created, ...current]);
  }

  async function updateExpense(id: string, patch: { title?: string; amount?: number; category?: string; date?: string; note?: string | null; resourceGroup?: string }) {
    const updated = await apiRequest<Expense>(`/api/expenses/${id}`, { method: 'PATCH', body: patch });
    setExpenses((current) => current.map((e) => (e.id === id ? updated : e)));
  }

  async function updateIncome(id: string, patch: { amount?: number; source?: string; note?: string | null; date?: string; resourceGroup?: string }) {
    const updated = await apiRequest<Income>(`/api/owner/incomes/${id}`, { method: 'PATCH', body: patch });
    setIncomes((current) => current.map((i) => (i.id === id ? updated : i)));
  }

  async function addPenalty(penalty: Omit<Penalty, 'id' | 'createdAt' | 'activeUntil' | 'revokedAt' | 'workerName' | 'ownerId'>) {
    await apiRequest<BootstrapPayload['penalties'][number]>('/api/penalties', { method: 'POST', body: penalty });
    await refreshBootstrap();
  }

  async function revokePenalty(penaltyId: string) {
    await apiRequest<BootstrapPayload['penalties'][number]>(`/api/penalties/${penaltyId}/revoke`, { method: 'POST' });
    await refreshBootstrap();
  }

  async function revokeAllPenalties(workerId: string) {
    await apiRequest(`/api/workers/${workerId}/penalties/revoke-all`, { method: 'POST' });
    await refreshBootstrap();
  }

  async function createTelegramLinkCode() {
    const created = await apiRequest<{ code: string; expiresAt: string; linked: boolean }>('/api/telegram/link-code', { method: 'POST' });
    return { ...created, expiresAt: new Date(created.expiresAt) };
  }

  async function downloadOwnerExport(kind: OwnerExportKind, params?: OwnerExportParams) {
    const fallback = kind === 'pdf' ? 'owner-report.pdf' : 'owner-report.xlsx';
    let path = `/api/owner/exports/${kind}`;
    if (params) {
      const qs = new URLSearchParams();
      if (params.segment) qs.set('segment', params.segment);
      if (params.date_from) qs.set('date_from', params.date_from);
      if (params.date_to) qs.set('date_to', params.date_to);
      const qstr = qs.toString();
      if (qstr) path += '?' + qstr;
    }
    return apiDownload(path, fallback);
  }

  async function sendOwnerExportToTelegram(kind: OwnerExportKind, params?: OwnerExportParams) {
    let path = `/api/owner/exports/${kind}/telegram`;
    if (params) {
      const qs = new URLSearchParams();
      if (params.segment) qs.set('segment', params.segment);
      if (params.date_from) qs.set('date_from', params.date_from);
      if (params.date_to) qs.set('date_to', params.date_to);
      const qstr = qs.toString();
      if (qstr) path += '?' + qstr;
    }
    return apiRequest<OwnerExportDelivery>(path, { method: 'POST' });
  }

  async function sendOwnerSummaryReport(period: OwnerReportPeriod, segment: OwnerReportSegment) {
    const response = await apiRequest<{ message: string }>(`/api/owner/reports/${period}/${segment}/telegram`, { method: 'POST' });
    return response.message;
  }

  async function dispatchOwnerReminders(options: { targetDate?: string; force?: boolean } = {}) {
    return apiRequest<OwnerReminderDispatchResult>('/api/owner/reminders/dispatch', {
      method: 'POST',
      body: {
        targetDate: options.targetDate,
        force: options.force ?? true,
      },
    });
  }

  async function saveServices(nextServices: Service[]) {
    await apiRequest<Service[]>('/api/settings/services', { method: 'PUT', body: nextServices });
    await refreshBootstrap();
  }

  async function saveBoxes(nextBoxes: Box[]) {
    setBoxes(await apiRequest<Box[]>('/api/settings/boxes', { method: 'PUT', body: nextBoxes }));
  }

  async function saveSchedule(nextSchedule: ScheduleDay[]) {
    setSchedule(await apiRequest<ScheduleDay[]>('/api/settings/schedule', { method: 'PUT', body: nextSchedule }));
  }

  async function saveAdminProfile(profile: AdminProfile) {
    const saved = await apiRequest<AdminProfile>('/api/settings/admin/profile', { method: 'PUT', body: profile });
    setSettings((current) => ({ ...current, adminProfile: saved }));
  }

  async function saveAdminNotificationSettings(nextSettings: AdminNotificationSettings) {
    const saved = await apiRequest<AdminNotificationSettings>('/api/settings/admin/notifications', { method: 'PUT', body: nextSettings });
    setSettings((current) => ({ ...current, adminNotificationSettings: saved }));
  }

  async function saveWorkerProfile(workerId: string, profile: WorkerProfile) {
    const saved = await apiRequest<Worker>(`/api/settings/workers/${workerId}/profile`, { method: 'PUT', body: profile });
    const normalized = normalizeWorker(saved);
    setWorkers((current) => current.map((worker) => (worker.id === workerId ? normalized : worker)));
    if (staffProfile?.id === workerId) {
      setStaffProfile(normalized);
    }
  }

  async function saveWorkerNotificationSettings(workerId: string, nextSettings: WorkerNotificationSettings) {
    const saved = await apiRequest<WorkerNotificationSettings>(`/api/settings/workers/${workerId}/notifications`, { method: 'PUT', body: nextSettings });
    setSettings((current) => ({
      ...current,
      workerNotificationSettings: { ...current.workerNotificationSettings, [workerId]: saved },
    }));
  }

  async function saveOwnerCompany(company: OwnerCompany) {
    const saved = await apiRequest<OwnerCompany>('/api/settings/owner/company', { method: 'PUT', body: company });
    setSettings((current) => ({ ...current, ownerCompany: saved }));
  }

  async function saveOwnerNotificationSettings(nextSettings: OwnerNotificationSettings) {
    const saved = await apiRequest<OwnerNotificationSettings>('/api/settings/owner/notifications', { method: 'PUT', body: nextSettings });
    setSettings((current) => ({ ...current, ownerNotificationSettings: saved }));
  }

  async function saveOwnerIntegrations(nextSettings: OwnerIntegrations) {
    const saved = await apiRequest<OwnerIntegrations>('/api/settings/owner/integrations', { method: 'PUT', body: nextSettings });
    setSettings((current) => ({ ...current, ownerIntegrations: saved }));
  }

  async function saveOwnerSecurity(nextSettings: OwnerSecurity) {
    const saved = await apiRequest<OwnerSecurity>('/api/settings/owner/security', { method: 'PUT', body: nextSettings });
    setSettings((current) => ({ ...current, ownerSecurity: saved }));
  }

  async function saveWorkerSettings(nextSettings: EmployeeSetting[]) {
    const saved = await apiRequest<Worker[]>('/api/workers/settings', { method: 'PUT', body: nextSettings });
    setWorkers(saved.map((worker) => normalizeWorker(worker)));
  }

  async function saveAdminWorkerPayroll(nextSettings: EmployeeSetting[]) {
    const saved = await apiRequest<Worker[]>('/api/admin/workers/payroll', { method: 'PUT', body: nextSettings });
    const normalized = saved.map((worker) => normalizeWorker(worker));
    setWorkers((current) => current.map((worker) => {
      const nextWorker = normalized.find((item) => item.id === worker.id);
      return nextWorker ?? worker;
    }));
  }

  async function saveContent(nextContent: ContentData) {
    const saved = await apiRequest<ContentData>('/api/content', { method: 'PUT', body: nextContent });
    setContent(saved);
  }

  async function createPayrollEntry(entry: PayrollEntryCreateInput) {
    await apiRequest<Worker>('/api/payroll/entries', { method: 'POST', body: entry });
    await refreshBootstrap();
  }

  async function checkConsent() {
    try {
      const response = await apiRequest<{ consented: boolean }>('/api/auth/consent/check');
      return response.consented;
    } catch {
      return false;
    }
  }

  async function submitConsent() {
    await apiRequest<{ consented: boolean; consentedAt: string }>('/api/auth/consent', { method: 'POST' });
  }

  async function listShiftChecklists() {
    const entries = await apiRequest<Array<Omit<ShiftChecklist, 'createdAt'> & { createdAt: string }>>('/api/shift-checklists');
    return entries.map((entry) => ({ ...entry, createdAt: new Date(entry.createdAt) }));
  }

  async function submitShiftChecklist(payload: { phase: 'start' | 'end'; note?: string; items: Array<{ stockItemId: string; actualQty: number }> }) {
    const entry = await apiRequest<Omit<ShiftChecklist, 'createdAt'> & { createdAt: string }>('/api/shift-checklists', {
      method: 'POST',
      body: payload,
    });
    return { ...entry, createdAt: new Date(entry.createdAt) };
  }

  async function listAdminShiftInspections() {
    const entries = await apiRequest<Array<Omit<AdminShiftInspection, 'createdAt' | 'reviewedAt'> & { createdAt: string; reviewedAt?: string | null }>>('/api/admin/shift-inspections');
    return entries.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      reviewedAt: entry.reviewedAt ? new Date(entry.reviewedAt) : null,
    }));
  }

  async function submitAdminShiftInspection(payload: {
    floorPhotoUrl: string;
    clothsReady: boolean;
    supplies: Array<{ stockItemId: string; checked: boolean }>;
    masters: Array<{ workerId: string; checked: boolean }>;
    note?: string;
  }) {
    const entry = await apiRequest<Omit<AdminShiftInspection, 'createdAt' | 'reviewedAt'> & { createdAt: string; reviewedAt?: string | null }>('/api/admin/shift-inspections', {
      method: 'POST',
      body: payload,
    });
    return {
      ...entry,
      createdAt: new Date(entry.createdAt),
      reviewedAt: entry.reviewedAt ? new Date(entry.reviewedAt) : null,
    };
  }

  async function hireWorker(worker: WorkerCreateInput) {
    const created = await apiRequest<Worker>('/api/workers', { method: 'POST', body: worker });
    const normalized = normalizeWorker(created);
    setWorkers((current) => [...current, normalized].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role.localeCompare(right.role);
      }
      return left.name.localeCompare(right.name, 'ru');
    }));
    return normalized;
  }

  async function fireWorker(workerId: string) {
    await apiRequest(`/api/workers/${workerId}`, { method: 'DELETE' });
    await refreshBootstrap();
  }

  async function resetWorkerPassword(workerId: string, newPassword: string) {
    await apiRequest(`/api/workers/${workerId}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    });
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  async function requestOwnerDatabaseReset(password: string) {
    const response = await apiRequest<{
      requestId: string;
      creatorCodeExpiresAt: string;
      confirmationPhrase: string;
      preview: OwnerDatabaseResetPreview;
      warnings: string[];
      message: string;
    }>('/api/owner/database-reset/start', {
      method: 'POST',
      body: { password },
    });
    return {
      ...response,
      creatorCodeExpiresAt: new Date(response.creatorCodeExpiresAt),
    };
  }

  async function approveOwnerDatabaseReset(requestId: string, creatorCode: string, confirmationPhrase: string) {
    const response = await apiRequest<{
      requestId: string;
      finalizeAfter: string;
      preview: OwnerDatabaseResetPreview;
      warnings: string[];
      message: string;
    }>('/api/owner/database-reset/approve', {
      method: 'POST',
      body: { requestId, creatorCode, confirmationPhrase },
    });
    return {
      ...response,
      finalizeAfter: new Date(response.finalizeAfter),
    };
  }

  async function executeOwnerDatabaseReset(requestId: string) {
    const response = await apiRequest<OwnerDatabaseResetResult>('/api/owner/database-reset/execute', {
      method: 'POST',
      body: { requestId },
    });
    await refreshBootstrap();
    return response;
  }

  function getTimeSlotsForDate(date: string, options?: { durationMinutes?: number; boxName?: string; resourceGroup?: string }) {
    const parsedDate = parseFlexibleDate(date);
    if (!parsedDate) return [];
    const day = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
    if (!day || !day.active) return [];

    const openMinutes = timeToMinutes(day.open);
    const closeMinutes = timeToMinutes(day.close);
    if (openMinutes === null || closeMinutes === null) return [];

    const durationMinutes = Math.max(1, options?.durationMinutes ?? 30);
    const scheduleSlots = buildTimeSlots(openMinutes, closeMinutes);
    const candidateBoxes = options?.boxName
      ? [options.boxName]
      : boxes
        .filter((box) => box.active && (!options?.resourceGroup || box.resourceGroup === options.resourceGroup))
        .map((box) => box.name);
    const boxNames = candidateBoxes.length > 0 ? candidateBoxes : ['Бокс 1'];
    return scheduleSlots.filter((slot) => {
      const slotStart = timeToMinutes(slot);
      if (slotStart === null) return false;
      const slotEnd = slotStart + durationMinutes;
      if (slotStart < openMinutes || slotEnd > closeMinutes || isPastTimeSlot(date, slot)) {
        return false;
      }
      return boxNames.some((boxName) => !bookings.some((booking) => {
        if (booking.date !== date || booking.box !== boxName) return false;
        if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
        const bookingStart = timeToMinutes(booking.time);
        if (bookingStart === null) return false;
        return timeRangesOverlap(slotStart, slotEnd, bookingStart, bookingStart + booking.duration);
      }));
    });
  }

  async function getBookingAvailabilityForDate(date: string, options?: { durationMinutes?: number; serviceId?: string; resourceGroup?: string }) {
    const durationMinutes = Math.max(1, options?.durationMinutes ?? 30);
    try {
      const params = new URLSearchParams({
        date,
        duration: String(durationMinutes),
      });
      if (options?.serviceId) {
        params.set('serviceId', options.serviceId);
      }
      if (options?.resourceGroup) {
        params.set('resourceGroup', options.resourceGroup);
      }
      const response = await apiRequest<{ date: string; duration: number; slots: BookingSlotAvailability[] }>(
        `/api/bookings/availability?${params.toString()}`,
      );
      return response.slots;
    } catch {
      return getTimeSlotsForDate(date, { durationMinutes, resourceGroup: options?.resourceGroup }).map((time) => ({
        time,
        available: false,
        freeBoxes: 0,
        occupiedBoxes: 0,
      }));
    }
  }

  return (
    <AppContext.Provider value={{
      loading,
      authLoading,
      error,
      session,
      activeSessions,
      isDark,
      toggleTheme: () => setIsDark((current) => !current),
      logout,
      clientProfile,
      staffProfile,
      clients,
      bookings,
      notifications,
      stockItems,
      expenses,
      incomes,
      penalties,      workers,
      services,
      boxes,
      schedule,
      settings,
      content,
      upcomingDates,
      todayLabel,
      tomorrowLabel,
      getTimeSlotsForDate,
      getBookingAvailabilityForDate,
      loginClient,
      linkStaff,
      switchRole,
      updateClientProfile,
      addClient,
      updateClientCard,
      deleteClient,
      addBooking,
      updateBooking,
      deleteBooking,
      addBookingService,
      addBookingAdditionalService,
      removeBookingAdditionalService,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addStockItem,
      updateStockItem,
      writeOffStock,
      deleteStockItem,
      addExpense,
      addIncome,
      updateExpense,
      updateIncome,
      addPenalty,
      revokePenalty,
      revokeAllPenalties,
      createTelegramLinkCode,
      downloadOwnerExport,
      sendOwnerExportToTelegram,
      sendOwnerSummaryReport,
        dispatchOwnerReminders,
        remindAdminAboutInactiveClients,
        saveServices,
      saveBoxes,
      saveSchedule,
      saveAdminProfile,
      saveAdminNotificationSettings,
      saveWorkerProfile,
      saveWorkerNotificationSettings,
      saveOwnerCompany,
      saveOwnerNotificationSettings,
      saveOwnerIntegrations,
      saveOwnerSecurity,
      saveWorkerSettings,
      saveAdminWorkerPayroll,
      saveContent,
      createPayrollEntry,
      listShiftChecklists,
      submitShiftChecklist,
      listAdminShiftInspections,
      submitAdminShiftInspection,
      hireWorker,
      fireWorker,
      resetWorkerPassword,
      changePassword,
      requestOwnerDatabaseReset,
      approveOwnerDatabaseReset,
      executeOwnerDatabaseReset,
      refreshBootstrap,
      refreshActiveSessions,
      checkConsent,
      submitConsent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function getWorkerNotificationSettings(settings: SettingsBundle, workerId: string) {
  return settings.workerNotificationSettings[workerId] || EMPTY_WORKER_NOTIFICATIONS;
}

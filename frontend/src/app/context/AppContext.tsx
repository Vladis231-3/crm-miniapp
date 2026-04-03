import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiDownload, apiRequest, getTelegramInitData, getTelegramWebApp, tokenStorage } from '../api';
import { getScheduleDayIndex, getUpcomingDates, isPastTimeSlot, parseFlexibleDate } from '../utils/date';

export type Role = 'client' | 'admin' | 'worker' | 'owner';
export type BookingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'admin_review';
export type PaymentType = 'cash' | 'card' | 'online';

export interface SessionInfo {
  role: Role;
  actorId: string;
  sessionId: string;
  login?: string | null;
  displayName: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  ipAddress: string;
  createdAt: Date;
  lastSeenAt: Date;
  current: boolean;
}

export interface ClientProfile {
  name: string;
  phone: string;
  car: string;
  plate: string;
  registered: boolean;
}

export interface RegisteredClient {
  id: string;
  name: string;
  phone: string;
  car: string;
  plate: string;
}

export interface Worker {
  id: string;
  name: string;
  experience: string;
  defaultPercent: number;
  salaryBase: number;
  available: boolean;
  active: boolean;
  phone: string;
  email: string;
  city: string;
  specialty: string;
  about: string;
  telegramChatId: string;
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
  workers: { workerId: string; workerName: string; percent: number }[];
  box: string;
  paymentType: PaymentType;
  createdAt: Date;
  notes?: string;
  car?: string;
  plate?: string;
}

export type BookingCreateInput = Omit<Booking, 'id' | 'createdAt'> & {
  notifyWorkers?: boolean;
};

export type BookingUpdateInput = Partial<Booking> & {
  notifyWorkers?: boolean;
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

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
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
  sessionsClosed: number;
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
  desc: string;
  active: boolean;
}

export interface Box {
  id: string;
  name: string;
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
  percent: number;
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
  name: string;
  percent: number;
  salaryBase: number;
  active: boolean;
  telegramChatId: string;
}

export interface WorkerCreateInput {
  name: string;
  login: string;
  password: string;
  percent: number;
  salaryBase: number;
  phone?: string;
  email?: string;
  telegramChatId: string;
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

interface AuthResponse {
  token: string;
  role: Role;
  actorId: string;
  bootstrap: BootstrapPayload;
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
  penalties: Penalty[];
  workers: Worker[];
  services: Service[];
  boxes: Box[];
  schedule: ScheduleDay[];
  settings: SettingsBundle;
  upcomingDates: string[];
  todayLabel: string;
  tomorrowLabel: string;
  getTimeSlotsForDate: (date: string, options?: { durationMinutes?: number; boxName?: string }) => string[];
  loginClient: (profile: ClientProfile) => Promise<Role>;
  loginStaff: (login: string, password: string, twoFactorCode?: string) => Promise<Role>;
  loginPrimaryOwnerViaTelegram: () => Promise<Role>;
  updateClientProfile: (profile: Partial<ClientProfile>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addBooking: (booking: BookingCreateInput) => Promise<Booking>;
  updateBooking: (id: string, updates: BookingUpdateInput) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (role: Role) => Promise<void>;
  addStockItem: (item: Omit<StockItem, 'id'>) => Promise<void>;
  updateStockItem: (id: string, updates: Partial<StockItem>) => Promise<void>;
  writeOffStock: (id: string, qty: number) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  addPenalty: (penalty: Omit<Penalty, 'id' | 'createdAt' | 'activeUntil' | 'revokedAt' | 'workerName' | 'ownerId'>) => Promise<void>;
  revokePenalty: (penaltyId: string) => Promise<void>;
  revokeAllPenalties: (workerId: string) => Promise<void>;
  createTelegramLinkCode: () => Promise<TelegramLinkCode>;
  downloadOwnerExport: (kind: OwnerExportKind) => Promise<string>;
  sendOwnerExportToTelegram: (kind: OwnerExportKind) => Promise<OwnerExportDelivery>;
  sendOwnerSummaryReport: (period: OwnerReportPeriod, segment: OwnerReportSegment) => Promise<string>;
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
  hireWorker: (worker: WorkerCreateInput) => Promise<Worker>;
  fireWorker: (workerId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestOwnerDatabaseReset: (password: string) => Promise<OwnerDatabaseResetStart>;
  approveOwnerDatabaseReset: (requestId: string, creatorCode: string, confirmationPhrase: string) => Promise<OwnerDatabaseResetApproval>;
  executeOwnerDatabaseReset: (requestId: string) => Promise<OwnerDatabaseResetResult>;
  refreshActiveSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
}

const EMPTY_CLIENT_PROFILE: ClientProfile = { name: '', phone: '', car: '', plate: '', registered: false };
const EMPTY_WORKER_NOTIFICATIONS: WorkerNotificationSettings = { newTask: true, taskUpdate: true, payment: true, reminders: false, sms: false };
const EMPTY_SETTINGS: SettingsBundle = {
  adminProfile: { name: 'Администратор', email: '', phone: '', telegramChatId: '' },
  adminNotificationSettings: { newBooking: true, cancelled: true, paymentDue: false, workerAssigned: true, reminders: true },
  ownerCompany: { name: 'ATMOSFERA', legalName: '', inn: '', address: '', phone: '', email: '' },
  ownerNotificationSettings: { telegramBot: true, emailReports: true, smsReminders: false, lowStock: true, dailyReport: true, weeklyReport: false },
  ownerIntegrations: { telegram: true, yookassa: false, amoCrm: false, googleCalendar: false },
  ownerSecurity: { twoFactor: false },
  workerNotificationSettings: {},
};
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

function normalizeBootstrap(bootstrap: BootstrapPayload) {
  return {
    ...bootstrap,
    bookings: bootstrap.bookings.map((booking) => ({ ...booking, createdAt: new Date(booking.createdAt) })),
    notifications: bootstrap.notifications.map((notification) => ({ ...notification, createdAt: new Date(notification.createdAt) })),
    penalties: bootstrap.penalties.map((penalty) => ({
      ...penalty,
      createdAt: new Date(penalty.createdAt),
      activeUntil: new Date(penalty.activeUntil),
      revokedAt: penalty.revokedAt ? new Date(penalty.revokedAt) : null,
    })),
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
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [settings, setSettings] = useState<SettingsBundle>(EMPTY_SETTINGS);

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
    setSettings({ ...EMPTY_SETTINGS, ...normalized.settings });
  }

  async function refreshBootstrap() {
    if (!tokenStorage.get()) {
      return;
    }
    const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/session');
    applyBootstrap(bootstrap);
    if (bootstrap.session.role !== 'client') {
      await refreshActiveSessions();
    }
  }

  async function refreshActiveSessions() {
    if (!tokenStorage.get()) {
      setActiveSessions([]);
      return;
    }
    const sessions = await apiRequest<Array<Omit<ActiveSession, 'createdAt' | 'lastSeenAt'> & { createdAt: string; lastSeenAt: string }>>('/api/auth/sessions');
    setActiveSessions(
      sessions.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        lastSeenAt: new Date(item.lastSeenAt),
      })),
    );
  }

  function handleError(nextError: unknown) {
    const message = nextError instanceof Error ? nextError.message : 'Не удалось выполнить запрос';
    setError(message);
    throw nextError;
  }

  async function tryTelegramAutoLogin() {
    const initData = getTelegramInitData();
    if (!initData) {
      return false;
    }
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/telegram', {
        method: 'POST',
        useStoredToken: false,
        body: { initData },
      });
      tokenStorage.set(response.token);
      applyBootstrap(response.bootstrap);
      if (response.bootstrap.session.role === 'client') {
        setActiveSessions([]);
      } else {
        await refreshActiveSessions();
      }
      return true;
    } catch {
      return false;
    }
  }

  async function restoreSession() {
    try {
      const telegramAutoLoggedIn = await tryTelegramAutoLogin();
      if (telegramAutoLoggedIn) {
        return;
      }

      const token = tokenStorage.get();
      if (!token) {
        return;
      }

      const bootstrap = await apiRequest<BootstrapPayload>('/api/auth/session');
      applyBootstrap(bootstrap);
      if (bootstrap.session.role === 'client') {
        setActiveSessions([]);
      } else {
        await refreshActiveSessions();
      }
    } catch {
      tokenStorage.clear();
      setSession(null);
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tg = getTelegramWebApp();
    tg?.ready?.();
    tg?.expand?.();
    if (tg?.colorScheme === 'dark') {
      setIsDark(true);
    }
    void restoreSession();
  }, []);

  function logout() {
    void apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    tokenStorage.clear();
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
    setError(null);
  }

  async function loginClient(profile: ClientProfile) {
    try {
      setAuthLoading(true);
      setError(null);
      const response = await apiRequest<AuthResponse>('/api/auth/client', {
        method: 'POST',
        useStoredToken: false,
        body: {
          profile,
          initData: getTelegramInitData() || undefined,
        },
      });
      tokenStorage.set(response.token);
      applyBootstrap(response.bootstrap);
      setActiveSessions([]);
      return response.role;
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginStaff(login: string, password: string, twoFactorCode?: string) {
    try {
      setAuthLoading(true);
      setError(null);
      const response = await apiRequest<AuthResponse>('/api/auth/staff/login', {
        method: 'POST',
        useStoredToken: false,
        body: { login, password, twoFactorCode },
      });
      tokenStorage.set(response.token);
      applyBootstrap(response.bootstrap);
      await refreshActiveSessions();
      return response.role;
    } catch (nextError) {
      handleError(nextError);
      throw nextError;
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginPrimaryOwnerViaTelegram() {
    const initData = getTelegramInitData();
    if (!initData) {
      const error = new Error('Откройте Mini App из Telegram, чтобы войти как создатель');
      setError(error.message);
      throw error;
    }
    try {
      setAuthLoading(true);
      setError(null);
      const response = await apiRequest<AuthResponse>('/api/auth/telegram-owner', {
        method: 'POST',
        useStoredToken: false,
        body: { initData },
      });
      tokenStorage.set(response.token);
      applyBootstrap(response.bootstrap);
      await refreshActiveSessions();
      return response.role;
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
        const nextClient = {
          id: created.clientId,
          name: created.clientName,
          phone: created.clientPhone,
          car: created.car || '',
          plate: created.plate || '',
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
  }

  async function deleteBooking(id: string) {
    await apiRequest<{ message: string }>(`/api/bookings/${id}`, { method: 'DELETE' });
    setBookings((current) => current.filter((booking) => booking.id !== id));
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
      if (notification.recipientRole !== role) return notification;
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

  async function addExpense(expense: Omit<Expense, 'id'>) {
    const created = await apiRequest<Expense>('/api/expenses', { method: 'POST', body: expense });
    setExpenses((current) => [created, ...current]);
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

  async function downloadOwnerExport(kind: OwnerExportKind) {
    const fallback = kind === 'pdf' ? 'owner-report.pdf' : 'owner-report.xlsx';
    return apiDownload(`/api/owner/exports/${kind}`, fallback);
  }

  async function sendOwnerExportToTelegram(kind: OwnerExportKind) {
    return apiRequest<OwnerExportDelivery>(`/api/owner/exports/${kind}/telegram`, { method: 'POST' });
  }

  async function sendOwnerSummaryReport(period: OwnerReportPeriod, segment: OwnerReportSegment) {
    const response = await apiRequest<{ message: string }>(`/api/owner/reports/${period}/${segment}/telegram`, { method: 'POST' });
    return response.message;
  }

  async function saveServices(nextServices: Service[]) {
    setServices(await apiRequest<Service[]>('/api/settings/services', { method: 'PUT', body: nextServices }));
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
    setWorkers((current) => current.map((worker) => (worker.id === workerId ? saved : worker)));
    if (staffProfile?.id === workerId) {
      setStaffProfile(saved);
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
    setWorkers(saved);
  }

  async function hireWorker(worker: WorkerCreateInput) {
    const created = await apiRequest<Worker>('/api/workers', { method: 'POST', body: worker });
    setWorkers((current) => [...current, created].sort((left, right) => left.name.localeCompare(right.name, 'ru')));
    return created;
  }

  async function fireWorker(workerId: string) {
    await apiRequest(`/api/workers/${workerId}`, { method: 'DELETE' });
    await refreshBootstrap();
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
    await refreshActiveSessions();
    return response;
  }

  async function revokeSession(sessionId: string) {
    await apiRequest(`/api/auth/sessions/${sessionId}/revoke`, { method: 'POST' });
    if (session?.sessionId === sessionId) {
      logout();
      return;
    }
    await refreshActiveSessions();
  }

  function getTimeSlotsForDate(date: string, options?: { durationMinutes?: number; boxName?: string }) {
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
      : boxes.filter((box) => box.active).map((box) => box.name);
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
        if (booking.status !== 'scheduled' && booking.status !== 'in_progress') return false;
        const bookingStart = timeToMinutes(booking.time);
        if (bookingStart === null) return false;
        return timeRangesOverlap(slotStart, slotEnd, bookingStart, bookingStart + booking.duration);
      }));
    });
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
      penalties,
      workers,
      services,
      boxes,
      schedule,
      settings,
      upcomingDates,
      todayLabel,
      tomorrowLabel,
      getTimeSlotsForDate,
      loginClient,
      loginStaff,
      loginPrimaryOwnerViaTelegram,
      updateClientProfile,
      deleteClient,
      addBooking,
      updateBooking,
      deleteBooking,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      addStockItem,
      updateStockItem,
      writeOffStock,
      addExpense,
      addPenalty,
      revokePenalty,
      revokeAllPenalties,
      createTelegramLinkCode,
      downloadOwnerExport,
      sendOwnerExportToTelegram,
      sendOwnerSummaryReport,
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
      hireWorker,
      fireWorker,
      changePassword,
      requestOwnerDatabaseReset,
      approveOwnerDatabaseReset,
      executeOwnerDatabaseReset,
      refreshActiveSessions,
      revokeSession,
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

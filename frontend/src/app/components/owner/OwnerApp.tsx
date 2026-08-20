import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import {
  Bell, Sun, Moon, Plus, X, Check, TrendingUp, Users, Box,
  Settings, BarChart3, ChevronRight, Download, DollarSign, Package,
  AlertCircle, Home, FileText, ArrowLeft, Building2, Sliders, Shield,
  Globe, Save, Eye, EyeOff, CalendarDays, Calendar, RefreshCw, Phone, Wallet, Edit3, Trash2, ChevronLeft, PiggyBank, Clock, Search, History, ChevronUp, ChevronDown, Archive, ExternalLink
 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { apiBlobUrl, apiRequest } from '../../api';
import { useApp, type AdditionalService, type AdminShiftInspection, type Booking, type BookingStatus, type EmployeeSetting, type Expense, type Income, type OwnerDatabaseResetPreview, type OwnerExportParams, type RegisteredClient, type Role, type ScheduleDay, type Service, type ShiftChecklist, type ContentData, type StockWriteOff, type Worker } from '../../context/AppContext';
import { ContentEditor } from '../admin/ContentEditor';
import { ServiceSearchSelect } from '../shared/ServiceSearchSelect';
import { SourceBadge } from '../shared/SourceBadge';
import { DepositPanel } from './DepositPanel';
import { COMPLAINT_THRESHOLD, getComplaintPenaltyState, isComplaintActive } from '../../utils/complaints';
import { formatDate, getLastNDates, getScheduleDayIndex, parseFlexibleDate } from '../../utils/date';
import {
  isClientCardIncomplete,
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
  type PlateType,
} from '../../utils/validation';
import { useVisualViewport } from '../../utils/useVisualViewport';
import { FIXED_MASTER_EARNED, formatFixedMasterAmount, isFixedMasterService } from '../ui/utils';
import { REFERRAL_SOURCES } from '../../constants/referralSources';

type OwnerPage = 'dashboard' | 'calendar' | 'payroll' | 'salary-detail' | 'stock' | 'reports' | 'settings' | 'piggy-bank' | 'clients';
type SettingsSection = null | 'company' | 'schedule' | 'boxes' | 'services' | 'employees' | 'clients' | 'notifications' | 'integrations' | 'security' | 'finance' | 'content' | 'wallet' | 'reports' | 'bookings-history' | 'archive' | 'deposit' | 'shift';
type OwnerExportKind = 'report' | 'pdf';
type KpiServiceItem = { name: string; revenue: number; count: number };
type KpiModalData =
  | { kind: 'bookings'; title: string; color: string; totalLabel: string; total: number; isMoney?: boolean; bookings: Booking[] }
  | { kind: 'expenses'; title: string; color: string; total: number; expenses: Expense[] }
  | { kind: 'services'; title: string; color: string; services: KpiServiceItem[] }
  | { kind: 'finance'; title: string; color: string; revenue: number; incomes: number; expenses: number; profit: number };

interface SalaryBookingItem {
  id: string; date: string; time: string; service: string; serviceId?: string | null;
  box: string;
  price: number; earned: number; percent: number; resourceGroup: string;
  linkId?: number; overrideEarned?: number | null; payType?: string;
  car?: string; plate?: string;
}
interface SalaryPayoutItem {
  id: string; amount: number; note: string; createdAt: string; createdBy: string;
}
interface SalaryDetailResponse {
  workerId: string; workerName: string; salaryBase: number; salaryPerShift: number;
  defaultPercent: number; active: boolean;
  totalEarned: number; totalPaid: number; balanceToPay: number;
  completedBookingsCount: number; shiftCount: number; shiftDates: string[];
  bookings: SalaryBookingItem[]; payouts: SalaryPayoutItem[];
  entries: PayrollEntry[];
}

interface BookingHistoryWorkerItem {
  workerId: string; workerName: string; percent: number; payType: string; fixedAmount?: number | null;
}
interface BookingHistoryItem {
  id: string; date: string; time: string; service: string; clientName: string;
  car?: string | null; plate?: string | null; box: string; price: number;
  status: string; paymentType: string; paymentSettled?: boolean;
  workers: BookingHistoryWorkerItem[]; createdAt: string;
}
interface BookingTotalsWorkerItem {
  workerId: string; workerName: string; bookingCount: number;
  accruedFromBookings: number; baseSalary: number; shiftPayTotal: number; shiftCount: number;
  bonusTotal: number; adjustmentTotal: number; advanceTotal: number;
  deductionTotal: number; payoutTotal: number;
  totalAccrued: number; totalDeducted: number; balance: number;
}
interface BookingTotalsOwnerItem { ownerId: string; ownerName: string; totalAccrued: number; totalPaid: number; bookingCount: number; }
interface BookingTotalsPiggyItem { resourceGroup: string; amount: number; bookingCount: number; }
interface BookingHistoryTotals {
  workers: BookingTotalsWorkerItem[]; owners: BookingTotalsOwnerItem[]; piggy: BookingTotalsPiggyItem[];
}
interface MoneySplitWorkerItem {
  linkId: number; workerId: string; workerName: string; percent: number;
  payType: string; fixedAmount?: number | null; earned: number; overrideEarned?: number | null;
}
interface MoneySplitOwnerItem { ownerId: string; ownerName: string; amount: number; status: string; shareId?: string; }
interface PiggyTxItem { id: string; amount: number; transactionType: string; purpose: string; resourceGroup: string; date: string; bookingId?: string | null; bookingInfo?: string | null; createdAt?: string; }
interface AdditionalServiceItem { name: string; price: number; priceMode: string; duration: number; isOutsource?: boolean; outsourceAmount?: number; }
interface AsvcPiggyItem { name: string; resourceGroup: string; amount: number; }
interface AsvcWorkerItem {
  linkId: number; workerId: string; workerName: string; percent: number;
  payType: string; fixedAmount?: number | null; earned: number; additionalServiceName: string;
}
interface MoneySplitDetail {
  id: string; clientName: string; clientPhone: string; service: string; serviceId: string;
  date: string; time: string; box: string; price: number; status: string;
  paymentType: string; paymentSettled?: boolean; resourceGroup: string;
  mainPrice: number; additionalServices: AdditionalServiceItem[];
  additionalTotal: number; subtractTotal: number; splitBase: number;
  materialsCost: number; materialsCostAuto: number; materialsCostOverride?: number | null;
  net: number; masterTotal: number; masterTotalAuto: number;
  masterByWorker: Record<string, number>;
  asvcMasterPayTotal: number;
  asvcPiggyDeposits: AsvcPiggyItem[];
  asvcWorkers: AsvcWorkerItem[];
  piggyDeposit: number; piggyDepositAuto: number;
  ownersTotal: number; ownersTotalAuto: number;
  ownerByOwner: Record<string, number>; ownerByOwnerAuto: Record<string, number>;
  masterPayType: string; masterPayValue: number;
  piggyPayType: string; piggyPayValue: number;
  piggyTarget: string; hasCustom: boolean;
  workers: MoneySplitWorkerItem[]; piggyTransactions: PiggyTxItem[];
  ownerShares: MoneySplitOwnerItem[]; canEdit: boolean;
}

interface ArchiveBookingWorkerItem {
  workerId: string; workerName: string; percent: number; payType: string;
  fixedAmount?: number | null; earned: number; additionalServiceName?: string | null;
}
interface ArchiveAdditionalServiceItem { name: string; price: number; priceMode: string; }
interface ArchiveBookingItem {
  id: string; date: string; time: string; service: string; clientName: string;
  clientPhone?: string; clientId?: string | null; car?: string | null; plate?: string | null; box: string;
  price: number; net: number; status: string; paymentType?: string; paymentSettled?: boolean;
  resourceGroup?: string; masterTotal: number; piggyDeposit: number; ownersTotal: number;
  materialsCost: number; workers: ArchiveBookingWorkerItem[];
  asvcWorkers: ArchiveBookingWorkerItem[]; additionalServices: ArchiveAdditionalServiceItem[];
  createdAt: string;
}
interface ArchivePayrollItem {
  workerId: string; workerName: string; bookingCount: number; accruedFromBookings: number;
  baseSalary: number; shiftPayTotal: number; shiftCount: number; bonusTotal: number;
  adjustmentTotal: number; advanceTotal: number; deductionTotal: number; payoutTotal: number;
  totalAccrued: number; totalDeducted: number; balance: number;
}
interface ArchiveOwnerItem { ownerId: string; ownerName: string; totalAccrued: number; totalPaid: number; bookingCount: number; }
interface ArchiveSummary {
  revenue: number; net: number; totalIncome: number; totalExpense: number; profit: number;
  masterTotal: number; piggyDeposit: number; ownersAccrued: number; ownersPaid: number;
  bookingCount: number; incomeCount: number; expenseCount: number; piggyTxCount: number;
}
interface ArchiveResponse {
  dateFrom: string; dateTo: string; summary: ArchiveSummary;
  bookings: ArchiveBookingItem[]; incomes: Income[];
  expenses: Expense[]; piggyTransactions: PiggyTxItem[];
  payroll: ArchivePayrollItem[]; owners: ArchiveOwnerItem[];
}
type ArchiveTab = 'bookings' | 'incomes' | 'expenses' | 'piggy' | 'payroll' | 'owners';
interface ArchiveHighlight {
  target: 'worker' | 'owner' | 'piggy' | 'income' | 'expense';
  workerId?: string; ownerId?: string; txId?: string; incomeId?: string; expenseId?: string;
}

interface OwnerProfitShareItem {
  id: string; bookingId: string; service: string; clientName: string; clientPhone: string;
  date: string; time: string; price: number; amount: number; status: string;
  workerName: string; car: string; plate: string;
}
interface OwnerProfitSummary {
  ownerId: string; ownerName: string;
  totalAccrued: number; totalPaid: number; balanceToPay: number;
  shares: OwnerProfitShareItem[];
}
interface OwnerSalaryData {
  owners: OwnerProfitSummary[];
  totalAccrued: number; totalPaid: number; totalBalanceToPay: number;
}
interface OutsourcePayrollRow {
  name: string; count: number; total: number;
}
interface OutsourcePayrollData {
  name: string; total: number; rows: OutsourcePayrollRow[];
}

interface PiggyBankWashBreakdown {
  selfServiceRevenue: number; selfServiceMaster: number; selfServicePiggy: number;
  classicRevenue: number; classicMaster: number; classicPiggy: number;
  totalRevenue: number; totalMaster: number; totalPiggy: number;
  washNetPiggy: number;
}
interface PiggyBankDetailingBreakdown {
  detailingRevenue: number; detailingMaster: number;
  deposits24Percent: number; materialWithdrawals: number;
  materialRepayments: number; netPiggy: number;
  detailingExpenses: number; detailingIncomes: number;
}
interface PiggyBankData {
  balance: number;
  transactions: PiggyBankTx[];
  wash?: PiggyBankWashBreakdown;
  detailing?: PiggyBankDetailingBreakdown;
  masterDailyOutputs: number;
  washExpenses: number;
  washIncomes: number;
  detailingExpenses: number;
  detailingIncomes: number;
  remainingInPiggyBank: number;
  combinedBalance: number;
}

interface WeeklyArchiveInfo {
  id: number;
  weekStart: string;
  weekEnd: string;
  totalRevenue: number;
  totalIncome: number;
  totalExpense: number;
  bookingCount: number;
  incomeCount: number;
  expenseCount: number;
  piggyBankBalance: number;
  createdAt: Date;
}
interface WalletData {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  bookingCount: number;
  incomes: Income[];
  expenses: Expense[];
  piggyBankBalance: number;
  archives: WeeklyArchiveInfo[];
}

const EXPENSE_CATEGORIES = ['Автомойка', 'Детейлинг', 'Расходные материалы', 'Аренда', 'Коммунальные', 'Зарплаты', 'Оборудование', 'Прочее'];
const STOCK_UNITS = ['л', 'кг', 'шт', 'фл', 'м', 'п.м', 'уп'];
const SERVICE_TYPE_OPTIONS = [
  { value: 'Мойка', label: 'Мойка', resourceGroup: 'wash' },
  { value: 'Детейлинг', label: 'Детейлинг', resourceGroup: 'detailing' },
  { value: 'Аренда бокса', label: 'Аренда бокса', resourceGroup: 'wash' },
] as const;
const OWNER_BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'scheduled', label: 'Запланирована' },
  { value: 'completed', label: 'Прошлая завершённая' },
  { value: 'admin_review', label: 'На уточнении' },
];
function ownerBookingStatusRequiresScheduledSlot(status: BookingStatus) {
  return ['new', 'confirmed', 'in_progress'].includes(status);
}
function employeeRoleLabel(role: 'admin' | 'worker' | 'accountant') {
  if (role === 'admin') return 'Администратор';
  if (role === 'accountant') return 'Бухгалтер';
  return 'Мастер';
}

function ownerServiceResourceGroup(serviceId: string, services: Array<{ id: string; resourceGroup?: string }>) {
  return services.find((service) => service.id === serviceId)?.resourceGroup || 'wash';
}

function ownerDefaultBoxForService(svcId: string, svcs: Array<{ id: string; resourceGroup?: string }>, bxs: Array<{ id: string; name: string; resourceGroup: string; active: boolean }>) {
  const rg = ownerServiceResourceGroup(svcId, svcs);
  const match = bxs.find(b => b.active && b.resourceGroup === rg);
  return match?.name || bxs.find(b => b.active)?.name || '';
}

function ownerBookingBoxes(
  _serviceId: string,
  _services: Array<{ id: string; resourceGroup?: string }>,
  boxes: Array<{ id: string; name: string; resourceGroup: string; active: boolean; pricePerHour: number; description: string }>,
) {
  return boxes.filter((box) => box.active);
}

function ownerLocationLabel(_serviceId: string, _services: Array<{ id: string; resourceGroup?: string }>) {
  return 'Помещение';
}

function parseOwnerBookingMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const OWNER_CALENDAR_WEEKDAYS = ['Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const OWNER_CALENDAR_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const OWNER_CALENDAR_DEFAULT_OPEN = 9 * 60;
const OWNER_CALENDAR_DEFAULT_CLOSE = 19 * 60;

function ownerScheduleTimeToMinutes(value: string): number | null {
  return parseOwnerBookingMinutes(value);
}

function ownerMonthTitle(monthDate: Date): string {
  return `${OWNER_CALENDAR_MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
}

function ownerBuildMonthCells(monthDate: Date): Array<{ date: Date | null; dateLabel: string }> {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; dateLabel: string }> = [];
  for (let index = 0; index < offset; index += 1) {
    cells.push({ date: null, dateLabel: '' });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, dateLabel: formatDate(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dateLabel: '' });
  }
  return cells;
}

function ownerCalendarDayHours(schedule: ScheduleDay[], dateLabel: string): { open: number; close: number; active: boolean } {
  const parsedDate = parseFlexibleDate(dateLabel);
  if (!parsedDate) {
    return { open: OWNER_CALENDAR_DEFAULT_OPEN, close: OWNER_CALENDAR_DEFAULT_CLOSE, active: true };
  }
  const daySchedule = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
  if (!daySchedule || !daySchedule.active) {
    return { open: OWNER_CALENDAR_DEFAULT_OPEN, close: OWNER_CALENDAR_DEFAULT_CLOSE, active: false };
  }
  const open = ownerScheduleTimeToMinutes(daySchedule.open) ?? OWNER_CALENDAR_DEFAULT_OPEN;
  const close = ownerScheduleTimeToMinutes(daySchedule.close) ?? OWNER_CALENDAR_DEFAULT_CLOSE;
  return { open, close: Math.max(open + 60, close), active: true };
}

const OWNER_CALENDAR_LOAD_COLORS = {
  empty: '#22C55E',
  medium: '#EAB308',
  heavy: '#EF4444',
} as const;

function ownerCalendarLoadTone(count: number, maxCount: number): keyof typeof OWNER_CALENDAR_LOAD_COLORS {
  if (count <= 0) return 'empty';
  const ratio = count / Math.max(1, maxCount);
  if (ratio >= 0.55) return 'heavy';
  return 'medium';
}

type OwnerCalendarHourSlot = {
  hourLabel: string;
  bookings: Booking[];
};

function ownerGroupBookingsByHour(
  bookings: Booking[],
  openMinutes: number,
  closeMinutes: number,
): OwnerCalendarHourSlot[] {
  const timed = bookings.filter((booking) => parseOwnerBookingMinutes(booking.time) !== null);
  const slots: OwnerCalendarHourSlot[] = [];
  for (let slotStart = openMinutes; slotStart < closeMinutes; slotStart += 60) {
    const hourLabel = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:00`;
    const slotEnd = slotStart + 60;
    const slotBookings = timed
      .filter((booking) => {
        const start = parseOwnerBookingMinutes(booking.time);
        if (start === null) return false;
        return start >= slotStart && start < slotEnd;
      })
      .sort((left, right) => left.time.localeCompare(right.time));
    if (slotBookings.length > 0) {
      slots.push({ hourLabel, bookings: slotBookings });
    }
  }
  return slots;
}

function ownerOpenBookingDetail(
  booking: Booking,
  setSelectedBooking: (booking: Booking) => void,
  setShowBookingDetail: (value: boolean) => void,
) {
  setSelectedBooking(booking);
  setShowBookingDetail(true);
}

function ownerBookingBlocksBox(booking: Booking, date: string, time: string, duration: number, boxName: string) {
  if (!['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status)) return false;
  if (booking.date !== date || booking.box !== boxName) return false;
  const nextStart = parseOwnerBookingMinutes(time);
  const existingStart = parseOwnerBookingMinutes(booking.time);
  if (nextStart === null || existingStart === null) return false;
  const nextEnd = nextStart + Math.max(1, duration);
  const existingEnd = existingStart + Math.max(1, booking.duration);
  return nextStart < existingEnd && nextEnd > existingStart;
}

function ownerPickDefaultBookingBox(
  serviceId: string,
  services: Array<{ id: string; resourceGroup?: string }>,
  boxes: Array<{ id: string; name: string; resourceGroup: string; active: boolean }>,
  bookings: Booking[],
  date: string,
  time: string,
  duration: number,
) {
  const resourceGroup = ownerServiceResourceGroup(serviceId, services);
  const preferred = boxes.filter((box) => box.active && box.resourceGroup === resourceGroup);
  const fallback = boxes.filter((box) => box.active && !preferred.some((preferredBox) => preferredBox.id === box.id));
  const candidates = [...preferred, ...fallback];
  if (!date.trim() || !time.trim()) return candidates[0]?.name || '';
  return candidates.find((box) => !bookings.some((booking) => ownerBookingBlocksBox(booking, date, time, duration, box.name)))?.name || candidates[0]?.name || '';
}

function serviceResourceGroupForCategory(category: string) {
  return SERVICE_TYPE_OPTIONS.find((option) => option.value === category)?.resourceGroup || 'wash';
}

function numberInputValue(value: number) {
  return value === 0 ? '' : String(value);
}

type MoneyServiceDraft = {
  masterPayType?: string; masterPayValue?: number;
  piggyPayType?: string; piggyPayValue?: number;
  ownerPayType?: string; ownerPayValue?: number;
  ownerSplitEnabled?: boolean;
  materials?: Array<{ stockItemId: string; name: string; qty: number; unit: string }>;
  splitOrder?: string[];
  piggyTarget?: string;
};

const ORDER_STEPS = [
  { id: 'materials', label: 'Материалы' },
  { id: 'master', label: 'Мастера' },
  { id: 'piggy', label: 'Копилка' },
  { id: 'owners', label: 'Владельцы' },
];

function serviceMoneySummary(service: MoneyServiceDraft) {
  const piggyTargetLabel = service.piggyTarget === 'wash' ? ' → мойка'
    : service.piggyTarget === 'detailing' ? ' → детейлинг'
      : service.piggyTarget === 'general' ? ' → общая'
        : '';
  const master = service.masterPayType === 'fixed'
    ? `мастер: фикс ${service.masterPayValue ?? 0} ₽`
    : service.masterPayType === 'percent'
      ? `мастер: ${service.masterPayValue ?? 0}%`
      : 'мастер: % из профиля';
  const piggy = service.piggyPayType === 'fixed'
    ? `копилка: ${service.piggyPayValue ?? 0} ₽${piggyTargetLabel}`
    : service.piggyPayType === 'percent'
      ? `копилка: ${service.piggyPayValue ?? 0}%${piggyTargetLabel}`
      : service.piggyPayType === 'none'
        ? 'копилка: нет'
        : `копилка: 24%${piggyTargetLabel}`;
  const owners = service.ownerSplitEnabled === false
    ? 'владельцы: нет'
    : service.ownerPayType === 'percent'
      ? `владельцы: ${service.ownerPayValue ?? 0}% остатка`
      : 'владельцы: остаток';
  return [master, piggy, owners];
}

function previewServiceSplit(
  service: MoneyServiceDraft & { materialConsumption?: number | null },
  samplePrice: number,
  samplePercent: number,
) {
  const materials = Math.max(0, service.materialConsumption ?? 0);
  const net = Math.max(0, samplePrice - materials);
  const order = (service.splitOrder ?? []).filter(s => ['materials', 'master', 'piggy', 'owners'].includes(s));
  const pipeline = order.length > 0 && order.join(',') !== 'materials,master,piggy,owners';
  const piggyType = service.piggyPayType || '';
  let master = 0;
  let masterLabel: string;
  let piggy = 0;
  let piggyLabel: string;
  let owners = 0;
  let ownersLabel: string;
  const computeMaster = (base: number) => {
    if (service.masterPayType === 'fixed') {
      return { total: service.masterPayValue ?? 0, label: 'фикс' };
    }
    if (service.masterPayType === 'percent') {
      return { total: Math.round(base * (service.masterPayValue ?? 0) / 100), label: `${service.masterPayValue ?? 0}%` };
    }
    return { total: Math.round(base * samplePercent / 100), label: `${samplePercent}% (из профиля)` };
  };
  const computePiggy = (base: number) => {
    if (piggyType === 'fixed') return { total: service.piggyPayValue ?? 0, label: 'фикс' };
    if (piggyType === 'percent') return { total: Math.round(base * (service.piggyPayValue ?? 0) / 100), label: `${service.piggyPayValue ?? 0}%` };
    if (piggyType === 'none') return { total: 0, label: 'нет' };
    return { total: Math.round(base * 24 / 100), label: '24%' };
  };
  if (!pipeline) {
    const m = computeMaster(net);
    master = m.total; masterLabel = m.label;
    const p = computePiggy(net);
    piggy = p.total; piggyLabel = p.label;
    const afterMasterPiggy = Math.max(0, net - master - piggy);
    if (service.ownerSplitEnabled !== false && afterMasterPiggy > 0) {
      if (service.ownerPayType === 'percent') {
        owners = Math.round(afterMasterPiggy * (service.ownerPayValue ?? 0) / 100);
        ownersLabel = `${service.ownerPayValue ?? 0}% остатка`;
      } else {
        owners = afterMasterPiggy;
        ownersLabel = 'остаток';
      }
    } else {
      owners = 0;
      ownersLabel = service.ownerSplitEnabled === false ? 'выключено' : '0';
    }
  } else {
    let pool = samplePrice;
    order.forEach((step, index) => {
      if (step === 'materials') {
        pool = Math.max(0, pool - materials);
      } else if (step === 'master') {
        const m = computeMaster(pool);
        master = m.total; masterLabel = m.label;
        pool = Math.max(0, pool - master);
      } else if (step === 'piggy') {
        const p = computePiggy(pool);
        piggy = Math.min(p.total, pool); piggyLabel = p.label;
        pool = Math.max(0, pool - piggy);
      } else if (step === 'owners') {
        const isLast = index === order.length - 1;
        const claimed = service.ownerPayType === 'percent'
          ? Math.round(pool * (service.ownerPayValue ?? 0) / 100)
          : isLast ? pool : Math.round(pool * 50 / 100);
        if (service.ownerSplitEnabled !== false && claimed > 0) {
          owners = Math.min(claimed, pool);
          ownersLabel = service.ownerPayType === 'percent'
            ? `${service.ownerPayValue ?? 0}% остатка`
            : isLast ? 'остаток' : '50% остатка';
        } else {
          owners = 0;
          ownersLabel = service.ownerSplitEnabled === false ? 'выключено' : '0';
        }
        pool = Math.max(0, pool - owners);
      }
    });
  }
  return { materials, net, master, masterLabel, piggy, piggyLabel, owners, ownersLabel };
}

function ownerPaymentLabel(paymentType: 'cash' | 'transfer' | 'invoice', paymentSettled: boolean) {
  if (!paymentSettled) return 'Не оплачено';
  if (paymentType === 'transfer') return 'Перевод';
  if (paymentType === 'invoice') return 'По счёту';
  return 'Наличные';
}

function normalizeOwnerPhoneSearchValue(value: string) {
  return value.replace(/\D/g, '');
}

type OwnerClientSearchMode = 'phone' | 'name' | 'plate';

function numberFromInput(value: string) {
  return value === '' ? 0 : Number(value);
}

function toISODate(value: string) {
  const parsed = parseFlexibleDate(value);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = String((i % 2) * 30).padStart(2, '0');
  return `${h}:${m}`;
});

type PercentValue = number | '';


export function OwnerApp() {
  const {
    session,
    isDark,
    toggleTheme,
    bookings,
    schedule,
    clients,
    expenses,
    addExpense,
    incomes,
    addIncome,
    updateExpense,
    updateIncome,
    stockItems,    addStockItem,
    writeOffStock,
    getWriteOffHistory,
    deleteStockItem,
    stockCategories,
    addStockCategory,
    updateStockCategory,
    deleteStockCategory,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    addBooking,
    updateBooking,
    deleteBooking,
    addBookingService,
    addBookingAdditionalService,
    updateBookingAdditionalService,
    removeBookingAdditionalService,
    addClient,
    deleteClient,
    addNotification,    penalties,
    addPenalty,
    revokePenalty,
    revokeAllPenalties,
    workers,
    services: liveServices,
    boxes: liveBoxes,
    settings,
    saveOwnerCompany,
    saveSchedule,
    saveBoxes,
    saveServices,
    saveWorkerSettings,
    createPayrollEntry,
    saveOwnerNotificationSettings,
    saveOwnerIntegrations,
    saveOwnerSecurity,
    saveContent,
    content,
    updateClientCard,
    changePassword,
    requestOwnerDatabaseReset,
    approveOwnerDatabaseReset,
    executeOwnerDatabaseReset,
    hireWorker,
    fireWorker,
    resetWorkerPassword,
    staffProfile,
    switchRole,
    activeSessions,
    refreshActiveSessions,
    revokeSession,
    downloadOwnerExport,
      sendOwnerExportToTelegram,
      sendOwnerSummaryReport,
      dispatchOwnerReminders,
      remindAdminAboutInactiveClients,
      listAdminShiftInspections,
      listShiftChecklists,
      openShiftForMasters,
      todayLabel,
      tomorrowLabel,
      upcomingDates,
  } = useApp();
  const isAccountant = session?.role === 'accountant';
  const modalMaxHeight = useVisualViewport();
  const financeRoleTitle = isAccountant ? 'Бухгалтер' : 'Владелец';
  const financeNotificationRole = isAccountant ? 'accountant' : 'owner';

  const [page, setPage] = useState<OwnerPage>('dashboard');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [showStatusList, setShowStatusList] = useState<BookingStatus | null>(null);
  const [kpiModal, setKpiModal] = useState<KpiModalData | null>(null);
  const [expenseAdded, setExpenseAdded] = useState(false);
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [writeOffHistory, setWriteOffHistory] = useState<StockWriteOff[]>([]);
  const [showWriteOffHistory, setShowWriteOffHistory] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ title: string; subtitle: string } | null>(null);
  const [exportingKind, setExportingKind] = useState<OwnerExportKind | null>(null);
  const [sendingSummaryReport, setSendingSummaryReport] = useState<string | null>(null);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetCreatorCode, setResetCreatorCode] = useState('');
  const [resetConfirmationPhrase, setResetConfirmationPhrase] = useState('');
  const [resetRequestId, setResetRequestId] = useState<string | null>(null);
  const [resetPreview, setResetPreview] = useState<OwnerDatabaseResetPreview | null>(null);
  const [resetWarnings, setResetWarnings] = useState<string[]>([]);
  const [resetRequiredPhrase, setResetRequiredPhrase] = useState('');
  const [resetCodeExpiresAt, setResetCodeExpiresAt] = useState<Date | null>(null);
  const [resetFinalizeAfter, setResetFinalizeAfter] = useState<Date | null>(null);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetStage, setResetStage] = useState<'idle' | 'code' | 'armed'>('idle');
  const [resetLoadingStep, setResetLoadingStep] = useState<'start' | 'approve' | 'execute' | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  // Piggy bank state
  interface PiggyBankTx {
    id: string; bookingId: string | null; amount: number; transactionType: string;
    purpose: string; materialName: string | null; materialCost: number | null;
    date: string; resourceGroup: string; createdAt: string; bookingInfo: string | null;
    bookingClientName?: string | null; bookingService?: string | null;
    bookingDate?: string | null; bookingTime?: string | null;
    bookingCar?: string | null; bookingPlate?: string | null;
    bookingPrice?: number | null; bookingStatus?: string | null;
  }
  const [piggyBankBalance, setPiggyBankBalance] = useState(0);
  const [piggyBankTxs, setPiggyBankTxs] = useState<PiggyBankTx[]>([]);
  const [piggyBankLoading, setPiggyBankLoading] = useState(false);
  const [piggyBank, setPiggyBank] = useState(null);
  const [piggyTxExpanded, setPiggyTxExpanded] = useState(false);
  const [piggyTab, setPiggyTab] = useState<'all' | 'wash' | 'detailing'>('all');
  const [piggyDateFrom, setPiggyDateFrom] = useState('');
  const [piggyDateTo, setPiggyDateTo] = useState('');
  const [walletDateFrom, setWalletDateFrom] = useState('');
  const [walletDateTo, setWalletDateTo] = useState('');
  const [showPiggyWithdraw, setShowPiggyWithdraw] = useState(false);
  const [showPiggyAdjust, setShowPiggyAdjust] = useState(false);
  const [piggyAdjustResourceGroup, setPiggyAdjustResourceGroup] = useState<'wash' | 'detailing'>('wash');
  const [piggyAdjustCurrentBalance, setPiggyAdjustCurrentBalance] = useState(0);
  const [piggyAdjustForm, setPiggyAdjustForm] = useState({ newBalance: '', purpose: '', date: todayLabel });
  const [showArchivesModal, setShowArchivesModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<WeeklyArchiveInfo | null>(null);

  // Report date range state (defaults to current week)
  const __nowRpt = new Date();
  const __dowRpt = __nowRpt.getDay();
  const __monRpt = new Date(__nowRpt); __monRpt.setDate(__nowRpt.getDate() - (__dowRpt === 0 ? 6 : __dowRpt - 1));
  const __sunRpt = new Date(__monRpt); __sunRpt.setDate(__monRpt.getDate() + 6);
  const [reportDateFrom, setReportDateFrom] = useState(formatDate(__monRpt));
  const [reportDateTo, setReportDateTo] = useState(formatDate(__sunRpt));

  // Export wizard state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalKind, setExportModalKind] = useState<'report' | 'pdf'>('report');
  const [exportModalStep, setExportModalStep] = useState<'segment' | 'period' | 'date'>('segment');
  const [exportModalSegment, setExportModalSegment] = useState<'all' | 'wash' | 'detailing'>('all');
  const [exportModalPeriod, setExportModalPeriod] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [exportModalDateFrom, setExportModalDateFrom] = useState('');
  const [exportModalDateTo, setExportModalDateTo] = useState('');

  const [piggyWithdrawForm, setPiggyWithdrawForm] = useState({ bookingId: '', materialName: '', materialCost: '', purpose: '', date: todayLabel });

  // Wallet state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: EXPENSE_CATEGORIES[0], resourceGroup: '' as '' | 'wash' | 'detailing', note: '', date: todayLabel });
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: '', note: '', date: todayLabel, resourceGroup: '' as '' | 'wash' | 'detailing' });
  const parentCategories = stockCategories.filter(c => !c.parentId);
  const [stockForm, setStockForm] = useState({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit' as 'unit' | 'total', category: parentCategories[0]?.name || 'Химия', categoryId: '' });
  const [bookingForm, setBookingForm] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    car: '',
    plate: '',
    plateType: 'russian' as PlateType,
    service: liveServices[0]?.id || '',
    date: todayLabel,
    time: '10:00',
    box: liveBoxes[0]?.name || 'Бокс 1',
    status: 'admin_review' as BookingStatus,
    paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
    paymentSettled: false,
    price: 0,
    duration: 30,
    referralSource: '',
  });
  const [notifyBookingWorkers, setNotifyBookingWorkers] = useState(true);
  const [bookingWorkers, setBookingWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [createClientSaving, setCreateClientSaving] = useState(false);
  const [createClientErrors, setCreateClientErrors] = useState<{ name?: string; phone?: string; car?: string; plate?: string; general?: string }>({});
  const [createClientForm, setCreateClientForm] = useState({ name: '', phone: '', car: '', plate: '', plateType: 'russian' as PlateType, notes: '', referralSource: '' });
  const [selectedSalaryWorkerId, setSelectedSalaryWorkerId] = useState<string | null>(null);
  const [salaryWorkerSearch, setSalaryWorkerSearch] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [salarySegment, setSalarySegment] = useState<'all' | 'wash' | 'detailing'>('all');
  const [salaryDateFrom, setSalaryDateFrom] = useState('');
  const [salaryDateTo, setSalaryDateTo] = useState('');
  const [salaryDetail, setSalaryDetail] = useState<SalaryDetailResponse | null>(null);
  const [salaryPayAmount, setSalaryPayAmount] = useState('');
  const [salaryPayNote, setSalaryPayNote] = useState('');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [editingOverrideLinkId, setEditingOverrideLinkId] = useState<number | null>(null);
  const [editingOverrideValue, setEditingOverrideValue] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [fineNote, setFineNote] = useState('');
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffNote, setWriteOffNote] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [payrollPeriod, setPayrollPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [payrollDateFrom, setPayrollDateFrom] = useState('');
  const [payrollDateTo, setPayrollDateTo] = useState('');
  const [outsourcePayroll, setOutsourcePayroll] = useState<OutsourcePayrollData | null>(null);
  const [payrollData, setPayrollData] = useState<Worker[] | null>(null);
  const [ownerSalaryData, setOwnerSalaryData] = useState<OwnerSalaryData | null>(null);
  const [ownerSalaryPeriod, setOwnerSalaryPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [ownerSalaryDateFrom, setOwnerSalaryDateFrom] = useState('');
  const [ownerSalaryDateTo, setOwnerSalaryDateTo] = useState('');
  const [ownerSalaryLoading, setOwnerSalaryLoading] = useState(false);
  const [ownerPayTarget, setOwnerPayTarget] = useState<string | null>(null);
  const [ownerPayAmount, setOwnerPayAmount] = useState('');
  const [ownerPayNote, setOwnerPayNote] = useState('');
  const [selectedShareDetail, setSelectedShareDetail] = useState<OwnerProfitShareItem | null>(null);

  // Reset ALL booking-editing states on any page change so salary detail
  // always opens in view mode, no matter how the user navigated away.
  // Also close the booking detail sheet and its edit modes: they are rendered
  // globally (outside page blocks) and used to stay open across navigation,
  // looking like an auto-opened order edit in the salary menu (especially for 11.08).
  useEffect(() => {
    setEditingOverrideLinkId(null);
    setEditingOverrideValue('');
    setShowBookingDetail(false);
    setOwnerBookingEditMode(null);
    setOwnerBookingEditError(null);
    setShowOwnerAddService(false);
    setSelectedBooking(null);
    setOwnerEditAsvcId(null);
  }, [page]);

  // Bookings history state
  const [historyItems, setHistoryItems] = useState<BookingHistoryItem[]>([]);
  const [historyTotals, setHistoryTotals] = useState<BookingHistoryTotals | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<'day' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [selectedHistoryBookingId, setSelectedHistoryBookingId] = useState<string | null>(null);
  const [splitDetail, setSplitDetail] = useState<MoneySplitDetail | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitWorkersDraft, setSplitWorkersDraft] = useState<MoneySplitWorkerItem[]>([]);
  const [splitMaterialsDraft, setSplitMaterialsDraft] = useState('');
  const [splitPiggyDraft, setSplitPiggyDraft] = useState('');
  const [splitOwnersDraft, setSplitOwnersDraft] = useState<MoneySplitOwnerItem[]>([]);

  // Archive state
  const [archiveData, setArchiveData] = useState<ArchiveResponse | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivePeriod, setArchivePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [archiveDateFrom, setArchiveDateFrom] = useState('');
  const [archiveDateTo, setArchiveDateTo] = useState('');
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>('bookings');
  const [archiveCalendarOpen, setArchiveCalendarOpen] = useState(false);
  const [archiveCalendarStep, setArchiveCalendarStep] = useState<'year' | 'month' | 'week'>('year');
  const [archiveCalendarYear, setArchiveCalendarYear] = useState(() => new Date().getFullYear());
  const [archiveCalendarMonth, setArchiveCalendarMonth] = useState(() => new Date().getMonth());
  const [archiveHighlight, setArchiveHighlight] = useState<ArchiveHighlight | null>(null);

  // Settings state
  const [company, setCompany] = useState(settings.ownerCompany);
  const [boxes, setBoxes] = useState(liveBoxes);
  const [services, setServicesState] = useState(liveServices);
  const [scheduleState, setScheduleState] = useState(schedule);
  const [employeeSettings, setEmployeeSettings] = useState<EmployeeSetting[]>(
    workers.map(worker => ({
      id: worker.id,
      role: worker.role === 'admin' || worker.role === 'accountant' ? worker.role : 'worker',
      name: worker.name,
      percent: worker.defaultPercent,
      salaryBase: worker.salaryBase,
      salaryPerShift: worker.salaryPerShift || 0,
      active: worker.active,
      telegramChatId: worker.telegramChatId,
    })),
  );
  const [notifSettings, setNotifSettings] = useState(settings.ownerNotificationSettings);
  const [integrations, setIntegrations] = useState(settings.ownerIntegrations);
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);
  const [googleConnectError, setGoogleConnectError] = useState<string | null>(null);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSyncResult, setGoogleSyncResult] = useState<{ at?: string | null; created?: number; updated?: number; cancelled?: number; skipped?: boolean; error?: string | null } | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);
  const [googleSetupOpen, setGoogleSetupOpen] = useState(false);
  const [googleSetupStatus, setGoogleSetupStatus] = useState<{ configured: boolean; source: 'env' | 'db' | null; redirectUri: string; hasDbCredentials: boolean } | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleSavingKeys, setGoogleSavingKeys] = useState(false);
  const [googleCopiedUri, setGoogleCopiedUri] = useState(false);
  const [googleJsonFile, setGoogleJsonFile] = useState<string | null>(null);
  const [googleJsonError, setGoogleJsonError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [password, setPassword] = useState({ current: '', new_: '', confirm: '' });
  const [twoFactor, setTwoFactor] = useState(settings.ownerSecurity.twoFactor);
  const [penaltyForm, setPenaltyForm] = useState({ workerId: workers[0]?.id || '', title: '', reason: '' });
  const [showComplaintsWorkerId, setShowComplaintsWorkerId] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    role: 'worker' as 'admin' | 'worker' | 'accountant',
    name: '',
    login: '',
    password: '',
    percent: 0 as PercentValue,
    salaryBase: 0,
    phone: '',
    email: '',
    telegramChatId: '',
  });
  const [employeeActionLoading, setEmployeeActionLoading] = useState<null | { type: 'hire' | 'fire' | 'reset-password'; workerId?: string }>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<EmployeeSetting | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayLabel);
  const [ownerCalendarMonth, setOwnerCalendarMonth] = useState(() => {
    const today = parseFlexibleDate(todayLabel) || new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [ownerCalendarView, setOwnerCalendarView] = useState<'month' | 'day'>('month');
  const [clientSearch, setClientSearch] = useState('');
  const [settingsClientId, setSettingsClientId] = useState<string | null>(null);
  const [settingsClientSearchMode, setSettingsClientSearchMode] = useState<OwnerClientSearchMode>('phone');
  const [settingsClientSearchQuery, setSettingsClientSearchQuery] = useState('');
  const [servicesSearchQuery, setServicesSearchQuery] = useState('');
  const [showServiceSettings, setShowServiceSettings] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceEditDraft, setServiceEditDraft] = useState<{ id: string; name: string; category: string; price: number; duration: number; desc: string; sourceBookingId: number } | null>(null);
  const [serviceEditSearchQuery, setServiceEditSearchQuery] = useState('');
  const [showServiceMaterialPicker, setShowServiceMaterialPicker] = useState(false);
  const [serviceMaterialPickerCategory, setServiceMaterialPickerCategory] = useState<string | null>(null);
  const [serviceSettingsSaving, setServiceSettingsSaving] = useState(false);
  const [editingSettingsClientCard, setEditingSettingsClientCard] = useState(false);
  const [clientCardDrafts, setClientCardDrafts] = useState<Record<string, { name: string; phone: string; car: string; plate: string; plateType: string; notes: string; debtBalance: string; adminRating: number; adminNote: string; referralSource: string }>>({});
  const [savingClientId, setSavingClientId] = useState<string | null>(null);
  const [clientHistoryServiceFilter, setClientHistoryServiceFilter] = useState<string>('');
  const [newVehicleCar, setNewVehicleCar] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [draftVehicles, setDraftVehicles] = useState<Record<string, Array<{ car: string; plate: string; plateType?: string; isMain?: boolean }>>>({});
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingInactiveReminder, setSendingInactiveReminder] = useState(false);
  const [shiftChecklists, setShiftChecklists] = useState<ShiftChecklist[]>([]);
  const [adminShiftInspections, setAdminShiftInspections] = useState<AdminShiftInspection[]>([]);
  const [adminShiftPhotoUrls, setAdminShiftPhotoUrls] = useState<Record<string, string>>({});
  const adminShiftPhotoUrlsRef = useRef<Record<string, string>>({});
  const [shiftOpenMasterIds, setShiftOpenMasterIds] = useState<string[]>([]);
  const [shiftOpenNote, setShiftOpenNote] = useState('');
  const [shiftOpenSubmitting, setShiftOpenSubmitting] = useState(false);
  const [shiftOpenError, setShiftOpenError] = useState<string | null>(null);
  const [shiftOpenSuccess, setShiftOpenSuccess] = useState(false);

  // Quick booking modal state (task 9.1)
  const [showOwnerNewBooking, setShowOwnerNewBooking] = useState(false);
  const [showOwnerClientSearch, setShowOwnerClientSearch] = useState(false);
  const [ownerNewBookingForm, setOwnerNewBookingForm] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    service: '',
    serviceId: '',
    date: '',
    time: '',
    box: '',
    price: 0,
    duration: 30,
    car: '',
    plate: '',
    plateType: 'russian' as PlateType,
    notes: '',
    status: 'admin_review' as BookingStatus,
    paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
    paymentSettled: false,
      isOutsource: false,
      outsourceAmount: 0,
      referralSource: '',
    });
  const [ownerNewBookingWorkers, setOwnerNewBookingWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [ownerNewBookingMaterials, setOwnerNewBookingMaterials] = useState<{ stockItemId?: string; name: string; qty: number | string; unit: string; unitPrice: number }[]>([]);
  const [showOwnerMaterialPicker, setShowOwnerMaterialPicker] = useState(false);
  const [ownerMaterialPickerCategory, setOwnerMaterialPickerCategory] = useState<string | null>(null);
  const [ownerNewBookingError, setOwnerNewBookingError] = useState<string | null>(null);
  const [ownerNewBookingSaving, setOwnerNewBookingSaving] = useState(false);
  const [ownerNewBookingErrors, setOwnerNewBookingErrors] = useState<{ clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string }>({});
  const [ownerNewBookingSaveSuccess, setOwnerNewBookingSaveSuccess] = useState<'notify' | 'silent' | null>(null);

  // Owner booking detail edit state
  const [ownerBookingEditMode, setOwnerBookingEditMode] = useState<null | 'status' | 'price' | 'workers' | 'datetime' | 'full'>(null);
  const [ownerBookingEditStatus, setOwnerBookingEditStatus] = useState<BookingStatus>('confirmed');
  const [ownerBookingEditPrice, setOwnerBookingEditPrice] = useState('');
  const [ownerBookingEditDate, setOwnerBookingEditDate] = useState('');
  const [ownerBookingEditTime, setOwnerBookingEditTime] = useState('');
  const [ownerBookingEditWorkers, setOwnerBookingEditWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [ownerBookingEditSaving, setOwnerBookingEditSaving] = useState(false);
  const [ownerBookingEditError, setOwnerBookingEditError] = useState<string | null>(null);
  const [ownerBookingEditFull, setOwnerBookingEditFull] = useState({
    status: 'confirmed' as BookingStatus,
    date: '',
    time: '',
    box: '',
    notes: '',
    car: '',
    plate: '',
    plateType: 'russian' as PlateType,
    clientName: '',
    clientPhone: '',
    paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
    paymentSettled: false,
    serviceId: '',
    price: 0,
    duration: 30,
  });

  // Add additional service state
  const [showOwnerAddService, setShowOwnerAddService] = useState(false);
  const [ownerAddServiceDraft, setOwnerAddServiceDraft] = useState({ serviceId: '', price: 0, duration: 30, priceMode: 'add' as 'add' | 'subtract', isOutsource: false, outsourceAmount: 0 });
  const [ownerAddServiceWorkers, setOwnerAddServiceWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [ownerAddServiceSaving, setOwnerAddServiceSaving] = useState(false);
  const [ownerAddServiceError, setOwnerAddServiceError] = useState<string | null>(null);

  // Edit additional service state
  const [ownerEditAsvcId, setOwnerEditAsvcId] = useState<string | null>(null);
  const [ownerEditAsvcDraft, setOwnerEditAsvcDraft] = useState({ price: 0, duration: 30, priceMode: 'add' as 'add' | 'subtract', isOutsource: false, outsourceAmount: 0 });
  const [ownerEditAsvcWorkers, setOwnerEditAsvcWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [ownerEditAsvcSaving, setOwnerEditAsvcSaving] = useState(false);
  const [ownerEditAsvcError, setOwnerEditAsvcError] = useState<string | null>(null);

  // Edit expense state (tasks 5.1–5.3)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ title: '', amount: '', category: '', date: '', note: '', resourceGroup: '' as '' | 'wash' | 'detailing' });

  // Edit income state (tasks 6.1–6.3)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editIncomeForm, setEditIncomeForm] = useState({ amount: '', source: '', note: '', date: '', resourceGroup: '' as '' | 'wash' | 'detailing' });
  const [editFinanceLoading, setEditFinanceLoading] = useState(false);
  const [editFinanceError, setEditFinanceError] = useState<string | null>(null);

  const clearOwnerResetFlow = () => {
    setResetPassword('');
    setResetCreatorCode('');
    setResetConfirmationPhrase('');
    setResetRequestId(null);
    setResetPreview(null);
    setResetWarnings([]);
    setResetRequiredPhrase('');
    setResetCodeExpiresAt(null);
    setResetFinalizeAfter(null);
    setResetCountdown(0);
    setResetStage('idle');
    setResetLoadingStep(null);
    setResetError(null);
    setResetInfo(null);
  };

  useEffect(() => setCompany(settings.ownerCompany), [settings.ownerCompany]);
  useEffect(() => setBoxes(liveBoxes), [liveBoxes]);
  useEffect(() => setServicesState(liveServices), [liveServices]);
  useEffect(() => setScheduleState(schedule), [schedule]);
  useEffect(() => {
    if (!bookingForm.service) return;
    const nextBoxes = ownerBookingBoxes(bookingForm.service, liveServices, liveBoxes);
    setBookingForm((current) => ({
      ...current,
      box: nextBoxes.find((box) => box.name === current.box)?.name || nextBoxes[0]?.name || current.box,
    }));
  }, [bookingForm.service, liveBoxes, liveServices]);

  useEffect(() => {
    setEmployeeSettings(
      workers.map(worker => ({
        id: worker.id,
        role: worker.role === 'admin' || worker.role === 'accountant' ? worker.role : 'worker',
        name: worker.name,
        percent: worker.defaultPercent,
        salaryBase: worker.salaryBase,
        salaryPerShift: worker.salaryPerShift || 0,
        active: worker.active,
        telegramChatId: worker.telegramChatId,
      })),
    );
    setPenaltyForm(current => ({
      ...current,
      workerId: workers.some((worker) => worker.id === current.workerId) ? current.workerId : workers[0]?.id || '',
    }));
  }, [workers]);
  useEffect(() => {
    if (!selectedSalaryWorkerId) { setSalaryDetail(null); setSalaryError(null); return; }
    if (salaryPeriod === 'custom' && (!salaryDateFrom || !salaryDateTo)) {
      setSalaryDetail(null);
      setSalaryLoading(false);
      return;
    }
    setSalaryLoading(true);
    setSalaryError(null);
    // Close any open override-earned editor whenever salary data is (re)loaded,
    // so the detail view never stays in edit mode after period/segment changes.
    setEditingOverrideLinkId(null);
    setEditingOverrideValue('');
    const params = new URLSearchParams({ period: salaryPeriod, segment: salarySegment });
    if (salaryPeriod === 'custom') {
      params.set('date_from', salaryDateFrom);
      params.set('date_to', salaryDateTo);
    }
    apiRequest<SalaryDetailResponse>(`/api/owner/workers/${selectedSalaryWorkerId}/salary-detail?${params.toString()}`)
      .then(setSalaryDetail)
      .catch(e => { console.error('salary-detail error:', e); setSalaryError(e?.message || 'Ошибка загрузки данных'); setSalaryDetail(null); })
      .finally(() => setSalaryLoading(false));
  }, [selectedSalaryWorkerId, salaryPeriod, salarySegment, salaryDateFrom, salaryDateTo]);
  useEffect(() => setNotifSettings(settings.ownerNotificationSettings), [settings.ownerNotificationSettings]);
  useEffect(() => setIntegrations(settings.ownerIntegrations), [settings.ownerIntegrations]);
  useEffect(() => setTwoFactor(settings.ownerSecurity.twoFactor), [settings.ownerSecurity.twoFactor]);
  useEffect(() => {
    setOwnerSalaryLoading(true);
    const params = new URLSearchParams({ period: ownerSalaryPeriod });
    if (ownerSalaryPeriod === 'custom') {
      params.set('date_from', ownerSalaryDateFrom);
      params.set('date_to', ownerSalaryDateTo);
    }
    apiRequest<OwnerSalaryData>(`/api/owner/owners/salary-detail?${params.toString()}`)
      .then(setOwnerSalaryData)
      .catch(() => setOwnerSalaryData(null))
      .finally(() => setOwnerSalaryLoading(false));
  }, [ownerSalaryPeriod, ownerSalaryDateFrom, ownerSalaryDateTo]);

  const handlePayOwnerSalary = async (ownerId: string) => {
    const amount = parseFloat(ownerPayAmount.replace(',', '.'));
    if (!amount || amount < 1) return;
    try {
      setOwnerSalaryLoading(true);
      const res = await apiRequest<{ newBalance: number }>('/api/owner/owners/pay-salary', {
        method: 'POST',
        body: { ownerId, amount, note: ownerPayNote.trim() || 'Выплата дохода владельцу' },
      });
      setOwnerPayAmount('');
      setOwnerPayNote('');
      setOwnerPayTarget(null);
      setBottomToast(`Выплата ${amount.toLocaleString('ru')} ₽ владельцу проведена`);
      setTimeout(() => setBottomToast(null), 3000);
      const updated = await apiRequest<OwnerSalaryData>(`/api/owner/owners/salary-detail?period=${ownerSalaryPeriod}`);
      setOwnerSalaryData(updated);
    } catch (e) {
      setBottomToast(e instanceof Error ? e.message : 'Ошибка выплаты');
      setTimeout(() => setBottomToast(null), 4000);
    } finally { setOwnerSalaryLoading(false); }
  };

  const loadPiggyBank = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setPiggyBankLoading(true);
    try {
      let path = '/api/owner/piggy-bank';
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const qs = params.toString();
      if (qs) path += '?' + qs;
      const data = await apiRequest<PiggyBankData>(path);
      setPiggyBankBalance(data.balance);
      setPiggyBankTxs(data.transactions);
      setPiggyBank(data);
    } catch { /* ignore */ }
    finally { setPiggyBankLoading(false); }
  }, []);

  const loadWallet = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setWalletLoading(true);
    try {
      let path = '/api/owner/wallet';
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const qs = params.toString();
      if (qs) path += '?' + qs;
      const data = await apiRequest<WalletData>(path);
      setWalletData(data);
    } catch { /* ignore */ }
    finally { setWalletLoading(false); }
  }, []);

  async function handlePiggyWithdraw() {
    const f = piggyWithdrawForm;
    if (!f.bookingId || !f.materialName || !f.materialCost) return;
    try {
      await apiRequest('/api/owner/piggy-bank/withdraw', {
        method: 'POST',
        body: {
          bookingId: f.bookingId,
          materialName: f.materialName,
          materialCost: Number(f.materialCost),
          purpose: f.purpose,
          date: f.date,
        },
      });
      setShowPiggyWithdraw(false);
      setPiggyWithdrawForm({ bookingId: '', materialName: '', materialCost: '', purpose: '', date: todayLabel });
      await loadPiggyBank();
      await loadWallet(walletDateFrom || undefined, walletDateTo || undefined);
    } catch (e: unknown) {
      setBottomToast(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  const openPiggyAdjust = (resourceGroup: 'wash' | 'detailing') => {
    const current = resourceGroup === 'wash'
      ? (piggyBank?.remainingInPiggyBank ?? 0)
      : (piggyBank?.detailing?.netPiggy ?? 0);
    setPiggyAdjustResourceGroup(resourceGroup);
    setPiggyAdjustCurrentBalance(Math.round(current));
    setPiggyAdjustForm({ newBalance: String(Math.round(current)), purpose: '', date: todayLabel });
    setShowPiggyAdjust(true);
  };

  async function handlePiggyAdjust() {
    const newBalance = Number(piggyAdjustForm.newBalance);
    if (!Number.isFinite(newBalance)) return;
    const delta = Math.round(newBalance) - piggyAdjustCurrentBalance;
    if (delta === 0) {
      setShowPiggyAdjust(false);
      setBottomToast('Сумма не изменилась');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await apiRequest('/api/owner/piggy-bank/adjust', {
        method: 'POST',
        body: {
          resourceGroup: piggyAdjustResourceGroup,
          amount: delta,
          purpose: piggyAdjustForm.purpose,
          date: piggyAdjustForm.date,
        },
      });
      setShowPiggyAdjust(false);
      setPiggyAdjustForm({ newBalance: '', purpose: '', date: todayLabel });
      await loadPiggyBank(piggyDateFrom || undefined, piggyDateTo || undefined);
      await loadWallet(walletDateFrom || undefined, walletDateTo || undefined);
      setBottomToast('Сумма копилки обновлена');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (e: unknown) {
      setBottomToast(e instanceof Error ? e.message : 'Ошибка');
      setTimeout(() => setBottomToast(null), 4000);
    }
  }

  useEffect(() => { void loadPiggyBank(piggyDateFrom || undefined, piggyDateTo || undefined); }, [page, piggyDateFrom, piggyDateTo]);
  useEffect(() => { void loadWallet(walletDateFrom || undefined, walletDateTo || undefined); }, [page, walletDateFrom, walletDateTo]);
  useEffect(() => {
    setClientCardDrafts(
      Object.fromEntries(
        clients.map((client) => [
          client.id,
          {
            name: client.name || '',
            phone: client.phone || '',
            car: client.car || '',
            plate: client.plate || '',
            plateType: client.plateType || 'russian',
            notes: client.notes || '',
            debtBalance: String(client.debtBalance || 0),
            adminRating: client.adminRating ?? 0,
            adminNote: client.adminNote || '',
            referralSource: client.referralSource || '',
          },
        ]),
      ),
    );
  }, [clients]);
  useEffect(() => {
    setEditingSettingsClientCard(false);
  }, [settingsClientId]);
  useEffect(() => {
    if (settingsSection !== 'security') {
      setSecurityError(null);
      setSecuritySaved(false);
      clearOwnerResetFlow();
    }
  }, [settingsSection]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'security') {
      void refreshActiveSessions();
    }
  }, [page, settingsSection]);
  useEffect(() => {
    if (!resetFinalizeAfter) {
      setResetCountdown(0);
      return;
    }

    const syncCountdown = () => {
      const diffMs = resetFinalizeAfter.getTime() - Date.now();
      setResetCountdown(Math.max(0, Math.ceil(diffMs / 1000)));
    };

    syncCountdown();
    const intervalId = window.setInterval(syncCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [resetFinalizeAfter]);
  useEffect(() => {
    if (!selectedCalendarDate) {
      setSelectedCalendarDate(todayLabel);
    }
  }, [selectedCalendarDate, todayLabel]);
  useEffect(() => {
    if (page === 'stock') {
      void listShiftChecklists().then(setShiftChecklists);
      if (isAccountant) {
        setAdminShiftInspections([]);
      } else {
        void listAdminShiftInspections().then(setAdminShiftInspections);
      }
    }
  }, [isAccountant, page]);
  useEffect(() => {
    if (isAccountant && page === 'settings') {
      setPage('payroll');
      setSettingsSection(null);
    }
  }, [isAccountant, page]);
  useEffect(() => {
    if (page === 'settings' && settingsSection === 'shift' && !isAccountant) {
      void listAdminShiftInspections().then(setAdminShiftInspections);
    }
  }, [isAccountant, page, settingsSection]);

  const handleOpenShiftForMasters = async () => {
    setShiftOpenError(null);
    setShiftOpenSuccess(false);
    if (shiftOpenMasterIds.length === 0) {
      setShiftOpenError('Отметьте мастеров, которые вышли в смену');
      return;
    }
    setShiftOpenSubmitting(true);
    try {
      const saved = await openShiftForMasters({
        masterIds: shiftOpenMasterIds,
        note: shiftOpenNote.trim() || undefined,
      });
      setAdminShiftInspections((current) => [saved, ...current]);
      setShiftOpenMasterIds([]);
      setShiftOpenNote('');
      setShiftOpenSuccess(true);
      window.setTimeout(() => setShiftOpenSuccess(false), 3000);
    } catch (error) {
      setShiftOpenError(error instanceof Error ? error.message : 'Не удалось открыть смену');
    } finally {
      setShiftOpenSubmitting(false);
    }
  };

  const ownerNotifications = notifications.filter((notification) => notification.recipientRole === financeNotificationRole);
  const unreadCount = ownerNotifications.filter(n => !n.read).length;
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const todayBookings = bookings.filter(b => b.date === todayLabel).sort((a, b) => a.time.localeCompare(b.time));
  // Активные мастера для блока «Мастера сегодня» (Настройки → Смена)
  const activeMasters = workers
    .filter((worker) => worker.role === 'worker' && worker.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  // Выход мастера сегодня: отмечен (checked) в осмотре/открытии смены за сегодняшнюю дату.
  // Та же логика, что у бэкенд-подсчёта выходов (_compute_shift_attendance).
  const masterCameOutTodayAt = (workerId: string): string | null => {
    const times = adminShiftInspections
      .filter((inspection) => formatDate(inspection.createdAt) === todayLabel)
      .filter((inspection) => inspection.masters.some((m) => m.workerId === workerId && m.checked))
      .map((inspection) => inspection.createdAt.getTime())
      .sort((a, b) => a - b);
    return times.length > 0
      ? new Date(times[0]).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : null;
  };
  const mastersCameOutToday = activeMasters.filter((master) => masterCameOutTodayAt(master.id) !== null).length;
  const latestShiftChecklists = shiftChecklists.slice(0, 10);
  const latestAdminShiftInspections = adminShiftInspections.slice(0, 8);
  const latestAdminShiftInspectionKey = latestAdminShiftInspections.map((inspection) => `${inspection.id}:${inspection.floorPhotoUrl}`).join('|');

  useEffect(() => {
    adminShiftPhotoUrlsRef.current = adminShiftPhotoUrls;
  }, [adminShiftPhotoUrls]);

  useEffect(() => {
    if (page !== 'stock') {
      setAdminShiftPhotoUrls((current) => {
        Object.values(current).forEach((url) => URL.revokeObjectURL(url));
        return {};
      });
      return;
    }

    let cancelled = false;
    const activeIds = new Set(latestAdminShiftInspections.map((inspection) => inspection.id));
    setAdminShiftPhotoUrls((current) => {
      const next: Record<string, string> = {};
      Object.entries(current).forEach(([id, url]) => {
        if (activeIds.has(id)) {
          next[id] = url;
        } else {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });

    const currentPhotoUrls = adminShiftPhotoUrlsRef.current;
    const missing = latestAdminShiftInspections.filter((inspection) => inspection.floorPhotoUrl && !currentPhotoUrls[inspection.id]);
    void Promise.all(
      missing.map(async (inspection) => ({
        id: inspection.id,
        url: await apiBlobUrl(inspection.floorPhotoUrl),
      })),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((item) => URL.revokeObjectURL(item.url));
        return;
      }
      setAdminShiftPhotoUrls((current) => {
        const next = { ...current };
        loaded.forEach((item) => {
          if (next[item.id]) {
            URL.revokeObjectURL(item.url);
            return;
          }
          next[item.id] = item.url;
        });
        return next;
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [latestAdminShiftInspectionKey, page]);
  useEffect(() => () => {
    Object.values(adminShiftPhotoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Auto-scroll active field into view when visualViewport resizes (mobile keyboard opens)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const el = document.activeElement as HTMLElement | null;
      el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (page === 'stock' && showWriteOffHistory) {
      getWriteOffHistory().then(setWriteOffHistory).catch(() => {});
    }
  }, [page, showWriteOffHistory]);
  const bookingFormBoxes = ownerBookingBoxes(bookingForm.service, services, boxes);
  const bookingFormLocationLabel = ownerLocationLabel(bookingForm.service, services);
  const editBookingLocationLabel = selectedBooking ? ownerLocationLabel(selectedBooking.serviceId, services) : 'Помещение';
  const todayRevenue = todayBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);

  // Current week bounds (Saturday - Friday) for weekly KPI filtering
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToSaturday = (dayOfWeek + 1) % 7;
  const weekSaturday = new Date(now);
  weekSaturday.setDate(now.getDate() - diffToSaturday);
  weekSaturday.setHours(0, 0, 0, 0);
  const weekFriday = new Date(weekSaturday);
  weekFriday.setDate(weekSaturday.getDate() + 6);
  weekFriday.setHours(23, 59, 59, 999);
  const isDateInWeek = (dateStr: string) => {
    const d = parseFlexibleDate(dateStr);
    return d ? d >= weekSaturday && d <= weekFriday : false;
  };
  const weeklyCompletedBookings = completedBookings.filter((b) => isDateInWeek(b.date));
  const weeklyBookings = bookings.filter((b) => isDateInWeek(b.date));
  const weeklyExpenses = expenses.filter((e) => isDateInWeek(e.date));
  const weeklyIncomes = incomes.filter((i) => isDateInWeek(i.date));
  const totalRevenue = weeklyCompletedBookings.reduce((s, b) => s + b.price, 0);
  const totalExpenses = weeklyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = weeklyIncomes.reduce((s, i) => s + i.amount, 0);
  const profit = totalRevenue + totalIncomes - totalExpenses;
  const averageCheck = weeklyCompletedBookings.length > 0 ? Math.round(totalRevenue / weeklyCompletedBookings.length) : 0;
  const activeBookings = weeklyBookings.filter((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const pipelineCounts = {
    adminReview: weeklyBookings.filter((booking) => booking.status === 'admin_review').length,
    confirmed: weeklyBookings.filter((booking) => booking.status === 'confirmed').length,
    scheduled: weeklyBookings.filter((booking) => booking.status === 'scheduled').length,
    inProgress: weeklyBookings.filter((booking) => booking.status === 'in_progress').length,
    noShow: weeklyBookings.filter((booking) => booking.status === 'no_show').length,
  };
  const statusListItems = showStatusList
    ? bookings.filter((booking) => booking.status === showStatusList)
      .slice()
      .sort((left, right) => (left.date || '').localeCompare(right.date || '') || left.time.localeCompare(right.time))
    : [];
  const totalStockValue = stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  // Finance breakdown by service category
  const washRevenue = completedBookings
    .filter(b => services.find(s => s.id === b.serviceId)?.resourceGroup === 'wash')
    .reduce((s, b) => s + b.price, 0);
  const detailingRevenue = completedBookings
    .filter(b => services.find(s => s.id === b.serviceId)?.resourceGroup === 'detailing')
    .reduce((s, b) => s + b.price, 0);
  const washExpenses = expenses
    .filter(e => e.resourceGroup === 'wash')
    .reduce((s, e) => s + e.amount, 0);
  const detailingExpenses = expenses
    .filter(e => e.resourceGroup === 'detailing')
    .reduce((s, e) => s + e.amount, 0);
  const washIncomes = incomes
    .filter(i => i.resourceGroup === 'wash')
    .reduce((s, i) => s + i.amount, 0);
  const detailingIncomes = incomes
    .filter(i => i.resourceGroup === 'detailing')
    .reduce((s, i) => s + i.amount, 0);

  const resourceGroupLabel = (cat?: string) => {
    if (cat === 'wash') return 'Автомойка';
    if (cat === 'detailing') return 'Детейлинг';
    return 'Общее';
  };
  const payrollRows = (payrollData ?? workers).map(worker => {
    const workerPenalties = penalties.filter((penalty) => penalty.workerId === worker.id && isComplaintActive(penalty));
    const complaintState = getComplaintPenaltyState(worker.defaultPercent, workerPenalties);
    return {
      worker,
      payrollSummary: worker.payrollSummary,
      complaintState,
      recentPenalties: workerPenalties.slice(0, 3),
    };
  });
  const payrollTotal = payrollRows.reduce((sum, row) => sum + (row.payrollSummary?.balance || 0), 0);
  const formatComplaintDate = (value: Date) => value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const resetPreviewRows = resetPreview ? [
    { label: 'Сохранятся владельцы', value: resetPreview.ownersPreserved },
    { label: 'Удалятся сотрудники', value: resetPreview.employeesDeleted },
    { label: 'Удалятся клиенты', value: resetPreview.clientsDeleted },
    { label: 'Удалятся записи', value: resetPreview.bookingsDeleted },
    { label: 'Удалятся уведомления', value: resetPreview.notificationsDeleted },
    { label: 'Удалятся позиции склада', value: resetPreview.stockItemsDeleted },
    { label: 'Удалятся расходы', value: resetPreview.expensesDeleted },
    { label: 'Удалятся жалобы', value: resetPreview.penaltiesDeleted },
    { label: 'Сбросятся услуги', value: resetPreview.servicesReset },
    { label: 'Сбросятся боксы', value: resetPreview.boxesReset },
    { label: 'Сбросится график', value: resetPreview.scheduleReset },
    { label: 'Пересоздадутся настройки', value: resetPreview.settingsReset },
  ] : [];
  const resetExecuteLocked = resetStage !== 'armed' || !resetRequestId || resetCountdown > 0 || resetLoadingStep === 'execute';

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#0B1226]' : 'bg-[#F6F7FA]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const accent = isDark ? '#5DD68F' : '#34C759';
  const surface = isDark ? '#0E1624' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8]' : 'bg-white border-black/10 text-[#0B1226]'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const tooltipStyle = { background: surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, color: text };
  const createDraftId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddBoxDraft = () => {
    setBoxes((current) => [
      ...current,
      {
        id: createDraftId('box'),
        name: `Бокс ${current.length + 1}`,
        resourceGroup: 'wash',
        pricePerHour: 0,
        active: true,
        description: '',
      },
    ]);
  };

  const handleRemoveBoxDraft = (boxId: string) => {
    setBoxes((current) => current.filter((box) => box.id !== boxId));
  };

  const handleAddServiceDraft = () => {
    setServicesState((current) => [
      {
        id: createDraftId('service'),
        name: 'Новая услуга',
        category: 'Мойка',
        resourceGroup: 'wash',
        washType: '',
        price: 0,
        duration: 30,
        desc: '',
        active: true,
        materialConsumption: null,
        isFixedMaster: false,
        masterPayType: '',
        masterPayValue: 0,
        piggyPayType: '',
        piggyPayValue: 0,
        ownerPayType: '',
        ownerPayValue: 0,
        ownerSplitEnabled: true,
        materials: [],
        splitOrder: [],
        piggyTarget: '',
      },
      ...current,
    ]);
  };

  const handleRemoveServiceDraft = (serviceId: string) => {
    setServicesState((current) => current.filter((service) => service.id !== serviceId));
  };

  const handleHireWorker = async () => {
    const name = newEmployee.name.trim();
    const login = newEmployee.login.trim();
    const password = newEmployee.password.trim();
    const employeeLabel = employeeRoleLabel(newEmployee.role);

    if (!name || !login || !password) {
      setBottomToast('\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0438\u043c\u044f, \u043b\u043e\u0433\u0438\u043d \u0438 \u043f\u0430\u0440\u043e\u043b\u044c \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }

    try {
      setEmployeeActionLoading({ type: 'hire' });
      await hireWorker({
        role: newEmployee.role,
        name,
        login,
        password,
        percent: newEmployee.percent === '' ? 0 : newEmployee.percent,
        salaryBase: newEmployee.salaryBase,
        phone: newEmployee.phone.trim(),
        email: newEmployee.email.trim(),
        telegramChatId: newEmployee.telegramChatId.trim(),
      });

      setNewEmployee({
        role: 'worker',
        name: '',
        login: '',
        password: '',
        percent: 50,
        salaryBase: 0,
        phone: '',
        email: '',
        telegramChatId: '',
      });
      setBottomToast(`${employeeLabel} ${name} \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d. \u041b\u043e\u0433\u0438\u043d: ${login}`);
      setTimeout(() => setBottomToast(null), 4000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c ${employeeLabel.toLowerCase()}`);
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setEmployeeActionLoading(null);
    }
  };

  const handleSaveSettings = async () => {
    if (settingsSection === 'security') {
      const wantsPasswordChange = Boolean(password.current || password.new_ || password.confirm);
      setSecurityError(null);
      setSecuritySaved(false);

      if (wantsPasswordChange) {
        if (!password.current || !password.new_ || !password.confirm) {
          setSecurityError('Заполните все поля для смены пароля');
          return;
        }
        if (password.new_.length < 8) {
          setSecurityError('Новый пароль должен содержать минимум 8 символов');
          return;
        }
        if (password.new_ !== password.confirm) {
          setSecurityError('Подтверждение пароля не совпадает');
          return;
        }
      }

      try {
        await saveOwnerSecurity({ twoFactor });
        if (wantsPasswordChange) {
          await changePassword(password.current, password.new_);
          setPassword({ current: '', new_: '', confirm: '' });
        }
        setSecuritySaved(true);
        setTimeout(() => setSecuritySaved(false), 2000);
      } catch (error) {
        setSecurityError(error instanceof Error ? error.message : 'Не удалось сохранить настройки безопасности');
      }
      return;
    }

    try {
      if (settingsSection === 'company') await saveOwnerCompany(company);
      if (settingsSection === 'schedule') await saveSchedule(scheduleState);
      if (settingsSection === 'boxes') await saveBoxes(boxes);
      if (settingsSection === 'services') await saveServices(services);
      if (settingsSection === 'employees') await saveWorkerSettings(employeeSettings);
      if (settingsSection === 'notifications') await saveOwnerNotificationSettings(notifSettings);
      if (settingsSection === 'integrations') await saveOwnerIntegrations(integrations);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить настройки');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  // «Готово» в модалке настройки услуги: сохраняет услуги сразу, чтобы не листать список до кнопки «Сохранить».
  const handleServiceSettingsDone = async () => {
    setServiceSettingsSaving(true);
    try {
      await saveServices(services);
      setShowServiceSettings(false);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить услугу');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setServiceSettingsSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    setGoogleConnectLoading(true);
    setGoogleConnectError(null);
    try {
      const status = await apiRequest<{ configured: boolean; source: 'env' | 'db' | null; redirectUri: string }>(
        '/api/owner/integrations/google/status'
      );
      if (!status.configured) {
        // Сервер не настроен: показываем мастер подключения с инструкцией.
        setGoogleSetupStatus(status);
        setGoogleSetupOpen(true);
        setGoogleConnectLoading(false);
        return;
      }
      const { authUrl } = await apiRequest<{ authUrl: string }>('/api/owner/integrations/google/auth-url');
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось начать подключение Google Календаря';
      setGoogleConnectError(message);
      setGoogleConnectLoading(false);
      window.Telegram?.WebApp?.showAlert?.(message);
    }
  };

  const handleGoogleSaveKeys = async () => {
    setGoogleSavingKeys(true);
    setGoogleConnectError(null);
    try {
      await apiRequest('/api/owner/integrations/google/credentials', {
        method: 'PUT',
        body: { clientId: googleClientId, clientSecret: googleClientSecret },
      });
      // Ключи сохранены — сразу переходим к OAuth-авторизации Google.
      const { authUrl } = await apiRequest<{ authUrl: string }>('/api/owner/integrations/google/auth-url');
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить ключи Google Календаря';
      setGoogleConnectError(message);
      setGoogleSavingKeys(false);
      window.Telegram?.WebApp?.showAlert?.(message);
    }
  };

  const handleGoogleCopyUri = async () => {
    if (!googleSetupStatus?.redirectUri) return;
    try {
      await navigator.clipboard.writeText(googleSetupStatus.redirectUri);
      setGoogleCopiedUri(true);
      setTimeout(() => setGoogleCopiedUri(false), 2000);
    } catch {
      // Clipboard недоступен — оставляем URI видимым для ручного копирования.
    }
  };

  const openExternal = (url: string) => {
    // В Telegram открываем во внешнем браузере: во встроенном Google
    // блокирует консоль и OAuth (частые «URL not found» и пустые страницы).
    const webApp = window.Telegram?.WebApp;
    if (webApp && typeof webApp.openLink === 'function') {
      webApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleGoogleLoadJson = (file: File) => {
    setGoogleJsonError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ''));
        // Файл client_secret_*.json из Google Cloud Console: {"web": {...}} или {"installed": {...}}
        const source = parsed?.web || parsed?.installed || parsed;
        const clientId = typeof source?.client_id === 'string' ? source.client_id.trim() : '';
        const clientSecret = typeof source?.client_secret === 'string' ? source.client_secret.trim() : '';
        if (!clientId || !clientSecret) {
          setGoogleJsonError('Это не файл настроек Google. Скачайте JSON в консоли (Download JSON) рядом с созданным OAuth-клиентом.');
          setGoogleJsonFile(null);
          return;
        }
        setGoogleClientId(clientId);
        setGoogleClientSecret(clientSecret);
        setGoogleJsonFile(file.name || 'client_secret.json');
      } catch {
        setGoogleJsonError('Не удалось прочитать файл. Скачайте JSON в Google Cloud Console и повторите.');
        setGoogleJsonFile(null);
      }
    };
    reader.onerror = () => {
      setGoogleJsonError('Не удалось прочитать файл.');
      setGoogleJsonFile(null);
    };
    reader.readAsText(file);
  };

  const handleGoogleDisconnect = async () => {
    setGoogleConnectError(null);
    setGoogleSyncError(null);
    setGoogleSyncResult(null);
    try {
      await apiRequest('/api/owner/integrations/google/disconnect', { method: 'POST' });
      setIntegrations(p => ({ ...p, googleCalendar: false }));
    } catch (error) {
      setGoogleConnectError(error instanceof Error ? error.message : 'Не удалось отключить Google Календарь');
    }
  };

  const handleGoogleEditKeys = async () => {
    // Удалить сохранённые ключи OAuth-клиента — снова покажется мастер
    // с инструкцией «откуда брать ключ и куда ставить» и загрузкой .json.
    setGoogleConnectError(null);
    try {
      await apiRequest('/api/owner/integrations/google/credentials', { method: 'DELETE' });
      const status = await apiRequest<{ configured: boolean; source: 'env' | 'db' | null; redirectUri: string }>(
        '/api/owner/integrations/google/status'
      );
      setGoogleSetupStatus(status);
      setGoogleSetupOpen(true);
      setIntegrations(p => ({ ...p, googleCalendar: false }));
    } catch (error) {
      setGoogleConnectError(error instanceof Error ? error.message : 'Не удалось удалить ключи Google Календаря');
    }
  };

  const handleGoogleSyncNow = async () => {
    setGoogleSyncing(true);
    setGoogleSyncError(null);
    setGoogleSyncResult(null);
    try {
      const result = await apiRequest<{ ok: boolean; skipped?: boolean; created?: number; updated?: number; cancelled?: number; error?: string | null; errorDetails?: string | null; lastSyncAt?: string | null }>(
        '/api/owner/integrations/google/sync',
        { method: 'POST' }
      );
      setGoogleSyncResult(result);
    } catch (error) {
      setGoogleSyncError(error instanceof Error ? error.message : 'Не удалось выполнить синхронизацию');
    } finally {
      setGoogleSyncing(false);
    }
  };

  const historyPeriodDates = () => {
    const today = new Date();
    if (historyPeriod === 'day') return { dateFrom: formatDate(today), dateTo: formatDate(today) };
    if (historyPeriod === 'week') {
      const from = new Date(today);
      const offset = (today.getDay() + 6) % 7;
      from.setDate(today.getDate() - offset);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (historyPeriod === 'month') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (historyPeriod === 'custom') return { dateFrom: historyDateFrom, dateTo: historyDateTo };
    return { dateFrom: '', dateTo: '' };
  };

  const fetchBookingsHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      const { dateFrom, dateTo } = historyPeriodDates();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (historyStatusFilter) params.set('status', historyStatusFilter);
      if (historyQuery.trim()) params.set('q', historyQuery.trim());
      const items = await apiRequest<BookingHistoryItem[]>(`/api/owner/bookings-history?${params.toString()}`);
      setHistoryItems(items);
      try {
        const totals = await apiRequest<BookingHistoryTotals>(`/api/owner/bookings-history/totals?${params.toString()}`);
        setHistoryTotals(totals);
      } catch {
        setHistoryTotals(null);
      }
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось загрузить историю записей');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setHistoryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPeriod, historyDateFrom, historyDateTo, historyStatusFilter, historyQuery]);

  useEffect(() => {
    if (page === 'settings' && settingsSection === 'bookings-history' && !selectedHistoryBookingId) {
      void fetchBookingsHistory();
    }
  }, [page, settingsSection, selectedHistoryBookingId, fetchBookingsHistory]);

  const archivePeriodDates = () => {
    const today = new Date();
    if (archivePeriod === 'day') return { dateFrom: formatDate(today), dateTo: formatDate(today) };
    if (archivePeriod === 'week') {
      const from = new Date(today);
      const offset = (today.getDay() + 6) % 7;
      from.setDate(today.getDate() - offset);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (archivePeriod === 'month') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (archivePeriod === 'year') {
      return {
        dateFrom: formatDate(new Date(today.getFullYear(), 0, 1)),
        dateTo: formatDate(new Date(today.getFullYear(), 11, 31)),
      };
    }
    if (archivePeriod === 'custom') return { dateFrom: archiveDateFrom, dateTo: archiveDateTo };
    return { dateFrom: '', dateTo: '' };
  };

  const getWeeksOfMonth = (year: number, month: number) => {
    const weeks: { start: Date; end: Date }[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const seen = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d);
      const offset = (day.getDay() + 6) % 7;
      const start = new Date(year, month, d - offset);
      const key = start.toDateString();
      if (seen.has(key)) continue;
      seen.add(key);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      weeks.push({ start, end });
    }
    return weeks;
  };

  const fetchArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const params = new URLSearchParams();
      const { dateFrom, dateTo } = archivePeriodDates();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const data = await apiRequest<ArchiveResponse>(`/api/owner/archive?${params.toString()}`);
      setArchiveData(data);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось загрузить архив');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setArchiveLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivePeriod, archiveDateFrom, archiveDateTo]);

  useEffect(() => {
    if (page === 'settings' && settingsSection === 'archive' && !selectedHistoryBookingId) {
      void fetchArchive();
    }
  }, [page, settingsSection, selectedHistoryBookingId, fetchArchive]);

  const archiveHighlightId = (h: ArchiveHighlight) => {
    if (h.target === 'worker') return `archive-hl-worker-${h.workerId}`;
    if (h.target === 'owner') return `archive-hl-owner-${h.ownerId}`;
    if (h.target === 'piggy') return `archive-hl-piggy-${h.txId}`;
    if (h.target === 'income') return `archive-hl-income-${h.incomeId}`;
    if (h.target === 'expense') return `archive-hl-expense-${h.expenseId}`;
    return '';
  };

  useEffect(() => {
    if (!archiveHighlight) return;
    const id = archiveHighlightId(archiveHighlight);
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveHighlight]);

  const currentNavRange = () => {
    const source = settingsSection === 'archive' ? archivePeriodDates() : historyPeriodDates();
    return { dateFrom: source.dateFrom, dateTo: source.dateTo };
  };

  const gotoWorkerSalary = (workerId: string) => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('salary-detail');
    setSettingsSection(null);
    setSelectedSalaryWorkerId(workerId);
    setSalaryPeriod(dateFrom ? 'custom' : 'all');
    setSalaryDateFrom(dateFrom);
    setSalaryDateTo(dateTo);
    setSalarySegment('all');
    setEditingOverrideLinkId(null);
    setEditingOverrideValue('');
    setArchiveHighlight({ target: 'worker', workerId });
  };

  const gotoOwnerSalary = (ownerId: string) => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('payroll');
    setSettingsSection(null);
    setSelectedSalaryWorkerId(null);
    setSalaryDetail(null);
    setOwnerSalaryPeriod(dateFrom ? 'custom' : 'all');
    setOwnerSalaryDateFrom(dateFrom);
    setOwnerSalaryDateTo(dateTo);
    setArchiveHighlight({ target: 'owner', ownerId });
  };

  const gotoPiggyBank = (txId?: string) => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('piggy-bank');
    setSettingsSection(null);
    setPiggyDateFrom(dateFrom);
    setPiggyDateTo(dateTo);
    setArchiveHighlight({ target: 'piggy', txId });
  };

  const gotoWalletItem = (kind: 'income' | 'expense', id: string) => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('wallet');
    setSettingsSection(null);
    setWalletDateFrom(dateFrom);
    setWalletDateTo(dateTo);
    setArchiveHighlight({ target: kind, incomeId: kind === 'income' ? id : undefined, expenseId: kind === 'expense' ? id : undefined });
  };

  const gotoHistory = () => {
    const { dateFrom, dateTo } = currentNavRange();
    setSettingsSection('bookings-history');
    setHistoryPeriod(dateFrom ? 'custom' : 'all');
    setHistoryDateFrom(dateFrom);
    setHistoryDateTo(dateTo);
    setArchiveHighlight(null);
  };

  const gotoPayroll = () => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('payroll');
    setSettingsSection(null);
    setPayrollPeriod(dateFrom ? 'custom' : 'all');
    setPayrollDateFrom(dateFrom);
    setPayrollDateTo(dateTo);
    setArchiveHighlight(null);
  };

  const gotoWallet = () => {
    const { dateFrom, dateTo } = currentNavRange();
    setPage('wallet');
    setSettingsSection(null);
    setWalletDateFrom(dateFrom);
    setWalletDateTo(dateTo);
    setArchiveHighlight(null);
  };

  const gotoClient = (clientId: string | null | undefined, clientPhone: string) => {
    setPage('settings');
    setSettingsSection('clients');
    setArchiveHighlight(null);
    if (clientId) {
      setSettingsClientId(clientId);
    } else {
      setSettingsClientId(null);
      setSettingsClientSearchQuery(clientPhone || '');
    }
  };

  const loadSplitDetail = useCallback(async (bookingId: string) => {
    setSplitLoading(true);
    try {
      const detail = await apiRequest<MoneySplitDetail>(`/api/owner/bookings/${bookingId}/money-split`);
      setSplitDetail(detail);
      setSplitWorkersDraft(detail.workers.map(w => ({ ...w, overrideEarned: w.overrideEarned ?? null })));
      setSplitMaterialsDraft(detail.materialsCostOverride !== null && detail.materialsCostOverride !== undefined
        ? String(detail.materialsCostOverride)
        : '');
      setSplitPiggyDraft(detail.piggyDeposit > 0 ? String(detail.piggyDeposit) : '');
      setSplitOwnersDraft(detail.ownerShares.map(o => ({ ...o })));
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось загрузить распределение');
      setTimeout(() => setBottomToast(null), 4000);
      setSelectedHistoryBookingId(null);
    } finally {
      setSplitLoading(false);
    }
  }, []);

  const openHistoryBooking = (bookingId: string) => {
    setSelectedHistoryBookingId(bookingId);
    setSplitDetail(null);
    void loadSplitDetail(bookingId);
  };

  const closeHistoryBooking = () => {
    setSelectedHistoryBookingId(null);
    setSplitDetail(null);
    setArchiveHighlight(null);
  };

  const handleSaveMoneySplit = async () => {
    if (!splitDetail) return;
    setSplitSaving(true);
    try {
      const updated = await apiRequest<MoneySplitDetail>(`/api/owner/bookings/${splitDetail.id}/money-split`, {
        method: 'PUT',
        body: {
          workers: splitWorkersDraft.map(w => ({
            linkId: w.linkId,
            overrideEarned: w.overrideEarned !== null && w.overrideEarned !== undefined ? Math.round(w.overrideEarned) : null,
          })),
          materialsCost: splitMaterialsDraft.trim() === '' ? null : Math.round(Number(splitMaterialsDraft) || 0),
          piggyDeposit: splitPiggyDraft.trim() === '' ? null : Math.round(Number(splitPiggyDraft) || 0),
          owners: splitOwnersDraft.map(o => ({ ownerId: o.ownerId, amount: Math.round(o.amount) })),
        },
      });
      setSplitDetail(updated);
      setSplitWorkersDraft(updated.workers.map(w => ({ ...w, overrideEarned: w.overrideEarned ?? null })));
      setSplitMaterialsDraft(updated.materialsCostOverride !== null && updated.materialsCostOverride !== undefined
        ? String(updated.materialsCostOverride)
        : '');
      setSplitPiggyDraft(updated.piggyDeposit > 0 ? String(updated.piggyDeposit) : '');
      setSplitOwnersDraft(updated.ownerShares.map(o => ({ ...o })));
      setBottomToast('Распределение сохранено');
      setTimeout(() => setBottomToast(null), 3000);
      void fetchBookingsHistory();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить распределение');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSplitSaving(false);
    }
  };

  const handleResetMoneySplit = async () => {
    if (!splitDetail) return;
    setSplitSaving(true);
    try {
      const updated = await apiRequest<MoneySplitDetail>(`/api/owner/bookings/${splitDetail.id}/money-split`, {
        method: 'PUT',
        body: { workers: [], materialsCost: null, piggyDeposit: null, owners: [] },
      });
      setSplitDetail(updated);
      setSplitWorkersDraft(updated.workers.map(w => ({ ...w, overrideEarned: null })));
      setSplitMaterialsDraft('');
      setSplitPiggyDraft('');
      setSplitOwnersDraft(updated.ownerShares.map(o => ({ ...o })));
      setBottomToast('Сброшено к автоматическому расчёту');
      setTimeout(() => setBottomToast(null), 3000);
      void fetchBookingsHistory();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сбросить распределение');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSplitSaving(false);
    }
  };

  const handleStartOwnerReset = async () => {
    if (!resetPassword.trim()) {
      setResetError('Введите текущий пароль владельца, чтобы запросить код создателя.');
      return;
    }

    try {
      setResetLoadingStep('start');
      setResetError(null);
      setResetInfo(null);
      const response = await requestOwnerDatabaseReset(resetPassword.trim());
      setResetStage('code');
      setResetRequestId(response.requestId);
      setResetPreview(response.preview);
      setResetWarnings(response.warnings);
      setResetRequiredPhrase(response.confirmationPhrase);
      setResetCodeExpiresAt(response.creatorCodeExpiresAt);
      setResetFinalizeAfter(null);
      setResetCreatorCode('');
      setResetConfirmationPhrase('');
      setResetPassword('');
      setResetInfo(response.message);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось запросить код подтверждения.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleApproveOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('Сначала заново запросите код создателя.');
      return;
    }
    if (!resetCreatorCode.trim()) {
      setResetError('Введите код, который пришёл создателю в Telegram.');
      return;
    }
    if (!resetConfirmationPhrase.trim()) {
      setResetError('Введите контрольную фразу подтверждения.');
      return;
    }

    try {
      setResetLoadingStep('approve');
      setResetError(null);
      setResetInfo(null);
      const response = await approveOwnerDatabaseReset(resetRequestId, resetCreatorCode.trim(), resetConfirmationPhrase);
      setResetStage('armed');
      setResetPreview(response.preview);
      setResetWarnings(response.warnings);
      setResetFinalizeAfter(response.finalizeAfter);
      setResetCodeExpiresAt(null);
      setResetCreatorCode('');
      setResetInfo(response.message);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось подтвердить очистку.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleExecuteOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('Запрос на очистку потерян. Начните заново.');
      return;
    }

    try {
      setResetLoadingStep('execute');
      setResetError(null);
      const response = await executeOwnerDatabaseReset(resetRequestId);
      clearOwnerResetFlow();
      setBottomToast(response.message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Не удалось выполнить очистку CRM.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleAddExpense = () => {
    if (!expenseForm.title || !expenseForm.amount) return;
    const dateValid = /^\d{2}\.\d{2}\.\d{4}$/.test(expenseForm.date) && parseFlexibleDate(expenseForm.date) !== null;
    if (!dateValid) return;
    const title = expenseForm.title;
    const amount = Number(expenseForm.amount);
    addExpense({ title, amount, category: expenseForm.category, resourceGroup: expenseForm.resourceGroup || undefined, date: expenseForm.date, note: expenseForm.note });
    setExpenseAdded(true);
    setTimeout(() => {
      setExpenseAdded(false);
      setShowAddExpense(false);
      setExpenseForm({ title: '', amount: '', category: EXPENSE_CATEGORIES[0], resourceGroup: '', note: '', date: todayLabel });
      setBottomToast(`Расход "${title}" добавлен на сумму ${amount.toLocaleString('ru')} ₽`);
      setTimeout(() => setBottomToast(null), 4000);
    }, 1800);
  };

  // Task 5.1 — open edit expense form
  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpenseForm({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
      note: expense.note ?? '',
      resourceGroup: expense.resourceGroup || '',
    });
    setEditFinanceError(null);
  };

  // Task 5.1 — save edited expense
  const handleSaveExpense = async () => {
    if (!editingExpense) return;
    const title = editExpenseForm.title.trim();
    if (!title) { setEditFinanceError('Название не может быть пустым'); return; }
    const amount = Number(editExpenseForm.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10_000_000) {
      setEditFinanceError('Сумма должна быть от 1 до 10 000 000');
      return;
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(editExpenseForm.date)) {
      setEditFinanceError('Дата должна быть в формате ДД.ММ.ГГГГ');
      return;
    }
    setEditFinanceLoading(true);
    setEditFinanceError(null);
    try {
      await updateExpense(editingExpense.id, {
        title,
        amount,
        category: editExpenseForm.category,
        date: editExpenseForm.date,
        note: editExpenseForm.note || null,
        resourceGroup: editExpenseForm.resourceGroup || undefined,
      });
      setEditingExpense(null);
      setBottomToast('Расход обновлён');
      setTimeout(() => setBottomToast(null), 3500);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
          setEditFinanceError('Ошибка валидации. Проверьте введённые данные.');
        } else if (msg.includes('404')) {
          setEditFinanceError('Запись не найдена. Возможно, она была удалена.');
        } else if (msg.includes('500')) {
          setEditFinanceError('Не удалось сохранить изменения. Попробуйте ещё раз.');
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setEditFinanceError('Нет соединения с сервером.');
        } else {
          setEditFinanceError(msg || 'Не удалось сохранить изменения. Попробуйте ещё раз.');
        }
      } else {
        setEditFinanceError('Не удалось сохранить изменения. Попробуйте ещё раз.');
      }
    } finally {
      setEditFinanceLoading(false);
    }
  };

  // Task 6.1 — open edit income form
  const openEditIncome = (income: Income) => {
    setEditingIncome(income);
    setEditIncomeForm({
      amount: String(income.amount),
      source: income.source,
      note: income.note ?? '',
      date: income.date,
      resourceGroup: income.resourceGroup || '',
    });
    setEditFinanceError(null);
  };

  // Task 6.1 — save edited income
  const handleSaveIncome = async () => {
    if (!editingIncome) return;
    const source = editIncomeForm.source.trim();
    if (!source) { setEditFinanceError('Источник не может быть пустым'); return; }
    const amount = Number(editIncomeForm.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10_000_000) {
      setEditFinanceError('Сумма должна быть от 1 до 10 000 000');
      return;
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(editIncomeForm.date)) {
      setEditFinanceError('Дата должна быть в формате ДД.ММ.ГГГГ');
      return;
    }
    setEditFinanceLoading(true);
    setEditFinanceError(null);
    try {
      await updateIncome(editingIncome.id, {
        amount,
        source,
        note: editIncomeForm.note || null,
        date: editIncomeForm.date,
        resourceGroup: editIncomeForm.resourceGroup || undefined,
      });
      setEditingIncome(null);
      setBottomToast('Доход обновлён');
      setTimeout(() => setBottomToast(null), 3500);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
          setEditFinanceError('Ошибка валидации. Проверьте введённые данные.');
        } else if (msg.includes('404')) {
          setEditFinanceError('Запись не найдена. Возможно, она была удалена.');
        } else if (msg.includes('500')) {
          setEditFinanceError('Не удалось сохранить изменения. Попробуйте ещё раз.');
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setEditFinanceError('Нет соединения с сервером.');
        } else {
          setEditFinanceError(msg || 'Не удалось сохранить изменения. Попробуйте ещё раз.');
        }
      } else {
        setEditFinanceError('Не удалось сохранить изменения. Попробуйте ещё раз.');
      }
    } finally {
      setEditFinanceLoading(false);
    }
  };

  const handleAddStock = () => {
    if (!stockForm.name || !stockForm.qty) return;
    const parentCats = stockCategories.filter(c => !c.parentId);
    const qty = Number(stockForm.qty.replace(',', '.'));
    const rawPrice = Number(stockForm.unitPrice.replace(',', '.'));
    const unitPrice = stockForm.priceMode === 'total' && qty > 0 ? rawPrice / qty : rawPrice;
    addStockItem({ name: stockForm.name, qty, unit: stockForm.unit, unitPrice, category: stockForm.category, categoryId: stockForm.categoryId || undefined });
    setShowAddStock(false);
    setStockForm({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit', category: parentCats[0]?.name || 'Химия', categoryId: '' });
    setBottomToast(`\u0422\u043e\u0432\u0430\u0440 "${stockForm.name}" \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u043d\u0430 \u0441\u043a\u043b\u0430\u0434`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleWriteOff = () => {
    if (!showWriteOff) return;
    const item = stockItems.find(s => s.id === showWriteOff);
    writeOffStock(showWriteOff, Number(writeOffQty.replace(',', '.')));
    setShowWriteOff(null);
    setWriteOffQty('1');
    if (item) {
      setBottomToast(`Списано: ${item.name} — ${writeOffQty} ${item.unit}`);
      setTimeout(() => setBottomToast(null), 3000);
    }
  };

  const handleExport = async (kind: OwnerExportKind, params?: OwnerExportParams) => {
    const labels = {
      report: { noun: 'Excel-файл' },
      pdf: { noun: 'PDF' },
    } as const;

    try {
      setExportingKind(kind);
      const fileName = await downloadOwnerExport(kind, params);
      let subtitle = `Файл ${fileName} скачан`;

      try {
        const delivery = await sendOwnerExportToTelegram(kind, params);
        subtitle = `${subtitle} и отправлен в Telegram`;
        setBottomToast(delivery.message);
        setTimeout(() => setBottomToast(null), 5000);
      } catch (deliveryError) {
        const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'Не удалось отправить файл в Telegram';
        setBottomToast(`${labels[kind].noun} скачан, но отправка в Telegram не удалась: ${deliveryMessage}`);
        setTimeout(() => setBottomToast(null), 5000);
      }

      setExportSuccess({
        title: `${labels[kind].noun} экспортирован`,
        subtitle,
      });
      setTimeout(() => setExportSuccess(null), 3200);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось сформировать экспорт';
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setExportingKind(null);
    }
  };

  const openExportModal = (kind: 'report' | 'pdf') => {
    setExportModalKind(kind);
    setExportModalStep('segment');
    setExportModalSegment('all');
    setExportModalPeriod('daily');
    setExportModalDateFrom('');
    setExportModalDateTo('');
    setShowExportModal(true);
  };

  const handleExportWithParams = async () => {
    setShowExportModal(false);
    const kind = exportModalKind;
    const params: OwnerExportParams = {
      segment: exportModalSegment,
    };
    if (exportModalPeriod === 'custom') {
      params.date_from = exportModalDateFrom;
      params.date_to = exportModalDateTo;
    } else {
      const now = new Date();
      if (exportModalPeriod === 'daily') {
        params.date_from = formatDate(now);
        params.date_to = formatDate(now);
      } else {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 6);
        params.date_from = formatDate(weekAgo);
        params.date_to = formatDate(now);
      }
    }
    await handleExport(kind, params);
  };

  const handleSummaryReport = async (period: 'daily' | 'weekly', segment: 'wash' | 'detailing') => {
    const key = `${period}-${segment}`;
    try {
      setSendingSummaryReport(key);
      const message = await sendOwnerSummaryReport(period, segment);
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось отправить сводный отчёт';
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingSummaryReport(null);
    }
  };

  const handleDeleteSettingsClient = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(`Удалить клиента "${clientName}"? Профиль и доступ в Mini App будут удалены, история записей останется.`);
    if (!confirmed) return;
    try {
      await deleteClient(clientId);
      if (settingsClientId === clientId) setSettingsClientId(null);
      setBottomToast('Клиент удалён');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось удалить клиента');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleSaveClientCard = async (clientId: string, options?: { adminOnly?: boolean }) => {
    const draft = clientCardDrafts[clientId];
    if (!draft) return;
    try {
      setSavingClientId(clientId);
      const draftHasCar = Object.prototype.hasOwnProperty.call(draft, 'car');
      const draftHasPlate = Object.prototype.hasOwnProperty.call(draft, 'plate');
      const draftHasPlateType = Object.prototype.hasOwnProperty.call(draft, 'plateType');
      const draftPlateType = ((draft.plateType || 'russian') as PlateType);
      const draftPlate = draftHasPlate ? normalizePlateInput(draft.plate ?? '', draftPlateType) : undefined;
      let vehicles = draftVehicles[clientId] ?? ownerClientVehicles(clientId);
      if (vehicles && vehicles.length > 0) {
        vehicles = vehicles.map((v, i) => ({ ...v, isMain: v.isMain ?? i === 0 }));
        const mainIdx = Math.max(vehicles.findIndex((v) => v.isMain), 0);
        vehicles = vehicles.map((v, i) =>
          i === mainIdx
            ? {
                ...v,
                car: draftHasCar ? (draft.car ?? '') : (v.car ?? ''),
                plate: draftHasPlate ? draftPlate ?? '' : (v.plate ?? ''),
                plateType: draftHasPlateType ? (draft.plateType || 'russian') : (v.plateType || 'russian'),
              }
            : v,
        );
      }
      await updateClientCard(clientId, options?.adminOnly
        ? { adminRating: draft.adminRating, adminNote: draft.adminNote, referralSource: draft.referralSource }
        : {
          name: draft.name,
          phone: draft.phone,
          car: draftHasCar ? draft.car : undefined,
          plate: draftPlate,
          plateType: draftHasPlateType ? draft.plateType : undefined,
          notes: draft.notes,
          debtBalance: Number(draft.debtBalance || 0),
          adminRating: draft.adminRating,
          adminNote: draft.adminNote,
          referralSource: draft.referralSource,
          ...(vehicles && vehicles.length > 0 ? { vehicles } : {}),
        });
      if (vehicles && vehicles.length > 0) {
        setDraftVehicles((prev) => {
          const next = { ...prev };
          delete next[clientId];
          return next;
        });
      }
      setNewVehicleCar('');
      setNewVehiclePlate('');
      setEditingSettingsClientCard(false);
      setBottomToast('Карточка клиента сохранена');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить карточку клиента');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSavingClientId(null);
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      await saveWorkerSettings(employeeSettings);
      loadPayrollData();
      setBottomToast('Настройки зарплат сохранены');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось сохранить зарплаты');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const loadPayrollData = useCallback(() => {
    if (page !== 'payroll') return;
    if (payrollPeriod === 'custom' && (!payrollDateFrom || !payrollDateTo)) {
      setPayrollData(null);
      return;
    }
    const params = new URLSearchParams({ period: payrollPeriod });
    if (payrollPeriod === 'custom') {
      params.set('date_from', payrollDateFrom);
      params.set('date_to', payrollDateTo);
    }
    apiRequest<Worker[]>(`/api/admin/workers/payroll?${params.toString()}`)
      .then(setPayrollData)
      .catch(() => setPayrollData(null));
  }, [page, payrollPeriod, payrollDateFrom, payrollDateTo]);

  useEffect(() => { loadPayrollData(); }, [loadPayrollData]);

  const refreshSalaryDetail = () => {
    if (!selectedSalaryWorkerId) return;
    if (salaryPeriod === 'custom' && (!salaryDateFrom || !salaryDateTo)) return;
    // Close any open override-earned editor whenever salary data is (re)loaded,
    // so the detail view never stays in edit mode after period/segment changes.
    setEditingOverrideLinkId(null);
    setEditingOverrideValue('');
    setSalaryLoading(true);
    setSalaryError(null);
    const params = new URLSearchParams({ period: salaryPeriod, segment: salarySegment });
    if (salaryPeriod === 'custom') {
      params.set('date_from', salaryDateFrom);
      params.set('date_to', salaryDateTo);
    }
    apiRequest<SalaryDetailResponse>(`/api/owner/workers/${selectedSalaryWorkerId}/salary-detail?${params.toString()}`)
      .then(setSalaryDetail)
      .catch(e => { console.error('salary-detail refresh error:', e); setSalaryError(e?.message || 'Ошибка загрузки данных'); setSalaryDetail(null); })
      .finally(() => setSalaryLoading(false));
  };

  const handleSaveOverrideEarned = async (linkId: number) => {
    if (!linkId) return;
    const value = editingOverrideValue.trim();
    if (value === '') return;
    const num = Math.round(Number(value));
    if (isNaN(num) || num < 0) return;
    try {
      await apiRequest(`/api/payroll/booking-workers/${linkId}/override-earned`, {
        method: 'PUT',
        body: { overrideEarned: num },
      });
      setEditingOverrideLinkId(null);
      setEditingOverrideValue('');
      refreshSalaryDetail();
    } catch {
      setBottomToast('Ошибка при сохранении');
    }
  };

  const handleCancelOverrideEarned = () => {
    setEditingOverrideLinkId(null);
    setEditingOverrideValue('');
  };

  const handleOpenServiceQuickEdit = (svc: Service, sourceBookingId: number) => {
    setServiceEditDraft({ id: svc.id, name: svc.name, category: svc.category, price: svc.price, duration: svc.duration, desc: svc.desc || '', sourceBookingId });
  };

  const handleSaveServiceQuickEdit = async () => {
    if (!serviceEditDraft) return;
    const draft = serviceEditDraft;
    const next = services.map(s => s.id === draft.id
      ? {
          ...s,
          name: draft.name.trim() || s.name,
          category: draft.category,
          resourceGroup: draft.category !== s.category ? serviceResourceGroupForCategory(draft.category) : s.resourceGroup,
          price: Math.max(0, Number(draft.price) || 0),
          duration: Math.max(1, Number(draft.duration) || 1),
          desc: draft.desc,
        }
      : s);
    setServicesState(next);
    try {
      await saveServices(next);
      setServiceEditDraft(null);
      setSalaryDetail(prev => prev ? { ...prev, bookings: prev.bookings.map(b => b.id === draft.sourceBookingId ? { ...b, service: draft.name.trim() || b.service } : b) } : prev);
      setBottomToast('Услуга сохранена');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (e) {
      setBottomToast(e instanceof Error ? e.message : 'Не удалось сохранить услугу');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddBonus = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('Укажите сумму премии');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'bonus',
        amount: Math.round(amount),
        note: bonusNote.trim() || 'Премия',
        period: salaryPeriod,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      setBonusAmount('');
      setBonusNote('');
      setBottomToast(`Премия ${Math.round(amount).toLocaleString('ru')} ₽ для ${salaryDetail.workerName} начислена`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось начислить премию');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddFine = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(fineAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('Укажите сумму штрафа');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'deduction',
        amount: Math.round(amount),
        note: fineNote.trim() || 'Штраф',
        period: salaryPeriod,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      setFineAmount('');
      setFineNote('');
      setBottomToast(`Штраф ${Math.round(amount).toLocaleString('ru')} ₽ для ${salaryDetail.workerName} выписан`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось выписать штраф');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddWriteOff = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(writeOffAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('Укажите сумму списания');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'deduction',
        amount: Math.round(amount),
        note: writeOffNote.trim() || 'Списание',
        period: salaryPeriod,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      setWriteOffAmount('');
      setWriteOffNote('');
      setBottomToast(`Списание ${Math.round(amount).toLocaleString('ru')} ₽ для ${salaryDetail.workerName} проведено`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось провести списание');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntryId || !selectedSalaryWorkerId) return;
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setBottomToast('Укажите корректную сумму');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await apiRequest(`/api/payroll/entries/${editingEntryId}`, {
        method: 'PUT',
        body: { amount: Math.round(amount), note: editNote.trim() },
      });
      setEditingEntryId(null);
      setEditAmount('');
      setEditNote('');
      setBottomToast('Операция обновлена');
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Ошибка обновления');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleDispatchReminders = async () => {
    try {
      setSendingReminders(true);
      const response = await dispatchOwnerReminders({ targetDate: tomorrowLabel, force: true });
      setBottomToast(
        `${response.message} Клиентам: ${response.clientReminders}, мастерам: ${response.workerReminders}, Telegram: ${response.telegramDelivered}.`,
      );
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось отправить напоминания');
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingReminders(false);
    }
  };

  const handleInactiveClientsReminder = async () => {
    try {
      setSendingInactiveReminder(true);
      const message = await remindAdminAboutInactiveClients();
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось отправить задачу админу');
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingInactiveReminder(false);
    }
  };

  const handleAddPenalty = async () => {
    if (!penaltyForm.workerId || !penaltyForm.title || !penaltyForm.reason) return;
    await addPenalty({
      workerId: penaltyForm.workerId,
      title: penaltyForm.title,
      reason: penaltyForm.reason,
    });
    const workerName = workers.find((worker) => worker.id === penaltyForm.workerId)?.name || 'мастер';
    setPenaltyForm({ workerId: penaltyForm.workerId, title: '', reason: '' });
    setBottomToast(`Жалоба сохранена для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokePenalty = async (penaltyId: string, workerName: string) => {
    await revokePenalty(penaltyId);
    setBottomToast(`Жалоба снята досрочно для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokeAllPenalties = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`Снять все активные жалобы у мастера "${workerName}"?`);
    if (!confirmed) return;
    await revokeAllPenalties(workerId);
    setBottomToast(`Все активные жалобы сняты для ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleFireWorker = async (workerId: string, workerName: string) => {
    const employee = employeeSettings.find((item) => item.id === workerId);
    const employeeTitle = employee ? employeeRoleLabel(employee.role) : 'Сотрудник';
    const confirmed = window.confirm(`\u0423\u0432\u043e\u043b\u0438\u0442\u044c \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430 "${workerName}"? \u0414\u043e\u0441\u0442\u0443\u043f \u0431\u0443\u0434\u0435\u0442 \u043e\u0442\u043a\u043b\u044e\u0447\u0451\u043d, \u0430 \u0431\u0443\u0434\u0443\u0449\u0438\u0435 \u0437\u0430\u043f\u0438\u0441\u0438 \u0441\u043d\u0438\u043c\u0443\u0442\u0441\u044f \u0441 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430.`);
    if (!confirmed) return;

    try {
      setEmployeeActionLoading({ type: 'fire', workerId });
      await fireWorker(workerId);
      setBottomToast(`${employeeTitle} ${workerName} \u0443\u0432\u043e\u043b\u0435\u043d`);
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : `\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0432\u043e\u043b\u0438\u0442\u044c ${employeeTitle.toLowerCase()}`);
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setEmployeeActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;
    if (resetPasswordValue.length < 8) {
      setResetPasswordError('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetPasswordError('Пароли не совпадают');
      return;
    }
    try {
      setEmployeeActionLoading({ type: 'reset-password', workerId: resetPasswordTarget.id });
      await resetWorkerPassword(resetPasswordTarget.id, resetPasswordValue);
      setResetPasswordTarget(null);
      setResetPasswordValue('');
      setResetPasswordConfirm('');
      setResetPasswordError('');
      setBottomToast(`Пароль сброшен для ${resetPasswordTarget.name}`);
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setResetPasswordError(error instanceof Error ? error.message : 'Не удалось сбросить пароль');
    } finally {
      setEmployeeActionLoading(null);
    }
  };

  const resetBookingForm = () => {
    setBookingWorkers([]);
    setNotifyBookingWorkers(true);
    const firstSvc = services[0];
    setBookingForm({
      clientId: '',
      clientName: '',
      clientPhone: '',
      car: '',
      plate: '',
      service: firstSvc?.id || 's1',
      date: todayLabel,
      time: '10:00',
      box: '',
      status: 'admin_review',
      paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
      paymentSettled: false,
      price: firstSvc?.price || 0,
      duration: firstSvc?.duration || 30,
    });
  };

  const openBookingForClient = (client: RegisteredClient, status: BookingStatus = 'admin_review') => {
    const historyDate = new Date();
    historyDate.setDate(historyDate.getDate() - 1);
    const firstServiceId = services[0]?.id || 's1';
    const firstSvc = services[0];
    const availableBoxes = ownerBookingBoxes(firstServiceId, services, boxes);
    const defaultBox = availableBoxes[0]?.name || '';
    const clientVehicles = draftVehicles[client.id] ?? (client.vehicles?.length
      ? client.vehicles
      : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]);
    const mainVehicle = clientVehicles.find((v) => v.isMain) ?? clientVehicles[0] ?? {};
    setBookingWorkers([]);
    setNotifyBookingWorkers(true);
    setBookingForm({
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      car: mainVehicle.car || client.car || '',
      plate: mainVehicle.plate || client.plate || '',
      plateType: ((mainVehicle.plateType || client.plateType) as PlateType) || 'russian',
      service: firstServiceId,
      date: status === 'completed' ? formatDate(historyDate) : todayLabel,
      time: '10:00',
      box: status !== 'completed' ? defaultBox : '',
      status,
      paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
      paymentSettled: false,
      price: firstSvc?.price || 0,
      duration: firstSvc?.duration || 30,
    });
    setShowCreateBooking(true);
  };

  const ownerClientVehicles = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return [];
    const source = draftVehicles[client.id] ?? (client.vehicles?.length ? client.vehicles : [{ car: client.car, plate: client.plate, plateType: client.plateType }]);
    return source.filter((vehicle) => vehicle.car || vehicle.plate);
  };
  const ownerClientMainVehicle = (clientId: string) => {
    const vehicles = ownerClientVehicles(clientId);
    return vehicles.find((vehicle) => vehicle.isMain) ?? vehicles[0];
  };
  const ownerNewBookingClientVehicles = ownerClientVehicles(ownerNewBookingForm.clientId);
  const bookingFormClientVehicles = ownerClientVehicles(bookingForm.clientId);

  const handleCreateClient = async () => {
    const nextErrors: { name?: string; phone?: string; car?: string; plate?: string; general?: string } = {};
    const nameError = validatePersonName(createClientForm.name);
    if (nameError) nextErrors.name = nameError;
    // Телефон необязателен — валидируем только если введён
    if (createClientForm.phone.trim()) {
      const phoneError = validatePhoneValue(createClientForm.phone);
      if (phoneError) nextErrors.phone = phoneError;
    }
    if (normalizeVehicleInput(createClientForm.car)) {
      const carError = validateVehicleName(createClientForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(createClientForm.plate, createClientForm.plateType)) {
      const plateError = validatePlateValue(createClientForm.plate, createClientForm.plateType);
      if (plateError) nextErrors.plate = plateError;
    }
    setCreateClientErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setCreateClientSaving(true);
      const created = await addClient({
        name: normalizePersonName(createClientForm.name),
        phone: createClientForm.phone.trim(),
        car: normalizeVehicleInput(createClientForm.car),
        plate: normalizePlateInput(createClientForm.plate, createClientForm.plateType),
        plateType: createClientForm.plateType,
        notes: createClientForm.notes.trim(),
        referralSource: createClientForm.referralSource,
      });
      setCreateClientForm({ name: '', phone: '', car: '', plate: '', plateType: 'russian', notes: '', referralSource: '' });
      setCreateClientErrors({});
      setShowCreateClient(false);
      setBottomToast('Клиент создан. Можно добавить прошлую запись в его историю.');
      setTimeout(() => setBottomToast(null), 3500);
      openBookingForClient(created);
    } catch (error) {
      setCreateClientErrors({
        general: error instanceof Error ? error.message : 'Не удалось создать клиента',
      });
    } finally {
      setCreateClientSaving(false);
    }
  };

  const handleCreateBooking = async () => {
    const svc = services.find((service) => service.id === bookingForm.service);
    const clientName = normalizePersonName(bookingForm.clientName);
    const clientPhone = bookingForm.clientPhone.trim();
    const normalizedCar = normalizeVehicleInput(bookingForm.car);
    const normalizedPlate = normalizePlateInput(bookingForm.plate, bookingForm.plateType);
    if (!clientName) {
      setBottomToast('Укажите имя клиента');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    const requiresScheduledSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(bookingForm.status);
    if (requiresScheduledSlot && !bookingForm.box.trim()) {
      setBottomToast('Для записи на это время укажите помещение');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (requiresScheduledSlot && !bookingForm.date.trim()) {
      setBottomToast('Укажите дату записи');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (requiresScheduledSlot && !bookingForm.time.trim()) {
      setBottomToast('Укажите время записи');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }

    const selectedWorkers = bookingWorkers
      .map((item) => {
        const worker = workers.find((candidate) => candidate.id === item.id);
        return worker ? { workerId: worker.id, workerName: worker.name, percent: item.percent === '' ? 0 : item.percent, payType: item.payType || 'percent', fixedAmount: item.fixedAmount } : null;
      })
      .filter((item): item is { workerId: string; workerName: string; percent: number; payType?: string; fixedAmount?: number } => Boolean(item));

    try {
      const booking = await addBooking({
        clientId: bookingForm.clientId,
        clientName,
        clientPhone,
        service: svc?.name || bookingForm.service,
        serviceId: bookingForm.service,
        date: bookingForm.date.trim(),
        time: bookingForm.time.trim(),
        duration: bookingForm.duration || svc?.duration || 30,
        price: bookingForm.price,
        status: bookingForm.status,        workers: selectedWorkers,
        box: bookingForm.box.trim(),
        paymentType: bookingForm.paymentType,
        paymentSettled: bookingForm.paymentSettled,
        isOutsource: bookingForm.isOutsource,
        outsourceAmount: bookingForm.outsourceAmount,
        car: normalizedCar,
        plate: normalizedPlate,
        plateType: bookingForm.plateType,
        referralSource: bookingForm.referralSource || undefined,
        notifyWorkers: !bookingForm.isOutsource && notifyBookingWorkers && selectedWorkers.length > 0 && bookingForm.status !== 'completed',
      });
      if (bookingForm.status !== 'completed') {
        await addNotification({ recipientRole: 'client', recipientId: booking.clientId, message: `Создана запись на ${svc?.name || bookingForm.service} — ${bookingForm.date} в ${bookingForm.time}`, read: false });
        await addNotification({ recipientRole: 'admin', message: `Новая запись: ${clientName} — ${bookingForm.date} в ${bookingForm.time}`, read: false });
      }
      setShowCreateBooking(false);
      resetBookingForm();
      setBottomToast(bookingForm.status === 'completed' ? 'Прошлая запись добавлена в историю клиента' : 'Запись создана и клиент уведомлён');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'Не удалось создать запись');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  // Quick booking modal helpers (task 9.1)
  const ownerNewBookingMasterWorkers = workers.filter((worker) => worker.role === 'worker' || worker.role === 'owner');
  const ownerNewBookingSelectableDates = Array.from(new Set([
    todayLabel,
    tomorrowLabel,
    ...upcomingDates.slice(0, 7),
    ...bookings.map((booking) => booking.date).filter(Boolean),
  ])).slice(0, 10);
  const ownerNewBookingLocationLabel = ownerLocationLabel(ownerNewBookingForm.serviceId, services);
  const totalOwnerNewBookingPercent = ownerNewBookingWorkers.reduce((sum, worker) => sum + (worker.percent === '' ? 0 : worker.percent), 0);

  const resetOwnerNewBookingDraft = () => {
    setOwnerNewBookingSaveSuccess(null);
    setOwnerNewBookingSaving(false);
    setOwnerNewBookingErrors({});
    setOwnerNewBookingError(null);
setOwnerNewBookingWorkers([]);
    setOwnerNewBookingMaterials([]);
    setOwnerNewBookingForm({
      clientId: '',
      clientName: '',
      clientPhone: '',
      service: '',
      serviceId: '',
      date: '',
      time: '',
      box: '',
      price: 0,
      duration: 30,
      car: '',
      plate: '',
      plateType: 'russian' as PlateType,
      notes: '',
      status: 'admin_review',
      paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
      paymentSettled: false,
      isOutsource: false,
      outsourceAmount: 0,
      referralSource: '',
    });
  };

  const closeOwnerNewBookingModal = () => {
    setShowOwnerNewBooking(false);
    resetOwnerNewBookingDraft();
  };

  const validateOwnerNewBookingForm = () => {
    const nextErrors: { clientName?: string; clientPhone?: string; car?: string; plate?: string; date?: string; time?: string; general?: string } = {};
    if (normalizePersonName(ownerNewBookingForm.clientName)) {
      const nameError = validatePersonName(ownerNewBookingForm.clientName);
      if (nameError) nextErrors.clientName = nameError;
    }
    if (ownerNewBookingForm.clientPhone.trim()) {
      const phoneError = validatePhoneValue(ownerNewBookingForm.clientPhone);
      if (phoneError) nextErrors.clientPhone = phoneError;
    }
    if (normalizeVehicleInput(ownerNewBookingForm.car)) {
      const carError = validateVehicleName(ownerNewBookingForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(ownerNewBookingForm.plate, ownerNewBookingForm.plateType)) {
      const plateError = validatePlateValue(ownerNewBookingForm.plate, ownerNewBookingForm.plateType);
      if (plateError) nextErrors.plate = plateError;
    }
    const hasDate = Boolean(ownerNewBookingForm.date.trim());
    const hasTime = Boolean(ownerNewBookingForm.time.trim());
    const requiresScheduledSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerNewBookingForm.status);
    if (requiresScheduledSlot) {
      if (!hasDate) nextErrors.date = 'Укажите дату записи';
      if (!hasTime) nextErrors.time = 'Укажите время записи';
    } else if (ownerNewBookingForm.status !== 'completed' && (hasDate || hasTime)) {
      if (!hasDate) nextErrors.date = 'Укажите дату или очистите дату и время';
      else if (!hasTime) nextErrors.time = 'Укажите время или очистите дату и время';
    }
    if (requiresScheduledSlot && !ownerNewBookingForm.box.trim()) nextErrors.general = 'Укажите помещение для записи';
    setOwnerNewBookingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveOwnerNewBooking = async (notify: boolean) => {
    setOwnerNewBookingErrors({});
    setOwnerNewBookingError(null);
    if (!validateOwnerNewBookingForm()) return;
    const svc = services.find((s) => s.id === ownerNewBookingForm.serviceId);
    const normalizedClientName = normalizePersonName(ownerNewBookingForm.clientName);
    const normalizedCar = normalizeVehicleInput(ownerNewBookingForm.car);
    const normalizedPlate = normalizePlateInput(ownerNewBookingForm.plate, ownerNewBookingForm.plateType);
    const hasDateTime = Boolean(ownerNewBookingForm.date.trim() && ownerNewBookingForm.time.trim());
    const parsedDate = hasDateTime ? parseFlexibleDate(ownerNewBookingForm.date.trim()) : null;
    if (hasDateTime && !parsedDate) {
      setOwnerNewBookingErrors({ date: 'Укажите дату в формате ДД.ММ.ГГГГ' });
      return;
    }
    const clientLabel = normalizedClientName || 'Клиент без имени';
    const carLabel = [normalizedCar, normalizedPlate].filter(Boolean).join(', ') || 'Авто не указано';
    const createdWorkers = ownerNewBookingWorkers.map((item) => {
      const worker = ownerNewBookingMasterWorkers.find((candidate) => candidate.id === item.id);
      return { workerId: item.id, workerName: worker?.name || '', percent: item.percent === '' ? 0 : item.percent, payType: item.payType || 'percent', fixedAmount: item.fixedAmount };
    });
    const normalizedDate = parsedDate ? formatDate(parsedDate) : '';
    try {
      setOwnerNewBookingSaving(true);
      await addBooking({
        clientId: ownerNewBookingForm.clientId,
        clientName: normalizedClientName,
        clientPhone: ownerNewBookingForm.clientPhone.trim(),
        service: svc?.name || ownerNewBookingForm.service,
        serviceId: ownerNewBookingForm.serviceId,
        date: normalizedDate,
        time: ownerNewBookingForm.time.trim(),
        duration: ownerNewBookingForm.duration || svc?.duration || 30,
        price: ownerNewBookingForm.price,
        status: ownerNewBookingForm.status,
        workers: createdWorkers,
        box: ownerNewBookingForm.box.trim() || 'По согласованию',
        paymentType: ownerNewBookingForm.paymentType,
        paymentSettled: ownerNewBookingForm.paymentSettled,
        isOutsource: ownerNewBookingForm.isOutsource,
        outsourceAmount: ownerNewBookingForm.outsourceAmount,
        car: normalizedCar,
        plate: normalizedPlate,
        plateType: ownerNewBookingForm.plateType,
        notes: ownerNewBookingForm.notes,
        referralSource: ownerNewBookingForm.referralSource || undefined,
        notifyWorkers: !ownerNewBookingForm.isOutsource && notify,
        materials: ownerNewBookingMaterials.map(m => ({
          ...m,
          qty: typeof m.qty === 'string' ? (parseFloat(m.qty) || 0) : m.qty,
          id: '',
        })),
      });
      const requestScheduleLabel = hasDateTime
        ? `${normalizedDate} ${ownerNewBookingForm.time.trim()}`
        : 'без даты и времени';
      await addNotification({ recipientRole: 'owner', message: `${clientLabel} • ${carLabel} • ${requestScheduleLabel}`, read: false });
      await addNotification({ recipientRole: 'admin', message: `Новая запись: ${clientLabel} • ${requestScheduleLabel}`, read: false });
      setOwnerNewBookingSaveSuccess(notify ? 'notify' : 'silent');
      setTimeout(() => {
        closeOwnerNewBookingModal();
      }, 1800);
    } catch (error) {
      setOwnerNewBookingErrors({
        general: error instanceof Error ? error.message : 'Не удалось сохранить запись',
      });
    } finally {
      setOwnerNewBookingSaving(false);
    }
  };

  const validateOwnerEditSlot = (
    dateValue: string,
    timeValue: string,
    durationMinutes: number,
  ): { date?: string; time?: string } => {
    const nextErrors: { date?: string; time?: string } = {};
    const parsedDate = parseFlexibleDate(dateValue.trim());
    if (!parsedDate) {
      nextErrors.date = 'Укажите дату в формате ДД.ММ.ГГГГ';
      return nextErrors;
    }
    const scheduleDay = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
    if (!scheduleDay || !scheduleDay.active) {
      nextErrors.date = 'На выбранную дату запись недоступна';
    }
    const slotStart = parseOwnerBookingMinutes(timeValue.trim());
    if (slotStart === null) {
      nextErrors.time = 'Укажите время в формате ЧЧ:ММ';
      return nextErrors;
    }
    if (!nextErrors.date && scheduleDay) {
      const openMinutes = parseOwnerBookingMinutes(scheduleDay.open);
      const closeMinutes = parseOwnerBookingMinutes(scheduleDay.close);
      const slotEnd = slotStart + Math.max(1, durationMinutes);
      if (openMinutes === null || closeMinutes === null) {
        nextErrors.time = 'Для этого дня не настроены часы работы';
      } else if (slotStart < openMinutes || slotEnd > closeMinutes) {
        nextErrors.time = `Рабочее время: ${scheduleDay.open}-${scheduleDay.close}`;
      }
    }
    return nextErrors;
  };

  const openOwnerFullEditMode = (initialStatus?: BookingStatus) => {
    if (!selectedBooking) return;
    setOwnerBookingEditMode('full');
    setOwnerBookingEditError(null);
    setOwnerBookingEditFull({
      status: initialStatus || selectedBooking.status,
      date: selectedBooking.date || todayLabel,
      time: selectedBooking.time || '10:00',
      box: selectedBooking.box || boxes[0]?.name || 'Бокс 1',
      notes: selectedBooking.notes || '',
      car: selectedBooking.car || '',
      plate: selectedBooking.plate || '',
      plateType: (selectedBooking.plateType as PlateType) || 'russian',
      clientName: selectedBooking.clientName || '',
      clientPhone: selectedBooking.clientPhone || '',
      paymentType: selectedBooking.paymentType || 'cash',
      paymentSettled: selectedBooking.paymentSettled ?? false,
      serviceId: selectedBooking.serviceId || '',
      price: Math.max(0, selectedBooking.price - (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0) - (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0)),
      duration: selectedBooking.duration,
    });
  };

  const handleSaveOwnerBookingEdit = async () => {
    if (!selectedBooking || !ownerBookingEditMode) return;
    setOwnerBookingEditSaving(true);
    setOwnerBookingEditError(null);
    try {
      let patch: Record<string, unknown> = {};
      if (ownerBookingEditMode === 'full') {
        const editServiceId = ownerBookingEditFull.serviceId || selectedBooking.serviceId;
        const svc = services.find(s => s.id === editServiceId);
        const isDetailing = svc?.category === 'Детейлинг';
        const requiresScheduledSlot = !isDetailing || ownerBookingEditFull.status !== 'admin_review';
        const slotChanged = ownerBookingEditFull.date !== selectedBooking.date
          || ownerBookingEditFull.time !== selectedBooking.time
          || ownerBookingEditFull.duration !== selectedBooking.duration;
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerBookingEditFull.status);
        if (slotChanged || statusNeedsSlot) {
          const slotErrors = validateOwnerEditSlot(ownerBookingEditFull.date, ownerBookingEditFull.time, ownerBookingEditFull.duration);
          if (slotErrors.date || slotErrors.time) {
            setOwnerBookingEditError(slotErrors.date || slotErrors.time || 'Проверьте дату и время');
            return;
          }
        }
        if (requiresScheduledSlot && !ownerBookingEditFull.box.trim()) {
          setOwnerBookingEditError('Укажите бокс для записи');
          return;
        }
        patch = {
          status: ownerBookingEditFull.status,
          date: requiresScheduledSlot ? ownerBookingEditFull.date.trim() : '',
          time: requiresScheduledSlot ? ownerBookingEditFull.time.trim() : '',
          box: requiresScheduledSlot ? ownerBookingEditFull.box.trim() : 'По согласованию',
          notes: ownerBookingEditFull.notes.trim() || undefined,
          car: ownerBookingEditFull.car.trim() || undefined,
          plate: normalizePlateInput(ownerBookingEditFull.plate, ownerBookingEditFull.plateType) || undefined,
          plateType: ownerBookingEditFull.plateType,
          clientName: ownerBookingEditFull.clientName.trim() || undefined,
          clientPhone: ownerBookingEditFull.clientPhone.trim() || undefined,
          paymentType: ownerBookingEditFull.paymentType,
          paymentSettled: ownerBookingEditFull.paymentSettled,
          serviceId: ownerBookingEditFull.serviceId || undefined,
          price: Math.max(0, (ownerBookingEditFull.price || 0) + (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0) + (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0)),
        };
      } else if (ownerBookingEditMode === 'status') {
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerBookingEditStatus);
        if (statusNeedsSlot && (!selectedBooking.date || !selectedBooking.time)) {
          setOwnerBookingEditError('Для этого статуса нужны дата и время — укажите их в режиме «Полное»');
          openOwnerFullEditMode(ownerBookingEditStatus);
          return;
        }
        patch = { status: ownerBookingEditStatus, ...(ownerBookingEditStatus === 'completed' ? { paymentSettled: true } : {}) };
      } else if (ownerBookingEditMode === 'price') {
        const price = Number(ownerBookingEditPrice);
        if (isNaN(price) || price < 0) {
          setOwnerBookingEditError('Введите корректную цену');
          return;
        }
        patch = { price };
      } else if (ownerBookingEditMode === 'workers') {
        patch = {
          workers: ownerBookingEditWorkers.map(w => {
            const worker = workers.find(wk => wk.id === w.id);
            return { workerId: w.id, workerName: worker?.name || '', percent: w.percent === '' ? 0 : w.percent, payType: w.payType || 'percent', fixedAmount: w.fixedAmount };
          }),
        };
      } else if (ownerBookingEditMode === 'datetime') {
        if (!ownerBookingEditDate || !parseFlexibleDate(ownerBookingEditDate)) {
          setOwnerBookingEditError('Введите корректную дату');
          return;
        }
        const slotChanged = ownerBookingEditDate !== selectedBooking.date || ownerBookingEditTime !== selectedBooking.time;
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(selectedBooking.status);
        if (slotChanged || statusNeedsSlot) {
          const slotErrors = validateOwnerEditSlot(ownerBookingEditDate, ownerBookingEditTime, selectedBooking.duration);
          if (slotErrors.date || slotErrors.time) {
            setOwnerBookingEditError(slotErrors.date || slotErrors.time || 'Проверьте дату и время');
            return;
          }
        }
        patch = { date: ownerBookingEditDate, time: ownerBookingEditTime };
      }
      await updateBooking(selectedBooking.id, patch);
      setSelectedBooking(prev => prev ? {
        ...prev,
        ...patch,
        service: patch.serviceId ? (services.find(s => s.id === patch.serviceId)?.name || prev.service) : prev.service,
        price: patch.serviceId ? Math.max(0, (ownerBookingEditFull.price || 0) + (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0) + (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0)) : prev.price,
        duration: patch.serviceId ? (ownerBookingEditFull.duration || prev.duration) : prev.duration,
      } as typeof prev : null);
      setOwnerBookingEditMode(null);
    } catch (error) {
      setOwnerBookingEditError(error instanceof Error ? error.message : 'Не удалось сохранить изменения');
    } finally {
      setOwnerBookingEditSaving(false);
    }
  };

  const handleDeleteOwnerBooking = () => {
    if (!selectedBooking) return;
    const name = selectedBooking.clientName || `запись #${selectedBooking.id.slice(0, 6)}`;
    if (!window.confirm(`Удалить запись клиента "${name}"? Это действие нельзя отменить.`)) return;
    deleteBooking(selectedBooking.id);
    setShowBookingDetail(false);
    setSelectedBooking(null);
  };

  const handleOpenOwnerAddService = () => {
    setOwnerAddServiceDraft({ serviceId: '', price: 0, duration: 30, priceMode: 'add', isOutsource: false, outsourceAmount: 0 });
    setOwnerAddServiceWorkers([]);
    setOwnerAddServiceError(null);
    setOwnerAddServiceSaving(false);
    setShowOwnerAddService(true);
  };

  const handleAddOwnerService = async () => {
    if (!selectedBooking) return;
    setOwnerAddServiceSaving(true);
    setOwnerAddServiceError(null);
    try {
      const svc = liveServices.find(s => s.id === ownerAddServiceDraft.serviceId);
      const workersList = ownerAddServiceWorkers.map(w => {
        const worker = workers.find(wk => wk.id === w.id);
        return { workerId: w.id, workerName: worker?.name || '', percent: w.percent === '' ? 0 : w.percent as number, payType: w.payType || 'percent', fixedAmount: w.fixedAmount };
      });
      const updatedBooking = await addBookingAdditionalService(selectedBooking.id, {
        serviceId: ownerAddServiceDraft.serviceId,
        name: svc?.name || 'Доп. услуга',
        price: ownerAddServiceDraft.price,
        duration: ownerAddServiceDraft.duration,
        priceMode: ownerAddServiceDraft.priceMode,
        isOutsource: ownerAddServiceDraft.isOutsource,
        outsourceAmount: ownerAddServiceDraft.isOutsource ? ownerAddServiceDraft.outsourceAmount : 0,
        workers: ownerAddServiceDraft.isOutsource ? [] : workersList,
      });
      setSelectedBooking(updatedBooking);
      setShowOwnerAddService(false);
    } catch (err: any) {
      setOwnerAddServiceError(err?.detail || err?.message || 'Ошибка при добавлении услуги');
    } finally {
      setOwnerAddServiceSaving(false);
    }
  };

  const handleOpenOwnerEditAsvc = (asvc: AdditionalService) => {
    setOwnerEditAsvcId(asvc.id);
    setOwnerEditAsvcDraft({ price: asvc.price, duration: asvc.duration, priceMode: asvc.priceMode || 'add', isOutsource: !!asvc.isOutsource, outsourceAmount: asvc.outsourceAmount || 0 });
    setOwnerEditAsvcWorkers(asvc.workers.map(w => ({ id: w.workerId, percent: w.percent, payType: w.payType || 'percent', fixedAmount: w.fixedAmount })));
    setOwnerEditAsvcError(null);
    setOwnerEditAsvcSaving(false);
  };

  const handleSaveOwnerEditAsvc = async () => {
    if (!selectedBooking || !ownerEditAsvcId) return;
    setOwnerEditAsvcSaving(true);
    setOwnerEditAsvcError(null);
    try {
      const workersList = ownerEditAsvcWorkers.map(w => {
        const worker = workers.find(wk => wk.id === w.id);
        return { workerId: w.id, workerName: worker?.name || '', percent: w.percent === '' ? 0 : w.percent as number, payType: w.payType || 'percent', fixedAmount: w.fixedAmount };
      });
      const updatedBooking = await updateBookingAdditionalService(selectedBooking.id, ownerEditAsvcId, {
        price: ownerEditAsvcDraft.price,
        duration: ownerEditAsvcDraft.duration,
        priceMode: ownerEditAsvcDraft.priceMode,
        isOutsource: ownerEditAsvcDraft.isOutsource,
        outsourceAmount: ownerEditAsvcDraft.isOutsource ? ownerEditAsvcDraft.outsourceAmount : 0,
        workers: ownerEditAsvcDraft.isOutsource ? [] : workersList,
      });
      setSelectedBooking(updatedBooking);
      setOwnerEditAsvcId(null);
    } catch (err: any) {
      setOwnerEditAsvcError(err?.detail || err?.message || 'Ошибка при сохранении услуги');
    } finally {
      setOwnerEditAsvcSaving(false);
    }
  };

  const kpiCards = [
    {
      label: 'Выручка сегодня',
      value: `${todayRevenue.toLocaleString('ru')} ₽`,
      icon: TrendingUp,
      color: primary,
      action: () => setKpiModal({
        kind: 'bookings',
        title: 'Выручка сегодня',
        color: primary,
        totalLabel: 'выручка за сегодня',
        total: todayRevenue,
        bookings: todayBookings.filter(b => b.status === 'completed'),
      }),
    },
    {
      label: 'Расходы за неделю',
      value: `${totalExpenses.toLocaleString('ru')} ₽`,
      icon: DollarSign,
      color: '#FF6B6B',
      action: () => setKpiModal({
        kind: 'expenses',
        title: 'Расходы за неделю',
        color: '#FF6B6B',
        total: totalExpenses,
        expenses: [...weeklyExpenses].sort((a, b) => b.date.localeCompare(a.date)),
      }),
    },
    {
      label: 'Прибыль за неделю',
      value: `${Math.abs(profit).toLocaleString('ru')} ₽${profit < 0 ? ' (убыток)' : ''}`,
      icon: BarChart3,
      color: profit >= 0 ? accent : '#FF6B6B',
      action: () => setKpiModal({
        kind: 'finance',
        title: 'Прибыль за неделю',
        color: profit >= 0 ? accent : '#FF6B6B',
        revenue: totalRevenue,
        incomes: totalIncomes,
        expenses: totalExpenses,
        profit,
      }),
    },
    {
      label: 'На уточнении',
      value: pipelineCounts.adminReview,
      icon: Users,
      color: '#F59E0B',
      action: () => setShowStatusList('admin_review'),
    },
  ];

  const byService = services
    .map(service => ({
      name: service.name.split(' ')[0],
      revenue: weeklyCompletedBookings.filter(booking => booking.serviceId === service.id).reduce((sum, booking) => sum + booking.price, 0),
      count: weeklyCompletedBookings.filter(booking => booking.serviceId === service.id).length,
    }))
    .filter(service => service.count > 0);
  const revenueWeek = getLastNDates(7).map((date) => {
    const formatted = formatDate(date);
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', ''),
      revenue: bookings.filter((booking) => booking.date === formatted && booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0),
      expenses: expenses.filter((expense) => expense.date === formatted).reduce((sum, expense) => sum + expense.amount, 0),
    };
  });

  const statusData = [
    { name: 'Новые', status: 'new' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'new').length, color: '#6366F1' },
    { name: 'Подтверждены', status: 'confirmed' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'confirmed').length, color: '#06B6D4' },
    { name: 'Запланировано', status: 'scheduled' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'В работе', status: 'in_progress' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'in_progress').length, color: '#EAB308' },
    { name: 'Завершено', status: 'completed' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'completed').length, color: '#22C55E' },
    { name: 'Не приехал', status: 'no_show' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'no_show').length, color: '#F97316' },
  ].filter(s => s.value > 0);
  const topServiceName = [...byService].sort((left, right) => right.revenue - left.revenue)[0]?.name || 'Нет данных';
  const ownerCalendarRelevantBookings = bookings.filter((booking) => Boolean(booking.date?.trim()) && booking.status !== 'cancelled');
  const ownerCalendarBookingsByDate = ownerCalendarRelevantBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
    const dateLabel = booking.date.trim();
    acc[dateLabel] = [...(acc[dateLabel] || []), booking];
    return acc;
  }, {});
  Object.values(ownerCalendarBookingsByDate).forEach((dayBookings) => {
    dayBookings.sort((left, right) => left.time.localeCompare(right.time));
  });
  const ownerCalendarMonthCells = ownerBuildMonthCells(ownerCalendarMonth);
  const ownerCalendarMonthLabel = ownerMonthTitle(ownerCalendarMonth);
  const ownerCalendarMonthLoads = ownerCalendarMonthCells
    .filter((cell) => cell.dateLabel)
    .map((cell) => ownerCalendarBookingsByDate[cell.dateLabel]?.length || 0);
  const ownerCalendarMonthMaxLoad = Math.max(1, ...ownerCalendarMonthLoads, 0);
  const calendarBookings = (ownerCalendarBookingsByDate[selectedCalendarDate] || [])
    .slice()
    .sort((left, right) => left.time.localeCompare(right.time));
  const ownerCalendarSelectedDayHours = ownerCalendarDayHours(schedule, selectedCalendarDate);
  const ownerCalendarHourSlots = ownerGroupBookingsByHour(
    calendarBookings,
    ownerCalendarSelectedDayHours.open,
    ownerCalendarSelectedDayHours.close,
  );
  const ownerCalendarUntimedBookings = calendarBookings.filter((booking) => parseOwnerBookingMinutes(booking.time) === null);
  const ownerCalendarSelectedDayTitle = parseFlexibleDate(selectedCalendarDate)?.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }) || selectedCalendarDate;
  const ownerCalendarLoadColors = OWNER_CALENDAR_LOAD_COLORS;
  const boxLoadData = boxes
    .filter((box) => box.active)
    .map((box) => {
      const weeklyBoxBookings = weeklyCompletedBookings.filter((booking) => booking.box === box.name);
      return {
        name: box.name,
        count: weeklyBoxBookings.length,
        revenue: weeklyBoxBookings.reduce((sum, booking) => sum + booking.price, 0),
      };
      });
  const workerEfficiencyData = workers
    .filter((worker) => worker.active)
    .map((worker) => {
      const workerBookings = weeklyCompletedBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
      const workerRevenue = workerBookings.reduce((sum, booking) => sum + booking.price, 0);
      return {
        id: worker.id,
        name: worker.name,
        completed: workerBookings.length,
        revenue: workerRevenue,
        averageCheck: workerBookings.length > 0 ? Math.round(workerRevenue / workerBookings.length) : 0,
      };
    })
    .sort((left, right) => right.revenue - left.revenue);
  const clientInsights = clients.map((client) => {
    const clientBookings = bookings.filter((booking) => booking.clientId === client.id);
    const clientCompleted = clientBookings.filter((booking) => booking.status === 'completed');
    const favoriteServiceEntry = Object.entries(
      clientCompleted.reduce<Record<string, number>>((acc, booking) => {
        acc[booking.service] = (acc[booking.service] || 0) + 1;
        return acc;
      }, {}),
    ).sort((left, right) => right[1] - left[1])[0];
    return {
      ...client,
      visits: clientCompleted.length,
      totalSpent: clientCompleted.reduce((sum, booking) => sum + booking.price, 0),
      activeCount: clientBookings.filter((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status)).length,
      favoriteService: favoriteServiceEntry?.[0] || 'Нет данных',
      lastVisit: clientCompleted[0]?.date || clientBookings[0]?.date || 'Пока нет',
    };
  }).sort((left, right) => right.totalSpent - left.totalSpent);
  const filteredClientInsights = clientInsights.filter((client) => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return true;
    return [client.name, client.phone, client.car, client.plate, client.favoriteService].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  const filteredSettingsClients = clients.filter((client) => {
    if (!settingsClientSearchQuery.trim()) return true;
    if (settingsClientSearchMode === 'phone') {
      const normalized = normalizeOwnerPhoneSearchValue(settingsClientSearchQuery);
      return normalizeOwnerPhoneSearchValue(client.phone).includes(normalized);
    }
    if (settingsClientSearchMode === 'plate') {
      const normalized = normalizePlateInput(settingsClientSearchQuery);
      if (!normalized) return false;
      const plates = [
        client.plate,
        ...(client.vehicles || []).map((vehicle) => vehicle.plate),
      ]
        .map((plate) => normalizePlateInput(plate || ''))
        .filter(Boolean);
      return plates.some((plate) => plate.includes(normalized));
    }
    const query = settingsClientSearchQuery.trim().toLowerCase();
    return client.name.toLowerCase().includes(query);
  });
  const selectedSettingsClient = clients.find((client) => client.id === settingsClientId) ?? null;
  const selectedSettingsClientCardDraft = selectedSettingsClient ? clientCardDrafts[selectedSettingsClient.id] : undefined;
  const selectedSettingsClientBookings = selectedSettingsClient
    ? bookings
      .filter((booking) => booking.clientId === selectedSettingsClient.id)
      .sort((left, right) => {
        const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
        const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
        if (rightDate !== leftDate) return rightDate - leftDate;
        return right.time.localeCompare(left.time);
      })
    : [];
  const selectedSettingsClientFilteredBookings = selectedSettingsClientBookings.filter((booking) => {
    if (!clientHistoryServiceFilter) return true;
    const svc = services.find((s) => s.id === clientHistoryServiceFilter);
    if (!svc) return true;
    return booking.serviceId === svc.id || booking.service === svc.name;
  });
  const selectedSettingsClientVehicles = selectedSettingsClient
    ? (draftVehicles[selectedSettingsClient.id] ?? (selectedSettingsClient.vehicles?.length
      ? selectedSettingsClient.vehicles
      : [{ car: selectedSettingsClient.car || '', plate: selectedSettingsClient.plate || '', plateType: selectedSettingsClient.plateType || 'russian' }]))
    : [];
  const selectedSettingsClientSpent = selectedSettingsClientBookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + booking.price, 0);
  const selectedSettingsClientCompletedCount = selectedSettingsClientBookings.filter((booking) => booking.status === 'completed').length;
  const selectedSettingsClientUpcoming = selectedSettingsClientBookings.find((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const selectedSettingsClientLastVisit = selectedSettingsClientBookings.find((booking) => booking.status === 'completed');

  const ownerStatusLabel = (status: string) => ({
    new: 'Новая',
    confirmed: 'Подтв.',
    scheduled: 'Запл.',
    in_progress: 'В работе',
    completed: 'Завершено',
    no_show: 'Не приехал',
    admin_review: 'Уточнение',
    cancelled: 'Отменена',
  }[status] || status);

  const ownerStatusBadge = (status: string) => ({
    new: 'bg-indigo-500/15 text-indigo-600',
    confirmed: 'bg-cyan-500/15 text-cyan-600',
    scheduled: 'bg-blue-500/15 text-blue-600',
    in_progress: 'bg-yellow-500/15 text-yellow-600',
    completed: 'bg-green-500/15 text-green-600',
    no_show: 'bg-orange-500/15 text-orange-600',
    admin_review: 'bg-amber-500/15 text-amber-600',
    cancelled: 'bg-red-500/15 text-red-500',
  }[status] || 'bg-slate-500/15 text-slate-600');

  const ownerStatusColor = (status: string) => ({
    new: 'bg-indigo-500',
    confirmed: 'bg-cyan-500',
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    no_show: 'bg-orange-500',
    admin_review: 'bg-amber-500',
    cancelled: 'bg-red-500',
  }[status] || 'bg-slate-500');

  const piggyBankLabel = (key: string) => ({
    wash: 'копилка мойки',
    detailing: 'копилка детейлинга',
    self_service: 'копилка самообслуживания',
    general: 'общая копилка',
  }[key] || (key ? `копилка «${key}»` : 'копилка'));

  const SwitchToggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="w-11 h-6 rounded-full relative transition-all shrink-0"
      style={{ background: value ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  );

  // Подпись источника записи: «Бот» / «Google» / «Вручную» (общий компонент SourceBadge).

  const SettingRow = ({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: () => void }) => (
    <div className={`${glass} rounded-xl p-4 mb-2 flex items-center justify-between`}>
      <div className="flex-1 mr-3">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className={`text-xs ${sub}`}>{desc}</div>}
      </div>
      <SwitchToggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className={`${isDark ? 'dark' : ''} atmosfera-shell ${bg} ${text} min-h-screen flex flex-col`} data-owner-build="2026-04-03-5">
      {/* Header */}
      <div className={`work-header ${glass} flex items-center justify-between`}>
        <div>
          <div className="font-semibold text-sm">{financeRoleTitle}</div>
          <div className={`text-xs ${sub}`}>ATMOSFERA</div>
        </div>
        <div className="flex items-center gap-1.5">
          {staffProfile?.extraRoles && staffProfile.extraRoles.length > 0 && (
            <div className="relative">
              <button onClick={() => {
                const nextRole = staffProfile.extraRoles?.find(r => r !== session?.role) || staffProfile.role;
                if (nextRole && nextRole !== session?.role) {
                  void switchRole(nextRole as Role);
                }
              }} className={`px-2 py-1.5 rounded-xl text-xs font-medium ${glass}`} style={{ color: primary }}>
                {session?.role === 'owner' ? 'Владелец → Админ' : session?.role === 'admin' ? 'Админ → Владелец' : 'Сменить роль'}
              </button>
            </div>
          )}
          <button onClick={() => { setShowNotifications(true); markAllNotificationsRead(financeNotificationRole); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={() => setShowFinancePanel(true)} className={`p-2 rounded-xl ${glass}`}><Wallet size={18} /></button>
          <button onClick={() => setShowOwnerNewBooking(true)} className="p-2 rounded-xl text-white" style={{ background: primary }}><Plus size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* ── CALENDAR ── */}
          {page === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {ownerCalendarView === 'month' ? (
                <>
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setOwnerCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                        className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                        aria-label="Предыдущий месяц"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="text-center min-w-0">
                        <div className="font-semibold">{ownerCalendarMonthLabel}</div>
                        <div className={`text-xs ${sub} mt-0.5`}>Нажмите на день, чтобы открыть расписание по часам</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOwnerCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                        className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                        aria-label="Следующий месяц"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const today = parseFlexibleDate(todayLabel) || new Date();
                        setOwnerCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                        setSelectedCalendarDate(todayLabel);
                        setOwnerCalendarView('day');
                      }}
                      className="w-full mb-4 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: `${primary}18`, color: primary }}
                    >
                      Сегодня · {todayLabel}
                    </button>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {OWNER_CALENDAR_WEEKDAYS.map((weekday) => (
                        <div key={weekday} className={`text-center text-[11px] font-medium ${sub} py-1`}>{weekday}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {ownerCalendarMonthCells.map((cell, index) => {
                        if (!cell.date || !cell.dateLabel) {
                          return <div key={`empty-${index}`} className="aspect-square" />;
                        }
                        const dayBookings = ownerCalendarBookingsByDate[cell.dateLabel] || [];
                        const loadTone = ownerCalendarLoadTone(dayBookings.length, ownerCalendarMonthMaxLoad);
                        const loadWidth = dayBookings.length > 0
                          ? `${Math.max(24, Math.round((dayBookings.length / ownerCalendarMonthMaxLoad) * 100))}%`
                          : '100%';
                        const isToday = cell.dateLabel === todayLabel;
                        return (
                          <button
                            key={cell.dateLabel}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarDate(cell.dateLabel);
                              setOwnerCalendarView('day');
                            }}
                            className={`aspect-square rounded-xl p-1.5 flex flex-col items-stretch text-left transition-transform active:scale-[0.98] border ${
                              isToday ? 'border-2' : 'border-transparent'
                            }`}
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              borderColor: isToday ? primary : 'transparent',
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-sm font-semibold ${isToday ? '' : ''}`} style={isToday ? { color: primary } : undefined}>
                                {cell.date.getDate()}
                              </span>
                              {dayBookings.length > 0 && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white min-w-[18px] text-center"
                                  style={{ background: ownerCalendarLoadColors[loadTone] }}
                                >
                                  {dayBookings.length}
                                </span>
                              )}
                            </div>
                            <div className="mt-auto pt-2">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: loadWidth,
                                  background: ownerCalendarLoadColors[loadTone],
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Загруженность</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {[
                        { tone: 'empty' as const, label: 'Нет нагрузки' },
                        { tone: 'medium' as const, label: 'Средняя' },
                        { tone: 'heavy' as const, label: 'Высокая' },
                      ].map((item) => (
                        <div key={item.tone} className="flex items-center gap-2">
                          <span className="w-8 h-2 rounded-full" style={{ background: ownerCalendarLoadColors[item.tone] }} />
                          <span className={sub}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setOwnerCalendarView('month')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                    >
                      <ArrowLeft size={16} />
                      Месяц
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCalendarDate(todayLabel);
                        const today = parseFlexibleDate(todayLabel) || new Date();
                        setOwnerCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                      }}
                      className="px-3 py-2 rounded-xl text-sm"
                      style={{ background: `${primary}18`, color: primary }}
                    >
                      Сегодня
                    </button>
                  </div>
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <h2 className="font-semibold capitalize">{ownerCalendarSelectedDayTitle}</h2>
                        <div className={`text-sm ${sub} mt-1`}>
                          {calendarBookings.length} {calendarBookings.length === 1 ? 'запись' : calendarBookings.length < 5 ? 'записи' : 'записей'}
                          {` · ${Math.floor(ownerCalendarSelectedDayHours.open / 60)}:00–${Math.floor(ownerCalendarSelectedDayHours.close / 60)}:00`}
                        </div>
                      </div>
                      <CalendarDays size={22} style={{ color: primary }} />
                    </div>
                  </div>
                  {calendarBookings.length === 0 ? (
                    <div className={`${glass} rounded-2xl p-8 text-center`}>
                      <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                      <p className={sub}>На этот день записей нет</p>
                    </div>
                  ) : (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        {ownerCalendarHourSlots.map((slot) => (
                          <div key={slot.hourLabel} className="flex gap-3 py-2 first:pt-0 last:pb-0">
                            <div className={`w-10 shrink-0 pt-0.5 text-[11px] font-medium tabular-nums ${sub}`}>
                              {slot.hourLabel}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              {slot.bookings.map((booking) => (
                                <button
                                  key={booking.id}
                                  type="button"
                                  onClick={() => ownerOpenBookingDetail(booking, setSelectedBooking, setShowBookingDetail)}
                                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left min-w-0 ${
                                    isDark ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'bg-black/[0.03] hover:bg-black/[0.05]'
                                  }`}
                                >
                                  <span className={`w-0.5 self-stretch rounded-full shrink-0 ${ownerStatusColor(booking.status)}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">
                                      <span className="tabular-nums">{booking.time}</span>
                                      {' '}
                                      <SourceBadge source={booking.source} className="mr-1" />
                                      {booking.clientName || 'Без имени'}
                                    </div>
                                    <div className={`text-[11px] truncate ${sub}`}>
                                      {booking.service}
                                      {booking.box ? ` · ${booking.box}` : ''}
                                    </div>
                                    {(booking.car || booking.plate) && (
                                      <div className={`text-[11px] truncate ${sub}`}>
                                        {[booking.car, booking.plate].filter(Boolean).join(' · ')}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ownerCalendarUntimedBookings.length > 0 && (
                    <div className={`${glass} rounded-2xl p-4 mt-4`}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Без точного времени</div>
                      <div className="space-y-2">
                        {ownerCalendarUntimedBookings.map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => ownerOpenBookingDetail(booking, setSelectedBooking, setShowBookingDetail)}
                            className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 w-full text-left`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="font-medium text-sm truncate">{booking.clientName || 'Без имени'}</div>
                                <SourceBadge source={booking.source} />
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                {ownerStatusLabel(booking.status)}
                              </span>
                            </div>
                            <div className={`text-xs ${sub} mt-1 truncate`}>{booking.service} · {booking.box}</div>
                            {(booking.car || booking.plate) && (
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {[booking.car, booking.plate].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}


          {/* ── DASHBOARD ── */}
          {page === 'dashboard' && (
            <>
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {kpiCards.map(card => (
                  <motion.button key={card.label} whileTap={{ scale: 0.96 }} onClick={card.action}
                    className={`${glass} rounded-2xl p-4 text-left active:opacity-80`}>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon size={15} style={{ color: card.color }} />
                      <span className={`text-xs ${sub}`}>{card.label}</span>
                      <ChevronRight size={12} className={`ml-auto ${sub}`} />
                    </div>
                    <div className="font-bold" style={{ color: card.color }}>{card.value}</div>
                    <div className={`text-[10px] ${sub} mt-1`}>Подробнее</div>
                  </motion.button>
                ))}
              </div>
              {/* Open shift */}
              {!isAccountant && (
                <button
                  onClick={() => { setPage('settings'); setSettingsSection('shift'); }}
                  className="w-full mb-4 rounded-2xl px-4 py-4 flex items-center justify-between text-white font-semibold active:opacity-90 transition-all"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
                >
                  <span className="flex items-center gap-2.5">
                    <Clock size={18} />
                    Открытие смены
                  </span>
                  <ChevronRight size={18} />
                </button>
              )}
              {/* Today bookings */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Сегодня — {todayLabel}</h3>
                  <span className={`text-sm ${sub}`}>{todayBookings.length} записей</span>
                </div>
                <div className="space-y-3">
                  {todayBookings.length === 0 ? (
                    <div className={`${glass} rounded-2xl p-8 text-center`}>
                      <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                      <p className={sub}>Записей на сегодня нет</p>
                    </div>
                  ) : todayBookings.map(booking => (
                    <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }}
                      className={`${glass} rounded-2xl p-4 w-full text-left`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-1 self-stretch rounded-full ${booking.status === 'new' ? 'bg-indigo-500' : booking.status === 'confirmed' ? 'bg-cyan-500' : booking.status === 'scheduled' ? 'bg-blue-500' : booking.status === 'in_progress' ? 'bg-yellow-500' : booking.status === 'completed' ? 'bg-green-500' : booking.status === 'no_show' ? 'bg-orange-500' : 'bg-red-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-semibold text-sm flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{booking.time} · {booking.clientName}</span>
                              <SourceBadge source={booking.source} />
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                          </div>
                          <div className={`text-sm ${sub}`}>{booking.service}</div>
                          {(booking.car || booking.plate) && (
                            <div className={`text-xs ${sub} mt-0.5`}>
                              {[booking.car, booking.plate].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          <div className="flex justify-between mt-2">
                            <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
                            <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} ₽</span>
                          </div>
                          {booking.workers.length > 0 && (
                            <div className={`text-xs ${sub} mt-1`}>Мастера: {booking.workers.map(w => {
                              const _fixed = isFixedMasterService(services, booking.serviceId, booking.service);
                              return `${w.workerName}${_fixed ? ` · фикс ${formatFixedMasterAmount()}` : w.payType === 'fixed' ? ` · ${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : ` ${w.percent}%`}`;
                            }).join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* Revenue chart */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>ВЫРУЧКА VS РАСХОДЫ (НЕДЕЛЯ)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={revenueWeek} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[3, 3, 0, 0]} name="Выручка" />
                    <Bar dataKey="expenses" fill="#FF6B6B" radius={[3, 3, 0, 0]} name="Расходы" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: 'Средний чек',
                    value: `${averageCheck.toLocaleString('ru')} ₽`,
                    color: primary,
                    action: () => setKpiModal({ kind: 'services', title: 'Услуги за неделю', color: primary, services: [...byService].sort((a, b) => b.revenue - a.revenue) }),
                  },
                  {
                    label: 'Активных записей',
                    value: activeBookings.length,
                    color: accent,
                    action: () => setKpiModal({
                      kind: 'bookings',
                      title: 'Активные записи',
                      color: accent,
                      totalLabel: 'активных записей',
                      total: activeBookings.length,
                      isMoney: false,
                      bookings: activeBookings,
                    }),
                  },
                  {
                    label: 'Топ-услуга',
                    value: topServiceName,
                    color: '#A855F7',
                    action: () => setKpiModal({ kind: 'services', title: 'Услуги за неделю', color: '#A855F7', services: [...byService].sort((a, b) => b.revenue - a.revenue) }),
                  },
                  {
                    label: 'Не приехали',
                    value: pipelineCounts.noShow,
                    color: '#F97316',
                    action: () => setShowStatusList('no_show'),
                  },
                ].map((card) => (
                  <motion.button key={card.label} whileTap={{ scale: 0.96 }} onClick={card.action}
                    className={`${glass} rounded-2xl p-4 text-left active:opacity-80`}>
                    <div className="flex items-center gap-1">
                      <div className={`text-xs ${sub}`}>{card.label}</div>
                      <ChevronRight size={12} className={`ml-auto ${sub}`} />
                    </div>
                    <div className="font-bold mt-2" style={{ color: card.color }}>{card.value}</div>
                    <div className={`text-[10px] ${sub} mt-1`}>Подробнее</div>
                  </motion.button>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs font-medium ${sub}`}>ВОРОНКА ЗАПИСЕЙ</div>
                    <div className={`text-xs ${sub} mt-1`}>От новых заявок до выполненных визитов</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: 'confirmed' as BookingStatus, label: 'Подтверждены', value: pipelineCounts.confirmed, color: '#06B6D4' },
                    { status: 'admin_review' as BookingStatus, label: 'На уточнении', value: pipelineCounts.adminReview, color: '#F59E0B' },
                    { status: 'scheduled' as BookingStatus, label: 'Запланированы', value: pipelineCounts.scheduled, color: '#3B82F6' },
                    { status: 'in_progress' as BookingStatus, label: 'В работе', value: pipelineCounts.inProgress, color: '#EAB308' },
                  ].map((item) => (
                    <motion.button key={item.status} whileTap={{ scale: 0.96 }} onClick={() => setShowStatusList(item.status)}
                      className={`${glass} rounded-xl px-3 py-3 text-left active:opacity-80`}>
                      <div className={`text-[11px] ${sub}`}>{item.label}</div>
                      <div className="text-lg font-semibold mt-1" style={{ color: item.color }}>{item.value}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* Quick actions */}
              <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                  {(isAccountant
                    ? [
                        { label: 'Добавить расход', icon: DollarSign, color: '#FF6B6B', action: () => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }, disabled: false },
                        { label: exportingKind === 'report' ? 'Выгрузка...' : 'Экспорт Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                      ]
                    : [
                        { label: 'Создать запись', icon: Plus, color: primary, action: () => { resetBookingForm(); setShowCreateBooking(true); }, disabled: false },
                        { label: 'Новый клиент', icon: Users, color: '#06B6D4', action: () => setShowCreateClient(true), disabled: false },
                        { label: 'Добавить расход', icon: DollarSign, color: '#FF6B6B', action: () => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }, disabled: false },
                        { label: exportingKind === 'report' ? 'Выгрузка...' : 'Экспорт Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                        { label: sendingReminders ? 'Отправка...' : 'Напомнить о записях', icon: RefreshCw, color: '#EC4899', action: () => { void handleDispatchReminders(); }, disabled: sendingReminders },
                        { label: sendingInactiveReminder ? 'Отправка...' : 'Обзвон 2+ недель', icon: Phone, color: '#F59E0B', action: () => { void handleInactiveClientsReminder(); }, disabled: sendingInactiveReminder },
                        { label: 'Настройки', icon: Settings, color: '#A855F7', action: () => { setPage('settings'); setSettingsSection(null); }, disabled: false },
                      ]).map(a => (
                  <motion.button key={a.label} whileTap={{ scale: 0.96 }} onClick={a.action} disabled={a.disabled} className={`${glass} rounded-2xl p-4 flex flex-col items-center gap-2 text-center disabled:opacity-60`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}20` }}><a.icon size={20} style={{ color: a.color }} /></div>
                    <span className="text-xs font-medium">{a.label}</span>
                  </motion.button>
                ))}
              </div>
              {/* Status pie + recent */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`${glass} rounded-2xl p-3`}>
                  <div className={`text-xs ${sub} mb-2`}>Статусы</div>
                  <PieChart width={80} height={80}>
                    <Pie data={statusData} cx={35} cy={35} innerRadius={22} outerRadius={36} dataKey="value" strokeWidth={0}>
                      {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="mt-2 space-y-1">
                    {statusData.map(s => (
                      <button key={s.name} type="button" onClick={() => setShowStatusList(s.status)}
                        className="flex items-center gap-1 w-full text-left rounded px-0.5 py-0.5 active:opacity-70">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className={`text-[10px] ${sub} truncate`}>{s.name} ({s.value})</span>
                        <ChevronRight size={10} className={`ml-auto shrink-0 ${sub}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPage('stock')} className={`${glass} rounded-2xl p-3 text-left active:opacity-80`}>
                  <div className={`text-xs ${sub} mb-2 flex items-center gap-1`}>
                    Склад
                    <ChevronRight size={12} className={`ml-auto ${sub}`} />
                  </div>
                  <div className="font-bold text-lg" style={{ color: accent }}>{totalStockValue.toLocaleString('ru')} ₽</div>
                  <div className={`text-xs ${sub} mb-2`}>{stockItems.length} позиций</div>
                  {stockItems.filter(s => s.qty <= 5).length > 0 && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle size={11} />
                      {stockItems.filter(s => s.qty <= 5).length} на исходе
                    </div>
                  )}
                </motion.button>
              </div>

              {stockItems.filter(s => s.qty <= 5).length > 0 && (
                <div className="mt-3">
                  <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Предупреждения склада</h3>
                  {stockItems.filter(s => s.qty <= 5).map(s => (
                    <motion.button key={s.id} whileTap={{ scale: 0.98 }} onClick={() => setPage('stock')}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2 flex items-center gap-2 w-full text-left active:opacity-80">
                      <AlertCircle size={15} className="text-red-500 shrink-0" />
                      <span className="text-sm">Низкий остаток: <span className="font-medium">{s.name}</span> ({s.qty} {s.unit})</span>
                      <ChevronRight size={14} className="ml-auto shrink-0 text-red-500/70" />
                    </motion.button>
                  ))}
                </div>
              )}

            </motion.div>
            </>
          )}

          {/* ── PAYROLL ── */}
          {page === 'payroll' && (
            <motion.div key="payroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-2">Зарплаты сотрудников</h2>

              {/* Search */}
              <div className="mb-3">
                <input type="text" placeholder="Поиск мастера по имени..." value={salaryWorkerSearch}
                  onChange={e => setSalaryWorkerSearch(e.target.value)}
                  className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
              </div>

              {/* Period selector */}
              <div className="flex gap-1.5 mb-3">
                {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                  <button key={p} onClick={() => setPayrollPeriod(p)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: payrollPeriod === p ? primary : 'transparent', color: payrollPeriod === p ? '#fff' : sub }}>
                    {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'all' ? 'Всё' : 'Своё'}
                  </button>
                ))}
              </div>
              {payrollPeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className={`text-[11px] ${sub} block mb-1`}>От</label>
                    <input type="date" value={payrollDateFrom} onChange={(e) => setPayrollDateFrom(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>
                  <div className="flex-1">
                    <label className={`text-[11px] ${sub} block mb-1`}>До</label>
                    <input type="date" value={payrollDateTo} onChange={(e) => setPayrollDateTo(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>
                </div>
              )}

              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-1`}>Общий фонд выплат</div>
                <div className="font-bold text-xl" style={{ color: accent }}>{payrollTotal.toLocaleString('ru')} ₽</div>
              </div>}
              <button onClick={() => { void handleSavePayrollSettings(); }} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-4" style={{ background: primary }}>
                <Save size={16} />Сохранить настройки зарплат
              </button>
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>Жалобы мастерам</div>
                <div className={`text-xs ${sub} mb-3`}>
                  3 активные жалобы снижают процент мастера на 10 п.п. на неделю.
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select className={selectCls} value={penaltyForm.workerId} onChange={e => setPenaltyForm(p => ({ ...p, workerId: e.target.value }))}>
                    {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                  </select>
                  <input className={inputCls} placeholder="Название жалобы" value={penaltyForm.title} onChange={e => setPenaltyForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <textarea className={`${inputCls} h-20 resize-none mb-3`} placeholder="Причина или комментарий" value={penaltyForm.reason} onChange={e => setPenaltyForm(p => ({ ...p, reason: e.target.value }))} />
                <button onClick={handleAddPenalty} className="w-full py-3 rounded-2xl text-white font-semibold" style={{ background: '#EF4444' }}>
                  Выдать жалобу
                </button>
              </div>}
              {payrollRows.filter(row => row.worker.name.toLowerCase().includes(salaryWorkerSearch.toLowerCase())).map(({ worker, payrollSummary, complaintState, recentPenalties }) => (
                <div key={worker.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>{worker.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{worker.name}</div>
                      <div className={`text-xs ${sub}`}>{employeeRoleLabel(worker.role === 'owner' ? 'admin' : worker.role)} · база {worker.defaultPercent}%{worker.salaryPerShift > 0 ? ` · за выход: ${worker.salaryPerShift.toLocaleString('ru')} ₽` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: accent }}>{(payrollSummary?.balance || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-xs ${sub}`}>{payrollSummary?.completedBookings || 0} заказов · {complaintState.activeCount} активных жалоб</div>
                    </div>
                  </div>
                    <button
                      onClick={() => {
                        setSelectedSalaryWorkerId(worker.id);
                        setSalaryPeriod('month');
                        setSalaryDateFrom('');
                        setSalaryDateTo('');
                        setSalaryDetail(null);
                        setSalaryError(null);
                        setSalaryLoading(true);
                        setEditingOverrideLinkId(null);
                        setEditingOverrideValue('');
                        setPage('salary-detail');
                      }}
                    className="mb-3 w-full rounded-xl border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }}
                  >
                    Открыть зарплату мастера
                  </button>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.accruedFromBookings || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Заработано с заказов</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold text-red-500">{complaintState.effectivePercent}%</div>
                      <div className={`text-[11px] ${sub}`}>Текущий %</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.baseSalary || worker.salaryBase).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Оклад</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.completedRevenue || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub}`}>Выручка по заказам</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>Начислено</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalAccrued || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        {(payrollSummary && payrollSummary.shiftPayTotal > 0) && (
                          <span>За смены: +{payrollSummary.shiftPayTotal.toLocaleString('ru')} ₽ ({payrollSummary.shiftCount} вых.) · </span>
                        )}
                        Премии: {(payrollSummary?.bonusTotal || 0).toLocaleString('ru')} ₽ · Корректировки: {(payrollSummary?.adjustmentTotal || 0).toLocaleString('ru')} ₽
                      </div>
                    </div>
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>Удержано / выдано</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalDeducted || 0).toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        Авансы: {(payrollSummary?.advanceTotal || 0).toLocaleString('ru')} ₽ · Выплаты: {(payrollSummary?.payoutTotal || 0).toLocaleString('ru')} ₽
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const payrollDraft = employeeSettings.find((item) => item.id === worker.id);
                    if (!payrollDraft) return null;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>Процент</label>
                            <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={payrollDraft.percent === '' ? '' : payrollDraft.percent} onChange={e => { const r = e.target.value; if (r === '') { setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }} onBlur={() => setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))} />
                          </div>
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>Оклад</label>
                            <input className={inputCls} type="number" min={0} value={payrollDraft.salaryBase} onChange={e => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, salaryBase: Math.max(0, Number(e.target.value) || 0) } : item))} />
                          </div>
                        </div>
                        {!isAccountant && <div className="flex items-center justify-between rounded-xl px-3 py-3 mb-3 border border-white/10">
                          <div>
                            <div className="text-sm font-medium">Активность мастера</div>
                            <div className={`text-[11px] ${sub}`}>Можно временно снять мастера с новых записей</div>
                          </div>
                          <button
                            onClick={() => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, active: !item.active } : item))}
                            className="w-11 h-6 rounded-full relative transition-all"
                            style={{ background: payrollDraft.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${payrollDraft.active ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>}
                      </>
                    );
                  })()}

                  {!isAccountant && (complaintState.reductionActive ? (
                    <div className="rounded-xl px-3 py-2 mb-3 text-xs border border-red-500/20 bg-red-500/10 text-red-500">
                      Снижение активно: −10 п.п. до {complaintState.reductionUntil ? formatComplaintDate(complaintState.reductionUntil) : 'конца недели'}.
                    </div>
                  ) : (
                    <div className={`text-xs ${sub} mb-3`}>
                      {complaintState.activeCount === 0
                        ? 'Активных жалоб нет.'
                        : `До снижения процента осталось ${Math.max(0, COMPLAINT_THRESHOLD - complaintState.activeCount)} жалобы.`}
                    </div>
                  ))}
                  {!isAccountant && complaintState.activeCount > 0 && (
                    <button
                      onClick={() => { void handleRevokeAllPenalties(worker.id, worker.name); }}
                      className="mb-3 w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-500/20 bg-red-500/10"
                    >
                      Снять все жалобы
                    </button>
                  )}
                  {!isAccountant && recentPenalties.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {recentPenalties.map(item => (
                        <div key={item.id} className={`${glass} rounded-xl p-3 flex items-start justify-between gap-3`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{item.title}</div>
                            <div className={`text-xs ${sub}`}>{item.reason}</div>
                            <div className={`text-[11px] ${sub} mt-1`}>
                              {isComplaintActive(item)
                                ? `Активна до ${formatComplaintDate(item.activeUntil)}`
                                : item.revokedAt
                                  ? `Снята ${formatComplaintDate(item.revokedAt)}`
                                  : `Истекла ${formatComplaintDate(item.activeUntil)}`}
                            </div>
                          </div>
                          {isComplaintActive(item) ? (
                            <button onClick={() => { void handleRevokePenalty(item.id, worker.name); }} className="text-xs text-red-500 shrink-0">
                              Снять
                            </button>
                          ) : (
                            <span className={`text-xs ${sub} shrink-0`}>{item.revokedAt ? 'Снята' : 'Истекла'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!isAccountant && complaintState.activeCount > 0 && (
                    <button
                      onClick={() => setShowComplaintsWorkerId(worker.id)}
                      className="mb-3 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }}
                    >
                      Все жалобы ({complaintState.activeCount})
                    </button>
                  )}
                  {(payrollSummary?.bookingItems?.length || 0) > 0 && (
                    <div className="mb-3">
                      <div className={`text-xs ${sub} mb-2`}>Последние выполненные заказы</div>
                      <div className="space-y-2">
                        {payrollSummary?.bookingItems.slice(0, 5).map((item) => (
                          <div key={item.bookingId} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{item.service}</div>
                              <div className={`text-[11px] ${sub}`}>{item.date} · {item.time} · {item.price.toLocaleString('ru')} ₽</div>
                              {(item.car || item.plate) && (
                                <div className={`text-[11px] ${sub} mt-0.5`}>
                                  {[item.car, item.plate].filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold">+{item.earned.toLocaleString('ru')} ₽</div>
                              <div className={`text-[11px] ${sub}`}>{item.percent}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(payrollSummary?.entries?.length || 0) > 0 && (
                    <div>
                      <div className={`text-xs ${sub} mb-2`}>История операций</div>
                      <div className="space-y-2">
                        {payrollSummary?.entries.slice(0, 6).map((entry) => (
                          <div key={entry.id} className={`${glass} rounded-xl p-3`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium">
                                {{
                                  advance: 'Аванс',
                                  deduction: 'Списание',
                                  bonus: 'Премия',
                                  payout: 'Выплата',
                                  adjustment: 'Корректировка',
                                }[entry.kind]}
                              </div>
                              <div className="text-sm font-semibold" style={{ color: entry.kind === 'bonus' || (entry.kind === 'adjustment' && entry.amount > 0) ? accent : entry.kind === 'adjustment' && entry.amount < 0 ? '#EF4444' : (isDark ? '#E6EEF8' : '#0B1226') }}>
                                {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('ru')} ₽
                              </div>
                            </div>
                            <div className={`text-[11px] ${sub} mt-1`}>
                              {entry.createdByName} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {entry.note && <div className={`text-xs ${sub} mt-1`}>{entry.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* ── ДОХОДЫ ВЛАДЕЛЬЦЕВ ── */}
              {!isAccountant && (
                <div className="mt-6">
                  <h2 className="font-semibold mb-3">Доходы владельцев</h2>
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                      <button key={p} onClick={() => setOwnerSalaryPeriod(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: ownerSalaryPeriod === p ? primary : 'transparent', color: ownerSalaryPeriod === p ? '#fff' : sub }}>
                        {{ day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', custom: 'Свои' }[p]}
                      </button>
                    ))}
                  </div>
                  {ownerSalaryPeriod === 'custom' && (
                    <div className="flex gap-2 mb-3">
                      <input type="date" value={ownerSalaryDateFrom}
                        onChange={e => setOwnerSalaryDateFrom(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <input type="date" value={ownerSalaryDateTo}
                        onChange={e => setOwnerSalaryDateTo(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                    </div>
                  )}
                  {ownerSalaryLoading && <div className={`text-xs ${sub} py-4 text-center`}>Загрузка...</div>}
                  {!ownerSalaryLoading && ownerSalaryData && ownerSalaryData.owners.map(owner => {
                    const rawId = owner.ownerId.replace('owner-tg-', '');
                    const ownerDisplayName = rawId === '476719812' ? 'Юра' : rawId === '1768985608' ? 'Максим' : owner.ownerName;
                    return (
                    <div key={owner.ownerId}
                      id={archiveHighlight?.target === 'owner' && archiveHighlight.ownerId === owner.ownerId ? archiveHighlightId(archiveHighlight) : undefined}
                      className={`${glass} rounded-2xl p-4 mb-3`}
                      style={archiveHighlight?.target === 'owner' && archiveHighlight.ownerId === owner.ownerId ? { boxShadow: '0 0 0 2px #10B981' } : undefined}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>
                          {ownerDisplayName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{ownerDisplayName}</div>
                          <div className={`text-xs ${sub}`}>Владелец</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: accent }}>{owner.totalAccrued.toLocaleString('ru')} ₽</div>
                          <div className={`text-[11px] ${sub}`}>Начислено</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: '#ef4444' }}>{owner.totalPaid.toLocaleString('ru')} ₽</div>
                          <div className={`text-[11px] ${sub}`}>Выплачено</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: owner.balanceToPay > 0 ? '#22c55e' : sub }}>{owner.balanceToPay.toLocaleString('ru')} ₽</div>
                          <div className={`text-[11px] ${sub}`}>Остаток</div>
                        </div>
                      </div>
                      {owner.shares.length > 0 && (
                        <div className="mb-3">
                          <div className={`text-xs ${sub} mb-2`}>Начисления по заказам ({owner.shares.length})</div>
                          {owner.shares.map(share => (
                            <div key={share.id} onClick={() => setSelectedShareDetail(share)} className="flex items-center justify-between py-1.5 border-b cursor-pointer active:opacity-70" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                              <div className="min-w-0 mr-2">
                                <div className="text-xs font-medium truncate">{share.service || 'Заказ'}</div>
                                <div className={`text-[10px] ${sub}`}>
                                  {share.date}{share.time ? ` ${share.time}` : ''}
                                  {share.clientName ? ` · ${share.clientName}` : ''}
                                </div>
                                {share.price > 0 && (
                                  <div className={`text-[10px] ${sub}`}>Стоимость заказа: {share.price.toLocaleString('ru')} ₽</div>
                                )}
                              </div>
                              <div className="text-xs font-semibold shrink-0 ml-2">+{share.amount.toLocaleString('ru')} ₽</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setOwnerPayTarget(ownerPayTarget === owner.ownerId ? null : owner.ownerId)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium mb-2"
                        style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)', border: `1px solid ${primary}33` }}>
                        Выплатить
                      </button>
                      {ownerPayTarget === owner.ownerId && (
                        <div className={`${glass} rounded-xl p-3 mt-2`}>
                          <div className="flex gap-2 mb-2">
                            <input type="number" min={1} placeholder="Сумма" value={ownerPayAmount}
                              onChange={e => setOwnerPayAmount(e.target.value)}
                              className={`${inputCls} flex-1 text-sm py-2 px-3 rounded-xl`} />
                            <button onClick={() => handlePayOwnerSalary(owner.ownerId)}
                              className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: primary }}>
                              {ownerSalaryLoading ? '...' : 'Выплатить'}
                            </button>
                          </div>
                          <input type="text" placeholder="Примечание (необязательно)" value={ownerPayNote}
                            onChange={e => setOwnerPayNote(e.target.value)}
                            className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── SALARY DETAIL ── */}
          {page === 'salary-detail' && (
            <motion.div key="salary-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => { setPage('payroll'); setSelectedSalaryWorkerId(null); setSalaryDetail(null); setEditingOverrideLinkId(null); setEditingOverrideValue(''); setArchiveHighlight(null); }} className="flex items-center gap-1.5 text-sm mb-3" style={{ color: primary }}>
                <ArrowLeft size={16} />Назад к зарплатам
              </button>

              {/* Filter bar — always visible when worker is selected */}
              {selectedSalaryWorkerId && (
                <div className={`${glass} rounded-2xl p-4 mb-3`}>
                  {salaryDetail && (
                    <div id={archiveHighlight?.target === 'worker' && archiveHighlight.workerId === selectedSalaryWorkerId ? archiveHighlightId(archiveHighlight) : undefined}
                      className="flex items-center gap-3 mb-2 rounded-xl"
                      style={archiveHighlight?.target === 'worker' && archiveHighlight.workerId === selectedSalaryWorkerId ? { boxShadow: '0 0 0 2px #10B981' } : undefined}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>
                        {salaryDetail.workerName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{salaryDetail.workerName}</div>
                        <div className={`text-xs ${sub}`}>
                          База: {salaryDetail.salaryBase.toLocaleString('ru')} ₽ · %: {salaryDetail.defaultPercent}% · За смену: {salaryDetail.salaryPerShift.toLocaleString('ru')} ₽ · {salaryDetail.active ? 'Активен' : 'Неактивен'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Period toggles */}
                  <div className="flex gap-1.5 mb-2">
                    {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                      <button key={p} onClick={() => setSalaryPeriod(p)}
                        className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: salaryPeriod === p ? primary : 'transparent', color: salaryPeriod === p ? '#fff' : sub }}>
                        {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : p === 'all' ? 'Всё' : 'Своё'}
                      </button>
                    ))}
                  </div>
                  {/* Segment toggles */}
                  <div className="flex gap-1.5">
                    {(['all', 'wash', 'detailing'] as const).map(s => (
                      <button key={s} onClick={() => setSalarySegment(s)}
                        className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: salarySegment === s ? primary : 'transparent', color: salarySegment === s ? '#fff' : sub }}>
                        {s === 'all' ? 'Все' : s === 'wash' ? 'Мойка' : 'Детейлинг'}
                      </button>
                    ))}
                  </div>
                  {salaryPeriod === 'custom' && (
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1">
                        <label className={`text-[11px] ${sub} block mb-1`}>От</label>
                        <input type="date" value={salaryDateFrom} onChange={(e) => { setSalaryDateFrom(e.target.value); }}
                          className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      </div>
                      <div className="flex-1">
                        <label className={`text-[11px] ${sub} block mb-1`}>До</label>
                        <input type="date" value={salaryDateTo} onChange={(e) => { setSalaryDateTo(e.target.value); }}
                          className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!salaryLoading && !salaryDetail && selectedSalaryWorkerId && salaryError && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <AlertCircle size={36} className={`mx-auto mb-3 text-red-400`} />
                  <p className="text-sm text-red-400 mb-2">{salaryError}</p>
                  <button onClick={refreshSalaryDetail} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: primary, color: '#fff' }}>Повторить</button>
                </div>
              )}
              {!salaryLoading && !salaryDetail && selectedSalaryWorkerId && !salaryError && (
                <div className={`text-sm ${sub} py-10 text-center`}>Выберите период для просмотра</div>
              )}
              {salaryLoading && (
                <div className={`text-sm ${sub} py-10 text-center`}>Загрузка...</div>
              )}
              {salaryDetail && (
                <>

                  {/* Aggregate cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{salaryDetail.totalEarned.toLocaleString('ru')} ₽</div>
                      <div className={`text-[10px] ${sub}`}>Заработано</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold" style={{ color: '#ef4444' }}>{salaryDetail.totalPaid.toLocaleString('ru')} ₽</div>
                      <div className={`text-[10px] ${sub}`}>Выплачено</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold" style={{ color: salaryDetail.balanceToPay > 0 ? '#22c55e' : sub }}>{salaryDetail.balanceToPay.toLocaleString('ru')} ₽</div>
                      <div className={`text-[10px] ${sub}`}>К выплате</div>
                    </div>
                  </div>

                  {/* Bookings list */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm">Записи ({salaryDetail.completedBookingsCount})</h3>
                      <span className={`text-[11px] ${sub}`}>Смен: {salaryDetail.shiftCount}</span>
                    </div>
                    {salaryDetail.shiftDates && salaryDetail.shiftDates.length > 0 && (
                      <div className={`text-[11px] ${sub} mb-2`}>Выходы: {salaryDetail.shiftDates.join(', ')}</div>
                    )}
                    {salaryDetail.bookings.length === 0 ? (
                      <div className={`text-xs ${sub} py-3 text-center`}>Нет записей за выбранный период</div>
                    ) : (
                      salaryDetail.bookings.map(b => (
                        <div key={b.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="text-xs font-medium truncate">
                              {b.date} {b.time} ·{' '}
                              {b.serviceId ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const svc = services.find(s => s.id === b.serviceId);
                                    if (svc) handleOpenServiceQuickEdit(svc, b.id);
                                  }}
                                  className="underline decoration-dotted underline-offset-2 truncate max-w-full"
                                  style={{ color: primary }}
                                  title="Редактировать услугу"
                                >
                                  {b.service}
                                </button>
                              ) : (
                                b.service
                              )}
                            </div>
                            <div className={`text-[10px] ${sub}`}>{b.box} · {b.payType === 'fixed' ? `фикс ${b.earned.toLocaleString('ru')} ₽` : `${b.percent}%`}</div>
                            {(b.car || b.plate) && (
                              <div className={`text-[10px] ${sub} mt-0.5`}>
                                {[b.car, b.plate].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {b.linkId && editingOverrideLinkId === b.linkId ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={editingOverrideValue}
                                  onChange={e => setEditingOverrideValue(e.target.value)}
                                  className={`w-20 text-right text-sm rounded-lg px-2 py-1 ${inputCls}`}
                                  autoFocus onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveOverrideEarned(b.linkId!);
                                    if (e.key === 'Escape') handleCancelOverrideEarned();
                                  }} />
                                <button onClick={() => handleSaveOverrideEarned(b.linkId!)}
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: accent, color: '#fff' }}>✓</button>
                                <button onClick={handleCancelOverrideEarned}
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#666', color: '#fff' }}>✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="text-right">
                                  <div className="text-sm font-semibold">{b.earned.toLocaleString('ru')} ₽</div>
                                  <div className={`text-[10px] ${sub}`}>{b.resourceGroup === 'wash' ? 'Мойка' : 'Детейлинг'}</div>
                                </div>
                                {b.linkId && (
                                  <button onClick={() => {
                                    setEditingOverrideLinkId(b.linkId!);
                                    setEditingOverrideValue(String(b.overrideEarned ?? b.earned));
                                  }} className="text-xs opacity-50 hover:opacity-100 transition" title="Изменить заработок">✏️</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bonus form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#22c55e' }}>Премия мастеру</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="Сумма" value={bonusAmount}
                        onChange={e => setBonusAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddBonus}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#22c55e' }}>
                        Начислить
                      </button>
                    </div>
                    <input type="text" placeholder="Примечание (за что премия)" value={bonusNote}
                      onChange={e => setBonusNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Fine form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#ef4444' }}>Штраф мастеру</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="Сумма" value={fineAmount}
                        onChange={e => setFineAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddFine}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
                        Выписать штраф
                      </button>
                    </div>
                    <input type="text" placeholder="Примечание (за что штраф)" value={fineNote}
                      onChange={e => setFineNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Write-off form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#ef4444' }}>Списание мастеру</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="Сумма" value={writeOffAmount}
                        onChange={e => setWriteOffAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddWriteOff}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
                        Списать
                      </button>
                    </div>
                    <input type="text" placeholder="Примечание (за что списание)" value={writeOffNote}
                      onChange={e => setWriteOffNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Payout form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3">Выплата мастеру</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="Сумма" value={salaryPayAmount}
                        onChange={e => setSalaryPayAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={async () => {
                        const amount = Number(salaryPayAmount);
                        if (!amount || amount < 1) return;
                        const balance = Number(salaryDetail.balanceToPay ?? 0);
                        if (amount > balance) {
                          const ok = window.confirm(
                            `Сумма ${Math.round(amount).toLocaleString('ru')} ₽ превышает доступный баланс (${balance.toLocaleString('ru')} ₽) за период. Выдать сверх баланса?`
                          );
                          if (!ok) return;
                        }
                        setSalaryLoading(true);
                        try {
                          const periodLabel = salaryPeriod === 'day' ? 'день' : salaryPeriod === 'week' ? 'неделю' : salaryPeriod === 'month' ? 'месяц' : salaryPeriod === 'custom' ? 'выбранный период' : 'весь период';
                          await apiRequest<{ message: string; payoutId: string; newBalance: number; expenseId: string }>(
                            `/api/owner/workers/${selectedSalaryWorkerId}/pay-salary`, {
                            method: 'POST',
                            body: {
                              period: salaryPeriod,
                              segment: salarySegment,
                              amount: Math.round(amount),
                              note: salaryPayNote.trim() || `Выплата за ${periodLabel}`,
                              ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
                            },
                          });
                          setSalaryPayAmount('');
                          setSalaryPayNote('');
                          setBottomToast(`Выплата ${Math.round(amount).toLocaleString('ru')} ₽ для ${salaryDetail.workerName} проведена`);
                          setTimeout(() => setBottomToast(null), 3000);
                          refreshSalaryDetail();
                        } catch (e) {
                          setBottomToast(e instanceof Error ? e.message : 'Ошибка выплаты');
                          setTimeout(() => setBottomToast(null), 4000);
                        } finally { setSalaryLoading(false); }
                      }} className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: primary }}>
                        {salaryLoading ? '...' : 'Выплатить'}
                      </button>
                    </div>
                    <input type="text" placeholder="Примечание (необязательно)" value={salaryPayNote}
                      onChange={e => setSalaryPayNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Operations history */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-2">История операций</h3>
                    {salaryDetail.entries.length === 0 ? (
                      <div className={`text-xs ${sub} py-3 text-center`}>Операций не было</div>
                    ) : (
                      salaryDetail.entries.slice(0, 20).map(e => {
                        const isEditing = editingEntryId === e.id;
                        const kindLabel: Record<string, string> = {
                          bonus: 'Премия', deduction: 'Штраф', payout: 'Выплата',
                          advance: 'Аванс', adjustment: 'Корректировка',
                        };
                        const kindColor: Record<string, string> = {
                          bonus: '#22c55e', deduction: '#ef4444', payout: isDark ? '#E6EEF8' : '#0B1226',
                          advance: '#f59e0b', adjustment: '#3b82f6',
                        };
                        const canEdit = e.kind === 'payout' || e.kind === 'deduction' || e.kind === 'bonus';
                        return (
                          <div key={e.id} className="flex items-start justify-between py-2 border-b gap-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            {isEditing ? (
                              <div className="flex-1 min-w-0">
                                <div className="flex gap-2 mb-1">
                                  <input type="number" value={editAmount} onChange={e2 => setEditAmount(e2.target.value)} className={`${inputCls} flex-1 text-xs py-1 px-2 rounded-lg`} />
                                  <button onClick={handleUpdateEntry} className="p-1 rounded-lg text-white" style={{ background: primary }}><Check size={14} /></button>
                                  <button onClick={() => setEditingEntryId(null)} className="p-1 rounded-lg border" style={{ borderColor: `${primary}40`, color: sub }}><X size={14} /></button>
                                </div>
                                <input type="text" value={editNote} onChange={e2 => setEditNote(e2.target.value)} placeholder="Примечание" className={`${inputCls} w-full text-xs py-1 px-2 rounded-lg`} />
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium">
                                    <span className="font-semibold" style={{ color: kindColor[e.kind] || sub }}>{kindLabel[e.kind] || e.kind}</span>
                                    {' · '}{e.amount.toLocaleString('ru')} ₽
                                  </div>
                                  {e.note && <div className={`text-[10px] ${sub}`}>{e.note}</div>}
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-1">
                                  <div>
                                    <div className="text-[11px] font-medium">{e.entryDate || new Date(e.createdAt).toLocaleDateString('ru')}</div>
                                    <div className={`text-[10px] ${sub}`}>{e.createdByName}</div>
                                  </div>
                                  {canEdit && <button onClick={() => { setEditingEntryId(e.id); setEditAmount(String(e.amount)); setEditNote(e.note || ''); }} className="p-1 rounded hover:bg-white/10" style={{ color: sub }}><Edit3 size={12} /></button>}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── STOCK ── */}
          {page === 'stock' && (
            <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Склад</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddStock(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white" style={{ background: primary }}>
                    <Plus size={14} />Добавить товар
                  </button>
                  <button onClick={() => setShowCategoryManager(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm ${glass}`}>
                    <span>Категории</span>
                  </button>
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-3 mb-4 flex justify-between items-center`}>
                <div>
                  <div className={`text-xs ${sub}`}>Стоимость склада</div>
                  <div className="font-bold" style={{ color: accent }}>{totalStockValue.toLocaleString('ru')} ₽</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs ${sub}`}>Позиций</div>
                  <div className="font-bold">{stockItems.length}</div>
                </div>
              </div>
              {parentCategories.map(parent => {
                const children = stockCategories.filter(c => c.parentId === parent.id);
                const parentItems = stockItems.filter(item => {
                  if (item.categoryId) {
                    const itemCat = stockCategories.find(c => c.id === item.categoryId);
                    return itemCat && (itemCat.id === parent.id || itemCat.parentId === parent.id);
                  }
                  return item.category === parent.name;
                });
                if (parentItems.length === 0) return null;
                return (
                  <div key={parent.id} className="mb-4">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="font-medium text-sm">{parent.name}</h3>
                      <span className={`text-xs ${sub}`}>{parentItems.length} шт · {parentItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="space-y-2">
                      {parentItems.map(item => (
                        <motion.div key={item.id} layout className={`${glass} rounded-xl p-4`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className={`text-xs ${sub}`}>
                                {children.some(c => c.id === item.categoryId) ? stockCategories.find(c => c.id === item.categoryId)?.name + ' · ' : ''}
                                {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${item.qty <= 5 ? 'text-red-500' : ''}`}>{item.qty} {item.unit}</div>
                              <div className={`text-xs ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div>
                            </div>
                          </div>
                          {item.qty <= 5 && <div className="flex items-center gap-1 text-red-500 text-xs mb-2"><AlertCircle size={12} />Низкий остаток</div>}
                          <div className="h-1.5 rounded-full mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (item.qty / 30) * 100)}%`, background: item.qty <= 5 ? '#EF4444' : primary }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }}
                              className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                              style={{ borderColor: `${primary}30`, color: primary }}>
                              <Package size={12} />Списать
                            </button>
                            <button onClick={async () => {
                              if (!window.confirm(`Удалить «${item.name}» со склада?`)) return;
                              try {
                                await deleteStockItem(item.id);
                                setBottomToast(`«${item.name}» удалён со склада`);
                                setTimeout(() => setBottomToast(null), 3000);
                              } catch (err) {
                                setBottomToast(err instanceof Error ? err.message : 'Не удалось удалить');
                                setTimeout(() => setBottomToast(null), 3000);
                              }
                            }}
                              className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                              style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}>
                              <X size={12} />Удалить
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {stockItems.length === 0 && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Box size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Склад пуст. Добавьте первый товар.</p>
                </div>
              )}
              {/* Write-off history */}
              <div className="mt-4">
                <button onClick={() => { setShowWriteOffHistory(!showWriteOffHistory); if (!showWriteOffHistory) getWriteOffHistory().then(setWriteOffHistory).catch(() => {}); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${glass}`}>
                  <span className="flex items-center gap-2">
                    <History size={15} />История списаний
                  </span>
                  <span className={`text-xs ${sub}`}>{showWriteOffHistory ? '▲' : '▼'}</span>
                </button>
                {showWriteOffHistory && (
                  <div className="mt-2 space-y-2">
                    {writeOffHistory.length === 0 && <div className={`text-xs ${sub} text-center py-4`}>Нет списаний</div>}
                    {writeOffHistory.map(w => (
                      <div key={w.id} className={`${glass} rounded-xl px-3 py-2`}>
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{w.stockItemName}</div>
                            {w.source === 'booking' ? (
                              <div className={`text-xs ${sub} space-y-0.5`}>
                                {w.bookingClientName && <div>Клиент: {w.bookingClientName}</div>}
                                {w.bookingService && <div>Услуга: {w.bookingService}</div>}
                                {w.bookingDate && <div>Дата: {w.bookingDate}</div>}
                                {w.bookingWorkerNames && <div>Мастер: {w.bookingWorkerNames}</div>}
                              </div>
                            ) : (
                              <div className={`text-xs ${sub}`}>Ручное списание</div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-medium text-red-500">-{w.qty} {w.unit}</div>
                            <div className={`text-xs ${sub}`}>{w.totalCost.toLocaleString('ru')} ₽</div>
                          </div>
                        </div>
                        <div className={`text-[10px] ${sub} mt-1`}>{new Date(w.createdAt).toLocaleString('ru')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">Чек-листы смен мастеров</div>
                    <div className={`text-xs ${sub} mt-1`}>Принятие и закрытие смены с остатками химии по каждому мастеру</div>
                  </div>
                  <div className={`text-xs ${sub}`}>{latestShiftChecklists.length} последних</div>
                </div>
                {latestShiftChecklists.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Пока нет заполненных чек-листов по химии.</div>
                ) : (
                  <div className="space-y-3">
                    {latestShiftChecklists.map((entry) => (
                      <div key={entry.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-medium">{entry.workerName}</div>
                            <div className={`text-xs ${sub}`}>
                              {entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: entry.phase === 'start' ? `${primary}18` : `${accent}18`,
                              color: entry.phase === 'start' ? primary : accent,
                            }}
                          >
                            {entry.phase === 'start' ? 'Смена принята' : 'Смена закрыта'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {entry.items.map((item) => (
                            <div key={`${entry.id}-${item.stockItemId}`} className={`${glass} rounded-xl px-3 py-2.5 flex items-center justify-between gap-3`}>
                              <div className="min-w-0">
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className={`text-[11px] ${sub}`}>
                                  {entry.phase === 'end'
                                    ? `Было: ${item.startQty ?? '-'} ${item.unit} · Осталось: ${item.actualQty} ${item.unit}`
                                    : `По факту: ${item.actualQty} ${item.unit}`}
                                </div>
                              </div>
                              {entry.phase === 'end' && (
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold">
                                    -{Math.max(0, (item.startQty ?? item.actualQty) - item.actualQty)} {item.unit}
                                  </div>
                                  <div className={`text-[11px] ${sub}`}>расход</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {entry.note && <div className={`text-xs ${sub} mt-3`}>Примечание: {entry.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>}
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold">Открытие смены</div>
                    <div className={`text-xs ${sub} mt-1`}>Открытия смены админом и владельцем: мастера на смене и решение владельца</div>
                  </div>
                  <div className={`text-xs ${sub}`}>{latestAdminShiftInspections.length} последних</div>
                </div>
                {latestAdminShiftInspections.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Смены ещё не открывались.</div>
                ) : (
                  <div className="space-y-3">
                    {latestAdminShiftInspections.map((inspection) => (
                      <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-medium">{inspection.adminName}</div>
                            <div className={`text-xs ${sub}`}>
                              {inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${inspection.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : inspection.status === 'approved' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                            {inspection.status === 'pending' ? 'На подтверждении' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказано'}
                          </div>
                        </div>
                        {inspection.floorPhotoUrl ? (
                          adminShiftPhotoUrls[inspection.id] ? (
                            <img src={adminShiftPhotoUrls[inspection.id]} alt="Фото открытия смены" className="mb-3 h-44 w-full rounded-2xl object-cover" />
                          ) : (
                            <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>
                              Загружаем фото открытия смены...
                            </div>
                          )
                        ) : (
                          <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>
                            Открыта владельцем, без фото
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className={`${glass} rounded-xl p-3`}>
                            <div className={`text-[11px] ${sub} mb-1`}>Мастера на смене</div>
                            <div className="text-sm font-medium">
                              {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}
                            </div>
                          </div>
                          <div className={`${glass} rounded-xl p-3`}>
                            <div className={`text-[11px] ${sub} mb-1`}>Проверенные расходники</div>
                            <div className="text-sm font-medium">
                              {inspection.supplies.filter((item) => item.checked).map((item) => item.name).join(', ') || 'Не отмечены'}
                            </div>
                          </div>
                        </div>
                        <div className={`text-xs ${sub} mt-3`}>
                          Чистые тряпки: {inspection.clothsReady ? 'Да' : 'Нет'}
                        </div>
                        {inspection.note && <div className={`text-xs ${sub} mt-1`}>Комментарий: {inspection.note}</div>}
                        {inspection.issueNote && <div className="text-xs text-red-500 mt-2">Причина отказа: {inspection.issueNote}</div>}
                        {inspection.reviewedAt && (
                          <div className={`text-[11px] ${sub} mt-2`}>
                            Решение принято {inspection.reviewedAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>}
            </motion.div>
          )}

          {/* ── WALLET ── */}
          {(page === 'wallet' || (page === 'settings' && settingsSection === 'wallet')) && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {page === 'settings' && (
                    <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} text-sm`}><ArrowLeft size={16} /></button>
                  )}
                  <h2 className="font-semibold">Кошелёк</h2>
                </div>
                <button onClick={() => { void loadWallet(walletDateFrom || undefined, walletDateTo || undefined); }} disabled={walletLoading} className={`p-2 rounded-xl ${glass}`}>
                  <RefreshCw size={16} className={walletLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {walletData && (
                <>
                  {/* Week period */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={`text-xs ${sub}`}>
                      {walletData.weekStart.split('-').reverse().join('.')} – {walletData.weekEnd.split('-').reverse().join('.')}
                    </div>
                    {walletDateFrom && (
                      <button onClick={() => { setWalletDateFrom(''); setWalletDateTo(''); }}
                        className="text-xs font-medium px-2.5 py-1 rounded-xl shrink-0" style={{ background: `${primary}20`, color: primary }}>
                        Текущая неделя
                      </button>
                    )}
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className={`text-xs ${sub} mb-1`}>Выручка</div>
                      <div className="font-bold text-lg" style={{ color: accent }}>{walletData.revenue.toLocaleString('ru')} ₽</div>
                      <div className={`text-[11px] ${sub} mt-1`}>{walletData.bookingCount} записей</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className={`text-xs ${sub} mb-1`}>Доп. доходы</div>
                      <div className="font-bold text-lg" style={{ color: primary }}>+{walletData.totalIncome.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className={`text-xs ${sub} mb-1`}>Расходы</div>
                      <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>−{walletData.totalExpense.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className={`text-xs ${sub} mb-1`}>Прибыль</div>
                      <div className="font-bold text-lg" style={{ color: walletData.profit >= 0 ? accent : '#FF6B6B' }}>
                        {walletData.profit >= 0 ? '+' : ''}{walletData.profit.toLocaleString('ru')} ₽
                      </div>
                    </div>
                  </div>

                  {/* Incomes this week */}
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Доходы</div>
                      <button onClick={() => { setIncomeForm(p => ({ ...p, date: todayLabel })); setShowAddIncome(true); }} className="text-xs font-medium px-2.5 py-1.5 rounded-xl" style={{ background: `${primary}20`, color: primary }}>
                        + Добавить
                      </button>
                    </div>
                    {walletData.incomes.length === 0 ? (
                      <p className={`text-sm ${sub} text-center py-4`}>Нет доходов за эту неделю</p>
                    ) : (
                      <div className="space-y-2">
                        {walletData.incomes.map(i => (
                          <div key={i.id}
                            id={archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? archiveHighlightId(archiveHighlight) : undefined}
                            className="flex justify-between items-center py-2 border-b last:border-0"
                            style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...(archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? { boxShadow: '0 0 0 2px #10B981', borderRadius: 8 } : {}) }}>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{i.source}</div>
                              <div className={`text-xs ${sub}`}>{i.date}{i.note ? ` · ${i.note}` : ''}</div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <div className="font-semibold text-sm" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} ₽</div>
                              {session?.role === 'owner' && (
                                <button onClick={() => openEditIncome(i)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                                  <Edit3 size={13} className={sub} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expenses this week */}
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Расходы</div>
                      <button onClick={() => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }} className="text-xs font-medium px-2.5 py-1.5 rounded-xl" style={{ background: `${primary}20`, color: primary }}>
                        + Добавить
                      </button>
                    </div>
                    {walletData.expenses.length === 0 ? (
                      <p className={`text-sm ${sub} text-center py-4`}>Нет расходов за эту неделю</p>
                    ) : (
                      <div className="space-y-2">
                         {walletData.expenses.map(e => (
                           <div key={e.id}
                             id={archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? archiveHighlightId(archiveHighlight) : undefined}
                             className="flex justify-between items-center py-2 border-b last:border-0"
                             style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...(archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? { boxShadow: '0 0 0 2px #EF4444', borderRadius: 8 } : {}) }}>
                             <div className="flex-1 min-w-0">
                               <div className="text-sm font-medium truncate">{e.title}</div>
                               <div className={`text-xs ${sub}`}>{e.category} · {e.date}{e.resourceGroup ? ` · ${e.resourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}` : ''}</div>
                             </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                              <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                              {(session?.role === 'owner' || session?.role === 'accountant') && (
                                <button onClick={() => openEditExpense(e)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                                  <Edit3 size={13} className={sub} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Archives */}
                  {walletData.archives.length > 0 && (
                    <div className={`${glass} rounded-2xl p-4 mb-4`}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Архив недель</div>
                      <div className="space-y-2">
                        {walletData.archives.map(a => (
                          <div key={a.id} className={`${glass} rounded-xl p-3`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium">
                                {a.weekStart.split('-').reverse().join('.')} – {a.weekEnd.split('-').reverse().join('.')}
                              </div>
                              <div className="font-semibold text-sm" style={{ color: a.totalRevenue + a.totalIncome - a.totalExpense >= 0 ? accent : '#FF6B6B' }}>
                                {a.totalRevenue + a.totalIncome - a.totalExpense >= 0 ? '+' : ''}{(a.totalRevenue + a.totalIncome - a.totalExpense).toLocaleString('ru')} ₽
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <div className="text-[11px]" style={{ color: accent }}>+{a.totalRevenue.toLocaleString('ru')} ₽</div>
                                <div className={`text-[10px] ${sub}`}>Выручка</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: primary }}>+{a.totalIncome.toLocaleString('ru')} ₽</div>
                                <div className={`text-[10px] ${sub}`}>Доходы</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: '#FF6B6B' }}>−{a.totalExpense.toLocaleString('ru')} ₽</div>
                                <div className={`text-[10px] ${sub}`}>Расходы</div>
                              </div>
                            </div>
                            <div className={`text-[10px] ${sub} mt-2 text-center`}>
                              {a.bookingCount} записей · {a.incomeCount} доходов · {a.expenseCount} расходов · Копилка: {a.piggyBankBalance.toLocaleString('ru')} ₽
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!walletData && !walletLoading && (
                <div className="text-center py-12">
                  <button onClick={() => { void loadWallet(walletDateFrom || undefined, walletDateTo || undefined); }} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: `${primary}20`, color: primary }}>
                    Загрузить данные
                  </button>
                </div>
              )}

              {walletLoading && !walletData && (
                <div className="text-center py-12">
                  <div className={`text-sm ${sub}`}>Загрузка...</div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── PIGGY BANK / FINANCE HUB ── */}
          {page === 'piggy-bank' && (
            <motion.div key="piggy-bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">Копилка</h2>
                  {piggyDateFrom && (
                    <button onClick={() => { setPiggyDateFrom(''); setPiggyDateTo(''); }}
                      className="text-xs font-medium px-2.5 py-1 rounded-xl shrink-0" style={{ background: `${primary}20`, color: primary }}>
                      За весь период
                    </button>
                  )}
                </div>
                <button onClick={() => { void loadPiggyBank(piggyDateFrom || undefined, piggyDateTo || undefined); }} disabled={piggyBankLoading} className={`p-2 rounded-xl ${glass}`}>
                  <RefreshCw size={16} className={piggyBankLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {!piggyBank ? (
                piggyBankLoading ? (
                  <div className="text-center py-12">
                    <div className={`text-sm ${sub}`}>Загрузка...</div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className={`text-sm ${sub} mb-3`}>Не удалось загрузить данные</div>
                    <button onClick={() => { void loadPiggyBank(piggyDateFrom || undefined, piggyDateTo || undefined); }} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: `${primary}20`, color: primary }}>
                      Повторить
                    </button>
                  </div>
                )
              ) : (
              <>
              {/* Balance card */}
              {(function() {
                const tabBalance = piggyTab === 'all' ? (piggyBank?.combinedBalance ?? piggyBankBalance)
                  : piggyTab === 'wash' ? (piggyBank?.remainingInPiggyBank ?? 0)
                  : (piggyBank?.detailing?.netPiggy ?? 0);
                const tabLabel = piggyTab === 'all' ? 'Баланс копилки'
                  : piggyTab === 'wash' ? 'Баланс · Мойка'
                  : 'Баланс · Детейлинг';
                return (
                <div className={`${glass} rounded-2xl p-5 mb-4 text-center`}>
                  <div className={`text-xs ${sub} mb-1 flex items-center justify-center gap-2`}>
                    {tabLabel}
                    {piggyTab !== 'all' && (
                      <button onClick={() => openPiggyAdjust(piggyTab)} className="p-1 rounded-lg hover:brightness-125 transition active:scale-95"
                        style={{ background: `${primary}20`, color: primary }} title="Изменить сумму">
                        <Edit3 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="font-bold text-3xl" style={{ color: tabBalance >= 0 ? accent : '#FF6B6B' }}>
                    {tabBalance.toLocaleString('ru')} ₽
                  </div>
                </div>
                );
              })()}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
                {[
                  { id: 'all' as const, label: 'Всё' },
                  { id: 'wash' as const, label: '🚗 Мойка' },
                  { id: 'detailing' as const, label: '✨ Детейлинг' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setPiggyTab(tab.id)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${piggyTab === tab.id ? 'bg-white/10 text-white' : sub}`}
                    style={piggyTab === tab.id ? { background: `${primary}20`, color: primary } : {}}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: ALL ── */}
              {piggyTab === 'all' && (
                <>

              {/* Wash mini */}
              {piggyBank?.wash && (() => {
                const rem = piggyBank.remainingInPiggyBank ?? 0;
                return (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>🚗 Мойка</div>
                  <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.wash.totalRevenue.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>ЗП мастеров</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.totalMaster.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>В копилку (90%+60%)</span><span style={{ color: accent }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Выход мастеров</span><span style={{ color: '#FF6B6B' }}>−{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm font-semibold">
                    <span>Остаток</span>
                    <span style={{ color: rem >= 0 ? accent : '#FF6B6B' }}>{rem.toLocaleString('ru')} ₽</span>
                  </div>
                </div>
                );
              })()}

                  {/* Detailing mini */}
                  {piggyBank?.detailing && (
                    <div className={`${glass} rounded-2xl p-4 mb-4`}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>✨ Детейлинг</div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>ЗП мастеров</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.detailingMaster.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Начислено 24%</span><span style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Снято на материалы</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Возврат материалов</span><span style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm font-semibold">
                        <span>Нетто в копилке</span><span style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? accent : '#FF6B6B' }}>{(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} ₽</span>
                      </div>
                    </div>
                  )}

                  {/* Total balance */}
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Общий баланс копилки</span>
                      <span className="font-bold text-lg" style={{ color: (piggyBank?.combinedBalance ?? piggyBankBalance) >= 0 ? accent : '#FF6B6B' }}>
                        {(piggyBank?.combinedBalance ?? piggyBankBalance).toLocaleString('ru')} ₽
                      </span>
                    </div>
                  </div>

                  {/* Withdraw button */}
                  <button onClick={() => setShowPiggyWithdraw(true)} className="w-full py-3 rounded-xl text-white font-medium mb-4" style={{ background: accent }}>
                    <Plus size={16} className="inline mr-1.5" />Снять на материалы
                  </button>
                </>
              )}

              {/* ── TAB: WASH ── */}
              {piggyTab === 'wash' && piggyBank?.wash && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>🚗 КОПИЛКА · МОЙКА</div>
                  {/* Self-service */}
                  <div className="mb-3">
                    <div className={`text-xs font-medium ${sub} mb-2`}>▸ Самообслуживание (1 000 ₽/ч)</div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.wash.selfServiceRevenue.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className={sub}>ЗП мастера</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.selfServiceMaster.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>В копилку (90%)</span><span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.selfServicePiggy.toLocaleString('ru')} ₽</span>
                    </div>
                  </div>
                  {/* Classic */}
                  <div className="mb-3">
                    <div className={`text-xs font-medium ${sub} mb-2`}>▸ Классическая мойка</div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.wash.classicRevenue.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className={sub}>ЗП мастера</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.classicMaster.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>В копилку</span><span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.classicPiggy.toLocaleString('ru')} ₽</span>
                    </div>
                  </div>
                  {/* Totals */}
                  <div className="flex justify-between py-2 text-sm font-semibold">
                    <span>Всего в копилку</span><span style={{ color: accent }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.wash.totalRevenue.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>ЗП мастеров всего</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.totalMaster.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Выход мастеров (смены)</span><span style={{ color: '#FF6B6B' }}>−{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Расходы на мойку</span><span style={{ color: '#FF6B6B' }}>−{(piggyBank.washExpenses ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Доп. доходы</span><span className="font-semibold" style={{ color: primary }}>+{(piggyBank.washIncomes ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                    <span>🏦 Остаток в копилке</span>
                    <span style={{ color: (piggyBank.remainingInPiggyBank ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                      {(piggyBank.remainingInPiggyBank ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.remainingInPiggyBank ?? 0).toLocaleString('ru')} ₽
                    </span>
                  </div>
                </div>
              )}

              {/* ── TAB: DETAILING ── */}
              {piggyTab === 'detailing' && piggyBank?.detailing && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>✨ КОПИЛКА · ДЕТЕЙЛИНГ</div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Выручка</span><span className="font-semibold">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>ЗП мастеров</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.detailingMaster.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Начислено 24%</span><span style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Снято на материалы</span><span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Возврат материалов</span><span style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Расходы на детейлинг</span><span style={{ color: '#FF6B6B' }}>−{(piggyBank.detailingExpenses ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className={sub}>Доп. доходы</span><span className="font-semibold" style={{ color: primary }}>+{(piggyBank.detailingIncomes ?? 0).toLocaleString('ru')} ₽</span>
                  </div>
                  <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                    <span>🏦 Нетто в копилке</span>
                    <span style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                      {(piggyBank.detailing.netPiggy ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} ₽
                    </span>
                  </div>
                  <button onClick={() => setShowPiggyWithdraw(true)} className="w-full py-3 rounded-xl text-white font-medium mt-4" style={{ background: accent }}>
                    <Plus size={16} className="inline mr-1.5" />Снять на материалы
                  </button>
                </div>
              )}

              {/* Transaction history */}
              <button onClick={() => setPiggyTxExpanded(v => !v)} className="w-full flex items-center justify-between mb-3">
                <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider`}>История операций</h3>
                <div className="flex items-center gap-2">
                  {!piggyTxExpanded && (
                    <span className={`text-[11px] ${sub}`}>{piggyBankTxs.length} операций</span>
                  )}
                  <ChevronRight size={14} className={`${sub} transition-transform ${piggyTxExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {piggyTxExpanded && (() => {
                const filteredTxs = piggyTab === 'all' ? piggyBankTxs
                  : piggyTab === 'wash' ? piggyBankTxs.filter(tx => tx.resourceGroup === 'wash')
                  : piggyBankTxs.filter(tx => tx.resourceGroup === 'detailing');
                if (filteredTxs.length === 0) {
                  return <div className={`text-center py-8 text-sm ${sub}`}>Пока нет операций</div>;
                }
                let runningBalance = piggyBankBalance;
                return (
                  <div className="space-y-2">
                    {filteredTxs.map(tx => {
                      const isDeposit = tx.amount > 0;
                      const txLabel = tx.transactionType === 'deposit_24percent' ? '24% от заказа'
                        : tx.transactionType === 'material_repayment' ? 'Возврат материалов'
                        : tx.transactionType === 'material_withdrawal' ? 'Снятие на материалы'
                        : 'Корректировка';
                      const booking = tx.bookingId ? bookings.find(b => b.id === tx.bookingId) : null;
                      const handleClick = () => {
                        if (booking) {
                          setSelectedBooking(booking);
                          setShowBookingDetail(true);
                        } else if (tx.bookingId) {
                          setBottomToast('Заказ не найден (возможно, удалён)');
                          setTimeout(() => setBottomToast(null), 3000);
                        }
                      };
                      const Wrapper = tx.bookingId ? 'button' : 'div';
                      const txRunningBalance = runningBalance;
                      runningBalance -= tx.amount;
                      return (
                        <Wrapper key={tx.id} onClick={handleClick}
                          id={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? archiveHighlightId(archiveHighlight) : undefined}
                          className={`${glass} rounded-xl p-3 w-full text-left transition active:scale-[0.98] ${tx.bookingId ? 'cursor-pointer hover:brightness-110' : ''}`}
                          style={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? { boxShadow: '0 0 0 2px #F59E0B' } : undefined}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm font-medium">{txLabel}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub}`} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                                  {tx.resourceGroup === 'detailing' ? '✨' : '🚗'}
                                </span>
                                {booking && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${ownerStatusBadge(booking.status)}`}>
                                    {booking.status === 'completed' ? 'Выполнен' : booking.status === 'cancelled' ? 'Отменён' : booking.status === 'no_show' ? 'Не пришёл' : booking.status === 'new' ? 'Новый' : booking.status === 'confirmed' ? 'Подтверждён' : booking.status === 'in_progress' ? 'В работе' : booking.status}
                                  </span>
                                )}
                              </div>
                              <div className={`text-[11px] ${sub} mt-0.5`}>{tx.date}</div>
                              {booking && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
                                  <span style={{ color: accent }}>{booking.clientName}</span>
                                  <span className={sub}>{booking.service}</span>
                                  <span className={sub}>{booking.date} {booking.time}</span>
                                </div>
                              )}
                              {!booking && tx.bookingInfo && (
                                <div className="text-xs mt-0.5"><span className={sub}>Заказ:</span> {tx.bookingInfo}</div>
                              )}
                              {booking && (booking.car || booking.plate) && (
                                <div className="text-[11px] mt-0.5">
                                  <span className={sub}>{booking.car || ''}{booking.car && booking.plate ? ' · ' : ''}{booking.plate || ''}</span>
                                </div>
                              )}
                              {tx.materialName && (
                                <div className="flex items-center gap-1 text-[11px] mt-1">
                                  <span className={sub}>🧴</span>
                                  <span>{tx.materialName}</span>
                                  <span className={sub}>({(tx.materialCost ?? 0).toLocaleString('ru')} ₽)</span>
                                </div>
                              )}
                              {tx.purpose && !tx.materialName && (
                                <div className="text-[11px] mt-0.5 opacity-70">{tx.purpose}</div>
                              )}
                              {tx.bookingId && !booking && (
                                <div className="text-[11px] mt-0.5 opacity-50 italic">Заказ удалён</div>
                              )}
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <div className={`font-bold text-sm ${isDeposit ? 'text-green-500' : 'text-red-500'}`}>
                                {isDeposit ? '+' : ''}{tx.amount.toLocaleString('ru')} ₽
                              </div>
                              {booking && (
                                <div className={`text-[10px] ${sub}`}>
                                  {booking.price.toLocaleString('ru')} ₽
                                </div>
                              )}
                              <div className={`text-[10px] mt-1 ${sub}`}>
                                = {txRunningBalance.toLocaleString('ru')} ₽
                              </div>
                              {tx.bookingId && (
                                <ChevronRight size={12} className={`mt-0.5 ${sub}`} />
                              )}
                            </div>
                          </div>
                        </Wrapper>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Archives — collapsed by default */}
              {piggyBank?.archives && piggyBank.archives.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4 mt-4`}>
                  <button onClick={() => setShowArchivesModal(true)} className="w-full flex items-center justify-between">
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Архив недель</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] ${sub}`}>{piggyBank.archives.length} шт.</span>
                      <ChevronRight size={14} className={sub} />
                    </div>
                  </button>
                </div>
              )}
              </>
              )}
              </motion.div>
          )}

          {/* ── REPORTS ── */}
          {page === 'reports' && (
            (() => {
              const isDateInReportRange = (dateStr: string) => {
                const d = parseFlexibleDate(dateStr);
                if (!d) return false;
                const from = parseFlexibleDate(reportDateFrom);
                const to = parseFlexibleDate(reportDateTo);
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
              };
              const reportCompletedBookings = completedBookings.filter(b => isDateInReportRange(b.date));
              const reportFilteredExpenses = expenses.filter(e => isDateInReportRange(e.date));
              const reportFilteredIncomes = incomes.filter(i => isDateInReportRange(i.date));
              const reportTotalRevenue = reportCompletedBookings.reduce((s, b) => s + b.price, 0);
              const reportTotalExpenses = reportFilteredExpenses.reduce((s, e) => s + e.amount, 0);
              const reportTotalIncomes = reportFilteredIncomes.reduce((s, i) => s + i.amount, 0);
              const reportProfit = reportTotalRevenue + reportTotalIncomes - reportTotalExpenses;
              const reportAverageCheck = reportCompletedBookings.length > 0 ? Math.round(reportTotalRevenue / reportCompletedBookings.length) : 0;
              const reportByService = services.map(service => ({
                name: service.name.split(' ')[0],
                revenue: reportCompletedBookings.filter(booking => booking.serviceId === service.id).reduce((sum, booking) => sum + booking.price, 0),
                count: reportCompletedBookings.filter(booking => booking.serviceId === service.id).length,
              })).filter(service => service.count > 0);
              const reportTopServiceName = [...reportByService].sort((left, right) => right.revenue - left.revenue)[0]?.name || 'Нет данных';
              const reportBoxLoadData = boxes.filter((box) => box.active).map((box) => {
                const boxBookings = reportCompletedBookings.filter((booking) => booking.box === box.name);
                return {
                  name: box.name,
                  count: bookings.filter((booking) => booking.box === box.name).length,
                  revenue: boxBookings.reduce((sum, booking) => sum + booking.price, 0),
                };
              });
              const reportWorkerEfficiencyData = workers.filter((worker) => worker.active).map((worker) => {
                const workerBookings = reportCompletedBookings.filter((booking) => booking.workers.some((item) => item.workerId === worker.id));
                const workerRevenue = workerBookings.reduce((sum, booking) => sum + booking.price, 0);
                return {
                  id: worker.id,
                  name: worker.name,
                  completed: workerBookings.length,
                  revenue: workerRevenue,
                  averageCheck: workerBookings.length > 0 ? Math.round(workerRevenue / workerBookings.length) : 0,
                };
              }).sort((left, right) => right.revenue - left.revenue);
              return (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Отчёты</h2>
                <div className="flex gap-1.5">
                  <button onClick={() => openExportModal('report')} disabled={exportingKind !== null} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white disabled:opacity-60" style={{ background: accent }}>
                    <Download size={12} />{exportingKind === 'report' ? '...' : 'Excel'}
                  </button>
                  <button onClick={() => openExportModal('pdf')} disabled={exportingKind !== null} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white disabled:opacity-60" style={{ background: accent }}>
                    <Download size={12} />{exportingKind === 'pdf' ? '...' : 'PDF'}
                  </button>
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="text-xs text-[#6B7280] mb-3">Сводные Telegram-отчёты</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { period: 'daily', segment: 'wash', label: 'День · мойка' },
                    { period: 'daily', segment: 'detailing', label: 'День · детейлинг' },
                    { period: 'weekly', segment: 'wash', label: 'Неделя · мойка' },
                    { period: 'weekly', segment: 'detailing', label: 'Неделя · детейлинг' },
                  ].map((item) => {
                    const key = `${item.period}-${item.segment}`;
                    return (
                      <button
                        key={key}
                        onClick={() => { void handleSummaryReport(item.period as 'daily' | 'weekly', item.segment as 'wash' | 'detailing'); }}
                        disabled={sendingSummaryReport !== null}
                        className="rounded-xl px-3 py-3 text-sm font-medium text-left disabled:opacity-60"
                        style={{ background: sendingSummaryReport === key ? `${primary}35` : `${primary}15`, color: primary }}
                      >
                        {sendingSummaryReport === key ? 'Отправка...' : item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'Средний чек', value: `${reportAverageCheck.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Топ-услуга', value: reportTopServiceName, color: '#A855F7' },
                  { label: 'Активных клиентов', value: clientInsights.filter((client) => client.activeCount > 0).length, color: accent },
                  { label: 'Долги клиентов', value: `${clientInsights.reduce((sum, client) => sum + client.debtBalance, 0).toLocaleString('ru')} ₽`, color: '#EF4444' },
                ].map((item) => (
                  <div key={item.label} className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub}`}>{item.label}</div>
                    <div className="font-bold mt-2" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ФИНАНСОВЫЙ ИТОГ</div>
                {[
                  { label: 'Выручка', value: `${reportTotalRevenue.toLocaleString('ru')} ₽`, color: accent },
                  { label: 'Доп. доходы', value: `${reportTotalIncomes.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Расходы', value: `${reportTotalExpenses.toLocaleString('ru')} ₽`, color: '#FF6B6B' },
                  { label: 'Прибыль', value: `${Math.abs(reportProfit).toLocaleString('ru')} ₽${reportProfit < 0 ? ' (убыток)' : ''}`, color: reportProfit >= 0 ? accent : '#FF6B6B' },
                  { label: 'Маржа', value: `${reportTotalRevenue > 0 ? Math.round((reportProfit / reportTotalRevenue) * 100) : 0}%`, color: '#A855F7' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Копилка в отчётах */}
              {piggyBank && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>💰 КОПИЛКА</div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Баланс</span>
                    <span className="font-semibold" style={{ color: piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>{piggyBankBalance.toLocaleString('ru')} ₽</span>
                  </div>
                  {piggyBank.detailing && (
                    <>
                      <div className="flex justify-between py-2 text-sm">
                        <span className={sub}>Начислено 24%</span>
                        <span style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm">
                        <span className={sub}>Снято на материалы</span>
                        <span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Возврат материалов</span>
                        <span style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Доходы */}
              {reportFilteredIncomes.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs ${sub} mb-3`}>ДОХОДЫ</div>
                  <div className="space-y-2">
                    {reportFilteredIncomes.slice(0, 10).map(inc => (
                      <div key={inc.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div>
                          <div className="text-sm font-medium">{inc.source}</div>
                          <div className={`text-xs ${sub}`}>{inc.date}{inc.note ? ` · ${inc.note}` : ''}</div>
                        </div>
                        <div className="font-semibold text-sm" style={{ color: primary }}>+{inc.amount.toLocaleString('ru')} ₽</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Services chart */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ВЫРУЧКА ПО УСЛУГАМ</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={reportByService} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#9AA6B2' : '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[4, 4, 0, 0]} name="Выручка" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ЗАГРУЗКА ПО БОКСАМ</div>
                <div className="space-y-3">
                  {reportBoxLoadData.map((box) => (
                    <div key={box.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{box.name}</span>
                        <span className={`text-xs ${sub}`}>{box.count} записей · {box.revenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, box.count * 18)}%`, background: primary }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>ЭФФЕКТИВНОСТЬ МАСТЕРОВ</div>
                <div className="space-y-2">
                  {reportWorkerEfficiencyData.map((worker) => (
                    <div key={worker.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{worker.name}</div>
                        <div className={`text-xs ${sub}`}>{worker.completed} завершённых · средний чек {worker.averageCheck.toLocaleString('ru')} ₽</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{worker.revenue.toLocaleString('ru')} ₽</div>
                        <div className={`text-xs ${sub}`}>выручка</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs ${sub} uppercase tracking-wider`}>Клиентские карточки</div>
                    <div className={`text-xs ${sub} mt-1`}>История визитов, траты, любимые услуги, заметки и долги</div>
                  </div>
                  <button
                    onClick={() => setShowCreateClient(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-1.5"
                    style={{ background: primary }}
                  >
                    <Plus size={14} />
                    Новый клиент
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="Поиск по имени, телефону, авто, услуге"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                />
                <div className="space-y-3 mt-3">
                  {filteredClientInsights.slice(0, 12).map((client) => {
                    const draft = clientCardDrafts[client.id] || { name: client.name || '', phone: client.phone || '', car: client.car || '', plate: client.plate || '', notes: client.notes || '', debtBalance: String(client.debtBalance || 0), adminRating: client.adminRating || 0, adminNote: client.adminNote || '', referralSource: client.referralSource || '' };
                    return (
                      <div key={client.id} className={`${glass} rounded-2xl p-4`}>
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-semibold">{client.name}</div>
                            <div className={`text-xs ${sub}`}>{client.phone} · {client.car || 'Авто не указано'} {client.plate ? `· ${client.plate}` : ''}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{client.totalSpent.toLocaleString('ru')} ₽</div>
                            <div className={`text-xs ${sub}`}>{client.visits} визитов · последний {client.lastVisit}</div>
                            <div className="mt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => openBookingForClient(client, 'completed')}
                                className="text-xs font-medium"
                                style={{ color: primary }}
                              >
                                + Прошлая запись
                              </button>
                              <button
                                type="button"
                                onClick={() => openBookingForClient(client, 'confirmed')}
                                className="text-xs font-medium"
                                style={{ color: primary }}
                              >
                                + Новая запись
                              </button>
                            </div>
                          </div>
                        </div>
                        {(client.adminNote || draft.adminNote) && (
                          <div className={`rounded-xl px-3 py-2.5 mb-3 text-sm border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>⚑ Примечание:</div>
                            {draft.adminNote || client.adminNote}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Любимая услуга</div>
                            <div className="text-sm font-medium mt-1">{client.favoriteService}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Активных записей</div>
                            <div className="text-sm font-medium mt-1">{client.activeCount}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Долг</div>
                            <div className="text-sm font-medium mt-1">{client.debtBalance.toLocaleString('ru')} ₽</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <textarea
                            className={`${inputCls} h-24 resize-none`}
                            placeholder="Заметки по клиенту"
                            value={draft.notes}
                            onChange={(event) => setClientCardDrafts((current) => ({
                              ...current,
                              [client.id]: { ...draft, notes: event.target.value },
                            }))}
                          />
                          <div className="space-y-2">
                            <input
                              className={inputCls}
                              type="number"
                              placeholder="Долг клиента"
                              value={draft.debtBalance}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [client.id]: { ...draft, debtBalance: event.target.value },
                              }))}
                            />
                            <textarea
                              className={`${inputCls} h-20 resize-none`}
                              placeholder="Особое примечание (всегда видно)"
                              value={draft.adminNote}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [client.id]: { ...draft, adminNote: event.target.value },
                              }))}
                            />
                            <button
                              onClick={() => { void handleSaveClientCard(client.id); }}
                              disabled={savingClientId === client.id}
                              className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                              style={{ background: primary }}
                            >
                              {savingClientId === client.id ? 'Сохраняем...' : 'Сохранить карточку'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <h3 className={`text-xs font-medium ${sub} mb-3`}>РАСХОДЫ</h3>
              {expenses.map(e => (
                <div key={e.id} className={`${glass} rounded-xl p-3 mb-2 flex justify-between`}>
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className={`text-xs ${sub}`}>{e.category} · {e.date}</div>
                  </div>
                  <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                </div>
              ))}
              </motion.div>
            );
          })()
        )}

          {/* ── SETTINGS MAIN ── */}
          {!isAccountant && page === 'settings' && !settingsSection && (
            <motion.div key="settings-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">Настройки</h2>
              {[
                { id: 'company', icon: Building2, label: 'Профиль компании', desc: 'ATMOSFERA · ИП Иванов', color: primary },
                { id: 'schedule', icon: Clock, label: 'Расписание работы', desc: scheduleState.filter(d => d.active).map(d => `${d.day} ${d.open}-${d.close}`).join(' · ') || 'График не задан', color: '#F59E0B' },
                { id: 'boxes', icon: Box, label: 'Управление боксами', desc: `${boxes.filter(b => b.active).length} активных бокса`, color: '#F59E0B' },
                { id: 'services', icon: Sliders, label: 'Услуги и цены', desc: `${services.filter(s => s.active).length} активных услуг`, color: '#A855F7' },
                { id: 'employees', icon: Users, label: 'Сотрудники', desc: `${employeeSettings.filter(e => e.active).length} мастера`, color: accent },
                { id: 'shift', icon: Clock, label: 'Открытие смены', desc: 'Открыть смену для мастеров', color: accent },
                { id: 'clients', icon: Phone, label: 'Клиенты', desc: `${clients.length} карточек клиентов`, color: '#0EA5E9' },
                { id: 'finance', icon: BarChart3, label: 'Финансы', desc: 'Отчёт по мойке и детейлингу', color: '#22C55E' },
                { id: 'deposit', icon: Wallet, label: 'Депозит', desc: 'Абонентские клиенты, мойки в долг', color: '#F59E0B' },
                { id: 'wallet', icon: Wallet, label: 'Кошелёк', desc: 'Доходы и расходы за неделю', color: '#0EA5E9' },
                { id: 'bookings-history', icon: History, label: 'История записей', desc: 'Распределение денег по записям', color: '#6366F1' },
                { id: 'archive', icon: Archive, label: 'Архив', desc: 'Главная библиотека: все записи и расчёты', color: '#10B981' },
                { id: 'notifications', icon: Bell, label: 'Уведомления', desc: 'Telegram, Email', color: '#EC4899' },
                { id: 'integrations', icon: Globe, label: 'Интеграции', desc: `${Object.values(integrations).filter(Boolean).length} подключено`, color: '#06B6D4' },
                { id: 'content', icon: FileText, label: 'Контент сайта', desc: 'Главный экран, о студии, портфолио', color: '#0EA5E9' },
                { id: 'reports', icon: FileText, label: 'Отчёты', desc: 'Сводные отчёты по мойке и детейлингу', color: '#F59E0B' },
                { id: 'security', icon: Shield, label: 'Безопасность', desc: '2FA включена', color: '#EF4444' },
              ].map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (item.id === 'reports') { setPage('reports'); setSettingsSection(null); }
                    else { setSettingsSection(item.id as SettingsSection); }
                  }}
                  className={`${glass} rounded-2xl p-4 w-full text-left mb-2 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <item.icon size={18} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} className={sub} />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ── SETTINGS: SHIFT OPENING ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'shift' && (
            <motion.div key="settings-shift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-1">Открытие смены</h2>
              <p className={`text-xs ${sub} mb-4`}>Отметь мастеров, которые вышли на смену. Смена сразу открыта и попадает в посещаемость — подтверждение не требуется.</p>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">Мастера на смене</div>
                <div className="space-y-2">
                  {workers.filter((worker) => worker.role === 'worker' && worker.active).map((worker) => {
                    const checked = shiftOpenMasterIds.includes(worker.id);
                    return (
                      <button
                        key={worker.id}
                        type="button"
                        onClick={() => setShiftOpenMasterIds((current) => (checked ? current.filter((id) => id !== worker.id) : [...current, worker.id]))}
                        className={`${glass} w-full rounded-2xl p-3 text-left transition-all ${checked ? 'ring-2' : ''}`}
                        style={checked ? { outline: `2px solid ${primary}`, outlineOffset: '-2px' } : undefined}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{worker.name}</div>
                            <div className={`text-xs ${sub}`}>{worker.experience || 'Мастер'}</div>
                          </div>
                          <div
                            className="h-6 min-w-6 rounded-full px-2 flex items-center justify-center text-[11px] font-semibold text-white"
                            style={{ background: checked ? primary : '#9CA3AF' }}
                          >
                            {checked ? 'Есть' : 'Нет'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className={`mt-3 text-xs ${sub}`}>
                  Отметь только тех мастеров, которые реально вышли в смену.
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">Комментарий к смене</div>
                <textarea
                  className={`${inputCls} min-h-[88px] resize-none`}
                  placeholder="Комментарий (необязательно)"
                  value={shiftOpenNote}
                  onChange={(event) => setShiftOpenNote(event.target.value)}
                />
                {shiftOpenError && <div className="mt-3 text-xs text-red-500">{shiftOpenError}</div>}
                {shiftOpenSuccess && <div className="mt-3 text-xs" style={{ color: accent }}>Смена открыта для отмеченных мастеров</div>}
                <button onClick={() => { void handleOpenShiftForMasters(); }} disabled={shiftOpenSubmitting} className="mt-3 w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
                  {shiftOpenSubmitting ? 'Открываем смену...' : 'Открыть смену'}
                </button>
              </div>

              {/* Мастера сегодня: услуги и выход */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="font-medium">Мастера сегодня</div>
                  <span className={`text-xs font-medium ${sub}`}>
                    Вышли: {mastersCameOutToday} из {activeMasters.length}
                  </span>
                </div>
                <div className={`text-xs ${sub} mb-3`}>
                  Услуги на {todayLabel} · выход — по открытым сменам и отметкам в осмотрах
                </div>
                {activeMasters.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Нет активных мастеров.</div>
                ) : (
                  <div className="space-y-3">
                    {activeMasters.map((master) => {
                      const cameOutAt = masterCameOutTodayAt(master.id);
                      const masterBookings = todayBookings.filter((booking) =>
                        booking.workers.some((w) => w.workerId === master.id)
                      );
                      const masterTotal = masterBookings.reduce((sum, booking) => sum + booking.price, 0);
                      return (
                        <div key={master.id} className={`${glass} rounded-2xl p-3`}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="text-sm font-medium">{master.name}</div>
                            {cameOutAt ? (
                              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-green-500/15 text-green-600 whitespace-nowrap">
                                Вышел в {cameOutAt}
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-black/10 dark:bg-white/10 text-gray-500 whitespace-nowrap">
                                Не вышел
                              </span>
                            )}
                          </div>
                          {masterBookings.length === 0 ? (
                            <div className={`text-xs ${sub}`}>Нет записей на сегодня</div>
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                {masterBookings.map((booking) => (
                                  <div key={booking.id} className="flex items-start justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                      <span className="font-medium">{booking.time}</span>
                                      <span className={sub}> · {booking.clientName}</span>
                                      <div className={`${sub} truncate`}>{booking.service}</div>
                                    </div>
                                    <span className="font-semibold whitespace-nowrap">{booking.price.toLocaleString('ru')} ₽</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-black/5 dark:border-white/10">
                                <span className={sub}>Итого</span>
                                <span className="font-semibold">{masterTotal.toLocaleString('ru')} ₽</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="font-medium">Последние открытия</div>
                {adminShiftInspections.length === 0 ? (
                  <div className={`text-sm ${sub}`}>Смены ещё не открывались.</div>
                ) : (
                  adminShiftInspections.slice(0, 10).map((inspection) => (
                    <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-medium">{inspection.adminName}</div>
                          <div className={`text-xs ${sub}`}>{inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${inspection.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : inspection.status === 'approved' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                          {inspection.status === 'pending' ? 'На подтверждении' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказано'}
                        </div>
                      </div>
                      <div className={`text-xs ${sub}`}>
                        Мастера: {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}
                      </div>
                      {inspection.note && <div className={`text-xs ${sub} mt-1`}>{inspection.note}</div>}
                      {inspection.issueNote && <div className="mt-2 text-xs text-red-500">Проблема: {inspection.issueNote}</div>}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ── SETTINGS: BOOKINGS HISTORY ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'bookings-history' && !selectedHistoryBookingId && (
            <motion.div key="s-bookings-history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">История записей</h2>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'day', label: 'День' },
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'all', label: 'Всё' },
                  { id: 'custom', label: 'Свои' },
                ].map(option => (
                  <button key={option.id}
                    onClick={() => setHistoryPeriod(option.id as typeof historyPeriod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${historyPeriod === option.id ? 'text-white' : `${glass} ${sub}`}`}
                    style={historyPeriod === option.id ? { background: primary } : undefined}>
                    {option.label}
                  </button>
                ))}
              </div>

              {historyPeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <input type="date" value={historyDateFrom}
                    onChange={e => setHistoryDateFrom(e.target.value)}
                    className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  <input type="date" value={historyDateTo}
                    onChange={e => setHistoryDateTo(e.target.value)}
                    className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: '', label: 'Все' },
                  { id: 'completed', label: 'Завершено' },
                  { id: 'in_progress', label: 'В работе' },
                  { id: 'cancelled', label: 'Отменено' },
                  { id: 'no_show', label: 'Не приехал' },
                ].map(option => (
                  <button key={option.id || 'all'}
                    onClick={() => setHistoryStatusFilter(option.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${historyStatusFilter === option.id ? 'text-white' : `${glass} ${sub}`}`}
                    style={historyStatusFilter === option.id ? { background: '#6366F1' } : undefined}>
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <div className={`relative flex-1 ${glass} rounded-xl`}>
                  <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                  <input
                    className="w-full bg-transparent outline-none pl-9 pr-3 py-2.5 text-sm"
                    placeholder="Клиент, телефон, услуга, авто..."
                    value={historySearchInput}
                    onChange={e => setHistorySearchInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') setHistoryQuery(historySearchInput.trim()); }}
                  />
                </div>
                <button onClick={() => setHistoryQuery(historySearchInput.trim())}
                  className="px-4 rounded-xl text-sm font-semibold text-white shrink-0" style={{ background: '#6366F1' }}>
                  Найти
                </button>
              </div>

              {historyTotals && (historyTotals.workers.length > 0 || historyTotals.owners.length > 0 || historyTotals.piggy.length > 0) && (
                <div className="grid gap-3 mb-4">
                  {historyTotals.workers.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>Мастера · итог за период</div>
                      {historyTotals.workers.map(w => (
                        <div key={w.workerId} className={`py-1.5 ${w !== historyTotals!.workers[0] ? 'border-t' : ''}`}
                          style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">{w.workerName}</span>
                            <span className="font-bold">{w.balance.toLocaleString('ru')} ₽</span>
                          </div>
                          <div className={`text-xs mt-0.5 space-y-0.5 ${sub}`}>
                            {w.accruedFromBookings > 0 && (
                              <div className="flex justify-between"><span>по записям ({w.bookingCount})</span><span className="font-medium">+{w.accruedFromBookings.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.baseSalary > 0 && (
                              <div className="flex justify-between"><span>оклад</span><span className="font-medium">+{w.baseSalary.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.shiftPayTotal > 0 && (
                              <div className="flex justify-between"><span>смены ({w.shiftCount})</span><span className="font-medium">+{w.shiftPayTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.bonusTotal > 0 && (
                              <div className="flex justify-between"><span>бонусы</span><span className="font-medium">+{w.bonusTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.adjustmentTotal !== 0 && (
                              <div className="flex justify-between"><span>поправки</span><span className="font-medium">{w.adjustmentTotal > 0 ? '+' : ''}{w.adjustmentTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.advanceTotal > 0 && (
                              <div className="flex justify-between"><span>авансы</span><span className="font-medium">−{w.advanceTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.deductionTotal > 0 && (
                              <div className="flex justify-between"><span>вычеты</span><span className="font-medium">−{w.deductionTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                            {w.payoutTotal > 0 && (
                              <div className="flex justify-between"><span>выплачено</span><span className="font-medium">−{w.payoutTotal.toLocaleString('ru')} ₽</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {historyTotals.piggy.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>Копилка · итог за период</div>
                      {historyTotals.piggy.map(p => (
                        <div key={p.resourceGroup} className="flex items-center justify-between py-1 text-sm">
                          <span className={sub}>{piggyBankLabel(p.resourceGroup)}</span>
                          <span className="font-bold">{p.amount.toLocaleString('ru')} ₽</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {historyTotals.owners.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>Владельцы · итог за период</div>
                      {historyTotals.owners.map(o => (
                        <div key={o.ownerId} className="flex items-center justify-between py-1 text-sm">
                          <span className={sub}>{o.ownerName}</span>
                          <span className="font-bold">
                            {o.totalAccrued > 0 && <span>{o.totalAccrued.toLocaleString('ru')} ₽ к выплате</span>}
                            {o.totalPaid > 0 && <span>{o.totalAccrued > 0 ? ' · ' : ''}выплачено {o.totalPaid.toLocaleString('ru')} ₽</span>}
                            {o.totalAccrued === 0 && o.totalPaid === 0 && '0 ₽'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {historyLoading && historyItems.length === 0 ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Загрузка...</div>
              ) : historyItems.length === 0 ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Записей не найдено</div>
              ) : (
                (() => {
                  const grouped = historyItems.reduce<Record<string, BookingHistoryItem[]>>((acc, item) => {
                    (acc[item.date] = acc[item.date] || []).push(item);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([date, items]) => (
                    <div key={date} className="mb-4">
                      <div className={`text-xs font-semibold ${sub} mb-2 uppercase tracking-wide`}>{date}</div>
                      {items.map(item => (
                        <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                          onClick={() => openHistoryBooking(item.id)}
                          className={`${glass} rounded-2xl p-3.5 w-full text-left mb-2`}>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold" style={{ background: '#6366F1' }}>
                              {item.time}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold truncate">{item.service}</div>
                                <div className="text-sm font-bold shrink-0">{item.price.toLocaleString('ru')} ₽</div>
                              </div>
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {item.clientName}{item.car ? ` · ${item.car}` : ''}{item.plate ? `, ${item.plate}` : ''}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className={`text-[11px] ${sub}`}>
                                  {item.box}{item.workers.length > 0 ? ` · ${item.workers.map(w => w.workerName).join(', ')}` : ''}
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ownerStatusBadge(item.status)}`}>
                                  {ownerStatusLabel(item.status)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={15} className={`mt-1 shrink-0 ${sub}`} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ));
                })()
              )}
            </motion.div>
          )}

          {/* ── SETTINGS: BOOKINGS HISTORY DETAIL ── */}
          {!isAccountant && page === 'settings' && (settingsSection === 'bookings-history' || settingsSection === 'archive') && selectedHistoryBookingId && (
            <motion.div key="s-booking-split" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={closeHistoryBooking} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>

              {splitLoading || !splitDetail ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Загрузка...</div>
              ) : (
                <>
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-base font-bold truncate">{splitDetail.clientName}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(splitDetail.status)}`}>
                        {ownerStatusLabel(splitDetail.status)}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{splitDetail.service}</div>
                    <div className={`text-xs ${sub} mt-1 space-y-0.5`}>
                      <div>{splitDetail.date} · {splitDetail.time} · {splitDetail.box}</div>
                      {splitDetail.clientPhone && <div>{splitDetail.clientPhone}</div>}
                      <div>Мастера: {splitDetail.workers.length > 0
                        ? splitDetail.workers.map(w => w.workerName).join(', ')
                        : 'не назначен'}</div>
                      <div className="flex items-center gap-2">
                        <span>Оплата: {splitDetail.paymentType === 'cash' ? 'наличные' : splitDetail.paymentType === 'card' ? 'карта' : 'счёт'}</span>
                        {splitDetail.paymentSettled && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">Оплачена</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <div className={`text-xs ${sub}`}>Итоговая цена</div>
                      <div className="text-lg font-bold" style={{ color: primary }}>{splitDetail.price.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={sub}>{splitDetail.service}</span>
                        <span className="font-medium">{splitDetail.mainPrice.toLocaleString('ru')} ₽</span>
                      </div>
                      {splitDetail.additionalServices.map(a => (
                        <div key={`${a.name}-${a.price}`} className="flex justify-between text-xs">
                          <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (вычет)' : ''}{a.isOutsource ? ` (аутсорс: ${(a.outsourceAmount || 0).toLocaleString('ru')} ₽)` : ''}</span>
                          <span className="font-medium">{a.priceMode === 'subtract' ? '−' : ''}{a.price.toLocaleString('ru')} ₽</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!splitDetail.canEdit && (
                    <div className="rounded-2xl p-3 mb-3 text-xs font-medium bg-amber-500/10 text-amber-600">
                      Распределение можно редактировать только для завершённых записей.
                    </div>
                  )}

                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3">Распределение денег</h3>

                    <div className="mb-4 rounded-xl p-3 space-y-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="flex justify-between text-xs"><span className={sub}>Цена записи</span><span className="font-semibold">{splitDetail.price.toLocaleString('ru')} ₽</span></div>
                      <div className="flex justify-between text-xs"><span className={sub}>Основная услуга</span><span>{splitDetail.mainPrice.toLocaleString('ru')} ₽</span></div>
                      {splitDetail.additionalServices.map(a => (
                        <div key={`calc-${a.name}-${a.price}`} className="flex justify-between text-xs">
                          <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (вычет)' : ''}{a.isOutsource ? ` (аутсорс: ${(a.outsourceAmount || 0).toLocaleString('ru')} ₽)` : ''}</span>
                          <span>{a.priceMode === 'subtract' ? '−' : ''}{a.price.toLocaleString('ru')} ₽</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs"><span className={sub}>− Материалы</span><span>−{splitDetail.materialsCost.toLocaleString('ru')} ₽</span></div>
                      <div className="flex justify-between text-xs"><span className={sub}>Выручка (нетто)</span><span className="font-semibold">{splitDetail.net.toLocaleString('ru')} ₽</span></div>
                      {splitDetail.subtractTotal > 0 && (
                        <div className="flex justify-between text-xs"><span className={sub}>− Доп. услуги (вычет)</span><span>−{splitDetail.subtractTotal.toLocaleString('ru')} ₽</span></div>
                      )}
                      <div className="flex justify-between text-xs border-t border-white/10 pt-1"><span className={sub}>База расчёта</span><span className="font-semibold">{splitDetail.splitBase.toLocaleString('ru')} ₽</span></div>

                      <div className={`text-[10px] font-semibold uppercase tracking-wide pt-2 ${sub}`}>Кому и куда пошло</div>

                      {splitDetail.workers.map(w => {
                        const how = w.overrideEarned !== null && w.overrideEarned !== undefined
                          ? 'вручную'
                          : w.payType === 'fixed'
                            ? `фикс ${(w.fixedAmount ?? 0).toLocaleString('ru')} ₽`
                            : `${w.percent}% от базы`;
                        return (
                          <button key={`ledger-w-${w.linkId}`} onClick={() => gotoWorkerSalary(w.workerId)}
                            className="flex justify-between text-xs w-full text-left hover:opacity-80">
                            <span className={`${sub} truncate`} title={`Мастер: ${w.workerName}`}>· {w.workerName} ({how})</span>
                            <span className="font-medium shrink-0" style={{ color: '#6366F1' }}>{w.earned.toLocaleString('ru')} ₽</span>
                          </button>
                        );
                      })}

                      {splitDetail.asvcWorkers.map(w => (
                        <button key={`ledger-aw-${w.linkId}`} onClick={() => gotoWorkerSalary(w.workerId)}
                          className="flex justify-between text-xs w-full text-left hover:opacity-80">
                          <span className={`${sub} truncate`} title={`Мастер доп. услуги: ${w.workerName} — ${w.additionalServiceName}`}>
                            · {w.workerName} — «{w.additionalServiceName}»{w.payType === 'fixed' ? ` (фикс ${(w.fixedAmount ?? 0).toLocaleString('ru')} ₽)` : ` (${w.percent}%)`}
                          </span>
                          <span className="font-medium shrink-0" style={{ color: '#6366F1' }}>{w.earned.toLocaleString('ru')} ₽</span>
                        </button>
                      ))}

                      {(() => {
                        const asvcPiggyTotal = splitDetail.asvcPiggyDeposits.reduce((s, d) => s + (d.amount || 0), 0);
                        const mainPiggyDeposit = Math.max(0, splitDetail.piggyDeposit - asvcPiggyTotal);
                        const piggyHow = splitDetail.piggyPayValue > 0
                          ? ` (${splitDetail.piggyPayValue}% от базы)`
                          : splitDetail.piggyPayType === 'fixed'
                            ? ` (фикс ${splitDetail.piggyPayValue.toLocaleString('ru')} ₽)`
                            : '';
                        return (
                          <>
                            <button className="flex justify-between text-xs w-full text-left hover:opacity-80"
                              onClick={() => gotoPiggyBank()}>
                              <span className={`${sub} truncate`}>· в {piggyBankLabel(splitDetail.piggyTarget)}{piggyHow}</span>
                              <span className="font-medium shrink-0" style={{ color: '#F59E0B' }}>{mainPiggyDeposit.toLocaleString('ru')} ₽</span>
                            </button>
                            {splitDetail.asvcPiggyDeposits.map(d => (
                              <div key={`ledger-ap-${d.name}-${d.amount}`} className="flex justify-between text-xs">
                                <span className={`${sub} truncate`} title={`Остаток от «${d.name}» → в ${piggyBankLabel(d.resourceGroup)}`}>
                                  · «{d.name}» → в {piggyBankLabel(d.resourceGroup)}
                                </span>
                                <span className="font-medium">{d.amount.toLocaleString('ru')} ₽</span>
                              </div>
                            ))}
                          </>
                        );
                      })()}

                      {splitDetail.ownerShares.map(o => (
                        <button key={`ledger-o-${o.ownerId}`} onClick={() => gotoOwnerSalary(o.ownerId)}
                          className="flex justify-between text-xs w-full text-left hover:opacity-80">
                          <span className={`${sub} truncate`}>
                            · {o.ownerName}{o.status === 'paid' ? ' (выплачено)' : ' (к выплате)'}
                          </span>
                          <span className="font-medium shrink-0" style={{ color: '#A855F7' }}>{Math.round(o.amount).toLocaleString('ru')} ₽</span>
                        </button>
                      ))}

                      {(() => {
                        const asvcMasterPayTotal = splitDetail.asvcMasterPayTotal || 0;
                        const asvcPiggyTotal = splitDetail.asvcPiggyDeposits.reduce((s, d) => s + (d.amount || 0), 0);
                        const totalDistributed = splitDetail.masterTotal + splitDetail.piggyDeposit + splitDetail.ownersTotal;
                        const expectedTotal = splitDetail.splitBase + asvcMasterPayTotal + asvcPiggyTotal;
                        const diff = totalDistributed - expectedTotal;
                        const ok = Math.abs(diff) <= 1;
                        return (
                          <>
                            <div className="flex justify-between text-xs border-t border-white/10 pt-1">
                              <span className={sub}>Итого распределено</span>
                              <span className="font-semibold">{totalDistributed.toLocaleString('ru')} ₽</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={sub}>Сверка (база + оплаты доп. услуг)</span>
                              <span className={ok ? 'font-medium text-green-600' : 'font-medium text-amber-500'}>
                                {ok ? '✓ сходится' : `разница ${diff.toLocaleString('ru')} ₽`}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Материалы</div>
                          <div className={`text-[11px] ${sub}`}>авто: {splitDetail.materialsCostAuto.toLocaleString('ru')} ₽</div>
                        </div>
                        <div className="w-28 shrink-0">
                          <input
                            type="number" inputMode="numeric" min={0}
                            disabled={!splitDetail.canEdit}
                            placeholder={String(splitDetail.materialsCostAuto)}
                            value={splitMaterialsDraft}
                            onChange={e => setSplitMaterialsDraft(e.target.value)}
                            className={`${inputCls} text-right rounded-xl text-sm`}
                          />
                        </div>
                      </div>

                      <div className={`h-px ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

                      {splitWorkersDraft.map(w => {
                        const auto = splitDetail.masterByWorker[w.workerId] ?? w.earned;
                        const hasOverride = w.overrideEarned !== null && w.overrideEarned !== undefined;
                        return (
                          <div key={w.linkId} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{w.workerName}</div>
                              <div className={`text-[11px] ${sub}`}>
                                {w.payType === 'fixed'
                                  ? `Фикс: ${(w.fixedAmount ?? 0).toLocaleString('ru')} ₽`
                                  : `${w.percent}%`}
                                {hasOverride ? ` · авто: ${auto.toLocaleString('ru')} ₽` : ''}
                              </div>
                            </div>
                            <div className="w-28 shrink-0">
                              <input
                                type="number" inputMode="numeric" min={0}
                                disabled={!splitDetail.canEdit}
                                placeholder={String(auto)}
                                value={w.overrideEarned !== null && w.overrideEarned !== undefined ? String(Math.round(w.overrideEarned)) : ''}
                                onChange={e => {
                                  const raw = e.target.value;
                                  const value = raw === '' ? null : Math.max(0, Number(raw) || 0);
                                  setSplitWorkersDraft(cur => cur.map(x => x.linkId === w.linkId ? { ...x, overrideEarned: value } : x));
                                }}
                                className={`${inputCls} text-right rounded-xl text-sm`}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className={`h-px ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Копилка</div>
                          <div className={`text-[11px] ${sub}`}>
                            в {piggyBankLabel(splitDetail.piggyTarget)} · авто: {splitDetail.piggyDepositAuto.toLocaleString('ru')} ₽
                          </div>
                        </div>
                        <div className="w-28 shrink-0">
                          <input
                            type="number" inputMode="numeric" min={0}
                            disabled={!splitDetail.canEdit}
                            placeholder={String(splitDetail.piggyDepositAuto)}
                            value={splitPiggyDraft}
                            onChange={e => setSplitPiggyDraft(e.target.value)}
                            className={`${inputCls} text-right rounded-xl text-sm`}
                          />
                        </div>
                      </div>

                      <div className={`h-px ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

                      {splitOwnersDraft.map(o => {
                        const paid = o.status === 'paid';
                        const auto = splitDetail.ownerByOwnerAuto[o.ownerId] ?? 0;
                        return (
                          <div key={o.ownerId} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{o.ownerName}</div>
                              <div className={`text-[11px] ${sub}`}>
                                {paid ? 'Выплачено' : `авто: ${auto.toLocaleString('ru')} ₽`}
                              </div>
                            </div>
                            <div className="w-28 shrink-0">
                              <input
                                type="number" inputMode="numeric" min={0}
                                disabled={!splitDetail.canEdit || paid}
                                placeholder={String(auto)}
                                value={o.amount > 0 ? String(Math.round(o.amount)) : ''}
                                onChange={e => setSplitOwnersDraft(cur => cur.map(x => x.ownerId === o.ownerId ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x))}
                                className={`${inputCls} text-right rounded-xl text-sm ${paid ? 'opacity-50' : ''}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {splitDetail.piggyTransactions.length > 0 && (
                      <>
                        <div className={`h-px ${isDark ? 'bg-white/10' : 'bg-black/5'} my-3`} />
                        <h4 className="text-xs font-semibold mb-2">Движения по копилке</h4>
                        <div className="space-y-1.5">
                          {splitDetail.piggyTransactions.map(tx => {
                            const positive = tx.amount > 0;
                            const label = {
                              deposit_24percent: 'Депозит',
                              material_withdrawal: 'Списание материалов',
                              material_repayment: 'Возврат материалов',
                            }[tx.transactionType] || tx.transactionType;
                            return (
                              <div key={tx.id} className="flex items-start justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <div className="truncate">{tx.purpose}</div>
                                  <div className={`${sub} text-[10px]`}>
                                    {label}{tx.date ? ` · ${tx.date}` : ''}{tx.resourceGroup ? ` · ${piggyBankLabel(tx.resourceGroup)}` : ''}
                                  </div>
                                </div>
                                <div className={`font-semibold shrink-0 ${positive ? 'text-green-600' : 'text-red-500'}`}>
                                  {positive ? '+' : ''}{Math.round(tx.amount).toLocaleString('ru')} ₽
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {splitDetail.canEdit && (
                    <>
                      <button onClick={() => void handleSaveMoneySplit()}
                        disabled={splitSaving}
                        className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-3 disabled:opacity-60"
                        style={{ background: primary }}>
                        <Save size={16} />{splitSaving ? 'Сохраняем...' : 'Сохранить изменения'}
                      </button>
                      {splitDetail.hasCustom && (
                        <button onClick={() => void handleResetMoneySplit()}
                          disabled={splitSaving}
                          className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
                          style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <RefreshCw size={15} />Сбросить к автоматическому расчёту
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── SETTINGS: ARCHIVE ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'archive' && !selectedHistoryBookingId && (
            <motion.div key="s-archive" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => { setSettingsSection(null); setArchiveHighlight(null); }} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-1">Архив</h2>
              <div className={`text-xs ${sub} mb-4`}>Главная библиотека и картотека: все записи, доходы, расходы и расчёты за период</div>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'day', label: 'День' },
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'year', label: 'Год' },
                  { id: 'all', label: 'Всё' },
                  { id: 'custom', label: 'Свои' },
                ].map(option => (
                  <button key={option.id}
                    onClick={() => setArchivePeriod(option.id as typeof archivePeriod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${archivePeriod === option.id ? 'text-white' : `${glass} ${sub}`}`}
                    style={archivePeriod === option.id ? { background: '#10B981' } : undefined}>
                    {option.label}
                  </button>
                ))}
                <button onClick={() => { setArchiveCalendarStep('year'); setArchiveCalendarOpen(true); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${glass} ${sub}`}>
                  <CalendarDays size={14} />Календарь
                </button>
              </div>

              {archivePeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <input type="date" value={archiveDateFrom}
                    onChange={e => setArchiveDateFrom(e.target.value)}
                    className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  <input type="date" value={archiveDateTo}
                    onChange={e => setArchiveDateTo(e.target.value)}
                    className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                </div>
              )}

              {archiveCalendarOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}
                  onClick={() => setArchiveCalendarOpen(false)}>
                  <div className={`${glass} rounded-2xl p-4 w-full max-w-sm`} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">
                        {archiveCalendarStep === 'year' ? 'Выберите год'
                          : archiveCalendarStep === 'month' ? `Год ${archiveCalendarYear}`
                          : `${archiveCalendarYear} · ${['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][archiveCalendarMonth]}`}
                      </h3>
                      <button onClick={() => setArchiveCalendarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
                    </div>

                    {archiveCalendarStep === 'year' && (
                      <div className="grid grid-cols-4 gap-2">
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years: number[] = [];
                          for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);
                          return years.map(y => (
                            <button key={y}
                              onClick={() => { setArchiveCalendarYear(y); setArchiveCalendarStep('month'); }}
                              className={`py-2 rounded-xl text-sm font-semibold transition-colors ${archiveCalendarYear === y ? 'text-white' : `${glass}`}`}
                              style={archiveCalendarYear === y ? { background: '#10B981' } : undefined}>
                              {y}
                            </button>
                          ));
                        })()}
                      </div>
                    )}

                    {archiveCalendarStep === 'month' && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <button onClick={() => setArchiveCalendarYear(y => y - 1)} className={`p-1.5 rounded-lg ${glass}`}><ChevronLeft size={16} /></button>
                          <span className="text-sm font-semibold">{archiveCalendarYear}</span>
                          <button onClick={() => setArchiveCalendarYear(y => y + 1)} className={`p-1.5 rounded-lg ${glass}`}><ChevronRight size={16} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((m, idx) => (
                            <button key={m}
                              onClick={() => { setArchiveCalendarMonth(idx); setArchiveCalendarStep('week'); }}
                              className={`py-2 rounded-xl text-sm font-medium transition-colors ${archiveCalendarMonth === idx ? 'text-white' : `${glass}`}`}
                              style={archiveCalendarMonth === idx ? { background: '#10B981' } : undefined}>
                              {m.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {archiveCalendarStep === 'week' && (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {getWeeksOfMonth(archiveCalendarYear, archiveCalendarMonth).map((w, idx) => (
                          <button key={idx}
                            onClick={() => {
                              setArchivePeriod('custom');
                              setArchiveDateFrom(formatDate(w.start));
                              setArchiveDateTo(formatDate(w.end));
                              setArchiveCalendarOpen(false);
                            }}
                            className={`w-full ${glass} rounded-xl px-3 py-2.5 text-left flex items-center justify-between`}>
                            <span className="text-sm font-medium">Неделя {idx + 1}</span>
                            <span className={`text-xs ${sub}`}>
                              {w.start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} – {w.end.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {archiveLoading ? (
                <div className={`text-center py-12 text-sm ${sub}`}>Загрузка архива...</div>
              ) : !archiveData ? (
                <div className="text-center py-12">
                  <div className={`text-sm ${sub} mb-3`}>Не удалось загрузить архив</div>
                  <button onClick={() => void fetchArchive()} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: '#10B98120', color: '#10B981' }}>Повторить</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Выручка (нетто)', value: archiveData.summary.net, color: '#10B981', onClick: gotoHistory, hint: 'История записей' },
                      { label: 'Прибыль', value: archiveData.summary.profit, color: accent, onClick: gotoWallet, hint: 'Кошелёк' },
                      { label: 'Мастера', value: archiveData.summary.masterTotal, color: '#6366F1', onClick: gotoPayroll, hint: 'Зарплаты' },
                      { label: 'Владельцы', value: archiveData.summary.ownersAccrued, color: '#A855F7', onClick: gotoPayroll, hint: 'Зарплаты' },
                      { label: 'Доходы', value: archiveData.summary.totalIncome, color: '#22C55E', onClick: gotoWallet, hint: 'Кошелёк' },
                      { label: 'Расходы', value: archiveData.summary.totalExpense, color: '#EF4444', onClick: gotoWallet, hint: 'Кошелёк' },
                      { label: 'Копилка', value: archiveData.summary.piggyDeposit, color: '#F59E0B', onClick: () => gotoPiggyBank(), hint: 'Копилка' },
                    ].map(card => (
                      <button key={card.label} onClick={card.onClick}
                        className={`${glass} rounded-2xl p-3 text-left transition active:scale-[0.98]`}>
                        <div className={`text-[11px] ${sub}`}>{card.label}</div>
                        <div className="font-bold text-base mt-0.5" style={{ color: card.color }}>
                          {card.value.toLocaleString('ru')} ₽
                        </div>
                        <div className={`text-[10px] mt-0.5`} style={{ color: card.color }}>→ {card.hint}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { id: 'bookings', label: 'Записи', count: archiveData.summary.bookingCount },
                      { id: 'incomes', label: 'Доходы', count: archiveData.summary.incomeCount },
                      { id: 'expenses', label: 'Расходы', count: archiveData.summary.expenseCount },
                      { id: 'piggy', label: 'Копилка', count: archiveData.summary.piggyTxCount },
                      { id: 'payroll', label: 'Зарплаты', count: archiveData.payroll.length },
                      { id: 'owners', label: 'Владельцы', count: archiveData.owners.length },
                    ].map(option => (
                      <button key={option.id}
                        onClick={() => setArchiveTab(option.id as ArchiveTab)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${archiveTab === option.id ? 'text-white' : `${glass} ${sub}`}`}
                        style={archiveTab === option.id ? { background: '#10B981' } : undefined}>
                        {option.label}{option.count > 0 ? ` (${option.count})` : ''}
                      </button>
                    ))}
                  </div>

                  {archiveTab === 'bookings' && (
                    archiveData.bookings.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>За этот период нет завершённых записей</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.bookings.map(b => (
                          <div key={b.id} onClick={() => openHistoryBooking(b.id)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98] cursor-pointer`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button onClick={(e) => { e.stopPropagation(); gotoClient(b.clientId, b.clientPhone || ''); }}
                                    className="text-sm font-semibold truncate hover:opacity-70" style={{ color: primary }}>
                                    {b.clientName}
                                  </button>
                                  <span className="text-sm font-medium truncate">· {b.service}</span>
                                </div>
                                <div className={`text-xs ${sub} mt-0.5`}>{b.date} · {b.time} · {b.box}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0">{b.price.toLocaleString('ru')} ₽</div>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px]">
                              {b.workers.length > 0 && (
                                <span className={sub}>Мастера:{' '}
                                  {b.workers.map((w, i) => (
                                    <button key={`${b.id}-${w.workerId}`}
                                      onClick={(e) => { e.stopPropagation(); gotoWorkerSalary(w.workerId); }}
                                      className="font-semibold hover:opacity-70" style={{ color: '#6366F1' }}>
                                      {i > 0 ? ' · ' : ''}{w.workerName} +{w.earned.toLocaleString('ru')} ₽
                                    </button>
                                  ))}
                                </span>
                              )}
                              <span className={sub}>Копилка: <b className="font-semibold" style={{ color: '#F59E0B' }}>+{b.piggyDeposit.toLocaleString('ru')} ₽</b></span>
                              <span className={sub}>Владельцы: <b className="font-semibold" style={{ color: '#A855F7' }}>+{b.ownersTotal.toLocaleString('ru')} ₽</b></span>
                              <span className={sub}>Нетто: <b className="font-semibold" style={{ color: '#10B981' }}>{b.net.toLocaleString('ru')} ₽</b></span>
                            </div>
                            {b.additionalServices.map(a => (
                              <div key={`${b.id}-${a.name}`} className="flex justify-between text-[11px] mt-1">
                                <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (вычет)' : ''}{a.isOutsource ? ` (аутсорс: ${(a.outsourceAmount || 0).toLocaleString('ru')} ₽)` : ''}</span>
                                <span className="font-medium">{a.priceMode === 'subtract' ? '−' : '+'}{a.price.toLocaleString('ru')} ₽</span>
                              </div>
                            ))}
                            {b.materialsCost > 0 && (
                              <div className="flex justify-between text-[11px] mt-1">
                                <span className={sub}>Материалы</span>
                                <span className="font-medium" style={{ color: '#EF4444' }}>−{b.materialsCost.toLocaleString('ru')} ₽</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'incomes' && (
                    archiveData.incomes.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Доходов за период нет</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.incomes.map(i => (
                          <button key={i.id}
                            id={archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? archiveHighlightId(archiveHighlight) : undefined}
                            onClick={() => gotoWalletItem('income', i.id)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}
                            style={archiveHighlight?.target === 'income' && archiveHighlight.incomeId === i.id ? { boxShadow: '0 0 0 2px #10B981' } : undefined}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{i.source}</div>
                                <div className={`text-xs ${sub} mt-0.5`}>{i.date}{i.note ? ` · ${i.note}` : ''}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#22C55E' }}>+{i.amount.toLocaleString('ru')} ₽</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'expenses' && (
                    archiveData.expenses.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Расходов за период нет</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.expenses.map(e => (
                          <button key={e.id}
                            id={archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? archiveHighlightId(archiveHighlight) : undefined}
                            onClick={() => gotoWalletItem('expense', e.id)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}
                            style={archiveHighlight?.target === 'expense' && archiveHighlight.expenseId === e.id ? { boxShadow: '0 0 0 2px #EF4444' } : undefined}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{e.title}</div>
                                <div className={`text-xs ${sub} mt-0.5`}>{e.category} · {e.date}{e.resourceGroup ? ` · ${e.resourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}` : ''}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#EF4444' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'piggy' && (
                    archiveData.piggyTransactions.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Движений копилки за период нет</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.piggyTransactions.map(tx => {
                          const isDeposit = tx.amount > 0;
                          const txLabel = tx.transactionType === 'deposit_24percent' ? '24% от заказа'
                            : tx.transactionType === 'material_repayment' ? 'Возврат материалов'
                            : tx.transactionType === 'material_withdrawal' ? 'Снятие на материалы'
                            : tx.transactionType === 'custom_deposit' ? 'Пополнение'
                            : tx.transactionType === 'custom_withdrawal' ? 'Снятие'
                            : 'Корректировка';
                          return (
                            <button key={tx.id}
                              id={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? archiveHighlightId(archiveHighlight) : undefined}
                              onClick={() => gotoPiggyBank(tx.id)}
                              className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}
                              style={archiveHighlight?.target === 'piggy' && archiveHighlight.txId === tx.id ? { boxShadow: '0 0 0 2px #F59E0B' } : undefined}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span className="text-sm font-medium">{txLabel}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${sub}`} style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                                      {tx.resourceGroup === 'detailing' ? '✨' : '🚗'}
                                    </span>
                                  </div>
                                  <div className={`text-[11px] ${sub} mt-0.5`}>
                                    {tx.date}{tx.bookingInfo ? ` · ${tx.bookingInfo}` : ''}{tx.purpose ? ` · ${tx.purpose}` : ''}
                                  </div>
                                </div>
                                <div className="font-bold text-sm shrink-0" style={{ color: isDeposit ? '#22C55E' : '#EF4444' }}>
                                  {isDeposit ? '+' : '−'}{Math.abs(tx.amount).toLocaleString('ru')} ₽
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}

                  {archiveTab === 'payroll' && (
                    archiveData.payroll.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Зарплатных данных за период нет</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.payroll.map(w => (
                          <button key={w.workerId} onClick={() => gotoWorkerSalary(w.workerId)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{w.workerName}</div>
                                <div className={`text-[11px] ${sub} mt-0.5 space-y-0.5`}>
                                  <div>записей: {w.bookingCount} · по записям: +{w.accruedFromBookings.toLocaleString('ru')} ₽{w.baseSalary > 0 ? ` · оклад: +${w.baseSalary.toLocaleString('ru')} ₽` : ''}{w.shiftPayTotal > 0 ? ` · смены (${w.shiftCount}): +${w.shiftPayTotal.toLocaleString('ru')} ₽` : ''}</div>
                                  {(w.bonusTotal > 0 || w.adjustmentTotal !== 0) && (
                                    <div>бонусы: +{w.bonusTotal.toLocaleString('ru')} ₽ · поправки: {w.adjustmentTotal > 0 ? '+' : ''}{w.adjustmentTotal.toLocaleString('ru')} ₽</div>
                                  )}
                                  {(w.advanceTotal > 0 || w.deductionTotal > 0 || w.payoutTotal > 0) && (
                                    <div>авансы: −{w.advanceTotal.toLocaleString('ru')} ₽ · вычеты: −{w.deductionTotal.toLocaleString('ru')} ₽ · выплаты: −{w.payoutTotal.toLocaleString('ru')} ₽</div>
                                  )}
                                </div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: w.balance >= 0 ? '#6366F1' : '#EF4444' }}>
                                {w.balance.toLocaleString('ru')} ₽
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'owners' && (
                    archiveData.owners.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Долей владельцев за период нет</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.owners.map(o => (
                          <button key={o.ownerId} onClick={() => gotoOwnerSalary(o.ownerId)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{o.ownerName}</div>
                                <div className={`text-[11px] ${sub} mt-0.5`}>{o.bookingCount} записей · начислено: +{o.totalAccrued.toLocaleString('ru')} ₽ · выплачено: −{o.totalPaid.toLocaleString('ru')} ₽</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#A855F7' }}>
                                {(o.totalAccrued - o.totalPaid).toLocaleString('ru')} ₽
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── SETTINGS: COMPANY ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'company' && (            <motion.div key="s-company" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Профиль компании</h2>
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-2" style={{ background: primary }}>A</div>
                <button className="text-xs" style={{ color: primary }}>Изменить логотип</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Название', key: 'name', placeholder: 'ATMOSFERA' },
                  { label: 'Юр. название', key: 'legalName', placeholder: 'ИП Иванов И.И.' },
                  { label: 'ИНН', key: 'inn', placeholder: '771234567890' },
                  { label: 'Адрес', key: 'address', placeholder: 'Москва, ул. Гаражная, 15' },
                  { label: 'Телефон', key: 'phone', placeholder: '+7 (495) 000-00-00' },
                  { label: 'Email', key: 'email', placeholder: 'info@atmosfera.ru' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <input className={inputCls} placeholder={f.placeholder} value={(company as any)[f.key]} onChange={e => setCompany(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: SCHEDULE ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'schedule' && (
            <motion.div key="s-schedule" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Расписание работы</h2>
              {scheduleState.map((day, i) => (
                <div key={day.day} className={`${glass} rounded-2xl p-4 mb-2`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{day.day}</span>
                    <button onClick={() => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, active: !d.active } : d))}
                      className="w-11 h-6 rounded-full relative transition-all" style={{ background: day.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  {day.active && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Открытие</label>
                        <input className={inputCls} type="time" value={day.open} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Закрытие</label>
                        <input className={inputCls} type="time" value={day.close} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {!isAccountant && page === 'settings' && settingsSection === 'clients' && (
            <motion.div key="s-clients" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => { setSettingsSection(null); setSettingsClientId(null); }} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold">Клиенты</h2>
                  <p className={`text-xs ${sub} mt-1`}>
                    {selectedSettingsClient ? 'История услуг, оплаты, авто и внутренняя заметка по клиенту' : 'Открой клиента, чтобы посмотреть всю историю посещений'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedSettingsClient && (
                    <button
                      onClick={() => setShowCreateClient(true)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white"
                      style={{ background: primary }}
                    >
                      <Plus size={14} />
                      Новый
                    </button>
                  )}
                  {selectedSettingsClient && (
                    <button
                      onClick={() => { setSettingsClientId(null); setNewVehicleCar(''); setNewVehiclePlate(''); setClientHistoryServiceFilter(''); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                    >
                      <ArrowLeft size={14} />
                      Назад
                    </button>
                  )}
                </div>
              </div>
              {!selectedSettingsClient && clients.length > 0 && (
                <div className={`${glass} rounded-2xl p-3 mb-4`}>
                  <div className="flex gap-2 mb-3">
                    {([
                      { id: 'phone', label: 'По телефону' },
                      { id: 'name', label: 'По имени' },
                      { id: 'plate', label: 'По госномеру' },
                    ] as const).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSettingsClientSearchMode(option.id);
                          setSettingsClientSearchQuery('');
                        }}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm ${settingsClientSearchMode === option.id ? 'text-white' : sub}`}
                        style={settingsClientSearchMode === option.id ? { background: primary } : undefined}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <input
                    className={inputCls}
                    type={settingsClientSearchMode === 'phone' ? 'tel' : 'text'}
                    placeholder={settingsClientSearchMode === 'phone' ? '+7 (___) ___-__-__' : settingsClientSearchMode === 'plate' ? 'а123вс777' : 'Иван'}
                    value={settingsClientSearchQuery}
                    onChange={(event) => setSettingsClientSearchQuery(event.target.value)}
                  />
                </div>
              )}
              {clients.length === 0 && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <Users size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Пока нет зарегистрированных клиентов</p>
                </div>
              )}
              {!selectedSettingsClient && filteredSettingsClients.map((client) => {
                const clientBookings = bookings.filter((booking) => booking.clientId === client.id);
                const spent = clientBookings.filter((booking) => booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0);
                const lastBooking = [...clientBookings].sort((left, right) => {
                  const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
                  const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
                  if (rightDate !== leftDate) return rightDate - leftDate;
                  return right.time.localeCompare(right.time);
                })[0];
                const clientDisplayName = client.name.trim() || 'Клиент без имени';
                const clientPhone = client.phone.trim();
                return (
                  <div
                    key={client.id}
                    className={`${glass} rounded-2xl p-4 mb-3 cursor-pointer transition-transform hover:-translate-y-0.5`}
                    onClick={() => { setSettingsClientId(client.id); setClientHistoryServiceFilter(''); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSettingsClientId(client.id);
                        setClientHistoryServiceFilter('');
                      }
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: primary }}>{clientDisplayName.charAt(0).toUpperCase() || '?'}</div>
                        {isClientCardIncomplete(client) && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 shadow-lg shadow-red-500/50 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{clientDisplayName}</div>
                        <div className={`text-xs ${sub}`}>{client.car || 'Автомобиль не указан'}</div>
                        {client.plate && <div className={`text-xs ${sub} font-mono`}>{client.plate}</div>}
                        {clientPhone ? (
                          <a href={`tel:${clientPhone}`} className="text-xs flex items-center gap-1 mt-0.5" style={{ color: primary }} onClick={(event) => event.stopPropagation()}>
                            <Phone size={10} />{clientPhone}
                          </a>
                        ) : (
                          <div className={`text-xs ${sub} mt-0.5`}>Телефон не указан</div>
                        )}
                        <div className={`text-[11px] ${sub} mt-1`}>
                          {lastBooking ? `Последний визит: ${lastBooking.date} ${lastBooking.time}` : 'Истории посещений пока нет'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSettingsClient(client.id, client.name);
                          }}
                          className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                          aria-label={`Удалить клиента ${client.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className={sub} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Записей', value: clientBookings.length },
                        { label: 'Завершено', value: clientBookings.filter((booking) => booking.status === 'completed').length },
                        { label: 'Потрачено', value: `${spent.toLocaleString('ru')} ₽` },
                      ].map((item) => (
                        <div key={item.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-2 text-center`}>
                          <div className="font-semibold text-sm">{item.value}</div>
                          <div className={`text-xs ${sub}`}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-3 text-xs ${sub} flex items-center justify-between gap-3`}>
                      <span>{client.referralSource ? `Откуда: ${client.referralSource}` : 'Открой карточку, чтобы увидеть все услуги и детали клиента'}</span>
                      <span>Рейтинг: {client.adminRating ? `${client.adminRating}/5` : 'без оценки'}</span>
                    </div>
                  </div>
                );
              })}
              {!selectedSettingsClient && clients.length > 0 && filteredSettingsClients.length === 0 && (
                <div className={`${glass} rounded-2xl p-6 text-center`}>
                  <div className="font-medium mb-1">Ничего не найдено</div>
                  <div className={`text-sm ${sub}`}>Попробуйте другое имя или телефон</div>
                </div>
              )}
              {selectedSettingsClient && (
                <div className="space-y-3">
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: primary }}>
                          {(selectedSettingsClient.name.trim() || 'К').charAt(0).toUpperCase()}
                        </div>
                        {isClientCardIncomplete(selectedSettingsClient) && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 shadow-lg shadow-red-500/50 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingSettingsClientCard ? (
                          <div className="space-y-2">
                            <input
                              className={inputCls}
                              placeholder="Имя клиента"
                              value={clientCardDrafts[selectedSettingsClient.id]?.name ?? selectedSettingsClient.name}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [selectedSettingsClient.id]: {
                                  ...current[selectedSettingsClient.id],
                                  name: event.target.value,
                                },
                              }))}
                            />
                            <div className="space-y-2">
                              <input
                                className={inputCls}
                                placeholder="Автомобиль"
                                value={clientCardDrafts[selectedSettingsClient.id]?.car ?? selectedSettingsClient.car}
                                onChange={(event) => setClientCardDrafts((current) => ({
                                  ...current,
                                  [selectedSettingsClient.id]: {
                                    ...current[selectedSettingsClient.id],
                                    car: event.target.value,
                                  },
                                }))}
                              />
                              <div className="flex gap-1.5">
                                <div className="flex flex-col gap-1 shrink-0">
                                  {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => {
                                    const pt = (clientCardDrafts[selectedSettingsClient.id]?.plateType as PlateType) || selectedSettingsClient.plateType || 'russian';
                                    return (
                                      <button key={t} type="button"
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${pt === t ? 'text-white font-medium' : `${sub}`}`}
                                        style={pt === t ? { background: primary } : {}}
                                        onClick={() => setClientCardDrafts((current) => ({
                                          ...current,
                                          [selectedSettingsClient.id]: {
                                            ...current[selectedSettingsClient.id],
                                            plateType: t,
                                          },
                                        }))}
                                      >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                                    );
                                  })}
                                </div>
                                <input
                                  className={`${inputCls} flex-1`}
                                  placeholder="Госномер"
                                  value={clientCardDrafts[selectedSettingsClient.id]?.plate ?? selectedSettingsClient.plate}
                                  onChange={(event) => {
                                    const pt = (clientCardDrafts[selectedSettingsClient.id]?.plateType as PlateType) || selectedSettingsClient.plateType || 'russian';
                                    setClientCardDrafts((current) => ({
                                      ...current,
                                      [selectedSettingsClient.id]: {
                                        ...current[selectedSettingsClient.id],
                                        plate: normalizePlateInput(event.target.value, pt),
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                            <input
                              className={inputCls}
                              placeholder="Телефон"
                              value={clientCardDrafts[selectedSettingsClient.id]?.phone ?? selectedSettingsClient.phone}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [selectedSettingsClient.id]: {
                                  ...current[selectedSettingsClient.id],
                                  phone: event.target.value,
                                },
                              }))}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold text-lg">{(selectedSettingsClientCardDraft?.name ?? selectedSettingsClient.name).trim() || 'Клиент без имени'}</div>
                            <div className={`text-sm ${sub} mt-1`}>
                              {(selectedSettingsClientCardDraft?.car ?? selectedSettingsClient.car) || 'Авто не указано'}{(selectedSettingsClientCardDraft?.plate ?? selectedSettingsClient.plate) ? `, ${selectedSettingsClientCardDraft?.plate ?? selectedSettingsClient.plate}` : ''}
                            </div>
                            {selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone ? (
                              <a href={`tel:${selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone}`} className="text-sm flex items-center gap-1 mt-1" style={{ color: primary }}>
                                <Phone size={12} />{selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone}
                              </a>
                            ) : (
                              <div className={`text-sm ${sub} mt-1`}>Телефон не указан</div>
                            )}
                            <div className={`text-sm ${sub} mt-1`}>
                              {(selectedSettingsClientCardDraft?.referralSource ?? selectedSettingsClient.referralSource) ? `Узнал: ${selectedSettingsClientCardDraft?.referralSource ?? selectedSettingsClient.referralSource}` : 'Откуда узнал: не указано'}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setEditingSettingsClientCard(!editingSettingsClientCard)}
                          className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                          aria-label="Редактировать карточку"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => void handleDeleteSettingsClient(selectedSettingsClient.id, selectedSettingsClient.name)}
                          className={`p-2 rounded-xl ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                          aria-label={`Удалить клиента ${selectedSettingsClient.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {selectedSettingsClient.adminNote && (
                      <div className={`rounded-xl px-3 py-2.5 mb-4 text-sm border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                        <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>⚑ Примечание:</div>
                        {selectedSettingsClient.adminNote}
                      </div>
                    )}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => openBookingForClient(selectedSettingsClient, 'completed')}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                        style={{ background: primary }}
                      >
                        <Plus size={16} />
                        Прошлая запись
                      </button>
                      <button
                        type="button"
                        onClick={() => openBookingForClient(selectedSettingsClient, 'confirmed')}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                        style={{ background: primary }}
                      >
                        <Plus size={16} />
                        Новая запись
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: 'Всего записей', value: selectedSettingsClientBookings.length },
                        { label: 'Завершённых', value: selectedSettingsClientCompletedCount },
                        { label: 'Потрачено', value: `${selectedSettingsClientSpent.toLocaleString('ru')} ₽` },
                        { label: 'Долг', value: `${selectedSettingsClient.debtBalance.toLocaleString('ru')} ₽` },
                      ].map((item) => (
                        <div key={item.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                          <div className="font-semibold">{item.value}</div>
                          <div className={`text-xs ${sub}`}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                        <div className={`text-xs ${sub} mb-1`}>Ближайшая запись</div>
                        <div className="text-sm">
                          {selectedSettingsClientUpcoming
                            ? `${selectedSettingsClientUpcoming.date} ${selectedSettingsClientUpcoming.time} • ${selectedSettingsClientUpcoming.service}`
                            : 'Нет активных записей'}
                        </div>
                      </div>
                      <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                        <div className={`text-xs ${sub} mb-1`}>Последний завершённый визит</div>
                        <div className="text-sm">
                          {selectedSettingsClientLastVisit
                            ? `${selectedSettingsClientLastVisit.date} ${selectedSettingsClientLastVisit.time} • ${selectedSettingsClientLastVisit.service}`
                            : 'Пока нет завершённых услуг'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Заметки по клиенту</label>
                        <textarea
                          className={`${inputCls} h-24 resize-none`}
                          placeholder="Общие заметки"
                          value={clientCardDrafts[selectedSettingsClient.id]?.notes ?? selectedSettingsClient.notes ?? ''}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedSettingsClient.id]: {
                              ...current[selectedSettingsClient.id],
                              notes: event.target.value,
                            },
                          }))}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Долг клиента</label>
                        <input
                          className={inputCls}
                          type="number"
                          placeholder="0"
                          value={clientCardDrafts[selectedSettingsClient.id]?.debtBalance ?? String(selectedSettingsClient.debtBalance || 0)}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedSettingsClient.id]: {
                              ...current[selectedSettingsClient.id],
                              debtBalance: event.target.value,
                            },
                          }))}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Рейтинг клиента для админа</label>
                        <select
                          className={selectCls}
                          value={clientCardDrafts[selectedSettingsClient.id]?.adminRating ?? 0}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedSettingsClient.id]: {
                              ...current[selectedSettingsClient.id],
                              adminRating: Number(event.target.value),
                            },
                          }))}
                        >
                          {[0, 1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>{value === 0 ? 'Без оценки' : `${value}/5`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Внутреннее примечание</label>
                        <textarea
                          className={`${inputCls} min-h-[100px] resize-none`}
                          placeholder="Видно только администратору"
                          value={clientCardDrafts[selectedSettingsClient.id]?.adminNote ?? ''}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedSettingsClient.id]: {
                              ...current[selectedSettingsClient.id],
                              adminNote: event.target.value,
                            },
                          }))}
                        />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Как узнал о нас</label>
                        <select
                          className={selectCls}
                          value={clientCardDrafts[selectedSettingsClient.id]?.referralSource ?? ''}
                          onChange={(event) => setClientCardDrafts((current) => ({
                            ...current,
                            [selectedSettingsClient.id]: {
                              ...current[selectedSettingsClient.id],
                              referralSource: event.target.value,
                            },
                          }))}
                        >
                          {REFERRAL_SOURCES.map((source) => (
                            <option key={source.value} value={source.value}>{source.label}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => { void handleSaveClientCard(selectedSettingsClient.id); }}
                        disabled={savingClientId === selectedSettingsClient.id}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
                        style={{ background: primary }}
                      >
                        {savingClientId === selectedSettingsClient.id ? 'Сохраняем...' : 'Сохранить карточку клиента'}
                      </button>
                    </div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">Автомобили клиента <span className={`text-xs font-normal ${sub}`}>({selectedSettingsClientVehicles.length}/10)</span></div>
                    </div>
                    {selectedSettingsClientVehicles.length === 0 ? (
                      <div className={`text-sm ${sub} mb-3`}>Автомобили ещё не добавлены</div>
                    ) : (
                      <div className="space-y-2">
                        {selectedSettingsClientVehicles.map((vehicle, index) => {
                          const isMain = vehicle.isMain ?? index === 0;
                          return (
                            <div key={`${vehicle.car}-${vehicle.plate}-${index}`} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 flex items-center justify-between gap-3 ${isMain ? (isDark ? 'ring-1 ring-amber-500/30' : 'ring-1 ring-amber-300') : ''}`}>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {vehicle.car || 'Авто без названия'}
                                  {isMain && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">Основное</span>}
                                </div>
                                <div className={`text-xs ${sub}`}>{vehicle.plate || 'Номер не указан'}</div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {!isMain && (
                                  <button
                                    type="button"
                                    title="Сделать основным"
                                    onClick={() => {
                                      const client = selectedSettingsClient;
                                      if (!client) return;
                                      const current = [...(draftVehicles[client.id] ?? (client.vehicles?.length
                                        ? client.vehicles
                                        : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]))];
                                      setDraftVehicles((prev) => ({
                                        ...prev,
                                        [client.id]: current.map((v, i) => ({
                                          ...v,
                                          isMain: i === index,
                                        })),
                                      }));
                                      const selected = current[index];
                                      setClientCardDrafts((prev) => ({
                                        ...prev,
                                        [client.id]: {
                                          name: prev[client.id]?.name ?? client.name,
                                          phone: prev[client.id]?.phone ?? client.phone,
                                          car: selected.car || '',
                                          plate: selected.plate || '',
                                          plateType: selected.plateType || 'russian',
                                          notes: prev[client.id]?.notes ?? client.notes ?? '',
                                          debtBalance: prev[client.id]?.debtBalance ?? String(client.debtBalance || 0),
                                          adminRating: prev[client.id]?.adminRating ?? client.adminRating,
                                          adminNote: prev[client.id]?.adminNote ?? client.adminNote ?? '',
                                          referralSource: prev[client.id]?.referralSource ?? client.referralSource ?? '',
                                        },
                                      }));
                                    }}
                                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-black/20'}`}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </button>
                                )}
                                {isMain && (
                                  <span className="p-1.5 text-amber-500">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const client = selectedSettingsClient;
                                    if (!client) return;
                                    const current = draftVehicles[client.id] ?? (client.vehicles?.length
                                      ? client.vehicles
                                      : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]);
                                    setDraftVehicles((prev) => ({
                                      ...prev,
                                      [client.id]: current.filter((_, i) => i !== index),
                                    }));
                                    setBottomToast('Авто удалено');
                                    setTimeout(() => setBottomToast(null), 3000);
                                  }}
                                  className={`p-1.5 rounded-lg ${isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-500'}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedSettingsClientVehicles.length < 10 && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className={inputCls}
                            placeholder="Марка авто"
                            value={newVehicleCar}
                            onChange={(e) => setNewVehicleCar(e.target.value)}
                          />
                          <input
                            className={inputCls}
                            placeholder="Госномер"
                            maxLength={9}
                            value={newVehiclePlate}
                            onChange={(e) => setNewVehiclePlate(normalizePlateInput(e.target.value))}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!newVehicleCar.trim() && !newVehiclePlate.trim()}
                          onClick={() => {
                            const client = selectedSettingsClient;
                            if (!client) return;
                            const current = draftVehicles[client.id] ?? (client.vehicles?.length
                              ? client.vehicles
                              : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]);
                            setDraftVehicles((prev) => ({
                              ...prev,
                              [client.id]: [...current, { car: normalizeVehicleInput(newVehicleCar), plate: normalizePlateInput(newVehiclePlate), plateType: 'russian' }],
                            }));
                            setNewVehicleCar('');
                            setNewVehiclePlate('');
                            setBottomToast('Авто добавлено');
                            setTimeout(() => setBottomToast(null), 3000);
                          }}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                          style={{ color: primary }}
                        >
                          <Plus size={14} />
                          Добавить авто
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="font-semibold mb-3">История услуг</div>
                    {selectedSettingsClientBookings.length > 0 && (
                      <div className="mb-3">
                        <ServiceSearchSelect
                          value={clientHistoryServiceFilter}
                          services={services}
                          selectCls={selectCls}
                          inputCls={inputCls}
                          glass={glass}
                          text={text}
                          sub={sub}
                          primary={primary}
                          isDark={isDark}
                          placeholder="Поиск по услугам"
                          onChange={setClientHistoryServiceFilter}
                        />
                      </div>
                    )}
                    {selectedSettingsClientFilteredBookings.length === 0 ? (
                      <div className={`text-sm ${sub}`}>
                        {selectedSettingsClientBookings.length === 0
                          ? 'У клиента пока нет записей'
                          : 'По выбранной услуге записей нет'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedSettingsClientFilteredBookings.map((booking) => (
                          <div key={booking.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-2xl p-3`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="font-medium text-sm truncate">{booking.service}{booking.services && booking.services.length > 0 ? <span className="ml-1 text-xs" style={{ color: primary }}>+{booking.services.length}</span> : ''}</div>
                                  <SourceBadge source={booking.source} />
                                </div>
                                <div className={`text-xs ${sub} mt-0.5`}>
                                  {booking.date} • {booking.time} • {booking.box || 'Без бокса'}
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-[11px] ${ownerStatusBadge(booking.status)}`}>
                                {ownerStatusLabel(booking.status)}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setSelectedBooking(booking); setShowBookingDetail(true); }}
                                className={`p-1.5 rounded-lg shrink-0 ${isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                                title="Редактировать запись"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Стоимость</div>
                                <div>{booking.price.toLocaleString('ru')} ₽</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Оплата</div>
                                <div>{ownerPaymentLabel(booking.paymentType, booking.paymentSettled)}</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Авто</div>
                                <div>{booking.car || 'Не указано'}</div>
                              </div>
                              <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                                <div className={`text-[11px] ${sub}`}>Номер</div>
                                <div>{booking.plate || 'Не указан'}</div>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              <div className={sub}>Длительность: {booking.duration} мин</div>
                              <div className={sub}>Мастера: {booking.workers.length ? booking.workers.map((worker) => worker.workerName).join(', ') : 'Не назначены'}</div>
                              <div className={sub}>Комментарий: {booking.notes?.trim() ? booking.notes : 'Нет комментария'}</div>
                              <div className={sub}>Создано: {booking.createdAt.toLocaleString('ru-RU')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SETTINGS: DEPOSIT ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'deposit' && (
            <DepositPanel onBack={() => setSettingsSection(null)} />
          )}

          {/* ── SETTINGS: BOXES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'boxes' && (
            <motion.div key="s-boxes" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">Управление боксами</h2>
                <button
                  onClick={handleAddBoxDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} />
                  Добавить бокс
                </button>
              </div>
              {boxes.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  Боксов пока нет. Добавьте первый бокс и сохраните изменения.
                </div>
              )}
              {boxes.map((box, i) => (
                <div key={box.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${primary}18` }}>
                        <Box size={14} style={{ color: primary }} />
                      </div>
                      <span className="font-medium">{box.name || `Бокс ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRemoveBoxDraft(box.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} />
                      </button>
                      <button onClick={() => setBoxes(p => p.map((b, j) => j === i ? { ...b, active: !b.active } : b))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: box.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${box.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Название бокса</label>
                      <input className={inputCls} value={box.name} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, name: e.target.value } : b))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽/час)</label>
                      <input className={inputCls} type="number" value={numberInputValue(box.pricePerHour)} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, pricePerHour: numberFromInput(e.target.value) } : b))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Группа ресурсов</label>
                      <select className={selectCls} value={box.resourceGroup} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, resourceGroup: e.target.value } : b))}>
                        <option value="wash">Мойка</option>
                        <option value="detailing">Детейлинг</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                    <input className={inputCls} value={box.description} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, description: e.target.value } : b))} />
                  </div>

                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: SERVICES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'services' && (
            <motion.div key="s-services" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">Услуги и цены</h2>
                <button
                  onClick={handleAddServiceDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} />
                  Добавить услугу
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                <input className={`${inputCls} pl-9`} type="text" placeholder="Поиск услуг..." value={servicesSearchQuery} onChange={e => setServicesSearchQuery(e.target.value)} />
              </div>
              {services.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  Услуг пока нет. Добавьте первую услугу и сохраните изменения.
                </div>
              )}
              {services.map((s, idx) => ({ s, idx })).filter(({ s }) => {
                const q = servicesSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return [s.name, s.category, s.desc].some((v) => v.toLowerCase().includes(q));
              }).map(({ s: service, idx: i }) => {
                const summary = serviceMoneySummary(service);
                const cardMaterialsCost = (service.materials ?? []).reduce((sum, m) => {
                  const stockItem = stockItems.find(s => s.id === m.stockItemId);
                  return sum + (stockItem ? Number(m.qty || 0) * stockItem.unitPrice : 0);
                }, 0);
                const summaryLines = (service.materials ?? []).length > 0
                  ? [`материалы: ${Math.round(cardMaterialsCost).toLocaleString('ru')} ₽`, ...summary]
                  : summary;
                return (
                <div key={service.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}18` }}>
                        <Sliders size={14} style={{ color: primary }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">{service.name || `Услуга ${i + 1}`}</div>
                        <div className={`text-xs ${sub} truncate`}>
                          {service.category} · {service.price ? `${service.price.toLocaleString('ru')} ₽` : 'цена не указана'} · {service.duration} мин
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingServiceId(service.id); setShowServiceSettings(true); }}
                        title="Настроить услугу"
                        className="p-2 rounded-xl"
                        style={{ background: `${primary}14`, color: primary }}
                      >
                        <Settings size={15} />
                      </button>
                      <button onClick={() => handleRemoveServiceDraft(service.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} />
                      </button>
                      <button onClick={() => setServicesState(p => p.map((item, j) => j === i ? { ...item, active: !item.active } : item))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: service.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${service.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/5'} rounded-xl px-3 py-2 text-xs space-y-0.5`}>
                    {summaryLines.map((line, li) => (
                      <div key={li} className={`flex items-center gap-2 ${sub}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: [accent, '#EAB308', primary][li % 3] }} />
                        {line}
                      </div>
                    ))}
                    <button
                      onClick={() => { setEditingServiceId(service.id); setShowServiceSettings(true); }}
                      className="mt-1 text-xs font-medium flex items-center gap-1"
                      style={{ color: primary }}
                    >
                      <Settings size={11} /> Тонкая настройка расчёта
                    </button>
                  </div>
                </div>
              );
              })}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
              <p className={`text-xs ${sub} text-center mt-2`}>Изменения применяются к новым завершённым записям</p>
            </motion.div>
          )}

          {/* ── SETTINGS: EMPLOYEES ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'employees' && (
            <motion.div key="s-employees" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Сотрудники</h2>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">Нанять сотрудника</div>
                    <div className={`text-xs ${sub}`}>Создайте логин и пароль для нового мастера</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                    <Plus size={18} style={{ color: accent }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Роль</label>
                    <select
                      className={selectCls}
                      value={newEmployee.role}
                      onChange={e => setNewEmployee(p => ({ ...p, role: e.target.value as 'admin' | 'worker' | 'accountant' }))}
                    >
                      <option value="worker">Мастер</option>
                      <option value="admin">Администратор</option>
                      <option value="accountant">Бухгалтер</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Имя</label>
                    <input className={inputCls} value={newEmployee.name} onChange={e => setNewEmployee(p => ({ ...p, name: e.target.value }))} placeholder="Иван Иванов" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Логин</label>
                    <input className={inputCls} value={newEmployee.login} onChange={e => setNewEmployee(p => ({ ...p, login: e.target.value }))} placeholder="worker_ivan" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Пароль</label>
                    <input className={inputCls} type="password" value={newEmployee.password} onChange={e => setNewEmployee(p => ({ ...p, password: e.target.value }))} placeholder="Минимум 1 символ" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={newEmployee.telegramChatId} onChange={e => setNewEmployee(p => ({ ...p, telegramChatId: e.target.value }))} placeholder="Например: 123456789" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                    <input className={inputCls} value={newEmployee.phone} onChange={e => setNewEmployee(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Email</label>
                    <input className={inputCls} value={newEmployee.email} onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))} placeholder="worker@atmosfera.ru" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>% от выручки</label>
                    <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={newEmployee.percent === '' ? '' : newEmployee.percent} onChange={e => { const r = e.target.value; if (r === '') { setNewEmployee(p => ({ ...p, percent: '' })); return; } const n = parseFloat(r); if (!isNaN(n)) { setNewEmployee(p => ({ ...p, percent: Math.min(100, Math.max(0, n)) })); } }} onBlur={() => setNewEmployee(p => ({ ...p, percent: p.percent === '' ? 0 : p.percent }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Оклад (₽)</label>
                    <input className={inputCls} type="number" min={0} value={newEmployee.salaryBase} onChange={e => setNewEmployee(p => ({ ...p, salaryBase: Math.max(0, +e.target.value) }))} />
                  </div>
                </div>
                <button onClick={() => void handleHireWorker()} disabled={employeeActionLoading?.type === 'hire'} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-3 disabled:opacity-60" style={{ background: accent }}>
                  <Plus size={16} />
                  Нанять сотрудника
                </button>
              </div>
              {employeeSettings.map((emp, i) => (
                <div key={emp.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm" style={{ background: primary }}>{emp.name.charAt(0)}</div>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">{emp.name}</div>
                        <div className={`text-xs ${sub}`}>{employeeRoleLabel(emp.role)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        disabled={employeeActionLoading?.type === 'fire' && employeeActionLoading.workerId === emp.id}
                        onClick={() => { void handleFireWorker(emp.id, emp.name); }}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium text-red-500 border border-red-500/20 bg-red-500/10 disabled:opacity-60"
                      >
                        Уволить
                      </button>
                      <button
                        onClick={() => {
                          setResetPasswordTarget(emp);
                          setResetPasswordValue('');
                          setResetPasswordConfirm('');
                          setResetPasswordError('');
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-medium border disabled:opacity-60"
                        style={{ color: primary, borderColor: `${primary}30`, background: `${primary}10` }}
                      >
                        Сбросить
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>% от выручки</label>
                      <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={emp.percent === '' ? '' : emp.percent} onChange={e => { const r = e.target.value; if (r === '') { setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: '' } : em)); return; } const n = parseFloat(r); if (!isNaN(n)) { setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: Math.min(100, Math.max(0, n)) } : em)); } }} onBlur={() => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: em.percent === '' ? 0 : em.percent } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Оклад (₽)</label>
                      <input className={inputCls} type="number" value={emp.salaryBase} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryBase: +e.target.value } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Оклад за выход (₽)</label>
                      <input className={inputCls} type="number" min={0} value={emp.salaryPerShift || 0} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryPerShift: Math.max(0, +e.target.value) } : em))} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={emp.telegramChatId} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, telegramChatId: e.target.value } : em))} placeholder="Например: 123456789" />
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: NOTIFICATIONS ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'notifications' && (
            <motion.div key="s-notifs" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Уведомления</h2>
              <div className={`text-xs font-medium ${sub} mb-2 uppercase tracking-wider`}>Каналы</div>
              {[
                { key: 'telegramBot', label: 'Telegram Bot', desc: '@atmosfera_bot' },
                { key: 'emailReports', label: 'Email отчёты', desc: 'owner@atmosfera.ru' },
                { key: 'smsReminders', label: 'SMS напоминания', desc: 'Для клиентов' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>Отчёты</div>
              {[
                { key: 'lowStock', label: 'Низкий остаток склада', desc: 'При снижении до 5 единиц' },
                { key: 'dailyReport', label: 'Ежедневный отчёт', desc: 'В 21:00 каждый день' },
                { key: 'weeklyReport', label: 'Еженедельный отчёт', desc: 'По понедельникам в 9:00' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>Напоминания</div>
              <SettingRow
                label="Автонапоминания о записях"
                desc="Ежедневный cron Vercel отправляет напоминания на завтрашние записи, а владелец может дублировать их вручную"
                value={notifSettings.bookingReminders}
                onChange={() => setNotifSettings((current) => ({ ...current, bookingReminders: !current.bookingReminders }))}
              />
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: INTEGRATIONS ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'integrations' && (
            <motion.div key="s-integrations" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Интеграции</h2>
              {[
                { key: 'telegram', label: 'Telegram Bot', desc: 'Уведомления и управление через Telegram', color: '#229ED9' },
                { key: 'yookassa', label: 'ЮКасса', desc: 'Приём онлайн-платежей', color: '#7B61FF' },
                { key: 'amoCrm', label: 'amoCRM', desc: 'Синхронизация клиентской базы', color: '#E6007E' },
              ].map(item => (
                <div key={item.key} className={`${glass} rounded-2xl p-4 mb-2 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <Globe size={18} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <button onClick={() => setIntegrations(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: integrations[item.key as keyof typeof integrations] ? item.color : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${integrations[item.key as keyof typeof integrations] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <div className={`${glass} rounded-2xl p-4 mb-2`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#4285F418' }}>
                    <Globe size={18} style={{ color: '#4285F4' }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Google Календарь</div>
                    <div className={`text-xs ${sub}`}>Двусторонняя синхронизация расписания</div>
                  </div>
                  {integrations.googleCalendar ? (
                    <span className="text-[11px] px-2 py-1 rounded-full shrink-0" style={{ background: '#22C55E18', color: '#22C55E' }}>Подключено</span>
                  ) : (
                    <button
                      onClick={() => { void handleGoogleConnect(); }}
                      disabled={googleConnectLoading}
                      className="text-xs px-3 py-1.5 rounded-full text-white font-medium shrink-0 disabled:opacity-50"
                      style={{ background: '#4285F4' }}>
                      {googleConnectLoading ? 'Подключение...' : 'Подключить'}
                    </button>
                  )}
                </div>
                {googleConnectError && <div className="text-xs text-red-500 mb-2">{googleConnectError}</div>}
                {googleSetupOpen && googleSetupStatus && !integrations.googleCalendar && (
                  <div className="space-y-2.5 mt-2 mb-2 rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => { e.preventDefault(); openExternal('https://console.cloud.google.com/apis/credentials'); }}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-medium"
                      style={{ background: '#4285F4' }}>
                      Создать OAuth-клиент в Google <ExternalLink size={12} />
                    </a>
                    <div className={`text-[11px] ${sub}`}>
                      Если Google откроет меню с проектами: создайте проект (это бесплатно),
                      затем нажмите <span className="font-medium">Включить Google Calendar API</span> —
                      <a
                        href="https://console.cloud.google.com/apis/library/calendar.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => { e.preventDefault(); openExternal('https://console.cloud.google.com/apis/library/calendar.googleapis.com'); }}
                        className="underline"
                        style={{ color: '#4285F4' }}
                      >
                        прямая ссылка
                      </a>, после чего вернитесь на эту страницу и создайте OAuth Client ID
                      (Web application), добавив в него этот адрес:
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="flex-1 text-[11px] px-2 py-1 rounded-lg break-all" style={{ background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)' }}>
                          {googleSetupStatus.redirectUri}
                        </code>
                        <button
                          onClick={() => { void handleGoogleCopyUri(); }}
                          className="text-[11px] px-2 py-1 rounded-lg shrink-0 font-medium"
                          style={{ color: '#4285F4', background: '#4285F418' }}>
                          {googleCopiedUri ? 'Ок' : 'Копировать'}
                        </button>
                      </div>
                    </div>
                    <label
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ color: googleJsonFile ? '#22C55E' : '#4285F4', background: googleJsonFile ? '#22C55E18' : '#4285F418' }}>
                      {googleJsonFile ? `✓ ${googleJsonFile}` : 'Загрузить файл настроек (.json)'}
                      <span className="hidden">
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleGoogleLoadJson(file);
                            e.target.value = '';
                          }}
                        />
                      </span>
                    </label>
                    {googleJsonError && <div className="text-[11px] text-red-500">{googleJsonError}</div>}
                    {!googleJsonFile && (
                      <div className={`text-[11px] ${sub}`}>или вставьте вручную:</div>
                    )}
                    <input
                      className={`${inputCls}`}
                      placeholder="Client ID (…apps.googleusercontent.com)"
                      value={googleClientId}
                      onChange={e => setGoogleClientId(e.target.value)}
                      autoComplete="off"
                    />
                    <input
                      className={`${inputCls}`}
                      type="password"
                      placeholder="Client Secret"
                      value={googleClientSecret}
                      onChange={e => setGoogleClientSecret(e.target.value)}
                      autoComplete="off"
                    />
                    <div className="flex gap-2 pt-0.5">
                      <button
                        onClick={() => { void handleGoogleSaveKeys(); }}
                        disabled={googleSavingKeys || !googleClientId.trim() || !googleClientSecret.trim()}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                        style={{ background: '#4285F4' }}>
                        {googleSavingKeys ? 'Подключение...' : 'Подключить'}
                      </button>
                      <button
                        onClick={() => { setGoogleSetupOpen(false); setGoogleConnectError(null); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                        Отмена
                      </button>
                    </div>
                    <div className={`text-[11px] ${sub} leading-relaxed`}>
                      Если Google покажет предупреждение «непроверенное приложение» — это нормально
                      для личного подключения: нажмите <span className="font-medium">Advanced</span> →
                      <span className="font-medium"> Continue (unsafe)</span>. Если вместо входа появится
                      <span className="font-medium"> 403 access_denied</span> или «только тестовые
                      пользователи» — откройте настройки доступа и добавьте свой email в Test users
                      (или нажмите <span className="font-medium">Publish app</span>):
                      <button
                        onClick={() => openExternal('https://console.cloud.google.com/apis/credentials/consent')}
                        className="flex items-center justify-center gap-1.5 mt-1.5 w-full py-2 rounded-xl text-[11px] font-medium"
                        style={{ color: '#4285F4', background: '#4285F418' }}>
                        Открыть OAuth consent screen <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                )}
                {!integrations.googleCalendar && (
                  <div className={`text-xs ${sub}`}>
                    Подключите Google Календарь, чтобы записи из бота автоматически появлялись в календаре,
                    а события из Google — в расписании (отмечены как «Google»).
                  </div>
                )}
                {integrations.googleCalendar && (
                  <div className="space-y-2">
                    <button
                      onClick={() => { void handleGoogleSyncNow(); }}
                      disabled={googleSyncing}
                      className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: '#4285F418', color: '#4285F4' }}>
                      {googleSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
                    </button>
                    {googleSyncResult && (
                      <div className={`text-xs ${sub} space-y-0.5`}>
                        {googleSyncResult.skipped ? (
                          <div>Синхронизация пропущена (нет токенов или нечего делать)</div>
                        ) : googleSyncResult.created === undefined ? (
                          <div>Синхронизация завершена</div>
                        ) : (
                          <div>
                            Создано: {googleSyncResult.created} · Обновлено: {googleSyncResult.updated} · Отменено: {googleSyncResult.cancelled}
                          </div>
                        )}
                        {googleSyncResult.lastSyncAt && (
                          <div>Последняя синхронизация: {new Date(googleSyncResult.lastSyncAt).toLocaleString('ru-RU')}</div>
                        )}
                        {googleSyncResult.error && <div className="text-red-500">Ошибка: {googleSyncResult.error}</div>}
                        {googleSyncResult.errorDetails && (
                          <div className="text-[11px] leading-relaxed mt-1 text-red-500/90">{googleSyncResult.errorDetails}</div>
                        )}
                      </div>
                    )}
                    {googleSyncError && <div className="text-xs text-red-500">{googleSyncError}</div>}
                    <button
                      onClick={() => { void handleGoogleDisconnect(); }}
                      className="w-full py-2 rounded-xl text-xs font-medium"
                      style={{ color: '#EF4444', background: `${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                      Отключить Google Календарь
                    </button>
                    <button
                      onClick={() => { void handleGoogleEditKeys(); }}
                      className="w-full py-2 rounded-xl text-xs font-medium"
                      style={{ color: '#4285F4', background: `${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                      Изменить ключи подключения
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} />{settingsSaved ? 'Сохранено!' : 'Сохранить'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: CONTENT ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'content' && (
            <motion.div key="s-content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <ContentEditor
                initialContent={content}
                onSave={saveContent}
                glass={glass}
                inputCls={inputCls}
                sub={sub}
                primary={primary}
                isDark={isDark}
              />
            </motion.div>
          )}

          {/* ── SETTINGS: SECURITY ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'security' && (
            <motion.div key="s-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Безопасность</h2>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>СМЕНА ПАРОЛЯ</div>
                <div className="space-y-3">
                  {[{ key: 'current', label: 'Текущий пароль' }, { key: 'new_', label: 'Новый пароль' }, { key: 'confirm', label: 'Повторите пароль' }].map(f => (
                    <div key={f.key}>
                      <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                      <div className="relative">
                        <input className={inputCls} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                          value={password[f.key as keyof typeof password]}
                          onChange={e => {
                            setSecurityError(null);
                            setSecuritySaved(false);
                            setPassword(p => ({ ...p, [f.key]: e.target.value }));
                          }} />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPass ? <EyeOff size={14} className={sub} /> : <Eye size={14} className={sub} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {securityError && <div className="mt-3 text-xs text-red-500">{securityError}</div>}
                {securitySaved && <div className="mt-3 text-xs text-green-600">Настройки безопасности сохранены</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Двухфакторная аутентификация</div>
                    <div className={`text-xs ${sub}`}>Код подтверждения приходит в Telegram владельца</div>
                  </div>
                  <button
                    onClick={() => {
                      setSecurityError(null);
                      setSecuritySaved(false);
                      setTwoFactor(!twoFactor);
                    }}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: twoFactor ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${twoFactor ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className={`text-xs ${sub} mt-3`}>
                  {staffProfile?.telegramChatId
                    ? `Telegram подключён: ${staffProfile.telegramChatId}`
                    : 'Сначала привяжите Telegram владельца, иначе 2FA не включится.'}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3 border ${isDark ? 'border-red-400/20' : 'border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(239,68,68,0.16)' : '#FEE2E2', color: '#EF4444' }}>
                    <AlertCircle size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Опасная зона: полная очистка CRM</div>
                    <div className={`text-xs ${sub} mt-1`}>
                      Эта операция удалит почти все рабочие данные CRM и пересоздаст систему до стартового состояния. Сохранятся только владельцы и текущая сессия инициатора.
                    </div>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border p-3 text-xs ${isDark ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <div className="font-semibold">Будут удалены клиенты, записи, сотрудники, склад, расходы, жалобы, уведомления, лишние сессии и временные коды.</div>
                  <div className="mt-2">Подтверждение идёт в три шага: пароль владельца, код создателя из Telegram и точный ввод контрольной фразы.</div>
                </div>

                {resetPreviewRows.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {resetPreviewRows.map((item) => (
                      <div key={item.label} className={`${glass} rounded-xl px-3 py-2`}>
                        <div className={`text-[11px] ${sub}`}>{item.label}</div>
                        <div className="text-sm font-semibold mt-1">{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {resetWarnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {resetWarnings.map((warning) => (
                      <div key={warning} className={`rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-white/5 text-[#E6EEF8]' : 'bg-black/[0.03] text-[#0B1226]'}`}>
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Шаг 1. Введите пароль владельца</label>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="Текущий пароль"
                      value={resetPassword}
                      onChange={(e) => {
                        setResetError(null);
                        setResetInfo(null);
                        setResetPassword(e.target.value);
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleStartOwnerReset()}
                      disabled={resetLoadingStep === 'start'}
                      className="flex-1 py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                      style={{ background: '#EF4444' }}
                    >
                      {resetLoadingStep === 'start' ? 'Запрашиваем код...' : resetStage === 'idle' ? 'Запросить код создателя' : 'Запросить новый код'}
                    </button>
                    {resetStage !== 'idle' && (
                      <button
                        type="button"
                        onClick={clearOwnerResetFlow}
                        disabled={Boolean(resetLoadingStep)}
                        className={`flex-1 py-3 rounded-2xl font-semibold border ${isDark ? 'border-white/10 text-[#E6EEF8]' : 'border-black/10 text-[#0B1226]'} disabled:opacity-60`}
                      >
                        Сбросить сценарий
                      </button>
                    )}
                  </div>
                </div>

                {resetStage !== 'idle' && (
                  <div className="mt-4 space-y-3">
                    <div className={`text-xs ${sub}`}>
                      Шаг 2. Проверьте Telegram создателя и введите код
                      {resetCodeExpiresAt ? ` до ${resetCodeExpiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                    </div>
                    <div className={`${glass} rounded-xl px-3 py-3`}>
                      <div className={`text-[11px] ${sub}`}>Контрольная фраза</div>
                      <div className="text-sm font-semibold mt-1 break-words">{resetRequiredPhrase || 'Фраза появится после запроса кода'}</div>
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Код создателя</label>
                      <input
                        className={inputCls}
                        type="text"
                        inputMode="numeric"
                        placeholder="6 цифр из Telegram"
                        value={resetCreatorCode}
                        onChange={(e) => {
                          setResetError(null);
                          setResetInfo(null);
                          setResetCreatorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                      />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Введите фразу подтверждения</label>
                      <input
                        className={inputCls}
                        type="text"
                        placeholder="ПОДТВЕРЖДАЮ ПОЛНУЮ ОЧИСТКУ"
                        value={resetConfirmationPhrase}
                        onChange={(e) => {
                          setResetError(null);
                          setResetInfo(null);
                          setResetConfirmationPhrase(e.target.value);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleApproveOwnerReset()}
                      disabled={resetLoadingStep === 'approve' || resetStage === 'armed'}
                      className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
                      style={{ background: '#B91C1C' }}
                    >
                      {resetLoadingStep === 'approve' ? 'Проверяем подтверждения...' : resetStage === 'armed' ? 'Финальный шаг уже разблокирован' : 'Подтвердить и разблокировать очистку'}
                    </button>
                  </div>
                )}

                {resetStage === 'armed' && (
                  <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-red-400/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-sm font-semibold text-red-500">Финальное подтверждение</div>
                    <div className={`text-xs mt-2 ${isDark ? 'text-red-100' : 'text-red-700'}`}>
                      Будут удалены сотрудники, клиенты, все записи, склад, расходы, жалобы, уведомления, временные коды и почти все настройки CRM. Действие необратимо.
                    </div>
                    <div className={`text-xs mt-3 ${sub}`}>
                      {resetCountdown > 0
                        ? `Кнопка активируется через ${resetCountdown} сек. За это время ещё раз проверьте, что именно будет удалено.`
                        : 'Таймер завершён. Если всё верно, можно запускать полную очистку CRM.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExecuteOwnerReset()}
                      disabled={resetExecuteLocked}
                      className="w-full mt-4 py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
                      style={{ background: '#991B1B' }}
                    >
                      {resetLoadingStep === 'execute'
                        ? 'Удаляем данные...'
                        : resetCountdown > 0
                          ? `Кнопка активируется через ${resetCountdown} сек`
                          : 'Подтверждаю полную очистку CRM'}
                    </button>
                  </div>
                )}

                {resetError && <div className="mt-4 text-xs text-red-500">{resetError}</div>}
                {resetInfo && <div className="mt-4 text-xs text-green-600">{resetInfo}</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>АКТИВНЫЕ СЕССИИ</div>
                {activeSessions.length === 0 ? (
                  <div className={`text-xs ${sub}`}>Нет активных сессий</div>
                ) : activeSessions.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 gap-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.device}{item.current ? ' · Текущая' : ''}
                      </div>
                      <div className={`text-xs ${sub}`}>
                        {item.ipAddress} · {item.lastSeenAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => void revokeSession(item.id)} className="text-xs text-red-500 shrink-0">
                      Завершить
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={Boolean(password.current || password.new_ || password.confirm) && (!password.current || !password.new_ || !password.confirm || password.new_.length < 8 || password.new_ !== password.confirm)}
                className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                <Shield size={16} />{securitySaved ? 'Сохранено!' : password.current || password.new_ || password.confirm ? 'Изменить пароль' : 'Сохранить безопасность'}
              </button>
            </motion.div>
          )}

          {/* ── SETTINGS: FINANCE ── */}
          {!isAccountant && page === 'settings' && settingsSection === 'finance' && (
            <motion.div key="s-finance" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} />Назад</button>
              <h2 className="font-semibold mb-4">Финансы</h2>

              {/* Общий итог */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>ОБЩИЙ ИТОГ</div>
                {[
                  { label: 'Выручка', value: `${totalRevenue.toLocaleString('ru')} ₽`, color: accent },
                  { label: 'Доп. доходы', value: `${totalIncomes.toLocaleString('ru')} ₽`, color: primary },
                  { label: 'Расходы', value: `${totalExpenses.toLocaleString('ru')} ₽`, color: '#FF6B6B' },
                  {
                    label: profit >= 0 ? 'Прибыль' : 'Прибыль (убыток)',
                    value: `${Math.abs(profit).toLocaleString('ru')} ₽${profit < 0 ? ' (убыток)' : ''}`,
                    color: profit >= 0 ? accent : '#FF6B6B',
                  },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Копилка · Автомойка */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>🚗 КОПИЛКА · АВТОМОЙКА</div>
                {piggyBankLoading ? (
                  <div className={`text-sm ${sub} text-center py-4`}>Загрузка...</div>
                ) : piggyBank?.wash ? (
                  <>
                    {/* Самообслуживание */}
                    <div className="mb-3">
                      <div className={`text-xs font-medium ${sub} mb-2`}>▸ Самообслуживание (1 000 ₽/ч)</div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Выручка</span>
                        <span className="font-semibold">{piggyBank.wash.selfServiceRevenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>ЗП мастера</span>
                        <span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.selfServiceMaster.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>В копилку (90%)</span>
                        <span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.selfServicePiggy.toLocaleString('ru')} ₽</span>
                      </div>
                    </div>
                    {/* Классическая мойка */}
                    <div className="mb-3">
                      <div className={`text-xs font-medium ${sub} mb-2`}>▸ Классическая мойка</div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Выручка</span>
                        <span className="font-semibold">{piggyBank.wash.classicRevenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>ЗП мастера</span>
                        <span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.classicMaster.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>В копилку</span>
                        <span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.classicPiggy.toLocaleString('ru')} ₽</span>
                      </div>
                    </div>
                    {/* Итого */}
                    <div className="flex justify-between py-2 text-sm font-semibold">
                      <span>Всего в копилку</span>
                      <span style={{ color: accent }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Выручка</span>
                      <span className="font-semibold">{piggyBank.wash.totalRevenue.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>ЗП мастеров всего</span>
                      <span style={{ color: '#FF6B6B' }}>−{piggyBank.wash.totalMaster.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Выход мастеров (смены)</span>
                      <span style={{ color: '#FF6B6B' }}>−{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Доп. доходы</span>
                      <span className="font-semibold" style={{ color: primary }}>+{(piggyBank.washIncomes ?? 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Расходы на мойку</span>
                      <span style={{ color: '#FF6B6B' }}>−{(piggyBank.washExpenses ?? 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                      <span>🏦 Остаток в копилке</span>
                      <span style={{ color: (piggyBank.remainingInPiggyBank ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                        {(piggyBank.remainingInPiggyBank ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.remainingInPiggyBank ?? 0).toLocaleString('ru')} ₽
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={`text-sm ${sub} text-center py-4`}>Нет данных</div>
                )}
              </div>

              {/* Копилка · Детейлинг */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>✨ КОПИЛКА · ДЕТЕЙЛИНГ</div>
                {piggyBankLoading ? (
                  <div className={`text-sm ${sub} text-center py-4`}>Загрузка...</div>
                ) : piggyBank?.detailing ? (
                  <>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Выручка</span>
                      <span className="font-semibold">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>ЗП мастеров</span>
                      <span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.detailingMaster.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Начислено 24%</span>
                      <span className="font-semibold" style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Снято на материалы</span>
                      <span style={{ color: '#FF6B6B' }}>−{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Возврат материалов</span>
                      <span className="font-semibold" style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Расходы на детейлинг</span>
                      <span style={{ color: '#FF6B6B' }}>−{(piggyBank.detailingExpenses ?? 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Доп. доходы</span>
                      <span className="font-semibold" style={{ color: primary }}>+{(piggyBank.detailingIncomes ?? 0).toLocaleString('ru')} ₽</span>
                    </div>
                    <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                      <span>🏦 Нетто в копилке</span>
                      <span style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                        {(piggyBank.detailing.netPiggy ?? 0) >= 0 ? '' : '−'}{Math.abs(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} ₽
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={`text-sm ${sub} text-center py-4`}>Нет данных</div>
                )}
              </div>

              {/* Последние расходы */}
              {expenses.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>ПОСЛЕДНИЕ РАСХОДЫ</div>
                  <div className="space-y-2">
                    {expenses.slice(0, 10).map(e => (
                      <div key={e.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <button className="flex-1 text-left min-w-0 mr-2" onClick={() => openEditExpense(e)}>
                          <div className="text-sm font-medium">{e.title}</div>
                          <div className={`text-xs ${sub}`}>{e.category} · {resourceGroupLabel(e.resourceGroup)} · {e.date}</div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                          <button onClick={() => openEditExpense(e)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                            <Edit3 size={13} className={sub} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Последние доходы */}
              {incomes.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>ПОСЛЕДНИЕ ДОХОДЫ</div>
                  <div className="space-y-2">
                    {incomes.slice(0, 10).map(i => (
                      <div key={i.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <button className="flex-1 text-left min-w-0 mr-2" onClick={() => openEditIncome(i)}>
                          <div className="text-sm font-medium">{i.source}</div>
                          <div className={`text-xs ${sub}`}>{resourceGroupLabel(i.resourceGroup)} · {i.date}{i.note ? ` · ${i.note}` : ''}</div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="font-semibold text-sm" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} ₽</div>
                          <button onClick={() => openEditIncome(i)} className={`p-1.5 rounded-lg ${glass}`} title="Редактировать">
                            <Edit3 size={13} className={sub} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MODAL: Detail Share (outside AnimatePresence) ── */}
      {selectedShareDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedShareDetail(null)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8"
            style={{ background: isDark ? '#1a1d23' : '#fff' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }} />
            <h3 className="font-bold text-lg mb-1">{selectedShareDetail.service || 'Услуга'}</h3>
            <div className={`text-xs ${sub} mb-4`}>{selectedShareDetail.date}{selectedShareDetail.time ? ` · ${selectedShareDetail.time}` : ''}</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={`text-sm ${sub}`}>Стоимость</span>
                <span className="text-sm font-semibold">{selectedShareDetail.price.toLocaleString('ru')} ₽</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={`text-sm ${sub}`}>Доля владельца</span>
                <span className="text-sm font-semibold" style={{ color: accent }}>+{selectedShareDetail.amount.toLocaleString('ru')} ₽</span>
              </div>
              {selectedShareDetail.workerName && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Мастер</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.workerName}</span>
                </div>
              )}
              {selectedShareDetail.clientName && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Клиент</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.clientName}</span>
                </div>
              )}
              {selectedShareDetail.clientPhone && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Телефон</span>
                  <a href={`tel:${selectedShareDetail.clientPhone}`} className="text-sm font-semibold" style={{ color: primary }}>{selectedShareDetail.clientPhone}</a>
                </div>
              )}
              {selectedShareDetail.car && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Автомобиль</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.car}</span>
                </div>
              )}
              {selectedShareDetail.plate && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Гос. номер</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.plate}</span>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedShareDetail(null)} className="w-full mt-5 py-3 rounded-2xl text-sm font-semibold" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 ${glass} border-t ${isDark ? 'border-white/10' : 'border-black/5'} flex`}>
        {(isAccountant
          ? [
              { id: 'dashboard', icon: Home, label: 'Главная' },
              { id: 'calendar', icon: CalendarDays, label: 'Календарь' },
              { id: 'payroll', icon: Users, label: 'Зарплаты' },
              { id: 'piggy-bank', icon: PiggyBank, label: 'Копилка' },
              { id: 'stock', icon: Box, label: 'Склад' },
              { id: 'reports', icon: FileText, label: 'Отчёты' },
            ]
          : [
              { id: 'dashboard', icon: Home, label: 'Главная' },
              { id: 'calendar', icon: CalendarDays, label: 'Календарь' },
              { id: 'payroll', icon: Users, label: 'Зарплаты' },
              { id: 'piggy-bank', icon: PiggyBank, label: 'Копилка' },
              { id: 'stock', icon: Box, label: 'Склад' },
              { id: 'clients', icon: Users, label: 'Клиенты' },
              { id: 'settings', icon: Settings, label: 'Настройки' },
            ]).map(t => {
          if (t.id === 'clients') {
            const isActive = page === 'settings' && settingsSection === 'clients';
            return (
              <button key={t.id} onClick={() => { setPage('settings'); setSettingsSection('clients'); }} className="flex-1 py-3 flex flex-col items-center gap-0.5">
                <t.icon size={18} style={{ color: isActive ? primary : undefined }} className={!isActive ? sub : ''} />
                <span className="text-[10px]" style={{ color: isActive ? primary : undefined }}>{t.label}</span>
              </button>
            );
          }
          const isActive = t.id === 'settings' ? (page === 'settings' && settingsSection === null) : (page === t.id);
          return (
          <button key={t.id} onClick={() => { setPage(t.id as OwnerPage); setSettingsSection(null); }} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <t.icon size={18} style={{ color: isActive ? primary : undefined }} className={!isActive ? sub : ''} />
            <span className="text-[10px]" style={{ color: isActive ? primary : undefined }}>{t.label}</span>
          </button>
          );
        })}
      </div>

      {/* ── EXPORT MODAL ── */}
      <AnimatePresence>
        {showExportModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowExportModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm mx-auto overflow-hidden`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  {exportModalStep === 'segment' ? 'За что отчёт?' : exportModalStep === 'period' ? 'За какой период?' : 'Выберите даты'}
                </h3>
                <button onClick={() => setShowExportModal(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>

              {exportModalStep === 'segment' && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'Всё вместе' },
                    { value: 'wash', label: 'Мойка' },
                    { value: 'detailing', label: 'Детейлинг' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => { setExportModalSegment(opt.value as 'all' | 'wash' | 'detailing'); setExportModalStep('period'); }}
                      className="rounded-xl py-3 px-2 text-sm font-medium disabled:opacity-60"
                      style={{ background: exportModalSegment === opt.value ? `${primary}25` : glass, color: primary }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {exportModalStep === 'period' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'daily', label: 'День' },
                      { value: 'weekly', label: 'Неделя' },
                      { value: 'custom', label: 'Своё время' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => { setExportModalPeriod(opt.value as 'daily' | 'weekly' | 'custom'); if (opt.value !== 'custom') { void handleExportWithParams(); } else { setExportModalStep('date'); } }}
                        className="rounded-xl py-3 px-2 text-sm font-medium"
                        style={{ background: exportModalPeriod === opt.value ? `${primary}25` : glass, color: primary }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExportModalStep('segment')} className={`mt-4 text-xs ${sub} flex items-center gap-1`}>
                    <ArrowLeft size={12} /> Назад
                  </button>
                </>
              )}

              {exportModalStep === 'date' && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <input type="date" value={toISODate(exportModalDateFrom)} onChange={e => {
                      const val = parseFlexibleDate(e.target.value);
                      setExportModalDateFrom(val ? formatDate(val) : '');
                    }} className={`flex-1 ${inputCls}`} />
                    <span className={`text-xs ${sub}`}>—</span>
                    <input type="date" value={toISODate(exportModalDateTo)} onChange={e => {
                      const val = parseFlexibleDate(e.target.value);
                      setExportModalDateTo(val ? formatDate(val) : '');
                    }} className={`flex-1 ${inputCls}`} />
                  </div>
                  <button onClick={() => void handleExportWithParams()} disabled={!exportModalDateFrom || !exportModalDateTo}
                    className="w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                    Сформировать отчёт
                  </button>
                  <button onClick={() => setExportModalStep('period')} className={`mt-3 text-xs ${sub} flex items-center gap-1`}>
                    <ArrowLeft size={12} /> Назад
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── NOTIFICATIONS ── */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl max-h-[70vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Уведомления</h3>
                <button onClick={() => setShowNotifications(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-2">
                {ownerNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>Нет уведомлений</p>
                ) : ownerNotifications.map(n => (
                  <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`${glass} rounded-xl p-3 cursor-pointer border-l-2`} style={{ borderLeftColor: n.read ? 'transparent' : primary }}>
                    <p className="text-sm">{n.message}</p>
                    <p className={`text-xs ${sub} mt-1`}>{n.createdAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ADD EXPENSE ── */}
      <AnimatePresence>
        {showAddExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm relative overflow-hidden`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <AnimatePresence>
                {expenseAdded && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 flex items-center justify-center z-10"
                    style={{ background: isDark ? 'rgba(14,22,36,0.97)' : 'rgba(255,255,255,0.97)', borderRadius: '1.5rem 1.5rem 0 0' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${accent}20` }}>
                        <Check size={28} style={{ color: accent }} />
                      </motion.div>
                      <div className="font-semibold">Расход добавлен!</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить расход</h3>
                <button onClick={() => setShowAddExpense(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>Название</label><input className={inputCls} placeholder="Закупка химии..." value={expenseForm.title} onChange={e => setExpenseForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label><input className={inputCls} type="number" placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Категория</label><select className={selectCls} value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Категория услуги</label>
                  <select className={selectCls} value={expenseForm.resourceGroup} onChange={e => setExpenseForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">Общее</option>
                    <option value="wash">Автомойка</option>
                    <option value="detailing">Детейлинг</option>
                  </select>
                  {expenseForm.resourceGroup && (
                    <p className="text-[11px] mt-1.5" style={{ color: accent }}>Списание из копилки {expenseForm.resourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(expenseForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setExpenseForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {expenseForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(expenseForm.date) || parseFlexibleDate(expenseForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Примечание</label><input className={inputCls} placeholder="Необязательно..." value={expenseForm.note} onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))} /></div>
              </div>
              <button onClick={handleAddExpense} disabled={!expenseForm.title || !expenseForm.amount || !expenseForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(expenseForm.date) || parseFlexibleDate(expenseForm.date) === null} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: '#FF6B6B' }}>Добавить расход</button>
            </motion.div>
          </motion.div>
        )}

        {/* ── PIGGY BANK WITHDRAW MODAL ── */}
        {showPiggyWithdraw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Снять на материалы</h3>
                <button onClick={() => setShowPiggyWithdraw(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Запись (заказ)</label>
                  <select className={selectCls} value={piggyWithdrawForm.bookingId} onChange={e => setPiggyWithdrawForm(p => ({ ...p, bookingId: e.target.value }))}>
                    <option value="">Выберите запись...</option>
            {bookings.filter(b => b.status !== 'cancelled' && b.status !== 'no_show').map(b => (
                      <option key={b.id} value={b.id}>{b.service} — {b.clientName} ({b.date})</option>
                    ))}
                  </select>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Название материала</label><input className={inputCls} placeholder="Например: Пленка PPF" value={piggyWithdrawForm.materialName} onChange={e => setPiggyWithdrawForm(p => ({ ...p, materialName: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Стоимость (₽)</label><input className={inputCls} type="number" placeholder="0" value={piggyWithdrawForm.materialCost} onChange={e => setPiggyWithdrawForm(p => ({ ...p, materialCost: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Примечание</label><input className={inputCls} placeholder="Необязательно..." value={piggyWithdrawForm.purpose} onChange={e => setPiggyWithdrawForm(p => ({ ...p, purpose: e.target.value }))} /></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(piggyWithdrawForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setPiggyWithdrawForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {piggyWithdrawForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(piggyWithdrawForm.date) || parseFlexibleDate(piggyWithdrawForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
              </div>
              <button onClick={handlePiggyWithdraw} disabled={!piggyWithdrawForm.bookingId || !piggyWithdrawForm.materialName || !piggyWithdrawForm.materialCost || !piggyWithdrawForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(piggyWithdrawForm.date) || parseFlexibleDate(piggyWithdrawForm.date) === null}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                Снять {piggyWithdrawForm.materialCost ? `${Number(piggyWithdrawForm.materialCost).toLocaleString('ru')} ₽` : ''}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── PIGGY BANK ADJUST MODAL ── */}
        {showPiggyAdjust && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  Изменить сумму · {piggyAdjustResourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}
                </h3>
                <button onClick={() => setShowPiggyAdjust(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className={`text-sm mb-4 p-3 rounded-xl ${glass} flex justify-between`}>
                <span className={sub}>Текущий баланс</span>
                <span className="font-semibold" style={{ color: piggyAdjustCurrentBalance >= 0 ? accent : '#FF6B6B' }}>
                  {piggyAdjustCurrentBalance.toLocaleString('ru')} ₽
                </span>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Новая сумма (₽)</label>
                  <input className={inputCls} type="number" placeholder="0" value={piggyAdjustForm.newBalance} onChange={e => setPiggyAdjustForm(p => ({ ...p, newBalance: e.target.value }))} />
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Примечание</label><input className={inputCls} placeholder="Необязательно..." value={piggyAdjustForm.purpose} onChange={e => setPiggyAdjustForm(p => ({ ...p, purpose: e.target.value }))} /></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(piggyAdjustForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setPiggyAdjustForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {piggyAdjustForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(piggyAdjustForm.date) || parseFlexibleDate(piggyAdjustForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
              </div>
              <button onClick={() => { void handlePiggyAdjust(); }} disabled={!piggyAdjustForm.newBalance || Number.isNaN(Number(piggyAdjustForm.newBalance)) || !piggyAdjustForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(piggyAdjustForm.date) || parseFlexibleDate(piggyAdjustForm.date) === null}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                Сохранить
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ARCHIVES MODAL ── */}
      <AnimatePresence>
        {showArchivesModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => { setShowArchivesModal(false); setSelectedArchive(null); }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl max-h-[85vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: isDark ? '#0E1624' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Архив недель</h3>
                <button onClick={() => { setShowArchivesModal(false); setSelectedArchive(null); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                {selectedArchive ? (
                  /* Expanded week detail */
                  <div>
                    <button onClick={() => setSelectedArchive(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: primary }}>
                      <ChevronLeft size={16} /> Назад к списку
                    </button>
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className="text-sm font-medium mb-3">
                        {selectedArchive.weekStart.split('-').reverse().join('.')} – {selectedArchive.weekEnd.split('-').reverse().join('.')}
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Выручка</span>
                        <span className="font-semibold" style={{ color: accent }}>+{selectedArchive.totalRevenue.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Доп. доходы</span>
                        <span className="font-semibold" style={{ color: primary }}>+{selectedArchive.totalIncome.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Расходы</span>
                        <span className="font-semibold" style={{ color: '#FF6B6B' }}>−{selectedArchive.totalExpense.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Чистая прибыль</span>
                        <span className="font-semibold" style={{ color: (selectedArchive.totalRevenue + selectedArchive.totalIncome - selectedArchive.totalExpense) >= 0 ? accent : '#FF6B6B' }}>
                          {(selectedArchive.totalRevenue + selectedArchive.totalIncome - selectedArchive.totalExpense).toLocaleString('ru')} ₽
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Баланс копилки</span>
                        <span className="font-semibold" style={{ color: selectedArchive.piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>
                          {selectedArchive.piggyBankBalance >= 0 ? '+' : ''}{selectedArchive.piggyBankBalance.toLocaleString('ru')} ₽
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: accent }}>{selectedArchive.bookingCount}</div>
                          <div className={`text-[10px] ${sub}`}>Записей</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: primary }}>{selectedArchive.incomeCount}</div>
                          <div className={`text-[10px] ${sub}`}>Доходов</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>{selectedArchive.expenseCount}</div>
                          <div className={`text-[10px] ${sub}`}>Расходов</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Week list */
                  <div className="space-y-2">
                    {piggyBank?.archives && piggyBank.archives.length > 0 ? (
                      [...piggyBank.archives].reverse().map(a => {
                        const profit = a.totalRevenue + a.totalIncome - a.totalExpense;
                        return (
                          <button key={a.id} onClick={() => setSelectedArchive(a)}
                            className={`${glass} rounded-xl p-3 w-full text-left transition active:scale-[0.98] hover:brightness-110`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium">
                                {a.weekStart.split('-').reverse().join('.')} – {a.weekEnd.split('-').reverse().join('.')}
                              </div>
                              <ChevronRight size={14} className={sub} />
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center mb-2">
                              <div>
                                <div className="text-[11px]" style={{ color: accent }}>+{a.totalRevenue.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Выручка</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: primary }}>+{a.totalIncome.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Доходы</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: '#FF6B6B' }}>−{a.totalExpense.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Расходы</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: profit >= 0 ? accent : '#FF6B6B' }}>{profit >= 0 ? '+' : ''}{profit.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Итог</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className={`text-[10px] ${sub}`}>
                                {a.bookingCount} зап. · {a.incomeCount} доходов · {a.expenseCount} расх.
                              </div>
                              <div className="text-[11px] font-semibold" style={{ color: a.piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>
                                🏦 {a.piggyBankBalance.toLocaleString('ru')} ₽
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className={`text-center py-8 text-sm ${sub}`}>Нет архивных записей</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FINANCE PANEL ── */}
      <AnimatePresence>
        {showFinancePanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowFinancePanel(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl max-h-[85vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: isDark ? '#0E1624' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Финансы</h3>
                <button onClick={() => setShowFinancePanel(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* Сводка */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Выручка</div>
                    <div className="font-bold text-lg" style={{ color: accent }}>{totalRevenue.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Расходы</div>
                    <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>{totalExpenses.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Доп. доходы</div>
                    <div className="font-bold text-lg" style={{ color: primary }}>{totalIncomes.toLocaleString('ru')} ₽</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Прибыль</div>
                    <div className="font-bold text-lg" style={{ color: profit >= 0 ? accent : '#FF6B6B' }}>
                      {Math.abs(profit).toLocaleString('ru')} ₽{profit < 0 ? ' (убыток)' : ''}
                    </div>
                  </div>
                </div>

                {/* Копилка */}
                <div className={`${glass} rounded-2xl p-3 flex items-center justify-between cursor-pointer`} onClick={() => { setShowFinancePanel(false); setPage('piggy-bank'); }}>
                  <div className="flex items-center gap-2">
                    <PiggyBank size={18} style={{ color: accent }} />
                    <span className="text-sm font-medium">Копилка</span>
                  </div>
                  <div className="font-bold text-sm" style={{ color: piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>
                    {piggyBankBalance.toLocaleString('ru')} ₽
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowFinancePanel(false); setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: 'rgba(255,107,107,0.12)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,107,0.2)' }}>
                      <DollarSign size={20} style={{ color: '#FF6B6B' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#FF6B6B' }}>Добавить расход</span>
                  </button>
                  <button onClick={() => { setIncomeForm(p => ({ ...p, date: todayLabel })); setShowAddIncome(true); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: `${primary}12` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primary}20` }}>
                      <TrendingUp size={20} style={{ color: primary }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: primary }}>Добавить доход</span>
                  </button>
                </div>

                {/* РАСХОДЫ */}
                {expenses.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>РАСХОДЫ</div>
                    <div className="space-y-2">
                      {expenses.slice(0, 5).map(e => (
                        <div key={e.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className={`text-xs ${sub}`}>{e.category} · {e.date}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>−{e.amount.toLocaleString('ru')} ₽</div>
                            {(session?.role === 'owner' || session?.role === 'accountant') && (
                              <button
                                onClick={() => openEditExpense(e)}
                                className={`p-1.5 rounded-lg ${glass}`}
                                title="Редактировать расход"
                              >
                                <Edit3 size={13} className={sub} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ДОХОДЫ */}
                {incomes.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>ДОХОДЫ</div>
                    <div className="space-y-2">
                      {incomes.slice(0, 5).map(i => (
                        <div key={i.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{i.source}</div>
                            <div className={`text-xs ${sub}`}>{i.date}{i.note ? ` · ${i.note}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} ₽</div>
                            {session?.role === 'owner' && (
                              <button
                                onClick={() => openEditIncome(i)}
                                className={`p-1.5 rounded-lg ${glass}`}
                                title="Редактировать доход"
                              >
                                <Edit3 size={13} className={sub} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── ADD INCOME ── */}
      <AnimatePresence>
        {showAddIncome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить доход</h3>
                <button onClick={() => { setShowAddIncome(false); setIncomeForm({ amount: '', source: '', note: '', date: todayLabel, resourceGroup: '' }); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label>
                  <input className={inputCls} type="number" placeholder="0" value={incomeForm.amount} onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Источник / описание</label>
                  <input className={inputCls} placeholder="Аренда, продажа товара..." value={incomeForm.source} onChange={e => setIncomeForm(p => ({ ...p, source: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Категория услуги</label>
                  <select className={selectCls} value={incomeForm.resourceGroup} onChange={e => setIncomeForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">Общее</option>
                    <option value="wash">Автомойка</option>
                    <option value="detailing">Детейлинг</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(incomeForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setIncomeForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {incomeForm.date && !parseFlexibleDate(incomeForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Необязательно" value={incomeForm.note} onChange={e => setIncomeForm(p => ({ ...p, note: e.target.value }))} />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!incomeForm.amount || !incomeForm.source.trim()) return;
                  if (!incomeForm.date || !parseFlexibleDate(incomeForm.date)) return;
                  try {
                    await addIncome({ amount: Number(incomeForm.amount), source: incomeForm.source.trim(), note: incomeForm.note.trim() || undefined, date: incomeForm.date, resourceGroup: incomeForm.resourceGroup || undefined });
                    setShowAddIncome(false);
                    setIncomeForm({ amount: '', source: '', note: '', date: todayLabel, resourceGroup: '' });
                    setBottomToast(`Доход "${incomeForm.source.trim()}" добавлен на сумму ${Number(incomeForm.amount).toLocaleString('ru')} ₽`);
                    setTimeout(() => setBottomToast(null), 4000);
                  } catch (err) {
                    setBottomToast(err instanceof Error ? err.message : 'Не удалось добавить доход');
                    setTimeout(() => setBottomToast(null), 4000);
                  }
                }}
                disabled={!incomeForm.amount || !incomeForm.source.trim() || !incomeForm.date || !parseFlexibleDate(incomeForm.date)}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                Добавить доход
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD STOCK ── */}
      <AnimatePresence>
        {showAddStock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить товар</h3>
                <button onClick={() => setShowAddStock(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>Название</label><input className={inputCls} placeholder="Автошампунь..." value={stockForm.name} onChange={e => setStockForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Количество</label><input className={inputCls} type="text" inputMode="decimal" value={stockForm.qty} onChange={e => setStockForm(p => ({ ...p, qty: e.target.value }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Единица</label><select className={selectCls} value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}>{STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Цена {stockForm.priceMode === 'total' ? 'за все' : 'за ед.'} (₽)</label>
                  <div className="flex gap-2">
                    <input className={inputCls} style={{ flex: 1 }} type="text" inputMode="decimal" value={stockForm.unitPrice} onChange={e => setStockForm(p => ({ ...p, unitPrice: e.target.value }))} />
                    <button type="button" onClick={() => setStockForm(p => ({ ...p, priceMode: p.priceMode === 'unit' ? 'total' : 'unit', unitPrice: '' }))}
                      className="text-xs px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: accent }}>{stockForm.priceMode === 'unit' ? 'за всё' : 'за ед.'}</button>
                  </div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Категория</label>
                  {(() => {
                    const parentCats = stockCategories.filter(c => !c.parentId);
                    const childCats = stockForm.categoryId
                      ? stockCategories.filter(c => c.parentId === stockCategories.find(p => p.id === stockForm.categoryId)?.parentId)
                      : stockCategories.filter(c => c.parentId === (parentCats.find(p => p.id === stockForm.categoryId)?.id || parentCats[0]?.id));
                    return (
                      <div className="flex gap-2">
                        <select className={selectCls} style={{ flex: 1 }}
                          value={stockForm.categoryId ? (stockCategories.find(c => c.id === stockForm.categoryId)?.parentId || '') : ''}
                          onChange={e => {
                            const parentId = e.target.value;
                            const children = stockCategories.filter(c => c.parentId === parentId);
                            setStockForm(p => ({
                              ...p,
                              categoryId: children.length > 0 ? children[0].id : parentId,
                              category: stockCategories.find(c => c.id === (children.length > 0 ? children[0].id : parentId))?.name || p.category,
                            }));
                          }}>
                          {parentCats.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {parentCats.length > 0 && (() => {
                          const selectedParentId = stockForm.categoryId
                            ? (stockCategories.find(c => c.id === stockForm.categoryId)?.parentId || stockForm.categoryId)
                            : parentCats[0].id;
                          const children = stockCategories.filter(c => c.parentId === selectedParentId);
                          if (children.length === 0) return null;
                          return (
                            <select className={selectCls} style={{ flex: 1 }}
                              value={stockForm.categoryId && children.some(c => c.id === stockForm.categoryId) ? stockForm.categoryId : children[0].id}
                              onChange={e => {
                                const cat = stockCategories.find(c => c.id === e.target.value);
                                setStockForm(p => ({ ...p, categoryId: e.target.value, category: cat?.name || p.category }));
                              }}>
                              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button onClick={handleAddStock} disabled={!stockForm.name || !stockForm.qty} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: primary }}>Добавить на склад</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CATEGORY MANAGER ── */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Категории склада</h3>
                <button onClick={() => setShowCategoryManager(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                {stockCategories.filter(c => !c.parentId).map(parent => (
                  <div key={parent.id} className={`${glass} rounded-xl p-3`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{parent.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          const name = prompt('Новое название категории:', parent.name);
                          if (name && name.trim()) updateStockCategory(parent.id, { name: name.trim() });
                        }} className={`text-xs px-2 py-1 rounded ${glass}`}>✎</button>
                        <button onClick={async () => {
                          if (!window.confirm(`Удалить категорию «${parent.name}»?`)) return;
                          try { await deleteStockCategory(parent.id); setBottomToast(`Категория «${parent.name}» удалена`); setTimeout(() => setBottomToast(null), 3000); }
                          catch { setBottomToast('Не удалось удалить категорию'); setTimeout(() => setBottomToast(null), 3000); }
                        }} className="text-xs px-2 py-1 rounded text-red-500">✕</button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {stockCategories.filter(c => c.parentId === parent.id).map(child => (
                        <div key={child.id} className="flex items-center justify-between pl-4">
                          <span className={`text-sm ${sub}`}>— {child.name}</span>
                          <div className="flex gap-1">
                            <button onClick={() => {
                              const name = prompt('Новое название подкатегории:', child.name);
                              if (name && name.trim()) updateStockCategory(child.id, { name: name.trim() });
                            }} className={`text-xs px-2 py-1 rounded ${glass}`}>✎</button>
                            <button onClick={async () => {
                              if (!window.confirm(`Удалить подкатегорию «${child.name}»?`)) return;
                              try { await deleteStockCategory(child.id); setBottomToast(`Подкатегория «${child.name}» удалена`); setTimeout(() => setBottomToast(null), 3000); }
                              catch { setBottomToast('Не удалось удалить подкатегорию'); setTimeout(() => setBottomToast(null), 3000); }
                            }} className="text-xs px-2 py-1 rounded text-red-500">✕</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={async () => {
                        const name = prompt('Название новой подкатегории:');
                        if (name && name.trim()) {
                          try { await addStockCategory({ name: name.trim(), parentId: parent.id }); setBottomToast(`Подкатегория «${name.trim()}» добавлена`); setTimeout(() => setBottomToast(null), 3000); }
                          catch { setBottomToast('Не удалось добавить подкатегорию'); setTimeout(() => setBottomToast(null), 3000); }
                        }
                      }} className="text-xs px-2 py-1 rounded mt-1" style={{ color: primary }}>+ Добавить подкатегорию</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={async () => {
                const name = prompt('Название новой категории:');
                if (name && name.trim()) {
                  try { await addStockCategory({ name: name.trim() }); setBottomToast(`Категория «${name.trim()}» добавлена`); setTimeout(() => setBottomToast(null), 3000); }
                  catch { setBottomToast('Не удалось добавить категорию'); setTimeout(() => setBottomToast(null), 3000); }
                }
              }} className="w-full py-3 rounded-2xl font-medium text-white" style={{ background: primary }}>+ Добавить категорию</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WRITE OFF ── */}
      <AnimatePresence>
        {showWriteOff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-2xl p-5 w-full max-w-xs`}>
              <h3 className="font-semibold mb-1">Списать товар</h3>
              <p className={`text-sm ${sub} mb-4`}>{stockItems.find(s => s.id === showWriteOff)?.name}</p>
              <div className="mb-4"><label className={`text-xs ${sub} block mb-1`}>Количество</label><input className={inputCls} type="text" inputMode="decimal" value={writeOffQty} onChange={e => setWriteOffQty(e.target.value)} /></div>
              <div className="flex gap-2">
                <button onClick={() => setShowWriteOff(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                <button onClick={handleWriteOff} className="flex-1 py-2.5 rounded-xl text-sm text-white" style={{ background: '#FF6B6B' }}>Списать</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE COMPLAINTS ── */}
      <AnimatePresence>
        {showComplaintsWorkerId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Активные жалобы</h3>
                <button onClick={() => setShowComplaintsWorkerId(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3">
                {penalties.filter(p => p.workerId === showComplaintsWorkerId && isComplaintActive(p)).map(penalty => {
                  const ownerName = workers.find(w => w.id === penalty.ownerId)?.name || 'Неизвестно';
                  return (
                    <div key={penalty.id} className={`${glass} rounded-xl p-3`}>
                      <div className="font-medium text-sm">{penalty.title}</div>
                      <div className={`text-xs ${sub} mt-1`}>{penalty.reason}</div>
                      <div className={`text-[11px] ${sub} mt-2`}>
                        Выдана: {formatComplaintDate(penalty.createdAt)}
                      </div>
                      <div className={`text-[11px] ${sub}`}>
                        Кем: {ownerName}
                      </div>
                      <div className={`text-[11px] ${sub}`}>
                        Активна до: {formatComplaintDate(penalty.activeUntil)}
                      </div>
                    </div>
                  );
                })}
                {penalties.filter(p => p.workerId === showComplaintsWorkerId && isComplaintActive(p)).length === 0 && (
                  <div className={`text-sm ${sub} text-center py-6`}>Нет активных жалоб</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE CLIENT ── */}
      <AnimatePresence>
        {showCreateClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Новый клиент</h3>
                <button
                  onClick={() => {
                    setShowCreateClient(false);
                    setCreateClientErrors({});
                  }}
                  className={`p-1.5 rounded-lg ${glass}`}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { label: 'Имя', key: 'name', placeholder: 'Иван Иванов', type: 'text' },
                  { label: 'Телефон (необязательно)', key: 'phone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'Автомобиль', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Госномер', key: 'plate', placeholder: 'а123вс777', type: 'text' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{field.label}</label>
                    {field.key === 'plate' ? (
                      <div className="flex gap-1.5">
                        <div className="flex flex-col gap-1 shrink-0">
                          {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                            <button key={t} type="button"
                              className={`text-[10px] px-1.5 py-0.5 rounded ${createClientForm.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                              style={createClientForm.plateType === t ? { background: primary } : {}}
                              onClick={() => setCreateClientForm(p => ({ ...p, plateType: t }))}
                            >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                          ))}
                        </div>
                        <input
                          className={`${inputCls} flex-1 ${createClientErrors[field.key as keyof typeof createClientErrors] ? 'border-red-400' : ''}`}
                          type={field.type}
                          placeholder={createClientForm.plateType === 'motorcycle' ? '1234ав77' : createClientForm.plateType === 'foreign' ? 'xyz1234' : 'а123вс777'}
                          maxLength={createClientForm.plateType === 'foreign' ? 15 : 9}
                          value={(createClientForm as any)[field.key]}
                          onChange={(event) => {
                            const nextValue = field.key === 'plate' ? normalizePlateInput(event.target.value, createClientForm.plateType) : event.target.value;
                            setCreateClientForm((current) => ({ ...current, [field.key]: nextValue }));
                            setCreateClientErrors((current) => ({ ...current, [field.key]: undefined, general: undefined }));
                          }}
                        />
                      </div>
                    ) : (
                      <input
                        className={`${inputCls} ${createClientErrors[field.key as keyof typeof createClientErrors] ? 'border-red-400' : ''}`}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(createClientForm as any)[field.key]}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          setCreateClientForm((current) => ({ ...current, [field.key]: nextValue }));
                          setCreateClientErrors((current) => ({ ...current, [field.key]: undefined, general: undefined }));
                        }}
                      />
                    )}
                    {(field.key === 'name' && createClientErrors.name) && <div className="mt-1 text-xs text-red-500">{createClientErrors.name}</div>}
                    {(field.key === 'phone' && createClientErrors.phone) && <div className="mt-1 text-xs text-red-500">{createClientErrors.phone}</div>}
                    {(field.key === 'car' && createClientErrors.car) && <div className="mt-1 text-xs text-red-500">{createClientErrors.car}</div>}
                    {(field.key === 'plate' && createClientErrors.plate) && <div className="mt-1 text-xs text-red-500">{createClientErrors.plate}</div>}
                  </div>
                ))}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Заметка</label>
                  <input
                    className={inputCls}
                    placeholder="Внутренняя заметка"
                    value={createClientForm.notes}
                    onChange={(event) => setCreateClientForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Как узнал о нас</label>
                  <select
                    className={selectCls}
                    value={createClientForm.referralSource}
                    onChange={(event) => setCreateClientForm((current) => ({ ...current, referralSource: event.target.value }))}
                  >
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  После создания откроется форма прошлой записи для истории клиента.
                </div>
                {createClientErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{createClientErrors.general}</div>
                )}
              </div>
              <button
                onClick={() => { void handleCreateClient(); }}
                disabled={createClientSaving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                {createClientSaving ? 'Сохранение...' : 'Создать клиента'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE BOOKING ── */}
      <AnimatePresence>
        {showCreateBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateBooking(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto ${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-4`}
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-base">Создать запись</h3>
                <button onClick={() => setShowCreateBooking(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4 pb-32">
                <div><label className={`text-xs ${sub} block mb-1`}>Клиент</label><div className="flex gap-1.5 items-center"><input className={`${inputCls} flex-1`} placeholder="Иван Иванов" value={bookingForm.clientName} onChange={e => setBookingForm(p => ({ ...p, clientName: e.target.value }))} /><button type="button" onClick={() => setShowClientSearch(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${primary}20`, color: primary }}>?</button></div></div>
                <div><label className={`text-xs ${sub} block mb-1`}>Телефон (необязательно)</label><input className={inputCls} type="tel" placeholder="+7 (___) ___-__-__" value={bookingForm.clientPhone} onChange={e => setBookingForm(p => ({ ...p, clientPhone: e.target.value }))} /></div>
                {bookingFormClientVehicles.length > 0 && (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Авто клиента</label>
                    <div className="flex flex-wrap gap-1.5">
                      {bookingFormClientVehicles.map((vehicle, index) => {
                        const isActive = normalizeVehicleInput(vehicle.car || '') === normalizeVehicleInput(bookingForm.car)
                          && normalizePlateInput(vehicle.plate || '', vehicle.plateType) === normalizePlateInput(bookingForm.plate, bookingForm.plateType);
                        return (
                          <button key={index} type="button" onClick={() => setBookingForm(p => ({ ...p, car: vehicle.car || '', plate: vehicle.plate || '', plateType: (vehicle.plateType as PlateType) || 'russian' }))}
                            className={`text-xs px-2.5 py-1.5 rounded-xl border transition hover:opacity-80 ${isActive ? 'text-white font-medium' : `${sub}`}`}
                            style={isActive ? { background: primary, borderColor: primary } : { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
                            {[vehicle.car, vehicle.plate].filter(Boolean).join(' · ') || 'Авто'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Автомобиль</label><input className={inputCls} placeholder="Lada Vesta" value={bookingForm.car} onChange={e => setBookingForm(p => ({ ...p, car: e.target.value }))} /></div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Госномер</label>
                    <div className="flex gap-1.5">
                      <div className="flex flex-col gap-1 shrink-0">
                        {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                          <button key={t} type="button"
                            className={`text-[10px] px-1.5 py-0.5 rounded ${bookingForm.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                            style={bookingForm.plateType === t ? { background: primary } : {}}
                            onClick={() => setBookingForm(p => ({ ...p, plateType: t }))}
                          >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                        ))}
                      </div>
                      <input className={`${inputCls} flex-1`} maxLength={bookingForm.plateType === 'foreign' ? 15 : 9} placeholder={bookingForm.plateType === 'motorcycle' ? '1234ав77' : bookingForm.plateType === 'foreign' ? 'xyz1234' : 'а123вс777'} value={bookingForm.plate} onChange={e => setBookingForm(p => ({ ...p, plate: normalizePlateInput(e.target.value, p.plateType) }))} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                  <ServiceSearchSelect
                    value={bookingForm.service}
                    services={services}
                    selectCls={selectCls}
                    inputCls={inputCls}
                    glass={glass}
                    text={text}
                    sub={sub}
                    primary={primary}
                    isDark={isDark}
                    placeholder="Выберите услугу"
                    onChange={(serviceId) => {
                      const svc = services.find(s => s.id === serviceId);
                      setBookingForm(p => {
                        const prevSvc = services.find(s => s.id === p.service);
                        const wasDefaultPrice = p.price === 0 || (prevSvc && p.price === prevSvc.price);
                        return {
                          ...p,
                          service: serviceId,
                          price: wasDefaultPrice ? (svc?.price || 0) : p.price,
                          duration: svc?.duration || 30,
                        };
                      });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.price)} onChange={e => setBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.duration)} onChange={e => setBookingForm(p => ({ ...p, duration: numberFromInput(e.target.value) }))} /></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Статус</label><select className={selectCls} value={bookingForm.status} onChange={e => setBookingForm(p => ({ ...p, status: e.target.value as BookingStatus }))}>
                  {OWNER_BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select></div>
                <div className="mb-4">
                  <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                  <input className={inputCls} type="date" value={toISODate(bookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setBookingForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Время</label><select className={selectCls} value={bookingForm.time} onChange={e => setBookingForm(p => ({ ...p, time: e.target.value }))}><option value="">--:--</option>{TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}</select></div>

                <div><label className={`text-xs ${sub} block mb-1`}>{bookingFormLocationLabel}</label><select className={selectCls} value={bookingForm.box} onChange={e => setBookingForm(p => ({ ...p, box: e.target.value }))}>{bookingFormBoxes.map(box => <option key={box.id} value={box.name}>{box.name}</option>)}</select></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Как узнал о нас</label>
                  <select className={selectCls} value={bookingForm.referralSource} onChange={e => setBookingForm(p => ({ ...p, referralSource: e.target.value }))}>
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Способ оплаты</label>
                  <select className={selectCls} value={bookingForm.paymentType} onChange={e => setBookingForm(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="invoice">По счёту</option>
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Оплачено</span>
                  <input
                    type="checkbox"
                    checked={bookingForm.paymentSettled}
                    onChange={(event) => setBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                  />
                </label>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Аутсорс</span>
                  <input
                    type="checkbox"
                    checked={bookingForm.isOutsource}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setBookingForm(p => ({ ...p, isOutsource: checked }));
                      if (checked) setBookingWorkers([]);
                    }}
                  />
                </label>
                {bookingForm.isOutsource && (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Сумма аутсорсеру (₽)</label>
                    <input className={inputCls} type="number" value={numberInputValue(bookingForm.outsourceAmount)}
                      onChange={e => setBookingForm(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
                {!bookingForm.isOutsource && (() => {
                  const _svc = services.find(s => s.id === bookingForm.service);
                  const _isFixed = isFixedMasterService(services, _svc?.id, _svc?.name);
                  return (
                <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Назначить мастеров</label>
                    <span className={`text-xs ${sub}`}>{_isFixed ? `Фикс ${formatFixedMasterAmount()}` : `Выбрано: ${bookingWorkers.length}`}</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {workers.filter(worker => worker.role === 'worker' || worker.role === 'owner').map(worker => {
                      const assigned = bookingWorkers.find(item => item.id === worker.id);
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{worker.name}</div>
                              <div className={`text-xs ${sub}`}>{worker.specialty || worker.experience || 'Мастер'}</div>
                            </div>
                            <button
                              onClick={() => assigned
                                ? setBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                              className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                              style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                            >
                              {assigned ? 'Выбран' : 'Выбрать'}
                            </button>
                          </div>
                          {assigned && (
                            <div className="flex items-center gap-2 mt-2">
                              {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                              ) : (
                                <>
                                  <button onClick={() => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-blue-500 text-white' : glass}`}>₽</button>
                                  <button onClick={() => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-blue-500 text-white' : glass}`}>%</button>
                                  {assigned.payType === 'fixed' ? (
                                    <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                      onChange={e => { const r = e.target.value; if (r === '') { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                      className={`flex-1 ${inputCls} py-1.5`} placeholder="сумма" />
                                  ) : (
                                    <>
                                      <span className={`text-xs ${sub}`}>%</span>
                                      <input
                                        type="number"
                                        step="0.00001"
                                        min={0}
                                        max={100}
                                        value={assigned.percent === '' ? '' : assigned.percent}
                                        onChange={e => { const r = e.target.value; if (r === '') { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }}
                                        onBlur={() => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                                        className={`flex-1 ${inputCls} py-1.5`}
                                      />
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3 ${bookingForm.status === 'completed' ? 'opacity-60' : ''}`}>
                  <span>Уведомить мастеров</span>
                  <input
                    type="checkbox"
                    checked={notifyBookingWorkers && bookingForm.status !== 'completed'}
                    disabled={bookingForm.status === 'completed'}
                    onChange={(event) => setNotifyBookingWorkers(event.target.checked)}
                  />
                </label>
                {bookingForm.status === 'completed' && (
                  <div className={`text-xs ${sub} rounded-xl px-3 py-2`}>Для прошлых записей уведомления мастерам не отправляются.</div>
                )}
                </>
                  );
                })()}
              </div>
              <button onClick={handleCreateBooking} className="w-full py-3.5 rounded-2xl font-semibold text-white" style={{ background: primary }}>
                {bookingForm.status === 'completed' ? 'Добавить в историю' : 'Создать запись'}
              </button>
            </motion.div>
          </>
        )}

      </AnimatePresence>

      {/* CLIENT SEARCH MODAL */}
      <AnimatePresence>
        {showClientSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={() => setShowClientSearch(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col`}>
              <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Найденные клиенты</h3>
                  <button onClick={() => setShowClientSearch(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
                <div className={`text-xs ${sub}`}>
                  {(() => {
                    const q = bookingForm.clientName.trim().toLowerCase();
                    const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                    return matches.length > 0 ? `Найдено ${matches.length} клиент${matches.length === 1 ? '' : 'ов'}` : 'Введите имя для поиска';
                  })()}
                </div>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {(() => {
                  const q = bookingForm.clientName.trim().toLowerCase();
                  const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                  return matches.length > 0 ? matches.map(client => (
                    <button key={client.id} type="button" onClick={() => {
                      const mainVehicle = ownerClientMainVehicle(client.id);
                      setBookingForm(p => ({ ...p, clientId: client.id, clientName: client.name, clientPhone: client.phone, car: mainVehicle?.car || client.car || '', plate: mainVehicle?.plate || client.plate || '', plateType: ((mainVehicle?.plateType || client.plateType) as PlateType) || 'russian' }));
                      setShowClientSearch(false);
                    }}
                      className={`w-full text-left ${glass} rounded-2xl p-4 transition hover:opacity-80`}>
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className={`text-xs ${sub} mt-0.5`}>{client.phone}</div>
                      {(() => {
                        const clientVehicles = ownerClientVehicles(client.id);
                        return clientVehicles.length > 0 ? (
                          <div className={`text-xs ${sub} mt-0.5`}>
                            {clientVehicles.map((vehicle, vehicleIndex) => (
                              <div key={vehicleIndex}>{[vehicle.car, vehicle.plate].filter(Boolean).join(' • ') || 'Авто'}</div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </button>
                  )) : (
                    <div className={`text-sm ${sub} text-center py-8`}>
                      {q ? 'Ничего не найдено' : 'Начните вводить имя клиента'}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOOKING DETAIL MODAL */}
      <AnimatePresence>
        {showBookingDetail && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Запись</h3>
                <button onClick={() => { setShowBookingDetail(false); setOwnerBookingEditMode(null); setOwnerBookingEditError(null); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3">
                {/* Info card */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="font-medium text-sm">{selectedBooking.clientName || 'Клиент без имени'}</div>
                      <SourceBadge source={selectedBooking.source} />
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${ownerStatusBadge(selectedBooking.status)}`}>{ownerStatusLabel(selectedBooking.status)}</span>
                  </div>
                  <div className={`text-xs ${sub} mb-2`}>{selectedBooking.service} • {selectedBooking.date} • {selectedBooking.time}</div>
                  {(() => {
                    const additionalTotal = (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0);
                    const legacyServicesTotal = (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0);
                    const baseServicePrice = Math.max(0, selectedBooking.price - additionalTotal - legacyServicesTotal);
                    return (
                    <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Услуга</div>
                      <div>{selectedBooking.service}</div>
                      <div className="font-semibold">{baseServicePrice.toLocaleString('ru')} ₽</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Оплата</div>
                      <div>{selectedBooking.paymentSettled ? (selectedBooking.paymentType === 'cash' ? 'Наличные' : selectedBooking.paymentType === 'transfer' ? 'Перевод' : 'По счёту') : 'Не оплачено'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Авто</div>
                      <div>{selectedBooking.car || 'Не указано'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>Номер</div>
                      <div>{selectedBooking.plate || 'Не указан'}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={sub}>Бокс: {selectedBooking.box || 'Не выбран'}</div>
                    <div className={sub}>Длительность: {selectedBooking.duration} мин</div>
                    <div className={sub}>Мастера: {selectedBooking.workers.length ? selectedBooking.workers.map(w => {
                      const _fixed = isFixedMasterService(services, selectedBooking?.serviceId, selectedBooking?.service);
                      return `${w.workerName}${_fixed ? ` · фикс ${formatFixedMasterAmount()}` : w.payType === 'fixed' ? ` · ${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : ` ${w.percent}%`}`;
                    }).join(', ') : 'Не назначены'}</div>
                    <div className={sub}>Телефон: {selectedBooking.clientPhone || 'Не указан'}</div>
                    <div className={sub}>Комментарий: {selectedBooking.notes?.trim() || 'Нет'}</div>
                  </div>
                  {((selectedBooking.services && selectedBooking.services.length > 0) || (selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0)) && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>ДОП. УСЛУГИ</div>
                      {selectedBooking.additionalServices && selectedBooking.additionalServices.map(as => (
                        <div key={as.id} className="py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{as.name}</span>
                            <span className={`font-semibold ${as.priceMode === 'subtract' ? 'text-red-500' : ''}`}>{as.priceMode === 'subtract' ? '− ' : ''}{as.price.toLocaleString('ru')} ₽</span>
                          </div>
                          {as.isOutsource ? (
                            <div className="flex justify-between items-center mt-1">
                              <span className={`text-xs ${sub}`}>Аутсорс · аутсорсеру</span>
                              <span className="text-xs font-medium text-red-500">− {(as.outsourceAmount || 0).toLocaleString('ru')} ₽</span>
                            </div>
                          ) : (
                            as.workers.map(w => {
                              const earned = w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(as.price * w.percent / 100);
                              return (
                                <div key={w.workerId} className="flex justify-between items-center mt-1">
                                  <span className={`text-xs ${sub}`}>{w.workerName} · {w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : `${w.percent}%`}</span>
                                  <span className="text-xs font-medium text-green-500">+{earned.toLocaleString('ru')} ₽</span>
                                </div>
                              );
                            })
                          )}
                          <button onClick={async () => { try { const updated = await removeBookingAdditionalService(selectedBooking.id, as.id); setSelectedBooking(updated); } catch {} }} className="text-xs text-red-500 mt-1">
                            Удалить
                          </button>
                          <button onClick={() => handleOpenOwnerEditAsvc(as)} className="text-xs mt-1 ml-2" style={{ color: primary }}>
                            Изменить
                          </button>
                        </div>
                      ))}
                      {selectedBooking.services && selectedBooking.services.filter(s => !selectedBooking.additionalServices?.find(as => as.serviceId === s.serviceId && as.name === s.name)).map((s, i) => (
                        <div key={`legacy-${i}`} className="py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{s.name}</span>
                            <span className="font-semibold">{s.price.toLocaleString('ru')} ₽</span>
                          </div>
                          {selectedBooking.workers.length > 0 && selectedBooking.workers.map(w => {
                            const earned = w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(s.price * (w.percent || 0) / 100);
                            return (
                              <div key={w.workerId} className="flex justify-between items-center mt-1">
                                <span className={`text-xs ${sub}`}>{w.workerName} · {w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} ₽` : `${w.percent}%`}</span>
                                <span className="text-xs font-medium text-green-500">+{earned.toLocaleString('ru')} ₽</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 mt-1 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                        <span className="text-sm font-semibold">Итоговая сумма</span>
                        <span className="text-base font-bold" style={{ color: primary }}>{selectedBooking.price.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className={`text-xs ${sub} mt-1 space-y-0.5`}>
                        <div className="flex justify-between"><span>Базовая услуга «{selectedBooking.service}»</span><span>{baseServicePrice.toLocaleString('ru')} ₽</span></div>
                        {(selectedBooking.additionalServices || []).map(as => (
                          <div key={as.id} className="flex justify-between"><span className={as.priceMode === 'subtract' ? 'text-red-500' : ''}>{as.priceMode === 'subtract' ? '− ' : '+ '}{as.name}{as.isOutsource ? ' (аутсорс)' : ''}</span><span>{as.priceMode === 'subtract' ? '− ' : ''}{as.price.toLocaleString('ru')} ₽</span></div>
                        ))}
                        {(selectedBooking.services || []).filter(s => !selectedBooking.additionalServices?.find(as => as.serviceId === s.serviceId && as.name === s.name)).map((s, i) => (
                          <div key={`legacy-${i}`} className="flex justify-between"><span>+ {s.name}</span><span>{s.price.toLocaleString('ru')} ₽</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                    </>
                    );
                  })()}
                </div>

                {/* Edit buttons */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>РЕДАКТИРОВАТЬ</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { mode: 'full' as const, label: 'Полное' },
                      { mode: 'status' as const, label: 'Статус' },
                      { mode: 'price' as const, label: 'Цена' },
                      { mode: 'workers' as const, label: 'Мастера' },
                      { mode: 'datetime' as const, label: 'Дата и время' },
                    ].map(({ mode, label }) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setOwnerBookingEditMode(mode);
                          setOwnerBookingEditError(null);
                          if (mode === 'full') openOwnerFullEditMode();
                          if (mode === 'status') setOwnerBookingEditStatus(selectedBooking.status);
                          if (mode === 'price') setOwnerBookingEditPrice(String(selectedBooking.price));
                          if (mode === 'workers') setOwnerBookingEditWorkers(selectedBooking.workers.map(w => ({ id: w.workerId, percent: w.percent, payType: w.payType || 'percent', fixedAmount: w.fixedAmount })));
                          if (mode === 'datetime') {
                            setOwnerBookingEditDate(selectedBooking.date);
                            setOwnerBookingEditTime(selectedBooking.time);
                          }
                        }}
                        className="py-2.5 rounded-xl text-sm font-medium"
                        style={ownerBookingEditMode === mode
                          ? { background: primary, color: '#fff' }
                          : { background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: isDark ? '#E6EEF8' : '#0B1226' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add additional service button */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <button
                    onClick={handleOpenOwnerAddService}
                    className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: `${primary}15`, color: primary }}
                  >
                    <Plus size={15} />Добавить доп. услугу
                  </button>
                </div>

                {/* Edit panels */}
                {ownerBookingEditMode === 'status' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>Изменить статус</div>
                    <select className={selectCls} value={ownerBookingEditStatus} onChange={e => setOwnerBookingEditStatus(e.target.value as BookingStatus)}>
                      {OWNER_BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'price' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>Изменить цену</div>
                    <input className={inputCls} type="number" min={0} value={ownerBookingEditPrice} onChange={e => setOwnerBookingEditPrice(e.target.value)} placeholder="0" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'workers' && (() => {
                  const _isFixed = isFixedMasterService(services, selectedBooking?.serviceId, selectedBooking?.service);
                  return (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>Изменить мастеров {_isFixed ? `(фикс ${formatFixedMasterAmount()})` : ''}</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
{workers.filter(w => (w.role === 'worker' || w.role === 'owner') && w.active).map(worker => {
                        const assigned = ownerBookingEditWorkers.find(item => item.id === worker.id);
                        return (
                          <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{worker.name}</span>
                              <button
                                onClick={() => assigned
                                  ? setOwnerBookingEditWorkers(current => current.filter(item => item.id !== worker.id))
                                  : setOwnerBookingEditWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                                className="px-3 py-1 rounded-lg text-xs shrink-0"
                                style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                              >
                                {assigned ? 'Выбран' : 'Выбрать'}
                              </button>
                            </div>
                            {assigned && (
                              <div className="flex items-center gap-2 mt-2">
                                {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                                ) : (
                                  <>
                                    <button onClick={() => setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                      className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-blue-500 text-white' : glass}`}>₽</button>
                                    <button onClick={() => setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                      className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-blue-500 text-white' : glass}`}>%</button>
                                    {assigned.payType === 'fixed' ? (
                                      <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                        onChange={e => { const r = e.target.value; if (r === '') { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                        className={`flex-1 ${inputCls} py-1.5`} placeholder="сумма" />
                                    ) : (
                                      <>
                                        <span className={`text-xs ${sub}`}>%</span>
                                        <input type="number" step="0.00001" min={0} max={100} value={assigned.percent === '' ? '' : assigned.percent}
                                          onChange={e => { const r = e.target.value; if (r === '') { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }}
                                          onBlur={() => setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                                          className={`flex-1 ${inputCls} py-1.5`} />
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {ownerBookingEditMode === 'datetime' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>Изменить дату и время</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                        <input className={inputCls} type="date" value={toISODate(ownerBookingEditDate)} onChange={e => {
                          const val = parseFlexibleDate(e.target.value);
                          setOwnerBookingEditDate(val ? formatDate(val) : e.target.value);
                        }} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Время</label>
                        <select className={selectCls} value={ownerBookingEditTime} onChange={e => setOwnerBookingEditTime(e.target.value)}>
                          {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'full' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-3`}>Полное редактирование</div>
                    <div className="space-y-3">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Статус</label>
                        <select className={selectCls} value={ownerBookingEditFull.status} onChange={e => setOwnerBookingEditFull(p => ({ ...p, status: e.target.value as BookingStatus }))}>
                          {OWNER_BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          <option value="in_progress">В работе</option>
                          <option value="no_show">Не приехал</option>
                          <option value="cancelled">Отменено</option>
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                        <ServiceSearchSelect
                          value={ownerBookingEditFull.serviceId}
                          services={services}
                          selectCls={selectCls}
                          inputCls={inputCls}
                          glass={glass}
                          text={text}
                          sub={sub}
                          primary={primary}
                          isDark={isDark}
                          onChange={serviceId => {
                            const svc = services.find(s => s.id === serviceId);
                            setOwnerBookingEditFull(p => {
                              const prevSvc = services.find(s => s.id === p.serviceId);
                              const wasDefaultPrice = p.price === 0 || (prevSvc && p.price === prevSvc.price);
                              return {
                                ...p,
                                serviceId,
                                price: wasDefaultPrice ? (svc?.price || 0) : p.price,
                                duration: svc?.duration || 30,
                              };
                            });
                            setOwnerBookingEditError(null);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Стоимость (₽)</label>
                          <input className={inputCls} type="number" min={0} value={numberInputValue(ownerBookingEditFull.price)} onChange={e => setOwnerBookingEditFull(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Длительность (мин)</label>
                          <input className={inputCls} type="number" min={1} value={numberInputValue(ownerBookingEditFull.duration)} onChange={e => setOwnerBookingEditFull(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Дата</label>
                          <input className={inputCls} type="date" value={toISODate(ownerBookingEditFull.date)} onChange={e => {
                            const val = parseFlexibleDate(e.target.value);
                            setOwnerBookingEditFull(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                          }} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Время</label>
                          <select className={selectCls} value={ownerBookingEditFull.time} onChange={e => setOwnerBookingEditFull(p => ({ ...p, time: e.target.value }))}>
                            {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>{editBookingLocationLabel}</label>
                        <select className={selectCls} value={ownerBookingEditFull.box} onChange={e => setOwnerBookingEditFull(p => ({ ...p, box: e.target.value }))}>
                          {boxes.filter(b => b.active).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Имя клиента</label>
                          <input className={inputCls} placeholder="Имя" value={ownerBookingEditFull.clientName} onChange={e => setOwnerBookingEditFull(p => ({ ...p, clientName: e.target.value }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Телефон</label>
                          <input className={inputCls} placeholder="+7..." value={ownerBookingEditFull.clientPhone} onChange={e => setOwnerBookingEditFull(p => ({ ...p, clientPhone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Автомобиль</label>
                          <input className={inputCls} placeholder="Марка модель" value={ownerBookingEditFull.car} onChange={e => setOwnerBookingEditFull(p => ({ ...p, car: e.target.value }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Номер</label>
                          <div className="flex gap-1.5">
                            <div className="flex flex-col gap-1 shrink-0">
                              {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                                <button key={t} type="button"
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${ownerBookingEditFull.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                                  style={ownerBookingEditFull.plateType === t ? { background: primary } : {}}
                                  onClick={() => setOwnerBookingEditFull(p => ({ ...p, plateType: t }))}
                                >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                              ))}
                            </div>
                            <input className={`${inputCls} flex-1`} maxLength={ownerBookingEditFull.plateType === 'foreign' ? 15 : 9} placeholder={ownerBookingEditFull.plateType === 'motorcycle' ? '1234ав77' : ownerBookingEditFull.plateType === 'foreign' ? 'xyz1234' : 'а123вс777'} value={ownerBookingEditFull.plate} onChange={e => setOwnerBookingEditFull(p => ({ ...p, plate: normalizePlateInput(e.target.value, p.plateType) }))} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                        <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder="Добавить примечание..." value={ownerBookingEditFull.notes} onChange={e => setOwnerBookingEditFull(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Тип оплаты</label>
                          <select className={selectCls} value={ownerBookingEditFull.paymentType} onChange={e => setOwnerBookingEditFull(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                            <option value="cash">Наличные</option>
                            <option value="transfer">Перевод</option>
                            <option value="invoice">По счёту</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Оплата получена</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={ownerBookingEditFull.paymentSettled} onChange={e => setOwnerBookingEditFull(p => ({ ...p, paymentSettled: e.target.checked }))} />
                            <span className="text-sm">Подтверждена</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>Отмена</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditError && (
                  <div className="flex items-center gap-2 text-red-500 text-xs px-1">
                    <AlertCircle size={14} />{ownerBookingEditError}
                  </div>
                )}
                <button onClick={handleDeleteOwnerBooking} className={`w-full py-3 rounded-xl text-sm font-medium ${glass} text-red-500 hover:bg-red-500/10 transition-colors`}>
                  <Trash2 size={15} className="inline mr-1.5 -mt-0.5" />Удалить запись
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATUS LIST MODAL */}
      <AnimatePresence>
        {showStatusList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowStatusList(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{ownerStatusLabel(showStatusList)}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${ownerStatusBadge(showStatusList)}`}>{statusListItems.length} записей</span>
                  <button onClick={() => setShowStatusList(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
              </div>
              {statusListItems.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>Нет записей со статусом «{ownerStatusLabel(showStatusList)}»</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statusListItems.map(booking => (
                    <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedBooking(booking); setShowStatusList(null); setShowBookingDetail(true); }}
                      className={`${glass} rounded-2xl p-4 w-full text-left`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-1 self-stretch rounded-full ${ownerStatusColor(booking.status)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="font-semibold text-sm truncate">{booking.date} · {booking.time} · {booking.clientName}</div>
                              <SourceBadge source={booking.source} />
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                          </div>
                          <div className={`text-sm ${sub} truncate`}>{booking.service}</div>
                          {(booking.car || booking.plate) && (
                            <div className={`text-xs ${sub} mt-0.5 truncate`}>
                              {[booking.car, booking.plate].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          <div className="flex justify-between mt-2">
                            <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
                            <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} ₽</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI DETAIL MODAL */}
      <AnimatePresence>
        {kpiModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setKpiModal(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{kpiModal.title}</h3>
                <div className="flex items-center gap-2">
                  {kpiModal.kind === 'bookings' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.total.toLocaleString('ru')}{kpiModal.isMoney !== false ? ' ₽' : ''} · {kpiModal.bookings.length} {kpiModal.totalLabel}
                    </span>
                  )}
                  {kpiModal.kind === 'expenses' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.total.toLocaleString('ru')} ₽ · {kpiModal.expenses.length} расходов
                    </span>
                  )}
                  {kpiModal.kind === 'services' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.services.length} услуг
                    </span>
                  )}
                  {kpiModal.kind === 'finance' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.profit >= 0 ? '+' : ''}{kpiModal.profit.toLocaleString('ru')} ₽
                    </span>
                  )}
                  <button onClick={() => setKpiModal(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
              </div>

              {kpiModal.kind === 'bookings' && (
                kpiModal.bookings.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <CalendarDays size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Записей пока нет</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kpiModal.bookings.map(booking => (
                      <motion.button key={booking.id} whileTap={{ scale: 0.98 }}
                        onClick={() => { setSelectedBooking(booking); setKpiModal(null); setShowBookingDetail(true); }}
                        className={`${glass} rounded-2xl p-4 w-full text-left`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-1 self-stretch rounded-full ${ownerStatusColor(booking.status)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="font-semibold text-sm truncate">{booking.date} · {booking.time} · {booking.clientName}</div>
                                <SourceBadge source={booking.source} />
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                            </div>
                            <div className={`text-sm ${sub} truncate`}>{booking.service}</div>
                            {(booking.car || booking.plate) && (
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {[booking.car, booking.plate].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            <div className="flex justify-between mt-2">
                              <span className={`text-xs ${sub}`}>{booking.box} · {booking.duration} мин</span>
                              <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} ₽</span>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )
              )}

              {kpiModal.kind === 'expenses' && (
                kpiModal.expenses.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <DollarSign size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Расходов за период нет</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kpiModal.expenses.map(expense => (
                      <div key={expense.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{expense.title}</div>
                          <div className={`text-xs ${sub}`}>{expense.category} · {expense.date}</div>
                        </div>
                        <div className="font-semibold text-sm shrink-0" style={{ color: '#FF6B6B' }}>−{expense.amount.toLocaleString('ru')} ₽</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {kpiModal.kind === 'services' && (
                kpiModal.services.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <BarChart3 size={36} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Нет данных по услугам</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kpiModal.services.map((service, index) => (
                      <div key={service.name} className={`${glass} rounded-xl p-3 flex items-center gap-3`}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{service.name}</div>
                          <div className={`text-xs ${sub}`}>{service.count} записей</div>
                        </div>
                        <div className="font-semibold text-sm shrink-0">{service.revenue.toLocaleString('ru')} ₽</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {kpiModal.kind === 'finance' && (
                <div className="space-y-2">
                  {[
                    { label: 'Выручка за неделю', value: kpiModal.revenue, color: accent },
                    { label: 'Доходы за неделю', value: kpiModal.incomes, color: '#06B6D4' },
                    { label: 'Расходы за неделю', value: -kpiModal.expenses, color: '#FF6B6B' },
                    { label: 'Прибыль за неделю', value: kpiModal.profit, color: kpiModal.color },
                  ].map(row => (
                    <div key={row.label} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                      <div className="text-sm">{row.label}</div>
                      <div className="font-semibold text-sm" style={{ color: row.color }}>
                        {row.value >= 0 ? '+' : ''}{row.value.toLocaleString('ru')} ₽
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD SERVICE MODAL */}
      <AnimatePresence>
        {showOwnerAddService && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setShowOwnerAddService(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Добавить доп. услугу</h3>
                <button onClick={() => setShowOwnerAddService(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <p className={`text-xs ${sub} mb-4`}>Для: {selectedBooking.clientName} ({selectedBooking.service})</p>

              {/* ── Услуга ── */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                <ServiceSearchSelect
                  value={ownerAddServiceDraft.serviceId}
                  services={liveServices}
                  selectCls={selectCls}
                  inputCls={inputCls}
                  glass={glass}
                  text={text}
                  sub={sub}
                  primary={primary}
                  isDark={isDark}
                  placeholder="Выберите услугу"
                  onChange={(serviceId) => {
                    const svc = liveServices.find(s => s.id === serviceId);
                    setOwnerAddServiceDraft(p => {
                      const prevSvc = liveServices.find(s => s.id === p.serviceId);
                      const wasDefaultPrice = p.price === 0 || (prevSvc && p.price === prevSvc.price);
                      return {
                        serviceId,
                        price: wasDefaultPrice ? (svc?.price || 0) : p.price,
                        duration: svc?.duration || 30,
                        priceMode: p.priceMode,
                      };
                    });
                    setOwnerAddServiceError(null);
                  }}
                />
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Цена и длительность ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerAddServiceDraft.price)} onChange={e => setOwnerAddServiceDraft(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerAddServiceDraft.duration)} onChange={e => setOwnerAddServiceDraft(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                </div>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Режим применения цены ── */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Применить к основной услуге</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOwnerAddServiceDraft(p => ({ ...p, priceMode: 'add' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerAddServiceDraft.priceMode === 'add' ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                  >
                    + Плюс
                  </button>
                  <button
                    onClick={() => setOwnerAddServiceDraft(p => ({ ...p, priceMode: 'subtract' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerAddServiceDraft.priceMode === 'subtract' ? { background: '#EF4444', color: 'white' } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    − Минус
                  </button>
                </div>
                {ownerAddServiceDraft.priceMode === 'subtract' && (
                  <p className={`text-xs ${sub} mt-1.5`}>Сумма не прибавляется к стоимости клиента и вычитается из базы расчёта зп мастеров основной услуги</p>
                )}
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Аутсорс ── */}
              <div className="mb-2">
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Аутсорс</span>
                  <input
                    type="checkbox"
                    checked={ownerAddServiceDraft.isOutsource}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setOwnerAddServiceDraft(p => ({ ...p, isOutsource: checked }));
                      if (checked) setOwnerAddServiceWorkers([]);
                    }}
                  />
                </label>
                {ownerAddServiceDraft.isOutsource && (
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Сумма аутсорсеру (₽)</label>
                    <input className={inputCls} type="number" min={0} value={numberInputValue(ownerAddServiceDraft.outsourceAmount)}
                      onChange={e => setOwnerAddServiceDraft(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
              </div>

              {!ownerAddServiceDraft.isOutsource && (
              <>
              {/* ── Мастера ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Назначить мастеров</label>
                  {ownerAddServiceWorkers.length > 0 && (
                    <span className={`text-xs ${sub}`}>Выбрано: {ownerAddServiceWorkers.length}</span>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                      {workers.filter(w => (w.role === 'worker' || w.role === 'owner') && w.active).map(worker => {
                    const assigned = ownerAddServiceWorkers.find(item => item.id === worker.id);
                    return (
                      <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium">{worker.name}</span>
                          </div>
                          <button
                            onClick={() => assigned
                              ? setOwnerAddServiceWorkers(current => current.filter(item => item.id !== worker.id))
                              : setOwnerAddServiceWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                            className="px-3 py-1 rounded-lg text-xs shrink-0"
                            style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                          >
                            {assigned ? 'Выбран' : 'Выбрать'}
                          </button>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-blue-500 text-white' : glass}`}>₽</button>
                            <button onClick={() => setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-blue-500 text-white' : glass}`}>%</button>
                            {assigned.payType === 'fixed' ? (
                              <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                onChange={e => { const r = e.target.value; if (r === '') { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                className={`flex-1 ${inputCls} py-1.5`} placeholder="сумма" />
                            ) : (
                              <>
                                <span className={`text-xs ${sub}`}>%</span>
                                <input type="number" step="0.00001" min={0} max={100} value={assigned.percent === '' ? '' : assigned.percent}
                                  onChange={e => { const r = e.target.value; if (r === '') { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }}
                                  onBlur={() => setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                                  className={`flex-1 ${inputCls} py-1.5`} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
              )}

              {/* ── Итого ── */}
              {ownerAddServiceDraft.serviceId && (
                <>
                  <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                  <div className={`${glass} rounded-2xl p-4 space-y-2`}>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Итого</div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${sub}`}>Клиент заплатит</span>
                      <span className="text-sm font-semibold">{ownerAddServiceDraft.priceMode === 'subtract' ? '0 ₽ (не прибавляется)' : `+ ${ownerAddServiceDraft.price.toLocaleString('ru')} ₽`}</span>
                    </div>
                    {ownerAddServiceDraft.priceMode === 'subtract' && (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${sub}`}>База зп мастеров основной услуги</span>
                        <span className="text-sm font-semibold text-red-500">− {ownerAddServiceDraft.price.toLocaleString('ru')} ₽</span>
                      </div>
                    )}
                    {ownerAddServiceDraft.isOutsource ? (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${sub}`}>Аутсорсеру</span>
                        <span className="text-sm font-medium text-red-500">− {ownerAddServiceDraft.outsourceAmount.toLocaleString('ru')} ₽</span>
                      </div>
                    ) : ownerAddServiceWorkers.length > 0 && ownerAddServiceWorkers.map(item => {
                      const w = workers.find(wk => wk.id === item.id);
                      const pct = item.percent === '' ? 0 : item.percent;
                      const earned = item.payType === 'fixed' ? (item.fixedAmount || 0) : Math.round(ownerAddServiceDraft.price * pct / 100);
                      const _svc = services.find(s => s.id === ownerAddServiceDraft.serviceId);
                      const _fixed = isFixedMasterService(services, _svc?.id, _svc?.name);
                      return (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className={`text-sm ${sub}`}>{w?.name || 'Мастер'}{_fixed ? ` · фикс ${formatFixedMasterAmount()}` : item.payType === 'fixed' ? ` · ${(item.fixedAmount || 0).toLocaleString('ru')} ₽` : ` · ${pct}%`}</span>
                          <span className="text-sm font-medium text-green-500">{_fixed ? formatFixedMasterAmount() : `${earned.toLocaleString('ru')} ₽`}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {ownerAddServiceError && (
                <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                  <AlertCircle size={14} />{ownerAddServiceError}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowOwnerAddService(false)} className={`flex-1 py-3 rounded-2xl text-sm font-medium ${glass}`}>Отмена</button>
                <button onClick={() => void handleAddOwnerService()} disabled={ownerAddServiceSaving} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                  {ownerAddServiceSaving ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT ADDITIONAL SERVICE MODAL */}
      <AnimatePresence>
        {ownerEditAsvcId && selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) setOwnerEditAsvcId(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Изменить доп. услугу</h3>
                <button onClick={() => setOwnerEditAsvcId(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <p className={`text-xs ${sub} mb-4`}>Для: {selectedBooking.clientName} ({selectedBooking.service})</p>

              {/* ── Цена и длительность ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerEditAsvcDraft.price)} onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerEditAsvcDraft.duration)} onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                </div>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Режим применения цены ── */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Применить к основной услуге</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOwnerEditAsvcDraft(p => ({ ...p, priceMode: 'add' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerEditAsvcDraft.priceMode === 'add' ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                  >
                    + Плюс
                  </button>
                  <button
                    onClick={() => setOwnerEditAsvcDraft(p => ({ ...p, priceMode: 'subtract' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerEditAsvcDraft.priceMode === 'subtract' ? { background: '#EF4444', color: 'white' } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    − Минус
                  </button>
                </div>
                {ownerEditAsvcDraft.priceMode === 'subtract' && (
                  <p className={`text-xs ${sub} mt-1.5`}>Сумма не прибавляется к стоимости клиента и вычитается из базы расчёта зп мастеров основной услуги</p>
                )}
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* ── Аутсорс ── */}
              <div className="mb-2">
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Аутсорс</span>
                  <input
                    type="checkbox"
                    checked={ownerEditAsvcDraft.isOutsource}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setOwnerEditAsvcDraft(p => ({ ...p, isOutsource: checked }));
                      if (checked) setOwnerEditAsvcWorkers([]);
                    }}
                  />
                </label>
                {ownerEditAsvcDraft.isOutsource && (
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Сумма аутсорсеру (₽)</label>
                    <input className={inputCls} type="number" min={0} value={numberInputValue(ownerEditAsvcDraft.outsourceAmount)}
                      onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
              </div>

              {!ownerEditAsvcDraft.isOutsource && (
              <>
              {/* ── Мастера ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-medium ${sub} uppercase tracking-wider`}>Назначить мастеров</label>
                  {ownerEditAsvcWorkers.length > 0 && (
                    <span className={`text-xs ${sub}`}>Выбрано: {ownerEditAsvcWorkers.length}</span>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {workers.filter(w => (w.role === 'worker' || w.role === 'owner') && w.active).map(worker => {
                    const assigned = ownerEditAsvcWorkers.find(item => item.id === worker.id);
                    return (
                      <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-sm font-medium">{worker.name}</span>
                          </div>
                          <button
                            onClick={() => assigned
                              ? setOwnerEditAsvcWorkers(current => current.filter(item => item.id !== worker.id))
                              : setOwnerEditAsvcWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                            className="px-3 py-1 rounded-lg text-xs shrink-0"
                            style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                          >
                            {assigned ? 'Выбран' : 'Выбрать'}
                          </button>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-blue-500 text-white' : glass}`}>₽</button>
                            <button onClick={() => setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-blue-500 text-white' : glass}`}>%</button>
                            {assigned.payType === 'fixed' ? (
                              <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                onChange={e => { const r = e.target.value; if (r === '') { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                className={`flex-1 ${inputCls} py-1.5`} placeholder="сумма" />
                            ) : (
                              <>
                                <span className={`text-xs ${sub}`}>%</span>
                                <input type="number" step="0.00001" min={0} max={100} value={assigned.percent === '' ? '' : assigned.percent}
                                  onChange={e => { const r = e.target.value; if (r === '') { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }}
                                  onBlur={() => setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                                  className={`flex-1 ${inputCls} py-1.5`} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
              )}

              {ownerEditAsvcError && (
                <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                  <AlertCircle size={14} />{ownerEditAsvcError}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setOwnerEditAsvcId(null)} className={`flex-1 py-3 rounded-2xl text-sm font-medium ${glass}`}>Отмена</button>
                <button onClick={() => void handleSaveOwnerEditAsvc()} disabled={ownerEditAsvcSaving} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                  {ownerEditAsvcSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OWNER NEW BOOKING MODAL ── */}
      <AnimatePresence>
        {showOwnerNewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) closeOwnerNewBookingModal(); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-sm relative flex flex-col`}>
              <div className="sticky top-0 z-10 p-4 border-b flex justify-between items-center" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Новая запись</h3>
                <button onClick={closeOwnerNewBookingModal} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              {/* Scrollable content container */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: window.innerWidth < 768 ? `${modalMaxHeight}px` : undefined }}
              >
                <AnimatePresence>
                  {ownerNewBookingSaveSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center z-10" style={{ background: isDark ? 'rgba(14,22,36,0.95)' : 'rgba(255,255,255,0.95)' }}>
                      <div className="text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}20` }}>
                          <Check size={28} style={{ color: primary }} />
                        </motion.div>
                        <div className="font-semibold">Запись сохранена!</div>
                        <div className={`text-sm ${sub} mt-1`}>{ownerNewBookingSaveSuccess === 'notify' ? 'Мастера уведомлены' : OWNER_BOOKING_STATUS_OPTIONS.find((o) => o.value === ownerNewBookingForm.status)?.label || ownerNewBookingForm.status}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="p-4 space-y-3">
                {[
                  { label: 'Клиент (необязательно)', key: 'clientName', placeholder: 'Введите имя клиента', type: 'text' },
                  { label: 'Телефон (необязательно)', key: 'clientPhone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'Автомобиль (необязательно)', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Номер (необязательно)', key: 'plate', placeholder: 'а123вс777', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    {f.key === 'plate' ? (
                      <div className="flex gap-1.5">
                        <div className="flex flex-col gap-1 shrink-0">
                          {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                            <button key={t} type="button"
                              className={`text-[10px] px-1.5 py-0.5 rounded ${ownerNewBookingForm.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                              style={ownerNewBookingForm.plateType === t ? { background: primary } : {}}
                              onClick={() => setOwnerNewBookingForm(p => ({ ...p, plateType: t }))}
                            >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                          ))}
                        </div>
                        <input className={`${inputCls} flex-1 ${ownerNewBookingErrors[f.key as keyof typeof ownerNewBookingErrors] ? 'border-red-400' : ''}`} type={f.type}
                          placeholder={ownerNewBookingForm.plateType === 'motorcycle' ? '1234ав77' : ownerNewBookingForm.plateType === 'foreign' ? 'xyz1234' : 'а123вс777'}
                          maxLength={ownerNewBookingForm.plateType === 'foreign' ? 15 : 9}
                          value={(ownerNewBookingForm as any)[f.key]} onChange={e => {
                            const nextValue = normalizePlateInput(e.target.value, ownerNewBookingForm.plateType);
                            setOwnerNewBookingForm(p => ({ ...p, [f.key]: nextValue }));
                            if (f.key === 'clientName' || f.key === 'clientPhone' || f.key === 'car' || f.key === 'plate') {
                              setOwnerNewBookingErrors((current) => ({ ...current, [f.key]: undefined, general: undefined }));
                            }
                          }} />
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center">
                        <input className={`${inputCls} flex-1 ${ownerNewBookingErrors[f.key as keyof typeof ownerNewBookingErrors] ? 'border-red-400' : ''}`} type={f.type} placeholder={f.placeholder}
                          value={(ownerNewBookingForm as any)[f.key]} onChange={e => {
                            const nextValue = e.target.value;
                            setOwnerNewBookingForm(p => ({ ...p, [f.key]: nextValue }));
                            if (f.key === 'clientName' || f.key === 'clientPhone' || f.key === 'car') {
                              setOwnerNewBookingErrors((current) => ({ ...current, [f.key]: undefined, general: undefined }));
                            }
                          }} />
                        {f.key === 'clientName' && (
                          <button type="button" onClick={() => setShowOwnerClientSearch(true)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ background: `${primary}20`, color: primary }}>
                            ?
                          </button>
                        )}
                      </div>
                    )}
                    {(f.key === 'clientName' && ownerNewBookingErrors.clientName) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.clientName}</div>}
                    {(f.key === 'clientPhone' && ownerNewBookingErrors.clientPhone) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.clientPhone}</div>}
                    {(f.key === 'car' && ownerNewBookingErrors.car) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.car}</div>}
                    {(f.key === 'plate' && ownerNewBookingErrors.plate) && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.plate}</div>}
                  </div>
                ))}
                {ownerNewBookingClientVehicles.length > 0 && (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Авто клиента</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ownerNewBookingClientVehicles.map((vehicle, index) => {
                        const isActive = normalizeVehicleInput(vehicle.car || '') === normalizeVehicleInput(ownerNewBookingForm.car)
                          && normalizePlateInput(vehicle.plate || '', vehicle.plateType) === normalizePlateInput(ownerNewBookingForm.plate, ownerNewBookingForm.plateType);
                        return (
                          <button key={index} type="button" onClick={() => {
                            setOwnerNewBookingForm(p => ({ ...p, car: vehicle.car || '', plate: vehicle.plate || '', plateType: (vehicle.plateType as PlateType) || 'russian' }));
                            setOwnerNewBookingErrors((current) => ({ ...current, car: undefined, plate: undefined, general: undefined }));
                          }}
                            className={`text-xs px-2.5 py-1.5 rounded-xl border transition hover:opacity-80 ${isActive ? 'text-white font-medium' : `${sub}`}`}
                            style={isActive ? { background: primary, borderColor: primary } : { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
                            {[vehicle.car, vehicle.plate].filter(Boolean).join(' · ') || 'Авто'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Услуга</label>
                  <ServiceSearchSelect
                    value={ownerNewBookingForm.serviceId}
                    services={services}
                    selectCls={selectCls}
                    inputCls={inputCls}
                    glass={glass}
                    text={text}
                    sub={sub}
                    primary={primary}
                    isDark={isDark}
                    onChange={serviceId => {
                      const svc = services.find(s => s.id === serviceId);
                      setOwnerNewBookingForm(p => {
                        const prevSvc = services.find(s => s.id === p.serviceId);
                        const wasDefaultPrice = p.price === 0 || (prevSvc && p.price === prevSvc.price);
                        return {
                          ...p,
                          serviceId,
                          service: svc?.name || '',
                          price: wasDefaultPrice ? (svc?.price || 0) : p.price,
                          duration: svc?.duration || 30,
                          box: ownerPickDefaultBookingBox(serviceId, services, boxes, bookings, p.date, p.time, svc?.duration || 30),
                        };
                      });
                      setOwnerNewBookingErrors((current) => ({ ...current, general: undefined }));
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.price)} onChange={e => setOwnerNewBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Длит. (мин)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.duration)} onChange={e => {
                      const nextDuration = numberFromInput(e.target.value);
                      setOwnerNewBookingForm(p => ({
                        ...p,
                        duration: nextDuration,
                        box: ownerPickDefaultBookingBox(p.serviceId, services, boxes, bookings, p.date, p.time, nextDuration),
                      }));
                    }} />
                  </div>
                </div>
                <div className={`rounded-2xl px-3 py-3 text-sm ${glass}`}>
                  Для базы клиентов можно выбрать статус "Прошлая завершённая": такая запись сохраняется в истории и будет видна клиенту после первого входа по этому телефону.
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Статус записи</label>
                  <select
                    className={selectCls}
                    value={ownerNewBookingForm.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value as BookingStatus;
                      setOwnerNewBookingForm((current) => ({
                        ...current,
                        status: nextStatus,
                        date: nextStatus === 'admin_review' ? current.date : (current.date || todayLabel),
                        time: nextStatus === 'admin_review' ? current.time : (current.time || '10:00'),
                        box: ownerBookingStatusRequiresScheduledSlot(nextStatus)
                          ? ownerPickDefaultBookingBox(
                            current.serviceId,
                            services,
                            boxes,
                            bookings,
                            nextStatus === 'admin_review' ? current.date : (current.date || todayLabel),
                            nextStatus === 'admin_review' ? current.time : (current.time || '10:00'),
                            current.duration,
                          )
                          : current.box,
                      }));
                      setOwnerNewBookingErrors((current) => ({ ...current, date: undefined, time: undefined, general: undefined }));
                    }}
                  >
                    {OWNER_BOOKING_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата (можно выбрать прошлую)</label>
                  <input className={inputCls} type="date" value={toISODate(ownerNewBookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    const nextDate = val ? formatDate(val) : e.target.value;
                    setOwnerNewBookingForm(p => ({
                      ...p,
                      date: nextDate,
                      box: ownerPickDefaultBookingBox(p.serviceId, services, boxes, bookings, nextDate, p.time, p.duration),
                    }));
                    setOwnerNewBookingErrors((current) => ({ ...current, date: undefined, general: undefined }));
                  }} />
                  {ownerNewBookingErrors.date && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.date}</div>}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Время (выпадающий список)</label>
                  <select className={selectCls} value={ownerNewBookingForm.time} onChange={e => {
                    const nextTime = e.target.value;
                    setOwnerNewBookingForm(p => ({
                      ...p,
                      time: nextTime,
                      box: ownerPickDefaultBookingBox(p.serviceId, services, boxes, bookings, p.date, nextTime, p.duration),
                    }));
                    setOwnerNewBookingErrors((current) => ({ ...current, time: undefined, general: undefined }));
                  }}>
                    <option value="">--:--</option>
                    {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                  {ownerNewBookingErrors.time && <div className="mt-1 text-xs text-red-500">{ownerNewBookingErrors.time}</div>}
                </div>
                {ownerNewBookingForm.date.trim() && ownerNewBookingForm.time.trim() ? (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>{ownerNewBookingLocationLabel}</label>
                    <select className={selectCls} value={ownerNewBookingForm.box} onChange={e => setOwnerNewBookingForm(p => ({ ...p, box: e.target.value }))}>
                      {boxes.filter(b => b.active).map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>{ownerNewBookingLocationLabel}</label>
                    <div className={`${inputCls} ${sub}`}>Помещение можно выбрать позже, когда будет согласовано время</div>
                  </div>
                )}
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Аутсорс</span>
                  <input
                    type="checkbox"
                    checked={ownerNewBookingForm.isOutsource}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setOwnerNewBookingForm(p => ({ ...p, isOutsource: checked }));
                      if (checked) setOwnerNewBookingWorkers([]);
                    }}
                  />
                </label>
                {ownerNewBookingForm.isOutsource && (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Сумма аутсорсеру (₽)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.outsourceAmount)}
                      onChange={e => setOwnerNewBookingForm(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
                {!ownerNewBookingForm.isOutsource && (() => {
                  const _svc = services.find(s => s.id === ownerNewBookingForm.serviceId);
                  const _isFixed = isFixedMasterService(services, _svc?.id, _svc?.name);
                  return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Назначить мастеров</label>
                    <span className={`text-xs ${sub}`}>{_isFixed ? `Фикс ${formatFixedMasterAmount()}` : ownerNewBookingWorkers.some(w => w.payType === 'fixed') ? `Выбрано: ${ownerNewBookingWorkers.length}` : `Сумма: ${totalOwnerNewBookingPercent}%`}</span>
                  </div>
                  <div className="space-y-2">
                    {ownerNewBookingMasterWorkers.map(worker => {
                      const assigned = ownerNewBookingWorkers.find(item => item.id === worker.id);
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${worker.available ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-sm font-medium">{worker.name}</span>
                              </div>
                              <div className={`text-xs ${sub} mt-1 truncate`}>{worker.specialty || worker.experience}</div>
                            </div>
                            <button
                              onClick={() => assigned
                                ? setOwnerNewBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setOwnerNewBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                              className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                              style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                            >
                              {assigned ? 'Выбран' : 'Выбрать'}
                            </button>
                          </div>
                          {assigned && (
                            <div className="flex items-center gap-2 mt-2">
                              {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                              ) : (
                                <>
                                  <button onClick={() => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-blue-500 text-white' : glass}`}>₽</button>
                                  <button onClick={() => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-blue-500 text-white' : glass}`}>%</button>
                                  {assigned.payType === 'fixed' ? (
                                    <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                      onChange={e => { const r = e.target.value; if (r === '') { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                      className={`flex-1 ${inputCls} py-1.5`} placeholder="сумма" />
                                  ) : (
                                    <>
                                      <span className={`text-xs ${sub}`}>%</span>
                                      <input
                                        type="number"
                                        step="0.00001"
                                        min={0}
                                        max={100}
                                        value={assigned.percent === '' ? '' : assigned.percent}
                                        onChange={e => { const r = e.target.value; if (r === '') { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }}
                                        onBlur={() => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))}
                                        className={`flex-1 ${inputCls} py-1.5`}
                                      />
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                  );
                })()}
                {/* Materials section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-xs ${sub} block`}>Материалы</label>
                    <button onClick={() => { setOwnerMaterialPickerCategory(null); setShowOwnerMaterialPicker(true); }}
                      className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                      style={{ background: `${primary}15`, color: primary }}>+ Выбрать материал</button>
                  </div>
                  {ownerNewBookingMaterials.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {ownerNewBookingMaterials.map((mat, idx) => {
                        const parsedQty = typeof mat.qty === 'string' ? parseFloat(mat.qty) : mat.qty;
                        const safeQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;
                        return (
                        <div key={idx} className={`${glass} rounded-xl px-3 py-2 flex items-center justify-between gap-2`}>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{mat.name}</div>
                            <div className={`text-xs ${sub}`}>{safeQty} {mat.unit} × {mat.unitPrice.toLocaleString('ru')} ₽ = {(safeQty * mat.unitPrice).toLocaleString('ru')} ₽</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input type="text" inputMode="decimal"
                              value={typeof mat.qty === 'string' ? mat.qty : (mat.qty === 0 ? '' : String(mat.qty))}
                              onChange={e => {
                                const raw = e.target.value.replace(',', '.');
                                setOwnerNewBookingMaterials(current => current.map((m, i) => i === idx ? { ...m, qty: raw } : m));
                              }}
                              onBlur={() => {
                                if (typeof mat.qty === 'string') {
                                  const val = parseFloat(mat.qty);
                                  setOwnerNewBookingMaterials(current => current.map((m, i) => i === idx ? { ...m, qty: (!isNaN(val) && val > 0) ? val : 1 } : m));
                                }
                              }}
                              className="w-14 text-center text-xs py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                            <select value={mat.unit}
                              onChange={e => setOwnerNewBookingMaterials(current => current.map((m, i) => i === idx ? { ...m, unit: e.target.value } : m))}
                              className="text-xs py-1 rounded-lg px-1" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                              {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <button onClick={() => setOwnerNewBookingMaterials(current => current.filter((_, i) => i !== idx))}
                              className="p-1 rounded text-red-500"><X size={14} /></button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  {ownerNewBookingMaterials.length === 0 && (
                    <div className={`text-xs ${sub} mb-2`}>Материалы не выбраны</div>
                  )}
                </div>
                {/* Material picker modal */}
                <AnimatePresence>
                  {showOwnerMaterialPicker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
                      onClick={() => setShowOwnerMaterialPicker(false)}>
                      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-sm max-h-[60vh] flex flex-col`}>
                        <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">Выбрать материал</h3>
                            <button onClick={() => setShowOwnerMaterialPicker(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setOwnerMaterialPickerCategory(null)}
                              className={`text-xs px-2.5 py-1 rounded-full ${!ownerMaterialPickerCategory ? 'text-white font-medium' : glass}`}
                              style={!ownerMaterialPickerCategory ? { background: primary } : {}}>Все</button>
                            {stockCategories.filter(c => !c.parentId).map(cat => (
                              <button key={cat.id} onClick={() => setOwnerMaterialPickerCategory(cat.id)}
                                className={`text-xs px-2.5 py-1 rounded-full ${ownerMaterialPickerCategory === cat.id ? 'text-white font-medium' : glass}`}
                                style={ownerMaterialPickerCategory === cat.id ? { background: primary } : {}}>{cat.name}</button>
                            ))}
                          </div>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2">
                          {stockItems
                            .filter(item => {
                              if (!ownerMaterialPickerCategory) return true;
                              const catIds = [ownerMaterialPickerCategory, ...stockCategories.filter(c => c.parentId === ownerMaterialPickerCategory).map(c => c.id)];
                              return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerMaterialPickerCategory)?.name;
                            })
                            .filter(item => item.qty > 0)
                            .map(item => (
                              <div key={item.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className={`text-xs ${sub}`}>В наличии: {item.qty} {item.unit} · {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}</div>
                                </div>
                                <button onClick={() => {
                                  if (!ownerNewBookingMaterials.find(m => m.stockItemId === item.id)) {
                                    setOwnerNewBookingMaterials(current => [...current, { stockItemId: item.id, name: item.name, qty: '', unit: item.unit, unitPrice: item.unitPrice }]);
                                  }
                                  setShowOwnerMaterialPicker(false);
                                }}
                                  className="px-3 py-1.5 rounded-lg text-xs shrink-0 text-white"
                                  style={{ background: primary }}>Выбрать</button>
                              </div>
                            ))}
                          {stockItems.filter(item => {
                            if (!ownerMaterialPickerCategory) return true;
                            const catIds = [ownerMaterialPickerCategory, ...stockCategories.filter(c => c.parentId === ownerMaterialPickerCategory).map(c => c.id)];
                            return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerMaterialPickerCategory)?.name;
                          }).filter(item => item.qty > 0).length === 0 && (
                            <div className={`text-sm ${sub} text-center py-6`}>Нет материалов в этой категории</div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!ownerNewBookingForm.isOutsource && !isFixedMasterService(services, ownerNewBookingForm.service, services.find(s => s.id === ownerNewBookingForm.service)?.name) && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100 && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />Сумма процентов мастеров превышает 100%</div>
                )}
                {ownerNewBookingErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} />{ownerNewBookingErrors.general}</div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Доп. информация..." value={ownerNewBookingForm.notes} onChange={e => setOwnerNewBookingForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Как узнал о нас</label>
                  <select className={selectCls} value={ownerNewBookingForm.referralSource} onChange={e => setOwnerNewBookingForm(p => ({ ...p, referralSource: e.target.value }))}>
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Способ оплаты</label>
                  <select className={selectCls} value={ownerNewBookingForm.paymentType} onChange={e => setOwnerNewBookingForm(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="invoice">По счёту</option>
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>Оплачено</span>
                  <input
                    type="checkbox"
                    checked={ownerNewBookingForm.paymentSettled}
                    onChange={(event) => setOwnerNewBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                  />
                </label>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { void handleSaveOwnerNewBooking(true); }} disabled={!ownerNewBookingForm.serviceId || (!ownerNewBookingForm.isOutsource && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100) || ownerNewBookingSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50 min-h-[44px] min-w-[44px]" style={{ background: primary }}>
                  {ownerNewBookingSaving ? 'Сохранение...' : 'Сохранить и уведомить'}
                </button>
                <button onClick={() => { void handleSaveOwnerNewBooking(false); }} disabled={!ownerNewBookingForm.serviceId || (!ownerNewBookingForm.isOutsource && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100) || ownerNewBookingSaving} className={`w-full py-3 rounded-2xl font-medium ${glass} disabled:opacity-50 min-h-[44px] min-w-[44px]`}>
                  Сохранить без уведомления
                </button>
              </div>
              </div>{/* end overflow-y-auto */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OWNER CLIENT SEARCH MODAL (from + button) */}
      <AnimatePresence>
        {showOwnerClientSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={() => setShowOwnerClientSearch(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col`}>
              <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Найденные клиенты</h3>
                  <button onClick={() => setShowOwnerClientSearch(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
                <div className={`text-xs ${sub}`}>
                  {(() => {
                    const q = ownerNewBookingForm.clientName.trim().toLowerCase();
                    const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                    return matches.length > 0 ? `Найдено ${matches.length} клиент${matches.length === 1 ? '' : 'ов'}` : 'Введите имя для поиска';
                  })()}
                </div>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {(() => {
                  const q = ownerNewBookingForm.clientName.trim().toLowerCase();
                  const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                  return matches.length > 0 ? matches.map(client => (
                    <button key={client.id} type="button" onClick={() => {
                      const mainVehicle = ownerClientMainVehicle(client.id);
                      setOwnerNewBookingForm(p => ({ ...p, clientId: client.id, clientName: client.name, clientPhone: client.phone, car: mainVehicle?.car || client.car || '', plate: mainVehicle?.plate || client.plate || '', plateType: ((mainVehicle?.plateType || client.plateType) as PlateType) || 'russian' }));
                      setShowOwnerClientSearch(false);
                    }}
                      className={`w-full text-left ${glass} rounded-2xl p-4 transition hover:opacity-80`}>
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className={`text-xs ${sub} mt-0.5`}>{client.phone}</div>
                      {(() => {
                        const clientVehicles = ownerClientVehicles(client.id);
                        return clientVehicles.length > 0 ? (
                          <div className={`text-xs ${sub} mt-0.5`}>
                            {clientVehicles.map((vehicle, vehicleIndex) => (
                              <div key={vehicleIndex}>{[vehicle.car, vehicle.plate].filter(Boolean).join(' • ') || 'Авто'}</div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </button>
                  )) : (
                    <div className={`text-sm ${sub} text-center py-8`}>
                      {q ? 'Ничего не найдено' : 'Начните вводить имя клиента'}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EXPORT TOAST ── */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={16} style={{ color: accent }} /></div>
              <div>
                <div className="text-sm font-medium">{exportSuccess.title}</div>
                <div className={`text-xs ${sub}`}>{exportSuccess.subtitle}</div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT EXPENSE MODAL (task 5.3) ── */}
      <AnimatePresence>
        {editingExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Редактировать расход</h3>
                <button onClick={() => setEditingExpense(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Название</label>
                  <input className={inputCls} placeholder="Название расхода..." value={editExpenseForm.title} onChange={e => setEditExpenseForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label>
                  <input className={inputCls} type="number" placeholder="0" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Категория</label>
                  <select className={selectCls} value={editExpenseForm.category} onChange={e => setEditExpenseForm(p => ({ ...p, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата (ДД.ММ.ГГГГ)</label>
                  <input className={inputCls} type="date" value={toISODate(editExpenseForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setEditExpenseForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {editExpenseForm.date && !/^\d{2}\.\d{2}\.\d{4}$/.test(editExpenseForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Необязательно..." value={editExpenseForm.note} onChange={e => setEditExpenseForm(p => ({ ...p, note: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Категория услуги</label>
                  <select className={selectCls} value={editExpenseForm.resourceGroup} onChange={e => setEditExpenseForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">Общее</option>
                    <option value="wash">Автомойка</option>
                    <option value="detailing">Детейлинг</option>
                  </select>
                  {editExpenseForm.resourceGroup && (
                    <p className="text-[11px] mt-1.5" style={{ color: accent }}>Списание из копилки {editExpenseForm.resourceGroup === 'wash' ? '🚗 Мойка' : '✨ Детейлинг'}</p>
                  )}
                </div>
              </div>
              {editFinanceError && (
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: '#FF6B6B' }}>
                  <AlertCircle size={13} />
                  {editFinanceError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingExpense(null)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}
                >
                  Отмена
                </button>
                <button
                  onClick={() => { void handleSaveExpense(); }}
                  disabled={editFinanceLoading}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#FF6B6B' }}
                >
                  {editFinanceLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Сохранение...</>
                  ) : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT INCOME MODAL (task 6.3) ── */}
      <AnimatePresence>
        {editingIncome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Редактировать доход</h3>
                <button onClick={() => setEditingIncome(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Сумма (₽)</label>
                  <input className={inputCls} type="number" placeholder="0" value={editIncomeForm.amount} onChange={e => setEditIncomeForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Источник / описание</label>
                  <input className={inputCls} placeholder="Аренда, продажа товара..." value={editIncomeForm.source} onChange={e => setEditIncomeForm(p => ({ ...p, source: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Дата (ДД.ММ.ГГГГ)</label>
                  <input className={inputCls} type="date" value={toISODate(editIncomeForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setEditIncomeForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {editIncomeForm.date && !/^\d{2}\.\d{2}\.\d{4}$/.test(editIncomeForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Введите дату в формате ДД.ММ.ГГГГ</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Примечание</label>
                  <input className={inputCls} placeholder="Необязательно..." value={editIncomeForm.note} onChange={e => setEditIncomeForm(p => ({ ...p, note: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Категория услуги</label>
                  <select className={selectCls} value={editIncomeForm.resourceGroup} onChange={e => setEditIncomeForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">Общее</option>
                    <option value="wash">Автомойка</option>
                    <option value="detailing">Детейлинг</option>
                  </select>
                </div>
              </div>
              {editFinanceError && (
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: '#FF6B6B' }}>
                  <AlertCircle size={13} />
                  {editFinanceError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingIncome(null)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}
                >
                  Отмена
                </button>
                <button
                  onClick={() => { void handleSaveIncome(); }}
                  disabled={editFinanceLoading}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: primary }}
                >
                  {editFinanceLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Сохранение...</>
                  ) : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SERVICE SETTINGS ── */}
      <AnimatePresence>
        {showServiceSettings && editingServiceId && (() => {
          const svcIndex = services.findIndex((s) => s.id === editingServiceId);
          const svc = svcIndex >= 0 ? services[svcIndex] : null;
          if (!svc) return null;
          const patch = (partial: Partial<Service>) =>
            setServicesState((p) => p.map((item, j) => (j === svcIndex ? { ...item, ...partial } : item)));
          const samplePrice = svc.price > 0 ? svc.price : 1000;
          const samplePercent = Number(workers.find((w) => w.active)?.defaultPercent ?? 50) || 50;
          const effectiveOrder = (() => {
            const filtered = (svc.splitOrder ?? []).filter(s => ORDER_STEPS.some(o => o.id === s));
            return filtered.length === ORDER_STEPS.length ? filtered : ORDER_STEPS.map(o => o.id);
          })();
          const svcMaterialsCost = (svc.materials ?? []).reduce((sum, m) => {
            const stockItem = stockItems.find(s => s.id === m.stockItemId);
            return sum + (stockItem ? Number(m.qty || 0) * stockItem.unitPrice : 0);
          }, 0);
          const applyMaterials = (list: Array<{ stockItemId: string; name: string; qty: number; unit: string }>) => {
            const cost = list.reduce((sum, m) => {
              const stockItem = stockItems.find(s => s.id === m.stockItemId);
              return sum + (stockItem ? Number(m.qty || 0) * stockItem.unitPrice : 0);
            }, 0);
            patch({ materials: list, materialConsumption: list.length > 0 ? Math.round(cost) : null });
          };
          const patchMaterialQty = (index: number, qty: number) => {
            const list = [...(svc.materials ?? [])];
            if (index >= list.length) return;
            list[index] = { ...list[index], qty };
            applyMaterials(list);
          };
          const removeMaterial = (index: number) => {
            const list = [...(svc.materials ?? [])];
            list.splice(index, 1);
            applyMaterials(list);
          };
          const preview = previewServiceSplit(
            { ...svc, materialConsumption: (svc.materials ?? []).length > 0 ? Math.round(svcMaterialsCost) : (svc.materialConsumption ?? 0) },
            samplePrice,
            samplePercent,
          );
          const total = Math.max(1, preview.materials + preview.master + preview.piggy + preview.owners);
          const distributed = Math.min(samplePrice, preview.materials + preview.master + preview.piggy + preview.owners);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50" onClick={() => setShowServiceSettings(false)}>
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto`}
              >
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Настройка услуги</h3>
                  <button onClick={() => setShowServiceSettings(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} /></button>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input className={`${inputCls} pl-9`} type="text" placeholder="Поиск услуг..." value={serviceEditSearchQuery} onChange={e => { setServiceEditSearchQuery(e.target.value); setShowServiceMaterialPicker(false); }} />
                  </div>
                  {(() => {
                    const q = serviceEditSearchQuery.trim().toLowerCase();
                    const matches = q
                      ? services.filter(s => [s.name, s.category, s.desc].some(v => v.toLowerCase().includes(q)))
                      : [];
                    if (!q) return null;
                    return (
                      <div className={`${isDark ? 'bg-[#0E1624] border border-white/10' : 'bg-white border border-black/5 shadow-sm'} mt-1 rounded-2xl max-h-48 overflow-y-auto`}>
                        {matches.length === 0 ? (
                          <div className={`px-4 py-3 text-sm ${sub}`}>Ничего не найдено</div>
                        ) : (
                          matches.map((m) => {
                            const active = m.id === editingServiceId;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => { setEditingServiceId(m.id); setServiceEditSearchQuery(''); }}
                                className={`w-full text-left px-4 py-3 text-sm transition-colors ${active ? 'font-medium' : 'hover:bg-black/5'}`}
                                style={{ color: active ? primary : undefined }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate">{m.name}</span>
                                  <span className={`text-xs ${sub} shrink-0`}>{m.category}</span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-4 mb-5">
                  {showServiceMaterialPicker ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Выбор материала со склада</div>
                      <div className="overflow-x-auto pb-1 flex gap-1.5 mb-2">
                        <button onClick={() => setServiceMaterialPickerCategory(null)}
                          className={`text-xs px-2.5 py-1 rounded-full ${!serviceMaterialPickerCategory ? 'text-white font-medium' : glass}`}
                          style={!serviceMaterialPickerCategory ? { background: primary } : {}}>Все</button>
                        {stockCategories.filter(c => !c.parentId).map(cat => (
                          <button key={cat.id} onClick={() => setServiceMaterialPickerCategory(cat.id)}
                            className={`text-xs px-2.5 py-1 rounded-full ${serviceMaterialPickerCategory === cat.id ? 'text-white font-medium' : glass}`}
                            style={serviceMaterialPickerCategory === cat.id ? { background: primary } : {}}>{cat.name}</button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {stockItems
                          .filter(item => {
                            if (!serviceMaterialPickerCategory) return true;
                            const catIds = [serviceMaterialPickerCategory, ...stockCategories.filter(c => c.parentId === serviceMaterialPickerCategory).map(c => c.id)];
                            return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === serviceMaterialPickerCategory)?.name;
                          })
                          .filter(item => item.qty > 0)
                          .map(item => (
                            <div key={item.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className={`text-xs ${sub}`}>В наличии: {item.qty} {item.unit} · {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}</div>
                              </div>
                              <button onClick={() => {
                                if (!(svc.materials ?? []).some(m => m.stockItemId === item.id)) {
                                  applyMaterials([...(svc.materials ?? []), { stockItemId: item.id, name: item.name, qty: 0, unit: item.unit }]);
                                }
                                setShowServiceMaterialPicker(false);
                              }}
                                className="px-3 py-1.5 rounded-lg text-xs shrink-0 text-white"
                                style={{ background: primary }}>Выбрать</button>
                            </div>
                          ))}
                        {stockItems.filter(item => {
                          if (!serviceMaterialPickerCategory) return true;
                          const catIds = [serviceMaterialPickerCategory, ...stockCategories.filter(c => c.parentId === serviceMaterialPickerCategory).map(c => c.id)];
                          return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === serviceMaterialPickerCategory)?.name;
                        }).filter(item => item.qty > 0).length === 0 && (
                          <div className={`text-sm ${sub} text-center py-6`}>Нет материалов в этой категории</div>
                        )}
                      </div>
                      <button onClick={() => setShowServiceMaterialPicker(false)} className={`mt-3 w-full py-2.5 rounded-xl text-sm ${glass}`}>Назад к настройкам</button>
                    </div>
                  ) : (
                  <>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Основное</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Название</label>
                        <input className={inputCls} value={svc.name} onChange={e => patch({ name: e.target.value })} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Тип услуги</label>
                        <select
                          className={selectCls}
                          value={svc.category}
                          onChange={e => patch({ category: e.target.value, resourceGroup: serviceResourceGroupForCategory(e.target.value) })}
                        >
                          {SERVICE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.price)} onChange={e => patch({ price: numberFromInput(e.target.value) })} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Длительность (мин)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.duration)} onChange={e => patch({ duration: numberFromInput(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                        <input className={inputCls} value={svc.desc} onChange={e => patch({ desc: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Распределение денег</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Материалы со склада (списываются при завершении записи)</label>
                        {(svc.materials ?? []).length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {svc.materials!.map((mat, mi) => {
                              const stockItem = stockItems.find(s => s.id === mat.stockItemId);
                              const rowCost = stockItem ? Number(mat.qty || 0) * stockItem.unitPrice : 0;
                              const insufficient = !!stockItem && mat.qty > stockItem.qty;
                              return (
                                <div key={`${mat.stockItemId}-${mi}`} className={`${glass} rounded-xl px-3 py-2 flex items-center gap-2`}>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{mat.name}</div>
                                    <div className={`text-xs ${sub}`}>
                                      {stockItem ? `В наличии: ${stockItem.qty} ${stockItem.unit} · ${stockItem.unitPrice.toLocaleString('ru')} ₽/${stockItem.unit}` : 'Позиция удалена со склада'}
                                    </div>
                                    {insufficient && <div className="text-xs text-red-500">На складе только {stockItem!.qty} {stockItem!.unit}</div>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8]' : 'bg-white border-black/10 text-[#0B1226]'} border rounded-lg px-1.5 py-1 w-14 text-right text-sm outline-none shrink-0`} type="number" min="0" step="0.1" value={numberInputValue(mat.qty)} onChange={e => patchMaterialQty(mi, e.target.value ? Number(e.target.value) : 0)} />
                                    <span className={`text-xs ${sub} shrink-0`}>{mat.unit}</span>
                                    <button onClick={() => removeMaterial(mi)} className="p-1 text-red-500 shrink-0"><X size={14} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button onClick={() => setShowServiceMaterialPicker(true)} className={`w-full py-2 rounded-xl text-sm ${glass} flex items-center justify-center gap-1.5`} style={{ color: primary }}>
                          <Plus size={14} /> Добавить материал
                        </button>
                        {svcMaterialsCost > 0 && (
                          <div className={`text-xs mt-1.5 flex justify-between ${sub}`}>
                            <span>Стоимость материалов (по ценам склада)</span>
                            <span className="font-medium text-slate-400">{Math.round(svcMaterialsCost).toLocaleString('ru')} ₽</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Оплата мастеру</label>
                        <select className={selectCls} value={svc.masterPayType || ''} onChange={e => patch({ masterPayType: e.target.value })}>
                          <option value="">% из профиля (как сейчас)</option>
                          <option value="percent">% от цены (общая, делится между мастерами)</option>
                          <option value="fixed">Фиксированная сумма (общая)</option>
                        </select>
                      </div>
                      {svc.masterPayType === 'fixed' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Сумма мастеру (₽)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.masterPayValue ?? 0)} onChange={e => patch({ masterPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      {svc.masterPayType === 'percent' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Процент мастеру (%)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.masterPayValue ?? 0)} onChange={e => patch({ masterPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>В копилку</label>
                        <select className={selectCls} value={svc.piggyPayType || ''} onChange={e => patch({ piggyPayType: e.target.value })}>
                          <option value="">Стандарт (24%)</option>
                          <option value="percent">% от цены</option>
                          <option value="fixed">Фиксированная сумма</option>
                          <option value="none">Нет</option>
                        </select>
                      </div>
                      {svc.piggyPayType && svc.piggyPayType !== 'none' && svc.piggyPayType !== '' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Значение ({svc.piggyPayType === 'fixed' ? '₽' : '%'})</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.piggyPayValue ?? 0)} onChange={e => patch({ piggyPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Куда падает депозит</label>
                        <select className={selectCls} value={svc.piggyTarget || ''} onChange={e => patch({ piggyTarget: e.target.value })}>
                          <option value="">Авто (по типу услуги)</option>
                          <option value="wash">Мойка</option>
                          <option value="detailing">Детейлинг</option>
                          <option value="general">Общая</option>
                        </select>
                      </div>
                      <div className={`${glass} rounded-2xl p-3 space-y-2`}>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span>Владельцы получают остаток</span>
                          <input
                            type="checkbox"
                            checked={svc.ownerSplitEnabled !== false}
                            onChange={e => patch({ ownerSplitEnabled: e.target.checked })}
                          />
                        </label>
                        {svc.ownerSplitEnabled !== false && (
                          <div>
                            <label className={`text-xs ${sub} block mb-1`}>Доля владельцев</label>
                            <select className={selectCls} value={svc.ownerPayType || ''} onChange={e => patch({ ownerPayType: e.target.value })}>
                              <option value="">Весь остаток (50/50)</option>
                              <option value="percent">Процент от остатка</option>
                            </select>
                          </div>
                        )}
                        {svc.ownerSplitEnabled !== false && svc.ownerPayType === 'percent' && (
                          <div>
                            <label className={`text-xs ${sub} block mb-1`}>Процент владельцам (%)</label>
                            <input className={inputCls} type="number" value={numberInputValue(svc.ownerPayValue ?? 0)} onChange={e => patch({ ownerPayValue: numberFromInput(e.target.value) })} />
                          </div>
                        )}
                      </div>
                      <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                        <span>Фикс оплата мастеру ({formatFixedMasterAmount()})</span>
                        <input
                          type="checkbox"
                          checked={Boolean(svc.isFixedMaster)}
                          onChange={(event) => patch({ isFixedMaster: event.target.checked })}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Порядок расчёта</div>
                    <div className={`${glass} rounded-2xl p-3 space-y-1`}>
                      {(() => {
                        const pipelineActive = effectiveOrder.join(',') !== ORDER_STEPS.map(o => o.id).join(',');
                        return pipelineActive ? (
                          <div className="text-[11px] font-medium px-2 py-1 rounded-lg mb-1 bg-emerald-500/10 text-emerald-600">
                            ✓ Конвейер: % считаются от текущего остатка по шагам
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium px-2 py-1 rounded-lg mb-1 bg-amber-500/10 text-amber-600">
                            Классический режим: % от полной базы (материалы → мастера → копилка → владельцы). Переставьте шаги — включится конвейер.
                          </div>
                        );
                      })()}
                      {effectiveOrder.map((stepId, si) => {
                        const step = ORDER_STEPS.find(s => s.id === stepId)!;
                        const move = (dir: -1 | 1) => {
                          const list = [...effectiveOrder];
                          const to = si + dir;
                          if (to < 0 || to >= list.length) return;
                          [list[si], list[to]] = [list[to], list[si]];
                          patch({ splitOrder: list });
                        };
                        return (
                          <div key={step.id} className="flex items-center gap-2">
                            <button onClick={() => move(-1)} disabled={si === 0} className={`p-1 rounded-lg disabled:opacity-30 ${glass}`}><ChevronUp size={14} /></button>
                            <button onClick={() => move(1)} disabled={si === effectiveOrder.length - 1} className={`p-1 rounded-lg disabled:opacity-30 ${glass}`}><ChevronDown size={14} /></button>
                            <span className="flex-1 text-sm">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className={`text-xs ${sub} mt-1.5`}>% и 24% считаются от текущего остатка в этом порядке. Владельцы забирают весь остаток, если стоят последними (иначе 50%).</p>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Предпросмотр при цене {samplePrice.toLocaleString('ru')} ₽</div>
                    <div className={`${glass} rounded-2xl p-3 space-y-2`}>
                      <div className="h-2.5 rounded-full overflow-hidden flex">
                        {preview.materials > 0 && <div style={{ width: `${(preview.materials / total) * 100}%`, background: '#64748B' }} />}
                        {preview.master > 0 && <div style={{ width: `${(preview.master / total) * 100}%`, background: accent }} />}
                        {preview.piggy > 0 && <div style={{ width: `${(preview.piggy / total) * 100}%`, background: '#EAB308' }} />}
                        {preview.owners > 0 && <div style={{ width: `${(preview.owners / total) * 100}%`, background: primary }} />}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className={sub}>Цена</span>
                          <span>{samplePrice.toLocaleString('ru')} ₽</span>
                        </div>
                        {preview.materials > 0 && (
                          <div className="flex justify-between">
                            <span className={sub}>Материалы</span>
                            <span className="text-slate-400">− {preview.materials.toLocaleString('ru')} ₽</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className={sub}>Мастера ({preview.masterLabel})</span>
                          <span style={{ color: accent }}>{preview.master.toLocaleString('ru')} ₽</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={sub}>Копилка ({preview.piggyLabel})</span>
                          <span style={{ color: '#EAB308' }}>{preview.piggy.toLocaleString('ru')} ₽</span>
                        </div>
                        {preview.owners > 0 ? (
                          <>
                            {(() => {
                              const ownerHalf = Math.round(preview.owners / 2);
                              const ownerFirst = preview.owners - ownerHalf;
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className={sub}>Максим</span>
                                    <span style={{ color: primary }}>{ownerFirst.toLocaleString('ru')} ₽</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={sub}>Юра</span>
                                    <span style={{ color: primary }}>{ownerHalf.toLocaleString('ru')} ₽</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={sub}>Владельцы ({preview.ownersLabel})</span>
                                    <span style={{ color: primary }}>{preview.owners.toLocaleString('ru')} ₽</span>
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className={sub}>Владельцы ({preview.ownersLabel})</span>
                            <span style={{ color: primary }}>{preview.owners.toLocaleString('ru')} ₽</span>
                          </div>
                        )}
                        <div className="border-t pt-1 flex justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                          <span className={sub}>Итого распределено</span>
                          <span className="font-medium">{distributed.toLocaleString('ru')} ₽</span>
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs ${sub} mt-2`}>
                      Порядок: сначала материалы, потом мастера, копилка, остаток — владельцам. Если мастеров несколько, сумма мастера делится пропорционально их % из профиля.
                    </p>
                  </div>
                  </>
                  )}
                </div>
                <button onClick={() => void handleServiceSettingsDone()} disabled={serviceSettingsSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-60" style={{ background: primary }}>
                  {serviceSettingsSaving ? 'Сохранение...' : 'Готово'}
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── MODAL: QUICK SERVICE EDIT ── */}
      <AnimatePresence>
        {serviceEditDraft && (() => {
          const svc = services.find(s => s.id === serviceEditDraft.id);
          if (!svc) return null;
          const patchDraft = (partial: Partial<typeof serviceEditDraft>) => setServiceEditDraft(d => d && { ...d, ...partial });
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50" onClick={() => setServiceEditDraft(null)}>
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto`}
              >
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Редактирование услуги</h3>
                  <button onClick={() => setServiceEditDraft(null)} className={`p-1.5 rounded-xl ${glass}`}><X size={16} /></button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Название</label>
                    <input className={inputCls} value={serviceEditDraft.name} onChange={e => patchDraft({ name: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Тип услуги</label>
                    <select className={selectCls} value={serviceEditDraft.category} onChange={e => patchDraft({ category: e.target.value })}>
                      {SERVICE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Цена (₽)</label>
                      <input className={inputCls} type="number" value={numberInputValue(serviceEditDraft.price)} onChange={e => patchDraft({ price: numberFromInput(e.target.value) })} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Длительность (мин)</label>
                      <input className={inputCls} type="number" value={numberInputValue(serviceEditDraft.duration)} onChange={e => patchDraft({ duration: numberFromInput(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Описание</label>
                    <input className={inputCls} value={serviceEditDraft.desc} onChange={e => patchDraft({ desc: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setServiceEditDraft(null)} className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}>Отмена</button>
                  <button onClick={() => void handleSaveServiceQuickEdit()} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white" style={{ background: primary }}>Сохранить</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── BOTTOM TOAST ── */}
      <AnimatePresence>
        {bottomToast && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={14} style={{ color: accent }} /></div>
            <div className="flex-1 text-sm">{bottomToast}</div>
            <button onClick={() => setBottomToast(null)}><X size={14} className={sub} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SETTINGS SAVED TOAST ── */}
      <AnimatePresence>
        {settingsSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${primary}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${primary}20` }}><Check size={14} style={{ color: primary }} /></div>
            <span className="text-sm font-medium">Настройки сохранены</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── RESET PASSWORD MODAL ── */}
      <AnimatePresence>
        {resetPasswordTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setResetPasswordTarget(null); setResetPasswordError(''); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5">
              <div className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-3xl p-6 w-full max-w-sm shadow-2xl`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                      <Shield size={18} style={{ color: accent }} />
                    </div>
                    <div>
                      <div className="font-semibold">Сброс пароля</div>
                      <div className={`text-xs ${sub}`}>{resetPasswordTarget.name}</div>
                    </div>
                  </div>
                  <button onClick={() => { setResetPasswordTarget(null); setResetPasswordError(''); }}
                    className={`p-1.5 rounded-xl ${glass}`}><X size={16} /></button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>Новый пароль</label>
                    <input
                      className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                      type="text"
                      placeholder="Минимум 8 символов"
                      value={resetPasswordValue}
                      onChange={e => { setResetPasswordValue(e.target.value); setResetPasswordError(''); }}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>Подтверждение</label>
                    <input
                      className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                      type="text"
                      placeholder="Повторите пароль"
                      value={resetPasswordConfirm}
                      onChange={e => { setResetPasswordConfirm(e.target.value); setResetPasswordError(''); }}
                    />
                  </div>
                </div>

                {resetPasswordError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-xs mb-3">
                    <AlertCircle size={13} />{resetPasswordError}
                  </motion.div>
                )}

                <button
                  onClick={() => void handleResetPassword()}
                  disabled={!resetPasswordValue || !resetPasswordConfirm || employeeActionLoading?.type === 'reset-password'}
                  className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: accent }}
                >
                  {employeeActionLoading?.type === 'reset-password' ? 'Сохранение...' : 'Сбросить пароль'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}



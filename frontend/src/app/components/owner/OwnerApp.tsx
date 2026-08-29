import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import {
  Bell, Sun, Moon, Plus, Minus, X, Check, TrendingUp, Users, Box,
  Settings, BarChart3, ChevronRight, Download, DollarSign, Package,
  AlertCircle, Home, FileText, ArrowLeft, Building2, Sliders, Shield,
  Globe, Save, Eye, EyeOff, CalendarDays, Calendar, RefreshCw, Phone, Wallet, Edit3, Trash2, ChevronLeft, PiggyBank, Clock, Search, History, ChevronUp, ChevronDown, Archive, ExternalLink,
  LayoutDashboard, UsersRound, Settings2, FileChartColumn,
  ArrowLeftRight, TrendingDown, Crown, Banknote, Split
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
import { OwnerStockPage } from './screens/OwnerStockPage';
import { OwnerClientsScreen } from './screens/OwnerClientsScreen';
import { OwnerWalletScreen } from './screens/OwnerWalletScreen';
import { OwnerPiggyBankScreen } from './screens/OwnerPiggyBankScreen';
import { Toaster } from '../atmosfera';
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

// Helper for unlimited category nesting вЂ” returns categoryId + all descendant ids
function stockCategoryIdsWithDescendants(rootId: string, categories: { id: string; parentId?: string }[]): string[] {
  const map = new Map<string, string[]>();
  categories.forEach((c) => { if (!c.parentId) return; if (!map.has(c.parentId)) map.set(c.parentId, []); map.get(c.parentId)!.push(c.id); });
  const result: string[] = [rootId];
  const queue = [rootId];
  const visited = new Set<string>();
  while (queue.length) { const cur = queue.shift()!; if (visited.has(cur)) continue; visited.add(cur); const children = map.get(cur) || []; children.forEach((childId) => { result.push(childId); queue.push(childId); }); }
  return result;
}

type OwnerPage = 'dashboard' | 'calendar' | 'payroll' | 'salary-detail' | 'stock' | 'reports' | 'settings' | 'piggy-bank' | 'clients';
type SettingsSection = null | 'company' | 'schedule' | 'boxes' | 'services' | 'employees' | 'clients' | 'notifications' | 'integrations' | 'security' | 'finance' | 'content' | 'wallet' | 'reports' | 'bookings-history' | 'archive' | 'money-flow' | 'deposit' | 'shift';
type OwnerExportKind = 'report' | 'pdf' | 'piggy-bank';
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
  clientName?: string | null; clientPhone?: string | null;
  paymentType?: string | null; paymentSettled?: boolean | null;
  notes?: string | null;
  additionalServices?: Array<{ name: string; price: number; priceMode?: string; duration?: number; isOutsource?: boolean; outsourceAmount?: number | null }>;
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

// в”Ђв”Ђ Р”РІРёР¶РµРЅРёРµ РґРµРЅРµРі (money flow) в”Ђв”Ђ
interface MoneyFlowDistWorker { workerId: string; workerName: string; earned: number; }
interface MoneyFlowDistOwner { ownerId?: string | null; ownerName: string; amount: number; status: string; }
interface MoneyFlowDistribution {
  materialsCost: number; masterTotal: number; piggyDeposit: number;
  ownersTotal: number; outsourceTotal: number;
  workers: MoneyFlowDistWorker[]; owners: MoneyFlowDistOwner[];
}
interface MoneyFlowEntry {
  id: string;
  kind: 'in' | 'allocation' | 'out' | 'move';
  type: string;
  date: string; time: string;
  title: string; amount: number;
  counterparty: string;
  method: string; methodLabel: string;
  note: string;
  bookingId?: string | null;
  personId?: string | null;
  distribution?: MoneyFlowDistribution | null;
}
interface MoneyFlowSummary {
  totalIn: number; bookingRevenue: number; otherIncome: number; depositTopups: number;
  totalOut: number; workerPayouts: number; ownerPayouts: number; advances: number; expensesTotal: number;
  allocatedWorkers: number; allocatedPiggy: number; allocatedOwners: number;
  allocatedMaterials: number; allocatedOutsource: number;
  bookingCount: number; entryCount: number; cashBalance: number;
}
interface MoneyFlowPerson {
  personId: string; personName: string; role: 'worker' | 'owner';
  accrued: number; paid: number; balance: number;
}
interface MoneyFlowResponse {
  dateFrom: string; dateTo: string;
  summary: MoneyFlowSummary;
  people: MoneyFlowPerson[];
  entries: MoneyFlowEntry[];
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
interface PiggyBankTxGlobal {
  id: string; bookingId: string | null; amount: number; transactionType: string;
  purpose: string; materialName: string | null; materialCost: number | null;
  date: string; resourceGroup: string; createdAt: string; bookingInfo: string | null;
  spentById?: string | null; spentByName?: string | null;
}
interface PiggySpenderDebt { spentById: string | null; spentByName: string; totalSpent: number; count: number; }
interface PiggyBankData {
  balance: number;
  transactions: PiggyBankTxGlobal[];
  wash?: PiggyBankWashBreakdown;
  detailing?: PiggyBankDetailingBreakdown;
  masterDailyOutputs: number;
  washExpenses: number;
  washIncomes: number;
  detailingExpenses: number;
  detailingIncomes: number;
  remainingInPiggyBank: number;
  combinedBalance: number;
  spenderDebts?: PiggySpenderDebt[];
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

const EXPENSE_CATEGORIES = ['РђРІС‚РѕРјРѕР№РєР°', 'Р”РµС‚РµР№Р»РёРЅРі', 'Р Р°СЃС…РѕРґРЅС‹Рµ РјР°С‚РµСЂРёР°Р»С‹', 'РђСЂРµРЅРґР°', 'РљРѕРјРјСѓРЅР°Р»СЊРЅС‹Рµ', 'Р—Р°СЂРїР»Р°С‚С‹', 'РћР±РѕСЂСѓРґРѕРІР°РЅРёРµ', 'РџСЂРѕС‡РµРµ'];
const STOCK_UNITS = ['Р»', 'РєРі', 'С€С‚', 'С„Р»', 'Рј', 'Рї.Рј', 'СѓРї'];
const SERVICE_TYPE_OPTIONS = [
  { value: 'РњРѕР№РєР°', label: 'РњРѕР№РєР°', resourceGroup: 'wash' },
  { value: 'Р”РµС‚РµР№Р»РёРЅРі', label: 'Р”РµС‚РµР№Р»РёРЅРі', resourceGroup: 'detailing' },
  { value: 'РђСЂРµРЅРґР° Р±РѕРєСЃР°', label: 'РђСЂРµРЅРґР° Р±РѕРєСЃР°', resourceGroup: 'wash' },
] as const;
const OWNER_BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'confirmed', label: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅР°' },
  { value: 'scheduled', label: 'Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅР°' },
  { value: 'completed', label: 'РџСЂРѕС€Р»Р°СЏ Р·Р°РІРµСЂС€С‘РЅРЅР°СЏ' },
  { value: 'admin_review', label: 'РќР° СѓС‚РѕС‡РЅРµРЅРёРё' },
];
function ownerBookingStatusRequiresScheduledSlot(status: BookingStatus) {
  return ['new', 'confirmed', 'scheduled', 'in_progress'].includes(status);
}
function employeeRoleLabel(role: 'admin' | 'worker' | 'accountant') {
  if (role === 'admin') return 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ';
  if (role === 'accountant') return 'Р‘СѓС…РіР°Р»С‚РµСЂ';
  return 'РњР°СЃС‚РµСЂ';
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
  return 'РџРѕРјРµС‰РµРЅРёРµ';
}

function parseOwnerBookingMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const OWNER_CALENDAR_WEEKDAYS = ['РЎР±', 'Р’СЃ', 'РџРЅ', 'Р’С‚', 'РЎСЂ', 'Р§С‚', 'РџС‚'];
const OWNER_CALENDAR_MONTHS = [
  'РЇРЅРІР°СЂСЊ', 'Р¤РµРІСЂР°Р»СЊ', 'РњР°СЂС‚', 'РђРїСЂРµР»СЊ', 'РњР°Р№', 'РСЋРЅСЊ',
  'РСЋР»СЊ', 'РђРІРіСѓСЃС‚', 'РЎРµРЅС‚СЏР±СЂСЊ', 'РћРєС‚СЏР±СЂСЊ', 'РќРѕСЏР±СЂСЊ', 'Р”РµРєР°Р±СЂСЊ',
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
  { id: 'materials', label: 'РњР°С‚РµСЂРёР°Р»С‹' },
  { id: 'master', label: 'РњР°СЃС‚РµСЂР°' },
  { id: 'piggy', label: 'РљРѕРїРёР»РєР°' },
  { id: 'owners', label: 'Р’Р»Р°РґРµР»СЊС†С‹' },
];

function serviceMoneySummary(service: MoneyServiceDraft) {
  const piggyTargetLabel = service.piggyTarget === 'wash' ? ' в†’ РјРѕР№РєР°'
    : service.piggyTarget === 'detailing' ? ' в†’ РґРµС‚РµР№Р»РёРЅРі'
      : service.piggyTarget === 'general' ? ' в†’ РѕР±С‰Р°СЏ'
        : '';
  const master = service.masterPayType === 'fixed'
    ? `РјР°СЃС‚РµСЂ: С„РёРєСЃ ${service.masterPayValue ?? 0} в‚Ѕ`
    : service.masterPayType === 'percent'
      ? `РјР°СЃС‚РµСЂ: ${service.masterPayValue ?? 0}%`
      : 'РјР°СЃС‚РµСЂ: % РёР· РїСЂРѕС„РёР»СЏ';
  const piggy = service.piggyPayType === 'fixed'
    ? `РєРѕРїРёР»РєР°: ${service.piggyPayValue ?? 0} в‚Ѕ${piggyTargetLabel}`
    : service.piggyPayType === 'percent'
      ? `РєРѕРїРёР»РєР°: ${service.piggyPayValue ?? 0}%${piggyTargetLabel}`
      : service.piggyPayType === 'rest'
        ? `РєРѕРїРёР»РєР°: РІРµСЃСЊ РѕСЃС‚Р°С‚РѕРє${piggyTargetLabel}`
        : service.piggyPayType === 'none'
          ? 'РєРѕРїРёР»РєР°: РЅРµС‚'
          : `РєРѕРїРёР»РєР°: 24%${piggyTargetLabel}`;
  const owners = service.ownerSplitEnabled === false
    ? 'РІР»Р°РґРµР»СЊС†С‹: РЅРµС‚'
    : service.ownerPayType === 'percent'
      ? `РІР»Р°РґРµР»СЊС†С‹: ${service.ownerPayValue ?? 0}% РѕСЃС‚Р°С‚РєР°`
      : 'РІР»Р°РґРµР»СЊС†С‹: РѕСЃС‚Р°С‚РѕРє';
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
      return { total: service.masterPayValue ?? 0, label: 'С„РёРєСЃ' };
    }
    if (service.masterPayType === 'percent') {
      return { total: Math.round(base * (service.masterPayValue ?? 0) / 100), label: `${service.masterPayValue ?? 0}%` };
    }
    return { total: Math.round(base * samplePercent / 100), label: `${samplePercent}% (РёР· РїСЂРѕС„РёР»СЏ)` };
  };
  const computePiggy = (base: number) => {
    if (piggyType === 'fixed') return { total: service.piggyPayValue ?? 0, label: 'С„РёРєСЃ' };
    if (piggyType === 'percent') return { total: Math.round(base * (service.piggyPayValue ?? 0) / 100), label: `${service.piggyPayValue ?? 0}%` };
    if (piggyType === 'rest') return { total: base, label: 'РІРµСЃСЊ РѕСЃС‚Р°С‚РѕРє' };
    if (piggyType === 'none') return { total: 0, label: 'РЅРµС‚' };
    return { total: Math.round(base * 24 / 100), label: '24%' };
  };
  if (!pipeline) {
    const m = computeMaster(net);
    master = m.total; masterLabel = m.label;
    const p = piggyType === 'rest'
      ? { total: Math.max(0, net - master), label: 'РІРµСЃСЊ РѕСЃС‚Р°С‚РѕРє' }
      : computePiggy(net);
    piggy = p.total; piggyLabel = p.label;
    const afterMasterPiggy = Math.max(0, net - master - piggy);
    if (service.ownerSplitEnabled !== false && afterMasterPiggy > 0) {
      if (service.ownerPayType === 'percent') {
        owners = Math.round(afterMasterPiggy * (service.ownerPayValue ?? 0) / 100);
        ownersLabel = `${service.ownerPayValue ?? 0}% РѕСЃС‚Р°С‚РєР°`;
      } else {
        owners = afterMasterPiggy;
        ownersLabel = 'РѕСЃС‚Р°С‚РѕРє';
      }
    } else {
      owners = 0;
      ownersLabel = service.ownerSplitEnabled === false ? 'РІС‹РєР»СЋС‡РµРЅРѕ' : '0';
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
            ? `${service.ownerPayValue ?? 0}% РѕСЃС‚Р°С‚РєР°`
            : isLast ? 'РѕСЃС‚Р°С‚РѕРє' : '50% РѕСЃС‚Р°С‚РєР°';
        } else {
          owners = 0;
          ownersLabel = service.ownerSplitEnabled === false ? 'РІС‹РєР»СЋС‡РµРЅРѕ' : '0';
        }
        pool = Math.max(0, pool - owners);
      }
    });
  }
  return { materials, net, master, masterLabel, piggy, piggyLabel, owners, ownersLabel };
}

function ownerPaymentLabel(paymentType: 'cash' | 'transfer' | 'invoice', paymentSettled: boolean) {
  if (!paymentSettled) return 'РќРµ РѕРїР»Р°С‡РµРЅРѕ';
  if (paymentType === 'transfer') return 'РџРµСЂРµРІРѕРґ';
  if (paymentType === 'invoice') return 'РџРѕ СЃС‡С‘С‚Сѓ';
  return 'РќР°Р»РёС‡РЅС‹Рµ';
}

function normalizeOwnerPhoneSearchValue(value: string) {
  return value.replace(/\D/g, '');
}

type OwnerClientSearchMode = 'phone' | 'name' | 'plate';

/** РџРѕРґРєР»СЋС‡С‘РЅРЅС‹Р№ Google-РєР°Р»РµРЅРґР°СЂСЊ С‡РµР»РѕРІРµРєР° (РјСѓР»СЊС‚РёРїРѕРґРєР»СЋС‡РµРЅРёРµ). */
interface GoogleConnectionInfo { id: string; name: string; email: string; createdAt: string }


function numberFromInput(value: string) {
  return value === '' ? 0 : Number(value);
}

// Р”РµСЃСЏС‚РёС‡РЅС‹Р№ РІРІРѕРґ РІ СЂСѓСЃСЃРєРѕР№ Р»РѕРєР°Р»Рё: Р·Р°РїСЏС‚Р°СЏ РєР°Рє СЂР°Р·РґРµР»РёС‚РµР»СЊ (В«1234,56В»)
function parseDecimalInput(value: string) {
  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidAmountInput(value: string) {
  const n = parseDecimalInput(value);
  return Number.isFinite(n) && n > 0;
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
  const financeRoleTitle = isAccountant ? 'Р‘СѓС…РіР°Р»С‚РµСЂ' : 'Р’Р»Р°РґРµР»РµС†';
  const financeNotificationRole = isAccountant ? 'accountant' : 'owner';

  const [page, setPage] = useState<OwnerPage>('dashboard');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [showStatusList, setShowStatusList] = useState<BookingStatus | null>(null);
  const [kpiModal, setKpiModal] = useState<KpiModalData | null>(null);
  const [expenseAdded, setExpenseAdded] = useState(false);
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
    spentById?: string | null; spentByName?: string | null;
  }
  const [piggyBankBalance, setPiggyBankBalance] = useState(0);
  const [piggyBankTxs, setPiggyBankTxs] = useState<PiggyBankTx[]>([]);
  const [piggyBankLoading, setPiggyBankLoading] = useState(false);
  const [piggyBank, setPiggyBank] = useState<PiggyBankData | null>(null);
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

  const [piggyWithdrawKind, setPiggyWithdrawKind] = useState<'materials' | 'other'>('materials');
  const [piggyWithdrawForm, setPiggyWithdrawForm] = useState<{ target: 'detailing' | 'wash'; name: string; amount: string; purpose: string; date: string; spentById: string; spentByName: string }>({ target: 'detailing', name: '', amount: '', purpose: '', date: todayLabel, spentById: '', spentByName: '' });

  // Wallet state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: EXPENSE_CATEGORIES[0], resourceGroup: '' as '' | 'wash' | 'detailing', note: '', date: todayLabel });
  const [incomeForm, setIncomeForm] = useState({ amount: '', source: '', note: '', date: todayLabel, resourceGroup: '' as '' | 'wash' | 'detailing' });
  const parentCategories = stockCategories.filter(c => !c.parentId);
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
    box: liveBoxes[0]?.name || 'Р‘РѕРєСЃ 1',
    status: 'admin_review' as BookingStatus,
    paymentType: 'cash' as 'cash' | 'transfer' | 'invoice',
    paymentSettled: false,
    price: 0,
    duration: 30,
    referralSource: '',
    isRepeatVisit: false,
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
  const [salaryBookingDetail, setSalaryBookingDetail] = useState<SalaryBookingItem | null>(null);
  const [salaryPayAmount, setSalaryPayAmount] = useState('');
  const [salaryPayNote, setSalaryPayNote] = useState('');
  // РљР»СЋС‡ РёРґРµРјРїРѕС‚РµРЅС‚РЅРѕСЃС‚Рё: РіРµРЅРµСЂРёСЂСѓРµС‚СЃСЏ РѕРґРёРЅ СЂР°Р· РЅР° С„РѕСЂРјСѓ РІС‹РїР»Р°С‚С‹, РјРµРЅСЏРµС‚СЃСЏ
  // РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕР№ РІС‹РїР»Р°С‚С‹. РџРѕРІС‚РѕСЂРЅС‹Р№ РєР»РёРє/СЂРµС‚СЂР°Р№ РѕС‚РїСЂР°РІРёС‚ С‚РѕС‚ Р¶Рµ РєР»СЋС‡ вЂ”
  // Р±СЌРєРµРЅРґ РІРµСЂРЅС‘С‚ СЂРµР·СѓР»СЊС‚Р°С‚ РїРµСЂРІРѕР№ РІС‹РїР»Р°С‚С‹ РІРјРµСЃС‚Рѕ СЃРѕР·РґР°РЅРёСЏ РґСѓР±Р»РёРєР°С‚Р°.
  const newPayRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [salaryPayRequestId, setSalaryPayRequestId] = useState(newPayRequestId);
  // РРґРµРјРїРѕС‚РµРЅС‚РЅРѕСЃС‚СЊ РѕСЃС‚Р°Р»СЊРЅС‹С… Р·Р°СЂРїР»Р°С‚РЅС‹С… РѕРїРµСЂР°С†РёР№ (РїСЂРµРјРёРё/С€С‚СЂР°С„С‹/СЃРїРёСЃР°РЅРёСЏ,
  // РїРѕРіР°С€РµРЅРёРµ РґРѕР»РіР° РєРѕРїРёР»РєРё): РєР»СЋС‡ Р¶РёРІС‘С‚ РґРѕ СѓСЃРїРµС€РЅРѕРіРѕ РїСЂРѕРІРµРґРµРЅРёСЏ РѕРїРµСЂР°С†РёРё.
  const entryRequestIdRef = useRef(newPayRequestId());
  // РРґРµРјРїРѕС‚РµРЅС‚РЅРѕСЃС‚СЊ РІС‹РїР»Р°С‚С‹ РІР»Р°РґРµР»СЊС†Сѓ: РєР»СЋС‡ РјРµРЅСЏРµС‚СЃСЏ РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕР№ РІС‹РїР»Р°С‚С‹.
  const [ownerPayRequestId, setOwnerPayRequestId] = useState(newPayRequestId);
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
  const [expandedOwnerShares, setExpandedOwnerShares] = useState<Record<string, boolean>>({});
  const [repayAmounts, setRepayAmounts] = useState<Record<string, string>>({});
  const [repayDetailAmount, setRepayDetailAmount] = useState('');

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

  // Money flow state (РґРІРёР¶РµРЅРёРµ РґРµРЅРµРі)
  const [moneyFlowData, setMoneyFlowData] = useState<MoneyFlowResponse | null>(null);
  const [moneyFlowLoading, setMoneyFlowLoading] = useState(false);
  const [moneyFlowPeriod, setMoneyFlowPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [moneyFlowDateFrom, setMoneyFlowDateFrom] = useState('');
  const [moneyFlowDateTo, setMoneyFlowDateTo] = useState('');
  const [moneyFlowFilter, setMoneyFlowFilter] = useState<'all' | 'in' | 'allocation' | 'out'>('all');
  const [expandedFlowIds, setExpandedFlowIds] = useState<Set<string>>(new Set());

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
  // РњСѓР»СЊС‚РёРїРѕРґРєР»СЋС‡РµРЅРёРµ: РєР°Р»РµРЅРґР°СЂРё РЅРµСЃРєРѕР»СЊРєРёС… Р»СЋРґРµР№.
  const [googleConnections, setGoogleConnections] = useState<GoogleConnectionInfo[]>([]);
  const [googleInviteOpen, setGoogleInviteOpen] = useState(false);
  const [googleInviteName, setGoogleInviteName] = useState('');
  const [googleInviteLink, setGoogleInviteLink] = useState('');
  const [googleInviteLoading, setGoogleInviteLoading] = useState(false);
  const [googleCopiedLink, setGoogleCopiedLink] = useState(false);
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
      isRepeatVisit: false,
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
  const [ownerBookingEditMode, setOwnerBookingEditMode] = useState<null | 'status' | 'price' | 'workers' | 'datetime' | 'full' | 'materials'>(null);
  const [ownerBookingEditStatus, setOwnerBookingEditStatus] = useState<BookingStatus>('confirmed');
  const [ownerBookingEditPrice, setOwnerBookingEditPrice] = useState('');
  const [ownerBookingEditDate, setOwnerBookingEditDate] = useState('');
  const [ownerBookingEditTime, setOwnerBookingEditTime] = useState('');
  const [ownerBookingEditWorkers, setOwnerBookingEditWorkers] = useState<{ id: string; percent: number | ''; payType?: 'percent' | 'fixed'; fixedAmount?: number }[]>([]);
  const [ownerBookingEditMaterials, setOwnerBookingEditMaterials] = useState<{ stockItemId?: string; name: string; qty: number | string; unit: string; unitPrice: number }[]>([]);
  const [showOwnerEditMaterialPicker, setShowOwnerEditMaterialPicker] = useState(false);
  const [ownerEditMaterialPickerCategory, setOwnerEditMaterialPickerCategory] = useState<string | null>(null);
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
    referralSource: '',
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

  // Edit expense state (tasks 5.1вЂ“5.3)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ title: '', amount: '', category: '', date: '', note: '', resourceGroup: '' as '' | 'wash' | 'detailing' });

  // Edit income state (tasks 6.1вЂ“6.3)
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
      .catch(e => { console.error('salary-detail error:', e); setSalaryError(e?.message || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С…'); setSalaryDetail(null); })
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
        body: {
          ownerId,
          amount,
          note: ownerPayNote.trim() || 'Р’С‹РїР»Р°С‚Р° РґРѕС…РѕРґР° РІР»Р°РґРµР»СЊС†Сѓ',
          clientRequestId: ownerPayRequestId,
        },
      });
      setOwnerPayRequestId(newPayRequestId());
      setOwnerPayAmount('');
      setOwnerPayNote('');
      setOwnerPayTarget(null);
      setBottomToast(`Р’С‹РїР»Р°С‚Р° ${amount.toLocaleString('ru')} в‚Ѕ РІР»Р°РґРµР»СЊС†Сѓ РїСЂРѕРІРµРґРµРЅР°`);
      setTimeout(() => setBottomToast(null), 3000);
      const updated = await apiRequest<OwnerSalaryData>(`/api/owner/owners/salary-detail?period=${ownerSalaryPeriod}`);
      setOwnerSalaryData(updated);
    } catch (e) {
      setBottomToast(e instanceof Error ? e.message : 'РћС€РёР±РєР° РІС‹РїР»Р°С‚С‹');
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
    if (!f.name || !f.amount) return;
    const amount = parseDecimalInput(f.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      const body: Record<string, unknown> = {
        resourceGroup: f.target,
        withdrawKind: piggyWithdrawKind,
        materialName: f.name,
        materialCost: amount,
        purpose: f.purpose,
        date: f.date,
      };
      // РљС‚Рѕ РїРѕРєСѓРїР°Р» вЂ” РґРѕР»Рі РІ Р·Р°СЂРїР»Р°С‚Рµ РёРјРµРЅРЅРѕ Сѓ РЅРµРіРѕ
      if (f.spentById && f.spentById !== '__custom') {
        body.spentById = f.spentById;
      } else if (f.spentByName.trim()) {
        body.spentByName = f.spentByName.trim();
      }
      await apiRequest('/api/owner/piggy-bank/withdraw', {
        method: 'POST',
        body,
      });
      setShowPiggyWithdraw(false);
      setPiggyWithdrawForm({ target: f.target, name: '', amount: '', purpose: '', date: todayLabel, spentById: '', spentByName: '' });
      const buyerLabel = f.spentById && f.spentById !== '__custom'
        ? (workers.find(w => w.id === f.spentById)?.name || f.spentByName || '')
        : (f.spentByName.trim() || '');
      const debtHint = buyerLabel ? ` В· РґРѕР»Рі Сѓ ${buyerLabel} РІ Р·Р°СЂРїР»Р°С‚Рµ` : ' В· РґРѕР»Рі РІ Р·Р°СЂРїР»Р°С‚Рµ';
      setBottomToast(`РЎРЅСЏС‚Рѕ ${amount.toLocaleString('ru')} в‚Ѕ РёР· РєРѕРїРёР»РєРё В«${f.target === 'wash' ? 'РњРѕР№РєР°' : 'Р”РµС‚РµР№Р»РёРЅРі'}В»${debtHint}`);
      setTimeout(() => setBottomToast(null), 3000);
      await loadPiggyBank();
      await loadWallet(walletDateFrom || undefined, walletDateTo || undefined);
    } catch (e: unknown) {
      setBottomToast(e instanceof Error ? e.message : 'РћС€РёР±РєР°');
      setTimeout(() => setBottomToast(null), 4000);
    }
  }

  const openPiggyWithdraw = (kind: 'materials' | 'other') => {
    setPiggyWithdrawKind(kind);
    setShowPiggyWithdraw(true);
  };

  const handlePiggyBankExport = () => {
    const params: OwnerExportParams = {};
    if (piggyDateFrom) params.date_from = piggyDateFrom;
    if (piggyDateTo) params.date_to = piggyDateTo;
    void handleExport('piggy-bank', params);
  };

  const openPiggyAdjust = (resourceGroup: 'wash' | 'detailing') => {
    const current = resourceGroup === 'wash'
      ? (piggyBank?.remainingInPiggyBank ?? 0)
      : (piggyBank?.detailing?.netPiggy ?? 0);
    // РљРѕРїРµР№РєРё РІР°Р¶РЅС‹: Р±Р°Р»Р°РЅСЃ РјРѕР¶РµС‚ Р±С‹С‚СЊ РґСЂРѕР±РЅС‹Рј, РѕРєСЂСѓРіР»СЏРµРј С‚РѕР»СЊРєРѕ РґРѕ 2 Р·РЅР°РєРѕРІ
    const currentPrecise = Math.round(current * 100) / 100;
    setPiggyAdjustResourceGroup(resourceGroup);
    setPiggyAdjustCurrentBalance(currentPrecise);
    setPiggyAdjustForm({ newBalance: String(currentPrecise), purpose: '', date: todayLabel });
    setShowPiggyAdjust(true);
  };

  async function handlePiggyAdjust() {
    const newBalance = parseDecimalInput(piggyAdjustForm.newBalance);
    if (!Number.isFinite(newBalance)) return;
    const delta = Math.round((newBalance - piggyAdjustCurrentBalance) * 100) / 100;
    if (delta === 0) {
      setShowPiggyAdjust(false);
      setBottomToast('РЎСѓРјРјР° РЅРµ РёР·РјРµРЅРёР»Р°СЃСЊ');
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
      setBottomToast('РЎСѓРјРјР° РєРѕРїРёР»РєРё РѕР±РЅРѕРІР»РµРЅР°');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (e: unknown) {
      setBottomToast(e instanceof Error ? e.message : 'РћС€РёР±РєР°');
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
      setShiftOpenError('РћС‚РјРµС‚СЊС‚Рµ РјР°СЃС‚РµСЂРѕРІ, РєРѕС‚РѕСЂС‹Рµ РІС‹С€Р»Рё РІ СЃРјРµРЅСѓ');
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
      setShiftOpenError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ СЃРјРµРЅСѓ');
    } finally {
      setShiftOpenSubmitting(false);
    }
  };

  const ownerNotifications = notifications.filter((notification) => notification.recipientRole === financeNotificationRole);
  const unreadCount = ownerNotifications.filter(n => !n.read).length;
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const todayBookings = bookings.filter(b => b.date === todayLabel).sort((a, b) => a.time.localeCompare(b.time));
  // РђРєС‚РёРІРЅС‹Рµ РјР°СЃС‚РµСЂР° РґР»СЏ Р±Р»РѕРєР° В«РњР°СЃС‚РµСЂР° СЃРµРіРѕРґРЅСЏВ» (РќР°СЃС‚СЂРѕР№РєРё в†’ РЎРјРµРЅР°)
  const activeMasters = workers
    .filter((worker) => worker.role === 'worker' && worker.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  // Р’С‹С…РѕРґ РјР°СЃС‚РµСЂР° СЃРµРіРѕРґРЅСЏ: РѕС‚РјРµС‡РµРЅ (checked) РІ РѕСЃРјРѕС‚СЂРµ/РѕС‚РєСЂС‹С‚РёРё СЃРјРµРЅС‹ Р·Р° СЃРµРіРѕРґРЅСЏС€РЅСЋСЋ РґР°С‚Сѓ.
  // РўР° Р¶Рµ Р»РѕРіРёРєР°, С‡С‚Рѕ Сѓ Р±СЌРєРµРЅРґ-РїРѕРґСЃС‡С‘С‚Р° РІС‹С…РѕРґРѕРІ (_compute_shift_attendance).
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

  const bookingFormBoxes = ownerBookingBoxes(bookingForm.service, services, boxes);
  const bookingFormLocationLabel = ownerLocationLabel(bookingForm.service, services);
  const editBookingLocationLabel = selectedBooking ? ownerLocationLabel(selectedBooking.serviceId, services) : 'РџРѕРјРµС‰РµРЅРёРµ';
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
  const activeBookings = bookings.filter((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const pipelineCounts = {
    adminReview: bookings.filter((booking) => booking.status === 'admin_review').length,
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
    if (cat === 'wash') return 'РђРІС‚РѕРјРѕР№РєР°';
    if (cat === 'detailing') return 'Р”РµС‚РµР№Р»РёРЅРі';
    return 'РћР±С‰РµРµ';
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
    { label: 'РЎРѕС…СЂР°РЅСЏС‚СЃСЏ РІР»Р°РґРµР»СЊС†С‹', value: resetPreview.ownersPreserved },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ СЃРѕС‚СЂСѓРґРЅРёРєРё', value: resetPreview.employeesDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ РєР»РёРµРЅС‚С‹', value: resetPreview.clientsDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ Р·Р°РїРёСЃРё', value: resetPreview.bookingsDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ СѓРІРµРґРѕРјР»РµРЅРёСЏ', value: resetPreview.notificationsDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ РїРѕР·РёС†РёРё СЃРєР»Р°РґР°', value: resetPreview.stockItemsDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ СЂР°СЃС…РѕРґС‹', value: resetPreview.expensesDeleted },
    { label: 'РЈРґР°Р»СЏС‚СЃСЏ Р¶Р°Р»РѕР±С‹', value: resetPreview.penaltiesDeleted },
    { label: 'РЎР±СЂРѕСЃСЏС‚СЃСЏ СѓСЃР»СѓРіРё', value: resetPreview.servicesReset },
    { label: 'РЎР±СЂРѕСЃСЏС‚СЃСЏ Р±РѕРєСЃС‹', value: resetPreview.boxesReset },
    { label: 'РЎР±СЂРѕСЃРёС‚СЃСЏ РіСЂР°С„РёРє', value: resetPreview.scheduleReset },
    { label: 'РџРµСЂРµСЃРѕР·РґР°РґСѓС‚СЃСЏ РЅР°СЃС‚СЂРѕР№РєРё', value: resetPreview.settingsReset },
  ] : [];
  const resetExecuteLocked = resetStage !== 'armed' || !resetRequestId || resetCountdown > 0 || resetLoadingStep === 'execute';

  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm';
  const bg = isDark ? 'bg-[#131316]' : 'bg-[#F7F7F8]';
  const text = isDark ? 'text-[#E4E4E7]' : 'text-[#131316]';
  const sub = isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]';
  const primary = isDark ? '#6E76F2' : '#4F46E5';
  const accent = isDark ? '#34D399' : '#10B981';
  const surface = isDark ? '#1C1C1F' : '#ffffff';
  const inputCls = `${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] placeholder-zinc-500 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] placeholder-zinc-400 focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const selectCls = `${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`;
  const tooltipStyle = { background: surface, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 12, color: text };
  const createDraftId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddBoxDraft = () => {
    setBoxes((current) => [
      ...current,
      {
        id: createDraftId('box'),
        name: `Р‘РѕРєСЃ ${current.length + 1}`,
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

  const handleAddServiceDraft = (initialName?: string) => {
    const draftName = initialName?.trim() || 'Новая услуга';
    const newId = createDraftId('service');
    setServicesState((current) => [
      {
        id: newId,
        name: draftName,
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
    return newId;
  };

  /** CTA для ServiceSearchSelect: создаёт черновик услуги с именем из поиска и перенаправляет на форму услуг */
  const handleCreateServiceFromQuery = (queryName: string) => {
    const name = queryName.trim().slice(0, 80) || 'Новая услуга';
    // закрыть модалки создания записей, чтобы пользователь увидел форму услуг
    setShowCreateBooking(false);
    setShowOwnerAddService(false);
    setShowBookingDetail(false);
    setOwnerBookingEditMode(null);
    const newId = handleAddServiceDraft(name);
    setPage('settings');
    setSettingsSection('services');
    setServicesSearchQuery('');
    // открыть тонкую настройку для новой услуги
    setTimeout(() => {
      setEditingServiceId(newId);
      setShowServiceSettings(true);
    }, 80);
    setBottomToast(`Создайте услугу «${name}» и сохраните изменения`);
    setTimeout(() => setBottomToast(null), 3500);
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
          setSecurityError('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ РґР»СЏ СЃРјРµРЅС‹ РїР°СЂРѕР»СЏ');
          return;
        }
        if (password.new_.length < 8) {
          setSecurityError('РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РјРёРЅРёРјСѓРј 8 СЃРёРјРІРѕР»РѕРІ');
          return;
        }
        if (password.new_ !== password.confirm) {
          setSecurityError('РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїР°СЂРѕР»СЏ РЅРµ СЃРѕРІРїР°РґР°РµС‚');
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
        setSecurityError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё');
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
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  // В«Р“РѕС‚РѕРІРѕВ» РІ РјРѕРґР°Р»РєРµ РЅР°СЃС‚СЂРѕР№РєРё СѓСЃР»СѓРіРё: СЃРѕС…СЂР°РЅСЏРµС‚ СѓСЃР»СѓРіРё СЃСЂР°Р·Сѓ, С‡С‚РѕР±С‹ РЅРµ Р»РёСЃС‚Р°С‚СЊ СЃРїРёСЃРѕРє РґРѕ РєРЅРѕРїРєРё В«РЎРѕС…СЂР°РЅРёС‚СЊВ».
  const handleServiceSettingsDone = async () => {
    setServiceSettingsSaving(true);
    try {
      await saveServices(services);
      setShowServiceSettings(false);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ СѓСЃР»СѓРіСѓ');
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
        // РЎРµСЂРІРµСЂ РЅРµ РЅР°СЃС‚СЂРѕРµРЅ: РїРѕРєР°Р·С‹РІР°РµРј РјР°СЃС‚РµСЂ РїРѕРґРєР»СЋС‡РµРЅРёСЏ СЃ РёРЅСЃС‚СЂСѓРєС†РёРµР№.
        setGoogleSetupStatus(status);
        setGoogleSetupOpen(true);
        setGoogleConnectLoading(false);
        return;
      }
      const { authUrl } = await apiRequest<{ authUrl: string }>('/api/owner/integrations/google/auth-url');
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°С‡Р°С‚СЊ РїРѕРґРєР»СЋС‡РµРЅРёРµ Google РљР°Р»РµРЅРґР°СЂСЏ';
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
      // РљР»СЋС‡Рё СЃРѕС…СЂР°РЅРµРЅС‹ вЂ” СЃСЂР°Р·Сѓ РїРµСЂРµС…РѕРґРёРј Рє OAuth-Р°РІС‚РѕСЂРёР·Р°С†РёРё Google.
      const { authUrl } = await apiRequest<{ authUrl: string }>('/api/owner/integrations/google/auth-url');
      window.location.href = authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РєР»СЋС‡Рё Google РљР°Р»РµРЅРґР°СЂСЏ';
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
      // Clipboard РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” РѕСЃС‚Р°РІР»СЏРµРј URI РІРёРґРёРјС‹Рј РґР»СЏ СЂСѓС‡РЅРѕРіРѕ РєРѕРїРёСЂРѕРІР°РЅРёСЏ.
    }
  };

  const openExternal = (url: string) => {
    // Р’ Telegram РѕС‚РєСЂС‹РІР°РµРј РІРѕ РІРЅРµС€РЅРµРј Р±СЂР°СѓР·РµСЂРµ: РІРѕ РІСЃС‚СЂРѕРµРЅРЅРѕРј Google
    // Р±Р»РѕРєРёСЂСѓРµС‚ РєРѕРЅСЃРѕР»СЊ Рё OAuth (С‡Р°СЃС‚С‹Рµ В«URL not foundВ» Рё РїСѓСЃС‚С‹Рµ СЃС‚СЂР°РЅРёС†С‹).
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
        // Р¤Р°Р№Р» client_secret_*.json РёР· Google Cloud Console: {"web": {...}} РёР»Рё {"installed": {...}}
        const source = parsed?.web || parsed?.installed || parsed;
        const clientId = typeof source?.client_id === 'string' ? source.client_id.trim() : '';
        const clientSecret = typeof source?.client_secret === 'string' ? source.client_secret.trim() : '';
        if (!clientId || !clientSecret) {
          setGoogleJsonError('Р­С‚Рѕ РЅРµ С„Р°Р№Р» РЅР°СЃС‚СЂРѕРµРє Google. РЎРєР°С‡Р°Р№С‚Рµ JSON РІ РєРѕРЅСЃРѕР»Рё (Download JSON) СЂСЏРґРѕРј СЃ СЃРѕР·РґР°РЅРЅС‹Рј OAuth-РєР»РёРµРЅС‚РѕРј.');
          setGoogleJsonFile(null);
          return;
        }
        setGoogleClientId(clientId);
        setGoogleClientSecret(clientSecret);
        setGoogleJsonFile(file.name || 'client_secret.json');
      } catch {
        setGoogleJsonError('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р». РЎРєР°С‡Р°Р№С‚Рµ JSON РІ Google Cloud Console Рё РїРѕРІС‚РѕСЂРёС‚Рµ.');
        setGoogleJsonFile(null);
      }
    };
    reader.onerror = () => {
      setGoogleJsonError('РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р».');
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
      setGoogleConnectError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєР»СЋС‡РёС‚СЊ Google РљР°Р»РµРЅРґР°СЂСЊ');
    }
  };

  const handleGoogleEditKeys = async () => {
    // РЈРґР°Р»РёС‚СЊ СЃРѕС…СЂР°РЅС‘РЅРЅС‹Рµ РєР»СЋС‡Рё OAuth-РєР»РёРµРЅС‚Р° вЂ” СЃРЅРѕРІР° РїРѕРєР°Р¶РµС‚СЃСЏ РјР°СЃС‚РµСЂ
    // СЃ РёРЅСЃС‚СЂСѓРєС†РёРµР№ В«РѕС‚РєСѓРґР° Р±СЂР°С‚СЊ РєР»СЋС‡ Рё РєСѓРґР° СЃС‚Р°РІРёС‚СЊВ» Рё Р·Р°РіСЂСѓР·РєРѕР№ .json.
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
      setGoogleConnectError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РєР»СЋС‡Рё Google РљР°Р»РµРЅРґР°СЂСЏ');
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
      setGoogleSyncError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЋ');
    } finally {
      setGoogleSyncing(false);
    }
  };

  const handleGoogleCreateInvite = async () => {
    const label = googleInviteName.trim();
    if (!label) return;
    setGoogleInviteLoading(true);
    setGoogleConnectError(null);
    try {
      const res = await apiRequest<{ inviteUrl: string; label: string }>(
        '/api/owner/integrations/google/invites',
        { method: 'POST', body: { label } }
      );
      setGoogleInviteLink(res.inviteUrl);
    } catch (error) {
      setGoogleConnectError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ СЃСЃС‹Р»РєСѓ-РїСЂРёРіР»Р°С€РµРЅРёРµ');
    } finally {
      setGoogleInviteLoading(false);
    }
  };

  const handleGoogleCopyLink = async () => {
    if (!googleInviteLink) return;
    try {
      await navigator.clipboard.writeText(googleInviteLink);
      setGoogleCopiedLink(true);
      setTimeout(() => setGoogleCopiedLink(false), 2000);
    } catch {
      // Clipboard РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” СЃСЃС‹Р»РєР° РѕСЃС‚Р°С‘С‚СЃСЏ РІРёРґРёРјРѕР№ РґР»СЏ СЂСѓС‡РЅРѕРіРѕ РєРѕРїРёСЂРѕРІР°РЅРёСЏ.
    }
  };

  const handleGoogleRemoveConnection = async (connectionId: string) => {
    setGoogleConnectError(null);
    try {
      const res = await apiRequest<{ ok: boolean; connectionsCount: number }>(
        `/api/owner/integrations/google/connections/${connectionId}`,
        { method: 'DELETE' }
      );
      setGoogleConnections(prev => prev.filter(c => c.id !== connectionId));
      if (res.connectionsCount === 0) {
        setIntegrations(p => ({ ...p, googleCalendar: false }));
      }
    } catch (error) {
      setGoogleConnectError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєР»СЋС‡РёС‚СЊ РєР°Р»РµРЅРґР°СЂСЊ');
    }
  };

  // РЎРїРёСЃРѕРє РїРѕРґРєР»СЋС‡С‘РЅРЅС‹С… РєР°Р»РµРЅРґР°СЂРµР№ Р·Р°РіСЂСѓР¶Р°РµРј РїСЂРё РѕС‚РєСЂС‹С‚РёРё СЂР°Р·РґРµР»Р° РёРЅС‚РµРіСЂР°С†РёР№.
  const googleIntegrationsOpen = page === 'settings' && settingsSection === 'integrations';
  useEffect(() => {
    if (!googleIntegrationsOpen) return;
    let cancelled = false;
    apiRequest<{ connections?: GoogleConnectionInfo[] }>('/api/owner/integrations/google/status')
      .then(status => {
        if (!cancelled) setGoogleConnections(status.connections || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [googleIntegrationsOpen]);

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
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РёСЃС‚РѕСЂРёСЋ Р·Р°РїРёСЃРµР№');
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
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р°СЂС…РёРІ');
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

  // в”Ђв”Ђ Money flow: РґРІРёР¶РµРЅРёРµ РґРµРЅРµРі в”Ђв”Ђ
  const moneyFlowPeriodDates = () => {
    const today = new Date();
    if (moneyFlowPeriod === 'day') return { dateFrom: formatDate(today), dateTo: formatDate(today) };
    if (moneyFlowPeriod === 'week') {
      const from = new Date(today);
      const offset = (today.getDay() + 6) % 7;
      from.setDate(today.getDate() - offset);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (moneyFlowPeriod === 'month') {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: formatDate(from), dateTo: formatDate(today) };
    }
    if (moneyFlowPeriod === 'year') {
      return {
        dateFrom: formatDate(new Date(today.getFullYear(), 0, 1)),
        dateTo: formatDate(new Date(today.getFullYear(), 11, 31)),
      };
    }
    if (moneyFlowPeriod === 'custom') return { dateFrom: moneyFlowDateFrom, dateTo: moneyFlowDateTo };
    return { dateFrom: '', dateTo: '' };
  };

  const fetchMoneyFlow = useCallback(async () => {
    setMoneyFlowLoading(true);
    try {
      const params = new URLSearchParams();
      const { dateFrom, dateTo } = moneyFlowPeriodDates();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const data = await apiRequest<MoneyFlowResponse>(`/api/owner/money-flow?${params.toString()}`);
      setMoneyFlowData(data);
      setExpandedFlowIds(new Set());
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґРІРёР¶РµРЅРёРµ РґРµРЅРµРі');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setMoneyFlowLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneyFlowPeriod, moneyFlowDateFrom, moneyFlowDateTo]);

  useEffect(() => {
    if (page === 'settings' && settingsSection === 'money-flow' && !selectedHistoryBookingId) {
      void fetchMoneyFlow();
    }
  }, [page, settingsSection, selectedHistoryBookingId, fetchMoneyFlow]);

  const toggleFlowExpanded = (id: string) => {
    setExpandedFlowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ');
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
      setBottomToast('Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ СЃРѕС…СЂР°РЅРµРЅРѕ');
      setTimeout(() => setBottomToast(null), 3000);
      void fetchBookingsHistory();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ');
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
      setBottomToast('РЎР±СЂРѕС€РµРЅРѕ Рє Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРјСѓ СЂР°СЃС‡С‘С‚Сѓ');
      setTimeout(() => setBottomToast(null), 3000);
      void fetchBookingsHistory();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃР±СЂРѕСЃРёС‚СЊ СЂР°СЃРїСЂРµРґРµР»РµРЅРёРµ');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSplitSaving(false);
    }
  };

  const handleStartOwnerReset = async () => {
    if (!resetPassword.trim()) {
      setResetError('Р’РІРµРґРёС‚Рµ С‚РµРєСѓС‰РёР№ РїР°СЂРѕР»СЊ РІР»Р°РґРµР»СЊС†Р°, С‡С‚РѕР±С‹ Р·Р°РїСЂРѕСЃРёС‚СЊ РєРѕРґ СЃРѕР·РґР°С‚РµР»СЏ.');
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
      setResetError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСЂРѕСЃРёС‚СЊ РєРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleApproveOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('РЎРЅР°С‡Р°Р»Р° Р·Р°РЅРѕРІРѕ Р·Р°РїСЂРѕСЃРёС‚Рµ РєРѕРґ СЃРѕР·РґР°С‚РµР»СЏ.');
      return;
    }
    if (!resetCreatorCode.trim()) {
      setResetError('Р’РІРµРґРёС‚Рµ РєРѕРґ, РєРѕС‚РѕСЂС‹Р№ РїСЂРёС€С‘Р» СЃРѕР·РґР°С‚РµР»СЋ РІ Telegram.');
      return;
    }
    if (!resetConfirmationPhrase.trim()) {
      setResetError('Р’РІРµРґРёС‚Рµ РєРѕРЅС‚СЂРѕР»СЊРЅСѓСЋ С„СЂР°Р·Сѓ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.');
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
      setResetError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґС‚РІРµСЂРґРёС‚СЊ РѕС‡РёСЃС‚РєСѓ.');
    } finally {
      setResetLoadingStep(null);
    }
  };

  const handleExecuteOwnerReset = async () => {
    if (!resetRequestId) {
      setResetError('Р—Р°РїСЂРѕСЃ РЅР° РѕС‡РёСЃС‚РєСѓ РїРѕС‚РµСЂСЏРЅ. РќР°С‡РЅРёС‚Рµ Р·Р°РЅРѕРІРѕ.');
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
      setResetError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ РѕС‡РёСЃС‚РєСѓ CRM.');
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
      setBottomToast(`Р Р°СЃС…РѕРґ "${title}" РґРѕР±Р°РІР»РµРЅ РЅР° СЃСѓРјРјСѓ ${amount.toLocaleString('ru')} в‚Ѕ`);
      setTimeout(() => setBottomToast(null), 4000);
    }, 1800);
  };

  // Task 5.1 вЂ” open edit expense form
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

  // Task 5.1 вЂ” save edited expense
  const handleSaveExpense = async () => {
    if (!editingExpense) return;
    const title = editExpenseForm.title.trim();
    if (!title) { setEditFinanceError('РќР°Р·РІР°РЅРёРµ РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј'); return; }
    const amount = Number(editExpenseForm.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10_000_000) {
      setEditFinanceError('РЎСѓРјРјР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РѕС‚ 1 РґРѕ 10 000 000');
      return;
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(editExpenseForm.date)) {
      setEditFinanceError('Р”Р°С‚Р° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“');
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
      setBottomToast('Р Р°СЃС…РѕРґ РѕР±РЅРѕРІР»С‘РЅ');
      setTimeout(() => setBottomToast(null), 3500);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
          setEditFinanceError('РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё. РџСЂРѕРІРµСЂСЊС‚Рµ РІРІРµРґС‘РЅРЅС‹Рµ РґР°РЅРЅС‹Рµ.');
        } else if (msg.includes('404')) {
          setEditFinanceError('Р—Р°РїРёСЃСЊ РЅРµ РЅР°Р№РґРµРЅР°. Р’РѕР·РјРѕР¶РЅРѕ, РѕРЅР° Р±С‹Р»Р° СѓРґР°Р»РµРЅР°.');
        } else if (msg.includes('500')) {
          setEditFinanceError('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setEditFinanceError('РќРµС‚ СЃРѕРµРґРёРЅРµРЅРёСЏ СЃ СЃРµСЂРІРµСЂРѕРј.');
        } else {
          setEditFinanceError(msg || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
        }
      } else {
        setEditFinanceError('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
      }
    } finally {
      setEditFinanceLoading(false);
    }
  };

  // Task 6.1 вЂ” open edit income form
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

  // Task 6.1 вЂ” save edited income
  const handleSaveIncome = async () => {
    if (!editingIncome) return;
    const source = editIncomeForm.source.trim();
    if (!source) { setEditFinanceError('РСЃС‚РѕС‡РЅРёРє РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј'); return; }
    const amount = Number(editIncomeForm.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 10_000_000) {
      setEditFinanceError('РЎСѓРјРјР° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РѕС‚ 1 РґРѕ 10 000 000');
      return;
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(editIncomeForm.date)) {
      setEditFinanceError('Р”Р°С‚Р° РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“');
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
      setBottomToast('Р”РѕС…РѕРґ РѕР±РЅРѕРІР»С‘РЅ');
      setTimeout(() => setBottomToast(null), 3500);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('422') || msg.toLowerCase().includes('validation')) {
          setEditFinanceError('РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё. РџСЂРѕРІРµСЂСЊС‚Рµ РІРІРµРґС‘РЅРЅС‹Рµ РґР°РЅРЅС‹Рµ.');
        } else if (msg.includes('404')) {
          setEditFinanceError('Р—Р°РїРёСЃСЊ РЅРµ РЅР°Р№РґРµРЅР°. Р’РѕР·РјРѕР¶РЅРѕ, РѕРЅР° Р±С‹Р»Р° СѓРґР°Р»РµРЅР°.');
        } else if (msg.includes('500')) {
          setEditFinanceError('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
        } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          setEditFinanceError('РќРµС‚ СЃРѕРµРґРёРЅРµРЅРёСЏ СЃ СЃРµСЂРІРµСЂРѕРј.');
        } else {
          setEditFinanceError(msg || 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
        }
      } else {
        setEditFinanceError('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.');
      }
    } finally {
      setEditFinanceLoading(false);
    }
  };

  const handleExport = async (kind: OwnerExportKind, params?: OwnerExportParams) => {
    const labels = {
      report: { noun: 'Excel-С„Р°Р№Р»' },
      pdf: { noun: 'PDF' },
      'piggy-bank': { noun: 'РћС‚С‡С‘С‚ РїРѕ РєРѕРїРёР»РєРµ' },
    } as const;

    try {
      setExportingKind(kind);
      const fileName = await downloadOwnerExport(kind, params);
      let subtitle = `Р¤Р°Р№Р» ${fileName} СЃРєР°С‡Р°РЅ`;

      try {
        const delivery = await sendOwnerExportToTelegram(kind, params);
        subtitle = `${subtitle} Рё РѕС‚РїСЂР°РІР»РµРЅ РІ Telegram`;
        setBottomToast(delivery.message);
        setTimeout(() => setBottomToast(null), 5000);
      } catch (deliveryError) {
        const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ С„Р°Р№Р» РІ Telegram';
        setBottomToast(`${labels[kind].noun} СЃРєР°С‡Р°РЅ, РЅРѕ РѕС‚РїСЂР°РІРєР° РІ Telegram РЅРµ СѓРґР°Р»Р°СЃСЊ: ${deliveryMessage}`);
        setTimeout(() => setBottomToast(null), 5000);
      }

      setExportSuccess({
        title: `${labels[kind].noun} СЌРєСЃРїРѕСЂС‚РёСЂРѕРІР°РЅ`,
        subtitle,
      });
      setTimeout(() => setExportSuccess(null), 3200);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ СЌРєСЃРїРѕСЂС‚';
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
      const message = nextError instanceof Error ? nextError.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ СЃРІРѕРґРЅС‹Р№ РѕС‚С‡С‘С‚';
      setBottomToast(message);
      setTimeout(() => setBottomToast(null), 5000);
    } finally {
      setSendingSummaryReport(null);
    }
  };

  const handleDeleteSettingsClient = async (clientId: string, clientName: string) => {
    const confirmed = window.confirm(`РЈРґР°Р»РёС‚СЊ РєР»РёРµРЅС‚Р° "${clientName}"? РџСЂРѕС„РёР»СЊ Рё РґРѕСЃС‚СѓРї РІ Mini App Р±СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹, РёСЃС‚РѕСЂРёСЏ Р·Р°РїРёСЃРµР№ РѕСЃС‚Р°РЅРµС‚СЃСЏ.`);
    if (!confirmed) return;
    try {
      await deleteClient(clientId);
      if (settingsClientId === clientId) setSettingsClientId(null);
      setBottomToast('РљР»РёРµРЅС‚ СѓРґР°Р»С‘РЅ');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РєР»РёРµРЅС‚Р°');
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
      setBottomToast('РљР°СЂС‚РѕС‡РєР° РєР»РёРµРЅС‚Р° СЃРѕС…СЂР°РЅРµРЅР°');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РєР°СЂС‚РѕС‡РєСѓ РєР»РёРµРЅС‚Р°');
      setTimeout(() => setBottomToast(null), 4000);
    } finally {
      setSavingClientId(null);
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      await saveWorkerSettings(employeeSettings);
      loadPayrollData();
      setBottomToast('РќР°СЃС‚СЂРѕР№РєРё Р·Р°СЂРїР»Р°С‚ СЃРѕС…СЂР°РЅРµРЅС‹');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р·Р°СЂРїР»Р°С‚С‹');
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
      .catch(e => { console.error('salary-detail refresh error:', e); setSalaryError(e?.message || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С…'); setSalaryDetail(null); })
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
      setBottomToast('РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё');
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
      setBottomToast('РЈСЃР»СѓРіР° СЃРѕС…СЂР°РЅРµРЅР°');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (e) {
      setBottomToast(e instanceof Error ? e.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ СѓСЃР»СѓРіСѓ');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddBonus = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ РїСЂРµРјРёРё');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'bonus',
        amount: Math.round(amount),
        note: bonusNote.trim() || 'РџСЂРµРјРёСЏ',
        period: salaryPeriod,
        clientRequestId: entryRequestIdRef.current,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      entryRequestIdRef.current = newPayRequestId();
      setBonusAmount('');
      setBonusNote('');
      setBottomToast(`РџСЂРµРјРёСЏ ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РґР»СЏ ${salaryDetail.workerName} РЅР°С‡РёСЃР»РµРЅР°`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РЅР°С‡РёСЃР»РёС‚СЊ РїСЂРµРјРёСЋ');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddFine = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(fineAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ С€С‚СЂР°С„Р°');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'deduction',
        amount: Math.round(amount),
        note: fineNote.trim() || 'РЁС‚СЂР°С„',
        period: salaryPeriod,
        clientRequestId: entryRequestIdRef.current,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      entryRequestIdRef.current = newPayRequestId();
      setFineAmount('');
      setFineNote('');
      setBottomToast(`РЁС‚СЂР°С„ ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РґР»СЏ ${salaryDetail.workerName} РІС‹РїРёСЃР°РЅ`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРёСЃР°С‚СЊ С€С‚СЂР°С„');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleAddWriteOff = async () => {
    if (!selectedSalaryWorkerId || !salaryDetail) return;
    const amount = Number(writeOffAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ СЃСѓРјРјСѓ СЃРїРёСЃР°РЅРёСЏ');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    try {
      await createPayrollEntry({
        workerId: selectedSalaryWorkerId,
        kind: 'deduction',
        amount: Math.round(amount),
        note: writeOffNote.trim() || 'РЎРїРёСЃР°РЅРёРµ',
        period: salaryPeriod,
        clientRequestId: entryRequestIdRef.current,
        ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
      });
      entryRequestIdRef.current = newPayRequestId();
      setWriteOffAmount('');
      setWriteOffNote('');
      setBottomToast(`РЎРїРёСЃР°РЅРёРµ ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РґР»СЏ ${salaryDetail.workerName} РїСЂРѕРІРµРґРµРЅРѕ`);
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕРІРµСЃС‚Рё СЃРїРёСЃР°РЅРёРµ');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleRepayPiggyDebt = async (workerId: string, amount: number) => {
    if (!workerId || !amount || amount <= 0) return;
    const workerName = workers.find(w => w.id === workerId)?.name || 'СЃРѕС‚СЂСѓРґРЅРёРєР°';
    const ok = window.confirm(`РџРѕРіР°СЃРёС‚СЊ РґРѕР»Рі РїРѕ РєРѕРїРёР»РєРµ ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РґР»СЏ ${workerName}? Р‘СѓРґРµС‚ РЅР°С‡РёСЃР»РµРЅР° РїСЂРµРјРёСЏ РЅР° СЌС‚Сѓ СЃСѓРјРјСѓ.`);
    if (!ok) return;
    try {
      await createPayrollEntry({
        workerId,
        kind: 'bonus',
        amount: Math.round(amount),
        note: 'РџРѕРіР°С€РµРЅРёРµ РґРѕР»РіР° РїРѕ РєРѕРїРёР»РєРµ',
        period: 'all',
        clientRequestId: entryRequestIdRef.current,
      });
      entryRequestIdRef.current = newPayRequestId();
      setBottomToast(`Р”РѕР»Рі ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РїРѕРіР°С€РµРЅ РґР»СЏ ${workerName}`);
      setTimeout(() => setBottomToast(null), 3000);
      setRepayAmounts(p => {
        const n = { ...p };
        delete n[workerId];
        return n;
      });
      if (selectedSalaryWorkerId === workerId) setRepayDetailAmount('');
      await loadPiggyBank();
      if (selectedSalaryWorkerId === workerId) {
        refreshSalaryDetail();
      }
      const params = new URLSearchParams({ period: payrollPeriod });
      if (payrollPeriod === 'custom') {
        params.set('date_from', payrollDateFrom);
        params.set('date_to', payrollDateTo);
      }
      try {
        const updated = await apiRequest<Worker[]>(`/api/admin/workers/payroll?${params.toString()}`);
        setPayrollData(updated);
      } catch {}
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРіР°СЃРёС‚СЊ РґРѕР»Рі');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntryId || !selectedSalaryWorkerId) return;
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ РєРѕСЂСЂРµРєС‚РЅСѓСЋ СЃСѓРјРјСѓ');
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
      setBottomToast('РћРїРµСЂР°С†РёСЏ РѕР±РЅРѕРІР»РµРЅР°');
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editingEntryId || !selectedSalaryWorkerId) return;
    const confirmed = window.confirm('РЈРґР°Р»РёС‚СЊ РѕРїРµСЂР°С†РёСЋ? РЎРІСЏР·Р°РЅРЅР°СЏ Р·Р°РїРёСЃСЊ Р±СЋРґР¶РµС‚Р° Р±СѓРґРµС‚ СѓРґР°Р»РµРЅР° С‚РѕР¶Рµ.');
    if (!confirmed) return;
    try {
      await apiRequest(`/api/payroll/entries/${editingEntryId}`, { method: 'DELETE' });
      setEditingEntryId(null);
      setEditAmount('');
      setEditNote('');
      setBottomToast('РћРїРµСЂР°С†РёСЏ СѓРґР°Р»РµРЅР°');
      setTimeout(() => setBottomToast(null), 3000);
      refreshSalaryDetail();
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ');
      setTimeout(() => setBottomToast(null), 4000);
    }
  };

  const handleDispatchReminders = async () => {
    try {
      setSendingReminders(true);
      const response = await dispatchOwnerReminders({ targetDate: tomorrowLabel, force: true });
      setBottomToast(
        `${response.message} РљР»РёРµРЅС‚Р°Рј: ${response.clientReminders}, РјР°СЃС‚РµСЂР°Рј: ${response.workerReminders}, Telegram: ${response.telegramDelivered}.`,
      );
      setTimeout(() => setBottomToast(null), 5000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РЅР°РїРѕРјРёРЅР°РЅРёСЏ');
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
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ Р·Р°РґР°С‡Сѓ Р°РґРјРёРЅСѓ');
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
    const workerName = workers.find((worker) => worker.id === penaltyForm.workerId)?.name || 'РјР°СЃС‚РµСЂ';
    setPenaltyForm({ workerId: penaltyForm.workerId, title: '', reason: '' });
    setBottomToast(`Р–Р°Р»РѕР±Р° СЃРѕС…СЂР°РЅРµРЅР° РґР»СЏ ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokePenalty = async (penaltyId: string, workerName: string) => {
    await revokePenalty(penaltyId);
    setBottomToast(`Р–Р°Р»РѕР±Р° СЃРЅСЏС‚Р° РґРѕСЃСЂРѕС‡РЅРѕ РґР»СЏ ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleRevokeAllPenalties = async (workerId: string, workerName: string) => {
    const confirmed = window.confirm(`РЎРЅСЏС‚СЊ РІСЃРµ Р°РєС‚РёРІРЅС‹Рµ Р¶Р°Р»РѕР±С‹ Сѓ РјР°СЃС‚РµСЂР° "${workerName}"?`);
    if (!confirmed) return;
    await revokeAllPenalties(workerId);
    setBottomToast(`Р’СЃРµ Р°РєС‚РёРІРЅС‹Рµ Р¶Р°Р»РѕР±С‹ СЃРЅСЏС‚С‹ РґР»СЏ ${workerName}`);
    setTimeout(() => setBottomToast(null), 3000);
  };

  const handleFireWorker = async (workerId: string, workerName: string) => {
    const employee = employeeSettings.find((item) => item.id === workerId);
    const employeeTitle = employee ? employeeRoleLabel(employee.role) : 'РЎРѕС‚СЂСѓРґРЅРёРє';
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
      setResetPasswordError('РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РјРёРЅРёРјСѓРј 8 СЃРёРјРІРѕР»РѕРІ');
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetPasswordError('РџР°СЂРѕР»Рё РЅРµ СЃРѕРІРїР°РґР°СЋС‚');
      return;
    }
    try {
      setEmployeeActionLoading({ type: 'reset-password', workerId: resetPasswordTarget.id });
      await resetWorkerPassword(resetPasswordTarget.id, resetPasswordValue);
      setResetPasswordTarget(null);
      setResetPasswordValue('');
      setResetPasswordConfirm('');
      setResetPasswordError('');
      setBottomToast(`РџР°СЂРѕР»СЊ СЃР±СЂРѕС€РµРЅ РґР»СЏ ${resetPasswordTarget.name}`);
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setResetPasswordError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃР±СЂРѕСЃРёС‚СЊ РїР°СЂРѕР»СЊ');
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
    // РўРµР»РµС„РѕРЅ РЅРµРѕР±СЏР·Р°С‚РµР»РµРЅ вЂ” РІР°Р»РёРґРёСЂСѓРµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РІРІРµРґС‘РЅ
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
      setBottomToast('РљР»РёРµРЅС‚ СЃРѕР·РґР°РЅ. РњРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ РїСЂРѕС€Р»СѓСЋ Р·Р°РїРёСЃСЊ РІ РµРіРѕ РёСЃС‚РѕСЂРёСЋ.');
      setTimeout(() => setBottomToast(null), 3500);
      openBookingForClient(created);
    } catch (error) {
      setCreateClientErrors({
        general: error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РєР»РёРµРЅС‚Р°',
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
      setBottomToast('РЈРєР°Р¶РёС‚Рµ РёРјСЏ РєР»РёРµРЅС‚Р°');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    const requiresScheduledSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(bookingForm.status);
    if (requiresScheduledSlot && !bookingForm.box.trim()) {
      setBottomToast('Р”Р»СЏ Р·Р°РїРёСЃРё РЅР° СЌС‚Рѕ РІСЂРµРјСЏ СѓРєР°Р¶РёС‚Рµ РїРѕРјРµС‰РµРЅРёРµ');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (requiresScheduledSlot && !bookingForm.date.trim()) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ Р·Р°РїРёСЃРё');
      setTimeout(() => setBottomToast(null), 3000);
      return;
    }
    if (requiresScheduledSlot && !bookingForm.time.trim()) {
      setBottomToast('РЈРєР°Р¶РёС‚Рµ РІСЂРµРјСЏ Р·Р°РїРёСЃРё');
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
        isRepeatVisit: bookingForm.isRepeatVisit,
        notifyWorkers: !bookingForm.isOutsource && notifyBookingWorkers && selectedWorkers.length > 0 && bookingForm.status !== 'completed',
      });
      if (bookingForm.status !== 'completed') {
        await addNotification({ recipientRole: 'client', recipientId: booking.clientId, message: `РЎРѕР·РґР°РЅР° Р·Р°РїРёСЃСЊ РЅР° ${svc?.name || bookingForm.service} вЂ” ${bookingForm.date} РІ ${bookingForm.time}`, read: false });
        await addNotification({ recipientRole: 'admin', message: `РќРѕРІР°СЏ Р·Р°РїРёСЃСЊ: ${clientName} вЂ” ${bookingForm.date} РІ ${bookingForm.time}`, read: false });
      }
      setShowCreateBooking(false);
      resetBookingForm();
      setBottomToast(bookingForm.status === 'completed' ? 'РџСЂРѕС€Р»Р°СЏ Р·Р°РїРёСЃСЊ РґРѕР±Р°РІР»РµРЅР° РІ РёСЃС‚РѕСЂРёСЋ РєР»РёРµРЅС‚Р°' : 'Р—Р°РїРёСЃСЊ СЃРѕР·РґР°РЅР° Рё РєР»РёРµРЅС‚ СѓРІРµРґРѕРјР»С‘РЅ');
      setTimeout(() => setBottomToast(null), 3000);
    } catch (error) {
      setBottomToast(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Р·Р°РїРёСЃСЊ');
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
      isRepeatVisit: false,
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
      if (!hasDate) nextErrors.date = 'РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ Р·Р°РїРёСЃРё';
      if (!hasTime) nextErrors.time = 'РЈРєР°Р¶РёС‚Рµ РІСЂРµРјСЏ Р·Р°РїРёСЃРё';
    } else if (ownerNewBookingForm.status !== 'completed' && (hasDate || hasTime)) {
      if (!hasDate) nextErrors.date = 'РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ РёР»Рё РѕС‡РёСЃС‚РёС‚Рµ РґР°С‚Сѓ Рё РІСЂРµРјСЏ';
      else if (!hasTime) nextErrors.time = 'РЈРєР°Р¶РёС‚Рµ РІСЂРµРјСЏ РёР»Рё РѕС‡РёСЃС‚РёС‚Рµ РґР°С‚Сѓ Рё РІСЂРµРјСЏ';
    }
    if (requiresScheduledSlot && !ownerNewBookingForm.box.trim()) nextErrors.general = 'РЈРєР°Р¶РёС‚Рµ РїРѕРјРµС‰РµРЅРёРµ РґР»СЏ Р·Р°РїРёСЃРё';
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
      setOwnerNewBookingErrors({ date: 'РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“' });
      return;
    }
    const clientLabel = normalizedClientName || 'РљР»РёРµРЅС‚ Р±РµР· РёРјРµРЅРё';
    const carLabel = [normalizedCar, normalizedPlate].filter(Boolean).join(', ') || 'РђРІС‚Рѕ РЅРµ СѓРєР°Р·Р°РЅРѕ';
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
        box: ownerNewBookingForm.box.trim() || 'РџРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЋ',
        paymentType: ownerNewBookingForm.paymentType,
        paymentSettled: ownerNewBookingForm.paymentSettled,
        isOutsource: ownerNewBookingForm.isOutsource,
        outsourceAmount: ownerNewBookingForm.outsourceAmount,
        car: normalizedCar,
        plate: normalizedPlate,
        plateType: ownerNewBookingForm.plateType,
        notes: ownerNewBookingForm.notes,
        referralSource: ownerNewBookingForm.referralSource || undefined,
        isRepeatVisit: ownerNewBookingForm.isRepeatVisit,
        notifyWorkers: !ownerNewBookingForm.isOutsource && notify,
        materials: ownerNewBookingMaterials.map(m => ({
          ...m,
          qty: typeof m.qty === 'string' ? (parseFloat(m.qty) || 0) : m.qty,
          id: '',
        })),
      });
      const requestScheduleLabel = hasDateTime
        ? `${normalizedDate} ${ownerNewBookingForm.time.trim()}`
        : 'Р±РµР· РґР°С‚С‹ Рё РІСЂРµРјРµРЅРё';
      await addNotification({ recipientRole: 'owner', message: `${clientLabel} вЂў ${carLabel} вЂў ${requestScheduleLabel}`, read: false });
      await addNotification({ recipientRole: 'admin', message: `РќРѕРІР°СЏ Р·Р°РїРёСЃСЊ: ${clientLabel} вЂў ${requestScheduleLabel}`, read: false });
      setOwnerNewBookingSaveSuccess(notify ? 'notify' : 'silent');
      setTimeout(() => {
        closeOwnerNewBookingModal();
      }, 1800);
    } catch (error) {
      setOwnerNewBookingErrors({
        general: error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ Р·Р°РїРёСЃСЊ',
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
      nextErrors.date = 'РЈРєР°Р¶РёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“';
      return nextErrors;
    }
    const scheduleDay = schedule.find((entry) => entry.dayIndex === getScheduleDayIndex(parsedDate));
    if (!scheduleDay || !scheduleDay.active) {
      nextErrors.date = 'РќР° РІС‹Р±СЂР°РЅРЅСѓСЋ РґР°С‚Сѓ Р·Р°РїРёСЃСЊ РЅРµРґРѕСЃС‚СѓРїРЅР°';
    }
    const slotStart = parseOwnerBookingMinutes(timeValue.trim());
    if (slotStart === null) {
      nextErrors.time = 'РЈРєР°Р¶РёС‚Рµ РІСЂРµРјСЏ РІ С„РѕСЂРјР°С‚Рµ Р§Р§:РњРњ';
      return nextErrors;
    }
    if (!nextErrors.date && scheduleDay) {
      const openMinutes = parseOwnerBookingMinutes(scheduleDay.open);
      const closeMinutes = parseOwnerBookingMinutes(scheduleDay.close);
      const slotEnd = slotStart + Math.max(1, durationMinutes);
      if (openMinutes === null || closeMinutes === null) {
        nextErrors.time = 'Р”Р»СЏ СЌС‚РѕРіРѕ РґРЅСЏ РЅРµ РЅР°СЃС‚СЂРѕРµРЅС‹ С‡Р°СЃС‹ СЂР°Р±РѕС‚С‹';
      } else if (slotStart < openMinutes || slotEnd > closeMinutes) {
        nextErrors.time = `Р Р°Р±РѕС‡РµРµ РІСЂРµРјСЏ: ${scheduleDay.open}-${scheduleDay.close}`;
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
      box: selectedBooking.box || boxes[0]?.name || 'Р‘РѕРєСЃ 1',
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
      referralSource: (selectedBooking as any).referralSource || '',
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
        const isDetailing = svc?.category === 'Р”РµС‚РµР№Р»РёРЅРі';
        const requiresScheduledSlot = !isDetailing || ownerBookingEditFull.status !== 'admin_review';
        const slotChanged = ownerBookingEditFull.date !== selectedBooking.date
          || ownerBookingEditFull.time !== selectedBooking.time
          || ownerBookingEditFull.duration !== selectedBooking.duration;
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerBookingEditFull.status);
        if (slotChanged || statusNeedsSlot) {
          const slotErrors = validateOwnerEditSlot(ownerBookingEditFull.date, ownerBookingEditFull.time, ownerBookingEditFull.duration);
          if (slotErrors.date || slotErrors.time) {
            setOwnerBookingEditError(slotErrors.date || slotErrors.time || 'РџСЂРѕРІРµСЂСЊС‚Рµ РґР°С‚Сѓ Рё РІСЂРµРјСЏ');
            return;
          }
        }
        if (requiresScheduledSlot && !ownerBookingEditFull.box.trim()) {
          setOwnerBookingEditError('РЈРєР°Р¶РёС‚Рµ Р±РѕРєСЃ РґР»СЏ Р·Р°РїРёСЃРё');
          return;
        }
        patch = {
          status: ownerBookingEditFull.status,
          date: requiresScheduledSlot ? ownerBookingEditFull.date.trim() : (ownerBookingEditFull.date.trim() || selectedBooking.date),
          time: requiresScheduledSlot ? ownerBookingEditFull.time.trim() : (ownerBookingEditFull.time.trim() || selectedBooking.time || '00:00'),
          box: requiresScheduledSlot ? ownerBookingEditFull.box.trim() : (ownerBookingEditFull.box.trim() || 'РџРѕ СЃРѕРіР»Р°СЃРѕРІР°РЅРёСЋ'),
          notes: ownerBookingEditFull.notes.trim() || undefined,
          car: ownerBookingEditFull.car.trim() || undefined,
          plate: normalizePlateInput(ownerBookingEditFull.plate, ownerBookingEditFull.plateType) || undefined,
          plateType: ownerBookingEditFull.plateType,
          clientName: ownerBookingEditFull.clientName.trim() || undefined,
          clientPhone: ownerBookingEditFull.clientPhone.trim() || undefined,
          paymentType: ownerBookingEditFull.paymentType,
          paymentSettled: ownerBookingEditFull.paymentSettled,
          serviceId: ownerBookingEditFull.serviceId || undefined,
          referralSource: ownerBookingEditFull.referralSource || '',
          price: Math.max(0, (ownerBookingEditFull.price || 0) + (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0) + (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0)),
        };
      } else if (ownerBookingEditMode === 'status') {
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(ownerBookingEditStatus);
        if (statusNeedsSlot && (!selectedBooking.date || !selectedBooking.time)) {
          setOwnerBookingEditError('Р”Р»СЏ СЌС‚РѕРіРѕ СЃС‚Р°С‚СѓСЃР° РЅСѓР¶РЅС‹ РґР°С‚Р° Рё РІСЂРµРјСЏ вЂ” СѓРєР°Р¶РёС‚Рµ РёС… РІ СЂРµР¶РёРјРµ В«РџРѕР»РЅРѕРµВ»');
          openOwnerFullEditMode(ownerBookingEditStatus);
          return;
        }
        patch = { status: ownerBookingEditStatus, ...(ownerBookingEditStatus === 'completed' ? { paymentSettled: true } : {}) };
      } else if (ownerBookingEditMode === 'price') {
        const price = Number(ownerBookingEditPrice);
        if (isNaN(price) || price < 0) {
          setOwnerBookingEditError('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅСѓСЋ С†РµРЅСѓ');
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
          setOwnerBookingEditError('Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅСѓСЋ РґР°С‚Сѓ');
          return;
        }
        const slotChanged = ownerBookingEditDate !== selectedBooking.date || ownerBookingEditTime !== selectedBooking.time;
        const statusNeedsSlot = ['new', 'confirmed', 'scheduled', 'in_progress'].includes(selectedBooking.status);
        if (slotChanged || statusNeedsSlot) {
          const slotErrors = validateOwnerEditSlot(ownerBookingEditDate, ownerBookingEditTime, selectedBooking.duration);
          if (slotErrors.date || slotErrors.time) {
            setOwnerBookingEditError(slotErrors.date || slotErrors.time || 'РџСЂРѕРІРµСЂСЊС‚Рµ РґР°С‚Сѓ Рё РІСЂРµРјСЏ');
            return;
          }
        }
        patch = { date: ownerBookingEditDate, time: ownerBookingEditTime };
      } else if (ownerBookingEditMode === 'materials') {
        const normalized = ownerBookingEditMaterials.map(m => ({
          id: '',
          stockItemId: m.stockItemId || null,
          name: m.name,
          qty: typeof m.qty === 'string' ? (parseFloat(m.qty) || 0) : m.qty,
          unit: m.unit,
          unitPrice: m.unitPrice,
        })).filter(m => m.qty > 0 && m.name.trim());
        // allow empty list to clear materials
        patch = { materials: normalized } as any;
      }
      await updateBooking(selectedBooking.id, patch as any);
      setSelectedBooking(prev => prev ? {
        ...prev,
        ...patch,
        ...(patch as any).materials ? { materials: (patch as any).materials.map((m: any, i: number) => ({ id: `tmp-${i}-${m.stockItemId || m.name}`, stockItemId: m.stockItemId, name: m.name, qty: m.qty, unit: m.unit, unitPrice: m.unitPrice })) } : {},
        service: (patch as any).serviceId ? (services.find(s => s.id === (patch as any).serviceId)?.name || prev.service) : prev.service,
        price: (patch as any).serviceId ? Math.max(0, (ownerBookingEditFull.price || 0) + (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0) + (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0)) : prev.price,
        duration: (patch as any).serviceId ? (ownerBookingEditFull.duration || prev.duration) : prev.duration,
      } as typeof prev : null);
      setOwnerBookingEditMode(null);
    } catch (error) {
      setOwnerBookingEditError(error instanceof Error ? error.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ');
    } finally {
      setOwnerBookingEditSaving(false);
    }
  };

  const handleDeleteOwnerBooking = () => {
    if (!selectedBooking) return;
    const name = selectedBooking.clientName || `Р·Р°РїРёСЃСЊ #${selectedBooking.id.slice(0, 6)}`;
    if (!window.confirm(`РЈРґР°Р»РёС‚СЊ Р·Р°РїРёСЃСЊ РєР»РёРµРЅС‚Р° "${name}"? Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.`)) return;
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
        name: svc?.name || 'Р”РѕРї. СѓСЃР»СѓРіР°',
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
      setOwnerAddServiceError(err?.detail || err?.message || 'РћС€РёР±РєР° РїСЂРё РґРѕР±Р°РІР»РµРЅРёРё СѓСЃР»СѓРіРё');
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
      setOwnerEditAsvcError(err?.detail || err?.message || 'РћС€РёР±РєР° РїСЂРё СЃРѕС…СЂР°РЅРµРЅРёРё СѓСЃР»СѓРіРё');
    } finally {
      setOwnerEditAsvcSaving(false);
    }
  };

  const kpiCards = [
    {
      label: 'Р’С‹СЂСѓС‡РєР° СЃРµРіРѕРґРЅСЏ',
      value: `${todayRevenue.toLocaleString('ru')} в‚Ѕ`,
      icon: TrendingUp,
      color: primary,
      action: () => setKpiModal({
        kind: 'bookings',
        title: 'Р’С‹СЂСѓС‡РєР° СЃРµРіРѕРґРЅСЏ',
        color: primary,
        totalLabel: 'РІС‹СЂСѓС‡РєР° Р·Р° СЃРµРіРѕРґРЅСЏ',
        total: todayRevenue,
        bookings: todayBookings.filter(b => b.status === 'completed'),
      }),
    },
    {
      label: 'Р Р°СЃС…РѕРґС‹ Р·Р° РЅРµРґРµР»СЋ',
      value: `${totalExpenses.toLocaleString('ru')} в‚Ѕ`,
      icon: DollarSign,
      color: '#FF6B6B',
      action: () => setKpiModal({
        kind: 'expenses',
        title: 'Р Р°СЃС…РѕРґС‹ Р·Р° РЅРµРґРµР»СЋ',
        color: '#FF6B6B',
        total: totalExpenses,
        expenses: [...weeklyExpenses].sort((a, b) => b.date.localeCompare(a.date)),
      }),
    },
    {
      label: 'РџСЂРёР±С‹Р»СЊ Р·Р° РЅРµРґРµР»СЋ',
      value: `${Math.abs(profit).toLocaleString('ru')} в‚Ѕ${profit < 0 ? ' (СѓР±С‹С‚РѕРє)' : ''}`,
      icon: BarChart3,
      color: profit >= 0 ? accent : '#FF6B6B',
      action: () => setKpiModal({
        kind: 'finance',
        title: 'РџСЂРёР±С‹Р»СЊ Р·Р° РЅРµРґРµР»СЋ',
        color: profit >= 0 ? accent : '#FF6B6B',
        revenue: totalRevenue,
        incomes: totalIncomes,
        expenses: totalExpenses,
        profit,
      }),
    },
    {
      label: 'РќР° СѓС‚РѕС‡РЅРµРЅРёРё',
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
    { name: 'РќРѕРІС‹Рµ', status: 'new' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'new').length, color: '#6366F1' },
    { name: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅС‹', status: 'confirmed' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'confirmed').length, color: '#06B6D4' },
    { name: 'Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ', status: 'scheduled' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'scheduled').length, color: '#3B82F6' },
    { name: 'Р’ СЂР°Р±РѕС‚Рµ', status: 'in_progress' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'in_progress').length, color: '#EAB308' },
    { name: 'Р—Р°РІРµСЂС€РµРЅРѕ', status: 'completed' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'completed').length, color: '#22C55E' },
    { name: 'РќРµ РїСЂРёРµС…Р°Р»', status: 'no_show' as BookingStatus, value: weeklyBookings.filter(b => b.status === 'no_show').length, color: '#F97316' },
  ].filter(s => s.value > 0);
  const topServiceName = [...byService].sort((left, right) => right.revenue - left.revenue)[0]?.name || 'РќРµС‚ РґР°РЅРЅС‹С…';
  const ownerCalendarRelevantBookings = bookings.filter((booking) => booking.status !== 'cancelled');
  const ownerCalendarUndatedBookings = ownerCalendarRelevantBookings.filter((b) => !b.date?.trim());
  const ownerCalendarDatedBookings = ownerCalendarRelevantBookings.filter((b) => Boolean(b.date?.trim()));
  const ownerCalendarBookingsByDate = ownerCalendarDatedBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
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
      favoriteService: favoriteServiceEntry?.[0] || 'РќРµС‚ РґР°РЅРЅС‹С…',
      lastVisit: clientCompleted[0]?.date || clientBookings[0]?.date || 'РџРѕРєР° РЅРµС‚',
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
    new: 'РќРѕРІР°СЏ',
    confirmed: 'РџРѕРґС‚РІ.',
    scheduled: 'Р—Р°РїР».',
    in_progress: 'Р’ СЂР°Р±РѕС‚Рµ',
    completed: 'Р—Р°РІРµСЂС€РµРЅРѕ',
    no_show: 'РќРµ РїСЂРёРµС…Р°Р»',
    admin_review: 'РЈС‚РѕС‡РЅРµРЅРёРµ',
    cancelled: 'РћС‚РјРµРЅРµРЅР°',
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
    wash: 'РєРѕРїРёР»РєР° РјРѕР№РєРё',
    detailing: 'РєРѕРїРёР»РєР° РґРµС‚РµР№Р»РёРЅРіР°',
    self_service: 'РєРѕРїРёР»РєР° СЃР°РјРѕРѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ',
    general: 'РѕР±С‰Р°СЏ РєРѕРїРёР»РєР°',
  }[key] || (key ? `РєРѕРїРёР»РєР° В«${key}В»` : 'РєРѕРїРёР»РєР°'));

  const SwitchToggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="w-11 h-6 rounded-full relative transition-all shrink-0"
      style={{ background: value ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  );

  // РџРѕРґРїРёСЃСЊ РёСЃС‚РѕС‡РЅРёРєР° Р·Р°РїРёСЃРё: В«Р‘РѕС‚В» / В«GoogleВ» / В«Р’СЂСѓС‡РЅСѓСЋВ» (РѕР±С‰РёР№ РєРѕРјРїРѕРЅРµРЅС‚ SourceBadge).

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
        <div className="min-w-0">
          <div className="text-[16px] font-bold tracking-tight leading-tight">{financeRoleTitle}</div>
          <div className={`text-[11px] uppercase tracking-[.14em] ${sub}`}>ATMOSFERA</div>
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
                {session?.role === 'owner' ? 'Р’Р»Р°РґРµР»РµС† в†’ РђРґРјРёРЅ' : session?.role === 'admin' ? 'РђРґРјРёРЅ в†’ Р’Р»Р°РґРµР»РµС†' : 'РЎРјРµРЅРёС‚СЊ СЂРѕР»СЊ'}
              </button>
            </div>
          )}
          <button onClick={() => { setShowNotifications(true); markAllNotificationsRead(financeNotificationRole); }} className={`p-2 rounded-xl ${glass} relative`}>
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
          </button>
          <button onClick={() => { setShowFinancePanel(true); void loadPiggyBank(); }} className={`p-2 rounded-xl ${glass}`}><Wallet size={18} strokeWidth={1.75} /></button>
          <button onClick={() => setShowOwnerNewBooking(true)} className="p-2 rounded-xl text-white" style={{ background: primary }}><Plus size={18} strokeWidth={1.75} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">

          {/* в”Ђв”Ђ CALENDAR в”Ђв”Ђ */}
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
                        aria-label="РџСЂРµРґС‹РґСѓС‰РёР№ РјРµСЃСЏС†"
                      >
                        <ChevronLeft size={18} strokeWidth={1.75} />
                      </button>
                      <div className="text-center min-w-0">
                        <div className="font-semibold">{ownerCalendarMonthLabel}</div>
                        <div className={`text-xs ${sub} mt-0.5`}>РќР°Р¶РјРёС‚Рµ РЅР° РґРµРЅСЊ, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ СЂР°СЃРїРёСЃР°РЅРёРµ РїРѕ С‡Р°СЃР°Рј</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOwnerCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                        className={`p-2 rounded-xl ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                        aria-label="РЎР»РµРґСѓСЋС‰РёР№ РјРµСЃСЏС†"
                      >
                        <ChevronRight size={18} strokeWidth={1.75} />
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
                      РЎРµРіРѕРґРЅСЏ В· {todayLabel}
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
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Р—Р°РіСЂСѓР¶РµРЅРЅРѕСЃС‚СЊ</div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {[
                        { tone: 'empty' as const, label: 'РќРµС‚ РЅР°РіСЂСѓР·РєРё' },
                        { tone: 'medium' as const, label: 'РЎСЂРµРґРЅСЏСЏ' },
                        { tone: 'heavy' as const, label: 'Р’С‹СЃРѕРєР°СЏ' },
                      ].map((item) => (
                        <div key={item.tone} className="flex items-center gap-2">
                          <span className="w-8 h-2 rounded-full" style={{ background: ownerCalendarLoadColors[item.tone] }} />
                          <span className={sub}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {ownerCalendarUndatedBookings.length > 0 && (
                    <div className={`${glass} rounded-2xl p-4 mt-4`}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Р‘РµР· РґР°С‚С‹ вЂ” С‚СЂРµР±СѓРµС‚ СѓС‚РѕС‡РЅРµРЅРёСЏ</div>
                      <div className="space-y-2">
                        {ownerCalendarUndatedBookings.map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => ownerOpenBookingDetail(booking, setSelectedBooking, setShowBookingDetail)}
                            className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 w-full text-left`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="font-medium text-sm truncate">{booking.clientName || 'Р‘РµР· РёРјРµРЅРё'}</div>
                                <SourceBadge source={booking.source} />
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                {ownerStatusLabel(booking.status)}
                              </span>
                            </div>
                            <div className={`text-xs ${sub} mt-1 truncate`}>{booking.service} В· {booking.box}</div>
                            {(booking.car || booking.plate) && (
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
                              </div>
                            )}
                            <div className={`text-xs ${sub} mt-1`}>{booking.price.toLocaleString('ru')} в‚Ѕ</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setOwnerCalendarView('month')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-white/6' : 'bg-black/5'}`}
                    >
                      <ArrowLeft size={16} strokeWidth={1.75} />
                      РњРµСЃСЏС†
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
                      РЎРµРіРѕРґРЅСЏ
                    </button>
                  </div>
                  <div className={`${glass} rounded-2xl p-4 mb-4`}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <h2 className="font-semibold capitalize">{ownerCalendarSelectedDayTitle}</h2>
                        <div className={`text-sm ${sub} mt-1`}>
                          {calendarBookings.length} {calendarBookings.length === 1 ? 'Р·Р°РїРёСЃСЊ' : calendarBookings.length < 5 ? 'Р·Р°РїРёСЃРё' : 'Р·Р°РїРёСЃРµР№'}
                          {` В· ${Math.floor(ownerCalendarSelectedDayHours.open / 60)}:00вЂ“${Math.floor(ownerCalendarSelectedDayHours.close / 60)}:00`}
                        </div>
                      </div>
                      <CalendarDays size={22} strokeWidth={1.75} style={{ color: primary }} />
                    </div>
                  </div>
                  {calendarBookings.length === 0 ? (
                    <div className={`${glass} rounded-2xl p-8 text-center`}>
                      <CalendarDays size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                      <p className={sub}>РќР° СЌС‚РѕС‚ РґРµРЅСЊ Р·Р°РїРёСЃРµР№ РЅРµС‚</p>
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
                                      {booking.isRepeatVisit && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№</span>
                                      )}
                                      {booking.clientName || 'Р‘РµР· РёРјРµРЅРё'}
                                    </div>
                                    <div className={`text-[11px] truncate ${sub}`}>
                                      {booking.service}
                                      {booking.box ? ` В· ${booking.box}` : ''}
                                    </div>
                                    {(booking.car || booking.plate) && (
                                      <div className={`text-[11px] truncate ${sub}`}>
                                        {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
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
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Р‘РµР· С‚РѕС‡РЅРѕРіРѕ РІСЂРµРјРµРЅРё</div>
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
                                <div className="font-medium text-sm truncate">{booking.clientName || 'Р‘РµР· РёРјРµРЅРё'}</div>
                                <SourceBadge source={booking.source} />
                                {booking.isRepeatVisit && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№</span>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>
                                {ownerStatusLabel(booking.status)}
                              </span>
                            </div>
                            <div className={`text-xs ${sub} mt-1 truncate`}>{booking.service} В· {booking.box}</div>
                            {(booking.car || booking.plate) && (
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
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


          {/* в”Ђв”Ђ DASHBOARD в”Ђв”Ђ */}
          {page === 'dashboard' && (
            <>
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {kpiCards.map(card => (
                  <motion.button key={card.label} whileTap={{ scale: 0.96 }} onClick={card.action}
                    className={`${glass} rounded-2xl p-4 text-left active:opacity-80`}>
                    <div className="flex items-center gap-2 mb-2">
                      <card.icon size={15} strokeWidth={1.75} style={{ color: card.color }} />
                      <span className={`text-xs ${sub}`}>{card.label}</span>
                      <ChevronRight size={12} strokeWidth={1.75} className={`ml-auto ${sub}`} />
                    </div>
                    <div className="font-bold" style={{ color: card.color }}>{card.value}</div>
                    <div className={`text-[10px] ${sub} mt-1`}>РџРѕРґСЂРѕР±РЅРµРµ</div>
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
                    <Clock size={18} strokeWidth={1.75} />
                    РћС‚РєСЂС‹С‚РёРµ СЃРјРµРЅС‹
                  </span>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>
              )}
              {/* Today bookings */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">РЎРµРіРѕРґРЅСЏ вЂ” {todayLabel}</h3>
                  <span className={`text-sm ${sub}`}>{todayBookings.length} Р·Р°РїРёСЃРµР№</span>
                </div>
                <div className="space-y-3">
                  {todayBookings.length === 0 ? (
                    <div className={`${glass} rounded-2xl p-8 text-center`}>
                      <CalendarDays size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                      <p className={sub}>Р—Р°РїРёСЃРµР№ РЅР° СЃРµРіРѕРґРЅСЏ РЅРµС‚</p>
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
                              <span className="truncate">{booking.time} В· {booking.clientName}</span>
                              <SourceBadge source={booking.source} />
                              {booking.isRepeatVisit && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№</span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                          </div>
                          <div className={`text-sm ${sub}`}>{booking.service}</div>
                          {(booking.car || booking.plate) && (
                            <div className={`text-xs ${sub} mt-0.5`}>
                              {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
                            </div>
                          )}
                          <div className="flex justify-between mt-2">
                            <span className={`text-xs ${sub}`}>{booking.box} В· {booking.duration} РјРёРЅ</span>
                            <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                          {booking.workers.length > 0 && (
                            <div className={`text-xs ${sub} mt-1`}>РњР°СЃС‚РµСЂР°: {booking.workers.map(w => {
                              const _fixed = isFixedMasterService(services, booking.serviceId, booking.service);
                              return `${w.workerName}${_fixed ? ` В· С„РёРєСЃ ${formatFixedMasterAmount()}` : w.payType === 'fixed' ? ` В· ${(w.fixedAmount || 0).toLocaleString('ru')} в‚Ѕ` : ` ${w.percent}%`}`;
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
                <div className={`text-xs font-medium ${sub} mb-3`}>Р’Р«Р РЈР§РљРђ VS Р РђРЎРҐРћР”Р« (РќР•Р”Р•Р›РЇ)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={revenueWeek} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: isDark ? '#A1A1AA' : '#71717A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#A1A1AA' : '#71717A' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[3, 3, 0, 0]} name="Р’С‹СЂСѓС‡РєР°" />
                    <Bar dataKey="expenses" fill="#FF6B6B" radius={[3, 3, 0, 0]} name="Р Р°СЃС…РѕРґС‹" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: 'РЎСЂРµРґРЅРёР№ С‡РµРє',
                    value: `${averageCheck.toLocaleString('ru')} в‚Ѕ`,
                    color: primary,
                    action: () => setKpiModal({ kind: 'services', title: 'РЈСЃР»СѓРіРё Р·Р° РЅРµРґРµР»СЋ', color: primary, services: [...byService].sort((a, b) => b.revenue - a.revenue) }),
                  },
                  {
                    label: 'РђРєС‚РёРІРЅС‹С… Р·Р°РїРёСЃРµР№',
                    value: activeBookings.length,
                    color: accent,
                    action: () => setKpiModal({
                      kind: 'bookings',
                      title: 'РђРєС‚РёРІРЅС‹Рµ Р·Р°РїРёСЃРё',
                      color: accent,
                      totalLabel: 'Р°РєС‚РёРІРЅС‹С… Р·Р°РїРёСЃРµР№',
                      total: activeBookings.length,
                      isMoney: false,
                      bookings: activeBookings,
                    }),
                  },
                  {
                    label: 'РўРѕРї-СѓСЃР»СѓРіР°',
                    value: topServiceName,
                    color: '#312E81',
                    action: () => setKpiModal({ kind: 'services', title: 'РЈСЃР»СѓРіРё Р·Р° РЅРµРґРµР»СЋ', color: '#312E81', services: [...byService].sort((a, b) => b.revenue - a.revenue) }),
                  },
                  {
                    label: 'РќРµ РїСЂРёРµС…Р°Р»Рё',
                    value: pipelineCounts.noShow,
                    color: '#F97316',
                    action: () => setShowStatusList('no_show'),
                  },
                ].map((card) => (
                  <motion.button key={card.label} whileTap={{ scale: 0.96 }} onClick={card.action}
                    className={`${glass} rounded-2xl p-4 text-left active:opacity-80`}>
                    <div className="flex items-center gap-1">
                      <div className={`text-xs ${sub}`}>{card.label}</div>
                      <ChevronRight size={12} strokeWidth={1.75} className={`ml-auto ${sub}`} />
                    </div>
                    <div className="font-bold mt-2" style={{ color: card.color }}>{card.value}</div>
                    <div className={`text-[10px] ${sub} mt-1`}>РџРѕРґСЂРѕР±РЅРµРµ</div>
                  </motion.button>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs font-medium ${sub}`}>Р’РћР РћРќРљРђ Р—РђРџРРЎР•Р™</div>
                    <div className={`text-xs ${sub} mt-1`}>РћС‚ РЅРѕРІС‹С… Р·Р°СЏРІРѕРє РґРѕ РІС‹РїРѕР»РЅРµРЅРЅС‹С… РІРёР·РёС‚РѕРІ</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { status: 'confirmed' as BookingStatus, label: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅС‹', value: pipelineCounts.confirmed, color: '#06B6D4' },
                    { status: 'admin_review' as BookingStatus, label: 'РќР° СѓС‚РѕС‡РЅРµРЅРёРё', value: pipelineCounts.adminReview, color: '#F59E0B' },
                    { status: 'scheduled' as BookingStatus, label: 'Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅС‹', value: pipelineCounts.scheduled, color: '#3B82F6' },
                    { status: 'in_progress' as BookingStatus, label: 'Р’ СЂР°Р±РѕС‚Рµ', value: pipelineCounts.inProgress, color: '#EAB308' },
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
              <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Р‘С‹СЃС‚СЂС‹Рµ РґРµР№СЃС‚РІРёСЏ</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                  {(isAccountant
                    ? [
                        { label: 'Р”РѕР±Р°РІРёС‚СЊ СЂР°СЃС…РѕРґ', icon: DollarSign, color: '#FF6B6B', action: () => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }, disabled: false },
                        { label: exportingKind === 'report' ? 'Р’С‹РіСЂСѓР·РєР°...' : 'Р­РєСЃРїРѕСЂС‚ Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                      ]
                    : [
                        { label: 'РЎРѕР·РґР°С‚СЊ Р·Р°РїРёСЃСЊ', icon: Plus, color: primary, action: () => { resetBookingForm(); setShowCreateBooking(true); }, disabled: false },
                        { label: 'РќРѕРІС‹Р№ РєР»РёРµРЅС‚', icon: Users, color: '#06B6D4', action: () => setShowCreateClient(true), disabled: false },
                        { label: 'Р”РѕР±Р°РІРёС‚СЊ СЂР°СЃС…РѕРґ', icon: DollarSign, color: '#FF6B6B', action: () => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }, disabled: false },
                        { label: exportingKind === 'report' ? 'Р’С‹РіСЂСѓР·РєР°...' : 'Р­РєСЃРїРѕСЂС‚ Excel', icon: Download, color: accent, action: () => { void handleExport('report'); }, disabled: exportingKind !== null },
                        { label: sendingReminders ? 'РћС‚РїСЂР°РІРєР°...' : 'РќР°РїРѕРјРЅРёС‚СЊ Рѕ Р·Р°РїРёСЃСЏС…', icon: RefreshCw, color: '#EC4899', action: () => { void handleDispatchReminders(); }, disabled: sendingReminders },
                        { label: sendingInactiveReminder ? 'РћС‚РїСЂР°РІРєР°...' : 'РћР±Р·РІРѕРЅ 2+ РЅРµРґРµР»СЊ', icon: Phone, color: '#F59E0B', action: () => { void handleInactiveClientsReminder(); }, disabled: sendingInactiveReminder },
                        { label: 'РќР°СЃС‚СЂРѕР№РєРё', icon: Settings, color: '#312E81', action: () => { setPage('settings'); setSettingsSection(null); }, disabled: false },
                      ]).map(a => (
                  <motion.button key={a.label} whileTap={{ scale: 0.96 }} onClick={a.action} disabled={a.disabled} className={`${glass} rounded-2xl p-4 flex flex-col items-center gap-2 text-center disabled:opacity-60`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}20` }}><a.icon size={20} strokeWidth={1.75} style={{ color: a.color }} /></div>
                    <span className="text-xs font-medium">{a.label}</span>
                  </motion.button>
                ))}
              </div>
              {/* Status pie + recent */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`${glass} rounded-2xl p-3`}>
                  <div className={`text-xs ${sub} mb-2`}>РЎС‚Р°С‚СѓСЃС‹</div>
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
                        <ChevronRight size={10} strokeWidth={1.75} className={`ml-auto shrink-0 ${sub}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setPage('stock')} className={`${glass} rounded-2xl p-3 text-left active:opacity-80`}>
                  <div className={`text-xs ${sub} mb-2 flex items-center gap-1`}>
                    РЎРєР»Р°Рґ
                    <ChevronRight size={12} strokeWidth={1.75} className={`ml-auto ${sub}`} />
                  </div>
                  <div className="font-bold text-lg" style={{ color: accent }}>{totalStockValue.toLocaleString('ru')} в‚Ѕ</div>
                  <div className={`text-xs ${sub} mb-2`}>{stockItems.length} РїРѕР·РёС†РёР№</div>
                  {stockItems.filter(s => s.qty <= 5).length > 0 && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle size={11} strokeWidth={1.75} />
                      {stockItems.filter(s => s.qty <= 5).length} РЅР° РёСЃС…РѕРґРµ
                    </div>
                  )}
                </motion.button>
              </div>

              {stockItems.filter(s => s.qty <= 5).length > 0 && (
                <div className="mt-3">
                  <h3 className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>РџСЂРµРґСѓРїСЂРµР¶РґРµРЅРёСЏ СЃРєР»Р°РґР°</h3>
                  {stockItems.filter(s => s.qty <= 5).map(s => (
                    <motion.button key={s.id} whileTap={{ scale: 0.98 }} onClick={() => setPage('stock')}
                      className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2 flex items-center gap-2 w-full text-left active:opacity-80">
                      <AlertCircle size={15} strokeWidth={1.75} className="text-red-500 shrink-0" />
                      <span className="text-sm">РќРёР·РєРёР№ РѕСЃС‚Р°С‚РѕРє: <span className="font-medium">{s.name}</span> ({s.qty} {s.unit})</span>
                      <ChevronRight size={14} strokeWidth={1.75} className="ml-auto shrink-0 text-red-500/70" />
                    </motion.button>
                  ))}
                </div>
              )}

            </motion.div>
            </>
          )}

          {/* в”Ђв”Ђ PAYROLL в”Ђв”Ђ */}
          {page === 'payroll' && (
            <motion.div key="payroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-1">Р—Р°СЂРїР»Р°С‚С‹ РјР°СЃС‚РµСЂРѕРІ</h2>
              <div className={`text-xs ${sub} mb-3`}>РњР°СЃС‚РµСЂР° (Р±РµР· РІР»Р°РґРµР»СЊС†РµРІ вЂ” РІР»Р°РґРµР»СЊС†С‹ РЅРёР¶Рµ РІ РµРґРёРЅРѕРј РѕРєРЅРµ)</div>

              {/* Search */}
              <div className="mb-3">
                <input type="text" placeholder="РџРѕРёСЃРє РјР°СЃС‚РµСЂР° РїРѕ РёРјРµРЅРё..." value={salaryWorkerSearch}
                  onChange={e => setSalaryWorkerSearch(e.target.value)}
                  className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
              </div>

              {/* Period selector */}
              <div className="flex gap-1.5 mb-3">
                {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                  <button key={p} onClick={() => setPayrollPeriod(p)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: payrollPeriod === p ? primary : 'transparent', color: payrollPeriod === p ? '#fff' : sub }}>
                    {p === 'day' ? 'Р”РµРЅСЊ' : p === 'week' ? 'РќРµРґРµР»СЏ' : p === 'month' ? 'РњРµСЃСЏС†' : p === 'all' ? 'Р’СЃС‘' : 'РЎРІРѕС‘'}
                  </button>
                ))}
              </div>
              {payrollPeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className={`text-[11px] ${sub} block mb-1`}>РћС‚</label>
                    <input type="date" value={payrollDateFrom} onChange={(e) => setPayrollDateFrom(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>
                  <div className="flex-1">
                    <label className={`text-[11px] ${sub} block mb-1`}>Р”Рѕ</label>
                    <input type="date" value={payrollDateTo} onChange={(e) => setPayrollDateTo(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>
                </div>
              )}
              <div className={`text-[11px] ${sub} mb-3 px-1`}>Р­С‚РѕС‚ РїРµСЂРёРѕРґ С‚Р°РєР¶Рµ РїСЂРёРјРµРЅСЏРµС‚СЃСЏ Рє Р±Р»РѕРєСѓ В«Р Р°Р±РѕС‚Р° РєР°Рє РјР°СЃС‚РµСЂВ» РІ РєР°СЂС‚РѕС‡РєР°С… РІР»Р°РґРµР»СЊС†РµРІ РЅРёР¶Рµ</div>

              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-1`}>РћР±С‰РёР№ С„РѕРЅРґ РІС‹РїР»Р°С‚</div>
                <div className="font-bold text-xl" style={{ color: accent }}>{payrollTotal.toLocaleString('ru')} в‚Ѕ</div>
              </div>}
              <button onClick={() => { void handleSavePayrollSettings(); }} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mb-4" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />РЎРѕС…СЂР°РЅРёС‚СЊ РЅР°СЃС‚СЂРѕР№РєРё Р·Р°СЂРїР»Р°С‚
              </button>
              {!isAccountant && <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>Р–Р°Р»РѕР±С‹ РјР°СЃС‚РµСЂР°Рј</div>
                <div className={`text-xs ${sub} mb-3`}>
                  3 Р°РєС‚РёРІРЅС‹Рµ Р¶Р°Р»РѕР±С‹ СЃРЅРёР¶Р°СЋС‚ РїСЂРѕС†РµРЅС‚ РјР°СЃС‚РµСЂР° РЅР° 10 Рї.Рї. РЅР° РЅРµРґРµР»СЋ.
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select className={selectCls} value={penaltyForm.workerId} onChange={e => setPenaltyForm(p => ({ ...p, workerId: e.target.value }))}>
                    {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                  </select>
                  <input className={inputCls} placeholder="РќР°Р·РІР°РЅРёРµ Р¶Р°Р»РѕР±С‹" value={penaltyForm.title} onChange={e => setPenaltyForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <textarea className={`${inputCls} h-20 resize-none mb-3`} placeholder="РџСЂРёС‡РёРЅР° РёР»Рё РєРѕРјРјРµРЅС‚Р°СЂРёР№" value={penaltyForm.reason} onChange={e => setPenaltyForm(p => ({ ...p, reason: e.target.value }))} />
                <button onClick={handleAddPenalty} className="w-full py-3 rounded-2xl text-white font-semibold" style={{ background: '#EF4444' }}>
                  Р’С‹РґР°С‚СЊ Р¶Р°Р»РѕР±Сѓ
                </button>
              </div>}
              {payrollRows.filter(row => row.worker.role !== 'owner').filter(row => row.worker.name.toLowerCase().includes(salaryWorkerSearch.toLowerCase())).map(({ worker, payrollSummary, complaintState, recentPenalties }) => (
                <div key={worker.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: primary }}>{worker.name.charAt(0)}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{worker.name}</div>
                      <div className={`text-xs ${sub}`}>{employeeRoleLabel(worker.role === 'owner' ? 'admin' : worker.role)} В· Р±Р°Р·Р° {worker.defaultPercent}%{worker.salaryPerShift > 0 ? ` В· Р·Р° РІС‹С…РѕРґ: ${worker.salaryPerShift.toLocaleString('ru')} в‚Ѕ` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: accent }}>{(payrollSummary?.balance || 0).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-xs ${sub}`}>{payrollSummary?.completedBookings || 0} Р·Р°РєР°Р·РѕРІ В· {complaintState.activeCount} Р°РєС‚РёРІРЅС‹С… Р¶Р°Р»РѕР±</div>
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
                    РћС‚РєСЂС‹С‚СЊ Р·Р°СЂРїР»Р°С‚Сѓ РјР°СЃС‚РµСЂР°
                  </button>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.accruedFromBookings || 0).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[11px] ${sub}`}>Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ СЃ Р·Р°РєР°Р·РѕРІ</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold text-red-500">{complaintState.effectivePercent}%</div>
                      <div className={`text-[11px] ${sub}`}>РўРµРєСѓС‰РёР№ %</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.baseSalary || worker.salaryBase).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[11px] ${sub}`}>РћРєР»Р°Рґ</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{(payrollSummary?.completedRevenue || 0).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[11px] ${sub}`}>Р’С‹СЂСѓС‡РєР° РїРѕ Р·Р°РєР°Р·Р°Рј</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>РќР°С‡РёСЃР»РµРЅРѕ</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalAccrued || 0).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        {(payrollSummary && payrollSummary.shiftPayTotal > 0) && (
                          <span>Р—Р° СЃРјРµРЅС‹: +{payrollSummary.shiftPayTotal.toLocaleString('ru')} в‚Ѕ ({payrollSummary.shiftCount} РІС‹С….) В· </span>
                        )}
                        РџСЂРµРјРёРё: {(payrollSummary?.bonusTotal || 0).toLocaleString('ru')} в‚Ѕ В· РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєРё: {(payrollSummary?.adjustmentTotal || 0).toLocaleString('ru')} в‚Ѕ
                      </div>
                    </div>
                    <div className={`${glass} rounded-xl p-3`}>
                      <div className={`text-[11px] ${sub} mb-1`}>РЈРґРµСЂР¶Р°РЅРѕ / РІС‹РґР°РЅРѕ</div>
                      <div className="text-sm font-semibold">{(payrollSummary?.totalDeducted || 0).toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[11px] ${sub} mt-1`}>
                        РђРІР°РЅСЃС‹: {(payrollSummary?.advanceTotal || 0).toLocaleString('ru')} в‚Ѕ В· Р’С‹РїР»Р°С‚С‹: {(payrollSummary?.payoutTotal || 0).toLocaleString('ru')} в‚Ѕ
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const debt = piggyBank?.spenderDebts?.find(d => d.spentById === worker.id);
                    if (!debt || debt.totalSpent <= 0) return null;
                    const repayVal = repayAmounts[worker.id] ?? String(Math.round(debt.totalSpent));
                    const repayNum = Number(repayVal.replace(',', '.'));
                    const isValid = Number.isFinite(repayNum) && repayNum > 0 && repayNum <= debt.totalSpent;
                    return (
                      <div className={`${glass} rounded-xl p-3 mb-3 border border-amber-500/20 bg-amber-500/10`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className={`text-xs ${sub}`}>Р”РѕР»Рі РїРѕ РєРѕРїРёР»РєРµ</div>
                            <div className={`text-[11px] ${sub}`}>{debt.count} СЃРїРёСЃР°РЅРёР№ В· РґРѕР»Рі {debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                          </div>
                          <div className="text-sm font-bold" style={{ color: '#F59E0B' }}>-{debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                        </div>
                        <div className="flex gap-2">
                          <input type="number" inputMode="numeric" min={1} max={Math.round(debt.totalSpent)} value={repayVal} onChange={e => setRepayAmounts(p => ({ ...p, [worker.id]: e.target.value }))} placeholder={String(Math.round(debt.totalSpent))} className={`${inputCls} flex-1 text-sm py-2 px-3 rounded-xl`} />
                          <button onClick={() => handleRepayPiggyDebt(worker.id, repayNum)} disabled={!isValid} className="px-4 rounded-xl text-xs font-medium text-white disabled:opacity-40" style={{ background: '#F59E0B' }}>РџРѕРіР°СЃРёС‚СЊ</button>
                        </div>
                        {!isValid && repayVal && <div className="text-[11px] text-red-500 mt-1">Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ РѕС‚ 1 РґРѕ {Math.round(debt.totalSpent).toLocaleString('ru')} в‚Ѕ</div>}
                      </div>
                    );
                  })()}
                  {(() => {
                    const payrollDraft = employeeSettings.find((item) => item.id === worker.id);
                    if (!payrollDraft) return null;
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>РџСЂРѕС†РµРЅС‚</label>
                            <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={payrollDraft.percent === '' ? '' : payrollDraft.percent} onChange={e => { const r = e.target.value; if (r === '') { setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: '' } : item)); return; } const n = parseFloat(r); if (!isNaN(n)) { setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: Math.min(100, Math.max(0, n)) } : item)); } }} onBlur={() => setEmployeeSettings(current => current.map(item => item.id === worker.id ? { ...item, percent: item.percent === '' ? 0 : item.percent } : item))} />
                          </div>
                          <div>
                            <label className={`text-[11px] ${sub} block mb-1`}>РћРєР»Р°Рґ</label>
                            <input className={inputCls} type="number" min={0} value={payrollDraft.salaryBase} onChange={e => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, salaryBase: Math.max(0, Number(e.target.value) || 0) } : item))} />
                          </div>
                        </div>
                        {!isAccountant && <div className="flex items-center justify-between rounded-xl px-3 py-3 mb-3 border border-white/10">
                          <div>
                            <div className="text-sm font-medium">РђРєС‚РёРІРЅРѕСЃС‚СЊ РјР°СЃС‚РµСЂР°</div>
                            <div className={`text-[11px] ${sub}`}>РњРѕР¶РЅРѕ РІСЂРµРјРµРЅРЅРѕ СЃРЅСЏС‚СЊ РјР°СЃС‚РµСЂР° СЃ РЅРѕРІС‹С… Р·Р°РїРёСЃРµР№</div>
                          </div>
                          <button
                            onClick={() => setEmployeeSettings((current) => current.map((item) => item.id === worker.id ? { ...item, active: !item.active } : item))}
                            className="w-11 h-6 rounded-full relative transition-all"
                            style={{ background: payrollDraft.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${payrollDraft.active ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>}
                      </>
                    );
                  })()}

                  {!isAccountant && (complaintState.reductionActive ? (
                    <div className="rounded-xl px-3 py-2 mb-3 text-xs border border-red-500/20 bg-red-500/10 text-red-500">
                      РЎРЅРёР¶РµРЅРёРµ Р°РєС‚РёРІРЅРѕ: в€’10 Рї.Рї. РґРѕ {complaintState.reductionUntil ? formatComplaintDate(complaintState.reductionUntil) : 'РєРѕРЅС†Р° РЅРµРґРµР»Рё'}.
                    </div>
                  ) : (
                    <div className={`text-xs ${sub} mb-3`}>
                      {complaintState.activeCount === 0
                        ? 'РђРєС‚РёРІРЅС‹С… Р¶Р°Р»РѕР± РЅРµС‚.'
                        : `Р”Рѕ СЃРЅРёР¶РµРЅРёСЏ РїСЂРѕС†РµРЅС‚Р° РѕСЃС‚Р°Р»РѕСЃСЊ ${Math.max(0, COMPLAINT_THRESHOLD - complaintState.activeCount)} Р¶Р°Р»РѕР±С‹.`}
                    </div>
                  ))}
                  {!isAccountant && complaintState.activeCount > 0 && (
                    <button
                      onClick={() => { void handleRevokeAllPenalties(worker.id, worker.name); }}
                      className="mb-3 w-full py-2.5 rounded-xl text-sm font-medium text-red-500 border border-red-500/20 bg-red-500/10"
                    >
                      РЎРЅСЏС‚СЊ РІСЃРµ Р¶Р°Р»РѕР±С‹
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
                                ? `РђРєС‚РёРІРЅР° РґРѕ ${formatComplaintDate(item.activeUntil)}`
                                : item.revokedAt
                                  ? `РЎРЅСЏС‚Р° ${formatComplaintDate(item.revokedAt)}`
                                  : `РСЃС‚РµРєР»Р° ${formatComplaintDate(item.activeUntil)}`}
                            </div>
                          </div>
                          {isComplaintActive(item) ? (
                            <button onClick={() => { void handleRevokePenalty(item.id, worker.name); }} className="text-xs text-red-500 shrink-0">
                              РЎРЅСЏС‚СЊ
                            </button>
                          ) : (
                            <span className={`text-xs ${sub} shrink-0`}>{item.revokedAt ? 'РЎРЅСЏС‚Р°' : 'РСЃС‚РµРєР»Р°'}</span>
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
                      Р’СЃРµ Р¶Р°Р»РѕР±С‹ ({complaintState.activeCount})
                    </button>
                  )}
                </div>
              ))}

              {/* в”Ђв”Ђ Р’Р›РђР”Р•Р›Р¬Р¦Р« вЂ” Р•Р”РРќРћР• РћРљРќРћ Р—Рџ (СЂР°Р±РѕС‚Р° + РїР°СЃСЃРёРІ) в”Ђв”Ђ */}
              {!isAccountant && (
                <div className="mt-6">
                  <h2 className="font-semibold mb-1">Р’Р»Р°РґРµР»СЊС†С‹ вЂ” РµРґРёРЅРѕРµ РѕРєРЅРѕ Р—Рџ</h2>
                  <div className={`text-xs ${sub} mb-3`}>Р”Р»СЏ РєР°Р¶РґРѕРіРѕ РІР»Р°РґРµР»СЊС†Р°: Р—Рџ Р·Р° СЂР°Р±РѕС‚Сѓ РєР°Рє РјР°СЃС‚РµСЂР°/Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° + РїР°СЃСЃРёРІРЅС‹Р№ РґРѕС…РѕРґ СЃ Р·Р°РєР°Р·РѕРІ РґСЂСѓРіРёС… РјР°СЃС‚РµСЂРѕРІ</div>
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {(['day', 'week', 'month', 'all', 'custom'] as const).map(p => (
                      <button key={p} onClick={() => setOwnerSalaryPeriod(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: ownerSalaryPeriod === p ? primary : 'transparent', color: ownerSalaryPeriod === p ? '#fff' : sub }}>
                        {{ day: 'Р”РµРЅСЊ', week: 'РќРµРґРµР»СЏ', month: 'РњРµСЃСЏС†', all: 'Р’СЃС‘', custom: 'РЎРІРѕРё' }[p]}
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
                  {ownerSalaryLoading && <div className={`text-xs ${sub} py-4 text-center`}>Р—Р°РіСЂСѓР·РєР°...</div>}
                  {!ownerSalaryLoading && ownerSalaryData && ownerSalaryData.owners.map(owner => {
                    const rawId = owner.ownerId.replace('owner-tg-', '');
                    const ownerDisplayName = rawId === '476719812' ? 'Р®СЂР°' : rawId === '1768985608' ? 'РњР°РєСЃРёРј' : owner.ownerName;
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
                          <div className={`text-xs ${sub}`}>Р’Р»Р°РґРµР»РµС† вЂ” РµРґРёРЅРѕРµ РѕРєРЅРѕ Р—Рџ</div>
                        </div>
                      </div>
                      {(() => {
                        const linked = payrollRows.find(r => r.worker.id === owner.ownerId);
                        if (!linked) {
                          return <div className={`text-xs ${sub} mb-3 px-1`}>РќРµ РІС‹РїРѕР»РЅСЏРµС‚ Р·Р°РєР°Р·С‹ РєР°Рє РјР°СЃС‚РµСЂ вЂ” С‚РѕР»СЊРєРѕ РїР°СЃСЃРёРІРЅС‹Р№ РґРѕС…РѕРґ РЅРёР¶Рµ</div>;
                        }
                        const ps = linked.payrollSummary;
                        return (
                          <div className="mb-3">
                            <div className={`text-xs font-semibold ${sub} uppercase tracking-wide mb-2`}>Р—Рџ Р·Р° СЂР°Р±РѕС‚Сѓ РєР°Рє РјР°СЃС‚РµСЂ / Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className={`${glass} rounded-xl p-3 text-center`}>
                                <div className="text-sm font-semibold">{(ps?.accruedFromBookings || 0).toLocaleString('ru')} в‚Ѕ</div>
                                <div className={`text-[11px] ${sub}`}>Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ СЃ Р·Р°РєР°Р·РѕРІ</div>
                              </div>
                              <div className={`${glass} rounded-xl p-3 text-center`}>
                                <div className="text-sm font-semibold" style={{ color: linked.complaintState.effectivePercent !== linked.worker.defaultPercent ? '#ef4444' : accent }}>{linked.complaintState.effectivePercent}%</div>
                                <div className={`text-[11px] ${sub}`}>РўРµРєСѓС‰РёР№ % В· Р±Р°Р·Р° {linked.worker.defaultPercent}%</div>
                              </div>
                              <div className={`${glass} rounded-xl p-3 text-center`}>
                                <div className="text-sm font-semibold">{(ps?.baseSalary ?? linked.worker.salaryBase).toLocaleString('ru')} в‚Ѕ</div>
                                <div className={`text-[11px] ${sub}`}>РћРєР»Р°Рґ</div>
                              </div>
                              <div className={`${glass} rounded-xl p-3 text-center`}>
                                <div className="text-sm font-semibold">{(ps?.completedRevenue || 0).toLocaleString('ru')} в‚Ѕ</div>
                                <div className={`text-[11px] ${sub}`}>Р’С‹СЂСѓС‡РєР° РїРѕ Р·Р°РєР°Р·Р°Рј</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className={`${glass} rounded-xl p-3`}>
                                <div className={`text-[11px] ${sub} mb-1`}>РќР°С‡РёСЃР»РµРЅРѕ</div>
                                <div className="text-sm font-semibold">{(ps?.totalAccrued || 0).toLocaleString('ru')} в‚Ѕ</div>
                                <div className={`text-[11px] ${sub} mt-1`}>{ps?.shiftPayTotal ? `РЎРјРµРЅС‹: +${ps.shiftPayTotal.toLocaleString('ru')} в‚Ѕ (${ps.shiftCount}) В· ` : ''}РџСЂРµРјРёРё: {(ps?.bonusTotal || 0).toLocaleString('ru')} в‚Ѕ</div>
                              </div>
                              <div className={`${glass} rounded-xl p-3`}>
                                <div className={`text-[11px] ${sub} mb-1`}>Рљ РІС‹РїР»Р°С‚Рµ Р·Р° СЂР°Р±РѕС‚Сѓ</div>
                                <div className="text-sm font-semibold" style={{ color: (ps?.balance || 0) > 0 ? accent : sub }}>{(ps?.balance || 0).toLocaleString('ru')} в‚Ѕ</div>
                                <div className={`text-[11px] ${sub} mt-1`}>{ps?.completedBookings || 0} Р·Р°РєР°Р·РѕРІ В· {linked.complaintState.activeCount} Р¶Р°Р»РѕР±</div>
                              </div>
                            </div>
                            <button onClick={() => { setSelectedSalaryWorkerId(linked.worker.id); setSalaryPeriod('month'); setSalaryDateFrom(''); setSalaryDateTo(''); setSalaryDetail(null); setSalaryError(null); setSalaryLoading(true); setEditingOverrideLinkId(null); setEditingOverrideValue(''); setPage('salary-detail'); }} className="w-full rounded-xl border px-3 py-2 text-sm font-medium mb-2" style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }}>РћС‚РєСЂС‹С‚СЊ Р·Р°СЂРїР»Р°С‚Сѓ РјР°СЃС‚РµСЂР° вЂ” РґРµС‚Р°Р»Рё, РїСЂРµРјРёРё, С€С‚СЂР°С„С‹</button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const debt = piggyBank?.spenderDebts?.find(d => d.spentById === owner.ownerId || d.spentByName === ownerDisplayName);
                        if (!debt || debt.totalSpent <= 0) return null;
                        const repayId = debt.spentById || owner.ownerId;
                        const repayVal = repayAmounts[repayId] ?? String(Math.round(debt.totalSpent));
                        const repayNum = Number(repayVal.replace(',', '.'));
                        const isValid = Number.isFinite(repayNum) && repayNum > 0 && repayNum <= debt.totalSpent;
                        return (
                          <div className={`${glass} rounded-xl p-3 mb-3 border border-amber-500/20 bg-amber-500/10`}>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className={`text-xs ${sub}`}>Р”РѕР»Рі РїРѕ РєРѕРїРёР»РєРµ</div>
                                <div className={`text-[11px] ${sub}`}>{debt.count} СЃРїРёСЃР°РЅРёР№ В· РґРѕР»Рі {debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                              </div>
                              <div className="text-sm font-bold" style={{ color: '#F59E0B' }}>-{debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                            </div>
                            <div className="flex gap-2">
                              <input type="number" inputMode="numeric" min={1} max={Math.round(debt.totalSpent)} value={repayVal} onChange={e => setRepayAmounts(p => ({ ...p, [repayId]: e.target.value }))} placeholder={String(Math.round(debt.totalSpent))} className={`${inputCls} flex-1 text-sm py-2 px-3 rounded-xl`} />
                              <button onClick={() => handleRepayPiggyDebt(repayId, repayNum)} disabled={!isValid} className="px-4 rounded-xl text-xs font-medium text-white disabled:opacity-40" style={{ background: '#F59E0B' }}>РџРѕРіР°СЃРёС‚СЊ</button>
                            </div>
                            {!isValid && repayVal && <div className="text-[11px] text-red-500 mt-1">Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ РѕС‚ 1 РґРѕ {Math.round(debt.totalSpent).toLocaleString('ru')} в‚Ѕ</div>}
                          </div>
                        );
                      })()}
                      <div className={`text-xs font-semibold ${sub} uppercase tracking-wide mb-2`}>РџР°СЃСЃРёРІРЅС‹Р№ РґРѕС…РѕРґ вЂ” РґРѕР»СЏ СЃ Р·Р°РєР°Р·РѕРІ РґСЂСѓРіРёС… РјР°СЃС‚РµСЂРѕРІ</div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: accent }}>{owner.totalAccrued.toLocaleString('ru')} в‚Ѕ</div>
                          <div className={`text-[11px] ${sub}`}>РќР°С‡РёСЃР»РµРЅРѕ</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: '#ef4444' }}>{owner.totalPaid.toLocaleString('ru')} в‚Ѕ</div>
                          <div className={`text-[11px] ${sub}`}>Р’С‹РїР»Р°С‡РµРЅРѕ</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3 text-center`}>
                          <div className="text-sm font-semibold" style={{ color: owner.balanceToPay > 0 ? '#22c55e' : sub }}>{owner.balanceToPay.toLocaleString('ru')} в‚Ѕ</div>
                          <div className={`text-[11px] ${sub}`}>РћСЃС‚Р°С‚РѕРє</div>
                        </div>
                      </div>
                      {owner.shares.length > 0 && (
                        <div className="mb-3">
                          <button
                            onClick={() => setExpandedOwnerShares(prev => ({ ...prev, [owner.ownerId]: !prev[owner.ownerId] }))}
                            className="w-full flex items-center gap-1.5 text-left mb-2 active:opacity-70">
                            <ChevronRight size={14} strokeWidth={1.75} className={`${sub} transition-transform ${expandedOwnerShares[owner.ownerId] ? 'rotate-90' : ''}`} />
                            <span className={`text-xs ${sub}`}>РќР°С‡РёСЃР»РµРЅРёСЏ РїРѕ Р·Р°РєР°Р·Р°Рј ({owner.shares.length})</span>
                          </button>
                          {expandedOwnerShares[owner.ownerId] && owner.shares.map(share => (
                            <div key={share.id} onClick={() => setSelectedShareDetail(share)} className="flex items-center justify-between py-1.5 border-b cursor-pointer active:opacity-70" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                              <div className="min-w-0 mr-2">
                                <div className="text-xs font-medium truncate">{share.service || 'Р—Р°РєР°Р·'}</div>
                                <div className={`text-[10px] ${sub}`}>
                                  {share.date}{share.time ? ` ${share.time}` : ''}
                                  {share.clientName ? ` В· ${share.clientName}` : ''}
                                </div>
                                {share.price > 0 && (
                                  <div className={`text-[10px] ${sub}`}>РЎС‚РѕРёРјРѕСЃС‚СЊ Р·Р°РєР°Р·Р°: {share.price.toLocaleString('ru')} в‚Ѕ</div>
                                )}
                              </div>
                              <div className="text-xs font-semibold shrink-0 ml-2">+{share.amount.toLocaleString('ru')} в‚Ѕ</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setOwnerPayTarget(ownerPayTarget === owner.ownerId ? null : owner.ownerId)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium mb-2"
                        style={{ borderColor: `${primary}33`, color: primary, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)', border: `1px solid ${primary}33` }}>
                        Р’С‹РїР»Р°С‚РёС‚СЊ
                      </button>
                      {ownerPayTarget === owner.ownerId && (
                        <div className={`${glass} rounded-xl p-3 mt-2`}>
                          <div className="flex gap-2 mb-2">
                            <input type="number" min={1} placeholder="РЎСѓРјРјР°" value={ownerPayAmount}
                              onChange={e => setOwnerPayAmount(e.target.value)}
                              className={`${inputCls} flex-1 text-sm py-2 px-3 rounded-xl`} />
                            <button onClick={() => handlePayOwnerSalary(owner.ownerId)}
                              className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: primary }}>
                              {ownerSalaryLoading ? '...' : 'Р’С‹РїР»Р°С‚РёС‚СЊ'}
                            </button>
                          </div>
                          <input type="text" placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)" value={ownerPayNote}
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

          {/* в”Ђв”Ђ SALARY DETAIL в”Ђв”Ђ */}
          {page === 'salary-detail' && (
            <motion.div key="salary-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => { setPage('payroll'); setSelectedSalaryWorkerId(null); setSalaryDetail(null); setEditingOverrideLinkId(null); setEditingOverrideValue(''); setArchiveHighlight(null); }} className="flex items-center gap-1.5 text-sm mb-3" style={{ color: primary }}>
                <ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ Рє Р·Р°СЂРїР»Р°С‚Р°Рј
              </button>

              {/* Filter bar вЂ” always visible when worker is selected */}
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
                          Р‘Р°Р·Р°: {salaryDetail.salaryBase.toLocaleString('ru')} в‚Ѕ В· %: {salaryDetail.defaultPercent}% В· Р—Р° СЃРјРµРЅСѓ: {salaryDetail.salaryPerShift.toLocaleString('ru')} в‚Ѕ В· {salaryDetail.active ? 'РђРєС‚РёРІРµРЅ' : 'РќРµР°РєС‚РёРІРµРЅ'}
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
                        {p === 'day' ? 'Р”РµРЅСЊ' : p === 'week' ? 'РќРµРґРµР»СЏ' : p === 'month' ? 'РњРµСЃСЏС†' : p === 'all' ? 'Р’СЃС‘' : 'РЎРІРѕС‘'}
                      </button>
                    ))}
                  </div>
                  {/* Segment toggles */}
                  <div className="flex gap-1.5">
                    {(['all', 'wash', 'detailing'] as const).map(s => (
                      <button key={s} onClick={() => setSalarySegment(s)}
                        className="flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: salarySegment === s ? primary : 'transparent', color: salarySegment === s ? '#fff' : sub }}>
                        {s === 'all' ? 'Р’СЃРµ' : s === 'wash' ? 'РњРѕР№РєР°' : 'Р”РµС‚РµР№Р»РёРЅРі'}
                      </button>
                    ))}
                  </div>
                  {salaryPeriod === 'custom' && (
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1">
                        <label className={`text-[11px] ${sub} block mb-1`}>РћС‚</label>
                        <input type="date" value={salaryDateFrom} onChange={(e) => { setSalaryDateFrom(e.target.value); }}
                          className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      </div>
                      <div className="flex-1">
                        <label className={`text-[11px] ${sub} block mb-1`}>Р”Рѕ</label>
                        <input type="date" value={salaryDateTo} onChange={(e) => { setSalaryDateTo(e.target.value); }}
                          className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!salaryLoading && !salaryDetail && selectedSalaryWorkerId && salaryError && (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <AlertCircle size={36} strokeWidth={1.75} className={`mx-auto mb-3 text-red-400`} />
                  <p className="text-sm text-red-400 mb-2">{salaryError}</p>
                  <button onClick={refreshSalaryDetail} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: primary, color: '#fff' }}>РџРѕРІС‚РѕСЂРёС‚СЊ</button>
                </div>
              )}
              {!salaryLoading && !salaryDetail && selectedSalaryWorkerId && !salaryError && (
                <div className={`text-sm ${sub} py-10 text-center`}>Р’С‹Р±РµСЂРёС‚Рµ РїРµСЂРёРѕРґ РґР»СЏ РїСЂРѕСЃРјРѕС‚СЂР°</div>
              )}
              {salaryLoading && (
                <div className={`text-sm ${sub} py-10 text-center`}>Р—Р°РіСЂСѓР·РєР°...</div>
              )}
              {salaryDetail && (
                <>

                  {/* Aggregate cards */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold">{salaryDetail.totalEarned.toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[10px] ${sub}`}>Р—Р°СЂР°Р±РѕС‚Р°РЅРѕ</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold" style={{ color: '#ef4444' }}>{salaryDetail.totalPaid.toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[10px] ${sub}`}>Р’С‹РїР»Р°С‡РµРЅРѕ</div>
                    </div>
                    <div className={`${glass} rounded-xl p-3 text-center`}>
                      <div className="text-sm font-semibold" style={{ color: salaryDetail.balanceToPay > 0 ? '#22c55e' : sub }}>{salaryDetail.balanceToPay.toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-[10px] ${sub}`}>Рљ РІС‹РїР»Р°С‚Рµ</div>
                    </div>
                  </div>
                  {(() => {
                    const debt = piggyBank?.spenderDebts?.find(d => d.spentById === selectedSalaryWorkerId);
                    if (!debt || debt.totalSpent <= 0) return null;
                    const repayVal = repayDetailAmount || String(Math.round(debt.totalSpent));
                    const repayNum = Number(repayVal.replace(',', '.'));
                    const isValid = Number.isFinite(repayNum) && repayNum > 0 && repayNum <= debt.totalSpent;
                    return (
                      <div className={`${glass} rounded-xl p-3 mb-3 border border-amber-500/20 bg-amber-500/10`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className={`text-xs ${sub}`}>Р”РѕР»Рі РїРѕ РєРѕРїРёР»РєРµ</div>
                            <div className={`text-[11px] ${sub}`}>{debt.count} СЃРїРёСЃР°РЅРёР№ В· РґРѕР»Рі {debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                          </div>
                          <div className="text-sm font-bold" style={{ color: '#F59E0B' }}>-{debt.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                        </div>
                        <div className="flex gap-2">
                          <input type="number" inputMode="numeric" min={1} max={Math.round(debt.totalSpent)} value={repayVal} onChange={e => setRepayDetailAmount(e.target.value)} placeholder={String(Math.round(debt.totalSpent))} className={`${inputCls} flex-1 text-sm py-2 px-3 rounded-xl`} />
                          <button onClick={() => handleRepayPiggyDebt(selectedSalaryWorkerId!, repayNum)} disabled={!isValid} className="px-4 rounded-xl text-xs font-medium text-white disabled:opacity-40" style={{ background: '#F59E0B' }}>РџРѕРіР°СЃРёС‚СЊ</button>
                        </div>
                        {!isValid && repayVal && <div className="text-[11px] text-red-500 mt-1">Р’РІРµРґРёС‚Рµ СЃСѓРјРјСѓ РѕС‚ 1 РґРѕ {Math.round(debt.totalSpent).toLocaleString('ru')} в‚Ѕ</div>}
                      </div>
                    );
                  })()}

                  {/* Bookings list */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm">Р—Р°РїРёСЃРё ({salaryDetail.completedBookingsCount})</h3>
                      <span className={`text-[11px] ${sub}`}>РЎРјРµРЅ: {salaryDetail.shiftCount}</span>
                    </div>
                    {salaryDetail.shiftDates && salaryDetail.shiftDates.length > 0 && (
                      <div className={`text-[11px] ${sub} mb-2`}>Р’С‹С…РѕРґС‹: {salaryDetail.shiftDates.join(', ')}</div>
                    )}
                    {salaryDetail.bookings.length === 0 ? (
                      <div className={`text-xs ${sub} py-3 text-center`}>РќРµС‚ Р·Р°РїРёСЃРµР№ Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ</div>
                    ) : (
                      salaryDetail.bookings.map(b => (
                        <div key={b.id} onClick={() => setSalaryBookingDetail(b)} className="flex items-center justify-between py-2 border-b cursor-pointer active:opacity-70" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex-1 min-w-0 mr-2">
                            <div className="text-xs font-medium truncate">
                              {b.date} {b.time} В·{' '}
                              <span className="underline decoration-dotted underline-offset-2 truncate max-w-full" style={{ color: primary }} title="РџРѕРґСЂРѕР±РЅРµРµ РѕР± СѓСЃР»СѓРіРµ">
                                {b.service}
                              </span>
                            </div>
                            <div className={`text-[10px] ${sub}`}>{b.box} В· {b.payType === 'fixed' ? `С„РёРєСЃ ${b.earned.toLocaleString('ru')} в‚Ѕ` : `${b.percent}%`}</div>
                            {(b.car || b.plate) && (
                              <div className={`text-[10px] ${sub} mt-0.5`}>
                                {[b.car, b.plate].filter(Boolean).join(' В· ')}
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
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: accent, color: '#fff' }}>вњ“</button>
                                <button onClick={handleCancelOverrideEarned}
                                  className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#666', color: '#fff' }}>вњ•</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="text-right">
                                  <div className="text-sm font-semibold">{b.earned.toLocaleString('ru')} в‚Ѕ</div>
                                  <div className={`text-[10px] ${sub}`}>{b.resourceGroup === 'wash' ? 'РњРѕР№РєР°' : 'Р”РµС‚РµР№Р»РёРЅРі'}</div>
                                </div>
                                {b.linkId && (
                                  <button onClick={() => {
                                    setEditingOverrideLinkId(b.linkId!);
                                    setEditingOverrideValue(String(b.overrideEarned ?? b.earned));
                                  }} className="text-xs opacity-50 hover:opacity-100 transition" title="РР·РјРµРЅРёС‚СЊ Р·Р°СЂР°Р±РѕС‚РѕРє">вњЏпёЏ</button>
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
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#22c55e' }}>РџСЂРµРјРёСЏ РјР°СЃС‚РµСЂСѓ</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="РЎСѓРјРјР°" value={bonusAmount}
                        onChange={e => setBonusAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddBonus}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#22c55e' }}>
                        РќР°С‡РёСЃР»РёС‚СЊ
                      </button>
                    </div>
                    <input type="text" placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ (Р·Р° С‡С‚Рѕ РїСЂРµРјРёСЏ)" value={bonusNote}
                      onChange={e => setBonusNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Fine form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#ef4444' }}>РЁС‚СЂР°С„ РјР°СЃС‚РµСЂСѓ</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="РЎСѓРјРјР°" value={fineAmount}
                        onChange={e => setFineAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddFine}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
                        Р’С‹РїРёСЃР°С‚СЊ С€С‚СЂР°С„
                      </button>
                    </div>
                    <input type="text" placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ (Р·Р° С‡С‚Рѕ С€С‚СЂР°С„)" value={fineNote}
                      onChange={e => setFineNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Write-off form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3" style={{ color: '#ef4444' }}>РЎРїРёСЃР°РЅРёРµ РјР°СЃС‚РµСЂСѓ</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="РЎСѓРјРјР°" value={writeOffAmount}
                        onChange={e => setWriteOffAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={handleAddWriteOff}
                        className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
                        РЎРїРёСЃР°С‚СЊ
                      </button>
                    </div>
                    <input type="text" placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ (Р·Р° С‡С‚Рѕ СЃРїРёСЃР°РЅРёРµ)" value={writeOffNote}
                      onChange={e => setWriteOffNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Payout form */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3">Р’С‹РїР»Р°С‚Р° РјР°СЃС‚РµСЂСѓ</h3>
                    <div className="flex gap-2 mb-3">
                      <input type="number" placeholder="РЎСѓРјРјР°" value={salaryPayAmount}
                        onChange={e => setSalaryPayAmount(e.target.value)}
                        className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                      <button onClick={async () => {
                        const amount = Number(salaryPayAmount);
                        if (!amount || amount < 1) return;
                        const balance = Number(salaryDetail.balanceToPay ?? 0);
                        if (amount > balance) {
                          const ok = window.confirm(
                            `РЎСѓРјРјР° ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РїСЂРµРІС‹С€Р°РµС‚ РґРѕСЃС‚СѓРїРЅС‹Р№ Р±Р°Р»Р°РЅСЃ (${balance.toLocaleString('ru')} в‚Ѕ) Р·Р° РїРµСЂРёРѕРґ. Р’С‹РґР°С‚СЊ СЃРІРµСЂС… Р±Р°Р»Р°РЅСЃР°?`
                          );
                          if (!ok) return;
                        }
                        setSalaryLoading(true);
                        try {
                          const periodLabel = salaryPeriod === 'day' ? 'РґРµРЅСЊ' : salaryPeriod === 'week' ? 'РЅРµРґРµР»СЋ' : salaryPeriod === 'month' ? 'РјРµСЃСЏС†' : salaryPeriod === 'custom' ? 'РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ' : 'РІРµСЃСЊ РїРµСЂРёРѕРґ';
                          await apiRequest<{ message: string; payoutId: string; newBalance: number; expenseId: string }>(
                            `/api/owner/workers/${selectedSalaryWorkerId}/pay-salary`, {
                            method: 'POST',
                            body: {
                              period: salaryPeriod,
                              segment: salarySegment,
                              amount: Math.round(amount),
                              note: salaryPayNote.trim() || `Р’С‹РїР»Р°С‚Р° Р·Р° ${periodLabel}`,
                              clientRequestId: salaryPayRequestId,
                              ...(salaryPeriod === 'custom' ? { dateFrom: salaryDateFrom, dateTo: salaryDateTo } : {}),
                            },
                          });
                          setSalaryPayAmount('');
                          setSalaryPayNote('');
                          setSalaryPayRequestId(newPayRequestId());
                          setBottomToast(`Р’С‹РїР»Р°С‚Р° ${Math.round(amount).toLocaleString('ru')} в‚Ѕ РґР»СЏ ${salaryDetail.workerName} РїСЂРѕРІРµРґРµРЅР°`);
                          setTimeout(() => setBottomToast(null), 3000);
                          refreshSalaryDetail();
                        } catch (e) {
                          setBottomToast(e instanceof Error ? e.message : 'РћС€РёР±РєР° РІС‹РїР»Р°С‚С‹');
                          setTimeout(() => setBottomToast(null), 4000);
                        } finally { setSalaryLoading(false); }
                      }} className="px-4 rounded-xl text-sm font-semibold text-white" style={{ background: primary }}>
                        {salaryLoading ? '...' : 'Р’С‹РїР»Р°С‚РёС‚СЊ'}
                      </button>
                    </div>
                    <input type="text" placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)" value={salaryPayNote}
                      onChange={e => setSalaryPayNote(e.target.value)}
                      className={`w-full ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  </div>

                  {/* Operations history */}
                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-2">РСЃС‚РѕСЂРёСЏ РѕРїРµСЂР°С†РёР№</h3>
                    {salaryDetail.entries.length === 0 ? (
                      <div className={`text-xs ${sub} py-3 text-center`}>РћРїРµСЂР°С†РёР№ РЅРµ Р±С‹Р»Рѕ</div>
                    ) : (
                      salaryDetail.entries.slice(0, 20).map(e => {
                        const isEditing = editingEntryId === e.id;
                        const kindLabel: Record<string, string> = {
                          bonus: 'РџСЂРµРјРёСЏ', deduction: 'РЁС‚СЂР°С„', payout: 'Р’С‹РїР»Р°С‚Р°',
                          advance: 'РђРІР°РЅСЃ', adjustment: 'РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР°',
                        };
                        const kindColor: Record<string, string> = {
                          bonus: '#22c55e', deduction: '#ef4444', payout: isDark ? '#E4E4E7' : '#131316',
                          advance: '#f59e0b', adjustment: '#3b82f6',
                        };
                        const canEdit = e.kind === 'payout' || e.kind === 'deduction' || e.kind === 'bonus';
                        return (
                          <div key={e.id} className="flex items-start justify-between py-2 border-b gap-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            {isEditing ? (
                              <div className="flex-1 min-w-0">
                                <div className="flex gap-2 mb-1">
                                  <input type="number" value={editAmount} onChange={e2 => setEditAmount(e2.target.value)} className={`${inputCls} flex-1 text-xs py-1 px-2 rounded-lg`} />
                                  <button onClick={handleUpdateEntry} className="p-1 rounded-lg text-white" style={{ background: primary }}><Check size={14} strokeWidth={1.75} /></button>
                                  <button onClick={() => { void handleDeleteEntry(); }} title="РЈРґР°Р»РёС‚СЊ РѕРїРµСЂР°С†РёСЋ" className="p-1 rounded-lg border" style={{ borderColor: '#ef444440', color: '#ef4444' }}><Trash2 size={14} strokeWidth={1.75} /></button>
                                  <button onClick={() => setEditingEntryId(null)} className="p-1 rounded-lg border" style={{ borderColor: `${primary}40`, color: sub }}><X size={14} strokeWidth={1.75} /></button>
                                </div>
                                <input type="text" value={editNote} onChange={e2 => setEditNote(e2.target.value)} placeholder="РџСЂРёРјРµС‡Р°РЅРёРµ" className={`${inputCls} w-full text-xs py-1 px-2 rounded-lg`} />
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium">
                                    <span className="font-semibold" style={{ color: kindColor[e.kind] || sub }}>{kindLabel[e.kind] || e.kind}</span>
                                    {' В· '}{e.amount.toLocaleString('ru')} в‚Ѕ
                                  </div>
                                  {e.note && <div className={`text-[10px] ${sub}`}>{e.note}</div>}
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-1">
                                  <div>
                                    <div className="text-[11px] font-medium">{e.entryDate || new Date(e.createdAt).toLocaleDateString('ru')}</div>
                                    <div className={`text-[10px] ${sub}`}>{e.createdByName}</div>
                                  </div>
                                  {canEdit && <button onClick={() => { setEditingEntryId(e.id); setEditAmount(String(e.amount)); setEditNote(e.note || ''); }} className="p-1 rounded hover:bg-white/10" style={{ color: sub }}><Edit3 size={12} strokeWidth={1.75} /></button>}
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

          {/* в”Ђв”Ђ STOCK в”Ђв”Ђ */}
          {page === 'stock' && (
            <OwnerStockPage shiftChecklists={shiftChecklists} adminShiftInspections={adminShiftInspections} />
          )}

          {/* в”Ђв”Ђ WALLET в”Ђв”Ђ */}
          {(page === 'wallet' || (page === 'settings' && settingsSection === 'wallet')) && (
            <OwnerWalletScreen
              walletData={walletData}
              walletLoading={walletLoading}
              onReload={() => { void loadWallet(walletDateFrom || undefined, walletDateTo || undefined); }}
              dateFrom={walletDateFrom}
              onClearDates={() => { setWalletDateFrom(''); setWalletDateTo(''); }}
              isSettingsContext={page === 'settings'}
              onBack={() => setSettingsSection(null)}
              onStartAddIncome={() => { setIncomeForm(p => ({ ...p, date: todayLabel })); setShowAddIncome(true); }}
              onStartAddExpense={() => { setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }}
              archiveHighlight={archiveHighlight}
              highlightId={archiveHighlightId}
              onEditIncome={openEditIncome}
              onEditExpense={openEditExpense}
              primary={primary}
              accent={accent}
              glass={glass}
              sub={sub}
              isDark={isDark}
            />
          )}

          {/* в”Ђв”Ђ PIGGY BANK / FINANCE HUB в”Ђв”Ђ */}
          {page === 'piggy-bank' && (
            <OwnerPiggyBankScreen
              piggyBank={piggyBank}
              piggyBankBalance={piggyBankBalance}
              piggyBankTxs={piggyBankTxs}
              piggyBankLoading={piggyBankLoading}
              piggyTab={piggyTab}
              setPiggyTab={setPiggyTab}
              piggyTxExpanded={piggyTxExpanded}
              setPiggyTxExpanded={setPiggyTxExpanded}
              dateFrom={piggyDateFrom}
              onClearDates={() => { setPiggyDateFrom(''); setPiggyDateTo(''); }}
              onReload={() => { void loadPiggyBank(piggyDateFrom || undefined, piggyDateTo || undefined); }}
              onExport={handlePiggyBankExport}
              exportingKind={exportingKind}
              onOpenAdjust={openPiggyAdjust}
              onOpenWithdraw={openPiggyWithdraw}
              onOpenArchives={() => setShowArchivesModal(true)}
              archiveHighlight={archiveHighlight}
              highlightId={archiveHighlightId}
              onSelectBooking={(booking) => { setSelectedBooking(booking); setShowBookingDetail(true); }}
              primary={primary}
              glass={glass}
              sub={sub}
              isDark={isDark}
            />
          )}

          {/* в”Ђв”Ђ REPORTS в”Ђв”Ђ */}
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
              const reportTopServiceName = [...reportByService].sort((left, right) => right.revenue - left.revenue)[0]?.name || 'РќРµС‚ РґР°РЅРЅС‹С…';
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
              const reportReferralData = (() => {
                const map = new Map<string, { label: string; count: number; revenue: number }>();
                reportCompletedBookings.forEach((b) => {
                  const src = (b.referralSource?.trim() || 'РќРµ СѓРєР°Р·Р°РЅРѕ');
                  const cur = map.get(src) || { label: src, count: 0, revenue: 0 };
                  cur.count += 1;
                  cur.revenue += b.price;
                  map.set(src, cur);
                });
                return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.count - a.count);
              })();
              const reportReferralTotal = reportReferralData.reduce((s, r) => s + r.count, 0);
              return (
            <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">РћС‚С‡С‘С‚С‹</h2>
                <div className="flex gap-1.5">
                  <button onClick={() => { setPage('settings'); setSettingsSection('money-flow'); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: `${primary}18`, color: primary }}>
                    <ArrowLeftRight size={12} strokeWidth={1.75} />Р”РІРёР¶РµРЅРёРµ РґРµРЅРµРі
                  </button>
                  <button onClick={() => openExportModal('report')} disabled={exportingKind !== null} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white disabled:opacity-60" style={{ background: accent }}>
                    <Download size={12} strokeWidth={1.75} />{exportingKind === 'report' ? '...' : 'Excel'}
                  </button>
                  <button onClick={() => openExportModal('pdf')} disabled={exportingKind !== null} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white disabled:opacity-60" style={{ background: accent }}>
                    <Download size={12} strokeWidth={1.75} />{exportingKind === 'pdf' ? '...' : 'PDF'}
                  </button>
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="text-xs text-[#71717A] mb-3">РЎРІРѕРґРЅС‹Рµ Telegram-РѕС‚С‡С‘С‚С‹</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { period: 'daily', segment: 'wash', label: 'Р”РµРЅСЊ В· РјРѕР№РєР°' },
                    { period: 'daily', segment: 'detailing', label: 'Р”РµРЅСЊ В· РґРµС‚РµР№Р»РёРЅРі' },
                    { period: 'weekly', segment: 'wash', label: 'РќРµРґРµР»СЏ В· РјРѕР№РєР°' },
                    { period: 'weekly', segment: 'detailing', label: 'РќРµРґРµР»СЏ В· РґРµС‚РµР№Р»РёРЅРі' },
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
                        {sendingSummaryReport === key ? 'РћС‚РїСЂР°РІРєР°...' : item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: 'РЎСЂРµРґРЅРёР№ С‡РµРє', value: `${reportAverageCheck.toLocaleString('ru')} в‚Ѕ`, color: primary },
                  { label: 'РўРѕРї-СѓСЃР»СѓРіР°', value: reportTopServiceName, color: '#312E81' },
                  { label: 'РђРєС‚РёРІРЅС‹С… РєР»РёРµРЅС‚РѕРІ', value: clientInsights.filter((client) => client.activeCount > 0).length, color: accent },
                  { label: 'Р”РѕР»РіРё РєР»РёРµРЅС‚РѕРІ', value: `${clientInsights.reduce((sum, client) => sum + client.debtBalance, 0).toLocaleString('ru')} в‚Ѕ`, color: '#EF4444' },
                ].map((item) => (
                  <div key={item.label} className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub}`}>{item.label}</div>
                    <div className="font-bold mt-2" style={{ color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>Р¤РРќРђРќРЎРћР’Р«Р™ РРўРћР“</div>
                {[
                  { label: 'Р’С‹СЂСѓС‡РєР°', value: `${reportTotalRevenue.toLocaleString('ru')} в‚Ѕ`, color: accent },
                  { label: 'Р”РѕРї. РґРѕС…РѕРґС‹', value: `${reportTotalIncomes.toLocaleString('ru')} в‚Ѕ`, color: primary },
                  { label: 'Р Р°СЃС…РѕРґС‹', value: `${reportTotalExpenses.toLocaleString('ru')} в‚Ѕ`, color: '#FF6B6B' },
                  { label: 'РџСЂРёР±С‹Р»СЊ', value: `${Math.abs(reportProfit).toLocaleString('ru')} в‚Ѕ${reportProfit < 0 ? ' (СѓР±С‹С‚РѕРє)' : ''}`, color: reportProfit >= 0 ? accent : '#FF6B6B' },
                  { label: 'РњР°СЂР¶Р°', value: `${reportTotalRevenue > 0 ? Math.round((reportProfit / reportTotalRevenue) * 100) : 0}%`, color: '#312E81' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* РћС‚РєСѓРґР° СѓР·РЅР°Р»Рё */}
              {reportReferralData.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs ${sub} mb-3`}>РћРўРљРЈР”Рђ РЈР—РќРђР›Р В· {reportReferralTotal} Р·Р°РІРµСЂС€С‘РЅРЅС‹С… Р·Р°РїРёСЃРµР№</div>
                  <div className="flex gap-4 items-center">
                    <div className="w-[140px] h-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={reportReferralData} dataKey="count" nameKey="label" innerRadius={36} outerRadius={62} paddingAngle={2} strokeWidth={0}>
                            {reportReferralData.map((entry, idx) => {
                              const palette = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#71717A'];
                              return <Cell key={entry.label} fill={palette[idx % palette.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any, _n: any, p: any) => [`${v} Р·Р°Рї. В· ${p.payload.revenue.toLocaleString('ru')} в‚Ѕ`, p.payload.label]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {reportReferralData.map((row, idx) => {
                        const palette = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#71717A'];
                        const pct = reportReferralTotal > 0 ? Math.round((row.count / reportReferralTotal) * 100) : 0;
                        return (
                          <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: palette[idx % palette.length] }} />
                              <span className="truncate font-medium">{row.label}</span>
                              <span className={sub}>В· {pct}%</span>
                            </span>
                            <span className="shrink-0 tabular-nums font-semibold">{row.count} В· {row.revenue.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className={`mt-3 pt-3 border-t text-[11px] ${sub}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    РЎС‡РёС‚Р°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ Р·Р°РІРµСЂС€С‘РЅРЅС‹Рµ Р·Р°РїРёСЃРё Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ. РСЃС‚РѕС‡РЅРёРє Р±РµСЂС‘С‚СЃСЏ РёР· РєР°СЂС‚РѕС‡РєРё Р·Р°РїРёСЃРё (В«РћС‚РєСѓРґР° СѓР·РЅР°Р»В»).
                  </div>
                </div>
              )}

              {/* РљРѕРїРёР»РєР° РІ РѕС‚С‡С‘С‚Р°С… */}
              {piggyBank && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium ${sub} uppercase tracking-wider`}>рџ’° РљРћРџРР›РљРђ</span>
                    <button onClick={handlePiggyBankExport} disabled={exportingKind !== null}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white disabled:opacity-60" style={{ background: accent }}>
                      <Download size={11} strokeWidth={1.75} />{exportingKind === 'piggy-bank' ? '...' : 'Excel'}
                    </button>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className={sub}>Р‘Р°Р»Р°РЅСЃ</span>
                    <span className="font-semibold" style={{ color: piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>{piggyBankBalance.toLocaleString('ru')} в‚Ѕ</span>
                  </div>
                  {piggyBank.detailing && (
                    <>
                      <div className="flex justify-between py-2 text-sm">
                        <span className={sub}>РќР°С‡РёСЃР»РµРЅРѕ 24%</span>
                        <span style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm">
                        <span className={sub}>РЎРЅСЏС‚Рѕ РЅР° РјР°С‚РµСЂРёР°Р»С‹</span>
                        <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р’РѕР·РІСЂР°С‚ РјР°С‚РµСЂРёР°Р»РѕРІ</span>
                        <span style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Р”РѕС…РѕРґС‹ */}
              {reportFilteredIncomes.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs ${sub} mb-3`}>Р”РћРҐРћР”Р«</div>
                  <div className="space-y-2">
                    {reportFilteredIncomes.slice(0, 10).map(inc => (
                      <div key={inc.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div>
                          <div className="text-sm font-medium">{inc.source}</div>
                          <div className={`text-xs ${sub}`}>{inc.date}{inc.note ? ` В· ${inc.note}` : ''}</div>
                        </div>
                        <div className="font-semibold text-sm" style={{ color: primary }}>+{inc.amount.toLocaleString('ru')} в‚Ѕ</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Services chart */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>Р’Р«Р РЈР§РљРђ РџРћ РЈРЎР›РЈР“РђРњ</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={reportByService} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: isDark ? '#A1A1AA' : '#71717A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: isDark ? '#A1A1AA' : '#71717A' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill={primary} radius={[4, 4, 0, 0]} name="Р’С‹СЂСѓС‡РєР°" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>Р—РђР“Р РЈР—РљРђ РџРћ Р‘РћРљРЎРђРњ</div>
                <div className="space-y-3">
                  {reportBoxLoadData.map((box) => (
                    <div key={box.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{box.name}</span>
                        <span className={`text-xs ${sub}`}>{box.count} Р·Р°РїРёСЃРµР№ В· {box.revenue.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, box.count * 18)}%`, background: primary }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-3`}>Р­Р¤Р¤Р•РљРўРР’РќРћРЎРўР¬ РњРђРЎРўР•Р РћР’</div>
                <div className="space-y-2">
                  {reportWorkerEfficiencyData.map((worker) => (
                    <div key={worker.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{worker.name}</div>
                        <div className={`text-xs ${sub}`}>{worker.completed} Р·Р°РІРµСЂС€С‘РЅРЅС‹С… В· СЃСЂРµРґРЅРёР№ С‡РµРє {worker.averageCheck.toLocaleString('ru')} в‚Ѕ</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">{worker.revenue.toLocaleString('ru')} в‚Ѕ</div>
                        <div className={`text-xs ${sub}`}>РІС‹СЂСѓС‡РєР°</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-xs ${sub} uppercase tracking-wider`}>РљР»РёРµРЅС‚СЃРєРёРµ РєР°СЂС‚РѕС‡РєРё</div>
                    <div className={`text-xs ${sub} mt-1`}>РСЃС‚РѕСЂРёСЏ РІРёР·РёС‚РѕРІ, С‚СЂР°С‚С‹, Р»СЋР±РёРјС‹Рµ СѓСЃР»СѓРіРё, Р·Р°РјРµС‚РєРё Рё РґРѕР»РіРё</div>
                  </div>
                  <button
                    onClick={() => setShowCreateClient(true)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-1.5"
                    style={{ background: primary }}
                  >
                    <Plus size={14} strokeWidth={1.75} />
                    РќРѕРІС‹Р№ РєР»РёРµРЅС‚
                  </button>
                </div>
                <input
                  className={inputCls}
                  placeholder="РџРѕРёСЃРє РїРѕ РёРјРµРЅРё, С‚РµР»РµС„РѕРЅСѓ, Р°РІС‚Рѕ, СѓСЃР»СѓРіРµ"
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
                            <div className="font-semibold flex items-center gap-2 flex-wrap">{client.name}<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${primary}14`, color: primary, border: `1px solid ${primary}22` }}>{client.referralSource?.trim() || 'РќРµ СѓРєР°Р·Р°РЅРѕ'}</span></div>
                            <div className={`text-xs ${sub}`}>{client.phone} В· {client.car || 'РђРІС‚Рѕ РЅРµ СѓРєР°Р·Р°РЅРѕ'} {client.plate ? `В· ${client.plate}` : ''} В· <span className="font-medium">РћС‚РєСѓРґР°: {client.referralSource?.trim() || 'РќРµ СѓРєР°Р·Р°РЅРѕ'}</span></div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{client.totalSpent.toLocaleString('ru')} в‚Ѕ</div>
                            <div className={`text-xs ${sub}`}>{client.visits} РІРёР·РёС‚РѕРІ В· РїРѕСЃР»РµРґРЅРёР№ {client.lastVisit}</div>
                            <div className="mt-2 flex gap-3">
                              <button
                                type="button"
                                onClick={() => openBookingForClient(client, 'completed')}
                                className="text-xs font-medium"
                                style={{ color: primary }}
                              >
                                + РџСЂРѕС€Р»Р°СЏ Р·Р°РїРёСЃСЊ
                              </button>
                              <button
                                type="button"
                                onClick={() => openBookingForClient(client, 'confirmed')}
                                className="text-xs font-medium"
                                style={{ color: primary }}
                              >
                                + РќРѕРІР°СЏ Р·Р°РїРёСЃСЊ
                              </button>
                            </div>
                          </div>
                        </div>
                        {(client.adminNote || draft.adminNote) && (
                          <div className={`rounded-xl px-3 py-2.5 mb-3 text-sm border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>вљ‘ РџСЂРёРјРµС‡Р°РЅРёРµ:</div>
                            {draft.adminNote || client.adminNote}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Р›СЋР±РёРјР°СЏ СѓСЃР»СѓРіР°</div>
                            <div className="text-sm font-medium mt-1">{client.favoriteService}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>РђРєС‚РёРІРЅС‹С… Р·Р°РїРёСЃРµР№</div>
                            <div className="text-sm font-medium mt-1">{client.activeCount}</div>
                          </div>
                          <div className={`${glass} rounded-xl px-3 py-2`}>
                            <div className={`text-[11px] ${sub}`}>Р”РѕР»Рі</div>
                            <div className="text-sm font-medium mt-1">{client.debtBalance.toLocaleString('ru')} в‚Ѕ</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <textarea
                            className={`${inputCls} h-24 resize-none`}
                            placeholder="Р—Р°РјРµС‚РєРё РїРѕ РєР»РёРµРЅС‚Сѓ"
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
                              placeholder="Р”РѕР»Рі РєР»РёРµРЅС‚Р°"
                              value={draft.debtBalance}
                              onChange={(event) => setClientCardDrafts((current) => ({
                                ...current,
                                [client.id]: { ...draft, debtBalance: event.target.value },
                              }))}
                            />
                            <textarea
                              className={`${inputCls} h-20 resize-none`}
                              placeholder="РћСЃРѕР±РѕРµ РїСЂРёРјРµС‡Р°РЅРёРµ (РІСЃРµРіРґР° РІРёРґРЅРѕ)"
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
                              {savingClientId === client.id ? 'РЎРѕС…СЂР°РЅСЏРµРј...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ РєР°СЂС‚РѕС‡РєСѓ'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <h3 className={`text-xs font-medium ${sub} mb-3`}>Р РђРЎРҐРћР”Р«</h3>
              {expenses.map(e => (
                <div key={e.id} className={`${glass} rounded-xl p-3 mb-2 flex justify-between`}>
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className={`text-xs ${sub}`}>{e.category} В· {e.date}</div>
                  </div>
                  <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>в€’{e.amount.toLocaleString('ru')} в‚Ѕ</div>
                </div>
              ))}
              </motion.div>
            );
          })()
        )}

          {/* в”Ђв”Ђ SETTINGS: MONEY FLOW (РґРІРёР¶РµРЅРёРµ РґРµРЅРµРі) в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'money-flow' && !selectedHistoryBookingId && (
            <motion.div key="settings-money-flow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-1">Р”РІРёР¶РµРЅРёРµ РґРµРЅРµРі</h2>
              <p className={`text-xs ${sub} mb-4`}>РљР°Р¶РґС‹Р№ СЂСѓР±Р»СЊ: РєР°Рє РїСЂРёС€С‘Р», РєСѓРґР° СЂР°СЃРїСЂРµРґРµР»РёР»СЃСЏ Рё РєРѕРјСѓ СЃРєРѕР»СЊРєРѕ РІС‹РїР»Р°С‚РёР»Рё.</p>

              {/* РџРµСЂРёРѕРґ */}
              <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                {[{ id: 'day', label: 'Р”РµРЅСЊ' }, { id: 'week', label: 'РќРµРґРµР»СЏ' }, { id: 'month', label: 'РњРµСЃСЏС†' }, { id: 'year', label: 'Р“РѕРґ' }, { id: 'all', label: 'Р’СЃС‘' }, { id: 'custom', label: 'РЎРІРѕРё' }].map(option => (
                  <button key={option.id} onClick={() => setMoneyFlowPeriod(option.id as typeof moneyFlowPeriod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${moneyFlowPeriod === option.id ? 'text-white' : glass}`}
                    style={moneyFlowPeriod === option.id ? { background: primary } : undefined}>
                    {option.label}
                  </button>
                ))}
              </div>
              {moneyFlowPeriod === 'custom' && (
                <div className="flex gap-2 mb-3">
                  <input type="date" value={moneyFlowDateFrom} onChange={e => setMoneyFlowDateFrom(e.target.value)} className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                  <input type="date" value={moneyFlowDateTo} onChange={e => setMoneyFlowDateTo(e.target.value)} className={`flex-1 ${inputCls} rounded-xl px-3 py-2 text-sm`} />
                </div>
              )}

              {moneyFlowLoading && !moneyFlowData ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <RefreshCw size={20} className={`mx-auto mb-2 animate-spin ${sub}`} />
                  <div className={`text-sm ${sub}`}>Р—Р°РіСЂСѓР·РєР°вЂ¦</div>
                </div>
              ) : !moneyFlowData ? (
                <div className={`${glass} rounded-2xl p-8 text-center text-sm ${sub}`}>РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РїРµСЂРёРѕРґ</div>
              ) : (() => {
                const s = moneyFlowData.summary;
                const kindColor: Record<string, string> = { in: '#10B981', out: '#EF4444', allocation: '#8B5CF6', move: '#94A3B8' };
                const typeMeta: Record<string, { color: string; label: string }> = {
                  booking_payment: { color: '#10B981', label: 'Р’С‹СЂСѓС‡РєР°' },
                  booking_deposit_payment: { color: '#0EA5E9', label: 'РћРїР»Р°С‚Р° СЃ РґРµРїРѕР·РёС‚Р°' },
                  booking_unpaid: { color: '#F59E0B', label: 'РќРµ РѕРїР»Р°С‡РµРЅРѕ' },
                  income: { color: '#22C55E', label: 'Р”РѕС…РѕРґ' },
                  deposit_topup: { color: '#0EA5E9', label: 'РџРѕРїРѕР»РЅРµРЅРёРµ РґРµРїРѕР·РёС‚Р°' },
                  deposit_adjust: { color: '#0EA5E9', label: 'РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° РґРµРїРѕР·РёС‚Р°' },
                  expense: { color: '#EF4444', label: 'Р Р°СЃС…РѕРґ' },
                  payout_worker: { color: '#F59E0B', label: 'Р’С‹РїР»Р°С‚Р° РјР°СЃС‚РµСЂСѓ' },
                  payout_owner: { color: '#8B5CF6', label: 'Р’С‹РїР»Р°С‚Р° РІР»Р°РґРµР»СЊС†Сѓ' },
                  advance: { color: '#F97316', label: 'РђРІР°РЅСЃ' },
                  salary_bonus: { color: '#22C55E', label: 'РџСЂРµРјРёСЏ' },
                  salary_deduction: { color: '#EF4444', label: 'Р’С‹С‡РµС‚ РёР· Р·Р°СЂРїР»Р°С‚С‹' },
                  salary_adjustment: { color: '#64748B', label: 'РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° Р·Р°СЂРїР»Р°С‚С‹' },
                  piggy_withdrawal: { color: '#94A3B8', label: 'РЎРЅСЏС‚РёРµ РёР· РєРѕРїРёР»РєРё' },
                  piggy_adjust: { color: '#94A3B8', label: 'РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР° РєРѕРїРёР»РєРё' },
                  piggy_repayment: { color: '#94A3B8', label: 'Р’РѕР·РІСЂР°С‚ РІ РєРѕРїРёР»РєСѓ' },
                  piggy_deposit_return: { color: '#94A3B8', label: 'Р’РѕР·РІСЂР°С‚ РјРѕРµРє РІ РєРѕРїРёР»РєСѓ' },
                };
                const fmt = (n: number) => `${n < 0 ? 'в€’' : ''}${Math.abs(n).toLocaleString('ru-RU')} в‚Ѕ`;
                const flowIcon = (entry: MoneyFlowEntry) => {
                  if (entry.type.startsWith('piggy_')) return PiggyBank;
                  if (entry.type === 'payout_owner') return Crown;
                  if (entry.kind === 'in') return TrendingUp;
                  if (entry.kind === 'out') return TrendingDown;
                  if (entry.kind === 'allocation') return Split;
                  return ArrowLeftRight;
                };
                const workersPeople = moneyFlowData.people.filter(p => p.role === 'worker');
                const ownersPeople = moneyFlowData.people.filter(p => p.role === 'owner');
                const filtered = moneyFlowData.entries.filter(e => moneyFlowFilter === 'all' || e.kind === moneyFlowFilter);
                // РіСЂСѓРїРїРёСЂРѕРІРєР° РїРѕ РґРЅСЏРј
                const dayGroups: Array<{ date: string; items: MoneyFlowEntry[]; cashIn: number; cashOut: number }> = [];
                for (const e of filtered) {
                  let g = dayGroups.find(x => x.date === e.date);
                  if (!g) { g = { date: e.date, items: [], cashIn: 0, cashOut: 0 }; dayGroups.push(g); }
                  g.items.push(e);
                  if (e.kind === 'in') g.cashIn += e.amount;
                  if (e.kind === 'out') g.cashOut += e.amount;
                }
                return (
                  <>
                    {/* РЎРІРѕРґРєР° */}
                    <div className={`${glass} rounded-2xl p-4 mb-3`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs font-medium ${sub}`}>РљРђРЎРЎРђ Р—Рђ РџР•Р РРћР”</span>
                        <span className="text-xs font-semibold" style={{ color: s.cashBalance >= 0 ? '#10B981' : '#EF4444' }}>{fmt(s.cashBalance)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMoneyFlowFilter('in')} className="rounded-xl p-3 text-left" style={{ background: `${kindColor.in}14` }}>
                          <div className={`text-[11px] ${sub} mb-1`}>РџСЂРёС€Р»Рѕ</div>
                          <div className="font-semibold text-base" style={{ color: kindColor.in }}>+{s.totalIn.toLocaleString('ru-RU')} в‚Ѕ</div>
                        </button>
                        <button onClick={() => setMoneyFlowFilter('out')} className="rounded-xl p-3 text-left" style={{ background: `${kindColor.out}14` }}>
                          <div className={`text-[11px] ${sub} mb-1`}>Р’С‹С€Р»Рѕ</div>
                          <div className="font-semibold text-base" style={{ color: kindColor.out }}>в€’{s.totalOut.toLocaleString('ru-RU')} в‚Ѕ</div>
                        </button>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {[
                          { label: 'Р’С‹СЂСѓС‡РєР° РїРѕ Р·Р°РїРёСЃСЏРј', v: s.bookingRevenue, hint: `${s.bookingCount} Р·Р°Рї.` },
                          { label: 'РџСЂРѕС‡РёРµ РґРѕС…РѕРґС‹', v: s.otherIncome },
                          { label: 'РџРѕРїРѕР»РЅРµРЅРёСЏ РґРµРїРѕР·РёС‚РѕРІ (РїСЂРµРґРѕРїР»Р°С‚Р°)', v: s.depositTopups },
                          { label: 'Р’С‹РїР»Р°С‚С‹ РјР°СЃС‚РµСЂР°Рј', v: s.workerPayouts },
                          { label: 'Р’С‹РїР»Р°С‚С‹ РІР»Р°РґРµР»СЊС†Р°Рј', v: s.ownerPayouts },
                          { label: 'РђРІР°РЅСЃС‹', v: s.advances },
                          { label: 'Р Р°СЃС…РѕРґС‹', v: s.expensesTotal },
                        ].filter(r => r.v !== 0 || r.label.startsWith('Р’С‹СЂСѓС‡РєР°')).map(r => (
                          <div key={r.label} className="flex justify-between text-xs">
                            <span className={sub}>{r.label}{r.hint ? ` В· ${r.hint}` : ''}</span>
                            <span className="font-medium tabular-nums">{fmt(r.v)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
                        <div className={`text-xs font-medium ${sub} mb-1.5`}>Р РђРЎРџР Р•Р”Р•Р›Р•РќРћ РџРћ Р—РђРџРРЎРЇРњ</div>
                        <div className="space-y-1.5">
                          {[
                            { label: 'РњР°СЃС‚РµСЂР°Рј РЅР°С‡РёСЃР»РµРЅРѕ', v: s.allocatedWorkers, c: '#F59E0B' },
                            { label: 'Р’ РєРѕРїРёР»РєСѓ', v: s.allocatedPiggy, c: '#F59E0B' },
                            { label: 'Р’Р»Р°РґРµР»СЊС†Р°Рј', v: s.allocatedOwners, c: '#8B5CF6' },
                            { label: 'РњР°С‚РµСЂРёР°Р»С‹', v: s.allocatedMaterials, c: '#EF4444' },
                            { label: 'РђСѓС‚СЃРѕСЂСЃ', v: s.allocatedOutsource, c: '#0EA5E9' },
                          ].filter(r => r.v !== 0).map(r => (
                            <div key={r.label} className="flex justify-between text-xs">
                              <span className={sub}>{r.label}</span>
                              <span className="font-medium tabular-nums" style={{ color: r.c }}>{fmt(r.v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Р›СЋРґРё: РєРѕРјСѓ СЃРєРѕР»СЊРєРѕ РІС‹РїР»Р°С‚РёР»Рё */}
                    {(workersPeople.length > 0 || ownersPeople.length > 0) && (
                      <div className={`${glass} rounded-2xl p-4 mb-3`}>
                        <div className={`text-xs font-medium ${sub} mb-3`}>РљРћРњРЈ РЎРљРћР›Р¬РљРћ Р’Р«РџР›РђРўРР›Р</div>
                        <div className="space-y-2">
                          {workersPeople.map(p => (
                            <div key={p.personId} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F59E0B18' }}>
                                <Users size={14} strokeWidth={1.75} style={{ color: '#F59E0B' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{p.personName}</div>
                                <div className={`text-[11px] ${sub}`}>РќР°С‡РёСЃР»РµРЅРѕ {p.accrued.toLocaleString('ru-RU')} В· Р’С‹РїР»Р°С‡РµРЅРѕ {p.paid.toLocaleString('ru-RU')}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={`text-sm font-semibold tabular-nums`} style={{ color: p.balance > 0 ? '#10B981' : p.balance < 0 ? '#EF4444' : '#94A3B8' }}>
                                  {p.balance > 0 ? '+' : ''}{p.balance.toLocaleString('ru-RU')} в‚Ѕ
                                </div>
                                {p.balance > 0 && <div className={`text-[11px] ${sub}`}>Рє РІС‹РїР»Р°С‚Рµ</div>}
                              </div>
                            </div>
                          ))}
                          {ownersPeople.map(p => (
                            <div key={p.personId} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#8B5CF618' }}>
                                <Crown size={14} strokeWidth={1.75} style={{ color: '#8B5CF6' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{p.personName}</div>
                                <div className={`text-[11px] ${sub}`}>Р”РѕР»СЏ РїСЂРёР±С‹Р»Рё {p.accrued.toLocaleString('ru-RU')} В· Р’С‹РїР»Р°С‡РµРЅРѕ {p.paid.toLocaleString('ru-RU')}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={`text-sm font-semibold tabular-nums`} style={{ color: p.balance > 0 ? '#8B5CF6' : '#94A3B8' }}>
                                  {p.balance.toLocaleString('ru-RU')} в‚Ѕ
                                </div>
                                {p.balance > 0 && <div className={`text-[11px] ${sub}`}>Рє РІС‹РїР»Р°С‚Рµ</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Р¤РёР»СЊС‚СЂ С‚РёРїРѕРІ */}
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                      {[{ id: 'all', label: 'Р’СЃРµ' }, { id: 'in', label: 'РџСЂРёС…РѕРґ' }, { id: 'allocation', label: 'Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ' }, { id: 'out', label: 'Р’С‹РїР»Р°С‚С‹' }].map(option => (
                        <button key={option.id} onClick={() => setMoneyFlowFilter(option.id as typeof moneyFlowFilter)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${moneyFlowFilter === option.id ? 'text-white' : glass}`}
                          style={moneyFlowFilter === option.id ? { background: primary } : undefined}>
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* Р–СѓСЂРЅР°Р» РїРѕ РґРЅСЏРј */}
                    {dayGroups.length === 0 ? (
                      <div className={`${glass} rounded-2xl p-8 text-center text-sm ${sub}`}>РћРїРµСЂР°С†РёР№ РЅРµ РЅР°Р№РґРµРЅРѕ</div>
                    ) : dayGroups.map(group => (
                      <div key={group.date} className="mb-4">
                        <div className="flex justify-between items-baseline mb-2 px-1">
                          <span className={`text-xs font-semibold ${sub}`}>{group.date}</span>
                          <span className="text-[11px] tabular-nums">
                            {group.cashIn > 0 && <span style={{ color: kindColor.in }}>+{group.cashIn.toLocaleString('ru-RU')}</span>}
                            {group.cashIn > 0 && group.cashOut > 0 && <span className={sub}> В· </span>}
                            {group.cashOut > 0 && <span style={{ color: kindColor.out }}>в€’{group.cashOut.toLocaleString('ru-RU')}</span>}
                          </span>
                        </div>
                        {group.items.map(entry => {
                          const meta = typeMeta[entry.type] ?? { color: kindColor[entry.kind] ?? '#94A3B8', label: entry.type };
                          const expanded = expandedFlowIds.has(entry.id);
                          const d = entry.distribution;
                          const distSum = d ? d.materialsCost + d.masterTotal + d.piggyDeposit + d.ownersTotal + d.outsourceTotal : 0;
                          return (
                            <div key={entry.id} className={`${glass} rounded-xl mb-1.5 overflow-hidden`}>
                              <button onClick={() => d ? toggleFlowExpanded(entry.id) : undefined} className="w-full p-3 flex items-center gap-3 text-left" style={{ cursor: d ? 'pointer' : 'default' }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
                                  {React.createElement(flowIcon(entry), { size: 16, strokeWidth: 1.75, style: { color: meta.color } })}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{entry.title}</div>
                                  <div className={`text-[11px] ${sub} truncate`}>
                                    {meta.label}{entry.methodLabel ? ` В· ${entry.methodLabel}` : ''}{entry.counterparty ? ` В· ${entry.counterparty}` : ''}
                                  </div>
                                  {d && <div className={`text-[11px] mt-0.5 ${expanded ? '' : sub}`} style={{ color: expanded ? primary : undefined }}>{expanded ? 'в–І РЎРєСЂС‹С‚СЊ С†РµРїРѕС‡РєСѓ' : 'в–ј РџРѕРєР°Р·Р°С‚СЊ С†РµРїРѕС‡РєСѓ СЂР°СЃРїСЂРµРґРµР»РµРЅРёСЏ'}</div>}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-semibold tabular-nums" style={{ color: meta.color }}>
                                    {entry.kind === 'in' ? '+' : entry.kind === 'out' ? 'в€’' : ''}{entry.amount.toLocaleString('ru-RU')} в‚Ѕ
                                  </div>
                                  {entry.time && <div className={`text-[11px] ${sub}`}>{entry.time}</div>}
                                </div>
                              </button>
                              {expanded && d && (
                                <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
                                  <div className="space-y-1.5 mt-2">
                                    {[
                                      { label: 'РњР°С‚РµСЂРёР°Р»С‹', v: d.materialsCost, c: '#EF4444' },
                                      ...d.workers.map((w, i) => ({ label: `РњР°СЃС‚РµСЂ: ${w.workerName}`, v: w.earned, c: '#F59E0B', key: `w${i}` })),
                                      { label: 'РђСѓС‚СЃРѕСЂСЃ', v: d.outsourceTotal, c: '#0EA5E9' },
                                      { label: 'РљРѕРїРёР»РєР°', v: d.piggyDeposit, c: '#F59E0B' },
                                      ...d.owners.map((o, i) => ({ label: `Р’Р»Р°РґРµР»РµС†: ${o.ownerName}${o.status === 'paid' ? ' вњ“ РІС‹РїР»Р°С‡РµРЅРѕ' : ''}`, v: o.amount, c: '#8B5CF6', key: `o${i}` })),
                                    ].filter(r => r.v !== 0).map(r => (
                                      <div key={r.key ?? r.label} className="flex justify-between text-xs">
                                        <span className={sub}>{r.label}</span>
                                        <span className="font-medium tabular-nums" style={{ color: r.c }}>{fmt(r.v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {distSum > 0 && (
                                    <div className="mt-2 pt-2 text-[11px] flex justify-between" style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                                      <span className={sub}>РС‚РѕРіРѕ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ РёР· {entry.amount.toLocaleString('ru-RU')} в‚Ѕ</span>
                                      <span className="font-semibold tabular-nums">{fmt(distSum)}</span>
                                    </div>
                                  )}
                                  {entry.bookingId && (
                                    <button onClick={() => openHistoryBooking(entry.bookingId!)} className="mt-2 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: `${primary}18`, color: primary }}>
                                      <Split size={13} /> РћС‚РєСЂС‹С‚СЊ РїРѕР»РЅСѓСЋ СЂР°СЃС‡С‘С‚РєСѓ
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS MAIN в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && !settingsSection && (
            <motion.div key="settings-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <h2 className="font-semibold mb-4">РќР°СЃС‚СЂРѕР№РєРё</h2>
              {[
                { id: 'company', icon: Building2, label: 'РџСЂРѕС„РёР»СЊ РєРѕРјРїР°РЅРёРё', desc: 'ATMOSFERA В· РРџ РРІР°РЅРѕРІ', color: primary },
                { id: 'schedule', icon: Clock, label: 'Р Р°СЃРїРёСЃР°РЅРёРµ СЂР°Р±РѕС‚С‹', desc: scheduleState.filter(d => d.active).map(d => `${d.day} ${d.open}-${d.close}`).join(' В· ') || 'Р“СЂР°С„РёРє РЅРµ Р·Р°РґР°РЅ', color: '#F59E0B' },
                { id: 'boxes', icon: Box, label: 'РЈРїСЂР°РІР»РµРЅРёРµ Р±РѕРєСЃР°РјРё', desc: `${boxes.filter(b => b.active).length} Р°РєС‚РёРІРЅС‹С… Р±РѕРєСЃР°`, color: '#F59E0B' },
                { id: 'services', icon: Sliders, label: 'РЈСЃР»СѓРіРё Рё С†РµРЅС‹', desc: `${services.filter(s => s.active).length} Р°РєС‚РёРІРЅС‹С… СѓСЃР»СѓРі`, color: '#312E81' },
                { id: 'employees', icon: Users, label: 'РЎРѕС‚СЂСѓРґРЅРёРєРё', desc: `${employeeSettings.filter(e => e.active).length} РјР°СЃС‚РµСЂР°`, color: accent },
                { id: 'shift', icon: Clock, label: 'РћС‚РєСЂС‹С‚РёРµ СЃРјРµРЅС‹', desc: 'РћС‚РєСЂС‹С‚СЊ СЃРјРµРЅСѓ РґР»СЏ РјР°СЃС‚РµСЂРѕРІ', color: accent },
                { id: 'clients', icon: Phone, label: 'РљР»РёРµРЅС‚С‹', desc: `${clients.length} РєР°СЂС‚РѕС‡РµРє РєР»РёРµРЅС‚РѕРІ`, color: '#0EA5E9' },
                { id: 'finance', icon: BarChart3, label: 'Р¤РёРЅР°РЅСЃС‹', desc: 'РћС‚С‡С‘С‚ РїРѕ РјРѕР№РєРµ Рё РґРµС‚РµР№Р»РёРЅРіСѓ', color: '#22C55E' },
                { id: 'deposit', icon: Wallet, label: 'Р”РµРїРѕР·РёС‚', desc: 'РђР±РѕРЅРµРЅС‚СЃРєРёРµ РєР»РёРµРЅС‚С‹, РјРѕР№РєРё РІ РґРѕР»Рі', color: '#F59E0B' },
                { id: 'wallet', icon: Wallet, label: 'РљРѕС€РµР»С‘Рє', desc: 'Р”РѕС…РѕРґС‹ Рё СЂР°СЃС…РѕРґС‹ Р·Р° РЅРµРґРµР»СЋ', color: '#0EA5E9' },
                { id: 'money-flow', icon: ArrowLeftRight, label: 'Р”РІРёР¶РµРЅРёРµ РґРµРЅРµРі', desc: 'Р’СЃРµ РїСЂРёС…РѕРґС‹, СЂР°СЃРїСЂРµРґРµР»РµРЅРёСЏ Рё РІС‹РїР»Р°С‚С‹', color: '#8B5CF6' },
                { id: 'bookings-history', icon: History, label: 'РСЃС‚РѕСЂРёСЏ Р·Р°РїРёСЃРµР№', desc: 'Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РґРµРЅРµРі РїРѕ Р·Р°РїРёСЃСЏРј', color: '#6366F1' },
                { id: 'archive', icon: Archive, label: 'РђСЂС…РёРІ', desc: 'Р“Р»Р°РІРЅР°СЏ Р±РёР±Р»РёРѕС‚РµРєР°: РІСЃРµ Р·Р°РїРёСЃРё Рё СЂР°СЃС‡С‘С‚С‹', color: '#10B981' },
                { id: 'notifications', icon: Bell, label: 'РЈРІРµРґРѕРјР»РµРЅРёСЏ', desc: 'Telegram, Email', color: '#EC4899' },
                { id: 'integrations', icon: Globe, label: 'РРЅС‚РµРіСЂР°С†РёРё', desc: `${Object.values(integrations).filter(Boolean).length} РїРѕРґРєР»СЋС‡РµРЅРѕ`, color: '#06B6D4' },
                { id: 'content', icon: FileText, label: 'РљРѕРЅС‚РµРЅС‚ СЃР°Р№С‚Р°', desc: 'Р“Р»Р°РІРЅС‹Р№ СЌРєСЂР°РЅ, Рѕ СЃС‚СѓРґРёРё, РїРѕСЂС‚С„РѕР»РёРѕ', color: '#0EA5E9' },
                { id: 'reports', icon: FileText, label: 'РћС‚С‡С‘С‚С‹', desc: 'РЎРІРѕРґРЅС‹Рµ РѕС‚С‡С‘С‚С‹ РїРѕ РјРѕР№РєРµ Рё РґРµС‚РµР№Р»РёРЅРіСѓ', color: '#F59E0B' },
                { id: 'security', icon: Shield, label: 'Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ', desc: '2FA РІРєР»СЋС‡РµРЅР°', color: '#EF4444' },
              ].map(item => (
                <motion.button key={item.id} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (item.id === 'reports') { setPage('reports'); setSettingsSection(null); }
                    else { setSettingsSection(item.id as SettingsSection); }
                  }}
                  className={`${glass} rounded-2xl p-4 w-full text-left mb-2 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <item.icon size={18} strokeWidth={1.75} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.75} className={sub} />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: SHIFT OPENING в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'shift' && (
            <motion.div key="settings-shift" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-1">РћС‚РєСЂС‹С‚РёРµ СЃРјРµРЅС‹</h2>
              <p className={`text-xs ${sub} mb-4`}>РћС‚РјРµС‚СЊ РјР°СЃС‚РµСЂРѕРІ, РєРѕС‚РѕСЂС‹Рµ РІС‹С€Р»Рё РЅР° СЃРјРµРЅСѓ. РЎРјРµРЅР° СЃСЂР°Р·Сѓ РѕС‚РєСЂС‹С‚Р° Рё РїРѕРїР°РґР°РµС‚ РІ РїРѕСЃРµС‰Р°РµРјРѕСЃС‚СЊ вЂ” РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РЅРµ С‚СЂРµР±СѓРµС‚СЃСЏ.</p>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">РњР°СЃС‚РµСЂР° РЅР° СЃРјРµРЅРµ</div>
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
                            <div className={`text-xs ${sub}`}>{worker.experience || 'РњР°СЃС‚РµСЂ'}</div>
                          </div>
                          <div
                            className="h-6 min-w-6 rounded-full px-2 flex items-center justify-center text-[11px] font-semibold text-white"
                            style={{ background: checked ? primary : '#9CA3AF' }}
                          >
                            {checked ? 'Р•СЃС‚СЊ' : 'РќРµС‚'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className={`mt-3 text-xs ${sub}`}>
                  РћС‚РјРµС‚СЊ С‚РѕР»СЊРєРѕ С‚РµС… РјР°СЃС‚РµСЂРѕРІ, РєРѕС‚РѕСЂС‹Рµ СЂРµР°Р»СЊРЅРѕ РІС‹С€Р»Рё РІ СЃРјРµРЅСѓ.
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="font-medium mb-3">РљРѕРјРјРµРЅС‚Р°СЂРёР№ Рє СЃРјРµРЅРµ</div>
                <textarea
                  className={`${inputCls} min-h-[88px] resize-none`}
                  placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)"
                  value={shiftOpenNote}
                  onChange={(event) => setShiftOpenNote(event.target.value)}
                />
                {shiftOpenError && <div className="mt-3 text-xs text-red-500">{shiftOpenError}</div>}
                {shiftOpenSuccess && <div className="mt-3 text-xs" style={{ color: accent }}>РЎРјРµРЅР° РѕС‚РєСЂС‹С‚Р° РґР»СЏ РѕС‚РјРµС‡РµРЅРЅС‹С… РјР°СЃС‚РµСЂРѕРІ</div>}
                <button onClick={() => { void handleOpenShiftForMasters(); }} disabled={shiftOpenSubmitting} className="mt-3 w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60" style={{ background: primary }}>
                  {shiftOpenSubmitting ? 'РћС‚РєСЂС‹РІР°РµРј СЃРјРµРЅСѓ...' : 'РћС‚РєСЂС‹С‚СЊ СЃРјРµРЅСѓ'}
                </button>
              </div>

              {/* РњР°СЃС‚РµСЂР° СЃРµРіРѕРґРЅСЏ: СѓСЃР»СѓРіРё Рё РІС‹С…РѕРґ */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="font-medium">РњР°СЃС‚РµСЂР° СЃРµРіРѕРґРЅСЏ</div>
                  <span className={`text-xs font-medium ${sub}`}>
                    Р’С‹С€Р»Рё: {mastersCameOutToday} РёР· {activeMasters.length}
                  </span>
                </div>
                <div className={`text-xs ${sub} mb-3`}>
                  РЈСЃР»СѓРіРё РЅР° {todayLabel} В· РІС‹С…РѕРґ вЂ” РїРѕ РѕС‚РєСЂС‹С‚С‹Рј СЃРјРµРЅР°Рј Рё РѕС‚РјРµС‚РєР°Рј РІ РѕСЃРјРѕС‚СЂР°С…
                </div>
                {activeMasters.length === 0 ? (
                  <div className={`text-sm ${sub}`}>РќРµС‚ Р°РєС‚РёРІРЅС‹С… РјР°СЃС‚РµСЂРѕРІ.</div>
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
                                Р’С‹С€РµР» РІ {cameOutAt}
                              </span>
                            ) : (
                              <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-black/10 dark:bg-white/10 text-gray-500 whitespace-nowrap">
                                РќРµ РІС‹С€РµР»
                              </span>
                            )}
                          </div>
                          {masterBookings.length === 0 ? (
                            <div className={`text-xs ${sub}`}>РќРµС‚ Р·Р°РїРёСЃРµР№ РЅР° СЃРµРіРѕРґРЅСЏ</div>
                          ) : (
                            <>
                              <div className="space-y-1.5">
                                {masterBookings.map((booking) => (
                                  <div key={booking.id} className="flex items-start justify-between gap-2 text-xs">
                                    <div className="min-w-0">
                                      <span className="font-medium">{booking.time}</span>
                                      <span className={sub}> В· {booking.clientName}</span>
                                      <div className={`${sub} truncate`}>{booking.service}</div>
                                    </div>
                                    <span className="font-semibold whitespace-nowrap">{booking.price.toLocaleString('ru')} в‚Ѕ</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1.5 mt-1.5 border-t border-black/5 dark:border-white/10">
                                <span className={sub}>РС‚РѕРіРѕ</span>
                                <span className="font-semibold">{masterTotal.toLocaleString('ru')} в‚Ѕ</span>
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
                <div className="font-medium">РџРѕСЃР»РµРґРЅРёРµ РѕС‚РєСЂС‹С‚РёСЏ</div>
                {adminShiftInspections.length === 0 ? (
                  <div className={`text-sm ${sub}`}>РЎРјРµРЅС‹ РµС‰С‘ РЅРµ РѕС‚РєСЂС‹РІР°Р»РёСЃСЊ.</div>
                ) : (
                  adminShiftInspections.slice(0, 10).map((inspection) => (
                    <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="font-medium">{inspection.adminName}</div>
                          <div className={`text-xs ${sub}`}>{inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${inspection.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : inspection.status === 'approved' ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                          {inspection.status === 'pending' ? 'РќР° РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРё' : inspection.status === 'approved' ? 'РџРѕРґС‚РІРµСЂР¶РґРµРЅРѕ' : 'РћС‚РєР°Р·Р°РЅРѕ'}
                        </div>
                      </div>
                      <div className={`text-xs ${sub}`}>
                        РњР°СЃС‚РµСЂР°: {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'РќРµ РІС‹Р±СЂР°РЅС‹'}
                      </div>
                      {inspection.note && <div className={`text-xs ${sub} mt-1`}>{inspection.note}</div>}
                      {inspection.issueNote && <div className="mt-2 text-xs text-red-500">РџСЂРѕР±Р»РµРјР°: {inspection.issueNote}</div>}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: BOOKINGS HISTORY в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'bookings-history' && !selectedHistoryBookingId && (
            <motion.div key="s-bookings-history" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">РСЃС‚РѕСЂРёСЏ Р·Р°РїРёСЃРµР№</h2>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'day', label: 'Р”РµРЅСЊ' },
                  { id: 'week', label: 'РќРµРґРµР»СЏ' },
                  { id: 'month', label: 'РњРµСЃСЏС†' },
                  { id: 'all', label: 'Р’СЃС‘' },
                  { id: 'custom', label: 'РЎРІРѕРё' },
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
                  { id: '', label: 'Р’СЃРµ' },
                  { id: 'completed', label: 'Р—Р°РІРµСЂС€РµРЅРѕ' },
                  { id: 'in_progress', label: 'Р’ СЂР°Р±РѕС‚Рµ' },
                  { id: 'cancelled', label: 'РћС‚РјРµРЅРµРЅРѕ' },
                  { id: 'no_show', label: 'РќРµ РїСЂРёРµС…Р°Р»' },
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
                  <Search size={15} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                  <input
                    className="w-full bg-transparent outline-none pl-9 pr-3 py-2.5 text-sm"
                    placeholder="РљР»РёРµРЅС‚, С‚РµР»РµС„РѕРЅ, СѓСЃР»СѓРіР°, Р°РІС‚Рѕ..."
                    value={historySearchInput}
                    onChange={e => setHistorySearchInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') setHistoryQuery(historySearchInput.trim()); }}
                  />
                </div>
                <button onClick={() => setHistoryQuery(historySearchInput.trim())}
                  className="px-4 rounded-xl text-sm font-semibold text-white shrink-0" style={{ background: '#6366F1' }}>
                  РќР°Р№С‚Рё
                </button>
              </div>

              {historyTotals && (historyTotals.workers.length > 0 || historyTotals.owners.length > 0 || historyTotals.piggy.length > 0) && (
                <div className="grid gap-3 mb-4">
                  {historyTotals.workers.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>РњР°СЃС‚РµСЂР° В· РёС‚РѕРі Р·Р° РїРµСЂРёРѕРґ</div>
                      {historyTotals.workers.map(w => (
                        <div key={w.workerId} className={`py-1.5 ${w !== historyTotals!.workers[0] ? 'border-t' : ''}`}
                          style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold">{w.workerName}</span>
                            <span className="font-bold">{w.balance.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                          <div className={`text-xs mt-0.5 space-y-0.5 ${sub}`}>
                            {w.accruedFromBookings > 0 && (
                              <div className="flex justify-between"><span>РїРѕ Р·Р°РїРёСЃСЏРј ({w.bookingCount})</span><span className="font-medium">+{w.accruedFromBookings.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.baseSalary > 0 && (
                              <div className="flex justify-between"><span>РѕРєР»Р°Рґ</span><span className="font-medium">+{w.baseSalary.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.shiftPayTotal > 0 && (
                              <div className="flex justify-between"><span>СЃРјРµРЅС‹ ({w.shiftCount})</span><span className="font-medium">+{w.shiftPayTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.bonusTotal > 0 && (
                              <div className="flex justify-between"><span>Р±РѕРЅСѓСЃС‹</span><span className="font-medium">+{w.bonusTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.adjustmentTotal !== 0 && (
                              <div className="flex justify-between"><span>РїРѕРїСЂР°РІРєРё</span><span className="font-medium">{w.adjustmentTotal > 0 ? '+' : ''}{w.adjustmentTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.advanceTotal > 0 && (
                              <div className="flex justify-between"><span>Р°РІР°РЅСЃС‹</span><span className="font-medium">в€’{w.advanceTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.deductionTotal > 0 && (
                              <div className="flex justify-between"><span>РІС‹С‡РµС‚С‹</span><span className="font-medium">в€’{w.deductionTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                            {w.payoutTotal > 0 && (
                              <div className="flex justify-between"><span>РІС‹РїР»Р°С‡РµРЅРѕ</span><span className="font-medium">в€’{w.payoutTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {historyTotals.piggy.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>РљРѕРїРёР»РєР° В· РёС‚РѕРі Р·Р° РїРµСЂРёРѕРґ</div>
                      {historyTotals.piggy.map(p => (
                        <div key={p.resourceGroup} className="flex items-center justify-between py-1 text-sm">
                          <span className={sub}>{piggyBankLabel(p.resourceGroup)}</span>
                          <span className="font-bold">{p.amount.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {historyTotals.owners.length > 0 && (
                    <div className={`${glass} rounded-2xl p-3`}>
                      <div className={`text-xs font-semibold ${sub} mb-1.5 uppercase tracking-wide`}>Р’Р»Р°РґРµР»СЊС†С‹ В· РёС‚РѕРі Р·Р° РїРµСЂРёРѕРґ</div>
                      {historyTotals.owners.map(o => (
                        <div key={o.ownerId} className="flex items-center justify-between py-1 text-sm">
                          <span className={sub}>{o.ownerName}</span>
                          <span className="font-bold">
                            {o.totalAccrued > 0 && <span>{o.totalAccrued.toLocaleString('ru')} в‚Ѕ Рє РІС‹РїР»Р°С‚Рµ</span>}
                            {o.totalPaid > 0 && <span>{o.totalAccrued > 0 ? ' В· ' : ''}РІС‹РїР»Р°С‡РµРЅРѕ {o.totalPaid.toLocaleString('ru')} в‚Ѕ</span>}
                            {o.totalAccrued === 0 && o.totalPaid === 0 && '0 в‚Ѕ'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {historyLoading && historyItems.length === 0 ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Р—Р°РіСЂСѓР·РєР°...</div>
              ) : historyItems.length === 0 ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Р—Р°РїРёСЃРµР№ РЅРµ РЅР°Р№РґРµРЅРѕ</div>
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
                                <div className="text-sm font-bold shrink-0">{item.price.toLocaleString('ru')} в‚Ѕ</div>
                              </div>
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {item.clientName}{item.car ? ` В· ${item.car}` : ''}{item.plate ? `, ${item.plate}` : ''}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className={`text-[11px] ${sub}`}>
                                  {item.box}{item.workers.length > 0 ? ` В· ${item.workers.map(w => w.workerName).join(', ')}` : ''}
                                </div>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ownerStatusBadge(item.status)}`}>
                                  {ownerStatusLabel(item.status)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={15} strokeWidth={1.75} className={`mt-1 shrink-0 ${sub}`} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ));
                })()
              )}
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: BOOKINGS HISTORY DETAIL в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && (settingsSection === 'bookings-history' || settingsSection === 'archive' || settingsSection === 'money-flow') && selectedHistoryBookingId && (
            <motion.div key="s-booking-split" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={closeHistoryBooking} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>

              {splitLoading || !splitDetail ? (
                <div className={`text-center py-10 text-sm ${sub}`}>Р—Р°РіСЂСѓР·РєР°...</div>
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
                      <div>{splitDetail.date} В· {splitDetail.time} В· {splitDetail.box}</div>
                      {splitDetail.clientPhone && <div>{splitDetail.clientPhone}</div>}
                      <div>РњР°СЃС‚РµСЂР°: {splitDetail.workers.length > 0
                        ? splitDetail.workers.map(w => w.workerName).join(', ')
                        : 'РЅРµ РЅР°Р·РЅР°С‡РµРЅ'}</div>
                      <div className="flex items-center gap-2">
                        <span>РћРїР»Р°С‚Р°: {splitDetail.paymentType === 'cash' ? 'РЅР°Р»РёС‡РЅС‹Рµ' : splitDetail.paymentType === 'card' ? 'РєР°СЂС‚Р°' : 'СЃС‡С‘С‚'}</span>
                        {splitDetail.paymentSettled && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">РћРїР»Р°С‡РµРЅР°</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <div className={`text-xs ${sub}`}>РС‚РѕРіРѕРІР°СЏ С†РµРЅР°</div>
                      <div className="text-lg font-bold" style={{ color: primary }}>{splitDetail.price.toLocaleString('ru')} в‚Ѕ</div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={sub}>{splitDetail.service}</span>
                        <span className="font-medium">{splitDetail.mainPrice.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      {splitDetail.additionalServices.map(a => (
                        <div key={`${a.name}-${a.price}`} className="flex justify-between text-xs">
                          <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (РІС‹С‡РµС‚)' : ''}{a.isOutsource ? ` (Р°СѓС‚СЃРѕСЂСЃ: ${(a.outsourceAmount || 0).toLocaleString('ru')} в‚Ѕ)` : ''}</span>
                          <span className="font-medium">{a.priceMode === 'subtract' ? 'в€’' : ''}{a.price.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!splitDetail.canEdit && (
                    <div className="rounded-2xl p-3 mb-3 text-xs font-medium bg-amber-500/10 text-amber-600">
                      Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РјРѕР¶РЅРѕ СЂРµРґР°РєС‚РёСЂРѕРІР°С‚СЊ С‚РѕР»СЊРєРѕ РґР»СЏ Р·Р°РІРµСЂС€С‘РЅРЅС‹С… Р·Р°РїРёСЃРµР№.
                    </div>
                  )}

                  <div className={`${glass} rounded-2xl p-4 mb-3`}>
                    <h3 className="font-semibold text-sm mb-3">Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РґРµРЅРµРі</h3>

                    <div className="mb-4 rounded-xl p-3 space-y-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="flex justify-between text-xs"><span className={sub}>Р¦РµРЅР° Р·Р°РїРёСЃРё</span><span className="font-semibold">{splitDetail.price.toLocaleString('ru')} в‚Ѕ</span></div>
                      <div className="flex justify-between text-xs"><span className={sub}>РћСЃРЅРѕРІРЅР°СЏ СѓСЃР»СѓРіР°</span><span>{splitDetail.mainPrice.toLocaleString('ru')} в‚Ѕ</span></div>
                      {splitDetail.additionalServices.map(a => (
                        <div key={`calc-${a.name}-${a.price}`} className="flex justify-between text-xs">
                          <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (РІС‹С‡РµС‚)' : ''}{a.isOutsource ? ` (Р°СѓС‚СЃРѕСЂСЃ: ${(a.outsourceAmount || 0).toLocaleString('ru')} в‚Ѕ)` : ''}</span>
                          <span>{a.priceMode === 'subtract' ? 'в€’' : ''}{a.price.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs"><span className={sub}>в€’ РњР°С‚РµСЂРёР°Р»С‹</span><span>в€’{splitDetail.materialsCost.toLocaleString('ru')} в‚Ѕ</span></div>
                      <div className="flex justify-between text-xs"><span className={sub}>Р’С‹СЂСѓС‡РєР° (РЅРµС‚С‚Рѕ)</span><span className="font-semibold">{splitDetail.net.toLocaleString('ru')} в‚Ѕ</span></div>
                      {splitDetail.subtractTotal > 0 && (
                        <div className="flex justify-between text-xs"><span className={sub}>в€’ Р”РѕРї. СѓСЃР»СѓРіРё (РІС‹С‡РµС‚)</span><span>в€’{splitDetail.subtractTotal.toLocaleString('ru')} в‚Ѕ</span></div>
                      )}
                      <div className="flex justify-between text-xs border-t border-white/10 pt-1"><span className={sub}>Р‘Р°Р·Р° СЂР°СЃС‡С‘С‚Р°</span><span className="font-semibold">{splitDetail.splitBase.toLocaleString('ru')} в‚Ѕ</span></div>

                      <div className={`text-[10px] font-semibold uppercase tracking-wide pt-2 ${sub}`}>РљРѕРјСѓ Рё РєСѓРґР° РїРѕС€Р»Рѕ</div>

                      {splitDetail.workers.map(w => {
                        const how = w.overrideEarned !== null && w.overrideEarned !== undefined
                          ? 'РІСЂСѓС‡РЅСѓСЋ'
                          : w.payType === 'fixed'
                            ? `С„РёРєСЃ ${(w.fixedAmount ?? 0).toLocaleString('ru')} в‚Ѕ`
                            : `${w.percent}% РѕС‚ Р±Р°Р·С‹`;
                        return (
                          <button key={`ledger-w-${w.linkId}`} onClick={() => gotoWorkerSalary(w.workerId)}
                            className="flex justify-between text-xs w-full text-left hover:opacity-80">
                            <span className={`${sub} truncate`} title={`РњР°СЃС‚РµСЂ: ${w.workerName}`}>В· {w.workerName} ({how})</span>
                            <span className="font-medium shrink-0" style={{ color: '#6366F1' }}>{w.earned.toLocaleString('ru')} в‚Ѕ</span>
                          </button>
                        );
                      })}

                      {splitDetail.asvcWorkers.map(w => (
                        <button key={`ledger-aw-${w.linkId}`} onClick={() => gotoWorkerSalary(w.workerId)}
                          className="flex justify-between text-xs w-full text-left hover:opacity-80">
                          <span className={`${sub} truncate`} title={`РњР°СЃС‚РµСЂ РґРѕРї. СѓСЃР»СѓРіРё: ${w.workerName} вЂ” ${w.additionalServiceName}`}>
                            В· {w.workerName} вЂ” В«{w.additionalServiceName}В»{w.payType === 'fixed' ? ` (С„РёРєСЃ ${(w.fixedAmount ?? 0).toLocaleString('ru')} в‚Ѕ)` : ` (${w.percent}%)`}
                          </span>
                          <span className="font-medium shrink-0" style={{ color: '#6366F1' }}>{w.earned.toLocaleString('ru')} в‚Ѕ</span>
                        </button>
                      ))}

                      {(() => {
                        const asvcPiggyTotal = splitDetail.asvcPiggyDeposits.reduce((s, d) => s + (d.amount || 0), 0);
                        const mainPiggyDeposit = Math.max(0, splitDetail.piggyDeposit - asvcPiggyTotal);
                        const piggyHow = splitDetail.piggyPayType === 'rest'
                          ? ' (РІРµСЃСЊ РѕСЃС‚Р°С‚РѕРє)'
                          : splitDetail.piggyPayValue > 0
                            ? ` (${splitDetail.piggyPayValue}% РѕС‚ Р±Р°Р·С‹)`
                            : splitDetail.piggyPayType === 'fixed'
                              ? ` (С„РёРєСЃ ${splitDetail.piggyPayValue.toLocaleString('ru')} в‚Ѕ)`
                              : '';
                        return (
                          <>
                            <button className="flex justify-between text-xs w-full text-left hover:opacity-80"
                              onClick={() => gotoPiggyBank()}>
                              <span className={`${sub} truncate`}>В· РІ {piggyBankLabel(splitDetail.piggyTarget)}{piggyHow}</span>
                              <span className="font-medium shrink-0" style={{ color: '#F59E0B' }}>{mainPiggyDeposit.toLocaleString('ru')} в‚Ѕ</span>
                            </button>
                            {splitDetail.asvcPiggyDeposits.map(d => (
                              <div key={`ledger-ap-${d.name}-${d.amount}`} className="flex justify-between text-xs">
                                <span className={`${sub} truncate`} title={`РћСЃС‚Р°С‚РѕРє РѕС‚ В«${d.name}В» в†’ РІ ${piggyBankLabel(d.resourceGroup)}`}>
                                  В· В«{d.name}В» в†’ РІ {piggyBankLabel(d.resourceGroup)}
                                </span>
                                <span className="font-medium">{d.amount.toLocaleString('ru')} в‚Ѕ</span>
                              </div>
                            ))}
                          </>
                        );
                      })()}

                      {splitDetail.ownerShares.map(o => (
                        <button key={`ledger-o-${o.ownerId}`} onClick={() => gotoOwnerSalary(o.ownerId)}
                          className="flex justify-between text-xs w-full text-left hover:opacity-80">
                          <span className={`${sub} truncate`}>
                            В· {o.ownerName}{o.status === 'paid' ? ' (РІС‹РїР»Р°С‡РµРЅРѕ)' : ' (Рє РІС‹РїР»Р°С‚Рµ)'}
                          </span>
                          <span className="font-medium shrink-0" style={{ color: '#312E81' }}>{Math.round(o.amount).toLocaleString('ru')} в‚Ѕ</span>
                        </button>
                      ))}

                      {(() => {
                        const asvcMasterPayTotal = splitDetail.asvcMasterPayTotal || 0;
                        const asvcPiggyTotal = splitDetail.asvcPiggyDeposits.reduce((s, d) => s + (d.amount || 0), 0);
                        const totalDistributed = splitDetail.masterTotal + splitDetail.piggyDeposit + splitDetail.ownersTotal;
                        const expectedTotal = splitDetail.splitBase + asvcMasterPayTotal + asvcPiggyTotal;
                        const diff = totalDistributed - expectedTotal;
                        const ok = Math.abs(diff) <= 1;
                        const undistributed = Math.max(0, expectedTotal - totalDistributed);
                        return (
                          <>
                            <div className="flex justify-between text-xs border-t border-white/10 pt-1">
                              <span className={sub}>РС‚РѕРіРѕ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ</span>
                              <span className="font-semibold">{totalDistributed.toLocaleString('ru')} в‚Ѕ</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className={sub}>РЎРІРµСЂРєР° (Р±Р°Р·Р° + РѕРїР»Р°С‚С‹ РґРѕРї. СѓСЃР»СѓРі)</span>
                              <span className={ok ? 'font-medium text-green-600' : 'font-medium text-amber-500'}>
                                {ok ? 'вњ“ СЃС…РѕРґРёС‚СЃСЏ' : `СЂР°Р·РЅРёС†Р° ${diff.toLocaleString('ru')} в‚Ѕ`}
                              </span>
                            </div>
                            {!ok && undistributed > 1 && (
                              <div className="flex justify-between text-xs">
                                <span className={sub}>РќРµ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ</span>
                                <span className="font-medium text-red-500">{undistributed.toLocaleString('ru')} в‚Ѕ</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">РњР°С‚РµСЂРёР°Р»С‹</div>
                          <div className={`text-[11px] ${sub}`}>Р°РІС‚Рѕ: {splitDetail.materialsCostAuto.toLocaleString('ru')} в‚Ѕ</div>
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
                                  ? `Р¤РёРєСЃ: ${(w.fixedAmount ?? 0).toLocaleString('ru')} в‚Ѕ`
                                  : `${w.percent}%`}
                                {hasOverride ? ` В· Р°РІС‚Рѕ: ${auto.toLocaleString('ru')} в‚Ѕ` : ''}
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
                          <div className="text-sm font-medium">РљРѕРїРёР»РєР°</div>
                          <div className={`text-[11px] ${sub}`}>
                            РІ {piggyBankLabel(splitDetail.piggyTarget)} В· Р°РІС‚Рѕ: {splitDetail.piggyDepositAuto.toLocaleString('ru')} в‚Ѕ
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
                                {paid ? 'Р’С‹РїР»Р°С‡РµРЅРѕ' : `Р°РІС‚Рѕ: ${auto.toLocaleString('ru')} в‚Ѕ`}
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
                        <h4 className="text-xs font-semibold mb-2">Р”РІРёР¶РµРЅРёСЏ РїРѕ РєРѕРїРёР»РєРµ</h4>
                        <div className="space-y-1.5">
                          {splitDetail.piggyTransactions.map(tx => {
                            const positive = tx.amount > 0;
                            const label = {
                              deposit_24percent: 'Р”РµРїРѕР·РёС‚',
                              material_withdrawal: 'РЎРїРёСЃР°РЅРёРµ РјР°С‚РµСЂРёР°Р»РѕРІ',
                              material_repayment: 'Р’РѕР·РІСЂР°С‚ РјР°С‚РµСЂРёР°Р»РѕРІ',
                            }[tx.transactionType] || tx.transactionType;
                            return (
                              <div key={tx.id} className="flex items-start justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <div className="truncate">{tx.purpose}</div>
                                  <div className={`${sub} text-[10px]`}>
                                    {label}{tx.date ? ` В· ${tx.date}` : ''}{tx.resourceGroup ? ` В· ${piggyBankLabel(tx.resourceGroup)}` : ''}
                                  </div>
                                </div>
                                <div className={`font-semibold shrink-0 ${positive ? 'text-green-600' : 'text-red-500'}`}>
                                  {positive ? '+' : ''}{Math.round(tx.amount).toLocaleString('ru')} в‚Ѕ
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
                        <Save size={16} strokeWidth={1.75} />{splitSaving ? 'РЎРѕС…СЂР°РЅСЏРµРј...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ РёР·РјРµРЅРµРЅРёСЏ'}
                      </button>
                      {splitDetail.hasCustom && (
                        <button onClick={() => void handleResetMoneySplit()}
                          disabled={splitSaving}
                          className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mb-4"
                          style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <RefreshCw size={15} strokeWidth={1.75} />РЎР±СЂРѕСЃРёС‚СЊ Рє Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРјСѓ СЂР°СЃС‡С‘С‚Сѓ
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: ARCHIVE в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'archive' && !selectedHistoryBookingId && (
            <motion.div key="s-archive" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => { setSettingsSection(null); setArchiveHighlight(null); }} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-1">РђСЂС…РёРІ</h2>
              <div className={`text-xs ${sub} mb-4`}>Р“Р»Р°РІРЅР°СЏ Р±РёР±Р»РёРѕС‚РµРєР° Рё РєР°СЂС‚РѕС‚РµРєР°: РІСЃРµ Р·Р°РїРёСЃРё, РґРѕС…РѕРґС‹, СЂР°СЃС…РѕРґС‹ Рё СЂР°СЃС‡С‘С‚С‹ Р·Р° РїРµСЂРёРѕРґ</div>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'day', label: 'Р”РµРЅСЊ' },
                  { id: 'week', label: 'РќРµРґРµР»СЏ' },
                  { id: 'month', label: 'РњРµСЃСЏС†' },
                  { id: 'year', label: 'Р“РѕРґ' },
                  { id: 'all', label: 'Р’СЃС‘' },
                  { id: 'custom', label: 'РЎРІРѕРё' },
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
                  <CalendarDays size={14} strokeWidth={1.75} />РљР°Р»РµРЅРґР°СЂСЊ
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
                        {archiveCalendarStep === 'year' ? 'Р’С‹Р±РµСЂРёС‚Рµ РіРѕРґ'
                          : archiveCalendarStep === 'month' ? `Р“РѕРґ ${archiveCalendarYear}`
                          : `${archiveCalendarYear} В· ${['РЇРЅРІР°СЂСЊ', 'Р¤РµРІСЂР°Р»СЊ', 'РњР°СЂС‚', 'РђРїСЂРµР»СЊ', 'РњР°Р№', 'РСЋРЅСЊ', 'РСЋР»СЊ', 'РђРІРіСѓСЃС‚', 'РЎРµРЅС‚СЏР±СЂСЊ', 'РћРєС‚СЏР±СЂСЊ', 'РќРѕСЏР±СЂСЊ', 'Р”РµРєР°Р±СЂСЊ'][archiveCalendarMonth]}`}
                      </h3>
                      <button onClick={() => setArchiveCalendarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} strokeWidth={1.75} /></button>
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
                          <button onClick={() => setArchiveCalendarYear(y => y - 1)} className={`p-1.5 rounded-lg ${glass}`}><ChevronLeft size={16} strokeWidth={1.75} /></button>
                          <span className="text-sm font-semibold">{archiveCalendarYear}</span>
                          <button onClick={() => setArchiveCalendarYear(y => y + 1)} className={`p-1.5 rounded-lg ${glass}`}><ChevronRight size={16} strokeWidth={1.75} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['РЇРЅРІР°СЂСЊ', 'Р¤РµРІСЂР°Р»СЊ', 'РњР°СЂС‚', 'РђРїСЂРµР»СЊ', 'РњР°Р№', 'РСЋРЅСЊ', 'РСЋР»СЊ', 'РђРІРіСѓСЃС‚', 'РЎРµРЅС‚СЏР±СЂСЊ', 'РћРєС‚СЏР±СЂСЊ', 'РќРѕСЏР±СЂСЊ', 'Р”РµРєР°Р±СЂСЊ'].map((m, idx) => (
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
                            <span className="text-sm font-medium">РќРµРґРµР»СЏ {idx + 1}</span>
                            <span className={`text-xs ${sub}`}>
                              {w.start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} вЂ“ {w.end.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {archiveLoading ? (
                <div className={`text-center py-12 text-sm ${sub}`}>Р—Р°РіСЂСѓР·РєР° Р°СЂС…РёРІР°...</div>
              ) : !archiveData ? (
                <div className="text-center py-12">
                  <div className={`text-sm ${sub} mb-3`}>РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р°СЂС…РёРІ</div>
                  <button onClick={() => void fetchArchive()} className={`px-4 py-2 rounded-xl text-sm font-medium`} style={{ background: '#10B98120', color: '#10B981' }}>РџРѕРІС‚РѕСЂРёС‚СЊ</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Р’С‹СЂСѓС‡РєР° (РЅРµС‚С‚Рѕ)', value: archiveData.summary.net, color: '#10B981', onClick: gotoHistory, hint: 'РСЃС‚РѕСЂРёСЏ Р·Р°РїРёСЃРµР№' },
                      { label: 'РџСЂРёР±С‹Р»СЊ', value: archiveData.summary.profit, color: accent, onClick: gotoWallet, hint: 'РљРѕС€РµР»С‘Рє' },
                      { label: 'РњР°СЃС‚РµСЂР°', value: archiveData.summary.masterTotal, color: '#6366F1', onClick: gotoPayroll, hint: 'Р—Р°СЂРїР»Р°С‚С‹' },
                      { label: 'Р’Р»Р°РґРµР»СЊС†С‹', value: archiveData.summary.ownersAccrued, color: '#312E81', onClick: gotoPayroll, hint: 'Р—Р°СЂРїР»Р°С‚С‹' },
                      { label: 'Р”РѕС…РѕРґС‹', value: archiveData.summary.totalIncome, color: '#22C55E', onClick: gotoWallet, hint: 'РљРѕС€РµР»С‘Рє' },
                      { label: 'Р Р°СЃС…РѕРґС‹', value: archiveData.summary.totalExpense, color: '#EF4444', onClick: gotoWallet, hint: 'РљРѕС€РµР»С‘Рє' },
                      { label: 'РљРѕРїРёР»РєР°', value: archiveData.summary.piggyDeposit, color: '#F59E0B', onClick: () => gotoPiggyBank(), hint: 'РљРѕРїРёР»РєР°' },
                    ].map(card => (
                      <button key={card.label} onClick={card.onClick}
                        className={`${glass} rounded-2xl p-3 text-left transition active:scale-[0.98]`}>
                        <div className={`text-[11px] ${sub}`}>{card.label}</div>
                        <div className="font-bold text-base mt-0.5" style={{ color: card.color }}>
                          {card.value.toLocaleString('ru')} в‚Ѕ
                        </div>
                        <div className={`text-[10px] mt-0.5`} style={{ color: card.color }}>в†’ {card.hint}</div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { id: 'bookings', label: 'Р—Р°РїРёСЃРё', count: archiveData.summary.bookingCount },
                      { id: 'incomes', label: 'Р”РѕС…РѕРґС‹', count: archiveData.summary.incomeCount },
                      { id: 'expenses', label: 'Р Р°СЃС…РѕРґС‹', count: archiveData.summary.expenseCount },
                      { id: 'piggy', label: 'РљРѕРїРёР»РєР°', count: archiveData.summary.piggyTxCount },
                      { id: 'payroll', label: 'Р—Р°СЂРїР»Р°С‚С‹', count: archiveData.payroll.length },
                      { id: 'owners', label: 'Р’Р»Р°РґРµР»СЊС†С‹', count: archiveData.owners.length },
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
                      <div className={`text-center py-10 text-sm ${sub}`}>Р—Р° СЌС‚РѕС‚ РїРµСЂРёРѕРґ РЅРµС‚ Р·Р°РІРµСЂС€С‘РЅРЅС‹С… Р·Р°РїРёСЃРµР№</div>
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
                                  <span className="text-sm font-medium truncate">В· {b.service}</span>
                                </div>
                                <div className={`text-xs ${sub} mt-0.5`}>{b.date} В· {b.time} В· {b.box}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0">{b.price.toLocaleString('ru')} в‚Ѕ</div>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px]">
                              {b.workers.length > 0 && (
                                <span className={sub}>РњР°СЃС‚РµСЂР°:{' '}
                                  {b.workers.map((w, i) => (
                                    <button key={`${b.id}-${w.workerId}`}
                                      onClick={(e) => { e.stopPropagation(); gotoWorkerSalary(w.workerId); }}
                                      className="font-semibold hover:opacity-70" style={{ color: '#6366F1' }}>
                                      {i > 0 ? ' В· ' : ''}{w.workerName} +{w.earned.toLocaleString('ru')} в‚Ѕ
                                    </button>
                                  ))}
                                </span>
                              )}
                              <span className={sub}>РљРѕРїРёР»РєР°: <b className="font-semibold" style={{ color: '#F59E0B' }}>+{b.piggyDeposit.toLocaleString('ru')} в‚Ѕ</b></span>
                              <span className={sub}>Р’Р»Р°РґРµР»СЊС†С‹: <b className="font-semibold" style={{ color: '#312E81' }}>+{b.ownersTotal.toLocaleString('ru')} в‚Ѕ</b></span>
                              <span className={sub}>РќРµС‚С‚Рѕ: <b className="font-semibold" style={{ color: '#10B981' }}>{b.net.toLocaleString('ru')} в‚Ѕ</b></span>
                            </div>
                            {b.additionalServices.map(a => (
                              <div key={`${b.id}-${a.name}`} className="flex justify-between text-[11px] mt-1">
                                <span className={sub}>+ {a.name}{a.priceMode === 'subtract' ? ' (РІС‹С‡РµС‚)' : ''}{a.isOutsource ? ` (Р°СѓС‚СЃРѕСЂСЃ: ${(a.outsourceAmount || 0).toLocaleString('ru')} в‚Ѕ)` : ''}</span>
                                <span className="font-medium">{a.priceMode === 'subtract' ? 'в€’' : '+'}{a.price.toLocaleString('ru')} в‚Ѕ</span>
                              </div>
                            ))}
                            {b.materialsCost > 0 && (
                              <div className="flex justify-between text-[11px] mt-1">
                                <span className={sub}>РњР°С‚РµСЂРёР°Р»С‹</span>
                                <span className="font-medium" style={{ color: '#EF4444' }}>в€’{b.materialsCost.toLocaleString('ru')} в‚Ѕ</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'incomes' && (
                    archiveData.incomes.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Р”РѕС…РѕРґРѕРІ Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</div>
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
                                <div className={`text-xs ${sub} mt-0.5`}>{i.date}{i.note ? ` В· ${i.note}` : ''}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#22C55E' }}>+{i.amount.toLocaleString('ru')} в‚Ѕ</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'expenses' && (
                    archiveData.expenses.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Р Р°СЃС…РѕРґРѕРІ Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</div>
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
                                <div className={`text-xs ${sub} mt-0.5`}>{e.category} В· {e.date}{e.resourceGroup ? ` В· ${e.resourceGroup === 'wash' ? 'рџљ— РњРѕР№РєР°' : 'вњЁ Р”РµС‚РµР№Р»РёРЅРі'}` : ''}</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#EF4444' }}>в€’{e.amount.toLocaleString('ru')} в‚Ѕ</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'piggy' && (
                    archiveData.piggyTransactions.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Р”РІРёР¶РµРЅРёР№ РєРѕРїРёР»РєРё Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.piggyTransactions.map(tx => {
                          const isDeposit = tx.amount > 0;
                          const txLabel = tx.transactionType === 'deposit_24percent' ? '24% РѕС‚ Р·Р°РєР°Р·Р°'
                            : tx.transactionType === 'material_repayment' ? 'Р’РѕР·РІСЂР°С‚ РјР°С‚РµСЂРёР°Р»РѕРІ'
                            : tx.transactionType === 'material_withdrawal' ? 'РЎРЅСЏС‚РёРµ РЅР° РјР°С‚РµСЂРёР°Р»С‹'
                            : tx.transactionType === 'custom_deposit' ? 'РџРѕРїРѕР»РЅРµРЅРёРµ'
                            : tx.transactionType === 'custom_withdrawal' ? 'РЎРЅСЏС‚РёРµ'
                            : 'РљРѕСЂСЂРµРєС‚РёСЂРѕРІРєР°';
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
                                      {tx.resourceGroup === 'detailing' ? 'вњЁ' : 'рџљ—'}
                                    </span>
                                  </div>
                                  <div className={`text-[11px] ${sub} mt-0.5`}>
                                    {tx.date}{tx.bookingInfo ? ` В· ${tx.bookingInfo}` : ''}{tx.purpose ? ` В· ${tx.purpose}` : ''}
                                  </div>
                                </div>
                                <div className="font-bold text-sm shrink-0" style={{ color: isDeposit ? '#22C55E' : '#EF4444' }}>
                                  {isDeposit ? '+' : 'в€’'}{Math.abs(tx.amount).toLocaleString('ru')} в‚Ѕ
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
                      <div className={`text-center py-10 text-sm ${sub}`}>Р—Р°СЂРїР»Р°С‚РЅС‹С… РґР°РЅРЅС‹С… Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.payroll.map(w => (
                          <button key={w.workerId} onClick={() => gotoWorkerSalary(w.workerId)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{w.workerName}</div>
                                <div className={`text-[11px] ${sub} mt-0.5 space-y-0.5`}>
                                  <div>Р·Р°РїРёСЃРµР№: {w.bookingCount} В· РїРѕ Р·Р°РїРёСЃСЏРј: +{w.accruedFromBookings.toLocaleString('ru')} в‚Ѕ{w.baseSalary > 0 ? ` В· РѕРєР»Р°Рґ: +${w.baseSalary.toLocaleString('ru')} в‚Ѕ` : ''}{w.shiftPayTotal > 0 ? ` В· СЃРјРµРЅС‹ (${w.shiftCount}): +${w.shiftPayTotal.toLocaleString('ru')} в‚Ѕ` : ''}</div>
                                  {(w.bonusTotal > 0 || w.adjustmentTotal !== 0) && (
                                    <div>Р±РѕРЅСѓСЃС‹: +{w.bonusTotal.toLocaleString('ru')} в‚Ѕ В· РїРѕРїСЂР°РІРєРё: {w.adjustmentTotal > 0 ? '+' : ''}{w.adjustmentTotal.toLocaleString('ru')} в‚Ѕ</div>
                                  )}
                                  {(w.advanceTotal > 0 || w.deductionTotal > 0 || w.payoutTotal > 0) && (
                                    <div>Р°РІР°РЅСЃС‹: в€’{w.advanceTotal.toLocaleString('ru')} в‚Ѕ В· РІС‹С‡РµС‚С‹: в€’{w.deductionTotal.toLocaleString('ru')} в‚Ѕ В· РІС‹РїР»Р°С‚С‹: в€’{w.payoutTotal.toLocaleString('ru')} в‚Ѕ</div>
                                  )}
                                </div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: w.balance >= 0 ? '#6366F1' : '#EF4444' }}>
                                {w.balance.toLocaleString('ru')} в‚Ѕ
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  )}

                  {archiveTab === 'owners' && (
                    archiveData.owners.length === 0 ? (
                      <div className={`text-center py-10 text-sm ${sub}`}>Р”РѕР»РµР№ РІР»Р°РґРµР»СЊС†РµРІ Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</div>
                    ) : (
                      <div className="space-y-2">
                        {archiveData.owners.map(o => (
                          <button key={o.ownerId} onClick={() => gotoOwnerSalary(o.ownerId)}
                            className={`${glass} rounded-2xl p-3 w-full text-left transition active:scale-[0.98]`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{o.ownerName}</div>
                                <div className={`text-[11px] ${sub} mt-0.5`}>{o.bookingCount} Р·Р°РїРёСЃРµР№ В· РЅР°С‡РёСЃР»РµРЅРѕ: +{o.totalAccrued.toLocaleString('ru')} в‚Ѕ В· РІС‹РїР»Р°С‡РµРЅРѕ: в€’{o.totalPaid.toLocaleString('ru')} в‚Ѕ</div>
                              </div>
                              <div className="font-bold text-sm shrink-0" style={{ color: '#312E81' }}>
                                {(o.totalAccrued - o.totalPaid).toLocaleString('ru')} в‚Ѕ
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

          {/* в”Ђв”Ђ SETTINGS: COMPANY в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'company' && (            <motion.div key="s-company" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">РџСЂРѕС„РёР»СЊ РєРѕРјРїР°РЅРёРё</h2>
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-2" style={{ background: primary }}>A</div>
                <button className="text-xs" style={{ color: primary }}>РР·РјРµРЅРёС‚СЊ Р»РѕРіРѕС‚РёРї</button>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'РќР°Р·РІР°РЅРёРµ', key: 'name', placeholder: 'ATMOSFERA' },
                  { label: 'Р®СЂ. РЅР°Р·РІР°РЅРёРµ', key: 'legalName', placeholder: 'РРџ РРІР°РЅРѕРІ Р.Р.' },
                  { label: 'РРќРќ', key: 'inn', placeholder: '771234567890' },
                  { label: 'РђРґСЂРµСЃ', key: 'address', placeholder: 'РњРѕСЃРєРІР°, СѓР». Р“Р°СЂР°Р¶РЅР°СЏ, 15' },
                  { label: 'РўРµР»РµС„РѕРЅ', key: 'phone', placeholder: '+7 (495) 000-00-00' },
                  { label: 'Email', key: 'email', placeholder: 'info@atmosfera.ru' },
                ].map(f => (
                  <div key={f.key}>
                    <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                    <input className={inputCls} placeholder={f.placeholder} value={(company as any)[f.key]} onChange={e => setCompany(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: SCHEDULE в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'schedule' && (
            <motion.div key="s-schedule" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">Р Р°СЃРїРёСЃР°РЅРёРµ СЂР°Р±РѕС‚С‹</h2>
              {scheduleState.map((day, i) => (
                <div key={day.day} className={`${glass} rounded-2xl p-4 mb-2`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{day.day}</span>
                    <button onClick={() => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, active: !d.active } : d))}
                      className="w-11 h-6 rounded-full relative transition-all" style={{ background: day.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  {day.active && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РћС‚РєСЂС‹С‚РёРµ</label>
                        <input className={inputCls} type="time" value={day.open} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Р—Р°РєСЂС‹С‚РёРµ</label>
                        <input className={inputCls} type="time" value={day.close} onChange={e => setScheduleState(prev => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: CLIENTS в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'clients' && (
            <OwnerClientsScreen
              settingsClientId={settingsClientId}
              setSettingsClientId={setSettingsClientId}
              settingsClientSearchMode={settingsClientSearchMode}
              setSettingsClientSearchMode={setSettingsClientSearchMode}
              settingsClientSearchQuery={settingsClientSearchQuery}
              setSettingsClientSearchQuery={setSettingsClientSearchQuery}
              editingSettingsClientCard={editingSettingsClientCard}
              setEditingSettingsClientCard={setEditingSettingsClientCard}
              clientHistoryServiceFilter={clientHistoryServiceFilter}
              setClientHistoryServiceFilter={setClientHistoryServiceFilter}
              clientCardDrafts={clientCardDrafts}
              setClientCardDrafts={setClientCardDrafts}
              savingClientId={savingClientId}
              draftVehicles={draftVehicles}
              setDraftVehicles={setDraftVehicles}
              onCreateClient={() => setShowCreateClient(true)}
              onDeleteClient={handleDeleteSettingsClient}
              onSaveClientCard={handleSaveClientCard}
              onOpenBookingForClient={openBookingForClient}
              onSelectBooking={(booking) => { setSelectedBooking(booking); setShowBookingDetail(true); }}
              primary={primary}
              glass={glass}
              sub={sub}
              inputCls={inputCls}
              selectCls={selectCls}
              isDark={isDark}
            />
          )}

          {/* в”Ђв”Ђ SETTINGS: DEPOSIT в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'deposit' && (
            <DepositPanel onBack={() => setSettingsSection(null)} />
          )}

          {/* в”Ђв”Ђ SETTINGS: BOXES в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'boxes' && (
            <motion.div key="s-boxes" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">РЈРїСЂР°РІР»РµРЅРёРµ Р±РѕРєСЃР°РјРё</h2>
                <button
                  onClick={handleAddBoxDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} strokeWidth={1.75} />
                  Р”РѕР±Р°РІРёС‚СЊ Р±РѕРєСЃ
                </button>
              </div>
              {boxes.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  Р‘РѕРєСЃРѕРІ РїРѕРєР° РЅРµС‚. Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІС‹Р№ Р±РѕРєСЃ Рё СЃРѕС…СЂР°РЅРёС‚Рµ РёР·РјРµРЅРµРЅРёСЏ.
                </div>
              )}
              {boxes.map((box, i) => (
                <div key={box.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${primary}18` }}>
                        <Box size={14} strokeWidth={1.75} style={{ color: primary }} />
                      </div>
                      <span className="font-medium">{box.name || `Р‘РѕРєСЃ ${i + 1}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRemoveBoxDraft(box.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => setBoxes(p => p.map((b, j) => j === i ? { ...b, active: !b.active } : b))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: box.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${box.active ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>РќР°Р·РІР°РЅРёРµ Р±РѕРєСЃР°</label>
                      <input className={inputCls} value={box.name} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, name: e.target.value } : b))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ/С‡Р°СЃ)</label>
                      <input className={inputCls} type="number" value={numberInputValue(box.pricePerHour)} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, pricePerHour: numberFromInput(e.target.value) } : b))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Р“СЂСѓРїРїР° СЂРµСЃСѓСЂСЃРѕРІ</label>
                      <select className={selectCls} value={box.resourceGroup} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, resourceGroup: e.target.value } : b))}>
                        <option value="wash">РњРѕР№РєР°</option>
                        <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>РћРїРёСЃР°РЅРёРµ</label>
                    <input className={inputCls} value={box.description} onChange={e => setBoxes(p => p.map((b, j) => j === i ? { ...b, description: e.target.value } : b))} />
                  </div>

                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: SERVICES в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'services' && (
            <motion.div key="s-services" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold">РЈСЃР»СѓРіРё Рё С†РµРЅС‹</h2>
                <button
                  onClick={handleAddServiceDraft}
                  className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  style={{ background: `${primary}18`, color: primary }}
                >
                  <Plus size={15} strokeWidth={1.75} />
                  Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={15} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                <input className={`${inputCls} pl-9`} type="text" placeholder="РџРѕРёСЃРє СѓСЃР»СѓРі..." value={servicesSearchQuery} onChange={e => setServicesSearchQuery(e.target.value)} />
              </div>
              {services.length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-sm ${sub}`}>
                  РЈСЃР»СѓРі РїРѕРєР° РЅРµС‚. Р”РѕР±Р°РІСЊС‚Рµ РїРµСЂРІСѓСЋ СѓСЃР»СѓРіСѓ Рё СЃРѕС…СЂР°РЅРёС‚Рµ РёР·РјРµРЅРµРЅРёСЏ.
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
                  ? [`РјР°С‚РµСЂРёР°Р»С‹: ${Math.round(cardMaterialsCost).toLocaleString('ru')} в‚Ѕ`, ...summary]
                  : summary;
                return (
                <div key={service.id} className={`${glass} rounded-2xl p-4 mb-3`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${primary}18` }}>
                        <Sliders size={14} strokeWidth={1.75} style={{ color: primary }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">{service.name || `РЈСЃР»СѓРіР° ${i + 1}`}</div>
                        <div className={`text-xs ${sub} truncate`}>
                          {service.category} В· {service.price ? `${service.price.toLocaleString('ru')} в‚Ѕ` : 'С†РµРЅР° РЅРµ СѓРєР°Р·Р°РЅР°'} В· {service.duration} РјРёРЅ
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingServiceId(service.id); setShowServiceSettings(true); }}
                        title="РќР°СЃС‚СЂРѕРёС‚СЊ СѓСЃР»СѓРіСѓ"
                        className="p-2 rounded-xl"
                        style={{ background: `${primary}14`, color: primary }}
                      >
                        <Settings size={15} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => handleRemoveServiceDraft(service.id)} className={`p-2 rounded-xl ${glass} text-red-500`}>
                        <X size={14} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => setServicesState(p => p.map((item, j) => j === i ? { ...item, active: !item.active } : item))}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: service.active ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
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
                      <Settings size={11} strokeWidth={1.75} /> РўРѕРЅРєР°СЏ РЅР°СЃС‚СЂРѕР№РєР° СЂР°СЃС‡С‘С‚Р°
                    </button>
                  </div>
                </div>
              );
              })}
              {servicesSearchQuery.trim() && services.filter((s) => [s.name, s.category, s.desc || ''].some((v) => v.toLowerCase().includes(servicesSearchQuery.trim().toLowerCase()))).length === 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-3 text-center`}>
                  <div className={`text-sm ${sub} mb-2`}>По запросу «{servicesSearchQuery.trim()}» услуг не найдено</div>
                  <button
                    onClick={() => handleCreateServiceFromQuery(servicesSearchQuery.trim())}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: primary }}
                  >
                    Возможно вы хотите создать новую? «{servicesSearchQuery.trim().slice(0, 30)}»
                  </button>
                  <div className={`text-xs ${sub} mt-2`}>Перенаправит на форму создания новой услуги</div>
                </div>
              )}
                            <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
              <p className={`text-xs ${sub} text-center mt-2`}>РР·РјРµРЅРµРЅРёСЏ РїСЂРёРјРµРЅСЏСЋС‚СЃСЏ Рє РЅРѕРІС‹Рј Р·Р°РІРµСЂС€С‘РЅРЅС‹Рј Р·Р°РїРёСЃСЏРј</p>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: EMPLOYEES в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'employees' && (
            <motion.div key="s-employees" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">РЎРѕС‚СЂСѓРґРЅРёРєРё</h2>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">РќР°РЅСЏС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°</div>
                    <div className={`text-xs ${sub}`}>РЎРѕР·РґР°Р№С‚Рµ Р»РѕРіРёРЅ Рё РїР°СЂРѕР»СЊ РґР»СЏ РЅРѕРІРѕРіРѕ РјР°СЃС‚РµСЂР°</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                    <Plus size={18} strokeWidth={1.75} style={{ color: accent }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Р РѕР»СЊ</label>
                    <select
                      className={selectCls}
                      value={newEmployee.role}
                      onChange={e => setNewEmployee(p => ({ ...p, role: e.target.value as 'admin' | 'worker' | 'accountant' }))}
                    >
                      <option value="worker">РњР°СЃС‚РµСЂ</option>
                      <option value="admin">РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</option>
                      <option value="accountant">Р‘СѓС…РіР°Р»С‚РµСЂ</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РРјСЏ</label>
                    <input className={inputCls} value={newEmployee.name} onChange={e => setNewEmployee(p => ({ ...p, name: e.target.value }))} placeholder="РРІР°РЅ РРІР°РЅРѕРІ" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Р›РѕРіРёРЅ</label>
                    <input className={inputCls} value={newEmployee.login} onChange={e => setNewEmployee(p => ({ ...p, login: e.target.value }))} placeholder="worker_ivan" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РџР°СЂРѕР»СЊ</label>
                    <input className={inputCls} type="password" value={newEmployee.password} onChange={e => setNewEmployee(p => ({ ...p, password: e.target.value }))} placeholder="РњРёРЅРёРјСѓРј 1 СЃРёРјРІРѕР»" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={newEmployee.telegramChatId} onChange={e => setNewEmployee(p => ({ ...p, telegramChatId: e.target.value }))} placeholder="РќР°РїСЂРёРјРµСЂ: 123456789" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РўРµР»РµС„РѕРЅ</label>
                    <input className={inputCls} value={newEmployee.phone} onChange={e => setNewEmployee(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Email</label>
                    <input className={inputCls} value={newEmployee.email} onChange={e => setNewEmployee(p => ({ ...p, email: e.target.value }))} placeholder="worker@atmosfera.ru" />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>% РѕС‚ РІС‹СЂСѓС‡РєРё</label>
                    <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={newEmployee.percent === '' ? '' : newEmployee.percent} onChange={e => { const r = e.target.value; if (r === '') { setNewEmployee(p => ({ ...p, percent: '' })); return; } const n = parseFloat(r); if (!isNaN(n)) { setNewEmployee(p => ({ ...p, percent: Math.min(100, Math.max(0, n)) })); } }} onBlur={() => setNewEmployee(p => ({ ...p, percent: p.percent === '' ? 0 : p.percent }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РћРєР»Р°Рґ (в‚Ѕ)</label>
                    <input className={inputCls} type="number" min={0} value={newEmployee.salaryBase} onChange={e => setNewEmployee(p => ({ ...p, salaryBase: Math.max(0, +e.target.value) }))} />
                  </div>
                </div>
                <button onClick={() => void handleHireWorker()} disabled={employeeActionLoading?.type === 'hire'} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-3 disabled:opacity-60" style={{ background: accent }}>
                  <Plus size={16} strokeWidth={1.75} />
                  РќР°РЅСЏС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°
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
                        РЈРІРѕР»РёС‚СЊ
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
                        РЎР±СЂРѕСЃРёС‚СЊ
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>% РѕС‚ РІС‹СЂСѓС‡РєРё</label>
                      <input className={inputCls} type="number" step="0.00001" min={0} max={100} value={emp.percent === '' ? '' : emp.percent} onChange={e => { const r = e.target.value; if (r === '') { setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: '' } : em)); return; } const n = parseFloat(r); if (!isNaN(n)) { setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: Math.min(100, Math.max(0, n)) } : em)); } }} onBlur={() => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, percent: em.percent === '' ? 0 : em.percent } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>РћРєР»Р°Рґ (в‚Ѕ)</label>
                      <input className={inputCls} type="number" value={emp.salaryBase} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryBase: +e.target.value } : em))} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>РћРєР»Р°Рґ Р·Р° РІС‹С…РѕРґ (в‚Ѕ)</label>
                      <input className={inputCls} type="number" min={0} value={emp.salaryPerShift || 0} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, salaryPerShift: Math.max(0, +e.target.value) } : em))} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className={`text-xs ${sub} block mb-1`}>Telegram chat id</label>
                    <input className={inputCls} value={emp.telegramChatId} onChange={e => setEmployeeSettings(p => p.map((em, j) => j === i ? { ...em, telegramChatId: e.target.value } : em))} placeholder="РќР°РїСЂРёРјРµСЂ: 123456789" />
                  </div>
                </div>
              ))}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: NOTIFICATIONS в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'notifications' && (
            <motion.div key="s-notifs" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">РЈРІРµРґРѕРјР»РµРЅРёСЏ</h2>
              <div className={`text-xs font-medium ${sub} mb-2 uppercase tracking-wider`}>РљР°РЅР°Р»С‹</div>
              {[
                { key: 'telegramBot', label: 'Telegram Bot', desc: '@atmosfera_bot' },
                { key: 'emailReports', label: 'Email РѕС‚С‡С‘С‚С‹', desc: 'owner@atmosfera.ru' },
                { key: 'smsReminders', label: 'SMS РЅР°РїРѕРјРёРЅР°РЅРёСЏ', desc: 'Р”Р»СЏ РєР»РёРµРЅС‚РѕРІ' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>РћС‚С‡С‘С‚С‹</div>
              {[
                { key: 'lowStock', label: 'РќРёР·РєРёР№ РѕСЃС‚Р°С‚РѕРє СЃРєР»Р°РґР°', desc: 'РџСЂРё СЃРЅРёР¶РµРЅРёРё РґРѕ 5 РµРґРёРЅРёС†' },
                { key: 'dailyReport', label: 'Р•Р¶РµРґРЅРµРІРЅС‹Р№ РѕС‚С‡С‘С‚', desc: 'Р’ 21:00 РєР°Р¶РґС‹Р№ РґРµРЅСЊ' },
                { key: 'weeklyReport', label: 'Р•Р¶РµРЅРµРґРµР»СЊРЅС‹Р№ РѕС‚С‡С‘С‚', desc: 'РџРѕ РїРѕРЅРµРґРµР»СЊРЅРёРєР°Рј РІ 9:00' },
              ].map(item => (
                <SettingRow key={item.key} label={item.label} desc={item.desc} value={notifSettings[item.key as keyof typeof notifSettings]}
                  onChange={() => setNotifSettings(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
              ))}
              <div className={`text-xs font-medium ${sub} mb-2 mt-4 uppercase tracking-wider`}>РќР°РїРѕРјРёРЅР°РЅРёСЏ</div>
              <SettingRow
                label="РђРІС‚РѕРЅР°РїРѕРјРёРЅР°РЅРёСЏ Рѕ Р·Р°РїРёСЃСЏС…"
                desc="Часовой cron Vercel отправляет напоминания за выбранный интервал, владелец может дублировать их вручную"
                value={notifSettings.bookingReminders}
                onChange={() => setNotifSettings((current) => ({ ...current, bookingReminders: !current.bookingReminders }))}
              />
              {notifSettings.bookingReminders && (
                <div className={`${glass} rounded-2xl p-4 mb-2 mt-2`}>
                  <div className="text-sm font-medium mb-2">Интервал напоминания</div>
                  <div className={`text-xs ${sub} mb-3`}>За сколько до визита придёт напоминание клиенту и мастеру (от 1 часа до 7 дней)</div>
                  <select
                    value={String((notifSettings as any).bookingReminderHours ?? 24)}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setNotifSettings(p => ({ ...p, bookingReminderHours: v, bookingReminderDays: v >= 24 ? Math.round(v/24) : 1 } as any));
                    }}
                    className={selectCls}
                  >
                    <option value="1">За 1 час</option>
                    <option value="2">За 2 часа</option>
                    <option value="3">За 3 часа</option>
                    <option value="6">За 6 часов</option>
                    <option value="12">За 12 часов</option>
                    <option value="24">За 24 часа (1 день)</option>
                    <option value="48">За 48 часов (2 дня)</option>
                    <option value="72">За 72 часа (3 дня)</option>
                    <option value="96">За 96 часов (4 дня)</option>
                    <option value="120">За 120 часов (5 дней)</option>
                    <option value="168">За 168 часов (7 дней)</option>
                  </select>
                  <div className="mt-3">
                    <label className={`text-xs ${sub} block mb-1`}>Своё значение (1–168 часов)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={(notifSettings as any).bookingReminderHours ?? 24}
                      onChange={e => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        const clamped = Math.max(1, Math.min(168, Math.round(v)));
                        setNotifSettings(p => ({ ...p, bookingReminderHours: clamped, bookingReminderDays: clamped >= 24 ? Math.round(clamped/24) : 1 } as any));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className={`text-xs ${sub} mt-2`}>
                    {(() => {
                      const h = (notifSettings as any).bookingReminderHours ?? 24;
                      if (h < 24) return `Напоминание придёт за ${h} ч. до записи (проверка каждый час, ±40 мин)`;
                      const d = Math.round(h/24);
                      const label = d === 1 ? 'день' : d < 5 ? 'дня' : 'дней';
                      return `Напоминание придёт за ${d} ${label} до даты записи (всей датой)`;
                    })()}
                  </div>
                </div>
              )}
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: INTEGRATIONS в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'integrations' && (
            <motion.div key="s-integrations" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">РРЅС‚РµРіСЂР°С†РёРё</h2>
              {[
                { key: 'telegram', label: 'Telegram Bot', desc: 'РЈРІРµРґРѕРјР»РµРЅРёСЏ Рё СѓРїСЂР°РІР»РµРЅРёРµ С‡РµСЂРµР· Telegram', color: '#229ED9' },
                { key: 'yookassa', label: 'Р®РљР°СЃСЃР°', desc: 'РџСЂРёС‘Рј РѕРЅР»Р°Р№РЅ-РїР»Р°С‚РµР¶РµР№', color: '#7B61FF' },
                { key: 'amoCrm', label: 'amoCRM', desc: 'РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РєР»РёРµРЅС‚СЃРєРѕР№ Р±Р°Р·С‹', color: '#E6007E' },
              ].map(item => (
                <div key={item.key} className={`${glass} rounded-2xl p-4 mb-2 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}18` }}>
                    <Globe size={18} strokeWidth={1.75} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className={`text-xs ${sub}`}>{item.desc}</div>
                  </div>
                  <button onClick={() => setIntegrations(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: integrations[item.key as keyof typeof integrations] ? item.color : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${integrations[item.key as keyof typeof integrations] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
              <div className={`${glass} rounded-2xl p-4 mb-2`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#4285F418' }}>
                    <Globe size={18} strokeWidth={1.75} style={{ color: '#4285F4' }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Google РљР°Р»РµРЅРґР°СЂСЊ</div>
                    <div className={`text-xs ${sub}`}>Р”РІСѓСЃС‚РѕСЂРѕРЅРЅСЏСЏ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ СЂР°СЃРїРёСЃР°РЅРёСЏ</div>
                  </div>
                  {integrations.googleCalendar ? (
                    <span className="text-[11px] px-2 py-1 rounded-full shrink-0" style={{ background: '#22C55E18', color: '#22C55E' }}>РџРѕРґРєР»СЋС‡РµРЅРѕ</span>
                  ) : (
                    <button
                      onClick={() => { void handleGoogleConnect(); }}
                      disabled={googleConnectLoading}
                      className="text-xs px-3 py-1.5 rounded-full text-white font-medium shrink-0 disabled:opacity-50"
                      style={{ background: '#4285F4' }}>
                      {googleConnectLoading ? 'РџРѕРґРєР»СЋС‡РµРЅРёРµ...' : 'РџРѕРґРєР»СЋС‡РёС‚СЊ'}
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
                      РЎРѕР·РґР°С‚СЊ OAuth-РєР»РёРµРЅС‚ РІ Google <ExternalLink size={12} strokeWidth={1.75} />
                    </a>
                    <div className={`text-[11px] ${sub}`}>
                      Р•СЃР»Рё Google РѕС‚РєСЂРѕРµС‚ РјРµРЅСЋ СЃ РїСЂРѕРµРєС‚Р°РјРё: СЃРѕР·РґР°Р№С‚Рµ РїСЂРѕРµРєС‚ (СЌС‚Рѕ Р±РµСЃРїР»Р°С‚РЅРѕ),
                      Р·Р°С‚РµРј РЅР°Р¶РјРёС‚Рµ <span className="font-medium">Р’РєР»СЋС‡РёС‚СЊ Google Calendar API</span> вЂ”
                      <a
                        href="https://console.cloud.google.com/apis/library/calendar.googleapis.com"
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => { e.preventDefault(); openExternal('https://console.cloud.google.com/apis/library/calendar.googleapis.com'); }}
                        className="underline"
                        style={{ color: '#4285F4' }}
                      >
                        РїСЂСЏРјР°СЏ СЃСЃС‹Р»РєР°
                      </a>, РїРѕСЃР»Рµ С‡РµРіРѕ РІРµСЂРЅРёС‚РµСЃСЊ РЅР° СЌС‚Сѓ СЃС‚СЂР°РЅРёС†Сѓ Рё СЃРѕР·РґР°Р№С‚Рµ OAuth Client ID
                      (Web application), РґРѕР±Р°РІРёРІ РІ РЅРµРіРѕ СЌС‚РѕС‚ Р°РґСЂРµСЃ:
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="flex-1 text-[11px] px-2 py-1 rounded-lg break-all" style={{ background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)' }}>
                          {googleSetupStatus.redirectUri}
                        </code>
                        <button
                          onClick={() => { void handleGoogleCopyUri(); }}
                          className="text-[11px] px-2 py-1 rounded-lg shrink-0 font-medium"
                          style={{ color: '#4285F4', background: '#4285F418' }}>
                          {googleCopiedUri ? 'РћРє' : 'РљРѕРїРёСЂРѕРІР°С‚СЊ'}
                        </button>
                      </div>
                    </div>
                    <label
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium cursor-pointer"
                      style={{ color: googleJsonFile ? '#22C55E' : '#4285F4', background: googleJsonFile ? '#22C55E18' : '#4285F418' }}>
                      {googleJsonFile ? `вњ“ ${googleJsonFile}` : 'Р—Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р» РЅР°СЃС‚СЂРѕРµРє (.json)'}
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
                      <div className={`text-[11px] ${sub}`}>РёР»Рё РІСЃС‚Р°РІСЊС‚Рµ РІСЂСѓС‡РЅСѓСЋ:</div>
                    )}
                    <input
                      className={`${inputCls}`}
                      placeholder="Client ID (вЂ¦apps.googleusercontent.com)"
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
                        {googleSavingKeys ? 'РџРѕРґРєР»СЋС‡РµРЅРёРµ...' : 'РџРѕРґРєР»СЋС‡РёС‚СЊ'}
                      </button>
                      <button
                        onClick={() => { setGoogleSetupOpen(false); setGoogleConnectError(null); }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                        РћС‚РјРµРЅР°
                      </button>
                    </div>
                    <div className={`text-[11px] ${sub} leading-relaxed`}>
                      Р•СЃР»Рё Google РїРѕРєР°Р¶РµС‚ РїСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ В«РЅРµРїСЂРѕРІРµСЂРµРЅРЅРѕРµ РїСЂРёР»РѕР¶РµРЅРёРµВ» вЂ” СЌС‚Рѕ РЅРѕСЂРјР°Р»СЊРЅРѕ
                      РґР»СЏ Р»РёС‡РЅРѕРіРѕ РїРѕРґРєР»СЋС‡РµРЅРёСЏ: РЅР°Р¶РјРёС‚Рµ <span className="font-medium">Advanced</span> в†’
                      <span className="font-medium"> Continue (unsafe)</span>. Р•СЃР»Рё РІРјРµСЃС‚Рѕ РІС…РѕРґР° РїРѕСЏРІРёС‚СЃСЏ
                      <span className="font-medium"> 403 access_denied</span> РёР»Рё В«С‚РѕР»СЊРєРѕ С‚РµСЃС‚РѕРІС‹Рµ
                      РїРѕР»СЊР·РѕРІР°С‚РµР»РёВ» вЂ” РѕС‚РєСЂРѕР№С‚Рµ РЅР°СЃС‚СЂРѕР№РєРё РґРѕСЃС‚СѓРїР° Рё РґРѕР±Р°РІСЊС‚Рµ СЃРІРѕР№ email РІ Test users
                      (РёР»Рё РЅР°Р¶РјРёС‚Рµ <span className="font-medium">Publish app</span>):
                      <button
                        onClick={() => openExternal('https://console.cloud.google.com/apis/credentials/consent')}
                        className="flex items-center justify-center gap-1.5 mt-1.5 w-full py-2 rounded-xl text-[11px] font-medium"
                        style={{ color: '#4285F4', background: '#4285F418' }}>
                        РћС‚РєСЂС‹С‚СЊ OAuth consent screen <ExternalLink size={11} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )}
                {!integrations.googleCalendar && (
                  <div className={`text-xs ${sub}`}>
                    РџРѕРґРєР»СЋС‡РёС‚Рµ Google РљР°Р»РµРЅРґР°СЂСЊ, С‡С‚РѕР±С‹ Р·Р°РїРёСЃРё РёР· Р±РѕС‚Р° Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё РїРѕСЏРІР»СЏР»РёСЃСЊ РІ РєР°Р»РµРЅРґР°СЂРµ,
                    Р° СЃРѕР±С‹С‚РёСЏ РёР· Google вЂ” РІ СЂР°СЃРїРёСЃР°РЅРёРё (РѕС‚РјРµС‡РµРЅС‹ РєР°Рє В«GoogleВ»).
                  </div>
                )}
                {integrations.googleCalendar && (
                  <div className="space-y-2">
                    {googleConnections.length > 0 && (
                      <div className="space-y-1.5">
                        <div className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>
                          РџРѕРґРєР»СЋС‡С‘РЅРЅС‹Рµ РєР°Р»РµРЅРґР°СЂРё ({googleConnections.length})
                        </div>
                        {googleConnections.map(conn => (
                          <div
                            key={conn.id}
                            className="flex items-center gap-2 rounded-xl px-3 py-2"
                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold" style={{ background: '#4285F418', color: '#4285F4' }}>
                              {(conn.name || '?').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{conn.name || 'Р‘РµР· РёРјРµРЅРё'}</div>
                              <div className={`text-[11px] ${sub} truncate`}>{conn.email || 'email РЅРµ РїРѕР»СѓС‡РµРЅ'}</div>
                            </div>
                            <button
                              onClick={() => { void handleGoogleRemoveConnection(conn.id); }}
                              title="РћС‚РєР»СЋС‡РёС‚СЊ СЌС‚РѕС‚ РєР°Р»РµРЅРґР°СЂСЊ"
                              className="text-[11px] px-2 py-1 rounded-lg shrink-0 font-medium"
                              style={{ color: '#EF4444', background: `${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}` }}>
                              РЈР±СЂР°С‚СЊ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { void handleGoogleSyncNow(); }}
                      disabled={googleSyncing}
                      className="w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: '#4285F418', color: '#4285F4' }}>
                      {googleSyncing ? 'РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ...' : 'РЎРёРЅС…СЂРѕРЅРёР·РёСЂРѕРІР°С‚СЊ СЃРµР№С‡Р°СЃ'}
                    </button>
                    {googleSyncResult && (
                      <div className={`text-xs ${sub} space-y-0.5`}>
                        {googleSyncResult.skipped ? (
                          <div>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РїСЂРѕРїСѓС‰РµРЅР° (РЅРµС‚ С‚РѕРєРµРЅРѕРІ РёР»Рё РЅРµС‡РµРіРѕ РґРµР»Р°С‚СЊ)</div>
                        ) : googleSyncResult.created === undefined ? (
                          <div>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ Р·Р°РІРµСЂС€РµРЅР°</div>
                        ) : (
                          <div>
                            РЎРѕР·РґР°РЅРѕ: {googleSyncResult.created} В· РћР±РЅРѕРІР»РµРЅРѕ: {googleSyncResult.updated} В· РћС‚РјРµРЅРµРЅРѕ: {googleSyncResult.cancelled}
                          </div>
                        )}
                        {googleSyncResult.lastSyncAt && (
                          <div>РџРѕСЃР»РµРґРЅСЏСЏ СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ: {new Date(googleSyncResult.lastSyncAt).toLocaleString('ru-RU')}</div>
                        )}
                        {googleSyncResult.error && <div className="text-red-500">РћС€РёР±РєР°: {googleSyncResult.error}</div>}
                        {googleSyncResult.errorDetails && (
                          <div className="text-[11px] leading-relaxed mt-1 text-red-500/90">{googleSyncResult.errorDetails}</div>
                        )}
                      </div>
                    )}
                    {googleSyncError && <div className="text-xs text-red-500">{googleSyncError}</div>}
                    <button
                      onClick={() => {
                        setGoogleInviteOpen(v => !v);
                        setGoogleConnectError(null);
                      }}
                      className="w-full py-2 rounded-xl text-xs font-medium"
                      style={{ color: '#4285F4', background: `${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                      {googleInviteOpen ? 'РЎРєСЂС‹С‚СЊ РїСЂРёРіР»Р°С€РµРЅРёРµ' : '+ РџСЂРёРіР»Р°СЃРёС‚СЊ С‡РµР»РѕРІРµРєР° (РµРіРѕ Google-РєР°Р»РµРЅРґР°СЂСЊ)'}
                    </button>
                    {googleInviteOpen && (
                      <div className="space-y-2 rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                        {!googleInviteLink ? (
                          <>
                            <input
                              className={`${inputCls}`}
                              placeholder="РРјСЏ С‡РµР»РѕРІРµРєР° (РЅР°РїСЂРёРјРµСЂ: РђРЅРЅР°)"
                              value={googleInviteName}
                              onChange={e => setGoogleInviteName(e.target.value)}
                              maxLength={120}
                            />
                            <button
                              onClick={() => { void handleGoogleCreateInvite(); }}
                              disabled={googleInviteLoading || !googleInviteName.trim()}
                              className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                              style={{ background: '#4285F4' }}>
                              {googleInviteLoading ? 'РЎРѕР·РґР°РЅРёРµ СЃСЃС‹Р»РєРё...' : 'РЎРѕР·РґР°С‚СЊ СЃСЃС‹Р»РєСѓ-РїСЂРёРіР»Р°С€РµРЅРёРµ'}
                            </button>
                            <div className={`text-[11px] ${sub} leading-relaxed`}>
                              РћС‚РїСЂР°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ С‡РµР»РѕРІРµРєСѓ (Telegram Рё С‚.Рї.). РћРЅ РѕС‚РєСЂРѕРµС‚ РµС‘,
                              РІРѕР№РґС‘С‚ РІ СЃРІРѕР№ Google-Р°РєРєР°СѓРЅС‚ Рё РїРѕРґС‚РІРµСЂРґРёС‚ РґРѕСЃС‚СѓРї вЂ” РїРѕСЃР»Рµ СЌС‚РѕРіРѕ
                              РІСЃРµ Р·Р°РїРёСЃРё Р±СѓРґСѓС‚ РїРѕСЏРІР»СЏС‚СЊСЃСЏ Рё РІ РµРіРѕ РєР°Р»РµРЅРґР°СЂРµ.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={`text-[11px] ${sub} leading-relaxed`}>
                              РЎСЃС‹Р»РєР° РґР»СЏ <span className="font-medium">{googleInviteName.trim() || 'С‡РµР»РѕРІРµРєР°'}</span>.
                              РџРµСЂРµС€Р»РёС‚Рµ РµС‘ вЂ” РїРѕСЃР»Рµ Р°РІС‚РѕСЂРёР·Р°С†РёРё РєР°Р»РµРЅРґР°СЂСЊ РїРѕСЏРІРёС‚СЃСЏ РІ СЃРїРёСЃРєРµ РІС‹С€Рµ:
                            </div>
                            <div className="flex items-center gap-1.5">
                              <code className="flex-1 text-[10px] px-2 py-1.5 rounded-lg break-all" style={{ background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)' }}>
                                {googleInviteLink}
                              </code>
                              <button
                                onClick={() => { void handleGoogleCopyLink(); }}
                                className="text-[11px] px-2 py-1 rounded-lg shrink-0 font-medium"
                                style={{ color: '#4285F4', background: '#4285F418' }}>
                                {googleCopiedLink ? 'РћРє' : 'РљРѕРїРёСЂРѕРІР°С‚СЊ'}
                              </button>
                            </div>
                            <button
                              onClick={() => { setGoogleInviteLink(''); setGoogleInviteName(''); }}
                              className="w-full py-2 rounded-xl text-[11px] font-medium"
                              style={{ color: '#4285F4', background: `${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}` }}>
                              РЎРѕР·РґР°С‚СЊ РµС‰С‘ РѕРґРЅСѓ СЃСЃС‹Р»РєСѓ
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => { void handleGoogleDisconnect(); }}
                      className="w-full py-2 rounded-xl text-xs font-medium"
                      style={{ color: '#EF4444', background: `${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                      РћС‚РєР»СЋС‡РёС‚СЊ Google РљР°Р»РµРЅРґР°СЂСЊ
                    </button>
                    <button
                      onClick={() => { void handleGoogleEditKeys(); }}
                      className="w-full py-2 rounded-xl text-xs font-medium"
                      style={{ color: '#4285F4', background: `${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                      РР·РјРµРЅРёС‚СЊ РєР»СЋС‡Рё РїРѕРґРєР»СЋС‡РµРЅРёСЏ
                    </button>
                  </div>
                )}
              </div>
              <button onClick={handleSaveSettings} className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-2" style={{ background: primary }}>
                <Save size={16} strokeWidth={1.75} />{settingsSaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: CONTENT в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'content' && (
            <motion.div key="s-content" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
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

          {/* в”Ђв”Ђ SETTINGS: SECURITY в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'security' && (
            <motion.div key="s-security" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ</h2>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className={`text-xs font-medium ${sub} mb-3`}>РЎРњР•РќРђ РџРђР РћР›РЇ</div>
                <div className="space-y-3">
                  {[{ key: 'current', label: 'РўРµРєСѓС‰РёР№ РїР°СЂРѕР»СЊ' }, { key: 'new_', label: 'РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ' }, { key: 'confirm', label: 'РџРѕРІС‚РѕСЂРёС‚Рµ РїР°СЂРѕР»СЊ' }].map(f => (
                    <div key={f.key}>
                      <label className={`text-xs ${sub} block mb-1`}>{f.label}</label>
                      <div className="relative">
                        <input className={inputCls} type={showPass ? 'text' : 'password'} placeholder="вЂўвЂўвЂўвЂўвЂўвЂўвЂўвЂў"
                          value={password[f.key as keyof typeof password]}
                          onChange={e => {
                            setSecurityError(null);
                            setSecuritySaved(false);
                            setPassword(p => ({ ...p, [f.key]: e.target.value }));
                          }} />
                        <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPass ? <EyeOff size={14} strokeWidth={1.75} className={sub} /> : <Eye size={14} strokeWidth={1.75} className={sub} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {securityError && <div className="mt-3 text-xs text-red-500">{securityError}</div>}
                {securitySaved && <div className="mt-3 text-xs text-green-600">РќР°СЃС‚СЂРѕР№РєРё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё СЃРѕС…СЂР°РЅРµРЅС‹</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Р”РІСѓС…С„Р°РєС‚РѕСЂРЅР°СЏ Р°СѓС‚РµРЅС‚РёС„РёРєР°С†РёСЏ</div>
                    <div className={`text-xs ${sub}`}>РљРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РїСЂРёС…РѕРґРёС‚ РІ Telegram РІР»Р°РґРµР»СЊС†Р°</div>
                  </div>
                  <button
                    onClick={() => {
                      setSecurityError(null);
                      setSecuritySaved(false);
                      setTwoFactor(!twoFactor);
                    }}
                    className="w-11 h-6 rounded-full relative transition-all shrink-0"
                    style={{ background: twoFactor ? primary : isDark ? 'rgba(255,255,255,0.15)' : '#D4D4D8' }}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${twoFactor ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className={`text-xs ${sub} mt-3`}>
                  {staffProfile?.telegramChatId
                    ? `Telegram РїРѕРґРєР»СЋС‡С‘РЅ: ${staffProfile.telegramChatId}`
                    : 'РЎРЅР°С‡Р°Р»Р° РїСЂРёРІСЏР¶РёС‚Рµ Telegram РІР»Р°РґРµР»СЊС†Р°, РёРЅР°С‡Рµ 2FA РЅРµ РІРєР»СЋС‡РёС‚СЃСЏ.'}
                </div>
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-3 border ${isDark ? 'border-red-400/20' : 'border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(239,68,68,0.16)' : '#FEE2E2', color: '#EF4444' }}>
                    <AlertCircle size={18} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">РћРїР°СЃРЅР°СЏ Р·РѕРЅР°: РїРѕР»РЅР°СЏ РѕС‡РёСЃС‚РєР° CRM</div>
                    <div className={`text-xs ${sub} mt-1`}>
                      Р­С‚Р° РѕРїРµСЂР°С†РёСЏ СѓРґР°Р»РёС‚ РїРѕС‡С‚Рё РІСЃРµ СЂР°Р±РѕС‡РёРµ РґР°РЅРЅС‹Рµ CRM Рё РїРµСЂРµСЃРѕР·РґР°СЃС‚ СЃРёСЃС‚РµРјСѓ РґРѕ СЃС‚Р°СЂС‚РѕРІРѕРіРѕ СЃРѕСЃС‚РѕСЏРЅРёСЏ. РЎРѕС…СЂР°РЅСЏС‚СЃСЏ С‚РѕР»СЊРєРѕ РІР»Р°РґРµР»СЊС†С‹ Рё С‚РµРєСѓС‰Р°СЏ СЃРµСЃСЃРёСЏ РёРЅРёС†РёР°С‚РѕСЂР°.
                    </div>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border p-3 text-xs ${isDark ? 'border-red-400/20 bg-red-500/10 text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <div className="font-semibold">Р‘СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹ РєР»РёРµРЅС‚С‹, Р·Р°РїРёСЃРё, СЃРѕС‚СЂСѓРґРЅРёРєРё, СЃРєР»Р°Рґ, СЂР°СЃС…РѕРґС‹, Р¶Р°Р»РѕР±С‹, СѓРІРµРґРѕРјР»РµРЅРёСЏ, Р»РёС€РЅРёРµ СЃРµСЃСЃРёРё Рё РІСЂРµРјРµРЅРЅС‹Рµ РєРѕРґС‹.</div>
                  <div className="mt-2">РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РёРґС‘С‚ РІ С‚СЂРё С€Р°РіР°: РїР°СЂРѕР»СЊ РІР»Р°РґРµР»СЊС†Р°, РєРѕРґ СЃРѕР·РґР°С‚РµР»СЏ РёР· Telegram Рё С‚РѕС‡РЅС‹Р№ РІРІРѕРґ РєРѕРЅС‚СЂРѕР»СЊРЅРѕР№ С„СЂР°Р·С‹.</div>
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
                      <div key={warning} className={`rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-white/5 text-[#E4E4E7]' : 'bg-black/[0.03] text-[#131316]'}`}>
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РЁР°Рі 1. Р’РІРµРґРёС‚Рµ РїР°СЂРѕР»СЊ РІР»Р°РґРµР»СЊС†Р°</label>
                    <input
                      className={inputCls}
                      type="password"
                      placeholder="РўРµРєСѓС‰РёР№ РїР°СЂРѕР»СЊ"
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
                      {resetLoadingStep === 'start' ? 'Р—Р°РїСЂР°С€РёРІР°РµРј РєРѕРґ...' : resetStage === 'idle' ? 'Р—Р°РїСЂРѕСЃРёС‚СЊ РєРѕРґ СЃРѕР·РґР°С‚РµР»СЏ' : 'Р—Р°РїСЂРѕСЃРёС‚СЊ РЅРѕРІС‹Р№ РєРѕРґ'}
                    </button>
                    {resetStage !== 'idle' && (
                      <button
                        type="button"
                        onClick={clearOwnerResetFlow}
                        disabled={Boolean(resetLoadingStep)}
                        className={`flex-1 py-3 rounded-2xl font-semibold border ${isDark ? 'border-white/10 text-[#E4E4E7]' : 'border-black/10 text-[#131316]'} disabled:opacity-60`}
                      >
                        РЎР±СЂРѕСЃРёС‚СЊ СЃС†РµРЅР°СЂРёР№
                      </button>
                    )}
                  </div>
                </div>

                {resetStage !== 'idle' && (
                  <div className="mt-4 space-y-3">
                    <div className={`text-xs ${sub}`}>
                      РЁР°Рі 2. РџСЂРѕРІРµСЂСЊС‚Рµ Telegram СЃРѕР·РґР°С‚РµР»СЏ Рё РІРІРµРґРёС‚Рµ РєРѕРґ
                      {resetCodeExpiresAt ? ` РґРѕ ${resetCodeExpiresAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}.
                    </div>
                    <div className={`${glass} rounded-xl px-3 py-3`}>
                      <div className={`text-[11px] ${sub}`}>РљРѕРЅС‚СЂРѕР»СЊРЅР°СЏ С„СЂР°Р·Р°</div>
                      <div className="text-sm font-semibold mt-1 break-words">{resetRequiredPhrase || 'Р¤СЂР°Р·Р° РїРѕСЏРІРёС‚СЃСЏ РїРѕСЃР»Рµ Р·Р°РїСЂРѕСЃР° РєРѕРґР°'}</div>
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>РљРѕРґ СЃРѕР·РґР°С‚РµР»СЏ</label>
                      <input
                        className={inputCls}
                        type="text"
                        inputMode="numeric"
                        placeholder="6 С†РёС„СЂ РёР· Telegram"
                        value={resetCreatorCode}
                        onChange={(e) => {
                          setResetError(null);
                          setResetInfo(null);
                          setResetCreatorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                      />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Р’РІРµРґРёС‚Рµ С„СЂР°Р·Сѓ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ</label>
                      <input
                        className={inputCls}
                        type="text"
                        placeholder="РџРћР”РўР’Р•Р Р–Р”РђР® РџРћР›РќРЈР® РћР§РРЎРўРљРЈ"
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
                      {resetLoadingStep === 'approve' ? 'РџСЂРѕРІРµСЂСЏРµРј РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ...' : resetStage === 'armed' ? 'Р¤РёРЅР°Р»СЊРЅС‹Р№ С€Р°Рі СѓР¶Рµ СЂР°Р·Р±Р»РѕРєРёСЂРѕРІР°РЅ' : 'РџРѕРґС‚РІРµСЂРґРёС‚СЊ Рё СЂР°Р·Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ РѕС‡РёСЃС‚РєСѓ'}
                    </button>
                  </div>
                )}

                {resetStage === 'armed' && (
                  <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-red-400/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                    <div className="text-sm font-semibold text-red-500">Р¤РёРЅР°Р»СЊРЅРѕРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ</div>
                    <div className={`text-xs mt-2 ${isDark ? 'text-red-100' : 'text-red-700'}`}>
                      Р‘СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹ СЃРѕС‚СЂСѓРґРЅРёРєРё, РєР»РёРµРЅС‚С‹, РІСЃРµ Р·Р°РїРёСЃРё, СЃРєР»Р°Рґ, СЂР°СЃС…РѕРґС‹, Р¶Р°Р»РѕР±С‹, СѓРІРµРґРѕРјР»РµРЅРёСЏ, РІСЂРµРјРµРЅРЅС‹Рµ РєРѕРґС‹ Рё РїРѕС‡С‚Рё РІСЃРµ РЅР°СЃС‚СЂРѕР№РєРё CRM. Р”РµР№СЃС‚РІРёРµ РЅРµРѕР±СЂР°С‚РёРјРѕ.
                    </div>
                    <div className={`text-xs mt-3 ${sub}`}>
                      {resetCountdown > 0
                        ? `РљРЅРѕРїРєР° Р°РєС‚РёРІРёСЂСѓРµС‚СЃСЏ С‡РµСЂРµР· ${resetCountdown} СЃРµРє. Р—Р° СЌС‚Рѕ РІСЂРµРјСЏ РµС‰С‘ СЂР°Р· РїСЂРѕРІРµСЂСЊС‚Рµ, С‡С‚Рѕ РёРјРµРЅРЅРѕ Р±СѓРґРµС‚ СѓРґР°Р»РµРЅРѕ.`
                        : 'РўР°Р№РјРµСЂ Р·Р°РІРµСЂС€С‘РЅ. Р•СЃР»Рё РІСЃС‘ РІРµСЂРЅРѕ, РјРѕР¶РЅРѕ Р·Р°РїСѓСЃРєР°С‚СЊ РїРѕР»РЅСѓСЋ РѕС‡РёСЃС‚РєСѓ CRM.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExecuteOwnerReset()}
                      disabled={resetExecuteLocked}
                      className="w-full mt-4 py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
                      style={{ background: '#991B1B' }}
                    >
                      {resetLoadingStep === 'execute'
                        ? 'РЈРґР°Р»СЏРµРј РґР°РЅРЅС‹Рµ...'
                        : resetCountdown > 0
                          ? `РљРЅРѕРїРєР° Р°РєС‚РёРІРёСЂСѓРµС‚СЃСЏ С‡РµСЂРµР· ${resetCountdown} СЃРµРє`
                          : 'РџРѕРґС‚РІРµСЂР¶РґР°СЋ РїРѕР»РЅСѓСЋ РѕС‡РёСЃС‚РєСѓ CRM'}
                    </button>
                  </div>
                )}

                {resetError && <div className="mt-4 text-xs text-red-500">{resetError}</div>}
                {resetInfo && <div className="mt-4 text-xs text-green-600">{resetInfo}</div>}
              </div>
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs ${sub} mb-2`}>РђРљРўРР’РќР«Р• РЎР•РЎРЎРР</div>
                {activeSessions.length === 0 ? (
                  <div className={`text-xs ${sub}`}>РќРµС‚ Р°РєС‚РёРІРЅС‹С… СЃРµСЃСЃРёР№</div>
                ) : activeSessions.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 gap-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.device}{item.current ? ' В· РўРµРєСѓС‰Р°СЏ' : ''}
                      </div>
                      <div className={`text-xs ${sub}`}>
                        {item.ipAddress} В· {item.lastSeenAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={() => void revokeSession(item.id)} className="text-xs text-red-500 shrink-0">
                      Р—Р°РІРµСЂС€РёС‚СЊ
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
                <Shield size={16} strokeWidth={1.75} />{securitySaved ? 'РЎРѕС…СЂР°РЅРµРЅРѕ!' : password.current || password.new_ || password.confirm ? 'РР·РјРµРЅРёС‚СЊ РїР°СЂРѕР»СЊ' : 'РЎРѕС…СЂР°РЅРёС‚СЊ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ'}
              </button>
            </motion.div>
          )}

          {/* в”Ђв”Ђ SETTINGS: FINANCE в”Ђв”Ђ */}
          {!isAccountant && page === 'settings' && settingsSection === 'finance' && (
            <motion.div key="s-finance" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
              <button onClick={() => setSettingsSection(null)} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />РќР°Р·Р°Рґ</button>
              <h2 className="font-semibold mb-4">Р¤РёРЅР°РЅСЃС‹</h2>

              {/* РћР±С‰РёР№ РёС‚РѕРі */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>РћР‘Р©РР™ РРўРћР“</div>
                {[
                  { label: 'Р’С‹СЂСѓС‡РєР°', value: `${totalRevenue.toLocaleString('ru')} в‚Ѕ`, color: accent },
                  { label: 'Р”РѕРї. РґРѕС…РѕРґС‹', value: `${totalIncomes.toLocaleString('ru')} в‚Ѕ`, color: primary },
                  { label: 'Р Р°СЃС…РѕРґС‹', value: `${totalExpenses.toLocaleString('ru')} в‚Ѕ`, color: '#FF6B6B' },
                  {
                    label: profit >= 0 ? 'РџСЂРёР±С‹Р»СЊ' : 'РџСЂРёР±С‹Р»СЊ (СѓР±С‹С‚РѕРє)',
                    value: `${Math.abs(profit).toLocaleString('ru')} в‚Ѕ${profit < 0 ? ' (СѓР±С‹С‚РѕРє)' : ''}`,
                    color: profit >= 0 ? accent : '#FF6B6B',
                  },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2.5 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                    <span className="text-sm">{r.label}</span>
                    <span className="font-semibold" style={{ color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* РљРѕРїРёР»РєР° В· РђРІС‚РѕРјРѕР№РєР° */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>рџљ— РљРћРџРР›РљРђ В· РђР’РўРћРњРћР™РљРђ</div>
                {piggyBankLoading ? (
                  <div className={`text-sm ${sub} text-center py-4`}>Р—Р°РіСЂСѓР·РєР°...</div>
                ) : piggyBank?.wash ? (
                  <>
                    {/* РЎР°РјРѕРѕР±СЃР»СѓР¶РёРІР°РЅРёРµ */}
                    <div className="mb-3">
                      <div className={`text-xs font-medium ${sub} mb-2`}>в–ё РЎР°РјРѕРѕР±СЃР»СѓР¶РёРІР°РЅРёРµ (1В 000В в‚Ѕ/С‡)</div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Р’С‹СЂСѓС‡РєР°</span>
                        <span className="font-semibold">{piggyBank.wash.selfServiceRevenue.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Р—Рџ РјР°СЃС‚РµСЂР°</span>
                        <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.wash.selfServiceMaster.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р’ РєРѕРїРёР»РєСѓ (90%)</span>
                        <span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.selfServicePiggy.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                    </div>
                    {/* РљР»Р°СЃСЃРёС‡РµСЃРєР°СЏ РјРѕР№РєР° */}
                    <div className="mb-3">
                      <div className={`text-xs font-medium ${sub} mb-2`}>в–ё РљР»Р°СЃСЃРёС‡РµСЃРєР°СЏ РјРѕР№РєР°</div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Р’С‹СЂСѓС‡РєР°</span>
                        <span className="font-semibold">{piggyBank.wash.classicRevenue.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm">
                        <span className={sub}>Р—Рџ РјР°СЃС‚РµСЂР°</span>
                        <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.wash.classicMaster.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р’ РєРѕРїРёР»РєСѓ</span>
                        <span className="font-semibold" style={{ color: accent }}>+{piggyBank.wash.classicPiggy.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                    </div>
                    {/* РС‚РѕРіРѕ */}
                    <div className="flex justify-between py-2 text-sm font-semibold">
                      <span>Р’СЃРµРіРѕ РІ РєРѕРїРёР»РєСѓ</span>
                      <span style={{ color: accent }}>+{piggyBank.wash.totalPiggy.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р’С‹СЂСѓС‡РєР°</span>
                      <span className="font-semibold">{piggyBank.wash.totalRevenue.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р—Рџ РјР°СЃС‚РµСЂРѕРІ РІСЃРµРіРѕ</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.wash.totalMaster.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Р’С‹С…РѕРґ РјР°СЃС‚РµСЂРѕРІ (СЃРјРµРЅС‹)</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{(piggyBank.masterDailyOutputs ?? 0).toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р”РѕРї. РґРѕС…РѕРґС‹</span>
                      <span className="font-semibold" style={{ color: primary }}>+{(piggyBank.washIncomes ?? 0).toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р Р°СЃС…РѕРґС‹ РЅР° РјРѕР№РєСѓ</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{(piggyBank.washExpenses ?? 0).toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                      <span>рџЏ¦ РћСЃС‚Р°С‚РѕРє РІ РєРѕРїРёР»РєРµ</span>
                      <span style={{ color: (piggyBank.remainingInPiggyBank ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                        {(piggyBank.remainingInPiggyBank ?? 0) >= 0 ? '' : 'в€’'}{Math.abs(piggyBank.remainingInPiggyBank ?? 0).toLocaleString('ru')} в‚Ѕ
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={`text-sm ${sub} text-center py-4`}>РќРµС‚ РґР°РЅРЅС‹С…</div>
                )}
              </div>

              {/* РљРѕРїРёР»РєР° В· Р”РµС‚РµР№Р»РёРЅРі */}
              <div className={`${glass} rounded-2xl p-4 mb-4`}>
                <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>вњЁ РљРћРџРР›РљРђ В· Р”Р•РўР•Р™Р›РРќР“</div>
                {piggyBankLoading ? (
                  <div className={`text-sm ${sub} text-center py-4`}>Р—Р°РіСЂСѓР·РєР°...</div>
                ) : piggyBank?.detailing ? (
                  <>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р’С‹СЂСѓС‡РєР°</span>
                      <span className="font-semibold">{piggyBank.detailing.detailingRevenue.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р—Рџ РјР°СЃС‚РµСЂРѕРІ</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.detailing.detailingMaster.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>РќР°С‡РёСЃР»РµРЅРѕ 24%</span>
                      <span className="font-semibold" style={{ color: accent }}>+{piggyBank.detailing.deposits24Percent.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>РЎРЅСЏС‚Рѕ РЅР° РјР°С‚РµСЂРёР°Р»С‹</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{piggyBank.detailing.materialWithdrawals.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Р’РѕР·РІСЂР°С‚ РјР°С‚РµСЂРёР°Р»РѕРІ</span>
                      <span className="font-semibold" style={{ color: accent }}>+{piggyBank.detailing.materialRepayments.toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className={sub}>Р Р°СЃС…РѕРґС‹ РЅР° РґРµС‚РµР№Р»РёРЅРі</span>
                      <span style={{ color: '#FF6B6B' }}>в€’{(piggyBank.detailingExpenses ?? 0).toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                      <span className={sub}>Р”РѕРї. РґРѕС…РѕРґС‹</span>
                      <span className="font-semibold" style={{ color: primary }}>+{(piggyBank.detailingIncomes ?? 0).toLocaleString('ru')} в‚Ѕ</span>
                    </div>
                    <div className="flex justify-between py-3 text-base font-bold border-t mt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                      <span>рџЏ¦ РќРµС‚С‚Рѕ РІ РєРѕРїРёР»РєРµ</span>
                      <span style={{ color: (piggyBank.detailing.netPiggy ?? 0) >= 0 ? accent : '#FF6B6B' }}>
                        {(piggyBank.detailing.netPiggy ?? 0) >= 0 ? '' : 'в€’'}{Math.abs(piggyBank.detailing.netPiggy ?? 0).toLocaleString('ru')} в‚Ѕ
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={`text-sm ${sub} text-center py-4`}>РќРµС‚ РґР°РЅРЅС‹С…</div>
                )}
              </div>

              {/* РџРѕСЃР»РµРґРЅРёРµ СЂР°СЃС…РѕРґС‹ */}
              {expenses.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>РџРћРЎР›Р•Р”РќРР• Р РђРЎРҐРћР”Р«</div>
                  <div className="space-y-2">
                    {expenses.slice(0, 10).map(e => (
                      <div key={e.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <button className="flex-1 text-left min-w-0 mr-2" onClick={() => openEditExpense(e)}>
                          <div className="text-sm font-medium">{e.title}</div>
                          <div className={`text-xs ${sub}`}>{e.category} В· {resourceGroupLabel(e.resourceGroup)} В· {e.date}</div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>в€’{e.amount.toLocaleString('ru')} в‚Ѕ</div>
                          <button onClick={() => openEditExpense(e)} className={`p-1.5 rounded-lg ${glass}`} title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ">
                            <Edit3 size={13} strokeWidth={1.75} className={sub} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* РџРѕСЃР»РµРґРЅРёРµ РґРѕС…РѕРґС‹ */}
              {incomes.length > 0 && (
                <div className={`${glass} rounded-2xl p-4 mb-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>РџРћРЎР›Р•Р”РќРР• Р”РћРҐРћР”Р«</div>
                  <div className="space-y-2">
                    {incomes.slice(0, 10).map(i => (
                      <div key={i.id} className="flex justify-between items-center py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <button className="flex-1 text-left min-w-0 mr-2" onClick={() => openEditIncome(i)}>
                          <div className="text-sm font-medium">{i.source}</div>
                          <div className={`text-xs ${sub}`}>{resourceGroupLabel(i.resourceGroup)} В· {i.date}{i.note ? ` В· ${i.note}` : ''}</div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="font-semibold text-sm" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} в‚Ѕ</div>
                          <button onClick={() => openEditIncome(i)} className={`p-1.5 rounded-lg ${glass}`} title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ">
                            <Edit3 size={13} strokeWidth={1.75} className={sub} />
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

      {/* в”Ђв”Ђ MODAL: Detail Share (outside AnimatePresence) в”Ђв”Ђ */}
      {selectedShareDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedShareDetail(null)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8"
            style={{ background: isDark ? '#1C1C1F' : '#fff' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }} />
            <h3 className="font-bold text-lg mb-1">{selectedShareDetail.service || 'РЈСЃР»СѓРіР°'}</h3>
            <div className={`text-xs ${sub} mb-4`}>{selectedShareDetail.date}{selectedShareDetail.time ? ` В· ${selectedShareDetail.time}` : ''}</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={`text-sm ${sub}`}>РЎС‚РѕРёРјРѕСЃС‚СЊ</span>
                <span className="text-sm font-semibold">{selectedShareDetail.price.toLocaleString('ru')} в‚Ѕ</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <span className={`text-sm ${sub}`}>Р”РѕР»СЏ РІР»Р°РґРµР»СЊС†Р°</span>
                <span className="text-sm font-semibold" style={{ color: accent }}>+{selectedShareDetail.amount.toLocaleString('ru')} в‚Ѕ</span>
              </div>
              {selectedShareDetail.workerName && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>РњР°СЃС‚РµСЂ</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.workerName}</span>
                </div>
              )}
              {selectedShareDetail.clientName && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>РљР»РёРµРЅС‚</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.clientName}</span>
                </div>
              )}
              {selectedShareDetail.clientPhone && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>РўРµР»РµС„РѕРЅ</span>
                  <a href={`tel:${selectedShareDetail.clientPhone}`} className="text-sm font-semibold" style={{ color: primary }}>{selectedShareDetail.clientPhone}</a>
                </div>
              )}
              {selectedShareDetail.car && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>РђРІС‚РѕРјРѕР±РёР»СЊ</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.car}</span>
                </div>
              )}
              {selectedShareDetail.plate && (
                <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                  <span className={`text-sm ${sub}`}>Р“РѕСЃ. РЅРѕРјРµСЂ</span>
                  <span className="text-sm font-semibold">{selectedShareDetail.plate}</span>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedShareDetail(null)} className="w-full mt-5 py-3 rounded-2xl text-sm font-semibold" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }}>
              Р—Р°РєСЂС‹С‚СЊ
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className={`fixed bottom-[calc(.9rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-xl max-w-[calc(100vw-1.5rem)] overflow-x-auto ${isDark ? 'bg-[#1C1C1F]/92 border-white/10' : 'bg-white/92 border-black/[.06]'}`} style={{ scrollbarWidth: 'none' }}>
        {(isAccountant
          ? [
              { id: 'dashboard', icon: LayoutDashboard, label: 'Р“Р»Р°РІРЅР°СЏ' },
              { id: 'calendar', icon: CalendarDays, label: 'РљР°Р»РµРЅРґР°СЂСЊ' },
              { id: 'payroll', icon: Wallet, label: 'Р—Р°СЂРїР»Р°С‚С‹' },
              { id: 'piggy-bank', icon: PiggyBank, label: 'РљРѕРїРёР»РєР°' },
              { id: 'stock', icon: Package, label: 'РЎРєР»Р°Рґ' },
              { id: 'reports', icon: FileChartColumn, label: 'РћС‚С‡С‘С‚С‹' },
            ]
          : [
              { id: 'dashboard', icon: LayoutDashboard, label: 'Р“Р»Р°РІРЅР°СЏ' },
              { id: 'calendar', icon: CalendarDays, label: 'РљР°Р»РµРЅРґР°СЂСЊ' },
              { id: 'payroll', icon: Wallet, label: 'Р—Р°СЂРїР»Р°С‚С‹' },
              { id: 'piggy-bank', icon: PiggyBank, label: 'РљРѕРїРёР»РєР°' },
              { id: 'stock', icon: Package, label: 'РЎРєР»Р°Рґ' },
              { id: 'clients', icon: UsersRound, label: 'РљР»РёРµРЅС‚С‹' },
              { id: 'settings', icon: Settings2, label: 'РќР°СЃС‚СЂРѕР№РєРё' },
            ]).map(t => {
          if (t.id === 'clients') {
            const isActive = page === 'settings' && settingsSection === 'clients';
            return (
              <button key={t.id} onClick={() => { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); setPage('settings'); setSettingsSection('clients'); }} className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${isActive ? 'pl-3 pr-4' : ''}`} aria-label="РљР»РёРµРЅС‚С‹">
                {isActive && (
                  <motion.span layoutId="owner-nav-pill" transition={{ type: 'spring', stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full" style={{ background: 'var(--primary, #4F46E5)' }} />
                )}
                <t.icon size={19} strokeWidth={1.75} fill={isActive ? 'currentColor' : 'none'} className="relative" style={{ color: isActive ? '#fff' : undefined }} />
                {isActive && <span className="relative whitespace-nowrap" style={{ color: '#fff' }}>{t.label}</span>}
                {!isActive && <span className="sr-only">{t.label}</span>}
              </button>
            );
          }
          const isActive = t.id === 'settings' ? (page === 'settings' && settingsSection === null) : (page === t.id);
          return (
          <button key={t.id} onClick={() => { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); setPage(t.id as OwnerPage); setSettingsSection(null); }} className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${isActive ? 'pl-3 pr-4' : ''}`} aria-label={t.label}>
            {isActive && (
              <motion.span layoutId="owner-nav-pill" transition={{ type: 'spring', stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-full" style={{ background: 'var(--primary, #4F46E5)' }} />
            )}
            <t.icon size={19} strokeWidth={1.75} fill={isActive ? 'currentColor' : 'none'} className="relative" style={{ color: isActive ? '#fff' : undefined }} />
            {isActive && <span className="relative whitespace-nowrap" style={{ color: '#fff' }}>{t.label}</span>}
            {!isActive && <span className="sr-only">{t.label}</span>}
          </button>
          );
        })}
      </div>

      {/* в”Ђв”Ђ EXPORT MODAL в”Ђв”Ђ */}
      <AnimatePresence>
        {showExportModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowExportModal(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm mx-auto overflow-hidden`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  {exportModalStep === 'segment' ? 'Р—Р° С‡С‚Рѕ РѕС‚С‡С‘С‚?' : exportModalStep === 'period' ? 'Р—Р° РєР°РєРѕР№ РїРµСЂРёРѕРґ?' : 'Р’С‹Р±РµСЂРёС‚Рµ РґР°С‚С‹'}
                </h3>
                <button onClick={() => setShowExportModal(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>

              {exportModalStep === 'segment' && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'Р’СЃС‘ РІРјРµСЃС‚Рµ' },
                    { value: 'wash', label: 'РњРѕР№РєР°' },
                    { value: 'detailing', label: 'Р”РµС‚РµР№Р»РёРЅРі' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => { setExportModalSegment(opt.value as 'all' | 'wash' | 'detailing'); setExportModalStep('period'); }}
                      className={`rounded-xl py-3 px-2 text-sm font-medium disabled:opacity-60 ${exportModalSegment !== opt.value ? `${glass} ${sub}` : ''}`}
                      style={exportModalSegment === opt.value ? { background: `${primary}25`, color: primary } : {}}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {exportModalStep === 'period' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'daily', label: 'Р”РµРЅСЊ' },
                      { value: 'weekly', label: 'РќРµРґРµР»СЏ' },
                      { value: 'custom', label: 'РЎРІРѕС‘ РІСЂРµРјСЏ' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => { setExportModalPeriod(opt.value as 'daily' | 'weekly' | 'custom'); if (opt.value !== 'custom') { void handleExportWithParams(); } else { setExportModalStep('date'); } }}
                        className={`rounded-xl py-3 px-2 text-sm font-medium ${exportModalPeriod !== opt.value ? `${glass} ${sub}` : ''}`}
                        style={exportModalPeriod === opt.value ? { background: `${primary}25`, color: primary } : {}}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExportModalStep('segment')} className={`mt-4 text-xs ${sub} flex items-center gap-1`}>
                    <ArrowLeft size={12} strokeWidth={1.75} /> РќР°Р·Р°Рґ
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
                    <span className={`text-xs ${sub}`}>вЂ”</span>
                    <input type="date" value={toISODate(exportModalDateTo)} onChange={e => {
                      const val = parseFlexibleDate(e.target.value);
                      setExportModalDateTo(val ? formatDate(val) : '');
                    }} className={`flex-1 ${inputCls}`} />
                  </div>
                  <button onClick={() => void handleExportWithParams()} disabled={!exportModalDateFrom || !exportModalDateTo}
                    className="w-full py-3 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                    РЎС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РѕС‚С‡С‘С‚
                  </button>
                  <button onClick={() => setExportModalStep('period')} className={`mt-3 text-xs ${sub} flex items-center gap-1`}>
                    <ArrowLeft size={12} strokeWidth={1.75} /> РќР°Р·Р°Рґ
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ NOTIFICATIONS в”Ђв”Ђ */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowNotifications(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[70vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">РЈРІРµРґРѕРјР»РµРЅРёСЏ</h3>
                <button onClick={() => setShowNotifications(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="p-4 space-y-2">
                {ownerNotifications.length === 0 ? (
                  <p className={`text-sm ${sub} text-center py-8`}>РќРµС‚ СѓРІРµРґРѕРјР»РµРЅРёР№</p>
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

      {/* в”Ђв”Ђ ADD EXPENSE в”Ђв”Ђ */}
      <AnimatePresence>
        {showAddExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm relative overflow-hidden`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <AnimatePresence>
                {expenseAdded && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 flex items-center justify-center z-10"
                    style={{ background: isDark ? 'rgba(14,22,36,0.97)' : 'rgba(255,255,255,0.97)', borderRadius: '1.5rem 1.5rem 0 0' }}>
                    <div className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: `${accent}20` }}>
                        <Check size={28} strokeWidth={1.75} style={{ color: accent }} />
                      </motion.div>
                      <div className="font-semibold">Р Р°СЃС…РѕРґ РґРѕР±Р°РІР»РµРЅ!</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р”РѕР±Р°РІРёС‚СЊ СЂР°СЃС…РѕРґ</h3>
                <button onClick={() => setShowAddExpense(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div><label className={`text-xs ${sub} block mb-1`}>РќР°Р·РІР°РЅРёРµ</label><input className={inputCls} placeholder="Р—Р°РєСѓРїРєР° С…РёРјРёРё..." value={expenseForm.title} onChange={e => setExpenseForm(p => ({ ...p, title: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° (в‚Ѕ)</label><input className={inputCls} type="number" placeholder="0" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ</label><select className={selectCls} value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ СѓСЃР»СѓРіРё</label>
                  <select className={selectCls} value={expenseForm.resourceGroup} onChange={e => setExpenseForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">РћР±С‰РµРµ</option>
                    <option value="wash">РђРІС‚РѕРјРѕР№РєР°</option>
                    <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                  </select>
                  {expenseForm.resourceGroup && (
                    <p className="text-[11px] mt-1.5" style={{ color: accent }}>РЎРїРёСЃР°РЅРёРµ РёР· РєРѕРїРёР»РєРё {expenseForm.resourceGroup === 'wash' ? 'рџљ— РњРѕР№РєР°' : 'вњЁ Р”РµС‚РµР№Р»РёРЅРі'}</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                  <input className={inputCls} type="date" value={toISODate(expenseForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setExpenseForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {expenseForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(expenseForm.date) || parseFlexibleDate(expenseForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label><input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ..." value={expenseForm.note} onChange={e => setExpenseForm(p => ({ ...p, note: e.target.value }))} /></div>
              </div>
              <button onClick={handleAddExpense} disabled={!expenseForm.title || !expenseForm.amount || !expenseForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(expenseForm.date) || parseFlexibleDate(expenseForm.date) === null} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: '#FF6B6B' }}>Р”РѕР±Р°РІРёС‚СЊ СЂР°СЃС…РѕРґ</button>
            </motion.div>
          </motion.div>
        )}

        {/* в”Ђв”Ђ PIGGY BANK WITHDRAW MODAL в”Ђв”Ђ */}
        {showPiggyWithdraw && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{piggyWithdrawKind === 'materials' ? 'РЎРЅСЏС‚СЊ РЅР° РјР°С‚РµСЂРёР°Р»С‹' : 'РЎРЅСЏС‚СЊ РЅР° РїСЂРѕС‡РёРµ СЂР°СЃС…РѕРґС‹'}</h3>
                <button onClick={() => setShowPiggyWithdraw(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1.5`}>РР· РєР°РєРѕР№ РєРѕРїРёР»РєРё</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'detailing', label: 'вњЁ Р”РµС‚РµР№Р»РёРЅРі' },
                      { value: 'wash', label: 'рџљ— РњРѕР№РєР°' },
                    ] as const).map(opt => {
                      const active = piggyWithdrawForm.target === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => setPiggyWithdrawForm(p => ({ ...p, target: opt.value }))}
                          className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${active ? '' : `${glass} ${sub}`}`}
                          style={active ? { background: `${primary}25`, color: primary } : {}}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљС‚Рѕ РїРѕРєСѓРїР°Р»</label>
                  <select className={selectCls} value={piggyWithdrawForm.spentById} onChange={e => setPiggyWithdrawForm(p => ({ ...p, spentById: e.target.value, spentByName: e.target.value !== '__custom' ? '' : p.spentByName }))}>
                    <option value="">вЂ” РЇ (Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё) вЂ”</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} В· {w.role === 'worker' ? 'РњР°СЃС‚РµСЂ' : w.role === 'admin' ? 'РђРґРјРёРЅ' : w.role === 'accountant' ? 'Р‘СѓС…РіР°Р»С‚РµСЂ' : w.role}</option>
                    ))}
                    {staffProfile && !workers.some(w => w.id === staffProfile.id) && (
                      <option value={staffProfile.id}>{staffProfile.name} В· Р’Р»Р°РґРµР»РµС† (СЏ)</option>
                    )}
                    <option value="__custom">Р”СЂСѓРіРѕР№ (РІРїРёСЃР°С‚СЊ РёРјСЏ)</option>
                  </select>
                  <div className={`text-[11px] ${sub} mt-1`}>РЎСѓРјРјР° СѓРґРµСЂР¶РёС‚СЃСЏ РёР· Р·Р°СЂРїР»Р°С‚С‹ РїРѕРєСѓРїР°С‚РµР»СЏ В· РІ РёСЃС‚РѕСЂРёРё Р±СѓРґРµС‚ РІРёРґРЅРѕ РєС‚Рѕ РїРѕРєСѓРїР°Р»</div>
                </div>
                {piggyWithdrawForm.spentById === '__custom' && (
                  <div><label className={`text-xs ${sub} block mb-1`}>РРјСЏ РїРѕРєСѓРїР°С‚РµР»СЏ</label><input className={inputCls} placeholder="РќР°РїСЂРёРјРµСЂ: РРІР°РЅ" value={piggyWithdrawForm.spentByName} onChange={e => setPiggyWithdrawForm(p => ({ ...p, spentByName: e.target.value }))} /></div>
                )}
                <div><label className={`text-xs ${sub} block mb-1`}>РќР° С‡С‚Рѕ</label><input className={inputCls} placeholder={piggyWithdrawKind === 'materials' ? 'РќР°РїСЂРёРјРµСЂ: РџР»РµРЅРєР° PPF' : 'РќР°РїСЂРёРјРµСЂ: Р РµРјРѕРЅС‚ РѕР±РѕСЂСѓРґРѕРІР°РЅРёСЏ'} value={piggyWithdrawForm.name} onChange={e => setPiggyWithdrawForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° (в‚Ѕ)</label><input className={inputCls} type="text" inputMode="decimal" placeholder="0" value={piggyWithdrawForm.amount} onChange={e => setPiggyWithdrawForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className={`text-xs ${sub} block mb-1`}>РљРѕРјРјРµРЅС‚Р°СЂРёР№</label><input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ..." value={piggyWithdrawForm.purpose} onChange={e => setPiggyWithdrawForm(p => ({ ...p, purpose: e.target.value }))} /></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                  <input className={inputCls} type="date" value={toISODate(piggyWithdrawForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setPiggyWithdrawForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {piggyWithdrawForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(piggyWithdrawForm.date) || parseFlexibleDate(piggyWithdrawForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
              </div>
              <button onClick={handlePiggyWithdraw} disabled={!piggyWithdrawForm.name || !isValidAmountInput(piggyWithdrawForm.amount) || !piggyWithdrawForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(piggyWithdrawForm.date) || parseFlexibleDate(piggyWithdrawForm.date) === null || (piggyWithdrawForm.spentById === '__custom' && !piggyWithdrawForm.spentByName.trim())}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: piggyWithdrawKind === 'materials' ? accent : '#F59E0B' }}>
                РЎРЅСЏС‚СЊ {isValidAmountInput(piggyWithdrawForm.amount) ? `${parseDecimalInput(piggyWithdrawForm.amount).toLocaleString('ru')} в‚Ѕ` : ''}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* в”Ђв”Ђ PIGGY BANK ADJUST MODAL в”Ђв”Ђ */}
        {showPiggyAdjust && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  РР·РјРµРЅРёС‚СЊ СЃСѓРјРјСѓ В· {piggyAdjustResourceGroup === 'wash' ? 'рџљ— РњРѕР№РєР°' : 'вњЁ Р”РµС‚РµР№Р»РёРЅРі'}
                </h3>
                <button onClick={() => setShowPiggyAdjust(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className={`text-sm mb-4 p-3 rounded-xl ${glass} flex justify-between`}>
                <span className={sub}>РўРµРєСѓС‰РёР№ Р±Р°Р»Р°РЅСЃ</span>
                <span className="font-semibold" style={{ color: piggyAdjustCurrentBalance >= 0 ? accent : '#FF6B6B' }}>
                  {piggyAdjustCurrentBalance.toLocaleString('ru')} в‚Ѕ
                </span>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РќРѕРІР°СЏ СЃСѓРјРјР° (в‚Ѕ)</label>
                  <input className={inputCls} type="text" inputMode="decimal" placeholder="0" value={piggyAdjustForm.newBalance} onChange={e => setPiggyAdjustForm(p => ({ ...p, newBalance: e.target.value }))} />
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label><input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ..." value={piggyAdjustForm.purpose} onChange={e => setPiggyAdjustForm(p => ({ ...p, purpose: e.target.value }))} /></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                  <input className={inputCls} type="date" value={toISODate(piggyAdjustForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setPiggyAdjustForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {piggyAdjustForm.date && (!/^\d{2}\.\d{2}\.\d{4}$/.test(piggyAdjustForm.date) || parseFlexibleDate(piggyAdjustForm.date) === null) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
              </div>
              <button onClick={() => { void handlePiggyAdjust(); }} disabled={!piggyAdjustForm.newBalance || Number.isNaN(parseDecimalInput(piggyAdjustForm.newBalance)) || !piggyAdjustForm.date || !/^\d{2}\.\d{2}\.\d{4}$/.test(piggyAdjustForm.date) || parseFlexibleDate(piggyAdjustForm.date) === null}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
                РЎРѕС…СЂР°РЅРёС‚СЊ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ ARCHIVES MODAL в”Ђв”Ђ */}
      <AnimatePresence>
        {showArchivesModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => { setShowArchivesModal(false); setSelectedArchive(null); }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[85vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: isDark ? '#1C1C1F' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">РђСЂС…РёРІ РЅРµРґРµР»СЊ</h3>
                <button onClick={() => { setShowArchivesModal(false); setSelectedArchive(null); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="p-4 space-y-3">
                {selectedArchive ? (
                  /* Expanded week detail */
                  <div>
                    <button onClick={() => setSelectedArchive(null)} className="flex items-center gap-1 text-sm mb-4" style={{ color: primary }}>
                      <ChevronLeft size={16} strokeWidth={1.75} /> РќР°Р·Р°Рґ Рє СЃРїРёСЃРєСѓ
                    </button>
                    <div className={`${glass} rounded-2xl p-4`}>
                      <div className="text-sm font-medium mb-3">
                        {selectedArchive.weekStart.split('-').reverse().join('.')} вЂ“ {selectedArchive.weekEnd.split('-').reverse().join('.')}
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р’С‹СЂСѓС‡РєР°</span>
                        <span className="font-semibold" style={{ color: accent }}>+{selectedArchive.totalRevenue.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р”РѕРї. РґРѕС…РѕРґС‹</span>
                        <span className="font-semibold" style={{ color: primary }}>+{selectedArchive.totalIncome.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р Р°СЃС…РѕРґС‹</span>
                        <span className="font-semibold" style={{ color: '#FF6B6B' }}>в€’{selectedArchive.totalExpense.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р§РёСЃС‚Р°СЏ РїСЂРёР±С‹Р»СЊ</span>
                        <span className="font-semibold" style={{ color: (selectedArchive.totalRevenue + selectedArchive.totalIncome - selectedArchive.totalExpense) >= 0 ? accent : '#FF6B6B' }}>
                          {(selectedArchive.totalRevenue + selectedArchive.totalIncome - selectedArchive.totalExpense).toLocaleString('ru')} в‚Ѕ
                        </span>
                      </div>
                      <div className="flex justify-between py-2.5 border-b text-sm" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <span className={sub}>Р‘Р°Р»Р°РЅСЃ РєРѕРїРёР»РєРё</span>
                        <span className="font-semibold" style={{ color: selectedArchive.piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>
                          {selectedArchive.piggyBankBalance >= 0 ? '+' : ''}{selectedArchive.piggyBankBalance.toLocaleString('ru')} в‚Ѕ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: accent }}>{selectedArchive.bookingCount}</div>
                          <div className={`text-[10px] ${sub}`}>Р—Р°РїРёСЃРµР№</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: primary }}>{selectedArchive.incomeCount}</div>
                          <div className={`text-[10px] ${sub}`}>Р”РѕС…РѕРґРѕРІ</div>
                        </div>
                        <div className={`${glass} rounded-xl p-3`}>
                          <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>{selectedArchive.expenseCount}</div>
                          <div className={`text-[10px] ${sub}`}>Р Р°СЃС…РѕРґРѕРІ</div>
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
                                {a.weekStart.split('-').reverse().join('.')} вЂ“ {a.weekEnd.split('-').reverse().join('.')}
                              </div>
                              <ChevronRight size={14} strokeWidth={1.75} className={sub} />
                            </div>
                            <div className="grid grid-cols-4 gap-1 text-center mb-2">
                              <div>
                                <div className="text-[11px]" style={{ color: accent }}>+{a.totalRevenue.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Р’С‹СЂСѓС‡РєР°</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: primary }}>+{a.totalIncome.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Р”РѕС…РѕРґС‹</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: '#FF6B6B' }}>в€’{a.totalExpense.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>Р Р°СЃС…РѕРґС‹</div>
                              </div>
                              <div>
                                <div className="text-[11px]" style={{ color: profit >= 0 ? accent : '#FF6B6B' }}>{profit >= 0 ? '+' : ''}{profit.toLocaleString('ru')}</div>
                                <div className={`text-[9px] ${sub}`}>РС‚РѕРі</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className={`text-[10px] ${sub}`}>
                                {a.bookingCount} Р·Р°Рї. В· {a.incomeCount} РґРѕС…РѕРґРѕРІ В· {a.expenseCount} СЂР°СЃС….
                              </div>
                              <div className="text-[11px] font-semibold" style={{ color: a.piggyBankBalance >= 0 ? accent : '#FF6B6B' }}>
                                рџЏ¦ {a.piggyBankBalance.toLocaleString('ru')} в‚Ѕ
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className={`text-center py-8 text-sm ${sub}`}>РќРµС‚ Р°СЂС…РёРІРЅС‹С… Р·Р°РїРёСЃРµР№</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ FINANCE PANEL в”Ђв”Ђ */}
      <AnimatePresence>
        {showFinancePanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowFinancePanel(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed bottom-0 left-0 right-0 z-50 ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[85vh] overflow-y-auto`}>
              <div className="p-4 border-b flex justify-between items-center sticky top-0" style={{ background: isDark ? '#1C1C1F' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">Р¤РёРЅР°РЅСЃС‹</h3>
                <button onClick={() => setShowFinancePanel(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="p-4 space-y-4">
                {/* РЎРІРѕРґРєР° */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Р’С‹СЂСѓС‡РєР°</div>
                    <div className="font-bold text-lg" style={{ color: accent }}>{totalRevenue.toLocaleString('ru')} в‚Ѕ</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Р Р°СЃС…РѕРґС‹</div>
                    <div className="font-bold text-lg" style={{ color: '#FF6B6B' }}>{totalExpenses.toLocaleString('ru')} в‚Ѕ</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>Р”РѕРї. РґРѕС…РѕРґС‹</div>
                    <div className="font-bold text-lg" style={{ color: primary }}>{totalIncomes.toLocaleString('ru')} в‚Ѕ</div>
                  </div>
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs ${sub} mb-1`}>РџСЂРёР±С‹Р»СЊ</div>
                    <div className="font-bold text-lg" style={{ color: profit >= 0 ? accent : '#FF6B6B' }}>
                      {Math.abs(profit).toLocaleString('ru')} в‚Ѕ{profit < 0 ? ' (СѓР±С‹С‚РѕРє)' : ''}
                    </div>
                  </div>
                </div>

                {/* РљРѕРїРёР»РєР° */}
                <div className={`${glass} rounded-2xl p-3 flex items-center justify-between cursor-pointer`} onClick={() => { setShowFinancePanel(false); setPage('piggy-bank'); }}>
                  <div className="flex items-center gap-2">
                    <PiggyBank size={18} strokeWidth={1.75} style={{ color: accent }} />
                    <span className="text-sm font-medium">РљРѕРїРёР»РєР°</span>
                  </div>
                  <div className="font-bold text-sm" style={{ color: (piggyBank?.combinedBalance ?? piggyBankBalance) >= 0 ? accent : '#FF6B6B' }}>
                    {(piggyBank?.combinedBalance ?? piggyBankBalance).toLocaleString('ru')} в‚Ѕ
                  </div>
                </div>

                {/* РљРЅРѕРїРєРё РґРµР№СЃС‚РІРёР№ */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setShowFinancePanel(false); setExpenseForm(p => ({ ...p, date: todayLabel })); setShowAddExpense(true); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: 'rgba(255,107,107,0.12)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,107,0.2)' }}>
                      <DollarSign size={20} strokeWidth={1.75} style={{ color: '#FF6B6B' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#FF6B6B' }}>Р”РѕР±Р°РІРёС‚СЊ СЂР°СЃС…РѕРґ</span>
                  </button>
                  <button onClick={() => { setIncomeForm(p => ({ ...p, date: todayLabel })); setShowAddIncome(true); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: `${primary}12` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primary}20` }}>
                      <TrendingUp size={20} strokeWidth={1.75} style={{ color: primary }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: primary }}>Р”РѕР±Р°РІРёС‚СЊ РґРѕС…РѕРґ</span>
                  </button>
                </div>

                {/* Р РђРЎРҐРћР”Р« */}
                {expenses.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Р РђРЎРҐРћР”Р«</div>
                    <div className="space-y-2">
                      {expenses.slice(0, 5).map(e => (
                        <div key={e.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className={`text-xs ${sub}`}>{e.category} В· {e.date}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm" style={{ color: '#FF6B6B' }}>в€’{e.amount.toLocaleString('ru')} в‚Ѕ</div>
                            {(session?.role === 'owner' || session?.role === 'accountant') && (
                              <button
                                onClick={() => openEditExpense(e)}
                                className={`p-1.5 rounded-lg ${glass}`}
                                title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЂР°СЃС…РѕРґ"
                              >
                                <Edit3 size={13} strokeWidth={1.75} className={sub} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Р”РћРҐРћР”Р« */}
                {incomes.length > 0 && (
                  <div>
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Р”РћРҐРћР”Р«</div>
                    <div className="space-y-2">
                      {incomes.slice(0, 5).map(i => (
                        <div key={i.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                          <div>
                            <div className="text-sm font-medium">{i.source}</div>
                            <div className={`text-xs ${sub}`}>{i.date}{i.note ? ` В· ${i.note}` : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm" style={{ color: primary }}>+{i.amount.toLocaleString('ru')} в‚Ѕ</div>
                            {session?.role === 'owner' && (
                              <button
                                onClick={() => openEditIncome(i)}
                                className={`p-1.5 rounded-lg ${glass}`}
                                title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ РґРѕС…РѕРґ"
                              >
                                <Edit3 size={13} strokeWidth={1.75} className={sub} />
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

      {/* в”Ђв”Ђ ADD INCOME в”Ђв”Ђ */}
      <AnimatePresence>
        {showAddIncome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р”РѕР±Р°РІРёС‚СЊ РґРѕС…РѕРґ</h3>
                <button onClick={() => { setShowAddIncome(false); setIncomeForm({ amount: '', source: '', note: '', date: todayLabel, resourceGroup: '' }); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° (в‚Ѕ)</label>
                  <input className={inputCls} type="number" placeholder="0" value={incomeForm.amount} onChange={e => setIncomeForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РСЃС‚РѕС‡РЅРёРє / РѕРїРёСЃР°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РђСЂРµРЅРґР°, РїСЂРѕРґР°Р¶Р° С‚РѕРІР°СЂР°..." value={incomeForm.source} onChange={e => setIncomeForm(p => ({ ...p, source: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ СѓСЃР»СѓРіРё</label>
                  <select className={selectCls} value={incomeForm.resourceGroup} onChange={e => setIncomeForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">РћР±С‰РµРµ</option>
                    <option value="wash">РђРІС‚РѕРјРѕР№РєР°</option>
                    <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                  <input className={inputCls} type="date" value={toISODate(incomeForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setIncomeForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {incomeForm.date && !parseFlexibleDate(incomeForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ" value={incomeForm.note} onChange={e => setIncomeForm(p => ({ ...p, note: e.target.value }))} />
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
                    setBottomToast(`Р”РѕС…РѕРґ "${incomeForm.source.trim()}" РґРѕР±Р°РІР»РµРЅ РЅР° СЃСѓРјРјСѓ ${Number(incomeForm.amount).toLocaleString('ru')} в‚Ѕ`);
                    setTimeout(() => setBottomToast(null), 4000);
                  } catch (err) {
                    setBottomToast(err instanceof Error ? err.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ РґРѕС…РѕРґ');
                    setTimeout(() => setBottomToast(null), 4000);
                  }
                }}
                disabled={!incomeForm.amount || !incomeForm.source.trim() || !incomeForm.date || !parseFlexibleDate(incomeForm.date)}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                Р”РѕР±Р°РІРёС‚СЊ РґРѕС…РѕРґ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ ACTIVE COMPLAINTS в”Ђв”Ђ */}
      <AnimatePresence>
        {showComplaintsWorkerId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">РђРєС‚РёРІРЅС‹Рµ Р¶Р°Р»РѕР±С‹</h3>
                <button onClick={() => setShowComplaintsWorkerId(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3">
                {penalties.filter(p => p.workerId === showComplaintsWorkerId && isComplaintActive(p)).map(penalty => {
                  const ownerName = workers.find(w => w.id === penalty.ownerId)?.name || 'РќРµРёР·РІРµСЃС‚РЅРѕ';
                  return (
                    <div key={penalty.id} className={`${glass} rounded-xl p-3`}>
                      <div className="font-medium text-sm">{penalty.title}</div>
                      <div className={`text-xs ${sub} mt-1`}>{penalty.reason}</div>
                      <div className={`text-[11px] ${sub} mt-2`}>
                        Р’С‹РґР°РЅР°: {formatComplaintDate(penalty.createdAt)}
                      </div>
                      <div className={`text-[11px] ${sub}`}>
                        РљРµРј: {ownerName}
                      </div>
                      <div className={`text-[11px] ${sub}`}>
                        РђРєС‚РёРІРЅР° РґРѕ: {formatComplaintDate(penalty.activeUntil)}
                      </div>
                    </div>
                  );
                })}
                {penalties.filter(p => p.workerId === showComplaintsWorkerId && isComplaintActive(p)).length === 0 && (
                  <div className={`text-sm ${sub} text-center py-6`}>РќРµС‚ Р°РєС‚РёРІРЅС‹С… Р¶Р°Р»РѕР±</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ CREATE CLIENT в”Ђв”Ђ */}
      <AnimatePresence>
        {showCreateClient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">РќРѕРІС‹Р№ РєР»РёРµРЅС‚</h3>
                <button
                  onClick={() => {
                    setShowCreateClient(false);
                    setCreateClientErrors({});
                  }}
                  className={`p-1.5 rounded-lg ${glass}`}
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { label: 'РРјСЏ', key: 'name', placeholder: 'РРІР°РЅ РРІР°РЅРѕРІ', type: 'text' },
                  { label: 'РўРµР»РµС„РѕРЅ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)', key: 'phone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'РђРІС‚РѕРјРѕР±РёР»СЊ', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'Р“РѕСЃРЅРѕРјРµСЂ', key: 'plate', placeholder: 'Р°123РІСЃ777', type: 'text' },
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
                            >{t === 'russian' ? 'РђРІС‚Рѕ' : t === 'motorcycle' ? 'РњРѕС‚Рѕ' : 'РРЅРѕ'}</button>
                          ))}
                        </div>
                        <input
                          className={`${inputCls} flex-1 ${createClientErrors[field.key as keyof typeof createClientErrors] ? 'border-red-400' : ''}`}
                          type={field.type}
                          placeholder={createClientForm.plateType === 'motorcycle' ? '1234Р°РІ77' : createClientForm.plateType === 'foreign' ? 'xyz1234' : 'Р°123РІСЃ777'}
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
                  <label className={`text-xs ${sub} block mb-1`}>Р—Р°РјРµС‚РєР°</label>
                  <input
                    className={inputCls}
                    placeholder="Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ Р·Р°РјРµС‚РєР°"
                    value={createClientForm.notes}
                    onChange={(event) => setCreateClientForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°Рє СѓР·РЅР°Р» Рѕ РЅР°СЃ</label>
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
                  РџРѕСЃР»Рµ СЃРѕР·РґР°РЅРёСЏ РѕС‚РєСЂРѕРµС‚СЃСЏ С„РѕСЂРјР° РїСЂРѕС€Р»РѕР№ Р·Р°РїРёСЃРё РґР»СЏ РёСЃС‚РѕСЂРёРё РєР»РёРµРЅС‚Р°.
                </div>
                {createClientErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} strokeWidth={1.75} />{createClientErrors.general}</div>
                )}
              </div>
              <button
                onClick={() => { void handleCreateClient(); }}
                disabled={createClientSaving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50"
                style={{ background: primary }}
              >
                {createClientSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕР·РґР°С‚СЊ РєР»РёРµРЅС‚Р°'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ CREATE BOOKING в”Ђв”Ђ */}
      <AnimatePresence>
        {showCreateBooking && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCreateBooking(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-4`}
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-base">РЎРѕР·РґР°С‚СЊ Р·Р°РїРёСЃСЊ</h3>
                <button onClick={() => setShowCreateBooking(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4 pb-32">
                <div><label className={`text-xs ${sub} block mb-1`}>РљР»РёРµРЅС‚</label><div className="flex gap-1.5 items-center"><input className={`${inputCls} flex-1`} placeholder="РРІР°РЅ РРІР°РЅРѕРІ" value={bookingForm.clientName} onChange={e => setBookingForm(p => ({ ...p, clientName: e.target.value }))} /><button type="button" onClick={() => setShowClientSearch(true)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${primary}20`, color: primary }}>?</button></div></div>
                <div><label className={`text-xs ${sub} block mb-1`}>РўРµР»РµС„РѕРЅ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</label><input className={inputCls} type="tel" placeholder="+7 (___) ___-__-__" value={bookingForm.clientPhone} onChange={e => setBookingForm(p => ({ ...p, clientPhone: e.target.value }))} /></div>
                {bookingFormClientVehicles.length > 0 && (
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РђРІС‚Рѕ РєР»РёРµРЅС‚Р°</label>
                    <div className="flex flex-wrap gap-1.5">
                      {bookingFormClientVehicles.map((vehicle, index) => {
                        const isActive = normalizeVehicleInput(vehicle.car || '') === normalizeVehicleInput(bookingForm.car)
                          && normalizePlateInput(vehicle.plate || '', vehicle.plateType) === normalizePlateInput(bookingForm.plate, bookingForm.plateType);
                        return (
                          <button key={index} type="button" onClick={() => setBookingForm(p => ({ ...p, car: vehicle.car || '', plate: vehicle.plate || '', plateType: (vehicle.plateType as PlateType) || 'russian' }))}
                            className={`text-xs px-2.5 py-1.5 rounded-xl border transition hover:opacity-80 ${isActive ? 'text-white font-medium' : `${sub}`}`}
                            style={isActive ? { background: primary, borderColor: primary } : { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}>
                            {[vehicle.car, vehicle.plate].filter(Boolean).join(' В· ') || 'РђРІС‚Рѕ'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={`text-xs ${sub} block mb-1`}>РђРІС‚РѕРјРѕР±РёР»СЊ</label><input className={inputCls} placeholder="Lada Vesta" value={bookingForm.car} onChange={e => setBookingForm(p => ({ ...p, car: e.target.value }))} /></div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Р“РѕСЃРЅРѕРјРµСЂ</label>
                    <div className="flex gap-1.5">
                      <div className="flex flex-col gap-1 shrink-0">
                        {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                          <button key={t} type="button"
                            className={`text-[10px] px-1.5 py-0.5 rounded ${bookingForm.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                            style={bookingForm.plateType === t ? { background: primary } : {}}
                            onClick={() => setBookingForm(p => ({ ...p, plateType: t }))}
                          >{t === 'russian' ? 'РђРІС‚Рѕ' : t === 'motorcycle' ? 'РњРѕС‚Рѕ' : 'РРЅРѕ'}</button>
                        ))}
                      </div>
                      <input className={`${inputCls} flex-1`} maxLength={bookingForm.plateType === 'foreign' ? 15 : 9} placeholder={bookingForm.plateType === 'motorcycle' ? '1234Р°РІ77' : bookingForm.plateType === 'foreign' ? 'xyz1234' : 'Р°123РІСЃ777'} value={bookingForm.plate} onChange={e => setBookingForm(p => ({ ...p, plate: normalizePlateInput(e.target.value, p.plateType) }))} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЈСЃР»СѓРіР°</label>
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
                    placeholder="Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ"
                    onCreateNew={handleCreateServiceFromQuery}
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
                  <div><label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.price)} onChange={e => setBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} /></div>
                  <div><label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚. (РјРёРЅ)</label><input className={inputCls} type="number" value={numberInputValue(bookingForm.duration)} onChange={e => setBookingForm(p => ({ ...p, duration: numberFromInput(e.target.value) }))} /></div>
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>РЎС‚Р°С‚СѓСЃ</label><select className={selectCls} value={bookingForm.status} onChange={e => setBookingForm(p => ({ ...p, status: e.target.value as BookingStatus }))}>
                  {OWNER_BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select></div>
                <div className="mb-4">
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                  <input className={inputCls} type="date" value={toISODate(bookingForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setBookingForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                </div>
                <div><label className={`text-xs ${sub} block mb-1`}>Р’СЂРµРјСЏ</label><select className={selectCls} value={bookingForm.time} onChange={e => setBookingForm(p => ({ ...p, time: e.target.value }))}><option value="">--:--</option>{TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}</select></div>

                <div><label className={`text-xs ${sub} block mb-1`}>{bookingFormLocationLabel}</label><select className={selectCls} value={bookingForm.box} onChange={e => setBookingForm(p => ({ ...p, box: e.target.value }))}>{bookingFormBoxes.map(box => <option key={box.id} value={box.name}>{box.name}</option>)}</select></div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°Рє СѓР·РЅР°Р» Рѕ РЅР°СЃ</label>
                  <select className={selectCls} value={bookingForm.referralSource} onChange={e => setBookingForm(p => ({ ...p, referralSource: e.target.value }))}>
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РџРѕРІС‚РѕСЂРЅС‹Р№ РІРёР·РёС‚</span>
                  <input
                    type="checkbox"
                    checked={bookingForm.isRepeatVisit}
                    onChange={(event) => setBookingForm((current) => ({ ...current, isRepeatVisit: event.target.checked }))}
                  />
                </label>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎРїРѕСЃРѕР± РѕРїР»Р°С‚С‹</label>
                  <select className={selectCls} value={bookingForm.paymentType} onChange={e => setBookingForm(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                    <option value="cash">РќР°Р»РёС‡РЅС‹Рµ</option>
                    <option value="transfer">РџРµСЂРµРІРѕРґ</option>
                    <option value="invoice">РџРѕ СЃС‡С‘С‚Сѓ</option>
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РћРїР»Р°С‡РµРЅРѕ</span>
                  <input
                    type="checkbox"
                    checked={bookingForm.paymentSettled}
                    onChange={(event) => setBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                  />
                </label>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РђСѓС‚СЃРѕСЂСЃ</span>
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
                    <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° Р°СѓС‚СЃРѕСЂСЃРµСЂСѓ (в‚Ѕ)</label>
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
                    <label className={`text-xs ${sub} block`}>РќР°Р·РЅР°С‡РёС‚СЊ РјР°СЃС‚РµСЂРѕРІ</label>
                    <span className={`text-xs ${sub}`}>{_isFixed ? `Р¤РёРєСЃ ${formatFixedMasterAmount()}` : `Р’С‹Р±СЂР°РЅРѕ: ${bookingWorkers.length}`}</span>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {workers.filter(worker => worker.role === 'worker' || worker.role === 'owner').map(worker => {
                      const assigned = bookingWorkers.find(item => item.id === worker.id);
                      return (
                        <div key={worker.id} className={`${glass} rounded-xl p-3`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{worker.name}</div>
                              <div className={`text-xs ${sub}`}>{worker.specialty || worker.experience || 'РњР°СЃС‚РµСЂ'}</div>
                            </div>
                            <button
                              onClick={() => assigned
                                ? setBookingWorkers(current => current.filter(item => item.id !== worker.id))
                                : setBookingWorkers(current => [...current, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])}
                              className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                              style={assigned ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                            >
                              {assigned ? 'Р’С‹Р±СЂР°РЅ' : 'Р’С‹Р±СЂР°С‚СЊ'}
                            </button>
                          </div>
                          {assigned && (
                            <div className="flex items-center gap-2 mt-2">
                              {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                              ) : (
                                <>
                                  <button onClick={() => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-indigo-600 text-white' : glass}`}>в‚Ѕ</button>
                                  <button onClick={() => setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-indigo-600 text-white' : glass}`}>%</button>
                                  {assigned.payType === 'fixed' ? (
                                    <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                      onChange={e => { const r = e.target.value; if (r === '') { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                      className={`flex-1 ${inputCls} py-1.5`} placeholder="СЃСѓРјРјР°" />
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
                  <span>РЈРІРµРґРѕРјРёС‚СЊ РјР°СЃС‚РµСЂРѕРІ</span>
                  <input
                    type="checkbox"
                    checked={notifyBookingWorkers && bookingForm.status !== 'completed'}
                    disabled={bookingForm.status === 'completed'}
                    onChange={(event) => setNotifyBookingWorkers(event.target.checked)}
                  />
                </label>
                {bookingForm.status === 'completed' && (
                  <div className={`text-xs ${sub} rounded-xl px-3 py-2`}>Р”Р»СЏ РїСЂРѕС€Р»С‹С… Р·Р°РїРёСЃРµР№ СѓРІРµРґРѕРјР»РµРЅРёСЏ РјР°СЃС‚РµСЂР°Рј РЅРµ РѕС‚РїСЂР°РІР»СЏСЋС‚СЃСЏ.</div>
                )}
                </>
                  );
                })()}
              </div>
              <button onClick={handleCreateBooking} className="w-full py-3.5 rounded-2xl font-semibold text-white" style={{ background: primary }}>
                {bookingForm.status === 'completed' ? 'Р”РѕР±Р°РІРёС‚СЊ РІ РёСЃС‚РѕСЂРёСЋ' : 'РЎРѕР·РґР°С‚СЊ Р·Р°РїРёСЃСЊ'}
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col`}>
              <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">РќР°Р№РґРµРЅРЅС‹Рµ РєР»РёРµРЅС‚С‹</h3>
                  <button onClick={() => setShowClientSearch(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className={`text-xs ${sub}`}>
                  {(() => {
                    const q = bookingForm.clientName.trim().toLowerCase();
                    const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                    return matches.length > 0 ? `РќР°Р№РґРµРЅРѕ ${matches.length} РєР»РёРµРЅС‚${matches.length === 1 ? '' : 'РѕРІ'}` : 'Р’РІРµРґРёС‚Рµ РёРјСЏ РґР»СЏ РїРѕРёСЃРєР°';
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
                              <div key={vehicleIndex}>{[vehicle.car, vehicle.plate].filter(Boolean).join(' вЂў ') || 'РђРІС‚Рѕ'}</div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </button>
                  )) : (
                    <div className={`text-sm ${sub} text-center py-8`}>
                      {q ? 'РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ' : 'РќР°С‡РЅРёС‚Рµ РІРІРѕРґРёС‚СЊ РёРјСЏ РєР»РёРµРЅС‚Р°'}
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р—Р°РїРёСЃСЊ</h3>
                <button onClick={() => { setShowBookingDetail(false); setOwnerBookingEditMode(null); setOwnerBookingEditError(null); }} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3">
                {/* Info card */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="font-medium text-sm">{selectedBooking.clientName || 'РљР»РёРµРЅС‚ Р±РµР· РёРјРµРЅРё'}</div>
                      <SourceBadge source={selectedBooking.source} />
                      {selectedBooking.isRepeatVisit && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№ РІРёР·РёС‚</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${ownerStatusBadge(selectedBooking.status)}`}>{ownerStatusLabel(selectedBooking.status)}</span>
                  </div>
                  <div className={`text-xs ${sub} mb-2`}>{selectedBooking.service} вЂў {selectedBooking.date} вЂў {selectedBooking.time}</div>
                  {selectedBooking.referralSource && (
                    <div className={`text-xs ${sub} mb-2`}>РћС‚РєСѓРґР° СѓР·РЅР°Р»: {selectedBooking.referralSource}</div>
                  )}
                  {(() => {
                    const additionalTotal = (selectedBooking.additionalServices || []).reduce((s, as) => s + (as.priceMode === 'subtract' ? 0 : as.price), 0);
                    const legacyServicesTotal = (selectedBooking.services || []).reduce((s, svc) => s + svc.price, 0);
                    const baseServicePrice = Math.max(0, selectedBooking.price - additionalTotal - legacyServicesTotal);
                    return (
                    <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>РЈСЃР»СѓРіР°</div>
                      <div>{selectedBooking.service}</div>
                      <div className="font-semibold">{baseServicePrice.toLocaleString('ru')} в‚Ѕ</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>РћРїР»Р°С‚Р°</div>
                      <div>{selectedBooking.paymentSettled ? (selectedBooking.paymentType === 'cash' ? 'РќР°Р»РёС‡РЅС‹Рµ' : selectedBooking.paymentType === 'transfer' ? 'РџРµСЂРµРІРѕРґ' : 'РџРѕ СЃС‡С‘С‚Сѓ') : 'РќРµ РѕРїР»Р°С‡РµРЅРѕ'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>РђРІС‚Рѕ</div>
                      <div>{selectedBooking.car || 'РќРµ СѓРєР°Р·Р°РЅРѕ'}</div>
                    </div>
                    <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                      <div className={`text-[11px] ${sub}`}>РќРѕРјРµСЂ</div>
                      <div>{selectedBooking.plate || 'РќРµ СѓРєР°Р·Р°РЅ'}</div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={sub}>Р‘РѕРєСЃ: {selectedBooking.box || 'РќРµ РІС‹Р±СЂР°РЅ'}</div>
                    <div className={sub}>Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ: {selectedBooking.duration} РјРёРЅ</div>
                    <div className={sub}>РњР°СЃС‚РµСЂР°: {selectedBooking.workers.length ? selectedBooking.workers.map(w => {
                      const _fixed = isFixedMasterService(services, selectedBooking?.serviceId, selectedBooking?.service);
                      return `${w.workerName}${_fixed ? ` В· С„РёРєСЃ ${formatFixedMasterAmount()}` : w.payType === 'fixed' ? ` В· ${(w.fixedAmount || 0).toLocaleString('ru')} в‚Ѕ` : ` ${w.percent}%`}`;
                    }).join(', ') : 'РќРµ РЅР°Р·РЅР°С‡РµРЅС‹'}</div>
                    <div className={sub}>РўРµР»РµС„РѕРЅ: {selectedBooking.clientPhone || 'РќРµ СѓРєР°Р·Р°РЅ'}</div>
                    <div className={sub}>РљРѕРјРјРµРЅС‚Р°СЂРёР№: {selectedBooking.notes?.trim() || 'РќРµС‚'}</div>
                  </div>
                  {((selectedBooking.services && selectedBooking.services.length > 0) || (selectedBooking.additionalServices && selectedBooking.additionalServices.length > 0)) && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                      <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-2`}>Р”РћРџ. РЈРЎР›РЈР“Р</div>
                      {selectedBooking.additionalServices && selectedBooking.additionalServices.map(as => (
                        <div key={as.id} className="py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{as.name}</span>
                            <span className={`font-semibold ${as.priceMode === 'subtract' ? 'text-red-500' : ''}`}>{as.priceMode === 'subtract' ? 'в€’ ' : ''}{as.price.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                          {as.isOutsource ? (
                            <div className="flex justify-between items-center mt-1">
                              <span className={`text-xs ${sub}`}>РђСѓС‚СЃРѕСЂСЃ В· Р°СѓС‚СЃРѕСЂСЃРµСЂСѓ</span>
                              <span className="text-xs font-medium text-red-500">в€’ {(as.outsourceAmount || 0).toLocaleString('ru')} в‚Ѕ</span>
                            </div>
                          ) : (
                            as.workers.map(w => {
                              const earned = w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(as.price * w.percent / 100);
                              return (
                                <div key={w.workerId} className="flex justify-between items-center mt-1">
                                  <span className={`text-xs ${sub}`}>{w.workerName} В· {w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} в‚Ѕ` : `${w.percent}%`}</span>
                                  <span className="text-xs font-medium text-green-500">+{earned.toLocaleString('ru')} в‚Ѕ</span>
                                </div>
                              );
                            })
                          )}
                          <button onClick={async () => { try { const updated = await removeBookingAdditionalService(selectedBooking.id, as.id); setSelectedBooking(updated); } catch {} }} className="text-xs text-red-500 mt-1">
                            РЈРґР°Р»РёС‚СЊ
                          </button>
                          <button onClick={() => handleOpenOwnerEditAsvc(as)} className="text-xs mt-1 ml-2" style={{ color: primary }}>
                            РР·РјРµРЅРёС‚СЊ
                          </button>
                        </div>
                      ))}
                      {selectedBooking.services && selectedBooking.services.filter(s => !selectedBooking.additionalServices?.find(as => as.serviceId === s.serviceId && as.name === s.name)).map((s, i) => (
                        <div key={`legacy-${i}`} className="py-2 border-b last:border-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{s.name}</span>
                            <span className="font-semibold">{s.price.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                          {selectedBooking.workers.length > 0 && selectedBooking.workers.map(w => {
                            const earned = w.payType === 'fixed' ? (w.fixedAmount || 0) : Math.round(s.price * (w.percent || 0) / 100);
                            return (
                              <div key={w.workerId} className="flex justify-between items-center mt-1">
                                <span className={`text-xs ${sub}`}>{w.workerName} В· {w.payType === 'fixed' ? `${(w.fixedAmount || 0).toLocaleString('ru')} в‚Ѕ` : `${w.percent}%`}</span>
                                <span className="text-xs font-medium text-green-500">+{earned.toLocaleString('ru')} в‚Ѕ</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 mt-1 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                        <span className="text-sm font-semibold">РС‚РѕРіРѕРІР°СЏ СЃСѓРјРјР°</span>
                        <span className="text-base font-bold" style={{ color: primary }}>{selectedBooking.price.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                      <div className={`text-xs ${sub} mt-1 space-y-0.5`}>
                        <div className="flex justify-between"><span>Р‘Р°Р·РѕРІР°СЏ СѓСЃР»СѓРіР° В«{selectedBooking.service}В»</span><span>{baseServicePrice.toLocaleString('ru')} в‚Ѕ</span></div>
                        {(selectedBooking.additionalServices || []).map(as => (
                          <div key={as.id} className="flex justify-between"><span className={as.priceMode === 'subtract' ? 'text-red-500' : ''}>{as.priceMode === 'subtract' ? 'в€’ ' : '+ '}{as.name}{as.isOutsource ? ' (Р°СѓС‚СЃРѕСЂСЃ)' : ''}</span><span>{as.priceMode === 'subtract' ? 'в€’ ' : ''}{as.price.toLocaleString('ru')} в‚Ѕ</span></div>
                        ))}
                        {(selectedBooking.services || []).filter(s => !selectedBooking.additionalServices?.find(as => as.serviceId === s.serviceId && as.name === s.name)).map((s, i) => (
                          <div key={`legacy-${i}`} className="flex justify-between"><span>+ {s.name}</span><span>{s.price.toLocaleString('ru')} в‚Ѕ</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                    </>
                    );
                  })()}
                </div>

                {/* Materials card */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xs font-medium ${sub} uppercase tracking-wider`}>РњРђРўР•Р РРђР›Р« {selectedBooking.materialsWrittenOff ? <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600">СЃРїРёСЃР°РЅРѕ</span> : (selectedBooking.materials?.length ? <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600">РЅРµ СЃРїРёСЃР°РЅРѕ</span> : null)}</div>
                    {selectedBooking.materialsWrittenOff && (
                      <span className={`text-[10px] ${sub}`}>СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РІРѕР·РјРѕР¶РЅРѕ вЂ” СЃРїРёСЃР°РЅРёРµ СѓР¶Рµ РІС‹РїРѕР»РЅРµРЅРѕ</span>
                    )}
                  </div>
                  {selectedBooking.materials && selectedBooking.materials.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedBooking.materials.map((m: any) => (
                        <div key={m.id} className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl px-3 py-2 flex items-center justify-between gap-2`}>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{m.name}</div>
                            <div className={`text-xs ${sub}`}>{m.qty} {m.unit} Г— {Number(m.unitPrice).toLocaleString('ru')} в‚Ѕ = {(Number(m.qty) * Number(m.unitPrice)).toLocaleString('ru')} в‚Ѕ</div>
                          </div>
                        </div>
                      ))}
                      <div className={`text-xs ${sub} pt-1`}>РС‚РѕРіРѕ: {selectedBooking.materials.reduce((s: number, m: any) => s + Number(m.qty) * Number(m.unitPrice), 0).toLocaleString('ru')} в‚Ѕ</div>
                    </div>
                  ) : (
                    <div className={`text-xs ${sub}`}>РњР°С‚РµСЂРёР°Р»С‹ РЅРµ СѓРєР°Р·Р°РЅС‹. Р”РѕР±Р°РІСЊ СЃРїРёСЃР°РЅРёРµ С‡РµСЂРµР· В«РњР°С‚РµСЂРёР°Р»С‹В».</div>
                  )}
                </div>

                {/* Edit buttons */}
                <div className={`${glass} rounded-2xl p-4`}>
                  <div className={`text-xs font-medium ${sub} uppercase tracking-wider mb-3`}>Р Р•Р”РђРљРўРР РћР’РђРўР¬</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { mode: 'full' as const, label: 'РџРѕР»РЅРѕРµ' },
                      { mode: 'status' as const, label: 'РЎС‚Р°С‚СѓСЃ' },
                      { mode: 'price' as const, label: 'Р¦РµРЅР°' },
                      { mode: 'workers' as const, label: 'РњР°СЃС‚РµСЂР°' },
                      { mode: 'datetime' as const, label: 'Р”Р°С‚Р° Рё РІСЂРµРјСЏ' },
                      { mode: 'materials' as const, label: 'РњР°С‚РµСЂРёР°Р»С‹' },
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
                          if (mode === 'materials') setOwnerBookingEditMaterials((selectedBooking.materials || []).map((m: any) => ({ stockItemId: m.stockItemId, name: m.name, qty: m.qty, unit: m.unit, unitPrice: Number(m.unitPrice) })));
                          if (mode === 'datetime') {
                            setOwnerBookingEditDate(selectedBooking.date);
                            setOwnerBookingEditTime(selectedBooking.time);
                          }
                        }}
                        className="py-2.5 rounded-xl text-sm font-medium"
                        style={ownerBookingEditMode === mode
                          ? { background: primary, color: '#fff' }
                          : { background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: isDark ? '#E4E4E7' : '#131316' }}
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
                    <Plus size={15} strokeWidth={1.75} />Р”РѕР±Р°РІРёС‚СЊ РґРѕРї. СѓСЃР»СѓРіСѓ
                  </button>
                </div>

                {/* Edit panels */}
                {ownerBookingEditMode === 'status' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>РР·РјРµРЅРёС‚СЊ СЃС‚Р°С‚СѓСЃ</div>
                    <select className={selectCls} value={ownerBookingEditStatus} onChange={e => setOwnerBookingEditStatus(e.target.value as BookingStatus)}>
                      {OWNER_BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'price' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>РР·РјРµРЅРёС‚СЊ С†РµРЅСѓ</div>
                    <input className={inputCls} type="number" min={0} value={ownerBookingEditPrice} onChange={e => setOwnerBookingEditPrice(e.target.value)} placeholder="0" />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'workers' && (() => {
                  const _isFixed = isFixedMasterService(services, selectedBooking?.serviceId, selectedBooking?.service);
                  return (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>РР·РјРµРЅРёС‚СЊ РјР°СЃС‚РµСЂРѕРІ {_isFixed ? `(С„РёРєСЃ ${formatFixedMasterAmount()})` : ''}</div>
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
                                {assigned ? 'Р’С‹Р±СЂР°РЅ' : 'Р’С‹Р±СЂР°С‚СЊ'}
                              </button>
                            </div>
                            {assigned && (
                              <div className="flex items-center gap-2 mt-2">
                                {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                                ) : (
                                  <>
                                    <button onClick={() => setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                      className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-indigo-600 text-white' : glass}`}>в‚Ѕ</button>
                                    <button onClick={() => setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                      className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-indigo-600 text-white' : glass}`}>%</button>
                                    {assigned.payType === 'fixed' ? (
                                      <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                        onChange={e => { const r = e.target.value; if (r === '') { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerBookingEditWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                        className={`flex-1 ${inputCls} py-1.5`} placeholder="СЃСѓРјРјР°" />
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
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {ownerBookingEditMode === 'datetime' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-2`}>РР·РјРµРЅРёС‚СЊ РґР°С‚Сѓ Рё РІСЂРµРјСЏ</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                        <input className={inputCls} type="date" value={toISODate(ownerBookingEditDate)} onChange={e => {
                          const val = parseFlexibleDate(e.target.value);
                          setOwnerBookingEditDate(val ? formatDate(val) : e.target.value);
                        }} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Р’СЂРµРјСЏ</label>
                        <select className={selectCls} value={ownerBookingEditTime} onChange={e => setOwnerBookingEditTime(e.target.value)}>
                          {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditMode === 'materials' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`text-xs font-medium ${sub}`}>РњР°С‚РµСЂРёР°Р»С‹ (СЃРїРёСЃР°РЅРёРµ)</div>
                      <button onClick={() => { setOwnerEditMaterialPickerCategory(null); setShowOwnerEditMaterialPicker(true); }}
                        className="px-3 py-1 rounded-lg text-xs shrink-0" style={{ background: `${primary}15`, color: primary }}>+ Р”РѕР±Р°РІРёС‚СЊ</button>
                    </div>
                    {ownerBookingEditMaterials.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {ownerBookingEditMaterials.map((mat, idx) => {
                          const parsedQty = typeof mat.qty === 'string' ? parseFloat(mat.qty) : mat.qty;
                          const safeQty = (!isNaN(parsedQty as number) && (parsedQty as number) > 0) ? (parsedQty as number) : 0;
                          return (
                            <div key={idx} className={`${glass} rounded-xl px-3 py-2 flex items-center justify-between gap-2`}>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{mat.name}</div>
                                <div className={`text-xs ${sub}`}>{safeQty} {mat.unit} Г— {mat.unitPrice.toLocaleString('ru')} в‚Ѕ = {(safeQty * mat.unitPrice).toLocaleString('ru')} в‚Ѕ</div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <input type="text" inputMode="decimal"
                                  value={typeof mat.qty === 'string' ? mat.qty : (mat.qty === 0 ? '' : String(mat.qty))}
                                  onChange={e => {
                                    const raw = e.target.value.replace(',', '.');
                                    setOwnerBookingEditMaterials(current => current.map((m, i) => i === idx ? { ...m, qty: raw } : m));
                                  }}
                                  onBlur={() => {
                                    if (typeof mat.qty === 'string') {
                                      const val = parseFloat(mat.qty);
                                      setOwnerBookingEditMaterials(current => current.map((m, i) => i === idx ? { ...m, qty: (!isNaN(val) && val > 0) ? val : 1 } : m));
                                    }
                                  }}
                                  className="w-14 text-center text-xs py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }} />
                                <select value={mat.unit}
                                  onChange={e => setOwnerBookingEditMaterials(current => current.map((m, i) => i === idx ? { ...m, unit: e.target.value } : m))}
                                  className="text-xs py-1 rounded-lg px-1" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}>
                                  {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                <button onClick={() => setOwnerBookingEditMaterials(current => current.filter((_, i) => i !== idx))}
                                  className="p-1 rounded text-red-500"><X size={14} strokeWidth={1.75} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`text-xs ${sub} mb-3`}>РџРѕРєР° РЅРµ РІС‹Р±СЂР°РЅРѕ. РќР°Р¶РјРё В«Р”РѕР±Р°РІРёС‚СЊВ» Рё РІС‹Р±РµСЂРё СЃРѕ СЃРєР»Р°РґР°.</div>
                    )}
                    {selectedBooking.materialsWrittenOff && (
                      <div className={`text-xs mb-3 px-2 py-1 rounded-lg ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>РЎРїРёСЃР°РЅРёРµ СѓР¶Рµ РІС‹РїРѕР»РЅРµРЅРѕ. РќРѕРІС‹Рµ РјР°С‚РµСЂРёР°Р»С‹ Р±СѓРґСѓС‚ СѓС‡С‚РµРЅС‹, РЅРѕ РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРіРѕ СЃРїРёСЃР°РЅРёСЏ СЃРѕ СЃРєР»Р°РґР° РЅРµ Р±СѓРґРµС‚ вЂ” РїСЂРё РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚Рё СЃРїРёС€Рё РІСЂСѓС‡РЅСѓСЋ С‡РµСЂРµР· СЃРєР»Р°Рґ.</div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                    <AnimatePresence>
                      {showOwnerEditMaterialPicker && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
                          onClick={() => setShowOwnerEditMaterialPicker(false)}>
                          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl w-full max-w-sm max-h-[60vh] flex flex-col`}>
                            <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">Р’С‹Р±СЂР°С‚СЊ РјР°С‚РµСЂРёР°Р»</h3>
                                <button onClick={() => setShowOwnerEditMaterialPicker(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                <button onClick={() => setOwnerEditMaterialPickerCategory(null)}
                                  className={`text-xs px-2.5 py-1 rounded-full ${!ownerEditMaterialPickerCategory ? 'text-white font-medium' : glass}`}
                                  style={!ownerEditMaterialPickerCategory ? { background: primary } : {}}>Р’СЃРµ</button>
                                {stockCategories.filter(c => !c.parentId).map(cat => (
                                  <button key={cat.id} onClick={() => setOwnerEditMaterialPickerCategory(cat.id)}
                                    className={`text-xs px-2.5 py-1 rounded-full ${ownerEditMaterialPickerCategory === cat.id ? 'text-white font-medium' : glass}`}
                                    style={ownerEditMaterialPickerCategory === cat.id ? { background: primary } : {}}>{cat.name}</button>
                                ))}
                              </div>
                            </div>
                            <div className="overflow-y-auto p-4 space-y-2">
                              {stockItems
                                .filter(item => {
                                  if (!ownerEditMaterialPickerCategory) return true;
                                  const catIds = stockCategoryIdsWithDescendants(ownerEditMaterialPickerCategory, stockCategories);
                                  return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerEditMaterialPickerCategory)?.name;
                                })
                                .filter(item => item.qty > 0)
                                .map(item => (
                                  <div key={item.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium">{item.name}</div>
                                      <div className={`text-xs ${sub}`}>Р’ РЅР°Р»РёС‡РёРё: {item.qty} {item.unit} В· {item.unitPrice.toLocaleString('ru')} в‚Ѕ/{item.unit}</div>
                                    </div>
                                    <button onClick={() => {
                                      if (!ownerBookingEditMaterials.find(m => m.stockItemId === item.id)) {
                                        setOwnerBookingEditMaterials(current => [...current, { stockItemId: item.id, name: item.name, qty: '', unit: item.unit, unitPrice: item.unitPrice }]);
                                      }
                                      setShowOwnerEditMaterialPicker(false);
                                    }}
                                      className="px-3 py-1.5 rounded-lg text-xs shrink-0 text-white"
                                      style={{ background: primary }}>Р’С‹Р±СЂР°С‚СЊ</button>
                                  </div>
                                ))}
                              {stockItems.filter(item => {
                                if (!ownerEditMaterialPickerCategory) return true;
                                const catIds = stockCategoryIdsWithDescendants(ownerEditMaterialPickerCategory, stockCategories);
                                return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerEditMaterialPickerCategory)?.name;
                              }).filter(item => item.qty > 0).length === 0 && (
                                <div className={`text-sm ${sub} text-center py-6`}>РќРµС‚ РјР°С‚РµСЂРёР°Р»РѕРІ РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё</div>
                              )}
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {ownerBookingEditMode === 'full' && (
                  <div className={`${glass} rounded-2xl p-4`}>
                    <div className={`text-xs font-medium ${sub} mb-3`}>РџРѕР»РЅРѕРµ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ</div>
                    <div className="space-y-3">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РЎС‚Р°С‚СѓСЃ</label>
                        <select className={selectCls} value={ownerBookingEditFull.status} onChange={e => setOwnerBookingEditFull(p => ({ ...p, status: e.target.value as BookingStatus }))}>
                          {OWNER_BOOKING_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          <option value="in_progress">Р’ СЂР°Р±РѕС‚Рµ</option>
                          <option value="no_show">РќРµ РїСЂРёРµС…Р°Р»</option>
                          <option value="cancelled">РћС‚РјРµРЅРµРЅРѕ</option>
                        </select>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РЈСЃР»СѓРіР°</label>
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
                          onCreateNew={handleCreateServiceFromQuery}
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
                          <label className={`text-xs ${sub} block mb-1`}>РЎС‚РѕРёРјРѕСЃС‚СЊ (в‚Ѕ)</label>
                          <input className={inputCls} type="number" min={0} value={numberInputValue(ownerBookingEditFull.price)} onChange={e => setOwnerBookingEditFull(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)</label>
                          <input className={inputCls} type="number" min={1} value={numberInputValue(ownerBookingEditFull.duration)} onChange={e => setOwnerBookingEditFull(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р°</label>
                          <input className={inputCls} type="date" value={toISODate(ownerBookingEditFull.date)} onChange={e => {
                            const val = parseFlexibleDate(e.target.value);
                            setOwnerBookingEditFull(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                          }} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Р’СЂРµРјСЏ</label>
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
                          <label className={`text-xs ${sub} block mb-1`}>РРјСЏ РєР»РёРµРЅС‚Р°</label>
                          <input className={inputCls} placeholder="РРјСЏ" value={ownerBookingEditFull.clientName} onChange={e => setOwnerBookingEditFull(p => ({ ...p, clientName: e.target.value }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РўРµР»РµС„РѕРЅ</label>
                          <input className={inputCls} placeholder="+7..." value={ownerBookingEditFull.clientPhone} onChange={e => setOwnerBookingEditFull(p => ({ ...p, clientPhone: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РђРІС‚РѕРјРѕР±РёР»СЊ</label>
                          <input className={inputCls} placeholder="РњР°СЂРєР° РјРѕРґРµР»СЊ" value={ownerBookingEditFull.car} onChange={e => setOwnerBookingEditFull(p => ({ ...p, car: e.target.value }))} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РќРѕРјРµСЂ</label>
                          <div className="flex gap-1.5">
                            <div className="flex flex-col gap-1 shrink-0">
                              {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => (
                                <button key={t} type="button"
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${ownerBookingEditFull.plateType === t ? 'text-white font-medium' : `${sub}`}`}
                                  style={ownerBookingEditFull.plateType === t ? { background: primary } : {}}
                                  onClick={() => setOwnerBookingEditFull(p => ({ ...p, plateType: t }))}
                                >{t === 'russian' ? 'РђРІС‚Рѕ' : t === 'motorcycle' ? 'РњРѕС‚Рѕ' : 'РРЅРѕ'}</button>
                              ))}
                            </div>
                            <input className={`${inputCls} flex-1`} maxLength={ownerBookingEditFull.plateType === 'foreign' ? 15 : 9} placeholder={ownerBookingEditFull.plateType === 'motorcycle' ? '1234Р°РІ77' : ownerBookingEditFull.plateType === 'foreign' ? 'xyz1234' : 'Р°123РІСЃ777'} value={ownerBookingEditFull.plate} onChange={e => setOwnerBookingEditFull(p => ({ ...p, plate: normalizePlateInput(e.target.value, p.plateType) }))} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label>
                        <textarea className={`${inputCls} min-h-[80px] resize-none`} placeholder="Р”РѕР±Р°РІРёС‚СЊ РїСЂРёРјРµС‡Р°РЅРёРµ..." value={ownerBookingEditFull.notes} onChange={e => setOwnerBookingEditFull(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РћС‚РєСѓРґР° Рѕ РЅР°СЃ СѓР·РЅР°Р»</label>
                        <div className="flex flex-wrap gap-1.5">
                          {REFERRAL_SOURCES.map((source) => (
                            <button
                              key={source.value}
                              type="button"
                              onClick={() => setOwnerBookingEditFull((current) => ({ ...current, referralSource: source.value }))}
                              className={`text-xs px-3 py-1.5 rounded-full border transition ${ownerBookingEditFull.referralSource === source.value ? 'text-white font-medium' : glass}`}
                              style={ownerBookingEditFull.referralSource === source.value ? { background: primary, borderColor: primary } : {}}
                            >
                              {source.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РўРёРї РѕРїР»Р°С‚С‹</label>
                          <select className={selectCls} value={ownerBookingEditFull.paymentType} onChange={e => setOwnerBookingEditFull(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                            <option value="cash">РќР°Р»РёС‡РЅС‹Рµ</option>
                            <option value="transfer">РџРµСЂРµРІРѕРґ</option>
                            <option value="invoice">РџРѕ СЃС‡С‘С‚Сѓ</option>
                          </select>
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РћРїР»Р°С‚Р° РїРѕР»СѓС‡РµРЅР°</label>
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={ownerBookingEditFull.paymentSettled} onChange={e => setOwnerBookingEditFull(p => ({ ...p, paymentSettled: e.target.checked }))} />
                            <span className="text-sm">РџРѕРґС‚РІРµСЂР¶РґРµРЅР°</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setOwnerBookingEditMode(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                      <button onClick={() => void handleSaveOwnerBookingEdit()} disabled={ownerBookingEditSaving} className="flex-1 py-2.5 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: primary }}>
                        {ownerBookingEditSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                      </button>
                    </div>
                  </div>
                )}

                {ownerBookingEditError && (
                  <div className="flex items-center gap-2 text-red-500 text-xs px-1">
                    <AlertCircle size={14} strokeWidth={1.75} />{ownerBookingEditError}
                  </div>
                )}
                <button onClick={handleDeleteOwnerBooking} className={`w-full py-3 rounded-xl text-sm font-medium ${glass} text-red-500 hover:bg-red-500/10 transition-colors`}>
                  <Trash2 size={15} strokeWidth={1.75} className="inline mr-1.5 -mt-0.5" />РЈРґР°Р»РёС‚СЊ Р·Р°РїРёСЃСЊ
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{ownerStatusLabel(showStatusList)}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${ownerStatusBadge(showStatusList)}`}>{statusListItems.length} Р·Р°РїРёСЃРµР№</span>
                  <button onClick={() => setShowStatusList(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
              </div>
              {statusListItems.length === 0 ? (
                <div className={`${glass} rounded-2xl p-8 text-center`}>
                  <CalendarDays size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                  <p className={sub}>РќРµС‚ Р·Р°РїРёСЃРµР№ СЃРѕ СЃС‚Р°С‚СѓСЃРѕРј В«{ownerStatusLabel(showStatusList)}В»</p>
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
                              <div className="font-semibold text-sm truncate">{booking.date} В· {booking.time} В· {booking.clientName}</div>
                              <SourceBadge source={booking.source} />
                              {booking.isRepeatVisit && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№</span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                          </div>
                          <div className={`text-sm ${sub} truncate`}>{booking.service}</div>
                          {(booking.car || booking.plate) && (
                            <div className={`text-xs ${sub} mt-0.5 truncate`}>
                              {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
                            </div>
                          )}
                          <div className="flex justify-between mt-2">
                            <span className={`text-xs ${sub}`}>{booking.box} В· {booking.duration} РјРёРЅ</span>
                            <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} в‚Ѕ</span>
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{kpiModal.title}</h3>
                <div className="flex items-center gap-2">
                  {kpiModal.kind === 'bookings' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.total.toLocaleString('ru')}{kpiModal.isMoney !== false ? ' в‚Ѕ' : ''} В· {kpiModal.bookings.length} {kpiModal.totalLabel}
                    </span>
                  )}
                  {kpiModal.kind === 'expenses' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.total.toLocaleString('ru')} в‚Ѕ В· {kpiModal.expenses.length} СЂР°СЃС…РѕРґРѕРІ
                    </span>
                  )}
                  {kpiModal.kind === 'services' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.services.length} СѓСЃР»СѓРі
                    </span>
                  )}
                  {kpiModal.kind === 'finance' && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: `${kpiModal.color}18`, color: kpiModal.color }}>
                      {kpiModal.profit >= 0 ? '+' : ''}{kpiModal.profit.toLocaleString('ru')} в‚Ѕ
                    </span>
                  )}
                  <button onClick={() => setKpiModal(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
              </div>

              {kpiModal.kind === 'bookings' && (
                kpiModal.bookings.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <CalendarDays size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Р—Р°РїРёСЃРµР№ РїРѕРєР° РЅРµС‚</p>
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
                                <div className="font-semibold text-sm truncate">{booking.date} В· {booking.time} В· {booking.clientName}</div>
                                <SourceBadge source={booking.source} />
                                {booking.isRepeatVisit && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 shrink-0">РџРѕРІС‚РѕСЂРЅС‹Р№</span>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${ownerStatusBadge(booking.status)}`}>{ownerStatusLabel(booking.status)}</span>
                            </div>
                            <div className={`text-sm ${sub} truncate`}>{booking.service}</div>
                            {(booking.car || booking.plate) && (
                              <div className={`text-xs ${sub} mt-0.5 truncate`}>
                                {[booking.car, booking.plate].filter(Boolean).join(' В· ')}
                              </div>
                            )}
                            <div className="flex justify-between mt-2">
                              <span className={`text-xs ${sub}`}>{booking.box} В· {booking.duration} РјРёРЅ</span>
                              <span className="text-sm font-semibold">{booking.price.toLocaleString('ru')} в‚Ѕ</span>
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
                    <DollarSign size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>Р Р°СЃС…РѕРґРѕРІ Р·Р° РїРµСЂРёРѕРґ РЅРµС‚</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kpiModal.expenses.map(expense => (
                      <div key={expense.id} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{expense.title}</div>
                          <div className={`text-xs ${sub}`}>{expense.category} В· {expense.date}</div>
                        </div>
                        <div className="font-semibold text-sm shrink-0" style={{ color: '#FF6B6B' }}>в€’{expense.amount.toLocaleString('ru')} в‚Ѕ</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {kpiModal.kind === 'services' && (
                kpiModal.services.length === 0 ? (
                  <div className={`${glass} rounded-2xl p-8 text-center`}>
                    <BarChart3 size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} />
                    <p className={sub}>РќРµС‚ РґР°РЅРЅС‹С… РїРѕ СѓСЃР»СѓРіР°Рј</p>
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
                          <div className={`text-xs ${sub}`}>{service.count} Р·Р°РїРёСЃРµР№</div>
                        </div>
                        <div className="font-semibold text-sm shrink-0">{service.revenue.toLocaleString('ru')} в‚Ѕ</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {kpiModal.kind === 'finance' && (
                <div className="space-y-2">
                  {[
                    { label: 'Р’С‹СЂСѓС‡РєР° Р·Р° РЅРµРґРµР»СЋ', value: kpiModal.revenue, color: accent },
                    { label: 'Р”РѕС…РѕРґС‹ Р·Р° РЅРµРґРµР»СЋ', value: kpiModal.incomes, color: '#06B6D4' },
                    { label: 'Р Р°СЃС…РѕРґС‹ Р·Р° РЅРµРґРµР»СЋ', value: -kpiModal.expenses, color: '#FF6B6B' },
                    { label: 'РџСЂРёР±С‹Р»СЊ Р·Р° РЅРµРґРµР»СЋ', value: kpiModal.profit, color: kpiModal.color },
                  ].map(row => (
                    <div key={row.label} className={`${glass} rounded-xl p-3 flex justify-between items-center`}>
                      <div className="text-sm">{row.label}</div>
                      <div className="font-semibold text-sm" style={{ color: row.color }}>
                        {row.value >= 0 ? '+' : ''}{row.value.toLocaleString('ru')} в‚Ѕ
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р”РѕР±Р°РІРёС‚СЊ РґРѕРї. СѓСЃР»СѓРіСѓ</h3>
                <button onClick={() => setShowOwnerAddService(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <p className={`text-xs ${sub} mb-4`}>Р”Р»СЏ: {selectedBooking.clientName} ({selectedBooking.service})</p>

              {/* в”Ђв”Ђ РЈСЃР»СѓРіР° в”Ђв”Ђ */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>РЈСЃР»СѓРіР°</label>
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
                  placeholder="Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ"
                  onCreateNew={handleCreateServiceFromQuery}
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

              {/* в”Ђв”Ђ Р¦РµРЅР° Рё РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ в”Ђв”Ђ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerAddServiceDraft.price)} onChange={e => setOwnerAddServiceDraft(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚. (РјРёРЅ)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerAddServiceDraft.duration)} onChange={e => setOwnerAddServiceDraft(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                </div>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* в”Ђв”Ђ Р РµР¶РёРј РїСЂРёРјРµРЅРµРЅРёСЏ С†РµРЅС‹ в”Ђв”Ђ */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµРЅРёС‚СЊ Рє РѕСЃРЅРѕРІРЅРѕР№ СѓСЃР»СѓРіРµ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOwnerAddServiceDraft(p => ({ ...p, priceMode: 'add' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerAddServiceDraft.priceMode === 'add' ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                  >
                    + РџР»СЋСЃ
                  </button>
                  <button
                    onClick={() => setOwnerAddServiceDraft(p => ({ ...p, priceMode: 'subtract' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerAddServiceDraft.priceMode === 'subtract' ? { background: '#EF4444', color: 'white' } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    в€’ РњРёРЅСѓСЃ
                  </button>
                </div>
                {ownerAddServiceDraft.priceMode === 'subtract' && (
                  <p className={`text-xs ${sub} mt-1.5`}>РЎСѓРјРјР° РЅРµ РїСЂРёР±Р°РІР»СЏРµС‚СЃСЏ Рє СЃС‚РѕРёРјРѕСЃС‚Рё РєР»РёРµРЅС‚Р° Рё РІС‹С‡РёС‚Р°РµС‚СЃСЏ РёР· Р±Р°Р·С‹ СЂР°СЃС‡С‘С‚Р° Р·Рї РјР°СЃС‚РµСЂРѕРІ РѕСЃРЅРѕРІРЅРѕР№ СѓСЃР»СѓРіРё</p>
                )}
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* в”Ђв”Ђ РђСѓС‚СЃРѕСЂСЃ в”Ђв”Ђ */}
              <div className="mb-2">
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РђСѓС‚СЃРѕСЂСЃ</span>
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
                    <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° Р°СѓС‚СЃРѕСЂСЃРµСЂСѓ (в‚Ѕ)</label>
                    <input className={inputCls} type="number" min={0} value={numberInputValue(ownerAddServiceDraft.outsourceAmount)}
                      onChange={e => setOwnerAddServiceDraft(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
              </div>

              {!ownerAddServiceDraft.isOutsource && (
              <>
              {/* в”Ђв”Ђ РњР°СЃС‚РµСЂР° в”Ђв”Ђ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-medium ${sub} uppercase tracking-wider`}>РќР°Р·РЅР°С‡РёС‚СЊ РјР°СЃС‚РµСЂРѕРІ</label>
                  {ownerAddServiceWorkers.length > 0 && (
                    <span className={`text-xs ${sub}`}>Р’С‹Р±СЂР°РЅРѕ: {ownerAddServiceWorkers.length}</span>
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
                            {assigned ? 'Р’С‹Р±СЂР°РЅ' : 'Р’С‹Р±СЂР°С‚СЊ'}
                          </button>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-indigo-600 text-white' : glass}`}>в‚Ѕ</button>
                            <button onClick={() => setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-indigo-600 text-white' : glass}`}>%</button>
                            {assigned.payType === 'fixed' ? (
                              <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                onChange={e => { const r = e.target.value; if (r === '') { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerAddServiceWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                className={`flex-1 ${inputCls} py-1.5`} placeholder="СЃСѓРјРјР°" />
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

              {/* в”Ђв”Ђ РС‚РѕРіРѕ в”Ђв”Ђ */}
              {ownerAddServiceDraft.serviceId && (
                <>
                  <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                  <div className={`${glass} rounded-2xl p-4 space-y-2`}>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>РС‚РѕРіРѕ</div>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${sub}`}>РљР»РёРµРЅС‚ Р·Р°РїР»Р°С‚РёС‚</span>
                      <span className="text-sm font-semibold">{ownerAddServiceDraft.priceMode === 'subtract' ? '0 в‚Ѕ (РЅРµ РїСЂРёР±Р°РІР»СЏРµС‚СЃСЏ)' : `+ ${ownerAddServiceDraft.price.toLocaleString('ru')} в‚Ѕ`}</span>
                    </div>
                    {ownerAddServiceDraft.priceMode === 'subtract' && (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${sub}`}>Р‘Р°Р·Р° Р·Рї РјР°СЃС‚РµСЂРѕРІ РѕСЃРЅРѕРІРЅРѕР№ СѓСЃР»СѓРіРё</span>
                        <span className="text-sm font-semibold text-red-500">в€’ {ownerAddServiceDraft.price.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                    )}
                    {ownerAddServiceDraft.isOutsource ? (
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${sub}`}>РђСѓС‚СЃРѕСЂСЃРµСЂСѓ</span>
                        <span className="text-sm font-medium text-red-500">в€’ {ownerAddServiceDraft.outsourceAmount.toLocaleString('ru')} в‚Ѕ</span>
                      </div>
                    ) : ownerAddServiceWorkers.length > 0 && ownerAddServiceWorkers.map(item => {
                      const w = workers.find(wk => wk.id === item.id);
                      const pct = item.percent === '' ? 0 : item.percent;
                      const earned = item.payType === 'fixed' ? (item.fixedAmount || 0) : Math.round(ownerAddServiceDraft.price * pct / 100);
                      const _svc = services.find(s => s.id === ownerAddServiceDraft.serviceId);
                      const _fixed = isFixedMasterService(services, _svc?.id, _svc?.name);
                      return (
                        <div key={item.id} className="flex justify-between items-center">
                          <span className={`text-sm ${sub}`}>{w?.name || 'РњР°СЃС‚РµСЂ'}{_fixed ? ` В· С„РёРєСЃ ${formatFixedMasterAmount()}` : item.payType === 'fixed' ? ` В· ${(item.fixedAmount || 0).toLocaleString('ru')} в‚Ѕ` : ` В· ${pct}%`}</span>
                          <span className="text-sm font-medium text-green-500">{_fixed ? formatFixedMasterAmount() : `${earned.toLocaleString('ru')} в‚Ѕ`}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {ownerAddServiceError && (
                <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                  <AlertCircle size={14} strokeWidth={1.75} />{ownerAddServiceError}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowOwnerAddService(false)} className={`flex-1 py-3 rounded-2xl text-sm font-medium ${glass}`}>РћС‚РјРµРЅР°</button>
                <button onClick={() => void handleAddOwnerService()} disabled={ownerAddServiceSaving} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                  {ownerAddServiceSaving ? 'Р”РѕР±Р°РІР»РµРЅРёРµ...' : 'Р”РѕР±Р°РІРёС‚СЊ'}
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">РР·РјРµРЅРёС‚СЊ РґРѕРї. СѓСЃР»СѓРіСѓ</h3>
                <button onClick={() => setOwnerEditAsvcId(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <p className={`text-xs ${sub} mb-4`}>Р”Р»СЏ: {selectedBooking.clientName} ({selectedBooking.service})</p>

              {/* в”Ђв”Ђ Р¦РµРЅР° Рё РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊ в”Ђв”Ђ */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerEditAsvcDraft.price)} onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚. (РјРёРЅ)</label>
                  <input className={inputCls} type="number" value={numberInputValue(ownerEditAsvcDraft.duration)} onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, duration: numberFromInput(e.target.value) }))} />
                </div>
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* в”Ђв”Ђ Р РµР¶РёРј РїСЂРёРјРµРЅРµРЅРёСЏ С†РµРЅС‹ в”Ђв”Ђ */}
              <div>
                <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµРЅРёС‚СЊ Рє РѕСЃРЅРѕРІРЅРѕР№ СѓСЃР»СѓРіРµ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOwnerEditAsvcDraft(p => ({ ...p, priceMode: 'add' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerEditAsvcDraft.priceMode === 'add' ? { background: primary, color: 'white' } : { background: `${primary}15`, color: primary }}
                  >
                    + РџР»СЋСЃ
                  </button>
                  <button
                    onClick={() => setOwnerEditAsvcDraft(p => ({ ...p, priceMode: 'subtract' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition"
                    style={ownerEditAsvcDraft.priceMode === 'subtract' ? { background: '#EF4444', color: 'white' } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                  >
                    в€’ РњРёРЅСѓСЃ
                  </button>
                </div>
                {ownerEditAsvcDraft.priceMode === 'subtract' && (
                  <p className={`text-xs ${sub} mt-1.5`}>РЎСѓРјРјР° РЅРµ РїСЂРёР±Р°РІР»СЏРµС‚СЃСЏ Рє СЃС‚РѕРёРјРѕСЃС‚Рё РєР»РёРµРЅС‚Р° Рё РІС‹С‡РёС‚Р°РµС‚СЃСЏ РёР· Р±Р°Р·С‹ СЂР°СЃС‡С‘С‚Р° Р·Рї РјР°СЃС‚РµСЂРѕРІ РѕСЃРЅРѕРІРЅРѕР№ СѓСЃР»СѓРіРё</p>
                )}
              </div>

              <div className="border-t my-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

              {/* в”Ђв”Ђ РђСѓС‚СЃРѕСЂСЃ в”Ђв”Ђ */}
              <div className="mb-2">
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РђСѓС‚СЃРѕСЂСЃ</span>
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
                    <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° Р°СѓС‚СЃРѕСЂСЃРµСЂСѓ (в‚Ѕ)</label>
                    <input className={inputCls} type="number" min={0} value={numberInputValue(ownerEditAsvcDraft.outsourceAmount)}
                      onChange={e => setOwnerEditAsvcDraft(p => ({ ...p, outsourceAmount: numberFromInput(e.target.value) }))} />
                  </div>
                )}
              </div>

              {!ownerEditAsvcDraft.isOutsource && (
              <>
              {/* в”Ђв”Ђ РњР°СЃС‚РµСЂР° в”Ђв”Ђ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-medium ${sub} uppercase tracking-wider`}>РќР°Р·РЅР°С‡РёС‚СЊ РјР°СЃС‚РµСЂРѕРІ</label>
                  {ownerEditAsvcWorkers.length > 0 && (
                    <span className={`text-xs ${sub}`}>Р’С‹Р±СЂР°РЅРѕ: {ownerEditAsvcWorkers.length}</span>
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
                            {assigned ? 'Р’С‹Р±СЂР°РЅ' : 'Р’С‹Р±СЂР°С‚СЊ'}
                          </button>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-indigo-600 text-white' : glass}`}>в‚Ѕ</button>
                            <button onClick={() => setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                              className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-indigo-600 text-white' : glass}`}>%</button>
                            {assigned.payType === 'fixed' ? (
                              <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                onChange={e => { const r = e.target.value; if (r === '') { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerEditAsvcWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                className={`flex-1 ${inputCls} py-1.5`} placeholder="СЃСѓРјРјР°" />
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
                  <AlertCircle size={14} strokeWidth={1.75} />{ownerEditAsvcError}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={() => setOwnerEditAsvcId(null)} className={`flex-1 py-3 rounded-2xl text-sm font-medium ${glass}`}>РћС‚РјРµРЅР°</button>
                <button onClick={() => void handleSaveOwnerEditAsvc()} disabled={ownerEditAsvcSaving} className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 min-h-[44px]" style={{ background: primary }}>
                  {ownerEditAsvcSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ OWNER NEW BOOKING MODAL в”Ђв”Ђ */}
      <AnimatePresence>
        {showOwnerNewBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) closeOwnerNewBookingModal(); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl w-full max-w-sm relative flex flex-col`}>
              <div className="sticky top-0 z-10 p-4 border-b flex justify-between items-center" style={{ background: surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                <h3 className="font-semibold mt-2">РќРѕРІР°СЏ Р·Р°РїРёСЃСЊ</h3>
                <button onClick={closeOwnerNewBookingModal} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
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
                          <Check size={28} strokeWidth={1.75} style={{ color: primary }} />
                        </motion.div>
                        <div className="font-semibold">Р—Р°РїРёСЃСЊ СЃРѕС…СЂР°РЅРµРЅР°!</div>
                        <div className={`text-sm ${sub} mt-1`}>{ownerNewBookingSaveSuccess === 'notify' ? 'РњР°СЃС‚РµСЂР° СѓРІРµРґРѕРјР»РµРЅС‹' : OWNER_BOOKING_STATUS_OPTIONS.find((o) => o.value === ownerNewBookingForm.status)?.label || ownerNewBookingForm.status}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="p-4 space-y-3">
                {[
                  { label: 'РљР»РёРµРЅС‚ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)', key: 'clientName', placeholder: 'Р’РІРµРґРёС‚Рµ РёРјСЏ РєР»РёРµРЅС‚Р°', type: 'text' },
                  { label: 'РўРµР»РµС„РѕРЅ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)', key: 'clientPhone', placeholder: '+7 (___) ___-__-__', type: 'tel' },
                  { label: 'РђРІС‚РѕРјРѕР±РёР»СЊ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)', key: 'car', placeholder: 'Lada Vesta', type: 'text' },
                  { label: 'РќРѕРјРµСЂ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)', key: 'plate', placeholder: 'Р°123РІСЃ777', type: 'text' },
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
                            >{t === 'russian' ? 'РђРІС‚Рѕ' : t === 'motorcycle' ? 'РњРѕС‚Рѕ' : 'РРЅРѕ'}</button>
                          ))}
                        </div>
                        <input className={`${inputCls} flex-1 ${ownerNewBookingErrors[f.key as keyof typeof ownerNewBookingErrors] ? 'border-red-400' : ''}`} type={f.type}
                          placeholder={ownerNewBookingForm.plateType === 'motorcycle' ? '1234Р°РІ77' : ownerNewBookingForm.plateType === 'foreign' ? 'xyz1234' : 'Р°123РІСЃ777'}
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
                    <label className={`text-xs ${sub} block mb-1`}>РђРІС‚Рѕ РєР»РёРµРЅС‚Р°</label>
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
                            {[vehicle.car, vehicle.plate].filter(Boolean).join(' В· ') || 'РђРІС‚Рѕ'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЈСЃР»СѓРіР°</label>
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
                    onCreateNew={handleCreateServiceFromQuery}
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
                    <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label>
                    <input className={inputCls} type="number" value={numberInputValue(ownerNewBookingForm.price)} onChange={e => setOwnerNewBookingForm(p => ({ ...p, price: numberFromInput(e.target.value) }))} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚. (РјРёРЅ)</label>
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
                  Р”Р»СЏ Р±Р°Р·С‹ РєР»РёРµРЅС‚РѕРІ РјРѕР¶РЅРѕ РІС‹Р±СЂР°С‚СЊ СЃС‚Р°С‚СѓСЃ "РџСЂРѕС€Р»Р°СЏ Р·Р°РІРµСЂС€С‘РЅРЅР°СЏ": С‚Р°РєР°СЏ Р·Р°РїРёСЃСЊ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РІ РёСЃС‚РѕСЂРёРё Рё Р±СѓРґРµС‚ РІРёРґРЅР° РєР»РёРµРЅС‚Сѓ РїРѕСЃР»Рµ РїРµСЂРІРѕРіРѕ РІС…РѕРґР° РїРѕ СЌС‚РѕРјСѓ С‚РµР»РµС„РѕРЅСѓ.
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎС‚Р°С‚СѓСЃ Р·Р°РїРёСЃРё</label>
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
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р° (РјРѕР¶РЅРѕ РІС‹Р±СЂР°С‚СЊ РїСЂРѕС€Р»СѓСЋ)</label>
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
                  <label className={`text-xs ${sub} block mb-1`}>Р’СЂРµРјСЏ (РІС‹РїР°РґР°СЋС‰РёР№ СЃРїРёСЃРѕРє)</label>
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
                    <div className={`${inputCls} ${sub}`}>РџРѕРјРµС‰РµРЅРёРµ РјРѕР¶РЅРѕ РІС‹Р±СЂР°С‚СЊ РїРѕР·Р¶Рµ, РєРѕРіРґР° Р±СѓРґРµС‚ СЃРѕРіР»Р°СЃРѕРІР°РЅРѕ РІСЂРµРјСЏ</div>
                  </div>
                )}
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РђСѓС‚СЃРѕСЂСЃ</span>
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
                    <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° Р°СѓС‚СЃРѕСЂСЃРµСЂСѓ (в‚Ѕ)</label>
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
                    <label className={`text-xs ${sub} block`}>РќР°Р·РЅР°С‡РёС‚СЊ РјР°СЃС‚РµСЂРѕРІ</label>
                    <span className={`text-xs ${sub}`}>{_isFixed ? `Р¤РёРєСЃ ${formatFixedMasterAmount()}` : ownerNewBookingWorkers.some(w => w.payType === 'fixed') ? `Р’С‹Р±СЂР°РЅРѕ: ${ownerNewBookingWorkers.length}` : `РЎСѓРјРјР°: ${totalOwnerNewBookingPercent}%`}</span>
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
                              {assigned ? 'Р’С‹Р±СЂР°РЅ' : 'Р’С‹Р±СЂР°С‚СЊ'}
                            </button>
                          </div>
                          {assigned && (
                            <div className="flex items-center gap-2 mt-2">
                              {_isFixed ? (
                                <span className={`text-xs font-medium ${sub}`}>{formatFixedMasterAmount()}</span>
                              ) : (
                                <>
                                  <button onClick={() => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'fixed', fixedAmount: 0 } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'fixed' ? 'bg-indigo-600 text-white' : glass}`}>в‚Ѕ</button>
                                  <button onClick={() => setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, payType: 'percent', fixedAmount: undefined } : item))}
                                    className={`text-xs px-2 py-1 rounded ${assigned.payType === 'percent' ? 'bg-indigo-600 text-white' : glass}`}>%</button>
                                  {assigned.payType === 'fixed' ? (
                                    <input type="number" min={0} value={assigned.fixedAmount ?? ''}
                                      onChange={e => { const r = e.target.value; if (r === '') { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: undefined } : item)); return; } const n = parseInt(r); if (!isNaN(n)) { setOwnerNewBookingWorkers(current => current.map(item => item.id === worker.id ? { ...item, fixedAmount: Math.max(0, n) } : item)); } }}
                                      className={`flex-1 ${inputCls} py-1.5`} placeholder="СЃСѓРјРјР°" />
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
                    <label className={`text-xs ${sub} block`}>РњР°С‚РµСЂРёР°Р»С‹</label>
                    <button onClick={() => { setOwnerMaterialPickerCategory(null); setShowOwnerMaterialPicker(true); }}
                      className="px-3 py-1 rounded-lg text-xs transition-all shrink-0"
                      style={{ background: `${primary}15`, color: primary }}>+ Р’С‹Р±СЂР°С‚СЊ РјР°С‚РµСЂРёР°Р»</button>
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
                            <div className={`text-xs ${sub}`}>{safeQty} {mat.unit} Г— {mat.unitPrice.toLocaleString('ru')} в‚Ѕ = {(safeQty * mat.unitPrice).toLocaleString('ru')} в‚Ѕ</div>
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
                              className="p-1 rounded text-red-500"><X size={14} strokeWidth={1.75} /></button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  {ownerNewBookingMaterials.length === 0 && (
                    <div className={`text-xs ${sub} mb-2`}>РњР°С‚РµСЂРёР°Р»С‹ РЅРµ РІС‹Р±СЂР°РЅС‹</div>
                  )}
                </div>
                {/* Material picker modal */}
                <AnimatePresence>
                  {showOwnerMaterialPicker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50"
                      onClick={() => setShowOwnerMaterialPicker(false)}>
                      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl w-full max-w-sm max-h-[60vh] flex flex-col`}>
                        <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">Р’С‹Р±СЂР°С‚СЊ РјР°С‚РµСЂРёР°Р»</h3>
                            <button onClick={() => setShowOwnerMaterialPicker(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setOwnerMaterialPickerCategory(null)}
                              className={`text-xs px-2.5 py-1 rounded-full ${!ownerMaterialPickerCategory ? 'text-white font-medium' : glass}`}
                              style={!ownerMaterialPickerCategory ? { background: primary } : {}}>Р’СЃРµ</button>
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
                              const catIds = stockCategoryIdsWithDescendants(ownerMaterialPickerCategory, stockCategories);
                              return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerMaterialPickerCategory)?.name;
                            })
                            .filter(item => item.qty > 0)
                            .map(item => (
                              <div key={item.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium">{item.name}</div>
                                  <div className={`text-xs ${sub}`}>Р’ РЅР°Р»РёС‡РёРё: {item.qty} {item.unit} В· {item.unitPrice.toLocaleString('ru')} в‚Ѕ/{item.unit}</div>
                                </div>
                                <button onClick={() => {
                                  if (!ownerNewBookingMaterials.find(m => m.stockItemId === item.id)) {
                                    setOwnerNewBookingMaterials(current => [...current, { stockItemId: item.id, name: item.name, qty: '', unit: item.unit, unitPrice: item.unitPrice }]);
                                  }
                                  setShowOwnerMaterialPicker(false);
                                }}
                                  className="px-3 py-1.5 rounded-lg text-xs shrink-0 text-white"
                                  style={{ background: primary }}>Р’С‹Р±СЂР°С‚СЊ</button>
                              </div>
                            ))}
                          {stockItems.filter(item => {
                            if (!ownerMaterialPickerCategory) return true;
                            const catIds = stockCategoryIdsWithDescendants(ownerMaterialPickerCategory, stockCategories);
                            return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === ownerMaterialPickerCategory)?.name;
                          }).filter(item => item.qty > 0).length === 0 && (
                            <div className={`text-sm ${sub} text-center py-6`}>РќРµС‚ РјР°С‚РµСЂРёР°Р»РѕРІ РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё</div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!ownerNewBookingForm.isOutsource && !isFixedMasterService(services, ownerNewBookingForm.service, services.find(s => s.id === ownerNewBookingForm.service)?.name) && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100 && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} strokeWidth={1.75} />РЎСѓРјРјР° РїСЂРѕС†РµРЅС‚РѕРІ РјР°СЃС‚РµСЂРѕРІ РїСЂРµРІС‹С€Р°РµС‚ 100%</div>
                )}
                {ownerNewBookingErrors.general && (
                  <div className="flex items-center gap-2 text-red-500 text-xs"><AlertCircle size={14} strokeWidth={1.75} />{ownerNewBookingErrors.general}</div>
                )}
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label>
                  <input className={inputCls} placeholder="Р”РѕРї. РёРЅС„РѕСЂРјР°С†РёСЏ..." value={ownerNewBookingForm.notes} onChange={e => setOwnerNewBookingForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°Рє СѓР·РЅР°Р» Рѕ РЅР°СЃ</label>
                  <select className={selectCls} value={ownerNewBookingForm.referralSource} onChange={e => setOwnerNewBookingForm(p => ({ ...p, referralSource: e.target.value }))}>
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РџРѕРІС‚РѕСЂРЅС‹Р№ РІРёР·РёС‚</span>
                  <input
                    type="checkbox"
                    checked={ownerNewBookingForm.isRepeatVisit}
                    onChange={(event) => setOwnerNewBookingForm((current) => ({ ...current, isRepeatVisit: event.target.checked }))}
                  />
                </label>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎРїРѕСЃРѕР± РѕРїР»Р°С‚С‹</label>
                  <select className={selectCls} value={ownerNewBookingForm.paymentType} onChange={e => setOwnerNewBookingForm(p => ({ ...p, paymentType: e.target.value as 'cash' | 'transfer' | 'invoice' }))}>
                    <option value="cash">РќР°Р»РёС‡РЅС‹Рµ</option>
                    <option value="transfer">РџРµСЂРµРІРѕРґ</option>
                    <option value="invoice">РџРѕ СЃС‡С‘С‚Сѓ</option>
                  </select>
                </div>
                <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                  <span>РћРїР»Р°С‡РµРЅРѕ</span>
                  <input
                    type="checkbox"
                    checked={ownerNewBookingForm.paymentSettled}
                    onChange={(event) => setOwnerNewBookingForm((current) => ({ ...current, paymentSettled: event.target.checked }))}
                  />
                </label>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { void handleSaveOwnerNewBooking(true); }} disabled={!ownerNewBookingForm.serviceId || (!ownerNewBookingForm.isOutsource && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100) || ownerNewBookingSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-50 min-h-[44px] min-w-[44px]" style={{ background: primary }}>
                  {ownerNewBookingSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎРѕС…СЂР°РЅРёС‚СЊ Рё СѓРІРµРґРѕРјРёС‚СЊ'}
                </button>
                <button onClick={() => { void handleSaveOwnerNewBooking(false); }} disabled={!ownerNewBookingForm.serviceId || (!ownerNewBookingForm.isOutsource && ownerNewBookingWorkers.some(w => w.payType !== 'fixed') && totalOwnerNewBookingPercent > 100) || ownerNewBookingSaving} className={`w-full py-3 rounded-2xl font-medium ${glass} disabled:opacity-50 min-h-[44px] min-w-[44px]`}>
                  РЎРѕС…СЂР°РЅРёС‚СЊ Р±РµР· СѓРІРµРґРѕРјР»РµРЅРёСЏ
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
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col`}>
              <div className="p-4 border-b shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">РќР°Р№РґРµРЅРЅС‹Рµ РєР»РёРµРЅС‚С‹</h3>
                  <button onClick={() => setShowOwnerClientSearch(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className={`text-xs ${sub}`}>
                  {(() => {
                    const q = ownerNewBookingForm.clientName.trim().toLowerCase();
                    const matches = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : [];
                    return matches.length > 0 ? `РќР°Р№РґРµРЅРѕ ${matches.length} РєР»РёРµРЅС‚${matches.length === 1 ? '' : 'РѕРІ'}` : 'Р’РІРµРґРёС‚Рµ РёРјСЏ РґР»СЏ РїРѕРёСЃРєР°';
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
                              <div key={vehicleIndex}>{[vehicle.car, vehicle.plate].filter(Boolean).join(' вЂў ') || 'РђРІС‚Рѕ'}</div>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </button>
                  )) : (
                    <div className={`text-sm ${sub} text-center py-8`}>
                      {q ? 'РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ' : 'РќР°С‡РЅРёС‚Рµ РІРІРѕРґРёС‚СЊ РёРјСЏ РєР»РёРµРЅС‚Р°'}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ EXPORT TOAST в”Ђв”Ђ */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={16} strokeWidth={1.75} style={{ color: accent }} /></div>
              <div>
                <div className="text-sm font-medium">{exportSuccess.title}</div>
                <div className={`text-xs ${sub}`}>{exportSuccess.subtitle}</div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ EDIT EXPENSE MODAL (task 5.3) в”Ђв”Ђ */}
      <AnimatePresence>
        {editingExpense && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЂР°СЃС…РѕРґ</h3>
                <button onClick={() => setEditingExpense(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РќР°Р·РІР°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РќР°Р·РІР°РЅРёРµ СЂР°СЃС…РѕРґР°..." value={editExpenseForm.title} onChange={e => setEditExpenseForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° (в‚Ѕ)</label>
                  <input className={inputCls} type="number" placeholder="0" value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ</label>
                  <select className={selectCls} value={editExpenseForm.category} onChange={e => setEditExpenseForm(p => ({ ...p, category: e.target.value }))}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р° (Р”Р”.РњРњ.Р“Р“Р“Р“)</label>
                  <input className={inputCls} type="date" value={toISODate(editExpenseForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setEditExpenseForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {editExpenseForm.date && !/^\d{2}\.\d{2}\.\d{4}$/.test(editExpenseForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ..." value={editExpenseForm.note} onChange={e => setEditExpenseForm(p => ({ ...p, note: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ СѓСЃР»СѓРіРё</label>
                  <select className={selectCls} value={editExpenseForm.resourceGroup} onChange={e => setEditExpenseForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">РћР±С‰РµРµ</option>
                    <option value="wash">РђРІС‚РѕРјРѕР№РєР°</option>
                    <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                  </select>
                  {editExpenseForm.resourceGroup && (
                    <p className="text-[11px] mt-1.5" style={{ color: accent }}>РЎРїРёСЃР°РЅРёРµ РёР· РєРѕРїРёР»РєРё {editExpenseForm.resourceGroup === 'wash' ? 'рџљ— РњРѕР№РєР°' : 'вњЁ Р”РµС‚РµР№Р»РёРЅРі'}</p>
                  )}
                </div>
              </div>
              {editFinanceError && (
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: '#FF6B6B' }}>
                  <AlertCircle size={13} strokeWidth={1.75} />
                  {editFinanceError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingExpense(null)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}
                >
                  РћС‚РјРµРЅР°
                </button>
                <button
                  onClick={() => { void handleSaveExpense(); }}
                  disabled={editFinanceLoading}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#FF6B6B' }}
                >
                  {editFinanceLoading ? (
                    <><RefreshCw size={14} strokeWidth={1.75} className="animate-spin" /> РЎРѕС…СЂР°РЅРµРЅРёРµ...</>
                  ) : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ EDIT INCOME MODAL (task 6.3) в”Ђв”Ђ */}
      <AnimatePresence>
        {editingIncome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto`}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ РґРѕС…РѕРґ</h3>
                <button onClick={() => setEditingIncome(null)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° (в‚Ѕ)</label>
                  <input className={inputCls} type="number" placeholder="0" value={editIncomeForm.amount} onChange={e => setEditIncomeForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РСЃС‚РѕС‡РЅРёРє / РѕРїРёСЃР°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РђСЂРµРЅРґР°, РїСЂРѕРґР°Р¶Р° С‚РѕРІР°СЂР°..." value={editIncomeForm.source} onChange={e => setEditIncomeForm(p => ({ ...p, source: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>Р”Р°С‚Р° (Р”Р”.РњРњ.Р“Р“Р“Р“)</label>
                  <input className={inputCls} type="date" value={toISODate(editIncomeForm.date)} onChange={e => {
                    const val = parseFlexibleDate(e.target.value);
                    setEditIncomeForm(p => ({ ...p, date: val ? formatDate(val) : e.target.value }));
                  }} />
                  {editIncomeForm.date && !/^\d{2}\.\d{2}\.\d{4}$/.test(editIncomeForm.date) && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>Р’РІРµРґРёС‚Рµ РґР°С‚Сѓ РІ С„РѕСЂРјР°С‚Рµ Р”Р”.РњРњ.Р“Р“Р“Р“</p>
                  )}
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РџСЂРёРјРµС‡Р°РЅРёРµ</label>
                  <input className={inputCls} placeholder="РќРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ..." value={editIncomeForm.note} onChange={e => setEditIncomeForm(p => ({ ...p, note: e.target.value }))} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-1`}>РљР°С‚РµРіРѕСЂРёСЏ СѓСЃР»СѓРіРё</label>
                  <select className={selectCls} value={editIncomeForm.resourceGroup} onChange={e => setEditIncomeForm(p => ({ ...p, resourceGroup: e.target.value as '' | 'wash' | 'detailing' }))}>
                    <option value="">РћР±С‰РµРµ</option>
                    <option value="wash">РђРІС‚РѕРјРѕР№РєР°</option>
                    <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                  </select>
                </div>
              </div>
              {editFinanceError && (
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: '#FF6B6B' }}>
                  <AlertCircle size={13} strokeWidth={1.75} />
                  {editFinanceError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingIncome(null)}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}
                >
                  РћС‚РјРµРЅР°
                </button>
                <button
                  onClick={() => { void handleSaveIncome(); }}
                  disabled={editFinanceLoading}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: primary }}
                >
                  {editFinanceLoading ? (
                    <><RefreshCw size={14} strokeWidth={1.75} className="animate-spin" /> РЎРѕС…СЂР°РЅРµРЅРёРµ...</>
                  ) : 'РЎРѕС…СЂР°РЅРёС‚СЊ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ MODAL: SERVICE SETTINGS в”Ђв”Ђ */}
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
                className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto`}
              >
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">РќР°СЃС‚СЂРѕР№РєР° СѓСЃР»СѓРіРё</h3>
                  <button onClick={() => setShowServiceSettings(false)} className={`p-1.5 rounded-lg ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <Search size={14} strokeWidth={1.75} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input className={`${inputCls} pl-9`} type="text" placeholder="РџРѕРёСЃРє СѓСЃР»СѓРі..." value={serviceEditSearchQuery} onChange={e => { setServiceEditSearchQuery(e.target.value); setShowServiceMaterialPicker(false); }} />
                  </div>
                  {(() => {
                    const q = serviceEditSearchQuery.trim().toLowerCase();
                    const matches = q
                      ? services.filter(s => [s.name, s.category, s.desc].some(v => v.toLowerCase().includes(q)))
                      : [];
                    if (!q) return null;
                    return (
                      <div className={`${isDark ? 'bg-[#1C1C1F] border border-white/10' : 'bg-white border border-black/5 shadow-sm'} mt-1 rounded-2xl max-h-48 overflow-y-auto`}>
                        {matches.length === 0 ? (
                          <div className={`px-4 py-3 text-sm ${sub}`}>РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ</div>
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
                      <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Р’С‹Р±РѕСЂ РјР°С‚РµСЂРёР°Р»Р° СЃРѕ СЃРєР»Р°РґР°</div>
                      <div className="overflow-x-auto pb-1 flex gap-1.5 mb-2">
                        <button onClick={() => setServiceMaterialPickerCategory(null)}
                          className={`text-xs px-2.5 py-1 rounded-full ${!serviceMaterialPickerCategory ? 'text-white font-medium' : glass}`}
                          style={!serviceMaterialPickerCategory ? { background: primary } : {}}>Р’СЃРµ</button>
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
                            const catIds = stockCategoryIdsWithDescendants(serviceMaterialPickerCategory, stockCategories);
                            return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === serviceMaterialPickerCategory)?.name;
                          })
                          .filter(item => item.qty > 0)
                          .map(item => (
                            <div key={item.id} className={`${glass} rounded-xl p-3 flex items-center justify-between gap-3`}>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium">{item.name}</div>
                                <div className={`text-xs ${sub}`}>Р’ РЅР°Р»РёС‡РёРё: {item.qty} {item.unit} В· {item.unitPrice.toLocaleString('ru')} в‚Ѕ/{item.unit}</div>
                              </div>
                              <button onClick={() => {
                                if (!(svc.materials ?? []).some(m => m.stockItemId === item.id)) {
                                  applyMaterials([...(svc.materials ?? []), { stockItemId: item.id, name: item.name, qty: 0, unit: item.unit }]);
                                }
                                setShowServiceMaterialPicker(false);
                              }}
                                className="px-3 py-1.5 rounded-lg text-xs shrink-0 text-white"
                                style={{ background: primary }}>Р’С‹Р±СЂР°С‚СЊ</button>
                            </div>
                          ))}
                        {stockItems.filter(item => {
                          if (!serviceMaterialPickerCategory) return true;
                          const catIds = stockCategoryIdsWithDescendants(serviceMaterialPickerCategory, stockCategories);
                          return item.categoryId ? catIds.includes(item.categoryId) : item.category === stockCategories.find(c => c.id === serviceMaterialPickerCategory)?.name;
                        }).filter(item => item.qty > 0).length === 0 && (
                          <div className={`text-sm ${sub} text-center py-6`}>РќРµС‚ РјР°С‚РµСЂРёР°Р»РѕРІ РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё</div>
                        )}
                      </div>
                      <button onClick={() => setShowServiceMaterialPicker(false)} className={`mt-3 w-full py-2.5 rounded-xl text-sm ${glass}`}>РќР°Р·Р°Рґ Рє РЅР°СЃС‚СЂРѕР№РєР°Рј</button>
                    </div>
                  ) : (
                  <>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>РћСЃРЅРѕРІРЅРѕРµ</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РќР°Р·РІР°РЅРёРµ</label>
                        <input className={inputCls} value={svc.name} onChange={e => patch({ name: e.target.value })} />
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РўРёРї СѓСЃР»СѓРіРё</label>
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
                          <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.price)} onChange={e => patch({ price: numberFromInput(e.target.value) })} />
                        </div>
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.duration)} onChange={e => patch({ duration: numberFromInput(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РћРїРёСЃР°РЅРёРµ</label>
                        <input className={inputCls} value={svc.desc} onChange={e => patch({ desc: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ РґРµРЅРµРі</div>
                    <div className="space-y-2">
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РњР°С‚РµСЂРёР°Р»С‹ СЃРѕ СЃРєР»Р°РґР° (СЃРїРёСЃС‹РІР°СЋС‚СЃСЏ РїСЂРё Р·Р°РІРµСЂС€РµРЅРёРё Р·Р°РїРёСЃРё)</label>
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
                                      {stockItem ? `Р’ РЅР°Р»РёС‡РёРё: ${stockItem.qty} ${stockItem.unit} В· ${stockItem.unitPrice.toLocaleString('ru')} в‚Ѕ/${stockItem.unit}` : 'РџРѕР·РёС†РёСЏ СѓРґР°Р»РµРЅР° СЃРѕ СЃРєР»Р°РґР°'}
                                    </div>
                                    {insufficient && <div className="text-xs text-red-500">РќР° СЃРєР»Р°РґРµ С‚РѕР»СЊРєРѕ {stockItem!.qty} {stockItem!.unit}</div>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input className={`${isDark ? 'bg-white/[.07] border-transparent text-[#E4E4E7] focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/25 focus:bg-white/[.09]' : 'bg-black/[.05] border-transparent text-[#131316] focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20'} border rounded-lg px-1.5 py-1 w-14 text-right text-sm outline-none shrink-0`} type="number" min="0" step="0.1" value={numberInputValue(mat.qty)} onChange={e => patchMaterialQty(mi, e.target.value ? Number(e.target.value) : 0)} />
                                    <span className={`text-xs ${sub} shrink-0`}>{mat.unit}</span>
                                    <button onClick={() => removeMaterial(mi)} className="p-1 text-red-500 shrink-0"><X size={14} strokeWidth={1.75} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button onClick={() => setShowServiceMaterialPicker(true)} className={`w-full py-2 rounded-xl text-sm ${glass} flex items-center justify-center gap-1.5`} style={{ color: primary }}>
                          <Plus size={14} strokeWidth={1.75} /> Р”РѕР±Р°РІРёС‚СЊ РјР°С‚РµСЂРёР°Р»
                        </button>
                        {svcMaterialsCost > 0 && (
                          <div className={`text-xs mt-1.5 flex justify-between ${sub}`}>
                            <span>РЎС‚РѕРёРјРѕСЃС‚СЊ РјР°С‚РµСЂРёР°Р»РѕРІ (РїРѕ С†РµРЅР°Рј СЃРєР»Р°РґР°)</span>
                            <span className="font-medium text-slate-400">{Math.round(svcMaterialsCost).toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РћРїР»Р°С‚Р° РјР°СЃС‚РµСЂСѓ</label>
                        <select className={selectCls} value={svc.masterPayType || ''} onChange={e => patch({ masterPayType: e.target.value })}>
                          <option value="">% РёР· РїСЂРѕС„РёР»СЏ (РєР°Рє СЃРµР№С‡Р°СЃ)</option>
                          <option value="percent">% РѕС‚ С†РµРЅС‹ (РѕР±С‰Р°СЏ, РґРµР»РёС‚СЃСЏ РјРµР¶РґСѓ РјР°СЃС‚РµСЂР°РјРё)</option>
                          <option value="fixed">Р¤РёРєСЃРёСЂРѕРІР°РЅРЅР°СЏ СЃСѓРјРјР° (РѕР±С‰Р°СЏ)</option>
                        </select>
                      </div>
                      {svc.masterPayType === 'fixed' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РЎСѓРјРјР° РјР°СЃС‚РµСЂСѓ (в‚Ѕ)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.masterPayValue ?? 0)} onChange={e => patch({ masterPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      {svc.masterPayType === 'percent' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>РџСЂРѕС†РµРЅС‚ РјР°СЃС‚РµСЂСѓ (%)</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.masterPayValue ?? 0)} onChange={e => patch({ masterPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>Р’ РєРѕРїРёР»РєСѓ</label>
                        <select className={selectCls} value={svc.piggyPayType || ''} onChange={e => patch({ piggyPayType: e.target.value })}>
                          <option value="">РЎС‚Р°РЅРґР°СЂС‚ (24%)</option>
                          <option value="percent">% РѕС‚ С†РµРЅС‹</option>
                          <option value="fixed">Р¤РёРєСЃРёСЂРѕРІР°РЅРЅР°СЏ СЃСѓРјРјР°</option>
                          <option value="rest">Р’РµСЃСЊ РѕСЃС‚Р°С‚РѕРє</option>
                          <option value="none">РќРµС‚</option>
                        </select>
                      </div>
                      {svc.piggyPayType && svc.piggyPayType !== 'none' && svc.piggyPayType !== 'rest' && svc.piggyPayType !== '' && (
                        <div>
                          <label className={`text-xs ${sub} block mb-1`}>Р—РЅР°С‡РµРЅРёРµ ({svc.piggyPayType === 'fixed' ? 'в‚Ѕ' : '%'})</label>
                          <input className={inputCls} type="number" value={numberInputValue(svc.piggyPayValue ?? 0)} onChange={e => patch({ piggyPayValue: numberFromInput(e.target.value) })} />
                        </div>
                      )}
                      <div>
                        <label className={`text-xs ${sub} block mb-1`}>РљСѓРґР° РїР°РґР°РµС‚ РґРµРїРѕР·РёС‚</label>
                        <select className={selectCls} value={svc.piggyTarget || ''} onChange={e => patch({ piggyTarget: e.target.value })}>
                          <option value="">РђРІС‚Рѕ (РїРѕ С‚РёРїСѓ СѓСЃР»СѓРіРё)</option>
                          <option value="wash">РњРѕР№РєР°</option>
                          <option value="detailing">Р”РµС‚РµР№Р»РёРЅРі</option>
                          <option value="general">РћР±С‰Р°СЏ</option>
                        </select>
                      </div>
                      <div className={`${glass} rounded-2xl p-3 space-y-2`}>
                        <label className="flex items-center justify-between gap-3 text-sm">
                          <span>Р’Р»Р°РґРµР»СЊС†С‹ РїРѕР»СѓС‡Р°СЋС‚ РѕСЃС‚Р°С‚РѕРє</span>
                          <input
                            type="checkbox"
                            checked={svc.ownerSplitEnabled !== false}
                            onChange={e => patch({ ownerSplitEnabled: e.target.checked })}
                          />
                        </label>
                        {svc.ownerSplitEnabled !== false && (
                          <div>
                            <label className={`text-xs ${sub} block mb-1`}>Р”РѕР»СЏ РІР»Р°РґРµР»СЊС†РµРІ</label>
                            <select className={selectCls} value={svc.ownerPayType || ''} onChange={e => patch({ ownerPayType: e.target.value })}>
                              <option value="">Р’РµСЃСЊ РѕСЃС‚Р°С‚РѕРє (50/50)</option>
                              <option value="percent">РџСЂРѕС†РµРЅС‚ РѕС‚ РѕСЃС‚Р°С‚РєР°</option>
                            </select>
                          </div>
                        )}
                        {svc.ownerSplitEnabled !== false && svc.ownerPayType === 'percent' && (
                          <div>
                            <label className={`text-xs ${sub} block mb-1`}>РџСЂРѕС†РµРЅС‚ РІР»Р°РґРµР»СЊС†Р°Рј (%)</label>
                            <input className={inputCls} type="number" value={numberInputValue(svc.ownerPayValue ?? 0)} onChange={e => patch({ ownerPayValue: numberFromInput(e.target.value) })} />
                          </div>
                        )}
                      </div>
                      <label className={`${glass} rounded-2xl px-3 py-3 text-sm flex items-center justify-between gap-3`}>
                        <span>Р¤РёРєСЃ РѕРїР»Р°С‚Р° РјР°СЃС‚РµСЂСѓ ({formatFixedMasterAmount()})</span>
                        <input
                          type="checkbox"
                          checked={Boolean(svc.isFixedMaster)}
                          onChange={(event) => patch({ isFixedMaster: event.target.checked })}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>РџРѕСЂСЏРґРѕРє СЂР°СЃС‡С‘С‚Р°</div>
                    <div className={`${glass} rounded-2xl p-3 space-y-1`}>
                      {(() => {
                        const pipelineActive = effectiveOrder.join(',') !== ORDER_STEPS.map(o => o.id).join(',');
                        return pipelineActive ? (
                          <div className="text-[11px] font-medium px-2 py-1 rounded-lg mb-1 bg-emerald-500/10 text-emerald-600">
                            вњ“ РљРѕРЅРІРµР№РµСЂ: % СЃС‡РёС‚Р°СЋС‚СЃСЏ РѕС‚ С‚РµРєСѓС‰РµРіРѕ РѕСЃС‚Р°С‚РєР° РїРѕ С€Р°РіР°Рј
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium px-2 py-1 rounded-lg mb-1 bg-amber-500/10 text-amber-600">
                            РљР»Р°СЃСЃРёС‡РµСЃРєРёР№ СЂРµР¶РёРј: % РѕС‚ РїРѕР»РЅРѕР№ Р±Р°Р·С‹ (РјР°С‚РµСЂРёР°Р»С‹ в†’ РјР°СЃС‚РµСЂР° в†’ РєРѕРїРёР»РєР° в†’ РІР»Р°РґРµР»СЊС†С‹). РџРµСЂРµСЃС‚Р°РІСЊС‚Рµ С€Р°РіРё вЂ” РІРєР»СЋС‡РёС‚СЃСЏ РєРѕРЅРІРµР№РµСЂ.
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
                            <button onClick={() => move(-1)} disabled={si === 0} className={`p-1 rounded-lg disabled:opacity-30 ${glass}`}><ChevronUp size={14} strokeWidth={1.75} /></button>
                            <button onClick={() => move(1)} disabled={si === effectiveOrder.length - 1} className={`p-1 rounded-lg disabled:opacity-30 ${glass}`}><ChevronDown size={14} strokeWidth={1.75} /></button>
                            <span className="flex-1 text-sm">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className={`text-xs ${sub} mt-1.5`}>% Рё 24% СЃС‡РёС‚Р°СЋС‚СЃСЏ РѕС‚ С‚РµРєСѓС‰РµРіРѕ РѕСЃС‚Р°С‚РєР° РІ СЌС‚РѕРј РїРѕСЂСЏРґРєРµ. Р’Р»Р°РґРµР»СЊС†С‹ Р·Р°Р±РёСЂР°СЋС‚ РІРµСЃСЊ РѕСЃС‚Р°С‚РѕРє, РµСЃР»Рё СЃС‚РѕСЏС‚ РїРѕСЃР»РµРґРЅРёРјРё (РёРЅР°С‡Рµ 50%).</p>
                  </div>

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: primary }}>РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РїСЂРё С†РµРЅРµ {samplePrice.toLocaleString('ru')} в‚Ѕ</div>
                    <div className={`${glass} rounded-2xl p-3 space-y-2`}>
                      <div className="h-2.5 rounded-full overflow-hidden flex">
                        {preview.materials > 0 && <div style={{ width: `${(preview.materials / total) * 100}%`, background: '#64748B' }} />}
                        {preview.master > 0 && <div style={{ width: `${(preview.master / total) * 100}%`, background: accent }} />}
                        {preview.piggy > 0 && <div style={{ width: `${(preview.piggy / total) * 100}%`, background: '#EAB308' }} />}
                        {preview.owners > 0 && <div style={{ width: `${(preview.owners / total) * 100}%`, background: primary }} />}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className={sub}>Р¦РµРЅР°</span>
                          <span>{samplePrice.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                        {preview.materials > 0 && (
                          <div className="flex justify-between">
                            <span className={sub}>РњР°С‚РµСЂРёР°Р»С‹</span>
                            <span className="text-slate-400">в€’ {preview.materials.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className={sub}>РњР°СЃС‚РµСЂР° ({preview.masterLabel})</span>
                          <span style={{ color: accent }}>{preview.master.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={sub}>РљРѕРїРёР»РєР° ({preview.piggyLabel})</span>
                          <span style={{ color: '#EAB308' }}>{preview.piggy.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                        {preview.owners > 0 ? (
                          <>
                            {(() => {
                              const ownerHalf = Math.round(preview.owners / 2);
                              const ownerFirst = preview.owners - ownerHalf;
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className={sub}>РњР°РєСЃРёРј</span>
                                    <span style={{ color: primary }}>{ownerFirst.toLocaleString('ru')} в‚Ѕ</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={sub}>Р®СЂР°</span>
                                    <span style={{ color: primary }}>{ownerHalf.toLocaleString('ru')} в‚Ѕ</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className={sub}>Р’Р»Р°РґРµР»СЊС†С‹ ({preview.ownersLabel})</span>
                                    <span style={{ color: primary }}>{preview.owners.toLocaleString('ru')} в‚Ѕ</span>
                                  </div>
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className={sub}>Р’Р»Р°РґРµР»СЊС†С‹ ({preview.ownersLabel})</span>
                            <span style={{ color: primary }}>{preview.owners.toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                        )}
                        <div className="border-t pt-1 flex justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                          <span className={sub}>РС‚РѕРіРѕ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ</span>
                          <span className="font-medium">{distributed.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                        {distributed < samplePrice - 1 && (
                          <div className="flex justify-between text-xs">
                            <span className={sub}>РќРµ СЂР°СЃРїСЂРµРґРµР»РµРЅРѕ</span>
                            <span className="font-medium text-red-500">{(samplePrice - distributed).toLocaleString('ru')} в‚Ѕ</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs ${sub} mt-2`}>
                      РџРѕСЂСЏРґРѕРє: СЃРЅР°С‡Р°Р»Р° РјР°С‚РµСЂРёР°Р»С‹, РїРѕС‚РѕРј РјР°СЃС‚РµСЂР°, РєРѕРїРёР»РєР°, РѕСЃС‚Р°С‚РѕРє вЂ” РІР»Р°РґРµР»СЊС†Р°Рј. Р•СЃР»Рё РјР°СЃС‚РµСЂРѕРІ РЅРµСЃРєРѕР»СЊРєРѕ, СЃСѓРјРјР° РјР°СЃС‚РµСЂР° РґРµР»РёС‚СЃСЏ РїСЂРѕРїРѕСЂС†РёРѕРЅР°Р»СЊРЅРѕ РёС… % РёР· РїСЂРѕС„РёР»СЏ.
                    </p>
                  </div>
                  </>
                  )}
                </div>
                <button onClick={() => void handleServiceSettingsDone()} disabled={serviceSettingsSaving} className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-60" style={{ background: primary }}>
                  {serviceSettingsSaving ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'Р“РѕС‚РѕРІРѕ'}
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* в”Ђв”Ђ MODAL: SALARY BOOKING DETAIL в”Ђв”Ђ */}
      <AnimatePresence>
        {salaryBookingDetail && (() => {
          const b = salaryBookingDetail;
          const svc = b.serviceId ? services.find(s => s.id === b.serviceId) : undefined;
          const paymentLabel = b.paymentType === 'cash' ? 'РќР°Р»РёС‡РЅС‹Рµ' : b.paymentType === 'transfer' ? 'РџРµСЂРµРІРѕРґ' : b.paymentType === 'invoice' ? 'РџРѕ СЃС‡С‘С‚Сѓ' : b.paymentType || 'РќРµ СѓРєР°Р·Р°РЅ';
          const segmentLabel = b.resourceGroup === 'wash' ? 'РњРѕР№РєР°' : 'Р”РµС‚РµР№Р»РёРЅРі';
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/50" onClick={() => setSalaryBookingDetail(null)} />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className={`fixed bottom-0 left-0 right-0 z-[80] ${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl max-h-[92vh] overflow-y-auto`}
              >
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2 mb-1" />
                <div className="flex justify-between items-center px-5 py-3 sticky top-0" style={{ background: surface }}>
                  <h3 className="font-semibold">Р”РµС‚Р°Р»Рё СѓСЃР»СѓРіРё</h3>
                  <button onClick={() => setSalaryBookingDetail(null)} className={`p-1.5 rounded-xl ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="px-5 pb-6 space-y-3">
                  {/* Service */}
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>РЈСЃР»СѓРіР°</div>
                    <div className="font-semibold">{b.service}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.resourceGroup === 'wash' ? 'bg-cyan-500/15 text-cyan-600' : 'bg-purple-500/15 text-purple-600'}`}>{segmentLabel}</span>
                      {svc?.duration ? <span className={`text-[10px] px-2 py-0.5 rounded-full ${glass}`}>вЏ± {svc.duration} РјРёРЅ</span> : null}
                    </div>
                    {svc?.desc && <div className={`text-xs ${sub} mt-2`}>{svc.desc}</div>}
                  </div>

                  {/* Client */}
                  {(b.clientName || b.clientPhone) && (
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub} mb-1`}>РљР»РёРµРЅС‚</div>
                      <div className="font-semibold">{b.clientName || 'вЂ”'}</div>
                      {b.clientPhone && (
                        <a href={`tel:${b.clientPhone}`} className={`text-sm flex items-center gap-1 mt-0.5`} style={{ color: primary }}>
                          <Phone size={11} strokeWidth={1.75} />{b.clientPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Car */}
                  {(b.car || b.plate) && (
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub} mb-1`}>РђРІС‚РѕРјРѕР±РёР»СЊ</div>
                      <div className="font-semibold">{b.car || 'вЂ”'}</div>
                      {b.plate && <div className={`text-sm ${sub}`}>Р“РѕСЃ. РЅРѕРјРµСЂ: {b.plate}</div>}
                    </div>
                  )}

                  {/* Date & time */}
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Р”Р°С‚Р° Рё РІСЂРµРјСЏ</div>
                    <div className="font-semibold">{b.date} В· {b.time}</div>
                    {b.box && <div className={`text-sm ${sub}`}>Р‘РѕРєСЃ: {b.box}</div>}
                  </div>

                  {/* Payment */}
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>РћРїР»Р°С‚Р°</div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg" style={{ color: accent }}>{b.price.toLocaleString('ru')} в‚Ѕ</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.paymentSettled ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'}`}>
                        {b.paymentSettled ? 'РћРїР»Р°С‡РµРЅРѕ' : 'РќРµ РѕРїР»Р°С‡РµРЅРѕ'}
                      </span>
                    </div>
                    {b.paymentType && <div className={`text-sm ${sub} mt-1`}>РЎРїРѕСЃРѕР±: {paymentLabel}</div>}
                  </div>

                  {/* Worker earnings */}
                  <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                    <div className={`text-xs ${sub} mb-1`}>Р—Р°СЂР°Р±РѕС‚РѕРє РјР°СЃС‚РµСЂР°</div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-lg" style={{ color: primary }}>{b.earned.toLocaleString('ru')} в‚Ѕ</div>
                      <div className={`text-xs ${sub}`}>
                        {b.payType === 'fixed'
                          ? `С„РёРєСЃ ${b.earned.toLocaleString('ru')} в‚Ѕ`
                          : `${b.percent}%${b.overrideEarned != null ? ' (РІСЂСѓС‡РЅСѓСЋ)' : ''}`}
                      </div>
                    </div>
                  </div>

                  {/* Additional services */}
                  {(b.additionalServices?.length || 0) > 0 && (
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub} mb-1`}>Р”РѕРї. СѓСЃР»СѓРіРё</div>
                      {b.additionalServices!.map((asvc, i) => (
                        <div key={i} className="flex justify-between text-sm py-0.5">
                          <span className="truncate pr-2">{asvc.name}</span>
                          <span className="shrink-0">{asvc.priceMode === 'subtract' ? 'в€’' : '+'}{asvc.price.toLocaleString('ru')} в‚Ѕ</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {b.notes && (
                    <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                      <div className={`text-xs ${sub} mb-1`}>РљРѕРјРјРµРЅС‚Р°СЂРёР№</div>
                      <div className="text-sm">{b.notes}</div>
                    </div>
                  )}

                  {/* Quick edit shortcut */}
                  {svc && (
                    <button
                      onClick={() => { setSalaryBookingDetail(null); handleOpenServiceQuickEdit(svc, b.id); }}
                      className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{ background: `${primary}18`, color: primary }}
                    >
                      <Edit3 size={15} strokeWidth={1.75} /> РР·РјРµРЅРёС‚СЊ СѓСЃР»СѓРіСѓ
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* в”Ђв”Ђ MODAL: QUICK SERVICE EDIT в”Ђв”Ђ */}
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
                className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-t-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto`}
              >
                <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ СѓСЃР»СѓРіРё</h3>
                  <button onClick={() => setServiceEditDraft(null)} className={`p-1.5 rounded-xl ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РќР°Р·РІР°РЅРёРµ</label>
                    <input className={inputCls} value={serviceEditDraft.name} onChange={e => patchDraft({ name: e.target.value })} />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РўРёРї СѓСЃР»СѓРіРё</label>
                    <select className={selectCls} value={serviceEditDraft.category} onChange={e => patchDraft({ category: e.target.value })}>
                      {SERVICE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Р¦РµРЅР° (в‚Ѕ)</label>
                      <input className={inputCls} type="number" value={numberInputValue(serviceEditDraft.price)} onChange={e => patchDraft({ price: numberFromInput(e.target.value) })} />
                    </div>
                    <div>
                      <label className={`text-xs ${sub} block mb-1`}>Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)</label>
                      <input className={inputCls} type="number" value={numberInputValue(serviceEditDraft.duration)} onChange={e => patchDraft({ duration: numberFromInput(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1`}>РћРїРёСЃР°РЅРёРµ</label>
                    <input className={inputCls} value={serviceEditDraft.desc} onChange={e => patchDraft({ desc: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setServiceEditDraft(null)} className={`flex-1 py-3 rounded-2xl font-semibold text-sm ${glass}`}>РћС‚РјРµРЅР°</button>
                  <button onClick={() => void handleSaveServiceQuickEdit()} className="flex-[2] py-3 rounded-2xl font-semibold text-sm text-white" style={{ background: primary }}>РЎРѕС…СЂР°РЅРёС‚СЊ</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* в”Ђв”Ђ BOTTOM TOAST в”Ђв”Ђ */}
      <AnimatePresence>
        {bottomToast && (
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${accent}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}20` }}><Check size={14} strokeWidth={1.75} style={{ color: accent }} /></div>
            <div className="flex-1 text-sm">{bottomToast}</div>
            <button onClick={() => setBottomToast(null)}><X size={14} strokeWidth={1.75} className={sub} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ SETTINGS SAVED TOAST в”Ђв”Ђ */}
      <AnimatePresence>
        {settingsSaved && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-4 right-4 z-[100] flex items-center gap-3 p-3 rounded-2xl shadow-lg"
            style={{ background: surface, border: `1px solid ${primary}40` }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${primary}20` }}><Check size={14} strokeWidth={1.75} style={{ color: primary }} /></div>
            <span className="text-sm font-medium">РќР°СЃС‚СЂРѕР№РєРё СЃРѕС…СЂР°РЅРµРЅС‹</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* в”Ђв”Ђ RESET PASSWORD MODAL в”Ђв”Ђ */}
      <AnimatePresence>
        {resetPasswordTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setResetPasswordTarget(null); setResetPasswordError(''); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-5">
              <div className={`${isDark ? 'bg-[#1C1C1F]' : 'bg-white'} rounded-3xl p-6 w-full max-w-sm shadow-2xl`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                      <Shield size={18} strokeWidth={1.75} style={{ color: accent }} />
                    </div>
                    <div>
                      <div className="font-semibold">РЎР±СЂРѕСЃ РїР°СЂРѕР»СЏ</div>
                      <div className={`text-xs ${sub}`}>{resetPasswordTarget.name}</div>
                    </div>
                  </div>
                  <button onClick={() => { setResetPasswordTarget(null); setResetPasswordError(''); }}
                    className={`p-1.5 rounded-xl ${glass}`}><X size={16} strokeWidth={1.75} /></button>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ</label>
                    <input
                      className={`${isDark ? 'bg-white/5 border-white/10 text-[#E4E4E7] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#131316] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                      type="text"
                      placeholder="РњРёРЅРёРјСѓРј 8 СЃРёРјРІРѕР»РѕРІ"
                      value={resetPasswordValue}
                      onChange={e => { setResetPasswordValue(e.target.value); setResetPasswordError(''); }}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ</label>
                    <input
                      className={`${isDark ? 'bg-white/5 border-white/10 text-[#E4E4E7] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#131316] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                      type="text"
                      placeholder="РџРѕРІС‚РѕСЂРёС‚Рµ РїР°СЂРѕР»СЊ"
                      value={resetPasswordConfirm}
                      onChange={e => { setResetPasswordConfirm(e.target.value); setResetPasswordError(''); }}
                    />
                  </div>
                </div>

                {resetPasswordError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-xs mb-3">
                    <AlertCircle size={13} strokeWidth={1.75} />{resetPasswordError}
                  </motion.div>
                )}

                <button
                  onClick={() => void handleResetPassword()}
                  disabled={!resetPasswordValue || !resetPasswordConfirm || employeeActionLoading?.type === 'reset-password'}
                  className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: accent }}
                >
                  {employeeActionLoading?.type === 'reset-password' ? 'РЎРѕС…СЂР°РЅРµРЅРёРµ...' : 'РЎР±СЂРѕСЃРёС‚СЊ РїР°СЂРѕР»СЊ'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toaster />
    </div>
  );
}




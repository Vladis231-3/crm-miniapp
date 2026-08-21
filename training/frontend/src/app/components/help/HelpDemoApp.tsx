import React, { Component, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, GraduationCap } from 'lucide-react';
import { AppContext, type AppContextType, type Role } from '../../context/AppContext';
import { ClientApp } from '../client/ClientApp';
import { AdminApp } from '../admin/AdminApp';
import { WorkerApp } from '../worker/WorkerApp';
import { OwnerApp } from '../owner/OwnerApp';
import { TrainingAssistant } from '../shared/TrainingAssistant/TrainingAssistant';
import {
  helpBookings,
  helpClients,
  helpWorkers,
  helpServices,
  helpBoxes,
  helpSchedule,
  helpStockItems,
  helpStockCategories,
  helpExpenses,
  helpIncomes,
  helpPenalties,
  helpNotifications,
  helpSettings,
  helpContent,
  HELP_STUB_TODAY,
} from '../../mocks/trainingStubs';

type HelpRole = 'client' | 'admin' | 'worker' | 'owner';

function toastStub(): Promise<never> {
  return Promise.reject(new Error('Демо-режим: данные — заглушки, сохранение отключено. Регистрация не требуется.'));
}

function useHelpMockContext(helpRole: HelpRole, isDark: boolean, toggleTheme: () => void): AppContextType {
  const noop = () => Promise.resolve() as any;
  const reject = toastStub;
  // Минимальный мок, покрывающий все поля AppContextType
  return {
    loading: false,
    authLoading: false,
    error: null,
    session: { role: helpRole as Role, actorId: helpRole === 'client' ? 'c1' : helpRole === 'admin' ? 'admin-1' : helpRole === 'worker' ? 'w1' : 'owner-1', sessionId: 'help-session', login: helpRole, displayName: `Демо ${helpRole}` },
    activeSessions: [],
    isDark,
    toggleTheme,
    logout: () => { window.location.href = window.location.pathname; },
    clientProfile: { name: 'Гость (демо)', phone: '+7 (900) 000-00-00', car: 'Toyota Camry', plate: 'A123BC 16', vehicles: [{ car: 'Toyota Camry', plate: 'A123BC 16', isMain: true }], registered: true },
    staffProfile: helpWorkers.find(w => w.id === (helpRole === 'admin' ? 'admin-1' : helpRole === 'worker' ? 'w1' : 'owner-1')) || helpWorkers[0],
    clients: helpClients as any,
    bookings: helpBookings as any,
    notifications: helpNotifications as any,
    stockItems: helpStockItems as any,
    stockCategories: helpStockCategories as any,
    expenses: helpExpenses as any,
    incomes: helpIncomes as any,
    penalties: helpPenalties as any,
    workers: helpWorkers as any,
    services: helpServices as any,
    boxes: helpBoxes as any,
    schedule: helpSchedule as any,
    settings: helpSettings as any,
    // @ts-ignore mock content not in context type directly but available via settings
    content: helpContent as any,
    upcomingDates: [HELP_STUB_TODAY, '16.08.2026', '17.08.2026', '18.08.2026', '19.08.2026', '20.08.2026', '21.08.2026', '22.08.2026', '23.08.2026', '24.08.2026'],
    todayLabel: HELP_STUB_TODAY,
    tomorrowLabel: '16.08.2026',
    getTimeSlotsForDate: () => ['09:00', '09:30', '10:00', '11:30', '14:00'],
    getBookingAvailabilityForDate: async () => [{ time: '10:00', available: true, freeBoxes: 2, occupiedBoxes: 0 } as any],
    loginClient: reject,
    linkStaff: reject,
    switchRole: async () => {},
    updateClientProfile: reject,
    addClient: reject,
    updateClientCard: reject,
    deleteClient: reject,
    listDepositClients: async () => [],
    getDepositOverview: reject,
    updateDepositSubscription: reject,
    depositTopUp: reject,
    depositAdjust: reject,
    depositRecordWash: reject,
    depositSettleMonth: reject,
    downloadDepositExport: reject,
    downloadDepositExportAll: reject,
    sendDepositExport: reject,
    sendDepositExportAll: reject,
    addBooking: reject,
    updateBooking: reject,
    deleteBooking: reject,
    addBookingService: reject,
    addBookingAdditionalService: reject,
    updateBookingAdditionalService: reject,
    removeBookingAdditionalService: reject,
    addNotification: async () => {},
    markNotificationRead: async () => {},
    markAllNotificationsRead: async () => {},
    addStockItem: reject,
    updateStockItem: reject,
    writeOffStock: reject,
    deleteStockItem: reject,
    getWriteOffHistory: async () => [],
    addStockCategory: reject,
    updateStockCategory: reject,
    deleteStockCategory: reject,
    addExpense: reject,
    addIncome: reject,
    updateExpense: reject,
    updateIncome: reject,
    addPenalty: reject,
    revokePenalty: reject,
    revokeAllPenalties: reject,
    createTelegramLinkCode: reject,
    downloadOwnerExport: reject,
    sendOwnerExportToTelegram: reject,
    sendOwnerSummaryReport: reject,
    dispatchOwnerReminders: reject,
    remindAdminAboutInactiveClients: reject,
    saveServices: reject,
    saveBoxes: reject,
    saveSchedule: reject,
    saveAdminProfile: reject,
    saveAdminNotificationSettings: reject,
    saveWorkerProfile: reject,
    saveWorkerNotificationSettings: reject,
    saveOwnerCompany: reject,
    saveOwnerNotificationSettings: reject,
    saveOwnerIntegrations: reject,
    saveOwnerSecurity: reject,
    saveWorkerSettings: reject,
    saveAdminWorkerPayroll: reject,
    saveContent: reject,
    createPayrollEntry: reject,
    listShiftChecklists: async () => [],
    submitShiftChecklist: reject,
    listAdminShiftInspections: async () => [],
    submitAdminShiftInspection: reject,
    openShiftForMasters: reject,
    hireWorker: reject,
    fireWorker: reject,
    resetWorkerPassword: reject,
    changePassword: reject,
    requestOwnerDatabaseReset: reject,
    approveOwnerDatabaseReset: reject,
    executeOwnerDatabaseReset: reject,
    refreshBootstrap: async () => {},
    refreshActiveSessions: async () => {},
    checkConsent: async () => true,
    submitConsent: async () => {},
  } as unknown as AppContextType;
}

class HelpErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 24, fontFamily: 'monospace', background: '#1a1a2e', color: '#ff6b6b', minHeight: '40vh' }}>
        <h3 style={{ color: '#ff6b6b' }}>Ошибка демо-роли</h3>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error.message}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, padding: '8px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8 }}>Попробовать снова</button>
      </div>;
    }
    return this.props.children;
  }
}

export function isHelpMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('help') || params.has('training') || params.get('demo') === '1') return true;
    if (window.location.pathname === '/help' || window.location.pathname.endsWith('/help')) return true;
    if (window.location.href.includes('help=1') || window.location.href.includes('help')) return true;
  } catch {}
  return false;
}

export function HelpDemoApp() {
  const [helpRole, setHelpRole] = useState<HelpRole>('client');
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(v => !v);
  // Муся может переключать роль из тура
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const d = (e as CustomEvent).detail as { app?: string };
      if (d?.app && ['client', 'admin', 'worker', 'owner'].includes(d.app)) {
        setHelpRole(d.app as HelpRole);
      }
    };
    const onSwitch = (e: Event) => {
      const d = (e as CustomEvent).detail as { role?: string };
      if (d?.role && ['client', 'admin', 'worker', 'owner'].includes(d.role)) {
        setHelpRole(d.role as HelpRole);
      }
    };
    window.addEventListener('training:navigate', onNavigate as EventListener);
    window.addEventListener('training:switch-help-role', onSwitch as EventListener);
    return () => {
      window.removeEventListener('training:navigate', onNavigate as EventListener);
      window.removeEventListener('training:switch-help-role', onSwitch as EventListener);
    };
  }, []);
  const ctx = useHelpMockContext(helpRole, isDark, toggleTheme);

  const roles: { id: HelpRole; label: string; icon: string; desc: string }[] = [
    { id: 'client', label: 'Клиент', icon: '🚗', desc: 'Каталог и записи' },
    { id: 'admin', label: 'Админ', icon: '📋', desc: 'Расписание' },
    { id: 'worker', label: 'Мастер', icon: '🔧', desc: 'Смена' },
    { id: 'owner', label: 'Владелец', icon: '👑', desc: 'Финансы' },
  ];

  return (
    <AppContext.Provider value={ctx}>
      <div className={`${isDark ? 'dark' : ''}`}>
        {/* Бейдж демо-режима */}
        <div className={`sticky top-0 z-20 flex items-center justify-between px-3 py-2 text-xs border-b ${isDark ? 'bg-[#1C1C1F] border-white/10 text-[#E4E4E7]' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <div className="flex items-center gap-2">
            <Shield size={14} className="opacity-70" />
            <span className="font-semibold">ДЕМО без БД</span>
            <span className="opacity-70 hidden sm:inline">— только фронт и заглушки, реальные данные недоступны</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye size={12} className="opacity-60" />
            <span className="text-[11px] opacity-70">/help</span>
            <button onClick={() => { window.location.href = window.location.pathname; }} className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white border border-amber-200 hover:bg-amber-100'}`}>
              Выйти из демо
            </button>
          </div>
        </div>

        {/* Переключатель ролей демо */}
        <div className={`flex gap-1.5 px-3 py-2 overflow-x-auto border-b ${isDark ? 'bg-[#131316] border-white/5' : 'bg-white border-black/5'}`}>
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setHelpRole(r.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${helpRole === r.id ? 'text-white border-transparent shadow' : isDark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-black/10 bg-white hover:bg-gray-50'}`}
              style={helpRole === r.id ? { background: isDark ? '#6E76F2' : '#4F46E5' } : {}}
            >
              <span>{r.icon}</span> {r.label}
            </button>
          ))}
          <span className={`ml-auto text-[10px] px-2 py-1 rounded-full self-center ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
            Заглушки • без регистрации
          </span>
        </div>

        <div className="relative">
          <HelpErrorBoundary>
            {helpRole === 'client' && <ClientApp />}
            {helpRole === 'admin' && <AdminApp />}
            {helpRole === 'worker' && <WorkerApp />}
            {helpRole === 'owner' && <OwnerApp />}
          </HelpErrorBoundary>
          <TrainingAssistant />
        </div>

        <div className={`px-4 py-3 text-center text-[11px] border-t ${isDark ? 'bg-[#131316] border-white/5 text-white/40' : 'bg-gray-50 border-black/5 text-gray-500'}`}>
          <GraduationCap size={12} className="inline mr-1" />
          Демо-данные: 2 клиента, 3 записи, 2 мастера. Сохранение отключено. Для работы с реальными данными — войдите через Telegram.
        </div>
      </div>
    </AppContext.Provider>
  );
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        colorScheme?: 'light' | 'dark';
        themeParams?: Record<string, string>;
        ready?: () => void;
        expand?: () => void;
        showAlert?: (message: string, callback?: () => void) => void;
        onEvent?: (event: string, callback: () => void) => void;
        offEvent?: (event: string, callback: () => void) => void;
        MainButton?: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          enable: () => void;
          disable: () => void;
          showProgress: () => void;
          hideProgress: () => void;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
        };
        BackButton?: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          isVisible: boolean;
        };
      };
    };
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
};

function getInitData(): string {
  return window.Telegram?.WebApp?.initData || import.meta.env.VITE_MOCK_INIT_DATA || '';
}

async function getErrorDetail(response: Response) {
  let detail = `Ошибка сервера (${response.status})`;
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string') {
      detail = payload.detail;
    } else if (Array.isArray(payload?.detail)) {
      const messages = payload.detail.map((err: { loc?: string[]; msg?: string }) => {
        const field = err.loc ? err.loc.filter((p) => p !== 'body').join(' → ') : '';
        const msg = err.msg || 'неверное значение';
        return field ? `${field}: ${msg}` : msg;
      });
      detail = messages.join('\n');
    }
  } catch {
  }
  return detail;
}

function getDownloadFileName(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }
  return fallback;
}

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

function isHelpMode(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has('help') || params.has('training') || params.get('demo') === '1') return true;
    if (window.location.pathname === '/help' || window.location.pathname.endsWith('/help')) return true;
    if (window.location.href.includes('help=1') || window.location.href.includes('?help') || window.location.href.includes('&help')) return true;
  } catch {
    return false;
  }
  return false;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // /help — фронт без БД: никаких запросов к бэку, только заглушки
  if (isHelpMode()) {
    if (path.startsWith('/api/auth/session') || path.startsWith('/api/auth/client') || path.startsWith('/api/auth/staff')) {
      throw new Error('Демо-режим (/help) — авторизация отключена, используются заглушки');
    }
    // Универсальная заглушка: и массив (для .map) и объект (для .owners/.balance)
    const stub: any = [];
    stub.balance = 0;
    stub.transactions = [];
    stub.bookings = [];
    stub.owners = [];
    stub.workers = [];
    stub.incomes = [];
    stub.expenses = [];
    stub.archives = [];
    stub.piggyTransactions = [];
    stub.payroll = [];
    stub.clients = [];
    stub.services = [];
    stub.boxes = [];
    stub.penalties = [];
    stub.notifications = [];
    stub.stockItems = [];
    stub.stockCategories = [];
    stub.boxes = [];
    stub.schedule = [];
    stub.entries = [];
    stub.payouts = [];
    stub.workers = [];
    stub.owners = [];
    stub.incomes = [];
    stub.expenses = [];
    stub.piggyTransactions = [];
    stub.archives = [];
    // Специфичные поля
    if (path.includes('salary-detail')) {
      stub.workerId = 'w1';
      stub.workerName = 'Иван';
      stub.salaryBase = 0;
      stub.salaryPerShift = 0;
      stub.bookings = [];
      stub.payouts = [];
      stub.entries = [];
      stub.totalAccrued = 0;
      stub.totalPaid = 0;
      stub.balanceToPay = 0;
      stub.completedBookingsCount = 0;
      stub.shiftCount = 0;
    }
    if (path.includes('piggy-bank')) {
      // Полная заглушка чтобы не падать на toLocaleString / map
      stub.balance = 12345;
      stub.transactions = [];
      stub.piggyTransactions = [];
      stub.remainingInPiggyBank = 8000;
      stub.combinedBalance = 12345;
      stub.masterDailyOutputs = 0;
      stub.washExpenses = 0;
      stub.washIncomes = 0;
      stub.detailingExpenses = 0;
      stub.detailingIncomes = 0;
      stub.wash = {
        selfServiceRevenue: 10000,
        selfServiceMaster: 1000,
        selfServicePiggy: 9000,
        classicRevenue: 40000,
        classicMaster: 12000,
        classicPiggy: 28000,
        totalRevenue: 50000,
        totalMaster: 13000,
        totalPiggy: 37000,
        washNetPiggy: 37000,
      };
      stub.detailing = {
        detailingRevenue: 30000,
        detailingMaster: 9000,
        deposits24Percent: 7200,
        materialWithdrawals: 2000,
        materialRepayments: 500,
        netPiggy: 5700,
        detailingExpenses: 0,
        detailingIncomes: 0,
      };
      return stub as unknown as T;
    }
    if (path.includes('wallet')) {
      stub.weekStart = '15.08.2026';
      stub.weekEnd = '22.08.2026';
      stub.revenue = 0;
      stub.totalIncome = 0;
      stub.totalExpense = 0;
      stub.profit = 0;
      stub.bookingCount = 0;
      stub.incomes = [];
      stub.expenses = [];
      stub.piggyBankBalance = 0;
      stub.archives = [];
      return stub as unknown as T;
    }
    if (path.includes('archive')) {
      stub.dateFrom = '01.08.2026';
      stub.dateTo = '15.08.2026';
      stub.summary = { revenue: 0, net: 0, totalIncome: 0, totalExpense: 0, profit: 0, masterTotal: 0, piggyDeposit: 0, ownersAccrued: 0, ownersPaid: 0, bookingCount: 0, incomeCount: 0, expenseCount: 0, piggyTxCount: 0 };
      stub.bookings = [];
      stub.incomes = [];
      stub.expenses = [];
      stub.piggyTransactions = [];
      stub.payroll = [];
      stub.owners = [];
      return stub as unknown as T;
    }
    if (path.includes('bookings-history')) {
      stub.workers = [];
      stub.owners = [];
      stub.piggy = [];
      // для totals
      if (path.includes('/totals')) {
        return { workers: [], owners: [], piggy: [] } as unknown as T;
      }
      return [] as unknown as T;
    }
    if (path.includes('/payroll') || path.includes('/workers')) return [] as unknown as T;
    if (path.includes('/stock') || path.includes('/shift') || path.includes('/content') || path.includes('/notifications') || path.includes('/calendar') || path.includes('/cars')) return [] as unknown as T;
    // Для остальных — вернуть универсальную заглушку (и массив и объект)
    if (path.includes('/api/')) return stub as unknown as T;
  }

  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const initData = getInitData();
  if (initData) {
    headers.Authorization = initData;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'Сессия устарела: закройте миниапп и откройте его заново, затем повторите действие. ' +
          'Если вы долго не пользовались — это нормально.'
      );
    }
    throw new Error(await getErrorDetail(response));
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, fallbackFileName: string): Promise<string> {
  if (isHelpMode()) throw new Error('Демо-режим (/help) — выгрузка отключена');
  const headers: Record<string, string> = {};
  const initData = getInitData();
  if (initData) {
    headers.Authorization = initData;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  const fileName = getDownloadFileName(response, fallbackFileName);
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  return fileName;
}

export async function apiUploadFile(file: File): Promise<{ url: string }> {
  if (isHelpMode()) throw new Error('Демо-режим (/help) — загрузка отключена');
  const initData = getInitData();
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: initData ? { Authorization: initData } : {},
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }
  return response.json();
}

export async function apiBlobUrl(path: string): Promise<string> {
  if (isHelpMode()) throw new Error('Демо-режим (/help) — фото недоступно');
  const headers: Record<string, string> = {};
  const initData = getInitData();
  if (initData) {
    headers.Authorization = initData;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}

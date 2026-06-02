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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    throw new Error(await getErrorDetail(response));
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, fallbackFileName: string): Promise<string> {
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

export async function apiBlobUrl(path: string): Promise<string> {
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

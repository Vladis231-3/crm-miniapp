const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'crm-miniapp-token';

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
        ready?: () => void;
        expand?: () => void;
      };
    };
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  useStoredToken?: boolean;
};

function getAuthHeaders(token: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getErrorDetail(response: Response) {
  let detail = `Request failed with status ${response.status}`;
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string') {
      detail = payload.detail;
    }
  } catch {
    // Response body is optional for failed requests.
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

export const tokenStorage = {
  get() {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData || '';
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    token = null,
    useStoredToken = true,
  } = options;

  const authToken = token ?? (useStoredToken ? tokenStorage.get() : null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(authToken),
  };

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
  const authToken = tokenStorage.get();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: getAuthHeaders(authToken),
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

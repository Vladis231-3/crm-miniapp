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
        version?: string;
        platform?: string;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        isClosingConfirmationEnabled?: boolean;
        isVerticalSwipesEnabled?: boolean;
        ready?: () => void;
        expand?: () => void;
        close?: () => void;
        enableClosingConfirmation?: () => void;
        disableClosingConfirmation?: () => void;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        showAlert?: (message: string, callback?: () => void) => void;
        onEvent?: (event: string, callback: () => void) => void;
        offEvent?: (event: string, callback: () => void) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
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

// Строгий детерминированный ремонт mojibake: строка является UTF-8 байтами,
// ошибочно декодированными как windows-1251/windows-1252/latin-1.
// Без эвристик и маркеров-слов — только строгие encode/decode (зеркало сервера).
const MOJIBAKE_ENCODINGS = ['windows-1251', 'windows-1252', 'iso-8859-1'];

const encodeMapCache = new Map<string, Map<string, number>>();
function getEncodeMap(encoding: string): Map<string, number> {
  const cached = encodeMapCache.get(encoding);
  if (cached) return cached;
  const map = new Map<string, number>();
  try {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const chars = new TextDecoder(encoding).decode(bytes);
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (!map.has(ch)) map.set(ch, i);
    }
  } catch {}
  for (let i = 0; i < 0x80; i++) {
    const ch = String.fromCharCode(i);
    if (!map.has(ch)) map.set(ch, i);
  }
  encodeMapCache.set(encoding, map);
  return map;
}

function encodeWith(str: string, encoding: string): Uint8Array | null {
  const map = getEncodeMap(encoding);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const b = map.get(str[i]);
    if (b === undefined) return null;
    out[i] = b;
  }
  return out;
}

function decodeUtf8Strict(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function cyrCount(s: string): number {
  const m = s.match(/[\u0400-\u04FF]/g);
  return m ? m.length : 0;
}

function repairStep(value: string): string | null {
  const variants = [value];
  // Апостроф при конвертациях искажался: байт 0x92 (’) часто превращался в '/`
  if (value.includes("'") || value.includes('`')) variants.push(value.replace(/['`]/g, '\u2019'));
  const seen = new Set<string>([value]);
  for (const text of variants) {
    for (const encoding of MOJIBAKE_ENCODINGS) {
      const bytes = encodeWith(text, encoding);
      if (!bytes) continue;
      const fixed = decodeUtf8Strict(bytes);
      if (!fixed || fixed === value || seen.has(fixed)) continue;
      // Результат обязан содержать кириллицу или ₽
      if (cyrCount(fixed) === 0 && !fixed.includes('\u20BD')) continue;
      return fixed;
    }
  }
  return null;
}

function repairMojibake(value: string): string {
  if (!value || !/[^\u0000-\u007F]/.test(value)) return value;
  let current = value;
  for (let i = 0; i < 3; i++) {
    const step = repairStep(current);
    if (step === null) break;
    current = step;
  }
  return current;
}

function repairNested<T>(value: T): T {
  if (typeof value === 'string') return repairMojibake(value) as unknown as T;
  if (Array.isArray(value)) return (value as unknown[]).map((v) => repairNested(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = repairNested(v);
    return out as T;
  }
  return value;
}

async function getErrorDetail(response: Response) {
  let detail = `Ошибка сервера (${response.status})`;
  try {
    const payload = repairNested(await response.json());
    if (typeof payload?.detail === 'string') {
      detail = repairMojibake(payload.detail);
    } else if (Array.isArray(payload?.detail)) {
      const messages = payload.detail.map((err: { loc?: string[]; msg?: string }) => {
        const field = err.loc ? err.loc.filter((p) => p !== 'body').join('  ->  ') : '';
        const msg = repairMojibake(err.msg || 'неверное значение');
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

/**
 * iPhone + Telegram Mini App: фиксация вьюпорта и отключение свайпа-закрытия.
 * - `ready()` + `expand()` — раскрывает на всю высоту
 * - `disableVerticalSwipes()` (Bot API 7.7+) — отключает свайп вниз для закрытия (именно из-за него на iPhone
 *   при скролле нижней панели или pull-to-top приложение "хочет закрыться").
 * - fallback `enableClosingConfirmation()` — показывает диалог "Закрыть?" вместо мгновенного закрытия.
 * - `setHeaderColor`/`setBackgroundColor` синхронизируют тему Telegram с приложением.
 * Вызывать один раз при монтировании App (в useEffect). Безопасно вне Telegram — no-op.
 */
export function setupTelegramWebApp() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  try {
    tg.ready?.();
  } catch {}
  try {
    tg.expand?.();
  } catch {}

  // Отключаем вертикальный свайп закрытия (iPhone). Если API недоступен — включаем подтверждение закрытия.
  try {
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    } else if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }
  } catch {}

  // Синхронизация цветов шапки с темой (не критично, но приятно на iPhone)
  try {
    const isDark = tg.colorScheme === 'dark';
    tg.setHeaderColor?.(isDark ? '#131316' : '#f7f7f8');
    tg.setBackgroundColor?.(isDark ? '#131316' : '#f7f7f8');
  } catch {}
}

export function isInsideTelegram(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
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
    if (response.status === 401) {
      throw new Error(
        'Сессия устарела: закройте миниапп и откройте его заново, затем повторите действие. ' +
          'Если вы долго не пользовались  -  это нормально.'
      );
    }
    throw new Error(await getErrorDetail(response));
  }

  const raw = (await response.json()) as T;
  return repairNested(raw) as T;
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

export async function apiUploadFile(file: File): Promise<{ url: string }> {
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
  const uploaded = repairNested((await response.json()) as { url: string });
  return uploaded;
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

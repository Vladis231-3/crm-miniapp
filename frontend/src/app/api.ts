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

// Клиентский ремонт mojibake вида "Р'С‹СЂСѓС‡РєР°" (utf-8 -> windows-1251) и "ÐŸÑ€Ð¸Ð²ÐµÑ‚" (utf-8 -> latin1)
let win1251EncodeMap: Map<string, number> | null = null;
function getWin1251EncodeMap(): Map<string, number> {
  if (win1251EncodeMap) return win1251EncodeMap;
  win1251EncodeMap = new Map();
  // Построим обратную таблицу windows-1251: байт -> unicode, затем инвертируем
  const bytes = new Uint8Array(128);
  for (let i = 0; i < 128; i++) bytes[i] = 0x80 + i;
  try {
    const dec = new TextDecoder('windows-1251');
    const chars = dec.decode(bytes);
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const b = 0x80 + i;
      if (!win1251EncodeMap!.has(ch)) win1251EncodeMap!.set(ch, b);
    }
  } catch {}
  // ASCII 0x00-0x7F — прямое соответствие
  for (let i = 0; i < 0x80; i++) win1251EncodeMap!.set(String.fromCharCode(i), i);
  return win1251EncodeMap!;
}

function encodeWin1251(str: string): Uint8Array | null {
  const map = getWin1251EncodeMap();
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const b = map.get(ch);
    if (b === undefined) return null;
    out[i] = b;
  }
  return out;
}

function repairMojibake(value: string): string {
  if (!value) return value;
  const markers = ['Ð', 'Ñ', 'вЂ', 'в€', 'â€', 'Ã', 'Â', 'Р’', 'С‹', 'СЂ', 'Сѓ', 'С‡', 'Рє', 'Р°', 'СЃ', 'С‚', 'в‚', 'Ѕ'];
  const hasMarker = markers.some((m) => value.includes(m));
  const has1251Mojibake = value.includes('Р') || value.includes('С') || value.includes('в‚');
  if (!hasMarker && !has1251Mojibake) return value;

  // 1) latin1 -> utf-8 (для "ÐŸÑ€Ð¸Ð²ÐµÑ‚")
  if (value.includes('Ð') || value.includes('Ñ') || value.includes('Ã') || value.includes('Â')) {
    try {
      const bytes = Uint8Array.from([...value], (c) => c.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded !== value && !markers.some((m) => decoded.includes(m))) {
        if (decoded.includes('Выручка') || decoded.includes('сегодня') || decoded.includes('₽') || decoded.includes('Привет') || decoded.includes('Запись')) return decoded;
        const cyr = (s: string) => [...s].filter((c) => c >= '\u0400' && c <= '\u04FF').length;
        if (cyr(decoded) > cyr(value) + 2) return decoded;
        return decoded;
      }
    } catch {}
  }

  // 2) windows-1251 -> utf-8 (для "Р'С‹СЂСѓС‡РєР°" -> "Выручка", "в‚Ѕ" -> "₽")
  try {
    const bytes = encodeWin1251(value);
    if (bytes) {
      const asUtf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (asUtf8 !== value) {
        if (asUtf8.includes('Выручка') || asUtf8.includes('сегодня') || asUtf8.includes('₽') || asUtf8.includes('Привет') || asUtf8.includes('АТМОСФЕРА')) return asUtf8;
        const cyr = (s: string) => [...s].filter((c) => c >= '\u0400' && c <= '\u04FF').length;
        if (cyr(asUtf8) > cyr(value) + 2) return asUtf8;
        if (!markers.some((m) => asUtf8.includes(m))) return asUtf8;
      }
    }
  } catch {}

  // 3) Гибрид: часть latin1, часть utf-8 (для "ÐŸ... •")
  if (hasMarker) {
    try {
      const out = new Uint8Array(value.length * 4);
      let pos = 0;
      const map = getWin1251EncodeMap();
      for (const ch of value) {
        let b = map.get(ch);
        if (b !== undefined) {
          out[pos++] = b;
        } else {
          const code = ch.charCodeAt(0);
          if (code <= 0xff) out[pos++] = code & 0xff;
          else {
            const utf8 = new TextEncoder().encode(ch);
            out.set(utf8, pos);
            pos += utf8.length;
          }
        }
      }
      const sliced = out.slice(0, pos);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(sliced);
      if (decoded.includes('Выручка') || decoded.includes('₽')) return decoded;
    } catch {}
  }

  return value;
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
        const field = err.loc ? err.loc.filter((p) => p !== 'body').join(' → ') : '';
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
          'Если вы долго не пользовались — это нормально.'
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
  return response.json();
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

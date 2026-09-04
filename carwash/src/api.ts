const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Строгий детерминированный ремонт mojibake (зеркало frontend/src/app/api.ts):
// строка является UTF-8 байтами, ошибочно декодированными как windows-1251/windows-1252/latin-1.
// Нужен для старых строк в БД, которые сервер отдаёт уже "испорченными" —
// ASCII-экранирование JSON их не чинит, чинить надо значением.
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

export interface ContentAbout {
  text: string;
  features: string[];
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
  about: ContentAbout;
  services: ContentService[];
  works: ContentWorks[];
}

export async function fetchContent(): Promise<ContentData> {
  if (!API_BASE) {
    return {
      about: { text: '', features: [] },
      services: [],
      works: [],
    };
  }
  const res = await fetch(`${API_BASE}/api/content`);
  if (!res.ok) throw new Error('Failed to load content');
  return repairNested((await res.json()) as ContentData);
}

export type PlateType = 'russian' | 'motorcycle' | 'foreign';

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' -]{0,59}$/;
const REPEATED_LETTERS_PATTERN = /([A-Za-zА-Яа-яЁё])\1{3,}/i;
const VEHICLE_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$/;
const REPEATED_VEHICLE_PATTERN = /([A-Za-zА-Яа-яЁё0-9])\1{3,}/i;
const PLATE_ALLOWED_LETTERS = new Set(["а", "в", "е", "к", "м", "н", "о", "р", "с", "т", "у", "х"]);

const PLATE_LAYOUT_TO_LATIN: Record<string, string> = {
  A: 'а', a: 'а',
  B: 'в', b: 'в',
  C: 'с', c: 'с',
  E: 'е', e: 'е',
  H: 'н', h: 'н',
  K: 'к', k: 'к',
  M: 'м', m: 'м',
  O: 'о', o: 'о',
  P: 'р', p: 'р',
  T: 'т', t: 'т',
  X: 'х', x: 'х',
  Y: 'у', y: 'у',
  А: 'а', а: 'а',
  В: 'в', в: 'в',
  С: 'с', с: 'с',
  Е: 'е', е: 'е',
  Ё: 'е', ё: 'е',
  Н: 'н', н: 'н',
  К: 'к', к: 'к',
  М: 'м', м: 'м',
  О: 'о', о: 'о',
  Р: 'р', р: 'р',
  Т: 'т', т: 'т',
  Х: 'х', х: 'х',
  У: 'у', у: 'у',
};
const PLATE_PATTERN = /^[авекмнорстух]\d{3}[авекмнорстух]{2}\d{2,3}$/;
const MOTORCYCLE_PLATE_PATTERN = /^\d{4}[авекмнорстух]{2}\d{2,3}$/;

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validatePersonName(value: string): string | null {
  const normalized = normalizePersonName(value);
  if (!normalized) return 'Введите ваше имя';
  if (!NAME_PATTERN.test(normalized)) return 'Введите настоящее имя';
  return null;
}

export function validatePhoneValue(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!value.trim()) return 'Введите номер телефона';
  const normalized = digits.length === 10 ? `7${digits}` : digits;
  if (normalized.length !== 11 || !/^[78]\d{10}$/.test(normalized)) return 'Введите реальный номер телефона';
  if (normalized[1] === '0' || normalized[1] === '1') return 'Введите реальный номер телефона';
  if (/^(.)\1+$/.test(normalized)) return 'Введите реальный номер телефона';
  return null;
}

export function normalizeVehicleInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateVehicleName(value: string): string | null {
  const normalized = normalizeVehicleInput(value);
  const lettersOnly = normalized.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
  if (!normalized) return 'Введите автомобиль';
  if (lettersOnly.length < 2) return 'Введите реальный автомобиль';
  if (!VEHICLE_PATTERN.test(normalized)) return 'Введите марку и модель без лишних символов';
  if (/^\d+$/.test(normalized)) return 'Введите марку и модель автомобиля';
  if (REPEATED_VEHICLE_PATTERN.test(normalized)) return 'Введите реальный автомобиль';
  return null;
}

function plateExpectedAtPosition(index: number, plateType: PlateType): 'letter' | 'digit' {
  if (plateType === 'motorcycle') {
    if (index < 4) return 'digit';
    if (index < 6) return 'letter';
    return 'digit';
  }
  if (index === 0 || index === 4 || index === 5) return 'letter';
  return 'digit';
}

export function normalizePlateInput(value: string, plateType: PlateType = 'russian'): string {
  if (plateType === 'foreign') {
    return value.replace(/[^A-Za-z0-9]/g, '').toLowerCase().slice(0, 15);
  }

  let result = '';
  for (const ch of value) {
    if (result.length >= 9) break;
    if (/\s/.test(ch)) continue;

    const expected = plateExpectedAtPosition(result.length, plateType);

    const mapped = PLATE_LAYOUT_TO_LATIN[ch];
    if (mapped !== undefined) {
      if (expected !== 'letter') continue;
      if (!PLATE_ALLOWED_LETTERS.has(mapped)) continue;
      result += mapped;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      if (expected !== 'digit') continue;
      result += ch;
      continue;
    }
  }
  return result;
}

export function validatePlateValue(value: string, plateType: PlateType = 'russian'): string | null {
  if (plateType === 'foreign') {
    const normalized = normalizePlateInput(value, 'foreign');
    if (!normalized) return 'Введите иностранный номер';
    if (normalized.length < 2) return 'Слишком короткий номер (мин. 2 символа)';
    if (normalized.length > 15) return 'Слишком длинный номер (макс. 15 символов)';
    if (!/^[a-z0-9]+$/.test(normalized)) return 'Допустимы только латинские буквы и цифры';
    return null;
  }

  const normalized = normalizePlateInput(value, plateType);
  if (!normalized) return 'Введите госномер';
  if (plateType === 'russian') {
    if (!PLATE_PATTERN.test(normalized)) return 'Введите номер в формате а123вс77 или а123вс777';
  } else if (plateType === 'motorcycle') {
    if (!MOTORCYCLE_PLATE_PATTERN.test(normalized)) return 'Введите номер в формате 1234ав77';
  }
  return null;
}

function hasEmptyVehicles(vehicles?: Array<{ car: string; plate: string }>): boolean {
  if (!vehicles || vehicles.length === 0) return true;
  return vehicles.every((v) => !v.car?.trim() && !v.plate?.trim());
}

export function isClientCardIncomplete(client: {
  phone?: string;
  car?: string;
  plate?: string;
  adminNote?: string;
  adminRating?: number;
  referralSource?: string;
  vehicles?: Array<{ car: string; plate: string }>;
  createdAt?: Date;
}): boolean {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const created = client.createdAt?.getTime() ?? Date.now();
  if (created < weekAgo) return false;

  if (!client.phone?.trim()) return true;
  if (!client.car?.trim()) return true;
  if (!client.plate?.trim()) return true;
  if (!client.adminNote?.trim()) return true;
  if (!client.adminRating || client.adminRating === 0) return true;
  if (!client.referralSource?.trim()) return true;
  if (hasEmptyVehicles(client.vehicles)) return true;

  return false;
}

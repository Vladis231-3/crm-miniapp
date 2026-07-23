export type PlateType = 'russian' | 'motorcycle' | 'foreign';

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' -]{0,59}$/;
const REPEATED_LETTERS_PATTERN = /([A-Za-zА-Яа-яЁё])\1{3,}/i;
const VEHICLE_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$/;
const REPEATED_VEHICLE_PATTERN = /([A-Za-zА-Яа-яЁё0-9])\1{3,}/i;
const PLATE_ALLOWED_LETTERS = new Set(["a", "b", "e", "k", "m", "h", "o", "p", "c", "t", "y", "x"]);

const PLATE_LAYOUT_TO_LATIN: Record<string, string> = {
  A: 'a', a: 'a',
  B: 'b', b: 'b',
  C: 'c', c: 'c',
  E: 'e', e: 'e',
  H: 'h', h: 'h',
  K: 'k', k: 'k',
  M: 'm', m: 'm',
  O: 'o', o: 'o',
  P: 'p', p: 'p',
  T: 't', t: 't',
  X: 'x', x: 'x',
  Y: 'y', y: 'y',
  А: 'a', а: 'a',
  В: 'b', в: 'b',
  С: 'c', с: 'c',
  Е: 'e', е: 'e',
  Ё: 'e', ё: 'e',
  Н: 'h', н: 'h',
  К: 'k', к: 'k',
  М: 'm', м: 'm',
  О: 'o', о: 'o',
  Р: 'p', р: 'p',
  Т: 't', т: 't',
  Х: 'x', х: 'x',
  У: 'y', у: 'y',
};
const PLATE_PATTERN = /^[abekmhopctyx]\d{3}[abekmhopctyx]{2}\d{2,3}$/;
const MOTORCYCLE_PLATE_PATTERN = /^\d{4}[abekmhopctyx]{2}\d{2,3}$/;

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
    if (!PLATE_PATTERN.test(normalized)) return 'Введите номер в формате a123bc77 или a123bc777';
  } else if (plateType === 'motorcycle') {
    if (!MOTORCYCLE_PLATE_PATTERN.test(normalized)) return 'Введите номер в формате 1234ab77';
  }
  return null;
}

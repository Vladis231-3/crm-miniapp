export type PlateType = 'russian' | 'motorcycle' | 'foreign';

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' -]{0,59}$/;
const REPEATED_LETTERS_PATTERN = /([A-Za-zА-Яа-яЁё])\1{3,}/i;
const VEHICLE_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$/;
const REPEATED_VEHICLE_PATTERN = /([A-Za-zА-Яа-яЁё0-9])\1{3,}/i;
const PLATE_ALLOWED_LETTERS = new Set(["A", "B", "E", "K", "M", "H", "O", "P", "C", "T", "Y", "X"]);

const PLATE_LAYOUT_TO_LATIN: Record<string, string> = {
  A: 'A', a: 'A',
  B: 'B', b: 'B',
  C: 'C', c: 'C',
  E: 'E', e: 'E',
  H: 'H', h: 'H',
  K: 'K', k: 'K',
  M: 'M', m: 'M',
  O: 'O', o: 'O',
  P: 'P', p: 'P',
  T: 'T', t: 'T',
  X: 'X', x: 'X',
  Y: 'Y', y: 'Y',
  А: 'A', а: 'A',
  В: 'B', в: 'B',
  С: 'C', с: 'C',
  Е: 'E', е: 'E',
  Ё: 'E', ё: 'E',
  Н: 'H', н: 'H',
  К: 'K', к: 'K',
  М: 'M', м: 'M',
  О: 'O', о: 'O',
  Р: 'P', р: 'P',
  Т: 'T', т: 'T',
  Х: 'X', х: 'X',
  У: 'Y', у: 'Y',
};
const PLATE_PATTERN = /^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{2,3}$/;
const MOTORCYCLE_PLATE_PATTERN = /^\d{4}[ABEKMHOPCTYX]{2}\d{2,3}$/;

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
    return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15);
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
    if (!/^[A-Z0-9]+$/.test(normalized)) return 'Допустимы только латинские буквы и цифры';
    return null;
  }

  const normalized = normalizePlateInput(value, plateType);
  if (!normalized) return 'Введите госномер';
  if (plateType === 'russian') {
    if (!PLATE_PATTERN.test(normalized)) return 'Введите номер в формате A123BC77 или A123BC777';
  } else if (plateType === 'motorcycle') {
    if (!MOTORCYCLE_PLATE_PATTERN.test(normalized)) return 'Введите номер в формате 1234AB77';
  }
  return null;
}

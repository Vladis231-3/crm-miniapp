const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё' -]{1,59}$/;
const REPEATED_LETTERS_PATTERN = /([A-Za-zА-Яа-яЁё])\1{3,}/i;
const VEHICLE_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$/;
const REPEATED_VEHICLE_PATTERN = /([A-Za-zА-Яа-яЁё0-9])\1{3,}/i;
const PLATE_LAYOUT_TO_LATIN: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  E: 'E',
  H: 'H',
  K: 'K',
  M: 'M',
  O: 'O',
  P: 'P',
  T: 'T',
  X: 'X',
  Y: 'Y',
  А: 'A',
  В: 'B',
  С: 'C',
  Е: 'E',
  Н: 'H',
  К: 'K',
  М: 'M',
  О: 'O',
  Р: 'P',
  Т: 'T',
  Х: 'X',
  У: 'Y',
};
const PLATE_PATTERN = /^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{2,3}$/;

export function normalizePersonName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validatePersonName(value: string): string | null {
  const normalized = normalizePersonName(value);
  const lettersOnly = normalized.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
  if (!normalized) return 'Введите ваше имя';
  if (!NAME_PATTERN.test(normalized)) return 'Введите настоящее имя';
  if (lettersOnly.length < 2) return 'Введите настоящее имя';
  if (new Set(lettersOnly.toLowerCase().split('')).size < 2) return 'Введите настоящее имя';
  if (REPEATED_LETTERS_PATTERN.test(lettersOnly)) return 'Введите настоящее имя';
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

export function normalizePlateInput(value: string): string {
  const cleaned = value.toUpperCase().replace(/\s+/g, '');
  let normalized = '';
  for (const char of cleaned) {
    if (PLATE_LAYOUT_TO_LATIN[char]) {
      normalized += PLATE_LAYOUT_TO_LATIN[char];
    } else if (/[A-Z0-9]/.test(char)) {
      normalized += char;
    }
  }
  return normalized.slice(0, 9);
}

export function validatePlateValue(value: string): string | null {
  const normalized = normalizePlateInput(value);
  if (!normalized) return 'Введите госномер';
  if (!PLATE_PATTERN.test(normalized)) return 'Введите номер в формате A123BC77 или A123BC777';
  return null;
}

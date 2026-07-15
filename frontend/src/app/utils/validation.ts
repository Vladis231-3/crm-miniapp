const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9' -]{0,59}$/;
const REPEATED_LETTERS_PATTERN = /([A-Za-zА-Яа-яЁё])\1{3,}/i;
const VEHICLE_PATTERN = /^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .-]{1,39}$/;
const REPEATED_VEHICLE_PATTERN = /([A-Za-zА-Яа-яЁё0-9])\1{3,}/i;
// Разрешённые латинские буквы для российских госномеров (по ГОСТ Р 50577-2018).
const PLATE_ALLOWED_LETTERS = new Set(["A", "B", "E", "K", "M", "H", "O", "P", "C", "T", "Y", "X"]);

const PLATE_LAYOUT_TO_LATIN: Record<string, string> = {
  // Латиница (нижний и верхний регистр)
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
  // Кириллица — конвертируем в визуально похожую латиницу
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

/**
 * Возвращает тип символа, ожидаемого на данной позиции российского госномера.
 * - "letter" — позиции 0, 4, 5
 * - "digit"  — позиции 1, 2, 3, 6, 7, 8
 */
function plateExpectedAtPosition(index: number): 'letter' | 'digit' {
  if (index === 0 || index === 4 || index === 5) return 'letter';
  return 'digit';
}

/**
 * Нормализует ввод госномера, фильтруя посимвольно по позициям.
 * - Любые русские буквы, визуально похожие на латиницу, конвертируются (А→A, В→B, ...)
 * - Любые буквы вне разрешённого набора отбрасываются
 * - Если на позиции ожидается цифра — буквы отбрасываются (даже разрешённые)
 * - Если на позиции ожидается буква — цифры отбрасываются
 * - Любая раскладка (RU/EN, lower/upper) приводится к латинскому upper
 */
export function normalizePlateInput(value: string): string {
  let result = '';
  for (const ch of value) {
    if (result.length >= 9) break;
    if (/\s/.test(ch)) continue;

    const expected = plateExpectedAtPosition(result.length);

    // Пробуем сконвертировать раскладку
    const mapped = PLATE_LAYOUT_TO_LATIN[ch];
    if (mapped !== undefined) {
      // Это буква (латинская или кириллическая визуально-похожая)
      if (expected !== 'letter') continue; // на этой позиции ждём цифру
      if (!PLATE_ALLOWED_LETTERS.has(mapped)) continue; // не из списка разрешённых
      result += mapped;
      continue;
    }

    // Цифра?
    if (/[0-9]/.test(ch)) {
      if (expected !== 'digit') continue; // на этой позиции ждём букву
      result += ch;
      continue;
    }

    // Любые прочие символы (включая буквы вне разрешённого набора)
    // молча отбрасываем — это и есть «защита от любой раскладки».
  }
  return result;
}

export function validatePlateValue(value: string): string | null {
  const normalized = normalizePlateInput(value);
  if (!normalized) return 'Введите госномер';
  if (!PLATE_PATTERN.test(normalized)) return 'Введите номер в формате A123BC77 или A123BC777';
  return null;
}

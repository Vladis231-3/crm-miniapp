import { describe, expect, it } from 'vitest';

import {
  isClientCardIncomplete,
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
} from './validation';

describe('normalizePersonName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizePersonName('  Иван   Петрович  ')).toBe('Иван Петрович');
  });
});

describe('validatePersonName', () => {
  it('accepts normal names', () => {
    expect(validatePersonName('Иван')).toBeNull();
    expect(validatePersonName('Анна-Мария')).toBeNull();
  });

  it('rejects empty and garbage', () => {
    expect(validatePersonName('   ')).not.toBeNull();
    expect(validatePersonName('!!!')).not.toBeNull();
  });
});

describe('validatePhoneValue', () => {
  it('accepts RU formats', () => {
    expect(validatePhoneValue('+7 (999) 123-45-67')).toBeNull();
    expect(validatePhoneValue('89991234567')).toBeNull();
    expect(validatePhoneValue('9991234567')).toBeNull();
  });

  it('rejects trash numbers', () => {
    expect(validatePhoneValue('')).not.toBeNull();
    expect(validatePhoneValue('123')).not.toBeNull();
    expect(validatePhoneValue('80000000000')).not.toBeNull();
    expect(validatePhoneValue('77777777777')).not.toBeNull();
  });
});

describe('normalizeVehicleInput / validateVehicleName', () => {
  it('trims and collapses', () => {
    expect(normalizeVehicleInput('  Lada   Vesta ')).toBe('Lada Vesta');
  });

  it('accepts brand + model, rejects digits-only and repeats', () => {
    expect(validateVehicleName('Lada Vesta')).toBeNull();
    expect(validateVehicleName('12345')).not.toBeNull();
    expect(validateVehicleName('Ladaaaaa Vesta')).not.toBeNull();
    expect(validateVehicleName('')).not.toBeNull();
  });
});

describe('normalizePlateInput (russian)', () => {
  it('maps latin layout to cyrillic and keeps positions', () => {
    expect(normalizePlateInput('A123BC77')).toBe('а123вс77');
  });

  it('enforces positional mask (letters only at 0/4/5)', () => {
    // 'A1B3BC77': B at digit-slots dropped, second 7 lands on letter-slot 4 → dropped
    expect(normalizePlateInput('A1B3BC77')).toBe('а137');
  });

  it('caps length at 9 symbols', () => {
    expect(normalizePlateInput('A123BC777XXX').length).toBeLessThanOrEqual(9);
  });
});

describe('validatePlateValue', () => {
  it('accepts full plates, rejects fragments', () => {
    expect(validatePlateValue('а123вс77')).toBeNull();
    expect(validatePlateValue('а123вс777')).toBeNull();
    expect(validatePlateValue('а12')).not.toBeNull();
    expect(validatePlateValue('')).not.toBeNull();
  });

  it('handles foreign plates', () => {
    expect(validatePlateValue('AB123CD', 'foreign')).toBeNull();
    expect(validatePlateValue('X', 'foreign')).not.toBeNull();
  });
});

describe('isClientCardIncomplete', () => {
  const full = {
    phone: '+7 (999) 123-45-67',
    car: 'Lada Vesta',
    plate: 'а123вс77',
    adminNote: 'vip',
    adminRating: 5,
    referralSource: '2gis',
    vehicles: [{ car: 'Lada Vesta', plate: 'а123вс77' }],
    createdAt: new Date(),
  };

  it('complete fresh card is complete', () => {
    expect(isClientCardIncomplete(full)).toBe(false);
  });

  it('missing fields flag incomplete', () => {
    expect(isClientCardIncomplete({ ...full, phone: '' })).toBe(true);
    expect(isClientCardIncomplete({ ...full, adminRating: 0 })).toBe(true);
    expect(isClientCardIncomplete({ ...full, vehicles: [] })).toBe(true);
  });

  it('old cards are never flagged', () => {
    const old = { ...full, phone: '', createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) };
    expect(isClientCardIncomplete(old)).toBe(false);
  });
});

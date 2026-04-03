export function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function parseDate(value: string): Date {
  const [day, month, year] = value.split('.').map(Number);
  return new Date(year, month - 1, day);
}

export function parseFlexibleDate(value: string): Date | null {
  if (!value) return null;
  if (value.includes('.')) {
    const [day, month, year] = value.split('.').map(Number);
    if (!day || !month || !year) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value.includes('-')) {
    const [year, month, day] = value.split('-').map(Number);
    if (!day || !month || !year) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function combineDateTime(dateValue: string, timeValue: string): Date | null {
  const baseDate = parseFlexibleDate(dateValue);
  if (!baseDate || !timeValue) return null;
  const [hours, minutes] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const next = new Date(baseDate);
  next.setHours(hours, minutes, 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
}

export function isPastTimeSlot(dateValue: string, timeValue: string, now = new Date()): boolean {
  const bookingDate = combineDateTime(dateValue, timeValue);
  if (!bookingDate) return false;
  const current = new Date(now);
  current.setSeconds(0, 0);
  return bookingDate < current;
}

export function getUpcomingDates(count = 4): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return formatDate(date);
  });
}

export function getScheduleDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getLastNDates(count: number): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = startOfDay(new Date());
    date.setDate(date.getDate() - (count - index - 1));
    return date;
  });
}

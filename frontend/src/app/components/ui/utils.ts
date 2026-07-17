import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Фиксированная оплата мастеру для отдельных услуг (флаг isFixedMaster у услуги).
// Сумма жёстко задана; признак фикса хранится в БД у услуги.
export const FIXED_MASTER_EARNED = 1200;

export function formatFixedMasterAmount(): string {
  return FIXED_MASTER_EARNED.toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
}

// Определяет, оплачивается ли услуга мастеру фиксированно, по списку услуг из контекста.
// Надёжный детект: услуга "подготовка к полировке" всегда фиксированная (по имени),
// плюс любая другая услуга с флагом isFixedMaster. Флаг имеет приоритет над именем
// для возможности отключить фикс у "подготовка к полировке" через редактор услуг.
const FIXED_MASTER_SERVICE_NAME = "подготовка к полировке";

export function isFixedMasterService(
  services: { id: string; name: string; isFixedMaster?: boolean }[] | undefined,
  serviceId: string | undefined | null,
  serviceName: string | undefined | null,
): boolean {
  const norm = (v: string | undefined | null) => (v ? v.trim().toLowerCase() : "");
  const isKnownName = (name: string) => norm(name) === FIXED_MASTER_SERVICE_NAME;

  let found: { id: string; name: string; isFixedMaster?: boolean } | undefined;
  if (services && services.length) {
    found = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    if (!found && serviceName) {
      found = services.find((s) => norm(s.name) === norm(serviceName));
    }
  }
  if (found) {
    // явно выключенный флаг у известной услуги отменяет фикс
    if (found.isFixedMaster === false && isKnownName(found.name)) return false;
    if (Boolean(found.isFixedMaster)) return true;
  }
  // fallback: по имени (работает даже без флага в БД)
  return Boolean(serviceName) && isKnownName(serviceName!);
}

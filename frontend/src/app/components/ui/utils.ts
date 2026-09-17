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

// Детект строго ПО НАЗВАНИЮ услуги "подготовка к полировке".
// Совпадает с бэком (_is_fixed_master_service_db в backend/app/main.py):
// услуга "подготовка к полировке" всегда фиксированная независимо от флага.
// Флаг isFixedMaster у услуги включает фикс для ДРУГИХ услуг.
const FIXED_MASTER_SERVICE_NAME = "подготовка к полировке";

export function isFixedMasterService(
  services: { id: string; name: string; isFixedMaster?: boolean }[] | undefined,
  serviceId: string | undefined | null,
  serviceName: string | undefined | null,
): boolean {
  const norm = (v: string | undefined | null) => (v ? String(v).trim().toLowerCase() : "");
  const KNOWN = FIXED_MASTER_SERVICE_NAME;

  // 1) прямое совпадение по имени (работает даже если serviceName — это просто строка названия)
  if (serviceName && norm(serviceName) === KNOWN) return true;

  if (services && services.length) {
    // 2) резолвим имя по id из списка услуг (в формах service часто хранится как id)
    if (serviceId) {
      const byId = services.find((s) => s.id === serviceId);
      if (byId) {
        if (norm(byId.name) === KNOWN) return true;
        if (Boolean(byId.isFixedMaster)) return true;
      }
    }
    // 3) совпадение по имени из списка (если serviceName — это имя, а не id)
    if (serviceName) {
      const byName = services.find((s) => norm(s.name) === norm(serviceName));
      if (byName) {
        if (norm(byName.name) === KNOWN) return true;
        if (Boolean(byName.isFixedMaster)) return true;
      }
    }
  }
  return false;
}

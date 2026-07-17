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
// Приоритет: флаг isFixedMaster у найденной услуги (по id, затем по имени).
// Запасной fallback — сравнение имени с "подготовка к полировке" для старых записей.
export function isFixedMasterService(
  services: { id: string; name: string; isFixedMaster?: boolean }[] | undefined,
  serviceId: string | undefined | null,
  serviceName: string | undefined | null,
): boolean {
  if (services && services.length) {
    const byId = serviceId ? services.find((s) => s.id === serviceId) : undefined;
    if (byId) return Boolean(byId.isFixedMaster);
    if (serviceName) {
      const byName = services.find(
        (s) => s.name.trim().toLowerCase() === serviceName.trim().toLowerCase(),
      );
      if (byName) return Boolean(byName.isFixedMaster);
    }
  }
  return Boolean(serviceName) && serviceName!.trim().toLowerCase() === "подготовка к полировке";
}

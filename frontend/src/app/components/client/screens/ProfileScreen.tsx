import { useEffect, useState } from 'react';
import { useApp, type ClientProfile } from '../../../context/AppContext';
import {
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePlateValue,
  validateVehicleName,
} from '../../../utils/validation';
import { Button, Card, FormRow, Input, Money, SectionHeader, toast } from '../../atmosfera';

export interface ProfileScreenProps {
  upcomingCount: number;
  completedCount: number;
  totalSpent: number;
}

const EMPTY_VEHICLE = { car: '', plate: '', isMain: true };

function withBaseVehicles(current: ClientProfile) {
  return current.vehicles?.length ? current.vehicles : [{ ...EMPTY_VEHICLE, car: current.car || '', plate: current.plate || '' }];
}

/**
 * ProfileScreen — пилотная вырезка из ClientApp (REDESIGN_PLAN.md §5 Фаза 1, §10.2).
 * Целиком на композитах atmosfera/: Card/FormRow/Input/Button/Money + DS-toast.
 * Логика валидации/нормализации сохранена 1-в-1 из исходного монолита.
 */
export function ProfileScreen({ upcomingCount, completedCount, totalSpent }: ProfileScreenProps) {
  const { clientProfile, updateClientProfile, logout, resetThemeToAuto } = useApp();

  const [profileForm, setProfileForm] = useState<ClientProfile>(clientProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState('');

  // Синхронизация формы с профилем из bootstrap (перенесено из ClientApp:186–199).
  useEffect(() => {
    const raw = clientProfile.vehicles?.length
      ? clientProfile.vehicles
      : [{ ...EMPTY_VEHICLE, car: clientProfile.car || '', plate: clientProfile.plate || '' }];
    const hasMain = raw.some((v) => v.isMain);
    const vehicles = raw.map((v, i) => ({ ...v, isMain: hasMain ? v.isMain : i === 0 }));
    setProfileForm({ ...clientProfile, vehicles });
    setProfileErrors({});
    setProfileError('');
  }, [clientProfile]);

  const profileVehicles = profileForm.vehicles?.length
    ? profileForm.vehicles
    : [{ ...EMPTY_VEHICLE, car: profileForm.car || '', plate: profileForm.plate || '' }];
  const primaryVehicle = profileVehicles[0] || { car: '', plate: '' };
  const visibleProfileVehicles = profileVehicles.filter((vehicle) => vehicle.car || vehicle.plate);

  const handleSaveProfile = async () => {
    const nextErrors: Record<string, string> = {};
    const nameError = validatePersonName(profileForm.name);
    const carError = validateVehicleName(primaryVehicle.car);
    const plateError = validatePlateValue(primaryVehicle.plate);
    if (nameError) nextErrors.name = nameError;
    if (carError) nextErrors.car = carError;
    if (plateError) nextErrors.plate = plateError;
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedVehicles = (profileForm.vehicles || [])
      .map((vehicle) => ({
        car: normalizeVehicleInput(vehicle.car),
        plate: normalizePlateInput(vehicle.plate),
        isMain: vehicle.isMain,
      }))
      .filter((vehicle) => vehicle.car || vehicle.plate);
    if (normalizedVehicles.length > 0 && !normalizedVehicles.some((v) => v.isMain)) {
      normalizedVehicles[0] = { ...normalizedVehicles[0], isMain: true };
    }
    const normalizedProfile: ClientProfile = {
      ...profileForm,
      name: normalizePersonName(profileForm.name),
      phone: profileForm.phone.trim(),
      car: normalizeVehicleInput(primaryVehicle.car),
      plate: normalizePlateInput(primaryVehicle.plate),
      vehicles: normalizedVehicles,
    };
    try {
      setProfileError('');
      setProfileForm(normalizedProfile);
      await updateClientProfile(normalizedProfile);
      setProfileSaved(true);
      toast({ type: 'success', title: 'Профиль обновлён' });
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить профиль');
    }
  };

  const avgCheck = completedCount ? Math.round(totalSpent / completedCount) : 0;

  return (
    <div>
      <SectionHeader title="Профиль" className="mb-4" />

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Активные" value={String(upcomingCount)} />
        <StatTile label="Завершено" value={String(completedCount)} />
        <StatTile label="Средний чек" value={<Money amount={avgCheck} />} />
      </div>

      <Card className="p-4 mb-4">
        {/* Шапка профиля */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: 'var(--primary-600)' }}
          >
            {(profileForm.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold">{profileForm.name || 'Клиент'}</div>
            <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
              {profileForm.phone || 'Укажите телефон'}
            </div>
          </div>
        </div>

        {/* Все автомобили  -  сводка */}
        <Card variant="glass" className="p-3 mb-4 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold">Все автомобили</div>
              <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                Здесь отображаются все машины из профиля
              </div>
            </div>
            <span className="rounded-full bg-[var(--card-raised,var(--card))] px-2.5 py-1 text-xs border border-border">
              {visibleProfileVehicles.length || 0}
            </span>
          </div>
          <div className="space-y-2">
            {visibleProfileVehicles.length > 0 ? (
              visibleProfileVehicles.map((vehicle, index) => (
                <Card key={`vehicle-card-${index}`} className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl">
                  <div>
                    <div className="text-sm font-medium">{vehicle.car || 'Автомобиль'}</div>
                    <div className="mt-1 text-xs text-[var(--fg-secondary,#5A6072)]">
                      {vehicle.plate || 'Госномер не указан'}
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--fg-muted,#8A91A0)]">#{index + 1}</div>
                </Card>
              ))
            ) : (
              <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                После добавления второго авто они будут собраны здесь отдельным списком.
              </div>
            )}
          </div>
        </Card>

        {/* Основные поля */}
        <div className="space-y-3">
          <FormRow label="Имя" error={profileErrors.name}>
            <Input
              invalid={Boolean(profileErrors.name)}
              value={profileForm.name}
              onChange={(e) => {
                const value = e.target.value;
                setProfileForm((current) => ({ ...current, name: value }));
                setProfileErrors((current) => ({ ...current, name: '' }));
                setProfileError('');
              }}
            />
          </FormRow>

          <FormRow label="Телефон" error={profileErrors.phone}>
            <Input
              type="tel"
              inputMode="tel"
              invalid={Boolean(profileErrors.phone)}
              value={profileForm.phone}
              onChange={(e) => {
                const value = e.target.value;
                setProfileForm((current) => ({ ...current, phone: value }));
                setProfileErrors((current) => ({ ...current, phone: '' }));
                setProfileError('');
              }}
            />
          </FormRow>

          <FormRow label="Автомобиль" error={profileErrors.car}>
            <Input
              placeholder="Lada Vesta"
              invalid={Boolean(profileErrors.car)}
              value={primaryVehicle.car}
              onChange={(e) => {
                const nextCar = e.target.value;
                setProfileForm((current) => ({
                  ...current,
                  car: nextCar,
                  vehicles: withBaseVehicles(current).map((item, index) =>
                    index === 0 ? { ...item, car: nextCar } : item,
                  ),
                }));
                setProfileErrors((current) => ({ ...current, car: '' }));
                setProfileError('');
              }}
            />
          </FormRow>

          <FormRow label="Госномер" error={profileErrors.plate}>
            <Input
              placeholder="а123вс777"
              maxLength={9}
              invalid={Boolean(profileErrors.plate)}
              value={primaryVehicle.plate}
              onChange={(e) => {
                const nextPlate = normalizePlateInput(e.target.value);
                setProfileForm((current) => ({
                  ...current,
                  plate: nextPlate,
                  vehicles: withBaseVehicles(current).map((item, index) =>
                    index === 0 ? { ...item, plate: nextPlate } : item,
                  ),
                }));
                setProfileErrors((current) => ({ ...current, plate: '' }));
                setProfileError('');
              }}
            />
          </FormRow>

          {/* Дополнительные автомобили */}
          <Card variant="glass" className="p-3 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Добавить авто</div>
                <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                  Марка и госномер сохранятся в профиль
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-[var(--primary-600)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-md px-1"
                onClick={() =>
                  setProfileForm((current) => ({
                    ...current,
                    vehicles: [...withBaseVehicles(current), { car: '', plate: '' }],
                  }))
                }
              >
                + Добавить авто
              </button>
            </div>
            <div className="space-y-2">
              {profileVehicles.slice(1).map((vehicle, index) => (
                <div key={`profile-vehicle-${index + 1}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Марка"
                    value={vehicle.car}
                    onChange={(e) => {
                      const nextCar = e.target.value;
                      setProfileForm((current) => ({
                        ...current,
                        vehicles: withBaseVehicles(current).map((item, vehicleIndex) =>
                          vehicleIndex === index + 1 ? { ...item, car: nextCar } : item,
                        ),
                      }));
                      setProfileError('');
                    }}
                  />
                  <Input
                    placeholder="Госномер"
                    maxLength={9}
                    value={vehicle.plate}
                    onChange={(e) => {
                      const nextPlate = normalizePlateInput(e.target.value);
                      setProfileForm((current) => ({
                        ...current,
                        vehicles: withBaseVehicles(current).map((item, vehicleIndex) =>
                          vehicleIndex === index + 1 ? { ...item, plate: nextPlate } : item,
                        ),
                      }));
                      setProfileError('');
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--status-danger)]"
                    onClick={() =>
                      setProfileForm((current) => ({
                        ...current,
                        vehicles: withBaseVehicles(current).filter(
                          (_, vehicleIndex) => vehicleIndex !== index + 1,
                        ),
                      }))
                    }
                  >
                    Удалить
                  </Button>
                </div>
              ))}
              {profileVehicles.length <= 1 && (
                <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
                  Дополнительных авто пока нет
                </div>
              )}
            </div>
          </Card>
        </div>
      </Card>

      {profileError && (
        <div className="mb-3 text-sm text-[var(--status-danger)]">{profileError}</div>
      )}

      <div className="space-y-3">
        <Button size="lg" onClick={handleSaveProfile} className="mb-1">
          {profileSaved ? 'Сохранено' : 'Сохранить изменения'}
        </Button>
        <Button size="lg" variant="secondary" onClick={logout}>
          Выйти
        </Button>
        <button
          type="button"
          onClick={resetThemeToAuto}
          className="rounded py-1 text-center text-[13px] text-[var(--fg-muted,#8A91A0)] underline-offset-2 transition-colors hover:text-[var(--fg-secondary,#5A6072)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Тема: как в Telegram (сбросить ручной выбор)
        </button>
      </div>
    </div>
  );
}

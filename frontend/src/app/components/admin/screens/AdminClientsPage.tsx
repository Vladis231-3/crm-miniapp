import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Phone, Plus, Trash2, Users } from 'lucide-react';
import { useApp, type Booking, type RegisteredClient } from '../../../context/AppContext';
import {
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
} from '../../../utils/validation';

function normalizePhoneSearchValue(value: string) {
  return value.replace(/\D/g, '');
}
import { parseFlexibleDate } from '../../../utils/date';
import { REFERRAL_SOURCES } from '../../../constants/referralSources';
import { ServiceSearchSelect } from '../../shared/ServiceSearchSelect';
import { Button, Card, Dialog, FormRow, Input, Money, Sheet, StatusBadge, Textarea } from '../../atmosfera';

type ClientSearchMode = 'phone' | 'plate';

interface CreateClientForm {
  name: string;
  phone: string;
  car: string;
  plate: string;
  plateType: 'russian' | 'motorcycle' | 'foreign';
  notes: string;
  referralSource: string;
}

const EMPTY_CREATE_FORM: CreateClientForm = {
  name: '', phone: '', car: '', plate: '', plateType: 'russian', notes: '', referralSource: '',
};

function paymentLabel(paymentType?: string, settled?: boolean) {
  const base = paymentType === 'cash' ? 'Наличные' : paymentType === 'transfer' ? 'Перевод' : paymentType === 'invoice' ? 'По счёту' : '';
  return settled === false && base ? `${base} · не оплачено` : base || '—';
}

/**
 * AdminClientsPage — вырезка из AdminApp (§6.2).
 * Поиск телефон/госномер, карточка с долгом/рейтингом/историей,
 * создание через DS Sheet, удаление через DS Dialog (вместо window.confirm).
 */
export function AdminClientsPage({ onAddPastBooking }: { onAddPastBooking: (client: RegisteredClient) => void }) {
  const { registeredClients, bookings, services, deleteClient, addClient, updateClientCard } = useApp();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearchMode, setClientSearchMode] = useState<ClientSearchMode>('phone');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [historyServiceFilter, setHistoryServiceFilter] = useState('');
  const [cardDrafts, setCardDrafts] = useState<Record<string, { adminRating: number; adminNote: string; referralSource: string }>>({});
  const [savingCardId, setSavingCardId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateClientForm>(EMPTY_CREATE_FORM);
  const [createErrors, setCreateErrors] = useState<{ name?: string; phone?: string; car?: string; plate?: string }>({});
  const [createSaving, setCreateSaving] = useState(false);

  useEffect(() => {
    if (selectedClientId && !registeredClients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [registeredClients, selectedClientId]);

  const selectedClient = registeredClients.find((client) => client.id === selectedClientId) ?? null;

  const normalizedQuery = clientSearchMode === 'phone'
    ? normalizePhoneSearchValue(clientSearchQuery)
    : normalizePlateInput(clientSearchQuery);
  const filteredClients = registeredClients.filter((client) => {
    if (!normalizedQuery) return true;
    if (clientSearchMode === 'phone') {
      return normalizePhoneSearchValue(client.phone).includes(normalizedQuery);
    }
    const plates = [
      client.plate,
      ...(client.vehicles || []).map((vehicle) => vehicle.plate),
    ]
      .map((plate) => normalizePlateInput(plate || ''))
      .filter(Boolean);
    return plates.some((plate) => plate.includes(normalizedQuery));
  });

  const selectedClientBookings = selectedClient
    ? [...bookings]
        .filter((booking) => booking.clientId === selectedClient.id)
        .sort((left, right) => {
          const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
          const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
          if (rightDate !== leftDate) return rightDate - leftDate;
          return right.time.localeCompare(left.time);
        })
    : [];
  const selectedClientFilteredBookings = selectedClientBookings.filter((booking) => {
    if (!historyServiceFilter) return true;
    const svc = services.find((s) => s.id === historyServiceFilter);
    if (!svc) return true;
    return booking.serviceId === svc.id || booking.service === svc.name;
  });
  const selectedClientVehicles = selectedClient
    ? (selectedClient.vehicles?.length ? selectedClient.vehicles : [{ car: selectedClient.car, plate: selectedClient.plate }])
        .filter((vehicle) => vehicle.car || vehicle.plate)
    : [];
  const spentTotal = selectedClientBookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.price, 0);
  const completedCount = selectedClientBookings.filter((b) => b.status === 'completed').length;
  const upcoming = selectedClientBookings.find((b) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(b.status));
  const lastVisit = selectedClientBookings.find((b) => b.status === 'completed');

  // ── Создание клиента (валидация 1-в-1 из родителя) ──
  const handleCreateSubmit = async () => {
    const nextErrors: typeof createErrors = {};
    const nameError = validatePersonName(createForm.name);
    if (nameError) nextErrors.name = nameError;
    if (createForm.phone.trim()) {
      const phoneError = validatePhoneValue(createForm.phone);
      if (phoneError) nextErrors.phone = phoneError;
    }
    if (normalizeVehicleInput(createForm.car)) {
      const carError = validateVehicleName(createForm.car);
      if (carError) nextErrors.car = carError;
    }
    if (normalizePlateInput(createForm.plate, createForm.plateType)) {
      const plateError = validatePlateValue(createForm.plate, createForm.plateType);
      if (plateError) nextErrors.plate = plateError;
    }
    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      setCreateSaving(true);
      const created = await addClient({
        name: normalizePersonName(createForm.name),
        phone: createForm.phone.trim(),
        car: normalizeVehicleInput(createForm.car),
        plate: normalizePlateInput(createForm.plate, createForm.plateType),
        plateType: createForm.plateType,
        notes: createForm.notes.trim(),
        referralSource: createForm.referralSource || undefined,
      });
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateErrors({});
      setShowCreate(false);
      setSelectedClientId(created.id);
    } finally {
      setCreateSaving(false);
    }
  };

  const draftFor = (clientId: string) =>
    cardDrafts[clientId] ?? { adminRating: 0, adminNote: selectedClient?.adminNote ?? '', referralSource: '' };

  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const selectCls = inputCls;
  const incompleteDot = (
    <span className="absolute -right-1 -top-1 size-3.5 animate-pulse rounded-full bg-[var(--status-danger)] shadow-lg shadow-red-500/50 ring-2 ring-white dark:ring-gray-900" />
  );

  return (
    <motion.div key="clients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      {/* Шапка */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Клиенты</h2>
          <p className={`mt-1 text-xs ${sub}`}>
            {selectedClient
              ? 'История услуг, оплаты, авто и внутренняя заметка'
              : 'Открой клиента, чтобы посмотреть всю историю посещений'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectedClient && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} strokeWidth={1.75} aria-hidden />
              Новый
            </Button>
          )}
          {selectedClient && (
            <button
              onClick={() => { setSelectedClientId(null); setHistoryServiceFilter(''); }}
              className="flex items-center gap-2 rounded-xl bg-[var(--sunken,#EEEFF3)] px-3 py-2 text-sm dark:bg-white/5"
            >
              <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
              Назад
            </button>
          )}
        </div>
      </div>

      {/* Поиск */}
      {!selectedClient && registeredClients.length > 0 && (
        <div className={`${glass} mb-4 rounded-2xl p-3`}>
          <div className="mb-3 flex gap-2">
            {([
              { id: 'phone', label: 'По телефону' },
              { id: 'plate', label: 'По госномеру' },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => { setClientSearchMode(option.id); setClientSearchQuery(''); }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  clientSearchMode === option.id ? 'text-white' : sub
                }`}
                style={clientSearchMode === option.id ? { background: 'var(--primary-600)' } : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Input
            type={clientSearchMode === 'phone' ? 'tel' : 'text'}
            placeholder={clientSearchMode === 'phone' ? '+7 (___) ___-__-__' : 'а123вс777'}
            value={clientSearchQuery}
            onChange={(event) => setClientSearchQuery(event.target.value)}
          />
        </div>
      )}

      {/* Пустой справочник */}
      {registeredClients.length === 0 && (
        <div className={`${glass} rounded-2xl p-8 text-center`}>
          <Users size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
          <p className={sub}>Пока нет зарегистрированных клиентов</p>
        </div>
      )}

      {/* Список */}
      {!selectedClient &&
        filteredClients.map((client) => {
          const clientBookings = bookings.filter((b) => b.clientId === client.id);
          const spent = clientBookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.price, 0);
          const last = [...clientBookings].sort((l, r) => {
            const ld = parseFlexibleDate(l.date)?.getTime() ?? 0;
            const rd = parseFlexibleDate(r.date)?.getTime() ?? 0;
            if (rd !== ld) return rd - ld;
            return r.time.localeCompare(l.time);
          })[0];
          const displayName = client.name.trim() || 'Клиент без имени';
          const phone = client.phone.trim();
          const isIncomplete =
            !client.phone.trim() || !client.car.trim() || !client.plate.trim();
          return (
            <div
              key={client.id}
              className={`${glass} mb-3 cursor-pointer rounded-2xl p-4 transition-transform hover:-translate-y-0.5`}
              onClick={() => { setSelectedClientId(client.id); setHistoryServiceFilter(''); }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedClientId(client.id);
                  setHistoryServiceFilter('');
                }
              }}
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="relative shrink-0">
                  <div
                    className="flex size-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: 'var(--primary-600)' }}
                  >
                    {displayName.charAt(0).toUpperCase() || '?'}
                  </div>
                  {isIncomplete && incompleteDot}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{displayName}</div>
                  <div className={`text-xs ${sub}`}>{client.car || 'Автомобиль не указан'}</div>
                  {client.plate && <div className={`font-mono text-xs ${sub}`}>{client.plate}</div>}
                  {phone ? (
                    <a href={`tel:${phone}`} className="mt-0.5 flex items-center gap-1 text-xs text-[var(--primary-600)]">
                      <Phone size={10} strokeWidth={1.75} aria-hidden />
                      {phone}
                    </a>
                  ) : (
                    <div className={`mt-0.5 text-xs ${sub}`}>Телефон не указан</div>
                  )}
                  <div className={`mt-1 text-[11px] ${sub}`}>
                    {last ? `Последний визит: ${last.date} ${last.time}` : 'Истории посещений пока нет'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete({ id: client.id, name: client.name });
                    }}
                    className="rounded-xl bg-[var(--status-danger-soft)] p-2 text-[var(--status-danger)]"
                    aria-label={`Удалить клиента ${client.name}`}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                  <ChevronRight size={16} strokeWidth={1.75} className={sub} aria-hidden />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatTile label="Записей" value={String(clientBookings.length)} className="p-2" />
                <StatTile label="Завершено" value={String(clientBookings.filter((b) => b.status === 'completed').length)} className="p-2" />
                <StatTile label="Потрачено" value={<Money amount={spent} />} className="p-2" />
              </div>
              <div className={`mt-3 flex items-center justify-between gap-3 text-xs ${sub}`}>
                <span>Открой карточку, чтобы увидеть все услуги и детали клиента</span>
                <span>Рейтинг: {client.adminRating ? `${client.adminRating}/5` : 'без оценки'}</span>
              </div>
            </div>
          );
        })}
      {!selectedClient && registeredClients.length > 0 && filteredClients.length === 0 && (
        <div className={`${glass} rounded-2xl p-6 text-center`}>
          <div className="mb-1 font-medium">Ничего не найдено</div>
          <div className={`text-sm ${sub}`}>Попробуйте другой телефон или госномер</div>
        </div>
      )}

      {/* Карточка клиента */}
      {selectedClient && (() => {
        const draft = cardDrafts[selectedClient.id]
          ?? {
            adminRating: selectedClient.adminRating ?? 0,
            adminNote: selectedClient.adminNote ?? '',
            referralSource: selectedClient.referralSource ?? '',
          };
        const setDraft = (patch: Partial<typeof draft>) =>
          setCardDrafts((current) => ({ ...current, [selectedClient.id]: { ...draft, ...patch } }));
        const isIncomplete = !selectedClient.phone.trim() || !selectedClient.car.trim() || !selectedClient.plate.trim();
        return (
          <div className="space-y-3">
            <Card className="p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="relative shrink-0">
                  <div
                    className="flex size-14 items-center justify-center rounded-full text-xl font-bold text-white"
                    style={{ background: 'var(--primary-600)' }}
                  >
                    {(selectedClient.name.trim() || 'К').charAt(0).toUpperCase()}
                  </div>
                  {isIncomplete && incompleteDot}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold">{selectedClient.name.trim() || 'Клиент без имени'}</div>
                  <div className={`mt-1 text-sm ${sub}`}>
                    Основное авто: {selectedClient.car || 'не указано'}{selectedClient.plate ? `, ${selectedClient.plate}` : ''}
                  </div>
                  {selectedClient.phone.trim() ? (
                    <a href={`tel:${selectedClient.phone}`} className="mt-1 flex items-center gap-1 text-sm text-[var(--primary-600)]">
                      <Phone size={12} strokeWidth={1.75} aria-hidden />
                      {selectedClient.phone}
                    </a>
                  ) : (
                    <div className={`mt-1 text-sm ${sub}`}>Телефон не указан</div>
                  )}
                </div>
                <button
                  onClick={() => setPendingDelete({ id: selectedClient.id, name: selectedClient.name })}
                  className="rounded-xl bg-[var(--status-danger-soft)] p-2 text-[var(--status-danger)]"
                  aria-label={`Удалить клиента ${selectedClient.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>

              {selectedClient.adminNote && (
                <div className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--status-warning)_25%,transparent)] bg-[var(--status-warning-soft)] px-3 py-2.5 text-sm text-[var(--status-warning)]">
                  <div className="mb-1 text-xs font-medium">⚑ Примечание:</div>
                  {selectedClient.adminNote}
                </div>
              )}

              <Button className="mb-4 w-full" onClick={() => onAddPastBooking(selectedClient)}>
                <Plus size={16} strokeWidth={1.75} aria-hidden />
                Добавить прошлую запись
              </Button>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <StatTile label="Всего записей" value={String(selectedClientBookings.length)} />
                <StatTile label="Завершённых" value={String(completedCount)} />
                <StatTile label="Потрачено" value={<Money amount={spentTotal} />} />
                <StatTile label="Долг" value={<Money amount={selectedClient.debtBalance} />} />
              </div>

              <div className="space-y-2">
                <div className="rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
                  <div className={`mb-1 text-xs ${sub}`}>Ближайшая запись</div>
                  <div className="text-sm tabular-nums">
                    {upcoming ? `${upcoming.date} ${upcoming.time} • ${upcoming.service}` : 'Нет активных записей'}
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
                  <div className={`mb-1 text-xs ${sub}`}>Последний завершённый визит</div>
                  <div className="text-sm tabular-nums">
                    {lastVisit ? `${lastVisit.date} ${lastVisit.time} • ${lastVisit.service}` : 'Пока нет завершённых услуг'}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <FormRow label="Рейтинг клиента для админа">
                  <select
                    className={selectCls}
                    value={draft.adminRating}
                    onChange={(event) => setDraft({ adminRating: Number(event.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>{value === 0 ? 'Без оценки' : `${value}/5`}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Внутреннее примечание">
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Видно только администратору"
                    value={draft.adminNote}
                    onChange={(event) => setDraft({ adminNote: event.target.value })}
                  />
                </FormRow>
                <FormRow label="Как узнал о нас">
                  <select
                    className={selectCls}
                    value={draft.referralSource}
                    onChange={(event) => setDraft({ referralSource: event.target.value })}
                  >
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </FormRow>
                <Button
                  className="w-full"
                  disabled={savingCardId === selectedClient.id}
                  onClick={async () => {
                    try {
                      setSavingCardId(selectedClient.id);
                      await updateClientCard(selectedClient.id, {
                        adminRating: draft.adminRating,
                        adminNote: draft.adminNote,
                        referralSource: draft.referralSource,
                      });
                    } finally {
                      setSavingCardId(null);
                    }
                  }}
                >
                  {savingCardId === selectedClient.id ? 'Сохраняем...' : 'Сохранить карточку клиента'}
                </Button>
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 font-semibold">Автомобили клиента</div>
              {selectedClientVehicles.length === 0 ? (
                <div className={`text-sm ${sub}`}>Автомобили ещё не добавлены</div>
              ) : (
                <div className="space-y-2">
                  {selectedClientVehicles.map((vehicle, index) => (
                    <div
                      key={`${vehicle.car}-${vehicle.plate}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{vehicle.car || 'Авто без названия'}</div>
                        <div className={`text-xs ${sub}`}>{vehicle.plate || 'Номер не указан'}</div>
                      </div>
                      <div className={`text-[11px] ${sub}`}>{vehicle.isMain ? 'Основное' : `Авто ${index + 1}`}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="mb-3 font-semibold">История услуг</div>
              {selectedClientBookings.length > 0 && (
                <div className="mb-3">
                  <ServiceSearchSelect
                    value={historyServiceFilter}
                    services={services}
                    selectCls={selectCls}
                    inputCls={inputCls}
                    glass={glass}
                    text=""
                    sub={sub}
                    primary="var(--primary-600)"
                    isDark={false}
                    placeholder="Поиск по услугам"
                    onChange={setHistoryServiceFilter}
                  />
                </div>
              )}
              {selectedClientFilteredBookings.length === 0 ? (
                <div className={`text-sm ${sub}`}>
                  {selectedClientBookings.length === 0 ? 'У клиента пока нет записей' : 'По выбранной услуге записей нет'}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedClientFilteredBookings.map((booking) => (
                    <BookingHistoryCard key={booking.id} booking={booking} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      })()}

      {/* Удаление — DS Dialog вместо window.confirm */}
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Удалить клиента?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPendingDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (pendingDelete) await deleteClient(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        Клиент «{pendingDelete?.name}» и его доступ в Mini App будут удалены.
        История записей останется.
      </Dialog>

      {/* Создание — DS Sheet */}
      <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="Новый клиент">
        <div className="space-y-3">
          <FormRow label="Имя" required error={createErrors.name}>
            <Input invalid={Boolean(createErrors.name)} placeholder="Имя Фамилия" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
          </FormRow>
          <FormRow label="Телефон" error={createErrors.phone}>
            <Input type="tel" invalid={Boolean(createErrors.phone)} placeholder="+7 (___) ___-__-__" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} />
          </FormRow>
          <FormRow label="Автомобиль" error={createErrors.car}>
            <Input invalid={Boolean(createErrors.car)} placeholder="Lada Vesta" value={createForm.car} onChange={(e) => setCreateForm((f) => ({ ...f, car: e.target.value }))} />
          </FormRow>
          <FormRow label="Госномер" error={createErrors.plate}>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                maxLength={9}
                invalid={Boolean(createErrors.plate)}
                placeholder="а123вс777"
                value={createForm.plate}
                onChange={(e) => setCreateForm((f) => ({ ...f, plate: e.target.value }))}
              />
              <select
                className={selectCls}
                style={{ width: 'auto' }}
                value={createForm.plateType}
                onChange={(e) => setCreateForm((f) => ({ ...f, plateType: e.target.value as CreateClientForm['plateType'] }))}
              >
                <option value="russian">Авто</option>
                <option value="motorcycle">Мото</option>
                <option value="foreign">Ино</option>
              </select>
            </div>
          </FormRow>
          <FormRow label="Как узнал о нас">
            <select
              className={selectCls}
              value={createForm.referralSource}
              onChange={(e) => setCreateForm((f) => ({ ...f, referralSource: e.target.value }))}
            >
              <option value="">Не выбрано</option>
              {REFERRAL_SOURCES.map((source) => (
                <option key={source.value} value={source.value}>{source.label}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Примечание">
            <Textarea placeholder="Заметка о клиенте" value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} />
          </FormRow>
        </div>
        <div className="mt-5 pb-2">
          <Button size="lg" loading={createSaving} onClick={() => { void handleCreateSubmit(); }}>
            Создать клиента
          </Button>
        </div>
      </Sheet>
    </motion.div>
  );
}

function BookingHistoryCard({ booking }: { booking: Booking }) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  return (
    <div className="rounded-2xl border border-border bg-[var(--sunken,#EEEFF3)] p-3 dark:bg-white/5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {booking.service}
            {booking.services && booking.services.length > 0 && (
              <span className="ml-1 text-xs text-[var(--primary-600)]">+{booking.services.length}</span>
            )}
          </div>
          <div className={`mt-0.5 text-xs ${sub}`}>
            {booking.date} • {booking.time} • {booking.box || 'Без бокса'}
          </div>
        </div>
        <StatusBadge status={booking.status} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-[var(--card-raised,var(--card))] p-2">
          <div className={`text-[11px] ${sub}`}>Стоимость</div>
          <div><Money amount={booking.price} /></div>
        </div>
        <div className="rounded-xl bg-[var(--card-raised,var(--card))] p-2">
          <div className={`text-[11px] ${sub}`}>Оплата</div>
          <div>{paymentLabel(booking.paymentType, booking.paymentSettled)}</div>
        </div>
        <div className="rounded-xl bg-[var(--card-raised,var(--card))] p-2">
          <div className={`text-[11px] ${sub}`}>Авто</div>
          <div>{booking.car || 'Не указано'}</div>
        </div>
        <div className="rounded-xl bg-[var(--card-raised,var(--card))] p-2">
          <div className={`text-[11px] ${sub}`}>Номер</div>
          <div>{booking.plate || 'Не указан'}</div>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-xs">
        <div className={sub}>Длительность: {booking.duration} мин</div>
        <div className={sub}>
          Мастера: {booking.workers.length ? booking.workers.map((worker) => worker.workerName).join(', ') : 'Не назначены'}
        </div>
        <div className={sub}>Комментарий: {booking.notes?.trim() ? booking.notes : 'Нет комментария'}</div>
        <div className={sub}>Создано: {booking.createdAt.toLocaleString('ru-RU')}</div>
      </div>
    </div>
  );
}

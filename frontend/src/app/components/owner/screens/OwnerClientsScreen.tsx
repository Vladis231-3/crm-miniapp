import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Edit3, Phone, Plus, Trash2, Users } from 'lucide-react';
import { useApp, type Booking, type BookingStatus, type RegisteredClient } from '../../../context/AppContext';
import { ServiceSearchSelect } from '../../shared/ServiceSearchSelect';
import { SourceBadge } from '../../shared/SourceBadge';
import { REFERRAL_SOURCES } from '../../../constants/referralSources';
import { isClientCardIncomplete, normalizePlateInput, normalizeVehicleInput, type PlateType } from '../../../utils/validation';
import { parseFlexibleDate } from '../../../utils/date';
import { Button, toast } from '../../atmosfera';

type OwnerClientSearchMode = 'phone' | 'name' | 'plate';

type ClientCardDraft = {
  name: string; phone: string; car: string; plate: string; plateType: string;
  notes: string; debtBalance: string; adminRating: number; adminNote: string; referralSource: string;
};
type ClientVehicle = { car: string; plate: string; plateType?: string; isMain?: boolean };

/**
 * OwnerClientsScreen — вырезка из OwnerApp (§6.4, Фаза 5 / вырезка №2).
 * Реестр клиентов + карточка (заметки/долг/рейтинг/примечание/авто/история).
 * Стейты и хендлеры остаются в родителе (кросс-навигация gotoClient из архива/
 * money-flow, общие draft-и с отчётами) и приходят props.
 */
export function OwnerClientsScreen({
  settingsClientId,
  setSettingsClientId,
  settingsClientSearchMode,
  setSettingsClientSearchMode,
  settingsClientSearchQuery,
  setSettingsClientSearchQuery,
  editingSettingsClientCard,
  setEditingSettingsClientCard,
  clientHistoryServiceFilter,
  setClientHistoryServiceFilter,
  clientCardDrafts,
  setClientCardDrafts,
  savingClientId,
  draftVehicles,
  setDraftVehicles,
  onCreateClient,
  onDeleteClient,
  onSaveClientCard,
  onOpenBookingForClient,
  onSelectBooking,
  primary,
  glass,
  sub,
  inputCls,
  selectCls,
  isDark,
}: {
  settingsClientId: string | null;
  setSettingsClientId: (id: string | null) => void;
  settingsClientSearchMode: OwnerClientSearchMode;
  setSettingsClientSearchMode: (mode: OwnerClientSearchMode) => void;
  settingsClientSearchQuery: string;
  setSettingsClientSearchQuery: (query: string) => void;
  editingSettingsClientCard: boolean;
  setEditingSettingsClientCard: (value: boolean) => void;
  clientHistoryServiceFilter: string;
  setClientHistoryServiceFilter: (value: string) => void;
  clientCardDrafts: Record<string, ClientCardDraft>;
  setClientCardDrafts: React.Dispatch<React.SetStateAction<Record<string, ClientCardDraft>>>;
  savingClientId: string | null;
  draftVehicles: Record<string, ClientVehicle[]>;
  setDraftVehicles: React.Dispatch<React.SetStateAction<Record<string, ClientVehicle[]>>>;
  onCreateClient: () => void;
  onDeleteClient: (clientId: string, clientName: string) => Promise<void> | void;
  onSaveClientCard: (clientId: string, options?: { adminOnly?: boolean }) => Promise<void> | void;
  onOpenBookingForClient: (client: RegisteredClient, status?: BookingStatus) => void;
  onSelectBooking: (booking: Booking) => void;
  primary: string;
  glass: string;
  sub: string;
  inputCls: string;
  selectCls: string;
  isDark: boolean;
}) {
  const { clients, bookings, services } = useApp();

  // Черновики нового авто — используются только внутри этого экрана
  const [newVehicleCar, setNewVehicleCar] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');

  // ── Производные (скопированы из родителя 1-в-1) ──
  const filteredSettingsClients = clients.filter((client) => {
    if (!settingsClientSearchQuery.trim()) return true;
    if (settingsClientSearchMode === 'phone') {
      const normalized = normalizeOwnerPhoneSearchValue(settingsClientSearchQuery);
      return normalizeOwnerPhoneSearchValue(client.phone).includes(normalized);
    }
    if (settingsClientSearchMode === 'plate') {
      const normalized = normalizePlateInput(settingsClientSearchQuery);
      if (!normalized) return false;
      const plates = [
        client.plate,
        ...(client.vehicles || []).map((vehicle) => vehicle.plate),
      ]
        .map((plate) => normalizePlateInput(plate || ''))
        .filter(Boolean);
      return plates.some((plate) => plate.includes(normalized));
    }
    const query = settingsClientSearchQuery.trim().toLowerCase();
    return client.name.toLowerCase().includes(query);
  });
  const selectedSettingsClient = clients.find((client) => client.id === settingsClientId) ?? null;
  const selectedSettingsClientCardDraft = selectedSettingsClient ? clientCardDrafts[selectedSettingsClient.id] : undefined;
  const selectedSettingsClientBookings = selectedSettingsClient
    ? bookings
      .filter((booking) => booking.clientId === selectedSettingsClient.id)
      .sort((left, right) => {
        const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
        const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
        if (rightDate !== leftDate) return rightDate - leftDate;
        return right.time.localeCompare(left.time);
      })
    : [];
  const selectedSettingsClientFilteredBookings = selectedSettingsClientBookings.filter((booking) => {
    if (!clientHistoryServiceFilter) return true;
    const svc = services.find((s) => s.id === clientHistoryServiceFilter);
    if (!svc) return true;
    return booking.serviceId === svc.id || booking.service === svc.name;
  });
  const selectedSettingsClientVehicles = selectedSettingsClient
    ? (draftVehicles[selectedSettingsClient.id] ?? (selectedSettingsClient.vehicles?.length
      ? selectedSettingsClient.vehicles
      : [{ car: selectedSettingsClient.car || '', plate: selectedSettingsClient.plate || '', plateType: selectedSettingsClient.plateType || 'russian' }]))
    : [];
  const selectedSettingsClientSpent = selectedSettingsClientBookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + booking.price, 0);
  const selectedSettingsClientCompletedCount = selectedSettingsClientBookings.filter((booking) => booking.status === 'completed').length;
  const selectedSettingsClientUpcoming = selectedSettingsClientBookings.find((booking) => ['new', 'confirmed', 'scheduled', 'in_progress'].includes(booking.status));
  const selectedSettingsClientLastVisit = selectedSettingsClientBookings.find((booking) => booking.status === 'completed');

  const ownerStatusLabel = (status: string) => ({
    new: 'Новая',
    confirmed: 'Подтв.',
    scheduled: 'Запл.',
    in_progress: 'В работе',
    completed: 'Завершено',
    no_show: 'Не приехал',
    admin_review: 'Уточнение',
    cancelled: 'Отменена',
  }[status] || status);

  const ownerStatusBadge = (status: string) => ({
    new: 'bg-indigo-500/15 text-indigo-600',
    confirmed: 'bg-cyan-500/15 text-cyan-600',
    scheduled: 'bg-blue-500/15 text-blue-600',
    in_progress: 'bg-yellow-500/15 text-yellow-600',
    completed: 'bg-green-500/15 text-green-600',
    no_show: 'bg-orange-500/15 text-orange-600',
    admin_review: 'bg-amber-500/15 text-amber-600',
    cancelled: 'bg-red-500/15 text-red-500',
  }[status] || 'bg-slate-500/15 text-slate-600');

  function normalizeOwnerPhoneSearchValue(value: string) {
    return value.replace(/\D/g, '');
  }

  return (
    <motion.div key="s-clients" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <button onClick={() => { setSettingsClientId(null); }} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}><ArrowLeft size={16} strokeWidth={1.75} />Назад</button>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold">Клиенты</h2>
          <p className={`text-xs ${sub} mt-1`}>
            {selectedSettingsClient ? 'История услуг, оплаты, авто и внутренняя заметка по клиенту' : 'Открой клиента, чтобы посмотреть всю историю посещений'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectedSettingsClient && (
            <Button size="sm" onClick={onCreateClient}>
              <Plus size={14} strokeWidth={1.75} aria-hidden />
              Новый
            </Button>
          )}
          {selectedSettingsClient && (
            <Button size="sm" variant="secondary" onClick={() => { setSettingsClientId(null); setNewVehicleCar(''); setNewVehiclePlate(''); setClientHistoryServiceFilter(''); }}>
              <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
              Назад
            </Button>
          )}
        </div>
      </div>
      {!selectedSettingsClient && clients.length > 0 && (
        <div className={`${glass} rounded-2xl p-3 mb-4`}>
          <div className="flex gap-2 mb-3">
            {([
              { id: 'phone', label: 'По телефону' },
              { id: 'name', label: 'По имени' },
              { id: 'plate', label: 'По госномеру' },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSettingsClientSearchMode(option.id);
                  setSettingsClientSearchQuery('');
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm ${settingsClientSearchMode === option.id ? 'text-white' : sub}`}
                style={settingsClientSearchMode === option.id ? { background: primary } : undefined}
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            className={inputCls}
            type={settingsClientSearchMode === 'phone' ? 'tel' : 'text'}
            placeholder={settingsClientSearchMode === 'phone' ? '+7 (___) ___-__-__' : settingsClientSearchMode === 'plate' ? 'а123вс777' : 'Иван'}
            value={settingsClientSearchQuery}
            onChange={(event) => setSettingsClientSearchQuery(event.target.value)}
          />
        </div>
      )}
      {clients.length === 0 && (
        <div className={`${glass} rounded-2xl p-8 text-center`}>
          <Users size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
          <p className={sub}>Пока нет зарегистрированных клиентов</p>
        </div>
      )}
      {!selectedSettingsClient && filteredSettingsClients.map((client) => {
        const clientBookings = bookings.filter((booking) => booking.clientId === client.id);
        const spent = clientBookings.filter((booking) => booking.status === 'completed').reduce((sum, booking) => sum + booking.price, 0);
        const lastBooking = [...clientBookings].sort((left, right) => {
          const leftDate = parseFlexibleDate(left.date)?.getTime() ?? 0;
          const rightDate = parseFlexibleDate(right.date)?.getTime() ?? 0;
          if (rightDate !== leftDate) return rightDate - leftDate;
          return right.time.localeCompare(right.time);
        })[0];
        const clientDisplayName = client.name.trim() || 'Клиент без имени';
        const clientPhone = client.phone.trim();
        return (
          <div
            key={client.id}
            className={`${glass} rounded-2xl p-4 mb-3 cursor-pointer transition-transform hover:-translate-y-0.5`}
            onClick={() => { setSettingsClientId(client.id); setClientHistoryServiceFilter(''); }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSettingsClientId(client.id);
                setClientHistoryServiceFilter('');
              }
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: primary }}>{clientDisplayName.charAt(0).toUpperCase() || '?'}</div>
                {isClientCardIncomplete(client) && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--status-danger)] border-2 border-white dark:border-gray-900 shadow-lg shadow-red-500/50 animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{clientDisplayName}</div>
                <div className={`text-xs ${sub}`}>{client.car || 'Автомобиль не указан'}</div>
                {client.plate && <div className={`text-xs ${sub} font-mono`}>{client.plate}</div>}
                {clientPhone ? (
                  <a href={`tel:${clientPhone}`} className="text-xs flex items-center gap-1 mt-0.5" style={{ color: primary }} onClick={(event) => event.stopPropagation()}>
                    <Phone size={10} strokeWidth={1.75} aria-hidden />{clientPhone}
                  </a>
                ) : (
                  <div className={`text-xs ${sub} mt-0.5`}>Телефон не указан</div>
                )}
                <div className={`text-[11px] ${sub} mt-1`}>
                  {lastBooking ? `Последний визит: ${lastBooking.date} ${lastBooking.time}` : 'Истории посещений пока нет'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteClient(client.id, client.name);
                  }}
                  className="p-2 rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--status-danger) 10%, transparent)',
                    color: 'var(--status-danger)',
                  }}
                  aria-label={`Удалить клиента ${client.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <ChevronRight size={16} strokeWidth={1.75} className={sub} aria-hidden />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Записей', value: clientBookings.length },
                { label: 'Завершено', value: clientBookings.filter((booking) => booking.status === 'completed').length },
                { label: 'Потрачено', value: `${spent.toLocaleString('ru')} ₽` },
              ].map((item) => (
                <div key={item.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-2 text-center`}>
                  <div className="font-semibold text-sm">{item.value}</div>
                  <div className={`text-xs ${sub}`}>{item.label}</div>
                </div>
              ))}
            </div>
            <div className={`mt-3 text-xs ${sub} flex items-center justify-between gap-3`}>
              <span>{client.referralSource ? `Откуда: ${client.referralSource}` : 'Открой карточку, чтобы увидеть все услуги и детали клиента'}</span>
              <span>Рейтинг: {client.adminRating ? `${client.adminRating}/5` : 'без оценки'}</span>
            </div>
          </div>
        );
      })}
      {!selectedSettingsClient && clients.length > 0 && filteredSettingsClients.length === 0 && (
        <div className={`${glass} rounded-2xl p-6 text-center`}>
          <div className="font-medium mb-1">Ничего не найдено</div>
          <div className={`text-sm ${sub}`}>Попробуйте другое имя или телефон</div>
        </div>
      )}
      {selectedSettingsClient && (
        <div className="space-y-3">
          <div className={`${glass} rounded-2xl p-4`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: primary }}>
                  {(selectedSettingsClient.name.trim() || 'К').charAt(0).toUpperCase()}
                </div>
                {isClientCardIncomplete(selectedSettingsClient) && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--status-danger)] border-2 border-white dark:border-gray-900 shadow-lg shadow-red-500/50 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {editingSettingsClientCard ? (
                  <div className="space-y-2">
                    <input
                      className={inputCls}
                      placeholder="Имя клиента"
                      value={clientCardDrafts[selectedSettingsClient.id]?.name ?? selectedSettingsClient.name}
                      onChange={(event) => setClientCardDrafts((current) => ({
                        ...current,
                        [selectedSettingsClient.id]: {
                          ...current[selectedSettingsClient.id],
                          name: event.target.value,
                        },
                      }))}
                    />
                    <div className="space-y-2">
                      <input
                        className={inputCls}
                        placeholder="Автомобиль"
                        value={clientCardDrafts[selectedSettingsClient.id]?.car ?? selectedSettingsClient.car}
                        onChange={(event) => setClientCardDrafts((current) => ({
                          ...current,
                          [selectedSettingsClient.id]: {
                            ...current[selectedSettingsClient.id],
                            car: event.target.value,
                          },
                        }))}
                      />
                      <div className="flex gap-1.5">
                        <div className="flex flex-col gap-1 shrink-0">
                          {(['russian', 'motorcycle', 'foreign'] as PlateType[]).map((t) => {
                            const pt = (clientCardDrafts[selectedSettingsClient.id]?.plateType as PlateType) || selectedSettingsClient.plateType || 'russian';
                            return (
                              <button key={t} type="button"
                                className={`text-[10px] px-1.5 py-0.5 rounded ${pt === t ? 'text-white font-medium' : `${sub}`}`}
                                style={pt === t ? { background: primary } : {}}
                                onClick={() => setClientCardDrafts((current) => ({
                                  ...current,
                                  [selectedSettingsClient.id]: {
                                    ...current[selectedSettingsClient.id],
                                    plateType: t,
                                  },
                                }))}
                              >{t === 'russian' ? 'Авто' : t === 'motorcycle' ? 'Мото' : 'Ино'}</button>
                            );
                          })}
                        </div>
                        <input
                          className={`${inputCls} flex-1`}
                          placeholder="Госномер"
                          value={clientCardDrafts[selectedSettingsClient.id]?.plate ?? selectedSettingsClient.plate}
                          onChange={(event) => {
                            const pt = (clientCardDrafts[selectedSettingsClient.id]?.plateType as PlateType) || selectedSettingsClient.plateType || 'russian';
                            setClientCardDrafts((current) => ({
                              ...current,
                              [selectedSettingsClient.id]: {
                                ...current[selectedSettingsClient.id],
                                plate: normalizePlateInput(event.target.value, pt),
                              },
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <input
                      className={inputCls}
                      placeholder="Телефон"
                      value={clientCardDrafts[selectedSettingsClient.id]?.phone ?? selectedSettingsClient.phone}
                      onChange={(event) => setClientCardDrafts((current) => ({
                        ...current,
                        [selectedSettingsClient.id]: {
                          ...current[selectedSettingsClient.id],
                          phone: event.target.value,
                        },
                      }))}
                    />
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-lg">{(selectedSettingsClientCardDraft?.name ?? selectedSettingsClient.name).trim() || 'Клиент без имени'}</div>
                    <div className={`text-sm ${sub} mt-1`}>
                      {(selectedSettingsClientCardDraft?.car ?? selectedSettingsClient.car) || 'Авто не указано'}{(selectedSettingsClientCardDraft?.plate ?? selectedSettingsClient.plate) ? `, ${selectedSettingsClientCardDraft?.plate ?? selectedSettingsClient.plate}` : ''}
                    </div>
                    {selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone ? (
                      <a href={`tel:${selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone}`} className="text-sm flex items-center gap-1 mt-1" style={{ color: primary }}>
                        <Phone size={12} strokeWidth={1.75} aria-hidden />{selectedSettingsClientCardDraft?.phone ?? selectedSettingsClient.phone}
                      </a>
                    ) : (
                      <div className={`text-sm ${sub} mt-1`}>Телефон не указан</div>
                    )}
                    <div className={`text-sm ${sub} mt-1`}>
                      {(selectedSettingsClientCardDraft?.referralSource ?? selectedSettingsClient.referralSource) ? `Узнал: ${selectedSettingsClientCardDraft?.referralSource ?? selectedSettingsClient.referralSource}` : 'Откуда узнал: не указано'}
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setEditingSettingsClientCard(!editingSettingsClientCard)}
                  className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                  aria-label="Редактировать карточку"
                >
                  <Edit3 size={16} strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  onClick={() => void onDeleteClient(selectedSettingsClient.id, selectedSettingsClient.name)}
                  className="p-2 rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--status-danger) 10%, transparent)',
                    color: 'var(--status-danger)',
                  }}
                  aria-label={`Удалить клиента ${selectedSettingsClient.name}`}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            </div>
            {selectedSettingsClient.adminNote && (
              <div className="rounded-xl px-3 py-2.5 mb-4 text-sm border" style={{
                background: 'color-mix(in srgb, var(--status-warning) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--status-warning) 25%, transparent)',
                color: 'var(--status-warning)',
              }}>
                <div className="text-xs font-medium mb-1">⚑ Примечание:</div>
                {selectedSettingsClient.adminNote}
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                className="flex-1"
                onClick={() => onOpenBookingForClient(selectedSettingsClient, 'completed')}
              >
                <Plus size={16} strokeWidth={1.75} aria-hidden />
                Прошлая запись
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => onOpenBookingForClient(selectedSettingsClient, 'confirmed')}
              >
                <Plus size={16} strokeWidth={1.75} aria-hidden />
                Новая запись
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Всего записей', value: selectedSettingsClientBookings.length },
                { label: 'Завершённых', value: selectedSettingsClientCompletedCount },
                { label: 'Потрачено', value: `${selectedSettingsClientSpent.toLocaleString('ru')} ₽` },
                { label: 'Долг', value: `${selectedSettingsClient.debtBalance.toLocaleString('ru')} ₽` },
              ].map((item) => (
                <div key={item.label} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                  <div className="font-semibold">{item.value}</div>
                  <div className={`text-xs ${sub}`}>{item.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                <div className={`text-xs ${sub} mb-1`}>Ближайшая запись</div>
                <div className="text-sm">
                  {selectedSettingsClientUpcoming
                    ? `${selectedSettingsClientUpcoming.date} ${selectedSettingsClientUpcoming.time} • ${selectedSettingsClientUpcoming.service}`
                    : 'Нет активных записей'}
                </div>
              </div>
              <div className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3`}>
                <div className={`text-xs ${sub} mb-1`}>Последний завершённый визит</div>
                <div className="text-sm">
                  {selectedSettingsClientLastVisit
                    ? `${selectedSettingsClientLastVisit.date} ${selectedSettingsClientLastVisit.time} • ${selectedSettingsClientLastVisit.service}`
                    : 'Пока нет завершённых услуг'}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Заметки по клиенту</label>
                <textarea
                  className={`${inputCls} h-24 resize-none`}
                  placeholder="Общие заметки"
                  value={clientCardDrafts[selectedSettingsClient.id]?.notes ?? selectedSettingsClient.notes ?? ''}
                  onChange={(event) => setClientCardDrafts((current) => ({
                    ...current,
                    [selectedSettingsClient.id]: {
                      ...current[selectedSettingsClient.id],
                      notes: event.target.value,
                    },
                  }))}
                />
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Долг клиента</label>
                <input
                  className={inputCls}
                  type="number"
                  placeholder="0"
                  value={clientCardDrafts[selectedSettingsClient.id]?.debtBalance ?? String(selectedSettingsClient.debtBalance || 0)}
                  onChange={(event) => setClientCardDrafts((current) => ({
                    ...current,
                    [selectedSettingsClient.id]: {
                      ...current[selectedSettingsClient.id],
                      debtBalance: event.target.value,
                    },
                  }))}
                />
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Рейтинг клиента для админа</label>
                <select
                  className={selectCls}
                  value={clientCardDrafts[selectedSettingsClient.id]?.adminRating ?? 0}
                  onChange={(event) => setClientCardDrafts((current) => ({
                    ...current,
                    [selectedSettingsClient.id]: {
                      ...current[selectedSettingsClient.id],
                      adminRating: Number(event.target.value),
                    },
                  }))}
                >
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>{value === 0 ? 'Без оценки' : `${value}/5`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Внутреннее примечание</label>
                <textarea
                  className={`${inputCls} min-h-[100px] resize-none`}
                  placeholder="Видно только администратору"
                  value={clientCardDrafts[selectedSettingsClient.id]?.adminNote ?? ''}
                  onChange={(event) => setClientCardDrafts((current) => ({
                    ...current,
                    [selectedSettingsClient.id]: {
                      ...current[selectedSettingsClient.id],
                      adminNote: event.target.value,
                    },
                  }))}
                />
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Как узнал о нас</label>
                <select
                  className={selectCls}
                  value={clientCardDrafts[selectedSettingsClient.id]?.referralSource ?? ''}
                  onChange={(event) => setClientCardDrafts((current) => ({
                    ...current,
                    [selectedSettingsClient.id]: {
                      ...current[selectedSettingsClient.id],
                      referralSource: event.target.value,
                    },
                  }))}
                >
                  {REFERRAL_SOURCES.map((source) => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => { void onSaveClientCard(selectedSettingsClient.id); }}
                disabled={savingClientId === selectedSettingsClient.id}
                className="w-full"
              >
                {savingClientId === selectedSettingsClient.id ? 'Сохраняем...' : 'Сохранить карточку клиента'}
              </Button>
            </div>
          </div>
          <div className={`${glass} rounded-2xl p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Автомобили клиента <span className={`text-xs font-normal ${sub}`}>({selectedSettingsClientVehicles.length}/10)</span></div>
            </div>
            {selectedSettingsClientVehicles.length === 0 ? (
              <div className={`text-sm ${sub} mb-3`}>Автомобили ещё не добавлены</div>
            ) : (
              <div className="space-y-2">
                {selectedSettingsClientVehicles.map((vehicle, index) => {
                  const isMain = vehicle.isMain ?? index === 0;
                  return (
                    <div key={`${vehicle.car}-${vehicle.plate}-${index}`} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-xl p-3 flex items-center justify-between gap-3 ${isMain ? 'ring-1' : ''}`} style={isMain ? { '--tw-ring-color': 'var(--status-warning)' } as React.CSSProperties : undefined}>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {vehicle.car || 'Авто без названия'}
                          {isMain && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--status-warning) 18%, transparent)', color: 'var(--status-warning)' }}>Основное</span>}
                        </div>
                        <div className={`text-xs ${sub}`}>{vehicle.plate || 'Номер не указан'}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isMain && (
                          <button
                            type="button"
                            title="Сделать основным"
                            onClick={() => {
                              const client = selectedSettingsClient;
                              if (!client) return;
                              const current = [...(draftVehicles[client.id] ?? (client.vehicles?.length
                                ? client.vehicles
                                : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]))];
                              setDraftVehicles((prev) => ({
                                ...prev,
                                [client.id]: current.map((v, i) => ({
                                  ...v,
                                  isMain: i === index,
                                })),
                              }));
                              const selected = current[index];
                              setClientCardDrafts((prev) => ({
                                ...prev,
                                [client.id]: {
                                  name: prev[client.id]?.name ?? client.name,
                                  phone: prev[client.id]?.phone ?? client.phone,
                                  car: selected.car || '',
                                  plate: selected.plate || '',
                                  plateType: selected.plateType || 'russian',
                                  notes: prev[client.id]?.notes ?? client.notes ?? '',
                                  debtBalance: prev[client.id]?.debtBalance ?? String(client.debtBalance || 0),
                                  adminRating: prev[client.id]?.adminRating ?? client.adminRating,
                                  adminNote: prev[client.id]?.adminNote ?? client.adminNote ?? '',
                                  referralSource: prev[client.id]?.referralSource ?? client.referralSource ?? '',
                                },
                              }));
                            }}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-black/5 text-black/20'}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        )}
                        {isMain && (
                          <span className="p-1.5" style={{ color: 'var(--status-warning)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const client = selectedSettingsClient;
                            if (!client) return;
                            const current = draftVehicles[client.id] ?? (client.vehicles?.length
                              ? client.vehicles
                              : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]);
                            setDraftVehicles((prev) => ({
                              ...prev,
                              [client.id]: current.filter((_, i) => i !== index),
                            }));
                            toast({ type: 'success', title: 'Авто удалено' });
                          }}
                          className="p-1.5 rounded-lg"
                          style={{
                            background: 'color-mix(in srgb, var(--status-danger) 10%, transparent)',
                            color: 'var(--status-danger)',
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedSettingsClientVehicles.length < 10 && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={inputCls}
                    placeholder="Марка авто"
                    value={newVehicleCar}
                    onChange={(e) => setNewVehicleCar(e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Госномер"
                    maxLength={9}
                    value={newVehiclePlate}
                    onChange={(e) => setNewVehiclePlate(normalizePlateInput(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  disabled={!newVehicleCar.trim() && !newVehiclePlate.trim()}
                  onClick={() => {
                    const client = selectedSettingsClient;
                    if (!client) return;
                    const current = draftVehicles[client.id] ?? (client.vehicles?.length
                      ? client.vehicles
                      : [{ car: client.car || '', plate: client.plate || '', plateType: client.plateType || 'russian' }]);
                    setDraftVehicles((prev) => ({
                      ...prev,
                      [client.id]: [...current, { car: normalizeVehicleInput(newVehicleCar), plate: normalizePlateInput(newVehiclePlate), plateType: 'russian' }],
                    }));
                    setNewVehicleCar('');
                    setNewVehiclePlate('');
                    toast({ type: 'success', title: 'Авто добавлено' });
                  }}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  style={{ color: primary }}
                >
                  <Plus size={14} strokeWidth={1.75} aria-hidden />
                  Добавить авто
                </button>
              </div>
            )}
          </div>
          <div className={`${glass} rounded-2xl p-4`}>
            <div className="font-semibold mb-3">История услуг</div>
            {selectedSettingsClientBookings.length > 0 && (
              <div className="mb-3">
                <ServiceSearchSelect
                  value={clientHistoryServiceFilter}
                  services={services}
                  selectCls={selectCls}
                  inputCls={inputCls}
                  glass={glass}
                  text={isDark ? 'text-[#E4E4E7]' : 'text-[#131316]'}
                  sub={sub}
                  primary={primary}
                  isDark={isDark}
                  placeholder="Поиск по услугам"
                  onChange={setClientHistoryServiceFilter}
                />
              </div>
            )}
            {selectedSettingsClientFilteredBookings.length === 0 ? (
              <div className={`text-sm ${sub}`}>
                {selectedSettingsClientBookings.length === 0
                  ? 'У клиента пока нет записей'
                  : 'По выбранной услуге записей нет'}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSettingsClientFilteredBookings.map((booking) => (
                  <div key={booking.id} className={`${isDark ? 'bg-white/5' : 'bg-black/3'} rounded-2xl p-3`}>
                    <div className="flex items-start gap-3 mb-2">
                      <div className="min-w-0 overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                          <div className="font-medium text-sm truncate">{booking.service}{booking.services && booking.services.length > 0 ? <span className="ml-1 text-xs" style={{ color: primary }}>+{booking.services.length}</span> : ''}</div>
                          <SourceBadge source={booking.source} />
                          {booking.isRepeatVisit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'color-mix(in srgb, var(--status-info) 14%, transparent)', color: 'var(--status-info)' }}>Повторный</span>
                          )}
                        </div>
                        <div className={`text-xs ${sub} mt-0.5`}>
                          {booking.date} • {booking.time} • {booking.box || 'Без бокса'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[11px] ${ownerStatusBadge(booking.status)}`}>
                        {ownerStatusLabel(booking.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectBooking(booking)}
                        className={`p-1.5 rounded-lg shrink-0 ${isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-black/5 text-black/40 hover:bg-black/10'}`}
                        title="Редактировать запись"
                      >
                        <Edit3 size={14} strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                        <div className={`text-[11px] ${sub}`}>Стоимость</div>
                        <div>{booking.price.toLocaleString('ru')} ₽</div>
                      </div>
                      <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                        <div className={`text-[11px] ${sub}`}>Оплата</div>
                        <div>{ownerPaymentLabel(booking.paymentType, booking.paymentSettled)}</div>
                      </div>
                      <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                        <div className={`text-[11px] ${sub}`}>Авто</div>
                        <div>{booking.car || 'Не указано'}</div>
                      </div>
                      <div className={`${isDark ? 'bg-white/5' : 'bg-white/60'} rounded-xl p-2`}>
                        <div className={`text-[11px] ${sub}`}>Номер</div>
                        <div>{booking.plate || 'Не указан'}</div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className={sub}>Длительность: {booking.duration} мин</div>
                      <div className={sub}>Мастера: {booking.workers.length ? booking.workers.map((worker) => worker.workerName).join(', ') : 'Не назначены'}</div>
                      <div className={sub}>Комментарий: {booking.notes?.trim() ? booking.notes : 'Нет комментария'}</div>
                      <div className={sub}>Создано: {booking.createdAt.toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Скопировано из родителя 1-в-1 (OwnerApp.tsx:600)
function ownerPaymentLabel(paymentType: 'cash' | 'transfer' | 'invoice', paymentSettled: boolean) {
  if (!paymentSettled) return 'Не оплачено';
  if (paymentType === 'transfer') return 'Перевод';
  if (paymentType === 'invoice') return 'По счёту';
  return 'Наличные';
}

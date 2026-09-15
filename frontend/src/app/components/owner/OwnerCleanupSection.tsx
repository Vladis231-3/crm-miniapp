import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Trash2, RotateCcw, RefreshCw, AlertTriangle, ArchiveRestore } from 'lucide-react';
import { apiRequest } from '../../api';

interface PreviewItem {
  entity: string;
  title: string;
  description: string;
  count: number;
}

interface PreviewPayload {
  mode: string;
  dateFrom: string;
  dateTo: string;
  olderThanDays: number | null;
  cutoffDate: string;
  expiresAt: string | null;
  items: PreviewItem[];
  total: number;
}

interface BatchPayload {
  id: string;
  createdAt: string;
  mode: string;
  dateFrom: string;
  dateTo: string;
  olderThanDays: number | null;
  entities: string[];
  counts: Record<string, number>;
  total: number;
  expiresAt: string | null;
  status: string;
  activeItems: number;
  restoredItems: number;
}

interface TrashItem {
  id: string;
  batchId: string;
  entityType: string;
  entityTitle: string;
  entityId: string;
  label: string;
  itemDate: string;
  deletedAt: string;
  expiresAt: string | null;
  daysLeft: number;
}

const ENTITY_ORDER = ['bookings', 'clients', 'incomes', 'expenses', 'piggy', 'payroll', 'writeoffs', 'notifications'];

const ENTITY_FALLBACK: Record<string, { title: string; description: string }> = {
  bookings: { title: 'Записи', description: 'Записи клиентов: брони, визиты, статусы и привязки мастеров. Уберутся из календаря, истории и расчётов.' },
  clients: { title: 'Клиенты', description: 'Клиенты: карточки, телефоны, авто и депозиты. Сами записи при этом остаются, скрывается только карточка.' },
  incomes: { title: 'Доходы', description: 'Доп. доходы: ручные поступления вне записей.' },
  expenses: { title: 'Расходы', description: 'Расходы: закупки, аренда и прочие траты вне зарплаты.' },
  piggy: { title: 'Копилка', description: 'Копилка: накопления процента с записей и траты из копилки.' },
  payroll: { title: 'Зарплата', description: 'Зарплата: начисления, авансы, выплаты и удержания мастеров.' },
  writeoffs: { title: 'Списания склада', description: 'Списания склада: расход материалов.' },
  notifications: { title: 'Уведомления', description: 'Уведомления: служебные сообщения.' },
};

export function OwnerCleanupSection({
  glass,
  inputCls,
  sub,
  primary,
  isDark,
  onBack,
}: {
  glass: string;
  inputCls: string;
  sub: string;
  primary: string;
  isDark: boolean;
  onBack: () => void;
}) {
  const [entities, setEntities] = useState<string[]>(['bookings', 'incomes', 'expenses', 'piggy']);
  const [mode, setMode] = useState<'range' | 'older_than'>('range');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [olderThanDays, setOlderThanDays] = useState('365');
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchPayload[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [trashTotal, setTrashTotal] = useState(0);
  const [trashFilter, setTrashFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    try {
      const data = await apiRequest<BatchPayload[]>('/api/owner/data-cleanup/batches');
      setBatches(data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadTrash = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (trashFilter) params.set('entity', trashFilter);
      const data = await apiRequest<{ items: TrashItem[]; total: number }>(`/api/owner/trash?${params.toString()}`);
      setTrash(data.items);
      setTrashTotal(data.total);
    } catch {
      /* ignore */
    }
  }, [trashFilter]);

  useEffect(() => {
    void loadBatches();
    void loadTrash();
  }, [loadBatches, loadTrash]);

  const toggleEntity = (id: string) => {
    setEntities((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
    setPreview(null);
    setArmed(false);
  };

  const handlePreview = async () => {
    setError(null);
    setInfo(null);
    setArmed(false);
    if (entities.length === 0) {
      setError('Выберите хотя бы одну сущность.');
      return;
    }
    if (mode === 'range' && !dateFrom && !dateTo) {
      setError('Укажите период: дату от и/или до.');
      return;
    }
    if (mode === 'older_than' && (!Number(olderThanDays) || Number(olderThanDays) < 1)) {
      setError('Укажите давность в днях (≥ 1).');
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await apiRequest<PreviewPayload>('/api/owner/data-cleanup/preview', {
        method: 'POST',
        body: {
          entities,
          mode,
          dateFrom: dateFrom || '',
          dateTo: dateTo || '',
          olderThanDays: mode === 'older_than' ? Number(olderThanDays) : null,
        },
      });
      // Подставляем серверные описания, если пришли.
      setPreview(data);
      if (data.total === 0) setInfo('По заданному периоду ничего не найдено — удалять нечего.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось построить предпросмотр');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    setError(null);
    setInfo(null);
    if (!preview || preview.total === 0) {
      setError('Сначала постройте предпросмотр с ненулевым количеством.');
      return;
    }
    if (!armed) {
      setArmed(true);
      return;
    }
    setExecuteLoading(true);
    try {
      const data = await apiRequest<{ batchId: string; message: string; total: number }>(
        '/api/owner/data-cleanup/execute',
        {
          method: 'POST',
          body: {
            entities,
            mode,
            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
            olderThanDays: mode === 'older_than' ? Number(olderThanDays) : null,
          },
        },
      );
      setInfo(data.message);
      setPreview(null);
      setArmed(false);
      await loadBatches();
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить очистку');
    } finally {
      setExecuteLoading(false);
    }
  };

  const handleRestoreBatch = async (batchId: string) => {
    setBusyId(batchId);
    setError(null);
    try {
      const data = await apiRequest<{ message: string }>('/api/owner/trash/restore', {
        method: 'POST',
        body: { batchId },
      });
      setInfo(data.message);
      await loadBatches();
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось восстановить');
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeBatch = async (batchId: string) => {
    if (!window.confirm('Удалить безвозвратно весь пакет? Это действие нельзя отменить.')) return;
    setBusyId(batchId);
    setError(null);
    try {
      const data = await apiRequest<{ message: string }>('/api/owner/trash/purge', {
        method: 'POST',
        body: { batchId },
      });
      setInfo(data.message);
      await loadBatches();
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить навсегда');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreItem = async (id: string) => {
    setBusyId(id);
    try {
      const data = await apiRequest<{ message: string }>('/api/owner/trash/restore', {
        method: 'POST',
        body: { itemIds: [id] },
      });
      setInfo(data.message);
      await loadBatches();
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось восстановить запись');
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeItem = async (id: string) => {
    if (!window.confirm('Удалить запись безвозвратно?')) return;
    setBusyId(id);
    try {
      const data = await apiRequest<{ message: string }>('/api/owner/trash/purge', {
        method: 'POST',
        body: { itemIds: [id] },
      });
      setInfo(data.message);
      await loadBatches();
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить запись');
    } finally {
      setBusyId(null);
    }
  };

  const previewItems = preview?.items ?? [];

  return (
    <div className="px-4 py-4">
      <button onClick={onBack} className={`flex items-center gap-2 ${sub} mb-4 text-sm`}>
        <ArrowLeft size={16} strokeWidth={1.75} />
        Назад
      </button>
      <h2 className="font-semibold mb-1">Очистка данных</h2>
      <p className={`text-xs ${sub} mb-4`}>
        Выборочное удаление за период с корзиной на 30 дней. Удащённое скрывается из календаря, финансов и
        отчётов, но его можно вернуть до истечения срока.
      </p>

      <div className={`${glass} rounded-2xl p-4 mb-3`}>
        <div className={`text-xs font-medium ${sub} mb-3`}>ЧТО УДАЛЯЕМ</div>
        <div className="space-y-2">
          {ENTITY_ORDER.map((id) => {
            const meta = previewItems.find((i) => i.entity === id);
            const fb = ENTITY_FALLBACK[id];
            const checked = entities.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleEntity(id)}
                className={`${glass} w-full rounded-2xl p-3 text-left transition-all ${checked ? 'ring-2' : ''}`}
                style={checked ? { outline: `2px solid ${primary}`, outlineOffset: '-2px' } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {meta?.title ?? fb.title}
                      {typeof meta?.count === 'number' && (
                        <span className={`ml-2 text-xs font-semibold ${sub}`}>· {meta.count} шт.</span>
                      )}
                    </div>
                    <div className={`text-xs ${sub} mt-1`}>{meta?.description ?? fb.description}</div>
                  </div>
                  <div
                    className="h-6 min-w-6 rounded-full px-2 flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                    style={{ background: checked ? primary : '#9CA3AF' }}
                  >
                    {checked ? 'Да' : 'Нет'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${glass} rounded-2xl p-4 mb-3`}>
        <div className={`text-xs font-medium ${sub} mb-3`}>ЗА КАКОЙ ПЕРИОД</div>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => { setMode('range'); setPreview(null); setArmed(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode === 'range' ? 'text-white' : glass} ${mode !== 'range' ? sub : ''}`}
            style={mode === 'range' ? { background: primary } : undefined}
          >
            Диапазон дат
          </button>
          <button
            type="button"
            onClick={() => { setMode('older_than'); setPreview(null); setArmed(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${mode === 'older_than' ? 'text-white' : glass} ${mode !== 'older_than' ? sub : ''}`}
            style={mode === 'older_than' ? { background: primary } : undefined}
          >
            Старше N дней
          </button>
        </div>
        {mode === 'range' ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={`text-xs ${sub} block mb-1`}>Дата от</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPreview(null); setArmed(false); }} className={`${inputCls} rounded-xl px-3 py-2 text-sm w-full`} />
            </div>
            <div className="flex-1">
              <label className={`text-xs ${sub} block mb-1`}>Дата до</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPreview(null); setArmed(false); }} className={`${inputCls} rounded-xl px-3 py-2 text-sm w-full`} />
            </div>
          </div>
        ) : (
          <div>
            <label className={`text-xs ${sub} block mb-1`}>Удалять всё старше (дней)</label>
            <input type="number" min={1} max={3650} value={olderThanDays} onChange={(e) => { setOlderThanDays(e.target.value); setPreview(null); setArmed(false); }} className={`${inputCls} rounded-xl px-3 py-2 text-sm w-full`} />
            {preview?.cutoffDate && <div className={`text-xs ${sub} mt-2`}>Граница: всё с датой ≤ {preview.cutoffDate}</div>}
          </div>
        )}
        <div className={`text-xs ${sub} mt-3`}>
          По дате сущности: у записей/доходов/расходов/копилки — дата операции; у клиентов, уведомлений, зарплаты
          и списаний — дата создания (у зарплаты — дата периода, если задана).
        </div>
      </div>

      <div className={`${glass} rounded-2xl p-4 mb-3`}>
        <div className={`text-xs font-medium ${sub} mb-3`}>ПРЕДПРОСМОТР И ЗАПУСК</div>
        <button
          type="button"
          onClick={() => void handlePreview()}
          disabled={previewLoading}
          className="w-full py-3 rounded-2xl text-white font-semibold disabled:opacity-60"
          style={{ background: primary }}
        >
          {previewLoading ? 'Считаем…' : 'Показать, что будет удалено'}
        </button>
        {preview && (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {preview.items.map((item) => (
                <div key={item.entity} className={`${glass} rounded-xl px-3 py-2`}>
                  <div className={`text-[11px] ${sub}`}>{item.title}</div>
                  <div className="text-sm font-semibold mt-1">{item.count} шт.</div>
                </div>
              ))}
            </div>
            <div className={`text-xs ${sub} mt-2`}>
              Всего: {preview.total} шт.
              {preview.expiresAt && <> · корзина до {new Date(preview.expiresAt).toLocaleDateString('ru-RU')}</>}
            </div>
            <button
              type="button"
              onClick={() => void handleExecute()}
              disabled={executeLoading || preview.total === 0}
              className="w-full mt-3 py-3 rounded-2xl text-white font-semibold disabled:opacity-50"
              style={{ background: '#EF4444' }}
            >
              {executeLoading ? 'Перемещаем в корзину…' : armed ? `Подтвердить удаление (${preview.total} шт.)` : 'Удалить за период в корзину'}
            </button>
            {armed && <div className="mt-2 text-xs text-red-500">Нажмите ещё раз для подтверждения. Операция обратима в течение 30 дней.</div>}
          </div>
        )}
        {error && <div className="mt-3 text-xs text-red-500">{error}</div>}
        {info && <div className="mt-3 text-xs text-green-600">{info}</div>}
      </div>

      <div className={`${glass} rounded-2xl p-4 mb-3`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs font-medium ${sub}`}>ИСТОРИЯ ОЧИСТОК</div>
          <button onClick={() => { void loadBatches(); void loadTrash(); }} className={`text-xs ${sub} flex items-center gap-1`}>
            <RefreshCw size={12} /> Обновить
          </button>
        </div>
        {batches.length === 0 ? (
          <div className={`text-xs ${sub}`}>Очисток пока не было.</div>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.id} className={`${glass} rounded-xl p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">
                      {b.mode === 'older_than' ? `Старше ${b.olderThanDays} дн.` : `${b.dateFrom || '…'} — ${b.dateTo || '…'}`} · {b.total} шт.
                    </div>
                    <div className={`text-[11px] ${sub} mt-1`}>
                      {new Date(b.createdAt).toLocaleString('ru-RU')} · активно: {b.activeItems} · восстановлено: {b.restoredItems} · {b.status}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button disabled={b.activeItems === 0 || busyId === b.id} onClick={() => void handleRestoreBatch(b.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#10B981' }}>
                    Вернуть всё
                  </button>
                  <button disabled={b.activeItems === 0 || busyId === b.id} onClick={() => void handlePurgeBatch(b.id)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border disabled:opacity-50 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    Удалить навсегда
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${glass} rounded-2xl p-4 mb-3`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-xs font-medium ${sub} flex items-center gap-1.5`}>
            <ArchiveRestore size={13} /> КОРЗИНА · {trashTotal} шт.
          </div>
          <select value={trashFilter} onChange={(e) => setTrashFilter(e.target.value)} className={`${inputCls} !w-auto text-xs px-2 py-1.5 rounded-lg`}>
            <option value="">Все типы</option>
            {ENTITY_ORDER.map((id) => (
              <option key={id} value={id}>{ENTITY_FALLBACK[id]?.title ?? id}</option>
            ))}
          </select>
        </div>
        {trash.length === 0 ? (
          <div className={`text-xs ${sub} flex items-center gap-1.5`}>
            <Trash2 size={13} /> Корзина пуста.
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {trash.slice(0, 200).map((t) => (
              <div key={t.id} className={`${glass} rounded-xl p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{t.entityTitle} · {t.label || t.entityId}</div>
                    <div className={`text-[11px] ${sub} mt-1`}>
                      {t.itemDate && <>{t.itemDate} · </>}удалено {new Date(t.deletedAt).toLocaleString('ru-RU')} · осталось {t.daysLeft} дн.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button disabled={busyId === t.id} onClick={() => void handleRestoreItem(t.id)} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1" style={{ background: '#10B981' }}>
                    <RotateCcw size={11} /> Вернуть
                  </button>
                  <button disabled={busyId === t.id} onClick={() => void handlePurgeItem(t.id)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border disabled:opacity-50 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                    Навсегда
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className={`text-[11px] ${sub} mt-3 flex items-start gap-1.5`}>
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          Через 30 дней корзина удаляется автоматически и безвозвратно.
        </div>
      </div>
    </div>
  );
}

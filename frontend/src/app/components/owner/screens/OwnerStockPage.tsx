import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Box, History, Package, Plus, X } from 'lucide-react';
import { apiBlobUrl } from '../../../api';
import { useApp, type AdminShiftInspection, type ShiftChecklist, type StockWriteOff } from '../../../context/AppContext';
import { Button, Dialog, FormRow, Input, Money, Sheet, toast } from '../../atmosfera';

const STOCK_UNITS = ['л', 'кг', 'шт', 'фл', 'м', 'п.м', 'уп'];

interface OwnerStockPageProps {
  shiftChecklists: ShiftChecklist[];
  adminShiftInspections: AdminShiftInspection[];
}

/**
 * OwnerStockPage — вырезка из OwnerApp (§6.4, Фаза 5 / вырезка №1).
 * Склад как у админа (DS Sheet/Dialog вместо prompt/confirm) + блоки
 * чек-листов смен мастеров и «Открытие смены» (owner-only данные приходят props).
 */
export function OwnerStockPage({ shiftChecklists, adminShiftInspections }: OwnerStockPageProps) {
  const {
    session,
    stockItems,
    stockCategories,
    addStockItem,
    deleteStockItem,
    writeOffStock,
    getWriteOffHistory,
    addStockCategory,
    updateStockCategory,
    deleteStockCategory,
  } = useApp();
  const isAccountant = session?.role === 'accountant';

  const [showAddStock, setShowAddStock] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState<string | null>(null);
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [writeOffHistory, setWriteOffHistory] = useState<StockWriteOff[]>([]);
  const [showWriteOffHistory, setShowWriteOffHistory] = useState(false);
  const parentCategories = stockCategories.filter(c => !c.parentId);
  const [stockForm, setStockForm] = useState({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit' as 'unit' | 'total', category: parentCategories[0]?.name || 'Химия', categoryId: '' });
  // Инлайн-переименование категорий (замена window.prompt)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  // Подтверждения удаления (замена window.confirm)
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<{ id: string; name: string; isChild: boolean } | null>(null);
  const [pendingItemDelete, setPendingItemDelete] = useState<{ id: string; name: string } | null>(null);
  // Инлайн-добавление категорий (замена window.prompt)
  const [addingRootCategory, setAddingRootCategory] = useState(false);
  const [newRootCategoryName, setNewRootCategoryName] = useState('');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  // Blob-URL фото открытия смены (логика перенесена из родителя 1-в-1)
  const [adminShiftPhotoUrls, setAdminShiftPhotoUrls] = useState<Record<string, string>>({});
  const adminShiftPhotoUrlsRef = useRef<Record<string, string>>({});

  const latestShiftChecklists = shiftChecklists.slice(0, 10);
  const latestAdminShiftInspections = adminShiftInspections.slice(0, 8);
  const latestAdminShiftInspectionKey = latestAdminShiftInspections.map((inspection) => `${inspection.id}:${inspection.floorPhotoUrl}`).join('|');

  const totalStockValue = stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  useEffect(() => {
    adminShiftPhotoUrlsRef.current = adminShiftPhotoUrls;
  }, [adminShiftPhotoUrls]);

  useEffect(() => {
    let cancelled = false;
    const activeIds = new Set(latestAdminShiftInspections.map((inspection) => inspection.id));
    setAdminShiftPhotoUrls((current) => {
      const next: Record<string, string> = {};
      Object.entries(current).forEach(([id, url]) => {
        if (activeIds.has(id)) {
          next[id] = url;
        } else {
          URL.revokeObjectURL(url);
        }
      });
      return next;
    });

    const currentPhotoUrls = adminShiftPhotoUrlsRef.current;
    const missing = latestAdminShiftInspections.filter((inspection) => inspection.floorPhotoUrl && !currentPhotoUrls[inspection.id]);
    void Promise.all(
      missing.map(async (inspection) => ({
        id: inspection.id,
        url: await apiBlobUrl(inspection.floorPhotoUrl),
      })),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((item) => URL.revokeObjectURL(item.url));
        return;
      }
      setAdminShiftPhotoUrls((current) => {
        const next = { ...current };
        loaded.forEach((item) => {
          if (next[item.id]) {
            URL.revokeObjectURL(item.url);
            return;
          }
          next[item.id] = item.url;
        });
        return next;
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAdminShiftInspectionKey]);
  useEffect(() => () => {
    Object.values(adminShiftPhotoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (showWriteOffHistory) {
      getWriteOffHistory().then(setWriteOffHistory).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWriteOffHistory]);

  const handleAddStock = () => {
    if (!stockForm.name || !stockForm.qty) return;
    const parentCats = stockCategories.filter(c => !c.parentId);
    const qty = Number(stockForm.qty.replace(',', '.'));
    const rawPrice = Number(stockForm.unitPrice.replace(',', '.'));
    const unitPrice = stockForm.priceMode === 'total' && qty > 0 ? rawPrice / qty : rawPrice;
    addStockItem({ name: stockForm.name, qty, unit: stockForm.unit, unitPrice, category: stockForm.category, categoryId: stockForm.categoryId || undefined });
    setShowAddStock(false);
    setStockForm({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit', category: parentCats[0]?.name || 'Химия', categoryId: '' });
    toast({ type: 'success', title: `Товар "${stockForm.name}" добавлен на склад` });
  };

  const handleWriteOff = () => {
    if (!showWriteOff) return;
    const item = stockItems.find(s => s.id === showWriteOff);
    writeOffStock(showWriteOff, Number(writeOffQty.replace(',', '.')));
    setShowWriteOff(null);
    setWriteOffQty('1');
    if (item) {
      toast({ type: 'success', title: `Списано: ${item.name} — ${writeOffQty} ${item.unit}` });
    }
  };

  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const selectCls = inputCls;

  return (
    <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Склад</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddStock(true)}>
            <Plus size={14} strokeWidth={1.75} aria-hidden />
            Добавить товар
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowCategoryManager(true)}>
            Категории
          </Button>
        </div>
      </div>
      <div className={`${glass} rounded-2xl p-3 mb-4 flex justify-between items-center`}>
        <div>
          <div className={`text-xs ${sub}`}>Стоимость склада</div>
          <div className="font-bold" style={{ color: 'var(--status-success)' }}>
            <Money amount={totalStockValue} />
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs ${sub}`}>Позиций</div>
          <div className="font-bold">{stockItems.length}</div>
        </div>
      </div>
      {parentCategories.map(parent => {
        const children = stockCategories.filter(c => c.parentId === parent.id);
        const parentItems = stockItems.filter(item => {
          if (item.categoryId) {
            const itemCat = stockCategories.find(c => c.id === item.categoryId);
            return itemCat && (itemCat.id === parent.id || itemCat.parentId === parent.id);
          }
          return item.category === parent.name;
        });
        if (parentItems.length === 0) return null;
        return (
          <div key={parent.id} className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-medium text-sm">{parent.name}</h3>
              <span className={`text-xs tabular-nums ${sub}`}>{parentItems.length} шт · {parentItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽</span>
            </div>
            <div className="space-y-2">
              {parentItems.map(item => (
                <motion.div key={item.id} layout className={`${glass} rounded-xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className={`text-xs ${sub}`}>
                        {children.some(c => c.id === item.categoryId) ? stockCategories.find(c => c.id === item.categoryId)?.name + ' · ' : ''}
                        {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold tabular-nums ${item.qty <= 5 ? 'text-[var(--status-danger)]' : ''}`}>{item.qty} {item.unit}</div>
                      <div className={`text-xs tabular-nums ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div>
                    </div>
                  </div>
                  {item.qty <= 5 && <div className="flex items-center gap-1 text-[var(--status-danger)] text-xs mb-2"><AlertCircle size={12} strokeWidth={1.75} aria-hidden />Низкий остаток</div>}
                  <div className="h-1.5 rounded-full mb-3 bg-[var(--sunken,#EEEFF3)] dark:bg-white/5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (item.qty / 30) * 100)}%`, background: item.qty <= 5 ? 'var(--status-danger)' : 'var(--primary-600)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }}
                      className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'color-mix(in srgb, var(--primary-600) 30%, transparent)', color: 'var(--primary-600)' }}>
                      <Package size={12} strokeWidth={1.75} aria-hidden />Списать
                    </button>
                    <button onClick={() => setPendingItemDelete({ id: item.id, name: item.name })}
                      className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'color-mix(in srgb, var(--status-danger) 30%, transparent)', color: 'var(--status-danger)' }}>
                      <X size={12} strokeWidth={1.75} aria-hidden />Удалить
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
      {stockItems.length === 0 && (
        <div className={`${glass} rounded-2xl p-8 text-center`}>
          <Box size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
          <p className={sub}>Склад пуст. Добавьте первый товар.</p>
        </div>
      )}
      {/* Write-off history */}
      <div className="mt-4">
        <button onClick={() => { setShowWriteOffHistory(!showWriteOffHistory); if (!showWriteOffHistory) getWriteOffHistory().then(setWriteOffHistory).catch(() => {}); }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${glass}`}>
          <span className="flex items-center gap-2">
            <History size={15} strokeWidth={1.75} aria-hidden />История списаний
          </span>
          <span className={`text-xs ${sub}`}>{showWriteOffHistory ? '▲' : '▼'}</span>
        </button>
        {showWriteOffHistory && (
          <div className="mt-2 space-y-2">
            {writeOffHistory.length === 0 && <div className={`text-xs ${sub} text-center py-4`}>Нет списаний</div>}
            {writeOffHistory.map(w => (
              <div key={w.id} className={`${glass} rounded-xl px-3 py-2`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.stockItemName}</div>
                    {w.source === 'booking' ? (
                      <div className={`text-xs ${sub} space-y-0.5`}>
                        {w.bookingClientName && <div>Клиент: {w.bookingClientName}</div>}
                        {w.bookingService && <div>Услуга: {w.bookingService}</div>}
                        {w.bookingDate && <div>Дата: {w.bookingDate}</div>}
                        {w.bookingWorkerNames && <div>Мастер: {w.bookingWorkerNames}</div>}
                      </div>
                    ) : (
                      <div className={`text-xs ${sub}`}>Ручное списание</div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-medium text-[var(--status-danger)]">-{w.qty} {w.unit}</div>
                    <div className={`text-xs tabular-nums ${sub}`}>{w.totalCost.toLocaleString('ru')} ₽</div>
                  </div>
                </div>
                <div className={`text-[10px] ${sub} mt-1`}>{new Date(w.createdAt).toLocaleString('ru')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold">Чек-листы смен мастеров</div>
            <div className={`text-xs ${sub} mt-1`}>Принятие и закрытие смены с остатками химии по каждому мастеру</div>
          </div>
          <div className={`text-xs ${sub}`}>{latestShiftChecklists.length} последних</div>
        </div>
        {latestShiftChecklists.length === 0 ? (
          <div className={`text-sm ${sub}`}>Пока нет заполненных чек-листов по химии.</div>
        ) : (
          <div className="space-y-3">
            {latestShiftChecklists.map((entry) => (
              <div key={entry.id} className={`${glass} rounded-2xl p-4`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">{entry.workerName}</div>
                    <div className={`text-xs ${sub}`}>
                      {entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: entry.phase === 'start'
                        ? 'color-mix(in srgb, var(--primary-600) 14%, transparent)'
                        : 'color-mix(in srgb, var(--status-success) 14%, transparent)',
                      color: entry.phase === 'start' ? 'var(--primary-600)' : 'var(--status-success)',
                    }}
                  >
                    {entry.phase === 'start' ? 'Смена принята' : 'Смена закрыта'}
                  </div>
                </div>
                <div className="space-y-2">
                  {entry.items.map((item) => (
                    <div key={`${entry.id}-${item.stockItemId}`} className={`${glass} rounded-xl px-3 py-2.5 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className={`text-[11px] ${sub}`}>
                          {entry.phase === 'end'
                            ? `Было: ${item.startQty ?? '-'} ${item.unit} · Осталось: ${item.actualQty} ${item.unit}`
                            : `По факту: ${item.actualQty} ${item.unit}`}
                        </div>
                      </div>
                      {entry.phase === 'end' && (
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold">
                            -{Math.max(0, (item.startQty ?? item.actualQty) - item.actualQty)} {item.unit}
                          </div>
                          <div className={`text-[11px] ${sub}`}>расход</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {entry.note && <div className={`text-xs ${sub} mt-3`}>Примечание: {entry.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>}
      {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold">Открытие смены</div>
            <div className={`text-xs ${sub} mt-1`}>Открытия смены админом и владельцем: мастера на смене и решение владельца</div>
          </div>
          <div className={`text-xs ${sub}`}>{latestAdminShiftInspections.length} последних</div>
        </div>
        {latestAdminShiftInspections.length === 0 ? (
          <div className={`text-sm ${sub}`}>Смены ещё не открывались.</div>
        ) : (
          <div className="space-y-3">
            {latestAdminShiftInspections.map((inspection) => (
              <div key={inspection.id} className={`${glass} rounded-2xl p-4`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">{inspection.adminName}</div>
                    <div className={`text-xs ${sub}`}>
                      {inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: `color-mix(in srgb, var(--status-${inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'danger'}) 15%, transparent)`,
                      color: `var(--status-${inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'danger'})`,
                    }}
                  >
                    {inspection.status === 'pending' ? 'На подтверждении' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказано'}
                  </div>
                </div>
                {inspection.floorPhotoUrl ? (
                  adminShiftPhotoUrls[inspection.id] ? (
                    <img src={adminShiftPhotoUrls[inspection.id]} alt="Фото открытия смены" className="mb-3 h-44 w-full rounded-2xl object-cover" />
                  ) : (
                    <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>
                      Загружаем фото открытия смены...
                    </div>
                  )
                ) : (
                  <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>
                    Открыта владельцем, без фото
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className={`${glass} rounded-xl p-3`}>
                    <div className={`text-[11px] ${sub} mb-1`}>Мастера на смене</div>
                    <div className="text-sm font-medium">
                      {inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}
                    </div>
                  </div>
                  <div className={`${glass} rounded-xl p-3`}>
                    <div className={`text-[11px] ${sub} mb-1`}>Проверенные расходники</div>
                    <div className="text-sm font-medium">
                      {inspection.supplies.filter((item) => item.checked).map((item) => item.name).join(', ') || 'Не отмечены'}
                    </div>
                  </div>
                </div>
                <div className={`text-xs ${sub} mt-3`}>
                  Чистые тряпки: {inspection.clothsReady ? 'Да' : 'Нет'}
                </div>
                {inspection.note && <div className={`text-xs ${sub} mt-1`}>Комментарий: {inspection.note}</div>}
                {inspection.issueNote && <div className="text-xs text-[var(--status-danger)] mt-2">Причина отказа: {inspection.issueNote}</div>}
                {inspection.reviewedAt && (
                  <div className={`text-[11px] ${sub} mt-2`}>
                    Решение принято {inspection.reviewedAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Добавление товара — DS Sheet */}
      <Sheet open={showAddStock} onClose={() => setShowAddStock(false)} title="Добавить товар">
        <div className="space-y-3">
          <FormRow label="Название">
            <Input placeholder="Автошампунь..." value={stockForm.name} onChange={e => setStockForm(p => ({ ...p, name: e.target.value }))} />
          </FormRow>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Количество">
              <Input inputMode="decimal" value={stockForm.qty} onChange={e => setStockForm(p => ({ ...p, qty: e.target.value }))} />
            </FormRow>
            <FormRow label="Единица">
              <select className={selectCls} value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}>
                {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormRow>
          </div>
          <FormRow label={`Цена ${stockForm.priceMode === 'total' ? 'за все' : 'за ед.'} (₽)`}>
            <div className="flex gap-2">
              <Input className="flex-1" inputMode="decimal" value={stockForm.unitPrice} onChange={e => setStockForm(p => ({ ...p, unitPrice: e.target.value }))} />
              <button type="button" onClick={() => setStockForm(p => ({ ...p, priceMode: p.priceMode === 'unit' ? 'total' : 'unit', unitPrice: '' }))}
                className="text-xs px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>{stockForm.priceMode === 'unit' ? 'за всё' : 'за ед.'}</button>
            </div>
          </FormRow>
          <FormRow label="Категория">
            {(() => {
              const parentCats = stockCategories.filter(c => !c.parentId);
              return (
                <div className="flex gap-2">
                  <select className={selectCls} style={{ flex: 1 }}
                    value={stockForm.categoryId ? (stockCategories.find(c => c.id === stockForm.categoryId)?.parentId || '') : ''}
                    onChange={e => {
                      const parentId = e.target.value;
                      const children = stockCategories.filter(c => c.parentId === parentId);
                      setStockForm(p => ({
                        ...p,
                        categoryId: children.length > 0 ? children[0].id : parentId,
                        category: stockCategories.find(c => c.id === (children.length > 0 ? children[0].id : parentId))?.name || p.category,
                      }));
                    }}>
                    {parentCats.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {parentCats.length > 0 && (() => {
                    const selectedParentId = stockForm.categoryId
                      ? (stockCategories.find(c => c.id === stockForm.categoryId)?.parentId || stockForm.categoryId)
                      : parentCats[0].id;
                    const children = stockCategories.filter(c => c.parentId === selectedParentId);
                    if (children.length === 0) return null;
                    return (
                      <select className={selectCls} style={{ flex: 1 }}
                        value={stockForm.categoryId && children.some(c => c.id === stockForm.categoryId) ? stockForm.categoryId : children[0].id}
                        onChange={e => {
                          const cat = stockCategories.find(c => c.id === e.target.value);
                          setStockForm(p => ({ ...p, categoryId: e.target.value, category: cat?.name || p.category }));
                        }}>
                        {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    );
                  })()}
                </div>
              );
            })()}
          </FormRow>
        </div>
        <div className="mt-5 pb-2">
          <Button size="lg" disabled={!stockForm.name || !stockForm.qty} onClick={handleAddStock}>Добавить на склад</Button>
        </div>
      </Sheet>

      {/* Категории — DS Sheet с инлайн-переименованием/добавлением (prompt/confirm устранены) */}
      <Sheet open={showCategoryManager} onClose={() => { setShowCategoryManager(false); setRenaming(null); setAddingRootCategory(false); setAddingSubFor(null); }} title="Категории склада">
        <div className="space-y-3 pb-2">
          {stockCategories.filter(c => !c.parentId).map(parent => (
            <div key={parent.id} className={`${glass} rounded-xl p-3`}>
              <div className="flex items-center justify-between">
                {renaming?.id === parent.id ? (
                  <InlineRename
                    initial={parent.name}
                    onSave={(name) => {
                      void updateStockCategory(parent.id, { name });
                      setRenaming(null);
                    }}
                    onCancel={() => setRenaming(null)}
                  />
                ) : (
                  <>
                    <span className="font-medium">{parent.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setRenaming({ id: parent.id, name: parent.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">✎</button>
                      <button onClick={() => setPendingCategoryDelete({ id: parent.id, name: parent.name, isChild: false })} className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]">✕</button>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {stockCategories.filter(c => c.parentId === parent.id).map(child => (
                  <div key={child.id} className="flex items-center justify-between pl-4">
                    {renaming?.id === child.id ? (
                      <InlineRename
                        initial={child.name}
                        onSave={(name) => {
                          void updateStockCategory(child.id, { name });
                          setRenaming(null);
                        }}
                        onCancel={() => setRenaming(null)}
                      />
                    ) : (
                      <>
                        <span className={`text-sm ${sub}`}>— {child.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setRenaming({ id: child.id, name: child.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">✎</button>
                          <button onClick={() => setPendingCategoryDelete({ id: child.id, name: child.name, isChild: true })} className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]">✕</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {addingSubFor === parent.id ? (
                  <InlineAdd
                    placeholder="Название новой подкатегории:"
                    onCancel={() => { setAddingSubFor(null); setNewSubCategoryName(''); }}
                    onSubmit={(name) => {
                      if (!name.trim()) return;
                      void addStockCategory({ name: name.trim(), parentId: parent.id })
                        .then(() => toast({ type: 'success', title: `Подкатегория «${name.trim()}» добавлена` }))
                        .catch(() => toast({ type: 'error', title: 'Не удалось добавить подкатегорию' }));
                      setAddingSubFor(null);
                      setNewSubCategoryName('');
                    }}
                  />
                ) : (
                  <button onClick={() => { setAddingSubFor(parent.id); setNewSubCategoryName(''); }} className="rounded px-2 py-1 mt-1 text-xs text-[var(--primary-600)]">+ Добавить подкатегорию</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="pb-2">
          {addingRootCategory ? (
            <InlineAdd
              placeholder="Название новой категории:"
              onCancel={() => { setAddingRootCategory(false); setNewRootCategoryName(''); }}
              onSubmit={(name) => {
                if (!name.trim()) return;
                void addStockCategory({ name: name.trim() })
                  .then(() => toast({ type: 'success', title: `Категория «${name.trim()}» добавлена` }))
                  .catch(() => toast({ type: 'error', title: 'Не удалось добавить категорию' }));
                setAddingRootCategory(false);
                setNewRootCategoryName('');
              }}
            />
          ) : (
            <Button className="w-full" onClick={() => { setAddingRootCategory(true); setNewRootCategoryName(''); }}>+ Добавить категорию</Button>
          )}
        </div>
      </Sheet>

      {/* Списание — DS Dialog */}
      <Dialog
        open={Boolean(showWriteOff)}
        onClose={() => setShowWriteOff(null)}
        title="Списать товар"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowWriteOff(null)}>Отмена</Button>
            <Button variant="danger" className="flex-1" onClick={handleWriteOff}>Списать</Button>
          </>
        }
      >
        <p className={`text-sm ${sub} mb-3`}>{stockItems.find(s => s.id === showWriteOff)?.name}</p>
        <FormRow label="Количество">
          <Input inputMode="decimal" value={writeOffQty} onChange={e => setWriteOffQty(e.target.value)} />
        </FormRow>
      </Dialog>

      {/* Удаление товара — DS Dialog (замена window.confirm) */}
      <Dialog
        open={Boolean(pendingItemDelete)}
        onClose={() => setPendingItemDelete(null)}
        title="Удалить?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPendingItemDelete(null)}>Отмена</Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!pendingItemDelete) return;
                try {
                  await deleteStockItem(pendingItemDelete.id);
                  toast({ type: 'success', title: `«${pendingItemDelete.name}» удалён со склада` });
                } catch (err) {
                  toast({ type: 'error', title: err instanceof Error ? err.message : 'Не удалось удалить' });
                }
                setPendingItemDelete(null);
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        «{pendingItemDelete?.name}» будет удалён со склада.
      </Dialog>

      {/* Удаление категории/подкатегории — DS Dialog (замена window.confirm) */}
      <Dialog
        open={Boolean(pendingCategoryDelete)}
        onClose={() => setPendingCategoryDelete(null)}
        title={pendingCategoryDelete?.isChild ? 'Удалить подкатегорию?' : 'Удалить категорию?'}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPendingCategoryDelete(null)}>Отмена</Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!pendingCategoryDelete) return;
                try {
                  await deleteStockCategory(pendingCategoryDelete.id);
                  toast({
                    type: 'success',
                    title: pendingCategoryDelete.isChild
                      ? `Подкатегория «${pendingCategoryDelete.name}» удалена`
                      : `Категория «${pendingCategoryDelete.name}» удалена`,
                  });
                } catch {
                  toast({ type: 'error', title: pendingCategoryDelete.isChild ? 'Не удалось удалить подкатегорию' : 'Не удалось удалить категорию' });
                }
                setPendingCategoryDelete(null);
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        «{pendingCategoryDelete?.name}» будет удалена.
      </Dialog>
    </motion.div>
  );
}

function InlineRename({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(value.trim());
          if (e.key === 'Escape') onCancel();
        }}
        className="py-1.5 text-sm"
      />
      <button onClick={() => value.trim() && onSave(value.trim())} className="shrink-0 text-xs font-medium text-[var(--status-success)]">
        ОК
      </button>
      <button onClick={onCancel} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]">
        <X size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

function InlineAdd({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5">
      <Input
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(value);
          if (e.key === 'Escape') onCancel();
        }}
        className="py-1.5 text-sm"
      />
      <button onClick={() => onSubmit(value)} className="shrink-0 text-xs font-medium text-[var(--status-success)]">
        ОК
      </button>
      <button onClick={onCancel} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]">
        <X size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

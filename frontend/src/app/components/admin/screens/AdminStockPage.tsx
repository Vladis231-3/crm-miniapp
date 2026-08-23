import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Box, History, Plus, X } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Button, Dialog, FormRow, Input, Money, Sheet, StatTile, Textarea, toast } from '../../atmosfera';

const STOCK_UNITS = ['шт', 'мл', 'л', 'г', 'кг', 'уп.', 'компл'];

interface StockForm {
  name: string;
  qty: string;
  unit: string;
  unitPrice: string;
  priceMode: 'unit' | 'total';
  categoryId: string;
  category: string;
}

const EMPTY_STOCK_FORM: StockForm = {
  name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit', categoryId: '', category: '',
};

/**
 * AdminStockPage — вырезка из AdminApp (§6.2).
 * Группировка по категориям, low-stock ≤5 на токенах, списание → DS Dialog,
 * добавление товара и менеджер категорий → DS Sheet (prompt/confirm устранены).
 */
export function AdminStockPage() {
  const {
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

  const [showAddStock, setShowAddStock] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState<string | null>(null);
  const [writeOffQty, setWriteOffQty] = useState('1');
  const [writeOffHistory, setWriteOffHistory] = useState<any[]>([]);
  const [showWriteOffHistory, setShowWriteOffHistory] = useState(false);
  const [stockForm, setStockForm] = useState<StockForm>(EMPTY_STOCK_FORM);
  // Инлайн-переименование категорий (замена window.prompt)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  // Подтверждение удаления категории (замена window.confirm)
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<{ id: string; name: string; isChild: boolean } | null>(null);
  // Подтверждение удаления товара
  const [pendingItemDelete, setPendingItemDelete] = useState<{ id: string; name: string } | null>(null);

  const parentCategories = stockCategories.filter((c) => !c.parentId);

  useEffect(() => {
    if (showWriteOffHistory) {
      getWriteOffHistory().then(setWriteOffHistory).catch(() => {});
    }
  }, [showWriteOffHistory]);

  const handleAddStock = () => {
    if (!stockForm.name || !stockForm.qty) return;
    const qty = Number(stockForm.qty.replace(',', '.'));
    const rawPrice = Number(stockForm.unitPrice.replace(',', '.'));
    const unitPrice = stockForm.priceMode === 'total' && qty > 0 ? rawPrice / qty : rawPrice;
    addStockItem({ name: stockForm.name, qty, unit: stockForm.unit, unitPrice, category: stockForm.category, categoryId: stockForm.categoryId || undefined });
    setShowAddStock(false);
    setStockForm(EMPTY_STOCK_FORM);
    toast({ type: 'success', title: `Товар «${stockForm.name}» добавлен на склад` });
  };

  const handleWriteOff = () => {
    if (!showWriteOff) return;
    const item = stockItems.find((s) => s.id === showWriteOff);
    if (!item) return;
    writeOffStock(showWriteOff, Number(writeOffQty.replace(',', '.')));
    setShowWriteOff(null);
    setWriteOffQty('1');
    toast({ type: 'success', title: `Списано: ${item.name} — ${writeOffQty} ${item.unit}` });
  };

  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const selectCls = inputCls;

  return (
    <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
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

      <div className={`${glass} mb-4 flex items-center justify-between rounded-2xl p-3`}>
        <div>
          <div className={`text-xs ${sub}`}>Стоимость склада</div>
          <div className="font-bold" style={{ color: 'var(--status-success)' }}>
            <Money amount={stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0)} />
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs ${sub}`}>Позиций</div>
          <div className="font-bold">{stockItems.length}</div>
        </div>
      </div>

      {parentCategories.map((parent) => {
        const children = stockCategories.filter((c) => c.parentId === parent.id);
        const parentItems = stockItems.filter((item) => {
          if (item.categoryId) {
            const itemCat = stockCategories.find((c) => c.id === item.categoryId);
            return itemCat && (itemCat.id === parent.id || itemCat.parentId === parent.id);
          }
          return item.category === parent.name;
        });
        if (parentItems.length === 0) return null;
        return (
          <div key={parent.id} className="mb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{parent.name}</h3>
              <span className={`text-xs tabular-nums ${sub}`}>
                {parentItems.length} шт · {parentItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽
              </span>
            </div>
            <div className="space-y-2">
              {parentItems.map((item) => {
                const low = item.qty <= 5;
                return (
                  <div key={item.id} className={`${glass} rounded-xl p-4`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className={`text-xs ${sub}`}>
                          {children.some((c) => c.id === item.categoryId)
                            ? stockCategories.find((c) => c.id === item.categoryId)?.name + ' · '
                            : ''}
                          {item.unitPrice.toLocaleString('ru')} ₽/{item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold tabular-nums ${low ? 'text-[var(--status-danger)]' : ''}`}>
                          {item.qty} {item.unit}
                        </div>
                        <div className={`text-xs tabular-nums ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div>
                      </div>
                    </div>
                    {low && (
                      <div className="mb-2 flex items-center gap-1 text-xs text-[var(--status-danger)]">
                        <AlertCircle size={12} strokeWidth={1.75} aria-hidden />
                        Низкий остаток
                      </div>
                    )}
                    <div className="mb-3 h-1.5 rounded-full bg-[var(--sunken,#EEEFF3)] dark:bg-white/5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (item.qty / 30) * 100)}%`,
                          background: low ? 'var(--status-danger)' : 'var(--primary-600)',
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }}
                        className="rounded-lg border py-2 text-xs"
                        style={{ borderColor: 'color-mix(in srgb, var(--primary-600) 30%, transparent)', color: 'var(--primary-600)' }}
                      >
                        Списать
                      </button>
                      <button
                        onClick={() => setPendingItemDelete({ id: item.id, name: item.name })}
                        className="rounded-lg border py-2 text-xs"
                        style={{ borderColor: 'color-mix(in srgb, var(--status-danger) 30%, transparent)', color: 'var(--status-danger)' }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* История списаний */}
      <div className="mt-4">
        <button
          onClick={() => {
            setShowWriteOffHistory(!showWriteOffHistory);
            if (!showWriteOffHistory) getWriteOffHistory().then(setWriteOffHistory).catch(() => {});
          }}
          className={`${glass} flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium`}
        >
          <span className="flex items-center gap-2">
            <History size={15} strokeWidth={1.75} aria-hidden />
            История списаний
          </span>
          <span className={`text-xs ${sub}`}>{showWriteOffHistory ? '▲' : '▼'}</span>
        </button>
        {showWriteOffHistory && (
          <div className="mt-2 space-y-2">
            {writeOffHistory.length === 0 && (
              <div className={`py-4 text-center text-xs ${sub}`}>Нет списаний</div>
            )}
            {writeOffHistory.map((w) => (
              <div key={w.id} className={`${glass} rounded-xl px-3 py-2`}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{w.stockItemName}</div>
                    {w.source === 'booking' ? (
                      <div className={`space-y-0.5 text-xs ${sub}`}>
                        {w.bookingClientName && <div>Клиент: {w.bookingClientName}</div>}
                        {w.bookingService && <div>Услуга: {w.bookingService}</div>}
                        {w.bookingDate && <div>Дата: {w.bookingDate}</div>}
                        {w.bookingWorkerNames && <div>Мастер: {w.bookingWorkerNames}</div>}
                      </div>
                    ) : (
                      <div className={`text-xs ${sub}`}>Ручное списание</div>
                    )}
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <div className="text-sm font-medium text-[var(--status-danger)]">-{w.qty} {w.unit}</div>
                    <div className={`text-xs tabular-nums ${sub}`}>{w.totalCost.toLocaleString('ru')} ₽</div>
                  </div>
                </div>
                <div className={`mt-1 text-[10px] ${sub}`}>{new Date(w.createdAt).toLocaleString('ru')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Добавление товара — DS Sheet */}
      <Sheet open={showAddStock} onClose={() => setShowAddStock(false)} title="Добавить товар">
        <div className="space-y-3">
          <FormRow label="Название">
            <Input placeholder="Автошампунь..." value={stockForm.name} onChange={(e) => setStockForm((p) => ({ ...p, name: e.target.value }))} />
          </FormRow>
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Количество">
              <Input inputMode="decimal" value={stockForm.qty} onChange={(e) => setStockForm((p) => ({ ...p, qty: e.target.value }))} />
            </FormRow>
            <FormRow label="Единица">
              <select className={selectCls} value={stockForm.unit} onChange={(e) => setStockForm((p) => ({ ...p, unit: e.target.value }))}>
                {STOCK_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </FormRow>
          </div>
          <FormRow label={`Цена ${stockForm.priceMode === 'total' ? 'за всё' : 'за ед.'} (₽)`}>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                inputMode="decimal"
                value={stockForm.unitPrice}
                onChange={(e) => setStockForm((p) => ({ ...p, unitPrice: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setStockForm((p) => ({ ...p, priceMode: p.priceMode === 'unit' ? 'total' : 'unit', unitPrice: '' }))}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs"
                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}
              >
                {stockForm.priceMode === 'unit' ? 'за всё' : 'за ед.'}
              </button>
            </div>
          </FormRow>
          <FormRow label="Категория">
            {(() => {
              const parentCats = stockCategories.filter((c) => !c.parentId);
              return (
                <div className="flex gap-2">
                  <select
                    className={selectCls}
                    style={{ flex: 1 }}
                    value={stockForm.categoryId ? (stockCategories.find((c) => c.id === stockForm.categoryId)?.parentId || '') : ''}
                    onChange={(e) => {
                      const parentId = e.target.value;
                      const children = stockCategories.filter((c) => c.parentId === parentId);
                      setStockForm((p) => ({
                        ...p,
                        categoryId: children.length > 0 ? children[0].id : parentId,
                        category: stockCategories.find((c) => c.id === (children.length > 0 ? children[0].id : parentId))?.name || p.category,
                      }));
                    }}
                  >
                    {parentCats.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {parentCats.length > 0 &&
                    (() => {
                      const selectedParentId = stockForm.categoryId
                        ? stockCategories.find((c) => c.id === stockForm.categoryId)?.parentId || stockForm.categoryId
                        : parentCats[0].id;
                      const children = stockCategories.filter((c) => c.parentId === selectedParentId);
                      if (children.length === 0) return null;
                      return (
                        <select
                          className={selectCls}
                          style={{ flex: 1 }}
                          value={
                            stockForm.categoryId && children.some((c) => c.id === stockForm.categoryId)
                              ? stockForm.categoryId
                              : children[0].id
                          }
                          onChange={(e) => {
                            const cat = stockCategories.find((c) => c.id === e.target.value);
                            setStockForm((p) => ({ ...p, categoryId: e.target.value, category: cat?.name || p.category }));
                          }}
                        >
                          {children.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      );
                    })()}
                </div>
              );
            })()}
          </FormRow>
        </div>
        <div className="mt-5 pb-2">
          <Button size="lg" disabled={!stockForm.name || !stockForm.qty} onClick={handleAddStock}>
            Добавить на склад
          </Button>
        </div>
      </Sheet>

      {/* Категории — DS Sheet c инлайн-редактированием (вместо prompt/confirm) */}
      <Sheet open={showCategoryManager} onClose={() => { setShowCategoryManager(false); setRenaming(null); }} title="Категории склада">
        <div className="space-y-3 pb-2">
          {stockCategories
            .filter((c) => !c.parentId)
            .map((parent) => (
              <div key={parent.id} className={`${glass} rounded-xl p-3`}>
                <div className="flex items-center justify-between gap-2">
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
                        <button onClick={() => setRenaming({ id: parent.id, name: parent.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">
                          ✎
                        </button>
                        <button
                          onClick={() => setPendingCategoryDelete({ id: parent.id, name: parent.name, isChild: false })}
                          className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {stockCategories
                    .filter((c) => c.parentId === parent.id)
                    .map((child) => (
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
                              <button onClick={() => setRenaming({ id: child.id, name: child.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">
                                ✎
                              </button>
                              <button
                                onClick={() => setPendingCategoryDelete({ id: child.id, name: child.name, isChild: true })}
                                className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]"
                              >
                                ✕
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  <button
                    onClick={async () => {
                      try {
                        await addStockCategory({ name: `Подкатегория ${parent.name}`, parentId: parent.id });
                        toast({ type: 'success', title: 'Подкатегория добавлена' });
                      } catch {
                        toast({ type: 'error', title: 'Не удалось добавить подкатегорию' });
                      }
                    }}
                    className="mt-1 rounded px-2 py-1 text-xs text-[var(--primary-600)]"
                  >
                    + Добавить подкатегорию
                  </button>
                </div>
              </div>
            ))}
        </div>
        <div className="pb-2">
          <Button
            className="w-full"
            onClick={async () => {
              try {
                await addStockCategory({ name: `Новая категория` });
                toast({ type: 'success', title: 'Категория добавлена' });
              } catch {
                toast({ type: 'error', title: 'Не удалось добавить категорию' });
              }
            }}
          >
            + Добавить категорию
          </Button>
        </div>
      </Sheet>

      {/* Списание — DS Dialog */}
      <Dialog
        open={Boolean(showWriteOff)}
        onClose={() => setShowWriteOff(null)}
        title="Списать товар"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowWriteOff(null)}>
              Отмена
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleWriteOff}>
              Списать
            </Button>
          </>
        }
      >
        <p className="mb-3">{stockItems.find((s) => s.id === showWriteOff)?.name}</p>
        <FormRow label="Количество">
          <Input inputMode="decimal" value={writeOffQty} onChange={(e) => setWriteOffQty(e.target.value)} />
        </FormRow>
      </Dialog>

      {/* Удаление товара/категории — DS Dialog */}
      <Dialog
        open={Boolean(pendingItemDelete)}
        onClose={() => setpendingItemDelete(null)}
        title="Удалить?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setpendingItemDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!pendingItemDelete) return;
                try {
                  await deleteStockItem(pendingItemDelete.id);
                  toast({ type: 'success', title: `«${pendingItemDelete.name}» удалён со склада` });
                } catch {
                  toast({ type: 'error', title: 'Не удалось удалить' });
                }
                setpendingItemDelete(null);
              }}
            >
              Удалить
            </Button>
          </>
        }
      >
        «{pendingItemDelete?.name}» будет удалён со склада.
      </Dialog>

      <Dialog
        open={Boolean(pendingCategoryDelete)}
        onClose={() => setPendingCategoryDelete(null)}
        title={pendingCategoryDelete?.isChild ? 'Удалить подкатегорию?' : 'Удалить категорию?'}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPendingCategoryDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (!pendingCategoryDelete) return;
                try {
                  await deleteStockCategory(pendingCategoryDelete.id);
                  toast({
                    type: 'success',
                    title: `${pendingCategoryDelete.isChild ? 'Подкатегория' : 'Категория'} «${pendingCategoryDelete.name}» удалена`,
                  });
                } catch {
                  toast({ type: 'error', title: 'Не удалось удалить категорию' });
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

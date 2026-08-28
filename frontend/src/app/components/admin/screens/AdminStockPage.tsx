import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Box, History, Plus, X } from 'lucide-react';
import { useApp, type StockCategory } from '../../../context/AppContext';
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

// ── Helpers for unlimited nesting ──
type CategoryNode = { category: StockCategory; children: CategoryNode[] };

function buildCategoryTree(categories: StockCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { category: c, children: [] }));
  const roots: CategoryNode[] = [];
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.category.name.localeCompare(b.category.name, 'ru'));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function flattenCategories(categories: StockCategory[]): Array<{ id: string; name: string; depth: number }> {
  const tree = buildCategoryTree(categories);
  const out: Array<{ id: string; name: string; depth: number }> = [];
  const dfs = (nodes: CategoryNode[], depth: number) => {
    nodes.forEach((n) => {
      out.push({ id: n.category.id, name: n.category.name, depth });
      dfs(n.children, depth + 1);
    });
  };
  dfs(tree, 0);
  return out;
}

function getDescendantIds(categoryId: string, categories: StockCategory[]): Set<string> {
  const map = new Map<string, StockCategory[]>();
  categories.forEach((c) => {
    if (!c.parentId) return;
    if (!map.has(c.parentId)) map.set(c.parentId, []);
    map.get(c.parentId)!.push(c);
  });
  const result = new Set<string>();
  const queue = [categoryId];
  const visited = new Set<string>();
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const children = map.get(cur) || [];
    children.forEach((ch) => {
      result.add(ch.id);
      queue.push(ch.id);
    });
  }
  return result;
}

function collectSubtreeItemIds(node: CategoryNode, categories: StockCategory[]): Set<string> {
  const ids = new Set<string>([node.category.id]);
  const desc = getDescendantIds(node.category.id, categories);
  desc.forEach((id) => ids.add(id));
  return ids;
}

/**
 * AdminStockPage — вырезка из AdminApp (§6.2).
 * Группировка по категориям, low-stock ≤5 на токенах, списание → DS Dialog,
 * добавление товара и менеджер категорий → DS Sheet (prompt/confirm устранены).
 * Теперь поддерживает безлимитную вложенность категорий любой глубины.
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
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<{ id: string; name: string; descendantCount: number } | null>(null);
  // Подтверждение удаления товара
  const [pendingItemDelete, setPendingItemDelete] = useState<{ id: string; name: string } | null>(null);
  // Инлайн-добавление категорий
  const [addingRootCategory, setAddingRootCategory] = useState(false);
  const [newRootCategoryName, setNewRootCategoryName] = useState('');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  const categoryTree = useMemo(() => buildCategoryTree(stockCategories), [stockCategories]);
  const flattenedForSelect = useMemo(() => flattenCategories(stockCategories), [stockCategories]);

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
    const selectedCat = stockCategories.find((c) => c.id === stockForm.categoryId);
    addStockItem({ name: stockForm.name, qty, unit: stockForm.unit, unitPrice, category: selectedCat?.name || stockForm.category, categoryId: stockForm.categoryId || undefined });
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

  // Рекурсивный рендер секции склада
  const renderStockTree = (nodes: CategoryNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const allIds = collectSubtreeItemIds(node, stockCategories);
      // Товары, которые принадлежат этому поддереву (для скрытия пустых веток)
      const subtreeItems = stockItems.filter((item) => {
        if (item.categoryId) return allIds.has(item.categoryId);
        return item.category === node.category.name;
      });
      if (subtreeItems.length === 0) {
        // всё равно рендерим детей, может у детей есть товары
        const childContent = renderStockTree(node.children, depth + 1);
        // если и у детей пусто — скрыть
        const hasVisibleChild = node.children.some((ch) => {
          const cid = collectSubtreeItemIds(ch, stockCategories);
          return stockItems.some((it) => it.categoryId ? cid.has(it.categoryId) : it.category === ch.category.name);
        });
        if (!hasVisibleChild) return null;
        return (
          <div key={node.category.id} className={depth === 0 ? 'mb-4' : 'mt-3 ml-3 border-l border-border pl-3'}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{node.category.name}</h3>
              <span className={`text-xs tabular-nums ${sub}`}>0 шт · 0 ₽</span>
            </div>
            {childContent}
          </div>
        );
      }
      const directItems = stockItems.filter((item) => {
        if (item.categoryId) return item.categoryId === node.category.id;
        return item.category === node.category.name && !stockCategories.some((c) => c.id === item.categoryId);
      });
      return (
        <div key={node.category.id} className={depth === 0 ? 'mb-4' : 'mt-3 ml-3 border-l border-border pl-3'}>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-medium">{node.category.name}</h3>
            <span className={`text-xs tabular-nums ${sub}`}>
              {subtreeItems.length} шт · {subtreeItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽
            </span>
          </div>
          {directItems.length > 0 && (
            <div className="space-y-2">
              {directItems.map((item) => {
                const low = item.qty <= 5;
                // Показать полный путь категории товара если он в подкатегории глубже
                const itemCatName = (() => {
                  if (!item.categoryId) return '';
                  const cat = stockCategories.find((c) => c.id === item.categoryId);
                  if (!cat || cat.id === node.category.id) return '';
                  return cat.name + ' · ';
                })();
                return (
                  <div key={item.id} className={`${glass} rounded-xl p-4`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className={`text-xs ${sub}`}>
                          {itemCatName}
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
          )}
          {node.children.length > 0 && (
            <div className="mt-3">
              {renderStockTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderCategoryManagerTree = (nodes: CategoryNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const descendantCount = getDescendantIds(node.category.id, stockCategories).size;
      return (
        <div key={node.category.id} className={`${glass} rounded-xl p-3`} style={{ marginLeft: depth ? 12 : 0, borderLeft: depth ? '2px solid var(--border)' : undefined }}>
          <div className="flex items-center justify-between gap-2">
            {renaming?.id === node.category.id ? (
              <InlineRename
                initial={node.category.name}
                onSave={(name) => {
                  void updateStockCategory(node.category.id, { name });
                  setRenaming(null);
                }}
                onCancel={() => setRenaming(null)}
              />
            ) : (
              <>
                <span className="font-medium" style={{ paddingLeft: depth * 2 }}>{node.category.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => setRenaming({ id: node.category.id, name: node.category.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">
                    ✎
                  </button>
                  <button
                    onClick={() => setPendingCategoryDelete({ id: node.category.id, name: node.category.name, descendantCount })}
                    className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
          {node.children.length > 0 && (
            <div className="mt-2 space-y-2">
              {renderCategoryManagerTree(node.children, depth + 1)}
            </div>
          )}
          {addingSubFor === node.category.id ? (
            <div className="mt-2 flex min-w-0 items-center gap-1.5">
              <Input
                autoFocus
                placeholder="Название подкатегории"
                value={newSubCategoryName}
                onChange={(e) => setNewSubCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubCategoryName.trim()) {
                    void addStockCategory({ name: newSubCategoryName.trim(), parentId: node.category.id })
                      .then(() => toast({ type: 'success', title: `Подкатегория «${newSubCategoryName.trim()}» добавлена` }))
                      .catch(() => toast({ type: 'error', title: 'Не удалось добавить подкатегорию' }));
                    setAddingSubFor(null);
                    setNewSubCategoryName('');
                  }
                  if (e.key === 'Escape') { setAddingSubFor(null); setNewSubCategoryName(''); }
                }}
                className="py-1.5 text-sm"
              />
              <button
                onClick={() => {
                  if (!newSubCategoryName.trim()) return;
                  void addStockCategory({ name: newSubCategoryName.trim(), parentId: node.category.id })
                    .then(() => toast({ type: 'success', title: `Подкатегория «${newSubCategoryName.trim()}» добавлена` }))
                    .catch(() => toast({ type: 'error', title: 'Не удалось добавить подкатегорию' }));
                  setAddingSubFor(null);
                  setNewSubCategoryName('');
                }}
                className="shrink-0 text-xs font-medium text-[var(--status-success)]"
              >
                ОК
              </button>
              <button onClick={() => { setAddingSubFor(null); setNewSubCategoryName(''); }} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]">
                <X size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAddingSubFor(node.category.id); setNewSubCategoryName(''); }}
              className="mt-2 rounded px-2 py-1 text-xs text-[var(--primary-600)]"
            >
              + Добавить подкатегорию
            </button>
          )}
        </div>
      );
    });
  };

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

      {categoryTree.length > 0 ? renderStockTree(categoryTree) : null}
      {stockItems.length === 0 && (
        <div className={`${glass} rounded-2xl p-8 text-center`}>
          <Box size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden />
          <p className={sub}>Склад пуст. Добавьте первый товар.</p>
        </div>
      )}
      {/* Показать товары без категории (legacy) */}
      {(() => {
        const withoutCat = stockItems.filter((item) => !item.categoryId && !stockCategories.some((c) => c.name === item.category));
        if (withoutCat.length === 0) return null;
        return (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">Без категории</h3>
              <span className={`text-xs tabular-nums ${sub}`}>
                {withoutCat.length} шт · {withoutCat.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽
              </span>
            </div>
            <div className="space-y-2">
              {withoutCat.map((item) => {
                const low = item.qty <= 5;
                return (
                  <div key={item.id} className={`${glass} rounded-xl p-4`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className={`text-xs ${sub}`}>{item.unitPrice.toLocaleString('ru')} ₽/{item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold tabular-nums ${low ? 'text-[var(--status-danger)]' : ''}`}>
                          {item.qty} {item.unit}
                        </div>
                        <div className={`text-xs tabular-nums ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }} className="rounded-lg border py-2 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--primary-600) 30%, transparent)', color: 'var(--primary-600)' }}>Списать</button>
                      <button onClick={() => setPendingItemDelete({ id: item.id, name: item.name })} className="rounded-lg border py-2 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--status-danger) 30%, transparent)', color: 'var(--status-danger)' }}>Удалить</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
            <select
              className={selectCls}
              value={stockForm.categoryId}
              onChange={(e) => {
                const cat = stockCategories.find((c) => c.id === e.target.value);
                setStockForm((p) => ({ ...p, categoryId: e.target.value, category: cat?.name || p.category }));
              }}
            >
              <option value="">— Без категории —</option>
              {flattenedForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {'\u00A0\u00A0'.repeat(c.depth) + (c.depth > 0 ? '— ' : '') + c.name}
                </option>
              ))}
            </select>
            {flattenedForSelect.length === 0 && (
              <div className={`mt-1 text-xs ${sub}`}>Сначала создайте категорию в менеджере категорий</div>
            )}
          </FormRow>
        </div>
        <div className="mt-5 pb-2">
          <Button size="lg" disabled={!stockForm.name || !stockForm.qty} onClick={handleAddStock}>
            Добавить на склад
          </Button>
        </div>
      </Sheet>

      {/* Категории — DS Sheet c инлайн-редактированием (вместо prompt/confirm) — безлимитная вложенность */}
      <Sheet open={showCategoryManager} onClose={() => { setShowCategoryManager(false); setRenaming(null); setAddingRootCategory(false); setAddingSubFor(null); }} title="Категории склада">
        <div className="space-y-3 pb-2">
          {categoryTree.length === 0 && (
            <div className={`py-6 text-center text-sm ${sub}`}>Категорий пока нет. Создайте первую.</div>
          )}
          {renderCategoryManagerTree(categoryTree)}
        </div>
        <div className="pb-2">
          {addingRootCategory ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Input
                autoFocus
                placeholder="Название новой категории"
                value={newRootCategoryName}
                onChange={(e) => setNewRootCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRootCategoryName.trim()) {
                    void addStockCategory({ name: newRootCategoryName.trim() })
                      .then(() => toast({ type: 'success', title: `Категория «${newRootCategoryName.trim()}» добавлена` }))
                      .catch(() => toast({ type: 'error', title: 'Не удалось добавить категорию' }));
                    setAddingRootCategory(false);
                    setNewRootCategoryName('');
                  }
                  if (e.key === 'Escape') { setAddingRootCategory(false); setNewRootCategoryName(''); }
                }}
                className="py-1.5 text-sm"
              />
              <button
                onClick={() => {
                  if (!newRootCategoryName.trim()) return;
                  void addStockCategory({ name: newRootCategoryName.trim() })
                    .then(() => toast({ type: 'success', title: `Категория «${newRootCategoryName.trim()}» добавлена` }))
                    .catch(() => toast({ type: 'error', title: 'Не удалось добавить категорию' }));
                  setAddingRootCategory(false);
                  setNewRootCategoryName('');
                }}
                className="shrink-0 text-xs font-medium text-[var(--status-success)]"
              >
                ОК
              </button>
              <button onClick={() => { setAddingRootCategory(false); setNewRootCategoryName(''); }} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]">
                <X size={14} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => { setAddingRootCategory(true); setNewRootCategoryName(''); }}
            >
              + Добавить категорию
            </Button>
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
        onClose={() => setPendingItemDelete(null)}
        title="Удалить?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPendingItemDelete(null)}>
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

      <Dialog
        open={Boolean(pendingCategoryDelete)}
        onClose={() => setPendingCategoryDelete(null)}
        title="Удалить категорию?"
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
                    title: `Категория «${pendingCategoryDelete.name}» удалена`,
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
        <div className="space-y-1 text-sm">
          <p>«{pendingCategoryDelete?.name}» будет удалена.</p>
          {pendingCategoryDelete && pendingCategoryDelete.descendantCount > 0 && (
            <p className="text-xs text-[var(--status-danger)]">Вместе с ней будут удалены {pendingCategoryDelete.descendantCount} подкатегорий (и товары останутся без категории).</p>
          )}
        </div>
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

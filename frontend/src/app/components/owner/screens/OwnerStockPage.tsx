import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Box, History, Package, Plus, X } from 'lucide-react';
import { apiBlobUrl } from '../../../api';
import { useApp, type AdminShiftInspection, type ShiftChecklist, type StockWriteOff, type StockCategory } from '../../../context/AppContext';
import { Button, Dialog, FormRow, Input, Money, Sheet, toast } from '../../atmosfera';

const STOCK_UNITS = ['л', 'кг', 'шт', 'фл', 'м', 'п.м', 'уп'];

interface OwnerStockPageProps {
  shiftChecklists: ShiftChecklist[];
  adminShiftInspections: AdminShiftInspection[];
}

// ── Helpers for unlimited nesting ──
type CategoryNode = { category: StockCategory; children: CategoryNode[] };

function buildCategoryTree(categories: StockCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { category: c, children: [] }));
  const roots: CategoryNode[] = [];
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.children.push(node);
    else roots.push(node);
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
    nodes.forEach((n) => { out.push({ id: n.category.id, name: n.category.name, depth }); dfs(n.children, depth + 1); });
  };
  dfs(tree, 0);
  return out;
}
function getDescendantIds(categoryId: string, categories: StockCategory[]): Set<string> {
  const map = new Map<string, StockCategory[]>();
  categories.forEach((c) => { if (!c.parentId) return; if (!map.has(c.parentId)) map.set(c.parentId, []); map.get(c.parentId)!.push(c); });
  const result = new Set<string>();
  const queue = [categoryId];
  const visited = new Set<string>();
  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const children = map.get(cur) || [];
    children.forEach((ch) => { result.add(ch.id); queue.push(ch.id); });
  }
  return result;
}
function collectSubtreeIds(node: CategoryNode, categories: StockCategory[]): Set<string> {
  const ids = new Set<string>([node.category.id]);
  getDescendantIds(node.category.id, categories).forEach((id) => ids.add(id));
  return ids;
}

/**
 * OwnerStockPage — вырезка из OwnerApp (§6.4, Фаза 5 / вырезка №1).
 * Склад как у админа (DS Sheet/Dialog вместо prompt/confirm) + блоки
 * чек-листов смен мастеров и «Открытие смены» (owner-only данные приходят props).
 * Теперь безлимитная вложенность категорий.
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
  const categoryTree = useMemo(() => buildCategoryTree(stockCategories), [stockCategories]);
  const flattenedForSelect = useMemo(() => flattenCategories(stockCategories), [stockCategories]);
  const [stockForm, setStockForm] = useState({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit' as 'unit' | 'total', category: '', categoryId: '' });
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<{ id: string; name: string; descendantCount: number } | null>(null);
  const [pendingItemDelete, setPendingItemDelete] = useState<{ id: string; name: string } | null>(null);
  const [addingRootCategory, setAddingRootCategory] = useState(false);
  const [newRootCategoryName, setNewRootCategoryName] = useState('');
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  const [adminShiftPhotoUrls, setAdminShiftPhotoUrls] = useState<Record<string, string>>({});
  const adminShiftPhotoUrlsRef = useRef<Record<string, string>>({});

  const latestShiftChecklists = shiftChecklists.slice(0, 10);
  const latestAdminShiftInspections = adminShiftInspections.slice(0, 8);
  const latestAdminShiftInspectionKey = latestAdminShiftInspections.map((inspection) => `${inspection.id}:${inspection.floorPhotoUrl}`).join('|');

  const totalStockValue = stockItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  useEffect(() => { adminShiftPhotoUrlsRef.current = adminShiftPhotoUrls; }, [adminShiftPhotoUrls]);
  useEffect(() => {
    let cancelled = false;
    const activeIds = new Set(latestAdminShiftInspections.map((inspection) => inspection.id));
    setAdminShiftPhotoUrls((current) => {
      const next: Record<string, string> = {};
      Object.entries(current).forEach(([id, url]) => { if (activeIds.has(id)) next[id] = url; else URL.revokeObjectURL(url); });
      return next;
    });
    const currentPhotoUrls = adminShiftPhotoUrlsRef.current;
    const missing = latestAdminShiftInspections.filter((inspection) => inspection.floorPhotoUrl && !currentPhotoUrls[inspection.id]);
    void Promise.all(missing.map(async (inspection) => ({ id: inspection.id, url: await apiBlobUrl(inspection.floorPhotoUrl), }))).then((loaded) => {
      if (cancelled) { loaded.forEach((item) => URL.revokeObjectURL(item.url)); return; }
      setAdminShiftPhotoUrls((current) => { const next = { ...current }; loaded.forEach((item) => { if (next[item.id]) { URL.revokeObjectURL(item.url); return; } next[item.id] = item.url; }); return next; });
    }).catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAdminShiftInspectionKey]);
  useEffect(() => () => { Object.values(adminShiftPhotoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);
  useEffect(() => { if (showWriteOffHistory) getWriteOffHistory().then(setWriteOffHistory).catch(() => {}); }, [showWriteOffHistory]);

  const handleAddStock = () => {
    if (!stockForm.name || !stockForm.qty) return;
    const qty = Number(stockForm.qty.replace(',', '.'));
    const rawPrice = Number(stockForm.unitPrice.replace(',', '.'));
    const unitPrice = stockForm.priceMode === 'total' && qty > 0 ? rawPrice / qty : rawPrice;
    const selectedCat = stockCategories.find((c) => c.id === stockForm.categoryId);
    addStockItem({ name: stockForm.name, qty, unit: stockForm.unit, unitPrice, category: selectedCat?.name || stockForm.category, categoryId: stockForm.categoryId || undefined });
    setShowAddStock(false);
    setStockForm({ name: '', qty: '', unit: 'шт', unitPrice: '', priceMode: 'unit', category: '', categoryId: '' });
    toast({ type: 'success', title: `Товар "${stockForm.name}" добавлен на склад` });
  };

  const handleWriteOff = () => {
    if (!showWriteOff) return;
    const item = stockItems.find(s => s.id === showWriteOff);
    writeOffStock(showWriteOff, Number(writeOffQty.replace(',', '.')));
    setShowWriteOff(null);
    setWriteOffQty('1');
    if (item) toast({ type: 'success', title: `Списано: ${item.name} — ${writeOffQty} ${item.unit}` });
  };

  const glass = 'border border-border bg-[var(--card)]';
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls = 'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const selectCls = inputCls;

  const renderStockTree = (nodes: CategoryNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const allIds = collectSubtreeIds(node, stockCategories);
      const subtreeItems = stockItems.filter((item) => item.categoryId ? allIds.has(item.categoryId) : item.category === node.category.name);
      if (subtreeItems.length === 0) {
        const childContent = renderStockTree(node.children, depth + 1);
        const hasVisibleChild = node.children.some((ch) => {
          const cid = collectSubtreeIds(ch, stockCategories);
          return stockItems.some((it) => it.categoryId ? cid.has(it.categoryId) : it.category === ch.category.name);
        });
        if (!hasVisibleChild) return null;
        return (
          <div key={node.category.id} className={depth === 0 ? 'mb-4' : 'mt-3 ml-3 border-l border-border pl-3'}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-medium text-sm">{node.category.name}</h3>
              <span className={`text-xs tabular-nums ${sub}`}>0 шт · 0 ₽</span>
            </div>
            {childContent}
          </div>
        );
      }
      const directItems = stockItems.filter((item) => item.categoryId ? item.categoryId === node.category.id : item.category === node.category.name);
      return (
        <div key={node.category.id} className={depth === 0 ? 'mb-4' : 'mt-3 ml-3 border-l border-border pl-3'}>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="font-medium text-sm">{node.category.name}</h3>
            <span className={`text-xs tabular-nums ${sub}`}>{subtreeItems.length} шт · {subtreeItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽</span>
          </div>
          {directItems.length > 0 && (
            <div className="space-y-2">
              {directItems.map(item => (
                <motion.div key={item.id} layout className={`${glass} rounded-xl p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className={`text-xs ${sub}`}>
                        {(() => {
                          if (!item.categoryId || item.categoryId === node.category.id) return '';
                          const cat = stockCategories.find((c) => c.id === item.categoryId);
                          return cat ? cat.name + ' · ' : '';
                        })()}
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
                    <button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }} className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5" style={{ borderColor: 'color-mix(in srgb, var(--primary-600) 30%, transparent)', color: 'var(--primary-600)' }}><Package size={12} strokeWidth={1.75} aria-hidden />Списать</button>
                    <button onClick={() => setPendingItemDelete({ id: item.id, name: item.name })} className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5" style={{ borderColor: 'color-mix(in srgb, var(--status-danger) 30%, transparent)', color: 'var(--status-danger)' }}><X size={12} strokeWidth={1.75} aria-hidden />Удалить</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {node.children.length > 0 && <div className="mt-3">{renderStockTree(node.children, depth + 1)}</div>}
        </div>
      );
    });
  };

  const renderCategoryManagerTree = (nodes: CategoryNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const descendantCount = getDescendantIds(node.category.id, stockCategories).size;
      return (
        <div key={node.category.id} className={`${glass} rounded-xl p-3`} style={{ marginLeft: depth ? 12 : 0, borderLeft: depth ? '2px solid var(--border)' : undefined }}>
          <div className="flex items-center justify-between">
            {renaming?.id === node.category.id ? (
              <InlineRename initial={node.category.name} onSave={(name) => { void updateStockCategory(node.category.id, { name }); setRenaming(null); }} onCancel={() => setRenaming(null)} />
            ) : (
              <>
                <span className="font-medium" style={{ paddingLeft: depth * 2 }}>{node.category.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => setRenaming({ id: node.category.id, name: node.category.name })} className="rounded-lg bg-[var(--sunken,#EEEFF3)] px-2 py-1 text-xs dark:bg-white/10">✎</button>
                  <button onClick={() => setPendingCategoryDelete({ id: node.category.id, name: node.category.name, descendantCount })} className="rounded-lg px-2 py-1 text-xs text-[var(--status-danger)]">✕</button>
                </div>
              </>
            )}
          </div>
          {node.children.length > 0 && <div className="mt-2 space-y-2">{renderCategoryManagerTree(node.children, depth + 1)}</div>}
          {addingSubFor === node.category.id ? (
            <div className="mt-2 flex min-w-0 items-center gap-1.5">
              <Input autoFocus placeholder="Название подкатегории" value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newSubCategoryName.trim()) { void addStockCategory({ name: newSubCategoryName.trim(), parentId: node.category.id }).then(() => toast({ type: 'success', title: `Подкатегория «${newSubCategoryName.trim()}» добавлена` })).catch(() => toast({ type: 'error', title: 'Не удалось добавить подкатегорию' })); setAddingSubFor(null); setNewSubCategoryName(''); } if (e.key === 'Escape') { setAddingSubFor(null); setNewSubCategoryName(''); } }} className="py-1.5 text-sm" />
              <button onClick={() => { if (!newSubCategoryName.trim()) return; void addStockCategory({ name: newSubCategoryName.trim(), parentId: node.category.id }).then(() => toast({ type: 'success', title: `Подкатегория «${newSubCategoryName.trim()}» добавлена` })).catch(() => toast({ type: 'error', title: 'Не удалось добавить подкатегорию' })); setAddingSubFor(null); setNewSubCategoryName(''); }} className="shrink-0 text-xs font-medium text-[var(--status-success)]">ОК</button>
              <button onClick={() => { setAddingSubFor(null); setNewSubCategoryName(''); }} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]"><X size={14} strokeWidth={1.75} aria-hidden /></button>
            </div>
          ) : (
            <button onClick={() => { setAddingSubFor(node.category.id); setNewSubCategoryName(''); }} className="rounded px-2 py-1 mt-2 text-xs text-[var(--primary-600)]">+ Добавить подкатегорию</button>
          )}
        </div>
      );
    });
  };

  return (
    <motion.div key="stock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Склад</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddStock(true)}><Plus size={14} strokeWidth={1.75} aria-hidden />Добавить товар</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowCategoryManager(true)}>Категории</Button>
        </div>
      </div>
      <div className={`${glass} rounded-2xl p-3 mb-4 flex justify-between items-center`}>
        <div><div className={`text-xs ${sub}`}>Стоимость склада</div><div className="font-bold" style={{ color: 'var(--status-success)' }}><Money amount={totalStockValue} /></div></div>
        <div className="text-right"><div className={`text-xs ${sub}`}>Позиций</div><div className="font-bold">{stockItems.length}</div></div>
      </div>
      {categoryTree.length > 0 ? renderStockTree(categoryTree) : null}
      {stockItems.length === 0 && <div className={`${glass} rounded-2xl p-8 text-center`}><Box size={36} strokeWidth={1.75} className={`mx-auto mb-3 ${sub}`} aria-hidden /><p className={sub}>Склад пуст. Добавьте первый товар.</p></div>}
      {(() => {
        const withoutCat = stockItems.filter((item) => !item.categoryId && !stockCategories.some((c) => c.name === item.category));
        if (withoutCat.length === 0) return null;
        return (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1"><h3 className="font-medium text-sm">Без категории</h3><span className={`text-xs tabular-nums ${sub}`}>{withoutCat.length} шт · {withoutCat.reduce((s, i) => s + i.qty * i.unitPrice, 0).toLocaleString('ru')} ₽</span></div>
            <div className="space-y-2">
              {withoutCat.map((item) => (
                <motion.div key={item.id} layout className={`${glass} rounded-xl p-4`}>
                  <div className="flex justify-between items-start mb-2"><div><div className="font-medium text-sm">{item.name}</div><div className={`text-xs ${sub}`}>{item.unitPrice.toLocaleString('ru')} ₽/{item.unit}</div></div><div className="text-right"><div className={`font-bold tabular-nums ${item.qty <= 5 ? 'text-[var(--status-danger)]' : ''}`}>{item.qty} {item.unit}</div><div className={`text-xs tabular-nums ${sub}`}>{(item.qty * item.unitPrice).toLocaleString('ru')} ₽</div></div></div>
                  <div className="grid grid-cols-2 gap-2"><button onClick={() => { setShowWriteOff(item.id); setWriteOffQty('1'); }} className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5" style={{ borderColor: 'color-mix(in srgb, var(--primary-600) 30%, transparent)', color: 'var(--primary-600)' }}><Package size={12} strokeWidth={1.75} aria-hidden />Списать</button><button onClick={() => setPendingItemDelete({ id: item.id, name: item.name })} className="py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5" style={{ borderColor: 'color-mix(in srgb, var(--status-danger) 30%, transparent)', color: 'var(--status-danger)' }}><X size={12} strokeWidth={1.75} aria-hidden />Удалить</button></div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })()}
      <div className="mt-4">
        <button onClick={() => { setShowWriteOffHistory(!showWriteOffHistory); if (!showWriteOffHistory) getWriteOffHistory().then(setWriteOffHistory).catch(() => {}); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${glass}`}><span className="flex items-center gap-2"><History size={15} strokeWidth={1.75} aria-hidden />История списаний</span><span className={`text-xs ${sub}`}>{showWriteOffHistory ? '▲' : '▼'}</span></button>
        {showWriteOffHistory && (
          <div className="mt-2 space-y-2">
            {writeOffHistory.length === 0 && <div className={`text-xs ${sub} text-center py-4`}>Нет списаний</div>}
            {writeOffHistory.map(w => (
              <div key={w.id} className={`${glass} rounded-xl px-3 py-2`}>
                <div className="flex justify-between items-start"><div className="min-w-0 flex-1"><div className="text-sm font-medium">{w.stockItemName}</div>{w.source === 'booking' ? <div className={`text-xs ${sub} space-y-0.5`}>{w.bookingClientName && <div>Клиент: {w.bookingClientName}</div>}{w.bookingService && <div>Услуга: {w.bookingService}</div>}{w.bookingDate && <div>Дата: {w.bookingDate}</div>}{w.bookingWorkerNames && <div>Мастер: {w.bookingWorkerNames}</div>}</div> : <div className={`text-xs ${sub}`}>Ручное списание</div>}</div><div className="text-right shrink-0 ml-2"><div className="text-sm font-medium text-[var(--status-danger)]">-{w.qty} {w.unit}</div><div className={`text-xs tabular-nums ${sub}`}>{w.totalCost.toLocaleString('ru')} ₽</div></div></div><div className={`text-[10px] ${sub} mt-1`}>{new Date(w.createdAt).toLocaleString('ru')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}><div className="flex items-center justify-between gap-3 mb-3"><div><div className="font-semibold">Чек-листы смен мастеров</div><div className={`text-xs ${sub} mt-1`}>Принятие и закрытие смены с остатками химии по каждому мастеру</div></div><div className={`text-xs ${sub}`}>{latestShiftChecklists.length} последних</div></div>{latestShiftChecklists.length === 0 ? <div className={`text-sm ${sub}`}>Пока нет заполненных чек-листов по химии.</div> : <div className="space-y-3">{latestShiftChecklists.map((entry) => (<div key={entry.id} className={`${glass} rounded-2xl p-4`}><div className="flex items-start justify-between gap-3 mb-3"><div><div className="font-medium">{entry.workerName}</div><div className={`text-xs ${sub}`}>{entry.phase === 'start' ? 'Принятие смены' : 'Закрытие смены'} · {entry.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></div><div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: entry.phase === 'start' ? 'color-mix(in srgb, var(--primary-600) 14%, transparent)' : 'color-mix(in srgb, var(--status-success) 14%, transparent)', color: entry.phase === 'start' ? 'var(--primary-600)' : 'var(--status-success)', }}>{entry.phase === 'start' ? 'Смена принята' : 'Смена закрыта'}</div></div><div className="space-y-2">{entry.items.map((item) => (<div key={`${entry.id}-${item.stockItemId}`} className={`${glass} rounded-xl px-3 py-2.5 flex items-center justify-between gap-3`}><div className="min-w-0"><div className="text-sm font-medium">{item.name}</div><div className={`text-[11px] ${sub}`}>{entry.phase === 'end' ? `Было: ${item.startQty ?? '-'} ${item.unit} · Осталось: ${item.actualQty} ${item.unit}` : `По факту: ${item.actualQty} ${item.unit}`}</div></div>{entry.phase === 'end' && <div className="text-right shrink-0"><div className="text-sm font-semibold">-{Math.max(0, (item.startQty ?? item.actualQty) - item.actualQty)} {item.unit}</div><div className={`text-[11px] ${sub}`}>расход</div></div>}</div>))}</div>{entry.note && <div className={`text-xs ${sub} mt-3`}>Примечание: {entry.note}</div>}</div>))}</div>}</div>}
      {!isAccountant && <div className={`${glass} rounded-2xl p-4 mt-4`}><div className="flex items-center justify-between gap-3 mb-3"><div><div className="font-semibold">Открытие смены</div><div className={`text-xs ${sub} mt-1`}>Открытия смены админом и владельцем: мастера на смене и решение владельца</div></div><div className={`text-xs ${sub}`}>{latestAdminShiftInspections.length} последних</div></div>{latestAdminShiftInspections.length === 0 ? <div className={`text-sm ${sub}`}>Смены ещё не открывались.</div> : <div className="space-y-3">{latestAdminShiftInspections.map((inspection) => (<div key={inspection.id} className={`${glass} rounded-2xl p-4`}><div className="flex items-start justify-between gap-3 mb-3"><div><div className="font-medium">{inspection.adminName}</div><div className={`text-xs ${sub}`}>{inspection.createdAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div></div><div className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `color-mix(in srgb, var(--status-${inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'danger'}) 15%, transparent)`, color: `var(--status-${inspection.status === 'pending' ? 'warning' : inspection.status === 'approved' ? 'success' : 'danger'})`, }}>{inspection.status === 'pending' ? 'На подтверждении' : inspection.status === 'approved' ? 'Подтверждено' : 'Отказано'}</div></div>{inspection.floorPhotoUrl ? (adminShiftPhotoUrls[inspection.id] ? <img src={adminShiftPhotoUrls[inspection.id]} alt="Фото открытия смены" className="mb-3 h-44 w-full rounded-2xl object-cover" /> : <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>Загружаем фото открытия смены...</div>) : <div className={`${glass} mb-3 flex h-44 w-full items-center justify-center rounded-2xl text-sm ${sub}`}>Открыта владельцем, без фото</div>}<div className="grid grid-cols-1 gap-2 md:grid-cols-2"><div className={`${glass} rounded-xl p-3`}><div className={`text-[11px] ${sub} mb-1`}>Мастера на смене</div><div className="text-sm font-medium">{inspection.masters.filter((item) => item.checked).map((item) => item.workerName).join(', ') || 'Не выбраны'}</div></div><div className={`${glass} rounded-xl p-3`}><div className={`text-[11px] ${sub} mb-1`}>Проверенные расходники</div><div className="text-sm font-medium">{inspection.supplies.filter((item) => item.checked).map((item) => item.name).join(', ') || 'Не отмечены'}</div></div></div><div className={`text-xs ${sub} mt-3`}>Чистые тряпки: {inspection.clothsReady ? 'Да' : 'Нет'}</div>{inspection.note && <div className={`text-xs ${sub} mt-1`}>Комментарий: {inspection.note}</div>}{inspection.issueNote && <div className="text-xs text-[var(--status-danger)] mt-2">Причина отказа: {inspection.issueNote}</div>}{inspection.reviewedAt && <div className={`text-[11px] ${sub} mt-2`}>Решение принято {inspection.reviewedAt.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>}</div>))}</div>}</div>}

      <Sheet open={showAddStock} onClose={() => setShowAddStock(false)} title="Добавить товар">
        <div className="space-y-3">
          <FormRow label="Название"><Input placeholder="Автошампунь..." value={stockForm.name} onChange={e => setStockForm(p => ({ ...p, name: e.target.value }))} /></FormRow>
          <div className="grid grid-cols-2 gap-2"><FormRow label="Количество"><Input inputMode="decimal" value={stockForm.qty} onChange={e => setStockForm(p => ({ ...p, qty: e.target.value }))} /></FormRow><FormRow label="Единица"><select className={selectCls} value={stockForm.unit} onChange={e => setStockForm(p => ({ ...p, unit: e.target.value }))}>{STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></FormRow></div>
          <FormRow label={`Цена ${stockForm.priceMode === 'total' ? 'за все' : 'за ед.'} (₽)`}><div className="flex gap-2"><Input className="flex-1" inputMode="decimal" value={stockForm.unitPrice} onChange={e => setStockForm(p => ({ ...p, unitPrice: e.target.value }))} /><button type="button" onClick={() => setStockForm(p => ({ ...p, priceMode: p.priceMode === 'unit' ? 'total' : 'unit', unitPrice: '' }))} className="text-xs px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: 'var(--primary-50)', color: 'var(--primary-700)' }}>{stockForm.priceMode === 'unit' ? 'за всё' : 'за ед.'}</button></div></FormRow>
          <FormRow label="Категория">
            <select className={selectCls} value={stockForm.categoryId} onChange={(e) => { const cat = stockCategories.find((c) => c.id === e.target.value); setStockForm((p) => ({ ...p, categoryId: e.target.value, category: cat?.name || p.category })); }}>
              <option value="">— Без категории —</option>
              {flattenedForSelect.map((c) => <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth) + (c.depth > 0 ? '— ' : '') + c.name}</option>)}
            </select>
            {flattenedForSelect.length === 0 && <div className={`mt-1 text-xs ${sub}`}>Сначала создайте категорию в менеджере категорий</div>}
          </FormRow>
        </div>
        <div className="mt-5 pb-2"><Button size="lg" disabled={!stockForm.name || !stockForm.qty} onClick={handleAddStock}>Добавить на склад</Button></div>
      </Sheet>

      <Sheet open={showCategoryManager} onClose={() => { setShowCategoryManager(false); setRenaming(null); setAddingRootCategory(false); setAddingSubFor(null); }} title="Категории склада">
        <div className="space-y-3 pb-2">
          {categoryTree.length === 0 && <div className={`py-6 text-center text-sm ${sub}`}>Категорий пока нет. Создайте первую.</div>}
          {renderCategoryManagerTree(categoryTree)}
        </div>
        <div className="pb-2">
          {addingRootCategory ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Input autoFocus placeholder="Название новой категории" value={newRootCategoryName} onChange={(e) => setNewRootCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newRootCategoryName.trim()) { void addStockCategory({ name: newRootCategoryName.trim() }).then(() => toast({ type: 'success', title: `Категория «${newRootCategoryName.trim()}» добавлена` })).catch(() => toast({ type: 'error', title: 'Не удалось добавить категорию' })); setAddingRootCategory(false); setNewRootCategoryName(''); } if (e.key === 'Escape') { setAddingRootCategory(false); setNewRootCategoryName(''); } }} className="py-1.5 text-sm" />
              <button onClick={() => { if (!newRootCategoryName.trim()) return; void addStockCategory({ name: newRootCategoryName.trim() }).then(() => toast({ type: 'success', title: `Категория «${newRootCategoryName.trim()}» добавлена` })).catch(() => toast({ type: 'error', title: 'Не удалось добавить категорию' })); setAddingRootCategory(false); setNewRootCategoryName(''); }} className="shrink-0 text-xs font-medium text-[var(--status-success)]">ОК</button>
              <button onClick={() => { setAddingRootCategory(false); setNewRootCategoryName(''); }} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]"><X size={14} strokeWidth={1.75} aria-hidden /></button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => { setAddingRootCategory(true); setNewRootCategoryName(''); }}>+ Добавить категорию</Button>
          )}
        </div>
      </Sheet>

      <Dialog open={Boolean(showWriteOff)} onClose={() => setShowWriteOff(null)} title="Списать товар" footer={<><Button variant="secondary" className="flex-1" onClick={() => setShowWriteOff(null)}>Отмена</Button><Button variant="danger" className="flex-1" onClick={handleWriteOff}>Списать</Button></>}>
        <p className={`text-sm ${sub} mb-3`}>{stockItems.find(s => s.id === showWriteOff)?.name}</p>
        <FormRow label="Количество"><Input inputMode="decimal" value={writeOffQty} onChange={e => setWriteOffQty(e.target.value)} /></FormRow>
      </Dialog>
      <Dialog open={Boolean(pendingItemDelete)} onClose={() => setPendingItemDelete(null)} title="Удалить?" footer={<><Button variant="secondary" className="flex-1" onClick={() => setPendingItemDelete(null)}>Отмена</Button><Button variant="danger" className="flex-1" onClick={async () => { if (!pendingItemDelete) return; try { await deleteStockItem(pendingItemDelete.id); toast({ type: 'success', title: `«${pendingItemDelete.name}» удалён со склада` }); } catch (err) { toast({ type: 'error', title: err instanceof Error ? err.message : 'Не удалось удалить' }); } setPendingItemDelete(null); }}>Удалить</Button></>}>«{pendingItemDelete?.name}» будет удалён со склада.</Dialog>
      <Dialog open={Boolean(pendingCategoryDelete)} onClose={() => setPendingCategoryDelete(null)} title="Удалить категорию?" footer={<><Button variant="secondary" className="flex-1" onClick={() => setPendingCategoryDelete(null)}>Отмена</Button><Button variant="danger" className="flex-1" onClick={async () => { if (!pendingCategoryDelete) return; try { await deleteStockCategory(pendingCategoryDelete.id); toast({ type: 'success', title: `Категория «${pendingCategoryDelete.name}» удалена` }); } catch { toast({ type: 'error', title: 'Не удалось удалить категорию' }); } setPendingCategoryDelete(null); }}>Удалить</Button></>}>
        <div className="space-y-1 text-sm"><p>«{pendingCategoryDelete?.name}» будет удалена.</p>{pendingCategoryDelete && pendingCategoryDelete.descendantCount > 0 && <p className="text-xs text-[var(--status-danger)]">Вместе с ней будут удалены {pendingCategoryDelete.descendantCount} подкатегорий (товары останутся без категории).</p>}</div>
      </Dialog>
    </motion.div>
  );
}

function InlineRename({ initial, onSave, onCancel, }: { initial: string; onSave: (name: string) => void; onCancel: () => void; }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSave(value.trim()); if (e.key === 'Escape') onCancel(); }} className="py-1.5 text-sm" />
      <button onClick={() => value.trim() && onSave(value.trim())} className="shrink-0 text-xs font-medium text-[var(--status-success)]">ОК</button>
      <button onClick={onCancel} className="shrink-0 text-xs text-[var(--fg-secondary,#5A6072)]"><X size={14} strokeWidth={1.75} aria-hidden /></button>
    </div>
  );
}

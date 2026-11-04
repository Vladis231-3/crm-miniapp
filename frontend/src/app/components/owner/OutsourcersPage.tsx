import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from '../../api';

type Period = 'week' | 'month' | 'all' | 'custom';

interface ReportRow {
  id: string; name: string; phone: string; note: string; active: boolean;
  count: number; price: number; paid: number; left: number;
}
interface Report { rows: ReportRow[]; totalPrice: number; totalPaid: number; totalLeft: number; }
interface Movement {
  bookingId: string; date: string; time: string; clientName: string; service: string;
  price: number; paid: number; left: number;
}
interface Movements { rows: Movement[]; totalPrice: number; totalPaid: number; totalLeft: number; }

const NO_EXECUTOR_ID = 'none';
const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё время' },
  { id: 'custom', label: 'Период' },
];
const rub = (value: number) => `${value.toLocaleString('ru')} ₽`;

interface OutsourcersPageProps {
  glass: string;
  sub: string;
  inputCls: string;
  primary: string;
  onBack: () => void;
}

export function OutsourcersPage({ glass, sub, inputCls, primary, onBack }: OutsourcersPageProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [movements, setMovements] = useState<Movements | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string | null; name: string; phone: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useCallback(() => {
    if (period === 'custom' && (!dateFrom || !dateTo)) return null;
    const params = new URLSearchParams({ period });
    if (period === 'custom') {
      params.set('date_from', dateFrom);
      params.set('date_to', dateTo);
    }
    return params.toString();
  }, [period, dateFrom, dateTo]);

  const loadReport = useCallback(() => {
    const params = query();
    if (!params) { setReport(null); return; }
    setError(null);
    apiRequest<Report>(`/api/owner/outsourcers/report?${params}`)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить отчёт'));
  }, [query]);
  useEffect(() => { loadReport(); }, [loadReport]);

  useEffect(() => {
    const params = query();
    if (!selected || !params) { setMovements(null); return; }
    apiRequest<Movements>(`/api/owner/outsourcers/${selected.id}/movements?${params}`)
      .then(setMovements)
      .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось загрузить движения'));
  }, [selected, query]);

  const saveForm = async () => {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body = { name: form.name, phone: form.phone, note: form.note };
      if (form.id) {
        await apiRequest(`/api/outsourcers/${form.id}`, { method: 'PATCH', body });
      } else {
        await apiRequest('/api/outsourcers', { method: 'POST', body });
      }
      setForm(null);
      setSelected((current) => (current && form.id === current.id ? { ...current, ...body } : current));
      loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: ReportRow) => {
    setError(null);
    try {
      await apiRequest(`/api/outsourcers/${row.id}`, { method: 'PATCH', body: { active: !row.active } });
      setSelected({ ...row, active: !row.active });
      loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const periodPicker = (
    <div className="mb-4">
      <div className="grid grid-cols-4 gap-1.5">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`rounded-xl py-2 text-xs font-medium min-h-[40px] ${period === item.id ? 'text-white' : glass}`}
            style={period === item.id ? { background: primary } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input className={inputCls} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className={inputCls} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      )}
    </div>
  );

  const editForm = form && (
    <div className={`${glass} rounded-2xl p-4 mb-4 space-y-2`}>
      <div className="font-medium text-sm">{form.id ? 'Изменить аутсорсера' : 'Новый аутсорсер'}</div>
      <input className={inputCls} placeholder="Название или имя" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <input className={inputCls} placeholder="Телефон" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <textarea className={inputCls} placeholder="Заметка" rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      <div className="flex gap-3 text-sm">
        <button type="button" className="font-medium min-h-[36px] disabled:opacity-50" style={{ color: primary }} disabled={saving || !form.name.trim()} onClick={() => { void saveForm(); }}>Сохранить</button>
        <button type="button" className={`${sub} min-h-[36px]`} onClick={() => setForm(null)}>Отмена</button>
      </div>
    </div>
  );

  const errorBox = error && <div className="text-sm text-red-500 mb-3">{error}</div>;

  const totals = (data: { totalPrice: number; totalPaid: number; totalLeft: number }) => (
    <div className={`${glass} rounded-2xl p-4 mb-4 grid grid-cols-3 gap-2`}>
      <div><div className={`text-[11px] ${sub} mb-0.5`}>Цена клиенту</div><div className="font-semibold text-sm tabular-nums">{rub(data.totalPrice)}</div></div>
      <div><div className={`text-[11px] ${sub} mb-0.5`}>Отдали</div><div className="font-semibold text-sm tabular-nums text-red-500">{rub(data.totalPaid)}</div></div>
      <div><div className={`text-[11px] ${sub} mb-0.5`}>Осталось нам</div><div className="font-semibold text-sm tabular-nums text-green-500">{rub(data.totalLeft)}</div></div>
    </div>
  );

  if (selected) {
    const isRealCard = selected.id !== NO_EXECUTOR_ID;
    return (
      <div className="px-4 py-4">
        <button type="button" onClick={() => { setSelected(null); setForm(null); }} className={`flex items-center gap-2 ${sub} mb-4 text-sm min-h-[36px]`}><ArrowLeft size={16} strokeWidth={1.75} />К списку</button>
        <h2 className="font-semibold mb-1">{selected.name}{selected.active ? '' : ' (отключён)'}</h2>
        {(selected.phone || selected.note) && <p className={`text-xs ${sub} mb-3`}>{[selected.phone, selected.note].filter(Boolean).join(' · ')}</p>}
        {isRealCard && (
          <div className="flex gap-4 text-xs mb-4">
            <button type="button" className="font-medium min-h-[32px]" style={{ color: primary }} onClick={() => setForm({ id: selected.id, name: selected.name, phone: selected.phone, note: selected.note })}>Изменить</button>
            <button type="button" className={`${sub} min-h-[32px]`} onClick={() => { void toggleActive(selected); }}>{selected.active ? 'Отключить' : 'Включить'}</button>
          </div>
        )}
        {editForm}
        {errorBox}
        {periodPicker}
        {movements && totals(movements)}
        {movements && movements.rows.length === 0 && <div className={`text-sm ${sub} text-center py-6`}>За этот период работ нет</div>}
        <div className="space-y-2">
          {movements?.rows.map((row, index) => (
            <div key={`${row.bookingId}-${index}`} className={`${glass} rounded-2xl p-3`}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-medium min-w-0 truncate">{row.service}</span>
                <span className="font-semibold tabular-nums shrink-0">{rub(row.price)}</span>
              </div>
              <div className={`text-xs ${sub} mt-0.5`}>{row.date}{row.time ? ` ${row.time}` : ''} · {row.clientName}</div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-red-500">Отдали {rub(row.paid)}</span>
                <span className="text-green-500">Осталось {rub(row.left)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <button type="button" onClick={onBack} className={`flex items-center gap-2 ${sub} mb-4 text-sm min-h-[36px]`}><ArrowLeft size={16} strokeWidth={1.75} />Назад</button>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-semibold">Аутсорсеры</h2>
        {!form && <button type="button" className="text-sm font-medium min-h-[36px]" style={{ color: primary }} onClick={() => setForm({ id: null, name: '', phone: '', note: '' })}>+ Добавить</button>}
      </div>
      <p className={`text-xs ${sub} mb-4`}>Сколько отдали исполнителям и сколько осталось нам. Считаются только завершённые записи.</p>
      {editForm}
      {errorBox}
      {periodPicker}
      {report && totals(report)}
      {report && report.rows.length === 0 && <div className={`text-sm ${sub} text-center py-6`}>Аутсорсеров пока нет</div>}
      <div className="space-y-2">
        {report?.rows.map((row) => (
          <button key={row.id} type="button" onClick={() => setSelected(row)} className={`${glass} rounded-2xl p-3 w-full text-left`}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-medium min-w-0 truncate">{row.name}{row.active ? '' : ' (отключён)'}</span>
              <span className="font-semibold tabular-nums shrink-0 text-red-500">{rub(row.paid)}</span>
            </div>
            <div className={`flex justify-between text-xs ${sub} mt-0.5`}>
              <span>Работ: {row.count}</span>
              <span>Осталось нам {rub(row.left)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

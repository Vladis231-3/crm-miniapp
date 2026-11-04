import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api';

export interface Outsourcer {
  id: string;
  name: string;
  phone: string;
  note: string;
  active: boolean;
}

// Справочник для выбора исполнителя в записи (бэк: GET/POST /api/outsourcers).
export function useOutsourcers() {
  const [outsourcers, setOutsourcers] = useState<Outsourcer[]>([]);
  const reload = useCallback(() => {
    apiRequest<Outsourcer[]>('/api/outsourcers')
      .then(setOutsourcers)
      .catch(() => setOutsourcers([]));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const create = useCallback(async (name: string) => {
    const created = await apiRequest<Outsourcer>('/api/outsourcers', { method: 'POST', body: { name } });
    setOutsourcers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
    return created;
  }, []);
  return { outsourcers, reload, create };
}

export type OutsourcersApi = ReturnType<typeof useOutsourcers>;

interface OutsourcerFieldsProps {
  api: OutsourcersApi;
  outsourcerId: string;
  onOutsourcerChange: (id: string) => void;
  amount: number;
  onAmountChange: (value: number) => void;
  // Цена услуги: для подсказки об остатке и проверки суммы.
  price: number;
  inputCls: string;
  sub: string;
}

export function OutsourcerFields({
  api, outsourcerId, onOutsourcerChange, amount, onAmountChange, price, inputCls, sub,
}: OutsourcerFieldsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = api.outsourcers.filter((item) => item.active || item.id === outsourcerId);
  const left = (Number(price) || 0) - (Number(amount) || 0);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      const created = await api.create(name);
      onOutsourcerChange(created.id);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить аутсорсера');
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-xs ${sub} block`}>Аутсорсер</label>
          <button type="button" className={`text-xs ${sub} underline min-h-[32px]`} onClick={() => setAdding((v) => !v)}>
            {adding ? 'Отмена' : '+ новый'}
          </button>
        </div>
        {adding ? (
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Название или имя"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button
              type="button"
              className={`${inputCls} !w-auto shrink-0 font-medium`}
              disabled={!newName.trim()}
              onClick={() => { void handleCreate(); }}
            >
              Добавить
            </button>
          </div>
        ) : (
          <select className={inputCls} value={outsourcerId} onChange={(event) => onOutsourcerChange(event.target.value)}>
            <option value="">Выберите аутсорсера</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>{item.name}{item.active ? '' : ' (отключён)'}</option>
            ))}
          </select>
        )}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
      <div>
        <label className={`text-xs ${sub} block mb-1`}>Сумма аутсорсеру (₽)</label>
        <input
          className={inputCls}
          type="number"
          min={0}
          value={amount === 0 ? '' : amount}
          onChange={(event) => onAmountChange(Math.max(0, Number(event.target.value) || 0))}
        />
        {left < 0 ? (
          <div className="text-xs text-red-500 mt-1">Сумма больше цены услуги на {Math.abs(left).toLocaleString('ru')} ₽</div>
        ) : (
          <div className={`text-xs ${sub} mt-1`}>Остаётся нам: {left.toLocaleString('ru')} ₽. Мастера, копилка и владельцы считаются от этой суммы.</div>
        )}
      </div>
    </div>
  );
}

interface BookingOutsourceEditorProps {
  api: OutsourcersApi;
  booking: {
    price: number;
    isOutsource?: boolean;
    outsourceAmount?: number | null;
    outsourcerId?: string | null;
    additionalServices?: Array<{ price: number; priceMode?: string }>;
  };
  onSave: (patch: { isOutsource: boolean; outsourceAmount?: number; outsourcerId?: string }) => Promise<void>;
  inputCls: string;
  sub: string;
  primary: string;
}

// Аутсорс основной услуги в карточке записи: показать и поправить, в том числе у завершённой.
export function BookingOutsourceEditor({ api, booking, onSave, inputCls, sub, primary }: BookingOutsourceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draftId, setDraftId] = useState('');
  const [draftAmount, setDraftAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const additionalTotal = (booking.additionalServices || []).reduce(
    (sum, item) => sum + (item.priceMode === 'subtract' ? 0 : Number(item.price) || 0), 0,
  );
  const mainPrice = Math.max(0, (Number(booking.price) || 0) - additionalTotal);
  const name = api.outsourcers.find((item) => item.id === booking.outsourcerId)?.name;

  const open = () => {
    setDraftId(booking.outsourcerId || '');
    setDraftAmount(Number(booking.outsourceAmount) || 0);
    setError(null);
    setEditing(true);
  };

  const save = async (patch: Parameters<typeof onSave>[0]) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        {booking.isOutsource ? (
          <span>
            <span className={sub}>Аутсорс: </span>
            {name || 'без исполнителя'} · {(Number(booking.outsourceAmount) || 0).toLocaleString('ru')} ₽
            <span className={sub}> · остаётся {(mainPrice - (Number(booking.outsourceAmount) || 0)).toLocaleString('ru')} ₽</span>
          </span>
        ) : (
          <span className={sub}>Аутсорса нет</span>
        )}
        <button type="button" className="text-xs font-medium min-h-[32px] shrink-0" style={{ color: primary }} onClick={open}>
          {booking.isOutsource ? 'Изменить' : 'Указать'}
        </button>
      </div>
    );
  }

  const invalid = !draftId || draftAmount <= 0 || draftAmount > mainPrice;
  return (
    <div className="space-y-2">
      <OutsourcerFields
        api={api}
        outsourcerId={draftId}
        onOutsourcerChange={setDraftId}
        amount={draftAmount}
        onAmountChange={setDraftAmount}
        price={mainPrice}
        inputCls={inputCls}
        sub={sub}
      />
      {error && <div className="text-xs text-red-500">{error}</div>}
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          className="font-medium min-h-[36px] disabled:opacity-50"
          style={{ color: primary }}
          disabled={invalid || saving}
          onClick={() => { void save({ isOutsource: true, outsourceAmount: draftAmount, outsourcerId: draftId }); }}
        >
          Сохранить
        </button>
        <button type="button" className={`${sub} min-h-[36px]`} disabled={saving} onClick={() => setEditing(false)}>Отмена</button>
        {booking.isOutsource && (
          <button
            type="button"
            className="text-red-500 min-h-[36px]"
            disabled={saving}
            onClick={() => { void save({ isOutsource: false }); }}
          >
            Убрать аутсорс
          </button>
        )}
      </div>
    </div>
  );
}

import { AlertCircle } from 'lucide-react';
import type { Worker } from '../../../context/AppContext';
import { Button, Dialog } from '../../atmosfera';

export interface AssignedWorkerDraft {
  id: string;
  percent: number | '';
  payType: 'percent' | 'fixed';
  fixedAmount?: number;
}

export interface AssignWorkersDialogProps {
  open: boolean;
  onClose: () => void;
  masters: Worker[];
  assignedWorkers: AssignedWorkerDraft[];
  onAssignedChange: (next: AssignedWorkerDraft[]) => void;
  isFixedService: boolean;
  totalPercent: number;
  /** notify=true → «Назначить и уведомить» */
  onConfirm: (notify: boolean) => void;
}

/** AssignWorkersDialog — назначение мастеров на запись (§6.2). Клампы 1-в-1 из родителя. */
export function AssignWorkersDialog({
  open,
  onClose,
  masters,
  assignedWorkers,
  onAssignedChange,
  isFixedService,
  totalPercent,
  onConfirm,
}: AssignWorkersDialogProps) {
  const sub = 'text-[var(--fg-secondary,#5A6072)]';
  const inputCls =
    'min-w-0 flex-1 rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,#EEEFF3)] px-3 py-1.5 text-sm text-foreground outline-none focus:border-[var(--ring)] dark:bg-white/[.06]';
  const segBtn = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${active ? 'bg-[var(--primary-600)] text-white' : 'border border-border bg-[var(--card-raised,var(--card))]'}`;

  return (
    <Dialog open={open} onClose={onClose} title="Назначить мастеров" className="max-w-sm">
      <div className="space-y-3">
        {masters.map((worker) => {
          const assigned = assignedWorkers.find((aw) => aw.id === worker.id);
          return (
            <div key={worker.id} className="rounded-xl border border-border bg-[var(--card-raised,var(--card))] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${worker.available ? 'bg-[var(--status-success)]' : 'bg-[var(--switch-background,#9CA3AF)]'}`}
                  />
                  <span className="text-sm font-medium">{worker.name}</span>
                  <span className={`text-xs ${sub}`}>{worker.experience}</span>
                </div>
                <button
                  onClick={() =>
                    assigned
                      ? onAssignedChange(assignedWorkers.filter((aw) => aw.id !== worker.id))
                      : onAssignedChange([...assignedWorkers, { id: worker.id, percent: worker.defaultPercent, payType: 'percent' }])
                  }
                  className={`rounded-lg px-3 py-1 text-xs transition-colors ${assigned ? 'text-white' : 'text-[var(--primary-600)]'}`}
                  style={{ background: assigned ? 'var(--primary-600)' : 'var(--primary-50)' }}
                >
                  {assigned ? 'Выбран' : 'Выбрать'}
                </button>
              </div>
              {assigned && !isFixedService && (
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => onAssignedChange(assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, payType: 'fixed', fixedAmount: 0 } : aw)))}
                    className={segBtn(assigned.payType === 'fixed')}
                  >
                    ₽
                  </button>
                  <button
                    onClick={() => onAssignedChange(assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, payType: 'percent', fixedAmount: undefined } : aw)))}
                    className={segBtn(assigned.payType === 'percent')}
                  >
                    %
                  </button>
                  {assigned.payType === 'fixed' ? (
                    <input
                      type="number"
                      min={0}
                      value={assigned.fixedAmount ?? ''}
                      onChange={(e) => {
                        const r = e.target.value;
                        if (r === '') {
                          onAssignedChange(assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, fixedAmount: undefined } : aw)));
                          return;
                        }
                        const n = parseInt(r);
                        if (!isNaN(n)) {
                          onAssignedChange(assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, fixedAmount: Math.max(0, n) } : aw)));
                        }
                      }}
                      placeholder="сумма"
                      className={inputCls}
                    />
                  ) : (
                    <>
                      <span className={`text-xs ${sub}`}>%</span>
                      <input
                        type="number"
                        step="0.00001"
                        min={0}
                        max={100}
                        value={assigned.percent === '' ? '' : assigned.percent}
                        onChange={(e) => {
                          const r = e.target.value;
                          if (r === '') {
                            onAssignedChange(assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, percent: '' } : aw)));
                            return;
                          }
                          const n = parseFloat(r);
                          if (!isNaN(n)) {
                            onAssignedChange(
                              assignedWorkers.map((aw) =>
                                aw.id === worker.id ? { ...aw, percent: Math.min(100, Math.max(0, n)) } : aw,
                              ),
                            );
                          }
                        }}
                        onBlur={() =>
                          onAssignedChange(
                            assignedWorkers.map((aw) => (aw.id === worker.id ? { ...aw, percent: aw.percent === '' ? 0 : aw.percent } : aw)),
                          )
                        }
                        className={inputCls}
                      />
                    </>
                  )}
                </div>
              )}
              {assigned && isFixedService && <span className={`text-xs font-medium ${sub}`}>фикс</span>}
            </div>
          );
        })}
      </div>

      {!isFixedService && assignedWorkers.some((aw) => aw.payType !== 'fixed') && totalPercent > 100 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-[var(--status-danger)]">
          <AlertCircle size={14} strokeWidth={1.75} aria-hidden />
          Сумма процентов превышает 100%
        </div>
      )}

      <div className="space-y-2">
        <Button className="w-full" onClick={() => onConfirm(true)}>
          Назначить и уведомить
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => onConfirm(false)}>
          Назначить без уведомления
        </Button>
      </div>
    </Dialog>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../ui/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const TIMERS = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const l of listeners) l([...items]);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  const t = TIMERS.get(id);
  if (t) clearTimeout(t);
  TIMERS.delete(id);
  emit();
}

/** Императивный показ toast: toast({ type:'success', title:'Сохранено' }). */
export function toast(input: { type?: ToastType; title: string; description?: string; durationMs?: number }) {
  const id = nextId++;
  items = [...items.slice(-2), { id, type: input.type ?? 'info', title: input.title, description: input.description }];
  emit();
  TIMERS.set(id, setTimeout(() => dismiss(id), input.durationMs ?? 4000));
}

const ICON: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const ACCENT: Record<ToastType, string> = {
  success: 'text-[var(--status-success)]',
  error: 'text-[var(--status-danger)]',
  info: 'text-[var(--status-info)]',
};

/**
 * Toaster — смонтировать ОДИН раз в корне приложения (App.tsx).
 * Позиция: сверху под header (§4.5), z-index --z-toast.
 */
export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+12px)] flex flex-col items-center gap-2 px-4"
      style={{ zIndex: 'var(--z-toast)' } as React.CSSProperties}
    >
      <AnimatePresence>
        {list.map((t) => {
          const Icon = ICON[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-border bg-[var(--card-raised,var(--card))] px-4 py-3 shadow-lg',
              )}
              role="status"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', ACCENT[t.type])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] leading-snug text-[var(--fg-secondary,#5A6072)]">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Закрыть уведомление"
                className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--fg-muted,#8A91A0)] hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

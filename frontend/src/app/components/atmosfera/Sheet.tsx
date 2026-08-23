import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../ui/utils';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * bottom — снизу (мобильный стандарт).
   * auto — снизу <768px, справа ≥768px (десктопный slide-over, §6.2).
   */
  side?: 'bottom' | 'auto';
  /** Скрыть крестик (если закрытие обеспечивают кнопки в контенте). */
  hideClose?: boolean;
}

function useIsWide() {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/**
 * Sheet — единственная нижняя/боковая панель DS (§4.8 №11).
 * Заменяет ~40 самописных AnimatePresence-оверлеев.
 * z-index: --z-sheet; Escape и клик по фону закрывают; скролл-лок body.
 */
export function Sheet({ open, onClose, title, children, footer, side = 'bottom', hideClose }: SheetProps) {
  const wide = useIsWide();
  const dockRight = side === 'auto' && wide;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: 'var(--z-sheet)' } as React.CSSProperties}>
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'absolute flex flex-col bg-[var(--card-raised,var(--card))] text-foreground shadow-xl',
              dockRight
                ? 'inset-y-0 right-0 w-full max-w-md rounded-l-3xl'
                : 'inset-x-0 bottom-0 max-h-[88vh] rounded-t-[20px]',
            )}
            initial={dockRight ? { x: '100%' } : { y: '100%' }}
            animate={dockRight ? { x: 0 } : { y: 0 }}
            exit={dockRight ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'tween', duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {!dockRight && (
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--border-strong)]" aria-hidden />
            )}
            {(title || !hideClose) && (
              <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-3">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--fg-secondary,#5A6072)] transition-colors hover:bg-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(16px+var(--safe-bottom))] pt-2">
              {children}
            </div>
            {footer && (
              <div className="border-t border-border px-5 pb-[calc(12px+var(--safe-bottom))] pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../ui/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Dialog — центрированная модалка DS (§4.8 №12).
 * Заменяет window.confirm/prompt и самописные confirm-модалки.
 * z-index: --z-dialog; Escape/фон закрывают.
 */
export function Dialog({ open, onClose, title, children, footer, className }: DialogProps) {
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
        <div
          className="fixed inset-0 grid place-items-center p-5"
          style={{ zIndex: 'var(--z-dialog)' } as React.CSSProperties}
        >
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
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative w-full max-w-sm rounded-3xl bg-[var(--card-raised,var(--card))] p-5 text-foreground shadow-xl',
              className,
            )}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {title && (
              <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.01em]">{title}</h3>
            )}
            <div className="text-[15px] leading-relaxed text-[var(--fg-secondary,#5A6072)]">
              {children}
            </div>
            {footer && <div className="mt-4 flex gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

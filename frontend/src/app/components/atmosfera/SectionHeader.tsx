import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface SectionHeaderProps {
  /** Надзаголовок kicker-стилем (11px, uppercase, tracking). */
  kicker?: string;
  title: ReactNode;
  /** Слот справа (кнопка «Все», переключатель и т.п.). */
  action?: ReactNode;
  className?: string;
}

/** SectionHeader — заголовок секции экрана (§4.8 №23). */
export function SectionHeader({ kicker, title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {kicker && (
          <div className="section-kicker mb-1">{kicker}</div>
        )}
        <h2 className="text-[20px] font-[650] leading-tight tracking-[-0.015em] text-foreground">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../ui/utils';

export type CardVariant = 'solid' | 'glass' | 'action';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

/**
 * Card — базовая поверхность (§4.8 №6). Радиус 16px, border --border.
 * variant:
 *  - solid: обычная карточка (--card)
 *  - glass: glass-1 поверх цветных подложек (§4.4)
 *  - action: акцентная подложка primary-soft
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'solid', className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border',
        variant === 'solid' && 'border-border bg-[var(--card)]',
        variant === 'glass' && 'glass-1',
        variant === 'action' &&
          'border-transparent bg-[var(--surface-action,var(--accent))]',
        className,
      )}
      {...rest}
    />
  );
});

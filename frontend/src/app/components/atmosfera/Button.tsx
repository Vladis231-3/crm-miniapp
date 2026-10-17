import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Обязателен, если внутри только иконка (a11y §4.9). */
  'aria-label'?: string;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--primary-600)] text-white hover:bg-[var(--primary-500)] active:bg-[var(--primary-700)] disabled:bg-[var(--primary-300)] dark:disabled:bg-[var(--primary-300)] shadow-[0_2px_2px_rgba(22,61,52,0.06)]',
  secondary:
    'border border-[#e1e7e1] bg-white text-[#67766a] hover:bg-[#eef3ef] hover:border-[#d3ddd4] disabled:opacity-50',
  ghost:
    'text-[var(--muted-foreground,#8a9690)] hover:bg-[var(--accent,#eaf2ed)] hover:text-[var(--green,#285f4f)] disabled:opacity-50',
  danger:
    'bg-[var(--status-danger)] text-white hover:opacity-90 disabled:opacity-50',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  lg: 'h-12 w-full rounded-[9px] px-5 text-[15px] font-medium',
  md: 'h-10 rounded-[7px] px-4 text-[13px] font-medium',
  sm: 'h-9 rounded-[6px] px-3 text-[12px] font-medium',
};

/**
 * Button — единственная кнопка DS (§4.8 №1).
 * Hit-area ≥44px на lg/md (h-12/h-10 + компенсация у sm через m-минимумы родителя).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

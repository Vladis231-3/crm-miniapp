import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../ui/utils';

const baseField =
  'w-full rounded-xl border border-[var(--input,var(--border))] bg-[var(--input-background,var(--sunken,#EEEFF3))] px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-[var(--fg-muted,#8A91A0)] outline-none transition-colors focus:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--status-danger)]';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Показывает error-состояние границы (§4.8 №2). */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(baseField, 'h-11', className)}
      {...rest}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(baseField, 'resize-none', className)}
      {...rest}
    />
  );
});

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../ui/utils';

const baseField =
  'w-full rounded-[7px] border border-[#dfe6e1] bg-white px-3 py-2.5 text-[13px] text-[#42534a] placeholder:text-[#98a19a] outline-none transition-colors focus:border-[#9db3a6] focus-visible:ring-2 focus-visible:ring-[#2b5d4918] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--status-danger)]';

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
      className={cn(baseField, 'h-10', className)}
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

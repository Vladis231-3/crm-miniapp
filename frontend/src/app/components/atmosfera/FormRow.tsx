import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export interface FormRowProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  /** Подсказка под полем (caption). */
  hint?: ReactNode;
  /** Текст ошибки — перекрывает hint, активирует error-стиль у поля снаружи. */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** FormRow — label + control + helper/error (§4.8 №22). */
export function FormRow({ label, htmlFor, required, hint, error, children, className }: FormRowProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-[var(--fg-secondary,#5A6072)]"
      >
        {label}
        {required && <span className="ml-0.5 text-[var(--status-danger)]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] leading-snug text-[var(--status-danger)]">{error}</p>
      ) : hint ? (
        <p className="text-[13px] leading-snug text-[var(--fg-muted,#8A91A0)]">{hint}</p>
      ) : null}
    </div>
  );
}

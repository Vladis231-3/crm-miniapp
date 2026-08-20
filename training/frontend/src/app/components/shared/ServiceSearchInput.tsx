import React from 'react';
import { Search } from 'lucide-react';

interface ServiceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Классы для input (стили должны включать py/padding, кроме left padding — он задаётся здесь: pl-9) */
  inputCls?: string;
  /** Классы для иконки поиска */
  iconCls?: string;
}

/** Поле поиска по услугам: иконка лупы + управляемый input. */
export function ServiceSearchInput({
  value,
  onChange,
  placeholder = 'Поиск услуг...',
  inputCls = '',
  iconCls = '',
}: ServiceSearchInputProps) {
  return (
    <div className="relative">
      <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconCls}`} />
      <input
        className={`${inputCls} pl-9`}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
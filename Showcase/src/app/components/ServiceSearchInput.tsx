import { useState } from "react";
import { Search } from "lucide-react";

interface ServiceSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Дополнительные классы для input (кроме left padding — он задаётся здесь: pl-10) */
  className?: string;
}

/** Поле поиска по услугам: иконка лупы + управляемый input (тёмная тема Showcase). */
export function ServiceSearchInput({ value, onChange, placeholder = "Search services...", className = "" }: ServiceSearchInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border text-sm text-white placeholder-white/30 outline-none transition-colors ${focused ? "border-sky-500/60" : "border-white/10"} ${className}`}
      />
    </div>
  );
}
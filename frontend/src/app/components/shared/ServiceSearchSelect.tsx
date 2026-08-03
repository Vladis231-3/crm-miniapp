import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Service } from '../../context/AppContext';

interface ServiceSearchSelectProps {
  value: string;
  onChange: (serviceId: string) => void;
  services: Service[];
  selectCls?: string;
  inputCls?: string;
  text?: string;
  sub?: string;
  primary?: string;
  isDark?: boolean;
  placeholder?: string;
}

export function ServiceSearchSelect({
  value,
  onChange,
  services,
  selectCls = '',
  inputCls = '',
  text = '',
  sub = '',
  primary = '',
  isDark = false,
  placeholder = 'Выберите услугу',
}: ServiceSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedService = services.find((s) => s.id === value);

  const filtered = query.trim()
    ? services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : services;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (serviceId: string) => {
    onChange(serviceId);
    setIsOpen(false);
    setQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (query.trim() || services.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {selectedService && !isOpen ? (
        <div
          className={`${selectCls} cursor-pointer flex items-center justify-between`}
          onClick={() => { setIsOpen(true); setQuery(''); }}
        >
          <span>{selectedService.name}</span>
          <Search size={14} className={sub} />
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
          <input
            ref={inputRef}
            className={`${inputCls} pl-9`}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            autoFocus
          />
        </div>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-2xl shadow-xl ${isDark ? 'bg-[#0E1624] border border-white/10' : 'bg-white border border-black/5 shadow-sm'}`}
        >
          {filtered.length === 0 ? (
            <div className={`px-4 py-3 text-sm ${sub}`}>Ничего не найдено</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full text-left px-4 py-3 text-sm hover:bg-white/10 transition-colors ${s.id === value ? (primary ? `font-semibold` : '') : ''}`}
                style={s.id === value && primary ? { color: primary } : {}}
                onClick={() => handleSelect(s.id)}
              >
                <div className="flex items-center justify-between">
                  <span>{s.name}</span>
                  {s.id === value && <CheckIcon />}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

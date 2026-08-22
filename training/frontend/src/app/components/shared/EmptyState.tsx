import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Единое пустое состояние для списков и экранов.
 * Иконка в мягкой плитке + заголовок + опциональный подзаголовок.
 */
export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 select-none">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-black/[.04] dark:bg-white/[.05]">
        <Icon size={24} strokeWidth={1.5} className="text-zinc-400 dark:text-zinc-500" />
      </div>
      <p className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">{title}</p>
      {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[230px] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

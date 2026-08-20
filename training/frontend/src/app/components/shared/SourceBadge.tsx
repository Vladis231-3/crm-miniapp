import React from 'react';

export function sourceBadgeMeta(source?: string | null): { label: string; cls: string } | null {
  if (!source) return null;
  const map: Record<string, { label: string; cls: string }> = {
    bot: { label: 'Бот', cls: 'bg-sky-500/15 text-sky-600' },
    google: { label: 'Google', cls: 'bg-[#4285F4]/15 text-[#4285F4]' },
    manual: { label: 'Вручную', cls: 'bg-slate-500/15 text-slate-500' },
  };
  return map[source] || null;
}

export function SourceBadge({ source, className }: { source?: string | null; className?: string }) {
  const badge = sourceBadgeMeta(source);
  if (!badge) return null;
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls} ${className || ''}`}>
      {badge.label}
    </span>
  );
}
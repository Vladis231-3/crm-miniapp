import React from 'react';

/**
 * Скелетон-плитка загрузки. Мягкая пульсация, нейтральный цинк.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/[.06] dark:bg-white/[.06] ${className}`} />;
}

/** Скелетон строки списка (как карточка записи) */
export function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-black/[.06] dark:border-white/10 p-4 flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <Skeleton className="h-6 w-14 rounded-lg shrink-0" />
    </div>
  );
}

/** Стопка из нескольких строк */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2.5" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

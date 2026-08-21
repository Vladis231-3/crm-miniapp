import React, { type ReactNode } from 'react';
import { Bell, Moon, Sun, type LucideIcon } from 'lucide-react';

export type NavItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
  active?: boolean;
  onSelect?: () => void;
};

export function RoleNavigation<T extends string>({ items, active, onSelect }: { items: NavItem<T>[]; active: T; onSelect: (id: T) => void }) {
  return (
    <nav className="role-nav" aria-label="Основная навигация">
      <div className="role-nav__scroll">
        {items.map((item) => {
          const selected = item.active ?? item.id === active;
          return (
            <button key={item.id} type="button" className={`role-nav__item ${selected ? 'is-active' : ''}`} aria-current={selected ? 'page' : undefined} aria-label={item.label} onClick={() => item.onSelect ? item.onSelect() : onSelect(item.id)}>
              <span className="role-nav__icon" aria-hidden="true"><item.icon size={19} strokeWidth={2} />{!!item.badge && <span className="role-nav__badge">{item.badge}</span>}</span>
              <span className="role-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function WorkspaceHeader({ eyebrow, title, subtitle, leading, actions, isDark, onToggleTheme, unreadCount, onNotifications }: { eyebrow?: string; title: string; subtitle?: string; leading?: ReactNode; actions?: ReactNode; isDark?: boolean; onToggleTheme?: () => void; unreadCount?: number; onNotifications?: () => void }) {
  return (
    <header className="work-header">
      <div className="flex min-w-0 items-center gap-3">{leading}<div className="min-w-0">{eyebrow && <div className="section-kicker">{eyebrow}</div>}<div className="truncate text-base font-semibold">{title}</div>{subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}</div></div>
      <div className="flex items-center gap-2">{actions}{onNotifications && <button type="button" onClick={onNotifications} className="header-action" aria-label="Уведомления"><Bell size={18} aria-hidden="true" />{!!unreadCount && <span className="role-nav__badge">{unreadCount}</span>}</button>}{onToggleTheme && <button type="button" onClick={onToggleTheme} className="header-action" aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}>{isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>}</div>
    </header>
  );
}

export function MetricSurface({ label, value, icon: Icon, tone = 'default' }: { label: string; value: ReactNode; icon?: LucideIcon; tone?: 'default' | 'accent' | 'success' | 'warning' }) {
  return <div className={`metric-surface metric-surface--${tone}`}><div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span>{Icon && <Icon size={15} aria-hidden="true" />}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>;
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

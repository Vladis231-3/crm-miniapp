import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Check, ChevronDown, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Role, RolePreviewOption } from '../../context/AppContext';

/**
 * Переключатель предпросмотра ролей («посмотреть интерфейс как …»).
 *
 * Доступен исключительно создателю: бэкенд возвращает rolePreview.available=true
 * только для Telegram id из CREATOR_TELEGRAM_IDS (по умолчанию 974738256),
 * поэтому для всех остальных компонент не отрисовывается вовсе.
 *
 * Монтируется ВНЕ ErrorBoundary приложений ролей — если просматриваемый
 * интерфейс упадёт (например, панель мастера), переключатель останется
 * доступным и можно вернуться к своей роли.
 */
export function RolePreviewSwitcher() {
  const { isDark, rolePreview, startRolePreview, stopRolePreview } = useApp();
  const [open, setOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!rolePreview?.available) return null;

  const primary = isDark ? '#6E76F2' : '#4F46E5';
  const sub = isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]';
  const panelBg = isDark ? 'bg-[#1C1C1F] border-white/10' : 'bg-white border-black/10';
  const chipBg = isDark ? 'bg-white/5 border-white/10' : 'bg-black/[.03] border-black/[.06]';
  const hoverBg = isDark ? 'hover:bg-white/8' : 'hover:bg-black/[.04]';

  const isActivePreview = Boolean(rolePreview.activeRole);
  const activeOption = rolePreview.roles.find((option) => option.role === rolePreview.activeRole) || null;

  const handleStart = async (role: Role, actorId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startRolePreview(role, actorId);
      setOpen(false);
      setExpandedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось включить предпросмотр');
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await stopRolePreview();
      setOpen(false);
      setExpandedRole(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выйти из предпросмотра');
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (role: Role) => setExpandedRole((current) => (current === role ? null : role));

  const renderRoleSection = (option: RolePreviewOption) => {
    const roleActive = option.role === rolePreview.activeRole;
    const expanded = expandedRole === option.role;
    return (
      <div key={option.role} className={`${chipBg} border rounded-2xl overflow-hidden`}>
        <button
          type="button"
          onClick={() => toggleRole(option.role)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${hoverBg}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{option.label}</span>
              {roleActive && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: '#D97706' }}
                >
                  активен
                </span>
              )}
            </div>
            {option.description && <div className={`text-xs ${sub} mt-0.5`}>{option.description}</div>}
          </div>
          <span className={`text-[11px] ${sub} shrink-0`}>{option.actors.length}</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
        {expanded && (
          <div className="px-2 pb-2">
            {option.actors.map((actor) => {
              const actorActive = roleActive && rolePreview.activeActorId === actor.id;
              return (
                <button
                  key={actor.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void handleStart(option.role, actor.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors disabled:opacity-50 ${hoverBg}`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{ background: `${primary}18`, color: primary }}
                  >
                    {(actor.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{actor.name}</div>
                    {actor.login && <div className={`text-[11px] ${sub} truncate`}>{actor.login}</div>}
                  </div>
                  {actorActive && <Check size={16} strokeWidth={2} style={{ color: '#D97706' }} className="shrink-0" />}
                  {busy && !actorActive && <Loader2 size={14} className={`shrink-0 animate-spin ${sub}`} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Плавающая кнопка — над нижней навигацией приложений */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed left-4 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[110] flex items-center gap-1.5 rounded-full pl-3 pr-3.5 py-2 text-xs font-medium shadow-lg border backdrop-blur-xl transition-colors ${
          isActivePreview
            ? 'text-white border-amber-600/40'
            : `${isDark ? 'bg-[#1C1C1F]/92 border-white/10 text-[#E4E4E7]' : 'bg-white/92 border-black/[.06] text-[#131316]'}`
        }`}
        style={isActivePreview ? { background: '#D97706' } : undefined}
        aria-label="Предпросмотр ролей"
      >
        <Eye size={14} strokeWidth={1.75} />
        {isActivePreview
          ? `Как: ${rolePreview.activeActorName || 'неизвестно'}`
          : 'Роли'}
      </button>

      {/* Bottom-sheet выбора роли */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[130] bg-black/55"
          onClick={() => {
            if (!busy) {
              setOpen(false);
              setExpandedRole(null);
            }
          }}
        >
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 mx-auto max-w-md border rounded-t-3xl shadow-2xl ${panelBg}`}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} strokeWidth={1.75} style={{ color: primary }} />
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">Предпросмотр ролей</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setExpandedRole(null);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hoverBg}`}
                aria-label="Закрыть"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <p className={`text-xs ${sub} px-5 pb-3`}>
              Откройте интерфейс от имени другого аккаунта. Доступно только создателю.
            </p>

            {/* Активный предпросмотр */}
            {isActivePreview && (
              <div className="mx-5 mb-3 rounded-2xl p-3.5 border" style={{ background: 'rgba(217,119,6,0.12)', borderColor: 'rgba(217,119,6,0.35)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: '#D97706' }}>
                      Сейчас открыт: {activeOption?.label || rolePreview.activeRole}
                    </div>
                    <div className={`text-xs ${sub} mt-0.5 truncate`}>
                      {rolePreview.activeActorName || '—'} · вы {rolePreview.realActorName || 'создатель'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleStop()}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: '#D97706' }}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} strokeWidth={1.75} />}
                    Вернуться
                  </button>
                </div>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className="mx-5 mb-3 flex items-start gap-2 rounded-2xl p-3 bg-red-500/10 border border-red-500/25">
                <AlertCircle size={15} strokeWidth={1.75} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}

            {/* Список ролей */}
            <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[60vh] overflow-y-auto space-y-2">
              {rolePreview.roles.length === 0 && (
                <div className={`text-xs ${sub} text-center py-6`}>
                  Нет доступных аккаунтов для предпросмотра.
                </div>
              )}
              {rolePreview.roles.map(renderRoleSection)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

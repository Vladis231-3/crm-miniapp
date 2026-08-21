import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, GraduationCap, Info, X, ChevronLeft, Sparkles } from 'lucide-react';
import { TRAINING_INTRO, TRAINING_SCRIPT } from './assistantScript';
import { TOUR_SECTIONS, dispatchTrainingNavigate, type TourRole, type TourStep } from './tourTypes';
import { useApp } from '../../../context/AppContext';

const LS_KEY = 'atmosfera_training_done';
const ROBOT_SIZE = 56;
const BUBBLE_MAX_W = 360;

type Mode = 'boot' | 'intro' | 'rolePicker' | 'tour' | 'idle' | 'hidden';

interface Rect { x: number; y: number; w: number; h: number; }
interface Spot extends Rect { radius: string; }

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
function getStepsForRole(role: TourRole): TourStep[] {
  // welcome всегда + выбранная роль + финал (all)
  return TRAINING_SCRIPT.filter(s => !s.role || s.role === role || s.role === 'welcome' || s.role === 'all');
}

/**
 * Обучающий помощник — летает по всем окнам, подсвечивает и объясняет.
 * Авто-переключает страницы/табы, можно выбрать роль и идти дальше.
 */
export function TrainingAssistant() {
  const { isDark, session } = useApp();
  const [mode, setMode] = useState<Mode>('boot');
  const [introIdx, setIntroIdx] = useState(0);
  const [selectedRole, setSelectedRole] = useState<TourRole | null>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - ROBOT_SIZE - 20 : 300,
    y: typeof window !== 'undefined' ? window.innerHeight - ROBOT_SIZE - 120 : 300,
  }));
  const [bubble, setBubble] = useState<{ x: number; y: number; w: number } | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flyMs, setFlyMs] = useState(900);
  const [justFinishedRole, setJustFinishedRole] = useState<TourRole | null>(null);
  const timers = useRef<number[]>([]);
  const skipGreetingRef = useRef(false);

  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const surface = isDark ? 'bg-[#0E1624] text-[#E6EEF8] border-white/10' : 'bg-white text-[#0B1226] border-black/10';

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(id => window.clearTimeout(id)); }, []);

  const currentRoleFromSession = (): TourRole => {
    const r = session?.role as string | undefined;
    if (r === 'client' || r === 'admin' || r === 'worker' || r === 'owner' || r === 'accountant') {
      if (r === 'accountant') return 'owner';
      return r as TourRole;
    }
    return 'welcome';
  };

  /* ── Позиция пузыря + робота у элемента ── */
  const placeAround = useCallback((el: Element) => {
    const r = rectOf(el);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = Math.min(BUBBLE_MAX_W, vw - 32);
    const bubbleAbove = r.y > 320;
    const bx = clamp(r.x + r.w / 2 - bw / 2, 16, vw - bw - 16);
    const bubbleRect = bubbleAbove
      ? { x: bx, y: Math.max(12, r.y - 228), w: bw }
      : { x: bx, y: Math.min(vh - 212, r.y + r.h + 14), w: bw };
    const rx = clamp(r.x + r.w / 2 - ROBOT_SIZE / 2, 12, vw - ROBOT_SIZE - 12);
    const robotRect = bubbleAbove
      ? { x: rx, y: Math.min(vh - ROBOT_SIZE - 16, r.y + r.h + 16), w: ROBOT_SIZE, h: ROBOT_SIZE }
      : { x: rx, y: Math.max(16, r.y - ROBOT_SIZE - 20), w: ROBOT_SIZE, h: ROBOT_SIZE };
    setSpot({
      x: r.x - 4,
      y: r.y - 4,
      w: r.w + 8,
      h: r.h + 8,
      radius: getComputedStyle(el).borderRadius || '14px',
    });
    setPos({ x: robotRect.x, y: robotRect.y });
    setBubble(bubbleRect);
  }, []);

  const placeCenter = useCallback((bubbleY: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bw = Math.min(BUBBLE_MAX_W, vw - 32);
    setPos({ x: (vw - ROBOT_SIZE) / 2, y: vh - ROBOT_SIZE - 240 });
    setBubble({ x: (vw - bw) / 2, y: bubbleY, w: bw });
  }, []);

  /* ── Старты ── */
  const startRolePicker = useCallback((finishedRole: TourRole | null = null) => {
    setJustFinishedRole(finishedRole);
    setMenuOpen(false);
    setSpot(null);
    setFlyMs(550);
    setPos({ x: (window.innerWidth - ROBOT_SIZE) / 2, y: window.innerHeight - ROBOT_SIZE - 240 });
    setBubble({ x: (window.innerWidth - BUBBLE_MAX_W) / 2, y: window.innerHeight - 500, w: Math.min(BUBBLE_MAX_W, window.innerWidth - 32) });
    setMode('rolePicker');
  }, []);

  const startIntro = useCallback(() => {
    setIntroIdx(0);
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);
    setPos({ x: window.innerWidth + 20, y: window.innerHeight - ROBOT_SIZE - 110 });
    later(() => {
      setFlyMs(700);
      setPos({ x: window.innerWidth - ROBOT_SIZE - 20, y: window.innerHeight - ROBOT_SIZE - 110 });
      setBubble({
        x: (window.innerWidth - BUBBLE_MAX_W) / 2,
        y: window.innerHeight - 360,
        w: Math.min(BUBBLE_MAX_W, window.innerWidth - 32),
      });
    }, 70);
    setMode('intro');
  }, [later]);

  useEffect(() => {
    if (mode !== 'boot') return;
    later(() => {
      // Муся всегда приветствует при заходе, не ждёт клика
      if (localStorage.getItem(LS_KEY) === '1') {
        startRolePicker(null);
      } else {
        startIntro();
      }
    }, 650);
  }, [mode, later, startIntro, startRolePicker]);

  const startTour = useCallback((role: TourRole) => {
    const all = getStepsForRole(role);
    if (all.length === 0) {
      setMode('idle');
      return;
    }
    // Переключить и демо-роль в HelpDemoApp (без TG ID)
    try {
      window.dispatchEvent(new CustomEvent('training:switch-help-role', { detail: { role } }));
      dispatchTrainingNavigate({ app: role } as any);
    } catch {}
    setSelectedRole(role);
    setSteps(all);
    setStepIdx(0);
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);
    setMode('tour');
  }, []);

  /* ── Idle: Муся приветствует, а не просто летает ── */
  useEffect(() => {
    if (mode !== 'idle') return;
    if (skipGreetingRef.current) {
      skipGreetingRef.current = false;
      setBubble(null);
      setSpot(null);
      setFlyMs(600);
      setPos({ x: window.innerWidth - ROBOT_SIZE - 16, y: window.innerHeight - ROBOT_SIZE - 16 });
      const wander = () => {
        setFlyMs(3200);
        setPos({
          x: clamp(24 + Math.random() * (window.innerWidth - ROBOT_SIZE - 64), 8, window.innerWidth - ROBOT_SIZE - 8),
          y: clamp(90 + Math.random() * (window.innerHeight - ROBOT_SIZE - 210), 40, window.innerHeight - ROBOT_SIZE - 40),
        });
      };
      const id = window.setInterval(wander, 5200);
      return () => window.clearInterval(id);
    }
    // Сразу приветствие от Муси при входе в idle
    setFlyMs(600);
    const vw = window.innerWidth;
    const bw = Math.min(BUBBLE_MAX_W, vw - 32);
    setPos({ x: (vw - ROBOT_SIZE) / 2, y: window.innerHeight - ROBOT_SIZE - 220 });
    setBubble({ x: (vw - bw) / 2, y: window.innerHeight - 380, w: bw });
    // Муся не просто летает — показывает приветствие 4с, затем начинает прогулку
    const wander = () => {
      setFlyMs(3200);
      setPos({
        x: clamp(24 + Math.random() * (window.innerWidth - ROBOT_SIZE - 64), 8, window.innerWidth - ROBOT_SIZE - 8),
        y: clamp(90 + Math.random() * (window.innerHeight - ROBOT_SIZE - 210), 40, window.innerHeight - ROBOT_SIZE - 40),
      });
      setBubble(null);
      setSpot(null);
    };
    const hideTimer = window.setTimeout(() => {
      setBubble(null);
      wander();
    }, 4200);
    const id = window.setInterval(wander, 5200);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearInterval(id);
    };
  }, [mode]);

  /* ── RolePicker positioning ── */
  useEffect(() => {
    if (mode !== 'rolePicker') return;
    setFlyMs(550);
    placeCenter(window.innerHeight - 520);
    const onResize = () => placeCenter(window.innerHeight - 520);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mode, placeCenter]);

  /* ── Tour step ── */
  const current = steps[stepIdx];
  useEffect(() => {
    if (mode !== 'tour') return;
    if (!current) {
      if (selectedRole) localStorage.setItem(`${LS_KEY}_${selectedRole}`, '1');
      // после тура предложить выбрать следующую роль
      later(() => startRolePicker(selectedRole), 300);
      return;
    }
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);

    if (!current.target) {
      setFlyMs(550);
      placeCenter(window.innerHeight - 460);
      return;
    }

    // Автонавигация перед поиском элемента
    if (current.navigate) {
      const nav = current.navigate;
      const app = nav.app || (current.role as TourRole) || selectedRole || 'welcome';
      dispatchTrainingNavigate({
        app: app as TourRole,
        page: nav.page,
        tab: nav.tab,
        section: nav.section ?? undefined,
      });
    }

    // Ждём появления элемента (до ~0.85с, с учётом анимации перехода)
    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(current.target!);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        later(() => placeAround(el), 260);
        return;
      }
      attempts += 1;
      if (attempts < 9) {
        later(tryFind, 90);
      } else {
        // Не нашли — пропускаем шаг
        later(() => setStepIdx(i => i + 1), 150);
      }
    };
    later(tryFind, current.navigate ? 280 : 80);

    // Re-place on resize/scroll while step active
    const onRecalc = () => {
      const el = current.target ? document.querySelector(current.target) : null;
      if (el && mode === 'tour') placeAround(el);
    };
    window.addEventListener('resize', onRecalc);
    window.addEventListener('scroll', onRecalc, true);
    return () => {
      window.removeEventListener('resize', onRecalc);
      window.removeEventListener('scroll', onRecalc, true);
    };
  }, [mode, current, selectedRole, later, placeAround, placeCenter, startRolePicker]);

  /* ── Actions ── */
  const finishTour = useCallback(() => {
    if (selectedRole) localStorage.setItem(`${LS_KEY}_${selectedRole}`, '1');
    startRolePicker(selectedRole);
  }, [selectedRole, startRolePicker]);

  const skipAll = useCallback(() => {
    skipGreetingRef.current = false;
    setMode('idle');
  }, []);
  const goToCorner = useCallback(() => {
    skipGreetingRef.current = true;
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);
    setFlyMs(600);
    setPos({ x: window.innerWidth - ROBOT_SIZE - 16, y: window.innerHeight - ROBOT_SIZE - 16 });
    setMode('idle');
  }, []);

  const handleRobotClick = useCallback(() => {
    if (mode === 'idle') setMenuOpen(o => !o);
    else if (mode === 'tour' || mode === 'intro' || mode === 'rolePicker') setMenuOpen(false);
  }, [mode]);

  if (mode === 'hidden' || mode === 'boot') return null;

  const inIntro = mode === 'intro';
  const inTour = mode === 'tour';
  const inPicker = mode === 'rolePicker';
  const lastIntro = introIdx >= TRAINING_INTRO.length - 1;

  // Определить рекомендуемую роль (текущая сессия)
  const suggestedRole = currentRoleFromSession();

  const progress = inTour && current ? { idx: stepIdx + 1, total: steps.length, pct: Math.round(((stepIdx + 1) / steps.length) * 100) } : null;
  const inIdleGreeting = mode === 'idle' && !!bubble && !menuOpen;

  const bubbleBody = inIdleGreeting ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold mb-1">Привет! Я — Муся</div>
          <div className="text-xs leading-relaxed opacity-80">Я твой помощник. Нажми на меня, чтобы выбрать роль — я полечу по всем окнам, подсветю нужные места и всё объясню.</div>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => setMode('hidden')} className="text-xs opacity-60 px-2 py-1">Скрыть</button>
        <button onClick={() => startRolePicker(null)} className="text-xs font-semibold px-3.5 py-2 rounded-xl text-white shadow" style={{ background: primary }}>Выбрать роль</button>
      </div>
    </div>
  ) : inIntro ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold mb-1">{TRAINING_INTRO[introIdx].title}</div>
          <div className="text-xs leading-relaxed opacity-80">{TRAINING_INTRO[introIdx].text}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] opacity-50">{introIdx + 1} / {TRAINING_INTRO.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={skipAll} className="text-xs px-2.5 py-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity">Пропустить</button>
          <button
            onClick={() => (lastIntro ? startRolePicker(null) : setIntroIdx(i => i + 1))}
            className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-xl text-white shadow transition-transform active:scale-95"
            style={{ background: primary }}
          >
            {lastIntro ? 'Выбрать роль' : 'Далее'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  ) : inPicker ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface} max-h-[70vh] overflow-y-auto`}>
      <div className="flex items-start gap-2.5 mb-3">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold mb-1">
            {justFinishedRole ? `Готово — тур «${TOUR_SECTIONS.find(s => s.id === justFinishedRole)?.label}» завершён!` : 'Выберите роль для обучения'}
          </div>
          <div className="text-xs leading-relaxed opacity-80">
            {justFinishedRole ? 'Куда полетим дальше? Выберите следующую роль — я, Муся, подсветю все её окна и объясню каждый элемент.' : 'Я — Муся, летаю по всем окнам и подсвечиваю места, о которых рассказываю. Выберите, с чего начать — в любой момент можно переключиться.'}
          </div>
        </div>
        <button onClick={skipAll} className="opacity-50 hover:opacity-100 transition-opacity shrink-0"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {TOUR_SECTIONS.filter(s => s.id !== 'welcome').map(s => {
          const isSuggested = s.id === suggestedRole;
          const isDone = !!localStorage.getItem(`${LS_KEY}_${s.id}`);
          return (
            <button
              key={s.id}
              onClick={() => startTour(s.id)}
              className={`relative rounded-xl p-3 text-left border transition-all active:scale-98 ${isSuggested ? 'border-transparent text-white shadow' : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-white hover:bg-gray-50'}`}
              style={isSuggested ? { background: primary } : {}}
            >
              <div className="text-base leading-none mb-1">{s.icon} <span className="text-xs font-bold ml-1">{s.label}</span> {isDone && <span className="text-[10px] opacity-70 ml-1">✓</span>}</div>
              <div className={`text-[11px] leading-tight ${isSuggested ? 'text-white/80' : 'opacity-60'}`}>{s.description}</div>
              {isSuggested && <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-white text-black font-bold shadow">вы тут</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => startTour('welcome')} className={`flex items-center gap-1 text-xs px-3 py-2 rounded-xl border ${isDark ? 'border-white/10 hover:bg-white/10' : 'border-black/10 hover:bg-gray-50'}`}>
          <Sparkles size={12} /> Только приветствие
        </button>
        <button onClick={goToCorner} className="text-xs opacity-60 hover:opacity-100 px-2 py-1">Позже</button>
      </div>
      {justFinishedRole && <div className="mt-2 text-[11px] opacity-50 text-center">Хотите повторить? Просто выберите роль снова — я покажу тур заново.</div>}
    </div>
  ) : inTour && current ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface}`}>
      {progress && (
        <div className="h-1 rounded-full mb-2 overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progress.pct}%`, background: primary }} />
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-bold">{current.title}</span>
            {current.role && current.role !== 'all' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${primary}18`, color: primary }}>
                {TOUR_SECTIONS.find(s => s.id === current.role)?.label || current.role}
              </span>
            )}
          </div>
          <div className="text-xs leading-relaxed opacity-80">{current.text}</div>
        </div>
        <button onClick={skipAll} className="opacity-50 hover:opacity-100 transition-opacity shrink-0"><X size={14} /></button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStepIdx(i => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className={`p-2 rounded-xl border text-xs ${stepIdx === 0 ? 'opacity-30 pointer-events-none' : 'hover:opacity-80'} ${isDark ? 'border-white/10' : 'border-black/10'}`}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[10px] opacity-50">Шаг {progress ? progress.idx : stepIdx + 1} / {steps.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={skipAll} className="text-xs opacity-60 hover:opacity-100 px-2 py-1">Пропустить тур</button>
          <button
            onClick={() => (stepIdx + 1 >= steps.length ? finishTour() : setStepIdx(i => i + 1))}
            className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-xl text-white shadow transition-transform active:scale-95"
            style={{ background: primary }}
          >
            {stepIdx + 1 >= steps.length ? 'Завершить' : 'Далее'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const menuBody = menuOpen && mode === 'idle' ? (
    <div className={`rounded-2xl p-2 shadow-2xl border w-64 ${surface}`}>
      <div className="text-[11px] font-bold px-3 py-1.5 opacity-60">Привет! Я — Муся 🤖</div>
      <button onClick={() => startRolePicker(null)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left">
        <GraduationCap size={15} style={{ color: primary }} /> Выбрать роль и начать тур
      </button>
      <button onClick={() => { localStorage.removeItem(LS_KEY); TOUR_SECTIONS.forEach(s => localStorage.removeItem(`${LS_KEY}_${s.id}`)); startIntro(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left">
        <Info size={15} style={{ color: primary }} /> О студии ATMOSFERA
      </button>
      <button onClick={() => setMode('hidden')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left">
        <X size={15} className="opacity-60" /> Скрыть помощника
      </button>
    </div>
  ) : null;

  return (
    <>
      {(inTour || inPicker) && spot && (
        <div
          className="training-spot"
          style={{
            position: 'fixed',
            left: spot.x,
            top: spot.y,
            width: spot.w,
            height: spot.h,
            borderRadius: spot.radius,
            zIndex: 9998,
            pointerEvents: 'none',
            border: `2px solid ${primary}`,
            boxShadow: '0 0 0 9999px rgba(2, 8, 23, 0.45), 0 0 24px rgba(10, 132, 255, 0.35)',
            transition: 'all 0.32s ease',
          }}
        />
      )}
      <AnimatePresence>
        {bubble && bubbleBody && (
          <motion.div
            key={inIntro ? `intro-${introIdx}` : inPicker ? 'picker' : `step-${stepIdx}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', left: bubble.x, top: bubble.y, width: bubble.w, zIndex: 9999 }}
          >
            {bubbleBody}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {menuBody && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed',
              left: clamp(pos.x - 80, 8, window.innerWidth - 240),
              top: clamp(pos.y - 190, 8, window.innerHeight - 220),
              zIndex: 9999,
            }}
          >
            {menuBody}
          </motion.div>
        )}
      </AnimatePresence>
      <div
        onClick={handleRobotClick}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: ROBOT_SIZE,
          height: ROBOT_SIZE,
          zIndex: 9999,
          cursor: mode === 'idle' ? 'pointer' : 'default',
          transition: `left ${flyMs}ms cubic-bezier(0.33, 1, 0.68, 1), top ${flyMs}ms cubic-bezier(0.33, 1, 0.68, 1)`,
        }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full h-full rounded-full flex items-center justify-center text-[26px] shadow-xl select-none"
          style={{
            background: isDark ? 'linear-gradient(135deg, #16233F, #1B2A4A)' : 'linear-gradient(135deg, #FFFFFF, #EAF2FF)',
            border: `2px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(10,132,255,0.4)'}`,
          }}
        >
          🤖
        </motion.div>
      </div>
    </>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, GraduationCap, Info, RotateCcw, X } from 'lucide-react';
import { TRAINING_INTRO, TRAINING_SCRIPT, type TourStep } from './assistantScript';
import { useApp } from '../../../context/AppContext';

const LS_KEY = 'atmosfera_training_done';
const ROBOT_SIZE = 56;
const BUBBLE_MAX_W = 330;

type Mode = 'boot' | 'intro' | 'tour' | 'idle' | 'hidden';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Spot extends Rect {
  radius: string;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Обучающий мини-помощник (training-версия).
 *
 * При заходе появляется робот 🤖: рассказывает о продукте, затем плавно
 * перелетает к элементам экрана, подсвечивает их и объясняет назначение.
 * После тура робот остаётся в режиме прогулки по экрану; клик по нему
 * открывает меню (пройти обучение ещё раз / о продукте / скрыть).
 */
export function TrainingAssistant() {
  const { isDark } = useApp();
  const [mode, setMode] = useState<Mode>('boot');
  const [introIdx, setIntroIdx] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - ROBOT_SIZE - 20,
    y: window.innerHeight - ROBOT_SIZE - 120,
  }));
  const [bubble, setBubble] = useState<{ x: number; y: number; w: number } | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flyMs, setFlyMs] = useState(900);
  const timers = useRef<number[]>([]);

  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const surface = isDark ? 'bg-[#0E1624] text-[#E6EEF8] border-white/10' : 'bg-white text-[#0B1226] border-black/10';

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  /* ── Старт вступления (рассказ о продукте) ─────────────────────────── */
  const startIntro = useCallback(() => {
    setIntroIdx(0);
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);
    // робот прилетает из-за правого края экрана
    setPos({ x: window.innerWidth + 20, y: window.innerHeight - ROBOT_SIZE - 110 });
    later(() => {
      setFlyMs(1100);
      setPos({ x: window.innerWidth - ROBOT_SIZE - 20, y: window.innerHeight - ROBOT_SIZE - 110 });
      setBubble({
        x: (window.innerWidth - BUBBLE_MAX_W) / 2,
        y: window.innerHeight - 350,
        w: BUBBLE_MAX_W,
      });
    }, 70);
    setMode('intro');
  }, [later]);

  /* ── Автозапуск при заходе ─────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== 'boot') return;
    later(() => {
      if (localStorage.getItem(LS_KEY) === '1') {
        setMode('idle');
      } else {
        startIntro();
      }
    }, 1100);
  }, [mode, later, startIntro]);

  /* ── Старт тура: отфильтровываем шаги, элементы которых нет на экране ── */
  const startTour = useCallback(() => {
    const available = TRAINING_SCRIPT.filter((s) => !s.target || document.querySelector(s.target));
    if (available.length === 0) {
      setMode('idle');
      return;
    }
    setSteps(available);
    setStepIdx(0);
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);
    setMode('tour');
  }, []);

  /* ── Прогулка по экрану (idle) ─────────────────────────────────────── */
  useEffect(() => {
    if (mode !== 'idle') return;
    const wander = () => {
      setFlyMs(4200);
      setPos({
        x: clamp(
          24 + Math.random() * (window.innerWidth - ROBOT_SIZE - 64),
          8,
          window.innerWidth - ROBOT_SIZE - 8,
        ),
        y: clamp(
          90 + Math.random() * (window.innerHeight - ROBOT_SIZE - 210),
          40,
          window.innerHeight - ROBOT_SIZE - 40,
        ),
      });
    };
    wander();
    const id = window.setInterval(wander, 5400);
    return () => window.clearInterval(id);
  }, [mode]);

  /* ── Шаг тура ──────────────────────────────────────────────────────── */
  const current = steps[stepIdx];

  useEffect(() => {
    if (mode !== 'tour') return;
    if (!current) {
      localStorage.setItem(LS_KEY, '1');
      setMode('idle');
      return;
    }
    setMenuOpen(false);
    setSpot(null);
    setBubble(null);

    if (!current.target) {
      // текстовый шаг: робот внизу по центру, пузырь над ним
      setFlyMs(900);
      setPos({ x: (window.innerWidth - ROBOT_SIZE) / 2, y: window.innerHeight - ROBOT_SIZE - 240 });
      setBubble({ x: (window.innerWidth - BUBBLE_MAX_W) / 2, y: window.innerHeight - 440, w: BUBBLE_MAX_W });
      return;
    }

    const el = document.querySelector(current.target);
    if (!el) {
      later(() => setStepIdx((i) => i + 1), 250);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlyMs(900);
    later(() => {
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
    }, 640);
  }, [mode, current, later]);

  /* ── Действия ──────────────────────────────────────────────────────── */
  const finishTour = useCallback(() => {
    localStorage.setItem(LS_KEY, '1');
    setMode('idle');
  }, []);

  const skipAll = useCallback(() => {
    setMode('idle');
  }, []);

  const handleRobotClick = useCallback(() => {
    if (mode === 'idle') {
      setMenuOpen((o) => !o);
    } else if (mode === 'tour' || mode === 'intro') {
      setMenuOpen(false);
    }
  }, [mode]);

  if (mode === 'hidden' || mode === 'boot') {
    return null;
  }

  const inIntro = mode === 'intro';
  const inTour = mode === 'tour';
  const lastIntroSlide = introIdx >= TRAINING_INTRO.length - 1;

  /* ── Пузырь (intro / tour) ─────────────────────────────────────────── */
  const bubbleBody = inIntro ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold mb-1">{TRAINING_INTRO[introIdx].title}</div>
          <div className="text-xs leading-relaxed opacity-80">{TRAINING_INTRO[introIdx].text}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] opacity-50">
          {introIdx + 1} / {TRAINING_INTRO.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={skipAll}
            className="text-xs px-2.5 py-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
          >
            Пропустить
          </button>
          <button
            onClick={() => (lastIntroSlide ? startTour() : setIntroIdx((i) => i + 1))}
            className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-xl text-white shadow transition-transform active:scale-95"
            style={{ background: primary }}
          >
            {lastIntroSlide ? 'Начать тур' : 'Далее'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  ) : inTour && current ? (
    <div className={`rounded-2xl p-4 shadow-2xl border ${surface}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-xl leading-none mt-0.5">🤖</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold mb-1">{current.title}</div>
          <div className="text-xs leading-relaxed opacity-80">{current.text}</div>
        </div>
        <button onClick={skipAll} className="opacity-50 hover:opacity-100 transition-opacity shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] opacity-50">
          Шаг {stepIdx + 1} / {steps.length}
        </span>
        <button
          onClick={() => (stepIdx + 1 >= steps.length ? finishTour() : setStepIdx((i) => i + 1))}
          className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-xl text-white shadow transition-transform active:scale-95"
          style={{ background: primary }}
        >
          {stepIdx + 1 >= steps.length ? 'Завершить' : 'Далее'}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  ) : null;

  /* ── Меню робота (idle) ────────────────────────────────────────────── */
  const menuBody =
    menuOpen && mode === 'idle' ? (
      <div className={`rounded-2xl p-2 shadow-2xl border w-56 ${surface}`}>
        <div className="text-[11px] font-bold px-3 py-1.5 opacity-60">Привет! Я — мини-помощник</div>
        <button
          onClick={() => {
            localStorage.removeItem(LS_KEY);
            startIntro();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left"
        >
          <GraduationCap size={15} style={{ color: primary }} />
          Пройти обучение ещё раз
        </button>
        <button
          onClick={startIntro}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left"
        >
          <Info size={15} style={{ color: primary }} />
          О студии ATMOSFERA
        </button>
        <button
          onClick={() => setMode('hidden')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-75 transition-opacity text-left"
        >
          <X size={15} className="opacity-60" />
          Скрыть помощника
        </button>
      </div>
    ) : null;

  return (
    <>
      {/* Подсветка текущего элемента (тур) */}
      {inTour && spot && (
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
            transition: 'all 0.45s ease',
          }}
        />
      )}

      {/* Пузырь */}
      <AnimatePresence>
        {bubble && bubbleBody && (
          <motion.div
            key={inIntro ? `intro-${introIdx}` : `step-${stepIdx}`}
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

      {/* Меню робота */}
      <AnimatePresence>
        {menuBody && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed',
              left: clamp(pos.x - 80, 8, window.innerWidth - 232),
              top: clamp(pos.y - 172, 8, window.innerHeight - 200),
              zIndex: 9999,
            }}
          >
            {menuBody}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Робот */}
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
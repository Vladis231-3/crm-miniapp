import { motion } from 'motion/react';
import { Check, ChevronRight, Clock, Info, Play } from 'lucide-react';
import type { Booking } from '../../../context/AppContext';
import { CarSearch } from '../shared/CarSearch';
import { SourceBadge } from '../../shared/SourceBadge';
import { StatusBadge } from '../../atmosfera';

const READY_TO_START_STATUSES: Booking['status'][] = ['new', 'confirmed', 'scheduled'];

export interface WorkerTodayScreenProps {
  tasks: Booking[];
  workerId: string;
  onOpenTask: (task: Booking) => void;
  onStartRequest: (task: Booking) => void;
  onFinishRequest: (task: Booking) => void;
  onOpenChecklist: () => void;
  onGoSchedule: () => void;
}

/**
 * WorkerTodayScreen — вырезка из WorkerApp (§6.3, Фаза 3).
 * Hero смены + rail «дальше» + список задач + поиск машин.
 * Действия делегируются родителю (стейты флоу и TG-кнопки живут там).
 */
export function WorkerTodayScreen({
  tasks,
  workerId,
  onOpenTask,
  onStartRequest,
  onFinishRequest,
  onOpenChecklist,
  onGoSchedule,
}: WorkerTodayScreenProps) {
  const currentTask = tasks.find((task) => task.status === 'in_progress');
  const nextTask = tasks.find((task) => task.status !== 'completed');
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const inProgressCount = tasks.filter((task) => task.status === 'in_progress').length;

  return (
    <>
      <section className="role-hero role-hero--worker mb-4">
        <div className="text-xs uppercase tracking-[.2em] opacity-70">Shift command</div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {currentTask?.service || nextTask?.service || 'Смена под контролем'}
            </h2>
            <p className="mt-1 text-sm opacity-80">
              {currentTask ? `Текущая работа · ${currentTask.time}` : 'Готов к следующей задаче'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">
              {completedCount}/{tasks.length}
            </div>
            <div className="text-xs opacity-70">выполнено</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/15 py-3 text-center">
          <div>
            <strong className="block text-xl">{tasks.length}</strong>
            <span className="text-xs opacity-70">на смену</span>
          </div>
          <div>
            <strong className="block text-xl">{inProgressCount}</strong>
            <span className="text-xs opacity-70">в работе</span>
          </div>
          <div>
            <strong className="block text-xl">{completedCount}</strong>
            <span className="text-xs opacity-70">готово</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextTask && (
            <button onClick={() => onOpenTask(nextTask)} className="semantic-primary-button bg-white text-slate-900">
              Открыть текущую
            </button>
          )}
          <button onClick={onOpenChecklist} className="rounded-xl border border-white/25 px-4 py-2 text-sm">
            Чек-лист смены
          </button>
        </div>
      </section>

      {/* Дальше по времени */}
      <section className="mb-4 rounded-2xl border border-border bg-[var(--card)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-kicker">Next work rail</div>
            <h3 className="font-semibold">Дальше по времени</h3>
          </div>
          <button onClick={onGoSchedule} className="text-sm text-[var(--primary-600)]">
            Расписание
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {tasks
            .filter((task) => task.status !== 'completed')
            .slice(0, 3)
            .map((task) => (
              <button
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="flex w-full items-center gap-3 rounded-xl bg-[var(--primary-50)] p-3 text-left dark:bg-[var(--primary-100)]"
              >
                <strong className="w-12 tabular-nums">{task.time}</strong>
                <span className="min-w-0 flex-1 truncate">{task.service}</span>
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </button>
            ))}
        </div>
      </section>

      <motion.div key="today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 py-4">
        <CarSearch workerId={workerId} />
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-[var(--card)] p-8 text-center">
            <Clock size={36} strokeWidth={1.75} className="mx-auto mb-3 text-[var(--fg-muted,#8A91A0)]" aria-hidden />
            <p className="text-[var(--fg-secondary,#5A6072)]">Задач на сегодня нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                workerId={workerId}
                onOpen={() => onOpenTask(task)}
                onStart={() => onStartRequest(task)}
                onFinish={() => onFinishRequest(task)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

interface TaskCardProps {
  task: Booking;
  workerId: string;
  onOpen: () => void;
  onStart: () => void;
  onFinish: () => void;
}

function TaskCard({ task, workerId, onOpen, onStart, onFinish }: TaskCardProps) {
  const myExtras = (task.additionalServices || []).filter((as) =>
    as.workers.some((w) => w.workerId === workerId),
  );
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-[var(--card)] p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            <span className="tabular-nums">{task.time}</span> · {task.service}
            <SourceBadge source={task.source} />
          </div>
          <div className="text-sm text-[var(--fg-secondary,#5A6072)]">{task.clientName}</div>
          <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
            {task.box} · {task.duration} мин
          </div>
          {task.car && (
            <div className="text-xs text-[var(--fg-secondary,#5A6072)]">
              {task.car}
              {task.plate ? ` (${task.plate})` : ''}
            </div>
          )}
          {myExtras.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {myExtras.map((as) => (
                <span
                  key={as.id}
                  className="rounded-full bg-[var(--primary-50)] px-2 py-0.5 text-[11px] text-[var(--primary-700)] dark:bg-[var(--primary-100)] dark:text-[var(--primary-300)]"
                >
                  + {as.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <StatusBadge status={task.status} className="shrink-0" />
      </div>
      <div className="mt-3 flex gap-2">
        {READY_TO_START_STATUSES.includes(task.status) && (
          <button
            onClick={onStart}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--status-success)] py-2 text-sm font-medium text-white transition-transform active:scale-[.98]"
          >
            <Play size={14} strokeWidth={1.75} aria-hidden />
            Начать
          </button>
        )}
        {task.status === 'in_progress' && (
          <button
            onClick={onFinish}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-[var(--primary-600)] py-2 text-sm font-medium text-white transition-transform active:scale-[.98]"
          >
            <Check size={14} strokeWidth={1.75} aria-hidden />
            Завершить
          </button>
        )}
        <button
          onClick={onOpen}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-[var(--card-raised,var(--card))] py-2 text-sm text-[var(--fg-secondary,#5A6072)]"
        >
          <Info size={14} strokeWidth={1.75} aria-hidden />
          Детали
        </button>
      </div>
    </motion.div>
  );
}

export type TourRole = 'welcome' | 'client' | 'admin' | 'worker' | 'owner' | 'all';

export interface TourNavigate {
  /** Куда переключить интерфейс перед шагом (автонавигация) */
  page?: string;
  tab?: string;
  section?: string | null;
  app?: TourRole;
}

export interface TourStep {
  /** CSS-селектор подсвечиваемого элемента. Шаг без target — просто текст. */
  target?: string;
  /** Короткий заголовок шага */
  title: string;
  /** Объяснение, за что отвечает элемент */
  text: string;
  /** Роль, для которой актуален шаг (all = видно всем) */
  role?: TourRole;
  /** Секция тура (для прогресса) */
  section?: string;
  /** Автопереключение UI перед шагом */
  navigate?: TourNavigate;
}

export interface IntroSlide {
  title: string;
  text: string;
}

export interface TourSectionMeta {
  id: TourRole;
  label: string;
  icon: string;
  description: string;
}

export const TOUR_SECTIONS: TourSectionMeta[] = [
  { id: 'welcome', label: 'Приветствие', icon: '👋', description: 'Вход и знакомство' },
  { id: 'client', label: 'Клиент', icon: '🚗', description: 'Запись и личный кабинет' },
  { id: 'admin', label: 'Администратор', icon: '📋', description: 'Расписание и клиенты' },
  { id: 'worker', label: 'Мастер', icon: '🔧', description: 'Смена и заработок' },
  { id: 'owner', label: 'Владелец', icon: '👑', description: 'Финансы и управление' },
];

/** Событие для автопереключения страниц/табов из тура */
export const TRAINING_NAVIGATE_EVENT = 'training:navigate';

export interface TrainingNavigateDetail {
  app: TourRole;
  page?: string;
  tab?: string;
  section?: string | null;
}

export function dispatchTrainingNavigate(detail: TrainingNavigateDetail) {
  window.dispatchEvent(new CustomEvent(TRAINING_NAVIGATE_EVENT, { detail }));
}

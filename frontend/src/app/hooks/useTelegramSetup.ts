import { useEffect } from 'react';
import { setupTelegramWebApp } from '../api';

/**
 * Инициализирует Telegram WebApp для iPhone:
 * - disableVerticalSwipes / enableClosingConfirmation чтобы свайп вниз не закрывал миниапп
 * - expand + ready
 * Скролл НЕ блокируем — оставляем нативный, только `expand` + `disableVerticalSwipes`.
 * Rubber-band на iPhone гасится CSS `overscroll-behavior`, а не JS preventDefault (иначе экран перестаёт двигаться).
 */
export function useTelegramSetup() {
  useEffect(() => {
    setupTelegramWebApp();
  }, []);
}

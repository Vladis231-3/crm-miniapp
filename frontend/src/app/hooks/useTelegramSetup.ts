import { useEffect } from 'react';
import { setupTelegramWebApp } from '../api';

/**
 * Инициализирует Telegram WebApp для iPhone:
 * - disableVerticalSwipes / enableClosingConfirmation чтобы свайп вниз не закрывал миниапп
 * - expand + ready
 * - блокирует pull-to-refresh / rubber-band на document, оставляя скролл внутри .overflow-y-auto
 */
export function useTelegramSetup() {
  useEffect(() => {
    setupTelegramWebApp();

    // iOS rubber-band guard: не даём скроллу "вылетать" за пределы контейнера
    // Только если внутри Telegram — на десктопе не мешаем
    const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp;
    const insideTelegram = Boolean(tg?.initData);
    if (!insideTelegram) return;

    // Предотвращаем pull-to-refresh на body, но разрешаем скролл внутри overflow-y-auto
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      // Разрешаем скролл только если цель внутри скролл-контейнера
      const scrollable = target?.closest?.('.overflow-y-auto, .overflow-auto, [data-scrollable="true"]') as HTMLElement | null;
      if (!scrollable) {
        // Не скролл-контейнер — блокируем, чтобы не тянуть всю страницу
        if (e.cancelable) e.preventDefault();
        return;
      }
      const dy = e.touches[0].clientY - startY;
      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      // На границах — не даём "резинке" уйти в body / Telegram swipe
      if ((atTop && dy > 0) || (atBottom && dy < 0)) {
        if (e.cancelable) e.preventDefault();
      }
    };

    // passive: false нужен чтобы preventDefault сработал
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}

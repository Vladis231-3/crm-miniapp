import { useEffect } from 'react';
import { getTelegramWebApp } from '../api';

export function useTelegramBackButton(onBack: () => void, visible: boolean = true) {
  useEffect(() => {
    const tg = getTelegramWebApp();
    const btn = tg?.BackButton;
    if (!btn) return;

    if (!visible) {
      btn.hide();
      return;
    }

    btn.onClick(onBack);
    btn.show();

    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack, visible]);
}

import { useEffect } from 'react';
import { getTelegramWebApp } from '../api';

export function useTelegramMainButton(
  text: string,
  onClick: () => void,
  enabled: boolean = true,
  show: boolean = true,
) {
  useEffect(() => {
    const tg = getTelegramWebApp();
    const btn = tg?.MainButton;
    if (!btn) return;

    if (!show) {
      btn.hide();
      return;
    }

    btn.setText(text);
    btn.onClick(onClick);
    if (enabled) {
      btn.enable();
    } else {
      btn.disable();
    }
    btn.show();

    return () => {
      btn.offClick(onClick);
      btn.hide();
    };
  }, [text, onClick, enabled, show]);
}

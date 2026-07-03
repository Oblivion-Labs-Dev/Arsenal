const WIDGET_STYLES = `
#applypilot-floating-wrapper {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2147483647;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

#applypilot-floating-button {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(10, 18, 16, 0.92);
  color: #ecfdf5;
  border: 1px solid rgba(46, 229, 157, 0.28);
  border-radius: 999px;
  padding: 10px 14px 10px 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

#applypilot-floating-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(46, 229, 157, 0.45);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

#applypilot-floating-button:disabled {
  opacity: 0.85;
  cursor: wait;
}

#applypilot-floating-button .ap-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(145deg, #2ee59d, #14b8a6);
  color: #042f1e;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

#applypilot-floating-button .ap-label {
  white-space: nowrap;
  letter-spacing: -0.01em;
}

#applypilot-floating-button.is-loading .ap-mark {
  background: rgba(46, 229, 157, 0.15);
  border: 2px solid rgba(46, 229, 157, 0.35);
  border-top-color: #2ee59d;
  animation: ap-spin 0.75s linear infinite;
  color: transparent;
}

#applypilot-floating-button.is-success .ap-mark {
  animation: ap-pop 0.35s ease;
}

#applypilot-floating-button.is-warning .ap-mark {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.35);
}

#applypilot-floating-dismiss {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 18px;
  height: 18px;
  background: rgba(30, 41, 39, 0.95);
  color: #9ca3af;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  line-height: 1;
}

#applypilot-floating-dismiss:hover {
  color: #ecfdf5;
  background: rgba(55, 65, 81, 0.95);
}

@keyframes ap-spin {
  to { transform: rotate(360deg); }
}

@keyframes ap-pop {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
`;

export type WidgetState = 'idle' | 'loading' | 'success' | 'warning';

export interface FloatingWidget {
  setState: (state: WidgetState, label: string) => void;
  setDisabled: (disabled: boolean) => void;
  onClick: (handler: () => void | Promise<void>) => void;
}

export function mountFloatingWidget(): FloatingWidget {
  if (document.getElementById('applypilot-floating-wrapper')) {
    const existing = document.getElementById('applypilot-floating-button') as HTMLButtonElement | null;
    return {
      setState: (state, label) => applyWidgetState(existing, state, label),
      setDisabled: (d) => existing?.toggleAttribute('disabled', d),
      onClick: () => {}
    };
  }

  if (!document.getElementById('applypilot-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'applypilot-widget-styles';
    style.textContent = WIDGET_STYLES;
    document.head.appendChild(style);
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'applypilot-floating-wrapper';

  const btn = document.createElement('button');
  btn.id = 'applypilot-floating-button';
  btn.type = 'button';
  btn.innerHTML = `<span class="ap-mark">AP</span><span class="ap-label">Fill application</span>`;

  const dismiss = document.createElement('button');
  dismiss.id = 'applypilot-floating-dismiss';
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.textContent = '×';

  wrapper.appendChild(btn);
  wrapper.appendChild(dismiss);
  document.body.appendChild(wrapper);

  dismiss.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.remove();
  });

  let clickHandler: (() => void | Promise<void>) | null = null;
  btn.addEventListener('click', () => {
    if (btn.disabled || !clickHandler) return;
    void clickHandler();
  });

  return {
    setState: (state, label) => applyWidgetState(btn, state, label),
    setDisabled: (disabled) => btn.toggleAttribute('disabled', disabled),
    onClick: (handler) => {
      clickHandler = handler;
    }
  };
}

function applyWidgetState(btn: HTMLButtonElement | null, state: WidgetState, label: string): void {
  if (!btn) return;
  btn.classList.remove('is-loading', 'is-success', 'is-warning');
  if (state === 'loading') btn.classList.add('is-loading');
  if (state === 'success') btn.classList.add('is-success');
  if (state === 'warning') btn.classList.add('is-warning');

  const mark = btn.querySelector('.ap-mark');
  const labelEl = btn.querySelector('.ap-label');
  if (labelEl) labelEl.textContent = label;
  if (!mark) return;

  if (state === 'idle') mark.textContent = 'AP';
  else if (state === 'loading') mark.textContent = '';
  else if (state === 'success') mark.textContent = '✓';
  else if (state === 'warning') mark.textContent = '!';
}

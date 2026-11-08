'use client';

import { useEffect, useId, useState, type MouseEvent } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '../motion-gate';
import { revealTheme, type RevealThemeOptions } from './theme-reveal';

export type RevealThemeMode = 'light' | 'dark';

export interface ThemeRevealToggleProps {
  /** The current resolved theme. */
  theme: RevealThemeMode;
  /** Switch the theme. Runs inside the reveal transition, so the new theme is what spreads in. */
  onThemeChange: (next: RevealThemeMode) => void;
  /** Also set `<html data-theme>` inside the transition. Default true. */
  setDocumentTheme?: boolean;
  className?: string;
  revealOptions?: RevealThemeOptions;
}

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Light/dark switch whose icon morphs sun to moon (a mask "bite" slides over the sun's core while
 * the rays retract) and whose new theme spreads in a circle from the button. A separate option
 * next to `ThemeToggle` / `LightDarkThemeToggle`, not a replacement.
 */
export function ThemeRevealToggle({
  theme,
  onThemeChange,
  setDocumentTheme = true,
  className,
  revealOptions,
}: ThemeRevealToggleProps) {
  const maskId = `arsenal-theme-bite-${useId().replace(/:/g, '')}`;
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(shouldReduceMotion());
    return onMotionPreferenceChange(setStill);
  }, []);

  const dark = theme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  const transition = still ? 'none' : `transform 500ms ${EASE}, opacity 400ms ${EASE}`;

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next: RevealThemeMode = dark ? 'light' : 'dark';
    void revealTheme(
      () => {
        if (setDocumentTheme) document.documentElement.dataset.theme = next;
        onThemeChange(next);
      },
      event.currentTarget.getBoundingClientRect(),
      revealOptions,
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-arsenal-border bg-arsenal-elevated text-arsenal-secondary transition hover:border-arsenal-accent hover:text-arsenal-primary active:scale-95',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <mask id={maskId}>
          <rect x="-4" y="-4" width="32" height="32" fill="#fff" />
          <circle
            cx="16.5"
            cy="7.5"
            r="5.5"
            fill="#000"
            style={{ transition, transform: dark ? 'translate(0px, 0px)' : 'translate(9px, -9px)' }}
          />
        </mask>
        <circle
          cx="12"
          cy="12"
          r="5"
          fill="currentColor"
          mask={`url(#${maskId})`}
          style={{
            transformOrigin: '12px 12px',
            transition,
            transform: dark ? 'scale(1.5)' : 'scale(1)',
          }}
        />
        <g
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{
            transformOrigin: '12px 12px',
            transition,
            transform: dark ? 'rotate(-45deg) scale(0.5)' : 'rotate(0deg) scale(1)',
            opacity: dark ? 0 : 1,
          }}
        >
          {RAYS.map((angle) => (
            <path key={angle} d="M12 2.5v2.2" transform={`rotate(${angle} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}

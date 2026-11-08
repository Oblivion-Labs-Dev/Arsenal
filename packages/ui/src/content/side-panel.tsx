'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { shouldReduceMotion } from '@arsenal/motion';
import { cn } from '../lib/cn';
import { FOCUSABLE_SELECTOR, scrollbarCompensation, trapFocusTarget } from './panel';

const EXIT_MS = 220;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** A running custom open/close animation; `cancel` stops it when the panel state changes again. */
export interface PanelAnimation {
  cancel(): void;
}

/**
 * Custom motion for the panel, e.g. a FLIP from the card that opened it. Called before the first
 * paint on open (`closing` false) and again when `open` drops (`closing` true). The panel stays
 * mounted for `exitMs` after closing, so the animation has time to land.
 */
export type PanelAnimator = (panel: HTMLElement, closing: boolean) => PanelAnimation | void;

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** "side" slides a drawer in from the right; "center" fades and lifts a centered dialog. */
  variant?: 'side' | 'center';
  className?: string;
  backdropLabel?: string;
  ariaLabelledBy?: string;
  /** "status" makes a non-modal live panel: no focus trap or focus move. */
  role?: 'dialog' | 'status';
  ariaLive?: 'polite' | 'assertive' | 'off';
  /** Replaces the built-in slide/fade with your own (see `PanelAnimator`). */
  animate?: PanelAnimator;
  /** How long the panel stays mounted after closing. Default 220ms. */
  exitMs?: number;
}

function builtInAnimation(
  panel: HTMLElement,
  backdrop: HTMLElement | null,
  variant: 'side' | 'center',
  closing: boolean,
): PanelAnimation {
  const panelFrames =
    variant === 'side'
      ? [
          { transform: 'translateX(100%)', opacity: 0.7 },
          { transform: 'translateX(0)', opacity: 1 },
        ]
      : [
          { transform: 'translateY(12px) scale(0.98)', opacity: 0 },
          { transform: 'translateY(0) scale(1)', opacity: 1 },
        ];
  const options: KeyframeAnimationOptions = {
    duration: EXIT_MS,
    easing: EASE,
    direction: closing ? 'reverse' : 'normal',
    fill: 'both',
  };
  const a = panel.animate(panelFrames, options);
  const b = backdrop?.animate([{ opacity: 0 }, { opacity: 1 }], options);
  return {
    cancel() {
      a.cancel();
      b?.cancel();
    },
  };
}

/**
 * Modal drawer or dialog in a portal: traps focus, closes on Esc and backdrop click, locks page
 * scroll while holding the scrollbar's width (so the layout does not jump), restores focus on
 * close, and animates out instead of vanishing. Content shown last stays visible while it exits.
 */
export function SidePanel({
  open,
  onClose,
  children,
  variant = 'side',
  className,
  backdropLabel = 'Close panel',
  ariaLabelledBy,
  role = 'dialog',
  ariaLive,
  animate,
  exitMs = EXIT_MS,
}: SidePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const animateRef = useRef(animate);
  animateRef.current = animate;
  const [mounted, setMounted] = useState(false);
  // Raised during render, not in an effect: an effect would unmount the panel for one frame
  // before the exit animation, which is the flicker itself.
  const [shouldRender, setShouldRender] = useState(open);
  if (open && !shouldRender) setShouldRender(true);
  // Callers often render `{item && <Details/>}`; keep the last content while animating out.
  const lastChildren = useRef<ReactNode>(children);
  if (open) lastChildren.current = children;
  const shown = open ? children : lastChildren.current;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return undefined;
    const body = document.body;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      if (role === 'dialog') panelRef.current?.focus();
    });

    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const style = getComputedStyle(body);
    const gutter = scrollbarCompensation(
      body.getBoundingClientRect().width,
      body.clientWidth,
      parseFloat(style.borderLeftWidth),
      parseFloat(style.borderRightWidth),
    );
    if (gutter > 0) body.style.paddingRight = `${parseFloat(style.paddingRight) + gutter}px`;
    body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      const panel = panelRef.current;
      if (event.key !== 'Tab' || role !== 'dialog' || !panel) return;
      const focusables = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (el) => el.getClientRects().length > 0,
      );
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const target = trapFocusTarget<HTMLElement>(focusables, active, event.shiftKey, panel);
      if (target === null) return;
      event.preventDefault();
      if (target !== 'block') target.focus();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      if (role === 'dialog' && previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, mounted, role]);

  // A timer rather than animationend, so reduced motion (no animation) still unmounts.
  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(() => setShouldRender(false), shouldReduceMotion() ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [open, exitMs]);

  // Before first paint, so the panel is never seen at its resting place first.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!mounted || !shouldRender || !panel || shouldReduceMotion()) return undefined;
    const custom = animateRef.current;
    const run = custom
      ? custom(panel, !open)
      : builtInAnimation(panel, backdropRef.current, variant, !open);
    return () => run?.cancel();
  }, [open, mounted, shouldRender, variant]);

  if (!shouldRender || !mounted) return null;
  const state = open ? 'open' : 'closed';

  return createPortal(
    <>
      <button
        ref={backdropRef}
        type="button"
        tabIndex={-1}
        data-state={state}
        aria-label={backdropLabel}
        onClick={() => onCloseRef.current()}
        className={cn(
          'fixed inset-0 z-[1000] cursor-pointer border-0 p-0 backdrop-blur-md',
          'bg-[color-mix(in_srgb,var(--arsenal-background)_55%,transparent)]',
          !open && 'pointer-events-none',
        )}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        data-state={state}
        role={role}
        aria-modal={role === 'dialog' ? true : undefined}
        aria-labelledby={ariaLabelledBy}
        aria-live={ariaLive}
        className={cn(
          'fixed z-[1010] flex flex-col overflow-y-auto bg-arsenal-elevated text-arsenal-primary outline-none',
          'border-arsenal-border shadow-[0_24px_64px_color-mix(in_srgb,var(--arsenal-background)_60%,rgba(0,0,0,0.35))]',
          variant === 'side'
            ? 'right-0 top-0 h-[100dvh] w-[min(440px,100vw)] border-l'
            : 'inset-0 m-auto h-[min(900px,calc(100dvh-48px))] w-[min(880px,calc(100vw-32px))] rounded-arsenal-lg border max-sm:h-[100dvh] max-sm:w-screen max-sm:rounded-none',
          !open && 'pointer-events-none',
          className,
        )}
      >
        {shown}
      </aside>
    </>,
    document.body,
  );
}

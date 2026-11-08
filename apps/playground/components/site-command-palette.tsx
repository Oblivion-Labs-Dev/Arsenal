'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applySiteTheme } from '@/components/theme-switch';
import { buildPaletteItems, searchPalette, type PaletteItem } from '@/lib/site-nav';

export const OPEN_PALETTE_EVENT = 'arsenal:open-palette';

/** Opens the palette from anywhere (header button, hero, empty states). */
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

/** Site-wide ⌘K / Ctrl+K palette: pages, every component, every module, labs and themes. */
export function SiteCommandPalette() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const items = useMemo(() => buildPaletteItems(), []);
  const results = useMemo(() => searchPalette(items, query), [items, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      setOpen(false);
      if (item.theme) applySiteTheme(item.theme);
      else if (item.href) router.push(item.href);
    },
    [router],
  );

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  let lastGroup = '';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="site-overlay fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search Arsenal"
            className="site-card w-full max-w-[640px] overflow-hidden"
            initial={reduced ? false : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-arsenal-border px-4">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 shrink-0 text-arsenal-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search components, modules, pages…"
                aria-label="Search"
                className="h-14 w-full bg-transparent text-[15px] text-arsenal-primary outline-none placeholder:text-arsenal-muted"
              />
              <span className="site-kbd">esc</span>
            </div>
            <ul
              ref={listRef}
              data-lenis-prevent
              className="max-h-[56vh] overflow-y-auto p-2"
              role="listbox"
            >
              {results.length === 0 ? (
                <li className="px-3 py-10 text-center text-sm text-arsenal-secondary">
                  Nothing matches “{query}”.
                </li>
              ) : (
                results.map((item, index) => {
                  const header = item.group !== lastGroup ? item.group : null;
                  lastGroup = item.group;
                  return (
                    <li key={item.id}>
                      {header ? (
                        <div className="site-label px-3 pb-1.5 pt-3 text-arsenal-muted">
                          {header}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === active}
                        data-index={index}
                        onMouseMove={() => setActive(index)}
                        onClick={() => run(item)}
                        className={`flex w-full items-baseline gap-3 rounded-[var(--arsenal-radius-sm)] px-3 py-2.5 text-left transition-colors ${
                          index === active ? 'bg-arsenal-elevated' : ''
                        }`}
                      >
                        <span className="shrink-0 text-sm font-medium text-arsenal-primary">
                          {item.title}
                        </span>
                        <span className="truncate text-[13px] text-arsenal-secondary">
                          {item.subtitle}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="flex items-center gap-4 border-t border-arsenal-border px-4 py-2.5 text-xs text-arsenal-secondary">
              <span>
                <span className="site-kbd">↑</span> <span className="site-kbd">↓</span> move
              </span>
              <span>
                <span className="site-kbd">↵</span> open
              </span>
              <span className="ml-auto">{items.length} destinations</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

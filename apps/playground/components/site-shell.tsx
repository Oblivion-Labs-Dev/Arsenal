'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { openPalette } from '@/components/site-command-palette';
import { ThemeSwitch } from '@/components/theme-switch';
import { LAB_ITEMS, NAV_ITEMS, activeNavHref } from '@/lib/site-nav';

/** Arsenal mark: a compact hex symbol used beside the wordmark. */
export function ArsenalMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <path
        d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25L16 2.5Z"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M16 8.5 22.5 12.25v7.5L16 23.5l-6.5-3.75v-7.5L16 8.5Z"
        stroke="currentColor"
        strokeOpacity="0.72"
        strokeWidth="1.6"
      />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" fillOpacity="0.72" />
    </svg>
  );
}

function SearchButton({ compact = false }: { compact?: boolean }) {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.platform)), []);
  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search (Ctrl+K)"
      className="flex h-9 items-center gap-2 rounded-md border border-arsenal-border px-3 text-sm text-arsenal-secondary transition-colors hover:border-arsenal-border-hover hover:text-arsenal-primary"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>
      {compact ? null : <span className="hidden lg:inline">Search</span>}
      {compact ? null : <span className="site-kbd hidden sm:inline">{mac ? '⌘K' : 'Ctrl K'}</span>}
    </button>
  );
}

function Header() {
  const pathname = usePathname() ?? '/';
  const active = activeNavHref(pathname);
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="site-container">
          <header className="site-header pointer-events-auto flex h-[var(--site-header-h)] items-center gap-2 rounded-b-xl px-3 sm:px-4">
            <Link href="/" className="flex items-center gap-2.5 pr-3 text-arsenal-primary">
              <ArsenalMark />
              <span className="text-[15px] font-semibold">Arsenal</span>
            </Link>
            <nav aria-label="Main" className="hidden flex-1 items-center md:flex">
              <ul className="flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <li key={item.href} className="relative">
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative z-10 block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'text-arsenal-primary'
                            : 'text-arsenal-secondary hover:text-arsenal-primary'
                        }`}
                      >
                        {item.label}
                      </Link>
                      {isActive ? (
                        <motion.span
                          layoutId="site-nav-indicator"
                          className="absolute inset-0 rounded-md border border-arsenal-border bg-arsenal-elevated"
                          transition={
                            reduced
                              ? { duration: 0 }
                              : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }
                          }
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="ml-auto flex items-center gap-1.5 md:ml-0">
              <SearchButton />
              <ThemeSwitch />
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-arsenal-primary md:hidden"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  {menuOpen ? (
                    <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                  ) : (
                    <path d="M3.5 7h13M3.5 13h13" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </header>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              className="site-overlay fixed inset-0 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              aria-label="Mobile"
              className="site-card fixed inset-x-3 bottom-3 z-50 p-2 md:hidden"
              initial={reduced ? { opacity: 0 } : { y: '110%' }}
              animate={reduced ? { opacity: 1 } : { y: 0 }}
              exit={reduced ? { opacity: 0 } : { y: '110%' }}
              transition={reduced ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <ul>
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-baseline justify-between gap-4 rounded-[var(--arsenal-radius)] px-4 py-3.5 ${
                        active === item.href ? 'bg-arsenal-elevated' : ''
                      }`}
                    >
                      <span className="text-base font-medium text-arsenal-primary">
                        {item.label}
                      </span>
                      <span className="truncate text-xs text-arsenal-secondary">{item.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-32 border-t border-arsenal-border">
      <div className="site-container grid gap-10 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 text-arsenal-primary">
            <ArsenalMark />
            <span className="font-semibold">Arsenal</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-arsenal-secondary">
            A library of live UI components and repository tools for software projects. By Oblivion
            Labs.
          </p>
        </div>
        <div>
          <div className="site-label">Explore</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_ITEMS.slice(1).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-arsenal-secondary transition-colors hover:text-arsenal-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="site-label">Labs</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {LAB_ITEMS.map((lab) => (
              <li key={lab.href}>
                <Link
                  href={lab.href}
                  className="text-arsenal-secondary transition-colors hover:text-arsenal-primary"
                >
                  {lab.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/labs#next"
                className="text-arsenal-secondary transition-colors hover:text-arsenal-primary"
              >
                Next on the roadmap
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Routes with their own full-bleed design get the header but not the footer. */
function isFullBleed(pathname: string) {
  return LAB_ITEMS.some((lab) => pathname === lab.href || pathname.startsWith(`${lab.href}/`));
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const fullBleed = isFullBleed(pathname);
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-arsenal-elevated focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className={fullBleed ? '' : 'pt-[calc(var(--site-header-h)+1.5rem)]'}>
        {children}
      </main>
      {fullBleed ? null : <Footer />}
    </>
  );
}

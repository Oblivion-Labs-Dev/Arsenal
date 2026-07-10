'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';
import { NetworkBackground, ThemeToggle, cn } from '@arsenal/ui';
import { FEATURE_AREAS } from '@/lib/feature-catalog';

const primaryNav = [
  { href: '/', label: 'Vault' },
  { href: '/components', label: 'Components' },
  { href: '/context', label: 'Token Ops' },
  { href: '/coming-soon', label: 'Coming Soon' },
];

const moduleNav = FEATURE_AREAS.map((feature) => ({
  href: `/features/${feature.slug}`,
  label: feature.title,
}));

export function ArsenalAppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen overflow-hidden bg-arsenal-background text-arsenal-primary">
      <div className="pointer-events-none fixed inset-0 z-0">
        <NetworkBackground density="calm" accent="ember" className="opacity-30" />
        <div className="absolute inset-0 arsenal-vault-grid opacity-[0.22]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,2,2,0.85)_80%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-arsenal-border/50 bg-arsenal-surface/30 p-6 backdrop-blur-xl xl:block">
          <Link
            href="/"
            className="group flex items-center gap-3.5 rounded-arsenal border border-arsenal-border bg-gradient-to-r from-arsenal-elevated/40 to-transparent p-4 transition-all duration-300 hover:border-arsenal-accent/50 hover:shadow-arsenal-glow"
          >
            <span className="grid h-10 w-10 place-items-center rounded-arsenal-sm border border-arsenal-accent/30 bg-gradient-to-br from-arsenal-accent via-orange-600 to-amber-700 text-sm font-black text-black shadow-arsenal-glow transition-transform duration-300 group-hover:scale-105">
              A
            </span>
            <div>
              <span className="block text-sm font-bold tracking-[0.24em] bg-gradient-to-r from-arsenal-accent to-arsenal-molten-gold bg-clip-text text-transparent">
                ARSENAL
              </span>
              <span className="block text-[0.62rem] uppercase tracking-wider text-arsenal-muted">weapons vault</span>
            </div>
          </Link>

          <nav className="mt-8 space-y-8" aria-label="Primary">
            <div>
              <p className="px-3 text-[0.64rem] font-extrabold uppercase tracking-[0.3em] text-arsenal-muted/70">
                Command Deck
              </p>
              <div className="mt-3 space-y-1.5">
                {primaryNav.map((item) => (
                  <NavItem key={item.href} href={item.href} active={isActive(pathname, item.href)}>
                    {item.label}
                  </NavItem>
                ))}
              </div>
            </div>

            <div>
              <p className="px-3 text-[0.64rem] font-extrabold uppercase tracking-[0.3em] text-arsenal-muted/70">
                Arsenal Modules
              </p>
              <div className="mt-3 max-h-[calc(100vh-22rem)] space-y-1.5 overflow-y-auto pr-1">
                {moduleNav.map((item) => (
                  <NavItem key={item.href} href={item.href} active={isActive(pathname, item.href)}>
                    {item.label}
                  </NavItem>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-arsenal-border/50 bg-arsenal-background/70 px-6 py-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.3em] text-arsenal-accent">
                  Developer Operating System
                </p>
                <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight md:text-2xl bg-gradient-to-r from-arsenal-primary to-arsenal-text-secondary bg-clip-text">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="truncate text-xs text-arsenal-muted mt-0.5 font-medium">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <kbd className="hidden rounded-full border border-arsenal-border bg-arsenal-elevated/80 px-3.5 py-1.5 text-[0.68rem] font-bold text-arsenal-muted md:inline-flex shadow-sm">
                  CTRL K
                </kbd>
                <ThemeToggle />
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto xl:hidden" aria-label="Mobile">
              {[...primaryNav, ...moduleNav].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-all',
                    isActive(pathname, item.href)
                      ? 'border-arsenal-accent/50 bg-arsenal-accent/15 text-arsenal-accent shadow-arsenal-glow'
                      : 'border-arsenal-border bg-arsenal-surface/40 text-arsenal-muted hover:text-arsenal-primary hover:border-arsenal-border-hover',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-[88rem]">{children}</div>
          </main>

          <footer className="border-t border-arsenal-border/50 bg-arsenal-surface/20 px-8 py-6 text-center text-xs font-medium text-arsenal-muted/80">
            Arsenal by Oblivion Labs. Reusable packages, rules, templates, and context systems for
            every future repo.
          </footer>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center justify-between rounded-arsenal border px-4 py-3 text-[0.68rem] font-bold uppercase tracking-wider transition-all duration-300',
        active
          ? 'border-arsenal-accent/25 bg-gradient-to-r from-arsenal-accent/[0.07] to-arsenal-accent/[0.01] text-arsenal-primary shadow-[0_4px_20px_-8px_rgba(212,175,55,0.2)]'
          : 'border-transparent text-arsenal-muted hover:border-arsenal-border/50 hover:bg-arsenal-elevated/40 hover:text-arsenal-primary hover:translate-x-0.5',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r bg-arsenal-accent shadow-arsenal-glow" />
      )}
      <span className="pl-1 transition-colors duration-300">{children}</span>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full transition-all duration-300',
          active
            ? 'bg-arsenal-accent shadow-arsenal-glow scale-125'
            : 'bg-arsenal-border/60 group-hover:bg-arsenal-accent/60 group-hover:scale-110',
        )}
      />
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

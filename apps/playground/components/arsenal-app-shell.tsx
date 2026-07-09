"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { ThemeToggle, cn } from "@arsenal/ui";
import { FEATURE_AREAS } from "@/lib/feature-catalog";

const TOP_NAV = [
  { href: "/", label: "Overview" },
  { href: "/components", label: "Components" },
  ...FEATURE_AREAS.map((f) => ({ href: `/features/${f.slug}`, label: f.title })),
  { href: "/context", label: "Dashboard" },
];

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
    <div className="flex min-h-screen bg-arsenal-background text-arsenal-primary">
      <aside className="hidden w-64 shrink-0 border-r border-arsenal-border bg-arsenal-surface/60 p-5 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-arsenal bg-gradient-to-br from-orange-500 via-arsenal-accent to-amber-400 text-sm font-bold text-black shadow-[0_0_24px_color-mix(in_srgb,var(--arsenal-accent)_45%,transparent)]">
            A
          </span>
          <div>
            <p className="font-semibold text-arsenal-accent">Arsenal</p>
            <p className="text-xs text-arsenal-muted">Context library</p>
          </div>
        </Link>

        <nav className="mt-6 space-y-1">
          {TOP_NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-arsenal px-3 py-2 text-sm transition",
                  active
                    ? "bg-arsenal-elevated font-medium text-arsenal-primary"
                    : "text-arsenal-secondary hover:bg-arsenal-elevated/50 hover:text-arsenal-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-arsenal-border bg-arsenal-background/90 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="truncate text-sm text-arsenal-muted">{subtitle}</p>}
            </div>
            <ThemeToggle />
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto lg:hidden">
            {TOP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "bg-arsenal-accent/20 text-arsenal-accent"
                    : "text-arsenal-muted hover:text-arsenal-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-arsenal-border px-5 py-4 text-center text-xs text-arsenal-muted">
          Arsenal by Oblivion Labs · repo knowledge in <code>.arsenal/</code>
        </footer>
      </div>
    </div>
  );
}

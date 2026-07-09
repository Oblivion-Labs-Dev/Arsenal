"use client";

import { type ReactNode } from "react";
import { FloatingNav, ThemeToggle } from "@arsenal/ui";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-arsenal-background text-arsenal-primary">
      <FloatingNav />
      <div className="fixed right-6 top-6 z-50">
        <ThemeToggle />
      </div>
      <main>{children}</main>
      <footer className="border-t border-arsenal-border px-6 py-12 text-center text-sm text-arsenal-muted">
        Arsenal by Oblivion Labs
      </footer>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-arsenal-background">
      <aside className="w-64 border-r border-arsenal-border bg-arsenal-surface p-6">
        <p className="font-semibold text-arsenal-accent">Dashboard</p>
        <nav className="mt-6 space-y-2 text-sm text-arsenal-secondary">
          <a href="#" className="block hover:text-arsenal-primary">Overview</a>
          <a href="#" className="block hover:text-arsenal-primary">Analytics</a>
          <a href="#" className="block hover:text-arsenal-primary">Settings</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

export function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-arsenal-background">
      <aside className="w-72 border-r border-arsenal-border bg-arsenal-surface p-6">
        <p className="font-semibold">Documentation</p>
      </aside>
      <main className="mx-auto max-w-3xl flex-1 px-8 py-12 prose prose-invert">{children}</main>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-arsenal-background px-6">
      <div className="w-full max-w-md rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface p-8">
        {children}
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-arsenal-background">
      <header className="border-b border-arsenal-border bg-arsenal-surface px-6 py-4">
        <span className="font-semibold text-arsenal-accent">Admin</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

import type { Metadata } from 'next';
import { AppProviders } from '@/components/app-providers';
import { SiteShell } from '@/components/site-shell';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Arsenal - The developer weapons vault',
    template: '%s · Arsenal',
  },
  description:
    'Production-grade components, motion and context tooling for TypeScript projects. Find it, see it live, copy it.',
  openGraph: {
    title: 'Arsenal by Oblivion Labs',
    description: 'Production-grade components, motion and context tooling for TypeScript projects.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deep-forge" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="site-atmosphere" aria-hidden="true" />
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}

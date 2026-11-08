'use client';

import { SmoothScrollProvider } from '@arsenal/motion';
import { type ReactNode } from 'react';
import { SiteCommandPalette } from '@/components/site-command-palette';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SmoothScrollProvider>
      {children}
      <SiteCommandPalette />
    </SmoothScrollProvider>
  );
}

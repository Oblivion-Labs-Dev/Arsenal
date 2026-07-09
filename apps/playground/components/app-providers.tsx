"use client";

import { CommandPalette } from "@arsenal/ui";
import { type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}

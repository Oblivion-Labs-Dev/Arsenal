import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arsenal — AI Context Library",
  description:
    "Modular TypeScript library for repo preprocessing, knowledge graphs, prompt optimization, and token usage reduction.",
  openGraph: {
    title: "Arsenal by Oblivion Labs",
    description: "AI context engine — cut token usage, compile prompts, build knowledge graphs.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deep-forge">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

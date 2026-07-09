"use client";

import { useState } from "react";
import { cn } from "@arsenal/ui";

export function CopyCodeBlock({
  code,
  label = "Copy code",
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 z-10 rounded-full border border-arsenal-border bg-arsenal-elevated px-3 py-1.5 text-xs font-medium text-arsenal-secondary transition hover:border-arsenal-accent hover:text-arsenal-primary"
      >
        {copied ? "Copied!" : label}
      </button>
      <pre className="max-h-[420px] overflow-auto rounded-arsenal border border-arsenal-border bg-arsenal-surface/90 p-4 pt-12 text-xs leading-relaxed text-arsenal-secondary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

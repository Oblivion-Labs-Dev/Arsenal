"use client";

import { useEffect, type ReactNode, type HTMLAttributes } from "react";
import { useCursorState, type CursorVariant } from "./cursor";

interface CursorTargetProps extends HTMLAttributes<HTMLDivElement> {
  cursor?: CursorVariant;
  children: ReactNode;
}

export function CursorTarget({ cursor = "default", children, ...props }: CursorTargetProps) {
  const { registerTarget } = useCursorState();

  useEffect(() => {
    if (cursor === "default") return;
    return registerTarget(cursor);
  }, [cursor, registerTarget]);

  return (
    <div data-cursor={cursor} {...props}>
      {children}
    </div>
  );
}

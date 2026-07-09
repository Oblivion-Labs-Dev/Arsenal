"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "./lib/cn";

interface GlassCardProps {
  children: ReactNode;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, glow, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "rounded-arsenal border border-arsenal-border bg-arsenal-surface/80 backdrop-blur-xl p-6",
        "shadow-arsenal transition-shadow duration-300",
        glow && "hover:shadow-arsenal-glow",
        className,
      )}
      data-cursor="card"
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

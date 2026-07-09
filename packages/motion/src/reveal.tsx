"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

interface RevealProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function Reveal({
  children,
  delay = 0,
  direction = "up",
  ...props
}: RevealProps) {
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : 24;
  const initial = {
    opacity: reduced ? 1 : 0,
    y: direction === "up" ? offset : direction === "down" ? -offset : 0,
    x: direction === "left" ? offset : direction === "right" ? -offset : 0,
  };

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: reduced ? 0 : 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

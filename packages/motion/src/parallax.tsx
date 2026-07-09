"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
  offset?: number;
}

export function ParallaxSection({ children, className, offset = 40 }: ParallaxSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-offset, offset]);

  return (
    <section ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </section>
  );
}

"use client";

import { motion, useMotionValue, useSpring, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface MagneticButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  strength?: number;
}

export function MagneticButton({
  children,
  strength = 0.25,
  className,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });
  const cursorVariant = (props as { "data-cursor"?: string })["data-cursor"] ?? "button";

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
      data-cursor={cursorVariant}
      {...props}
    >
      {children}
    </motion.button>
  );
}

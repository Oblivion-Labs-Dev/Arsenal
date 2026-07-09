"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CursorVariant =
  | "default"
  | "button"
  | "card"
  | "link"
  | "input"
  | "disabled"
  | "forge";

interface CursorState {
  variant: CursorVariant;
  x: number;
  y: number;
  isPressed: boolean;
  isVisible: boolean;
}

interface CursorContextValue extends CursorState {
  setVariant: (variant: CursorVariant) => void;
  registerTarget: (variant: CursorVariant) => () => void;
}

const CursorContext = createContext<CursorContextValue | null>(null);

export function useCursorState() {
  const ctx = useContext(CursorContext);
  if (!ctx) {
    throw new Error("useCursorState must be used within CursorProvider");
  }
  return ctx;
}

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CursorState>({
    variant: "default",
    x: 0,
    y: 0,
    isPressed: false,
    isVisible: false,
  });
  const variantStack = useRef<CursorVariant[]>([]);
  const disabled = useRef(false);

  const setVariant = useCallback((variant: CursorVariant) => {
    setState((s) => ({ ...s, variant }));
  }, []);

  const registerTarget = useCallback((variant: CursorVariant) => {
    variantStack.current.push(variant);
    setVariant(variant);
    return () => {
      variantStack.current = variantStack.current.filter((v) => v !== variant);
      const next = variantStack.current[variantStack.current.length - 1] ?? "default";
      setVariant(next);
    };
  }, [setVariant]);

  useEffect(() => {
    if (isTouchDevice()) {
      disabled.current = true;
      return;
    }

    const onMove = (e: MouseEvent) => {
      setState((s) => ({
        ...s,
        x: e.clientX,
        y: e.clientY,
        isVisible: true,
      }));
    };

    const onDown = () => setState((s) => ({ ...s, isPressed: true }));
    const onUp = () => setState((s) => ({ ...s, isPressed: false }));
    const onLeave = () => setState((s) => ({ ...s, isVisible: false }));

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const cursorAttr = target?.closest("[data-cursor]")?.getAttribute("data-cursor");
      if (cursorAttr) {
        setVariant(cursorAttr as CursorVariant);
      }
    };

    document.addEventListener("mouseover", onOver);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover", onOver);
    };
  }, [setVariant]);

  const value = useMemo(
    () => ({ ...state, setVariant, registerTarget }),
    [state, setVariant, registerTarget],
  );

  return (
    <CursorContext.Provider value={value}>
      {children}
      {!disabled.current && <InteractiveCursor />}
    </CursorContext.Provider>
  );
}

interface Particle {
  id: number;
  x: number;
  y: number;
  created: number;
}

function InteractiveCursor() {
  const { variant, x, y, isPressed, isVisible } = useCursorState();
  const [orb, setOrb] = useState({ x: 0, y: 0 });
  const [ring, setRing] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; angle: number }[]>([]);
  const particleId = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setOrb((o) => ({
        x: o.x + (x - o.x) * 0.35,
        y: o.y + (y - o.y) * 0.35,
      }));
      setRing((r) => ({
        x: r.x + (x - r.x) * 0.12,
        y: r.y + (y - r.y) * 0.12,
      }));
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [x, y]);

  useEffect(() => {
    if (reducedMotion.current || !isVisible) return;
    const id = ++particleId.current;
    setParticles((p) => [...p.slice(-9), { id, x, y, created: Date.now() }]);
    const timer = setInterval(() => {
      setParticles((p) => p.filter((pt) => Date.now() - pt.created < 400));
    }, 100);
    return () => clearInterval(timer);
  }, [x, y, isVisible]);

  useEffect(() => {
    if (!isPressed) return;
    const id = ++particleId.current;
    setRipples((r) => [...r, { id, x, y }]);
    if (variant === "forge") {
      const newSparks = Array.from({ length: 6 }, (_, i) => ({
        id: id * 10 + i,
        x,
        y,
        angle: (Math.PI * 2 * i) / 6,
      }));
      setSparks((s) => [...s, ...newSparks]);
    }
    setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id));
      setSparks((s) => s.filter((sp) => Math.floor(sp.id / 10) !== id));
    }, 500);
  }, [isPressed, variant, x, y]);

  if (!isVisible) return null;

  const ringSize =
    variant === "card" ? 64 : variant === "button" || variant === "forge" ? 52 : 44;
  const orbSize = variant === "link" ? { w: 24, h: 4 } : variant === "input" ? { w: 3, h: 20 } : { w: 18, h: 18 };
  const orbScale = variant === "button" || variant === "forge" ? 1.2 : 1;
  const orbColor =
    variant === "disabled" ? "var(--arsenal-muted)" : "var(--arsenal-accent)";

  return (
    <div
      className="arsenal-cursor-root"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 99999,
      }}
      aria-hidden
    >
      {!reducedMotion.current &&
        particles.map((p) => {
          const age = Date.now() - p.created;
          const opacity = Math.max(0, 1 - age / 400);
          const scale = Math.max(0.2, 1 - age / 400);
          return (
            <div
              key={p.id}
              style={{
                position: "fixed",
                left: p.x,
                top: p.y,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--arsenal-accent)",
                opacity: opacity * 0.5,
                transform: `translate(-50%, -50%) scale(${scale})`,
                filter: "blur(2px)",
              }}
            />
          );
        })}

      <div
        style={{
          position: "fixed",
          left: ring.x,
          top: ring.y,
          width: ringSize,
          height: ringSize,
          borderRadius: "50%",
          border: "1.5px solid transparent",
          background:
            "linear-gradient(var(--arsenal-background), var(--arsenal-background)) padding-box, linear-gradient(135deg, var(--arsenal-accent-cyan, var(--arsenal-accent)), var(--arsenal-accent-violet, var(--arsenal-accent)), var(--arsenal-accent-gold, var(--arsenal-accent))) border-box",
          transform: `translate(-50%, -50%) scale(${isPressed ? 0.92 : 1})`,
          transition: "transform 150ms var(--arsenal-ease-spring, ease)",
          animation:
            variant === "button" || variant === "forge"
              ? "arsenal-ring-spin 4s linear infinite"
              : undefined,
          opacity: 0.7,
        }}
      />

      <div
        style={{
          position: "fixed",
          left: orb.x,
          top: orb.y,
          width: orbSize.w,
          height: orbSize.h,
          borderRadius: variant === "link" ? 2 : variant === "input" ? 1 : "50%",
          background: orbColor,
          transform: `translate(-50%, -50%) scale(${orbScale})`,
          boxShadow: `0 0 20px color-mix(in srgb, ${orbColor} 60%, transparent)`,
          filter: "blur(0.5px)",
          mixBlendMode: "screen",
          transition: "width 200ms, height 200ms, border-radius 200ms, transform 200ms",
        }}
      />

      {ripples.map((r) => (
        <div
          key={r.id}
          style={{
            position: "fixed",
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: "1px solid var(--arsenal-accent)",
            transform: "translate(-50%, -50%)",
            animation: "arsenal-ripple 500ms ease-out forwards",
          }}
        />
      ))}

      {sparks.map((s) => (
        <div
          key={s.id}
          style={{
            position: "fixed",
            left: s.x,
            top: s.y,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--arsenal-accent-gold, var(--arsenal-accent))",
            transform: "translate(-50%, -50%)",
            animation: `arsenal-spark 400ms ease-out forwards`,
            ["--spark-angle" as string]: `${s.angle}rad`,
          }}
        />
      ))}

      <style>{`
        @keyframes arsenal-ring-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes arsenal-ripple {
          to { width: 48px; height: 48px; opacity: 0; }
        }
        @keyframes arsenal-spark {
          to {
            transform: translate(
              calc(-50% + cos(var(--spark-angle)) * 24px),
              calc(-50% + sin(var(--spark-angle)) * 24px)
            );
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export { InteractiveCursor };

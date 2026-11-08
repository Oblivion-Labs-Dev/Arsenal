'use client';

import { useRef, type CSSProperties } from 'react';
import { mixRgb, rgba, toRgb, type ColorInput, type PaletteMode, type Rgb } from './color';
import { createRng, randomSeed, type Rng } from './random';
import { useArsenalTheme } from './use-arsenal-theme';
import { useCanvasLoop } from './use-canvas-loop';
import {
  createWeatherParticles,
  decayFlash,
  nextLightningDelayMs,
  rainStreak,
  stepWeatherParticles,
  WEATHER,
  type Precipitation,
  type WeatherParticle,
  type WeatherState,
} from './weather';

export type WeatherCanvasProps = {
  /** Preset; the explicit props below override its values. */
  weather?: WeatherState;
  precip?: Precipitation;
  /** 0–1: particle count, speed and streak length. */
  intensity?: number;
  /** 0–1: drift and slant. */
  wind?: number;
  lightning?: boolean;
  /** Small ellipse ripples in the lower band while it rains. */
  ripples?: boolean;
  seed?: number;
  rainColor?: ColorInput;
  snowColor?: ColorInput;
  petalColor?: ColorInput;
  leafColor?: ColorInput;
  flashColor?: ColorInput;
  palette?: PaletteMode;
  className?: string;
  style?: CSSProperties;
};

const SNOW: Rgb = [245, 244, 236];
const PETAL: Rgb = [223, 166, 163];
const LEAF: Rgb = [185, 120, 63];
const FLASH: Rgb = [222, 232, 245];

/** Rain, snow, petals or leaves over a scene, with optional lightning. Static when motion is reduced. */
export function WeatherCanvas({
  weather = 'rain',
  precip,
  intensity,
  wind,
  lightning,
  ripples = true,
  seed,
  rainColor,
  snowColor,
  petalColor,
  leafColor,
  flashColor,
  palette = 'auto',
  className,
  style,
}: WeatherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useArsenalTheme(palette);
  const seedRef = useRef(seed ?? randomSeed());

  const preset = WEATHER[weather];
  const kind = precip ?? preset.precip;
  const amount = Math.max(0, Math.min(1, intensity ?? preset.intensity));
  const gust = Math.max(0, Math.min(1, wind ?? preset.wind));
  const storm = lightning ?? preset.lightning;

  const light = theme.scheme === 'light';
  // Pale streaks read on dark skies; on light paper, rain takes a cool ink from the theme.
  const rain = toRgb(
    rainColor ?? (light ? mixRgb(theme.blue, theme.text, 0.45) : [226, 238, 243]),
    [226, 238, 243],
  );
  const snow = toRgb(snowColor ?? SNOW, SNOW);
  const snowRim = light ? mixRgb(theme.text, theme.blue, 0.3) : ([96, 116, 130] as Rgb);
  const petal = toRgb(petalColor ?? PETAL, PETAL);
  const leaf = toRgb(leafColor ?? LEAF, LEAF);
  const flashInk = toRgb(flashColor ?? FLASH, FLASH);
  const colorKey = [rain, snow, petal, leaf, flashInk].map((c) => c.join()).join('|');

  const stateRef = useRef<{
    key: string;
    rng: Rng;
    particles: WeatherParticle[];
    flash: number;
    lightningAt: number;
    rippleAt: number;
  } | null>(null);
  const simKey = `${kind}|${amount}|${gust}`;

  useCanvasLoop(
    canvasRef,
    {
      maxDpr: 1,
      draw: ({ ctx, width, height, deltaMs, time, reduced }) => {
        let s = stateRef.current;
        if (!s || s.key !== simKey) {
          // Same seed, same scene: rebuilding on a parameter change stays deterministic.
          const rng = createRng(seedRef.current);
          s = {
            key: simKey,
            rng,
            particles: kind === 'none' ? [] : createWeatherParticles(amount, gust, rng),
            flash: 0,
            lightningAt: time + nextLightningDelayMs(rng),
            rippleAt: 0,
          };
          stateRef.current = s;
        }
        const rng = s.rng;
        const delta = deltaMs / 1000;
        ctx.clearRect(0, 0, width, height);

        if (!reduced && storm) {
          if (time >= s.lightningAt) {
            s.flash = 0.18;
            s.lightningAt = time + nextLightningDelayMs(rng);
          }
          if (s.flash > 0.005) {
            ctx.fillStyle = rgba(flashInk, s.flash);
            ctx.fillRect(0, 0, width, height * 0.58);
            s.flash = decayFlash(s.flash, delta);
          }
        }

        if (!reduced) stepWeatherParticles(s.particles, delta, gust, amount, rng);
        const streak = rainStreak(gust, amount);
        for (const p of s.particles) {
          const x = p.x * width;
          const y = p.y * height;
          if (kind === 'rain') {
            ctx.strokeStyle = rgba(rain, (0.38 + amount * 0.38) * (light ? 0.8 : 1));
            ctx.lineWidth = Math.max(1, p.size * (0.55 + amount * 0.45));
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + streak.dx, y + streak.dy);
            ctx.stroke();
            continue;
          }
          if (kind === 'none') continue;
          const sway = Math.sin(p.phase) * (kind === 'snow' ? 3 : 8);
          ctx.save();
          ctx.translate(x + sway, y);
          ctx.rotate(p.rotation + p.phase * 0.18);
          if (kind === 'snow') {
            // A soft halo plus a faint cool rim keep flakes readable on bright sky and on snow.
            ctx.fillStyle = rgba(snow, 0.22);
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(snow, 0.95);
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = rgba(snowRim, light ? 0.45 : 0.3);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          } else {
            ctx.fillStyle = rgba(kind === 'petals' ? petal : leaf, light ? 0.72 : 0.58);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 1.7, p.size, 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        if (!reduced && ripples && kind === 'rain' && time >= s.rippleAt) {
          const shoreY = height * 0.73 + rng() * height * 0.2;
          const size = 5 + rng() * 18;
          ctx.strokeStyle = rgba(rain, 0.18);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(rng() * width, shoreY, size, size * 0.22, 0, 0, Math.PI * 2);
          ctx.stroke();
          s.rippleAt = time + 90 + rng() * 220;
        }
      },
    },
    [simKey, storm, ripples, colorKey, light],
  );

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

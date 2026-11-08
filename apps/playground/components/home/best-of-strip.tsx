'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { UI_COMPONENT_CATALOG, type ComponentCatalogEntry } from '@arsenal/ui';
import { PreviewStage } from '@/components/library/component-card';
import { BEST_OF_IDS } from '@/lib/catalog';

const ENTRIES = BEST_OF_IDS.map((id) => UI_COMPONENT_CATALOG.find((e) => e.id === id)).filter(
  (e): e is ComponentCatalogEntry => Boolean(e),
);

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

function Card({ entry }: { entry: ComponentCatalogEntry }) {
  return (
    <article
      className="site-card group block w-[78vw] shrink-0 overflow-hidden sm:w-[420px]"
      data-interactive
    >
      <PreviewStage entry={entry} className="h-64" />
      <div className="flex items-center justify-between gap-4 border-t border-arsenal-border px-5 py-4">
        <div className="min-w-0">
          <div className="truncate font-semibold text-arsenal-primary">{entry.name}</div>
          <div className="mt-0.5 truncate text-sm text-arsenal-secondary">{entry.description}</div>
        </div>
        <span className="text-arsenal-accent transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </div>
      {/* Overlay link: live previews may contain their own <a>, which must not nest in this one. */}
      <Link
        href={`/components/${entry.id}`}
        aria-label={`Open ${entry.name}`}
        className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arsenal-accent"
      />
    </article>
  );
}

function Heading() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <div className="site-label">Best of the vault</div>
        <h2 className="site-title mt-3">Live, not screenshots.</h2>
      </div>
      <Link
        href="/components"
        className="text-sm font-medium text-arsenal-accent transition-opacity hover:opacity-80"
      >
        All {UI_COMPONENT_CATALOG.length} components →
      </Link>
    </div>
  );
}

/**
 * Hand-picked components. On wide screens the section pins and vertical scroll moves the row
 * sideways; on phones and with reduced motion it is a plain swipeable row.
 */
export function BestOfStrip() {
  const wide = useWide();
  const reduced = useReducedMotion();
  const pinned = wide && !reduced;
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -travel]);

  useEffect(() => {
    if (!pinned) return;
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setTravel(Math.max(0, track.scrollWidth - window.innerWidth + 64));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pinned]);

  if (!pinned) {
    return (
      <section aria-label="Best of the vault" className="py-20">
        <div className="site-container">
          <Heading />
        </div>
        <div className="site-scroll-x mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-8">
          {ENTRIES.map((entry) => (
            <div key={entry.id} className="snap-start">
              <Card entry={entry} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Best of the vault"
      style={{ height: `calc(100vh + ${travel}px)` }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="site-container">
          <Heading />
        </div>
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="mt-10 flex w-max gap-6 pl-[max(var(--site-gutter),calc((100vw-var(--site-max))/2+var(--site-gutter)))] pr-8"
        >
          {ENTRIES.map((entry) => (
            <Card key={entry.id} entry={entry} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

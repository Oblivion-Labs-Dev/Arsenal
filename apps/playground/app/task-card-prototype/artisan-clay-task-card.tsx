'use client';

import {
  cn,
  rarityColors,
  resolveTaskCardStatus,
  type TaskCardColorScheme,
  type TaskEnergy,
  type TaskRarity,
} from '@arsenal/ui';
import { type CSSProperties, type ChangeEvent, type PointerEvent } from 'react';
import styles from './artisan-clay-task-card.module.css';

interface ArtisanClayTaskCardProps {
  id: string;
  title: string;
  completed: boolean;
  active?: boolean;
  overdue?: boolean;
  energy: TaskEnergy;
  rarity: TaskRarity;
  onCompletedChange: (completed: boolean) => void;
  colorScheme?: TaskCardColorScheme;
  fillContainer?: boolean;
  className?: string;
}

interface ArtisanClayCardStyle extends CSSProperties {
  '--artisan-accent': string;
  '--artisan-light-x': string;
  '--artisan-light-y': string;
  '--artisan-tilt-x': string;
  '--artisan-tilt-y': string;
}

const statusLabels = {
  inactive: 'Paused',
  'in-progress': 'Today',
  'past-due': 'Past due',
  done: 'Done',
} as const;

function ArtisanCompass() {
  return (
    <span className={styles.compass} aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

function ArtisanCheckbox({
  title,
  completed,
  onChange,
}: {
  title: string;
  completed: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className={styles.checkbox} onClick={(event) => event.stopPropagation()}>
      <input
        type="checkbox"
        checked={completed}
        aria-label={`Mark "${title}" complete`}
        onChange={onChange}
        onClick={(event) => event.stopPropagation()}
      />
      <span aria-hidden="true" />
    </label>
  );
}

function ArtisanEnergy({ level }: { level: TaskEnergy }) {
  const activeOrb = level === 'low' ? 1 : level === 'medium' ? 2 : 3;

  return (
    <span className={styles.energy} aria-label={`${level} energy, ${activeOrb} of 3 marks`}>
      <span className={styles.energyHeading}>
        <span>Energy</span>
        <strong>{level}</strong>
      </span>
      <span className={styles.energyTrack} aria-hidden="true">
        <span className={styles.energyFill} />
        <span className={styles.energyOrbs}>
          {[1, 2, 3].map((orb) => (
            <i data-active={orb === activeOrb ? 'true' : 'false'} key={orb} />
          ))}
        </span>
      </span>
    </span>
  );
}

export function ArtisanClayTaskCard({
  id,
  title,
  completed,
  active = true,
  overdue = false,
  energy,
  rarity,
  onCompletedChange,
  colorScheme = 'dark',
  fillContainer = false,
  className,
}: ArtisanClayTaskCardProps) {
  const titleId = `${id}-title`;
  const taskStatus = resolveTaskCardStatus(active, completed, overdue);
  const style: ArtisanClayCardStyle = {
    '--artisan-accent': rarityColors[rarity],
    '--artisan-light-x': '32%',
    '--artisan-light-y': '12%',
    '--artisan-tilt-x': '0deg',
    '--artisan-tilt-y': '0deg',
  };

  const resetPointerLighting = (element: HTMLElement) => {
    element.style.setProperty('--artisan-light-x', '32%');
    element.style.setProperty('--artisan-light-y', '12%');
    element.style.setProperty('--artisan-tilt-x', '0deg');
    element.style.setProperty('--artisan-tilt-y', '0deg');
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      event.pointerType === 'touch' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

    card.style.setProperty('--artisan-light-x', `${normalizedX * 100}%`);
    card.style.setProperty('--artisan-light-y', `${normalizedY * 100}%`);
    card.style.setProperty('--artisan-tilt-x', `${(0.5 - normalizedY) * 2.6}deg`);
    card.style.setProperty('--artisan-tilt-y', `${(normalizedX - 0.5) * 2.6}deg`);
  };

  return (
    <article
      className={cn('artisan-clay-task-card', styles.card, className)}
      data-color-scheme={colorScheme}
      data-completed={completed ? 'true' : 'false'}
      data-energy={energy}
      data-fill-container={fillContainer ? 'true' : 'false'}
      data-rarity={rarity}
      data-task-status={taskStatus}
      aria-labelledby={titleId}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => resetPointerLighting(event.currentTarget)}
    >
      <span className={styles.aura} aria-hidden="true" />
      <div className={styles.motionLayer}>
        <div className={styles.tablet}>
          <span className={styles.grazingLight} aria-hidden="true" />
          <span className={styles.outerRim} aria-hidden="true" />
          <span className={styles.innerRim} aria-hidden="true" />

          <div className={styles.face}>
            <header className={styles.header}>
              <ArtisanCompass />
              <div className={styles.signals}>
                <span className={styles.rarityTile}>
                  <i aria-hidden="true" />
                  <b>{rarity}</b>
                </span>
                <span className={styles.statusSeal}>{statusLabels[taskStatus]}</span>
              </div>
              <ArtisanCheckbox
                title={title}
                completed={completed}
                onChange={(event) => onCompletedChange(event.currentTarget.checked)}
              />
            </header>

            <section className={styles.body}>
              <span className={styles.eyebrow}>Active quest</span>
              <h2 id={titleId}>{title}</h2>
              <span className={styles.carvedDivider} aria-hidden="true">
                <i />
              </span>
            </section>

            <footer className={styles.footer}>
              <ArtisanEnergy level={energy} />
            </footer>
          </div>
        </div>
      </div>
    </article>
  );
}

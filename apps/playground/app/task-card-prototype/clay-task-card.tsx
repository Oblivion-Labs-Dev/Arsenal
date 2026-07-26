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
import styles from './clay-task-card.module.css';

export type TaskCardVisualStyle = 'precision' | 'clay' | 'artisan-clay';

interface ClayTaskCardProps {
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

interface ClayCardStyle extends CSSProperties {
  '--clay-accent': string;
  '--clay-light-x': string;
  '--clay-light-y': string;
  '--clay-tilt-x': string;
  '--clay-tilt-y': string;
}

const filledEnergyMarks: Record<TaskEnergy, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const statusLabels = {
  inactive: 'Paused',
  'in-progress': 'Today',
  'past-due': 'Past due',
  done: 'Done',
} as const;

function ClayEnergyIndicator({ level }: { level: TaskEnergy }) {
  const filledMarks = filledEnergyMarks[level];

  return (
    <span
      className={styles.energyIndicator}
      aria-label={`${level} energy, ${filledMarks} of 3 marks`}
    >
      <span className={styles.energyLabel}>Energy</span>
      <span className={styles.energyMarks} aria-hidden="true">
        {[0, 1, 2].map((mark) => (
          <i data-filled={mark < filledMarks ? 'true' : 'false'} key={mark} />
        ))}
      </span>
      <strong>{level}</strong>
    </span>
  );
}

function ClayCheckbox({
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

export function ClayTaskCard({
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
}: ClayTaskCardProps) {
  const titleId = `${id}-title`;
  const taskStatus = resolveTaskCardStatus(active, completed, overdue);
  const style: ClayCardStyle = {
    '--clay-accent': rarityColors[rarity],
    '--clay-light-x': '42%',
    '--clay-light-y': '18%',
    '--clay-tilt-x': '0deg',
    '--clay-tilt-y': '0deg',
  };

  const resetPointerLighting = (element: HTMLElement) => {
    element.style.setProperty('--clay-light-x', '42%');
    element.style.setProperty('--clay-light-y', '18%');
    element.style.setProperty('--clay-tilt-x', '0deg');
    element.style.setProperty('--clay-tilt-y', '0deg');
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

    card.style.setProperty('--clay-light-x', `${normalizedX * 100}%`);
    card.style.setProperty('--clay-light-y', `${normalizedY * 100}%`);
    card.style.setProperty('--clay-tilt-x', `${(0.5 - normalizedY) * 4}deg`);
    card.style.setProperty('--clay-tilt-y', `${(normalizedX - 0.5) * 4}deg`);
  };

  return (
    <article
      className={cn('clay-task-card', styles.card, className)}
      data-color-scheme={colorScheme}
      data-completed={completed ? 'true' : 'false'}
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
        <div className={styles.surface}>
          <span className={styles.artwork} aria-hidden="true" />
          <span className={styles.rarityWash} aria-hidden="true" />
          <span className={styles.completionWash} aria-hidden="true" />

          <header className={styles.header}>
            <div className={styles.signals}>
              <span className={styles.rarityLabel}>{rarity}</span>
              <span className={styles.statusLabel}>{statusLabels[taskStatus]}</span>
            </div>
            <ClayCheckbox
              title={title}
              completed={completed}
              onChange={(event) => onCompletedChange(event.currentTarget.checked)}
            />
          </header>

          <div className={styles.body}>
            <h2 id={titleId}>{title}</h2>
          </div>

          <footer className={styles.footer}>
            <ClayEnergyIndicator level={energy} />
          </footer>
        </div>
      </div>
    </article>
  );
}

'use client';

import {
  PrecisionTaskCard,
  rarityColors,
  type TaskCardBorderTheme,
  type TaskCardStatus,
  type TaskEnergy,
  type TaskRarity,
} from '@arsenal/ui';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ExpandedTaskCard,
  type CardRect,
  type ExpandedCardState,
  type ExpandedTaskDetails,
} from './expanded-task-card';
import expansionStyles from './expanded-task-card.module.css';
import { ArtisanClayNewQuestCard } from './artisan-clay-new-quest-card';
import { ClayTaskCard, type TaskCardVisualStyle } from './clay-task-card';
import { PrototypeSelect, type PrototypeSelectOption } from './prototype-select';
import { RewardHud } from './reward-hud';
import { getOwnedThemeIds } from './reward-system';
import { THEME_DEFINITIONS } from './theme-catalog';
import { useRewardProgress } from './use-reward-progress';

import styles from './task-card-prototype.module.css';

const sampleTask: ExpandedTaskDetails = {
  id: 'task-card-prototype',
  title: 'Complete system design exercise',
  description:
    'Map the core services, identify the critical data boundaries, and explain the tradeoffs behind the final architecture.',
  schedule: 'Today ? 2:30 PM',
  durationMinutes: 45,
  notes: 'Prioritize a clear decision trail over an exhaustive list of alternatives.',
  recurrence: 'Weekdays',
};

const statusOptions = [
  { value: 'inactive', label: 'Inactive', description: 'Paused task state', accent: '#84909b' },
  {
    value: 'in-progress',
    label: 'In progress',
    description: 'Active task state',
    accent: '#ffe45c',
  },
  { value: 'past-due', label: 'Past due', description: 'Urgent task state', accent: '#ff445d' },
  { value: 'done', label: 'Done', description: 'Completed task state', accent: '#42ff91' },
] as const;

const energyOptions = [
  { value: 'low', label: 'Low', description: 'A light lift', accent: '#8fd8ff' },
  { value: 'medium', label: 'Medium', description: 'Balanced focus', accent: '#e0b84f' },
  { value: 'high', label: 'High', description: 'Deep focus block', accent: '#ff7a64' },
] as const;

const rarityOptions = [
  { value: 'common', label: 'Common', description: 'Neutral steel signal', accent: '#8b949e' },
  { value: 'rare', label: 'Rare', description: 'Electric blue signal', accent: '#4b8dff' },
  { value: 'epic', label: 'Epic', description: 'Magenta power signal', accent: '#d946ef' },
  { value: 'legendary', label: 'Legendary', description: 'Fire-orange signal', accent: '#ff8a2b' },
] as const;

const cardStyleOptions = [
  {
    value: 'artisan-clay',
    label: 'Artisan Clay',
    description: 'Polished charcoal ceramic tablet',
    accent: '#d9913f',
  },
  {
    value: 'clay',
    label: 'Clay',
    description: 'Hand-sculpted collectible card',
    accent: '#d78a43',
  },
  {
    value: 'precision',
    label: 'Precision',
    description: 'Original luminous task card',
    accent: '#4b8dff',
  },
] as const;

const closedExpansion: ExpandedCardState = {
  selectedTaskId: null,
  phase: 'closed',
  sourceRect: null,
};

interface SourceStyle extends CSSProperties {
  '--source-accent': string;
}

function toCardRect(rect: DOMRect): CardRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isInteractiveCardTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('input, button, label, select, textarea, a[href], [data-card-interactive]') !==
      null
  );
}

export function TaskCardPrototype() {
  const { progress, hydrated, lastReward, setLastReward, completeTask, equip, setPart } =
    useRewardProgress();
  const [task, setTask] = useState<ExpandedTaskDetails>(sampleTask);
  const [taskStatus, setTaskStatus] = useState<TaskCardStatus>('in-progress');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark');
  const [energy, setEnergy] = useState<TaskEnergy>('medium');
  const [borderTheme, setBorderTheme] = useState<TaskCardBorderTheme>('electric');
  const [rarity, setRarity] = useState<TaskRarity>('legendary');
  const [cardStyle, setCardStyle] = useState<TaskCardVisualStyle>('artisan-clay');
  const [expandedCard, setExpandedCard] = useState<ExpandedCardState>(closedExpansion);
  const sourceRef = useRef<HTMLDivElement>(null);
  const isExpanded = expandedCard.selectedTaskId === task.id;
  const ownedThemeIds = new Set(getOwnedThemeIds(progress));
  const cardThemeOptions = THEME_DEFINITIONS.filter((theme) => ownedThemeIds.has(theme.id)).map(
    (theme) => ({
      value: theme.id,
      label: theme.name,
      description: theme.description,
      accent: theme.accent,
    }),
  ) as [
    PrototypeSelectOption<TaskCardBorderTheme>,
    ...PrototypeSelectOption<TaskCardBorderTheme>[],
  ];

  useEffect(() => {
    if (hydrated) setBorderTheme(progress.loadout.border);
  }, [hydrated, progress.loadout.border]);

  const openCard = useCallback(() => {
    if (!sourceRef.current || expandedCard.selectedTaskId) return;

    setExpandedCard({
      selectedTaskId: task.id,
      phase: 'opening',
      sourceRect: toCardRect(sourceRef.current.getBoundingClientRect()),
    });
  }, [expandedCard.selectedTaskId, task.id]);

  const beginClose = useCallback(() => {
    setExpandedCard((current) => {
      if (!current.selectedTaskId) return current;
      const currentSource = sourceRef.current?.getBoundingClientRect();

      return {
        ...current,
        phase: 'closing',
        sourceRect: currentSource ? toCardRect(currentSource) : current.sourceRect,
      };
    });
  }, []);

  const finishClose = useCallback(() => {
    setExpandedCard(closedExpansion);
    window.requestAnimationFrame(() => sourceRef.current?.focus({ preventScroll: true }));
  }, []);

  const changePhase = useCallback((phase: ExpandedCardState['phase']) => {
    setExpandedCard((current) => ({ ...current, phase }));
  }, []);

  const changeCompleted = (nextCompleted: boolean) => {
    setTaskStatus(nextCompleted ? 'done' : 'in-progress');

    if (nextCompleted) {
      const completedAt = new Date().toISOString();
      completeTask({
        completionId: `${task.id}:${completedAt.slice(0, 10)}`,
        completedAt,
        durationMinutes: task.durationMinutes,
        energy,
        planned: true,
        themeId: borderTheme,
      });
    }
  };

  const handleSourceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveCardTarget(event.target)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openCard();
  };

  const handleSourceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveCardTarget(event.target)) return;
    openCard();
  };

  const sourceStyle: SourceStyle = {
    '--source-accent': rarityColors[rarity],
  };

  return (
    <>
      <section
        className={styles.stage}
        data-color-scheme={colorScheme}
        data-border-theme={borderTheme}
        data-task-status={taskStatus}
        data-card-rarity={rarity}
        data-card-style={cardStyle}
      >
        <RewardHud
          progress={progress}
          reward={lastReward}
          onDismissReward={() => setLastReward(null)}
          onEquip={(themeId) => {
            equip(themeId);
            setBorderTheme(themeId);
          }}
        />
        <div className={styles.controls} aria-hidden={isExpanded ? 'true' : undefined}>
          <PrototypeSelect<TaskCardVisualStyle>
            label="Design"
            ariaLabel="Card design"
            value={cardStyle}
            options={cardStyleOptions}
            onChange={(nextStyle) => {
              setCardStyle(nextStyle);
              if (nextStyle === 'artisan-clay') {
                setColorScheme('dark');
                setEnergy('medium');
                setRarity('legendary');
              }
            }}
            className={styles.designSelector}
          />

          <PrototypeSelect<TaskCardStatus>
            label="Status"
            ariaLabel="Task status"
            value={taskStatus}
            options={statusOptions}
            onChange={setTaskStatus}
            className={styles.statusSelector}
          />

          <PrototypeSelect<TaskEnergy>
            label="Energy"
            ariaLabel="Task energy"
            value={energy}
            options={energyOptions}
            onChange={setEnergy}
            className={styles.energySelector}
          />

          <PrototypeSelect<TaskRarity>
            label="Rarity"
            ariaLabel="Card rarity"
            value={rarity}
            options={rarityOptions}
            onChange={setRarity}
            className={styles.raritySelector}
          />

          <PrototypeSelect<TaskCardBorderTheme>
            label="Frame"
            ariaLabel="Card border theme"
            value={borderTheme}
            options={cardThemeOptions}
            onChange={(themeId) => {
              setBorderTheme(themeId);
              setPart('border', themeId);
            }}
            className={styles.cardSelector}
          />

          <button
            className={styles.themeToggle}
            type="button"
            onClick={() => setColorScheme((current) => (current === 'light' ? 'dark' : 'light'))}
            aria-label={'Switch to ' + (colorScheme === 'light' ? 'dark' : 'light') + ' mode'}
          >
            <span className={styles.themeToggleIcon} aria-hidden="true">
              {colorScheme === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.7" />
                  <path
                    d="M12 2.5V5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.7"
                  />
                </svg>
              )}
            </span>
            {colorScheme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>

        <div className={expansionStyles.cardCell}>
          <div
            className={expansionStyles.cardSource}
            ref={sourceRef}
            role={cardStyle === 'artisan-clay' ? undefined : 'button'}
            tabIndex={cardStyle === 'artisan-clay' || isExpanded ? -1 : 0}
            aria-label={cardStyle === 'artisan-clay' ? undefined : 'Open details for ' + task.title}
            aria-expanded={cardStyle === 'artisan-clay' ? undefined : isExpanded}
            aria-controls={
              cardStyle !== 'artisan-clay' && isExpanded ? task.id + '-expanded-heading' : undefined
            }
            data-expanded={isExpanded ? 'true' : 'false'}
            style={sourceStyle}
            onClick={cardStyle === 'artisan-clay' ? undefined : handleSourceClick}
            onKeyDown={cardStyle === 'artisan-clay' ? undefined : handleSourceKeyDown}
          >
            {cardStyle === 'artisan-clay' ? (
              <ArtisanClayNewQuestCard />
            ) : cardStyle === 'clay' ? (
              <ClayTaskCard
                id={task.id}
                title={task.title}
                completed={taskStatus === 'done'}
                active={taskStatus !== 'inactive'}
                overdue={taskStatus === 'past-due'}
                energy={energy}
                rarity={rarity}
                colorScheme={colorScheme}
                onCompletedChange={changeCompleted}
              />
            ) : (
              <PrecisionTaskCard
                id={task.id}
                title={task.title}
                completed={taskStatus === 'done'}
                active={taskStatus !== 'inactive'}
                overdue={taskStatus === 'past-due'}
                energy={energy}
                rarity={rarity}
                colorScheme={colorScheme}
                borderTheme={borderTheme}
                surfaceTheme={progress.loadout.surface}
                completionTheme={progress.loadout.completion}
                checkboxTheme={progress.loadout.checkbox}
                onCompletedChange={changeCompleted}
              />
            )}
          </div>
        </div>
      </section>

      {isExpanded ? (
        <ExpandedTaskCard
          state={expandedCard}
          task={task}
          status={taskStatus}
          energy={energy}
          rarity={rarity}
          cardStyle={cardStyle}
          colorScheme={colorScheme}
          borderTheme={borderTheme}
          surfaceTheme={progress.loadout.surface}
          backTheme={progress.loadout.back}
          completionTheme={progress.loadout.completion}
          checkboxTheme={progress.loadout.checkbox}
          onPhaseChange={changePhase}
          onBeginClose={beginClose}
          onClosed={finishClose}
          onCompletedChange={changeCompleted}
          onTaskChange={setTask}
        />
      ) : null}
    </>
  );
}

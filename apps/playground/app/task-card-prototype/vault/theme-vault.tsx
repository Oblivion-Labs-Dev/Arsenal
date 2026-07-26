'use client';

import {
  PrecisionTaskCard,
  type TaskCardBorderTheme,
  type TaskCardColorScheme,
  type TaskCardStatus,
  type TaskRarity,
} from '@arsenal/ui';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getLevelProgress,
  getOwnedThemeIds,
  getThemeMasteryStage,
  type CosmeticPart,
} from '../reward-system';
import { THEME_DEFINITIONS, type CosmeticThemeDefinition } from '../theme-catalog';
import { useRewardProgress } from '../use-reward-progress';
import styles from './theme-vault.module.css';

type VaultFilter = 'all' | 'owned' | 'locked' | 'new' | 'equipped' | 'favorites';

const previewStates: Array<{ value: TaskCardStatus; label: string }> = [
  { value: 'in-progress', label: 'Active' },
  { value: 'done', label: 'Completed' },
  { value: 'past-due', label: 'Past due' },
  { value: 'inactive', label: 'Inactive' },
];

const previewRarities: Array<{ value: TaskRarity; label: string }> = [
  { value: 'common', label: 'Common' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
];

const filters: Array<{ value: VaultFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
  { value: 'locked', label: 'Locked' },
  { value: 'new', label: 'New' },
  { value: 'equipped', label: 'Equipped' },
  { value: 'favorites', label: 'Favorites' },
];

const cosmeticParts: Array<{ value: CosmeticPart; label: string }> = [
  { value: 'surface', label: 'Surface' },
  { value: 'border', label: 'Border' },
  { value: 'back', label: 'Card back' },
  { value: 'completion', label: 'Completion' },
  { value: 'checkbox', label: 'Checkbox' },
];

function unlockLabel(theme: CosmeticThemeDefinition) {
  if (theme.unlock.kind === 'level') return `Unlocks at level ${theme.unlock.level}`;
  return theme.unlock.label;
}

function LazyThemePreview({
  theme,
  colorScheme,
  status,
  rarity,
  locked,
}: {
  theme: CosmeticThemeDefinition;
  colorScheme: TaskCardColorScheme;
  status: TaskCardStatus;
  rarity: TaskRarity;
  locked: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hostRef.current || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '260px',
    });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={styles.previewHost}
      data-locked={locked ? 'true' : 'false'}
      data-visible={visible ? 'true' : 'false'}
      ref={hostRef}
    >
      {visible ? (
        <PrecisionTaskCard
          id={'vault-' + theme.id}
          title={theme.name + ' field test'}
          completed={status === 'done'}
          active={status !== 'inactive'}
          overdue={status === 'past-due'}
          energy="medium"
          rarity={rarity}
          colorScheme={colorScheme}
          borderTheme={theme.id}
          onCompletedChange={() => undefined}
          className={styles.previewCard}
        />
      ) : (
        <span className={styles.previewSkeleton} aria-hidden="true" />
      )}
      {locked ? (
        <span className={styles.lockVeil}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" />
          </svg>
          Locked
        </span>
      ) : null}
    </div>
  );
}

export function ThemeVault() {
  const {
    progress,
    hydrated,
    equip,
    setPart,
    toggleFavorite,
    pinGoal,
    setRewardMotion,
    clearNewTheme,
    resetDemo,
  } = useRewardProgress();
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [colorScheme, setColorScheme] = useState<TaskCardColorScheme>('dark');
  const [previewStatus, setPreviewStatus] = useState<TaskCardStatus>('in-progress');
  const [previewRarity, setPreviewRarity] = useState<TaskRarity>('epic');
  const [selectedThemeId, setSelectedThemeId] = useState<TaskCardBorderTheme>(
    progress.equippedTheme,
  );

  useEffect(() => {
    if (hydrated) setSelectedThemeId(progress.equippedTheme);
  }, [hydrated, progress.equippedTheme]);
  const ownedIds = useMemo(() => new Set(getOwnedThemeIds(progress)), [progress]);
  const levelProgress = getLevelProgress(progress.totalXp);
  const selectedTheme =
    THEME_DEFINITIONS.find((entry) => entry.id === selectedThemeId) ?? THEME_DEFINITIONS[0];
  const selectedOwned = ownedIds.has(selectedTheme.id);
  const selectedMastery = progress.themeMastery[selectedTheme.id] ?? 0;
  const selectedStage = getThemeMasteryStage(selectedMastery);
  const ownedThemes = THEME_DEFINITIONS.filter((entry) => ownedIds.has(entry.id));
  const pinnedTheme =
    THEME_DEFINITIONS.find((entry) => entry.id === progress.pinnedTheme) ?? selectedTheme;
  const filteredThemes = THEME_DEFINITIONS.filter((entry) => {
    if (filter === 'owned') return ownedIds.has(entry.id);
    if (filter === 'locked') return !ownedIds.has(entry.id);
    if (filter === 'new') return progress.newThemeIds.includes(entry.id);
    if (filter === 'equipped') return progress.equippedTheme === entry.id;
    if (filter === 'favorites') return progress.favoriteThemeIds.includes(entry.id);
    return true;
  });
  const pinnedProgress =
    pinnedTheme.unlock.kind === 'level'
      ? {
          value: Math.min(progress.totalXp, (pinnedTheme.unlock.level - 1) * 100),
          max: (pinnedTheme.unlock.level - 1) * 100,
          label: `${Math.min(progress.totalXp, (pinnedTheme.unlock.level - 1) * 100)} / ${(pinnedTheme.unlock.level - 1) * 100} XP`,
        }
      : {
          value: progress.themeFragments[pinnedTheme.id] ?? 0,
          max: 12,
          label: `${progress.themeFragments[pinnedTheme.id] ?? 0} / 12 fragments`,
        };

  const randomizeOwnedTheme = () => {
    if (ownedThemes.length === 0) return;
    const pool = ownedThemes.filter((entry) => entry.id !== progress.equippedTheme);
    const nextPool = pool.length > 0 ? pool : ownedThemes;
    const next = nextPool[Math.floor(Math.random() * nextPool.length)];
    equip(next.id);
    setSelectedThemeId(next.id);
  };

  return (
    <div className={styles.vault} data-color-scheme={colorScheme}>
      <header className={styles.topbar}>
        <div>
          <Link href="/task-card-prototype" className={styles.backLink}>
            <span aria-hidden="true">?</span>
            Task card
          </Link>
          <p className={styles.kicker}>Arsenal collection</p>
          <h1>Card Vault</h1>
        </div>
        <div className={styles.topActions}>
          <button type="button" onClick={randomizeOwnedTheme}>
            Randomize owned
          </button>
          <button
            type="button"
            onClick={() => setColorScheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          >
            {colorScheme === 'dark' ? 'Light preview' : 'Dark preview'}
          </button>
        </div>
      </header>

      <section className={styles.progressDeck} aria-label="Reward progress">
        <div className={styles.levelBadge}>
          <span>Level</span>
          <strong>{progress.level}</strong>
        </div>
        <div className={styles.progressCopy}>
          <div>
            <strong>{progress.totalXp.toLocaleString()} XP</strong>
            <span>
              {levelProgress.earnedInLevel} / {levelProgress.requiredInLevel} to level{' '}
              {progress.level + 1}
            </span>
          </div>
          <span className={styles.progressTrack}>
            <i style={{ width: levelProgress.percent + '%' }} />
          </span>
          <p>
            XP comes from validated completions, planned work, and balanced weeks. Cosmetics never
            change task value.
          </p>
        </div>
        <div className={styles.goalCard}>
          <span>Pinned reward</span>
          <strong>{pinnedTheme.name}</strong>
          <small>{pinnedProgress.label}</small>
          <span className={styles.goalTrack}>
            <i
              style={{
                width: Math.min(100, (pinnedProgress.value / pinnedProgress.max) * 100) + '%',
              }}
            />
          </span>
        </div>
        <div className={styles.streakCard}>
          <span>Steady rhythm</span>
          <strong>{progress.streakDays} days</strong>
          <small>No harsh reset penalties</small>
        </div>
      </section>

      <section className={styles.featured} aria-label="Selected theme preview">
        <div className={styles.featuredPreview}>
          <LazyThemePreview
            theme={selectedTheme}
            colorScheme={colorScheme}
            status={previewStatus}
            rarity={previewRarity}
            locked={!selectedOwned}
          />
        </div>
        <div className={styles.featuredDetails}>
          <span className={styles.collectionTag}>{selectedTheme.collection}</span>
          <div className={styles.featuredTitle}>
            <div>
              <h2>{selectedTheme.name}</h2>
              <p>{selectedTheme.description}</p>
            </div>
            <button
              className={styles.favoriteButton}
              type="button"
              data-active={progress.favoriteThemeIds.includes(selectedTheme.id) ? 'true' : 'false'}
              onClick={() => toggleFavorite(selectedTheme.id)}
              aria-label={
                (progress.favoriteThemeIds.includes(selectedTheme.id) ? 'Remove ' : 'Add ') +
                selectedTheme.name +
                (progress.favoriteThemeIds.includes(selectedTheme.id)
                  ? ' from favorites'
                  : ' to favorites')
              }
            >
              ?
            </button>
          </div>
          <blockquote>{selectedTheme.lore}</blockquote>
          <dl className={styles.themeStats}>
            <div>
              <dt>Ownership</dt>
              <dd>{selectedOwned ? 'Owned' : 'Locked'}</dd>
            </div>
            <div>
              <dt>Mastery</dt>
              <dd>{selectedStage}</dd>
            </div>
            <div>
              <dt>Mastery XP</dt>
              <dd>
                {selectedMastery} /{' '}
                {selectedStage === 'base' ? 100 : selectedStage === 'enhanced' ? 300 : '?'}
              </dd>
            </div>
          </dl>
          <div className={styles.unlockRequirement}>
            <span>{selectedOwned ? 'Unlocked' : 'Requirement'}</span>
            <strong>{selectedOwned ? 'Ready to equip' : unlockLabel(selectedTheme)}</strong>
          </div>
          <div className={styles.featuredActions}>
            {selectedOwned ? (
              <button
                className={styles.primaryButton}
                type="button"
                disabled={progress.equippedTheme === selectedTheme.id}
                onClick={() => equip(selectedTheme.id)}
              >
                {progress.equippedTheme === selectedTheme.id ? 'Equipped' : 'Equip preset'}
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => pinGoal(selectedTheme.id)}
              >
                Pin as reward goal
              </button>
            )}
            {progress.newThemeIds.includes(selectedTheme.id) ? (
              <button type="button" onClick={() => clearNewTheme(selectedTheme.id)}>
                Mark seen
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.previewControls} aria-label="Preview controls">
        <div>
          <span>Task state</span>
          <div className={styles.segmented}>
            {previewStates.map((entry) => (
              <button
                type="button"
                key={entry.value}
                data-active={previewStatus === entry.value ? 'true' : 'false'}
                onClick={() => setPreviewStatus(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span>Rarity finish</span>
          <div className={styles.segmented}>
            {previewRarities.map((entry) => (
              <button
                type="button"
                key={entry.value}
                data-active={previewRarity === entry.value ? 'true' : 'false'}
                data-rarity={entry.value}
                onClick={() => setPreviewRarity(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.motionControl}>
          <input
            type="checkbox"
            checked={progress.rewardMotion === 'reduced'}
            onChange={(event) => setRewardMotion(event.currentTarget.checked ? 'reduced' : 'full')}
          />
          <span>Reduce reward animations</span>
        </label>
      </section>

      <section className={styles.customizer} aria-labelledby="customizer-heading">
        <div>
          <p className={styles.kicker}>Mix and match</p>
          <h2 id="customizer-heading">Cosmetic loadout</h2>
          <p>
            Preset themes remain one click away. Individual parts can be combined independently.
          </p>
        </div>
        <div className={styles.partGrid}>
          {cosmeticParts.map((part) => (
            <label key={part.value}>
              <span>{part.label}</span>
              <select
                value={progress.loadout[part.value]}
                onChange={(event) =>
                  setPart(part.value, event.currentTarget.value as TaskCardBorderTheme)
                }
              >
                {ownedThemes.map((entry) => (
                  <option value={entry.id} key={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className={styles.galleryHeader}>
        <div>
          <p className={styles.kicker}>Collection index</p>
          <h2>{filteredThemes.length} card themes</h2>
        </div>
        <div className={styles.filters} aria-label="Theme filters">
          {filters.map((entry) => (
            <button
              type="button"
              key={entry.value}
              data-active={filter === entry.value ? 'true' : 'false'}
              onClick={() => setFilter(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.gallery} aria-label="Card theme collection">
        {filteredThemes.map((theme) => {
          const owned = ownedIds.has(theme.id);
          const isNew = progress.newThemeIds.includes(theme.id);
          const equipped = progress.equippedTheme === theme.id;
          const mastery = getThemeMasteryStage(progress.themeMastery[theme.id] ?? 0);

          return (
            <article
              className={styles.themeTile}
              data-selected={selectedTheme.id === theme.id ? 'true' : 'false'}
              data-locked={owned ? 'false' : 'true'}
              key={theme.id}
              style={{ '--vault-accent': theme.accent } as React.CSSProperties}
            >
              <div className={styles.tileSignals}>
                <span>{theme.collection}</span>
                <div>
                  {isNew ? <b>New</b> : null}
                  {equipped ? <b>Equipped</b> : null}
                  {progress.favoriteThemeIds.includes(theme.id) ? <b>?</b> : null}
                </div>
              </div>
              <LazyThemePreview
                theme={theme}
                colorScheme={colorScheme}
                status={previewStatus}
                rarity={previewRarity}
                locked={!owned}
              />
              <div className={styles.tileCopy}>
                <div>
                  <h3>{theme.name}</h3>
                  <span>{owned ? mastery : unlockLabel(theme)}</span>
                </div>
                <button type="button" onClick={() => setSelectedThemeId(theme.id)}>
                  Preview
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <footer className={styles.footer}>
        <p>No loot boxes, artificial scarcity, paid odds, or productivity-gating.</p>
        <button type="button" onClick={resetDemo}>
          Reset prototype progress
        </button>
      </footer>
    </div>
  );
}

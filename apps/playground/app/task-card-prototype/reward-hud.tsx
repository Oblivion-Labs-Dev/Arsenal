'use client';

import type { TaskCardBorderTheme } from '@arsenal/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getLevelProgress,
  getNextLevelThemeUnlock,
  type CompletionRewardResult,
  type RewardProgress,
} from './reward-system';
import { THEME_DEFINITIONS } from './theme-catalog';
import styles from './task-card-prototype.module.css';

interface RewardHudProps {
  progress: RewardProgress;
  reward: CompletionRewardResult | null;
  onDismissReward: () => void;
  onEquip: (themeId: TaskCardBorderTheme) => void;
}

export function RewardHud({ progress, reward, onDismissReward, onEquip }: RewardHudProps) {
  const level = getLevelProgress(progress.totalXp);
  const nextUnlock = getNextLevelThemeUnlock(progress);
  const [revealIndex, setRevealIndex] = useState(0);
  const unlockedThemeId = reward?.unlockedThemeIds[revealIndex];
  const unlockedTheme = THEME_DEFINITIONS.find((entry) => entry.id === unlockedThemeId);

  useEffect(() => setRevealIndex(0), [reward]);

  return (
    <>
      <aside className={styles.rewardHud} aria-label="Reward progress">
        <span className={styles.hudLevel}>LV {progress.level}</span>
        <div className={styles.hudProgress}>
          <div>
            <strong>{progress.totalXp.toLocaleString()} XP</strong>
            <span>
              {level.earnedInLevel} / {level.requiredInLevel}
            </span>
          </div>
          <span className={styles.hudTrack}>
            <i style={{ width: level.percent + '%' }} />
          </span>
          <small>
            {nextUnlock && nextUnlock.unlock.kind === 'level'
              ? `${nextUnlock.name} ? level ${nextUnlock.unlock.level}`
              : 'All level rewards collected'}
          </small>
        </div>
        <Link href="/task-card-prototype/vault" className={styles.vaultLink}>
          <span>Collection</span>
          <strong>Open Vault</strong>
          {progress.newThemeIds.length > 0 ? <b>{progress.newThemeIds.length}</b> : null}
        </Link>
      </aside>

      {reward ? (
        <aside
          className={styles.rewardMoment}
          data-motion={progress.rewardMotion}
          role="status"
          aria-live="polite"
        >
          <button
            className={styles.rewardDismiss}
            type="button"
            onClick={onDismissReward}
            aria-label="Dismiss reward"
          >
            ?
          </button>
          {reward.status === 'duplicate' ? (
            <>
              <span className={styles.rewardEyebrow}>Completion secured</span>
              <h2>XP already collected</h2>
              <p>Repeated toggles never generate extra XP. Your task state was still updated.</p>
            </>
          ) : unlockedTheme ? (
            <>
              <span className={styles.rewardEyebrow}>
                Level {reward.levelAfter} ? reward {revealIndex + 1} of{' '}
                {reward.unlockedThemeIds.length}
              </span>
              <span
                className={styles.rewardSwatch}
                style={
                  {
                    '--reward-swatch': unlockedTheme.accent,
                    '--reward-swatch-secondary': unlockedTheme.secondary,
                  } as React.CSSProperties
                }
              />
              <h2>{unlockedTheme.name} unlocked</h2>
              <p>{unlockedTheme.description}</p>
              <div className={styles.rewardActions}>
                <Link href="/task-card-prototype/vault">Preview</Link>
                <button
                  type="button"
                  onClick={() => {
                    onEquip(unlockedTheme.id);
                    onDismissReward();
                  }}
                >
                  Equip
                </button>
                {revealIndex < reward.unlockedThemeIds.length - 1 ? (
                  <button type="button" onClick={() => setRevealIndex((index) => index + 1)}>
                    Next reward
                  </button>
                ) : (
                  <button type="button" onClick={onDismissReward}>
                    Later
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className={styles.rewardEyebrow}>
                {reward.levelAfter > reward.levelBefore
                  ? `Level ${reward.levelAfter}`
                  : 'Task reward'}
              </span>
              <h2>+{reward.awardedXp} XP</h2>
              <p>
                {reward.balancedWeekBonusXp > 0
                  ? `Includes a ${reward.balancedWeekBonusXp} XP balanced-week bonus.`
                  : `Includes ${reward.plannedBonusXp} XP for completing planned work.`}
              </p>
              <div className={styles.rewardActions}>
                <Link href="/task-card-prototype/vault">View progress</Link>
                <button type="button" onClick={onDismissReward}>
                  Continue
                </button>
              </div>
            </>
          )}
        </aside>
      ) : null}
    </>
  );
}

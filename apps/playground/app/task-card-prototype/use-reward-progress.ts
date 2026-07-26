'use client';

import type { TaskCardBorderTheme } from '@arsenal/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyCompletionReward,
  createInitialRewardProgress,
  equipTheme,
  pinThemeGoal,
  parseRewardProgress,
  REWARD_STORAGE_KEY,
  serializeRewardProgress,
  setLoadoutPart,
  toggleFavoriteTheme,
  type CompletionRewardInput,
  type CompletionRewardResult,
  type CosmeticPart,
  type RewardMotionPreference,
  type RewardProgress,
} from './reward-system';

export function useRewardProgress() {
  const [progress, setProgressState] = useState<RewardProgress>(createInitialRewardProgress);
  const [hydrated, setHydrated] = useState(false);
  const [lastReward, setLastReward] = useState<CompletionRewardResult | null>(null);
  const progressRef = useRef(progress);

  const commit = useCallback((next: RewardProgress) => {
    progressRef.current = next;
    setProgressState(next);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(REWARD_STORAGE_KEY);
    commit(parseRewardProgress(stored));
    setHydrated(true);
  }, [commit]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(REWARD_STORAGE_KEY, serializeRewardProgress(progress));
  }, [hydrated, progress]);

  const completeTask = useCallback(
    (input: CompletionRewardInput) => {
      const result = applyCompletionReward(progressRef.current, input);
      commit(result.progress);
      setLastReward(result);
      return result;
    },
    [commit],
  );

  const equip = useCallback(
    (themeId: TaskCardBorderTheme) => commit(equipTheme(progressRef.current, themeId)),
    [commit],
  );

  const setPart = useCallback(
    (part: CosmeticPart, themeId: TaskCardBorderTheme) =>
      commit(setLoadoutPart(progressRef.current, part, themeId)),
    [commit],
  );

  const toggleFavorite = useCallback(
    (themeId: TaskCardBorderTheme) => commit(toggleFavoriteTheme(progressRef.current, themeId)),
    [commit],
  );

  const pinGoal = useCallback(
    (themeId: TaskCardBorderTheme) => commit(pinThemeGoal(progressRef.current, themeId)),
    [commit],
  );

  const setRewardMotion = useCallback(
    (rewardMotion: RewardMotionPreference) => commit({ ...progressRef.current, rewardMotion }),
    [commit],
  );

  const clearNewTheme = useCallback(
    (themeId: TaskCardBorderTheme) =>
      commit({
        ...progressRef.current,
        newThemeIds: progressRef.current.newThemeIds.filter((entry) => entry !== themeId),
      }),
    [commit],
  );

  const resetDemo = useCallback(() => {
    const next = createInitialRewardProgress();
    commit(next);
    setLastReward(null);
  }, [commit]);

  return {
    progress,
    hydrated,
    lastReward,
    setLastReward,
    completeTask,
    equip,
    setPart,
    toggleFavorite,
    pinGoal,
    setRewardMotion,
    clearNewTheme,
    resetDemo,
  };
}

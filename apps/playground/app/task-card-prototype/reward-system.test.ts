import { describe, expect, it } from 'vitest';
import {
  applyCompletionReward,
  createInitialRewardProgress,
  DAILY_XP_LIMIT,
  equipTheme,
  getLevelProgress,
  getOwnedThemeIds,
  getThemeMasteryStage,
  parseRewardProgress,
  serializeRewardProgress,
  setLoadoutPart,
} from './reward-system';

const completion = {
  completionId: 'task-1:2026-07-19',
  completedAt: '2026-07-19T18:00:00.000Z',
  durationMinutes: 45,
  energy: 'medium' as const,
  planned: true,
  themeId: 'electric' as const,
};

describe('task reward progression', () => {
  it('awards effort XP and a ten-percent planned bonus', () => {
    const progress = {
      ...createInitialRewardProgress(),
      weeklyCompletions: 0,
      balancedBonusWeekKeys: ['2026-07-13'],
    };
    const result = applyCompletionReward(progress, completion);

    expect(result.baseXp).toBe(25);
    expect(result.plannedBonusXp).toBe(3);
    expect(result.balancedWeekBonusXp).toBe(0);
    expect(result.awardedXp).toBe(28);
  });

  it('prevents XP from repeated completion toggles', () => {
    const first = applyCompletionReward(createInitialRewardProgress(), completion);
    const duplicate = applyCompletionReward(first.progress, completion);

    expect(duplicate.status).toBe('duplicate');
    expect(duplicate.awardedXp).toBe(0);
    expect(duplicate.progress.totalXp).toBe(first.progress.totalXp);
  });

  it('uses diminishing returns for repeated tiny tasks', () => {
    const progress = {
      ...createInitialRewardProgress(),
      weeklyCompletions: 0,
      quickCompletionsByDate: { '2026-07-19': 3 },
      balancedBonusWeekKeys: ['2026-07-13'],
    };
    const result = applyCompletionReward(progress, {
      ...completion,
      durationMinutes: 10,
      planned: false,
    });

    expect(result.baseXp).toBe(7);
  });

  it('enforces the daily XP limit', () => {
    const progress = {
      ...createInitialRewardProgress(),
      weeklyCompletions: 0,
      dailyXpByDate: { '2026-07-19': DAILY_XP_LIMIT - 5 },
      balancedBonusWeekKeys: ['2026-07-13'],
    };
    const result = applyCompletionReward(progress, completion);

    expect(result.awardedXp).toBe(5);
    expect(result.progress.dailyXpByDate['2026-07-19']).toBe(DAILY_XP_LIMIT);
  });

  it('unlocks level and balanced-week rewards through legitimate completion', () => {
    const result = applyCompletionReward(createInitialRewardProgress(), completion);

    expect(result.levelBefore).toBe(19);
    expect(result.levelAfter).toBe(20);
    expect(result.unlockedThemeIds).toEqual(expect.arrayContaining(['living-ink', 'solarpunk']));
    expect(getOwnedThemeIds(result.progress)).toContain('living-ink');
  });

  it('tracks mastery stages without changing task value', () => {
    expect(getThemeMasteryStage(0)).toBe('base');
    expect(getThemeMasteryStage(100)).toBe('enhanced');
    expect(getThemeMasteryStage(300)).toBe('ascended');
  });

  it('persists equipped cosmetics, loadout parts, and reduced motion', () => {
    const initial = createInitialRewardProgress();
    const equipped = equipTheme(initial, 'holographic');
    const customized = setLoadoutPart(equipped, 'surface', 'blueprint');
    const restored = parseRewardProgress(
      serializeRewardProgress({ ...customized, rewardMotion: 'reduced' }),
    );

    expect(restored.equippedTheme).toBe('holographic');
    expect(restored.loadout.surface).toBe('blueprint');
    expect(restored.rewardMotion).toBe('reduced');
  });

  it('does not equip a locked theme and safely recovers corrupt storage', () => {
    const initial = createInitialRewardProgress();
    expect(equipTheme(initial, 'void')).toBe(initial);
    expect(parseRewardProgress('{not-json').totalXp).toBe(initial.totalXp);
  });

  it('reports exact level progress for the XP bar', () => {
    expect(getLevelProgress(1872)).toMatchObject({
      level: 19,
      currentFloorXp: 1800,
      nextLevelXp: 1900,
      earnedInLevel: 72,
      requiredInLevel: 100,
      percent: 72,
    });
  });
});

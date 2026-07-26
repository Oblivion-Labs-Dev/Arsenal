import type { TaskCardBorderTheme, TaskEnergy } from '@arsenal/ui';
import { THEME_DEFINITIONS, THEME_IDS } from './theme-catalog';

export const REWARD_STORAGE_KEY = 'arsenal.task-card-rewards.v1';
export const DAILY_XP_LIMIT = 250;

export type ThemeMasteryStage = 'base' | 'enhanced' | 'ascended';
export type RewardMotionPreference = 'full' | 'reduced';
export type CosmeticPart = 'surface' | 'border' | 'back' | 'completion' | 'checkbox';

export interface CosmeticLoadout {
  preset: TaskCardBorderTheme;
  surface: TaskCardBorderTheme;
  border: TaskCardBorderTheme;
  back: TaskCardBorderTheme;
  completion: TaskCardBorderTheme;
  checkbox: TaskCardBorderTheme;
}

export interface RewardProgress {
  version: 1;
  totalXp: number;
  level: number;
  streakDays: number;
  weeklyCompletions: number;
  completionEventIds: string[];
  earnedThemeIds: TaskCardBorderTheme[];
  newThemeIds: TaskCardBorderTheme[];
  favoriteThemeIds: TaskCardBorderTheme[];
  equippedTheme: TaskCardBorderTheme;
  pinnedTheme: TaskCardBorderTheme;
  themeMastery: Partial<Record<TaskCardBorderTheme, number>>;
  themeFragments: Partial<Record<TaskCardBorderTheme, number>>;
  loadout: CosmeticLoadout;
  rewardMotion: RewardMotionPreference;
  dailyXpByDate: Record<string, number>;
  quickCompletionsByDate: Record<string, number>;
  balancedBonusWeekKeys: string[];
}

export interface CompletionRewardInput {
  completionId: string;
  completedAt: string;
  durationMinutes: number;
  energy: TaskEnergy;
  planned: boolean;
  themeId: TaskCardBorderTheme;
}

export interface CompletionRewardResult {
  status: 'awarded' | 'duplicate' | 'capped';
  progress: RewardProgress;
  awardedXp: number;
  baseXp: number;
  plannedBonusXp: number;
  balancedWeekBonusXp: number;
  levelBefore: number;
  levelAfter: number;
  unlockedThemeIds: TaskCardBorderTheme[];
  masteryStageBefore: ThemeMasteryStage;
  masteryStageAfter: ThemeMasteryStage;
}

export interface LevelProgress {
  level: number;
  currentFloorXp: number;
  nextLevelXp: number;
  earnedInLevel: number;
  requiredInLevel: number;
  percent: number;
}

const themeIdSet = new Set<TaskCardBorderTheme>(THEME_IDS);

export function getLevelFromXp(totalXp: number) {
  return Math.max(1, Math.min(50, Math.floor(Math.max(0, totalXp) / 100) + 1));
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const level = getLevelFromXp(totalXp);
  const currentFloorXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const earnedInLevel = Math.max(0, totalXp - currentFloorXp);
  const requiredInLevel = nextLevelXp - currentFloorXp;

  return {
    level,
    currentFloorXp,
    nextLevelXp,
    earnedInLevel,
    requiredInLevel,
    percent: Math.min(100, (earnedInLevel / requiredInLevel) * 100),
  };
}

export function getThemeMasteryStage(points: number): ThemeMasteryStage {
  if (points >= 300) return 'ascended';
  if (points >= 100) return 'enhanced';
  return 'base';
}

export function createInitialRewardProgress(): RewardProgress {
  const loadout: CosmeticLoadout = {
    preset: 'electric',
    surface: 'electric',
    border: 'electric',
    back: 'electric',
    completion: 'electric',
    checkbox: 'electric',
  };

  return {
    version: 1,
    totalXp: 1872,
    level: 19,
    streakDays: 6,
    weeklyCompletions: 4,
    completionEventIds: [],
    earnedThemeIds: ['aurora'],
    newThemeIds: ['frost', 'celestial', 'holographic', 'aurora'],
    favoriteThemeIds: ['blueprint', 'holographic'],
    equippedTheme: 'electric',
    pinnedTheme: 'living-ink',
    themeMastery: { electric: 76, blueprint: 128, ember: 32 },
    themeFragments: { 'living-ink': 7 },
    loadout,
    rewardMotion: 'full',
    dailyXpByDate: {},
    quickCompletionsByDate: {},
    balancedBonusWeekKeys: [],
  };
}

export function getOwnedThemeIds(progress: RewardProgress) {
  return THEME_DEFINITIONS.filter((entry) => {
    if (entry.unlock.kind === 'level' && progress.level >= entry.unlock.level) return true;
    return progress.earnedThemeIds.includes(entry.id);
  }).map((entry) => entry.id);
}

export function isThemeOwned(progress: RewardProgress, themeId: TaskCardBorderTheme) {
  return getOwnedThemeIds(progress).includes(themeId);
}

export function getNextLevelThemeUnlock(progress: RewardProgress) {
  return (
    THEME_DEFINITIONS.filter(
      (entry) => entry.unlock.kind === 'level' && entry.unlock.level > progress.level,
    ).sort((first, second) => {
      const firstLevel = first.unlock.kind === 'level' ? first.unlock.level : 99;
      const secondLevel = second.unlock.kind === 'level' ? second.unlock.level : 99;
      return firstLevel - secondLevel;
    })[0] ?? null
  );
}

function getDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getWeekKey(value: string) {
  const date = new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const day = safeDate.getUTCDay() || 7;
  const monday = new Date(safeDate);
  monday.setUTCDate(safeDate.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

function getBaseXp(durationMinutes: number) {
  if (durationMinutes <= 15) return 10;
  if (durationMinutes <= 60) return 25;
  return 50;
}

function getDifficultyMultiplier(energy: TaskEnergy) {
  if (energy === 'high') return 1.2;
  if (energy === 'low') return 0.9;
  return 1;
}

function getQuickTaskMultiplier(completionsToday: number) {
  if (completionsToday < 3) return 1;
  if (completionsToday < 6) return 0.65;
  return 0.35;
}

export function applyCompletionReward(
  progress: RewardProgress,
  input: CompletionRewardInput,
): CompletionRewardResult {
  const levelBefore = getLevelFromXp(progress.totalXp);
  const masteryBefore = progress.themeMastery[input.themeId] ?? 0;
  const masteryStageBefore = getThemeMasteryStage(masteryBefore);

  if (progress.completionEventIds.includes(input.completionId)) {
    return {
      status: 'duplicate',
      progress,
      awardedXp: 0,
      baseXp: 0,
      plannedBonusXp: 0,
      balancedWeekBonusXp: 0,
      levelBefore,
      levelAfter: levelBefore,
      unlockedThemeIds: [],
      masteryStageBefore,
      masteryStageAfter: masteryStageBefore,
    };
  }

  const dateKey = getDateKey(input.completedAt);
  const weekKey = getWeekKey(input.completedAt);
  const duration = Math.max(5, Math.min(240, Math.round(input.durationMinutes)));
  const quickCompletionsToday = progress.quickCompletionsByDate[dateKey] ?? 0;
  const quickMultiplier = duration <= 15 ? getQuickTaskMultiplier(quickCompletionsToday) : 1;
  const baseXp = Math.max(
    1,
    Math.round(getBaseXp(duration) * getDifficultyMultiplier(input.energy) * quickMultiplier),
  );
  const plannedBonusXp = input.planned ? Math.round(baseXp * 0.1) : 0;
  const nextWeeklyCompletions = progress.weeklyCompletions + 1;
  const earnsBalancedWeek =
    nextWeeklyCompletions >= 5 && !progress.balancedBonusWeekKeys.includes(weekKey);
  const balancedWeekBonusXp = earnsBalancedWeek ? 75 : 0;
  const requestedXp = baseXp + plannedBonusXp + balancedWeekBonusXp;
  const earnedToday = progress.dailyXpByDate[dateKey] ?? 0;
  const awardedXp = Math.max(0, Math.min(requestedXp, DAILY_XP_LIMIT - earnedToday));
  const totalXp = progress.totalXp + awardedXp;
  const levelAfter = getLevelFromXp(totalXp);
  const earnedThemeIds = earnsBalancedWeek
    ? Array.from(new Set([...progress.earnedThemeIds, 'solarpunk' as const]))
    : progress.earnedThemeIds;
  const nextBase: RewardProgress = {
    ...progress,
    totalXp,
    level: levelAfter,
    weeklyCompletions: nextWeeklyCompletions,
    completionEventIds: [...progress.completionEventIds, input.completionId].slice(-500),
    earnedThemeIds,
    themeMastery: {
      ...progress.themeMastery,
      [input.themeId]: masteryBefore + awardedXp,
    },
    themeFragments: {
      ...progress.themeFragments,
      [progress.pinnedTheme]: (progress.themeFragments[progress.pinnedTheme] ?? 0) + 1,
    },
    dailyXpByDate: { ...progress.dailyXpByDate, [dateKey]: earnedToday + awardedXp },
    quickCompletionsByDate: {
      ...progress.quickCompletionsByDate,
      [dateKey]: quickCompletionsToday + (duration <= 15 ? 1 : 0),
    },
    balancedBonusWeekKeys: earnsBalancedWeek
      ? [...progress.balancedBonusWeekKeys, weekKey].slice(-20)
      : progress.balancedBonusWeekKeys,
  };
  const ownedBefore = new Set(getOwnedThemeIds(progress));
  const unlockedThemeIds = getOwnedThemeIds(nextBase).filter((id) => !ownedBefore.has(id));
  const nextProgress: RewardProgress = {
    ...nextBase,
    newThemeIds: Array.from(new Set([...nextBase.newThemeIds, ...unlockedThemeIds])),
  };
  const masteryStageAfter = getThemeMasteryStage(
    nextProgress.themeMastery[input.themeId] ?? masteryBefore,
  );

  return {
    status: awardedXp > 0 ? 'awarded' : 'capped',
    progress: nextProgress,
    awardedXp,
    baseXp,
    plannedBonusXp,
    balancedWeekBonusXp,
    levelBefore,
    levelAfter,
    unlockedThemeIds,
    masteryStageBefore,
    masteryStageAfter,
  };
}

function isThemeId(value: unknown): value is TaskCardBorderTheme {
  return typeof value === 'string' && themeIdSet.has(value as TaskCardBorderTheme);
}

function sanitizeThemeIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isThemeId)));
}

function sanitizeNumberRecord(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0,
    ),
  );
}

export function parseRewardProgress(raw: string | null): RewardProgress {
  const fallback = createInitialRewardProgress();
  if (!raw) return fallback;

  try {
    const candidate = JSON.parse(raw) as Partial<RewardProgress>;
    const totalXp =
      typeof candidate.totalXp === 'number' && Number.isFinite(candidate.totalXp)
        ? Math.max(0, Math.round(candidate.totalXp))
        : fallback.totalXp;
    const equippedTheme = isThemeId(candidate.equippedTheme)
      ? candidate.equippedTheme
      : fallback.equippedTheme;
    const pinnedTheme = isThemeId(candidate.pinnedTheme)
      ? candidate.pinnedTheme
      : fallback.pinnedTheme;
    const candidateLoadout = candidate.loadout;
    const loadout = (
      ['preset', 'surface', 'border', 'back', 'completion', 'checkbox'] as const
    ).reduce(
      (next, part) => ({
        ...next,
        [part]: isThemeId(candidateLoadout?.[part])
          ? candidateLoadout[part]
          : fallback.loadout[part],
      }),
      {} as CosmeticLoadout,
    );

    return {
      ...fallback,
      ...candidate,
      version: 1,
      totalXp,
      level: getLevelFromXp(totalXp),
      streakDays:
        typeof candidate.streakDays === 'number'
          ? Math.max(0, Math.round(candidate.streakDays))
          : fallback.streakDays,
      weeklyCompletions:
        typeof candidate.weeklyCompletions === 'number'
          ? Math.max(0, Math.round(candidate.weeklyCompletions))
          : fallback.weeklyCompletions,
      completionEventIds: Array.isArray(candidate.completionEventIds)
        ? candidate.completionEventIds
            .filter((entry): entry is string => typeof entry === 'string')
            .slice(-500)
        : fallback.completionEventIds,
      earnedThemeIds: sanitizeThemeIds(candidate.earnedThemeIds),
      newThemeIds: sanitizeThemeIds(candidate.newThemeIds),
      favoriteThemeIds: sanitizeThemeIds(candidate.favoriteThemeIds),
      equippedTheme,
      pinnedTheme,
      themeMastery: sanitizeNumberRecord(candidate.themeMastery),
      themeFragments: sanitizeNumberRecord(candidate.themeFragments),
      loadout,
      rewardMotion: candidate.rewardMotion === 'reduced' ? 'reduced' : 'full',
      dailyXpByDate: sanitizeNumberRecord(candidate.dailyXpByDate),
      quickCompletionsByDate: sanitizeNumberRecord(candidate.quickCompletionsByDate),
      balancedBonusWeekKeys: Array.isArray(candidate.balancedBonusWeekKeys)
        ? candidate.balancedBonusWeekKeys.filter(
            (entry): entry is string => typeof entry === 'string',
          )
        : [],
    };
  } catch {
    return fallback;
  }
}

export function serializeRewardProgress(progress: RewardProgress) {
  return JSON.stringify(progress);
}

export function equipTheme(progress: RewardProgress, themeId: TaskCardBorderTheme) {
  if (!isThemeOwned(progress, themeId)) return progress;
  const loadout: CosmeticLoadout = {
    preset: themeId,
    surface: themeId,
    border: themeId,
    back: themeId,
    completion: themeId,
    checkbox: themeId,
  };
  return {
    ...progress,
    equippedTheme: themeId,
    loadout,
    newThemeIds: progress.newThemeIds.filter((entry) => entry !== themeId),
  };
}

export function setLoadoutPart(
  progress: RewardProgress,
  part: CosmeticPart,
  themeId: TaskCardBorderTheme,
) {
  if (!isThemeOwned(progress, themeId)) return progress;
  return {
    ...progress,
    equippedTheme: part === 'border' ? themeId : progress.equippedTheme,
    loadout: { ...progress.loadout, [part]: themeId },
  };
}

export function toggleFavoriteTheme(progress: RewardProgress, themeId: TaskCardBorderTheme) {
  const exists = progress.favoriteThemeIds.includes(themeId);
  return {
    ...progress,
    favoriteThemeIds: exists
      ? progress.favoriteThemeIds.filter((entry) => entry !== themeId)
      : [...progress.favoriteThemeIds, themeId],
  };
}

export function pinThemeGoal(progress: RewardProgress, themeId: TaskCardBorderTheme) {
  return { ...progress, pinnedTheme: themeId };
}

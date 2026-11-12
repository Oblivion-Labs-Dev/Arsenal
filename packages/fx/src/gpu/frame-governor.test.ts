import { describe, expect, it, vi } from 'vitest';
import { createFrameGovernor, type FrameGovernorOptions } from './frame-governor';

const LADDER = ['full', 'half', 'still'] as const;
type Tier = (typeof LADDER)[number];

/** Feeds `count` frames spaced `gapMs` apart and returns the tier after the last one. */
function run(
  governor: ReturnType<typeof createFrameGovernor<Tier>>,
  clock: { now: number },
  count: number,
  gapMs: number,
): Tier {
  let tier = governor.tier;
  for (let i = 0; i < count; i++) {
    clock.now += gapMs;
    tier = governor.frame(clock.now);
  }
  return tier;
}

const small: FrameGovernorOptions<Tier> = { warmup: 2, window: 8, spikes: 3, recoverWindows: 3 };

describe('createFrameGovernor', () => {
  it('stays on the best tier while frames fit the budget', () => {
    const g = createFrameGovernor(LADDER, small);
    expect(run(g, { now: 0 }, 200, 16.7)).toBe('full');
  });

  it('steps down one rung per sustained slow window, not on a single hitch', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 10, 16.7);
    clock.now += 120; // one long frame
    g.frame(clock.now);
    expect(run(g, clock, 20, 16.7)).toBe('full');
    expect(run(g, clock, 16, 45)).toBe('half');
    expect(run(g, clock, 16, 45)).toBe('still');
  });

  it('steps down early on a run of very long frames', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 3, 16.7); // warmup
    expect(run(g, clock, 3, 80)).toBe('half');
  });

  it('treats a long gap as a pause, not as slowness', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 10, 16.7);
    for (let i = 0; i < 5; i++) run(g, clock, 2, 5000);
    expect(g.tier).toBe('full');
  });

  it('reset() drops a half-measured window so stale gaps do not count', () => {
    const g = createFrameGovernor(LADDER, { ...small, spikes: 99 });
    const clock = { now: 0 };
    run(g, clock, 2, 16.7);
    run(g, clock, 7, 60); // one gap short of a slow window
    g.reset();
    expect(run(g, clock, 10, 16.7)).toBe('full');
  });

  it('climbs back only after several good windows', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 12, 45);
    expect(g.tier).toBe('half');
    // Two good windows are not enough with recoverWindows: 3.
    expect(run(g, clock, 2 + 8 * 2, 16.7)).toBe('half');
    expect(run(g, clock, 8, 16.7)).toBe('full');
  });

  it('does not climb on frames that only just fit the budget', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 12, 45);
    expect(run(g, clock, 200, 30)).toBe('half');
  });

  it('locks a tier out after it fails again right after a climb, so it cannot oscillate', () => {
    const g = createFrameGovernor(LADDER, small);
    const clock = { now: 0 };
    run(g, clock, 12, 45); // full -> half
    run(g, clock, 2 + 8 * 3, 16.7); // half -> full (probe)
    expect(g.tier).toBe('full');
    run(g, clock, 12, 45); // fails during the probe
    expect(g.tier).toBe('half');
    expect(g.ceiling).toBe('half');
    expect(run(g, clock, 400, 16.7)).toBe('half');
  });

  it('never climbs when recovery is disabled', () => {
    const g = createFrameGovernor(LADDER, { ...small, recoverWindows: 0 });
    const clock = { now: 0 };
    run(g, clock, 12, 45);
    expect(run(g, clock, 400, 8)).toBe('half');
  });

  it('pins the last rung under reduced motion and restores the tier after', () => {
    const g = createFrameGovernor(LADDER, { ...small, reducedMotion: true });
    const clock = { now: 0 };
    expect(g.tier).toBe('still');
    expect(run(g, clock, 50, 80)).toBe('still');
    g.setReducedMotion(false);
    expect(g.tier).toBe('full'); // slow frames while reduced were not measured
  });

  it('notifies listeners only on real changes', () => {
    const g = createFrameGovernor(LADDER, small);
    const listener = vi.fn();
    const off = g.subscribe(listener);
    const clock = { now: 0 };
    run(g, clock, 300, 16.7);
    g.setReducedMotion(false);
    expect(listener).not.toHaveBeenCalled();
    run(g, clock, 12, 45);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith('half');
    g.setReducedMotion(true);
    expect(listener).toHaveBeenLastCalledWith('still');
    off();
    g.setReducedMotion(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty ladder or an initial tier that is not on it', () => {
    expect(() => createFrameGovernor([])).toThrow(/empty/);
    expect(() => createFrameGovernor(LADDER, { initial: 'nope' as Tier })).toThrow(/ladder/);
  });

  it('starts from the given initial tier', () => {
    expect(createFrameGovernor(LADDER, { initial: 'half' }).tier).toBe('half');
  });
});

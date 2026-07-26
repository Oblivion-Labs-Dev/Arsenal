import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  new URL('./artisan-clay-new-quest-card.tsx', import.meta.url),
  'utf8',
);
const componentStyles = readFileSync(
  new URL('./artisan-clay-new-quest-card.module.css', import.meta.url),
  'utf8',
);
const prototypeSource = readFileSync(new URL('./task-card-prototype.tsx', import.meta.url), 'utf8');
const prototypeStyles = readFileSync(
  new URL('./task-card-prototype.module.css', import.meta.url),
  'utf8',
);

describe('ArtisanClayNewQuestCard', () => {
  it('builds the complete visual from semantic controls without a raster surface', () => {
    expect(componentSource).not.toContain('<img');
    expect(componentSource).not.toContain('artisan-clay-new-quest-reference.png');
    expect(componentStyles).not.toContain('url(');
    expect(componentSource).toContain('<h1>New Quest</h1>');
    expect(componentSource).toContain('placeholder="What needs to move forward?"');
    expect(prototypeSource).toContain('<ArtisanClayNewQuestCard');
  });

  it('provides all rarity, energy, priority, habit, and action controls', () => {
    expect(componentSource).toContain(
      "const rarityOptions = ['common', 'rare', 'epic', 'legendary']",
    );
    expect(componentSource).toContain("const energyOptions = ['low', 'medium', 'high']");
    expect(componentSource).toContain("const priorityOptions = ['low', 'medium', 'high']");
    expect(componentSource).toContain('role="switch"');
    expect(componentSource).toContain('<span>Create Task</span>');
  });

  it('uses layered clay, recessed controls, mineral gems, and active physical states', () => {
    expect(componentStyles).toContain('.tablet::before');
    expect(componentStyles).toContain('.tablet::after');
    expect(componentStyles).toContain('.gem::before');
    expect(componentStyles).toContain(".rarityTile[aria-pressed='true']");
    expect(componentStyles).toContain(".energyOrb[aria-pressed='true']");
    expect(componentStyles).toContain(".habitToggle[aria-checked='true']");
  });

  it('paces the form as a clear visual composition with only relevant stage controls', () => {
    expect(componentSource).toContain('className={styles.intention}');
    expect(componentSource).toContain('className={styles.momentum}');
    expect(componentSource).toContain('className={styles.rituals}');
    expect(componentStyles).toContain('grid-template-rows: 27.2% 18.3% 26% 14% 10.5%');
    expect(prototypeStyles).toContain(".stage[data-card-style='artisan-clay'] .statusSelector");
    expect(prototypeStyles).toContain('display: none');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  new URL('./artisan-clay-task-card.tsx', import.meta.url),
  'utf8',
);
const componentStyles = readFileSync(
  new URL('./artisan-clay-task-card.module.css', import.meta.url),
  'utf8',
);
const expandedStyles = readFileSync(
  new URL('./artisan-clay-expanded-task-card.module.css', import.meta.url),
  'utf8',
);
const prototypeSource = readFileSync(new URL('./task-card-prototype.tsx', import.meta.url), 'utf8');
const expandedSource = readFileSync(new URL('./expanded-task-card.tsx', import.meta.url), 'utf8');

describe('ArtisanClayTaskCard', () => {
  it('renders a complete interactive task card with the selected task state', () => {
    expect(componentSource).toContain('title={title}');
    expect(componentSource).toContain('data-rarity={rarity}');
    expect(componentSource).toContain('data-energy={energy}');
    expect(componentSource).toContain('type="checkbox"');
    expect(componentSource).toContain('Active quest');
  });

  it('uses exactly three ceramic energy orbs and lifts the selected orb', () => {
    expect(componentSource).toContain('[1, 2, 3].map');
    expect(componentSource).toContain("level === 'medium' ? 2 : 3");
    expect(componentSource).toContain('data-active={orb === activeOrb');
    expect(componentStyles).toContain(".card[data-energy='medium'] .energyFill");
    expect(componentStyles).toContain(".energyOrbs i[data-active='true']");
  });

  it('preserves the mineral rarity palette on a charcoal ceramic base', () => {
    expect(componentStyles).toContain(".card[data-rarity='common']");
    expect(componentStyles).toContain(".card[data-rarity='rare']");
    expect(componentStyles).toContain(".card[data-rarity='epic']");
    expect(componentStyles).toContain(".card[data-rarity='legendary']");
    expect(componentStyles).toContain('--artisan-base: #29272a');
    expect(componentStyles).toContain('radial-gradient(');
  });

  it('is available from both the prototype selector and expanded card faces', () => {
    expect(prototypeSource).toContain("value: 'artisan-clay'");
    expect(prototypeSource).toContain('<ArtisanClayNewQuestCard');
    expect(expandedSource).toContain("cardStyle === 'artisan-clay'");
    expect(expandedSource).toContain('artisanClayExpandedStyles.artisanClayBack');
    expect(expandedStyles).toContain("data-card-style='artisan-clay'");
  });
});

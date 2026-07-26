import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getExpandedCardRect } from './expanded-task-card-geometry';

const componentSource = readFileSync(new URL('./expanded-task-card.tsx', import.meta.url), 'utf8');
const prototypeSource = readFileSync(new URL('./task-card-prototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('./expanded-task-card.module.css', import.meta.url), 'utf8');
const claySource = readFileSync(new URL('./clay-task-card.tsx', import.meta.url), 'utf8');
const clayStyles = readFileSync(new URL('./clay-task-card.module.css', import.meta.url), 'utf8');

describe('expanded task card geometry', () => {
  it('centers the desktop card within the enlarged 660 by 880 maximum', () => {
    expect(getExpandedCardRect(1440, 1000)).toEqual({
      top: 60,
      left: 390,
      width: 660,
      height: 880,
    });
  });

  it('keeps a 16px safe margin on mobile', () => {
    expect(getExpandedCardRect(390, 844)).toEqual({
      top: 16,
      left: 16,
      width: 358,
      height: 812,
    });
  });

  it('uses one portal shell with two physical faces and an unmirrored back', () => {
    expect(componentSource).toContain('data-testid="expanded-task-card"');
    expect(componentSource).toContain('createPortal(');
    expect(styles).toContain('backface-visibility: hidden');
    expect(styles).toContain('transform: rotateY(180deg)');
    expect(styles).not.toContain('scaleX(-1)');
  });

  it('carries the selected border theme onto the expanded detail face', () => {
    expect(componentSource).toContain('data-border-theme={backTheme ?? borderTheme}');
    expect(componentSource).toContain('surfaceTheme={surfaceTheme}');
    expect(componentSource).toContain('completionTheme={completionTheme}');
    expect(componentSource).toContain('checkboxTheme={checkboxTheme}');
    expect(componentSource).toContain('className={styles.backThemeFrame}');
    expect(styles).toContain(".backFace[data-border-theme='arcane']");
    expect(styles).toContain(".backFace[data-border-theme='holographic']");
    expect(styles).toContain(".backFace[data-border-theme='ember']");
    expect(styles).toContain(".backFace[data-border-theme='blueprint']");
  });

  it('keeps the selected rarity premium on both expanded faces', () => {
    expect(componentSource).toContain('data-rarity={rarity}');
    expect(styles).toContain(".transformCard[data-rarity='common'] .backFace");
    expect(styles).toContain(".transformCard[data-rarity='rare'] .backFace");
    expect(styles).toContain(".transformCard[data-rarity='epic'] .backFace");
    expect(styles).toContain(".transformCard[data-rarity='legendary'] .backFace");
    expect(styles).toContain('expanded-rarity-foil-pass');
  });

  it('preserves the source grid footprint with a fixed card cell and ghost state', () => {
    expect(styles).toContain('.cardCell');
    expect(styles).toContain('aspect-ratio: 7 / 10');
    expect(styles).toContain(".cardSource[data-expanded='true']::after");
    expect(prototypeSource).toContain(
      "aria-expanded={cardStyle === 'artisan-clay' ? undefined : isExpanded}",
    );
  });

  it('locks background scrolling and keeps only the center detail region scrollable', () => {
    expect(componentSource).toContain("document.body.style.overflow = 'hidden'");
    expect(styles).toContain('.backScroller');
    expect(styles).toContain('overflow-y: auto');
    expect(styles).toContain('overscroll-behavior: contain');
  });

  it('supports the reverse close paths and reduced-motion crossfade', () => {
    expect(componentSource).toContain("event.key === 'Escape'");
    expect(componentSource).toContain('onClick={requestClose}');
    expect(styles).toContain("[data-reduced-motion='true']");
    expect(styles).toContain('transition: opacity 120ms ease');
  });

  it('keeps checkbox and action clicks separate from card open and close actions', () => {
    expect(prototypeSource).toContain('isInteractiveCardTarget(event.target)');
    expect(prototypeSource).toContain(
      "onClick={cardStyle === 'artisan-clay' ? undefined : handleSourceClick}",
    );
    expect(componentSource).not.toMatch(
      /className=\{styles\.transformCard\}[\s\S]{0,100}onClick=\{requestClose\}/,
    );
  });

  it('switches between the precision and generated clay card faces', () => {
    expect(prototypeSource).toContain('options={cardStyleOptions}');
    expect(prototypeSource).toContain("cardStyle === 'clay'");
    expect(componentSource).toContain('cardStyle: TaskCardVisualStyle');
    expect(claySource).toContain("className={cn('clay-task-card'");
    expect(clayStyles).toContain("url('/task-card-prototype/clay-card-face-premium.png')");
    expect(clayStyles).toContain(".card[data-rarity='rare']");
  });
});

import type { Finding } from "../types.js";

export interface DomRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface DeterministicVisualSnapshot {
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  elements: Array<{
    selector: string;
    tag: string;
    role?: string;
    text?: string;
    rect: DomRectLike;
    visible: boolean;
    focusable: boolean;
    hasFocusIndicator: boolean;
    zIndex: number;
    id?: string;
    isInteractive: boolean;
    clientWidth: number;
    clientHeight: number;
  }>;
  imageStatuses: Array<{ selector: string; naturalWidth: number; complete: boolean }>;
  layoutShiftScore?: number;
}

function overlaps(a: DomRectLike, b: DomRectLike): boolean {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

/**
 * Deterministic browser-side visual checks — run before AI critic.
 */
export function runDeterministicVisualChecks(
  snapshot: DeterministicVisualSnapshot,
  scopeLabel: string,
): Finding[] {
  const findings: Finding[] = [];
  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  if (snapshot.scrollWidth > snapshot.viewportWidth + 1) {
    findings.push({
      id: nextId("overflow-x"),
      category: "visual",
      severity: "critical",
      confidence: 1,
      selector: "document",
      explanation: `Horizontal page overflow detected (${snapshot.scrollWidth}px > ${snapshot.viewportWidth}px) in ${scopeLabel}`,
      recommendedFix: "Remove overflow-causing widths/margins; constrain changed surface to viewport",
      source: "deterministic",
    });
  }

  const ids = new Map<string, string>();
  for (const el of snapshot.elements) {
    if (
      el.rect.right < 0 ||
      el.rect.bottom < 0 ||
      el.rect.left > snapshot.viewportWidth ||
      el.rect.top > snapshot.viewportHeight
    ) {
      if (el.isInteractive) {
        findings.push({
          id: nextId("outside-viewport"),
          category: "visual",
          severity: "high",
          confidence: 0.95,
          selector: el.selector,
          explanation: `Interactive element ${el.selector} is outside viewport bounds`,
          recommendedFix: "Reposition element within visible layout",
          source: "deterministic",
        });
      }
    }

    if (el.isInteractive && (el.clientWidth === 0 || el.clientHeight === 0)) {
      findings.push({
        id: nextId("zero-size"),
        category: "visual",
        severity: "critical",
        confidence: 1,
        selector: el.selector,
        explanation: `Zero-size interactive element: ${el.selector}`,
        recommendedFix: "Ensure interactive controls have non-zero dimensions",
        source: "deterministic",
      });
    }

    if (el.isInteractive && (el.clientWidth < 24 || el.clientHeight < 24)) {
      findings.push({
        id: nextId("target-size"),
        category: "accessibility",
        severity: "high",
        confidence: 0.9,
        selector: el.selector,
        explanation: `Interactive target below minimum size (${el.clientWidth}x${el.clientHeight})`,
        recommendedFix: "Increase hit target to at least 24x24 (prefer 44x44)",
        source: "deterministic",
      });
    }

    if (el.focusable && !el.visible) {
      findings.push({
        id: nextId("invisible-focusable"),
        category: "accessibility",
        severity: "high",
        confidence: 0.95,
        selector: el.selector,
        explanation: `Invisible but focusable control: ${el.selector}`,
        recommendedFix: "Remove from tab order or make visible when focusable",
        source: "deterministic",
      });
    }

    if (el.focusable && el.visible && !el.hasFocusIndicator) {
      findings.push({
        id: nextId("focus-indicator"),
        category: "accessibility",
        severity: "high",
        confidence: 0.85,
        selector: el.selector,
        explanation: `Missing focus indicator on ${el.selector}`,
        recommendedFix: "Add visible :focus-visible outline/ring",
        source: "deterministic",
      });
    }

    if (el.id) {
      if (ids.has(el.id)) {
        findings.push({
          id: nextId("dup-id"),
          category: "accessibility",
          severity: "medium",
          confidence: 1,
          selector: el.selector,
          explanation: `Duplicate ID "${el.id}"`,
          recommendedFix: "Make element IDs unique",
          source: "deterministic",
        });
      }
      ids.set(el.id, el.selector);
    }

    if (el.zIndex > 10000) {
      findings.push({
        id: nextId("z-index"),
        category: "visual",
        severity: "medium",
        confidence: 0.8,
        selector: el.selector,
        explanation: `Excessively high z-index (${el.zIndex}) on ${el.selector}`,
        recommendedFix: "Use design-system z-index scale",
        source: "deterministic",
      });
    }

    // Text clipping heuristic
    if (el.text && el.clientHeight > 0 && el.clientHeight < 8 && el.text.trim().length > 0) {
      findings.push({
        id: nextId("text-clip"),
        category: "visual",
        severity: "high",
        confidence: 0.85,
        selector: el.selector,
        explanation: `Possible text clipping on ${el.selector}`,
        recommendedFix: "Allow text container to grow or reduce font/padding",
        source: "deterministic",
      });
    }
  }

  // Overlapping interactive siblings
  for (let i = 0; i < snapshot.elements.length; i++) {
    for (let j = i + 1; j < snapshot.elements.length; j++) {
      const a = snapshot.elements[i];
      const b = snapshot.elements[j];
      if (!a || !b) continue;
      if (!a.isInteractive || !b.isInteractive) continue;
      if (!a.visible || !b.visible) continue;
      if (overlaps(a.rect, b.rect)) {
        findings.push({
          id: nextId("overlap"),
          category: "visual",
          severity: "critical",
          confidence: 0.9,
          selector: `${a.selector} ∩ ${b.selector}`,
          explanation: `Overlapping interactive siblings: ${a.selector} and ${b.selector}`,
          recommendedFix: "Adjust layout so interactive elements do not overlap",
          source: "deterministic",
        });
      }
    }
  }

  for (const img of snapshot.imageStatuses) {
    if (img.complete && img.naturalWidth === 0) {
      findings.push({
        id: nextId("broken-img"),
        category: "visual",
        severity: "high",
        confidence: 1,
        selector: img.selector,
        explanation: `Broken image asset: ${img.selector}`,
        recommendedFix: "Fix image src or provide fallback",
        source: "deterministic",
      });
    }
  }

  if ((snapshot.layoutShiftScore ?? 0) > 0.1) {
    findings.push({
      id: nextId("cls"),
      category: "visual",
      severity: "medium",
      confidence: 0.9,
      explanation: `Unexpected layout shift score ${snapshot.layoutShiftScore}`,
      recommendedFix: "Reserve space for dynamic content in changed surface",
      source: "deterministic",
    });
  }

  return findings;
}

/** Script injectable into a page to collect deterministic snapshot for scoped selectors. */
export const DETERMINISTIC_SNAPSHOT_SCRIPT = `
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nodes = Array.from(document.querySelectorAll('a,button,input,select,textarea,[role="button"],[data-testid],img,h1,h2,p'));
  const elements = nodes.slice(0, 200).map((el, index) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const focusable = el.tabIndex >= 0 || ['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName);
    return {
      selector: el.getAttribute('data-testid') ? '[data-testid="' + el.getAttribute('data-testid') + '"]' : el.tagName.toLowerCase() + ':nth-of-type(' + (index + 1) + ')',
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || undefined,
      text: (el.textContent || '').slice(0, 80),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
      visible: style.visibility !== 'hidden' && style.display !== 'none' && rect.width + rect.height > 0,
      focusable,
      hasFocusIndicator: style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
      zIndex: Number(style.zIndex) || 0,
      id: el.id || undefined,
      isInteractive: focusable || el.tagName === 'BUTTON' || el.tagName === 'A',
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight,
    };
  });
  const imageStatuses = Array.from(document.images).slice(0, 50).map((img, index) => ({
    selector: 'img:nth-of-type(' + (index + 1) + ')',
    naturalWidth: img.naturalWidth,
    complete: img.complete,
  }));
  return {
    viewportWidth: vw,
    viewportHeight: vh,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    elements,
    imageStatuses,
  };
})()
`;

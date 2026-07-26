'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import styles from './task-card-prototype.module.css';

export interface PrototypeSelectOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly description: string;
  readonly accent: string;
}

interface PrototypeSelectProps<Value extends string> {
  readonly label: string;
  readonly ariaLabel: string;
  readonly value: Value;
  readonly options: readonly [PrototypeSelectOption<Value>, ...PrototypeSelectOption<Value>[]];
  readonly onChange: (value: Value) => void;
  readonly className?: string;
}

type AccentStyle = CSSProperties & {
  '--prototype-select-accent': string;
};

function getAccentStyle(accent: string): AccentStyle {
  return { '--prototype-select-accent': accent };
}

export function PrototypeSelect<Value extends string>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: PrototypeSelectProps<Value>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const menuId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, selectedIndex]);

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const selectOption = (option: PrototypeSelectOption<Value>) => {
    onChange(option.value);
    closeMenu(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    option: PrototypeSelectOption<Value>,
    optionIndex: number,
  ) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (optionIndex + direction + options.length) % options.length;
      optionRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      optionRefs.current[event.key === 'Home' ? 0 : options.length - 1]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(option);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.cardThemeSelector} ${className ?? ''}`}
      data-open={isOpen ? 'true' : 'false'}
      style={getAccentStyle(selectedOption.accent)}
    >
      <span id={labelId} className={styles.cardThemeLabel}>
        {label}
      </span>
      <button
        ref={triggerRef}
        className={styles.cardThemeSelect}
        type="button"
        aria-label={`${ariaLabel}: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.selectValueMarker} aria-hidden="true" />
        <span className={styles.selectValue}>{selectedOption.label}</span>
        <svg className={styles.cardThemeChevron} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen ? (
        <div id={menuId} className={styles.selectMenu} role="listbox" aria-labelledby={labelId}>
          <div className={styles.selectMenuHeading}>Choose {label.toLowerCase()}</div>
          <div className={styles.selectOptionList}>
            {options.map((option, optionIndex) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[optionIndex] = element;
                  }}
                  className={styles.selectOption}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? 'true' : 'false'}
                  style={getAccentStyle(option.accent)}
                  onClick={() => selectOption(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, option, optionIndex)}
                >
                  <span className={styles.selectOptionMarker} aria-hidden="true">
                    <span />
                  </span>
                  <span className={styles.selectOptionCopy}>
                    <span className={styles.selectOptionLabel}>{option.label}</span>
                    <span className={styles.selectOptionDescription}>{option.description}</span>
                  </span>
                  <span className={styles.selectOptionCheck} aria-hidden="true">
                    <svg viewBox="0 0 16 16" fill="none">
                      <path
                        d="m3.5 8.1 2.8 2.8 6.2-6.1"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

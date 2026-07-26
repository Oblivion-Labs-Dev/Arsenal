'use client';

import {
  PrecisionTaskCard,
  rarityColors,
  type TaskCardBorderTheme,
  type TaskCardColorScheme,
  type TaskCardStatus,
  type TaskEnergy,
  type TaskRarity,
} from '@arsenal/ui';
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ArtisanClayTaskCard } from './artisan-clay-task-card';
import { getExpandedCardRect, type CardRect } from './expanded-task-card-geometry';
import { ClayTaskCard, type TaskCardVisualStyle } from './clay-task-card';
import artisanClayExpandedStyles from './artisan-clay-expanded-task-card.module.css';
import styles from './expanded-task-card.module.css';
import clayExpandedStyles from './clay-expanded-task-card.module.css';

export type CardExpansionPhase = 'closed' | 'opening' | 'open' | 'closing' | 'switching';
export type { CardRect } from './expanded-task-card-geometry';

export interface ExpandedCardState {
  selectedTaskId: string | null;
  phase: CardExpansionPhase;
  sourceRect: CardRect | null;
}

export interface ExpandedTaskDetails {
  id: string;
  title: string;
  description: string;
  schedule: string;
  durationMinutes: number;
  notes?: string;
  recurrence?: string;
}

interface ExpandedTaskCardProps {
  state: ExpandedCardState;
  task: ExpandedTaskDetails;
  status: TaskCardStatus;
  energy: TaskEnergy;
  rarity: TaskRarity;
  cardStyle: TaskCardVisualStyle;
  colorScheme: TaskCardColorScheme;
  borderTheme: TaskCardBorderTheme;
  surfaceTheme?: TaskCardBorderTheme;
  backTheme?: TaskCardBorderTheme;
  completionTheme?: TaskCardBorderTheme;
  checkboxTheme?: TaskCardBorderTheme;
  onPhaseChange: (phase: CardExpansionPhase) => void;
  onBeginClose: () => void;
  onClosed: () => void;
  onCompletedChange: (completed: boolean) => void;
  onTaskChange: (task: ExpandedTaskDetails) => void;
}

interface ExpansionShellStyle extends CSSProperties {
  '--expanded-accent': string;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return String(minutes) + ' min';

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0
    ? String(hours) + ' hr'
    : String(hours) + ' hr ' + String(remainder) + ' min';
}

function useViewportSize() {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

export function ExpandedTaskCard({
  state,
  task,
  status,
  energy,
  rarity,
  cardStyle,
  colorScheme,
  borderTheme,
  surfaceTheme,
  backTheme,
  completionTheme,
  checkboxTheme,
  onPhaseChange,
  onBeginClose,
  onClosed,
  onCompletedChange,
  onTaskChange,
}: ExpandedTaskCardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewport = useViewportSize();
  const reducedMotion = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [draft, setDraft] = useState(task);
  const sourceRect = state.sourceRect;
  const expandedRect = getExpandedCardRect(viewport.width, viewport.height);
  const settled = state.phase === 'open';
  const closing = state.phase === 'closing';
  const dirty =
    draft.title !== task.title ||
    draft.description !== task.description ||
    draft.schedule !== task.schedule ||
    draft.notes !== task.notes;

  useEffect(() => {
    if (!editing) setDraft(task);
  }, [editing, task]);

  useEffect(() => {
    if (state.phase !== 'opening') return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => onPhaseChange('open'));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [onPhaseChange, state.phase]);

  useEffect(() => {
    if (!settled) return;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [settled]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(onClosed, reducedMotion ? 220 : 560);
    return () => window.clearTimeout(timer);
  }, [closing, onClosed, reducedMotion]);

  const requestClose = useCallback(() => {
    if (closing) return;

    if (editing && dirty) {
      setConfirmingClose(true);
      return;
    }

    onBeginClose();
  }, [closing, dirty, editing, onBeginClose]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  if (!sourceRect || state.selectedTaskId !== task.id) return null;

  const currentRect = settled ? expandedRect : sourceRect;
  const shellStyle: ExpansionShellStyle = {
    top: currentRect.top,
    left: currentRect.left,
    width: currentRect.width,
    height: currentRect.height,
    '--expanded-accent': rarityColors[rarity],
  };

  const saveDraft = () => {
    onTaskChange(draft);
    setEditing(false);
    setActionMessage('Changes saved');
  };

  const cancelEdit = () => {
    setDraft(task);
    setEditing(false);
    setConfirmingClose(false);
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && event.target === event.currentTarget && !settled) {
      event.preventDefault();
    }
  };

  return createPortal(
    <div
      className={styles.portal}
      data-phase={state.phase}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-testid="expanded-task-card"
    >
      <div className={styles.backdrop} aria-hidden="true" onPointerDown={requestClose} />

      <div
        className={styles.transformCard}
        data-phase={state.phase}
        data-rarity={rarity}
        data-card-style={cardStyle}
        style={shellStyle}
      >
        <div
          className={styles.dialog}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={task.id + '-expanded-heading'}
          onKeyDown={handleDialogKeyDown}
        >
          <div className={styles.inner}>
            <div
              className={styles.frontFace}
              aria-hidden={settled ? 'true' : 'false'}
              inert={settled ? true : undefined}
            >
              {cardStyle === 'artisan-clay' ? (
                <ArtisanClayTaskCard
                  id={task.id + '-expanded'}
                  title={task.title}
                  completed={status === 'done'}
                  active={status !== 'inactive'}
                  overdue={status === 'past-due'}
                  energy={energy}
                  rarity={rarity}
                  colorScheme={colorScheme}
                  onCompletedChange={onCompletedChange}
                  className={styles.expandedFrontCard}
                  fillContainer
                />
              ) : cardStyle === 'clay' ? (
                <ClayTaskCard
                  id={task.id + '-expanded'}
                  title={task.title}
                  completed={status === 'done'}
                  active={status !== 'inactive'}
                  overdue={status === 'past-due'}
                  energy={energy}
                  rarity={rarity}
                  colorScheme={colorScheme}
                  onCompletedChange={onCompletedChange}
                  className={styles.expandedFrontCard}
                  fillContainer
                />
              ) : (
                <PrecisionTaskCard
                  id={task.id + '-expanded'}
                  title={task.title}
                  completed={status === 'done'}
                  active={status !== 'inactive'}
                  overdue={status === 'past-due'}
                  energy={energy}
                  rarity={rarity}
                  colorScheme={colorScheme}
                  borderTheme={borderTheme}
                  surfaceTheme={surfaceTheme}
                  completionTheme={completionTheme}
                  checkboxTheme={checkboxTheme}
                  onCompletedChange={onCompletedChange}
                  className={styles.expandedFrontCard}
                />
              )}
            </div>

            <article
              className={`${styles.backFace} ${
                cardStyle === 'artisan-clay'
                  ? artisanClayExpandedStyles.artisanClayBack
                  : cardStyle === 'clay'
                    ? clayExpandedStyles.clayBack
                    : ''
              }`}
              data-color-scheme={colorScheme}
              data-border-theme={backTheme ?? borderTheme}
              data-completed={status === 'done' ? 'true' : 'false'}
              data-card-style={cardStyle}
              aria-hidden={settled ? 'false' : 'true'}
              inert={!settled ? true : undefined}
            >
              <span className={styles.backGlow} aria-hidden="true" />
              <span className={styles.backThemeFrame} aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <i key={index} />
                ))}
              </span>
              <span className={styles.backLiquid} aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} />
                ))}
              </span>

              <header className={styles.backHeader}>
                <div className={styles.identitySignals}>
                  <span className={styles.raritySignal}>
                    <i aria-hidden="true" />
                    {rarity}
                  </span>
                  {task.recurrence ? (
                    <span className={styles.recurrenceSignal}>{task.recurrence}</span>
                  ) : null}
                </div>

                <label className={styles.backCheckbox}>
                  <input
                    type="checkbox"
                    checked={status === 'done'}
                    onChange={(event) => onCompletedChange(event.currentTarget.checked)}
                    disabled={closing}
                  />
                  <span aria-hidden="true" />
                  <b>{status === 'done' ? 'Done' : 'Complete'}</b>
                </label>

                <button
                  className={styles.closeButton}
                  ref={closeButtonRef}
                  type="button"
                  onClick={requestClose}
                  disabled={closing}
                  aria-label="Close task details"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m6 6 12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </header>

              <div className={styles.backScroller}>
                <section className={styles.backIdentity}>
                  {editing ? (
                    <>
                      <label>
                        <span>Task title</span>
                        <input
                          value={draft.title}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        <span>Description</span>
                        <textarea
                          value={draft.description}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p className={styles.backEyebrow}>Task details</p>
                      <h2 id={task.id + '-expanded-heading'} tabIndex={-1}>
                        {task.title}
                      </h2>
                      <p>{task.description}</p>
                    </>
                  )}
                </section>

                <section className={styles.detailGrid} aria-label="Task information">
                  <div>
                    <span>Schedule</span>
                    {editing ? (
                      <input
                        value={draft.schedule}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, schedule: event.target.value }))
                        }
                      />
                    ) : (
                      <strong>{task.schedule}</strong>
                    )}
                  </div>
                  <div>
                    <span>Energy</span>
                    <strong>{energy}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{formatDuration(task.durationMinutes)}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{status.replace('-', ' ')}</strong>
                  </div>
                </section>

                {(task.notes || editing) && (
                  <section className={styles.notesSection}>
                    <span>Notes</span>
                    {editing ? (
                      <textarea
                        value={draft.notes ?? ''}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, notes: event.target.value }))
                        }
                      />
                    ) : (
                      <p>{task.notes}</p>
                    )}
                  </section>
                )}

                {actionMessage ? (
                  <p className={styles.actionMessage} role="status">
                    {actionMessage}
                  </p>
                ) : null}
              </div>

              <footer className={styles.backFooter}>
                {status === 'done' ? (
                  <button type="button" onClick={() => onCompletedChange(false)} disabled={closing}>
                    Undo
                  </button>
                ) : (
                  <button
                    className={styles.primaryAction}
                    type="button"
                    onClick={() => setActionMessage('Focus session started')}
                    disabled={closing || editing}
                  >
                    Start focus
                  </button>
                )}

                {editing ? (
                  <>
                    <button type="button" onClick={cancelEdit} disabled={closing}>
                      Cancel
                    </button>
                    <button
                      className={styles.primaryAction}
                      type="button"
                      onClick={saveDraft}
                      disabled={closing || draft.title.trim().length === 0}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setEditing(true)} disabled={closing}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setActionMessage('Update the schedule, then save');
                      }}
                      disabled={closing}
                    >
                      Reschedule
                    </button>
                  </>
                )}
              </footer>

              {confirmingClose ? (
                <div className={styles.discardPrompt} role="alertdialog" aria-modal="true">
                  <p>Discard unsaved changes?</p>
                  <div>
                    <button type="button" onClick={() => setConfirmingClose(false)}>
                      Keep editing
                    </button>
                    <button
                      className={styles.dangerAction}
                      type="button"
                      onClick={() => {
                        setConfirmingClose(false);
                        onBeginClose();
                      }}
                    >
                      Discard & close
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

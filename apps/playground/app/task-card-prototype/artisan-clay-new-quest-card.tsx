'use client';

import { type FormEvent, useState } from 'react';

import styles from './artisan-clay-new-quest-card.module.css';

const rarityOptions = ['common', 'rare', 'epic', 'legendary'] as const;
const energyOptions = ['low', 'medium', 'high'] as const;
const priorityOptions = ['low', 'medium', 'high'] as const;

type Rarity = (typeof rarityOptions)[number];
type Energy = (typeof energyOptions)[number];
type Priority = (typeof priorityOptions)[number];

function Compass() {
  return (
    <span className={styles.compass} aria-hidden="true">
      <span className={styles.compassRing} />
      <span className={styles.compassNeedle} />
      <span className={styles.compassGem} />
    </span>
  );
}

function CalendarIcon({ detailed = false }: { detailed?: boolean }) {
  return (
    <svg className={styles.calendarIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
      {detailed ? <path d="M8 12h2M14 12h2M8 16h2M14 16h2" /> : null}
    </svg>
  );
}

function HabitIcon() {
  return (
    <svg className={styles.habitIcon} viewBox="0 0 56 56" aria-hidden="true">
      <path d="M45 21A19 19 0 0 0 12 14" />
      <path d="m11 7 1 8 8-1" />
      <path d="M11 35a19 19 0 0 0 33 7" />
      <path d="m45 49-1-8-8 1" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg className={styles.slidersIcon} viewBox="0 0 30 24" aria-hidden="true">
      <path d="M2 5h26M2 12h26M2 19h26" />
      <circle cx="10" cy="5" r="2.5" />
      <circle cx="20" cy="12" r="2.5" />
      <circle cx="8" cy="19" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12 4 4 8-9" />
    </svg>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <div className={styles.sectionHeading}>
      <span />
      <b aria-hidden="true" />
      <h2>{children}</h2>
      <b aria-hidden="true" />
      <span />
    </div>
  );
}

export function ArtisanClayNewQuestCard() {
  const [title, setTitle] = useState('');
  const [rarity, setRarity] = useState<Rarity>('legendary');
  const [energy, setEnergy] = useState<Energy>('medium');
  const [priority, setPriority] = useState<Priority>('medium');
  const [habit, setHabit] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const resetForm = () => {
    setTitle('');
    setRarity('legendary');
    setEnergy('medium');
    setPriority('medium');
    setHabit(true);
    setAdvancedOpen(false);
    setStatusMessage('Quest form reset');
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(`${rarity} quest created with ${energy} energy and ${priority} priority`);
  };

  return (
    <form
      className={styles.card}
      aria-label="New Quest artisan clay task form"
      data-card-interactive
      onSubmit={createTask}
    >
      <div className={styles.tablet} aria-hidden="true" />

      <div className={styles.surface}>
        <div className={styles.intention}>
          <header className={styles.header}>
            <Compass />
            <div className={styles.titleBlock}>
              <h1>New Quest</h1>
              <p>What needs to be done?</p>
              <span>Shape the next step.</span>
            </div>
          </header>

          <input
            className={styles.taskInput}
            value={title}
            aria-label="What needs to move forward?"
            placeholder="What needs to move forward?"
            onChange={(event) => setTitle(event.currentTarget.value)}
          />

          <div className={styles.dateRow}>
            <button type="button">
              <CalendarIcon />
              <span>Today</span>
            </button>
            <i aria-hidden="true" />
            <button type="button">
              <span>Jul 25, 2026</span>
              <CalendarIcon detailed />
            </button>
          </div>
        </div>

        <section className={styles.raritySection} aria-labelledby="artisan-rarity-heading">
          <SectionHeading>Rarity</SectionHeading>
          <span className={styles.srOnly} id="artisan-rarity-heading">
            Choose rarity
          </span>
          <div className={styles.rarityGrid}>
            {rarityOptions.map((option) => (
              <button
                className={styles.rarityTile}
                data-rarity={option}
                key={option}
                type="button"
                aria-label={`${option} rarity`}
                aria-pressed={rarity === option}
                onClick={() => setRarity(option)}
              >
                <span className={styles.rarityLabel}>{option}</span>
                <span className={styles.gem} aria-hidden="true">
                  <i />
                </span>
                {rarity === option ? (
                  <span className={styles.checkSeal}>
                    <CheckIcon />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <div className={styles.momentum}>
          <fieldset className={styles.energyPanel} data-energy={energy}>
            <legend className={styles.srOnly}>Energy</legend>
            <SectionHeading>Energy</SectionHeading>
            <div className={styles.energyChannel}>
              <span className={styles.energyFill} aria-hidden="true" />
              <div className={styles.energyButtons}>
                {energyOptions.map((option) => (
                  <button
                    className={styles.energyOrb}
                    key={option}
                    type="button"
                    aria-label={`${option} energy`}
                    aria-pressed={energy === option}
                    onClick={() => setEnergy(option)}
                  >
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.energyLabels} aria-hidden="true">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </fieldset>

          <section className={styles.prioritySection} aria-labelledby="artisan-priority-heading">
            <SectionHeading>Priority</SectionHeading>
            <span className={styles.srOnly} id="artisan-priority-heading">
              Choose priority
            </span>
            <div className={styles.prioritySegments}>
              {priorityOptions.map((option) => (
                <button
                  data-direction={option}
                  key={option}
                  type="button"
                  aria-label={`${option} priority`}
                  aria-pressed={priority === option}
                  onClick={() => setPriority(option)}
                >
                  <span>{option}</span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.rituals}>
          <div className={styles.habitRow}>
            <HabitIcon />
            <div>
              <strong>Track as habit</strong>
              <span>Build consistency over time.</span>
            </div>
            <button
              className={styles.habitToggle}
              type="button"
              role="switch"
              aria-label="Track as habit"
              aria-checked={habit}
              onClick={() => setHabit((current) => !current)}
            >
              <span />
            </button>
          </div>

          <button
            className={styles.advanced}
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            <SlidersIcon />
            <span>Advanced settings</span>
            <i aria-hidden="true" />
          </button>
        </div>

        <footer className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={resetForm}>
            Cancel
          </button>
          <button className={styles.createButton} type="submit">
            <span>Create Task</span>
            <Compass />
          </button>
        </footer>
      </div>

      <span className={styles.srOnly} aria-live="polite">
        {statusMessage}
      </span>
    </form>
  );
}

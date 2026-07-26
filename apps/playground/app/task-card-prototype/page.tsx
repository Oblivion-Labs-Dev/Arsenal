import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { TaskCardPrototype } from './task-card-prototype';
import styles from './task-card-prototype.module.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--precision-card-serif',
});

export const metadata: Metadata = {
  title: 'Precision Task Card Prototype - Arsenal UI',
  description: 'An isolated production preview of the reusable Arsenal precision task card.',
};

export default function TaskCardPrototypePage() {
  return (
    <main className={`${styles.preview} ${instrumentSerif.variable}`}>
      <TaskCardPrototype />
    </main>
  );
}

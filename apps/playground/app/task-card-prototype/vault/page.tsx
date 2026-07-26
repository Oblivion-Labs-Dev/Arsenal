import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { ThemeVault } from './theme-vault';
import styles from './theme-vault.module.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--precision-card-serif',
});

export const metadata: Metadata = {
  title: 'Card Collection Vault - Arsenal',
  description: 'Collect, preview, and equip cosmetic task-card rewards.',
};

export default function ThemeVaultPage() {
  return (
    <main className={`${styles.page} ${instrumentSerif.variable}`}>
      <ThemeVault />
    </main>
  );
}

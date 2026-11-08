/** Accessible inspection panel presentation. */
export const INSPECT_STYLE = `
.cf-inspect[hidden] { display: none !important; }
.cf-inspect { position: absolute; z-index: 40; inset: auto 12px 12px auto; max-width: min(360px, calc(100% - 24px)); padding: 16px; border: 1px solid var(--cf-line); border-radius: 14px; background: var(--cf-surface); color: var(--cf-ink); box-shadow: var(--cf-shadow); }
.cf-inspect h2 { margin: 0 28px 12px 0; font-size: 16px; }
.cf-inspect dl { display: grid; grid-template-columns: 82px 1fr; gap: 6px 10px; margin: 0; font-size: 13px; }
.cf-inspect dt { font-weight: 700; }
.cf-inspect dd { margin: 0; color: var(--cf-ink-soft); overflow-wrap: anywhere; }
.cf-inspect-close { position: absolute; top: 8px; right: 8px; }
.cf-illustrative { padding: 2px 7px; border-radius: 999px; background: var(--cf-surface-2); color: var(--cf-ink-soft); font-size: 11px; font-weight: 700; }
`;

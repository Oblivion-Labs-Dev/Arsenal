export interface DiffLine {
  readonly type: 'context' | 'addition' | 'deletion';
  readonly content: string;
  readonly oldLineNumber?: number;
  readonly newLineNumber?: number;
}

export interface DiffHunk {
  readonly header: string;
  readonly oldStart: number;
  readonly oldLines: number;
  readonly newStart: number;
  readonly newLines: number;
  readonly lines: readonly DiffLine[];
}

export interface FileDiff {
  readonly file: string;
  readonly oldPath?: string;
  readonly newPath?: string;
  readonly status: 'modified' | 'added' | 'deleted';
  readonly additions: number;
  readonly deletions: number;
  /** Optional destination offered as an action on the file header (see `onOpenTarget`). */
  readonly target?: string;
  readonly hunks: readonly DiffHunk[];
}

export interface PairedDiffRow {
  readonly left: DiffLine | null;
  readonly right: DiffLine | null;
}

/**
 * Lines up a hunk for a two-column view: context lines span both sides, and each run of
 * deletions is paired row by row with the additions in the same run.
 */
export function alignHunkLines(lines: readonly DiffLine[]): PairedDiffRow[] {
  const rows: PairedDiffRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
      continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i]!.type !== 'context') {
      const next = lines[i]!;
      (next.type === 'deletion' ? dels : adds).push(next);
      i++;
    }
    const count = Math.max(dels.length, adds.length);
    for (let j = 0; j < count; j++) rows.push({ left: dels[j] ?? null, right: adds[j] ?? null });
  }
  return rows;
}

/** Sum of additions and deletions across files. */
export function diffTotals(files: readonly FileDiff[]): { additions: number; deletions: number } {
  return files.reduce(
    (acc, f) => ({
      additions: acc.additions + f.additions,
      deletions: acc.deletions + f.deletions,
    }),
    { additions: 0, deletions: 0 },
  );
}

/**
 * Debounced batching of DOM work (from AdhocPluginAndExtention `content/observer.ts`, Gmail parts removed).
 * Collect items from many mutations, then process them once per quiet period.
 */

export interface BatcherOptions<T> {
  debounceMs?: number;
  process: (items: T[]) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

export interface Batcher<T> {
  add(item: T): void;
  addMany(items: Iterable<T>): void;
  /** Process everything queued now, cancelling the pending timer. */
  flush(): Promise<void>;
  /** Drop queued items and the pending timer. */
  cancel(): void;
  size(): number;
}

export function createBatcher<T>(options: BatcherOptions<T>): Batcher<T> {
  const debounceMs = options.debounceMs ?? 120;
  const onError = options.onError ?? ((e: unknown) => console.error('[batcher] process failed', e));
  let pending = new Set<T>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const flush = async (): Promise<void> => {
    clearTimer();
    if (pending.size === 0) return;
    // Swap first so items added while processing land in the next batch (re-entrancy safe).
    const batch = [...pending];
    pending = new Set();
    try {
      await options.process(batch);
    } catch (err) {
      onError(err);
    }
  };

  const schedule = (): void => {
    clearTimer();
    timer = setTimeout(() => void flush(), debounceMs);
  };

  return {
    add(item) {
      pending.add(item);
      schedule();
    },
    addMany(items) {
      let added = false;
      for (const item of items) {
        pending.add(item);
        added = true;
      }
      if (added) schedule();
    },
    flush,
    cancel() {
      clearTimer();
      pending.clear();
    },
    size: () => pending.size,
  };
}

export interface BatchedObserverOptions<T> extends BatcherOptions<T> {
  root?: Node;
  /** Items each mutation contributes (e.g. matching added elements). */
  collect: (mutation: MutationRecord) => Iterable<T>;
  /** Items already present when `start()` runs. */
  initial?: () => Iterable<T>;
  observe?: MutationObserverInit;
}

export interface BatchedObserver {
  start(): void;
  stop(): void;
  flush(): Promise<void>;
}

export function createBatchedObserver<T>(options: BatchedObserverOptions<T>): BatchedObserver {
  const batcher = createBatcher(options);
  let observer: MutationObserver | null = null;
  return {
    start() {
      if (observer) return;
      const root = options.root ?? document.body;
      if (options.initial) batcher.addMany(options.initial());
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) batcher.addMany(options.collect(m));
      });
      observer.observe(root, options.observe ?? { childList: true, subtree: true });
    },
    stop() {
      observer?.disconnect();
      observer = null;
      batcher.cancel();
    },
    flush: batcher.flush,
  };
}

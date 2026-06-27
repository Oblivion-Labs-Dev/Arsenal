import { useEffect } from "react";

export interface DocumentTitleOptions {
  /** App name appended after the page title. */
  suffix?: string;
  /** Separator between title and suffix. Default: " · " */
  separator?: string;
}

/**
 * Set `document.title` while a component is mounted.
 * Restores the previous title on unmount.
 */
export function useDocumentTitle(title: string | undefined, options: DocumentTitleOptions = {}): void {
  const { suffix = "", separator = " · " } = options;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previous = document.title;
    const base = suffix || "";
    document.title = title ? `${title}${base ? `${separator}${base}` : ""}` : base || previous;
    return () => {
      document.title = previous;
    };
  }, [title, suffix, separator]);
}

/** Create a document title hook with a fixed app suffix. */
export function createDocumentTitleHook(suffix: string, separator = " · ") {
  return function useAppDocumentTitle(title: string | undefined): void {
    useDocumentTitle(title, { suffix, separator });
  };
}

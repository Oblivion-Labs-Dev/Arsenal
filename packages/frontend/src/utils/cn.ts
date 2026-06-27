type ClassValue = string | false | null | undefined | 0;

/** Merge conditional class names into a single string. */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

/** Copies text and reports failure visibly instead of swallowing it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('[arsenal] copy to clipboard failed', error);
    return false;
  }
}

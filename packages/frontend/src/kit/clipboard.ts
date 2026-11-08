/**
 * Copy text via the async Clipboard API, falling back to a hidden textarea +
 * `execCommand("copy")` for non-secure contexts (e.g. http://LAN-IP). From CareerOS.
 * Resolves false (never throws) when both paths fail; `onError` receives the reasons.
 */
export async function copyTextToClipboard(
  text: string,
  options: { onError?: (error: unknown) => void } = {},
): Promise<boolean> {
  if (!text) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    options.onError?.(err);
  }

  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  try {
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy');
  } catch (err) {
    options.onError?.(err);
    return false;
  } finally {
    textarea.remove();
  }
}

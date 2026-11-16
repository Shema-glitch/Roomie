/**
 * Roomie Bulletproof Clipboard Utility
 * Optimized for Android WebViews (including Tecno, Samsung, and Xiaomi WebViews)
 * and mobile browsers where navigator.clipboard.writeText may fail or be gated
 * behind strict transient activation permissions.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  // 1. Try modern async Clipboard API if available and securely permitted
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Async clipboard failed or was blocked by Android WebView permission policy.
      // Fall through immediately to synchronous execCommand fallback.
    }
  }

  // 2. Synchronous execCommand('copy') fallback via temporary offscreen textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Prevent scrolling and layout shifts on Android keyboards
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Boolean(successful);
  } catch {
    return false;
  }
}

/**
 * Lightweight Tactile Haptic Engine for Roomie
 * Provides soft micro-vibrations for Duolingo-style physical button clicks
 */

class HapticService {
  private hasHaptics: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      this.hasHaptics = true;
    }
  }

  /**
   * Soft 12ms micro-pulse for normal button press or tab tap
   */
  public light() {
    if (!this.hasHaptics) return;
    try {
      navigator.vibrate(12);
    } catch {
      // Haptics safety fallback
    }
  }

  /**
   * Medium 28ms bump for toggle switches, confirmations, or checkmarks
   */
  public medium() {
    if (!this.hasHaptics) return;
    try {
      navigator.vibrate(28);
    } catch {}
  }

  /**
   * Double festive burst for chore completions and streak extensions
   */
  public celebration() {
    if (!this.hasHaptics) return;
    try {
      navigator.vibrate([35, 60, 45]);
    } catch {}
  }

  public success() {
    this.celebration();
  }

  /**
   * Alert pulse for notices or disputes
   */
  public warning() {
    if (!this.hasHaptics) return;
    try {
      navigator.vibrate([20, 40, 20]);
    } catch {}
  }
}

export const haptics = new HapticService();

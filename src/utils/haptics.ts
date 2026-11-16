import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export { ImpactStyle, NotificationType };

const HAPTICS_STORAGE_KEY = 'roomie_haptics_enabled';

export class HapticService {
  private enabled: boolean = true;
  private lastMethod: string = '';
  private lastFiredAt: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(HAPTICS_STORAGE_KEY);
        if (stored !== null) {
          this.enabled = stored === 'true';
        }
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
      } catch {
        // Ignore storage errors
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Deduplicates identical haptic calls fired within the same 10ms UI event tick
   * (e.g. when a component invokes both `haptics.tokenClink()` and `sound.tokenClink()`).
   */
  private shouldFire(methodName: string): boolean {
    if (!this.enabled) return false;
    const now = Date.now();
    if (this.lastMethod === methodName && now - this.lastFiredAt < 10) {
      return false;
    }
    this.lastMethod = methodName;
    this.lastFiredAt = now;
    return true;
  }

  private isNativePluginReady(): boolean {
    try {
      return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics');
    } catch {
      return false;
    }
  }

  private vibrateFallback(pattern: number | number[]): void {
    const nav =
      (typeof window !== 'undefined' && window.navigator) ||
      (typeof navigator !== 'undefined' ? navigator : undefined);
    if (nav && typeof nav.vibrate === 'function') {
      try {
        nav.vibrate(pattern);
      } catch {
        // Haptics safety fallback
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 2 Distinct Haptic Signatures
  // ---------------------------------------------------------------------------

  /**
   * Weekly Honors celebration: Double-pulse fanfare (LIGHT -> 55ms -> HEAVY / [15, 45, 35])
   */
  public awardCelebrate(): void {
    if (!this.shouldFire('awardCelebrate')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Light })
        .then(() => {
          setTimeout(() => {
            Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
          }, 55);
        })
        .catch(() => this.vibrateFallback([15, 45, 35]));
    } else {
      this.vibrateFallback([15, 45, 35]);
    }
  }

  /**
   * Anonymous Vibe Check submit: Single calm heartbeat pulse (LIGHT / [18])
   */
  public vibeSubmit(): void {
    if (!this.shouldFire('vibeSubmit')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => this.vibrateFallback([18]));
    } else {
      this.vibrateFallback([18]);
    }
  }

  /**
   * Favor Token stepper, selection, or offer: Crisp single selection tick (MEDIUM / [12])
   */
  public tokenClink(): void {
    if (!this.shouldFire('tokenClink')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => this.vibrateFallback([12]));
    } else {
      this.vibrateFallback([12]);
    }
  }

  /**
   * Chore Swap accepted: Success notification double-tap (SUCCESS / [15, 30, 20])
   */
  public swapAccept(): void {
    if (!this.shouldFire('swapAccept')) return;
    if (this.isNativePluginReady()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() =>
        this.vibrateFallback([15, 30, 20])
      );
    } else {
      this.vibrateFallback([15, 30, 20]);
    }
  }

  /**
   * Chore Swap declined: Gentle warning double-buzz (WARNING / [25, 40, 25])
   */
  public softReject(): void {
    if (!this.shouldFire('softReject')) return;
    if (this.isNativePluginReady()) {
      Haptics.notification({ type: NotificationType.Warning }).catch(() =>
        this.vibrateFallback([25, 40, 25])
      );
    } else {
      this.vibrateFallback([25, 40, 25]);
    }
  }

  /**
   * Notification ping / inbox action: Gentle two-step alert tap (LIGHT -> 35ms -> MEDIUM / [14, 30, 18])
   */
  public notificationPing(): void {
    if (!this.shouldFire('notificationPing')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Light })
        .then(() => {
          setTimeout(() => {
            Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
          }, 35);
        })
        .catch(() => this.vibrateFallback([14, 30, 18]));
    } else {
      this.vibrateFallback([14, 30, 18]);
    }
  }

  // ---------------------------------------------------------------------------
  // Core UI Haptic Primitives
  // ---------------------------------------------------------------------------

  /**
   * Soft 12ms micro-pulse for normal button press or tab tap
   */
  public light(): void {
    if (!this.shouldFire('light')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => this.vibrateFallback(12));
    } else {
      this.vibrateFallback(12);
    }
  }

  /**
   * Medium 28ms bump for toggle switches, confirmations, or checkmarks
   */
  public medium(): void {
    if (!this.shouldFire('medium')) return;
    if (this.isNativePluginReady()) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => this.vibrateFallback(28));
    } else {
      this.vibrateFallback(28);
    }
  }

  /**
   * Double festive burst for chore completions and streak extensions
   */
  public celebration(): void {
    if (!this.shouldFire('celebration')) return;
    if (this.isNativePluginReady()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() =>
        this.vibrateFallback([35, 60, 45])
      );
    } else {
      this.vibrateFallback([35, 60, 45]);
    }
  }

  public success(): void {
    this.celebration();
  }

  /**
   * Alert pulse for notices or disputes
   */
  public warning(): void {
    if (!this.shouldFire('warning')) return;
    if (this.isNativePluginReady()) {
      Haptics.notification({ type: NotificationType.Warning }).catch(() =>
        this.vibrateFallback([20, 40, 20])
      );
    } else {
      this.vibrateFallback([20, 40, 20]);
    }
  }
}

export const haptics = new HapticService();

export function isHapticsEnabled(): boolean {
  return haptics.isEnabled();
}

export function setHapticsEnabled(enabled: boolean): void {
  haptics.setEnabled(enabled);
}

export function awardCelebrateHaptic(): void {
  haptics.awardCelebrate();
}

export function vibeSubmitHaptic(): void {
  haptics.vibeSubmit();
}

export function tokenClinkHaptic(): void {
  haptics.tokenClink();
}

export function swapAcceptHaptic(): void {
  haptics.swapAccept();
}

export function softRejectHaptic(): void {
  haptics.softReject();
}

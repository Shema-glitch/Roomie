import { haptics } from '../utils/haptics';

/**
 * Web Audio API Synthesizer for Roomie Sound Effects (Phase 2 Sensory Upgrade)
 * Gentle, warm, tactile audio signatures with zero external asset dependencies,
 * automatic Android WebView AudioContext user-gesture unlock, and mute toggle support.
 */

const SOUND_STORAGE_KEY = 'roomie_sound_enabled';

export class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false; // off by default as per spec

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SOUND_STORAGE_KEY);
        if (stored !== null) {
          this.enabled = stored === 'true';
        }
      } catch {
        // Ignore storage errors
      }

      // Android WebView user-gesture AudioContext resume listener
      const unlockAudio = () => {
        this.initCtx();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
  }

  private initCtx(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
      } catch {
        // Ignore storage errors
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // ---------------------------------------------------------------------------
  // Phase 2 Distinct Audio Signatures
  // ---------------------------------------------------------------------------

  /**
   * Weekly Honors Celebrate:
   * Ascending C-Major triad arpeggio (C5 -> E5 -> G5 -> C6)
   * with a subtle fifth harmonic shimmer (G6) on the top note.
   */
  public awardCelebrate(): void {
    haptics.awardCelebrate();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz) -> C6 (1046.50Hz)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const stepSec = 0.075;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = now + idx * stepSec;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.14, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);

        // Subtle fifth harmonic shimmer on the top C6 note (G6 = 1567.98Hz)
        if (idx === notes.length - 1) {
          const shimmerOsc = this.ctx.createOscillator();
          const shimmerGain = this.ctx.createGain();
          shimmerOsc.type = 'sine';
          shimmerOsc.frequency.setValueAtTime(freq * 1.5, startTime);

          shimmerGain.gain.setValueAtTime(0.05, startTime);
          shimmerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

          shimmerOsc.connect(shimmerGain);
          shimmerGain.connect(this.ctx.destination);

          shimmerOsc.start(startTime);
          shimmerOsc.stop(startTime + 0.42);
        }
      });
    } catch {
      // Audio playback failsafe
    }
  }

  public playAwardCelebrate(): void {
    this.awardCelebrate();
  }

  /**
   * Anonymous Vibe Check Submit:
   * - High/neutral moods: Warm, gentle F-Major dyad swell (F4 349.23Hz + A4 440Hz sine waves with a smooth 320ms fade-out).
   * - Low/stressed moods: Soft empathetic descending tone (349.23Hz -> 261.63Hz).
   */
  public vibeSubmit(mood?: string): void {
    haptics.vibeSubmit();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const isLowMood = mood === 'stressed' || mood === 'down' || mood === 'low';

      if (isLowMood) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(349.23, now);
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.28);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
        return;
      }

      // Warm F-Major dyad swell: F4 (349.23Hz) + A4 (440.00Hz) with smooth 320ms fade-out
      const dyadFreqs = [349.23, 440.0];
      dyadFreqs.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.085, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
      });
    } catch {}
  }

  public playVibeSubmit(mood?: string): void {
    this.vibeSubmit(mood);
  }

  /**
   * Favor Token Clink:
   * Crisp metallic coin clink (1318.5Hz + 2637Hz bell partials with a tight 140ms decay)
   * when offering, earning, or stepping Favor Tokens.
   */
  public tokenClink(): void {
    haptics.tokenClink();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const partials: Array<{ freq: number; gain: number }> = [
        { freq: 1318.5, gain: 0.11 },
        { freq: 2637.0, gain: 0.065 },
      ];

      partials.forEach(({ freq, gain: peakGain }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(peakGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.14);
      });
    } catch {}
  }

  public playTokenClink(): void {
    this.tokenClink();
  }

  /**
   * Chore Swap Accept:
   * Clean two-step fifth resolution chime (G4 392Hz -> C5 523.25Hz) when accepting a chore swap.
   */
  public swapAccept(): void {
    haptics.swapAccept();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // G4 (392.00Hz) -> C5 (523.25Hz)
      const steps = [
        { freq: 392.0, offset: 0, duration: 0.18, peak: 0.11 },
        { freq: 523.25, offset: 0.085, duration: 0.26, peak: 0.13 },
      ];

      steps.forEach(({ freq, offset, duration, peak }) => {
        if (!this.ctx) return;
        const startTime = now + offset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(peak, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {}
  }

  public playSwapAccept(): void {
    this.swapAccept();
  }

  /**
   * Chore Swap Decline / Soft Reject:
   * Muted low woodblock drop (220Hz -> 165Hz) when declining a swap.
   */
  public softReject(): void {
    haptics.softReject();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220.0, now);
      osc.frequency.exponentialRampToValueAtTime(165.0, now + 0.14);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  public playSoftReject(): void {
    this.softReject();
  }

  /**
   * Notification Ping:
   * Gentle two-note bell chime (E5 659.25Hz -> B5 987.77Hz) for notifications & inbox actions.
   */
  public notificationPing(): void {
    haptics.notificationPing();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 987.77];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = now + idx * 0.065;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch {}
  }

  public playNotificationPing(): void {
    this.notificationPing();
  }

  // ---------------------------------------------------------------------------
  // Core UI Sound Primitives
  // ---------------------------------------------------------------------------

  // Soft tactile button tap
  public playTap(): void {
    haptics.light();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio playback failsafe
    }
  }

  // Cheerful pop for kudos, selection, or checkbox
  public playPop(): void {
    haptics.light();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, this.ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  // Two-tone friendly chime for settled or completed tasks
  public playSuccess(): void {
    haptics.medium();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.1, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch {}
  }

  // Celebratory fanfare for Chore Reveal
  public playCelebration(): void {
    haptics.celebration();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [392, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {}
  }

  // Soft low warm chime for dispute or reminder
  public playCalmNotice(): void {
    haptics.warning();
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(349.23, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(261.63, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {}
  }
}

export const sound = new SoundService();

export function isSoundEnabled(): boolean {
  return sound.isEnabled();
}

export function setSoundEnabled(enabled: boolean): void {
  sound.setEnabled(enabled);
}

export function awardCelebrate(): void {
  sound.awardCelebrate();
}

export function vibeSubmit(mood?: string): void {
  sound.vibeSubmit(mood);
}

export function tokenClink(): void {
  sound.tokenClink();
}

export function swapAccept(): void {
  sound.swapAccept();
}

export function softReject(): void {
  sound.softReject();
}

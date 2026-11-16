import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { HapticService } from './haptics';
import { SoundService } from '../services/sound';

describe('Phase 2 sensory engine: distinct haptics & sound signatures', () => {
  let vibratedPatterns: Array<number | number[]> = [];

  beforeEach(() => {
    vibratedPatterns = [];
    (globalThis as any).window = {
      navigator: {
        vibrate: (pattern: number | number[]) => {
          vibratedPatterns.push(pattern);
          return true;
        },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });

  it('triggers distinct haptic vibration patterns for all 5 Phase 2 signatures + notifications', () => {
    const svc = new HapticService();

    svc.awardCelebrate();
    svc.vibeSubmit();
    svc.tokenClink();
    svc.swapAccept();
    svc.softReject();
    svc.notificationPing();

    assert.deepStrictEqual(vibratedPatterns, [
      [15, 45, 35], // awardCelebrate: double-pulse fanfare
      [18],         // vibeSubmit: single calm heartbeat pulse
      [12],         // tokenClink: crisp single selection tick
      [15, 30, 20], // swapAccept: success notification double-tap
      [25, 40, 25], // softReject: gentle warning double-buzz
      [14, 30, 18], // notificationPing: two-step inbox tap
    ]);
  });

  it('respects haptics enabled/disabled toggle', () => {
    const svc = new HapticService();
    svc.setEnabled(false);
    assert.strictEqual(svc.isEnabled(), false);

    svc.awardCelebrate();
    svc.tokenClink();
    assert.strictEqual(vibratedPatterns.length, 0);

    svc.setEnabled(true);
    svc.tokenClink();
    assert.deepStrictEqual(vibratedPatterns, [[12]]);
  });

  it('synthesizes distinct Web Audio API frequencies and respects sound mute toggle', () => {
    const startedOscillators: Array<{ type: string; freq: number }> = [];

    class MockAudioContext {
      public state = 'running';
      public currentTime = 0;
      public destination = {};
      createOscillator() {
        const osc = {
          type: 'sine',
          frequency: {
            setValueAtTime: (f: number) => {
              startedOscillators.push({ type: osc.type, freq: f });
            },
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
        return osc;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
        };
      }
      resume() {
        return Promise.resolve();
      }
    }

    (globalThis as any).window.AudioContext = MockAudioContext;

    const soundSvc = new SoundService();
    // Disabled by default -> no oscillators created
    soundSvc.awardCelebrate();
    assert.strictEqual(startedOscillators.length, 0);

    // Enable sound
    soundSvc.setEnabled(true);

    // 1. awardCelebrate: C5, E5, G5, C6 + fifth harmonic shimmer (G6 = 1569.75Hz)
    soundSvc.awardCelebrate();
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [523.25, 659.25, 783.99, 1046.5, 1046.5 * 1.5]
    );

    // 2. vibeSubmit (high mood): F4 (349.23Hz) + A4 (440Hz) dyad
    startedOscillators.length = 0;
    soundSvc.vibeSubmit('fire');
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [349.23, 440.0]
    );

    // 3. vibeSubmit (low mood): empathetic 349.23Hz descending tone
    startedOscillators.length = 0;
    soundSvc.vibeSubmit('stressed');
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [349.23]
    );

    // 4. tokenClink: 1318.5Hz + 2637Hz metallic partials
    startedOscillators.length = 0;
    soundSvc.tokenClink();
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [1318.5, 2637.0]
    );

    // 5. swapAccept: G4 (392Hz) -> C5 (523.25Hz)
    startedOscillators.length = 0;
    soundSvc.swapAccept();
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [392.0, 523.25]
    );

    // 6. softReject: 220Hz woodblock drop
    startedOscillators.length = 0;
    soundSvc.softReject();
    assert.deepStrictEqual(
      startedOscillators.map((o) => o.freq),
      [220.0]
    );
  });
});

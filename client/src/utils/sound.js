// client/src/utils/sound.js
/**
 * Prestige Acoustic Sound Engine for Antigravity & Coffeehouse UI
 * Generates pleasant, warm, organic acoustic chimes using the Web Audio API.
 * Uses harmonic sine waveforms and gentle exponential decay envelopes.
 */

let sharedAudioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }

  return sharedAudioCtx;
};

export const playNotificationSound = (type = 'info') => {
  try {
    // Respect user's motion/audio accessibility preferences if set
    if (typeof localStorage !== 'undefined' && localStorage.getItem('soundMuted') === 'true') {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.06, now);
    masterGain.connect(ctx.destination);

    // Warm, organic luxury tones:
    if (type === 'success') {
      // Elegant 2-tone major fifth chime (E5 -> B5)
      playTone(ctx, masterGain, 659.25, now, 0.28, 'sine');
      playTone(ctx, masterGain, 987.77, now + 0.08, 0.35, 'sine');
    } else if (type === 'warning') {
      // Mellow dual chime (A4 -> B4), warm sine harmonic
      playTone(ctx, masterGain, 440.0, now, 0.22, 'sine');
      playTone(ctx, masterGain, 493.88, now + 0.09, 0.26, 'sine');
    } else if (type === 'error') {
      // Soft muted low chime (E4 -> C#4)
      playTone(ctx, masterGain, 329.63, now, 0.25, 'sine');
      playTone(ctx, masterGain, 277.18, now + 0.08, 0.32, 'sine');
    } else {
      // Info: Soft single gentle bell chime (G5, 783.99 Hz)
      playTone(ctx, masterGain, 783.99, now, 0.35, 'sine');
    }
  } catch (error) {
    // Fail silently without disrupting user flow
  }
};

const playTone = (ctx, destination, freq, startTime, duration, type = 'sine') => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle gentle attack and exponential natural decay
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (e) {
    // Audio node error safe guard
  }
};

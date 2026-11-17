// Synthesised sound: short WebAudio oscillator blips, no audio files and no network.
// The context is created on the first user gesture; headless runs without one stay silent.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  function blip(freq, duration, type, volume, slide) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null || ctx.state === 'suspended') {
      if (ctx !== null) ctx.resume().catch(() => {});
      if (ctx === null || ctx.state === 'suspended') return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slide), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    unlock() {
      ensure();
    },
    bounce() {
      blip(220, 0.06, 'square', 0.05, 180);
    },
    brick() {
      blip(520, 0.07, 'triangle', 0.09, 240);
    },
    powerup() {
      blip(660, 0.12, 'sine', 0.1, 1320);
    },
    lost() {
      blip(320, 0.3, 'sawtooth', 0.08, 80);
    },
    level() {
      blip(440, 0.1, 'sine', 0.1, 880);
      setTimeout(() => blip(660, 0.14, 'sine', 0.1, 990), 90);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'sine', 0.1), i * 110));
    },
    laser() {
      blip(880, 0.05, 'square', 0.04, 440);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };
}

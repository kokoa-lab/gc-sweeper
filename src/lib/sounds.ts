// Sound effects using Web Audio API

const audioCtx = () => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
};

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_ctx) _ctx = audioCtx();
  return _ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playCollect(combo: number) {
  const baseFreq = 400 + combo * 80;
  playTone(baseFreq, 0.12, 'square', 0.12);
  setTimeout(() => playTone(baseFreq * 1.5, 0.1, 'square', 0.08), 60);
}

export function playWrong() {
  playTone(150, 0.2, 'sawtooth', 0.15);
  setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.1), 100);
}

export function playMark() {
  playTone(600, 0.06, 'sine', 0.08);
}

export function playLevelComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'square', 0.1), i * 100);
  });
}

export function playGameOver() {
  const notes = [400, 350, 300, 200];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sawtooth', 0.12), i * 150);
  });
}

export function playStartSweep() {
  playTone(300, 0.15, 'triangle', 0.1);
  setTimeout(() => playTone(500, 0.15, 'triangle', 0.1), 80);
}

export function playTick() {
  playTone(800, 0.04, 'square', 0.06);
}

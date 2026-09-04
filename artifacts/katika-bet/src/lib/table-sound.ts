let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === 'undefined') return null;
  ctx ??= new AudioContext();
  return ctx;
}

export function playTableTone(kind: 'win' | 'lose' | 'tick') {
  const context = audio();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = kind === 'lose' ? 'sawtooth' : 'sine';
  osc.frequency.value = kind === 'win' ? 660 : kind === 'lose' ? 180 : 420;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'tick' ? 0.08 : 0.18));
  osc.stop(context.currentTime + 0.2);
}

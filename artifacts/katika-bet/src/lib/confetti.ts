import confetti from 'canvas-confetti';

export function fireWinConfetti(originY = 0.6) {
  try {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: originY },
      colors: ['#35d399', '#f3d37a', '#ffffff', '#10b981', '#fbbf24'],
      disableForReducedMotion: true,
    });
  } catch {
    // Ignore if canvas isn't supported
  }
}

export function fireJackpotConfetti() {
  try {
    const end = Date.now() + 1200;
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 + 0.1 },
        colors: ['#35d399', '#d4af37', '#60a5fa', '#f59e0b', '#ffffff'],
        disableForReducedMotion: true,
      });
    }, 200);
  } catch {
    // Ignore
  }
}

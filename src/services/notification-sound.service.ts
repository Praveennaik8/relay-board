let audioContext: AudioContext | null = null;

function getContext() {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

/** Call from a user gesture so the browser permits later notification chimes. */
export async function unlockNotificationSound() {
  const context = getContext();
  if (context.state === "suspended") await context.resume();
}

export function playNotificationSound() {
  if (!audioContext || audioContext.state !== "running") return;

  const context = audioContext;
  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.13);
    oscillator.connect(gain);
    oscillator.start(now + index * 0.13);
    oscillator.stop(now + 0.44);
  });
}

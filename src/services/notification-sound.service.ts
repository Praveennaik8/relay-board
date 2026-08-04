type AudioContextConstructor = typeof AudioContext;
type BrowserWindow = Window & { webkitAudioContext?: AudioContextConstructor };

let audioContext: AudioContext | null = null;

function getContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/** Call from a user gesture so the browser permits later notification chimes. */
export async function unlockNotificationSound() {
  const context = getContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
}

export async function playNotificationSound() {
  const context = getContext();
  if (!context) return false;
  if (context.state !== "running") await context.resume();
  if (context.state !== "running") return false;
  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.32, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

  [880, 1174.66].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.13);
    oscillator.connect(gain);
    oscillator.start(now + index * 0.13);
    oscillator.stop(now + 0.54);
  });
  return true;
}

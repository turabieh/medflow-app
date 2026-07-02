/**
 * Cross-platform notification sound
 * Works on: Chrome, Firefox, Safari (macOS/iOS), Edge
 * 
 * Key rules:
 * 1. AudioContext must be created/resumed inside a user gesture
 * 2. Safari uses webkitAudioContext
 * 3. Must call resume() if context is suspended
 */

let ctx: AudioContext | null = null;

// Call this inside any user click handler to initialize
export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try { ctx = new AC(); } catch {}
}

// Resume suspended context then play
function resume(then: () => void) {
  if (!ctx) return;
  if (ctx.state === "running") { then(); return; }
  ctx.resume().then(then).catch(() => {});
}

export function playNotificationHigh() {
  // Doctor: ascending two-tone (patient sent to you)
  initAudio();
  resume(() => {
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } catch {}
  });
}

export function playNotificationLow() {
  // Secretary: softer tone (doctor marked done)
  initAudio();
  resume(() => {
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  });
}

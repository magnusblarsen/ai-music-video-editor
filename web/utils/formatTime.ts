
export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatTimeWithFrames(seconds: number, fps: number) {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const shownSeconds = totalSeconds % 60;

  const frame = Math.floor((seconds - totalSeconds) * fps);

  return `${minutes}:${String(shownSeconds).padStart(2, "0")}:${String(frame).padStart(2, "0")}`;
}

export function formatTimePrecise(sec: number) {
  const totalMs = Math.floor(sec * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

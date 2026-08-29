// Single Audio Instances (No stacking sound)
let audioHaik: HTMLAudioElement | null = null;
let audioIchad: HTMLAudioElement | null = null;

export function getAudio(soundName: "haikchad" | "ichad"): HTMLAudioElement {
  if (soundName === "haikchad") {
    if (!audioHaik) {
      audioHaik = new Audio(new URL("/static/haikchad.wav", window.location.href).href);
    }
    return audioHaik;
  } else {
    if (!audioIchad) {
      audioIchad = new Audio(new URL("/static/ichad.wav", window.location.href).href);
    }
    return audioIchad;
  }
}

export function playAudio(soundName: "haikchad" | "ichad"): void {
  try {
    const audio = getAudio(soundName);
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.play().catch((e) => console.warn("Audio playback failed:", e));
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

// Email Redactor
export function redactedEmail(email: string): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length < 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const redactedName = name.length <= 4 ? name.substring(0, 2) + "***" : name.substring(0, 12) + "***";
  return `${redactedName}@${domain}`;
}

// Relative Time Ago Formatter
export function formatTimeAgo(ts: number): string {
  if (!ts || isNaN(ts) || ts <= 0) return "";
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 0 || diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}

export function formatDateWithTimeAgo(rawTs?: number | string): string {
  if (rawTs === undefined || rawTs === null) return "-";
  const ts = typeof rawTs === "number" ? rawTs : Number(rawTs);
  if (isNaN(ts) || ts <= 0) return "-";
  const dateStr = new Date(ts).toLocaleString();
  const agoStr = formatTimeAgo(ts);
  return agoStr ? `${dateStr} (${agoStr})` : dateStr;
}

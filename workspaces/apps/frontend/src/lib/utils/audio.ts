import { settingsStore } from "$state/settings.svelte";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

let audio: HTMLAudioElement | null = null;

export function playNotificationSound(force = false) {
  if (!force && !settingsStore.soundEnabled) return;

  if (!audio) {
    audio = new Audio(NOTIFICATION_SOUND_URL);
  }

  // Reset and play
  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.warn("Failed to play notification sound:", err);
  });
}

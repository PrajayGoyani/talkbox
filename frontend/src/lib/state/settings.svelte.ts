import { authStore } from "$state/auth.svelte";

class SettingsStore {
  soundEnabled = $state(true);

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSettings();
      
      // Effect to reload settings when user changes
      $effect.root(() => {
        $effect(() => {
          if (authStore.user?.id) {
            this.loadSettings();
          }
        });
      });
    }
  }

  private loadSettings() {
    if (typeof window === "undefined") return;
    
    const userId = authStore.user?.id;
    const key = userId ? `settings_${userId}` : "settings_guest";
    
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.soundEnabled = parsed.soundEnabled ?? true;
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
  }

  private saveSettings() {
    if (typeof window === "undefined") return;
    
    const userId = authStore.user?.id;
    const key = userId ? `settings_${userId}` : "settings_guest";
    
    try {
      localStorage.setItem(key, JSON.stringify({
        soundEnabled: this.soundEnabled
      }));
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.saveSettings();
  }
}

export const settingsStore = new SettingsStore();

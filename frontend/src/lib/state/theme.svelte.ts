import { storage, type Theme } from "../utils/storage";

class ThemeStore {
  theme = $state<Theme>(storage.getTheme());

  constructor() {
    this.applyTheme();
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    storage.setTheme(this.theme);
    this.applyTheme();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    storage.setTheme(theme);
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", this.theme);
    }
  }
}

export const themeStore = new ThemeStore();

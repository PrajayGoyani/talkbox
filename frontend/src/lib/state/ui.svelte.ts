import { routerStore } from "./router.svelte";

class UIStore {
  isSidebarCollapsed = $state(false);
  notificationsOpen = $state(false);
  windowWidth = $state(typeof window !== "undefined" ? window.innerWidth : 1024);

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => {
        this.windowWidth = window.innerWidth;
      });
    }
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  setSidebarCollapsed(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  expandSidebar() {
    this.isSidebarCollapsed = false;
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  closeNotifications() {
    this.notificationsOpen = false;
  }

  /**
   * Unified navigation that handles common UI resets (sidebar, notifications)
   */
  navigate(path: string, options: { resetSidebar?: boolean; closeNotifications?: boolean } = {}) {
    const { resetSidebar = true, closeNotifications = true } = options;

    routerStore.navigate(path);
    if (resetSidebar) this.isSidebarCollapsed = false;
    if (closeNotifications) this.notificationsOpen = false;
  }
}

export const uiStore = new UIStore();

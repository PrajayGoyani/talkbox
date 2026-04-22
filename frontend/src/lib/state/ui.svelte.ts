import { routerStore } from "$state/router.svelte";

export interface AlertData {
  id: string;
  message: string;
  type: "danger" | "success" | "info";
}

class UIStore {
  isSidebarCollapsed = $state(false);
  notificationsOpen = $state(false);
  windowWidth = $state(typeof window !== "undefined" ? window.innerWidth : 1024);
  alerts = $state<AlertData[]>([]);

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

  addAlert(message: string, type: "danger" | "success" | "info" = "danger", duration = 4000) {
    const id = crypto.randomUUID();
    this.alerts = [...this.alerts, { id, message, type }];

    if (duration > 0) {
      setTimeout(() => {
        this.removeAlert(id);
      }, duration);
    }
  }

  removeAlert(id: string) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
  }
}

export const uiStore = new UIStore();

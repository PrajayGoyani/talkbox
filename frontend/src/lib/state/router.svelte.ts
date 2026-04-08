import { Route } from "../utils/routes";
import { authStore } from "./auth.svelte";

class RouterStore {
  hash = $state("");
  path = $state("");
  segments = $state<string[]>([]);
  params = $state<Record<string, string>>({});

  private initialized = false;

  init() {
    if (this.initialized) return;
    this.updateFromHash();
    window.addEventListener("hashchange", () => this.updateFromHash());
    this.initialized = true;
  }

  updateFromHash() {
    if (typeof window === "undefined") return;

    // Strip leading # and /
    let rawHash = window.location.hash.replace(/^#\/?/, "");

    // Default Route (Home)
    if (!rawHash) {
      this.hash = "";
      this.segments = [];
      return;
    }

    this.hash = rawHash;
    const parts = rawHash.split("?");
    this.path = parts[0];
    const pathSegments = this.path.split("/").filter(Boolean);
    this.segments = pathSegments;

    // Auth Guards
    if (authStore.isCheckingAuth) return;

    const firstSegment = pathSegments[0];

    const guestRoutes = [
      Route.LOGIN.replace(/^\//, ""),
      Route.SIGNUP.replace(/^\//, ""),
      Route.TERMS.replace(/^\//, ""),
      Route.PRIVACY.replace(/^\//, ""),
      "", // Home
    ];

    // Redirect to login if unauthenticated and not on an allowed guest page
    if (!authStore.user && !guestRoutes.includes(firstSegment || "")) {
      this.navigate(Route.LOGIN);
      return;
    }

    // Redirect to chat if already authenticated and trying to access auth pages
    if (authStore.user && [Route.LOGIN.replace(/^\//, ""), Route.SIGNUP.replace(/^\//, "")].includes(firstSegment)) {
      this.navigate(Route.CONVERSATIONS);
      return;
    }

    // Default chat panel fallback
    if (authStore.user && firstSegment === "chat" && pathSegments.length === 1) {
      this.navigate(Route.CONVERSATIONS);
      return;
    }
  }

  navigate(path: string) {
    if (typeof window === "undefined") return;
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    if (window.location.hash !== `#${formattedPath}`) {
      window.location.hash = formattedPath;
    }
  }
}

export const routerStore = new RouterStore();

import { authStore } from './auth.svelte';

class RouterStore {
  hash = $state('');
  path = $state('');
  segments = $state<string[]>([]);
  params = $state<Record<string, string>>({});

  private initialized = false;

  init() {
    if (this.initialized) return;
    this.updateFromHash();
    window.addEventListener('hashchange', () => this.updateFromHash());
    this.initialized = true;
  }

  updateFromHash() {
    // Strip leading # and /
    let rawHash = window.location.hash.replace(/^#\/?/, '');

    // Default Route
    if (!rawHash) {
      this.navigate(authStore.user ? '/chat/conversations' : '/login');
      return;
    }

    this.hash = rawHash;
    const parts = rawHash.split('?');
    this.path = parts[0];
    this.segments = this.path.split('/').filter(Boolean);

    // Auth Guards
    if (authStore.isCheckingAuth) return;

    if (!authStore.user && !['login', 'signup'].includes(this.segments[0])) {
      this.navigate('/login');
      return;
    }

    if (authStore.user && ['login', 'signup'].includes(this.segments[0])) {
      this.navigate('/chat/conversations');
      return;
    }

    // Default chat panel fallback
    if (authStore.user && this.segments[0] === 'chat' && this.segments.length === 1) {
      this.navigate('/chat/conversations');
      return;
    }
  }

  navigate(path: string) {
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    if (window.location.hash !== `#${formattedPath}`) {
      window.location.hash = formattedPath;
    } else {
      // Trigger update manually if we are already there to ensure state sync if needed
      this.updateFromHash();
    }
  }
}

export const routerStore = new RouterStore();

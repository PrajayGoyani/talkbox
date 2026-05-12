/**
 * Textbook Observer pattern interface for stores that need
 * to react to authentication lifecycle events (login/logout).
 */
export interface AuthObserver {
  /** Called when the user logs out or the session is cleared */
  clear(): void;

  /** Optional: Called when a new user session is established */
  init?(userId: string): void;
}

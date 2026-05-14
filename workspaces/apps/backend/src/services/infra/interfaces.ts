export interface IRedisSessionService {
  incrementGlobalSession(userId: string, socketId: string): Promise<number>;
  decrementGlobalSession(userId: string, socketId: string): Promise<void>;
  getGlobalSessionCount(userId: string): Promise<number>;
  getOldestSession(userId: string): Promise<string | null>;
  takeoverFreeSession(userId: string, newSocketId: string): Promise<string[]>;
  publishSessionTakeover(userId: string, victimSocketId: string): Promise<void>;
  publishCacheInvalidation(type: "user" | "partner" | "chat", id: string): Promise<void>;
  storeToken(prefix: string, token: string, userId: string, ttlSeconds: number): Promise<void>;
  getToken(prefix: string, token: string): Promise<string | null>;
  deleteToken(prefix: string, token: string): Promise<void>;
}

export interface IRedisGuardService {
  checkAndSetIdempotency(key: string, ttlSeconds: number): Promise<boolean>;
  incrementAndCheckLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; current?: number; ttl?: number; remaining?: number }>;
  lockChat(chatId: string): Promise<void>;
  unlockChat(chatId: string): Promise<void>;
  isChatLocked(chatId: string): Promise<boolean>;
}

export interface IRedisPresenceService {
  setActiveChat(userId: string, chatId: string | null): Promise<void>;
  getActiveChat(userId: string): Promise<string | null>;
  getCachedPartners(userId: string, excludeDeleted?: boolean): Promise<Set<string> | null>;
  setCachedPartners(userId: string, partnerIds: string[], excludeDeleted?: boolean): Promise<void>;
  getOnlineUsers(userIds: string[]): Promise<Set<string>>;
  getLastSeenBatched(userIds: string[]): Promise<Map<string, Date>>;
  setUserOnline(userId: string): Promise<void>;
  setUserOffline(userId: string, lastSeen: Date): Promise<void>;
  queuePresenceSync(userId: string): Promise<void>;
}

export interface IRedisBaseService {
  client: any;
  subClient: any;
  isConnected: boolean;
}

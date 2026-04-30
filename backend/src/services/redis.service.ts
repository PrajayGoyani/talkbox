import { RedisBaseService } from "./redis/base";
import { RedisGuardService } from "./redis/guard";
import { RedisPresenceService } from "./redis/presence";
import { RedisSessionService } from "./redis/session";

/**
 * Facade for decomposed Redis services.
 * Maintains backward compatibility with the existing API.
 */
class RedisService {
  private base: RedisBaseService;
  private presence: RedisPresenceService;
  private session: RedisSessionService;
  private guard: RedisGuardService;

  constructor() {
    this.base = new RedisBaseService();
    this.presence = new RedisPresenceService(this.base);
    this.session = new RedisSessionService(this.base);
    this.guard = new RedisGuardService(this.base);
  }

  // Getters and setters for core properties (backward compatibility/tests)
  get client() {
    return this.base.client;
  }
  set client(val: any) {
    this.base.client = val;
  }

  get subClient() {
    return this.base.subClient;
  }
  set subClient(val: any) {
    this.base.subClient = val;
  }

  get isConnected() {
    return this.base.isConnected;
  }
  set isConnected(val: boolean) {
    this.base.isConnected = val;
  }

  // ─── Presence ──────────────────────────────────────────────────────
  getCachedPartners(userId: string, activeOnly = false) {
    return this.presence.getCachedPartners(userId, activeOnly);
  }
  setCachedPartners(userId: string, partnerIds: string[], activeOnly = false) {
    return this.presence.setCachedPartners(userId, partnerIds, activeOnly);
  }
  invalidatePartnerCache(userId: string) {
    return this.presence.invalidatePartnerCache(userId);
  }
  setUserOnline(userId: string) {
    return this.presence.setUserOnline(userId);
  }
  setUserOffline(userId: string, lastSeen?: Date) {
    return this.presence.setUserOffline(userId, lastSeen);
  }
  getLastSeenBatched(userIds: string[]) {
    return this.presence.getLastSeenBatched(userIds);
  }
  isUserOnline(userId: string) {
    return this.presence.isUserOnline(userId);
  }
  getOnlineUsers(userIds: string[]) {
    return this.presence.getOnlineUsers(userIds);
  }
  queuePresenceSync(userId: string) {
    return this.presence.queuePresenceSync(userId);
  }
  queuePresenceSyncBatched(userIds: string[]) {
    return this.presence.queuePresenceSyncBatched(userIds);
  }
  getSyncQueueCount() {
    return this.presence.getSyncQueueCount();
  }
  popSyncQueue(limit: number) {
    return this.presence.popSyncQueue(limit);
  }

  // ─── Sessions & Tokens ─────────────────────────────────────────────
  incrementGlobalSession(userId: string, socketId: string) {
    return this.session.incrementGlobalSession(userId, socketId);
  }
  decrementGlobalSession(userId: string, socketId: string) {
    return this.session.decrementGlobalSession(userId, socketId);
  }
  getGlobalSessionCount(userId: string) {
    return this.session.getGlobalSessionCount(userId);
  }
  takeoverFreeSession(userId: string, newSocketId: string) {
    return this.session.takeoverFreeSession(userId, newSocketId);
  }
  publishSessionTakeover(userId: string, victimSocketId: string) {
    return this.session.publishSessionTakeover(userId, victimSocketId);
  }
  publishCacheInvalidation(type: "user" | "partner" | "chat", id: string) {
    return this.session.publishCacheInvalidation(type, id);
  }
  storeToken(prefix: string, token: string, userId: string, ttlSeconds: number) {
    return this.session.storeToken(prefix, token, userId, ttlSeconds);
  }
  getToken(prefix: string, token: string) {
    return this.session.getToken(prefix, token);
  }
  deleteToken(prefix: string, token: string) {
    return this.session.deleteToken(prefix, token);
  }

  // ─── Guard (Locks/Limits) ──────────────────────────────────────────
  lockChat(chatId: string) {
    return this.guard.lockChat(chatId);
  }
  unlockChat(chatId: string) {
    return this.guard.unlockChat(chatId);
  }
  isChatLocked(chatId: string) {
    return this.guard.isChatLocked(chatId);
  }
  incrementAndCheckLimit(key: string, limit: number, windowMs: number) {
    return this.guard.incrementAndCheckLimit(key, limit, windowMs);
  }
  checkAndSetIdempotency(key: string, ttlSeconds?: number) {
    return this.guard.checkAndSetIdempotency(key, ttlSeconds);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────
  close() {
    return this.base.close();
  }
}

export const redisService = new RedisService();

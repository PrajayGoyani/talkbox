import { LRUCache } from "lru-cache";

const PARTICIPANT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PARTICIPANT_CACHE_MAX = 10000;

const PARTNER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PARTNER_CACHE_MAX = 5000;

import { IChatCacheService } from "../interfaces/chat-cache.service";

/**
 * ChatCacheService centralizes in-memory caching for chat-related metadata.
 * This prevents memory redundancy and simplifies global cache invalidation.
 */
export class ChatCacheService implements IChatCacheService {
  private participantCache: LRUCache<string, Set<string>>;
  private partnerCache: LRUCache<string, Set<string>>;

  constructor() {
    this.participantCache = new LRUCache({
      max: PARTICIPANT_CACHE_MAX,
      ttl: PARTICIPANT_CACHE_TTL_MS,
    });

    this.partnerCache = new LRUCache({
      max: PARTNER_CACHE_MAX,
      ttl: PARTNER_CACHE_TTL_MS,
    });
  }

  // ─── Participant Cache ─────────────────────────────────────────────

  getParticipants(chatId: string): Set<string> | undefined {
    return this.participantCache.get(chatId);
  }

  setParticipants(chatId: string, participants: Set<string>): void {
    this.participantCache.set(chatId, participants);
  }

  invalidateParticipants(chatId: string): void {
    this.participantCache.delete(chatId);
  }

  // ─── Partner Cache ────────────────────────────────────────────────

  getPartners(userId: string, activeOnly = false): Set<string> | undefined {
    const key = activeOnly ? `${userId}:active` : userId;
    return this.partnerCache.get(key);
  }

  setPartners(userId: string, partners: Set<string>, activeOnly = false): void {
    const key = activeOnly ? `${userId}:active` : userId;
    this.partnerCache.set(key, partners);
  }

  invalidatePartners(userId: string): void {
    this.partnerCache.delete(userId);
    this.partnerCache.delete(`${userId}:active`);
  }

  // ─── Global ───────────────────────────────────────────────────────

  clear(): void {
    this.participantCache.clear();
    this.partnerCache.clear();
  }
}

export const chatCacheService = new ChatCacheService();

export interface IChatCacheService {
  getParticipants(chatId: string): Set<string> | undefined;
  setParticipants(chatId: string, participants: Set<string>): void;
  invalidateParticipants(chatId: string): void;
  getPartners(userId: string, activeOnly?: boolean): Set<string> | undefined;
  setPartners(userId: string, partners: Set<string>, activeOnly?: boolean): void;
  invalidatePartners(userId: string): void;
  clear(): void;
}

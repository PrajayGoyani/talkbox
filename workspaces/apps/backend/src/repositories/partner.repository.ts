import Chat, { IChatModel } from "@models/chat.model";

export class PartnerRepository {
  private partnerCache = new Map<string, { ids: Set<string>; t: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000;

  constructor(public chatModel: IChatModel) {}

  public async getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cacheKey = excludeDeleted ? `${userId}:active` : userId;
    const cached = this.partnerCache.get(cacheKey);
    if (cached && Date.now() - cached.t < this.CACHE_TTL) {
      return cached.ids;
    }

    const filter: any = { participants: userId, status: "accepted" };
    if (excludeDeleted) filter.isDeleted = false;

    const chats = await this.chatModel.find(filter).select("participants").lean();
    const partners = new Set<string>();

    for (const chat of chats as any) {
      for (const p of chat.participants) {
        const pId = p.toString();
        if (pId !== userId) {
          partners.add(pId);
        }
      }
    }

    this.partnerCache.set(cacheKey, { ids: partners, t: Date.now() });
    return partners;
  }

  public invalidatePartnerCache(userId: string) {
    this.partnerCache.delete(userId);
    this.partnerCache.delete(`${userId}:active`);
  }
}

export const partnerRepository = new PartnerRepository(Chat);

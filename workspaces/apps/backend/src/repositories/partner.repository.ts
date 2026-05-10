import { chatCacheService } from "@services/chat/chat-cache.service";
import Chat, { IChatModel } from "@models/chat.model";

export class PartnerRepository {
  constructor(public chatModel: IChatModel) {}

  public async getPartnerIds(userId: string, excludeDeleted = false): Promise<Set<string>> {
    const cached = chatCacheService.getPartners(userId, excludeDeleted);
    if (cached) {
      return cached;
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

    chatCacheService.setPartners(userId, partners, excludeDeleted);
    return partners;
  }

  public invalidatePartnerCache(userId: string) {
    chatCacheService.invalidatePartners(userId);
  }
}

export const partnerRepository = new PartnerRepository(Chat);

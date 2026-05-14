import { ObjectId } from "mongodb";

export interface IPartnerRepository {
  getPartnerIds(userId: string | ObjectId, excludeDeleted?: boolean): Promise<Set<string>>;
  invalidatePartnerCache(userId: string | ObjectId): void;
}

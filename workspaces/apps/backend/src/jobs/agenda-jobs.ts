import { getAgenda } from "@config/agenda";
import { presenceSyncHandler } from "@jobs/handlers/presence-sync.handler";
import { retentionHandler } from "@jobs/handlers/retention.handler";
import { subscriptionHandler } from "@jobs/handlers/subscription.handler";
import { userUpgradeChatSyncHandler } from "@jobs/handlers/user-upgrade.handler";

export const JOBS = {
  DATA_RETENTION_CLEANUP: "data-retention-cleanup",
  SUBSCRIPTION_EXPIRY: "subscription-expiry",
  PRESENCE_SYNC: "presence-sync",
  USER_UPGRADE_CHAT_SYNC: "user-upgrade-chat-sync",
};

export function defineJobs() {
  const agenda = getAgenda();

  agenda.define(JOBS.DATA_RETENTION_CLEANUP, retentionHandler);
  agenda.define(JOBS.SUBSCRIPTION_EXPIRY, subscriptionHandler);
  agenda.define(JOBS.PRESENCE_SYNC, presenceSyncHandler);
  agenda.define(JOBS.USER_UPGRADE_CHAT_SYNC, userUpgradeChatSyncHandler);
}

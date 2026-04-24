import { getAgenda } from "@config/agenda";

import { presenceSyncHandler } from "./handlers/presence-sync.handler";
import { retentionHandler } from "./handlers/retention.handler";
import { subscriptionHandler } from "./handlers/subscription.handler";

export const JOBS = {
  DATA_RETENTION_CLEANUP: "data-retention-cleanup",
  SUBSCRIPTION_EXPIRY: "subscription-expiry",
  PRESENCE_SYNC: "presence-sync",
};

export function defineJobs() {
  const agenda = getAgenda();

  agenda.define(JOBS.DATA_RETENTION_CLEANUP, retentionHandler);
  agenda.define(JOBS.SUBSCRIPTION_EXPIRY, subscriptionHandler);
  agenda.define(JOBS.PRESENCE_SYNC, presenceSyncHandler);
}

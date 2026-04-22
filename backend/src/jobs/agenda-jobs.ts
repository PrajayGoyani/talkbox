import { getAgenda } from "@config/agenda";

import { retentionHandler } from "./handlers/retention.handler";
import { subscriptionHandler } from "./handlers/subscription.handler";

export const JOBS = {
  DATA_RETENTION_CLEANUP: "data-retention-cleanup",
  SUBSCRIPTION_EXPIRY: "subscription-expiry",
};

export function defineJobs() {
  const agenda = getAgenda();

  agenda.define(JOBS.DATA_RETENTION_CLEANUP, retentionHandler);
  agenda.define(JOBS.SUBSCRIPTION_EXPIRY, subscriptionHandler);
}

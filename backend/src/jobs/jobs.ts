import { getAgenda, startAgenda } from "@config/agenda";
import { ENABLE_JOBS, NODE_ENV } from "@config/env";

import { defineJobs, JOBS } from "./agenda-jobs";

export async function startJobs() {
  if (NODE_ENV !== "production" && !ENABLE_JOBS) {
    console.log("Skipping background jobs in non-production environment (ENABLE_JOBS != true).");
    return;
  }

  try {
    // Initialize and define
    defineJobs();

    // Start Agenda
    await startAgenda();

    // Schedule the retention cleanup
    const agenda = getAgenda();
    await agenda.every("24 hours", JOBS.DATA_RETENTION_CLEANUP);
    await agenda.every("1 hour", JOBS.SUBSCRIPTION_EXPIRY);

    console.log("Background jobs scheduled via Agenda.");
  } catch (error) {
    console.error("Failed to start/schedule background jobs:", error);
  }
}

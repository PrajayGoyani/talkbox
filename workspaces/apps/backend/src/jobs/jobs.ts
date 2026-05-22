import { getAgenda, startAgenda } from "@config/agenda";
import { ENABLE_JOBS, NODE_ENV } from "@config/env";
import { defineJobs, JOBS } from "@jobs/agenda-jobs";
import { logger } from "@utils/logger";

export async function startJobs() {
  if (NODE_ENV !== "production" && !ENABLE_JOBS) {
    logger.info("Skipping background jobs in non-production environment (ENABLE_JOBS != true).");
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
    await agenda.every("5 minutes", JOBS.PRESENCE_SYNC);

    logger.info("Background jobs scheduled via Agenda.");
  } catch (error) {
    logger.error("Failed to start/schedule background jobs", {
      error: error instanceof Error ? error.stack : String(error),
    });
  }
}

import { NODE_ENV } from "../config/env";
import { startAgenda, getAgenda } from "../config/agenda";
import { defineJobs, JOBS } from "./agenda-jobs";

export async function startJobs() {
  if (NODE_ENV !== "production") {
    // console.log("Skipping background jobs in non-production environment.");
    // return;
    // Note: Agenda is useful in dev too for persistence testing, 
    // but we can skip starting it if the user prefers.
  }

  try {
    // Initialize and define
    defineJobs();
    
    // Start Agenda
    await startAgenda();

    // Schedule the retention cleanup
    const agenda = getAgenda();
    await agenda.every("24 hours", JOBS.DATA_RETENTION_CLEANUP);
    
    console.log("Background jobs scheduled via Agenda.");
  } catch (error) {
    console.error("Failed to start/schedule background jobs:", error);
  }
}

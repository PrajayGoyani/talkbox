import { FREE_PLAN_SCRUB_DAYS, MESSAGE_MODIFY_LIMIT_HOURS } from "shared/constants/chat";

/**
 * Checks if a message is within the modification time limit.
 */
export const isWithinModificationWindow = (
  createdAt: string | Date,
  limitHours = MESSAGE_MODIFY_LIMIT_HOURS,
): boolean => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const limitMs = limitHours * 60 * 60 * 1000;
  return date.getTime() > Date.now() - limitMs;
};

/**
 * Checks if a message is scrubbed based on the user's plan.
 */
export const isScrubbed = (
  createdAt: string | Date,
  plan: "free" | "pro",
  scrubDays = FREE_PLAN_SCRUB_DAYS,
): boolean => {
  if (plan === "pro") return false;
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - scrubDays);
  return date < cutoff;
};

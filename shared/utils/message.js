import { MESSAGE_MODIFY_LIMIT_HOURS, FREE_PLAN_SCRUB_DAYS } from "../constants/chat.js";
/**
 * Checks if a message is within the modification time limit.
 */
export const isWithinModificationWindow = (createdAt, limitHours = MESSAGE_MODIFY_LIMIT_HOURS) => {
    const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const limitMs = limitHours * 60 * 60 * 1000;
    return date.getTime() > Date.now() - limitMs;
};
/**
 * Checks if a message is scrubbed based on the user's plan.
 */
export const isScrubbed = (createdAt, plan, scrubDays = FREE_PLAN_SCRUB_DAYS) => {
    if (plan === "pro")
        return false;
    const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - scrubDays);
    return date < cutoff;
};

import { FREE_PLAN_SCRUB_DAYS, MESSAGE_MODIFY_LIMIT_HOURS } from "@root/shared/constants/chat";
import { isScrubbed, isWithinModificationWindow } from "@root/shared/utils/message";

/**
 * Returns the cutoff date for Free-plan message scrubbing.
 * Messages older than this threshold are virtually scrubbed for free users.
 */
export const getScrubCutoff = (): Date => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FREE_PLAN_SCRUB_DAYS);
  return cutoff;
};

/**
 * Returns the cutoff date for the message modification time limit.
 * Messages older than this threshold cannot be edited or deleted.
 */
export const getModifyCutoff = (): Date => {
  const limitMs = MESSAGE_MODIFY_LIMIT_HOURS * 60 * 60 * 1000;
  return new Date(Date.now() - limitMs);
};

/**
 * Returns true if the message is scrubbed for the given plan.
 */
export const isScrubbedLogic = (plan: "free" | "pro", messageCreatedAt: Date): boolean => {
  return isScrubbed(messageCreatedAt, plan, FREE_PLAN_SCRUB_DAYS);
};

/**
 * Returns true if the message is past the modification time limit.
 */
export const isPastModifyLimit = (messageCreatedAt: Date): boolean => {
  return !isWithinModificationWindow(messageCreatedAt, MESSAGE_MODIFY_LIMIT_HOURS);
};

export { isScrubbedLogic as isScrubbed };

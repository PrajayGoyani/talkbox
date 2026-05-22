import { registry } from "@bootstrap/registry/registry";
import { getAgenda } from "@config/agenda";
import { JOBS } from "@jobs/agenda-jobs";
import { AUTH_EVENTS, eventBus } from "@utils/event-bus";

/**
 * Initialize event listeners for Auth actions.
 * This decouples the core logic in AuthService from side-effects
 * like sending emails, triggering background jobs, and emitting socket events.
 */
export const initAuthEventListeners = () => {
  // 1. Verification Email
  eventBus.on(AUTH_EVENTS.VERIFICATION_REQUIRED, async ({ email, token }) => {
    try {
      await registry.emailService.sendVerificationEmail(email, token);
    } catch (err) {
      console.error("[EventBus] Failed to send verification email:", err);
    }
  });

  // 2. Password Reset Email
  eventBus.on(AUTH_EVENTS.PASSWORD_RESET_REQUESTED, async ({ email, token }) => {
    try {
      await registry.emailService.sendResetEmail(email, token);
    } catch (err) {
      console.error("[EventBus] Failed to send password reset email:", err);
    }
  });

  // 3. User Upgraded to Pro
  eventBus.on(AUTH_EVENTS.UPGRADED, async ({ userId, oldPlan, newPlan }) => {
    // 3a. Trigger background job for chat sync if moving to Pro
    if (oldPlan === "free" && newPlan === "pro") {
      try {
        const agenda = getAgenda();
        await agenda.now(JOBS.USER_UPGRADE_CHAT_SYNC, {
          userId: userId.toString(),
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("[EventBus] Failed to trigger USER_UPGRADE_CHAT_SYNC job:", err);
      }
    }

    // 3b. Broadcast plan update to partners via Socket.io
    try {
      await registry.socketService.notifyProfileUpdate(userId.toString(), {
        userId: userId.toString(),
        plan: newPlan,
      });
    } catch (err) {
      console.error("[EventBus] Failed to notify partners of profile update:", err);
    }
  });
};

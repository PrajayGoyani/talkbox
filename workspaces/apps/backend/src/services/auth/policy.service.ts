import { PRO_PLAN_SESSION_LIMIT } from "@config/env";

import { IPolicyService } from "../interfaces/policy.service";

export class PolicyService implements IPolicyService {
  /**
   * Checks if a user has reached their session limit based on their plan.
   * @returns true if limited, false otherwise.
   */
  isSessionLimitReached(plan: string, globalCount: number): boolean {
    if (plan === "pro" && globalCount > PRO_PLAN_SESSION_LIMIT) {
      return true;
    }
    return false;
  }

  getProSessionLimit(): number {
    return PRO_PLAN_SESSION_LIMIT;
  }
}

export const policyService = {};

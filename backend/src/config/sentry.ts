import { NODE_ENV, SENTRY_DSN } from "@config/env";
import * as Sentry from "@sentry/bun";

export const initSentry = () => {
  if (!SENTRY_DSN) {
    if (NODE_ENV === "production") {
      console.warn("[Sentry] Warning: SENTRY_DSN is not set in production!");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions, reduce in production!
  });

  console.log(`[Sentry] Initialized with environment: ${NODE_ENV}`);
};

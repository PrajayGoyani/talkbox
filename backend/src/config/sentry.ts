import { NODE_ENV, SENTRY_DSN } from "@config/env";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

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
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions, reduce in production!
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });

  console.log(`[Sentry] Initialized with environment: ${NODE_ENV}`);
};

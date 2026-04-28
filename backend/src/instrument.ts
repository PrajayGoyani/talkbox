import * as Sentry from "@sentry/bun";

// Initialize Sentry at the very beginning to ensure instrumentation of all modules
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [Sentry.expressIntegration()],
  });
  console.log(`[Sentry] Initialized with environment: ${NODE_ENV}`);
} else if (NODE_ENV === "production") {
  console.warn("[Sentry] Warning: SENTRY_DSN is not set in production!");
}

import * as Sentry from "@sentry/bun";
import { logger } from "@utils/logger";

// DNS Prefetching for performance optimization
const prefetchHostnames = new Set<string>();

const extractHostname = (url: string | undefined) => {
  if (!url) return;
  try {
    // Handle protocol-less or specialized URIs by ensuring they look like valid URLs for parsing
    const normalizedUrl = url.includes("://") ? url : `http://${url}`;
    const { hostname } = new URL(normalizedUrl.replace("mongodb+srv://", "http://"));
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      prefetchHostnames.add(hostname);
    }
  } catch {
    // Ignore invalid URLs
  }
};

extractHostname(Bun.env.MONGO_URI);
extractHostname(Bun.env.REDIS_URL);
extractHostname(Bun.env.SENTRY_DSN);
extractHostname(Bun.env.SMTP_HOST);

// Static hostnames
prefetchHostnames.add("ui-avatars.com");

// Cloudinary
if (Bun.env.UPLOAD_STRATEGY === "cloudinary") {
  prefetchHostnames.add("res.cloudinary.com");
  prefetchHostnames.add("api.cloudinary.com");
}

if (prefetchHostnames.size > 0) {
  for (const hostname of prefetchHostnames) {
    Bun.dns.prefetch(hostname);
  }
  logger.info(`[Bun] DNS Prefetched: ${Array.from(prefetchHostnames).join(", ")}`);
}

// Initialize Sentry at the very beginning to ensure instrumentation of all modules
const SENTRY_DSN = Bun.env.SENTRY_DSN;
const NODE_ENV = Bun.env.NODE_ENV;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [Sentry.expressIntegration()],
  });
  logger.info(`[Sentry] Initialized with environment: ${NODE_ENV}`);
} else if (NODE_ENV === "production") {
  logger.warn("[Sentry] Warning: SENTRY_DSN is not set in production!");
}

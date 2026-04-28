import { describe, it, expect, vi, beforeEach } from "vitest";
import { bootstrap } from "../../server";
import { initSentry } from "@config/sentry";
import { connectDB } from "@config/db";
import { configureSocket, startServer } from "@/app";
import { startJobs } from "@jobs/jobs";


vi.mock("@config/sentry", () => ({
  initSentry: vi.fn(),
}));

vi.mock("@config/db", () => ({
  connectDB: vi.fn(),
}));

vi.mock("@/app", () => ({
  configureSocket: vi.fn(),
  startServer: vi.fn(() => ({
    close: vi.fn((cb) => cb()),
  })),
}));

vi.mock("@jobs/jobs", () => ({
  startJobs: vi.fn(),
}));

vi.mock("@config/agenda", () => ({
  stopAgenda: vi.fn(),
}));

vi.mock("@services/redis.service", () => ({
  redisService: {
    close: vi.fn(),
  },
}));


vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        ...actual.default.connection,
        close: vi.fn(),
      },
    },
  };
});


describe("bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should initialize all services in the correct order", async () => {
    await bootstrap();

    expect(initSentry).toHaveBeenCalled();
    expect(connectDB).toHaveBeenCalled();
    expect(configureSocket).toHaveBeenCalled();
    expect(startJobs).toHaveBeenCalled();
    expect(startServer).toHaveBeenCalled();
    
    // Verify order
    const initSentryCallOrder = vi.mocked(initSentry).mock.invocationCallOrder[0];
    const connectDBCallOrder = vi.mocked(connectDB).mock.invocationCallOrder[0];
    const configureSocketCallOrder = vi.mocked(configureSocket).mock.invocationCallOrder[0];
    const startJobsCallOrder = vi.mocked(startJobs).mock.invocationCallOrder[0];
    const startServerCallOrder = vi.mocked(startServer).mock.invocationCallOrder[0];

    expect(initSentryCallOrder).toBeLessThan(connectDBCallOrder);
    expect(connectDBCallOrder).toBeLessThan(configureSocketCallOrder);
    expect(configureSocketCallOrder).toBeLessThan(startJobsCallOrder);
    expect(startJobsCallOrder).toBeLessThan(startServerCallOrder);
  });

  it("should handle bootstrap failures", async () => {
    const error = new Error("DB Connection failed");
    vi.mocked(connectDB).mockRejectedValue(error);
    
    // bootstrap().catch(...) handles the error in server.ts
    // but here we are calling it directly to test behavior
    await expect(bootstrap()).rejects.toThrow(error);
  });
});

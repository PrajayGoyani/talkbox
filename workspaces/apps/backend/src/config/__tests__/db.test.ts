import { MONGO_URI } from "@config/env";
import mongoose from "mongoose";
import { setServers } from "node:dns/promises";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { connectDB } from "../db";

vi.mock("mongoose", () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock("node:dns/promises", () => ({
  setServers: vi.fn(),
}));

describe("connectDB", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn().mockImplementation((code?: string | number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
    process.exit = originalExit;
  });

  it("should connect to MongoDB successfully", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(MONGO_URI);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should handle connection failure and exit after retries", async () => {
    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("Connection failed"));

    vi.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      if (typeof cb === "function") cb();
      return { unref: () => {} } as any;
    });

    try {
      await connectDB(3);
    } catch {
      // Expected throw from process.exit mock
    }

    expect(mongoose.connect).toHaveBeenCalledTimes(3);
    expect(process.exit).toHaveBeenCalled();
    expect((process.exit as any).mock.calls[0][0]).toBe(1);
  });

  it("should apply Windows DNS hack on win32 platform", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    try {
      await connectDB();
      expect(setServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
      expect(connectSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });

  it("should NOT apply Windows DNS hack on other platforms", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    try {
      await connectDB();
      expect(setServers).not.toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });
});

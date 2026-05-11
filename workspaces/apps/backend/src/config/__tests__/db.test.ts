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
  const originalPlatform = process.platform;
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exit = vi.fn().mockImplementation((code?: string | number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
    process.exit = originalExit;
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it("should connect to MongoDB successfully", async () => {
    const connectSpy = vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(MONGO_URI);
    expect(vi.spyOn(console, "log")).toHaveBeenCalledWith("Connected to MongoDB");
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should handle connection failure and exit", async () => {
    vi.spyOn(mongoose, "connect").mockRejectedValue(new Error("Connection failed"));

    // Mock setTimeout to resolve immediately
    vi.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      if (typeof cb === "function") cb();
      return { unref: () => {} } as any;
    });

    try {
      await connectDB(3);
    } catch (e: any) {
      // Expected throw from process.exit mock
    }

    expect(mongoose.connect).toHaveBeenCalledTimes(3);
    expect(process.exit).toHaveBeenCalled();
    // Check first argument of the first call
    expect((process.exit as any).mock.calls[0][0]).toBe(1);
  });

  it("should apply Windows DNS hack on win32 platform", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
    expect(mongoose.connect).toHaveBeenCalled();
  });

  it("should NOT apply Windows DNS hack on other platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
    });
    vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).not.toHaveBeenCalled();
    expect(mongoose.connect).toHaveBeenCalled();
  });
});

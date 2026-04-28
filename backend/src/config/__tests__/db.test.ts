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
    // @ts-ignore
    process.exit = vi.fn() as never;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    process.exit = originalExit;
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it("should connect to MongoDB successfully", async () => {
    vi.mocked(mongoose.connect).mockResolvedValue({} as any);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(MONGO_URI);
    expect(console.log).toHaveBeenCalledWith("Connected to MongoDB");
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("should handle connection failure and exit", async () => {
    const error = new Error("Connection failed");
    vi.mocked(mongoose.connect).mockRejectedValue(error);

    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith(MONGO_URI);
    expect(console.error).toHaveBeenCalledWith("Fatal: Could not connect to MongoDB:", error.message);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("should apply Windows DNS hack on win32 platform", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    vi.mocked(mongoose.connect).mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
    expect(mongoose.connect).toHaveBeenCalled();
  });

  it("should NOT apply Windows DNS hack on other platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
    });
    vi.mocked(mongoose.connect).mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).not.toHaveBeenCalled();
    expect(mongoose.connect).toHaveBeenCalled();
  });
});

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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => {
      return undefined as never;
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it("should connect to MongoDB successfully", async () => {
    vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(vi.spyOn(mongoose, "connect")).toHaveBeenCalledWith(MONGO_URI);
    expect(vi.spyOn(console, "log")).toHaveBeenCalledWith("Connected to MongoDB");
    expect(vi.spyOn(process, "exit")).not.toHaveBeenCalled();
  });

  it("should handle connection failure and exit", async () => {
    const error = new Error("Connection failed");
    vi.spyOn(mongoose, "connect").mockRejectedValue(error);

    await connectDB();

    expect(vi.spyOn(mongoose, "connect")).toHaveBeenCalledWith(MONGO_URI);
    expect(vi.spyOn(console, "error")).toHaveBeenCalledWith("Fatal: Could not connect to MongoDB:", error.message);
    expect(vi.spyOn(process, "exit")).toHaveBeenCalledWith(1);
  });

  it("should apply Windows DNS hack on win32 platform", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).toHaveBeenCalledWith(["1.1.1.1", "8.8.8.8"]);
    expect(vi.spyOn(mongoose, "connect")).toHaveBeenCalled();
  });

  it("should NOT apply Windows DNS hack on other platforms", async () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
    });
    vi.spyOn(mongoose, "connect").mockResolvedValue({} as any);

    await connectDB();

    expect(setServers).not.toHaveBeenCalled();
    expect(vi.spyOn(mongoose, "connect")).toHaveBeenCalled();
  });
});

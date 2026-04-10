import { describe, it, expect, vi } from "vitest";

// ─── populateThreadInfo error branch (line 20) ──────────────────────────────

describe("getThreadById — populateThreadInfo null doc", () => {
  it("should throw when ThreadModel.findById returns null after exists check", async () => {
    vi.resetModules();

    vi.doMock("../../src/mongoose-models.ts", () => ({
      ["ThreadModel"]: {
        exists: vi.fn().mockResolvedValue({ _id: "some-id" }),
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      },
    }));

    const { getThreadById } = await import("../../src/services/thread.service.ts");
    return expect(getThreadById("some-id", "user1")).rejects.toThrow(
      "Failed to find thread some-id",
    );
  });
});

// ─── populateThreadSummary error branch (line 41) ───────────────────────────

describe("getThreadSummaries — populateThreadSummary null doc", () => {
  it("should throw when ThreadModel.findById returns null for a listed thread", async () => {
    vi.resetModules();

    vi.doMock("../../src/mongoose-models.ts", () => ({
      ["ThreadModel"]: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ _id: "some-id" }]),
        }),
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      },
    }));

    const { getThreadSummaries } = await import("../../src/services/thread.service.ts");

    await expect(getThreadSummaries()).rejects.toThrow("Failed to find thread some-id");
  });
});

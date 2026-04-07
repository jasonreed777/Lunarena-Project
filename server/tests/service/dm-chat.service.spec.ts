import { describe, expect, it } from "vitest";
import { createChat, getMessages } from "../../src/services/dm-chat.service.ts";
import { getUserByUsername } from "../../src/services/auth.service.ts";

// ─── createChat ───────────────────────────────────────────────────────────

describe("createChat", () => {
  it("should throw for duplicate participants in the array", async () => {
    const user1 = await getUserByUsername("user1");
    await expect(createChat([user1!.userId, user1!.userId])).rejects.toThrow(
      "duplicate participants",
    );
  });

  it("should throw when a chat for the same participants already exists", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await createChat([user1!.userId, user2!.userId]);
    await expect(createChat([user1!.userId, user2!.userId])).rejects.toThrow(
      "Chat for these participants already exists",
    );
  });

  it("should allow only one of two concurrent identical createChat calls to succeed", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const results = await Promise.allSettled([
      createChat([user1!.userId, user2!.userId]),
      createChat([user1!.userId, user2!.userId]),
    ]);
    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});

// ─── getMessages ──────────────────────────────────────────────────────────

describe("getMessages", () => {
  it("should throw for a non-existent chatId", async () => {
    await expect(getMessages("000000000000000000000000", 0, 10)).rejects.toThrow(
      "chat could not be found",
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  createChat,
  getChats,
  getMessages,
  sendMessage,
  checkUserBelongs,
} from "../../src/services/dm-chat.service.ts";
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

// ─── createChat — catch branch (line 49) ──────────────────────────────────

describe("createChat — DB failure", () => {
  it("should throw 'Could not create chat' when DMChatModel.exists rejects", async () => {
    vi.resetModules();

    vi.doMock("../../src/mongoose-models.ts", () => ({
      ["DMChatModel"]: {
        exists: vi.fn().mockRejectedValue(new Error("DB error")),
      },
      ["DMChatMessageModel"]: {},
    }));

    const { createChat: createChatMocked } = await import("../../src/services/dm-chat.service.ts");
    await expect(createChatMocked(["user1", "user2"])).rejects.toThrow("Could not create chat");

    vi.doUnmock("../../src/mongoose-models.ts");
  });
});

// ─── getChats ─────────────────────────────────────────────────────────────

describe("getChats", () => {
  it("should return chats that the user participates in", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await createChat([user1!.userId, user2!.userId]);
    const chats = await getChats(user1!.userId);
    expect(chats).toHaveLength(1);
    expect(chats[0].participants).toContainEqual(user1!.userId);
  });

  it("should return an empty array when the user has no chats", async () => {
    const user1 = await getUserByUsername("user1");
    const chats = await getChats(user1!.userId);
    expect(chats).toHaveLength(0);
  });
});

// ─── getMessages ──────────────────────────────────────────────────────────

describe("getMessages", () => {
  it("should throw for a non-existent chatId", async () => {
    await expect(getMessages("000000000000000000000000", 0, 10)).rejects.toThrow(
      "chat could not be found",
    );
  });

  it("should return messages for an existing chat", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await sendMessage(user1!.userId, "hello", chat._id.toString());
    const messages = await getMessages(chat._id.toString(), 0, 10);
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe("hello");
  });
});

// ─── sendMessage ──────────────────────────────────────────────────────────

describe("sendMessage", () => {
  it("should throw when the chat does not exist", async () => {
    const user1 = await getUserByUsername("user1");
    await expect(sendMessage(user1!.userId, "hi", "000000000000000000000000")).rejects.toThrow(
      "chat could not be found",
    );
  });

  it("should throw when the sender is not a participant", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const user3 = await getUserByUsername("user3");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await expect(sendMessage(user3!.userId, "hi", chat._id.toString())).rejects.toThrow(
      "sender not present in chat",
    );
  });

  it("should create a message and update chat on success", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);
    const { message } = await sendMessage(user1!.userId, "hello", chat._id.toString());
    expect(message.text).toBe("hello");
  });
});

// ─── checkUserBelongs ─────────────────────────────────────────────────────

describe("checkUserBelongs", () => {
  it("should throw when the chat does not exist", async () => {
    const user1 = await getUserByUsername("user1");
    await expect(
      checkUserBelongs("000000000000000000000000", user1!.userId.toString()),
    ).rejects.toThrow("chat could not be found");
  });

  it("should return true when the user is a participant", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);
    const result = await checkUserBelongs(chat._id.toString(), user1!.userId.toString());
    expect(result).toBe(true);
  });

  it("should return false when the user is not a participant", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const user3 = await getUserByUsername("user3");
    const chat = await createChat([user1!.userId, user2!.userId]);
    const result = await checkUserBelongs(chat._id.toString(), user3!.userId.toString());
    expect(result).toBe(false);
  });
});

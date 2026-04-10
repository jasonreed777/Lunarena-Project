import { describe, it, expect, vi, afterEach } from "vitest";
import * as gameChatService from "../../src/services/game-chat.service.ts";
import * as userService from "../../src/services/user.service.ts";
import * as mongooseModels from "../../src/mongoose-models.ts";

describe("game-chat.service", () => {
  const mockUser = { userId: "u1", username: "jason" };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createChat", () => {
    it("should create a chat and return populated chat info", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "create").mockResolvedValue({} as never);
      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          createdAt: "2026-04-10T00:00:00.000Z",
          messages: [],
          moveLog: [],
        }),
      } as never);

      const result = await gameChatService.createChat(new Date("2026-04-10T00:00:00.000Z"));

      expect(mongooseModels.GameChatModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: "2026-04-10T00:00:00.000Z",
          messages: [],
          moveLog: [],
        }),
      );

      const createArg = vi.mocked(mongooseModels.GameChatModel.create).mock.calls[0][0] as {
        _id: string;
      };
      expect(typeof createArg._id).toBe("string");

      expect(result).toEqual({
        chatId: createArg._id,
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        messages: [],
        moveLog: [],
      });
    });
    it("should throw if created chat cannot be found afterward", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "create").mockResolvedValue({} as never);
      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as never);

      await expect(
        gameChatService.createChat(new Date("2026-04-10T00:00:00.000Z")),
      ).rejects.toThrow(/Failed to find chat/);
    });
  });

  describe("forceChatById", () => {
    it("should throw if chat does not exist", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue(null);

      await expect(gameChatService.forceChatById("bad-chat", mockUser)).rejects.toThrow(
        "user jason accessed invalid chat id",
      );
    });

    it("should return populated chat if chat exists", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue({
        _id: "chat-1",
      } as never);
      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          createdAt: "2026-04-10T00:00:00.000Z",
          messages: [],
          moveLog: [],
        }),
      } as never);

      const result = await gameChatService.forceChatById("chat-1", mockUser);

      expect(result).toEqual({
        chatId: "chat-1",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        messages: [],
        moveLog: [],
      });
    });
  });

  describe("addMessageToChat", () => {
    it("should throw if chat does not exist", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue(null);

      await expect(gameChatService.addMessageToChat("bad-chat", mockUser, "msg-1")).rejects.toThrow(
        "user jason sent to invalid chat id",
      );
    });

    it("should add a message id and return updated chat", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue({
        _id: "chat-1",
      } as never);
      vi.spyOn(mongooseModels.GameChatModel, "findByIdAndUpdate").mockResolvedValue({} as never);
      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          createdAt: "2026-04-10T00:00:00.000Z",
          messages: [],
          moveLog: [],
        }),
      } as never);

      const result = await gameChatService.addMessageToChat("chat-1", mockUser, "msg-1");

      expect(mongooseModels.GameChatModel.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $push: { messages: "msg-1" },
      });
      expect(result.chatId).toBe("chat-1");
    });
  });

  describe("addMoveLogToChat", () => {
    it("should throw if chat does not exist", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue(null);

      await expect(
        gameChatService.addMoveLogToChat("bad-chat", "moved", mockUser, new Date()),
      ).rejects.toThrow("move log added to invalid chat id");
    });

    it("should add a move log entry and return payload", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "exists").mockResolvedValue({
        _id: "chat-1",
      } as never);
      vi.spyOn(mongooseModels.GameChatModel, "findByIdAndUpdate").mockResolvedValue({} as never);
      vi.spyOn(userService, "populateSafeUserInfo").mockResolvedValue({
        userId: "u1",
        username: "jason",
      } as never);

      const createdAt = new Date("2026-04-10T00:00:00.000Z");
      const result = await gameChatService.addMoveLogToChat(
        "chat-1",
        "Jason moved",
        mockUser,
        createdAt,
      );

      expect(mongooseModels.GameChatModel.findByIdAndUpdate).toHaveBeenCalledWith("chat-1", {
        $push: {
          moveLog: {
            moveDescription: "Jason moved",
            userId: "u1",
            createdAt: "2026-04-10T00:00:00.000Z",
          },
        },
      });

      expect(result).toEqual({
        chatId: "chat-1",
        moveDescription: "Jason moved",
        user: {
          userId: "u1",
          username: "jason",
        },
        createdAt,
      });
    });
  });

  describe("getMoveLog", () => {
    it("should return [] if chat does not exist", async () => {
      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as never);

      const result = await gameChatService.getMoveLog("missing");

      expect(result).toEqual([]);
    });

    it("should return move log entries if chat exists", async () => {
      const moveLog = [
        {
          moveDescription: "Jason moved",
          userId: "u1",
          createdAt: "2026-04-10T00:00:00.000Z",
        },
      ];

      vi.spyOn(mongooseModels.GameChatModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({ moveLog }),
      } as never);

      const result = await gameChatService.getMoveLog("chat-1");

      expect(result).toEqual(moveLog);
    });
  });

  describe("createMessage", () => {
    it("should create a message and return populated message info", async () => {
      vi.spyOn(mongooseModels.GameChatMessageModel, "create").mockResolvedValue({} as never);
      vi.spyOn(mongooseModels.GameChatMessageModel, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          text: "hello",
          createdAt: "2026-04-10T00:00:00.000Z",
          createdBy: "u1",
        }),
      } as never);
      vi.spyOn(userService, "populateSafeUserInfo").mockResolvedValue({
        userId: "u1",
        username: "jason",
      } as never);

      const result = await gameChatService.createMessage(
        mockUser,
        "hello",
        new Date("2026-04-10T00:00:00.000Z"),
      );

      expect(mongooseModels.GameChatMessageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "hello",
          createdAt: "2026-04-10T00:00:00.000Z",
          createdBy: "u1",
        }),
      );

      const createArg = vi.mocked(mongooseModels.GameChatMessageModel.create).mock.calls[0][0] as {
        _id: string;
      };
      expect(typeof createArg._id).toBe("string");

      expect(result).toEqual({
        messageId: createArg._id,
        text: "hello",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        createdBy: {
          userId: "u1",
          username: "jason",
        },
      });
    });
  });
});

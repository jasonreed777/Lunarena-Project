import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import type { GameServer, GameServerSocket, SocketData } from "../src/types.ts";
import { logSocketError } from "../src/controllers/socket.controller.ts";
import { socketJoin, socketSendMessage } from "../src/controllers/dm-chat-controller.ts";
import { createChat, sendMessage } from "../src/services/dm-chat.service.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { app } from "../src/app.ts";

vi.mock(import("../src/controllers/socket.controller.ts"), () => ({
  logSocketError: vi.fn(),
}));

const MockGameServer = vi.fn(
  class {
    to = vi.fn(() => this);
    emit = vi.fn();
  },
);

const MockGameServerSocket = vi.fn(
  class {
    id = "mockDMSocket";
    data = { user: null as never };
    join = vi.fn();
    emit = vi.fn();
    to = vi.fn(() => this);
  },
);

const mockServer = new MockGameServer() as unknown as GameServer;
const mockSocket = new MockGameServerSocket() as unknown as GameServerSocket;

afterEach(() => {
  vi.clearAllMocks();
  mockSocket.data = { user: null } as unknown as SocketData;
});

beforeEach(async () => {
  const user = await getUserByUsername("user1");
  if (user) {
    mockSocket.data = { user: { userId: user.userId, username: user.username } };
  }
});

// ─── socketJoin ────────────────────────────────────────────────────────────

describe("socketJoin", () => {
  it("should join a room keyed to the user's own userId", async () => {
    const user = await getUserByUsername("user1");
    await socketJoin(mockSocket, mockServer)(undefined);
    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockSocket.join).toHaveBeenCalledExactlyOnceWith(user!.userId);
  });
});

// ─── socketSendMessage ─────────────────────────────────────────────────────

describe("socketSendMessage", () => {
  it("should call logSocketError for an invalid request body", async () => {
    await socketSendMessage(mockSocket, mockServer)("not-a-valid-body");
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("should call logSocketError for a non-existent chat", async () => {
    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      chatId: "000000000000000000000000",
      text: "hello",
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("should call logSocketError when the sender is not a participant", async () => {
    const user2 = await getUserByUsername("user2");
    const user3 = await getUserByUsername("user3");
    // user1 (current socket user) is not in this chat
    const chat = await createChat([user2!.userId, user3!.userId]);

    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      chatId: chat._id.toString(),
      text: "hello",
    });
    expect(logSocketError).toHaveBeenCalledOnce();
  });

  it("should emit dmNewMessage to the other participant on success", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);

    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      chatId: chat._id.toString(),
      text: "hello",
    });

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.to).toHaveBeenCalledWith(user2!.userId);
    expect(mockServer.emit).toHaveBeenCalledWith(
      "dmNewMessage",
      expect.objectContaining({ chatId: chat._id.toString() }),
    );
  });

  it("should emit dmNewMessage to the sender too", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);

    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      chatId: chat._id.toString(),
      text: "hello",
    });

    expect(mockServer.to).toHaveBeenCalledWith(user1!.userId);
  });

  it("should emit with correct message text and sender info", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    const chat = await createChat([user1!.userId, user2!.userId]);

    await socketSendMessage(
      mockSocket,
      mockServer,
    )({
      chatId: chat._id.toString(),
      text: "hello world",
    });

    expect(logSocketError).not.toHaveBeenCalled();
    expect(mockServer.emit).toHaveBeenCalledWith(
      "dmNewMessage",
      expect.objectContaining({
        message: expect.objectContaining({
          text: "hello world",
          createdBy: expect.objectContaining({ username: "user1" }),
          messageId: expect.any(String),
          createdAt: expect.any(Date),
        }),
      }),
    );
  });
});

// ─── REST auth mock ────────────────────────────────────────────────────────

const testAuth = vi.hoisted(() => ({
  user: null as { userId: string; username: string } | null,
}));

vi.mock("../src/middleware/auth.middleware.ts", () => ({
  requireAuth: vi.fn((req: Request, res: ExpressResponse, next: NextFunction) => {
    if (!testAuth.user) {
      res.status(401).send({ error: "Not authenticated" });
      return;
    }
    req.authUser = testAuth.user;
    next();
  }),
}));

async function loginAs(username: string) {
  const u = await getUserByUsername(username);
  if (!u) throw new Error(`test user ${username} not found`);
  testAuth.user = { userId: u.userId, username: u.username };
}

function logout() {
  testAuth.user = null;
}

let response: Response;

// ─── POST /api/messages/createDM ──────────────────────────────────────────

describe("POST /api/messages/createDM", () => {
  beforeEach(() => logout());

  it("should 401 when not authenticated", async () => {
    response = await supertest(app)
      .post("/api/messages/createDM")
      .send({ payload: ["user2"] });
    expect(response.status).toBe(401);
  });

  it("should 400 for a malformed payload", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/messages/createDM").send({ payload: 999 });
    expect(response.status).toBe(400);
  });

  it("should 200 for a valid payload", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/messages/createDM")
      .send({ payload: ["user2"] });
    expect(response.status).toBe(200);
  });

  it("should 400 when creating a duplicate chat", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await createChat([user1!.userId, user2!.userId]);
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/messages/createDM")
      .send({ payload: [user2!.userId] });
    expect(response.status).toBe(400);
  });
});

// ─── POST /api/messages/getChatMessages ───────────────────────────────────

describe("POST /api/messages/getChatMessages", () => {
  beforeEach(() => logout());

  it("should 401 when not authenticated", async () => {
    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: "abc", pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(401);
  });

  it("should 400 for a malformed payload", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/messages/getChatMessages").send({ payload: "bad" });
    expect(response.status).toBe(400);
  });

  it("should 400 if the requesting user is not in the chat", async () => {
    await loginAs("user1");
    const user2 = await getUserByUsername("user2");
    const user3 = await getUserByUsername("user3");
    const chat = await createChat([user2!.userId, user3!.userId]);

    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(400);
  });

  it("should 400 for a non-existent chatId", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: "000000000000000000000000", pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(400);
  });

  it("should 200 with an empty array for a new chat with no messages", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await loginAs("user1");
    const chat = await createChat([user1!.userId, user2!.userId]);

    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return messages with correct text and sender info", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await loginAs("user1");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await sendMessage(user1!.userId, "first message", chat._id.toString());
    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      text: "first message",
      createdBy: expect.objectContaining({ username: "user1" }),
      messageId: expect.any(String),
    });
  });

  it("should return all messages for the chat", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await loginAs("user1");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await sendMessage(user1!.userId, "first", chat._id.toString());
    await sendMessage(user2!.userId, "second", chat._id.toString());
    await sendMessage(user1!.userId, "third", chat._id.toString());

    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 10, pageIndex: 0 } });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    const texts = (response.body as Array<{ text: string }>).map((m) => m.text);
    expect(texts).toContain("first");
    expect(texts).toContain("second");
    expect(texts).toContain("third");
  });

  it("should respect pageSize and only return that many messages", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await loginAs("user1");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await sendMessage(user1!.userId, "msg1", chat._id.toString());
    await sendMessage(user2!.userId, "msg2", chat._id.toString());
    await sendMessage(user1!.userId, "msg3", chat._id.toString());

    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 2, pageIndex: 0 } });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should return the next page of messages when pageIndex is 1", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await loginAs("user1");
    const chat = await createChat([user1!.userId, user2!.userId]);
    await sendMessage(user1!.userId, "msg1", chat._id.toString());
    await sendMessage(user2!.userId, "msg2", chat._id.toString());
    await sendMessage(user1!.userId, "msg3", chat._id.toString());

    response = await supertest(app)
      .post("/api/messages/getChatMessages")
      .send({ payload: { chatId: chat._id.toString(), pageSize: 2, pageIndex: 1 } });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(["msg1", "msg2", "msg3"]).toContain(response.body[0].text);
  });
});

// ─── GET /api/messages/getChatList ────────────────────────────────────────

describe("GET /api/messages/getChatList", () => {
  beforeEach(() => logout());

  it("should 401 when not authenticated", async () => {
    response = await supertest(app).get("/api/messages/getChatList");
    expect(response.status).toBe(401);
  });

  it("should 200 with an empty array when the user has no chats", async () => {
    await loginAs("user1");
    response = await supertest(app).get("/api/messages/getChatList");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return chats the user belongs to with participants and timestamps", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await createChat([user1!.userId, user2!.userId]);
    await loginAs("user1");
    response = await supertest(app).get("/api/messages/getChatList");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      chatId: expect.any(String),
      participants: expect.arrayContaining([
        expect.objectContaining({ username: "user1" }),
        expect.objectContaining({ username: "user2" }),
      ]),
      createdAt: expect.any(String),
      lastMessageAt: expect.any(String),
    });
  });

  it("should not return chats the user does not belong to", async () => {
    const user2 = await getUserByUsername("user2");
    const user3 = await getUserByUsername("user3");
    await createChat([user2!.userId, user3!.userId]);
    await loginAs("user1");
    response = await supertest(app).get("/api/messages/getChatList");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

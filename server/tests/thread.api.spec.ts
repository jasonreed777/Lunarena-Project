import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
import { randomUUID } from "node:crypto";
import { getUserByUsername } from "../src/services/auth.service.ts";

const testAuth = vi.hoisted(() => ({ user: null as { userId: string; username: string } | null }));

vi.mock("../src/middleware/auth.middleware.ts", () => ({
  requireAuth: vi.fn((req, res, next) => {
    if (!testAuth.user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      res.status(401).send({ error: "Not authenticated" });
      return;
    }
    req.authUser = testAuth.user;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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

beforeEach(() => logout());

describe("GET /api/thread/list", () => {
  it("should return all threads", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(5);
  });

  it("should return the most recent thread first", async () => {
    response = await supertest(app).get("/api/thread/list");
    expect(response.status).toBe(200);
    expect(response.body[0]).toStrictEqual({
      threadId: "abadcafeabadcafeabadcafe",
      comments: 0,
      createdAt: expect.anything(),
      title: "Nim?",
      createdBy: {
        createdAt: expect.anything(),
        display: "Yāo",
        username: "user1",
      },
    });
  });
});

describe("GET /api/thread/:id", () => {
  it("should return 404 on a bad id", async () => {
    response = await supertest(app).get(`/api/thread/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
  });

  it("should return existing ids", async () => {
    response = await supertest(app).get(`/api/thread/deadbeefdeadbeefdeadbeef`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: "deadbeefdeadbeefdeadbeef",
      title: "Hello game knights",
      text: "I'm a big Nim buff and am excited to join this community.",
      comments: [],
      createdBy: { username: "user1", display: "Yāo", createdAt: expect.anything() },
      createdAt: new Date("2025-04-02").toISOString(),
    });
  });
});

describe("POST /api/thread/create", () => {
  it("should return 400 on ill-formed payload", async () => {
    await loginAs("user1");
    response = await supertest(app).post(`/api/thread/create`).send({ auth1: {} });
    expect(response.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app)
      .post(`/api/thread/create`)
      .send({ payload: { title: "Evil title", text: "Evil contents" } });
    expect(response.status).toBe(401);
  });

  it("should succeed with correct information", async () => {
    await loginAs("user2");
    response = await supertest(app)
      .post(`/api/thread/create`)
      .send({ payload: { title: "Title", text: "Text" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      threadId: expect.anything(),
      title: "Title",
      text: "Text",
      createdAt: expect.anything(),
      createdBy: {
        username: "user2",
        display: expect.any(String),
        createdAt: expect.anything(),
      },
      comments: [],
    });
  });
});

describe("POST /api/thread/:id/comment", () => {
  it("should return 400 on on ill-formed payload", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ payload: 4 });
    expect(response.status).toBe(400);
  });

  it("should return 404 on a bad id", async () => {
    await loginAs("user2");
    response = await supertest(app)
      .post(`/api/thread/${randomUUID().toString()}/comment`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(404);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(401);
  });

  it("should succeed with correct information", async () => {
    await loginAs("user2");
    response = await supertest(app)
      .post(`/api/thread/deadbeefdeadbeefdeadbeef/comment`)
      .send({ payload: "FIRST!" });
    expect(response.status).toBe(200);
    expect(response.body?.comments).toStrictEqual([
      {
        commentId: expect.anything(),
        createdAt: expect.anything(),
        text: "FIRST!",
        createdBy: { username: "user2", display: "Sénior Dos", createdAt: expect.anything() },
      },
    ]);
  });
});

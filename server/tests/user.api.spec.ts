import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import { app } from "../src/app.ts";
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
const user1 = { username: "user1", display: "Yāo", profileBorderColor: "#8d8d8d" };
const user2 = { username: "user2", display: "Sénior Dos", profileBorderColor: "#8d8d8d" };

beforeEach(() => logout());

describe("GET /api/user/:id", () => {
  it("should 404 for nonexistent users", async () => {
    response = await supertest(app).get(`/api/user/${randomUUID().toString()}`);
    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({ error: "User not found" });
  });

  it("should return existing users", async () => {
    response = await supertest(app).get(`/api/user/user1`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ ...user1, createdAt: expect.anything() });

    response = await supertest(app).get(`/api/user/user2`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ ...user2, createdAt: expect.anything() });
  });
});

describe("POST/api/user/:username", () => {
  it("should return 400 on ill-formed payloads", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/user/user1").send({ payload: 4 });
    expect(response.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app)
      .post("/api/user/user1")
      .send({ payload: { display: "New User 1 Display?" } });
    expect(response.status).toBe(401);
  });

  it("requires the authorization to match the route", async () => {
    await loginAs("user2");
    response = await supertest(app)
      .post("/api/user/user1")
      .send({ payload: { display: "New User 1 Display!" } });
    expect(response.status).toBe(403);
  });

  it("should update individual parts of a user correctly", async () => {
    await loginAs("user1");

    // Change the display name
    response = await supertest(app)
      .post("/api/user/user1")
      .send({ payload: { display: "New User 1 Display" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      ...user1,
      display: "New User 1 Display",
      createdAt: expect.anything(),
    });

    // Change the display name again
    response = await supertest(app)
      .post("/api/user/user1")
      .send({ payload: { display: "New User 1 Display" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      ...user1,
      display: "New User 1 Display",
      createdAt: expect.anything(),
    });

    // TODO: re-enable once updateUser + better-auth password sync is verified
    // // Change the password
    // response = await supertest(app)
    //   .post("/api/user/user1")
    //   .send({ payload: { password: "new_password_1" } });
    // expect(response.status).toBe(200);

    // // We have changed the password, so old session should no longer work
    // response = await supertest(app)
    //   .post("/api/user/user1")
    //   .send({ payload: { password: "new_password_1" } });
    // expect(response.status).toBe(403);

    // // But signing in with the new password and changing display should work
    // await loginAs("user1"); // would need new password
    // response = await supertest(app)
    //   .post("/api/user/user1")
    //   .send({ payload: { display: "Newer User 1 Display" } });
    // expect(response.status).toBe(200);
    // expect(response.body).toStrictEqual({
    //   ...user1,
    //   display: "Newer User 1 Display",
    //   createdAt: expect.anything(),
    // });
  });
});

describe("POST /api/user/list", () => {
  it("should return 400 on ill-formed payload", async () => {
    response = await supertest(app).post("/api/user/list").send({ username: "user1" });
    expect(response.status).toBe(400);
  });

  it("should indicate an error if usernames do not exist", async () => {
    response = await supertest(app).post("/api/user/list").send(["user1", randomUUID().toString()]);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ error: "Usernames do not all exist" });
  });

  it("accepts the empty list", async () => {
    response = await supertest(app).post("/api/user/list").send([]);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual([]);
  });

  it("accepts valid usernames and returns appropriate responses", async () => {
    response = await supertest(app).post("/api/user/list").send(["user2", "user1"]);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual([
      { ...user2, createdAt: expect.anything() },
      { ...user1, createdAt: expect.anything() },
    ]);
  });

  it("accepts duplicates and returns users in the order provided", async () => {
    response = await supertest(app).post("/api/user/list").send(["user1", "user2", "user1"]);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual([
      { ...user1, createdAt: expect.anything() },
      { ...user2, createdAt: expect.anything() },
      { ...user1, createdAt: expect.anything() },
    ]);
  });
});

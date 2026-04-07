import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";
import { createNotification } from "../src/services/notification.service.ts";
import { emitNotification } from "../src/controllers/notification.controller.ts";
import type { GameServer } from "../src/types.ts";

const testAuth = vi.hoisted(() => ({ user: null as { userId: string; username: string } | null }));

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

beforeEach(() => logout());

describe("GET /api/notifications/", () => {
  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(401);
  });

  it("should return 200 with an empty array when user has no notifications", async () => {
    await loginAs("user1");
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return notifications for the authenticated user after creation", async () => {
    const user1 = await getUserByUsername("user1");
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "New Message",
      message: "Hello from user2",
    });

    await loginAs("user1");
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      type: "DM",
      header: "New Message",
      message: "Hello from user2",
    });
    expect(response.body[0]).toHaveProperty("notificationId");
    expect(response.body[0]).toHaveProperty("sentAt");
  });

  it("should not return notifications belonging to other users", async () => {
    const user2 = await getUserByUsername("user2");
    await createNotification({
      userId: user2!.userId,
      type: "DM",
      header: "For user2",
      message: "This is for user2 only",
    });

    await loginAs("user1");
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("DELETE /api/notifications/", () => {
  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).delete("/api/notifications/");
    expect(response.status).toBe(401);
  });

  it("should delete all notifications for the authenticated user", async () => {
    const user1 = await getUserByUsername("user1");
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "Msg 1",
      message: "Hello",
    });
    await createNotification({
      userId: user1!.userId,
      type: "Achievement",
      header: "Achievement",
      message: "You earned it",
    });

    await loginAs("user1");
    response = await supertest(app).delete("/api/notifications/");
    expect(response.status).toBe(200);

    // Verify they're gone
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should not affect notifications belonging to other users", async () => {
    const user1 = await getUserByUsername("user1");
    const user2 = await getUserByUsername("user2");
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "For user1",
      message: "msg",
    });
    await createNotification({
      userId: user2!.userId,
      type: "DM",
      header: "For user2",
      message: "msg",
    });

    // Delete user1's notifications
    await loginAs("user1");
    await supertest(app).delete("/api/notifications/");

    // User2's should still exist
    await loginAs("user2");
    response = await supertest(app).get("/api/notifications/");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ header: "For user2" });
  });
});

describe("DELETE /api/notifications/:id", () => {
  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).delete("/api/notifications/someid");
    expect(response.status).toBe(401);
  });

  it("should delete a specific notification", async () => {
    const user1 = await getUserByUsername("user1");
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "Msg 1",
      message: "Hello 1",
    });
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "Msg 2",
      message: "Hello 2",
    });

    await loginAs("user1");
    response = await supertest(app).get("/api/notifications/");
    expect(response.body).toHaveLength(2);

    const idToDelete = response.body[0].notificationId;
    response = await supertest(app).delete(`/api/notifications/${idToDelete}`);
    expect(response.status).toBe(200);

    // Verify only one remains
    response = await supertest(app).get("/api/notifications/");
    expect(response.body).toHaveLength(1);
  });

  it("should return 403 when deleting another user's notification", async () => {
    const user1 = await getUserByUsername("user1");
    await createNotification({
      userId: user1!.userId,
      type: "DM",
      header: "Private",
      message: "For user1 only",
    });

    // Get user1's notification ID
    await loginAs("user1");
    response = await supertest(app).get("/api/notifications/");
    const notifId = response.body[0].notificationId;

    // Try to delete as user2
    await loginAs("user2");
    response = await supertest(app).delete(`/api/notifications/${notifId}`);
    expect(response.status).toBe(403);
  });

  it("should return 403 for nonexistent notification id", async () => {
    await loginAs("user1");
    response = await supertest(app).delete("/api/notifications/000000000000000000000000");
    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/notifications/ with deleted user", () => {
  it("should return 400 when the authenticated userId no longer exists in the DB", async () => {
    testAuth.user = { userId: "000000000000000000000000", username: "ghost" };
    response = await supertest(app).delete("/api/notifications/");
    expect(response.status).toBe(400);
  });
});

describe("createNotification (service)", () => {
  it("should return success: false when the userId does not exist", async () => {
    const result = await createNotification({
      userId: "000000000000000000000000",
      type: "DM",
      header: "test",
      message: "test",
    });
    expect(result.success).toBe(false);
  });
});

describe("emitNotification", () => {
  it("should not emit when the userId does not exist in the DB", async () => {
    const mockEmit = vi.fn();
    const mockIo = { to: vi.fn(() => ({ emit: mockEmit })) } as unknown as GameServer;
    await emitNotification(mockIo, "000000000000000000000000", "DM", "test", "test");
    expect(mockEmit).not.toHaveBeenCalled();
  });
});

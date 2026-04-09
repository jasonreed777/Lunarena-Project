import { randomUUID } from "node:crypto";
import { describe, expect, it, beforeEach, vi } from "vitest";
import supertest, { type Response } from "supertest";
import type { Request, Response as ExpressResponse, NextFunction } from "express";
import { app } from "../src/app.ts";
import { getUserByUsername } from "../src/services/auth.service.ts";

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

interface FriendEntry {
  friendshipId: string;
  friend: { username: string; display: string };
  since: string;
}

interface RequestEntry {
  friendshipId: string;
  user: { username: string };
  createdAt: string;
}

beforeEach(() => logout());

describe("POST /api/friends/list", () => {
  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).post("/api/friends/list").send({});
    expect(response.status).toBe(401);
  });

  it("should return friends list for authenticated user", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/friends/list").send({});
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return friends with correct structure", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/friends/list").send({});
    expect(response.status).toBe(200);

    const friends = response.body as FriendEntry[];
    const user2Friend = friends.find((f) => f.friend.username === "user2");
    if (user2Friend) {
      expect(user2Friend).toHaveProperty("friendshipId");
      expect(user2Friend).toHaveProperty("friend");
      expect(user2Friend).toHaveProperty("since");
      expect(user2Friend.friend).toHaveProperty("username");
      expect(user2Friend.friend).toHaveProperty("display");
    }
  });

  it("should show friendship from both participants' perspectives", async () => {
    await loginAs("user1");
    const user1Friends = await supertest(app).post("/api/friends/list").send({});

    await loginAs("user2");
    const user2Friends = await supertest(app).post("/api/friends/list").send({});

    expect(user1Friends.status).toBe(200);
    expect(user2Friends.status).toBe(200);

    const user1SeesUser2 = (user1Friends.body as FriendEntry[]).find(
      (f) => f.friend.username === "user2",
    );
    const user2SeesUser1 = (user2Friends.body as FriendEntry[]).find(
      (f) => f.friend.username === "user1",
    );

    expect(user1SeesUser2).toBeDefined();
    expect(user2SeesUser1).toBeDefined();

    expect(user1SeesUser2?.friendshipId).toBe(user2SeesUser1?.friendshipId);
  });
});

describe("POST /api/friends/requests", () => {
  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).post("/api/friends/requests").send({});
    expect(response.status).toBe(401);
  });

  it("should return incoming and outgoing requests", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/friends/requests").send({});
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("incoming");
    expect(response.body).toHaveProperty("outgoing");
    expect(Array.isArray(response.body.incoming)).toBe(true);
    expect(Array.isArray(response.body.outgoing)).toBe(true);
  });

  it("should show pending request from user3 in user1 incoming", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/friends/requests").send({});
    expect(response.status).toBe(200);

    const incoming = response.body.incoming as RequestEntry[];
    const fromUser3 = incoming.find((r) => r.user.username === "user3");
    expect(fromUser3).toBeDefined();
    expect(fromUser3).toHaveProperty("friendshipId");
    expect(fromUser3).toHaveProperty("createdAt");
  });
});

describe("POST /api/friends/request", () => {
  it("should return 400 on ill-formed payload", async () => {
    await loginAs("user1");
    response = await supertest(app).post("/api/friends/request").send({});
    expect(response.status).toBe(400);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app)
      .post("/api/friends/request")
      .send({ payload: { receiverUsername: "user2" } });
    expect(response.status).toBe(401);
  });

  it("should not allow sending friend request to yourself", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/friends/request")
      .send({ payload: { receiverUsername: "user1" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ error: "Cannot send friend request to yourself" });
  });

  it("should return error for non-existent user", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/friends/request")
      .send({ payload: { receiverUsername: randomUUID().toString() } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ error: "User not found" });
  });

  it("should return error when already friends", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post("/api/friends/request")
      .send({ payload: { receiverUsername: "user2" } });
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ error: "Already friends with this user" });
  });
});

describe("POST /api/friends/:id/respond", () => {
  it("should return 404 for non-existent friendship", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post(`/api/friends/${randomUUID().toString()}/respond`)
      .send({ payload: { action: "accept" } });
    expect(response.status).toBe(404);
  });

  it("should return 400 on ill-formed payload", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post(`/api/friends/${randomUUID().toString()}/respond`)
      .send({});
    expect(response.status).toBe(400);
  });

  it("should return 400 on invalid action", async () => {
    await loginAs("user1");
    response = await supertest(app)
      .post(`/api/friends/${randomUUID().toString()}/respond`)
      .send({ payload: { action: "invalid" } });
    expect(response.status).toBe(400);
  });

  it("should allow receiver to accept pending request", async () => {
    await loginAs("user1");
    const requestsRes = await supertest(app).post("/api/friends/requests").send({});

    const incoming = requestsRes.body.incoming as RequestEntry[];
    const fromUser3 = incoming.find((r) => r.user.username === "user3");

    if (fromUser3) {
      response = await supertest(app)
        .post(`/api/friends/${fromUser3.friendshipId}/respond`)
        .send({ payload: { action: "accept" } });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("accepted");
    }
  });

  it("should not allow sender to respond to their own request", async () => {
    await loginAs("user3");
    const requestsRes = await supertest(app).post("/api/friends/requests").send({});

    if (requestsRes.body.outgoing.length > 0) {
      const outgoingRequest = requestsRes.body.outgoing[0];
      response = await supertest(app)
        .post(`/api/friends/${outgoingRequest.friendshipId}/respond`)
        .send({ payload: { action: "accept" } });
      expect(response.status).toBe(200);
      expect(response.body.error).toBe("Not authorized to respond to this request");
    }
  });
});

describe("DELETE /api/friends/:id", () => {
  it("should return 404 for non-existent friendship", async () => {
    await loginAs("user1");
    response = await supertest(app).delete(`/api/friends/${randomUUID().toString()}`).send({});
    expect(response.status).toBe(404);
  });

  it("should return 401 when not authenticated", async () => {
    response = await supertest(app).delete(`/api/friends/${randomUUID().toString()}`).send({});
    expect(response.status).toBe(401);
  });

  it("should allow participant to remove friendship and affect both sides", async () => {
    await loginAs("user1");
    const friendsRes = await supertest(app).post("/api/friends/list").send({});

    const friends = friendsRes.body as FriendEntry[];
    const user2Friend = friends.find((f) => f.friend.username === "user2");

    if (user2Friend) {
      response = await supertest(app).delete(`/api/friends/${user2Friend.friendshipId}`).send({});
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({ success: true });

      const user1FriendsAfter = await supertest(app).post("/api/friends/list").send({});
      const user1StillFriends = (user1FriendsAfter.body as FriendEntry[]).find(
        (f) => f.friend.username === "user2",
      );
      expect(user1StillFriends).toBeUndefined();

      await loginAs("user2");
      const user2FriendsAfter = await supertest(app).post("/api/friends/list").send({});
      const user2StillFriends = (user2FriendsAfter.body as FriendEntry[]).find(
        (f) => f.friend.username === "user1",
      );
      expect(user2StillFriends).toBeUndefined();
    }
  });

  it("should allow either participant to remove friendship", async () => {
    // Create friendship: user0 sends request, user2 accepts
    await loginAs("user0");
    const requestRes = await supertest(app)
      .post("/api/friends/request")
      .send({ payload: { receiverUsername: "user2" } });

    if (requestRes.body.friendshipId) {
      await loginAs("user2");
      await supertest(app)
        .post(`/api/friends/${requestRes.body.friendshipId}/respond`)
        .send({ payload: { action: "accept" } });
    }

    await loginAs("user2");
    const user2Friends = await supertest(app).post("/api/friends/list").send({});

    const user0Friend = (user2Friends.body as FriendEntry[]).find(
      (f) => f.friend.username === "user0",
    );

    if (user0Friend) {
      // user2 (the receiver, not original requester) removes the friendship
      response = await supertest(app).delete(`/api/friends/${user0Friend.friendshipId}`).send({});
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({ success: true });

      await loginAs("user0");
      const user0FriendsAfter = await supertest(app).post("/api/friends/list").send({});
      const user0StillFriends = (user0FriendsAfter.body as FriendEntry[]).find(
        (f) => f.friend.username === "user2",
      );
      expect(user0StillFriends).toBeUndefined();

      await loginAs("user2");
      const user2FriendsAfter = await supertest(app).post("/api/friends/list").send({});
      const user2StillFriends = (user2FriendsAfter.body as FriendEntry[]).find(
        (f) => f.friend.username === "user0",
      );
      expect(user2StillFriends).toBeUndefined();
    }
  });

  it("should not allow non-participant to remove friendship", async () => {
    await loginAs("user1");
    const friendsRes = await supertest(app).post("/api/friends/list").send({});

    const anyFriend = friendsRes.body[0];

    if (anyFriend) {
      await loginAs("user0");
      response = await supertest(app).delete(`/api/friends/${anyFriend.friendshipId}`).send({});
      expect(response.status).toBe(200);
      expect(response.body.error).toBe("Not authorized to remove this friendship");
    }
  });
});

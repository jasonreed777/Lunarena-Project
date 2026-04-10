import { describe, it, expect, beforeEach } from "vitest";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "../../src/services/friendship.service.ts";
import { FriendshipModel } from "../../src/mongoose-models.ts";
import type { UserWithId } from "../../src/types.ts";

let user0: UserWithId;
let user1: UserWithId;
let user2: UserWithId;
let user3: UserWithId;

beforeEach(async () => {
  const u0 = await getUserByUsername("user0");
  const u1 = await getUserByUsername("user1");
  const u2 = await getUserByUsername("user2");
  const u3 = await getUserByUsername("user3");
  user0 = { userId: u0!.userId, username: u0!.username };
  user1 = { userId: u1!.userId, username: u1!.username };
  user2 = { userId: u2!.userId, username: u2!.username };
  user3 = { userId: u3!.userId, username: u3!.username };
});

describe("getFriendsList", () => {
  it("should return user2 as a friend of user1", async () => {
    const friends = await getFriendsList(user1.userId);
    expect(friends).toHaveLength(1);
    expect(friends[0].friend.username).toBe("user2");
    expect(friends[0].friendshipId).toBeDefined();
    expect(friends[0].since).toBeInstanceOf(Date);
  });

  it("should return user1 as a friend of user2", async () => {
    const friends = await getFriendsList(user2.userId);
    expect(friends).toHaveLength(1);
    expect(friends[0].friend.username).toBe("user1");
  });

  it("should return an empty list for user0 (no accepted friends)", async () => {
    const friends = await getFriendsList(user0.userId);
    expect(friends).toHaveLength(0);
  });

  it("should return an empty list for user3 (only has pending request)", async () => {
    const friends = await getFriendsList(user3.userId);
    expect(friends).toHaveLength(0);
  });
});

describe("getIncomingFriendRequests", () => {
  it("should return user3's pending request for user1", async () => {
    const incoming = await getIncomingFriendRequests(user1.userId);
    expect(incoming).toHaveLength(1);
    expect(incoming[0].user.username).toBe("user3");
    expect(incoming[0].friendshipId).toBeDefined();
    expect(incoming[0].createdAt).toBeInstanceOf(Date);
  });

  it("should return an empty list for user0 (no incoming pending requests)", async () => {
    const incoming = await getIncomingFriendRequests(user0.userId);
    expect(incoming).toHaveLength(0);
  });

  it("should return an empty list for user3 (user3 is the sender, not receiver)", async () => {
    const incoming = await getIncomingFriendRequests(user3.userId);
    expect(incoming).toHaveLength(0);
  });
});

describe("getOutgoingFriendRequests", () => {
  it("should return user3's outgoing pending request to user1", async () => {
    const outgoing = await getOutgoingFriendRequests(user3.userId);
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].user.username).toBe("user1");
    expect(outgoing[0].friendshipId).toBeDefined();
    expect(outgoing[0].createdAt).toBeInstanceOf(Date);
  });

  it("should return an empty list for user0 (no outgoing pending requests)", async () => {
    const outgoing = await getOutgoingFriendRequests(user0.userId);
    expect(outgoing).toHaveLength(0);
  });

  it("should return an empty list for user1 (user1 is receiver, not sender)", async () => {
    const outgoing = await getOutgoingFriendRequests(user1.userId);
    expect(outgoing).toHaveLength(0);
  });
});

describe("sendFriendRequest", () => {
  it("should return error when sending a request to yourself", async () => {
    const result = await sendFriendRequest(user0, "user0", new Date());
    expect(result).toEqual({ error: "Cannot send friend request to yourself" });
  });

  it("should return error when receiver username does not exist", async () => {
    const result = await sendFriendRequest(user0, "nonexistentuser", new Date());
    expect(result).toEqual({ error: "User not found" });
  });

  it("should return error when users are already friends (user1 -> user2)", async () => {
    const result = await sendFriendRequest(user1, "user2", new Date());
    expect(result).toEqual({ error: "Already friends with this user" });
  });

  it("should return error when users are already friends (user2 -> user1, reverse direction)", async () => {
    const result = await sendFriendRequest(user2, "user1", new Date());
    expect(result).toEqual({ error: "Already friends with this user" });
  });

  it("should return error when friend request is already pending (user3 -> user1 again)", async () => {
    const result = await sendFriendRequest(user3, "user1", new Date());
    expect(result).toEqual({ error: "Friend request already pending" });
  });

  it("should auto-accept when receiver has a pending request to sender (mutual request)", async () => {
    // user3 has a pending request to user1. user1 now sends to user3 -> auto-accept.
    const now = new Date();
    const result = await sendFriendRequest(user1, "user3", now);

    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "accepted");
    expect(result).toHaveProperty("friendshipId");

    // Verify the friendship is now accepted in the database
    const friends = await getFriendsList(user1.userId);
    const user3Friend = friends.find((f) => f.friend.username === "user3");
    expect(user3Friend).toBeDefined();

    // user3 should also see user1 as a friend
    const user3Friends = await getFriendsList(user3.userId);
    const user1Friend = user3Friends.find((f) => f.friend.username === "user1");
    expect(user1Friend).toBeDefined();
  });

  it("should return error when the other user has blocked the sender", async () => {
    // Create a blocked friendship: user1 blocked user0
    await FriendshipModel.create({
      senderId: user0.userId,
      receiverId: user1.userId,
      status: "blocked",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Clean up any other friendships between user0 and user1 to isolate test
    // (The created one above is the only one between them since seed has none)

    // user0 tries to send to user1 (user0 is the sender in the record, receiverId is user1)
    // Since receiverId === user1 !== user0 (sender.userId), the code checks:
    // existingFriendship.receiverId === sender.userId? No (user1 !== user0).
    // So it goes to "We blocked the other user" branch.
    const result = await sendFriendRequest(user0, "user1", new Date());
    expect(result).toHaveProperty("error");
  });

  it("should return error when sender is blocked by the receiver", async () => {
    // Create a blocked friendship where user1 blocked user0 (user0 sent, user1 received and blocked)
    await FriendshipModel.create({
      senderId: user0.userId,
      receiverId: user1.userId,
      status: "blocked",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // user1 tries to send to user0 - user1 is the sender of the new request,
    // existing record has senderId=user0, receiverId=user1
    // existingFriendship.receiverId (user1) === sender.userId (user1) -> true
    // "The other user blocked us" -> "Cannot send friend request to this user"
    const result = await sendFriendRequest(user1, "user0", new Date());
    expect(result).toEqual({ error: "Cannot send friend request to this user" });
  });

  it("should update existing rejected friendship to pending when resending (user0 -> user2)", async () => {
    // Seeded data: user2 -> user0 was rejected
    // user0 sends to user2 -> should update the existing rejected record to pending
    const now = new Date();
    const result = await sendFriendRequest(user0, "user2", now);

    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "pending");
    expect(result).toHaveProperty("friendshipId");

    // Verify the request shows up as outgoing for user0
    const outgoing = await getOutgoingFriendRequests(user0.userId);
    const toUser2 = outgoing.find((r) => r.user.username === "user2");
    expect(toUser2).toBeDefined();
  });

  it("should create a new pending friendship for a brand-new request (user0 -> user3)", async () => {
    const now = new Date();
    const result = await sendFriendRequest(user0, "user3", now);

    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "pending");
    expect(result).toHaveProperty("friendshipId");

    // The sender and receiver should be populated correctly
    const info = result as { sender: { username: string }; receiver: { username: string } };
    expect(info.sender.username).toBe("user0");
    expect(info.receiver.username).toBe("user3");

    // Verify via outgoing requests
    const outgoing = await getOutgoingFriendRequests(user0.userId);
    const toUser3 = outgoing.find((r) => r.user.username === "user3");
    expect(toUser3).toBeDefined();

    // Verify via incoming requests for user3
    const incoming = await getIncomingFriendRequests(user3.userId);
    const fromUser0 = incoming.find((r) => r.user.username === "user0");
    expect(fromUser0).toBeDefined();
  });
});

describe("respondToFriendRequest", () => {
  it("should return null when friendship ID does not exist", async () => {
    const result = await respondToFriendRequest(user1, "nonexistent-id", "accept");
    expect(result).toBeNull();
  });

  it("should return error when user is not the receiver", async () => {
    // user3 -> user1 is a pending request. user3 (the sender) tries to respond.
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();
    expect(pending).not.toBeNull();

    const result = await respondToFriendRequest(user3, pending!._id, "accept");
    expect(result).toEqual({ error: "Not authorized to respond to this request" });
  });

  it("should return error when a non-participant tries to respond", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    const result = await respondToFriendRequest(user0, pending!._id, "accept");
    expect(result).toEqual({ error: "Not authorized to respond to this request" });
  });

  it("should accept a pending friend request", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    const result = await respondToFriendRequest(user1, pending!._id, "accept");
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "accepted");

    // Verify they are now friends
    const friends = await getFriendsList(user1.userId);
    const user3Friend = friends.find((f) => f.friend.username === "user3");
    expect(user3Friend).toBeDefined();
  });

  it("should reject a pending friend request", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    const result = await respondToFriendRequest(user1, pending!._id, "reject");
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "rejected");

    // Verify they are not friends
    const friends = await getFriendsList(user1.userId);
    const user3Friend = friends.find((f) => f.friend.username === "user3");
    expect(user3Friend).toBeUndefined();

    // Verify no longer in incoming requests
    const incoming = await getIncomingFriendRequests(user1.userId);
    expect(incoming.find((r) => r.user.username === "user3")).toBeUndefined();
  });

  it("should block a pending friend request", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    const result = await respondToFriendRequest(user1, pending!._id, "block");
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("error");
    expect(result).toHaveProperty("status", "blocked");

    // Verify they are not friends
    const friends = await getFriendsList(user1.userId);
    const user3Friend = friends.find((f) => f.friend.username === "user3");
    expect(user3Friend).toBeUndefined();

    // Verify the record is blocked in the database
    const doc = await FriendshipModel.findById(pending!._id).lean();
    expect(doc!.status).toBe("blocked");
  });

  it("should return error when request has already been processed (accepted)", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    // First, accept
    await respondToFriendRequest(user1, pending!._id, "accept");

    // Then try to respond again
    const result = await respondToFriendRequest(user1, pending!._id, "reject");
    expect(result).toEqual({ error: "This request has already been processed" });
  });

  it("should return error when request has already been processed (rejected)", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    // Reject first
    await respondToFriendRequest(user1, pending!._id, "reject");

    // Try to respond again
    const result = await respondToFriendRequest(user1, pending!._id, "accept");
    expect(result).toEqual({ error: "This request has already been processed" });
  });

  it("should return error when responding to an already-accepted friendship (seeded)", async () => {
    // The user1 <-> user2 friendship is already accepted
    const accepted = await FriendshipModel.findOne({
      senderId: user1.userId,
      receiverId: user2.userId,
      status: "accepted",
    }).lean();

    const result = await respondToFriendRequest(user2, accepted!._id, "reject");
    expect(result).toEqual({ error: "This request has already been processed" });
  });
});

describe("removeFriend", () => {
  it("should return null when friendship ID does not exist", async () => {
    const result = await removeFriend(user0, "nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return error when user is not a participant", async () => {
    const friendship = await FriendshipModel.findOne({
      senderId: user1.userId,
      receiverId: user2.userId,
      status: "accepted",
    }).lean();

    const result = await removeFriend(user0, friendship!._id);
    expect(result).toEqual({ error: "Not authorized to remove this friendship" });
  });

  it("should allow the sender to remove the friendship", async () => {
    const friendship = await FriendshipModel.findOne({
      senderId: user1.userId,
      receiverId: user2.userId,
      status: "accepted",
    }).lean();

    const result = await removeFriend(user1, friendship!._id);
    expect(result).toEqual({ success: true });

    // Verify the friendship is deleted
    const doc = await FriendshipModel.findById(friendship!._id).lean();
    expect(doc).toBeNull();

    // Verify they are no longer friends
    const friends = await getFriendsList(user1.userId);
    expect(friends).toHaveLength(0);
  });

  it("should allow the receiver to remove the friendship", async () => {
    const friendship = await FriendshipModel.findOne({
      senderId: user1.userId,
      receiverId: user2.userId,
      status: "accepted",
    }).lean();

    const result = await removeFriend(user2, friendship!._id);
    expect(result).toEqual({ success: true });

    // Verify the friendship is deleted
    const doc = await FriendshipModel.findById(friendship!._id).lean();
    expect(doc).toBeNull();

    // Verify both sides see no friends
    const user1Friends = await getFriendsList(user1.userId);
    expect(user1Friends.find((f) => f.friend.username === "user2")).toBeUndefined();

    const user2Friends = await getFriendsList(user2.userId);
    expect(user2Friends.find((f) => f.friend.username === "user1")).toBeUndefined();
  });

  it("should also work for removing a pending request", async () => {
    const pending = await FriendshipModel.findOne({
      senderId: user3.userId,
      receiverId: user1.userId,
      status: "pending",
    }).lean();

    const result = await removeFriend(user3, pending!._id);
    expect(result).toEqual({ success: true });

    // Verify it no longer appears in outgoing
    const outgoing = await getOutgoingFriendRequests(user3.userId);
    expect(outgoing).toHaveLength(0);

    // Verify it no longer appears in incoming
    const incoming = await getIncomingFriendRequests(user1.userId);
    expect(incoming.find((r) => r.user.username === "user3")).toBeUndefined();
  });
});

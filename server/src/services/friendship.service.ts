import { randomUUID } from "node:crypto";
import { type FriendInfo, type FriendRequestInfo, type FriendshipInfo } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import { FriendshipModel, UserModel } from "../mongoose-models.ts";

/**
 * Expand a stored friendship to FriendshipInfo
 */
async function populateFriendshipInfo(friendshipId: string): Promise<FriendshipInfo> {
  const doc = await FriendshipModel.findById(friendshipId).lean();
  if (!doc) throw new Error(`Failed to find friendship ${friendshipId}`);
  return {
    friendshipId,
    sender: await populateSafeUserInfo(doc.senderId),
    receiver: await populateSafeUserInfo(doc.receiverId),
    status: doc.status,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

/**
 * Get all accepted friends for a user
 * @param userId - The user's ID
 * @returns List of FriendInfo objects
 */
export async function getFriendsList(userId: string): Promise<FriendInfo[]> {
  const docs = await FriendshipModel.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
    status: "accepted",
  }).lean();

  return Promise.all(
    docs.map(async (doc) => {
      const friendId = doc.senderId === userId ? doc.receiverId : doc.senderId;
      return {
        friendshipId: doc._id,
        friend: await populateSafeUserInfo(friendId),
        since: new Date(doc.createdAt),
      };
    }),
  );
}

/**
 * Get pending friend requests received by a user
 * @param userId - The user's ID
 * @returns List of incoming FriendRequestInfo objects
 */
export async function getIncomingFriendRequests(userId: string): Promise<FriendRequestInfo[]> {
  const docs = await FriendshipModel.find({
    receiverId: userId,
    status: "pending",
  }).lean();

  return Promise.all(
    docs.map(async (doc) => ({
      friendshipId: doc._id,
      user: await populateSafeUserInfo(doc.senderId),
      createdAt: new Date(doc.createdAt),
    })),
  );
}

/**
 * Get pending friend requests sent by a user
 * @param userId - The user's ID
 * @returns List of outgoing FriendRequestInfo objects
 */
export async function getOutgoingFriendRequests(userId: string): Promise<FriendRequestInfo[]> {
  const docs = await FriendshipModel.find({
    senderId: userId,
    status: "pending",
  }).lean();

  return Promise.all(
    docs.map(async (doc) => ({
      friendshipId: doc._id,
      user: await populateSafeUserInfo(doc.receiverId),
      createdAt: new Date(doc.createdAt),
    })),
  );
}

/**
 * Send a friend request
 * @param sender - The user sending the request
 * @param receiverUsername - Username of the receiver
 * @param createdAt - When the request is created
 * @returns The created FriendshipInfo or error message
 */
export async function sendFriendRequest(
  sender: UserWithId,
  receiverUsername: string,
  createdAt: Date,
): Promise<FriendshipInfo | { error: string }> {
  // Check if trying to friend yourself
  if (sender.username === receiverUsername) {
    return { error: "Cannot send friend request to yourself" };
  }

  // Find receiver by username
  const receiverUser = await UserModel.findOne({ username: receiverUsername }).lean();
  if (!receiverUser) {
    return { error: "User not found" };
  }
  const receiverId = receiverUser._id;

  // Check for existing friendship/request (in either direction)
  const existingFriendship = await FriendshipModel.findOne({
    $or: [
      { senderId: sender.userId, receiverId: receiverId },
      { senderId: receiverId, receiverId: sender.userId },
    ],
  }).lean();

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      return { error: "Already friends with this user" };
    }
    if (existingFriendship.status === "blocked") {
      // Check if the sender is blocked or if they blocked the other user
      if (existingFriendship.receiverId === sender.userId) {
        // The other user blocked us
        return { error: "Cannot send friend request to this user" };
      }
      // We blocked the other user - allow unblocking by deleting and creating new request
      return { error: "You have blocked this user" };
    }
    if (existingFriendship.status === "pending") {
      // If they sent us a request, auto-accept
      if (existingFriendship.senderId === receiverId) {
        await FriendshipModel.findByIdAndUpdate(existingFriendship._id, {
          status: "accepted",
          updatedAt: createdAt.toISOString(),
        });
        return populateFriendshipInfo(existingFriendship._id);
      }
      return { error: "Friend request already pending" };
    }
    if (existingFriendship.status === "rejected") {
      // Allow resending if previously rejected, update existing record
      await FriendshipModel.findByIdAndUpdate(existingFriendship._id, {
        status: "pending",
        senderId: sender.userId,
        receiverId: receiverId,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
      return populateFriendshipInfo(existingFriendship._id);
    }
  }

  // Create new friendship request
  const now = createdAt.toISOString();
  const friendship = await FriendshipModel.create({
    senderId: sender.userId,
    receiverId: receiverId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  return populateFriendshipInfo(friendship._id);
}

/**
 * Respond to a friend request (accept, reject, or block)
 * @param user - The user responding (must be the receiver)
 * @param friendshipId - The friendship request ID
 * @param action - "accept", "reject", or "block"
 * @returns Updated FriendshipInfo or error/null
 */
export async function respondToFriendRequest(
  user: UserWithId,
  friendshipId: string,
  action: "accept" | "reject" | "block",
): Promise<FriendshipInfo | { error: string } | null> {
  const friendship = await FriendshipModel.findById(friendshipId).lean();
  if (!friendship) {
    return null; // 404
  }

  // Only the receiver can respond
  if (friendship.receiverId !== user.userId) {
    return { error: "Not authorized to respond to this request" };
  }

  // Can only respond to pending requests
  if (friendship.status !== "pending") {
    return { error: "This request has already been processed" };
  }

  const newStatus = action === "accept" ? "accepted" : action === "block" ? "blocked" : "rejected";
  await FriendshipModel.findByIdAndUpdate(friendshipId, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });

  return populateFriendshipInfo(friendshipId);
}

/**
 * Remove a friend (delete the friendship record)
 * @param user - The user removing the friend
 * @param friendshipId - The friendship ID to remove
 * @returns true if successful, error message, or null if not found
 */
export async function removeFriend(
  user: UserWithId,
  friendshipId: string,
): Promise<{ success: true } | { error: string } | null> {
  const friendship = await FriendshipModel.findById(friendshipId).lean();
  if (!friendship) {
    return null; // 404
  }

  // Only participants can remove friendship
  if (friendship.senderId !== user.userId && friendship.receiverId !== user.userId) {
    return { error: "Not authorized to remove this friendship" };
  }

  await FriendshipModel.findByIdAndDelete(friendshipId);
  return { success: true };
}

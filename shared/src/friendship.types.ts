import { z } from "zod";
import { type SafeUserInfo } from "./user.types.ts";

/**
 * Possible states for a friendship record
 */
export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";

/**
 * Represents a friendship as exposed to the client.
 */
export interface FriendshipInfo {
  friendshipId: string;
  sender: SafeUserInfo;
  receiver: SafeUserInfo;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a friend (accepted friendship) for list display
 */
export interface FriendInfo {
  friendshipId: string;
  friend: SafeUserInfo;
  since: Date;
}

/**
 * Represents a pending friend request for incoming/outgoing lists
 */
export interface FriendRequestInfo {
  friendshipId: string;
  user: SafeUserInfo;
  createdAt: Date;
}

/**
 * Request payload for sending a friend request
 */
export type SendFriendRequestPayload = z.infer<typeof zSendFriendRequestPayload>;
export const zSendFriendRequestPayload = z.object({
  receiverUsername: z.string(),
});

/**
 * Request payload for responding to a friend request
 */
export type RespondFriendRequestPayload = z.infer<typeof zRespondFriendRequestPayload>;
export const zRespondFriendRequestPayload = z.object({
  action: z.enum(["accept", "reject", "block"]),
});

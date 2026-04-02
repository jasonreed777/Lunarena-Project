import {
  type FriendInfo,
  type FriendRequestInfo,
  type FriendshipInfo,
  zSendFriendRequestPayload,
  zRespondFriendRequestPayload,
} from "@gamenite/shared";
import { type GameServer, type RestAPI } from "../types.ts";
import {
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "../services/friendship.service.ts";
import { z } from "zod";
import { emitNotification } from "./notification.controller.ts";
import { getUserByUsername } from "../services/auth.service.ts";

/**
 * POST /api/friends/list - Get current user's friends
 */
export const postList: RestAPI<FriendInfo[]> = async (req, res) => {
  res.send(await getFriendsList(req.authUser.userId));
};

/**
 * POST /api/friends/requests - Get pending friend requests (both incoming and outgoing)
 */
export const postRequests: RestAPI<{
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}> = async (req, res) => {
  const [incoming, outgoing] = await Promise.all([
    getIncomingFriendRequests(req.authUser.userId),
    getOutgoingFriendRequests(req.authUser.userId),
  ]);

  res.send({ incoming, outgoing });
};

/**
 * POST /api/friends/request - Send a friend request
 */
export const postRequest: RestAPI<FriendshipInfo> = async (req, res) => {
  const body = z.object({ payload: zSendFriendRequestPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  const receiverUsername = body.data.payload.receiverUsername;
  const result = await sendFriendRequest(req.authUser, receiverUsername, new Date());
  const receiver = await getUserByUsername(receiverUsername);
  if (!("error" in result) && receiver) {
    const io = req.app.get("io") as GameServer;
    await emitNotification(
      io,
      receiver.userId,
      "FriendRequest",
      "New friend request",
      `${req.authUser.username} wants to be your friend!`,
    );
  }
  res.send(result);
};

/**
 * POST /api/friends/:id/respond - Accept, reject, or block a friend request
 */
export const postRespond: RestAPI<FriendshipInfo, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zRespondFriendRequestPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await respondToFriendRequest(
    req.authUser,
    req.params.id,
    body.data.payload.action,
  );
  if (result === null) {
    res.status(404).send({ error: "Friend request not found" });
    return;
  }

  res.send(result);
};

/**
 * DELETE /api/friends/:id - Remove a friend
 */
export const deleteById: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const result = await removeFriend(req.authUser, req.params.id);
  if (result === null) {
    res.status(404).send({ error: "Friendship not found" });
    return;
  }

  res.send(result);
};

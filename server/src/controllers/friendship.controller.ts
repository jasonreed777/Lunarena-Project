import {
  type FriendInfo,
  type FriendRequestInfo,
  type FriendshipInfo,
  withAuth,
  zSendFriendRequestPayload,
  zRespondFriendRequestPayload,
} from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";
import {
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "../services/friendship.service.ts";
import { z } from "zod";

/**
 * POST /api/friends/list - Get current user's friends
 */
export const postList: RestAPI<FriendInfo[]> = async (req, res) => {
  const body = withAuth(z.object({})).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await getFriendsList(user.userId));
};

/**
 * POST /api/friends/requests - Get pending friend requests (both incoming and outgoing)
 */
export const postRequests: RestAPI<{
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}> = async (req, res) => {
  const body = withAuth(z.object({})).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const [incoming, outgoing] = await Promise.all([
    getIncomingFriendRequests(user.userId),
    getOutgoingFriendRequests(user.userId),
  ]);

  res.send({ incoming, outgoing });
};

/**
 * POST /api/friends/request - Send a friend request
 */
export const postRequest: RestAPI<FriendshipInfo> = async (req, res) => {
  const body = withAuth(zSendFriendRequestPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await sendFriendRequest(user, body.data.payload.receiverUsername, new Date());

  res.send(result);
};

/**
 * POST /api/friends/:id/respond - Accept, reject, or block a friend request
 */
export const postRespond: RestAPI<FriendshipInfo, { id: string }> = async (req, res) => {
  const body = withAuth(zRespondFriendRequestPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await respondToFriendRequest(user, req.params.id, body.data.payload.action);
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
  const body = withAuth(z.object({})).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await removeFriend(user, req.params.id);
  if (result === null) {
    res.status(404).send({ error: "Friendship not found" });
    return;
  }

  res.send(result);
};

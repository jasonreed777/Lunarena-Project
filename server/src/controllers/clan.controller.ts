import {
  type ClanInfo,
  type ClanDetailInfo,
  type ClanMemberInfo,
  type ClanMemberPointsEntry,
  type ClanLeaderboardEntry,
  type UserClanInfo,
  type ClanInviteInfo,
  zCreateClanPayload,
  zUpdateClanPayload,
  zInviteUserPayload,
  zRespondInvitePayload,
  zKickMemberPayload,
  zUpdateMemberRolePayload,
  zTransferOwnershipPayload,
} from "@gamenite/shared";
import { type GameServer, type RestAPI } from "../types.ts";
import * as clanService from "../services/clan.service.ts";
import { z } from "zod";
import { emitNotification } from "./notification.controller.ts";
import { getClanById } from "../services/clan.service.ts";
import { getUserByUsername } from "../services/auth.service.ts";
import { ClanMemberModel } from "../mongoose-models.ts";

/**
 * GET /api/clans/list - List all clans
 */
export const getList: RestAPI<ClanInfo[]> = async (_req, res) => {
  res.send(await clanService.listClans());
};

/**
 * POST /api/clans/current - Get current user's clan
 */
export const postCurrent: RestAPI<UserClanInfo | null> = async (req, res) => {
  const result = await clanService.getCurrentUserClan(req.authUser.userId);
  res.send(result);
};

/**
 * GET /api/clans/:id - Get clan details
 */
export const getById: RestAPI<ClanDetailInfo, { id: string }> = async (req, res) => {
  const result = await clanService.getClanById(req.params.id);
  if (!result) {
    res.status(404).send({ error: "Clan not found" });
    return;
  }
  res.send(result);
};

/**
 * GET /api/clans/:id/members - Get clan members
 */
export const getMembers: RestAPI<ClanMemberInfo[], { id: string }> = async (req, res) => {
  const result = await clanService.getClanMembers(req.params.id);
  if (!result) {
    res.status(404).send({ error: "Clan not found" });
    return;
  }
  res.send(result);
};

/**
 * POST /api/clans/create - Create a new clan
 */
export const postCreate: RestAPI<ClanInfo> = async (req, res) => {
  const body = z.object({ payload: zCreateClanPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.createClan(req.authUser, body.data.payload, new Date());
  res.send(result);
};

/**
 * POST /api/clans/:id/join - Join public clan or request to join private
 */
export const postJoin: RestAPI<UserClanInfo | ClanInviteInfo, { id: string }> = async (
  req,
  res,
) => {
  const result = await clanService.joinClan(req.authUser, req.params.id, new Date());
  // Notify admins/owners when a user requests to join a private clan
  if (!("error" in result) && "inviteId" in result) {
    const io = req.app.get("io") as GameServer;
    const clanInfo = await getClanById(req.params.id);
    const admins = await ClanMemberModel.find({
      clanId: req.params.id,
      role: { $in: ["admin", "owner"] },
    }).lean();
    for (const admin of admins) {
      await emitNotification(
        io,
        admin.userId,
        "ClanInvite",
        "Join Request",
        `${req.authUser.username} has requested to join ${clanInfo?.name ?? "your clan"}`,
      );
    }
  }
  res.send(result);
};

/**
 * POST /api/clans/:id/leave - Leave current clan
 */
export const postLeave: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const result = await clanService.leaveClan(req.authUser, req.params.id);
  res.send(result);
};

/**
 * POST /api/clans/:id/kick - Kick a member (admin/owner only)
 */
export const postKick: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zKickMemberPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.kickMember(
    req.authUser,
    req.params.id,
    body.data.payload.username,
  );
  if (!("error" in result)) {
    const receiver = await getUserByUsername(body.data.payload.username);
    if (receiver) {
      const clanInfo = await getClanById(req.params.id);
      const io = req.app.get("io") as GameServer;
      await emitNotification(
        io,
        receiver.userId,
        "ClanInvite",
        "Removed from Clan",
        `You were removed from clan ${clanInfo?.name ?? "Unknown"} by ${req.authUser.username}`,
      );
    }
  }
  res.send(result);
};

/**
 * POST /api/clans/:id/invite - Invite a user (admin/owner only)
 */
export const postInvite: RestAPI<ClanInviteInfo, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zInviteUserPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.inviteUser(
    req.authUser,
    req.params.id,
    body.data.payload.username,
    new Date(),
  );
  const receiver = await getUserByUsername(body.data.payload.username);
  if (!("error" in result) && receiver) {
    const clanInfo = await getClanById(req.params.id);
    const io = req.app.get("io") as GameServer;
    await emitNotification(
      io,
      receiver.userId,
      "ClanInvite",
      "Clan Invite Received",
      `${req.authUser.username} has invited you to join clan ${clanInfo?.name}`,
    );
  }
  res.send(result);
};

/**
 * POST /api/clans/:id/invites - Get pending invites/requests (admin/owner)
 */
export const postInvites: RestAPI<ClanInviteInfo[], { id: string }> = async (req, res) => {
  const result = await clanService.getClanInvites(req.authUser, req.params.id);
  if (result === null) {
    res.status(404).send({ error: "Clan not found" });
    return;
  }
  res.send(result);
};

/**
 * POST /api/clans/invites/:inviteId/respond - Respond to invite/request
 */
export const postRespondInvite: RestAPI<
  UserClanInfo | ClanInviteInfo,
  { inviteId: string }
> = async (req, res) => {
  const body = z.object({ payload: zRespondInvitePayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  // Look up the invite before responding so we know who to notify
  const invite = await clanService.getInviteById(req.params.inviteId);
  const result = await clanService.respondToInvite(
    req.authUser,
    req.params.inviteId,
    body.data.payload.action,
  );
  if (result === null) {
    res.status(404).send({ error: "Invite not found" });
    return;
  }
  if (!("error" in result) && invite) {
    const io = req.app.get("io") as GameServer;
    const clanInfo = await getClanById(invite.clanId);
    const clanName = clanInfo?.name ?? "Unknown";

    if (invite.type === "request") {
      // Admin accepted/rejected a join request → notify the requester
      const header =
        body.data.payload.action === "accept" ? "Join Request Accepted" : "Join Request Rejected";
      const message =
        body.data.payload.action === "accept"
          ? `Your request to join ${clanName} has been accepted!`
          : `Your request to join ${clanName} has been rejected.`;
      await emitNotification(io, invite.userId, "ClanInvite", header, message);
    } else if (invite.type === "invite" && invite.invitedBy) {
      // User accepted/rejected an invite → notify the inviter
      const header = body.data.payload.action === "accept" ? "Invite Accepted" : "Invite Declined";
      const message =
        body.data.payload.action === "accept"
          ? `${req.authUser.username} accepted your invite to ${clanName}!`
          : `${req.authUser.username} declined your invite to ${clanName}.`;
      await emitNotification(io, invite.invitedBy, "ClanInvite", header, message);
    }
  }
  res.send(result);
};

/**
 * POST /api/clans/my-invites - Get current user's pending invites
 */
export const postMyInvites: RestAPI<ClanInviteInfo[]> = async (req, res) => {
  const result = await clanService.getUserInvites(req.authUser.userId);
  res.send(result);
};

/**
 * POST /api/clans/:id/update - Update clan settings (admin/owner)
 */
export const postUpdate: RestAPI<ClanInfo, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zUpdateClanPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.updateClan(req.authUser, req.params.id, body.data.payload);
  if (result === null) {
    res.status(404).send({ error: "Clan not found" });
    return;
  }
  res.send(result);
};

/**
 * POST /api/clans/:id/role - Update member role (owner only for admin promotion)
 */
export const postUpdateRole: RestAPI<ClanMemberInfo, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zUpdateMemberRolePayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.updateMemberRole(
    req.authUser,
    req.params.id,
    body.data.payload.username,
    body.data.payload.role,
  );
  if (!("error" in result)) {
    const receiver = await getUserByUsername(body.data.payload.username);
    if (receiver) {
      const clanInfo = await getClanById(req.params.id);
      const io = req.app.get("io") as GameServer;
      const action = body.data.payload.role === "admin" ? "promoted to Admin" : "changed to Member";
      await emitNotification(
        io,
        receiver.userId,
        "ClanInvite",
        "Role Updated",
        `You have been ${action} in ${clanInfo?.name ?? "Unknown"} by ${req.authUser.username}`,
      );
    }
  }
  res.send(result);
};

/**
 * POST /api/clans/invites/:inviteId/cancel - Cancel a pending invite (admin/owner)
 */
export const postCancelInvite: RestAPI<{ success: true }, { inviteId: string }> = async (
  req,
  res,
) => {
  const result = await clanService.cancelInvite(req.authUser, req.params.inviteId);
  if (result === null) {
    res.status(404).send({ error: "Invite not found" });
    return;
  }
  res.send(result);
};

/**
 * GET /api/clans/rankings - Get cross-clan rankings
 */
export const getClanRankings: RestAPI<ClanLeaderboardEntry[]> = async (_req, res) => {
  res.send(await clanService.getClanLeaderboard());
};

/**
 * GET /api/clans/:id/leaderboard - Get clan member points leaderboard
 */
export const getLeaderboard: RestAPI<ClanMemberPointsEntry[], { id: string }> = async (
  req,
  res,
) => {
  const result = await clanService.getClanMemberLeaderboard(req.params.id);
  if (result === null) {
    res.status(404).send({ error: "Clan not found" });
    return;
  }
  res.send(result);
};

/**
 * POST /api/clans/:id/transfer - Transfer ownership (owner only)
 */
export const postTransfer: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const body = z.object({ payload: zTransferOwnershipPayload }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const result = await clanService.transferOwnership(
    req.authUser,
    req.params.id,
    body.data.payload.newOwnerUsername,
  );
  if (!("error" in result)) {
    const receiver = await getUserByUsername(body.data.payload.newOwnerUsername);
    if (receiver) {
      const clanInfo = await getClanById(req.params.id);
      const io = req.app.get("io") as GameServer;
      await emitNotification(
        io,
        receiver.userId,
        "ClanInvite",
        "Ownership Transferred",
        `${req.authUser.username} has transferred ownership of ${clanInfo?.name ?? "Unknown"} to you`,
      );
    }
  }
  res.send(result);
};

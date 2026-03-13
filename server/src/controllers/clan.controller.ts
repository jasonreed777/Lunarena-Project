import {
  type ClanInfo,
  type ClanDetailInfo,
  type ClanMemberInfo,
  type UserClanInfo,
  type ClanInviteInfo,
  withAuth,
  zCreateClanPayload,
  zUpdateClanPayload,
  zInviteUserPayload,
  zRespondInvitePayload,
  zKickMemberPayload,
  zUpdateMemberRolePayload,
  zTransferOwnershipPayload,
} from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";
import * as clanService from "../services/clan.service.ts";
import { z } from "zod";

/**
 * GET /api/clans/list - List all public clans
 */
export const getList: RestAPI<ClanInfo[]> = async (_req, res) => {
  res.send(await clanService.listPublicClans());
};

/**
 * POST /api/clans/current - Get current user's clan
 */
export const postCurrent: RestAPI<UserClanInfo | null> = async (req, res) => {
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

  const result = await clanService.getCurrentUserClan(user.userId);
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
  const body = withAuth(zCreateClanPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.createClan(user, body.data.payload, new Date());
  res.send(result);
};

/**
 * POST /api/clans/:id/join - Join public clan or request to join private
 */
export const postJoin: RestAPI<UserClanInfo | ClanInviteInfo, { id: string }> = async (
  req,
  res,
) => {
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

  const result = await clanService.joinClan(user, req.params.id, new Date());
  res.send(result);
};

/**
 * POST /api/clans/:id/leave - Leave current clan
 */
export const postLeave: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
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

  const result = await clanService.leaveClan(user, req.params.id);
  res.send(result);
};

/**
 * POST /api/clans/:id/kick - Kick a member (admin/owner only)
 */
export const postKick: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const body = withAuth(zKickMemberPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.kickMember(user, req.params.id, body.data.payload.username);
  res.send(result);
};

/**
 * POST /api/clans/:id/invite - Invite a user (admin/owner only)
 */
export const postInvite: RestAPI<ClanInviteInfo, { id: string }> = async (req, res) => {
  const body = withAuth(zInviteUserPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.inviteUser(
    user,
    req.params.id,
    body.data.payload.username,
    new Date(),
  );
  res.send(result);
};

/**
 * POST /api/clans/:id/invites - Get pending invites/requests (admin/owner)
 */
export const postInvites: RestAPI<ClanInviteInfo[], { id: string }> = async (req, res) => {
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

  const result = await clanService.getClanInvites(user, req.params.id);
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
  const body = withAuth(zRespondInvitePayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.respondToInvite(
    user,
    req.params.inviteId,
    body.data.payload.action,
  );
  if (result === null) {
    res.status(404).send({ error: "Invite not found" });
    return;
  }
  res.send(result);
};

/**
 * POST /api/clans/my-invites - Get current user's pending invites
 */
export const postMyInvites: RestAPI<ClanInviteInfo[]> = async (req, res) => {
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

  const result = await clanService.getUserInvites(user.userId);
  res.send(result);
};

/**
 * POST /api/clans/:id/update - Update clan settings (admin/owner)
 */
export const postUpdate: RestAPI<ClanInfo, { id: string }> = async (req, res) => {
  const body = withAuth(zUpdateClanPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.updateClan(user, req.params.id, body.data.payload);
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
  const body = withAuth(zUpdateMemberRolePayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.updateMemberRole(
    user,
    req.params.id,
    body.data.payload.username,
    body.data.payload.role,
  );
  res.send(result);
};

/**
 * POST /api/clans/:id/transfer - Transfer ownership (owner only)
 */
export const postTransfer: RestAPI<{ success: true }, { id: string }> = async (req, res) => {
  const body = withAuth(zTransferOwnershipPayload).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  const result = await clanService.transferOwnership(
    user,
    req.params.id,
    body.data.payload.newOwnerUsername,
  );
  res.send(result);
};

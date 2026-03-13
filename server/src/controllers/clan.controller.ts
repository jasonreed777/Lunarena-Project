import {
  type ClanInfo,
  type ClanDetailInfo,
  type ClanMemberInfo,
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
import { type RestAPI } from "../types.ts";
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

  const result = await clanService.kickMember(req.authUser, req.params.id, body.data.payload.username);
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

  const result = await clanService.respondToInvite(
    req.authUser,
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
  res.send(result);
};

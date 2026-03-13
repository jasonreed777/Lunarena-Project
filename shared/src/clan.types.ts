import { z } from "zod";
import { type SafeUserInfo } from "./user.types.ts";

/**
 * Possible roles within a clan
 */
export type ClanRole = "owner" | "admin" | "member";

/**
 * Possible states for a clan invite/request
 */
export type ClanInviteStatus = "pending" | "accepted" | "rejected";

/**
 * Type of clan invite - invite (from clan to user) or request (from user to clan)
 */
export type ClanInviteType = "invite" | "request";

/**
 * Basic clan information exposed to clients
 */
export interface ClanInfo {
  clanId: string;
  name: string;
  bio: string;
  color: string;
  pfp?: string;
  isPublic: boolean;
  memberCount: number;
  createdAt: Date;
}

/**
 * Extended clan info including members list
 */
export interface ClanDetailInfo extends ClanInfo {
  members: ClanMemberInfo[];
}

/**
 * Represents a clan member as exposed to clients
 */
export interface ClanMemberInfo {
  user: SafeUserInfo;
  role: ClanRole;
  joinedAt: Date;
}

/**
 * Info about user's current clan membership (for "my clan" view)
 */
export interface UserClanInfo {
  clan: ClanInfo;
  role: ClanRole;
  joinedAt: Date;
}

/**
 * Pending invite or join request
 */
export interface ClanInviteInfo {
  inviteId: string;
  clan: ClanInfo;
  user: SafeUserInfo;
  type: ClanInviteType;
  invitedBy: SafeUserInfo | null;
  createdAt: Date;
}

/*** REQUEST PAYLOADS ***/

/**
 * Create a new clan
 */
export type CreateClanPayload = z.infer<typeof zCreateClanPayload>;
export const zCreateClanPayload = z.object({
  name: z.string().min(3).max(32),
  bio: z.string().max(256).optional().default(""),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  pfp: z.string().optional(),
  isPublic: z.boolean(),
});

/**
 * Update clan settings (admin/owner only)
 */
export type UpdateClanPayload = z.infer<typeof zUpdateClanPayload>;
export const zUpdateClanPayload = z.object({
  name: z.string().min(3).max(32).optional(),
  bio: z.string().max(256).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  pfp: z.string().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Invite a user to the clan
 */
export type InviteUserPayload = z.infer<typeof zInviteUserPayload>;
export const zInviteUserPayload = z.object({
  username: z.string(),
});

/**
 * Respond to an invite or join request
 */
export type RespondInvitePayload = z.infer<typeof zRespondInvitePayload>;
export const zRespondInvitePayload = z.object({
  action: z.enum(["accept", "reject"]),
});

/**
 * Kick a member from the clan
 */
export type KickMemberPayload = z.infer<typeof zKickMemberPayload>;
export const zKickMemberPayload = z.object({
  username: z.string(),
});

/**
 * Update a member's role
 */
export type UpdateMemberRolePayload = z.infer<typeof zUpdateMemberRolePayload>;
export const zUpdateMemberRolePayload = z.object({
  username: z.string(),
  role: z.enum(["admin", "member"]),
});

/**
 * Transfer clan ownership
 */
export type TransferOwnershipPayload = z.infer<typeof zTransferOwnershipPayload>;
export const zTransferOwnershipPayload = z.object({
  newOwnerUsername: z.string(),
});

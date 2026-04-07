import { randomUUID } from "node:crypto";
import {
  type ClanInfo,
  type ClanDetailInfo,
  type ClanMemberInfo,
  type ClanMemberPointsEntry,
  type UserClanInfo,
  type ClanInviteInfo,
  type ClanRole,
  type CreateClanPayload,
  type UpdateClanPayload,
} from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import type {
  ClanRecord,
  ClanMemberRecord,
  UserRecord,
  UserPointsRecord,
  UserProfileRecord,
} from "../models.ts";
import {
  ClanModel,
  ClanMemberModel,
  ClanInviteModel,
  UserModel,
  UserPointsModel,
  UserProfileModel,
  UserGameStatsModel,
  UserAchievementModel,
} from "../mongoose-models.ts";

/**
 * Helper: Convert a clan document to ClanInfo
 */
async function populateClanInfo(clanId: string): Promise<ClanInfo> {
  const doc = await ClanModel.findById(clanId).lean();
  if (!doc) throw new Error(`Clan not found: ${clanId}`);

  const memberCount = await ClanMemberModel.countDocuments({ clanId });

  return {
    clanId,
    name: doc.name,
    bio: doc.bio,
    color: doc.color,
    pfp: doc.pfp,
    isPublic: doc.isPublic,
    memberCount,
    createdAt: new Date(doc.createdAt),
  };
}

/**
 * Helper: Get a user's membership in a specific clan
 */
async function getMembership(userId: string, clanId: string) {
  return ClanMemberModel.findOne({ userId, clanId }).lean();
}

/**
 * Helper: Get a user's current clan membership (any clan)
 */
async function getUserMembership(userId: string) {
  return ClanMemberModel.findOne({ userId }).lean();
}

/**
 * Helper: Populate a ClanInviteInfo from a database record
 */
async function populateClanInviteInfo(
  invite: {
    _id: string;
    clanId: string;
    userId: string;
    type: string;
    invitedBy: string | null;
    createdAt: string;
  },
  clanInfo?: ClanInfo,
): Promise<ClanInviteInfo> {
  return {
    inviteId: invite._id,
    clan: clanInfo ?? (await populateClanInfo(invite.clanId)),
    user: await populateSafeUserInfo(invite.userId),
    type: invite.type as "invite" | "request",
    invitedBy: invite.invitedBy ? await populateSafeUserInfo(invite.invitedBy) : null,
    createdAt: new Date(invite.createdAt),
  };
}

/**
 * List all clans
 */
export async function listClans(): Promise<ClanInfo[]> {
  const docs = await ClanModel.find({}).lean();
  return Promise.all(docs.map((doc) => populateClanInfo(doc._id)));
}

/**
 * Get current user's clan
 */
export async function getCurrentUserClan(userId: string): Promise<UserClanInfo | null> {
  const membership = await getUserMembership(userId);
  if (!membership) return null;

  return {
    clan: await populateClanInfo(membership.clanId),
    role: membership.role as ClanRole,
    joinedAt: new Date(membership.joinedAt),
  };
}

/**
 * Get clan details by ID
 */
export async function getClanById(clanId: string): Promise<ClanDetailInfo | null> {
  const doc = await ClanModel.findById(clanId).lean();
  if (!doc) return null;

  const memberDocs = await ClanMemberModel.find({ clanId }).lean();
  const members: ClanMemberInfo[] = await Promise.all(
    memberDocs.map(async (m) => ({
      user: await populateSafeUserInfo(m.userId),
      role: m.role as ClanRole,
      joinedAt: new Date(m.joinedAt),
    })),
  );

  return {
    ...(await populateClanInfo(clanId)),
    members,
  };
}

/**
 * Get clan members
 */
export async function getClanMembers(clanId: string): Promise<ClanMemberInfo[] | null> {
  const clan = await ClanModel.findById(clanId).lean();
  if (!clan) return null;

  const memberDocs = await ClanMemberModel.find({ clanId }).lean();
  return Promise.all(
    memberDocs.map(async (m) => ({
      user: await populateSafeUserInfo(m.userId),
      role: m.role as ClanRole,
      joinedAt: new Date(m.joinedAt),
    })),
  );
}

/**
 * Create a new clan
 */
export async function createClan(
  creator: UserWithId,
  data: CreateClanPayload,
  createdAt: Date,
): Promise<ClanInfo | { error: string }> {
  // Check if user is already in a clan
  const existingMembership = await getUserMembership(creator.userId);
  if (existingMembership) {
    return { error: "You must leave your current clan before creating a new one" };
  }

  // Check if clan name is taken
  const existingClan = await ClanModel.findOne({ name: data.name }).lean();
  if (existingClan) {
    return { error: "A clan with this name already exists" };
  }

  const clanId = randomUUID().toString();
  const now = createdAt.toISOString();

  // Create clan
  await ClanModel.create({
    _id: clanId,
    name: data.name,
    bio: data.bio || "",
    color: data.color,
    pfp: data.pfp,
    isPublic: data.isPublic,
    createdAt: now,
  });

  // Add creator as owner
  await ClanMemberModel.create({
    _id: randomUUID().toString(),
    clanId,
    userId: creator.userId,
    role: "owner",
    joinedAt: now,
  });

  return populateClanInfo(clanId);
}

/**
 * Join a public clan or request to join a private clan
 */
export async function joinClan(
  user: UserWithId,
  clanId: string,
  createdAt: Date,
): Promise<UserClanInfo | ClanInviteInfo | { error: string }> {
  const clan = await ClanModel.findById(clanId).lean();
  if (!clan) {
    return { error: "Clan not found" };
  }

  // Check if already in a clan
  const existingMembership = await getUserMembership(user.userId);
  if (existingMembership) {
    if (existingMembership.clanId === clanId) {
      return { error: "You are already a member of this clan" };
    }
    return { error: "You must leave your current clan first" };
  }

  // Check for existing pending invite/request
  const existingInvite = await ClanInviteModel.findOne({
    clanId,
    userId: user.userId,
    status: "pending",
  }).lean();

  if (existingInvite) {
    if (existingInvite.type === "invite") {
      // Accept the pending invite
      return acceptInviteInternal(user, existingInvite._id);
    }
    return { error: "You already have a pending request to join this clan" };
  }

  const now = createdAt.toISOString();

  if (clan.isPublic) {
    // Join directly
    await ClanMemberModel.create({
      _id: randomUUID().toString(),
      clanId,
      userId: user.userId,
      role: "member",
      joinedAt: now,
    });

    // Clean up pending invites for this user to this clan
    await ClanInviteModel.updateMany(
      { userId: user.userId, clanId, status: "pending" },
      { status: "rejected" },
    );

    return {
      clan: await populateClanInfo(clanId),
      role: "member",
      joinedAt: createdAt,
    };
  } else {
    // Create join request
    const inviteId = randomUUID().toString();
    await ClanInviteModel.create({
      _id: inviteId,
      clanId,
      userId: user.userId,
      type: "request",
      status: "pending",
      invitedBy: null,
      createdAt: now,
    });

    return {
      inviteId,
      clan: await populateClanInfo(clanId),
      user: await populateSafeUserInfo(user.userId),
      type: "request",
      invitedBy: null,
      createdAt,
    };
  }
}

/**
 * Leave current clan
 */
export async function leaveClan(
  user: UserWithId,
  clanId: string,
): Promise<{ success: true } | { error: string }> {
  const membership = await getMembership(user.userId, clanId);
  if (!membership) {
    return { error: "You are not a member of this clan" };
  }

  if (membership.role === "owner") {
    const memberCount = await ClanMemberModel.countDocuments({ clanId });
    if (memberCount > 1) {
      // Auto-transfer: prefer admins, then oldest member
      // MongoDB string sort: "admin" < "member" alphabetically, so admins come first
      const successor = await ClanMemberModel.findOne({ clanId, userId: { $ne: user.userId } })
        .sort({ role: 1, joinedAt: 1 })
        .lean();
      if (successor) {
        await ClanMemberModel.findByIdAndUpdate(successor._id, { role: "owner" });
      }
    } else {
      // Last member leaving - disband clan
      await ClanModel.findByIdAndDelete(clanId);
      await ClanInviteModel.deleteMany({ clanId });
    }
  }

  await ClanMemberModel.findByIdAndDelete(membership._id);
  return { success: true };
}

/**
 * Kick a member from the clan (admin/owner only)
 */
export async function kickMember(
  actor: UserWithId,
  clanId: string,
  targetUsername: string,
): Promise<{ success: true } | { error: string }> {
  const actorMembership = await getMembership(actor.userId, clanId);
  if (!actorMembership) {
    return { error: "You are not a member of this clan" };
  }

  if (actorMembership.role === "member") {
    return { error: "Only admins and owners can kick members" };
  }

  // Find target user
  const targetUser = await UserModel.findOne({ username: targetUsername }).lean();
  if (!targetUser) {
    return { error: "User not found" };
  }

  const targetMembership = await getMembership(targetUser._id, clanId);
  if (!targetMembership) {
    return { error: "User is not a member of this clan" };
  }

  // Cannot kick owner
  if (targetMembership.role === "owner") {
    return { error: "Cannot kick the clan owner" };
  }

  // Admins cannot kick other admins
  if (actorMembership.role === "admin" && targetMembership.role === "admin") {
    return { error: "Admins cannot kick other admins" };
  }

  await ClanMemberModel.findByIdAndDelete(targetMembership._id);
  return { success: true };
}

/**
 * Invite a user to the clan (admin/owner only)
 */
export async function inviteUser(
  actor: UserWithId,
  clanId: string,
  targetUsername: string,
  createdAt: Date,
): Promise<ClanInviteInfo | { error: string }> {
  const actorMembership = await getMembership(actor.userId, clanId);
  if (!actorMembership) {
    return { error: "You are not a member of this clan" };
  }

  if (actorMembership.role === "member") {
    return { error: "Only admins and owners can invite members" };
  }

  const targetUser = await UserModel.findOne({ username: targetUsername }).lean();
  if (!targetUser) {
    return { error: "User not found" };
  }

  // Check if target is already in a clan
  const targetMembership = await getUserMembership(targetUser._id);
  if (targetMembership) {
    return { error: "User is already in a clan" };
  }

  // Check for existing invite
  const existingInvite = await ClanInviteModel.findOne({
    clanId,
    userId: targetUser._id,
    status: "pending",
  }).lean();

  if (existingInvite) {
    if (existingInvite.type === "request") {
      // Auto-accept their join request
      return acceptJoinRequestInternal(actor, existingInvite._id, clanId);
    }
    return { error: "User has already been invited" };
  }

  const inviteId = randomUUID().toString();
  const now = createdAt.toISOString();

  await ClanInviteModel.create({
    _id: inviteId,
    clanId,
    userId: targetUser._id,
    type: "invite",
    status: "pending",
    invitedBy: actor.userId,
    createdAt: now,
  });

  return {
    inviteId,
    clan: await populateClanInfo(clanId),
    user: await populateSafeUserInfo(targetUser._id),
    type: "invite",
    invitedBy: await populateSafeUserInfo(actor.userId),
    createdAt,
  };
}

/**
 * Internal: Accept an invite (called by invited user)
 */
async function acceptInviteInternal(
  user: UserWithId,
  inviteId: string,
): Promise<UserClanInfo | { error: string }> {
  const invite = await ClanInviteModel.findById(inviteId).lean();
  if (!invite || invite.userId !== user.userId || invite.type !== "invite") {
    return { error: "Invite not found" };
  }

  if (invite.status !== "pending") {
    return { error: "This invite has already been processed" };
  }

  // Check if user joined another clan
  const existingMembership = await getUserMembership(user.userId);
  if (existingMembership) {
    return { error: "You are already in a clan" };
  }

  const now = new Date().toISOString();

  await ClanMemberModel.create({
    _id: randomUUID().toString(),
    clanId: invite.clanId,
    userId: user.userId,
    role: "member",
    joinedAt: now,
  });

  await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "accepted" });

  // Reject other pending invites for this user to the same clan
  await ClanInviteModel.updateMany(
    { userId: user.userId, clanId: invite.clanId, status: "pending", _id: { $ne: inviteId } },
    { status: "rejected" },
  );

  return {
    clan: await populateClanInfo(invite.clanId),
    role: "member",
    joinedAt: new Date(now),
  };
}

/**
 * Internal: Accept a join request (called by admin/owner)
 */
async function acceptJoinRequestInternal(
  actor: UserWithId,
  inviteId: string,
  clanId: string,
): Promise<ClanInviteInfo | { error: string }> {
  const invite = await ClanInviteModel.findById(inviteId).lean();
  if (!invite || invite.type !== "request") {
    return { error: "Request not found" };
  }

  // Check if user joined another clan while waiting
  const existingMembership = await getUserMembership(invite.userId);
  if (existingMembership) {
    await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "rejected" });
    return { error: "User has joined another clan" };
  }

  const now = new Date().toISOString();

  await ClanMemberModel.create({
    _id: randomUUID().toString(),
    clanId: invite.clanId,
    userId: invite.userId,
    role: "member",
    joinedAt: now,
  });

  await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "accepted" });

  // Reject other pending invites/requests for this user to the same clan
  await ClanInviteModel.updateMany(
    { userId: invite.userId, clanId: invite.clanId, status: "pending", _id: { $ne: inviteId } },
    { status: "rejected" },
  );

  return {
    inviteId,
    clan: await populateClanInfo(invite.clanId),
    user: await populateSafeUserInfo(invite.userId),
    type: "request",
    invitedBy: null,
    createdAt: new Date(invite.createdAt),
  };
}

/**
 * Look up a raw invite record by ID (used by controller for notifications)
 */
export async function getInviteById(inviteId: string) {
  return ClanInviteModel.findById(inviteId).lean();
}

/**
 * Respond to an invite (user) or request (admin)
 */
export async function respondToInvite(
  user: UserWithId,
  inviteId: string,
  action: "accept" | "reject",
): Promise<UserClanInfo | ClanInviteInfo | { error: string } | null> {
  const invite = await ClanInviteModel.findById(inviteId).lean();
  if (!invite) return null;

  if (invite.status !== "pending") {
    return { error: "This has already been processed" };
  }

  if (invite.type === "invite") {
    // User responding to invite
    if (invite.userId !== user.userId) {
      return { error: "Not authorized" };
    }

    if (action === "accept") {
      return acceptInviteInternal(user, inviteId);
    } else {
      await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "rejected" });
      return populateClanInviteInfo(invite);
    }
  } else {
    // Admin responding to join request
    const actorMembership = await getMembership(user.userId, invite.clanId);
    if (!actorMembership || actorMembership.role === "member") {
      return { error: "Not authorized" };
    }

    if (action === "accept") {
      return acceptJoinRequestInternal(user, inviteId, invite.clanId);
    } else {
      await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "rejected" });
      return populateClanInviteInfo(invite);
    }
  }
}

/**
 * Cancel/withdraw a pending invite (admin/owner only)
 */
export async function cancelInvite(
  actor: UserWithId,
  inviteId: string,
): Promise<{ success: true } | { error: string } | null> {
  const invite = await ClanInviteModel.findById(inviteId).lean();
  if (!invite) return null;

  if (invite.status !== "pending") {
    return { error: "This invite has already been processed" };
  }

  const membership = await getMembership(actor.userId, invite.clanId);
  if (!membership || membership.role === "member") {
    return { error: "Not authorized" };
  }

  await ClanInviteModel.findByIdAndUpdate(inviteId, { status: "rejected" });
  return { success: true };
}

/**
 * Get pending invites/requests for a clan (admin/owner only)
 */
export async function getClanInvites(
  user: UserWithId,
  clanId: string,
): Promise<ClanInviteInfo[] | { error: string } | null> {
  const clan = await ClanModel.findById(clanId).lean();
  if (!clan) return null;

  const membership = await getMembership(user.userId, clanId);
  if (!membership || membership.role === "member") {
    return { error: "Not authorized" };
  }

  const invites = await ClanInviteModel.find({ clanId, status: "pending" }).lean();

  // Safety net: auto-reject invites for users who already joined a clan
  const validInvites = [];
  for (const inv of invites) {
    const existing = await ClanMemberModel.findOne({ userId: inv.userId }).lean();
    if (existing) {
      await ClanInviteModel.findByIdAndUpdate(inv._id, { status: "rejected" });
    } else {
      validInvites.push(inv);
    }
  }

  const clanInfo = await populateClanInfo(clanId);
  return Promise.all(validInvites.map((inv) => populateClanInviteInfo(inv, clanInfo)));
}

/**
 * Get pending invites for current user
 */
export async function getUserInvites(userId: string): Promise<ClanInviteInfo[]> {
  const invites = await ClanInviteModel.find({
    userId,
    type: "invite",
    status: "pending",
  }).lean();

  return Promise.all(invites.map((inv) => populateClanInviteInfo(inv)));
}

/**
 * Update clan settings (admin/owner)
 */
export async function updateClan(
  user: UserWithId,
  clanId: string,
  data: UpdateClanPayload,
): Promise<ClanInfo | { error: string } | null> {
  const clan = await ClanModel.findById(clanId).lean();
  if (!clan) return null;

  const membership = await getMembership(user.userId, clanId);
  if (!membership || membership.role === "member") {
    return { error: "Not authorized" };
  }

  // Check name uniqueness if changing
  if (data.name && data.name !== clan.name) {
    const existing = await ClanModel.findOne({ name: data.name }).lean();
    if (existing) {
      return { error: "A clan with this name already exists" };
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.color !== undefined) updates.color = data.color;
  if (data.pfp !== undefined) updates.pfp = data.pfp;
  if (data.isPublic !== undefined) updates.isPublic = data.isPublic;

  if (Object.keys(updates).length > 0) {
    await ClanModel.findByIdAndUpdate(clanId, updates);
  }

  return populateClanInfo(clanId);
}

/**
 * Update member role (owner only for admin, admin/owner for member)
 */
export async function updateMemberRole(
  actor: UserWithId,
  clanId: string,
  targetUsername: string,
  newRole: "admin" | "member",
): Promise<ClanMemberInfo | { error: string }> {
  const actorMembership = await getMembership(actor.userId, clanId);
  if (!actorMembership) {
    return { error: "You are not a member of this clan" };
  }

  // Only owner can promote to admin
  if (newRole === "admin" && actorMembership.role !== "owner") {
    return { error: "Only the owner can promote members to admin" };
  }

  // Members cannot change roles
  if (actorMembership.role === "member") {
    return { error: "Not authorized" };
  }

  const targetUser = await UserModel.findOne({ username: targetUsername }).lean();
  if (!targetUser) {
    return { error: "User not found" };
  }

  const targetMembership = await getMembership(targetUser._id, clanId);
  if (!targetMembership) {
    return { error: "User is not a member of this clan" };
  }

  if (targetMembership.role === "owner") {
    return { error: "Cannot change owner's role" };
  }

  // Only owner can demote admins
  if (targetMembership.role === "admin" && actorMembership.role !== "owner") {
    return { error: "Only the owner can demote admins" };
  }

  await ClanMemberModel.findByIdAndUpdate(targetMembership._id, { role: newRole });

  return {
    user: await populateSafeUserInfo(targetUser._id),
    role: newRole,
    joinedAt: new Date(targetMembership.joinedAt),
  };
}

/**
 * Transfer clan ownership (owner only)
 */
export async function transferOwnership(
  owner: UserWithId,
  clanId: string,
  newOwnerUsername: string,
): Promise<{ success: true } | { error: string }> {
  const ownerMembership = await getMembership(owner.userId, clanId);
  if (!ownerMembership || ownerMembership.role !== "owner") {
    return { error: "Only the owner can transfer ownership" };
  }

  const newOwnerUser = await UserModel.findOne({ username: newOwnerUsername }).lean();
  if (!newOwnerUser) {
    return { error: "User not found" };
  }

  const newOwnerMembership = await getMembership(newOwnerUser._id, clanId);
  if (!newOwnerMembership) {
    return { error: "User is not a member of this clan" };
  }

  // Transfer ownership
  await ClanMemberModel.findByIdAndUpdate(ownerMembership._id, { role: "member" });
  await ClanMemberModel.findByIdAndUpdate(newOwnerMembership._id, { role: "owner" });

  return { success: true };
}

/**
 * Get clan member points leaderboard — each member's points, sorted descending
 */
export async function getClanMemberLeaderboard(
  clanId: string,
): Promise<ClanMemberPointsEntry[] | null> {
  const clan = await ClanModel.findById(clanId).lean<(ClanRecord & { _id: string }) | null>();
  if (!clan) return null;

  const memberDocs = await ClanMemberModel.find({ clanId }).lean<
    (ClanMemberRecord & { _id: string })[]
  >();

  const entries: ClanMemberPointsEntry[] = await Promise.all(
    memberDocs.map(async (m): Promise<ClanMemberPointsEntry> => {
      const user = await UserModel.findById(m.userId).lean<(UserRecord & { _id: string }) | null>();
      const username = user?.username ?? m.userId;
      const pointsRecord = await UserPointsModel.findById(username).lean<
        (UserPointsRecord & { _id: string }) | null
      >();
      const profile = await UserProfileModel.findOne({ username }).lean<
        (UserProfileRecord & { _id: string }) | null
      >();
      const gameStats = await UserGameStatsModel.findById(username).lean();
      const achievementCount = await UserAchievementModel.countDocuments({ username });

      return {
        username,
        display: user?.display ?? username,
        role: m.role as ClanRole,
        pointsTotal: pointsRecord?.pointsTotal ?? 0,
        gamesPlayedTotal: gameStats?.gamesPlayedTotal ?? 0,
        achievementCount,
        pfp: profile?.pfp ?? { type: "avatar", avatarId: "wizard" },
        profileBorderColor: profile?.profileBorderColor ?? "#888888",
      };
    }),
  );

  entries.sort((a, b) => b.pointsTotal - a.pointsTotal);
  return entries;
}

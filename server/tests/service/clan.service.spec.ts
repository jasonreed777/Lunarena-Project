import { describe, it, expect, beforeEach } from "vitest";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  listClans,
  getCurrentUserClan,
  getClanById,
  getClanMembers,
  createClan,
  joinClan,
  leaveClan,
  kickMember,
  inviteUser,
  respondToInvite,
  cancelInvite,
  getClanInvites,
  getUserInvites,
  updateClan,
  updateMemberRole,
  transferOwnership,
  getClanMemberLeaderboard,
  getClanLeaderboard,
} from "../../src/services/clan.service.ts";
import { ClanModel, ClanMemberModel, ClanInviteModel } from "../../src/mongoose-models.ts";
import type { UserWithId } from "../../src/types.ts";
import type {
  ClanInfo,
  ClanDetailInfo,
  ClanMemberInfo,
  UserClanInfo,
  ClanInviteInfo,
} from "@gamenite/shared";

let user0: UserWithId;
let user1: UserWithId;
let user2: UserWithId;

async function createTestClan(creator: UserWithId, overrides = {}) {
  return createClan(
    creator,
    {
      name: "TestClan",
      bio: "A test clan",
      color: "#ff0000",
      isPublic: true,
      ...overrides,
    },
    new Date(),
  );
}

beforeEach(async () => {
  // Clear all clan-related collections (not cleared by resetEverythingToDefaults)
  await ClanModel.deleteMany({});
  await ClanMemberModel.deleteMany({});
  await ClanInviteModel.deleteMany({});

  const u0 = await getUserByUsername("user0");
  const u1 = await getUserByUsername("user1");
  const u2 = await getUserByUsername("user2");
  user0 = { userId: u0!.userId, username: u0!.username };
  user1 = { userId: u1!.userId, username: u1!.username };
  user2 = { userId: u2!.userId, username: u2!.username };
});

// ---------------------------------------------------------------------------
// listClans
// ---------------------------------------------------------------------------
describe("listClans", () => {
  it("should return an empty array when no clans exist", async () => {
    const clans = await listClans();
    expect(clans).toEqual([]);
  });

  it("should return created clans", async () => {
    await createTestClan(user0, { name: "ClanA" });
    await createTestClan(user1, { name: "ClanB" });

    const clans = await listClans();
    expect(clans).toHaveLength(2);
    const names = clans.map((c) => c.name);
    expect(names).toContain("ClanA");
    expect(names).toContain("ClanB");
  });
});

// ---------------------------------------------------------------------------
// getCurrentUserClan
// ---------------------------------------------------------------------------
describe("getCurrentUserClan", () => {
  it("should return null when user is not in any clan", async () => {
    const result = await getCurrentUserClan(user0.userId);
    expect(result).toBeNull();
  });

  it("should return UserClanInfo after user creates a clan", async () => {
    await createTestClan(user0);
    const result = await getCurrentUserClan(user0.userId);
    expect(result).not.toBeNull();
    expect(result!.clan.name).toBe("TestClan");
    expect(result!.role).toBe("owner");
    expect(result!.joinedAt).toBeInstanceOf(Date);
  });

  it("should return UserClanInfo after user joins a clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await getCurrentUserClan(user1.userId);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("member");
  });
});

// ---------------------------------------------------------------------------
// getClanById
// ---------------------------------------------------------------------------
describe("getClanById", () => {
  it("should return null for a non-existent clan", async () => {
    const result = await getClanById("nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return ClanDetailInfo with members after creation", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const detail = (await getClanById(clan.clanId)) as ClanDetailInfo;
    expect(detail).not.toBeNull();
    expect(detail.name).toBe("TestClan");
    expect(detail.members).toHaveLength(1);
    expect(detail.members[0].role).toBe("owner");
    expect(detail.members[0].user.username).toBe("user0");
  });
});

// ---------------------------------------------------------------------------
// getClanMembers
// ---------------------------------------------------------------------------
describe("getClanMembers", () => {
  it("should return null for a non-existent clan", async () => {
    const result = await getClanMembers("nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return member list", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());

    const members = await getClanMembers(clan.clanId);
    expect(members).not.toBeNull();
    expect(members).toHaveLength(2);
    const usernames = members!.map((m) => m.user.username);
    expect(usernames).toContain("user0");
    expect(usernames).toContain("user1");
  });
});

// ---------------------------------------------------------------------------
// createClan
// ---------------------------------------------------------------------------
describe("createClan", () => {
  it("should create a clan and make the creator the owner", async () => {
    const result = await createTestClan(user0);
    expect("error" in result).toBe(false);
    const clan = result as ClanInfo;
    expect(clan.name).toBe("TestClan");
    expect(clan.bio).toBe("A test clan");
    expect(clan.color).toBe("#ff0000");
    expect(clan.isPublic).toBe(true);
    expect(clan.memberCount).toBe(1);
    expect(clan.clanId).toBeDefined();

    // Verify creator is owner
    const userClan = await getCurrentUserClan(user0.userId);
    expect(userClan!.role).toBe("owner");
  });

  it("should return error if user is already in a clan", async () => {
    await createTestClan(user0, { name: "FirstClan" });
    const result = await createTestClan(user0, { name: "SecondClan" });
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("leave your current clan");
  });

  it("should return error for duplicate clan name", async () => {
    await createTestClan(user0, { name: "UniqueName" });
    const result = await createTestClan(user1, { name: "UniqueName" });
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("already exists");
  });
});

// ---------------------------------------------------------------------------
// joinClan
// ---------------------------------------------------------------------------
describe("joinClan", () => {
  it("should return error when clan does not exist", async () => {
    const result = await joinClan(user1, "nonexistent-id", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("Clan not found");
  });

  it("should return error when user is already a member of this clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await joinClan(user1, clan.clanId, new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("already a member");
  });

  it("should return error when user is already in another clan", async () => {
    const clanA = (await createTestClan(user0, { name: "ClanA" })) as ClanInfo;
    await createTestClan(user1, { name: "ClanB" });
    const result = await joinClan(user1, clanA.clanId, new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("leave your current clan");
  });

  it("should let a user join a public clan as member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await joinClan(user1, clan.clanId, new Date());
    expect("error" in result).toBe(false);
    const info = result as UserClanInfo;
    expect(info.role).toBe("member");
    expect(info.clan.name).toBe("TestClan");
  });

  it("should create a join request for a private clan", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    const result = await joinClan(user1, clan.clanId, new Date());
    expect("error" in result).toBe(false);
    const invite = result as ClanInviteInfo;
    expect(invite.type).toBe("request");
    expect(invite.inviteId).toBeDefined();
    expect(invite.invitedBy).toBeNull();
  });

  it("should return error when pending request already exists", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await joinClan(user1, clan.clanId, new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("pending request");
  });

  it("should auto-accept when a pending invite exists for the user", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    // Owner invites user1
    await inviteUser(user0, clan.clanId, "user1", new Date());
    // Make the clan private so joinClan goes through the invite path
    await ClanModel.findByIdAndUpdate(clan.clanId, { isPublic: false });
    // User1 tries to join — should auto-accept the pending invite
    const result = await joinClan(user1, clan.clanId, new Date());
    expect("error" in result).toBe(false);
    // After auto-accept, user should be a member
    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("member");
  });
});

// ---------------------------------------------------------------------------
// leaveClan
// ---------------------------------------------------------------------------
describe("leaveClan", () => {
  it("should return error if user is not a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await leaveClan(user1, clan.clanId);
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should allow a regular member to leave", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await leaveClan(user1, clan.clanId);
    expect("success" in result).toBe(true);

    // Verify user is gone
    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).toBeNull();
  });

  it("should auto-transfer ownership when owner leaves with other members", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await leaveClan(user0, clan.clanId);
    expect("success" in result).toBe(true);

    // Verify ownership transferred
    const user1Clan = await getCurrentUserClan(user1.userId);
    expect(user1Clan).not.toBeNull();
    expect(user1Clan!.role).toBe("owner");

    // Verify user0 is gone
    const user0Clan = await getCurrentUserClan(user0.userId);
    expect(user0Clan).toBeNull();
  });

  it("should prefer admins as successor when owner leaves", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    // Promote user2 to admin
    await updateMemberRole(user0, clan.clanId, "user2", "admin");

    await leaveClan(user0, clan.clanId);

    // user2 (admin) should become owner over user1 (member)
    const user2Clan = await getCurrentUserClan(user2.userId);
    expect(user2Clan!.role).toBe("owner");
  });

  it("should disband clan when the sole owner leaves", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await leaveClan(user0, clan.clanId);
    expect("success" in result).toBe(true);

    // Clan should be deleted
    const detail = await getClanById(clan.clanId);
    expect(detail).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// kickMember
// ---------------------------------------------------------------------------
describe("kickMember", () => {
  it("should return error if actor is not a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await kickMember(user1, clan.clanId, "user0");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should return error if a regular member tries to kick", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    const result = await kickMember(user1, clan.clanId, "user2");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Only admins and owners");
  });

  it("should return error if target user does not exist", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await kickMember(user0, clan.clanId, "ghost_user");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("User not found");
  });

  it("should return error if target is not in the clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await kickMember(user0, clan.clanId, "user1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should return error when trying to kick the owner", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    const result = await kickMember(user1, clan.clanId, "user0");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Cannot kick the clan owner");
  });

  it("should return error when admin tries to kick another admin", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    await updateMemberRole(user0, clan.clanId, "user2", "admin");
    const result = await kickMember(user1, clan.clanId, "user2");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Admins cannot kick other admins");
  });

  it("should allow owner to kick a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await kickMember(user0, clan.clanId, "user1");
    expect("success" in result).toBe(true);

    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).toBeNull();
  });

  it("should allow admin to kick a regular member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    const result = await kickMember(user1, clan.clanId, "user2");
    expect("success" in result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// inviteUser
// ---------------------------------------------------------------------------
describe("inviteUser", () => {
  it("should return error if actor is not a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await inviteUser(user1, clan.clanId, "user2", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should return error if a regular member tries to invite", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await inviteUser(user1, clan.clanId, "user2", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Only admins and owners");
  });

  it("should return error if target user does not exist", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await inviteUser(user0, clan.clanId, "ghost_user", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("User not found");
  });

  it("should return error if target is already in a clan", async () => {
    const clanA = (await createTestClan(user0, { name: "ClanA" })) as ClanInfo;
    await createTestClan(user1, { name: "ClanB" });
    const result = await inviteUser(user0, clanA.clanId, "user1", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("already in a clan");
  });

  it("should return error if user has already been invited", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await inviteUser(user0, clan.clanId, "user1", new Date());
    const result = await inviteUser(user0, clan.clanId, "user1", new Date());
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("already been invited");
  });

  it("should create an invite successfully", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await inviteUser(user0, clan.clanId, "user1", new Date());
    expect("error" in result).toBe(false);
    const invite = result as ClanInviteInfo;
    expect(invite.inviteId).toBeDefined();
    expect(invite.type).toBe("invite");
    expect(invite.user.username).toBe("user1");
    expect(invite.invitedBy).not.toBeNull();
    expect(invite.invitedBy!.username).toBe("user0");
  });

  it("should auto-accept when target has a pending join request", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    // user1 requests to join
    await joinClan(user1, clan.clanId, new Date());
    // Owner invites user1 — should auto-accept the pending request
    const result = await inviteUser(user0, clan.clanId, "user1", new Date());
    expect("error" in result).toBe(false);

    // user1 should now be a member
    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("member");
  });
});

// ---------------------------------------------------------------------------
// respondToInvite
// ---------------------------------------------------------------------------
describe("respondToInvite", () => {
  it("should return null for a non-existent invite", async () => {
    const result = await respondToInvite(user1, "nonexistent-id", "accept");
    expect(result).toBeNull();
  });

  it("should return error if invite is already processed", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    // Accept it first
    await respondToInvite(user1, invite.inviteId, "accept");
    // Try again
    const result = await respondToInvite(user1, invite.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("already been processed");
  });

  it("should accept an invite and make user a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    const result = await respondToInvite(user1, invite.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);
    const info = result as UserClanInfo;
    expect(info.role).toBe("member");
    expect(info.clan.name).toBe("TestClan");
  });

  it("should reject an invite", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    const result = await respondToInvite(user1, invite.inviteId, "reject");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);

    // User should not be a member
    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).toBeNull();
  });

  it("should return error if user is not authorized for the invite", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    // user2 tries to accept user1's invite
    const result = await respondToInvite(user2, invite.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
  });

  it("should allow admin to accept a join request", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    const requestResult = (await joinClan(user1, clan.clanId, new Date())) as ClanInviteInfo;
    // Owner accepts the request
    const result = await respondToInvite(user0, requestResult.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);

    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe("member");
  });

  it("should allow admin to reject a join request", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    const requestResult = (await joinClan(user1, clan.clanId, new Date())) as ClanInviteInfo;
    const result = await respondToInvite(user0, requestResult.inviteId, "reject");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);

    const membership = await getCurrentUserClan(user1.userId);
    expect(membership).toBeNull();
  });

  it("should return error if regular member tries to respond to a join request", async () => {
    const clan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    // user2 joins as member (make clan public briefly)
    await ClanModel.findByIdAndUpdate(clan.clanId, { isPublic: true });
    await joinClan(user2, clan.clanId, new Date());
    await ClanModel.findByIdAndUpdate(clan.clanId, { isPublic: false });

    const requestResult = (await joinClan(user1, clan.clanId, new Date())) as ClanInviteInfo;
    // Regular member user2 tries to accept
    const result = await respondToInvite(user2, requestResult.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("Not authorized");
  });

  it("should return error when accepting a join request if user already joined another clan", async () => {
    // Create a private clan where user1 sends a join request
    const privateClan = (await createTestClan(user0, {
      name: "PrivateClan",
      isPublic: false,
    })) as ClanInfo;
    const requestResult = (await joinClan(user1, privateClan.clanId, new Date())) as ClanInviteInfo;

    // user1 joins a different public clan while the request is pending
    const publicClan = (await createTestClan(user2, { name: "PublicClan" })) as ClanInfo;
    await joinClan(user1, publicClan.clanId, new Date());

    // Owner accepts the request → should fail because user1 already joined another clan
    const result = await respondToInvite(user0, requestResult.inviteId, "accept");
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toBe("User has joined another clan");
  });
});

// ---------------------------------------------------------------------------
// cancelInvite
// ---------------------------------------------------------------------------
describe("cancelInvite", () => {
  it("should return null for a non-existent invite", async () => {
    const result = await cancelInvite(user0, "nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return error if invite is already processed", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    await respondToInvite(user1, invite.inviteId, "reject");
    const result = await cancelInvite(user0, invite.inviteId);
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("already been processed");
  });

  it("should return error if actor is not authorized", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    // user2 is not in the clan
    const result = await cancelInvite(user2, invite.inviteId);
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("Not authorized");
  });

  it("should cancel a pending invite successfully", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    const result = await cancelInvite(user0, invite.inviteId);
    expect(result).not.toBeNull();
    expect("success" in result!).toBe(true);

    // The invite should no longer be pending
    const userInvites = await getUserInvites(user1.userId);
    expect(userInvites).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getClanInvites
// ---------------------------------------------------------------------------
describe("getClanInvites", () => {
  it("should return null for a non-existent clan", async () => {
    const result = await getClanInvites(user0, "nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return error if a regular member tries to view invites", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await getClanInvites(user1, clan.clanId);
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("Not authorized");
  });

  it("should return pending invites for admin/owner", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await inviteUser(user0, clan.clanId, "user1", new Date());
    await inviteUser(user0, clan.clanId, "user2", new Date());

    const result = await getClanInvites(user0, clan.clanId);
    expect(Array.isArray(result)).toBe(true);
    expect((result as ClanInviteInfo[]).length).toBe(2);
  });

  it("should auto-reject invites for users who already joined a clan", async () => {
    const clanA = (await createTestClan(user0, { name: "ClanA" })) as ClanInfo;
    // Invite user1 to clanA
    await inviteUser(user0, clanA.clanId, "user1", new Date());

    // user1 joins a different clan before accepting
    const clanB = (await createTestClan(user2, { name: "ClanB" })) as ClanInfo;
    await joinClan(user1, clanB.clanId, new Date());

    // getClanInvites should auto-reject user1's invite
    const result = await getClanInvites(user0, clanA.clanId);
    expect(Array.isArray(result)).toBe(true);
    expect((result as ClanInviteInfo[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getUserInvites
// ---------------------------------------------------------------------------
describe("getUserInvites", () => {
  it("should return an empty array when no invites exist", async () => {
    const invites = await getUserInvites(user1.userId);
    expect(invites).toEqual([]);
  });

  it("should return pending invites for the user", async () => {
    const clanA = (await createTestClan(user0, { name: "ClanA" })) as ClanInfo;
    const clanB = (await createTestClan(user2, { name: "ClanB" })) as ClanInfo;
    await inviteUser(user0, clanA.clanId, "user1", new Date());
    await inviteUser(user2, clanB.clanId, "user1", new Date());

    const invites = await getUserInvites(user1.userId);
    expect(invites).toHaveLength(2);
    const clanNames = invites.map((i) => i.clan.name);
    expect(clanNames).toContain("ClanA");
    expect(clanNames).toContain("ClanB");
  });

  it("should not return accepted/rejected invites", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const invite = (await inviteUser(user0, clan.clanId, "user1", new Date())) as ClanInviteInfo;
    await respondToInvite(user1, invite.inviteId, "reject");

    const invites = await getUserInvites(user1.userId);
    expect(invites).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateClan
// ---------------------------------------------------------------------------
describe("updateClan", () => {
  it("should return null for a non-existent clan", async () => {
    const result = await updateClan(user0, "nonexistent-id", {
      name: "NewName",
    });
    expect(result).toBeNull();
  });

  it("should return error if user is not authorized (regular member)", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await updateClan(user1, clan.clanId, { name: "NewName" });
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("Not authorized");
  });

  it("should return error for duplicate clan name", async () => {
    const clanA = (await createTestClan(user0, { name: "ClanA" })) as ClanInfo;
    await createTestClan(user1, { name: "ClanB" });
    const result = await updateClan(user0, clanA.clanId, { name: "ClanB" });
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toContain("already exists");
  });

  it("should update clan fields successfully", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await updateClan(user0, clan.clanId, {
      name: "UpdatedClan",
      bio: "New bio",
      color: "#00ff00",
      isPublic: false,
    });
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);
    const updated = result as ClanInfo;
    expect(updated.name).toBe("UpdatedClan");
    expect(updated.bio).toBe("New bio");
    expect(updated.color).toBe("#00ff00");
    expect(updated.isPublic).toBe(false);
  });

  it("should allow admin to update clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    const result = await updateClan(user1, clan.clanId, { bio: "Admin updated" });
    expect(result).not.toBeNull();
    expect("error" in result!).toBe(false);
    expect((result as ClanInfo).bio).toBe("Admin updated");
  });
});

// ---------------------------------------------------------------------------
// updateMemberRole
// ---------------------------------------------------------------------------
describe("updateMemberRole", () => {
  it("should return error if actor is not a member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await updateMemberRole(user1, clan.clanId, "user0", "admin");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should return error if a regular member tries to change roles", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    const result = await updateMemberRole(user1, clan.clanId, "user2", "admin");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Only the owner");
  });

  it("should return error if non-owner tries to promote to admin", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    // admin tries to promote user2
    const result = await updateMemberRole(user1, clan.clanId, "user2", "admin");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Only the owner");
  });

  it("should allow owner to promote member to admin", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await updateMemberRole(user0, clan.clanId, "user1", "admin");
    expect("error" in result).toBe(false);
    expect((result as ClanMemberInfo).role).toBe("admin");
  });

  it("should allow owner to demote admin to member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    const result = await updateMemberRole(user0, clan.clanId, "user1", "member");
    expect("error" in result).toBe(false);
    expect((result as ClanMemberInfo).role).toBe("member");
  });

  it("should return error when trying to change the owner's role", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    // admin tries to change owner's role
    const result = await updateMemberRole(user1, clan.clanId, "user0", "member");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Cannot change owner's role");
  });

  it("should return error when a member tries to demote another member", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    // member tries to change another member's role to "member" (not admin, so skips the admin-only check)
    const result = await updateMemberRole(user1, clan.clanId, "user2", "member");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("Not authorized");
  });

  it("should return error when target username does not exist", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await updateMemberRole(user0, clan.clanId, "ghost_user", "admin");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("User not found");
  });

  it("should return error when target user is not a member of the clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    // user1 exists but is not in the clan
    const result = await updateMemberRole(user0, clan.clanId, "user1", "admin");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("User is not a member of this clan");
  });

  it("should return error when admin tries to demote another admin", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    await joinClan(user2, clan.clanId, new Date());
    await updateMemberRole(user0, clan.clanId, "user1", "admin");
    await updateMemberRole(user0, clan.clanId, "user2", "admin");
    // admin1 tries to demote admin2
    const result = await updateMemberRole(user1, clan.clanId, "user2", "member");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("Only the owner can demote admins");
  });
});

// ---------------------------------------------------------------------------
// transferOwnership
// ---------------------------------------------------------------------------
describe("transferOwnership", () => {
  it("should return error if actor is not the owner", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await transferOwnership(user1, clan.clanId, "user0");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("Only the owner");
  });

  it("should return error if target user does not exist", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await transferOwnership(user0, clan.clanId, "ghost_user");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("User not found");
  });

  it("should return error if target is not in the clan", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    const result = await transferOwnership(user0, clan.clanId, "user1");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toContain("not a member");
  });

  it("should transfer ownership successfully", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());
    const result = await transferOwnership(user0, clan.clanId, "user1");
    expect("success" in result).toBe(true);

    // user1 should be owner, user0 should be member
    const user0Clan = await getCurrentUserClan(user0.userId);
    const user1Clan = await getCurrentUserClan(user1.userId);
    expect(user0Clan!.role).toBe("member");
    expect(user1Clan!.role).toBe("owner");
  });
});

// ---------------------------------------------------------------------------
// getClanMemberLeaderboard
// ---------------------------------------------------------------------------
describe("getClanMemberLeaderboard", () => {
  it("should return null for a non-existent clan", async () => {
    const result = await getClanMemberLeaderboard("nonexistent-id");
    expect(result).toBeNull();
  });

  it("should return sorted entries for clan members", async () => {
    const clan = (await createTestClan(user0)) as ClanInfo;
    await joinClan(user1, clan.clanId, new Date());

    const result = await getClanMemberLeaderboard(clan.clanId);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    // Each entry should have expected shape
    const entry = result![0];
    expect(entry.username).toBeDefined();
    expect(typeof entry.pointsTotal).toBe("number");
    expect(typeof entry.gamesPlayedTotal).toBe("number");
    expect(typeof entry.achievementCount).toBe("number");
    expect(entry.role).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getClanLeaderboard
// ---------------------------------------------------------------------------
describe("getClanLeaderboard", () => {
  it("should return empty array when no clans exist", async () => {
    const result = await getClanLeaderboard();
    expect(result).toEqual([]);
  });

  it("should return entries after creating clans", async () => {
    await createTestClan(user0, { name: "ClanA" });
    await createTestClan(user1, { name: "ClanB" });

    const result = await getClanLeaderboard();
    expect(result).toHaveLength(2);
    const names = result.map((e) => e.name);
    expect(names).toContain("ClanA");
    expect(names).toContain("ClanB");
    // Each entry should have expected fields
    const entry = result[0];
    expect(entry.clanId).toBeDefined();
    expect(typeof entry.memberCount).toBe("number");
    expect(typeof entry.totalPoints).toBe("number");
    expect(typeof entry.totalWins).toBe("number");
    expect(typeof entry.totalGamesPlayed).toBe("number");
  });
});

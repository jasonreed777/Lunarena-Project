import { describe, it, expect, beforeEach } from "vitest";
import { getUserByUsername } from "../../src/services/auth.service.ts";
import {
  populateUserProfile,
  createDefaultProfile,
  getProfileByUsername,
  updateProfile,
  uploadProfileImage,
  getUploadedImage,
  getProfileWithStatsByUsername,
} from "../../src/services/profile.service.ts";
import {
  UserProfileModel,
  UploadedImageModel,
  UserGameStatsModel,
} from "../../src/mongoose-models.ts";
import type { UserWithId } from "../../src/types.ts";

let user0: UserWithId;
let user1: UserWithId;
let user2: UserWithId;

beforeEach(async () => {
  await UserProfileModel.deleteMany({});
  await UploadedImageModel.deleteMany({});
  await UserGameStatsModel.deleteMany({});

  const u0 = await getUserByUsername("user0");
  const u1 = await getUserByUsername("user1");
  const u2 = await getUserByUsername("user2");
  user0 = { userId: u0!.userId, username: u0!.username };
  user1 = { userId: u1!.userId, username: u1!.username };
  user2 = { userId: u2!.userId, username: u2!.username };
});

describe("populateUserProfile", () => {
  it("should throw for a non-existent user ID", async () => {
    await expect(populateUserProfile("nonexistent-id")).rejects.toThrow(
      "Failed to find profile for user nonexistent-id",
    );
  });

  it("should return the profile after creating one", async () => {
    await createDefaultProfile(user0.userId, user0.username);
    const profile = await populateUserProfile(user0.userId);
    expect(profile.username).toBe("user0");
    expect(profile.bio).toBe("");
    expect(profile.pfp.type).toBe("avatar");
    expect(profile.pfp.avatarId).toBe("gamer");
  });
});

describe("createDefaultProfile", () => {
  it("should create a default profile with expected defaults", async () => {
    const profile = await createDefaultProfile(user0.userId, user0.username);
    expect(profile.username).toBe("user0");
    expect(profile.bio).toBe("");
    expect(profile.pfp).toEqual({ type: "avatar", avatarId: "gamer" });
    expect(profile.profileBorderColor).toBe("#ffffff");
    expect(profile.totalTimePlayedMS).toBe(0);
    expect(profile.onlinePresence.status).toBe("offline");
    expect(profile.onlinePresence.lastActive).toBeTruthy();
  });

  it("should return existing profile if one already exists", async () => {
    const first = await createDefaultProfile(user0.userId, user0.username);
    const second = await createDefaultProfile(user0.userId, user0.username);
    expect(second.username).toBe(first.username);
    expect(second.updatedAt).toBe(first.updatedAt);
  });
});

describe("getProfileByUsername", () => {
  it("should throw for a non-existent username", async () => {
    await expect(getProfileByUsername("no_such_user")).rejects.toThrow("No user no_such_user");
  });

  it("should auto-create a default profile if none exists", async () => {
    const profile = await getProfileByUsername("user0");
    expect(profile.username).toBe("user0");
    expect(profile.bio).toBe("");
    expect(profile.pfp.type).toBe("avatar");
    expect(profile.totalTimePlayedMS).toBe(0);
  });

  it("should return existing profile", async () => {
    await createDefaultProfile(user1.userId, user1.username);
    await updateProfile(user1.username, { bio: "hello world" });

    const profile = await getProfileByUsername("user1");
    expect(profile.bio).toBe("hello world");
  });
});

describe("updateProfile", () => {
  it("should throw for a non-existent username", async () => {
    await expect(updateProfile("no_such_user", { bio: "x" })).rejects.toThrow(
      "No user no_such_user",
    );
  });

  it("should update bio", async () => {
    const profile = await updateProfile(user0.username, { bio: "I love games" });
    expect(profile.bio).toBe("I love games");
  });

  it("should update pfp", async () => {
    const profile = await updateProfile(user0.username, {
      pfp: { type: "avatar", avatarId: "ninja" },
    });
    expect(profile.pfp).toEqual({ type: "avatar", avatarId: "ninja" });
  });

  it("should update profileBorderColor", async () => {
    const profile = await updateProfile(user0.username, { profileBorderColor: "#ff0000" });
    expect(profile.profileBorderColor).toBe("#ff0000");
  });

  it("should update titleId", async () => {
    const profile = await updateProfile(user0.username, { titleId: "champion" });
    expect(profile.titleId).toBe("champion");
  });

  describe("online presence transitions", () => {
    it("should set presence when transitioning from offline to active", async () => {
      const now = new Date().toISOString();
      const profile = await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: now },
      });
      expect(profile.onlinePresence.status).toBe("active");
      expect(profile.onlinePresence.lastActive).toBe(now);
    });

    it("should calculate totalTimePlayedMS when transitioning from active to offline", async () => {
      // First, go active with a known lastActive timestamp in the past
      const sessionStart = new Date(Date.now() - 5000).toISOString();
      await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: sessionStart },
      });

      // Now go offline — totalTimePlayedMS should be computed
      const offlineTime = new Date().toISOString();
      const profile = await updateProfile(user0.username, {
        onlinePresence: { status: "offline", lastActive: offlineTime },
      });

      expect(profile.onlinePresence.status).toBe("offline");
      // The session was about 5 seconds; give a generous tolerance for test timing
      expect(profile.totalTimePlayedMS).toBeGreaterThanOrEqual(4000);
      expect(profile.totalTimePlayedMS).toBeLessThan(30000);
    });

    it("should keep original lastActive when transitioning from active to active", async () => {
      const originalActive = new Date(Date.now() - 10000).toISOString();
      await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: originalActive },
      });

      // Update again as active with a different lastActive — should keep the original
      const newActive = new Date().toISOString();
      const profile = await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: newActive, activeGameId: "game123" },
      });

      expect(profile.onlinePresence.status).toBe("active");
      expect(profile.onlinePresence.lastActive).toBe(originalActive);
      expect(profile.onlinePresence.activeGameId).toBe("game123");
    });

    it("should do a basic update when transitioning from offline to offline", async () => {
      // Ensure the profile starts offline (the default)
      await createDefaultProfile(user0.userId, user0.username);

      const now = new Date().toISOString();
      const profile = await updateProfile(user0.username, {
        onlinePresence: { status: "offline", lastActive: now },
      });

      expect(profile.onlinePresence.status).toBe("offline");
      expect(profile.onlinePresence.lastActive).toBe(now);
      expect(profile.totalTimePlayedMS).toBe(0);
    });

    it("should accumulate totalTimePlayedMS across multiple active/offline cycles", async () => {
      // Cycle 1: active for ~5 seconds
      const start1 = new Date(Date.now() - 5000).toISOString();
      await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: start1 },
      });
      await updateProfile(user0.username, {
        onlinePresence: { status: "offline", lastActive: new Date().toISOString() },
      });

      // Check after first cycle
      const afterFirst = await getProfileByUsername(user0.username);
      const firstCycleTime = afterFirst.totalTimePlayedMS;
      expect(firstCycleTime).toBeGreaterThanOrEqual(4000);

      // Cycle 2: active for ~3 seconds
      const start2 = new Date(Date.now() - 3000).toISOString();
      await updateProfile(user0.username, {
        onlinePresence: { status: "active", lastActive: start2 },
      });
      await updateProfile(user0.username, {
        onlinePresence: { status: "offline", lastActive: new Date().toISOString() },
      });

      const afterSecond = await getProfileByUsername(user0.username);
      expect(afterSecond.totalTimePlayedMS).toBeGreaterThan(firstCycleTime);
    });
  });

  it("should call getOrUpdateStreak when going active", async () => {
    // Going active should not throw (streak logic runs internally)
    const now = new Date().toISOString();
    const profile = await updateProfile(user0.username, {
      onlinePresence: { status: "active", lastActive: now },
    });
    expect(profile.onlinePresence.status).toBe("active");
  });
});

describe("uploadProfileImage", () => {
  it("should throw for a non-existent username", async () => {
    await expect(
      uploadProfileImage("no_such_user", { contentType: "image/png", data: "abc123" }),
    ).rejects.toThrow("No user no_such_user");
  });

  it("should create an upload and set pfp to upload type", async () => {
    const profile = await uploadProfileImage(user0.username, {
      contentType: "image/png",
      data: "base64encodeddata",
    });

    expect(profile.pfp.type).toBe("upload");
    expect(profile.pfp.uploadId).toBeTruthy();

    // Verify the uploaded image was persisted
    const image = await getUploadedImage(profile.pfp.uploadId!);
    expect(image.contentType).toBe("image/png");
    expect(image.data).toBe("base64encodeddata");
    expect(image.userWhoUploaded).toBe("user0");
  });
});

describe("getUploadedImage", () => {
  it("should throw for a non-existent upload ID", async () => {
    await expect(getUploadedImage("nonexistent-upload-id")).rejects.toThrow(
      "Failed to find uploaded image nonexistent-upload-id",
    );
  });

  it("should return the uploaded image after uploading one", async () => {
    const profile = await uploadProfileImage(user1.username, {
      contentType: "image/jpeg",
      data: "somejpegdata",
    });

    const image = await getUploadedImage(profile.pfp.uploadId!);
    expect(image.contentType).toBe("image/jpeg");
    expect(image.data).toBe("somejpegdata");
    expect(image.userWhoUploaded).toBe("user1");
    expect(image.uploadedAt).toBeTruthy();
  });
});

describe("getProfileWithStatsByUsername", () => {
  it("should return default 0 stats when no game stats exist", async () => {
    const result = await getProfileWithStatsByUsername(user0.username);

    expect(result.username).toBe("user0");
    expect(result.totalTimePlayedMS).toBe(0);
    expect(result.stats).toEqual({
      overall: { wins: 0, gamesPlayed: 0, losses: 0 },
      byGame: {},
    });
  });

  it("should return calculated stats (wins, losses, gamesPlayed) when stats exist", async () => {
    // Seed game stats for user0
    await UserGameStatsModel.create({
      _id: user0.username,
      winsTotal: 7,
      gamesPlayedTotal: 12,
      byGame: {
        nim: { wins: 4, gamesPlayed: 8 },
        guess: { wins: 3, gamesPlayed: 4 },
      },
      updatedAt: new Date().toISOString(),
    });

    const result = await getProfileWithStatsByUsername(user0.username);

    expect(result.username).toBe("user0");
    expect(result.stats.overall).toEqual({
      wins: 7,
      gamesPlayed: 12,
      losses: 5,
    });
    expect(result.stats.byGame.nim).toEqual({
      wins: 4,
      gamesPlayed: 8,
      losses: 4,
    });
    expect(result.stats.byGame.guess).toEqual({
      wins: 3,
      gamesPlayed: 4,
      losses: 1,
    });
  });

  it("should return totalTimePlayedMS from the profile when stats exist", async () => {
    // Set some play time on the profile
    const sessionStart = new Date(Date.now() - 10000).toISOString();
    await updateProfile(user2.username, {
      onlinePresence: { status: "active", lastActive: sessionStart },
    });
    await updateProfile(user2.username, {
      onlinePresence: { status: "offline", lastActive: new Date().toISOString() },
    });

    // Seed minimal game stats
    await UserGameStatsModel.create({
      _id: user2.username,
      winsTotal: 1,
      gamesPlayedTotal: 2,
      byGame: {},
      updatedAt: new Date().toISOString(),
    });

    const result = await getProfileWithStatsByUsername(user2.username);
    expect(result.totalTimePlayedMS).toBeGreaterThanOrEqual(9000);
    expect(result.stats.overall.gamesPlayed).toBe(2);
  });
});

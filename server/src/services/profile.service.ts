import { randomUUID } from "node:crypto";
import { getUserByUsername } from "./auth.service.ts";
import { UserProfileModel, UploadedImageModel, UserGameStatsModel } from "../mongoose-models.ts";
import { type UserProfileRecord, type UploadedImageRecord } from "../models.ts";
import type { UserProfileImageUploadRequest } from "@gamenite/shared";
import { getOrUpdateStreak } from "./points.service.ts";

/**
 * Retrieves a single profile from the database
 *
 * @param userId - Valid user id
 * @returns the found profile object
 */
export async function populateUserProfile(userId: string): Promise<UserProfileRecord> {
  const doc = await UserProfileModel.findById(userId).lean();
  if (!doc) throw new Error(`Failed to find profile for user ${userId}`);
  return doc as unknown as UserProfileRecord;
}

/**
 * Creates and stores a default profile for a user if one does not already exist
 *
 * @param userId - Valid user id
 * @param username - Username of the user
 * @returns the created or existing profile
 */
export async function createDefaultProfile(
  userId: string,
  username: string,
): Promise<UserProfileRecord> {
  const existing = await UserProfileModel.findById(userId).lean();
  if (existing) return existing as unknown as UserProfileRecord;

  const now = new Date().toISOString();
  const profile: UserProfileRecord = {
    username,
    bio: "",
    pfp: {
      type: "avatar",
      avatarId: "gamer",
    },
    profileBorderColor: "#ffffff",
    updatedAt: now,
    totalTimePlayedMS: 0,
    onlinePresence: {
      status: "offline",
      lastActive: now,
    },
  };

  await UserProfileModel.findByIdAndUpdate(userId, { $set: profile }, { upsert: true });
  return profile;
}

/**
 * Retrieves a user's profile by username
 *
 * @param username - Username of the user
 * @returns the user's profile
 * @throws if the username does not exist
 */
export async function getProfileByUsername(username: string): Promise<UserProfileRecord> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);

  const existing = await UserProfileModel.findById(user.userId).lean();
  if (existing) return existing as unknown as UserProfileRecord;

  return createDefaultProfile(user.userId, username);
}

/**
 * Represents allowed updates to a user's profile customization
 */
export interface UserProfileUpdateRequest {
  bio?: string;
  pfp?: {
    type: "upload" | "avatar";
    uploadId?: string;
    avatarId?: string;
  };
  titleId?: string;
  profileBorderColor?: string;
  onlinePresence?: {
    status: "active" | "offline";
    activeGameId?: string;
    lastActive: string;
  };
}

/*
 * Updates a user's profile with the provided information
 * @param username - Username of the user
 * @param updates - An object containing the profile fields to update
 * @returns the updated profile
 * @throws if the username does not exist
 */
export async function updateProfile(
  username: string,
  updates: UserProfileUpdateRequest,
): Promise<UserProfileRecord> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);

  const profile = await createDefaultProfile(user.userId, username);
  const previousOnlinePresence = profile.onlinePresence;

  if (updates.bio !== undefined) profile.bio = updates.bio;
  if (updates.pfp !== undefined) profile.pfp = updates.pfp;
  if (updates.titleId !== undefined) profile.titleId = updates.titleId;
  if (updates.profileBorderColor !== undefined) {
    profile.profileBorderColor = updates.profileBorderColor;
  }

  // If online presence is being updated, calculate time played based on the previous presence status and last active time
  if (updates.onlinePresence !== undefined) {
    if (previousOnlinePresence.status === "active" && updates.onlinePresence.status === "offline") {
      const sessionStart = new Date(previousOnlinePresence.lastActive).getTime();
      const sessionEnd = new Date().getTime();
      const sessionDuration = sessionEnd - sessionStart;

      if (sessionDuration > 0) {
        profile.totalTimePlayedMS = (profile.totalTimePlayedMS ?? 0) + sessionDuration;
      }

      profile.onlinePresence = updates.onlinePresence;
    } else if (
      previousOnlinePresence.status === "offline" &&
      updates.onlinePresence.status === "active"
    ) {
      // Start of a new active session
      profile.onlinePresence = updates.onlinePresence;
    } else if (
      previousOnlinePresence.status === "active" &&
      updates.onlinePresence.status === "active"
    ) {
      // Keep original session start time instead of resetting it
      profile.onlinePresence = {
        ...updates.onlinePresence,
        lastActive: previousOnlinePresence.lastActive,
      };
    } else {
      profile.onlinePresence = updates.onlinePresence;
    }
  }

  profile.updatedAt = new Date().toISOString();

  if (profile.onlinePresence.status === "active") {
    // When a user comes online, update their streak
    await getOrUpdateStreak(profile.username);
  }

  await UserProfileModel.findByIdAndUpdate(user.userId, { $set: profile }, { upsert: true });
  return profile;
}

/**
 * Uploads a new profile image for a user
 * @param username username of the user
 * @param upload profile image upload request
 * @returns the updated user profile
 */
export async function uploadProfileImage(
  username: string,
  upload: UserProfileImageUploadRequest,
): Promise<UserProfileRecord> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);

  const profile = await createDefaultProfile(user.userId, username);

  const uploadedImage: UploadedImageRecord = {
    userWhoUploaded: username,
    contentType: upload.contentType,
    data: upload.data,
    uploadedAt: new Date().toISOString(),
  };

  const uploadId = randomUUID().toString();
  await UploadedImageModel.create({ _id: uploadId, ...uploadedImage });

  profile.pfp = { type: "upload", uploadId };
  profile.updatedAt = new Date().toISOString();

  await UserProfileModel.findByIdAndUpdate(user.userId, { $set: profile }, { upsert: true });
  return profile;
}

/**
 * Gets an uploaded image by its upload ID
 * @param uploadId The ID of the uploaded image to retrieve
 * @returns A promise resolving to the uploaded image record
 */
export async function getUploadedImage(uploadId: string): Promise<UploadedImageRecord> {
  const doc = await UploadedImageModel.findById(uploadId).lean();
  if (!doc) throw new Error(`Failed to find uploaded image ${uploadId}`);
  return doc as unknown as UploadedImageRecord;
}

export interface ProfileGameStats {
  wins: number;
  gamesPlayed: number;
  losses: number;
}

// Includes everything in UserPRofileRecord plus a stats field with overall and per-game stats
export interface UserProfileWithStats extends UserProfileRecord {
  stats: {
    overall: ProfileGameStats;
    byGame: Record<string, ProfileGameStats>;
  };
}

// Original per game stats shape as stored in the database
type StoredPerGameStats = {
  wins: number;
  gamesPlayed: number;
};

/**
 * Retrieves a user's profile along with their game statistics
 * @param username username to look up
 * @returns a promise that resolves to the user's profile along with their game statistics
 */
export async function getProfileWithStatsByUsername(
  username: string,
): Promise<UserProfileWithStats> {
  // Get existing profile info
  const profile = await getProfileByUsername(username);
  // Get game stats for the user
  const existingStats = await UserGameStatsModel.findById(username).lean();
  // If no stats record exists for this user, return the profile with default 0 stats
  if (!existingStats) {
    return {
      ...profile,
      // Ensure totalTimePlayedMS is set to 0 if undefined
      totalTimePlayedMS: profile.totalTimePlayedMS ?? 0,
      stats: {
        overall: {
          wins: 0,
          gamesPlayed: 0,
          losses: 0,
        },
        byGame: {},
      },
    };
  }
  // If stats record exists, use it, if not use an empty object for per-game stats
  const storedStatsPerGame = (existingStats.byGame ?? {}) as Record<string, StoredPerGameStats>;
  // Hold finalized per game stats
  const profileStatsPerGame: Record<string, ProfileGameStats> = Object.fromEntries(
    // Map the raw per-game stats from the database to include losses calculated from wins and games played
    Object.entries(storedStatsPerGame).map(([gameType, gameStats]) => [
      gameType,
      {
        wins: gameStats.wins,
        gamesPlayed: gameStats.gamesPlayed,
        losses: gameStats.gamesPlayed - gameStats.wins,
      },
    ]),
  );

  return {
    ...profile,
    totalTimePlayedMS: profile.totalTimePlayedMS ?? 0,
    stats: {
      overall: {
        wins: existingStats.winsTotal,
        gamesPlayed: existingStats.gamesPlayedTotal,
        losses: existingStats.gamesPlayedTotal - existingStats.winsTotal,
      },
      byGame: profileStatsPerGame,
    },
  };
}

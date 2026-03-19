import { randomUUID } from "node:crypto";
import { getUserByUsername } from "./auth.service.ts";
import { UserProfileModel, UploadedImageModel } from "../mongoose-models.ts";
import { type UserProfileRecord, type UploadedImageRecord } from "../records.ts";
import type { UserProfileImageUploadRequest } from "@gamenite/shared";

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
      avatarId: "default",
    },
    profileBorderColor: "#ffffff",
    updatedAt: now,
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
    status: "active" | "inactive" | "offline";
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

  if (updates.bio !== undefined) profile.bio = updates.bio;
  if (updates.pfp !== undefined) profile.pfp = updates.pfp;
  if (updates.titleId !== undefined) profile.titleId = updates.titleId;
  if (updates.profileBorderColor !== undefined) {
    profile.profileBorderColor = updates.profileBorderColor;
  }
  if (updates.onlinePresence !== undefined) {
    profile.onlinePresence = updates.onlinePresence;
  }

  profile.updatedAt = new Date().toISOString();

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

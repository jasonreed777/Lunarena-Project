import { zUserProfileUpdateRequest, zUserProfileImageUploadRequest } from "@gamenite/shared";
import { type UploadedImageRecord, type UserProfileRecord } from "../models.ts";

import {
  getUploadedImage,
  updateProfile,
  uploadProfileImage,
  getProfileWithStatsByUsername,
  type UserProfileWithStats,
} from "../services/profile.service.ts";
import { type RestAPI } from "../types.ts";

/**
 * Retrieves a user's profile by their username
 */
export const getByUsername: RestAPI<UserProfileWithStats, { username: string }> = async (
  req,
  res,
) => {
  try {
    res.send(await getProfileWithStatsByUsername(req.params.username));
  } catch {
    res.status(404).send({ error: "User not found" });
  }
};

/**
 * Updates a user's profile through their username
 */
export const postByUsername: RestAPI<UserProfileRecord, { username: string }> = async (
  req,
  res,
) => {
  const body = zUserProfileUpdateRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Bad request" });
    return;
  }

  if (req.authUser.username !== req.params.username) {
    res.status(403).send({ error: "Invalid login" });
    return;
  }

  res.send(await updateProfile(req.params.username, body.data));
};

/**
 * Uploads a new profile picture for the user
 */
export const postUploadByUsername: RestAPI<UserProfileRecord, { username: string }> = async (
  req,
  res,
) => {
  const body = zUserProfileImageUploadRequest.safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  if (req.authUser.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await uploadProfileImage(req.params.username, body.data));
};

/**
 * Gets an uploaded profile image by its upload ID
 */
export const getUploadById: RestAPI<UploadedImageRecord, { uploadId: string }> = async (
  req,
  res,
) => {
  try {
    res.send(await getUploadedImage(req.params.uploadId));
  } catch {
    res.status(404).send({ error: "Uploaded image not found" });
  }
};

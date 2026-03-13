import {
  zUserProfileUpdateRequest,
  withAuth,
  zUserProfileImageUploadRequest,
} from "@gamenite/shared";
import { type UploadedImageRecord, type UserProfileRecord } from "../models.ts";

import {
  getProfileByUsername,
  getUploadedImage,
  updateProfile,
  uploadProfileImage,
} from "../services/profile.service.ts";
import { type RestAPI } from "../types.ts";
import { checkAuth } from "../services/auth.service.ts";

/**
 * Retrieves a user's profile by their username
 */
export const getByUsername: RestAPI<UserProfileRecord, { username: string }> = async (req, res) => {
  try {
    res.send(await getProfileByUsername(req.params.username));
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
  const body = withAuth(zUserProfileUpdateRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Bad request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user || user.username !== req.params.username) {
    res.status(403).send({ error: "Invalid login" });
    return;
  }

  res.send(await updateProfile(req.params.username, body.data.payload));
};

/**
 * Uploads a new profile picture for the user
 * @param req request containing the username and the new profile picture data
 * @param res response containing the updated user profile or an error message
 * @returns profile with the new profile picture if successful, or an error message if the request is invalid or the user is not authenticated
 */
export const postUploadByUsername: RestAPI<UserProfileRecord, { username: string }> = async (
  req,
  res,
) => {
  const body = withAuth(zUserProfileImageUploadRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user || user.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await uploadProfileImage(req.params.username, body.data.payload));
};

/**
 * Gets an uploaded profile image by its upload ID
 * @param req request containing the upload ID of the profile picture to retrieve
 * @param res response containing the requested profile picture or an error message if the image is not found
 * @returns the requested profile picture if found, or an error message if the image is not found
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

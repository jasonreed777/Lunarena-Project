import { zUserProfileUpdateRequest, withAuth } from "@gamenite/shared";
import { type UserProfileRecord } from "../models.ts";

import { getProfileByUsername, updateProfile } from "../services/profile.service.ts";
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

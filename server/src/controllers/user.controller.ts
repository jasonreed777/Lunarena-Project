import { type SafeUserInfo, zUserUpdateRequest } from "@gamenite/shared";
import { getUsersByUsername, populateSafeUserInfo, searchUsers, updateUser } from "../services/user.service.ts";
import { type RestAPI } from "../types.ts";
import { z } from "zod";
import { getUserByUsername } from "../services/auth.service.ts";

/**
 * Update a user's information (auth via session middleware)
 */
export const postByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const body = z.object({ payload: zUserUpdateRequest }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  if (req.authUser.username !== req.params.username) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  res.send(await updateUser(req.params.username, body.data.payload));
};

/**
 * Retrieves a user by their username.
 */
export const getByUsername: RestAPI<SafeUserInfo, { username: string }> = async (req, res) => {
  const user = await getUserByUsername(req.params.username);
  if (!user) {
    res.status(404).send({ error: "User not found" });
    return;
  }
  res.send(await populateSafeUserInfo(user.userId));
};

/**
 * Searches for users by username or display name.
 */
export const getSearch: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || q.trim().length === 0) {
    res.status(400).send({ error: "Missing search query" });
    return;
  }
  res.send(await searchUsers(q.trim(), 5));
};

/**
 * Returns the user information for a list of users
 */
export const postList: RestAPI<SafeUserInfo[]> = async (req, res) => {
  const usernames = z.array(z.string()).safeParse(req.body);
  if (!usernames.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  let users: SafeUserInfo[];
  try {
    users = await getUsersByUsername(usernames.data);
  } catch {
    res.send({ error: "Usernames do not all exist" });
    return;
  }

  res.send(users);
};

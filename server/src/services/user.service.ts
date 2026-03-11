import { randomUUID } from "node:crypto";
import { type SafeUserInfo, type UserUpdateRequest } from "@gamenite/shared";
import { getUserByUsername, updateAuth } from "./auth.service.ts";
import { UserModel } from "../mongoose-models.ts";

const disallowedUsernames = new Set(["login", "signup", "list"]);

/**
 * Retrieves a single user from the database.
 *
 * @param userId - Valid user id.
 * @returns the found user object (without the password).
 */
export async function populateSafeUserInfo(userId: string): Promise<SafeUserInfo> {
  const doc = await UserModel.findById(userId).lean();
  if (!doc) throw new Error(`Failed to find user ${userId}`);
  return {
    username: doc.username,
    display: doc.display,
    createdAt: new Date(doc.createdAt),
  };
}

/**
 * Create and store a new user
 *
 * @param newUser - The user object to be saved, containing user details like username, password, etc.
 * @returns Resolves with the saved user object (without the password) or an error message.
 */
export async function createUser(
  username: string,
  password: string,
  createdAt: Date,
): Promise<SafeUserInfo | { error: string }> {
  if ((await getUserByUsername(username)) !== null) {
    return { error: "User already exists" };
  }
  if (disallowedUsernames.has(username)) {
    return { error: "That is not a permitted username" };
  }
  const id = randomUUID().toString();
  await UserModel.create({ _id: id, username, createdAt: createdAt.toISOString(), display: username });
  await updateAuth(username, password, id);
  return { username, createdAt, display: username };
}

/**
 * Retrieves a list of usernames from the database
 *
 * @param usernames - A list of usernames
 * @returns the SafeUserInfo objects corresponding to those users
 * @throws if any of the usernames are not valid
 */
export async function getUsersByUsername(usernames: string[]): Promise<SafeUserInfo[]> {
  return Promise.all(
    usernames.map(async (username) => {
      const user = await getUserByUsername(username);
      if (user === null) {
        throw new Error(`No user ${username}`);
      }
      return populateSafeUserInfo(user.userId);
    }),
  );
}

/**
 * Updates user information in the database
 *
 * @param username - A valid username for the user to update
 * @param updates - An object that defines the fields to be updated and their new values
 * @returns the updated user object (without the password)
 * @throws if the username does not exist in the database
 */
export async function updateUser(
  username: string,
  { display, password }: UserUpdateRequest,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (password !== undefined) await updateAuth(username, password, user.userId);
  if (display !== undefined) {
    await UserModel.findByIdAndUpdate(user.userId, { display });
  }
  return populateSafeUserInfo(user.userId);
}

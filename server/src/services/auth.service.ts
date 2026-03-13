import type { UserWithId } from "../types.ts";
import { UserModel } from "../mongoose-models.ts";
import { auth } from "../auth.ts";

/**
 * Retrieves a single user from the database by username.
 *
 * @param username - The username of the user to find
 * @returns the found user object or null
 */
export async function getUserByUsername(username: string): Promise<UserWithId | null> {
  const user = await UserModel.findOne({ username }).lean();
  if (!user) return null;
  return { userId: user._id, username: user.username };
}

/**
 * Creates a betterAuth account for a user. Used during seeding/initialization.
 * The databaseHooks on the auth config will automatically create the
 * corresponding UserModel record.
 */
export async function createAuthAccount(username: string, password: string) {
  await auth.api.signUpEmail({
    body: {
      email: `${Date.now()}@example.com`,
      name: "dummy name",
      username,
      password,
    },
  });
}

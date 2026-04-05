import { type SafeUserInfo, type UserUpdateRequest } from "@gamenite/shared";
import { getUserByUsername, createAuthAccount } from "./auth.service.ts";
import { UserModel, ClanMemberModel } from "../mongoose-models.ts";

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
    pfp: doc.pfp,
    profileBorderColor: doc.profileBorderColor || "#8d8d8d",
  };
}

/**
 * Create a new user by registering with betterAuth. The databaseHooks in
 * auth.ts will automatically create the corresponding UserModel record.
 * Used only for seeding/initialization.
 */
export async function createUser(
  username: string,
  password: string,
): Promise<SafeUserInfo | { error: string }> {
  if ((await getUserByUsername(username)) !== null) {
    return { error: "User already exists" };
  }
  await createAuthAccount(username, password);
  // The databaseHooks.user.create.after hook in auth.ts creates the UserModel record
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`Failed to create user ${username}`);
  return populateSafeUserInfo(user.userId);
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
 * Updates user information in the database.
 * Password changes are handled client-side via betterAuth.
 */
/**
 * Searches for users whose username or display name matches the query (case-insensitive).
 */
export async function searchUsers(query: string, limit: number, clanId?: string): Promise<SafeUserInfo[]> {
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const filter: Record<string, unknown> = {
    $or: [{ username: regex }, { display: regex }],
  };

  if (clanId) {
    const members = await ClanMemberModel.find({ clanId }, { userId: 1 }).lean();
    const memberIds = members.map((m) => m.userId);
    if (memberIds.length === 0) return [];
    filter._id = { $in: memberIds };
  }

  const docs = await UserModel.find(filter).limit(limit).lean();
  return Promise.all(docs.map((doc) => populateSafeUserInfo(doc._id.toString())));
}

export async function updateUser(
  username: string,
  { display }: UserUpdateRequest,
): Promise<SafeUserInfo> {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`No user ${username}`);
  if (display !== undefined) {
    await UserModel.findByIdAndUpdate(user.userId, { display });
  }
  return populateSafeUserInfo(user.userId);
}

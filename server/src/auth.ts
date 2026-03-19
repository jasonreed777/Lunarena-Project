import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";
import { Db } from "mongodb";
import { randomUUID } from "node:crypto";

// Lazy import to avoid circular dependency (UserModel -> mongoose-models -> models)
let userModel: typeof import("./mongoose-models.ts").UserModel | null = null;
async function getUserModel() {
  if (!userModel) {
    userModel = (await import("./mongoose-models.ts")).UserModel;
  }
  return userModel;
}
let auth: ReturnType<typeof createAuth> | null = null;

type PasswordOptions = {
  hash: (password: string) => Promise<string>;
  verify: (data: { password: string; hash: string }) => Promise<boolean>;
};

export const auth = betterAuth({
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:4530", "https://spring26-project-group-307.onrender.com"],
  database: mongodbAdapter(db),
  allowDuplicateEmails: true,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 1,
  },
  plugins: [
    username({
      usernameNormalization: false,
    }),
  ],
  disabledPaths: ["/is-username-available"],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const userModel = await getUserModel();
          const existing = await userModel.findOne({ username: user.username }).lean();
          if (!existing) {
            await userModel.create({
              _id: randomUUID().toString(),
              username: user.username,
              createdAt: new Date().toISOString(),
              display: user.username,
            });
          }
        },
      },
    },
  });
}

export function setupAuth(mongoDB: Db, passwordOptions?: PasswordOptions) {
  // Reset any existing auth to support test isolation
  auth = createAuth(mongoDB, passwordOptions);
}

export function getAuth(): ReturnType<typeof createAuth> {
  if (!auth) {
    throw new Error("auth not set up");
  }
  return auth;
}

/** Reset auth state - for test cleanup */
export function resetAuth() {
  auth = null;
}

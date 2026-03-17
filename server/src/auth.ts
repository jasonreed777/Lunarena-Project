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

export function createAuth(mongoDB: Db, passwordOptions?: PasswordOptions) {
  return betterAuth({
    basePath: "/api/auth",
    // localhost:8000 is needed because Vite's proxy rewrites the WebSocket Origin
    // header to the backend's own URL (rewriteWsOrigin: true in vite.config.mjs),
    // and better-auth validates Origin against trustedOrigins in getSession.
    trustedOrigins: ["http://localhost:4530", "http://localhost:8000"],
    database: mongodbAdapter(mongoDB),
    allowDuplicateEmails: true,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 1,
      ...(passwordOptions ? { password: passwordOptions } : {}),
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

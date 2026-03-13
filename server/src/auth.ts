import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const MONGO_STR = process.env.MONGO_STR!;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "GameNite";

const client = new MongoClient(MONGO_STR);
const db = client.db(MONGO_DB_NAME + "Auth");

// Lazy import to avoid circular dependency (UserModel -> mongoose-models -> models)
let userModel: typeof import("./mongoose-models.ts").UserModel | null = null;
async function getUserModel() {
  if (!userModel) {
    userModel = (await import("./mongoose-models.ts")).UserModel;
  }
  return userModel;
}

export const auth = betterAuth({
  basePath: "/api/auth",
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
  },
});

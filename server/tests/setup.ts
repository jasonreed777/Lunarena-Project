import { beforeAll, beforeEach, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resetEverythingToDefaults } from "../src/initRepository.ts";
import { setupAuth } from "../src/auth.ts";
import { MongoClient, type Db } from "mongodb";

let mongoServer: MongoMemoryServer;
let authDb: Db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const serverURI = mongoServer.getUri();
  await mongoose.connect(serverURI);
  const client = new MongoClient(serverURI);
  authDb = client.db("GameNiteAuth");
  // Use a trivial hasher in tests — bcrypt at the default cost factor adds ~100 ms
  // per user creation, which multiplies across every beforeEach reset.
  setupAuth(authDb, {
    // eslint-disable-next-line @typescript-eslint/require-await
    hash: async (password) => password,
    // eslint-disable-next-line @typescript-eslint/require-await
    verify: async ({ password, hash }) => password === hash,
  });
});

beforeEach(async () => {
  // Clear better-auth's database so user creation doesn't fail with "Username already taken"
  await authDb.dropDatabase();
  await resetEverythingToDefaults();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

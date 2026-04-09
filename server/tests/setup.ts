import { beforeAll, beforeEach, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resetEverythingToDefaults } from "../src/initRepository.ts";
import { setupAuth, resetAuth } from "../src/auth.ts";
import { MongoClient, type Db } from "mongodb";

let mongoServer: MongoMemoryServer;
let authDb: Db;
let mongoClient: MongoClient;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const serverURI = mongoServer.getUri();

  await mongoose.connect(serverURI);

  mongoClient = new MongoClient(serverURI);
  await mongoClient.connect();

  authDb = mongoClient.db("GameNiteAuth");

  setupAuth(authDb, {
    hash: async (password) => {
      // dummy await to satisfy async property
      await Promise.resolve();
      return password;
    },
    verify: async ({ password, hash }) => {
      await Promise.resolve();
      return password === hash;
    },
  });
}, 1300000);

beforeEach(async () => {
  await authDb.dropDatabase();
  await resetEverythingToDefaults();
}, 1300000);

afterAll(async () => {
  resetAuth();

  if (mongoClient) {
    await mongoClient.close();
  }

  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
}, 1300000);

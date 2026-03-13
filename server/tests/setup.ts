import { beforeAll, beforeEach, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { resetEverythingToDefaults } from "../src/initRepository.ts";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await resetEverythingToDefaults();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Test server entry point for Playwright E2E tests — uses an in-memory MongoDB instance.
// Do NOT use this in production.
/* eslint no-console: "off" */

// Load .env for BETTER_AUTH_SECRET / BETTER_AUTH_URL, then clear MONGO_STR
// so app.ts won't try to connect to the real database or set up auth itself.
// This must happen before any other imports because ES module imports are
// hoisted — by the time top-level statements run, app.ts has already executed.
// Using dynamic import() below ensures the correct ordering.
import dotenv from "dotenv";
dotenv.config();
delete process.env.MONGO_STR;

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { MongoClient } = await import("mongodb");
const { app, httpServer } = await import("./app.ts");
const { resetEverythingToDefaults } = await import("./initRepository.ts");
const { setupAuth } = await import("./auth.ts");
const { initializeAchievements } = await import("./services/achievement.service.ts");

const mongoServer = await MongoMemoryServer.create();
const URI = mongoServer.getUri();
const mongoClient = new MongoClient(URI);
await mongoClient.connect();
const authDb = mongoClient.db("GameNiteAuth");

// Use a trivial hasher — bcrypt at the default cost factor adds ~100 ms per user creation.
setupAuth(authDb, {
  // eslint-disable-next-line @typescript-eslint/require-await
  hash: async (password) => password,
  // eslint-disable-next-line @typescript-eslint/require-await
  verify: async ({ password, hash }) => password === hash,
});

await mongoose.connect(URI);
await initializeAchievements();
await resetEverythingToDefaults();

// Endpoint that Playwright tests can call in beforeEach to restore a clean slate.
app.post("/api/testing/reset", async (_req, res) => {
  await authDb.dropDatabase();
  await resetEverythingToDefaults();
  res.sendStatus(200);
});

const PORT = parseInt(process.env.PORT || "8000");
httpServer.listen(PORT, () => {
  console.log(`E2E test server running on port ${PORT} with in-memory MongoDB`);
});

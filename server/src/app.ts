/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import * as http from "node:http";
import * as gameChat from "./controllers/game-chat.controller.ts";
import * as dmChat from "./controllers/dm-chat-controller.ts";
import * as clan from "./controllers/clan.controller.ts";
import * as friendship from "./controllers/friendship.controller.ts";
import * as game from "./controllers/game.controller.ts";
import * as user from "./controllers/user.controller.ts";
import * as thread from "./controllers/thread.controller.ts";
import * as profile from "./controllers/profile.controller.ts";
import * as points from "./controllers/points.controller.ts";
import * as achievements from "./controllers/achievement.controller.ts";
import { type GameServer } from "./types.ts";
import { requireAuth } from "./middleware/auth.middleware.ts";
import { UserModel } from "./mongoose-models.ts";
import { MongoClient } from "mongodb";
import { getAuth, setupAuth } from "./auth.ts";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

const MONGO_STR = process.env.MONGO_STR;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "GameNite";

// Only connect to MongoDB when a connection string is provided.
// In tests the test setup (tests/setup.ts) initialises auth via its own in-memory server.
if (MONGO_STR) {
  const client = new MongoClient(MONGO_STR);
  const db = client.db(MONGO_DB_NAME + "Auth");
  setupAuth(db);
}

// Mount betterAuth handler before express.json() — it handles its own parsing.
// Use a lazy wrapper so getAuth() is not called at module load time (tests set up auth in beforeAll).
app.all("/api/auth/*splat", (req, res) => toNodeHandler(getAuth())(req, res));

app.use(express.json());

app.use(
  "/api",
  Router()
    .use(
      "/game",
      express
        .Router()
        .post("/create", requireAuth, game.postCreate)
        .get("/list", game.getList)
        .get("/:id", game.getById),
    )
    .use(
      "/thread",
      express
        .Router()
        .post("/create", requireAuth, thread.postCreate)
        .get("/list", thread.getList)
        .get("/:id", requireAuth, thread.getById)
        .post("/:id/comment", requireAuth, thread.postByIdComment)
        .post("/comment/:commentId/vote", requireAuth, thread.postCommentVote),
    )
    .use(
      "/messages",
      Router()
        .post("/createDM", requireAuth, dmChat.chatCreate)
        .post("/getChatMessages", requireAuth, dmChat.getChatPaginated)
        .get("/getChatList", requireAuth, dmChat.getChatList),
    )
    .use(
      "/user",
      Router()
        .post("/list", user.postList)
        .post("/:username", requireAuth, user.postByUsername)
        .get("/:username", user.getByUsername),
    )
    .use(
      "/profile",
      Router()
        .get("/upload/:uploadId", profile.getUploadById)
        .post("/:username/upload", requireAuth, profile.postUploadByUsername)
        .post("/:username", requireAuth, profile.postByUsername)
        .get("/:username", profile.getByUsername),
    )
    .use("/points", Router().get("/leaderboard", points.getLeaderboard))
    .use(
      "/points",
      Router()
        .get("/leaderboard", points.getLeaderboard)
        .get("/streak/:username", points.getStreakByUsername)
        .get("/:username", points.getPointsByUsername)
        .get("/daily/:username", points.getDailyPointsByUsername),
    )
    .use("/achievements", Router().get("/:username", achievements.getAchievementsByUsername))
    .use(
      "/friends",
      Router()
        .post("/list", requireAuth, friendship.postList)
        .post("/requests", requireAuth, friendship.postRequests)
        .post("/request", requireAuth, friendship.postRequest)
        .post("/:id/respond", requireAuth, friendship.postRespond)
        .delete("/:id", requireAuth, friendship.deleteById),
    )
    .use(
      "/clans",
      Router() //
        .get("/list", clan.getList)
        .post("/current", requireAuth, clan.postCurrent)
        .post("/create", requireAuth, clan.postCreate)
        .post("/my-invites", requireAuth, clan.postMyInvites)
        .post("/invites/:inviteId/respond", requireAuth, clan.postRespondInvite)
        .post("/invites/:inviteId/cancel", requireAuth, clan.postCancelInvite)
        .get("/:id", clan.getById)
        .get("/:id/members", clan.getMembers)
        .get("/:id/leaderboard", clan.getLeaderboard)
        .post("/:id/join", requireAuth, clan.postJoin)
        .post("/:id/leave", requireAuth, clan.postLeave)
        .post("/:id/kick", requireAuth, clan.postKick)
        .post("/:id/invite", requireAuth, clan.postInvite)
        .post("/:id/invites", requireAuth, clan.postInvites)
        .post("/:id/update", requireAuth, clan.postUpdate)
        .post("/:id/role", requireAuth, clan.postUpdateRole)
        .post("/:id/transfer", requireAuth, clan.postTransfer),
    ),
);

// Authenticate socket connections via betterAuth session
io.use(async (socket, next) => {
  const session = await getAuth().api.getSession({
    headers: fromNodeHeaders(socket.handshake.headers),
  });
  if (!session) return next(new Error("Unauthorized"));

  const appUser = await UserModel.findOne({ username: session.user.username }).lean();
  if (!appUser) return next(new Error("User not found"));

  socket.data.user = { userId: appUser._id, username: appUser.username };
  next();
});

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`CONN [${socketId}] connected as ${socket.data.user.username}`);

  socket.on("disconnect", () => {
    console.log(`CONN [${socketId}] disconnected`);
  });

  socket.on("chatJoin", gameChat.socketJoin(socket, io));
  socket.on("dmChatJoin", dmChat.socketJoin(socket, io));
  socket.on("chatLeave", gameChat.socketLeave(socket, io));
  socket.on("chatSendMessage", gameChat.socketSendMessage(socket, io));
  socket.on("dmSendMessage", dmChat.socketSendMessage(socket, io));

  socket.on("gameJoinAsPlayer", game.socketJoinAsPlayer(socket, io));
  socket.on("gameMakeMove", game.socketMakeMove(socket, io));
  socket.on("gameStart", game.socketStart(socket, io));
  socket.on("gameWatch", game.socketWatch(socket, io));

  socket.onAny((name, payload) => {
    console.log(
      `RECV [${socketId}] got ${name} from ${socket.data.user.username} ${JSON.stringify(payload)}`,
    );
  });
  socket.onAnyOutgoing((name) => {
    console.log(`SEND [${socketId}] gets ${name}`);
  });
});

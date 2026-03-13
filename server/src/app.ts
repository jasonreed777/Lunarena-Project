/* eslint no-console: "off" */

import express, { Router } from "express";
import { Server } from "socket.io";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import * as http from "node:http";
import * as chat from "./controllers/chat.controller.ts";
import * as clan from "./controllers/clan.controller.ts";
import * as friendship from "./controllers/friendship.controller.ts";
import * as game from "./controllers/game.controller.ts";
import * as user from "./controllers/user.controller.ts";
import * as thread from "./controllers/thread.controller.ts";
import * as profile from "./controllers/profile.controller.ts";
import { type GameServer } from "./types.ts";
import { auth } from "./auth.ts";
import { requireAuth } from "./middleware/auth.middleware.ts";
import { UserModel } from "./mongoose-models.ts";

export const app = express();
export const httpServer = http.createServer(app);
const io: GameServer = new Server(httpServer);

// Mount betterAuth handler before express.json() — it handles its own parsing
app.all("/api/auth/*splat", toNodeHandler(auth));

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
        .get("/:id", thread.getById)
        .post("/:id/comment", requireAuth, thread.postByIdComment),
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
        .post("/current", clan.postCurrent)
        .post("/create", clan.postCreate)
        .post("/my-invites", clan.postMyInvites)
        .post("/invites/:inviteId/respond", clan.postRespondInvite)
        .get("/:id", clan.getById)
        .get("/:id/members", clan.getMembers)
        .post("/:id/join", clan.postJoin)
        .post("/:id/leave", clan.postLeave)
        .post("/:id/kick", clan.postKick)
        .post("/:id/invite", clan.postInvite)
        .post("/:id/invites", clan.postInvites)
        .post("/:id/update", clan.postUpdate)
        .post("/:id/role", clan.postUpdateRole)
        .post("/:id/transfer", clan.postTransfer),
    ),
);

// Authenticate socket connections via betterAuth session
io.use(async (socket, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(socket.handshake.headers),
  });
  if (!session) return next(new Error("Unauthorized"));

  const appUser = await UserModel.findOne({ username: session.user.username }).lean();
  if (!appUser) return next(new Error("User not found"));

  socket.data.user = { userId: appUser._id as string, username: appUser.username };
  next();
});

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`CONN [${socketId}] connected as ${socket.data.user.username}`);

  socket.on("disconnect", () => {
    console.log(`CONN [${socketId}] disconnected`);
  });

  socket.on("chatJoin", chat.socketJoin(socket, io));
  socket.on("chatLeave", chat.socketLeave(socket, io));
  socket.on("chatSendMessage", chat.socketSendMessage(socket, io));

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

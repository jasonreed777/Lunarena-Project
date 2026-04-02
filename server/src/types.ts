import { type Server, type Socket } from "socket.io";
import { type Request, type Response } from "express";
import {
  type ClientToServerEvents,
  type ServerToClientEvents,
  type TaggedGameView,
} from "@gamenite/shared";

export interface UserWithId {
  userId: string;
  username: string;
}

export interface SocketData {
  user: UserWithId;
}

// Augment Express Request so that `req.authUser` is available after requireAuth middleware
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser: UserWithId;
    }
    interface Application {
      get(name: "io"): GameServer;
    }
  }
}

export type SocketAPI = (
  socket: GameServerSocket,
  io: GameServer,
) => (payload: unknown) => Promise<void>;

export type RestAPI<R = unknown, P = { [key: string]: string }> = (
  req: Request<P, R | { error: string }, unknown>,
  res: Response<R | { error: string }>,
) => Promise<void>;

export type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type GameServerSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export interface GameViewUpdates {
  watchers: TaggedGameView;
  players: { userId: string; view: TaggedGameView }[];
}

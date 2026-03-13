import {
  type ChatInfo,
  type ChatMoveLogPayload,
  type ChatNewMessagePayload,
  type ChatUserJoinedPayload,
  type ChatUserLeftPayload,
} from "./chat.types.ts";
import { type NewMessagePayload } from "./message.types.ts";
import { type GameMakeMovePayload, type GamePlayInfo, type TaggedGameView } from "./game.types.ts";
import { type SafeUserInfo } from "./user.types.ts";

/**
 * The Socket.io interface for client to server communication.
 * Auth is handled at connection time via session cookies, so payloads
 * contain only the data — no auth wrapper.
 */
export interface ClientToServerEvents {
  chatJoin: (payload: string) => void;
  chatLeave: (payload: string) => void;
  chatSendMessage: (payload: NewMessagePayload) => void;
  gameJoinAsPlayer: (payload: string) => void;
  gameMakeMove: (payload: GameMakeMovePayload) => void;
  gameStart: (payload: string) => void;
  gameWatch: (payload: string) => void;
}

/**
 * The Socket.io interface for server to client information
 */
export interface ServerToClientEvents {
  chatJoined: (payload: ChatInfo) => void;
  chatMoveLog: (payload: ChatMoveLogPayload) => void;
  chatNewMessage: (payload: ChatNewMessagePayload) => void;
  chatUserJoined: (payload: ChatUserJoinedPayload) => void;
  chatUserLeft: (payload: ChatUserLeftPayload) => void;
  gamePlayersUpdated: (payload: SafeUserInfo[]) => void;
  gameStateUpdated: (payload: TaggedGameView & { forPlayer: boolean }) => void;
  gameWatched: (payload: GamePlayInfo) => void;
}

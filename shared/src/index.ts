/**
 * A basic error object containing a message.
 *
 * Check for this type with the TypeScript conditional `if ('error' in obj)`
 */
export interface ErrorMsg {
  error: string;
}

export * from "./auth.types.ts";
export * from "./chat.types.ts";
export * from "./comment.types.ts";
export * from "./game.types.ts";
export * from "./message.types.ts";
export * from "./socket.types.ts";
export * from "./thread.types.ts";
export * from "./user.types.ts";
export * from "./profile.types.ts";
export * from "./profile-picture.types.ts";
export * from "./friendship.types.ts";
export * from "./clan.types.ts";
export * from "./points.types.ts";
export * from "./achievement.types.ts";
export * from "./user-achievement.types.ts";
export * from "./game-stats.types.ts";

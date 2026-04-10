import { EventEmitter } from "node:events";

/** Maps each objective-related event name to its expected payload shape. */
export interface ObjectiveEventPayloads {
  gameCompleted: { username: string; gameType: string; gameId: string };
  gameWon: { username: string; gameType: string; gameId: string };
  dailyCompleted: { username: string; gameType: string; gameId: string; won: boolean };
  dmMessageSent: { username: string; chatId: string };
  dmChatCreated: { username: string; chatId: string };
  gamechatMessageSent: { username: string; chatId: string };
  forumThreadCreated: { username: string; threadId: string };
  forumCommentPosted: { username: string; threadId: string; commentId: string };
  forumVoteCast: { username: string; commentId: string };
  friendRequestSent: { username: string; receiverUsername: string };
}

export type ObjectiveEventName = keyof ObjectiveEventPayloads;

/** Type-safe event bus for objective-related events, backed by Node EventEmitter. */
class ObjectiveEventBus extends EventEmitter {
  /** Emit a typed objective event with its corresponding payload. */
  emitEvent<K extends ObjectiveEventName>(event: K, payload: ObjectiveEventPayloads[K]): void {
    this.emit(event, payload);
  }

  /** Register a typed listener for an objective event. */
  onEvent<K extends ObjectiveEventName>(
    event: K,
    listener: (payload: ObjectiveEventPayloads[K]) => void,
  ): this {
    return this.on(event, listener as (...args: unknown[]) => void);
  }
}

/** Singleton event bus used to broadcast objective-relevant actions across services. */
export const eventBus = new ObjectiveEventBus();

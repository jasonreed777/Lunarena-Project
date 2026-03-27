import { randomUUID } from "node:crypto";
import { type GameChatInfo, type ChatMoveLogPayload, type MessageInfo } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import type { MoveLogEntry, RecordId } from "../models.ts";
import { GameChatMessageModel, GameChatModel } from "../mongoose-models.ts";

/**
 * Expand a stored chat
 *
 * @param chatId - Valid chat id
 * @returns the expanded chat info object
 */
async function populateChatInfo(chatId: RecordId): Promise<GameChatInfo> {
  const chat = await GameChatModel.findById(chatId).lean();
  if (!chat) throw new Error(`Failed to find chat ${chatId}`);
  return {
    chatId,
    createdAt: new Date(chat.createdAt),
    messages: await getMessagesById(chat.messages),
    moveLog: await Promise.all(
      (chat.moveLog as MoveLogEntry[]).map(async (entry) => ({
        moveDescription: entry.moveDescription,
        user: await populateSafeUserInfo(entry.userId),
        createdAt: new Date(entry.createdAt),
      })),
    ),
  };
}

/**
 * Creates and store a new chat
 *
 * @param createdAt - Time of chat creation
 * @returns the chat's info object
 */
export async function createChat(createdAt: Date): Promise<GameChatInfo> {
  const id = randomUUID().toString();
  await GameChatModel.create({
    _id: id,
    createdAt: createdAt.toISOString(),
    messages: [],
    moveLog: [],
  });
  return populateChatInfo(id);
}

/**
 * Produces the chat for a given id
 *
 * @param chatId - Ostensible chat id
 * @param user - Authenticated user
 * @returns the chat's info object
 * @throws if the chat id is not valid
 */
export async function forceChatById(chatId: string, user: UserWithId): Promise<GameChatInfo> {
  const exists = await GameChatModel.exists({ _id: chatId });
  if (!exists) throw new Error(`user ${user.username} accessed invalid chat id`);
  return populateChatInfo(chatId);
}

/**
 * Adds a message to a chat, updating the chat
 *
 * @param chatId - Ostensible chat id
 * @param user - Authenticated user
 * @param messageId - Valid message id
 * @returns the updated chat info object
 * @throws if the chat id is not valid
 */
export async function addMessageToChat(
  chatId: string,
  user: UserWithId,
  messageId: string,
): Promise<GameChatInfo> {
  const exists = await GameChatModel.exists({ _id: chatId });
  if (!exists) throw new Error(`user ${user.username} sent to invalid chat id`);
  await GameChatModel.findByIdAndUpdate(chatId, { $push: { messages: messageId } });
  return populateChatInfo(chatId);
}

/**
 * Adds a move log entry to a chat, storing it persistently so it can be
 * retrieved when a user navigates back to the game page.
 *
 * @param chatId - Valid chat id
 * @param moveDescription - Human-readable description of the move
 * @param user - The user who made the move
 * @param createdAt - When the move was made
 * @returns the move log payload to broadcast to clients
 */
export async function addMoveLogToChat(
  chatId: string,
  moveDescription: string,
  user: UserWithId,
  createdAt: Date,
): Promise<ChatMoveLogPayload> {
  const exists = await GameChatModel.exists({ _id: chatId });
  if (!exists) throw new Error(`move log added to invalid chat id`);
  const entry: MoveLogEntry = {
    moveDescription,
    userId: user.userId,
    createdAt: createdAt.toISOString(),
  };
  await GameChatModel.findByIdAndUpdate(chatId, { $push: { moveLog: entry } });
  const safeUser = await populateSafeUserInfo(user.userId);
  return { chatId, moveDescription, user: safeUser, createdAt };
}

/**
 * Retrieves all move log entries for a chat
 *
 * @param chatId - Valid chat id
 * @returns the list of move log entries
 */
export async function getMoveLog(chatId: string): Promise<MoveLogEntry[]> {
  const chat = await GameChatModel.findById(chatId).lean();
  if (!chat) return [];
  return chat.moveLog as MoveLogEntry[];
}

/**
 * Expand a stored message
 *
 * @param messageId - Valid message id
 * @returns the expanded message info object
 */
async function populateMessageInfo(messageId: string): Promise<MessageInfo> {
  const doc = await GameChatMessageModel.findById(messageId).lean();
  if (!doc) throw new Error(`Failed to find message ${messageId}`);
  return {
    messageId,
    text: doc.text,
    createdAt: new Date(doc.createdAt),
    createdBy: await populateSafeUserInfo(doc.createdBy),
  };
}

/**
 * Creates and stores a new message
 *
 * @param user - a valid user
 * @param text - the message's text
 * @param createdAt - the time of message creation
 * @returns the message's info object
 */
export async function createMessage(
  user: UserWithId,
  text: string,
  createdAt: Date,
): Promise<MessageInfo> {
  const messageId = randomUUID().toString();
  await GameChatMessageModel.create({
    _id: messageId,
    text,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
  });
  return populateMessageInfo(messageId);
}

/**
 * Retrieves a list of message ids from the database
 *
 * @param ids - A list of valid message ids
 * @returns the MessageInfo objects corresponding to those ids
 * @throws if any of the ids are not valid
 */
async function getMessagesById(ids: string[]): Promise<MessageInfo[]> {
  return Promise.all(ids.map(populateMessageInfo));
}

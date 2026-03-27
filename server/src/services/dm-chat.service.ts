import type { RecordId } from "../models.ts";
import { DMChatMessageModel, DMChatModel } from "../mongoose-models.ts";

/**
 * Gets the chats for a user, sorted by most recently talked in
 * @param user
 * @returns the chat document list
 */
export async function getChats(user: RecordId) {
  return DMChatModel.find({
    participants: user,
  })
    .sort({ updatedAt: -1 })
    .lean();
}

/**
 * Creates a new chat
 * @param participants in the chat
 */
export async function createChat(participants: RecordId[]) {
  if (new Set(participants).size !== participants.length) {
    throw new Error("duplicate participants");
  }
  if (
    await DMChatModel.exists({ participants: { $all: participants, $size: participants.length } })
  ) {
    throw new Error("Chat for these participants already exists");
  }
  return await DMChatModel.create({
    participants,
    createdAt: new Date(),
    lastMessageAt: new Date(),
  });
}

/**
 * Sends a new message in a chat, errors if one doesn't exist or if the chat exits already
 * @param sender who sent the message
 * @param text the message text
 * @param chatId the chat ID
 * @returns the newly created message and the chat
 */
export async function sendMessage(sender: RecordId, text: string, chatId: string) {
  const chat = await DMChatModel.findById(chatId);
  if (!chat) {
    throw new Error("chat could not be found");
  }
  if (!chat.participants.includes(sender)) {
    throw new Error("sender not present in chat");
  }
  const message = await DMChatMessageModel.create({
    sender: sender,
    timestamp: new Date(),
    chat: chat._id,
    text,
  });
  chat.lastMessageAt = new Date();
  await chat.save();
  return { message: message, chat };
}

/**
 * Retrieves a paginated list of messages for a given chat.
 * @param chatId - The ID of the chat to retrieve messages for.
 * @param pageIndex - The zero-based page index (e.g. 0 = first page, 1 = second page).
 * @param pageSize - The number of messages to return per page.
 * @returns A promise resolving to an array of messages, sorted by most recent first.
 */
export async function getMessages(chatId: RecordId, pageIndex: number, pageSize: number) {
  const chat = await DMChatModel.findById(chatId);
  if (!chat) {
    throw new Error("chat could not be found");
  }
  return DMChatMessageModel.find({ chat: chatId })
    .sort({ timestamp: -1 })
    .skip(pageIndex * pageSize)
    .limit(pageSize)
    .lean();
}

/**
 * Verifies user belongs to a given chat
 * @param chatId
 * @param userId
 */
export async function checkUserBelongs(chatId: string, userId: string) {
  const chat = await DMChatModel.findById(chatId);
  if (!chat) {
    throw new Error("chat could not be found");
  }
  return chat.participants.includes(userId);
}

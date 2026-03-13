import { randomUUID } from "node:crypto";
import { type MessageInfo } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import { MessageModel } from "../mongoose-models.ts";

/**
 * Expand a stored message
 *
 * @param messageId - Valid message id
 * @returns the expanded message info object
 */
async function populateMessageInfo(messageId: string): Promise<MessageInfo> {
  const doc = await MessageModel.findById(messageId).lean();
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
  await MessageModel.create({
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
export async function getMessagesById(ids: string[]): Promise<MessageInfo[]> {
  return Promise.all(ids.map(populateMessageInfo));
}

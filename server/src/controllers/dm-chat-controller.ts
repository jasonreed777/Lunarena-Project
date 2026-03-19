import type { RestAPI, SocketAPI } from "../types.ts";
import {
  type MessageInfo,
  zCreateDMRequest,
  zDMPaginatedRequest,
  zNewMessageRequest,
} from "@gamenite/shared";

import { logSocketError } from "./socket.controller.ts";
import {
  checkUserBelongs,
  createChat,
  getMessages,
  sendMessage,
} from "../services/dm-chat.service.ts";
import { populateSafeUserInfo } from "../services/user.service.ts";
import { z } from "zod";

/**
 * Handle a socket request to send a direct message: store the message and
 * emit it to all other participants in the chat.
 * User is authenticated at connection time via socket.data.user.
 */
export const socketSendMessage: SocketAPI = (socket, io) => async (body) => {
  try {
    const user = socket.data.user;
    const { chatId, text } = zNewMessageRequest.parse(body);
    const { chat, message: messageDoc } = await sendMessage(user.userId, text, chatId);
    const message: MessageInfo = {
      messageId: messageDoc._id.toString(),
      text: messageDoc.text,
      createdBy: await populateSafeUserInfo(messageDoc.sender),
      createdAt: messageDoc.timestamp,
    };
    for (const participant of chat.participants) {
      // Don't send a message to self
      if (participant !== messageDoc.sender) {
        io.to(participant).emit("dmNewMessage", { chatId, message });
      }
    }
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle a socket request to join the user's DM room: subscribe the socket
 * to a room keyed by the user's id so incoming direct messages can be routed
 * to them.
 * User is authenticated at connection time via socket.data.user.
 */
export const socketJoin: SocketAPI = (socket) => async (body) => {
  try {
    const user = socket.data.user;
    // Join a room for the userId, to receive incoming direct messages
    await socket.join(user.userId);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Handle POST requests to `/api/dm/create` by creating a new DM chat between
 * the authenticated user and the specified participants.
 */
export const chatCreate: RestAPI = async (req, res) => {
  const body = z.object({ payload: zCreateDMRequest }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  try {
    await createChat([req.authUser.userId, ...body.data.payload]);
    res.status(200).send();
  } catch (err) {
    res.status(400).send("error creating chat");
  }
};

/**
 * Handle POST requests to `/api/dm/messages` by returning a paginated list of
 * messages for the specified chat. Returns 400 if the authenticated user is
 * not a participant in the chat.
 */
export const getChatPaginated: RestAPI<MessageInfo[]> = async (req, res) => {
  const body = z.object({ payload: zDMPaginatedRequest }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }
  try {
    const { chatId, pageSize, pageIndex } = body.data.payload;
    if (!(await checkUserBelongs(chatId, req.authUser.userId))) {
      res.status(400).send({ error: "User not in specified chat" });
      return;
    }
    const messages = await getMessages(chatId, pageIndex, pageSize);
    const cleanedMessages = await Promise.all(
      messages.map(async (message) => ({
        messageId: message._id.toString(),
        text: message.text,
        createdBy: await populateSafeUserInfo(message.sender),
        createdAt: message.timestamp,
      })),
    );
    res.send(cleanedMessages);
  } catch (err) {
    res.status(400).send({ error: "error getting messages" });
  }
};

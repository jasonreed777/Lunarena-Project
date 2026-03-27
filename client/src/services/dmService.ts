import type {
  DMChatOverview,
  MessageInfo,
  CreateDMRequest,
  DMPaginatedRequest,
} from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

/**
 * Creates a new DM chat between the authenticated user and the specified participants.
 */
export async function chatCreate(participants: CreateDMRequest): APIResponse<boolean> {
  try {
    const res = await api.post("api/messages/createDM", {
      payload: participants,
    });
    return res.status === 200;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
}

/**
 * Gets a paginated list of messages for the specified chat.
 */
export const getChatMessages = async (request: DMPaginatedRequest): APIResponse<MessageInfo[]> => {
  try {
    const res = await api.post<MessageInfo[]>(`/api/messages/getChatMessages`, {
      payload: request,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets the list of DM chats for the authenticated user.
 */
export const getChatList = async (): APIResponse<DMChatOverview[]> => {
  try {
    const res = await api.get<DMChatOverview[]>(`/api/messages/getChatList`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

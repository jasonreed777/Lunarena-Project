import type { ErrorMsg, FriendInfo, FriendRequestInfo, UserAuth } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const FRIENDS_API_URL = `/api/friends`;

/**
 * Gets the list of friends for the authenticated user
 */
export const friendsList = async (auth: UserAuth): APIResponse<FriendInfo[]> => {
  try {
    const res = await api.post<FriendInfo[] | ErrorMsg>(`${FRIENDS_API_URL}/list`, {
      auth,
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets pending friend requests (incoming and outgoing)
 */
export const friendRequests = async (
  auth: UserAuth,
): APIResponse<{ incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] }> => {
  try {
    const res = await api.post<
      { incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] } | ErrorMsg
    >(`${FRIENDS_API_URL}/requests`, {
      auth,
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

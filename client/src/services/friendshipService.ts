import type { ErrorMsg, FriendInfo, FriendRequestInfo, FriendshipInfo } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const FRIENDS_API_URL = `/api/friends`;

/**
 * Gets the list of friends for the authenticated user
 */
export const friendsList = async (): APIResponse<FriendInfo[]> => {
  try {
    const res = await api.post<FriendInfo[] | ErrorMsg>(`${FRIENDS_API_URL}/list`, {
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
export const friendRequests = async (): APIResponse<{
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}> => {
  try {
    const res = await api.post<
      { incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] } | ErrorMsg
    >(`${FRIENDS_API_URL}/requests`, {
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a friend request to the given user
 */
export const sendFriendRequest = async (receiverUsername: string): APIResponse<FriendshipInfo> => {
  try {
    const res = await api.post<FriendshipInfo | ErrorMsg>(`${FRIENDS_API_URL}/request`, {
      payload: { receiverUsername },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Responds to a pending friend request (accept, reject, or block)
 */
export const respondToFriendRequest = async (
  friendshipId: string,
  action: "accept" | "reject" | "block",
): APIResponse<FriendshipInfo> => {
  try {
    const res = await api.post<FriendshipInfo | ErrorMsg>(
      `${FRIENDS_API_URL}/${friendshipId}/respond`,
      { payload: { action } },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Removes a friend or cancels a pending friend request
 */
export const removeFriend = async (friendshipId: string): APIResponse<{ success: true }> => {
  try {
    const res = await api.delete<{ success: true } | ErrorMsg>(
      `${FRIENDS_API_URL}/${friendshipId}`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

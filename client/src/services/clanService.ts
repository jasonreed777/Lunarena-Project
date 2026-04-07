import type {
  ErrorMsg,
  ClanInfo,
  ClanDetailInfo,
  ClanMemberInfo,
  ClanMemberPointsEntry,
  ClanLeaderboardEntry,
  ClanInviteInfo,
  UserClanInfo,
  CreateClanPayload,
  UpdateClanPayload,
} from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const CLANS_API_URL = `/api/clans`;

/**
 * Gets the list of all clans
 */
export const listClans = async (): APIResponse<ClanInfo[]> => {
  try {
    const res = await api.get<ClanInfo[] | ErrorMsg>(`${CLANS_API_URL}/list`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets the current user's clan membership
 */
export const getCurrentUserClan = async (): APIResponse<UserClanInfo | null> => {
  try {
    const res = await api.post<UserClanInfo | null | ErrorMsg>(`${CLANS_API_URL}/current`, {
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets detailed clan info including members
 */
export const getClanById = async (clanId: string): APIResponse<ClanDetailInfo> => {
  try {
    const res = await api.get<ClanDetailInfo | ErrorMsg>(`${CLANS_API_URL}/${clanId}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Creates a new clan
 */
export const createClan = async (payload: CreateClanPayload): APIResponse<ClanInfo> => {
  try {
    const res = await api.post<ClanInfo | ErrorMsg>(`${CLANS_API_URL}/create`, {
      payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Join a public clan instantly or request to join a private clan
 */
export const joinClan = async (clanId: string): APIResponse<UserClanInfo | ClanInviteInfo> => {
  try {
    const res = await api.post<UserClanInfo | ClanInviteInfo | ErrorMsg>(
      `${CLANS_API_URL}/${clanId}/join`,
      { payload: {} },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Leave current clan
 */
export const leaveClan = async (clanId: string): APIResponse<{ success: true }> => {
  try {
    const res = await api.post<{ success: true } | ErrorMsg>(`${CLANS_API_URL}/${clanId}/leave`, {
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Kick a member from the clan (admin/owner only)
 */
export const kickMember = async (
  clanId: string,
  username: string,
): APIResponse<{ success: true }> => {
  try {
    const res = await api.post<{ success: true } | ErrorMsg>(`${CLANS_API_URL}/${clanId}/kick`, {
      payload: { username },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Invite a user to the clan (admin/owner only)
 */
export const inviteUser = async (clanId: string, username: string): APIResponse<ClanInviteInfo> => {
  try {
    const res = await api.post<ClanInviteInfo | ErrorMsg>(`${CLANS_API_URL}/${clanId}/invite`, {
      payload: { username },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get pending invites/requests for a clan (admin/owner only)
 */
export const getClanInvites = async (clanId: string): APIResponse<ClanInviteInfo[]> => {
  try {
    const res = await api.post<ClanInviteInfo[] | ErrorMsg>(`${CLANS_API_URL}/${clanId}/invites`, {
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Cancel/withdraw a pending clan invite (admin/owner)
 */
export const cancelClanInvite = async (inviteId: string): APIResponse<{ success: true }> => {
  try {
    const res = await api.post<{ success: true } | ErrorMsg>(
      `${CLANS_API_URL}/invites/${inviteId}/cancel`,
      { payload: {} },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Respond to a clan invite or join request (accept/reject)
 */
export const respondToInvite = async (
  inviteId: string,
  action: "accept" | "reject",
): APIResponse<UserClanInfo | ClanInviteInfo> => {
  try {
    const res = await api.post<UserClanInfo | ClanInviteInfo | ErrorMsg>(
      `${CLANS_API_URL}/invites/${inviteId}/respond`,
      { payload: { action } },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Get current user's pending clan invites
 */
export const getMyInvites = async (): APIResponse<ClanInviteInfo[]> => {
  try {
    const res = await api.post<ClanInviteInfo[] | ErrorMsg>(`${CLANS_API_URL}/my-invites`, {
      payload: {},
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Update clan settings (admin/owner only)
 */
export const updateClan = async (
  clanId: string,
  payload: UpdateClanPayload,
): APIResponse<ClanInfo> => {
  try {
    const res = await api.post<ClanInfo | ErrorMsg>(`${CLANS_API_URL}/${clanId}/update`, {
      payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Update a member's role (owner only for admin promotion)
 */
export const updateMemberRole = async (
  clanId: string,
  username: string,
  role: "admin" | "member",
): APIResponse<ClanMemberInfo> => {
  try {
    const res = await api.post<ClanMemberInfo | ErrorMsg>(`${CLANS_API_URL}/${clanId}/role`, {
      payload: { username, role },
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets the clan member points leaderboard
 */
export const getClanLeaderboard = async (clanId: string): APIResponse<ClanMemberPointsEntry[]> => {
  try {
    const res = await api.get<ClanMemberPointsEntry[] | ErrorMsg>(
      `${CLANS_API_URL}/${clanId}/leaderboard`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Gets the cross-clan rankings
 */
export const getClanRankings = async (): APIResponse<ClanLeaderboardEntry[]> => {
  try {
    const res = await api.get<ClanLeaderboardEntry[] | ErrorMsg>(`${CLANS_API_URL}/rankings`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Transfer clan ownership (owner only)
 */
export const transferOwnership = async (
  clanId: string,
  newOwnerUsername: string,
): APIResponse<{ success: true }> => {
  try {
    const res = await api.post<{ success: true } | ErrorMsg>(
      `${CLANS_API_URL}/${clanId}/transfer`,
      { payload: { newOwnerUsername } },
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

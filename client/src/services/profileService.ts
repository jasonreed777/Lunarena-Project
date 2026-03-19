import type { APIResponse, UserProfileRecord } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { ErrorMsg, UserProfileUpdateRequest } from "@gamenite/shared";

const PROFILE_API_URL = `/api/profile`;

export const updateProfile = async (
  username: string,
  updates: UserProfileUpdateRequest,
): APIResponse<UserProfileRecord> => {
  try {
    const res = await api.post<UserProfileRecord | ErrorMsg>(
      `${PROFILE_API_URL}/${username}`,
      updates,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

// Get needed profile info through provding username
export const getProfileByUsername = async (username: string): APIResponse<UserProfileRecord> => {
  try {
    const res = await api.get<UserProfileRecord | ErrorMsg>(`${PROFILE_API_URL}/${username}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

// Upload a new profile picture for the user
export const uploadPFP = async (
  username: string,
  upload: { contentType: string; data: string },
): APIResponse<UserProfileRecord> => {
  try {
    const res = await api.post<UserProfileRecord | ErrorMsg>(
      `${PROFILE_API_URL}/${username}/upload`,
      upload,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

export const getUploadedImage = async (
  uploadId: string,
): APIResponse<{ contentType: string; data: string }> => {
  try {
    const res = await api.get<{ contentType: string; data: string } | ErrorMsg>(
      `${PROFILE_API_URL}/upload/${uploadId}`,
    );
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

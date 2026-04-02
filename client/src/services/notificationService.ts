import type { ErrorMsg, NotificationInfo } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const NOTIFICATIONS_API_URL = `/api/notifications`;

/**
 * Gets all notifications for the authenticated user
 */
export const getNotifications = async (): APIResponse<NotificationInfo[]> => {
  try {
    const res = await api.get<NotificationInfo[] | ErrorMsg>(NOTIFICATIONS_API_URL);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Deletes a single notification by ID
 */
export const deleteNotification = async (notificationId: string): APIResponse<void> => {
  try {
    const res = await api.delete<void | ErrorMsg>(`${NOTIFICATIONS_API_URL}/${notificationId}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Deletes all notifications for the authenticated user
 */
export const deleteAllNotifications = async (): APIResponse<void> => {
  try {
    const res = await api.delete<void | ErrorMsg>(NOTIFICATIONS_API_URL);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

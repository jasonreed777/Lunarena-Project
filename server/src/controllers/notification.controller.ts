import type { NotificationInfo, NotificationType } from "@gamenite/shared";
import type { GameServer, RestAPI } from "../types.ts";
import type { RecordId } from "../models.ts";
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  createNotification,
} from "../services/notification.service.ts";

/**
 * Sends a notification to a client via web socket
 * Call this from other socket controllers
 */
export async function emitNotification<T extends NotificationType>(
  io: GameServer,
  receiverUserId: RecordId,
  type: T,
  header: string | null,
  message: string,
  metadata?: Extract<NotificationInfo, { type: T }>["metadata"],
) {
  const result = await createNotification({
    userId: receiverUserId,
    type,
    header,
    message,
    metadata,
  });
  if (result.success) {
    const notification = result.data;
    io.to(receiverUserId).emit("notification", {
      notificationId: notification._id.toString(),
      type: notification.type,
      header: notification.header,
      message: notification.message,
      sentAt: notification.sentAt,
      metadata,
    } as NotificationInfo);
  }
}

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user.
 */
export const getNotifications: RestAPI<NotificationInfo[]> = async (req, res) => {
  const notifications = await fetchNotifications(req.authUser.userId);
  res.send(
    notifications.map(
      (notification) =>
        ({
          notificationId: notification._id.toString(),
          type: notification.type,
          header: notification.header,
          message: notification.message,
          sentAt: notification.sentAt,
          metadata: notification.metadata,
        }) as NotificationInfo,
    ),
  );
};

/**
 * DELETE /api/notifications
 * Clears all notifications for the user.
 */
export const deleteAll: RestAPI = async (req, res) => {
  const result = await clearAllNotifications(req.authUser.userId);
  if (!result.success) {
    res.status(400).send({ error: result.error });
    return;
  }
  res.status(200).send();
};

/**
 * DELETE /api/notifications/:id
 * Deletes a single notification by ID. Returns 403 if it belongs to another user.
 */
export const deleteOne: RestAPI<unknown, { id: string }> = async (req, res) => {
  const result = await deleteNotification(req.params.id, req.authUser.userId);
  if (!result.success) {
    res.status(403).send({ error: result.error });
    return;
  }
  res.status(200).send();
};

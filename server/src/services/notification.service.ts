import type { NotificationRecord, RecordId } from "../models.ts";
import { NotificationModel, UserModel } from "../mongoose-models.ts";
import type { NotificationType } from "@gamenite/shared";
import type { HydratedDocument } from "mongoose";

/**
 * Fetches notifications for a user
 * @param userId the user id
 */
export async function fetchNotifications(userId: RecordId) {
  return NotificationModel.find({
    userId,
  }).lean();
}

/**
 * creates a notification to send to a user
 * @param userId the notification to send
 * @param type the type of notification
 * @param header the header string if any
 * @param message the main message body for the notification
 * @param metadata optional metadata to attach to the notification
 */
export async function createNotification({
  userId,
  type,
  header,
  message,
  metadata,
}: {
  userId: RecordId;
  type: NotificationType;
  header: string | null;
  message: string;
  metadata?: object;
}): Promise<
  { success: true; data: HydratedDocument<NotificationRecord> } | { success: false; error: string }
> {
  const userExists = await UserModel.findById(userId);
  if (!userExists) {
    return { success: false, error: "User does not exist" };
  }
  const notification = await NotificationModel.create({
    userId,
    type,
    header,
    message,
    sentAt: new Date(),
    metadata,
  });
  return { success: true, data: notification };
}

/**
 * Clears all notifications for a specific user
 * @param userId the user
 */
export async function clearAllNotifications(
  userId: RecordId,
): Promise<{ success: true } | { success: false; error: string }> {
  const userExists = await UserModel.findById(userId);
  if (!userExists) {
    return { success: false, error: "User does not exist" };
  }
  await NotificationModel.deleteMany({ userId });
  return { success: true };
}

/**
 * Clears a notification for a specific user
 * @param notificationId the notification to clear
 * @param requester who is requesting the deletion
 */
export async function deleteNotification(
  notificationId: RecordId,
  requester: RecordId,
): Promise<{ success: true } | { success: false; error: string }> {
  const notification = await NotificationModel.findById(notificationId);
  if (!notification) {
    return { success: false, error: "could not find notification" };
  }
  if (notification.userId !== requester) {
    return { success: false, error: "invalid user requesting deletion" };
  }
  await notification.deleteOne();
  return { success: true };
}

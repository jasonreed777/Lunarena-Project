import type { RecordId } from "@gamenite/server/src/models.ts";

export type NotificationType = "DM" | "Achievement" | "ClanInvite" | "FriendRequest";

/**
 * Represents a notification as exposed to the client
 * - `messageId`: database key
 * - `text`: message contents
 * - `createdBy`: message sender
 * - `createdAt`: when the message was sent
 */
export interface NotificationInfo {
  notificationId: RecordId;
  type: NotificationType;
  header: string | null;
  message: string;
  sentAt: Date;
}

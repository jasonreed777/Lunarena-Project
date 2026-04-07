import type { RecordId } from "@gamenite/server/src/models.ts";

export type NotificationType = "DM" | "Achievement" | "ClanInvite" | "FriendRequest";

type NotificationBase = {
  notificationId: RecordId;
  header: string | null;
  message: string;
  sentAt: Date;
};

/**
 * Represents a notification as exposed to the client
 * - `messageId`: database key
 * - `text`: message contents
 * - `createdBy`: message sender
 * - `createdAt`: when the message was sent
 * - 'metadata': optional metadata
 */
export type NotificationInfo =
  | (NotificationBase & { type: "DM"; metadata: { username: string } })
  | (NotificationBase & { type: "FriendRequest"; metadata: { username: string } })
  | (NotificationBase & {
      type: "Achievement" | "ClanInvite";
      metadata: undefined;
    });

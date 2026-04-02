import { useEffect, useState } from "react";
import type { NotificationInfo } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";
import {
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
} from "../services/notificationService.ts";

export default function useSocketsForNotification() {
  const { socket } = useLoginContext();
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);

  useEffect(() => {
    getNotifications().then((res) => {
      if (!("error" in res)) setNotifications(res);
    });

    function handleNotification(notification: NotificationInfo) {
      setNotifications((prev) => [notification, ...prev]);
    }

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket]);

  async function dismissOne(notificationId: string) {
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    await deleteNotification(notificationId);
  }

  async function dismissAll() {
    setNotifications([]);
    await deleteAllNotifications();
  }

  return { notifications, count: notifications.length, dismissOne, dismissAll };
}

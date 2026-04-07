import { useCallback, useEffect, useState } from "react";
import type { NotificationInfo } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";
import {
  getNotifications,
  deleteNotification,
  deleteAllNotifications,
} from "../services/notificationService.ts";

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";

function getStoredEnabled(): boolean {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) !== "false";
}

export default function useSocketsForNotification() {
  const { socket } = useLoginContext();
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [enabled, setEnabledState] = useState<boolean>(getStoredEnabled);

  const setEnabled = useCallback((value: boolean) => {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(value));
    setEnabledState(value);
    if (!value) {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

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
  }, [socket, enabled]);

  async function dismissOne(notificationId: string) {
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    await deleteNotification(notificationId);
  }

  async function dismissAll() {
    setNotifications([]);
    await deleteAllNotifications();
  }

  return {
    notifications,
    count: notifications.length,
    dismissOne,
    dismissAll,
    enabled,
    setEnabled,
  };
}

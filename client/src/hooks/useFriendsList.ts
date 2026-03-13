import type { ErrorMsg, FriendInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { friendsList } from "../services/friendshipService.ts";
/**
 * Custom hook to get the list of all friends for the current user.
 */
export default function useFriendsList(): { message: string } | FriendInfo[] {
  const [friends, setFriends] = useState<FriendInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    friendsList().then(setFriends);
  }, []);

  if (!friends) return { message: "Loading..." };
  if ("error" in friends) return { message: `Error: ${friends.error}` };
  return friends;
}

import type { ErrorMsg, FriendInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { friendsList } from "../services/friendshipService.ts";
import useAuth from "./useAuth.ts";

/**
 * Custom hook to get the list of all friends for the current user.
 */
export default function useFriendsList(): { message: string } | FriendInfo[] {
  const auth = useAuth();
  const [friends, setFriends] = useState<FriendInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    friendsList(auth).then(setFriends);
  }, [auth]);

  if (!friends) return { message: "Loading..." };
  if ("error" in friends) return { message: `Error: ${friends.error}` };
  return friends;
}

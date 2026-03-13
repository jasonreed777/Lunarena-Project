import type { ErrorMsg, FriendRequestInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { friendRequests } from "../services/friendshipService.ts";
import useAuth from "./useAuth.ts";

type FriendRequestsData = { incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] };

/**
 * Custom hook to get pending friend requests (incoming and outgoing).
 */
export default function useFriendRequests(): { message: string } | FriendRequestsData {
  const auth = useAuth();
  const [requests, setRequests] = useState<FriendRequestsData | ErrorMsg | null>(null);

  useEffect(() => {
    friendRequests(auth).then(setRequests);
  }, [auth]);

  if (!requests) return { message: "Loading..." };
  if ("error" in requests) return { message: `Error: ${requests.error}` };
  return requests;
}

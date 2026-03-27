import type { ErrorMsg, FriendRequestInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { friendRequests } from "../services/friendshipService.ts";
type FriendRequestsData = { incoming: FriendRequestInfo[]; outgoing: FriendRequestInfo[] };

/**
 * Custom hook to get pending friend requests (incoming and outgoing).
 */
export default function useFriendRequests(
  refetchKey?: number,
): { message: string } | FriendRequestsData {
  const [requests, setRequests] = useState<FriendRequestsData | ErrorMsg | null>(null);

  useEffect(() => {
    friendRequests().then(setRequests);
  }, [refetchKey]);

  if (!requests) return { message: "Loading..." };
  if ("error" in requests) return { message: `Error: ${requests.error}` };
  return requests;
}

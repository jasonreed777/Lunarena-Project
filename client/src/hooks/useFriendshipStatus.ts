import { useCallback, useEffect, useState } from "react";
import useLoginContext from "./useLoginContext";
import {
  friendsList,
  friendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "../services/friendshipService";

export type FriendshipState =
  | { status: "loading" }
  | { status: "self" }
  | { status: "none"; sendRequest: () => Promise<void> }
  | {
      status: "incoming_request";
      friendshipId: string;
      accept: () => Promise<void>;
      reject: () => Promise<void>;
      block: () => Promise<void>;
    }
  | { status: "outgoing_request"; friendshipId: string; cancel: () => Promise<void> }
  | { status: "friends"; friendshipId: string; removeFriend: () => Promise<void> }
  | { status: "error"; message: string };

/**
 * Determines the friendship relationship between the logged-in user and a
 * target user, and provides action callbacks for mutations.
 *
 * Action callbacks throw an Error with the server message when the API
 * call fails, so callers can surface feedback.
 */
export default function useFriendshipStatus(targetUsername: string): FriendshipState {
  const { user } = useLoginContext();
  const isSelf = targetUsername === user.username;
  const [state, setState] = useState<FriendshipState>(
    isSelf ? { status: "self" } : { status: "loading" },
  );
  const [refetchCounter, setRefetchCounter] = useState(0);

  const refetch = useCallback(() => setRefetchCounter((c) => c + 1), []);

  useEffect(() => {
    if (isSelf) return;

    let cancelled = false;

    async function fetchRelationship() {
      const [friendsResult, requestsResult] = await Promise.all([friendsList(), friendRequests()]);

      if (cancelled) return;

      if ("error" in friendsResult || "error" in requestsResult) {
        const msg =
          ("error" in friendsResult && friendsResult.error) ||
          ("error" in requestsResult && requestsResult.error) ||
          "Failed to load friendship data";
        setState({ status: "error", message: msg });
        return;
      }

      // Check if already friends
      const friendMatch = friendsResult.find((f) => f.friend.username === targetUsername);
      if (friendMatch) {
        setState({
          status: "friends",
          friendshipId: friendMatch.friendshipId,
          removeFriend: async () => {
            const res = await removeFriend(friendMatch.friendshipId);
            if ("error" in res) throw new Error(res.error);
            refetch();
          },
        });
        return;
      }

      // Check incoming requests (they sent us a request)
      const incomingMatch = requestsResult.incoming.find((r) => r.user.username === targetUsername);
      if (incomingMatch) {
        const respond = async (action: "accept" | "reject" | "block") => {
          const res = await respondToFriendRequest(incomingMatch.friendshipId, action);
          if ("error" in res) throw new Error(res.error);
          refetch();
        };
        setState({
          status: "incoming_request",
          friendshipId: incomingMatch.friendshipId,
          accept: () => respond("accept"),
          reject: () => respond("reject"),
          block: () => respond("block"),
        });
        return;
      }

      // Check outgoing requests (we sent them a request)
      const outgoingMatch = requestsResult.outgoing.find((r) => r.user.username === targetUsername);
      if (outgoingMatch) {
        setState({
          status: "outgoing_request",
          friendshipId: outgoingMatch.friendshipId,
          cancel: async () => {
            const res = await removeFriend(outgoingMatch.friendshipId);
            if ("error" in res) throw new Error(res.error);
            refetch();
          },
        });
        return;
      }

      // No relationship
      setState({
        status: "none",
        sendRequest: async () => {
          const res = await sendFriendRequest(targetUsername);
          if ("error" in res) throw new Error(res.error);
          refetch();
        },
      });
    }

    fetchRelationship();

    return () => {
      cancelled = true;
    };
  }, [isSelf, targetUsername, user.username, refetchCounter, refetch]);

  return state;
}

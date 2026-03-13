import "./FriendsList.css";
import type { FriendInfo, FriendRequestInfo } from "@gamenite/shared";
import { NavLink } from "react-router-dom";
import useFriendsList from "../hooks/useFriendsList.ts";
import useFriendRequests from "../hooks/useFriendRequests.ts";
import useTimeSince from "../hooks/useTimeSince.ts";

function FriendItem({ friend, since }: FriendInfo) {
  const timeSince = useTimeSince();
  return (
    <div className="friendItem">
      <NavLink to={`/profile/${friend.username}`} className="friendItemName">
        {friend.display}
      </NavLink>
      <span className="friendItemMeta">
        @{friend.username} · Friends {timeSince(since)}
      </span>
    </div>
  );
}

function RequestItem({ user, createdAt }: FriendRequestInfo) {
  const timeSince = useTimeSince();
  return (
    <div className="friendItem">
      <NavLink to={`/profile/${user.username}`} className="friendItemName">
        {user.display}
      </NavLink>
      <span className="friendItemMeta">
        @{user.username} · {timeSince(createdAt)}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="friendsEmpty">{message}</div>;
}

export default function FriendsList() {
  const friendsData = useFriendsList();
  const requestsData = useFriendRequests();

  const friends = "message" in friendsData ? [] : friendsData;
  const incoming = "message" in requestsData ? [] : requestsData.incoming;
  const outgoing = "message" in requestsData ? [] : requestsData.outgoing;

  return (
    <div className="content">
      <div className="friendsPage">
        <section className="friendsSection">
          <h3>Incoming Requests</h3>
          {incoming.length === 0 ? (
            <EmptyState message="No pending requests" />
          ) : (
            <div className="friendsList">
              {incoming.map((req) => (
                <RequestItem {...req} key={req.friendshipId} />
              ))}
            </div>
          )}
        </section>

        <section className="friendsSection">
          <h3>Sent Requests</h3>
          {outgoing.length === 0 ? (
            <EmptyState message="No sent requests" />
          ) : (
            <div className="friendsList">
              {outgoing.map((req) => (
                <RequestItem {...req} key={req.friendshipId} />
              ))}
            </div>
          )}
        </section>

        <section className="friendsSection">
          <h3>Friends</h3>
          {friends.length === 0 ? (
            <EmptyState message="No friends yet" />
          ) : (
            <div className="friendsList">
              {friends.map((friend) => (
                <FriendItem {...friend} key={friend.friendshipId} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

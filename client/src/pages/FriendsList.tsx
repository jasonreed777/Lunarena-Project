import type { FriendInfo, FriendRequestInfo, SafeUserInfo } from "@gamenite/shared";
import useFriendsList from "../hooks/useFriendsList.ts";
import useFriendRequests from "../hooks/useFriendRequests.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProfileByUsername, updateProfile } from "../services/profileService.ts";
import { searchUsers } from "../services/userService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import * as Typography from "../libs/Typography";
import { Divider } from "../components/Divider";
import { ThemeContext } from "../contexts/ThemeContext";

import { FriendPill } from "../components/FriendPill";
import { EmptyState } from "../components/EmptyState";
import { FriendActionButtons } from "../components/FriendActionButtons";
import { StyledInput } from "../components/Input";

const DEFAULT_PILL_COLOR = "#24989e";

function FriendItem({
  friend,
  since,
  color,
  onActionComplete,
}: FriendInfo & { color: string; onActionComplete: () => void }) {
  const timeSince = useTimeSince();
  const { theme } = React.useContext(ThemeContext);
  return (
    <FriendPill
      to={`/profile/${friend.username}`}
      name={friend.display}
      detail={`@${friend.username} · Friends ${timeSince(since)}`}
      color={color}
      themeId={theme._id}
    >
      <FriendActionButtons
        targetUsername={friend.username}
        compact
        onActionComplete={onActionComplete}
      />
    </FriendPill>
  );
}

function RequestItem({
  user,
  createdAt,
  color,
  onActionComplete,
}: FriendRequestInfo & { color: string; onActionComplete: () => void }) {
  const timeSince = useTimeSince();
  const { theme } = React.useContext(ThemeContext);
  return (
    <FriendPill
      to={`/profile/${user.username}`}
      name={user.display}
      detail={`@${user.username} · ${timeSince(createdAt)}`}
      color={color}
      themeId={theme._id}
    >
      <FriendActionButtons
        targetUsername={user.username}
        compact
        onActionComplete={onActionComplete}
      />
    </FriendPill>
  );
}

export default function FriendsList() {
  const [refetchKey, setRefetchKey] = useState(0);
  const friendsData = useFriendsList(refetchKey);
  const requestsData = useFriendRequests(refetchKey);

  const friends = useMemo(() => ("message" in friendsData ? [] : friendsData), [friendsData]);
  const incoming = useMemo(
    () => ("message" in requestsData ? [] : requestsData.incoming),
    [requestsData],
  );
  const outgoing = useMemo(
    () => ("message" in requestsData ? [] : requestsData.outgoing),
    [requestsData],
  );

  const user = useLoginContext().user;
  const { theme } = React.useContext(ThemeContext);

  const handleActionComplete = () => setRefetchKey((k) => k + 1);

  // --- Search state ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SafeUserInfo[]>([]);
  const [searchColorMap, setSearchColorMap] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    (q: string) => {
      if (q.trim().length === 0) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }
      searchUsers(q.trim()).then((res) => {
        if ("error" in res) return;
        setSearchResults(res);
        setHasSearched(true);
        // fetch border colors for results
        Promise.all(
          res.map(async (u) => {
            const profile = await getProfileByUsername(u.username);
            if ("error" in profile) return [u.username, DEFAULT_PILL_COLOR] as const;
            return [u.username, profile.profileBorderColor || DEFAULT_PILL_COLOR] as const;
          }),
        ).then((entries) => setSearchColorMap(Object.fromEntries(entries)));
      });
    },
    [],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  // Map of username → profileBorderColor fetched from each user's profile
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [colorsLoaded, setColorsLoaded] = useState(false);

  // Collect all unique usernames across friends + requests, fetch their profiles
  const hasUsers = friends.length > 0 || incoming.length > 0 || outgoing.length > 0;

  // When there are no users, treat colors as loaded
  if (!hasUsers && !colorsLoaded) {
    setColorsLoaded(true);
  }

  useEffect(() => {
    const usernames = new Set<string>();
    friends.forEach((f) => usernames.add(f.friend.username));
    incoming.forEach((r) => usernames.add(r.user.username));
    outgoing.forEach((r) => usernames.add(r.user.username));

    if (usernames.size === 0) return;

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setColorsLoaded(false);
      })
      .then(() =>
        Promise.all(
          [...usernames].map(async (uname) => {
            const profile = await getProfileByUsername(uname);
            if ("error" in profile) return [uname, DEFAULT_PILL_COLOR] as const;
            return [uname, profile.profileBorderColor || DEFAULT_PILL_COLOR] as const;
          }),
        ),
      )
      .then((entries) => {
        if (!cancelled) {
          setColorMap(Object.fromEntries(entries));
          setColorsLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [friends, incoming, outgoing]);

  // Update the user's online presence to active when they are on the friends page
  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);

  return (
    <div
      style={{
        minHeight: "var(--content-vh)",
        backgroundImage: "url(../assets/gradients/friends_gradient.png)",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
        padding: "20px",
        paddingTop: "3rem",
        backgroundColor: theme.primary,
        color: theme.text,
      }}
    >
      <Typography.PageTitle>Friends</Typography.PageTitle>

      <StyledInput
        borderColor={theme.text}
        placeholder="Search users by name or username..."
        value={searchQuery}
        onChange={handleSearchChange}
        style={{ marginBottom: 20 }}
      />

      {hasSearched && (
        <div style={{ marginBottom: 30 }}>
          <Typography.Subtitle style={{ color: theme.secondaryText }}>
            Search Results
          </Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 15 }} />
          {searchResults.length === 0 ? (
            <EmptyState message="No results" themeId={theme._id} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              {searchResults.map((u) => (
                <FriendPill
                  key={u.username}
                  to={`/profile/${u.username}`}
                  name={u.display}
                  detail={`@${u.username}`}
                  color={searchColorMap[u.username] || DEFAULT_PILL_COLOR}
                  themeId={theme._id}
                >
                  <FriendActionButtons
                    targetUsername={u.username}
                    compact
                    onActionComplete={handleActionComplete}
                  />
                </FriendPill>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>
          Incoming Requests
        </Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {!colorsLoaded ? (
          <EmptyState message="Loading..." themeId={theme._id} />
        ) : incoming.length === 0 ? (
          <EmptyState message="No pending requests" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {incoming.map((req) => (
              <RequestItem
                {...req}
                key={req.friendshipId}
                color={colorMap[req.user.username] || DEFAULT_PILL_COLOR}
                onActionComplete={handleActionComplete}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>
          Sent Requests
        </Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {!colorsLoaded ? (
          <EmptyState message="Loading..." themeId={theme._id} />
        ) : outgoing.length === 0 ? (
          <EmptyState message="No sent requests" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {outgoing.map((req) => (
              <RequestItem
                {...req}
                key={req.friendshipId}
                color={colorMap[req.user.username] || DEFAULT_PILL_COLOR}
                onActionComplete={handleActionComplete}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>Friends</Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {!colorsLoaded ? (
          <EmptyState message="Loading..." themeId={theme._id} />
        ) : friends.length === 0 ? (
          <EmptyState message="No friends yet" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {friends.map((friend) => (
              <FriendItem
                {...friend}
                key={friend.friendshipId}
                color={colorMap[friend.friend.username] || DEFAULT_PILL_COLOR}
                onActionComplete={handleActionComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

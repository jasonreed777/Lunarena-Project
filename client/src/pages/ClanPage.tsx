import "./ClanPage.css";
import React, { useEffect, useState } from "react";
import type { ClanDetailInfo, ClanMemberInfo, GameInfo } from "@gamenite/shared";
import type { UserProfileRecord } from "../util/types";
import * as Typography from "../libs/Typography";
import { Divider } from "../components/Divider";
import { FriendPill } from "../components/FriendPill";
import { EmptyState } from "../components/EmptyState";
import { InputWithLabel } from "../components/Input";
import { TranslucentButton as Button } from "../components/Buttons";
import { RecentlyPlayed } from "../components/RecentlyPlayed";
import {
  JoinClanButton,
  InviteResponseButtons,
  CancelInviteButton,
  KickButton,
  RoleToggleButton,
} from "../components/ClanActionButtons";
import { ThemeContext } from "../contexts/ThemeContext";
import useLoginContext from "../hooks/useLoginContext";
import useGameList from "../hooks/useGameList";
import useClanList from "../hooks/useClanList";
import useUserClan from "../hooks/useUserClan";
import useMyInvites from "../hooks/useMyInvites";
import useClanInvites from "../hooks/useClanInvites";
import useClanLeaderboard from "../hooks/useClanLeaderboard";
import {
  createClan,
  getClanById,
  leaveClan,
  inviteUser,
  updateClan,
  transferOwnership,
} from "../services/clanService";
import { updateProfile, getUploadedImage } from "../services/profileService";
import { AVATARS } from "../util/consts";

// Keep this type export so ClanPill.tsx (which imports it) doesn't break.
type Statistics = {
  nim: number;
  guess: number;
  minesweeper: number;
};

export type Clan = {
  name: string;
  stats: Statistics;
  members: UserProfileRecord[];
  color: string;
  sponsors?: string[];
  icon: string;
};

/** Resolves a pfp object to an image src, matching how Header/ViewProfile do it. */
const LeaderboardPfp: React.FC<{
  pfp: { type: "upload" | "avatar"; uploadId?: string; avatarId?: string };
  alt: string;
  borderColor: string;
}> = ({ pfp, alt, borderColor }) => {
  const [uploadSrc, setUploadSrc] = useState<string | null>(null);

  useEffect(() => {
    if (pfp.type === "upload" && pfp.uploadId) {
      getUploadedImage(pfp.uploadId).then((res) => {
        if (!("error" in res)) setUploadSrc(res.data);
      });
    }
  }, [pfp.type, pfp.uploadId]);

  const src =
    pfp.type === "upload"
      ? uploadSrc
      : (AVATARS.find((a) => a.avatarId === pfp.avatarId)?.imageUrl ?? AVATARS[0].imageUrl);

  if (!src) return null;
  return (
    <img
      className="leaderboard-pill-pfp"
      src={src}
      alt={alt}
      style={{ border: `3px solid ${borderColor}` }}
    />
  );
};

export const ClanPage: React.FC = () => {
  const [refetchKey, setRefetchKey] = useState(0);

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBio, setCreateBio] = useState("");
  const [createColor, setCreateColor] = useState("#24989e");
  const [createIsPublic, setCreateIsPublic] = useState(true);
  const [createError, setCreateError] = useState("");

  // Clan detail state
  const [clanDetail, setClanDetail] = useState<ClanDetailInfo | null>(null);

  // Manage clan section
  const [showManage, setShowManage] = useState(false);

  // Invite user form
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Clan settings form
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editError, setEditError] = useState("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Transfer ownership form
  const [transferUsername, setTransferUsername] = useState("");
  const [transferError, setTransferError] = useState("");

  // Leave error
  const [leaveError, setLeaveError] = useState("");

  // Hooks
  const clanList = useClanList(refetchKey);
  const userClan = useUserClan(refetchKey);
  const myInvites = useMyInvites(refetchKey);
  const user = useLoginContext().user;
  const { theme } = React.useContext(ThemeContext);
  const gameList = useGameList(8) as GameInfo[];

  const hasNoClan = !("message" in userClan) && userClan.data === null;
  const hasClan = !("message" in userClan) && userClan.data !== null;

  const clanId = hasClan && userClan.data ? userClan.data.clan.clanId : null;
  const userRole = hasClan && userClan.data ? userClan.data.role : null;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  const clanInvites = useClanInvites(isAdminOrOwner ? clanId : null, refetchKey);
  const clanLeaderboard = useClanLeaderboard(clanId ?? undefined);

  // Reset clan detail when clanId becomes null (render-time state adjustment)
  if (!clanId && clanDetail !== null) {
    setClanDetail(null);
    setSettingsInitialized(false);
  }

  // Pre-fill settings form once when clan detail loads (render-time state adjustment)
  if (clanDetail && !settingsInitialized) {
    setEditName(clanDetail.name);
    setEditBio(clanDetail.bio);
    setEditColor(clanDetail.color);
    setEditIsPublic(clanDetail.isPublic);
    setSettingsInitialized(true);
  }

  // Fetch clan detail when user has a clan
  useEffect(() => {
    if (!clanId) return;
    getClanById(clanId).then((res) => {
      if (!("error" in res)) setClanDetail(res);
    });
  }, [clanId, refetchKey]);

  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);

  const handleActionComplete = () => setRefetchKey((k) => k + 1);

  const handleCreate = async () => {
    setCreateError("");
    if (createName.length < 3) {
      setCreateError("Name must be at least 3 characters");
      return;
    }
    const result = await createClan({
      name: createName,
      bio: createBio,
      color: createColor,
      isPublic: createIsPublic,
    });
    if ("error" in result) {
      setCreateError(result.error);
      return;
    }
    setShowCreateForm(false);
    setCreateName("");
    setCreateBio("");
    setCreateColor("#24989e");
    setCreateIsPublic(true);
    handleActionComplete();
  };

  const handleLeave = async () => {
    if (!clanId) return;
    if (!window.confirm("Are you sure you want to leave this clan?")) return;
    setLeaveError("");
    const result = await leaveClan(clanId);
    if ("error" in result) {
      setLeaveError(result.error);
      return;
    }
    handleActionComplete();
  };

  const handleInviteUser = async () => {
    if (!clanId || !inviteUsername.trim()) return;
    setInviteError("");
    setInviteSuccess("");
    const result = await inviteUser(clanId, inviteUsername.trim());
    if ("error" in result) {
      setInviteError(result.error);
      return;
    }
    setInviteSuccess(`Invited ${inviteUsername}`);
    setInviteUsername("");
    handleActionComplete();
  };

  const handleUpdateClan = async () => {
    if (!clanId) return;
    setEditError("");
    const result = await updateClan(clanId, {
      name: editName,
      bio: editBio,
      color: editColor,
      isPublic: editIsPublic,
    });
    if ("error" in result) {
      setEditError(result.error);
      return;
    }
    setSettingsInitialized(false);
    handleActionComplete();
  };

  const handleTransfer = async () => {
    if (!clanId || !transferUsername.trim()) return;
    if (!window.confirm(`Transfer ownership to ${transferUsername}? This cannot be undone.`))
      return;
    setTransferError("");
    const result = await transferOwnership(clanId, transferUsername.trim());
    if ("error" in result) {
      setTransferError(result.error);
      return;
    }
    setTransferUsername("");
    handleActionComplete();
  };

  // ── Has Clan: Detail View ──
  if (hasClan && userClan.data) {
    const { clan, role } = userClan.data;

    return (
      <div className="clan-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
        <div className="title-row">
          <Typography.PageTitle>{clan.name}</Typography.PageTitle>
          <img
            src={clan.pfp || "/assets/logos/logo_multicolor.svg"}
            className="icon-lg"
            style={{ border: `10px solid ${clan.color}` }}
          />
        </div>

        {clan.bio && (
          <Typography.InputText style={{ opacity: 0.7, marginBottom: 10 }}>
            {clan.bio}
          </Typography.InputText>
        )}

        <Typography.SmallText style={{ opacity: 0.5, marginBottom: 20 }}>
          {clan.memberCount} members · {clan.isPublic ? "Public" : "Private"} · Your role: {role}
        </Typography.SmallText>

        <div className="clan-info">
          {/* Members */}
          <div className="members">
            <Typography.Subtitle>Members</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 20 }} />
            <div className="member-list clan-info-column">
              {clanDetail ? (
                clanDetail.members.map((member: ClanMemberInfo) => (
                  <FriendPill
                    key={member.user.username}
                    to={`/profile/${member.user.username}`}
                    name={member.user.display}
                    detail={member.role}
                    color={clan.color}
                    themeId={theme._id}
                  >
                    {/* Owner can promote/demote + kick non-owners */}
                    {role === "owner" &&
                      member.role !== "owner" &&
                      member.user.username !== user.username && (
                        <>
                          <RoleToggleButton
                            clanId={clan.clanId}
                            username={member.user.username}
                            currentRole={member.role}
                            compact
                            onActionComplete={handleActionComplete}
                          />
                          <KickButton
                            clanId={clan.clanId}
                            username={member.user.username}
                            compact
                            onActionComplete={handleActionComplete}
                          />
                        </>
                      )}
                    {/* Admins can kick regular members */}
                    {role === "admin" &&
                      member.role === "member" &&
                      member.user.username !== user.username && (
                        <KickButton
                          clanId={clan.clanId}
                          username={member.user.username}
                          compact
                          onActionComplete={handleActionComplete}
                        />
                      )}
                  </FriendPill>
                ))
              ) : (
                <EmptyState message="Loading members..." themeId={theme._id} />
              )}
            </div>
          </div>

          {/* Recently Played */}
          <div className="recently-played">
            <Typography.Subtitle>Recently Played</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 10 }} />
            <div className="recently-played-list clan-info-column">
              {"message" in gameList ? (
                <EmptyState message="Loading..." themeId={theme._id} />
              ) : gameList.length === 0 ? (
                <EmptyState message="No recent games" themeId={theme._id} />
              ) : (
                gameList.map((game, index) => (
                  <RecentlyPlayed
                    key={game.gameId}
                    game={game.type}
                    players={game.players}
                    position={index + 1}
                    timeAgo={game.createdAt}
                  />
                ))
              )}
            </div>
          </div>

          {/* Points Leaderboard */}
          <div className="leaderboard">
            <Typography.Subtitle>Leaderboard</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 20 }} />
            <div className="member-list clan-info-column">
              {"message" in clanLeaderboard ? (
                <EmptyState message={clanLeaderboard.message} themeId={theme._id} />
              ) : clanLeaderboard.length === 0 ? (
                <EmptyState message="No points earned yet" themeId={theme._id} />
              ) : (
                clanLeaderboard.map((entry, index) => (
                  <div key={entry.username} className="leaderboard-entry">
                    <div
                      className="leaderboard-pill"
                      style={{
                        borderColor: entry.profileBorderColor,
                        backgroundColor: `${entry.profileBorderColor}33`,
                        color: entry.profileBorderColor,
                      }}
                    >
                      <div className="leaderboard-pill-left">
                        <LeaderboardPfp
                          pfp={entry.pfp}
                          alt={entry.display}
                          borderColor={entry.profileBorderColor}
                        />
                        <Typography.ProfileText>{entry.display}</Typography.ProfileText>
                      </div>
                      <Typography.LargeStat>#{index + 1}</Typography.LargeStat>
                    </div>
                    <Typography.SmallText style={{ opacity: 0.5, margin: 0, paddingLeft: 14 }}>
                      {entry.pointsTotal} points
                    </Typography.SmallText>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Leave Clan */}
        <div style={{ marginTop: 30, marginBottom: 20 }}>
          {role === "owner" ? (
            <Typography.SmallText style={{ opacity: 0.5 }}>
              Transfer ownership before leaving the clan.
            </Typography.SmallText>
          ) : (
            <Button color="#ef4444" onClick={handleLeave}>
              Leave Clan
            </Button>
          )}
          {leaveError && (
            <Typography.SmallText style={{ color: "#ff6b6b", margin: 0, marginTop: 8 }}>
              {leaveError}
            </Typography.SmallText>
          )}
        </div>

        {/* Manage Clan (admin/owner only) */}
        {isAdminOrOwner && (
          <div className="manage-clan-section">
            <button className="primary narrow" onClick={() => setShowManage(true)}>
              Manage Clan
            </button>

            {showManage && (
              <div className="manage-dialog-overlay" onClick={() => setShowManage(false)}>
                <div
                  className="manage-dialog"
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.text,
                    borderTop: `4px solid ${clan.color}`,
                    backgroundImage: `linear-gradient(${clan.color}22, transparent 200px)`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="manage-dialog-close" onClick={() => setShowManage(false)}>
                    &times;
                  </button>

                  <Typography.PageTitle style={{ marginBottom: 20, fontSize: "1.5rem" }}>
                    Manage Clan
                  </Typography.PageTitle>

                  {/* Invite User */}
                  <div className="manage-subsection">
                    <Typography.Subtitle style={{ color: theme.secondaryText }}>
                      Invite User
                    </Typography.Subtitle>
                    <Divider color={theme.text} style={{ marginBottom: 15 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <InputWithLabel
                        color={theme.secondary}
                        label=""
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        placeholder="Enter username to invite"
                      />
                      <Button color={theme.secondary} onClick={handleInviteUser}>
                        Send Invite
                      </Button>
                      {inviteSuccess && (
                        <Typography.SmallText style={{ color: "#22c55e", margin: 0 }}>
                          {inviteSuccess}
                        </Typography.SmallText>
                      )}
                      {inviteError && (
                        <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                          {inviteError}
                        </Typography.SmallText>
                      )}
                    </div>
                  </div>

                  {/* Pending Invites & Requests */}
                  <div className="manage-subsection">
                    <Typography.Subtitle style={{ color: theme.secondaryText }}>
                      Pending Invites & Requests
                    </Typography.Subtitle>
                    <Divider color={theme.text} style={{ marginBottom: 15 }} />
                    {"message" in clanInvites ? (
                      <EmptyState message={clanInvites.message} themeId={theme._id} />
                    ) : clanInvites.length === 0 ? (
                      <EmptyState message="No pending invites or requests" themeId={theme._id} />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        {clanInvites.map((invite) => (
                          <FriendPill
                            key={invite.inviteId}
                            to={`/profile/${invite.user.username}`}
                            name={invite.user.display}
                            detail={invite.type === "invite" ? "Invited" : "Requested to join"}
                            color={clan.color}
                            themeId={theme._id}
                          >
                            {invite.type === "request" ? (
                              <InviteResponseButtons
                                inviteId={invite.inviteId}
                                type={invite.type}
                                compact
                                onActionComplete={handleActionComplete}
                              />
                            ) : (
                              <CancelInviteButton
                                inviteId={invite.inviteId}
                                compact
                                onActionComplete={handleActionComplete}
                              />
                            )}
                          </FriendPill>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clan Settings */}
                  <div className="manage-subsection">
                    <Typography.Subtitle style={{ color: theme.secondaryText }}>
                      Clan Settings
                    </Typography.Subtitle>
                    <Divider color={theme.text} style={{ marginBottom: 15 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <InputWithLabel
                        color={theme.secondary}
                        label="Clan Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Clan name (3-32 chars)"
                      />
                      <InputWithLabel
                        color={theme.secondary}
                        label="Bio"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Describe your clan..."
                      />
                      <div>
                        <Typography.SmallText style={{ margin: 0, marginBottom: 4, opacity: 0.7 }}>
                          Color
                        </Typography.SmallText>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                          />
                          <span style={{ fontFamily: "'filson-pro', sans-serif" }}>
                            {editColor}
                          </span>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontFamily: "'filson-pro', sans-serif",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editIsPublic}
                          onChange={(e) => setEditIsPublic(e.target.checked)}
                        />
                        Public Clan
                      </label>
                      {editError && (
                        <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                          {editError}
                        </Typography.SmallText>
                      )}
                      <Button color={theme.secondary} onClick={handleUpdateClan}>
                        Save Changes
                      </Button>
                    </div>
                  </div>

                  {/* Transfer Ownership (owner only) */}
                  {role === "owner" && (
                    <div className="manage-subsection">
                      <Typography.Subtitle style={{ color: theme.secondaryText }}>
                        Transfer Ownership
                      </Typography.Subtitle>
                      <Divider color={theme.text} style={{ marginBottom: 15 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <InputWithLabel
                          color="#ef4444"
                          label=""
                          value={transferUsername}
                          onChange={(e) => setTransferUsername(e.target.value)}
                          placeholder="Enter new owner's username"
                        />
                        <Button color="#ef4444" onClick={handleTransfer}>
                          Transfer Ownership
                        </Button>
                        {transferError && (
                          <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                            {transferError}
                          </Typography.SmallText>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── No Clan: Listing View ──
  return (
    <div className="clan-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
      <Typography.PageTitle>Clans</Typography.PageTitle>
      <Divider color={theme.text} />

      {/* Your Clan */}
      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>Your Clan</Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {"message" in userClan ? (
          <EmptyState message={userClan.message} themeId={theme._id} />
        ) : (
          <EmptyState message="You are not in a clan" themeId={theme._id} />
        )}
      </div>

      {/* Pending Invites */}
      {hasNoClan && (
        <div style={{ marginBottom: 30 }}>
          <Typography.Subtitle style={{ color: theme.secondaryText }}>
            Pending Invites
          </Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 15 }} />
          {"message" in myInvites ? (
            <EmptyState message={myInvites.message} themeId={theme._id} />
          ) : myInvites.length === 0 ? (
            <EmptyState message="No pending invites" themeId={theme._id} />
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
            >
              {myInvites.map((invite) => (
                <FriendPill
                  key={invite.inviteId}
                  to="/clan"
                  name={invite.clan.name}
                  detail={
                    invite.invitedBy ? `Invited by ${invite.invitedBy.display}` : "Clan invitation"
                  }
                  color={invite.clan.color}
                  themeId={theme._id}
                >
                  <InviteResponseButtons
                    inviteId={invite.inviteId}
                    type="invite"
                    compact
                    onActionComplete={handleActionComplete}
                  />
                </FriendPill>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Clan */}
      {hasNoClan && (
        <div style={{ marginBottom: 30 }}>
          <button className="primary narrow" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? "Cancel" : "Create New Clan"}
          </button>

          {showCreateForm && (
            <div
              style={{
                marginTop: 15,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxWidth: 400,
              }}
            >
              <InputWithLabel
                color={theme.secondary}
                label="Clan Name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Enter clan name (3-32 chars)"
              />
              <InputWithLabel
                color={theme.secondary}
                label="Bio"
                value={createBio}
                onChange={(e) => setCreateBio(e.target.value)}
                placeholder="Describe your clan..."
              />
              <div>
                <Typography.SmallText style={{ margin: 0, marginBottom: 4, opacity: 0.7 }}>
                  Color
                </Typography.SmallText>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input
                    type="color"
                    value={createColor}
                    onChange={(e) => setCreateColor(e.target.value)}
                  />
                  <span style={{ fontFamily: "'filson-pro', sans-serif" }}>{createColor}</span>
                </div>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "'filson-pro', sans-serif",
                }}
              >
                <input
                  type="checkbox"
                  checked={createIsPublic}
                  onChange={(e) => setCreateIsPublic(e.target.checked)}
                />
                Public Clan
              </label>
              {createError && (
                <Typography.SmallText style={{ color: "#ff6b6b", margin: 0 }}>
                  {createError}
                </Typography.SmallText>
              )}
              <Button color={theme.secondary} onClick={handleCreate}>
                Create Clan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Public Clans */}
      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>
          Public Clans
        </Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {"message" in clanList ? (
          <EmptyState message={clanList.message} themeId={theme._id} />
        ) : clanList.length === 0 ? (
          <EmptyState message="No public clans yet" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {clanList.map((clan) => (
              <FriendPill
                key={clan.clanId}
                to="/clan"
                name={clan.name}
                detail={`${clan.memberCount} members`}
                color={clan.color}
                themeId={theme._id}
              >
                {hasNoClan && (
                  <JoinClanButton
                    clanId={clan.clanId}
                    isPublic={clan.isPublic}
                    compact
                    onActionComplete={handleActionComplete}
                  />
                )}
              </FriendPill>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

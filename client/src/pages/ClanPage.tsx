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
import ManageClanModal from "../components/ManageClanModal";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  JoinClanButton,
  InviteResponseButtons,
  KickButton,
  RoleToggleButton,
} from "../components/ClanActionButtons";
import { ThemeContext } from "../contexts/ThemeContext";
import useLoginContext from "../hooks/useLoginContext";
import useGameList from "../hooks/useGameList";
import useClanList from "../hooks/useClanList";
import useUserClan from "../hooks/useUserClan";
import useMyInvites from "../hooks/useMyInvites";
import useClanLeaderboard from "../hooks/useClanLeaderboard";
import useClanRankings from "../hooks/useClanRankings";
import { createClan, getClanById, leaveClan } from "../services/clanService";
import { updateProfile } from "../services/profileService";
import { Leaderboard } from "../components/Leaderboard";
import GameSummaryView from "../components/GameSummaryView";

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

  // Leave confirm dialog
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Leave error
  const [leaveError, setLeaveError] = useState("");

  // Clan rankings toggle
  const [showClanRankings, setShowClanRankings] = useState(false);

  // Hooks
  const clanList = useClanList(refetchKey);
  const userClan = useUserClan(refetchKey);
  const myInvites = useMyInvites(refetchKey);
  const user = useLoginContext().user;
  const { theme } = React.useContext(ThemeContext);

  const hasNoClan = !("message" in userClan) && userClan.data === null;
  const hasClan = !("message" in userClan) && userClan.data !== null;

  const pendingRequestClanIds = new Set(
    !("message" in myInvites)
      ? myInvites.filter((inv) => inv.type === "request").map((inv) => inv.clan.clanId)
      : [],
  );

  const clanId = hasClan && userClan.data ? userClan.data.clan.clanId : null;
  const gameList = useGameList({ clanId: clanId ?? undefined, limit: 10 }, !clanId) as GameInfo[];
  const activeGames = useGameList(
    { clanId: clanId ?? undefined, limit: 10, status: "active" },
    !clanId,
  );
  const userRole = hasClan && userClan.data ? userClan.data.role : null;
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  const clanLeaderboard = useClanLeaderboard(clanId ?? undefined);
  const clanRankings = useClanRankings(refetchKey);

  // Reset clan detail when clanId becomes null (render-time state adjustment)
  if (!clanId && clanDetail !== null) {
    setClanDetail(null);
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
    setLeaveError("");
    setShowLeaveConfirm(false);
    const result = await leaveClan(clanId);
    if ("error" in result) {
      setLeaveError(result.error);
      return;
    }
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

        {/* Leaderboard + Actions Row */}
        <div className="leaderboard-actions-row">
          <div className="leaderboard-container">
            <Typography.Subtitle>Leaderboard</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 20 }} />
            <div className="leaderboard">
              {"message" in clanLeaderboard ? (
                <EmptyState message={clanLeaderboard.message} themeId={theme._id} />
              ) : clanLeaderboard.length === 0 ? (
                <EmptyState message="No points earned yet" themeId={theme._id} />
              ) : (
                <Leaderboard leaderboard={clanLeaderboard} theme={theme} type="clan" />
              )}
            </div>
          </div>

          <div className="actions-container">
            <Typography.Subtitle>Actions</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 20 }} />
            <div className="actions">
              <Button color={theme.secondary} onClick={() => setShowClanRankings(true)}>
                Clan Leaderboard
              </Button>
              <Button color="#e01313" onClick={() => setShowLeaveConfirm(true)}>
                Leave Clan
              </Button>
              {leaveError && (
                <Typography.SmallText style={{ color: "#e01313", margin: 0, marginTop: 8 }}>
                  {leaveError}
                </Typography.SmallText>
              )}
              {isAdminOrOwner && (
                <Button color="#43b9c6" onClick={() => setShowManage(true)}>
                  Manage Clan
                </Button>
              )}
            </div>
          </div>
        </div>

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

          {/* Active Games */}
          <div className="recently-played">
            <Typography.Subtitle>Active Games</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 10 }} />
            <div className="recently-played-list clan-info-column">
              {"message" in activeGames ? (
                <EmptyState message="No active games" themeId={theme._id} />
              ) : (
                activeGames.map((game, index) => (
                  <GameSummaryView key={game.gameId} gameInfo={game} theme={theme} index={index} />
                ))
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
        </div>

        {/* Manage Clan Modal (admin/owner only) */}
        {isAdminOrOwner && showManage && (
          <ManageClanModal
            theme={theme}
            setShowManage={setShowManage}
            clan={clan}
            role={role}
            handleActionComplete={handleActionComplete}
            clanDetail={clanDetail}
            refetchKey={refetchKey}
          />
        )}

        {/* Clan Leaderboard Dialog */}
        {showClanRankings && (
          <div className="manage-dialog-overlay" onClick={() => setShowClanRankings(false)}>
            <div
              className="manage-dialog"
              style={{
                backgroundColor: theme.primary,
                color: theme.text,
                maxHeight: "80vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="manage-dialog-close" onClick={() => setShowClanRankings(false)}>
                &times;
              </button>
              <Typography.PageTitle style={{ marginBottom: 20, fontSize: "1.5rem" }}>
                Clan Leaderboard
              </Typography.PageTitle>
              {"message" in clanRankings ? (
                <EmptyState message={clanRankings.message} themeId={theme._id} />
              ) : clanRankings.length === 0 ? (
                <EmptyState message="No clans yet" themeId={theme._id} />
              ) : (
                <Leaderboard
                  leaderboard={clanRankings.map((entry) => ({
                    username: entry.clanId,
                    display: entry.name,
                    pointsTotal: entry.totalPoints,
                    gamesPlayedTotal: entry.totalGamesPlayed,
                    achievementCount: entry.totalWins,
                  }))}
                  theme={theme}
                  clickable={false}
                  type="clan"
                />
              )}
            </div>
          </div>
        )}

        {/* Leave Clan Confirm Dialog */}
        {showLeaveConfirm && (
          <ConfirmDialog
            message={
              role === "owner" && clan.memberCount <= 1
                ? "You are the last member. Leaving will disband the clan. Are you sure?"
                : role === "owner"
                  ? "Ownership will be transferred to another member. Are you sure you want to leave?"
                  : "Are you sure you want to leave this clan?"
            }
            confirmLabel="Leave"
            confirmColor="#e01313"
            onConfirm={handleLeave}
            onCancel={() => setShowLeaveConfirm(false)}
            backgroundColor={theme.primary}
            textColor={theme.text}
          />
        )}
      </div>
    );
  }

  // ── No Clan: Listing View ──
  return (
    <div className="clan-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
      <Typography.PageTitle>Clans</Typography.PageTitle>
      <Divider color={theme.text} />

      <div style={{ marginBottom: 20, marginTop: 15 }}>
        <Button color={theme.secondary} onClick={() => setShowClanRankings(true)}>
          Clan Leaderboard
        </Button>
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
          <Button color={theme.secondary} onClick={() => setShowCreateForm(true)}>
            Create New Clan
          </Button>

          {showCreateForm && (
            <div className="manage-dialog-overlay" onClick={() => setShowCreateForm(false)}>
              <div
                className="manage-dialog"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.text,
                  borderTop: `4px solid ${createColor}`,
                  backgroundImage: `linear-gradient(${createColor}22, transparent 200px)`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="manage-dialog-close" onClick={() => setShowCreateForm(false)}>
                  &times;
                </button>

                <Typography.PageTitle style={{ marginBottom: 20, fontSize: "1.5rem" }}>
                  Create New Clan
                </Typography.PageTitle>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <InputWithLabel
                    borderColor={theme.secondary}
                    label="Clan Name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Enter clan name (3-32 chars)"
                  />
                  <InputWithLabel
                    borderColor={theme.secondary}
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
                      cursor: "pointer",
                    }}
                  >
                    <span className="clan-toggle">
                      <input
                        type="checkbox"
                        checked={createIsPublic}
                        onChange={(e) => setCreateIsPublic(e.target.checked)}
                      />
                      <span className="clan-toggle-slider" />
                    </span>
                    Public Clan
                  </label>
                  {createError && (
                    <Typography.SmallText style={{ color: "#e01313", margin: 0 }}>
                      {createError}
                    </Typography.SmallText>
                  )}
                  <Button color={theme.secondary} onClick={handleCreate}>
                    Create Clan
                  </Button>
                </div>
              </div>
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
        ) : clanList.filter((c) => c.isPublic).length === 0 ? (
          <EmptyState message="No public clans yet" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {clanList
              .filter((c) => c.isPublic)
              .map((clan) => (
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
                      hasExistingRequest={pendingRequestClanIds.has(clan.clanId)}
                      compact
                      onActionComplete={handleActionComplete}
                    />
                  )}
                </FriendPill>
              ))}
          </div>
        )}
      </div>

      {/* Private Clans */}
      <div style={{ marginBottom: 30 }}>
        <Typography.Subtitle style={{ color: theme.secondaryText }}>
          Private Clans
        </Typography.Subtitle>
        <Divider color={theme.text} style={{ marginBottom: 15 }} />
        {"message" in clanList ? (
          <EmptyState message={clanList.message} themeId={theme._id} />
        ) : clanList.filter((c) => !c.isPublic).length === 0 ? (
          <EmptyState message="No private clans yet" themeId={theme._id} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {clanList
              .filter((c) => !c.isPublic)
              .map((clan) => (
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
                      hasExistingRequest={pendingRequestClanIds.has(clan.clanId)}
                      compact
                      onActionComplete={handleActionComplete}
                    />
                  )}
                </FriendPill>
              ))}
          </div>
        )}
      </div>

      {/* Clan Leaderboard Dialog */}
      {showClanRankings && (
        <div className="manage-dialog-overlay" onClick={() => setShowClanRankings(false)}>
          <div
            className="manage-dialog"
            style={{
              backgroundColor: theme.primary,
              color: theme.text,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="manage-dialog-close" onClick={() => setShowClanRankings(false)}>
              &times;
            </button>
            <Typography.PageTitle style={{ marginBottom: 20, fontSize: "1.5rem" }}>
              Clan Leaderboard
            </Typography.PageTitle>
            {"message" in clanRankings ? (
              <EmptyState message={clanRankings.message} themeId={theme._id} />
            ) : clanRankings.length === 0 ? (
              <EmptyState message="No clans yet" themeId={theme._id} />
            ) : (
              <Leaderboard
                leaderboard={clanRankings.map((entry) => ({
                  username: entry.clanId,
                  display: entry.name,
                  pointsTotal: entry.totalPoints,
                  gamesPlayedTotal: entry.totalGamesPlayed,
                  achievementCount: entry.totalWins,
                }))}
                theme={theme}
                clickable={false}
                type="clan"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

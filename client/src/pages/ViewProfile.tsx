import type { GameInfo, SafeUserInfo } from "@gamenite/shared";
import React, { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import type { UserProfileRecord } from "../util/types";
import { getProfileByUsername, getUploadedImage } from "../services/profileService";
import { ThemeContext } from "../contexts/ThemeContext";
import { AVATARS } from "../util/consts";
import { getGameById } from "../services/gameService";
import { getUserPoints } from "../services/pointsService.ts";
import { getUserAchievements } from "../services/achievementService.ts";

interface ViewProfileProps {
  username: string;
}
export default function ViewProfile({ username }: ViewProfileProps) {
  const timeSince = useTimeSince();
  const [activeGame, setActiveGame] = useState<GameInfo | null>(null);
  const [componentState, setComponentState] = useState<
    | { type: "waiting" }
    | { type: "error"; msg: string }
    | {
        type: "profile";
        user: SafeUserInfo;
        profile: UserProfileRecord;
        uploadedImage: string | null;
        pointsTotal: number;
        achievements: {
          achievementId: string;
          title: string;
          description: string;
          achievedAt: string;
        }[];
      }
  >({ type: "waiting" });

  useEffect(() => {
    let cancel = false;

    async function loadProfile() {
      try {
        const userResponse = await getUserById(username);
        if ("error" in userResponse) {
          if (!cancel) {
            setComponentState({ type: "error", msg: userResponse.error });
          }
          return;
        }

        const profileResponse = await getProfileByUsername(username);
        if ("error" in profileResponse) return;

        const pointsResponse = await getUserPoints(username);
        const achievementsResponse = await getUserAchievements(username);

        if (profileResponse.onlinePresence?.activeGameId) {
          const gameResponse = await getGameById(profileResponse.onlinePresence.activeGameId);
          if (!("error" in gameResponse)) {
            setActiveGame(gameResponse);
          } else {
            setActiveGame(null);
          }
        } else {
          setActiveGame(null);
        }

        let uploadedImage: string | null = null;

        if (profileResponse.pfp?.type === "upload" && profileResponse.pfp.uploadId) {
          const imageRes = await getUploadedImage(profileResponse.pfp.uploadId);
          if (!("error" in imageRes)) {
            uploadedImage = imageRes.data;
          }
        }

        if (!cancel) {
          setComponentState({
            type: "profile",
            user: userResponse,
            profile: profileResponse,
            uploadedImage,
            pointsTotal: pointsResponse,
            achievements: achievementsResponse,
          });
        }
      } catch (err) {
        if (!cancel) {
          setComponentState({ type: "error", msg: `${err}` });
        }
      }
    }

    loadProfile();

    return () => {
      cancel = true;
    };
  }, [username]);

  const { theme } = React.useContext(ThemeContext);
  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;

    case "waiting":
      return <div>Loading...</div>;

    case "profile": {
      const { user, profile, uploadedImage, pointsTotal, achievements } = componentState;
      const status = profile.onlinePresence?.status || "offline";
      const statusLabel = status.toUpperCase();
      const statusColor = status === "active" ? "#22c55e" : "#ef4444";

      return (
        <div
          className="content profile-container"
          style={{ backgroundColor: theme.primary, color: theme.text }}
        >
          <div
            className="profile-card"
            style={{
              border: `8px solid ${profile.profileBorderColor}`,
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.04)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div
              className="profile-header"
              style={{
                borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
                paddingBottom: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h2>Profile</h2>
                <p>Username: {user.username}</p>
                <p>Account created {timeSince(user.createdAt)}</p>
              </div>
              <div className="profile-points">
  <h2>Points Total</h2>
  <div
    className="pointsValue"
    style={{
      color: profile.profileBorderColor,
    }}
  >
    {pointsTotal}
  </div>
</div>
              <div style={{ textAlign: "center", minWidth: "260px", marginRight: "23rem" }}>
                <h3 style={{ marginBottom: "0.5rem" }}>Online Status</h3>

                {profile.onlinePresence?.activeGameId ? (
                  <div>
                    <p
                      style={{
                        color: "#22c55e",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        margin: 0,
                      }}
                    >
                      CURRENTLY PLAYING
                    </p>
                    <p
                      style={{
                        color: "#c5c022",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      {activeGame?.type || "Loading game..."}
                    </p>
                    {activeGame?.createdAt && (
                      <p
                        style={{
                          opacity: 0.8,
                          fontSize: "0.9rem",
                          color: "#c5c022",
                          marginTop: "0.35rem",
                        }}
                      >
                        Started {timeSince(activeGame.createdAt)} by {activeGame.createdBy.display}
                      </p>
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      color: statusColor,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      margin: 0,
                    }}
                  >
                    {statusLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="profile-main">
              <div className="profile-column">
                <div className="profile-section">
                  <h3>Display name</h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: "0.5rem",
                    }}
                  >
                    <p>{user.display}</p>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Bio</h3>
                  <p>{profile.bio || "No bio yet."}</p>
                </div>
                <div className="profile-section">
                  <h3>Title</h3>
                  {profile.titleId ? (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: "0.5rem",
                        padding: "0.6rem 1.5rem",
                        borderRadius: "999px",
                        border: `2px solid ${profile.profileBorderColor}`,
                        background: "rgba(30, 148, 152, 0.84)",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                      }}
                    >
                      {profile.titleId}
                    </div>
                  ) : (
                    <p>No title selected.</p>
                  )}
                </div>
                <div className="spacedSection">
                  <h3>Achievements</h3>
                  {achievements.length === 0 ? (
                    <div>No achievements yet.</div>
                  ) : (
                    <div className="list">
                      {achievements.map((achievement) => (
                        <div key={achievement.achievementId} className="achievement-card">
                          <div className="achievement-title">{achievement.title}</div>
                          <div className="achievement-description">{achievement.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="profile-column">
                <div
                  className="profile-section"
                  style={{ textAlign: "center", fontSize: "1.15rem" }}
                >
                  <h3>Profile Picture</h3>

                  <div
                    style={{
                      marginBottom: "0.75rem",
                      marginTop: "1.25rem",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={
                        profile.pfp.type === "upload" && uploadedImage
                          ? uploadedImage
                          : AVATARS.find((avatar) => avatar.avatarId === profile.pfp.avatarId)
                              ?.imageUrl
                      }
                      alt="Profile picture"
                      style={{
                        width: "360px",
                        height: "360px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        alignItems: "center",
                        border: `5px solid ${profile.profileBorderColor}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
}

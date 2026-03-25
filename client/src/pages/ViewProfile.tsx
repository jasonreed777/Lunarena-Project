import type { GameInfo, SafeUserInfo } from "@gamenite/shared";
import React, { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import type { UserProfileRecord } from "../util/types";
import { getProfileByUsername, getUploadedImage } from "../services/profileService";
import { ThemeContext } from "../contexts/ThemeContext";
import { AVATARS } from "../util/consts";
import { getGameById } from "../services/gameService";

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
      const { user, profile, uploadedImage } = componentState;

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
            <div className="profile-header">
              <div>
                <h2>Profile</h2>
                <p>Username: {user.username}</p>
                <p>Account created {timeSince(user.createdAt)}</p>
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
                  <h3>Status</h3>
                  {profile.onlinePresence?.activeGameId ? (
                    <>
                      <p>Currently playing: {activeGame?.type || "Loading game..."}</p>
                      {activeGame?.createdAt && (
                        <p>
                          Game created {timeSince(activeGame.createdAt)} by{" "}
                          {activeGame.createdBy.display}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{profile.onlinePresence?.status || "offline"}</p>
                  )}
                </div>

                <div className="profile-section">
                  <h3>Title</h3>
                  <p>{profile.titleId || "No title selected."}</p>
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

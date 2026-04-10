import React, { useState, useEffect } from "react";
import useLoginContext from "../hooks/useLoginContext";
import useTimeSince from "../hooks/useTimeSince";
import useEditProfileForm from "../hooks/useEditProfileForm";
import { AVATARS } from "../util/consts.ts";
import "./ProfilePage.css";
import { ThemeContext } from "../contexts/ThemeContext";
import { getUserAchievements } from "../services/achievementService.ts";
import { getUserPoints, getUserStreak } from "../services/pointsService.ts";
import { ActivityGraph } from "../components/ActivityGraph.tsx";
import type { UserProfileWithStats } from "@gamenite/shared";
import { getProfileByUsername } from "../services/profileService.ts";
import { formatTimePlayed } from "../util/utils.ts";

// Infer achievement item type from getUserAchievements return type
type AchievementItem = Awaited<ReturnType<typeof getUserAchievements>>[number];

export default function UpdateProfile() {
  const { user } = useLoginContext();
  const timeSince = useTimeSince();
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [profileStats, setProfileStats] = useState<UserProfileWithStats | null>(null);
  const [showPass, setShowPass] = useState(false);
  const {
    display,
    setDisplay,
    bio,
    setBio,
    titleId,
    setTitleId,
    profileBorderColor,
    setProfileBorderColor,
    avatarId,
    setAvatarId,
    password,
    setPassword,
    confirm,
    setConfirm,
    pfpType,
    setPfpType,
    uploadedImage,
    setUploadedImage,
    setUploadedImageType,
    err,
    handleSubmit,
    successfulSubmit,
  } = useEditProfileForm();

  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    let cancel = false;

    async function loadProfileExtras() {
      const [profileResult, pointsResult, achievementsResult, streakResult] =
        await Promise.allSettled([
          getProfileByUsername(user.username),
          getUserPoints(user.username),
          getUserAchievements(user.username),
          getUserStreak(user.username),
        ]);

      if (cancel) return;

      if (pointsResult.status === "fulfilled") {
        setPointsTotal(pointsResult.value);
      } else {
        setPointsTotal(0);
      }

      if (achievementsResult.status === "fulfilled") {
        setAchievements(achievementsResult.value);
      } else {
        setAchievements([]);
      }

      if (streakResult.status === "fulfilled") {
        setStreak(streakResult.value);
      } else {
        setStreak(0);
      }
      if (profileResult.status === "fulfilled" && !("error" in profileResult.value)) {
        setProfileStats(profileResult.value);
      } else {
        setProfileStats(null);
      }
    }

    void loadProfileExtras();

    return () => {
      cancel = true;
    };
  }, [user.username]);

  return (
    <form
      className="content profile-container"
      onSubmit={handleSubmit}
      style={{ backgroundColor: theme.primary, color: theme.text }}
    >
      <div
        className="profile-card"
        style={{
          border: `8px solid ${profileBorderColor}`,
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
          <div className="profile-streak">
            <h2>Login Streak</h2>
            <div
              className="pointsValue"
              style={{
                color: profileBorderColor,
              }}
            >
              {streak}
            </div>
          </div>
          <div className="profile-points">
            <h2>Points Total</h2>
            <div
              className="pointsValue"
              style={{
                color: profileBorderColor,
              }}
            >
              {pointsTotal}
            </div>
          </div>
          <div className="profile-time-played">
            <h2>Time Played</h2>
            <div
              className="pointsValue"
              style={{
                color: profileBorderColor,
              }}
            >
              {formatTimePlayed(profileStats?.totalTimePlayedMS ?? 0)}
            </div>
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
                <input
                  className="widefill"
                  value={display}
                  onChange={(e) => setDisplay(e.target.value)}
                  style={{
                    color: theme.text,
                    borderColor: theme.text,
                  }}
                />
                <button
                  className="secondary narrow"
                  onClick={(e) => {
                    e.preventDefault(); // Don't submit form
                    setDisplay(user.display);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="profile-section">
              <h3>Bio</h3>
              <textarea
                className="widefill"
                placeholder="Tell people a bit about yourself!"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={450}
                rows={6}
                style={{
                  width: "100%",
                  minHeight: "140px",
                  resize: "vertical",
                  color: theme.text,
                  borderColor: theme.text,
                }}
              />
            </div>
            <div className="profile-section">
              <h3>Title</h3>
              <select
                className="widefill notTooWide"
                value={titleId}
                onChange={(e) => setTitleId(e.target.value)}
                style={{
                  color: theme.text,
                  borderColor: theme.text,
                }}
              >
                <option value="">Select a title</option>
                <option value="Nim Master">Nim Master</option>
                <option value="Number Guesser Master">Number Guesser Master</option>
                <option value="Knowledge Titan">Knowledge Titan</option>
                <option value="Game Master">Game Master</option>
                <option value="Puzzle Prophet">Puzzle Prophet</option>
                <option value="Strategy Sage">Strategy Sage</option>
                <option value="Lucky Legend">Lucky Legend</option>
                <option value="The Chosen One">The Chosen One</option>
                <option value="Chief">Chief</option>
              </select>

              {titleId && (
                <div
                  style={{
                    marginLeft: "3rem",
                    display: "inline-block",
                    padding: "0.6rem 1.5rem",
                    borderRadius: "999px",
                    width: "fit-content",
                    border: `2px solid ${profileBorderColor}`,
                    background: "rgba(30, 148, 152, 0.84)",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {titleId}
                </div>
              )}
            </div>
            <div className="profile-section">
              <h3>Profile Border Color</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "0.6rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="color"
                  value={profileBorderColor}
                  onChange={(e) => setProfileBorderColor(e.target.value)}
                />
                <span>{profileBorderColor}</span>
              </div>
            </div>
            <div className="profile-section">
              <h3>Reset password</h3>
              <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                <input
                  type={showPass ? "input" : "password"}
                  className="widefill notTooWide"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    color: theme.text,
                    borderColor: theme.text,
                  }}
                />
                <button
                  className="secondary narrow"
                  onClick={(e) => {
                    e.preventDefault(); // Don't submit form
                    setPassword("");
                    setConfirm("");
                  }}
                >
                  Reset
                </button>
                <button
                  className="secondary narrow"
                  aria-label="Toggle show password"
                  onClick={(e) => {
                    e.preventDefault(); // Don't submit form
                    setShowPass((v) => !v);
                  }}
                >
                  {showPass ? "Hide" : "Reveal"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                <input
                  type={showPass ? "input" : "password"}
                  className="widefill notTooWide"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{
                    color: theme.text,
                    borderColor: theme.text,
                  }}
                />
              </div>
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
            <div className="profile-section">
              <h3>Avatar</h3>

              <div style={{ marginBottom: "0.75rem" }}>
                <img
                  src={
                    pfpType === "upload" && uploadedImage
                      ? uploadedImage
                      : AVATARS.find((avatar) => avatar.avatarId === avatarId)?.imageUrl
                  }
                  alt="Current profile picture"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    border: `5px solid ${profileBorderColor}`,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <button
                  type="button"
                  className={pfpType === "avatar" ? "primary narrow" : "secondary narrow"}
                  onClick={() => setPfpType("avatar")}
                >
                  Choose Avatar
                </button>
                <button
                  type="button"
                  className={pfpType === "upload" ? "primary narrow" : "secondary narrow"}
                  onClick={() => setPfpType("upload")}
                >
                  Upload Image
                </button>
              </div>

              {pfpType === "avatar" && (
                <div className="profile-avatar-grid">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.avatarId}
                      type="button"
                      className="secondary"
                      onClick={() => setAvatarId(avatar.avatarId)}
                      style={{
                        border:
                          avatarId === avatar.avatarId
                            ? `3px solid ${profileBorderColor}`
                            : "1px solid #0c0b0b",
                        borderRadius: "12px",
                        padding: "0.5rem",
                      }}
                    >
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.label}
                        style={{ width: "64px", height: "64px", display: "block" }}
                      />
                      <div>{avatar.label}</div>
                    </button>
                  ))}
                </div>
              )}

              {pfpType === "upload" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    width: "300px",
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadedImageType(file.type as "image/png" | "image/jpeg" | "image/webp");

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === "string") {
                          setUploadedImage(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />

                  {uploadedImage && (
                    <img
                      src={uploadedImage}
                      alt="Uploaded profile preview"
                      style={{
                        width: "96px",
                        height: "96px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: `3px solid ${profileBorderColor}`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
            {err && <p className="error-message">{err}</p>}
            {successfulSubmit && <p className="smallAndGray">{successfulSubmit}</p>}
            <div>
              <button className="primary narrow">Submit</button>
            </div>
            <div className="smallAndGray">
              After updating your display name or password, you will be logged out
            </div>
            <ActivityGraph theme={theme} color={profileBorderColor} username={user.username} />
            <div style={{ marginTop: "2rem" }}>
              <h3>Overall Stats Across Games</h3>
              <div className="profile-section">
                <div className="list">
                  <div className="achievement-card">
                    <div className="achievement-description">
                      <div>Wins: {profileStats?.stats.overall.wins ?? 0}</div>
                      <div>Games Played: {profileStats?.stats.overall.gamesPlayed ?? 0}</div>
                      <div>Losses: {profileStats?.stats.overall.losses ?? 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="profile-section">
                <h3>Per-Game Stats</h3>
                {!profileStats || Object.keys(profileStats.stats.byGame).length === 0 ? (
                  <p>No game stats yet.</p>
                ) : (
                  <div className="list">
                    {Object.entries(profileStats.stats.byGame).map(([gameType, stats]) => (
                      <div key={gameType} className="achievement-card">
                        <div className="achievement-title">
                          {gameType === "guess"
                            ? "Number Guesser"
                            : gameType === "circleconnect"
                              ? "Circle Connect"
                              : gameType.charAt(0).toUpperCase() + gameType.slice(1)}
                        </div>
                        <div className="achievement-description">
                          <div>Wins: {stats.wins}</div>
                          <div>Games Played: {stats.gamesPlayed}</div>
                          <div>Losses: {stats.losses}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

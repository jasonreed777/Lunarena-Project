import React, { useState, useEffect } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { THEME_KEY, ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import styled from "@emotion/styled";
import { Colors, type ColorTheme } from "../util/types.ts";
import { DefaultIcon } from "./StyledSVG.tsx";
import {
  getProfileByUsername,
  getUploadedImage,
  updateProfile,
} from "../services/profileService.ts";
import { AVATARS } from "../util/consts.ts";
import { Avatar } from "./Avatar.tsx";
import { getUserPoints, getUserStreak } from "../services/pointsService.ts";
import { getUserAchievements } from "../services/achievementService.ts";

/**
 * Container which houses all elements.
 */
const Container = styled.div<{ theme: ColorTheme }>`
  display: grid;
  align-items: center;
  height: 3rem;
  gap: 15px;
  padding-inline: 1rem;
  grid-template-columns: 1fr 1fr repeat(5, max-content);
  width: 100%;
  grid-area: header;
  background-color: ${({ theme }) => theme.navBar};
  color: ${({ theme }) => theme.text};
`;

/**
 * Theme Toggle
 */
const ThemeToggle = styled.img<{ hover?: boolean }>`
  width: auto;
  height: 24px;
  transition: all 0.2s;
  cursor: ${({ hover }) => (hover ? "pointer" : "default")};
  :hover {
    transform: ${({ hover }) => (hover ? "scale(110%)" : undefined)};
  }
`;

/**
 * Container for the statistics in the header.
 */
const HeaderStatsContainer = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const HeaderStat = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

/**
 * Header component that renders the main title.
 */
export default function Header() {
  const { user, reset } = useLoginContext();
  const navigate = useNavigate();

  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [profileBorderColor, setProfileBorderColor] = useState("#888888");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    points: number;
    streak: number;
    achievementCount: number;
  }>();

  /**
   * Retrives user statistics
   */
  const getProfileStatistics = React.useCallback(async () => {
    const points = await getUserPoints(user.username);
    const streak = await getUserStreak(user.username);
    const achievementCount = (await getUserAchievements(user.username)).length;

    setStats({ points, streak, achievementCount });
  }, [user.username]);

  // Listen for profile updates to update the avatar and profile border color in the header
  // Important to have it remember upon logging in too
  useEffect(() => {
    const loadProfile = async () => {
      const response = await getProfileByUsername(user.username);
      if ("error" in response) return;

      setProfileBorderColor(response.profileBorderColor ?? "#888888");

      // Get profile statistics
      await getProfileStatistics();

      // If they have an avatar set, use that
      if (response.pfp?.type === "avatar" && response.pfp.avatarId) {
        setAvatarId(response.pfp.avatarId);
        setUploadedImage(null);
        return;
      }
      // If they have an uploaded image, use that
      if (response.pfp?.type === "upload" && response.pfp.uploadId) {
        const imageResponse = await getUploadedImage(response.pfp.uploadId);
        if (!("error" in imageResponse)) {
          setUploadedImage(imageResponse.data);
          setAvatarId(null);
        }
        return;
      }

      // If no profile picture exists
      setAvatarId(null);
      setUploadedImage(null);
    };
    // Load profile on component mount to display avatar and profile border color immediately
    loadProfile();

    window.addEventListener("profile-updated", loadProfile);

    return () => {
      window.removeEventListener("profile-updated", loadProfile);
    };
  }, [getProfileStatistics, user.username]);

  const { theme, setTheme } = React.useContext(ThemeContext);

  /**
   * Handles toggling the color theme.
   */
  const handleThemeToggle = React.useCallback(() => {
    const newTheme = theme._id === "dark" ? "light" : "dark";
    setTheme(Colors[newTheme]);
    window.localStorage.setItem(THEME_KEY, newTheme);
  }, [setTheme, theme._id]);

  return (
    <Container id="header" theme={theme}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <DefaultIcon src="/assets/logos/logo_grayscale.svg" />
        <Typography.SmallTitle className="title">GameNite!</Typography.SmallTitle>
      </div>
      {stats && (
        <HeaderStatsContainer>
          {stats.points !== undefined && (
            <HeaderStat>
              <DefaultIcon src="/assets/icons/points.svg" hover={false} />
              <Typography.HeaderStats style={{ color: theme.text }}>
                {`${stats.points === 1 ? `1 Point` : `${stats.points} Points`}`}
              </Typography.HeaderStats>
            </HeaderStat>
          )}
          {stats.streak !== undefined && (
            <>
              <Typography.Subtitle>•</Typography.Subtitle>
              <HeaderStat>
                <DefaultIcon src="/assets/icons/streak.svg" hover={false} />
                <Typography.HeaderStats style={{ color: theme.text }}>
                  {stats.streak} Day Streak
                </Typography.HeaderStats>
              </HeaderStat>
            </>
          )}
          {stats.achievementCount !== undefined && stats.achievementCount !== 0 && (
            <>
              <Typography.Subtitle>•</Typography.Subtitle>
              <HeaderStat>
                <DefaultIcon src="/assets/icons/achievements.svg" hover={false} />
                <Typography.HeaderStats style={{ color: theme.text }}>
                  {`${stats.achievementCount === 1 ? `1 Achievement` : `${stats.achievementCount} Achievements`}`}
                </Typography.HeaderStats>
              </HeaderStat>
            </>
          )}
        </HeaderStatsContainer>
      )}
      <Typography.Code>Welcome, {user.display}!</Typography.Code>
      <ThemeToggle
        id="theme-toggle"
        src={theme._id === "light" ? "/assets/icons/moon.svg" : "/assets/icons/sun.svg"}
        onClick={() => handleThemeToggle()}
        hover
      />
      <div style={{ position: "relative" }}>
        <DefaultIcon
          src="/assets/icons/settings.svg"
          hover={false}
          className="settings-icon"
          onClick={() => setShowDropdown(!showDropdown)}
        />
        <div
          style={{
            display: showDropdown ? "block" : "none",
            backgroundColor: theme.navBar,
            borderTop: "none",
          }}
          className="menu-container"
        >
          <div
            onClick={async () => {
              await updateProfile(user.username, {
                onlinePresence: {
                  status: "offline",
                  lastActive: new Date().toISOString(),
                },
              });
              reset();
              navigate("/login");
            }}
          >
            <Typography.Code>Log Out</Typography.Code>
          </div>
        </div>
      </div>
      {(uploadedImage || avatarId) && (
        <Avatar
          src={uploadedImage ?? AVATARS.find((a) => a.avatarId === avatarId)?.imageUrl}
          onClick={() => navigate(`/profile/${user.username}`)}
          border={{ color: profileBorderColor }}
          size="small"
          hover
        />
      )}
    </Container>
  );
}

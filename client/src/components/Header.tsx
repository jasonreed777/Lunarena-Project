import React, { useState, useEffect } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { THEME_KEY, ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import styled from "@emotion/styled";
import { Colors, type ColorTheme } from "../util/types.ts";
import { TransluscentButton as Button } from "./Buttons.tsx";
import { DefaultIcon } from "./StyledSVG.tsx";
import {
  getProfileByUsername,
  getUploadedImage,
  updateProfile,
} from "../services/profileService.ts";
import { AVATARS } from "../util/consts.ts";

/**
 * Container which houses all elements.
 */
const Container = styled.div<{ theme: ColorTheme }>`
  display: grid;
  align-items: center;
  height: 3rem;
  gap: 15px;
  padding-inline: 1rem;
  grid-template-columns: 1fr repeat(5, max-content);
  width: 100%;
  grid-area: header;
  background-color: ${({ theme }) => theme.navBar};
  color: ${({ theme }) => theme.text};
`;
const StyledImg = styled.img<{ hover?: boolean }>`
  width: auto;
  height: 24px;
  transition: all 0.2s;
  cursor: ${({ hover }) => (hover ? "pointer" : "default")};
  :hover {
    transform: ${({ hover }) => (hover ? "scale(110%)" : undefined)};
  }
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
  // Listen for profile updates to update the avatar and profile border color in the header
  // Important to have it remember upon logging in too
  useEffect(() => {
    const loadProfile = async () => {
      const response = await getProfileByUsername(user.username);
      if ("error" in response) return;

      setProfileBorderColor(response.profileBorderColor ?? "#888888");
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
  }, [user.username]);

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
        <DefaultIcon src="src/assets/logos/logo_grayscale.svg" />
        <Typography.SmallTitle className="title">GameNite!</Typography.SmallTitle>
      </div>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "35%",
          border: `3px solid ${profileBorderColor}`,
          overflow: "hidden",
          marginTop: "3px",
        }}
      >
        {uploadedImage ? (
          <img src={uploadedImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : avatarId ? (
          <img
            src={AVATARS.find((a) => a.avatarId === avatarId)?.imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
      <Typography.Code>Welcome, {user.display}!</Typography.Code>
      <StyledImg
        id="theme-toggle"
        src={theme._id === "light" ? "src/assets/icons/moon.svg" : "src/assets/icons/sun.svg"}
        onClick={() => handleThemeToggle()}
        hover
      />
      <Button
        color={theme.navButton}
        text={theme.text}
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
        Log Out
      </Button>
      <Button
        color={theme.navButton}
        text={theme.text}
        onClick={() => navigate(`/profile/${user.username}`)}
      >
        View Profile
      </Button>
    </Container>
  );
}

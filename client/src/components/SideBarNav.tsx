import "./SideBarNav.css";
import React, { useState, useEffect } from "react";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import styled from "@emotion/styled";
import type { ColorTheme } from "../util/types.ts";
import * as Typography from "../libs/Typography.tsx";
import { getProfileByUsername, getUploadedImage } from "../services/profileService.ts";
import { AVATARS } from "../util/consts.ts";

const Container = styled.div<{ theme: ColorTheme }>`
  background-color: ${({ theme }) => theme.navBar};
  color: ${({ theme }) => theme.text};
  padding-inline: 1rem;
  display: flex;
  flex-direction: column;
  width: 150px;
  gap: 1rem;
  padding-block: 1rem;
  grid-area: sidebar;
`;

/**
 * The SideBarNav component contains the primary naviagation menu. It
 * highlights the currently selected page and triggers navigation when the
 * menu items are clicked.
 */
export default function SideBarNav() {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const { user } = useLoginContext();
  const { username } = user;
  const { theme } = React.useContext(ThemeContext);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [profileBorderColor, setProfileBorderColor] = useState("#888888");

  // Listen for profile updates to update the avatar and profile border color in the sidebar
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

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const navClass = ({ isActive }: NavLinkRenderProps) =>
    `menu_button ${isActive ? "menu_selected" : ""}`;

  return (
    <Container className="side-bar-nav" theme={theme}>
      <NavLink to="/" className={navClass}>
        <Typography.NavBar>Home</Typography.NavBar>
      </NavLink>
      <NavLink to="/games" className={navClass}>
        <Typography.NavBar>Games</Typography.NavBar>
      </NavLink>
      <NavLink to="/clan" className={navClass}>
        <Typography.NavBar>Clan</Typography.NavBar>
      </NavLink>
      <NavLink to="/forum" className={navClass}>
        <Typography.NavBar>Forum</Typography.NavBar>
      </NavLink>
      <NavLink to="/messages" className={navClass}>
        <Typography.NavBar>Messages</Typography.NavBar>
      </NavLink>
      <NavLink to="/friends" className={navClass}>
        <Typography.NavBar>Friends</Typography.NavBar>
      </NavLink>
      <NavLink
        to={`/profile/${username}`}
        id="menu_user"
        className={navClass}
        onClick={toggleOptions}
      >
        <Typography.NavBar>Profile</Typography.NavBar>
      </NavLink>
      <div
        style={{
          width: "110px",
          height: "110px",
          borderRadius: "20%",
          border: `3px solid ${profileBorderColor}`,
          overflow: "hidden",
          margin: "2rem 0",
          marginLeft: "6px",
        }}
      >
        {uploadedImage ? (
          <img
            src={uploadedImage}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : avatarId ? (
          <img
            src={AVATARS.find((a) => a.avatarId === avatarId)?.imageUrl}
            alt="Profile"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>
    </Container>
  );
}

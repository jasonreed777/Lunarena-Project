import "./SideBarNav.css";
import React, { useState } from "react";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import styled from "@emotion/styled";
import type { ColorTheme } from "../util/types.ts";
import * as Typography from "../libs/Typography.tsx";

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
        <Typography.NavBar> Forum</Typography.NavBar>
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
    </Container>
  );
}

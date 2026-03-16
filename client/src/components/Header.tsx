import React from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import { THEME_KEY, ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import styled from "@emotion/styled";
import { Colors, type ColorTheme } from "../util/types.ts";
import { TransluscentButton as Button } from "./Buttons.tsx";
import { DefaultIcon } from "./StyledSVG.tsx";

/**
 * Container which houses all elements.
 */
const Container = styled.div<{ theme: ColorTheme }>`
  display: grid;
  align-items: center;
  height: 3rem;
  gap: 15px;
  padding-inline: 1rem;
  grid-template-columns: 1fr repeat(4, max-content);
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
        onClick={() => {
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

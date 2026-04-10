import styled from "@emotion/styled";
import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import React from "react";
import * as Typography from "../libs/Typography.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { PathColorMap, type ColorTheme } from "../util/types.ts";
import { capitalize, hexToRGB } from "../util/utils.ts";

const StyledForm = styled.form`
  min-height: var(--content-vh);
  background-image: url(../assets/gradients/games_gradient.png);
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;

  padding: 20px;
  padding-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Dropdown = styled.select<{ theme: ColorTheme; color: string }>`
  width: fit-content;
  background-color: rgba(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`},
    0.2
  );
  color: ${({ theme }) => theme.text};
  padding: 5px;
  border: 3px solid ${({ color }) => color ?? "#e05a35"};
  border-radius: 8px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;

  option {
    color: ${({ theme }) => theme.text};
    background-color: ${({ theme }) => theme.primary};
  }
`;

const TutorialLabel = styled.label<{ theme: ColorTheme }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.text};
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 18px;
`;

export default function NewGame() {
  const {
    gameKey,
    isTutorial,
    tutorialAvailable,
    handleInputChange,
    handleTutorialChange,
    err,
    handleSubmit,
  } = useNewGameForm();
  const { theme } = React.useContext(ThemeContext);

  return (
    <StyledForm
      onSubmit={handleSubmit}
      style={{ backgroundColor: theme.primary, color: theme.text }}
    >
      <Typography.PageTitle>Create New Game</Typography.PageTitle>

      <Dropdown
        value={gameKey}
        aria-label="Game selection"
        onChange={(e) => handleInputChange(e)}
        theme={theme}
        color={PathColorMap["/games"]}
        style={{
          color: theme.text,
        }}
      >
        <option value="">— Select a Game —</option>
        {Object.entries(gameNames).map(([key, name]) => (
          <option key={key} value={key}>
            {capitalize(name)}
          </option>
        ))}
      </Dropdown>

      {tutorialAvailable && (
        <TutorialLabel theme={theme}>
          <input
            type="checkbox"
            checked={isTutorial}
            onChange={handleTutorialChange}
            style={{ accentColor: theme.text }}
          />
          <span>Play Tutorial vs. Bot?</span>
        </TutorialLabel>
      )}

      {err && <p className="error-message">{err}</p>}

      <Button
        color={PathColorMap["/games"]}
        style={{ width: "fit-content", color: theme.text }}
        type="submit"
      >
        Create New Game
      </Button>
    </StyledForm>
  );
}

import styled from "@emotion/styled";
import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import React from "react";
import * as Typography from "../libs/Typography.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { PathColorMap, type ColorTheme } from "../util/types.ts";
import { capitalize } from "../util/utils.ts";

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
  background-color: transparent;
  color: ${({ theme }) => theme.text};
  padding: 5px;
  border: 3px solid ${({ color }) => color ?? "#e05a35"};
  border-radius: 8px;
`;

export default function NewGame() {
  const { gameKey, handleInputChange, err, handleSubmit } = useNewGameForm();
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
      >
        <option value="">
          <Typography.Code>— Select a Game —</Typography.Code>
        </option>
        {Object.entries(gameNames).map(([key, name]) => (
          <option key={key} value={key}>
            <Typography.Code>{capitalize(name)}</Typography.Code>
          </option>
        ))}
      </Dropdown>
      {err && <p className="error-message">{err}</p>}
      <Button color={PathColorMap["/games"]} style={{ width: "fit-content" }}>
        Create New Game
      </Button>
    </StyledForm>
  );
}

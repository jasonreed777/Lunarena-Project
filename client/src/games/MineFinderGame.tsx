import type { MineFinderMove, MineFinderView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import { useState, useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { hexToRGB } from "../util/utils.ts";

const numberColorsDark: Record<number, string> = {
  1: "#43b9c6",
  2: "#4CAF50",
  3: "#e05a35",
  4: "#734189",
  5: "#e01313",
  6: "#43b9c6",
  7: "#734189",
  8: "#e05a35",
};

const numberColorsLight: Record<number, string> = {
  1: "#0e7a86",
  2: "#2e7d32",
  3: "#b33a1a",
  4: "#5a2d6a",
  5: "#b00e0e",
  6: "#0e7a86",
  7: "#5a2d6a",
  8: "#b33a1a",
};

/** Original cell base colors, used to derive translucent button-style styling */
const cellColors: Record<string, string> = {
  "?": "#D4A54A",
  "*": "#e01313",
  revealed: "#888888",
};

/**
 * Component for adding MineFinder Game.
 * @param props - {@link GameProps}: userPlayerIndex, view, makeMove and players needed
 * @returns TSX components to render the MineFinder Game
 */
export default function MineFinderGame(props: GameProps<MineFinderView, MineFinderMove>) {
  const { userPlayerIndex, view, makeMove, players } = props;
  const { theme } = useContext(ThemeContext);

  // For tracking flags the user will set on the board.
  const [flagBoard, setFlagBoard] = useState<boolean[][]>(
    Array.from({ length: view.height }).map(() =>
      Array.from({ length: view.width }).map(() => false),
    ),
  );

  //State to keep track of view initialization after getting difficulty

  const [viewInit, setViewInit] = useState<boolean>(false);

  /**
   * Toggle boolean for if the field should have a flag or not.
   * @param row on the field.
   * @param col on the field.
   */
  const toggleFlag = (row: number, col: number) => {
    const flagBoardCopy = [...flagBoard];
    flagBoardCopy[row][col] = !flagBoardCopy[row][col];
    setFlagBoard(flagBoardCopy);
  };

  /**
   * Get safe boolean for if the field should have a flag or not.
   * @param row on the field.
   * @param col on the field.
   *
   */
  const getFlag = (row: number, col: number): boolean => {
    if (!flagBoard[row]) {
      return false;
    }
    return flagBoard[row][col] ?? false;
  };

  /**
   * Lambda for viewing each individual cell in MineFinder
   */
  const viewEntry = (row: number, col: number, entry: "?" | number | "*") => {
    const isClickable = userPlayerIndex === 0 && view.state === "playing" && entry === "?";
    const pointerStyle = isClickable ? "pointer" : "default";

    const isLight = theme._id === "light";
    const baseColor =
      entry === "?" ? cellColors["?"] : entry === "*" ? cellColors["*"] : cellColors.revealed;
    const { r, g, b } = hexToRGB(baseColor);
    const opacity = isLight ? 0.35 : 0.2;
    const backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

    const boardChar =
      entry === "?"
        ? view.state === "won"
          ? "🎉"
          : getFlag(row, col)
            ? "⛳"
            : "❓"
        : entry === "*"
          ? "💥"
          : entry.valueOf() === 0
            ? ""
            : entry;

    const numberColors = isLight ? numberColorsLight : numberColorsDark;
    const textColor =
      typeof entry === "number" && entry > 0 ? (numberColors[entry] ?? theme.text) : theme.text;

    return (
      <div
        className="mine-cell"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          height: 42,
          width: 42,
          background: backgroundColor,
          border: `2px solid ${baseColor}`,
          borderBottomWidth: entry === "?" ? "4px" : "2px",
          borderRadius: 8,
          cursor: pointerStyle,
          color: textColor,
          fontFamily: "'filson-pro', sans-serif",
          fontWeight: 700,
          fontSize: typeof entry === "number" && entry > 0 ? "15px" : "16px",
          transition: "all 0.1s",
          marginTop: 0,
        }}
        onClick={() => {
          if (!flagBoard[row][col] && isClickable) {
            makeMove([row, col]);
          }
        }}
        onMouseDown={(e) => {
          if (isClickable && e.button === 0) {
            const el = e.currentTarget;
            el.style.borderBottomWidth = "2px";
            el.style.marginTop = "2px";
          }
        }}
        onMouseUp={(e) => {
          if (isClickable && e.button === 0) {
            const el = e.currentTarget;
            el.style.borderBottomWidth = "4px";
            el.style.marginTop = "0px";
          }
        }}
        onMouseLeave={(e) => {
          if (entry === "?") {
            const el = e.currentTarget;
            el.style.borderBottomWidth = "4px";
            el.style.marginTop = "0px";
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isClickable) {
            toggleFlag(row, col);
          }
        }}
      >
        {boardChar}
      </div>
    );
  };

  if (view.state === "waiting") {
    if (userPlayerIndex !== 0) {
      return (
        <div className="content" style={{ color: theme.text }}>
          <Typography.Paragraph style={{ color: theme.text }}>
            {players[0].display} is selecting difficulty
          </Typography.Paragraph>
        </div>
      );
    }
    return (
      <div className="content" style={{ color: theme.text }}>
        <form
          method="post"
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const difficulty = formData.get("difficulty");
            if (difficulty === "easy" || difficulty === "standard" || difficulty === "hard") {
              makeMove(difficulty);
              setFlagBoard(
                Array.from({ length: view.height }).map(() =>
                  Array.from({ length: view.width }).map(() => false),
                ),
              );
            }
          }}
        >
          <Typography.LargeParagraph style={{ color: theme.text }}>
            Pick your difficulty level:
          </Typography.LargeParagraph>
          <select
            name="difficulty"
            defaultValue="standard"
            style={{
              background: theme.navBar,
              color: theme.text,
              border: `1px solid ${theme.secondaryText}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: "16px",
              fontFamily: "'fira-sans', sans-serif",
            }}
          >
            <option value="easy">Easy</option>
            <option value="standard">Standard</option>
            <option value="hard">Hard</option>
          </select>
          <Button type="submit" color="#43b9c6" text="#43b9c6">
            Submit
          </Button>
        </form>
      </div>
    );
  }

  if (!viewInit && view.height > 0 && view.width > 0) {
    setFlagBoard(
      Array.from({ length: view.height }).map(() =>
        Array.from({ length: view.width }).map(() => false),
      ),
    );
    setViewInit(true);
  }

  return (
    <div
      className="content"
      style={{ color: theme.text, display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          padding: "5px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "4px",
        }}
      >
        {view.field.map((entries, row) => (
          <div key={row} style={{ display: "flex", gap: "4px" }}>
            {entries.map((entry, col) => (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                key={col}
              >
                {viewEntry(row, col, entry)}
              </span>
            ))}
          </div>
        ))}
      </div>
      <Divider color={theme.text} />
      <Typography.Paragraph style={{ color: theme.secondaryText, textAlign: "center" }}>
        {`Difficulty: ${view.difficulty}`}
      </Typography.Paragraph>
      {view.state === "playing" && userPlayerIndex === 0 && (
        <Button
          onClick={() => makeMove("forfeit")}
          color="#e01313"
          text="#e01313"
          fitContent
          style={{ alignSelf: "center" }}
        >
          Forfeit
        </Button>
      )}
      {view.state !== "playing" && (
        <Typography.Code style={{ color: theme.text, textAlign: "center" }}>
          {`${userPlayerIndex === 0 ? "You" : players[0].display} ${view.state}`}
        </Typography.Code>
      )}
    </div>
  );
}

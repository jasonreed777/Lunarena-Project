import { useContext, useState } from "react";
import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import * as Typography from "../libs/Typography.tsx";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { Divider } from "./Divider.tsx";
import { TranslucentButton as Button } from "./Buttons.tsx";

const gameInstructions: Record<string, { title: string; steps: string[] }> = {
  nim: {
    title: "How to Play Nim",
    steps: [
      "Players take turns removing 1, 2, or 3 tokens.",
      "You must remove at least 1 token on your turn.",
      "Whoever takes the last token loses.",
    ],
  },
  guess: {
    title: "How to Play Number Guesser",
    steps: [
      "Each player submits one guess.",
      "Once all players have guessed, the secret number is revealed.",
      "The player with the closest guess wins.",
    ],
  },
  circleconnect: {
    title: "How to Play CircleConnect",
    steps: [
      "Pick a difficulty level.",
      "Click and drag from a numbered circle to draw a path to its matching number.",
      "Paths can only go up, down, left, or right (no diagonals).",
      "Paths cannot cross or overlap with other paths.",
      "Click on an existing path or circle to clear it and redraw.",
      "Connect all pairs and fill every cell to solve the puzzle!",
    ],
  },
  minesweeper: {
    title: "How to Play Minesweeper",
    steps: [
      "Pick a difficulty level to generate the board.",
      "Left-click a cell to reveal it.",
      "Right-click a cell to place or remove a flag.",
      "Revealed cells show the number of adjacent mines.",
      "An empty cell (0 adjacent mines) automatically reveals its neighbors.",
      "On Easy mode you can survive one mine, but a second is game over.",
      "On Standard and Hard, hitting any mine means you lose!",
      "Reveal all non-mine cells to win.",
    ],
  },
};

/**
 * A game panel allows viewing the status and players of a live game
 */
export default function GamePanel({
  gameId,
  type,
  players: initialPlayers,
  createdAt,
  minPlayers,
}: GameInfo) {
  const { user } = useLoginContext();
  const { theme } = useContext(ThemeContext);
  const timeSince = useTimeSince();
  const [showInstructions, setShowInstructions] = useState(false);

  const { view, players, userPlayerIndex, hasWatched, joinGame, startGame } = useSocketsForGame(
    gameId,
    initialPlayers,
  );

  return hasWatched ? (
    <div className="game-panel" style={{ backgroundColor: "transparent", color: theme.text }}>
      <div className="game-roster">
        <div className="title-row">
          <div>
            <Typography.LargeStat>{gameNames[type]}</Typography.LargeStat>
            <Typography.SmallText style={{ color: theme.secondaryText }}>
              Game room created {timeSince(createdAt)}
            </Typography.SmallText>
          </div>
          <Button
            onClick={() => setShowInstructions((prev) => !prev)}
            color={theme.text}
            text={theme.text}
            fitContent
          >
            {showInstructions ? "Hide Instructions" : "How to Play"}
          </Button>
        </div>
        <Divider color={theme.text} />

        <div role="list">
          {players.map((player, index) => (
            <Typography.ProfileText
              role="listitem"
              key={player.username}
              style={{ color: theme.text }}
            >
              {player.username === user.username ? (
                `You are player #${index + 1}!`
              ) : (
                <Typography.ProfileText
                  style={{ display: "flex", gap: "4px", alignItems: "center", color: theme.text }}
                >
                  Player #{index + 1} is <UserLink user={player} />
                </Typography.ProfileText>
              )}
            </Typography.ProfileText>
          ))}
        </div>

        {userPlayerIndex < 0 && !view && (
          <Button onClick={joinGame} color="#43b9c6" text={theme.text}>
            Join Game
          </Button>
        )}

        {userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
          <Button onClick={startGame} color="#36d26f" text={theme.text}>
            Start Game
          </Button>
        )}

        {showInstructions && <Divider color={theme.text} />}

        {showInstructions && (
          <div className="instructionsModalOverlay" onClick={() => setShowInstructions(false)}>
            <div className="instructionsModal" onClick={(e) => e.stopPropagation()}>
              <Typography.LargeParagraph>{gameInstructions[type].title}</Typography.LargeParagraph>
              <ul style={{ paddingTop: 10 }}>
                {gameInstructions[type].steps.map((step) => (
                  <li key={step}>
                    <Typography.Paragraph>{step}</Typography.Paragraph>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {view ? (
        <div className="game-frame" style={{ borderColor: theme.text }}>
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <Typography.Paragraph className="game-frame" style={{ border: `3px solid ${theme.text}` }}>
          Waiting for game to begin...
        </Typography.Paragraph>
      )}
    </div>
  ) : (
    <div></div>
  );
}

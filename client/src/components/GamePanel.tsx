import { useState } from "react";
import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";

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
  const timeSince = useTimeSince();
  const [showInstructions, setShowInstructions] = useState(false);

  const { view, players, userPlayerIndex, hasWatched, joinGame, startGame } = useSocketsForGame(
    gameId,
    initialPlayers,
  );

  return hasWatched ? (
    <div className="gamePanel">
      <div className="gameRoster">
        <h2>{gameNames[type]}</h2>
        <div className="smallAndGray">Game room created {timeSince(createdAt)}</div>

        <button className="primary narrow" onClick={() => setShowInstructions((prev) => !prev)}>
          {showInstructions ? "Hide Instructions" : "How to Play"}
        </button>

        <div className="dottedList" role="list">
          {players.map((player, index) => (
            <div className="dottedListItem" role="listitem" key={player.username}>
              {player.username === user.username ? (
                `you are player #${index + 1}`
              ) : (
                <span>
                  Player #{index + 1} is <UserLink user={player} />
                </span>
              )}
            </div>
          ))}
        </div>

        {userPlayerIndex < 0 && !view && (
          <button className="primary narrow" onClick={joinGame}>
            Join Game
          </button>
        )}

        {userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
          <button className="primary narrow" onClick={startGame}>
            Start Game
          </button>
        )}

        {showInstructions && (
          <div className="instructionsModalOverlay" onClick={() => setShowInstructions(false)}>
            <div className="instructionsModal" onClick={(e) => e.stopPropagation()}>
              <h3>{gameInstructions[type].title}</h3>
              <ul>
                {gameInstructions[type].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {view ? (
        <div className="gameFrame">
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <div className="gameFrame waiting content">waiting for game to begin</div>
      )}
    </div>
  ) : (
    <div></div>
  );
}

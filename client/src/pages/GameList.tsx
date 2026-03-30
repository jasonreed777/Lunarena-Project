import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import { useContext, useEffect } from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import "./GameList.css";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { PageTitle } from "../libs/Typography.tsx";

export default function GameList() {
  const gameList = useGameList();
  const navigate = useNavigate();
  const user = useLoginContext().user;
  const { theme } = useContext(ThemeContext);

  // Update the user's online presence to active when they are on the games page
  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);

  return (
    <div
      className="game-list-container"
      style={{ backgroundColor: theme.primary, color: theme.text }}
    >
      <div className="spacedSection">
        <PageTitle>All Games</PageTitle>
        <div>
          <Button
            onClick={() => navigate("/game/new")}
            color="#e05a35"
            text={theme.text}
            style={{ width: "fit-content" }}
          >
            Create New Game
          </Button>
        </div>
        <>
          {"message" in gameList ? (
            gameList.message
          ) : (
            <div>
              {gameList.map((game, index) => (
                <GameSummaryView
                  gameInfo={{ ...game }}
                  key={game.gameId.toString()}
                  theme={theme}
                  index={index}
                />
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
}

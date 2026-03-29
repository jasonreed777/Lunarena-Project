import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import { useContext, useEffect } from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";

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
    <div className="content">
      <div className="spacedSection">
        <h2>All games</h2>
        <div>
          <button className="primary narrow" onClick={() => navigate("/game/new")}>
            Create New Game
          </button>
        </div>
        <>
          {"message" in gameList ? (
            gameList.message
          ) : (
            <div className="dottedList">
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

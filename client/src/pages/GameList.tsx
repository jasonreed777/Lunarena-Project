import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import { useContext, useEffect } from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { PageTitle } from "../libs/Typography.tsx";
import styled from "@emotion/styled";

const Container = styled.div`
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
    <Container style={{ backgroundColor: theme.primary, color: theme.text }}>
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
    </Container>
  );
}

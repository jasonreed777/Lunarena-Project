import { useNavigate } from "react-router-dom";
import GameSummaryView from "../components/GameSummaryView.tsx";
import useGameList from "../hooks/useGameList.ts";
import { useContext, useEffect } from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { PageTitle, Subtitle } from "../libs/Typography.tsx";
import styled from "@emotion/styled";
import { Leaderboard } from "../components/Leaderboard.tsx";
import useGamePopularity from "../hooks/useGamePopularity.ts";
import { Divider } from "../components/Divider.tsx";

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

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 40px;
`;

/**
 * Game List page. Includes all recently played games in addition to a leaderboard of popular games. Users
 * can also start a game.
 * @returns Game List Page
 */
export default function GameList() {
  const gameList = useGameList();
  const navigate = useNavigate();
  const user = useLoginContext().user;
  const { theme } = useContext(ThemeContext);
  const gamePopularityList = useGamePopularity();

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
      <Content>
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
        <div>
          <Subtitle>Most Popular Games</Subtitle>
          <Divider color={theme.text} style={{ marginBottom: "20px" }} />
          <Leaderboard leaderboard={gamePopularityList.slice(0, 3)} theme={theme} type="games" />
        </div>
        <>
          {"message" in gameList ? (
            gameList.message
          ) : (
            <div>
              <Subtitle>Recently Played Games</Subtitle>
              <Divider color={theme.text} style={{ marginBottom: "20px" }} />
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
      </Content>
    </Container>
  );
}

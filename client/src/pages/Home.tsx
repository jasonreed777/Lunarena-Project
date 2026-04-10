import useThreadList from "../hooks/useThreadList.ts";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import { useNavigate } from "react-router-dom";
import useGameList from "../hooks/useGameList.ts";
import GameSummaryView from "../components/GameSummaryView.tsx";
import React from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import "./Home.css";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import type { LeaderboardProps } from "../util/types.ts";
import { Leaderboard } from "../components/Leaderboard.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import useGamePopularity from "../hooks/useGamePopularity.ts";

export default function Home() {
  const { theme } = React.useContext(ThemeContext);
  const threadList = useThreadList(4);
  const gameList = useGameList({ limit: 4 });
  const gamePopularityList = useGamePopularity();
  const user = useLoginContext().user;
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardProps>([]);

  // Update the user's online presence to active when they are on the home page
  React.useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);
  // Fetch the points leaderboard when the component mounts
  React.useEffect(() => {
    fetch("/api/points/leaderboard")
      .then((res) => res.json())
      .then((data: { username: string; display: string; pointsTotal: number }[]) => {
        setLeaderboard(
          data.map((item) => ({
            username: item.username,
            display: item.display || item.username,
            pointsTotal: item.pointsTotal,
          })),
        );
      })
      .catch(() => setLeaderboard([]));
  }, []);

  return (
    <div className="home-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
      <Typography.PageTitle>Home</Typography.PageTitle>
      <div className="main-content">
        <div className="top-row">
          <div>
            <Typography.Subtitle>Leaderboard</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: "20px" }} />
            <div className="left-item" style={{ borderRight: `1px solid ${theme.secondaryText}` }}>
              <Leaderboard leaderboard={leaderboard.slice(0, 3)} theme={theme} type="users" />
            </div>
          </div>
          <div>
            <Typography.Subtitle>Quick Links</Typography.Subtitle>
            <Divider color={theme.text} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px" }}>
              <Button color="#e39344" text={theme.text} onClick={() => navigate("/forum/post/new")}>
                Create New Post
              </Button>
              <Button color="#36c2d2" text={theme.text} onClick={() => navigate("/game/new")}>
                Start Game
              </Button>
            </div>
          </div>
        </div>
        <div className="row">
          <div>
            <Typography.Subtitle>Recent Games</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: "20px" }} />
          </div>
          {"message" in gameList ? (
            <Typography.LargeParagraph>{gameList.message}</Typography.LargeParagraph>
          ) : (
            <div className="game-list">
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
        </div>
        <div className="row">
          <div>
            <Typography.Subtitle>Recent Forum Posts</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: "20px" }} />
          </div>
          {"message" in threadList ? (
            <Typography.LargeParagraph>{threadList.message}</Typography.LargeParagraph>
          ) : (
            <div id="thread-list" role="list">
              {threadList.map((thread, index) => (
                <ThreadSummaryView
                  thread={{ ...thread }}
                  theme={theme}
                  index={index}
                  key={thread.threadId.toString()}
                />
              ))}
            </div>
          )}
        </div>
        <div className="row">
          <div>
            <Typography.Subtitle>Most Popular Games</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: "20px" }} />
          </div>
          {"message" in threadList ? (
            <Typography.LargeParagraph>{threadList.message}</Typography.LargeParagraph>
          ) : (
            <div id="game-popularity-list" role="list">
              <Leaderboard
                leaderboard={gamePopularityList.slice(0, 3)}
                theme={theme}
                type="games"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

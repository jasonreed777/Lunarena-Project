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
import { TransluscentButton as Button } from "../components/Buttons.tsx";

export default function Home() {
  const { theme } = React.useContext(ThemeContext);
  const threadList = useThreadList(4);
  const gameList = useGameList(4);
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
        setLeaderboard(data);
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
            <div className="left-item">
              <Leaderboard leaderboard={leaderboard.slice(0, 3)} theme={theme} />
            </div>
          </div>
          <div>
            <Typography.Subtitle>Quick Start a Game</Typography.Subtitle>
            <Divider color={theme.text} />
            <div style={{ display: "flex", gap: "10px", padding: "20px" }}>
              <Button color="#34a95f" text={theme.text}>
                Nim
              </Button>
              <Button color="#36c2d2" text={theme.text}>
                Number Guesser
              </Button>
              <Button color="#364bd2" text={theme.text}>
                Minesweeper
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
                  index={index + 1}
                />
              ))}
            </div>
          )}
        </div>
        <div className="row">
          <div>
            <Typography.Subtitle>Recent Forum Posts</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: "20px" }} />
            {"message" in threadList ? (
              <Typography.LargeParagraph>{threadList.message}</Typography.LargeParagraph>
            ) : (
              <div id="thread-list" role="list">
                {threadList.map((thread) => (
                  <ThreadSummaryView
                    thread={{ ...thread }}
                    theme={theme}
                    key={thread.threadId.toString()}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 
      <div className="spacedSection">
        <h2>Recent forum posts</h2>
        {"message" in threadList ? (
          <div>{threadList.message}</div>
        ) : (
          <div id="threadList" role="list" className="dottedList">
            {threadList.map((thread) => (
              <ThreadSummaryView {...thread} key={thread.threadId.toString()} />
            ))}
          </div>
        )}
        <div>
          <button className="primary narrow" onClick={() => navigate("/forum/post/new")}>
            Create New Post
          </button>
        </div>
      </div> */}
    </div>
  );
}

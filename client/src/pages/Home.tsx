import useThreadList from "../hooks/useThreadList.ts";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import { useNavigate } from "react-router-dom";
import useGameList from "../hooks/useGameList.ts";
import GameSummaryView from "../components/GameSummaryView.tsx";
import { useEffect, useState } from "react";
import { updateProfile } from "../services/profileService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";

export default function Home() {
  const threadList = useThreadList(4);
  const gameList = useGameList(4);
  const user = useLoginContext().user;
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<{ username: string; pointsTotal: number }[]>([]);

  // Update the user's online presence to active when they are on the home page
  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);
  // Fetch the points leaderboard when the component mounts
  useEffect(() => {
    fetch("/api/points/leaderboard")
      .then((res) => res.json())
      .then((data: { username: string; pointsTotal: number }[]) => {
        setLeaderboard(data);
      })
      .catch(() => setLeaderboard([]));
  }, []);

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>Recent games</h2>
        {"message" in gameList ? (
          <div>{gameList.message}</div>
        ) : (
          <div id="gameList" className="dottedList">
            {gameList.map((game) => (
              <GameSummaryView {...game} key={game.gameId.toString()} />
            ))}
          </div>
        )}
        <div>
          <button className="primary narrow" onClick={() => navigate("/game/new")}>
            Create New Game
          </button>
        </div>
      </div>
      <div className="spacedSection">
        <h2>Top Players</h2>
        <div className="dottedList">
          {leaderboard.length === 0 ? (
            <div>No leaderboard data yet.</div>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={entry.username}>
                {index + 1}. {entry.username} — {entry.pointsTotal} points
              </div>
            ))
          )}
        </div>
      </div>
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
      </div>
    </div>
  );
}

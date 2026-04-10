import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import type { DailyGameStatus, DailyGameType, DailyStatusResponse } from "@gamenite/shared";
import { getDailyGame, getDailyStatus } from "../services/dailyService.ts";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { Divider } from "../components/Divider.tsx";
import * as Typography from "../libs/Typography.tsx";
import dayjs from "dayjs";

const DAILY_GAMES: { type: DailyGameType; label: string }[] = [
  { type: "minesweeper", label: "Minesweeper" },
  { type: "circleconnect", label: "CircleConnect" },
];

const Container = styled.div`
  min-height: var(--content-vh);
  background-image: url(../assets/gradients/daily_gradient.png);
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

const Card = styled.div<{ bg: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background-color: ${({ bg }) => bg};
  border-radius: 12px;
`;

/** Format a duration in milliseconds to a human-readable "Xm Ys" or "Xs" string */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Return a display label for a daily game's completion status */
function statusLabel(status: DailyGameStatus): string {
  if (status.completed) {
    return status.won ? "Completed" : "Finished (lost)";
  }
  if (status.gameId) return "In Progress";
  return "Not Started";
}

/**
 * Daily challenges page — shows today's available daily games,
 * their completion status, and the user's current streak.
 */
export default function DailyPage() {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [status, setStatus] = useState<DailyStatusResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      getDailyStatus().then((res) => {
        if (!("error" in res)) setStatus(res);
      });
    };

    fetchStatus();

    // Re-fetch when user navigates back to this tab/page
    window.addEventListener("focus", fetchStatus);
    return () => window.removeEventListener("focus", fetchStatus);
  }, []);

  const handlePlay = async (gameType: DailyGameType) => {
    setLoading(gameType);
    const res = await getDailyGame(gameType);
    setLoading(null);
    if (!("error" in res)) {
      navigate(`/game/${res.gameId}`);
    }
  };

  const getGameStatus = (gameType: DailyGameType): DailyGameStatus | undefined =>
    status?.games.find((g) => g.gameType === gameType);

  const accentColor = "#e6a23c";

  return (
    <Container style={{ backgroundColor: theme.primary, color: theme.text }}>
      <Typography.PageTitle>Daily Challenges</Typography.PageTitle>

      <div>
        <Typography.Subtitle>{dayjs().format("MMMM D, YYYY")}</Typography.Subtitle>
        {status && (
          <Typography.HeaderStats>
            Streak: {status.streak} day{status.streak !== 1 ? "s" : ""}
          </Typography.HeaderStats>
        )}
      </div>

      <Divider color={theme.text} />

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {DAILY_GAMES.map(({ type, label }) => {
          const gameStatus = getGameStatus(type);
          const isCompleted = gameStatus?.completed ?? false;

          return (
            <Card key={type} bg={theme.navBar}>
              <div style={{ flex: 1 }}>
                <Typography.Code style={{ color: theme.text }}>{label}</Typography.Code>
                <Typography.Paragraph color={theme.secondaryText}>
                  {gameStatus ? statusLabel(gameStatus) : "Not Started"}
                </Typography.Paragraph>
                {gameStatus?.completionTimeMs && (
                  <Typography.SmallText style={{ color: theme.secondaryText, opacity: 0.7 }}>
                    Time: {formatTime(gameStatus.completionTimeMs)}
                  </Typography.SmallText>
                )}
              </div>
              <Button
                color={accentColor}
                text={theme.text}
                fitContent
                onClick={() => handlePlay(type)}
                disabled={loading !== null || isCompleted}
                style={{ padding: "8px 24px" }}
              >
                {loading === type
                  ? "Loading..."
                  : isCompleted
                    ? "Done"
                    : gameStatus?.gameId
                      ? "Continue"
                      : "Play"}
              </Button>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}

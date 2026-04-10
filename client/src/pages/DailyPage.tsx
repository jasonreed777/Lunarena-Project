import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import type {
  DailyGameStatus,
  DailyGameType,
  DailyStatusResponse,
  DailyObjectivesResponse,
} from "@gamenite/shared";
import { getDailyGame, getDailyStatus } from "../services/dailyService.ts";
import { getDailyObjectives } from "../services/dailyObjectivesService.ts";
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

const Card = styled.div<{ bg: string; isLight: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background-color: ${({ bg, isLight }) => (isLight ? "rgba(255, 255, 255, 0.7)" : bg)};
  border-radius: 12px;
  ${({ isLight }) =>
    isLight &&
    `
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(8px);
  `}
`;

const ObjectiveCard = styled.div<{ bg: string; completed: boolean; isLight: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background-color: ${({ bg, isLight }) => (isLight ? "rgba(255, 255, 255, 0.7)" : bg)};
  border-radius: 12px;
  opacity: ${({ completed }) => (completed ? 0.7 : 1)};
  ${({ isLight }) =>
    isLight &&
    `
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(8px);
  `}
`;

const ProgressBarOuter = styled.div<{ bg: string; isLight: boolean }>`
  width: 100%;
  height: 8px;
  background-color: ${({ bg, isLight }) => (isLight ? "rgba(0, 0, 0, 0.08)" : bg)};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ percent: number; color: string }>`
  width: ${({ percent }) => percent}%;
  height: 100%;
  background-color: ${({ color }) => color};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ObjectiveRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const PointsBadge = styled.span<{ color: string }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ color }) => color};
  white-space: nowrap;
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

const categoryColors: Record<string, string> = {
  game: "#e6a23c",
  social: "#67c23a",
  forum: "#409eff",
  friends: "#f56c6c",
};

export default function DailyPage() {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [status, setStatus] = useState<DailyStatusResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [objectivesData, setObjectivesData] = useState<DailyObjectivesResponse | null>(null);

  useEffect(() => {
    const fetchAll = () => {
      getDailyStatus().then((res) => {
        if (!("error" in res)) setStatus(res);
      });
      getDailyObjectives().then((res) => {
        if (!("error" in res)) setObjectivesData(res);
      });
    };

    fetchAll();

    window.addEventListener("focus", fetchAll);
    return () => window.removeEventListener("focus", fetchAll);
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
  const isLight = theme._id === "light";

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

      <Divider color={isLight ? "rgba(0, 0, 0, 0.15)" : theme.text} />

      {/* Daily Objectives */}
      {objectivesData && (
        <>
          <Typography.Subtitle>Daily Objectives</Typography.Subtitle>
          {objectivesData.allCompleted && (
            <Typography.SmallText style={{ color: accentColor }}>
              All objectives complete! +5 bonus points
            </Typography.SmallText>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {objectivesData.objectives.map((obj) => {
              const percent = obj.target > 0 ? Math.min((obj.current / obj.target) * 100, 100) : 0;
              const categoryColor = categoryColors[obj.category] ?? accentColor;

              return (
                <ObjectiveCard
                  key={obj.objectiveId}
                  bg={theme.navBar}
                  completed={obj.completed}
                  isLight={isLight}
                >
                  <ObjectiveRow>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: categoryColor,
                          flexShrink: 0,
                        }}
                      />
                      <Typography.SmallText style={{ color: theme.text, margin: 0 }}>
                        {obj.completed ? "\u2713 " : ""}
                        {obj.description}
                      </Typography.SmallText>
                    </div>
                    <PointsBadge color={accentColor}>+{obj.pointsReward} pts</PointsBadge>
                  </ObjectiveRow>
                  <ObjectiveRow>
                    <ProgressBarOuter bg={theme.primary} isLight={isLight}>
                      <ProgressBarInner percent={percent} color={categoryColor} />
                    </ProgressBarOuter>
                    <Typography.SmallText
                      style={{ color: theme.secondaryText, margin: 0, whiteSpace: "nowrap" }}
                    >
                      {obj.current}/{obj.target}
                    </Typography.SmallText>
                  </ObjectiveRow>
                </ObjectiveCard>
              );
            })}
          </div>

          <Divider color={isLight ? "rgba(0, 0, 0, 0.15)" : theme.text} />
        </>
      )}

      {/* Daily Games */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {DAILY_GAMES.map(({ type, label }) => {
          const gameStatus = getGameStatus(type);
          const isCompleted = gameStatus?.completed ?? false;

          return (
            <Card key={type} bg={theme.navBar} isLight={isLight}>
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

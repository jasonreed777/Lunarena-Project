import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import type { ColorTheme, DailyPoints } from "../util/types";
import React from "react";
import { Divider } from "./Divider";
import { getUserDailyPoints } from "../services/pointsService";
import Tooltip from "./Tooltip";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  overflow-x: visible;
  gap: 20px;
  min-width: 200px;
`;

const PointsContainer = styled.div<{ theme: ColorTheme }>`
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  grid-auto-columns: 20px;
  justify-content: start;
  gap: 5px;
  border: 1px solid ${({ theme }) => theme.text};
  border-radius: 8px;
  padding: 20px;
`;

const PointDisplay = styled.div<{ color: string; opacity?: number }>`
  width: 20px;
  height: 20px;
  background-color: ${({ color }) => color};
  opacity: ${({ opacity }) => opacity ?? "1"};
  border-radius: 2px;
  cursor: pointer;
`;

/**
 * Represents a user's activity graph, which displays all the points they have obtained over time.
 */
export const ActivityGraph: React.FC<{ theme: ColorTheme; color: string; username: string }> = ({
  theme,
  color,
  username,
}) => {
  const [dailyPoints, setDailyPoints] = React.useState<DailyPoints[]>([]);
  const [tooltipIndex, setTooltipIndex] = React.useState<number>(-1);

  /**
   * Retrieves the maximum points in a user's streak.
   */
  const maxPoints = React.useMemo(
    () => Math.max(...dailyPoints.map((d) => d.points)),
    [dailyPoints],
  );

  /**
   * Sorts the dates of the daily points in ascending order.
   * @param dailyPoints
   * @returns
   */
  const sortDates = (dailyPoints: DailyPoints[]) => {
    return [...dailyPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  /**
   * Calculates the opacity of each activity block compared to the maximum number of points.
   */
  const calculateOpacity = React.useCallback(
    (points: number) => {
      if (maxPoints === 0) {
        return 1;
      }
      return Math.max(points / maxPoints, 0.1);
    },
    [maxPoints],
  );

  React.useEffect(() => {
    getUserDailyPoints(username).then((res) => {
      if (!("error" in res)) {
        setDailyPoints(sortDates(res));
      }
    });
  }, [username]);

  return (
    <Container>
      <div>
        <Typography.Subtitle>Activity Graph</Typography.Subtitle>
        <Divider color={theme.text} />
      </div>
      <PointsContainer theme={theme}>
        {dailyPoints.map((daily, index) => (
          <div style={{ position: "relative" }}>
            <PointDisplay
              color={color}
              opacity={calculateOpacity(daily.points)}
              key={index}
              onMouseEnter={() => setTooltipIndex(index)}
              onMouseLeave={() => setTooltipIndex(-1)}
            />
            <Tooltip
              text={`${
                daily.points === 1
                  ? "1 Point"
                  : `${daily.points === 0 ? "No" : daily.points} Points`
              } on ${new Date(daily.date).toLocaleString("en-US", { month: "long", day: "numeric" })}`}
              visible={tooltipIndex === index}
            />
          </div>
        ))}
      </PointsContainer>
    </Container>
  );
};

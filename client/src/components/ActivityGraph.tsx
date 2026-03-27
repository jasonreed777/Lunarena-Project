import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import type { ColorTheme, DailyPoints } from "../util/types";
import React from "react";
import { Divider } from "./Divider";
import { getUserDailyPoints } from "../services/pointsService";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  overflow-x: scroll;
  gap: 20px;
  min-width: 200px;
`;

const PointsContainer = styled.div<{ theme: ColorTheme }>`
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column;
  grid-auto-columns: 20px;
  justify-content: end;
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
  const sortDates = (dailyPoints: DailyPoints[]) =>
    [...dailyPoints].sort((a, b) => a.date.getTime() - b.date.getTime());

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
        <Divider />
      </div>
      <PointsContainer theme={theme}>
        {dailyPoints.map((daily, index) => (
          <PointDisplay color={color} opacity={calculateOpacity(daily.points)} key={index} />
        ))}
      </PointsContainer>
    </Container>
  );
};

import styled from "@emotion/styled";
import { TrophyColorMap, type ColorTheme, type LeaderboardProps } from "../util/types";
import { DefaultIcon as Trophy } from "./StyledSVG";
import { Divider } from "./Divider";
import * as Typography from "../libs/Typography";
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/**
 * Represents a leaderboard. This can house any number of rows, but only the top three players are displayed with medals.
 * @param props Leaderboard props - includes user's name and total points
 * @returns
 */
export const Leaderboard: React.FC<{
  leaderboard: LeaderboardProps;
  theme: ColorTheme;
  type: "games" | "users";
  clickable?: boolean;
}> = ({ leaderboard, theme, clickable = true, type }) => {
  const navigate = useNavigate();
  const ranks: number[] = [];
  let currentRank = 0;
  for (let i = 0; i < leaderboard.length; i++) {
    if (i === 0) {
      ranks.push(0);
    } else if (leaderboard[i].pointsTotal === leaderboard[i - 1].pointsTotal) {
      ranks.push(ranks[i - 1]);
    } else {
      currentRank = ranks[i - 1] + 1;
      ranks.push(currentRank);
    }
  }

  return (
    <Container>
      {leaderboard.map((row, index) => (
        <Row key={row.name}>
          {ranks[index] <= 2 && (
            <Trophy
              src="/assets/icons/leaderboard.svg"
              color={TrophyColorMap[ranks[index]]}
              hover={false}
            />
          )}
          <Typography.ProfileText
            style={{
              textWrap: "nowrap",
              overflow: "visible",
              cursor: clickable && type === "users" ? "pointer" : "default",
            }}
            onClick={
              clickable && type === "users" ? () => navigate(`/profile/${row.name}`) : undefined
            }
          >
            {row.name}
          </Typography.ProfileText>
          <Divider color={theme.secondaryText} />
          <Typography.Code style={{ textWrap: "nowrap" }}>
            {row.pointsTotal === 1
              ? "1 Point"
              : `${row.pointsTotal} ${type === "games" ? "Plays" : "Points"}`}
            {row.gamesPlayedTotal !== undefined && ` · ${row.gamesPlayedTotal} Games`}
            {row.achievementCount !== undefined && ` · ${row.achievementCount} Awards`}
          </Typography.Code>
        </Row>
      ))}
    </Container>
  );
};

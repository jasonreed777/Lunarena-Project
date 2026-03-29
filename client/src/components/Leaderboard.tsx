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
export const Leaderboard: React.FC<{ leaderboard: LeaderboardProps; theme: ColorTheme }> = ({
  leaderboard,
  theme,
}) => {
  const navigate = useNavigate();
  return (
    <Container>
      {leaderboard.map((row, index) => (
        <Row>
          {index <= 2 && (
            <Trophy
              src="/assets/icons/leaderboard.svg"
              color={TrophyColorMap[index]}
              hover={false}
            />
          )}
          <Typography.ProfileText
            style={{ textWrap: "nowrap", overflow: "visible", cursor: "pointer" }}
            onClick={() => navigate(`/profile/${row.username}`)}
          >
            {row.display || row.username}
          </Typography.ProfileText>
          <Divider color={theme.secondaryText} />
          <Typography.Code>
            {row.pointsTotal === 1 ? "1 Point" : `${row.pointsTotal} Points`}
          </Typography.Code>
        </Row>
      ))}
    </Container>
  );
};

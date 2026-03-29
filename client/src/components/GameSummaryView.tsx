import type { GameInfo } from "@gamenite/shared";
import { useNavigate } from "react-router-dom";
import { gameNames } from "../util/consts.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import styled from "@emotion/styled";
import type { ColorTheme } from "../util/types.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "./Divider.tsx";

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  align-items: center;
  gap: 20px;
  text-wrap: nowrap;
`;

const Column = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
`;

const StyledLink = styled.div`
  text-decoration: none;
  transition: all 0.2s;

  :hover {
    text-decoration: underline;
  }
`;

/**
 * Summarizes information for a single game as part of a list of games
 */
const GameSummaryView: React.FC<{ gameInfo: GameInfo; theme: ColorTheme; index: number }> = ({
  gameInfo,
  theme,
  index,
}) => {
  const timeSince = useTimeSince();
  const navigate = useNavigate();
  const numPlayers = gameInfo.players.length;
  const gameName = gameNames[gameInfo.type];
  return (
    <Container role="listitem" style={{ color: theme.text }}>
      <Column>
        <Typography.LargeStat>{index + 1}</Typography.LargeStat>
        <StyledLink>
          <Typography.Code
            onClick={() => navigate(`/game/${gameInfo.gameId}`)}
            style={{ cursor: "pointer" }}
          >
            {gameName.charAt(0).toUpperCase() + gameName.slice(1)}
          </Typography.Code>
        </StyledLink>
        <Divider color={theme.secondaryText} />
      </Column>
      <Column>
        <Typography.SubtitleSmall
          style={{ color: theme.secondaryText, textWrap: "nowrap" }}
          onClick={() => navigate(`/game/${gameInfo.gameId}`)}
        >
          {gameInfo.status}
          {gameInfo.status !== "done" && `, ${numPlayers} player${numPlayers === 1 ? "" : "s"}`}
        </Typography.SubtitleSmall>
        <Divider color={theme.secondaryText} />
        <Typography.ProfileText
          style={{
            overflow: "visible",
            textWrap: "nowrap",
            whiteSpace: "nowrap",
            display: "flex",
            gap: "4px",
          }}
        >
          <UserLink user={gameInfo.createdBy} capitalize /> created {timeSince(gameInfo.createdAt)}
        </Typography.ProfileText>
      </Column>
    </Container>
  );
};

export default GameSummaryView;

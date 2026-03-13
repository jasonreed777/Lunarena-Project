import type { Game, SafeUserInfo } from "@gamenite/shared";
import * as Typography from "../libs/Typography";
import useTimeSince from "../hooks/useTimeSince";
import styled from "@emotion/styled";
import { capitalizeText } from "../util/utils";

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const RecentlyPlayed: React.FC<{
  game: Game;
  players: SafeUserInfo[];
  position: number;
  timeAgo: Date;
}> = ({ game, players, position, timeAgo }) => {
  const timeSince = useTimeSince();
  const displayNames = players.map((player) => player.display);

  return (
    <Container>
      <Typography.LargeStat>{position}</Typography.LargeStat>
      <Typography.RecentlyPlayedText>{`${capitalizeText(game)} • ${displayNames.join(" & ")} • ${timeSince(timeAgo)}`}</Typography.RecentlyPlayedText>
    </Container>
  );
};

import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import { hexToRGB } from "../util/utils";
import type { Clan } from "../pages/ClanPage";

const Container = styled.div<{ color: string; small: boolean }>`
  width: 100%;
  height: 50px;
  color: ${({ color }) => color ?? "white"};
  background-color: rgba(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`},
    0.2
  );
  border: 3px solid ${({ color }) => color};
  border-radius: 100px;
  padding: 6px 10px;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;

  transform: ${({ small }) => (small ? "scale(85%)" : undefined)};

  :hover {
    transform: ${({ small }) => (small ? "scale(90%)" : "scale(105%)")};
  }
`;
const Left = styled.div`
  height: 100%;
  display: flex;
  gap: 10px;
  align-items: center;
`;

const ProfilePicture = styled.img`
  width: auto;
  height: 90%;
  border-radius: 50%;
`;

export const ClanPill: React.FC<{ clan: Clan; value?: number; small?: boolean }> = ({
  clan,
  value,
  small,
}) => {
  return (
    <Container color={clan.color} small={small || false}>
      <Left>
        <ProfilePicture src={clan.icon || "src/assets/logos/logo_multicolor.svg"} />
        <Typography.ProfileText>{clan.name}</Typography.ProfileText>
      </Left>
      {value && <Typography.LargeStat style={{ float: "right" }}>#{value}</Typography.LargeStat>}
    </Container>
  );
};

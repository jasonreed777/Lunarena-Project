import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import { darkenColor, hexToRGB } from "../util/utils";
import type { Clan } from "../pages/ClanPage";
import React from "react";
import type { RGBColor } from "../util/types";

const Container = styled.div<{ customColor: RGBColor; small: boolean }>`
  width: 100%;
  height: 50px;

  background-color: rgba(
    ${({ customColor }) => `${customColor.r}, ${customColor.g}, ${customColor.b}`},
    0.2
  );
  color: ${({ customColor }) =>
    customColor ? `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})` : "white"};
  border: 3px solid
    ${({ customColor }) => `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`};

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

export const ClanPill: React.FC<{
  clan: Clan;
  value?: number;
  small?: boolean;
  themeId: string;
}> = ({ clan, value, small, themeId }) => {
  const [color, setColor] = React.useState<RGBColor>(
    themeId === "dark" ? hexToRGB(clan.color) : darkenColor(hexToRGB(clan.color)),
  );

  React.useEffect(() => {
    setColor(themeId === "dark" ? hexToRGB(clan.color) : darkenColor(hexToRGB(clan.color)));
  }, [themeId, clan.color]);

  return (
    <Container customColor={color} small={small || false}>
      <Left>
        <ProfilePicture src={clan.icon || "src/assets/logos/logo_multicolor.svg"} />
        <Typography.ProfileText>{clan.name}</Typography.ProfileText>
      </Left>
      {value && <Typography.LargeStat style={{ float: "right" }}>#{value}</Typography.LargeStat>}
    </Container>
  );
};

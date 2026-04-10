import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import { darkenColor, hexToRGB } from "../util/utils";
import type { RGBColor, Theme } from "../util/types";
import React from "react";
import { NavLink } from "react-router-dom";

const OuterContainer = styled.div<{ customColor: RGBColor }>`
  width: 100%;
  min-height: 50px;
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;

  background-color: rgba(
    ${({ customColor }) => `${customColor.r}, ${customColor.g}, ${customColor.b}`},
    0.2
  );
  color: ${({ customColor }) => `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`};
  border: 3px solid
    ${({ customColor }) => `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`};

  border-radius: 100px;
  transition: all 0.2s;

  :hover {
    transform: scale(1.01);
  }
`;

const NameLink = styled(NavLink)`
  text-decoration: none;
  color: inherit;
  flex: 1;
  overflow: hidden;
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
`;

/**
 * A pill-shaped row for displaying a friend or friend request.
 * Follows the same visual pattern as UserPill and ClanPill —
 * colored border, semi-transparent background, hover scale animation.
 *
 * The name/detail area is a NavLink; optional children render on the
 * right side (e.g. action buttons) outside the link to avoid nesting
 * interactive elements.
 *
 * @param to       NavLink destination (e.g. /profile/username)
 * @param name     Display name shown as the primary text
 * @param detail   Secondary line (e.g. "@username · Friends 3 days ago")
 * @param color    Hex color for the pill border & background
 * @param themeId  Current theme id — controls color darkening for light mode
 * @param children Optional right-side content (action buttons, badges, etc.)
 */
export const FriendPill: React.FC<{
  to: string;
  name: string;
  detail: string;
  color: string;
  themeId: Theme;
  children?: React.ReactNode;
}> = ({ to, name, detail, color, themeId, children }) => {
  const [rgb, setRGB] = React.useState<RGBColor>(
    themeId === "dark" ? hexToRGB(color) : darkenColor(hexToRGB(color)),
  );

  React.useEffect(() => {
    setRGB(themeId === "dark" ? hexToRGB(color) : darkenColor(hexToRGB(color)));
  }, [themeId, color]);

  return (
    <OuterContainer customColor={rgb} className="friend-pill">
      <NameLink to={to}>
        <Left>
          <Typography.ProfileText style={{ margin: 0 }}>{name}</Typography.ProfileText>
          <Typography.SmallText style={{ margin: 0, opacity: 0.6 }}>{detail}</Typography.SmallText>
        </Left>
      </NameLink>
      {children}
    </OuterContainer>
  );
};

import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import { darkenColor, hexToRGB } from "../util/utils";
import type { RGBColor, Theme, UserProfileRecord } from "../util/types";
import React from "react";

export type ClanRole = "admin" | "mod" | "member";

const Container = styled.div<{ customColor: RGBColor; themeId: string }>`
  width: 100%;
  height: 50px;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  background-color: rgba(
    ${({ customColor }) => `${customColor.r}, ${customColor.g}, ${customColor.b}`},
    0.2
  );
  color: ${({ customColor }) =>
    customColor ? `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})` : "white"};
  border: 3px solid
    ${({ customColor }) => `rgb(${customColor.r}, ${customColor.g}, ${customColor.b})`};

  border-radius: 100px;
  transition: all 0.2s;

  :hover {
    transform: scale(105%);
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

/**
 * Represents a small pill with user info. This includes the user's profile picture, name, and role
 * @param user the User to display
 * @returns a user pill
 */
export const UserPill: React.FC<{ user: UserProfileRecord; themeId: Theme }> = ({
  user,
  themeId,
}) => {
  const [color, setColor] = React.useState<RGBColor>(
    themeId === "dark"
      ? hexToRGB(user.profileBorderColor)
      : darkenColor(hexToRGB(user.profileBorderColor)),
  );

  React.useEffect(() => {
    setColor(
      themeId === "dark"
        ? hexToRGB(user.profileBorderColor)
        : darkenColor(hexToRGB(user.profileBorderColor)),
    );
  }, [themeId, user.profileBorderColor]);

  return (
    <Container customColor={color} themeId={themeId}>
      <Left>
        <ProfilePicture src={user.pfp.type === "upload" ? user.pfp.uploadId : user.pfp.avatarId} />
        <Typography.ProfileText>{user.titleId || user.username}</Typography.ProfileText>
      </Left>
      <Typography.Code style={{ float: "right" }}>{/* user.role */ "admin"}</Typography.Code>
    </Container>
  );
};

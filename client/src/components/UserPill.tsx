import styled from "@emotion/styled";
import * as Typography from "../libs/Typography";
import { hexToRGB } from "../util/utils";
import type { SafeUserInfoClanStuff } from "../pages/ClanPage";

export type ClanRole = "admin" | "mod" | "member";

const Container = styled.div<{ color: string }>`
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

export const UserPill: React.FC<{ user: SafeUserInfoClanStuff }> = ({ user }) => {
  return (
    <Container color={user.color}>
      <Left>
        <ProfilePicture src={/* user.pfp */ "src/assets/logos/logo_multicolor.svg"} />
        <Typography.ProfileText>{user.display}</Typography.ProfileText>
      </Left>
      <Typography.Code style={{ float: "right" }}>{user.role}</Typography.Code>
    </Container>
  );
};

import styled from "@emotion/styled";
import { AvatarSizeToPixelMap, type AvatarSize } from "../util/types";

/**
 * Profile picture with an optional border
 * @param border an object that takes in a color string for the border color
 * @param size the size of the displayed avatar
 */
export const Avatar = styled.img<{
  border?: { color: string };
  size?: AvatarSize;
  hover?: boolean;
}>`
  width: ${({ size }) => (size ? `${AvatarSizeToPixelMap[size]}px` : "auto")};
  height: ${({ size }) => (size ? `${AvatarSizeToPixelMap[size]}px` : "90%")};
  border-radius: 50%;
  border: ${({ border, size }) =>
    border ? `${size === "small" ? "3px" : "5px"} solid ${border.color}` : undefined};
  object-fit: contain;
  cursor: pointer;

  transition: transform 0.2s;

  ${({ hover }) =>
    hover &&
    `
    :hover {
      transform: scale(105%);
    }
  `}
`;

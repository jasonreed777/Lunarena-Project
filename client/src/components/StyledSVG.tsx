import styled from "@emotion/styled";
import React from "react";
import { ThemeContext } from "../contexts/ThemeContext";

/**
 * Styled SVG
 */
export const StyledSVG = styled.svg<{ hover?: boolean }>`
  flex-shrink: 0;
  transition: all 0.2s;
  cursor: ${({ hover }) => (hover ? `pointer` : `default`)};
  ${({ hover }) =>
    hover &&
    `
    :hover {
      transform: scale(110%);
    }
  `}
`;

/**
 * Represents a default icon. Standard image/svg parameters are taken in, but this allows for SVG recoloring according to the theme.
 * @returns Themed icon.
 */
export const DefaultIcon: React.FC<{
  src: string;
  width?: number | string;
  height?: number | string;
  onMouseEnter?: React.MouseEventHandler<SVGSVGElement>;
  onMouseLeave?: React.MouseEventHandler<SVGSVGElement>;
  onClick?: () => void;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}> = ({
  src,
  width,
  height,
  onMouseEnter,
  onMouseLeave,
  onClick,
  hover = true,
  className,
  style,
  color,
}) => {
  const { theme } = React.useContext(ThemeContext);

  return (
    <StyledSVG
      className={className}
      color={color ?? theme.text}
      width={width ?? 24}
      height={height ?? 24}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      hover={hover}
      style={style}
    >
      <use xlinkHref={src} href={src} width={width ?? 24} height={height ?? 24} />
    </StyledSVG>
  );
};

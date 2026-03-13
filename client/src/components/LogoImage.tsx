import styled from "@emotion/styled";

// Styled image
const StyledImage = styled.img`
  position: fixed;
  bottom: 30px;
  right: 25px;
  width: 80px;
`;

/**
 * Sticky logo image that appears on the bottom-right corner of the screen if desired
 * @returns logo image
 */
export const LogoImage = () => {
  return <StyledImage src="src/assets/logos/logo_multicolor.svg" alt="logo_img" />;
};

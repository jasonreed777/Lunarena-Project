import styled from "@emotion/styled";
import type { ReactNode } from "react";
import React from "react";
import type { ColorTheme } from "../util/types";
import { hexToRGB } from "../util/utils";

const Background = styled.div<{ visible: boolean; theme: ColorTheme }>`
  width: 100vw;
  height: 100vh;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: ${({ visible }) => (visible ? "block" : "none")};
  backdrop-filter: blur(40px);
  background-color: rgba
    ${({ theme }) =>
      `${hexToRGB(theme.text).r}, ${hexToRGB(theme.text).g}, ${hexToRGB(theme.text).b}, 0.8`};
  z-index: ${({ visible }) => (visible ? 5 : -1)};
`;
const Container = styled.div<{ backgroundColor: string; theme: ColorTheme }>`
  width: 80%;
  min-height: 70%;
  max-height: 85%;
  overflow-y: scroll;
  height: fit-content;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${({ backgroundColor }) =>
    backgroundColor}; // TODO: This should not be hardcoded
  border-radius: 30px;
  outline: 5px solid ${({ theme }) => theme.text};
  padding: 30px;

  @media (max-width: 600px) {
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    outline: none;
    border-radius: 0;
    box-sizing: border-box;
  }
`;

/**
 * Represents a modal that fills the screen.
 * @param children all content to be displayed within the modal.
 * @param visible **true** if the modal is currently visible
 * @returns
 */
const Modal: React.FC<{
  children: ReactNode;
  visible: boolean;
  backgroundColor?: string;
  theme: ColorTheme;
}> = ({ children, visible, backgroundColor, theme }) => {
  const translucentBackgroundColor = React.useMemo(() => {
    const rgbColor = hexToRGB(backgroundColor ?? "#717171");
    return `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.20)`;
  }, [backgroundColor]);

  React.useEffect(() => {
    if (visible) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [visible]);

  return visible ? (
    <Background visible={visible} theme={theme}>
      <Container backgroundColor={translucentBackgroundColor} theme={theme}>
        {children}
      </Container>
    </Background>
  ) : (
    <></>
  );
};

export default Modal;

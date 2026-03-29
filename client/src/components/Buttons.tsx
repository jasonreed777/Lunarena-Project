import styled from "@emotion/styled";
import { hexToRGB } from "../util/utils";

export const TranslucentButton = styled.button<{ color: string; text?: string }>`
  width: 100%;
  color: ${({ text }) => text ?? "white"};
  background-color: rgba(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`},
    0.2
  );
  border: 3px solid ${({ color }) => color};
  border-bottom-width: 5px;
  border-radius: 8px;
  padding: 5px;
  margin-bottom: 0;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;
  transition: all 0.1s;

  :hover {
    border-bottom-width: 3px;
    margin-bottom: 2px;
  }
`;

export const FilledButton = styled.button<{ color: string; text?: string }>`
  width: 100%;
  color: ${({ text }) => text ?? "white"};
  background-color: rgb(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`}
  );
  border: 3px solid ${({ color }) => color};
  border-bottom: 5px solid ${({ color }) => color};
  border-radius: 8px;
  padding: 5px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;
  transition: all 0.1s;

  :hover {
    border-bottom: 3px solid ${({ color }) => color};
  }
`;

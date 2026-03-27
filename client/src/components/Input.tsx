import React from "react";
import * as Typography from "../libs/Typography";
import styled from "@emotion/styled";
import { hexToRGB } from "../util/utils";

export const StyledInput = styled.input<{ color: string }>`
  width: 100%;
  color: white;
  background-color: rgba(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`},
    0.2
  );
  border: 3px solid ${({ color }) => color};
  border-radius: 8px;
  padding: 6px 10px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;

  ::placeholder {
    color: #dedede;
  }
`;

export const StyledTextArea = styled.textarea<{ color: string }>`
  width: 100%;
  color: white;
  background-color: rgba(
    ${({ color }) => `${hexToRGB(color).r}, ${hexToRGB(color).g}, ${hexToRGB(color).b}`},
    0.2
  );
  border: 3px solid ${({ color }) => color};
  border-radius: 8px;
  padding: 6px 10px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;

  ::placeholder {
    color: #dedede;
  }
`;

/**
 * Input box. Can take a label if needed
 * @param color Color of the border and background of this input box
 * @param label Optional label that can be added to the input box
 * @returns Input
 */
export const InputWithLabel: React.FC<{
  color: string;
  label: string;
  type?: React.HTMLInputTypeAttribute | undefined;
  value: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement, HTMLInputElement>;
  placeholder?: string;
}> = ({ color, label, type, value, onChange, placeholder }) => {
  return (
    <div>
      {label && <Typography.SubtitleSmall>{label}</Typography.SubtitleSmall>}
      <StyledInput
        color={/^#[0-9a-f]{3,6}$/i.test(color) ? color : "#ffffff"}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      ></StyledInput>
    </div>
  );
};

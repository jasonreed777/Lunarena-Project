import React from "react";
import * as Typography from "../libs/Typography";
import styled from "@emotion/styled";
import { hexToRGB } from "../util/utils";

export const StyledInput = styled.input<{
  borderColor: string;
  textColor?: string;
  placeholderColor?: string;
}>`
  width: 100%;
  color: ${({ textColor }) => textColor ?? "white"};
  background-color: rgba(
    ${({ borderColor }) =>
      `${hexToRGB(borderColor).r}, ${hexToRGB(borderColor).g}, ${hexToRGB(borderColor).b}`},
    0.2
  );
  border: 3px solid ${({ borderColor }) => borderColor};
  border-radius: 8px;
  padding: 6px 10px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;

  ::placeholder {
    color: ${({ placeholderColor }) => placeholderColor ?? "#dedede"};
  }
`;

export const StyledTextArea = styled.textarea<{
  borderColor: string;
  textColor?: string;
  placeholderColor?: string;
}>`
  width: 100%;
  color: ${({ textColor }) => textColor ?? "white"};
  background-color: rgba(
    ${({ borderColor }) =>
      `${hexToRGB(borderColor).r}, ${hexToRGB(borderColor).g}, ${hexToRGB(borderColor).b}`},
    0.2
  );
  border: 3px solid ${({ borderColor }) => borderColor};
  border-radius: 8px;
  padding: 6px 10px;
  font-family: "filson-pro", sans-serif;
  font-weight: 700;
  font-style: normal;
  font-size: 16px;

  ::placeholder {
    color: ${({ placeholderColor }) => placeholderColor ?? "#dedede"};
  }
`;

/**
 * Input box. Can take a label if needed. Various parameters are input related.
 * @param borderColor Color of the border and background of this input box
 * @param textColor Color of the text
 * @param placeholderColor Color of the placeholder text
 * @param label Optional label that can be added to the input box
 * @returns Input
 */
export const InputWithLabel: React.FC<{
  borderColor: string;
  label: string;
  type?: React.HTMLInputTypeAttribute | undefined;
  value: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement, HTMLInputElement>;
  placeholder?: string;
  textColor?: string;
  placeholderColor?: string;
}> = ({ borderColor, label, type, value, onChange, placeholder, textColor, placeholderColor }) => {
  return (
    <div>
      {label && <Typography.SubtitleSmall>{label}</Typography.SubtitleSmall>}
      <StyledInput
        borderColor={/^#[0-9a-f]{3,6}$/i.test(borderColor) ? borderColor : "#ffffff"}
        textColor={textColor}
        placeholderColor={placeholderColor}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
};

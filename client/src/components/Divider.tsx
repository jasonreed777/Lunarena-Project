import styled from "@emotion/styled";

export const Divider = styled.hr<{ color?: string }>`
  width: 100%;
  padding-top: 0;
  height: 1px;
  background-color: ${({ color }) => color ?? "white"};
  border: none;
  border-radius: 1px;
`;

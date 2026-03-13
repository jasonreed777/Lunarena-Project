import styled from "@emotion/styled";

export const Divider = styled.hr<{ color?: string; vertical?: boolean }>`
  width: ${({ vertical }) => (vertical ? "1px" : "100%")};
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  height: ${({ vertical }) => (vertical ? "100%" : "1px")};
  background-color: ${({ color }) => color ?? "white"};
  border: none;
  border-radius: 1px;
`;

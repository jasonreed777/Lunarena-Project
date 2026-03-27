import styled from "@emotion/styled";
import { StyledTextArea } from "./Input";
import { FilledButton } from "./Buttons";
import type { ColorTheme } from "../util/types";
import { Code } from "../libs/Typography";

const Container = styled.div`
  width: 100%;
  height: 50px;
  display: flex;
  gap: 20px;
`;

export const ChatBox: React.FC<{
  sendTo: string;
  theme: ColorTheme;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
}> = ({ sendTo, theme, onClick, message, setMessage }) => {
  return (
    <Container onClick={onClick}>
      <StyledTextArea
        color="#298432"
        placeholder={`Send a message to ${sendTo}`}
        style={{ width: "95%" }}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <FilledButton color={theme.navButton} style={{ width: 100 }}>
        <Code style={{ color: theme.text }}>Send</Code>
      </FilledButton>
    </Container>
  );
};

import { TranslucentButton as Button } from "./Buttons";
import { StyledTextArea } from "./Input";
import "./MessageCreation.css";
import { type SubmitEvent, type KeyboardEvent, useState } from "react";

interface MessageCreationProps {
  handleMessageCreation: (text: string) => void;
}

export default function MessageCreation({ handleMessageCreation }: MessageCreationProps) {
  const [text, setText] = useState<string>("");

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.code === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Don't edit text
      handleMessageCreation(text);
      setText("");
    }
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    handleMessageCreation(text);
    setText("");
  }

  return (
    <form data-testid="message-creation-form" className="messageCreation" onSubmit={handleSubmit}>
      <StyledTextArea
        placeholder="Send a message to chat"
        value={text}
        onKeyDown={handleKeyDown}
        onChange={(e) => setText(e.target.value)}
        borderColor="#ffffff"
      ></StyledTextArea>
      <Button className="visuallyHidden" color="#ffffff">
        Submit
      </Button>
    </form>
  );
}

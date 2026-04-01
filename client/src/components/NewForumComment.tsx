import "./NewForumComment.css";
import type { ThreadInfo } from "@gamenite/shared";
import useNewCommentForm from "../hooks/useNewCommentForm.ts";
import { StyledTextArea } from "./Input.tsx";
import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "./Buttons.tsx";
import styled from "@emotion/styled";

interface NewForumCommentProps {
  threadId: string;
  firstPost: boolean;
  setThread: (newThread: ThreadInfo) => void;
}

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

/**
 * Allows the user to post a new comment to a forum post
 */
export default function NewForumComment({ threadId, firstPost, setThread }: NewForumCommentProps) {
  const { theme } = useContext(ThemeContext);
  const { comment, err, handleSubmit, handleInputChange } = useNewCommentForm(
    threadId,
    firstPost,
    setThread,
  );

  return (
    <StyledForm className="newForumComment" onSubmit={handleSubmit}>
      <StyledTextArea
        className="notTooWide"
        placeholder={firstPost ? "Be the first to comment" : "Share your thoughts"}
        value={comment}
        onChange={handleInputChange}
        borderColor={theme.text}
        textColor={theme.text}
        placeholderColor={theme.secondaryText}
      />
      {err && <p className="error-message">{err}</p>}
      <div>
        <Button
          color={theme._id === "dark" ? "#f7cd59" : "#a88b3b"}
          text={theme._id === "dark" ? "#f7cd59" : "#a88b3b"}
        >
          Add Comment
        </Button>
      </div>
    </StyledForm>
  );
}

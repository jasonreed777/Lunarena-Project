import { useNavigate } from "react-router-dom";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import useThreadList from "../hooks/useThreadList.ts";
import React from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import styled from "@emotion/styled";
import { PageTitle } from "../libs/Typography.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";

const Container = styled.div`
  min-height: var(--content-vh);
  background-image: url(../assets/gradients/forum_gradient.png);
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  padding: 20px;
  padding-top: 3rem;

  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export default function ThreadList() {
  const threadList = useThreadList();
  const navigate = useNavigate();
  const { theme } = React.useContext(ThemeContext);

  return (
    <Container style={{ backgroundColor: theme.primary, color: theme.text }}>
      <PageTitle>All Forum Posts</PageTitle>
      <Button
        onClick={() => navigate("/forum/post/new")}
        color="#f7cd59"
        text={theme.text}
        style={{ width: "fit-content" }}
      >
        Create New Post
      </Button>
      <>
        {"message" in threadList ? (
          threadList.message
        ) : (
          <div role="list">
            {threadList.map((thread, index) => (
              <ThreadSummaryView
                thread={{ ...thread }}
                theme={theme}
                index={index}
                key={thread.threadId.toString()}
              />
            ))}
          </div>
        )}
      </>
    </Container>
  );
}

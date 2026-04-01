import styled from "@emotion/styled";
import useNewThreadForm from "../hooks/useNewThreadForm.ts";

import * as Typography from "../libs/Typography.tsx";
import React from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { StyledInput, StyledTextArea } from "../components/Input.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";

const Container = styled.form`
  width: 100%;
  height: 100%;

  background-image: url(/assets/gradients/forum_gradient.png);
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Content = styled.div`
  width: 55%;
  display: flex;
  flex-direction: column;
  align-items: baseline;
  gap: 20px;
`;

export default function NewThread() {
  const { theme } = React.useContext(ThemeContext);
  const { title, contents, err, handleInputChange, handleSubmit } = useNewThreadForm();

  return (
    <Container
      onSubmit={handleSubmit}
      style={{ backgroundColor: theme.primary, color: theme.text }}
    >
      <Content>
        <Typography.PageTitle>Create New Post</Typography.PageTitle>
        <div style={{ width: "100%" }}>
          <Typography.Subtitle>Title</Typography.Subtitle>
          <StyledInput
            borderColor="#ffffff"
            placeholder="Enter title here..."
            value={title}
            onChange={(event) => handleInputChange(event, "title")}
          />
        </div>
        <div style={{ width: "100%" }}>
          <Typography.Subtitle>Content</Typography.Subtitle>
          <StyledTextArea
            borderColor={theme.text}
            textColor={theme.text}
            placeholder="Enter content here..."
            value={contents}
            style={{ minHeight: "10rem" }}
            onChange={(event) => handleInputChange(event, "contents")}
          />
        </div>
        {err && <p className="error-message">{err}</p>}
        <Button color="#f7cd59" style={{ width: "30%" }}>
          Create
        </Button>
      </Content>
    </Container>
  );
}

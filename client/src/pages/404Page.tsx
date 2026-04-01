import { useNavigate } from "react-router-dom";
import { TranslucentButton } from "../components/Buttons";
import * as Typography from "../libs/Typography";
import styled from "@emotion/styled";
import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";

const Container = styled.div`
  min-height: var(--content-vh);
  background-image: url(../assets/gradients/404_gradient.png);
  background-repeat: no-repeat;
  background-attachment: fixed;
  background-position: center;
  background-size: cover;

  display: flex;
  justify-content: center;
  align-items: center;
`;

const Content = styled.div`
  width: 60%;
  display: flex;
  gap: 20px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const NotFoundPage: React.FC<{ pathname: string }> = ({ pathname }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  return (
    <Container style={{ backgroundColor: theme.primary, color: theme.text }}>
      <Content>
        <Typography.PageTitle style={{ textWrap: "nowrap" }}>
          404: Page Not Found
        </Typography.PageTitle>
        <Typography.Code>{`The page "${pathname}" does not exist :(`}</Typography.Code>
        <TranslucentButton
          onClick={() => navigate("/")}
          color="#e01313"
          text={theme.text}
          style={{ maxWidth: "300px" }}
        >
          Return Home
        </TranslucentButton>
      </Content>
    </Container>
  );
};

export default NotFoundPage;

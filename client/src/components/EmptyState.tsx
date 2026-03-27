import styled from "@emotion/styled";
import type { Theme } from "../util/types";

const Container = styled.div<{ themeId: Theme }>`
  text-align: center;
  padding: 1.5rem;
  opacity: 0.5;
  font-family: "filson-pro", sans-serif;
  font-size: 0.9rem;
  background-color: ${({ themeId }) =>
    themeId === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)"};
  border-radius: 12px;
`;

/**
 * Themed empty-state placeholder. Displays a centered message in a
 * semi-transparent rounded box that adapts to the current color theme.
 */
export const EmptyState: React.FC<{ message: string; themeId: Theme }> = ({ message, themeId }) => (
  <Container themeId={themeId}>{message}</Container>
);

import { NavLink, useNavigate } from "react-router-dom";
import type { ThreadSummary } from "@gamenite/shared";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import styled from "@emotion/styled";
import type { ColorTheme } from "../util/types.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "./Divider.tsx";

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  align-items: center;
  gap: 20px;
  text-wrap: nowrap;
`;

const Column = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
`;

const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  transition: all 0.2s;

  :hover {
    text-decoration: underline;
  }
`;

/**
 * Summarizes information for a single thread as part of a list of threads
 */
const ThreadSummaryView: React.FC<{ thread: ThreadSummary; theme: ColorTheme; index: number }> = ({
  thread,
  theme,
  index,
}) => {
  const navigate = useNavigate();
  const timeSince = useTimeSince();

  return (
    <Container role="listitem">
      <Column>
        <Typography.LargeStat>{index + 1}</Typography.LargeStat>
        <StyledNavLink to={`/forum/post/${thread.threadId}`} style={{ color: theme.text }}>
          <Typography.ProfileText>{thread.title}</Typography.ProfileText>
        </StyledNavLink>
        <Divider color={theme.secondaryText} />
      </Column>
      <Column>
        <Typography.SubtitleSmall
          style={{ color: theme.secondaryText, textWrap: "nowrap" }}
          onClick={() => navigate(`/forum/post/${thread.threadId}`)}
        >
          {thread.comments} {thread.comments === 1 ? "reply" : "replies"}
        </Typography.SubtitleSmall>
        <Divider color={theme.secondaryText} />
        <Typography.ProfileText
          style={{
            overflow: "visible",
            textWrap: "nowrap",
            whiteSpace: "nowrap",
            display: "flex",
            gap: "4px",
          }}
        >
          <UserLink user={thread.createdBy} capitalize /> posted {timeSince(thread.createdAt)}
        </Typography.ProfileText>
      </Column>
    </Container>
  );
};

export default ThreadSummaryView;

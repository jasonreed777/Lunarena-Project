import "./ThreadPage.css";
import { useParams } from "react-router-dom";
import useThreadInfo from "../hooks/useThreadInfo.ts";
import NewForumComment from "../components/NewForumComment.tsx";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "../components/UserLink.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";
import { updateProfile } from "../services/profileService.ts";
import { voteOnComment } from "../services/threadService.ts";
import { useContext, useEffect } from "react";
import type { VoteType } from "@gamenite/shared";
import VoteControls from "../components/VoteControls.tsx";
import styled from "@emotion/styled";
import * as Typography from "../libs/Typography.tsx";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { Divider } from "../components/Divider.tsx";

const Container = styled.div`
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
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Comment = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 5px 0;

  :hover .vote-btn {
    opacity: 1;
  }
`;

export default function ThreadPage() {
  const formatTimeSince = useTimeSince();
  const { threadId } = useParams();
  const { theme } = useContext(ThemeContext);
  const user = useLoginContext().user;
  // non-nullish assertion is okay here given that Thread is only called in a
  // route with `:threadId` on the path
  const { threadInfo, setThread } = useThreadInfo(threadId!);

  // Update the user's online presence to active when they are on the forum page
  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);

  async function handleVote(
    commentId: string,
    voteType: VoteType,
    currentVote: VoteType | null,
    currentScore: number,
  ) {
    if ("message" in threadInfo) return;

    const toggling = currentVote === voteType;
    const newVote = toggling ? null : voteType;

    let scoreDelta: number;
    if (toggling) {
      scoreDelta = voteType === "upvote" ? -1 : 1;
    } else if (currentVote) {
      scoreDelta = voteType === "upvote" ? 2 : -2;
    } else {
      scoreDelta = voteType === "upvote" ? 1 : -1;
    }

    const updateComments = (score: number, userVoted: VoteType | null) =>
      threadInfo.comments.map((c) => (c.commentId === commentId ? { ...c, score, userVoted } : c));
    // Optimistically set the new score, revert if the update fails
    setThread({ ...threadInfo, comments: updateComments(currentScore + scoreDelta, newVote) });

    const result = await voteOnComment(commentId, voteType);
    if ("error" in result) {
      setThread({ ...threadInfo, comments: updateComments(currentScore, currentVote) });
    }
  }

  return (
    <Container style={{ backgroundColor: theme.primary, color: theme.text }}>
      {"message" in threadInfo ? (
        threadInfo.message
      ) : (
        <Content>
          <Typography.SmallTitle>{threadInfo.title}</Typography.SmallTitle>
          <Typography.Paragraph style={{ color: theme.text }}>
            {threadInfo.text}
          </Typography.Paragraph>
          <Typography.SmallText style={{ color: theme.secondaryText }}>
            Posted by <UserLink user={threadInfo.createdBy} />{" "}
            {formatTimeSince(threadInfo.createdAt)}
          </Typography.SmallText>
          <div role="list">
            {threadInfo.comments.map(
              ({ commentId, text, createdBy, createdAt, editedAt, score, userVoted }, index) => (
                <>
                  {index < threadInfo.comments.length && <Divider style={{ color: theme.text }} />}
                  <Comment role="listitem" key={commentId}>
                    <VoteControls
                      userVoted={userVoted}
                      score={score}
                      handleVote={handleVote}
                      commentId={commentId}
                    />
                    <div>
                      <Typography.Paragraph style={{ color: theme.text }}>
                        {text}
                      </Typography.Paragraph>
                      <Typography.SmallText style={{ color: theme.text }}>
                        Reply by <UserLink user={createdBy} />
                        {createdBy.username === threadInfo.createdBy.username && (
                          <span
                            style={{
                              color: theme._id === "dark" ? "#f7cd59" : "#a88b3b",
                            }}
                          >
                            {" "}
                            OP
                          </span>
                        )}{" "}
                        {formatTimeSince(createdAt)}
                        {editedAt && ` (last edited ${formatTimeSince(editedAt)})`}
                      </Typography.SmallText>
                    </div>
                  </Comment>
                </>
              ),
            )}
          </div>
          <NewForumComment
            firstPost={threadInfo.comments.length === 0}
            threadId={threadInfo.threadId.toString()}
            setThread={setThread}
          />
        </Content>
      )}
    </Container>
  );
}

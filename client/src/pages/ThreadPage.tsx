import "./ThreadPage.css";
import { useParams } from "react-router-dom";
import useThreadInfo from "../hooks/useThreadInfo.ts";
import NewForumComment from "../components/NewForumComment.tsx";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "../components/UserLink.tsx";
import useLoginContext from "../hooks/useLoginContext.ts";
import { updateProfile } from "../services/profileService.ts";
import { voteOnComment } from "../services/threadService.ts";
import { useEffect } from "react";
import type { VoteType } from "@gamenite/shared";

export default function ThreadPage() {
  const formatTimeSince = useTimeSince();
  const { threadId } = useParams();
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
    <div className="content">
      {"message" in threadInfo ? (
        threadInfo.message
      ) : (
        <div className="spacedSection">
          <h2>{threadInfo.title}</h2>
          <div className="notTooWide">{threadInfo.text}</div>
          <div className="smallAndGray">
            Posted by <UserLink user={threadInfo.createdBy} />{" "}
            {formatTimeSince(threadInfo.createdAt)}
          </div>
          <div className="dottedList" role="list">
            {threadInfo.comments.map(
              ({ commentId, text, createdBy, createdAt, editedAt, score, userVoted }) => (
                <div className="dottedListItem commentItem" role="listitem" key={commentId}>
                  <div className="voteControls">
                    <button
                      className={`voteBtn upvoteBtn${userVoted === "upvote" ? " voted" : ""}`}
                      onClick={() => handleVote(commentId, "upvote", userVoted, score)}
                      aria-label="Upvote"
                    >
                      ▲
                    </button>
                    <span className="commentScore">{score}</span>
                    <button
                      className={`voteBtn downvoteBtn${userVoted === "downvote" ? " voted" : ""}`}
                      onClick={() => handleVote(commentId, "downvote", userVoted, score)}
                      aria-label="Downvote"
                    >
                      ▼
                    </button>
                  </div>
                  <div>
                    <div>{text}</div>
                    <div className="smallAndGray">
                      Reply by <UserLink user={createdBy} />
                      {createdBy.username === threadInfo.createdBy.username && (
                        <span className="opBlue"> OP</span>
                      )}{" "}
                      {formatTimeSince(createdAt)}
                      {editedAt && ` (last edited ${formatTimeSince(editedAt)})`}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
          <NewForumComment
            firstPost={threadInfo.comments.length === 0}
            threadId={threadInfo.threadId.toString()}
            setThread={setThread}
          />
        </div>
      )}
    </div>
  );
}

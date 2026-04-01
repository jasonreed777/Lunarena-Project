import "../pages/ThreadPage.css";
import type { VoteType } from "@gamenite/shared";

/**
 * Vote control panel that supports upvoting and downvoting.
 *
 * @param param0
 * @returns
 */
const VoteControls: React.FC<{
  userVoted: VoteType | null;
  score: number;
  handleVote: (
    commentId: string,
    voteType: VoteType,
    currentVote: VoteType | null,
    currentScore: number,
  ) => Promise<void>;
  commentId: string;
}> = ({ userVoted, score, handleVote, commentId }) => {
  return (
    <div className="vote-controls">
      <button
        className={`vote-btn upvote-btn${userVoted === "upvote" ? " voted" : ""}`}
        onClick={() => handleVote(commentId, "upvote", userVoted, score)}
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="comment-score">{score}</span>
      <button
        className={`vote-btn downvote-btn${userVoted === "downvote" ? " voted" : ""}`}
        onClick={() => handleVote(commentId, "downvote", userVoted, score)}
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  );
};
export default VoteControls;

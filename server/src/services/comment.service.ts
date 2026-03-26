import { randomUUID } from "node:crypto";
import { type CommentInfo, type VoteType } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import { CommentModel, CommentVoteModel } from "../mongoose-models.ts";

/**
 * Expand a stored comment
 *
 * @param commentId - Valid comment id
 * @param requestingUserId - The user triggering the request
 * @returns the expanded comment info object
 */
export async function populateCommentInfo(
  commentId: string,
  requestingUserId?: string,
): Promise<CommentInfo> {
  const doc = await CommentModel.findById(commentId).lean();
  if (!doc) throw new Error(`Failed to find comment ${commentId}`);
  return {
    commentId,
    text: doc.text,
    createdAt: new Date(doc.createdAt),
    createdBy: await populateSafeUserInfo(doc.createdBy),
    editedAt: doc.editedAt ? new Date(doc.editedAt) : undefined,
    score: doc.score === undefined ? 0 : doc.score,
    userVoted: requestingUserId ? await checkUserVoted(requestingUserId, commentId) : null,
  };
}

/**
 * Creates and stores a new comment
 *
 * @param user - a valid user id
 * @param text - the comment's text
 * @param createdAt - the time of comment creation
 * @returns the comment's info object
 */
export async function createComment(
  user: UserWithId,
  text: string,
  createdAt: Date,
): Promise<CommentInfo> {
  const id = randomUUID().toString();
  await CommentModel.create({
    _id: id,
    text,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    score: 0,
  });
  return populateCommentInfo(id);
}

/**
 * Casts a vote for a comment. Upvote, downvote, or if type is none clears the cast vote.
 * @param userId
 * @param commentId
 * @param voteType
 */
export async function castVote(
  userId: string,
  commentId: string,
  voteType: VoteType,
): Promise<{ success: true } | { success: false; error: string }> {
  const commentDoc = await CommentModel.findById(commentId);
  if (!commentDoc) {
    return { success: false, error: "Comment does not exist" };
  }
  const voteDoc = await CommentVoteModel.findOne({ userId, commentId });
  let scoreChange = 0;
  if (voteDoc) {
    if (voteDoc.type === voteType) {
      // toggle vote
      if (voteType === "upvote") scoreChange = -1;
      if (voteType === "downvote") scoreChange = 1;
      // delete vote
      await voteDoc.deleteOne();
    } else {
      if (voteType === "upvote") {
        voteDoc.type = "upvote";
        scoreChange = 2;
      }
      if (voteType === "downvote") {
        voteDoc.type = "downvote";
        scoreChange = -2;
      }
      await voteDoc.save();
    }
  } else {
    await CommentVoteModel.create({ userId, commentId, type: voteType });
    if (voteType === "upvote") scoreChange = 1;
    if (voteType === "downvote") scoreChange = -1;
  }
  commentDoc.score += scoreChange;
  await commentDoc.save();
  return { success: true };
}

async function checkUserVoted(userId: string, commentId: string): Promise<VoteType | null> {
  const doc = await CommentVoteModel.findOne({ userId, commentId });
  return doc ? doc.type : null;
}

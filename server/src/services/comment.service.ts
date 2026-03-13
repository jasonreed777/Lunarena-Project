import { randomUUID } from "node:crypto";
import { type CommentInfo } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { type UserWithId } from "../types.ts";
import { CommentModel } from "../mongoose-models.ts";

/**
 * Expand a stored comment
 *
 * @param commentId - Valid comment id
 * @returns the expanded comment info object
 */
export async function populateCommentInfo(commentId: string): Promise<CommentInfo> {
  const doc = await CommentModel.findById(commentId).lean();
  if (!doc) throw new Error(`Failed to find comment ${commentId}`);
  return {
    commentId,
    text: doc.text,
    createdAt: new Date(doc.createdAt),
    createdBy: await populateSafeUserInfo(doc.createdBy),
    editedAt: doc.editedAt ? new Date(doc.editedAt) : undefined,
  };
}

/**
 * Creates and stores a new comment
 *
 * @param userId - a valid user id
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
  });
  return populateCommentInfo(id);
}

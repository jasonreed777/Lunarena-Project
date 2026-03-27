import { randomUUID } from "node:crypto";
import { type CreateThreadMessage, type ThreadInfo, type ThreadSummary } from "@gamenite/shared";
import { populateSafeUserInfo } from "./user.service.ts";
import { createComment, populateCommentInfo } from "./comment.service.ts";
import { type UserWithId } from "../types.ts";
import { ThreadModel } from "../mongoose-models.ts";

/**
 * Expand a stored thread
 *
 * @param threadId - Valid thread id
 * @param requestingUserId -
 * @returns the expanded thread info object
 */
async function populateThreadInfo(
  threadId: string,
  requestingUserId?: string,
): Promise<ThreadInfo> {
  const doc = await ThreadModel.findById(threadId).lean();
  if (!doc) throw new Error(`Failed to find thread ${threadId}`);
  return {
    threadId,
    title: doc.title,
    text: doc.text,
    createdBy: await populateSafeUserInfo(doc.createdBy),
    createdAt: new Date(doc.createdAt),
    comments: await Promise.all(
      doc.comments.map((commentId) => populateCommentInfo(commentId, requestingUserId)),
    ),
  };
}

/**
 * Expand just the summary information for a stored thread
 *
 * @param threadId - Valid thread id
 * @returns the expanded thread info object
 */
async function populateThreadSummary(threadId: string): Promise<ThreadSummary> {
  const doc = await ThreadModel.findById(threadId).lean();
  if (!doc) throw new Error(`Failed to find thread ${threadId}`);
  return {
    threadId,
    title: doc.title,
    createdBy: await populateSafeUserInfo(doc.createdBy),
    createdAt: new Date(doc.createdAt),
    comments: doc.comments.length,
  };
}

/**
 * Create and store a new thread
 *
 * @param user - The thread poster
 * @param contents - Title and text of the thread
 * @param createdAt - Creation time for this thread
 * @returns the new thread's info object
 */
export async function createThread(
  user: UserWithId,
  { title, text }: CreateThreadMessage,
  createdAt: Date,
): Promise<ThreadInfo> {
  const id = randomUUID().toString();
  await ThreadModel.create({
    _id: id,
    title,
    text,
    createdAt: createdAt.toISOString(),
    createdBy: user.userId,
    comments: [],
  });
  return populateThreadInfo(id);
}

/**
 * Retrieves a single thread from the database
 *
 * @param possibleThreadId - Ostensible thread ID
 * @param requestingUserId - The user triggering the request
 * @returns the thread, or null if no thread with that ID exists
 */
export async function getThreadById(
  possibleThreadId: string,
  requestingUserId?: string,
): Promise<ThreadInfo | null> {
  const exists = await ThreadModel.exists({ _id: possibleThreadId });
  if (!exists) return null;
  return populateThreadInfo(possibleThreadId, requestingUserId);
}

/**
 * Get a list of all threads
 *
 * @returns a list of thread summaries, ordered reverse chronologically by creation date
 */
export async function getThreadSummaries(): Promise<ThreadSummary[]> {
  const docs = await ThreadModel.find({}, { _id: 1 }).lean();
  const ids = docs.map((d) => d._id);
  const unsorted = await Promise.all(ids.map(populateThreadSummary));

  return unsorted.toSorted(
    (thread1, thread2) => thread2.createdAt.getTime() - thread1.createdAt.getTime(),
  );
}

/**
 * Add a comment id to a thread
 * @param possibleThreadId - Ostensible thread ID
 * @param user - Commenting user
 * @param text - Contents of the thread
 * @param createdAt - Creation time for thread
 * @returns the updated thread with comment attached, or null if the thread does not exist
 */
export async function addCommentToThread(
  possibleThreadId: string,
  user: UserWithId,
  text: string,
  createdAt: Date,
): Promise<ThreadInfo | null> {
  const exists = await ThreadModel.exists({ _id: possibleThreadId });
  if (!exists) return null;
  const comment = await createComment(user, text, createdAt);
  await ThreadModel.findByIdAndUpdate(possibleThreadId, {
    $push: { comments: comment.commentId },
  });
  return populateThreadInfo(possibleThreadId);
}

import {
  addCommentToThread,
  createThread,
  getThreadById,
  getThreadSummaries,
} from "../services/thread.service.ts";
import { type ThreadInfo, type ThreadSummary, zCreateThreadMessage } from "@gamenite/shared";
import { type RestAPI } from "../types.ts";
import { z } from "zod";

/**
 * Handle GET requests to `/api/thread/list`. Returns all threads in reverse
 * chronological order by creation.
 */
export const getList: RestAPI<ThreadSummary[]> = async (req, res) => {
  res.send(await getThreadSummaries());
};

/**
 * Handle GET requests to `/api/thread/:id`. Returns either 404 or a thread
 * info object.
 */
export const getById: RestAPI<ThreadInfo, { id: string }> = async (req, res) => {
  const thread = await getThreadById(req.params.id);
  if (!thread) {
    res.status(404).send({ error: "Thread not found" });
    return;
  }

  res.send(thread);
};

/**
 * Handle POST requests to `/api/thread/create` that post a new thread.
 */
export const postCreate: RestAPI<ThreadInfo> = async (req, res) => {
  const body = z.object({ payload: zCreateThreadMessage }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  res.send(await createThread(req.authUser, body.data.payload, new Date()));
};

/**
 * Handle POST requests to `/api/thread/:id/comment` that post a new
 * comment to a thread.
 */
export const postByIdComment: RestAPI<ThreadInfo, { id: string }> = async (req, res) => {
  const body = z.object({ payload: z.string() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const thread = await addCommentToThread(
    req.params.id,
    req.authUser,
    body.data.payload,
    new Date(),
  );
  if (!thread) {
    res.status(404).send({ error: "Thread not found" });
    return;
  }

  res.send(thread);
};

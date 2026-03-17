import type { APIResponse } from "../util/types.ts";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { CreateThreadMessage, ErrorMsg, ThreadInfo, ThreadSummary } from "@gamenite/shared";

const THREAD_API_URL = `/api/thread`;

/**
 * Sends a GET request to get all threads
 */
export const threadList = async (): APIResponse<ThreadSummary[]> => {
  try {
    const res = await api.get<ThreadSummary[] | ErrorMsg>(`${THREAD_API_URL}/list`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a GET request to get an individual thread
 */
export const threadInfo = async (id: string): APIResponse<ThreadInfo> => {
  try {
    const res = await api.get<ThreadInfo | ErrorMsg>(`${THREAD_API_URL}/${id}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a POST request to add a comment to a thread
 */
export const addCommentToThread = async (id: string, payload: string): APIResponse<ThreadInfo> => {
  try {
    const res = await api.post<ThreadInfo | ErrorMsg>(`${THREAD_API_URL}/${id}/comment`, {
      payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a POST request to create a new thread
 */
export const createThread = async (payload: CreateThreadMessage): APIResponse<ThreadInfo> => {
  try {
    const res = await api.post<ThreadInfo | ErrorMsg>(`${THREAD_API_URL}/create`, { payload });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

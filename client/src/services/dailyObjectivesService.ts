import type { DailyObjectivesResponse, ErrorMsg } from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const OBJECTIVES_API_URL = "/api/game/daily/objectives";

/** Fetch today's daily objectives and the current user's progress. */
export const getDailyObjectives = async (): APIResponse<DailyObjectivesResponse> => {
  try {
    const res = await api.get<DailyObjectivesResponse | ErrorMsg>(OBJECTIVES_API_URL);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

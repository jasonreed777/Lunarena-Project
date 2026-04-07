import type { ErrorMsg, ClanLeaderboardEntry } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getClanRankings } from "../services/clanService.ts";

/**
 * Custom hook to get the cross-clan rankings.
 */
export default function useClanRankings(
  refetchKey?: number,
): { message: string } | ClanLeaderboardEntry[] {
  const [data, setData] = useState<ClanLeaderboardEntry[] | ErrorMsg | null>(null);

  useEffect(() => {
    getClanRankings().then(setData);
  }, [refetchKey]);

  if (!data) return { message: "Loading..." };
  if ("error" in data) return { message: `Error: ${data.error}` };
  return data;
}

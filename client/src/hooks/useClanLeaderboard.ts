import type { ErrorMsg, ClanMemberPointsEntry } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getClanLeaderboard } from "../services/clanService.ts";

/**
 * Custom hook to get the clan member points leaderboard.
 */
export default function useClanLeaderboard(
  clanId: string | undefined,
): { message: string } | ClanMemberPointsEntry[] {
  const [data, setData] = useState<ClanMemberPointsEntry[] | ErrorMsg | null>(null);

  useEffect(() => {
    if (!clanId) return;
    getClanLeaderboard(clanId).then(setData);
  }, [clanId]);

  if (!clanId) return { message: "No clan" };
  if (!data) return { message: "Loading..." };
  if ("error" in data) return { message: `Error: ${data.error}` };
  return data;
}

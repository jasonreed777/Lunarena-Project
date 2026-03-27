import type { ErrorMsg, ClanInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { listPublicClans } from "../services/clanService.ts";

/**
 * Custom hook to get the list of all public clans.
 */
export default function useClanList(refetchKey?: number): { message: string } | ClanInfo[] {
  const [clans, setClans] = useState<ClanInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    listPublicClans().then(setClans);
  }, [refetchKey]);

  if (!clans) return { message: "Loading..." };
  if ("error" in clans) return { message: `Error: ${clans.error}` };
  return clans;
}

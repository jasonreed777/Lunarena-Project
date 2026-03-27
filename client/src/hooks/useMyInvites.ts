import type { ErrorMsg, ClanInviteInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getMyInvites } from "../services/clanService.ts";

/**
 * Custom hook to get the current user's pending clan invites.
 */
export default function useMyInvites(refetchKey?: number): { message: string } | ClanInviteInfo[] {
  const [invites, setInvites] = useState<ClanInviteInfo[] | ErrorMsg | null>(null);

  useEffect(() => {
    getMyInvites().then(setInvites);
  }, [refetchKey]);

  if (!invites) return { message: "Loading..." };
  if ("error" in invites) return { message: `Error: ${invites.error}` };
  return invites;
}

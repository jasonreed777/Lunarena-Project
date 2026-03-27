import type { ErrorMsg, ClanInviteInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getClanInvites } from "../services/clanService.ts";

/**
 * Custom hook to get pending invites/requests for a clan (admin/owner only).
 * Skips fetch when clanId is null.
 */
export default function useClanInvites(
  clanId: string | null,
  refetchKey?: number,
): { message: string } | ClanInviteInfo[] {
  const [invites, setInvites] = useState<ClanInviteInfo[] | ErrorMsg | null>(clanId ? null : []);

  useEffect(() => {
    if (!clanId) return;
    getClanInvites(clanId).then(setInvites);
  }, [clanId, refetchKey]);

  if (!invites) return { message: "Loading..." };
  if ("error" in invites) return { message: `Error: ${invites.error}` };
  return invites;
}

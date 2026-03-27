import type { ErrorMsg, UserClanInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import { getCurrentUserClan } from "../services/clanService.ts";

/**
 * Custom hook to get the current user's clan membership.
 * Returns:
 * - { message: string } while loading or on error
 * - { data: UserClanInfo | null } when loaded (null = user has no clan)
 */
export default function useUserClan(
  refetchKey?: number,
): { message: string } | { data: UserClanInfo | null } {
  const [result, setResult] = useState<UserClanInfo | null | ErrorMsg | undefined>(undefined);

  useEffect(() => {
    getCurrentUserClan().then(setResult);
  }, [refetchKey]);

  if (result === undefined) return { message: "Loading..." };
  if (result && typeof result === "object" && "error" in result)
    return { message: `Error: ${result.error}` };
  if (!result || typeof result !== "object" || !("clan" in result)) return { data: null };
  return { data: result };
}

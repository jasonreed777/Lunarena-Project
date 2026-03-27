/**
 * Service for interacting with user achievements
 * @param username username of user to get achievements for
 * @returns promise resolving to array of achievements earned by the user, including title and description
 */
export async function getUserAchievements(
  username: string,
): Promise<{ achievementId: string; title: string; description: string; achievedAt: string }[]> {
  const res = await fetch(`/api/achievements/${username}`);

  if (!res.ok) {
    throw new Error("Failed to fetch user achievements");
  }

  return res.json() as Promise<
    { achievementId: string; title: string; description: string; achievedAt: string }[]
  >;
}

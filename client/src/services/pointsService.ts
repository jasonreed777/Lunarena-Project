export async function getUserPoints(username: string): Promise<number> {
  const res = await fetch(`/api/points/${username}`);

  if (!res.ok) {
    throw new Error("Failed to fetch user points");
  }

  return res.json() as Promise<number>;
}
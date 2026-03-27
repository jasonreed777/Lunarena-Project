import { UserGameStatsModel } from "../mongoose-models.ts";

/**
 * Records a win for a user in a given game type by updating their overall and per-game stats.
 * @param username user to award win to
 * @param gameType game type of the win (e.g. "nim")
 * @returns Promise that resolves when the operation is complete
 */
export async function recordWin(username: string, gameType: string) {
  const now = new Date().toISOString();
  const stats = await UserGameStatsModel.findById(username);

  if (!stats) {
    await UserGameStatsModel.create({
      _id: username,
      winsTotal: 1,
      gamesPlayedTotal: 1,
      byGame: {
        [gameType]: {
          wins: 1,
          gamesPlayed: 1,
        },
      },
      updatedAt: now,
    });
    return;
  }

  stats.winsTotal += 1;
  stats.gamesPlayedTotal += 1;

  const gameStats = stats.byGame.get(gameType) ?? { wins: 0, gamesPlayed: 0 };
  gameStats.wins += 1;
  gameStats.gamesPlayed += 1;
  stats.byGame.set(gameType, gameStats);

  stats.updatedAt = now;
  await stats.save();
}

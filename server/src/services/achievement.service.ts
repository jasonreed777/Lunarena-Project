import { randomUUID } from "node:crypto";
import { AchievementModel, UserAchievementModel, UserGameStatsModel } from "../mongoose-models.ts";
import { awardPoints } from "./points.service.ts";

// Defines the shape of an achievement
type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  pointsAwarded: number;
};

// Milestone win counts for overall and per-game achievements
const GAME_WIN_MILESTONE_VALUES = [1, 5, 10, 25, 50, 100];
const OVERALL_WIN_MILESTONE_VALUES = [1, 10, 25, 100, 250];

// Defines shape of game-specific win achievements to be generated
type GameWinMilestone = {
  wins: number;
  titleSuffix: string;
  pointsAwarded: number;
};

// Predefined overall win achievements
const OVERALL_WIN_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-win",
    title: "First Win",
    description: "Win your first game.",
    pointsAwarded: 5,
  },
  {
    id: "10-wins",
    title: "10 Wins",
    description: "Win 10 total games.",
    pointsAwarded: 10,
  },
  {
    id: "25-wins",
    title: "25 Wins",
    description: "Win 25 total games.",
    pointsAwarded: 25,
  },
  {
    id: "100-wins",
    title: "100 Wins",
    description: "Win 100 total games.",
    pointsAwarded: 100,
  },
  {
    id: "250-wins",
    title: "250 Wins",
    description: "Win 250 total games.",
    pointsAwarded: 250,
  },
];

// Milestone-based achievements for wins in specific game types will be generated below
const GAME_WIN_MILESTONES: GameWinMilestone[] = [
  { wins: 1, titleSuffix: "Newbie", pointsAwarded: 1 },
  { wins: 5, titleSuffix: "Rookie", pointsAwarded: 5 },
  { wins: 10, titleSuffix: "Novice", pointsAwarded: 10 },
  { wins: 25, titleSuffix: "Intermediate", pointsAwarded: 25 },
  { wins: 50, titleSuffix: "Expert", pointsAwarded: 50 },
  { wins: 100, titleSuffix: "Champion", pointsAwarded: 100 },
];

/**
 * Makes achievement definitions for win milestones in a specific game type (e.g. "nim-10-wins" achievement for winning 10 nim games)
 * @param gameType type of game to make achievements for
 * @param gameLabel label of game to make achievements for
 * @returns array of achievement definitions for the given game type
 */
function makeGameWinAchievements(gameType: string, gameLabel: string): AchievementDefinition[] {
  return GAME_WIN_MILESTONES.map(
    (milestone): AchievementDefinition => ({
      id: `${gameType}-${milestone.wins}-wins`,
      title: `${gameLabel} ${milestone.titleSuffix}`,
      description: `Win ${milestone.wins} ${gameLabel} game${milestone.wins === 1 ? "" : "s"}.`,
      pointsAwarded: milestone.pointsAwarded,
    }),
  );
}
// All achievement definitions in the system
// Need to add to this when new games are added
const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  ...OVERALL_WIN_ACHIEVEMENTS,
  ...makeGameWinAchievements("nim", "Nim"),
  ...makeGameWinAchievements("guess", "Number Guesser"),
  ...makeGameWinAchievements("minesweeper", "Minesweeper"),
  ...makeGameWinAchievements("circleconnect", "Circle Connect"),

];

/**
 * Inserts all achievement definitions into the database if they don't already exist
 */
export async function initializeAchievements(): Promise<void> {
  // Loop through all achievements and upsert them into the database
  for (const achievement of ALL_ACHIEVEMENTS) {
    await AchievementModel.findByIdAndUpdate(
      achievement.id,
      {
        _id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        pointsAwarded: achievement.pointsAwarded,
      },
      { upsert: true, new: true },
    );
  }
}

/**
 * Awards an achievement to a user if they don't already have it, and awards the associated points.
 * @param username username to who achievement should be awarded to
 * @param achievementId achievevement ID to reward (must exist in Achievement collection)
 * @returns Resolve when operation is complete
 */
export async function awardAchievement(username: string, achievementId: string): Promise<void> {
  const existingUserAchievement = await UserAchievementModel.findOne({
    username,
    achievementId,
  });
  // If the user already has this achievement, do nothing
  if (existingUserAchievement) {
    return;
  }
  // Ensure achievement with the given ID exists
  const achievement = await AchievementModel.findById(achievementId);
  if (!achievement) {
    throw new Error(`achievement ${achievementId} not found`);
  }
  // Create the user achievement record
  await UserAchievementModel.create({
    _id: randomUUID(),
    username,
    achievementId,
    achievedAt: new Date().toISOString(),
  });
  // Award the points for this achievement
  await awardPoints(
    username,
    achievement.pointsAwarded,
    "achievement",
    achievement.title,
    achievementId,
  );
}

/**
 * Checks and awards win-based achievements
 * @param username user to check achievements for
 * @param gameType game type of the win to check (e.g. "nim")
 * @returns resolve when checks and awards are complete
 */
export async function checkWinAchievements(username: string, gameType: string) {
  const stats = await UserGameStatsModel.findById(username);
  if (!stats) return;

  const totalWins = stats.winsTotal;
  const gameWins = stats.byGame.get(gameType)?.wins ?? 0;

  if (OVERALL_WIN_MILESTONE_VALUES.includes(totalWins)) {
    const overallAchievementId = totalWins === 1 ? "first-win" : `${totalWins}-wins`;
    await awardAchievement(username, overallAchievementId);
  }

  if (GAME_WIN_MILESTONE_VALUES.includes(gameWins)) {
    const gameAchievementId = `${gameType}-${gameWins}-wins`;
    await awardAchievement(username, gameAchievementId);
  }
}

/**
 * Gets all achievements earned by a user, along with their titles and descriptions
 * @param username username to get achievements for
 * @returns array of earned achievements for the user
 */
export async function getUserAchievements(username: string) {
  const userAchievements = await UserAchievementModel.find({ username }).lean();

  const achievements = await Promise.all(
    userAchievements.map(async (userAchievement) => {
      const achievement = await AchievementModel.findById(userAchievement.achievementId).lean();

      return {
        achievementId: userAchievement.achievementId,
        title: achievement?.title ?? userAchievement.achievementId,
        description: achievement?.description ?? "",
        achievedAt: userAchievement.achievedAt,
      };
    }),
  );

  return achievements;
}

import mongoose, { Schema } from "mongoose";
import type {
  GameChatRecord,
  ClanInviteRecord,
  ClanMemberRecord,
  ClanRecord,
  CommentRecord,
  FriendshipRecord,
  GameRecord,
  GameChatMessageRecord,
  ThreadRecord,
  UserRecord,
  UserProfileRecord,
  TitleRecord,
  UploadedImageRecord,
  UserPointsRecord,
  PointsLedgerRecord,
  AchievementRecord,
  UserAchievementRecord,
  UserGameStatsRecord,
  DMChatRecord,
  DMChatMessageRecord,
} from "./models.ts";

const opts = { versionKey: false } as const;

// UserProfile: _id is the userId (UUID)
const PfpSchema = new Schema({ type: String, uploadId: String, avatarId: String }, { _id: false });

// User: _id is a UUID
export const UserModel = mongoose.model<UserRecord & { _id: string }>(
  "user",
  new Schema(
    {
      _id: String,
      username: String,
      display: String,
      createdAt: String,
      pfp: PfpSchema,
      profileBorderColor: String,
    },
    opts,
  ),
);

// Chat: _id is a UUID
const MoveLogEntrySchema = new Schema(
  { moveDescription: String, userId: String, createdAt: String },
  { _id: false },
);
export const GameChatModel = mongoose.model<GameChatRecord & { _id: string }>(
  "chat",
  new Schema(
    {
      _id: String,
      messages: [String],
      moveLog: [MoveLogEntrySchema],
      createdAt: String,
    },
    opts,
  ),
);

// Comment: _id is a UUID
export const CommentModel = mongoose.model<CommentRecord & { _id: string }>(
  "comment",
  new Schema(
    {
      _id: String,
      text: String,
      createdBy: String,
      createdAt: String,
      editedAt: String,
    },
    opts,
  ),
);

// Message: _id is a UUID
export const GameChatMessageModel = mongoose.model<GameChatMessageRecord & { _id: string }>(
  "message",
  new Schema({ _id: String, text: String, createdBy: String, createdAt: String }, opts),
);

export const DMChatModel = mongoose.model<DMChatRecord>(
  "DMChat",
  new Schema({ participants: [String], createdAt: Date, lastMessageAt: Date }, opts).index({
    participants: 1,
    lastMessageAt: -1,
  }),
);

export const DMChatMessageModel = mongoose.model<DMChatMessageRecord>(
  "DMChatMessage",
  new Schema({ sender: String, timestamp: Date, chat: String, text: String }, opts).index({
    chat: 1,
    timestamp: -1,
  }),
);

// Thread: _id is a UUID
export const ThreadModel = mongoose.model<ThreadRecord & { _id: string }>(
  "thread",
  new Schema(
    {
      _id: String,
      title: String,
      text: String,
      createdAt: String,
      createdBy: String,
      comments: [String],
    },
    opts,
  ),
);

// Game: _id is a UUID
export const GameModel = mongoose.model<GameRecord & { _id: string }>(
  "game",
  new Schema(
    {
      _id: String,
      type: String,
      state: Schema.Types.Mixed,
      done: Boolean,
      chat: String,
      players: [String],
      createdAt: String,
      createdBy: String,
    },
    opts,
  ),
);

const OnlinePresenceSchema = new Schema(
  { status: String, activeGameId: String, lastActive: String },
  { _id: false },
);
export const UserProfileModel = mongoose.model<UserProfileRecord & { _id: string }>(
  "userProfile",
  new Schema(
    {
      _id: String,
      username: String,
      bio: String,
      pfp: PfpSchema,
      titleId: String,
      profileBorderColor: String,
      updatedAt: String,
      onlinePresence: OnlinePresenceSchema,
    },
    opts,
  ),
);

// Title: _id is a UUID
export const TitleModel = mongoose.model<TitleRecord & { _id: string }>(
  "title",
  new Schema({ _id: String, titleId: String, titleLabel: String }, opts),
);

// UploadedImage: _id is a UUID
export const UploadedImageModel = mongoose.model<UploadedImageRecord & { _id: string }>(
  "uploaded_image",
  new Schema(
    {
      _id: String,
      userWhoUploaded: String,
      contentType: String,
      data: String,
      uploadedAt: String,
    },
    opts,
  ),
);

// Friendship: _id is a UUID
export const FriendshipModel = mongoose.model<FriendshipRecord & { _id: string }>(
  "friendship",
  new Schema(
    {
      _id: String,
      senderId: String,
      receiverId: String,
      status: String,
      createdAt: String,
      updatedAt: String,
    },
    opts,
  ),
);

// Clan: _id is a UUID
export const ClanModel = mongoose.model<ClanRecord & { _id: string }>(
  "clan",
  new Schema(
    {
      _id: String,
      name: { type: String, unique: true },
      bio: String,
      color: String,
      pfp: String,
      isPublic: Boolean,
      createdAt: String,
    },
    opts,
  ),
);

// ClanMember: _id is a UUID
export const ClanMemberModel = mongoose.model<ClanMemberRecord & { _id: string }>(
  "clanMember",
  new Schema(
    {
      _id: String,
      clanId: { type: String, index: true },
      userId: { type: String, index: true, unique: true },
      role: String,
      joinedAt: String,
    },
    opts,
  ),
);

// ClanInvite: _id is a UUID
export const ClanInviteModel = mongoose.model<ClanInviteRecord & { _id: string }>(
  "clanInvite",
  new Schema(
    {
      _id: String,
      clanId: { type: String, index: true },
      userId: { type: String, index: true },
      type: String,
      status: String,
      invitedBy: String,
      createdAt: String,
    },
    opts,
  ),
);

// UserPoints: one record per user (_id is a username)
export const UserPointsModel = mongoose.model<UserPointsRecord & { _id: string }>(
  "userPoints",
  new Schema(
    {
      _id: String,
      pointsTotal: Number,
      updatedAt: String,
    },
    opts,
  ),
);

// PointsLedger: one record per point-award event (_id = UUID)
export const PointsLedgerModel = mongoose.model<PointsLedgerRecord & { _id: string }>(
  "pointsLedger",
  new Schema(
    {
      _id: String,
      username: String,
      pointsAdded: Number,
      reasonType: String,
      reason: String,
      refId: String,
      createdAt: String,
    },
    opts,
  ),
);

// Achievement: one record per achievement definition (_id = achievement id)
export const AchievementModel = mongoose.model<AchievementRecord & { _id: string }>(
  "achievement",
  new Schema(
    {
      _id: String,
      title: String,
      description: String,
      pointsAwarded: Number,
    },
    opts,
  ),
);

// UserAchievement: one record per earned achievement (_id = UUID)
export const UserAchievementModel = mongoose.model<UserAchievementRecord & { _id: string }>(
  "userAchievement",
  new Schema(
    {
      _id: String,
      username: String,
      achievementId: String,
      achievedAt: String,
    },
    opts,
  ),
);

// To be used insider UserGameStats, to get game stats for each game type
const PerGameTypeStatsSchema = new Schema(
  {
    wins: Number,
    gamesPlayed: Number,
  },
  { _id: false },
);

// UserGameStats: stores each user's overall and per game type game stats (_id = username)
export const UserGameStatsModel = mongoose.model<UserGameStatsRecord & { _id: string }>(
  "userGameStats",
  new Schema(
    {
      _id: String,
      winsTotal: Number,
      gamesPlayedTotal: Number,
      byGame: { type: Map, of: PerGameTypeStatsSchema },
      updatedAt: String,
    },
    opts,
  ),
);

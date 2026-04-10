import {
  type ClientToServerEvents,
  type ErrorMsg,
  type MessageInfo,
  type SafeUserInfo,
  type ServerToClientEvents,
} from "@gamenite/shared";
import { Socket } from "socket.io-client";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Any REST API endpoint that returns `T` must return a promise, and always
 * includes the possibility of failure, so `APIResponse<T>` is shorthand for
 * `Promise<T | { error: string }>`. To check for the error condition in
 * TypeScript, use the `if ('error' in obj)` test.
 */
export type APIResponse<T> = Promise<T | ErrorMsg>;

/**
 * In addition to messages, chats can include socket-introduced messages
 * that a user entered or left the chat, as well as game move log entries.
 */
export type ChatMessage =
  | MessageInfo
  | { messageId: string; meta: "entered"; dateTime: Date; user: SafeUserInfo }
  | { messageId: string; meta: "left"; dateTime: Date; user: SafeUserInfo }
  | {
      messageId: string;
      meta: "move";
      dateTime: Date;
      moveDescription: string;
      user: SafeUserInfo;
    };

export interface GameProps<View, Move> {
  userPlayerIndex: number;
  players: SafeUserInfo[];
  view: View;
  makeMove: (move: Move) => void;
}

/**
 * Record identifiers used to look up keys in a database. This type
 * abbreviation is intended to suggest that the key should be a randomly
 * generated unique ID.
 */
export type RecordId = string;

/**
 * Represents a user's profile information for customization
 * - `username`: the user's username, which references the User record
 * - `bio`: a short biography or description provided by the user
 * - `pfp`: profile picture information, which can be either an uploaded image or a selected avatar
 * - `titleId`: an optional reference to a title that the user has chosen to display on their profile
 * - `profileBorderColor`: a hex code representing the color of the user's profile border
 * - `updatedAt`: when the profile was last updated
 * - `onlinePresence`: information about the user's current online status and activity
 */
export interface UserProfileRecord {
  username: string; // References User records
  bio: string;
  pfp: {
    type: "upload" | "avatar";
    uploadId?: string; // References an uploaded image, if type is "upload"
    avatarId?: string; // Avatar identifier, if type is "avatar"
  };
  titleId?: string; // References a title that the user has chosen to display
  profileBorderColor: string; // Hex code for the color of the user's profile border
  updatedAt: Date; // When profile was last updated
  onlinePresence: {
    status: "active" | "offline"; // User's current online status
    activeGameId?: RecordId; // References a Game record if the user is currently in a game
    lastActive: Date; // When the user was last active on the site
  };
}

/**
 * Two theme types - light and dark. This can be expanded later if needed
 */
export type Theme = "light" | "dark";

/**
 * Represents a color theme with various values,
 */
export type ColorTheme = {
  _id: Theme;
  primary: string;
  secondary: string;
  text: string;
  secondaryText: string;
  navBar: string;
  navButton: string;
};

/**
 * Two color themes, each corresponding with light and dark
 */
export const Colors: Record<Theme, ColorTheme> = {
  light: {
    _id: "light",
    primary: "#ffffff",
    secondary: "#24989e",
    text: "#252525",
    secondaryText: "#535353",
    navBar: "#ffffff",
    navButton: "#119C26",
  },
  dark: {
    _id: "dark",
    primary: "#000000",
    secondary: "#14dce7",
    text: "#ffffff",
    secondaryText: "#c1c1c1",
    navBar: "#252525",
    navButton: "#2ad143",
  },
};

/**
 * Represents a color with red, green, and blue values
 */
export type RGBColor = { r: number; g: number; b: number };

/**
 * Various sizes of avatars/profile pictures.
 */
export type AvatarSize = "small" | "medium" | "large";

/**
 * Maps each avatar size to a pixel corresponding to the width/height of the image
 */
export const AvatarSizeToPixelMap: Record<AvatarSize, number> = {
  small: 30,
  medium: 50,
  large: 100,
};

/**
 * Type for the daily points of the activity graph.
 */
export type DailyPoints = {
  points: number;
  date: Date;
};

/**
 * Leaderboard props used for various leaderboards in GameNite.
 */
export type LeaderboardProps = {
  name: string;
  pointsTotal: number;
  gamesPlayedTotal?: number;
  achievementCount?: number;
}[];

/**
 * Maps a color to the top three trophy spots (gold, silver, bronze)
 */
export const TrophyColorMap: Record<number, string> = {
  0: "#fdb913",
  1: "#767f81",
  2: "#c78543",
};

/**
 * Maps each path of GameNite to an assocaiated color.
 */
export const PathColorMap: Record<string, string> = {
  "/": "#25808a",
  "/games": "#e05a35",
  "/daily": "#3f6c92",
  "/clan": "#734189",
  "/forum": "#f7cd59",
  "/messages": "#298432",
  "/friends": "#09d8fc",
  "/profile": "#ffffff",
};

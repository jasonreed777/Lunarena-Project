import type { GameKey } from "@gamenite/shared";

/**
 * Record identifiers used to look up keys in a database. This type
 * abbreviation is intended to suggest that the key should be a randomly
 * generated unique ID.
 */
export type RecordId = string;

/**
 * Actual JavaScript Date objects can't necessarily be stored in a database;
 * this type indicates that the string should be the result of taking a Date
 * object and turning it to a string with the Date.toISOString() method.
 */
export type DateISO = string;

/**
 * Represents a user's authorization record in the database.
 * - `user`: the user ID of the corresponding User model
 * - `password`: the password for this user
 */
export interface AuthRecord {
  userId: RecordId; // References User models
  password: string;
}

/**
 * Represents a chat document in the database.
 * - `messages`: the ordered list of messages in the chat
 * - `moveLog`: the ordered list of move log entries for this chat
 * - `createdAt`: when the chat was created
 */
export interface ChatRecord {
  messages: RecordId[]; // References Message models
  moveLog: MoveLogEntry[];
  createdAt: DateISO;
}

/**
 * Represents a game move log entry stored in a chat.
 * - `moveDescription`: human-readable description of the move
 * - `userId`: the user who made the move
 * - `createdAt`: when the move was made
 */
export interface MoveLogEntry {
  moveDescription: string;
  userId: RecordId;
  createdAt: DateISO;
}

/**
 * Represents a comment in the database.
 * - `text`: comment contents
 * - `createdBy`: username of the commenter
 * - `createdAt`: when the comment was made
 * - `editedAt`: when the comment was last modified
 */
export interface CommentRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
  editedAt?: DateISO;
}

/**
 * Represents a game document in the database.
 * - `type`: picks which game this is
 * - `state`: absent if the game hasn't started, or the id for the game's state
 * - `chat`: id for the game's chat
 * - `players`: active players for the game
 * - `createdAt`: when the game was created
 * - `createdBy`: username of the person who created the game
 */
export interface GameRecord {
  type: GameKey;
  state?: unknown;
  done: boolean;
  chat: RecordId; // References Chat records
  players: RecordId[]; // References User records
  createdAt: DateISO;
  createdBy: RecordId; // References User records
}

/**
 * Represents a message in the database.
 * - `text`: message contents
 * - `createdBy`: username of message sender
 * - `createdAt`: when the message was sent
 */
export interface MessageRecord {
  text: string;
  createdBy: RecordId; // References User records
  createdAt: DateISO;
}

/**
 * Represents a forum post as it's stored in the database.
 * - `title`: post title
 * - `text`: post contents
 * - `createdAt`: when the thread was posted
 * - `createdBy`: username of OP
 * - `comments`: replies to the post
 */
export interface ThreadRecord {
  title: string;
  text: string;
  createdAt: DateISO;
  createdBy: RecordId; // References User records
  comments: RecordId[]; // References Comment records
}

/**
 * Represents a user document in the database
 * - `password`: user's password
 * - `display`: A display name
 * - `createdAt`: when this user registered
 */
export interface UserRecord {
  username: string; // References Auth records
  display: string;
  createdAt: DateISO;
}

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
    uploadIf?: string; // References an uploaded image, if type is "upload"
    avatarId?: string; // Avatar identifier, if type is "avatar"
  };
  titleId?: string; // References a title that the user has chosen to display
  profileBorderColor: string; // Hex code for the color of the user's profile border
  updatedAt: DateISO; // When profile was last updated
  onlinePresence: {
    status: "active" | "inactive" | "offline"; // User's current online status
    activeGameId?: RecordId; // References a Game record if the user is currently in a game
    lastActive: DateISO; // When the user was last active on the site
  };
}

/**
 * Represents a title that users can choose to display on their profile
 * - `titleId`: a unique identifier for the title
 * - `titleLabel`: a human-readable name for the title
 */
export interface TitleRecord {
  titleId: string; // Unique identifier for the title
  titleLabel: string; // Human-readable name for the title
}

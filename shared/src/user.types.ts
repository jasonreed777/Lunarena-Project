import { z } from "zod";

/**
 * Represents a "safe" user object that excludes sensitive information like
 * the password, suitable for exposing to clients,
 * - `username`: unique username of the user
 * - `display`: A display name
 * - `createdAt`: when this when the user registered.
 * - `pfp`: The user's profile picture. Can either be uploaded or an avatar.
 * - `profileBorderColor`: The user's preferred color for their profile.
 */
export interface SafeUserInfo {
  username: string;
  display: string;
  createdAt: Date;
  pfp: {
    type: "upload" | "avatar";
    uploadId?: string; // References an uploaded image, if type is "upload"
    avatarId?: string; // Avatar identifier, if type is "avatar"
  };
  profileBorderColor: string;
}

/*** TYPES USED IN THE USER API ***/

/**
 * Represents allowed updates to a user.
 */
export type UserUpdateRequest = z.infer<typeof zUserUpdateRequest>;
export const zUserUpdateRequest = z.object({
  password: z.string().optional(),
  display: z.string().optional(),
});

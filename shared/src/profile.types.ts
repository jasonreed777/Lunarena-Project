import { z } from "zod";

/**
 * Represents allowed updates to a user's profile customization
 */
export type UserProfileUpdateRequest = z.infer<typeof zUserProfileUpdateRequest>;

export const zUserProfileUpdateRequest = z.object({
  bio: z.string().optional(),

  pfp: z
    .object({
      type: z.enum(["upload", "avatar"]),
      uploadId: z.string().optional(),
      avatarId: z.string().optional(),
    })
    .optional(),

  titleId: z.string().optional(),

  profileBorderColor: z.string().optional(),

  onlinePresence: z
    .object({
      status: z.enum(["active", "inactive", "offline"]),
      activeGameId: z.string().optional(),
      lastActive: z.string(),
    })
    .optional(),
});

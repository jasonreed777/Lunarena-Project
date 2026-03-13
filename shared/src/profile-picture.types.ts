import { z } from "zod";

/**
 * Represents allowed updates to a user's profile picture
 */
export type UserProfileImageUploadRequest = z.infer<typeof zUserProfileImageUploadRequest>;

export const zUserProfileImageUploadRequest = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  data: z.string().min(1),
});

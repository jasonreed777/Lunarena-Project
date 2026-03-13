import { z } from "zod";

/**
 * Represents a username/password pair passed for authentication.
 */
export type UserAuth = z.infer<typeof zUserAuth>;
export const zUserAuth = z.object({
  username: z.string(),
  password: z.string(),
});

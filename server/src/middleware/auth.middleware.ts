import { type RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.ts";
import { UserModel } from "../mongoose-models.ts";

/**
 * Express middleware that validates a betterAuth session from request cookies/headers.
 * If valid, attaches `authUser: { userId, username }` to the request.
 * Returns 401 if no valid session is found.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).send({ error: "Not authenticated" });
    return;
  }

  const appUser = await UserModel.findOne({ username: session.user.username }).lean();
  if (!appUser) {
    res.status(401).send({ error: "User not found" });
    return;
  }

  req.authUser = { userId: appUser._id, username: appUser.username };
  next();
};

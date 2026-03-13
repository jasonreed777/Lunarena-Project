import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getByUsername,
  postByUsername,
  postUploadByUsername,
} from "../src/controllers/profile.controller.ts";
import { getProfileByUsername } from "../src/services/profile.service.ts";
import { createUser } from "../src/services/user.service.ts";

afterEach(() => {
  vi.resetAllMocks();
});

function makeRes() {
  const res = {
    status: vi.fn(() => res),
    send: vi.fn(),
  };
  return res;
}

describe("profile.controller", () => {
  describe("getByUsername", () => {
    it("should return a user's profile for a valid username", async () => {
      await createUser("profileUser1", "pwd1111", new Date());

      const req = {
        params: { username: "profileUser1" },
      } as unknown as Parameters<typeof getByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof getByUsername>[1];
      // wait for the default profile to be retrieved
      await getByUsername(req, res);
      // should not have returned an error
      expect(res.status).not.toHaveBeenCalled();
      // should have returned the profile
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "profileUser1",
        }),
      );
    });

    it("should return 404 if the user does not exist", async () => {
      const req = {
        params: { username: "nonExistentUser" },
      } as unknown as Parameters<typeof getByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof getByUsername>[1];

      await getByUsername(req, res);
      // should have returned a 404 error
      expect(res.status).toHaveBeenCalledWith(404);
      // should have returned an error message
      expect(res.send).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("postByUsername", () => {
    it("should reject a malformed request body", async () => {
      await createUser("profileUser2", "pwd1111", new Date());

      const req = {
        params: { username: "profileUser2" },
        body: { bad: "data" },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);
      // should have returned a 400 error
      expect(res.status).toHaveBeenCalledWith(400);
      // should have returned an error message
      expect(res.send).toHaveBeenCalledWith({ error: "Bad request" });
    });

    it("should reject invalid credentials", async () => {
      await createUser("profileUser3", "pwd1111", new Date());

      const req = {
        params: { username: "profileUser3" },
        body: {
          auth: { username: "profileUser3", password: "wrongpassword" },
          payload: { bio: "new bio" },
        },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);
      // should have returned a 403 error
      expect(res.status).toHaveBeenCalledWith(403);
      // should have returned an error message
      expect(res.send).toHaveBeenCalledWith({ error: "Invalid login" });
    });

    it("should update a user's profile with a valid request", async () => {
      await createUser("profileUser4", "pwd1111", new Date());
      // make a request to update the user's profile
      const req = {
        params: { username: "profileUser4" },
        body: {
          auth: { username: "profileUser4", password: "pwd1111" },
          payload: {
            bio: "updated bio",
            profileBorderColor: "#ff0000",
            pfp: {
              type: "avatar",
              avatarId: "wizard",
            },
          },
        },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);

      expect(res.status).not.toHaveBeenCalled();
      // should have returned the updated profile
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "profileUser4",
          bio: "updated bio",
          profileBorderColor: "#ff0000",
          pfp: expect.objectContaining({
            type: "avatar",
            avatarId: "wizard",
          }),
        }),
      );
      // should have actually updated the profile in the database
      const storedProfile = await getProfileByUsername("profileUser4");
      expect(storedProfile.bio).toBe("updated bio");
    });
  });

  describe("postUploadByUsername", () => {
    it("should upload a profile image successfully", async () => {
      await createUser("profileUser5", "pwd1111", new Date());
      // make a request to upload a new profile picture
      const req = {
        params: { username: "profileUser5" },
        body: {
          auth: { username: "profileUser5", password: "pwd1111" },
          payload: {
            contentType: "image/png",
            data: "abc123base64",
          },
        },
      } as unknown as Parameters<typeof postUploadByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postUploadByUsername>[1];

      await postUploadByUsername(req, res);

      expect(res.status).not.toHaveBeenCalled();
      // should have returned the updated profile with the new profile picture
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "profileUser5",
          pfp: expect.objectContaining({
            type: "upload",
            uploadId: expect.any(String),
          }),
        }),
      );
    });
  });
});

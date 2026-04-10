import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getByUsername,
  postByUsername,
  postUploadByUsername,
  getUploadById,
} from "../src/controllers/profile.controller.ts";
import { getProfileByUsername } from "../src/services/profile.service.ts";
import { createUser } from "../src/services/user.service.ts";
import * as profileService from "../src/services/profile.service.ts";

vi.mock("../src/services/profile.service.ts", async () => {
  const actual = await vi.importActual("../src/services/profile.service.ts");
  return {
    ...actual,
    getUploadedImage: vi.fn(),
  };
});

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
      await createUser("profileUser1", "pwd1111");

      const req = {
        params: { username: "profileUser1" },
      } as unknown as Parameters<typeof getByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof getByUsername>[1];
      await getByUsername(req, res);
      expect(res.status).not.toHaveBeenCalled();
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
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("postByUsername", () => {
    it("should reject a malformed request body", async () => {
      await createUser("profileUser2", "pwd1111");

      const req = {
        params: { username: "profileUser2" },
        authUser: { userId: "any-id", username: "profileUser2" },
        // pfp.type must be "upload" | "avatar" — passing an invalid value triggers 400
        body: { pfp: { type: "not-a-valid-type" } },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Bad request" });
    });

    it("should reject when authUser does not match the route username", async () => {
      await createUser("profileUser3", "pwd1111");

      const req = {
        params: { username: "profileUser3" },
        authUser: { userId: "other-id", username: "differentUser" },
        body: { bio: "new bio" },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({ error: "Invalid login" });
    });

    it("should update a user's profile with a valid request", async () => {
      await createUser("profileUser4", "pwd1111");
      const req = {
        params: { username: "profileUser4" },
        authUser: { userId: "any-id", username: "profileUser4" },
        body: {
          bio: "updated bio",
          profileBorderColor: "#ff0000",
          pfp: {
            type: "avatar",
            avatarId: "wizard",
          },
        },
      } as unknown as Parameters<typeof postByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postByUsername>[1];

      await postByUsername(req, res);

      expect(res.status).not.toHaveBeenCalled();
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
      const storedProfile = await getProfileByUsername("profileUser4");
      expect(storedProfile.bio).toBe("updated bio");
    });
  });

  describe("postUploadByUsername", () => {
    it("should upload a profile image successfully", async () => {
      await createUser("profileUser5", "pwd1111");
      const req = {
        params: { username: "profileUser5" },
        authUser: { userId: "any-id", username: "profileUser5" },
        body: {
          contentType: "image/png",
          data: "abc123base64",
        },
      } as unknown as Parameters<typeof postUploadByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postUploadByUsername>[1];

      await postUploadByUsername(req, res);

      expect(res.status).not.toHaveBeenCalled();
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

    it("should reject a bad upload request body", async () => {
      await createUser("profileUser6", "pwd1111");

      const req = {
        params: { username: "profileUser6" },
        authUser: { userId: "any-id", username: "profileUser6" },
        body: {
          contentType: 123,
          data: "abc123base64",
        },
      } as unknown as Parameters<typeof postUploadByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postUploadByUsername>[1];

      await postUploadByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Poorly-formed request" });
    });

    it("should reject upload when authUser does not match the route username", async () => {
      await createUser("profileUser7", "pwd1111");

      const req = {
        params: { username: "profileUser7" },
        authUser: { userId: "other-id", username: "differentUser" },
        body: {
          contentType: "image/png",
          data: "abc123base64",
        },
      } as unknown as Parameters<typeof postUploadByUsername>[0];

      const res = makeRes() as unknown as Parameters<typeof postUploadByUsername>[1];

      await postUploadByUsername(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should return 404 if uploaded image does not exist", async () => {
      vi.spyOn(profileService, "getUploadedImage").mockRejectedValue(new Error("not found"));

      const req = {
        params: { uploadId: "missing-upload" },
      } as unknown as Parameters<typeof getUploadById>[0];

      const res = makeRes() as unknown as Parameters<typeof getUploadById>[1];

      await getUploadById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: "Uploaded image not found" });
    });
  });
});

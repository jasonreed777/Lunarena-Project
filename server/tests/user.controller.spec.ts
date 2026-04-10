import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import {
  postByUsername,
  getByUsername,
  getSearch,
  postList,
} from "../src/controllers/user.controller.ts";
import * as userService from "../src/services/user.service.ts";
import * as authService from "../src/services/auth.service.ts";

vi.mock("../src/services/user.service.ts", () => ({
  getUsersByUsername: vi.fn(),
  populateSafeUserInfo: vi.fn(),
  searchUsers: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../src/services/auth.service.ts", () => ({
  getUserByUsername: vi.fn(),
}));

function createMockResponse() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe("user.controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("postByUsername", () => {
    it("should return 400 for poorly formed request body", async () => {
      const req = {
        body: { bad: "body" },
        params: { username: "jason" },
        authUser: { username: "jason", userId: "u1" },
      };
      const res = createMockResponse();

      await postByUsername(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Poorly-formed request" });
    });
  });

  it("should return 403 if auth user does not match param username", async () => {
    const req = {
      body: { payload: { display: "New Display" } },
      params: { username: "jason" },
      authUser: { username: "sam", userId: "u2" },
    };
    const res = createMockResponse();

    await postByUsername(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({ error: "Invalid credentials" });
  });

  it("should update user and send safe user info", async () => {
    const req = {
      body: { payload: { display: "New Display" } },
      params: { username: "jason" },
      authUser: { username: "jason", userId: "u1" },
    };
    const res = createMockResponse();

    const safeUser = {
      username: "jason",
      display: "New Display",
      createdAt: new Date("2026-04-10T00:00:00.000Z"),
      pfp: "wizard.png",
      profileBorderColor: "#123456",
    };

    vi.mocked(userService.updateUser).mockResolvedValue(safeUser as never);

    await postByUsername(req as never, res as never);

    expect(userService.updateUser).toHaveBeenCalledWith("jason", {
      display: "New Display",
    });
    expect(res.send).toHaveBeenCalledWith(safeUser);
  });
});

describe("getByUsername", () => {
  it("should return 404 when user does not exist", async () => {
    const req = {
      params: { username: "missing" },
    };
    const res = createMockResponse();

    vi.mocked(authService.getUserByUsername).mockResolvedValue(null);

    await getByUsername(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: "User not found" });
  });

  it("should return populated safe user info when user exists", async () => {
    const req = {
      params: { username: "jason" },
    };
    const res = createMockResponse();

    vi.mocked(authService.getUserByUsername).mockResolvedValue({
      userId: "u1",
      username: "jason",
    } as never);

    const safeUser = {
      username: "jason",
      display: "Jason",
      createdAt: new Date("2026-04-10T00:00:00.000Z"),
      pfp: "wizard.png",
      profileBorderColor: "#123456",
    };

    vi.mocked(userService.populateSafeUserInfo).mockResolvedValue(safeUser as never);

    await getByUsername(req as never, res as never);

    expect(authService.getUserByUsername).toHaveBeenCalledWith("jason");
    expect(userService.populateSafeUserInfo).toHaveBeenCalledWith("u1");
    expect(res.send).toHaveBeenCalledWith(safeUser);
  });
});

describe("getSearch", () => {
  it("should return 400 when query is missing", async () => {
    const req = {
      query: {},
    };
    const res = createMockResponse();

    await getSearch(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Missing search query" });
  });

  it("should return 400 when query is blank", async () => {
    const req = {
      query: { q: "   " },
    };
    const res = createMockResponse();

    await getSearch(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Missing search query" });
  });

  it("should search users without clanId", async () => {
    const req = {
      query: { q: "ja" },
    };
    const res = createMockResponse();

    const users = [
      {
        username: "jason",
        display: "Jason",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "wizard.png",
        profileBorderColor: "#123456",
      },
    ];

    vi.mocked(userService.searchUsers).mockResolvedValue(users as never);

    await getSearch(req as never, res as never);

    expect(userService.searchUsers).toHaveBeenCalledWith("ja", 5, undefined);
    expect(res.send).toHaveBeenCalledWith(users);
  });

  it("should search users with clanId", async () => {
    const req = {
      query: { q: "ja", clanId: "clan1" },
    };
    const res = createMockResponse();

    const users = [
      {
        username: "jason",
        display: "Jason",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "wizard.png",
        profileBorderColor: "#123456",
      },
    ];

    vi.mocked(userService.searchUsers).mockResolvedValue(users as never);

    await getSearch(req as never, res as never);

    expect(userService.searchUsers).toHaveBeenCalledWith("ja", 5, "clan1");
    expect(res.send).toHaveBeenCalledWith(users);
  });
});

describe("postList", () => {
  it("should return 400 for poorly formed request body", async () => {
    const req = {
      body: { usernames: ["jason"] },
    };
    const res = createMockResponse();

    await postList(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: "Poorly-formed request" });
  });

  it("should send error when not all usernames exist", async () => {
    const req = {
      body: ["jason", "missing"],
    };
    const res = createMockResponse();

    vi.mocked(userService.getUsersByUsername).mockRejectedValue(new Error("No user"));

    await postList(req as never, res as never);

    expect(res.send).toHaveBeenCalledWith({ error: "Usernames do not all exist" });
  });

  it("should send safe user info list when usernames are valid", async () => {
    const req = {
      body: ["jason", "sam"],
    };
    const res = createMockResponse();

    const users = [
      {
        username: "jason",
        display: "Jason",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "wizard.png",
        profileBorderColor: "#123456",
      },
      {
        username: "sam",
        display: "Sam",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "knight.png",
        profileBorderColor: "#654321",
      },
    ];

    vi.mocked(userService.getUsersByUsername).mockResolvedValue(users as never);

    await postList(req as never, res as never);

    expect(userService.getUsersByUsername).toHaveBeenCalledWith(["jason", "sam"]);
    expect(res.send).toHaveBeenCalledWith(users);
  });
});

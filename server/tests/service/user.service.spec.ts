/* eslint-disable @typescript-eslint/naming-convention */
import { describe, it, expect, vi } from "vitest";

describe("createUser", () => {
  it("should return an error if user already exists", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValue({
        userId: "u1",
        username: "jason",
      }),
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {},
      ClanMemberModel: {},
    }));

    const { createUser } = await import("../../src/services/user.service.ts");

    const result = await createUser("jason", "password123");

    expect(result).toEqual({ error: "User already exists" });
  });
  it("should create auth account and return populated user", async () => {
    vi.resetModules();

    const mockUser = {
      userId: "u1",
      username: "jason",
    };

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi
        .fn()
        .mockResolvedValueOnce(null) // first call (user doesn't exist)
        .mockResolvedValueOnce(mockUser), // second call (after creation)
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        findById: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            username: "jason",
            display: "jason",
            createdAt: new Date(),
          }),
        }),
      },
      ClanMemberModel: {},
    }));

    const { createUser } = await import("../../src/services/user.service.ts");

    const result = await createUser("jason", "password123");

    expect(result).toMatchObject({
      username: "jason",
      display: "jason",
    });
  });
  it("should throw if user is still missing after auth account creation", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {},
      ClanMemberModel: {},
    }));

    const { createUser } = await import("../../src/services/user.service.ts");

    await expect(createUser("jason", "password123")).rejects.toThrow("Failed to create user jason");
  });

  it("should return safe users for valid usernames", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi
        .fn()
        .mockResolvedValueOnce({ userId: "u1", username: "jason" })
        .mockResolvedValueOnce({ userId: "u2", username: "sam" }),
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        findById: vi
          .fn()
          .mockReturnValueOnce({
            lean: vi.fn().mockResolvedValue({
              username: "jason",
              display: "Jason",
              createdAt: new Date("2026-04-10T00:00:00.000Z"),
              pfp: "wizard.png",
              profileBorderColor: "#123456",
            }),
          })
          .mockReturnValueOnce({
            lean: vi.fn().mockResolvedValue({
              username: "sam",
              display: "Sam",
              createdAt: new Date("2026-04-10T00:00:00.000Z"),
              pfp: "knight.png",
              profileBorderColor: "#654321",
            }),
          }),
      },
      ClanMemberModel: {},
    }));

    const { getUsersByUsername } = await import("../../src/services/user.service.ts");

    const result = await getUsersByUsername(["jason", "sam"]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      username: "jason",
      display: "Jason",
    });
    expect(result[1]).toMatchObject({
      username: "sam",
      display: "Sam",
    });
  });

  it("should throw if any username is invalid", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValue(null),
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {},
      ClanMemberModel: {},
    }));

    const { getUsersByUsername } = await import("../../src/services/user.service.ts");

    await expect(getUsersByUsername(["fake"])).rejects.toThrow("No user fake");
  });
  it("should throw if given an invalid user id", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValue(null),
      createAuthAccount: vi.fn(),
    }));

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {},
      ClanMemberModel: {},
    }));

    const { updateUser } = await import("../../src/services/user.service.ts");

    await expect(updateUser("fake", { display: "Stacey Fakename" })).rejects.toThrow(
      "No user fake",
    );
  });

  it("should update display when user exists", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValue({
        userId: "u1",
        username: "jason",
      }),
      createAuthAccount: vi.fn(),
    }));

    const findByIdAndUpdate = vi.fn().mockResolvedValue({});
    const findById = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        username: "jason",
        display: "New Display",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "wizard.png",
        profileBorderColor: "#123456",
      }),
    });

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        findByIdAndUpdate,
        findById,
      },
      ClanMemberModel: {},
    }));

    const { updateUser } = await import("../../src/services/user.service.ts");

    const result = await updateUser("jason", { display: "New Display" });

    expect(findByIdAndUpdate).toHaveBeenCalledWith("u1", {
      display: "New Display",
    });
    expect(result).toMatchObject({
      username: "jason",
      display: "New Display",
    });
  });

  it("should not update display when display is undefined", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn().mockResolvedValue({
        userId: "u1",
        username: "jason",
      }),
      createAuthAccount: vi.fn(),
    }));

    const findByIdAndUpdate = vi.fn().mockResolvedValue({});
    const findById = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        username: "jason",
        display: "Jason",
        createdAt: new Date("2026-04-10T00:00:00.000Z"),
        pfp: "wizard.png",
        profileBorderColor: "#123456",
      }),
    });

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        findByIdAndUpdate,
        findById,
      },
      ClanMemberModel: {},
    }));

    const { updateUser } = await import("../../src/services/user.service.ts");

    const result = await updateUser("jason", {});

    expect(findByIdAndUpdate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      username: "jason",
      display: "Jason",
    });
  });

  it("should search users without clan filter", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn(),
      createAuthAccount: vi.fn(),
    }));

    const find = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "u1" }, { _id: "u2" }]),
      }),
    });

    const findById = vi
      .fn()
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          username: "jason",
          display: "Jason",
          createdAt: new Date("2026-04-10T00:00:00.000Z"),
          pfp: "wizard.png",
          profileBorderColor: "#123456",
        }),
      })
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          username: "sam",
          display: "Sam",
          createdAt: new Date("2026-04-10T00:00:00.000Z"),
          pfp: "knight.png",
          profileBorderColor: "#654321",
        }),
      });

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        find,
        findById,
      },
      ClanMemberModel: {},
    }));

    const { searchUsers } = await import("../../src/services/user.service.ts");

    const result = await searchUsers("ja", 5);

    expect(find).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      username: "jason",
      display: "Jason",
    });
    expect(result[1]).toMatchObject({
      username: "sam",
      display: "Sam",
    });
  });

  it("should return empty array when clan has no members", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn(),
      createAuthAccount: vi.fn(),
    }));

    const clanFind = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {},
      ClanMemberModel: {
        find: clanFind,
      },
    }));

    const { searchUsers } = await import("../../src/services/user.service.ts");

    const result = await searchUsers("ja", 5, "clan1");

    expect(clanFind).toHaveBeenCalledWith({ clanId: "clan1" }, { userId: 1 });
    expect(result).toEqual([]);
  });

  it("should search users with clan filter", async () => {
    vi.resetModules();

    vi.doMock("../../src/services/auth.service.ts", () => ({
      getUserByUsername: vi.fn(),
      createAuthAccount: vi.fn(),
    }));

    const clanFind = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]),
    });

    const userFind = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: "u1" }, { _id: "u2" }]),
      }),
    });

    const findById = vi
      .fn()
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          username: "jason",
          display: "Jason",
          createdAt: new Date(),
          pfp: "wizard.png",
          profileBorderColor: "#123456",
        }),
      })
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({
          username: "sam",
          display: "Sam",
          createdAt: new Date(),
          pfp: "knight.png",
          profileBorderColor: "#654321",
        }),
      });

    vi.doMock("../../src/mongoose-models.ts", () => ({
      UserModel: {
        find: userFind,
        findById,
      },
      ClanMemberModel: {
        find: clanFind,
      },
    }));

    const { searchUsers } = await import("../../src/services/user.service.ts");

    const result = await searchUsers("a", 5, "clan1");

    expect(clanFind).toHaveBeenCalledWith({ clanId: "clan1" }, { userId: 1 });
    expect(userFind).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: ["u1", "u2"] },
      }),
    );
    expect(result).toHaveLength(2);
  });
});

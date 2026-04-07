import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Header from "../../src/components/Header.tsx";
import { LoginContext } from "../../src/contexts/LoginContext.ts";
import type { GameSocket } from "../../src/util/types.ts";

const mockedUseNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const mod = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...mod, useNavigate: () => mockedUseNavigate };
});
const mockedReset = vi.fn();
const { mockedGetProfileByUsername, mockedGetUploadedImage, mockedUpdateProfile } = vi.hoisted(
  () => ({
    mockedGetProfileByUsername: vi.fn(),
    mockedGetUploadedImage: vi.fn(),
    mockedUpdateProfile: vi.fn(),
  }),
);

vi.mock("../../src/services/profileService.ts", () => ({
  getProfileByUsername: mockedGetProfileByUsername,
  getUploadedImage: mockedGetUploadedImage,
  updateProfile: mockedUpdateProfile,
}));

vi.mock("../../src/services/pointsService.ts", () => ({
  getUserPoints: vi.fn().mockResolvedValue(0),
  getUserStreak: vi.fn().mockResolvedValue(0),
}));

vi.mock("../../src/services/achievementService.ts", () => ({
  getUserAchievements: vi.fn().mockResolvedValue([]),
}));

describe("Header component", () => {
  beforeEach(() => {
    mockedUseNavigate.mockReset();
    mockedReset.mockReset();
    mockedGetProfileByUsername.mockReset();
    mockedGetUploadedImage.mockReset();
    mockedUpdateProfile.mockReset();

    mockedGetProfileByUsername.mockResolvedValue({
      username: "username123",
      bio: "",
      pfp: { type: "avatar", avatarId: "wizard" },
      titleId: "",
      profileBorderColor: "#888888",
      updatedAt: new Date().toISOString(),
      onlinePresence: {
        status: "active",
        lastActive: new Date().toISOString(),
      },
    });

    mockedGetUploadedImage.mockResolvedValue({ error: "no image" });
    mockedUpdateProfile.mockResolvedValue({ success: true });
  });

  it("displays the display name, not the username", () => {
    render(
      <LoginContext
        value={{
          user: {
            username: "username",
            display: "displayname",
            createdAt: new Date("01-02-2025"),
            pfp: {
              type: "avatar",
              uploadId: undefined,
              avatarId: undefined,
            },
            profileBorderColor: "#ffffff",
          },
          pass: "pwd",
          socket: { on: vi.fn(), off: vi.fn() } as unknown as GameSocket,
          reset: mockedReset,
        }}
      >
        <Header />
      </LoginContext>,
    );

    expect(screen.getByText(/displayname/)).not.toBeNull();
  });

  it("pressing Log Out causes a state reset and navigation", async () => {
    render(
      <LoginContext
        value={{
          user: {
            username: "username123",
            display: "displayname",
            createdAt: new Date("01-02-2025"),
            pfp: {
              type: "upload",
              uploadId: undefined,
              avatarId: undefined,
            },
            profileBorderColor: "#df12a3",
          },
          pass: "pwd",
          socket: { on: vi.fn(), off: vi.fn() } as unknown as GameSocket,
          reset: mockedReset,
        }}
      >
        <Header />
      </LoginContext>,
    );

    fireEvent.click(screen.getByText(/Log Out/i));
    await waitFor(() => {
      expect(mockedUpdateProfile).toHaveBeenCalled();
      expect(mockedReset).toHaveBeenCalledOnce();
      expect(mockedUseNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("clicking the avatar navigates to the current user profile", async () => {
    render(
      <LoginContext
        value={{
          user: {
            username: "username123",
            display: "displayname",
            createdAt: new Date("01-02-2025"),
            pfp: {
              type: "avatar",
              uploadId: undefined,
              avatarId: undefined,
            },
            profileBorderColor: "#61dea2",
          },
          pass: "pwd",
          socket: { on: vi.fn(), off: vi.fn() } as unknown as GameSocket,
          reset: mockedReset,
        }}
      >
        <Header />
      </LoginContext>,
    );

    const avatar = await screen.findByRole("img", { name: "" });
    const avatarImg = Array.from(document.querySelectorAll("img")).find((img) =>
      img.src.includes("wizard"),
    );
    expect(avatarImg).toBeTruthy();
    fireEvent.click(avatarImg!);
    expect(mockedUseNavigate).toHaveBeenCalledWith("/profile/username123");
  });
});

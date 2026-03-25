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
const mockedGetProfileByUsername = vi.fn();
const mockedGetUploadedImage = vi.fn();
const mockedUpdateProfile = vi.fn();

vi.mock("../../src/services/profileService.ts", () => ({
  getProfileByUsername: mockedGetProfileByUsername,
  getUploadedImage: mockedGetUploadedImage,
  updateProfile: mockedUpdateProfile,
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
          user: { username: "username", display: "displayname", createdAt: new Date("01-02-2025") },
          pass: "pwd",
          socket: {} as GameSocket,
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
          },
          pass: "pwd",
          socket: {} as GameSocket,
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

  it("pressing View Profile navigates to the current user profile", () => {
    render(
      <LoginContext
        value={{
          user: {
            username: "username123",
            display: "displayname",
            createdAt: new Date("01-02-2025"),
          },
          pass: "pwd",
          socket: {} as GameSocket,
          reset: mockedReset,
        }}
      >
        <Header />
      </LoginContext>,
    );

    fireEvent.click(screen.getByText(/View Profile/i));
    expect(mockedUseNavigate).toHaveBeenCalledExactlyOnceWith("/profile/username123");
  });
});

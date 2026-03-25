import { type SubmitEvent, useState, useEffect } from "react";
import useLoginContext from "./useLoginContext.ts";
import { updateUser } from "../services/userService.ts";
import type { UserUpdateRequest, UserProfileUpdateRequest } from "@gamenite/shared";
import { AVATARS } from "../util/consts.ts";
import {
  updateProfile,
  getProfileByUsername,
  uploadPFP,
  getUploadedImage,
} from "../services/profileService.ts";

/**
 * Custom hook to manage profile form logic
 * @returns an object containing
 *  - Form values `display`, `password`, and `confirm`
 *  - Form setters `setDisplay`, `setPassword`, and `setConfirm`
 *  - Possibly-null error message `err`
 *  - Submission handler `handleSubmit`
 */
export default function useEditProfileForm() {
  const { user, reset } = useLoginContext();
  const [display, setDisplay] = useState(user.display);
  const [bio, setBio] = useState("");
  const [titleId, setTitleId] = useState("");
  const [profileBorderColor, setProfileBorderColor] = useState("#888888");
  const [avatarId, setAvatarId] = useState(AVATARS[0].avatarId);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageType, setUploadedImageType] = useState<
    "image/png" | "image/jpeg" | "image/webp" | null
  >(null);
  const [pfpType, setPfpType] = useState<"avatar" | "upload">("avatar");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<null | string>(null);
  const [successfulSubmit, setSuccessfulSubmit] = useState<null | string>(null);

  useEffect(() => {
    // Whether to cancel request or not if componenent unmounts before API request finishes
    let cancelled = false;
    // Get saved profile record
    getProfileByUsername(user.username).then(async (response) => {
      if (cancelled || "error" in response) return;

      setBio(response.bio ?? "");
      setTitleId(response.titleId ?? "");
      setProfileBorderColor(response.profileBorderColor ?? "#888888");

      if (response.pfp?.type === "avatar" && response.pfp.avatarId) {
        setPfpType("avatar");
        setAvatarId(response.pfp.avatarId);
        setUploadedImage(null);
        setUploadedImageType(null);
      }

      if (response.pfp?.type === "upload" && response.pfp.uploadId) {
        const imageResponse = await getUploadedImage(response.pfp.uploadId);
        if (!cancelled && !("error" in imageResponse)) {
          setPfpType("upload");
          setUploadedImage(imageResponse.data);
          setUploadedImageType(
            imageResponse.contentType as "image/png" | "image/jpeg" | "image/webp",
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user.username]);

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Reset error and success messages on new submit
    setErr(null);
    setSuccessfulSubmit(null);

    if (
      user.display === display &&
      bio === "" &&
      titleId === "" &&
      profileBorderColor === "#888888" &&
      avatarId === AVATARS[0].avatarId &&
      pfpType === "avatar" &&
      uploadedImage === null &&
      password === "" &&
      confirm === ""
    ) {
      setErr("No changes to submit");
      return;
    }

    if (display.trim() !== display) {
      setErr("Display names can't begin or end with whitespace");
      return;
    }

    if (display.trim() === "") {
      setErr("Please enter a display name");
      return;
    }

    if (password.trim() !== password) {
      setErr("Passwords can't begin or end with whitespace");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords don't match");
      return;
    }

    const updates: UserUpdateRequest = {};
    const profileUpdates: UserProfileUpdateRequest = {};
    if (display !== user.display) updates.display = display;
    if (password !== "") updates.password = password;
    if (bio !== "") profileUpdates.bio = bio;
    if (titleId !== "") profileUpdates.titleId = titleId;
    profileUpdates.profileBorderColor = profileBorderColor;
    if (pfpType === "avatar") {
      profileUpdates.pfp = {
        type: "avatar",
        avatarId,
      };
    }
    if (pfpType === "upload" && uploadedImage) {
      const uploadResponse = await uploadPFP(user.username, {
        contentType: uploadedImageType ?? "image/png",
        data: uploadedImage,
      });

      if ("error" in uploadResponse) {
        setErr(uploadResponse.error);
        return;
      }
    }

    // Check to see if there is a profile update
    if (Object.keys(profileUpdates).length > 0) {
      const profileResponse = await updateProfile(user.username, profileUpdates);
      if ("error" in profileResponse) {
        setErr(profileResponse.error);
        return;
      }
    }
    // Check if there is a user update (display name or password)
    if (Object.keys(updates).length > 0) {
      const response = await updateUser(user.username, updates);
      if ("error" in response) {
        setErr(response.error);
        return;
      }
    }
    // Alert that the profile has been updated
    // Allows for instant update of profile picture on top tab upon hitting submit
    if (Object.keys(profileUpdates).length > 0 || Object.keys(updates).length > 0) {
      window.dispatchEvent(new Event("profile-updated"));
    }

    // We need to do this — or do something else that resets the login context
    // Only logs out the user is display or password name changes, if not, we can just update the profile and keep the user logged in
    if (Object.keys(updates).length > 0) {
      reset();
    } else {
      setSuccessfulSubmit("Profile updated successfully");
    }
  };

  return {
    display,
    setDisplay,
    password,
    setPassword,
    confirm,
    setConfirm,
    err,
    handleSubmit,
    bio,
    setBio,
    titleId,
    setTitleId,
    profileBorderColor,
    setProfileBorderColor,
    avatarId,
    setAvatarId,
    pfpType,
    setPfpType,
    uploadedImage,
    setUploadedImage,
    successfulSubmit,
    uploadedImageType,
    setUploadedImageType,
  };
}

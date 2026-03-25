import useLoginContext from "../hooks/useLoginContext.ts";
import { useParams } from "react-router-dom";
import UpdateProfile from "./UpdateProfile.tsx";
import ViewProfile from "./ViewProfile.tsx";
import { updateProfile } from "../services/profileService.ts";
import { useEffect } from "react";

/** Route to the appropriate page based on username */
export default function Profile() {
  const { username } = useParams();
  const { user } = useLoginContext();
  // Update the user's online presence to active when they are on the home page
  useEffect(() => {
    updateProfile(user.username, {
      onlinePresence: {
        status: "active",
        activeGameId: undefined,
        lastActive: new Date().toISOString(),
      },
    });
  }, [user.username]);
  return username && username !== user.username ? (
    <ViewProfile username={username} />
  ) : (
    <UpdateProfile />
  );
}

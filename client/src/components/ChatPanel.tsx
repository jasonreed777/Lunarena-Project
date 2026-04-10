import "./ChatPanel.css";
import MessageCreation from "./MessageCreation.tsx";
import MessageList from "./MessageList.tsx";
import useSocketsForChat from "../hooks/useSocketsForChat.ts";
import React from "react";
import type { SafeUserInfo } from "@gamenite/shared";
import { getProfilePicture } from "../util/utils.ts";
import { getUploadedImage } from "../services/profileService.ts";

interface ChatProps {
  chatId: string;
}

/**
 * A chat panel allows viewing and updating messages in live chat
 */
export default function ChatPanel({ chatId }: ChatProps) {
  const { messages, handleMessageCreation } = useSocketsForChat(chatId);
  const [images, setImages] = React.useState<Record<string, string>>({});
  const fetchedUsersRef = React.useRef<Set<string>>(new Set());

  const loadProfilePicture = React.useCallback(async (u: SafeUserInfo) => {
    if (!u.pfp || fetchedUsersRef.current.has(u.username)) return;
    fetchedUsersRef.current.add(u.username);
    if (u.pfp.type === "avatar") {
      const picture = getProfilePicture(u);
      if (picture) setImages((prev) => ({ ...prev, [u.username]: picture }));
    } else {
      const uploadId = u.pfp.uploadId;
      if (!uploadId) return;
      const response = await getUploadedImage(uploadId);
      if (!("error" in response)) {
        setImages((prev) => ({ ...prev, [u.username]: response.data }));
      }
    }
  }, []);

  return (
    messages && (
      <div className="chat-container">
        <MessageList messages={messages} images={images} onLoadImage={loadProfilePicture} />
        <MessageCreation handleMessageCreation={handleMessageCreation} />
      </div>
    )
  );
}

import { type MessageInfo, type DMChatOverview, type SafeUserInfo } from "@gamenite/shared";
import React from "react";
import * as Typography from "../libs/Typography";
import { ThemeContext } from "../contexts/ThemeContext";
import "./MessagePage.css";
import { Divider } from "../components/Divider";
import MessageList from "../components/MessageList";
import { getProfilePicture } from "../util/utils";
import { Avatar } from "../components/Avatar";
import { ChatBox } from "../components/ChatBox";
import { chatCreate, getChatList, getChatMessages } from "../services/dmService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import useSocketsForDM from "../hooks/useSocketsForDM.ts";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getUploadedImage } from "../services/profileService.ts";

/**
 * A direct messaging page with messages from friends.
 * @returns direct messaging page
 */
export const MessagePage: React.FC = () => {
  const { chatId } = useParams();
  const location = useLocation();
  const targetUsername = location.state?.username as string | null;
  const [chatList, setChatList] = React.useState<DMChatOverview[]>([]);
  const [selected, setSelected] = React.useState<DMChatOverview>();
  const [fetchedMessages, setFetchedMessages] = React.useState<MessageInfo[]>([]);
  const [curMessage, setCurMessage] = React.useState<string>("");
  const { theme } = React.useContext(ThemeContext);
  const { user } = useLoginContext();
  const navigate = useNavigate();
  const { messages: socketMessages, handleMessageCreation } = useSocketsForDM();
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

  React.useEffect(() => {
    // IIFE to handle getting and creating chats
    (async () => {
      const chats = await getChatList();
      if ("error" in chats) {
        return;
      }
      setChatList(chats);

      // If navigated here with a target username, find or create that chat and go to it
      if (targetUsername) {
        const existing = chats.find((c) =>
          c.participants.some((p) => p.username === targetUsername),
        );
        if (existing) {
          navigate(`/messages/${existing.chatId}`, { replace: true });
        } else {
          await chatCreate([targetUsername]);
          const freshChats = await getChatList();
          if (!("error" in freshChats)) {
            setChatList(freshChats);
            const newChat = freshChats.find((c) =>
              c.participants.some((p) => p.username === targetUsername),
            );
            if (newChat) navigate(`/messages/${newChat.chatId}`, { replace: true });
          }
        }
      }
    })();
  }, [navigate, targetUsername]);

  // Load images for all chat participants whenever the list changes
  React.useEffect(() => {
    chatList.forEach((chat) => chat.participants.forEach((p) => loadProfilePicture(p)));
  }, [chatList, loadProfilePicture]);

  // Load messages when a chat is selected
  React.useEffect(() => {
    if (!chatId) return;
    setSelected(chatList.find((chat) => chat.chatId === chatId));
    getChatMessages({ chatId, pageIndex: 0, pageSize: 50 }).then((res) => {
      if (!("error" in res)) setFetchedMessages([...res].reverse());
    });
  }, [chatId, chatList]);

  // Merge historical + socket messages for the selected chat
  const socketSelected = chatId ? (socketMessages[chatId] ?? []) : [];
  // Make sure socket messages aren't double counted with fetched messages
  const allMessages: MessageInfo[] = [
    ...fetchedMessages,
    ...socketSelected.filter((sm) => !fetchedMessages.some((fm) => fm.messageId === sm.messageId)),
  ];

  /**
   * Handles the user sending a message
   */
  const handleSendMessage = (message: string) => {
    if (chatId) handleMessageCreation(chatId, message);
    setCurMessage("");
  };

  return (
    <div
      className="message-page-container"
      style={{ backgroundColor: theme.primary, color: theme.text }}
    >
      <Typography.PageTitle>Direct Messages</Typography.PageTitle>
      <Divider />
      <div className="messages-body-container">
        <div className="friend-list">
          <Typography.Subtitle>Messages</Typography.Subtitle>
          {chatList
            .sort(
              (chat1, chat2) =>
                new Date(chat2.lastMessageAt).getTime() - new Date(chat1.lastMessageAt).getTime(),
            )
            .map((chatInfo) => {
              const otherUser = getOtherParticipant(user, chatInfo);
              if (!otherUser) {
                return "invalid chat, only self present";
              }
              const color = otherUser.profileBorderColor;
              const isSelected = selected?.chatId === chatInfo.chatId;
              return (
                <div
                  className={`friend-info ${isSelected && "selected"}`}
                  style={{
                    color,
                    borderLeft: `4px solid ${isSelected ? color || "white" : "transparent"}`,
                  }}
                  onClick={() => navigate(`/messages/${chatInfo.chatId}`)}
                >
                  <Avatar src={images[otherUser.username]} size="small" border={{ color: color }} />
                  <Typography.ProfileText>
                    {otherUser.display || otherUser.username}
                  </Typography.ProfileText>
                </div>
              );
            })}
        </div>
        <div style={{ width: "fit-content" }}>
          <Divider vertical color="#7A797A" />
        </div>
        <div className="messages-container">
          <div>
            <Typography.Subtitle>Messages</Typography.Subtitle>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 50,
              width: "100%",
              height: "calc(100% - 110px)",
            }}
          >
            <MessageList messages={allMessages} images={images} onLoadImage={loadProfilePicture} />
            <ChatBox
              sendTo={
                getOtherParticipant(user, selected)?.display ||
                getOtherParticipant(user, selected)?.username ||
                ""
              }
              theme={theme}
              onClick={handleSendMessage}
              message={curMessage}
              setMessage={setCurMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Retrieves the first other participant from the chat (not the user)
function getOtherParticipant(user: SafeUserInfo, chat?: DMChatOverview): SafeUserInfo | undefined {
  if (chat) {
    return chat.participants.find((participant) => participant.username !== user.username);
  }
  return;
}

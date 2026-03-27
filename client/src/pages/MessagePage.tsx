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
import { friendsList } from "../services/friendshipService.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import useSocketsForDM from "../hooks/useSocketsForDM.ts";


/**
 * A direct messaging page with messages from friends.
 * @returns direct messaging page
 */
export const MessagePage: React.FC = () => {
  const [chatList, setChatList] = React.useState<DMChatOverview[]>([]);
  const [selected, setSelected] = React.useState<DMChatOverview>();
  const [fetchedMessages, setFetchedMessages] = React.useState<MessageInfo[]>([]);
  const [curMessage, setCurMessage] = React.useState<string>("");
  const { theme } = React.useContext(ThemeContext);
  const { user } = useLoginContext();

  const { messages: socketMessages, handleMessageCreation } = useSocketsForDM();

  React.useEffect(() => {
    // IIFE to handle getting and creating chats for friends
    (async () => {
      const [chats, friends] = await Promise.all([getChatList(), friendsList()]);
      if ("error" in chats || "error" in friends) {
        return;
      }
      setChatList((existing) => [...existing, ...chats]);
      // Make sure there is a chat created for every friend. If there isn't, send an add chat request
      const promises = [];
      for (const friend of friends) {
        if (
          !chats.some((chat) =>
            chat.participants.some(
              (participant) => participant.username === friend.friend.username,
            ),
          )
        ) {
          promises.push(chatCreate([friend.friend.username]));
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises);
        const chatsUpdated = await getChatList();
        if (!("error" in chatsUpdated)) {
          setChatList(chatsUpdated);
        }
      }
    })();
  }, []);

  // Load messages when a chat is selected
  React.useEffect(() => {
    if (!selected) return;
    getChatMessages({ chatId: selected.chatId, pageIndex: 0, pageSize: 50 }).then((res) => {
      if (!("error" in res)) setFetchedMessages([...res].reverse());
    });
  }, [selected]);

  // Merge historical + socket messages for the selected chat
  const socketSelected = selected ? (socketMessages[selected.chatId] ?? []) : [];
  // Make sure socket messages aren't double counted with fetched messages
  const allMessages: MessageInfo[] = [
    ...fetchedMessages,
    ...socketSelected.filter((sm) => !fetchedMessages.some((fm) => fm.messageId === sm.messageId)),
  ];

  /**
   * Fires when the user selects a friend from the list
   */
  const handleSelectChat = (chat: DMChatOverview) => {
    setSelected(chat);
  };

  /**
   * Handles the user sending a message
   */
  const handleSendMessage = (message: string) => {
    if (selected) handleMessageCreation(selected?.chatId, message);
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
          <Typography.Subtitle>Friends</Typography.Subtitle>
          {chatList.map((chatInfo) => {
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
                onClick={() => handleSelectChat(chatInfo)}
              >
                <Avatar src={getProfilePicture(otherUser)} size="small" border={{ color: color }} />
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
          <div style={{ position: "absolute", bottom: 0, width: "100%" }}>
            <MessageList messages={allMessages} />
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

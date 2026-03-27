import "./MessageList.css";
import useLoginContext from "../hooks/useLoginContext.ts";
import type { ChatMessage } from "../util/types.ts";
import React from "react";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import * as Typography from "../libs/Typography.tsx";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { getProfilePicture } from "../util/utils.ts";
import { Avatar } from "./Avatar.tsx";

interface MessageListProps {
  messages: ChatMessage[];
}

export default function MessageList({ messages }: MessageListProps) {
  const { user } = useLoginContext();
  const chatWindowRef = React.useRef<HTMLDivElement | null>(null);
  const timeSince = useTimeSince();
  const { theme } = React.useContext(ThemeContext);

  React.useEffect(() => {
    if (!chatWindowRef.current) return;
    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="chatWindow" ref={chatWindowRef}>
      <div className="chatScroller" style={{ color: theme.text }}>
        {messages.map((message) => {
          if ("meta" in message) {
            if (message.meta === "move") {
              return (
                <div key={message.messageId} className="chatMoveLog">
                  <UserLink user={message.user} />
                  {message.moveDescription}
                </div>
              );
            }
            return (
              <div
                key={message.messageId}
                className="chatMeta"
                style={{ color: theme.secondaryText, paddingLeft: "1rem" }}
              >
                <Typography.Code style={{ fontSize: "12px" }}>
                  <UserLink user={message.user} /> {message.meta}
                  {" chat "}
                </Typography.Code>
                <Typography.SmallText style={{ color: theme.secondaryText }}>
                  {timeSince(message.dateTime)}
                </Typography.SmallText>
              </div>
            );
          }
          if (user.username === message.createdBy.username) {
            return (
              <div key={message.messageId} className="chatMe" style={{ padding: "1rem" }}>
                <div className={user.pfp ? "messageWithAvatar" : "messageInfo"}>
                  {user.pfp && (
                    <Avatar
                      border={{ color: user.profileBorderColor || theme.text }}
                      src={getProfilePicture(user)}
                      size="small"
                    />
                  )}
                  <Typography.ProfileText style={{ color: theme.text }}>You</Typography.ProfileText>{" "}
                  •{" "}
                  <Typography.SmallText className="chatSender">
                    {timeSince(message.createdAt)}
                  </Typography.SmallText>
                </div>
                <Typography.Paragraph
                  className="chatContent"
                  style={{ color: theme.text, padding: 0, width: "100%" }}
                >
                  {message.text}
                </Typography.Paragraph>
              </div>
            );
          }
          const { createdBy } = message;
          return (
            <div
              key={message.messageId}
              className={`chatOther ${createdBy.pfp ? "messageWithAvatar" : "messageInfo"}`}
            >
              <Avatar
                border={{ color: createdBy.profileBorderColor || theme.text }}
                src={getProfilePicture(createdBy)}
                size="medium"
              />
              <div>
                <div className="chatSender">
                  <UserLink user={message.createdBy} /> •{" "}
                  <Typography.SmallText style={{ color: theme.secondaryText }}>
                    {timeSince(message.createdAt)}
                  </Typography.SmallText>
                </div>
                <Typography.Paragraph
                  className="chatContent"
                  style={{ color: theme.text, padding: 0, width: "100%" }}
                >
                  {message.text}
                </Typography.Paragraph>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

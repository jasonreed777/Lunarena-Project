import { type MessageInfo, type FriendInfo } from "@gamenite/shared";
import React from "react";
import * as Typography from "../libs/Typography";
import { ThemeContext } from "../contexts/ThemeContext";
import "./MessagePage.css";
import { Divider } from "../components/Divider";
import MessageList from "../components/MessageList";
import { getProfilePicture } from "../util/utils";
import { Avatar } from "../components/Avatar";
import { ChatBox } from "../components/ChatBox";

const DUMMY_FRIENDS: FriendInfo[] = [
  {
    friendshipId: "1",
    friend: {
      username: "jayatal",
      display: "Jay Atal",
      createdAt: new Date(),
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/gamer.png",
      },
      profileBorderColor: "#9469ca",
    },
    since: new Date(204248204),
  },
  {
    friendshipId: "2",
    friend: {
      username: "jasonreed",
      display: "Jason Reed",
      createdAt: new Date(),
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/animal.png",
      },
      profileBorderColor: "#f1c811",
    },
    since: new Date(204248204),
  },
  {
    friendshipId: "3",
    friend: {
      username: "tuckergwertzman",
      display: "Tucker Gwertzman",
      createdAt: new Date(),
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/soccer player.png",
      },
      profileBorderColor: "#f72d2d",
    },
    since: new Date(204248204),
  },
  {
    friendshipId: "4",
    friend: {
      username: "charliemiller",
      display: "Charlie Miller",
      createdAt: new Date(),
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/dog.png",
      },
      profileBorderColor: "#5cd7ed",
    },
    since: new Date(204248204),
  },
];

const DUMMY_MESSAGES: MessageInfo[] = [
  {
    messageId: "1",
    text: "LOL",
    createdBy: {
      username: "jayatal",
      display: "Jay Atal",
      createdAt: new Date(),
      profileBorderColor: "#9469ca",
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/gamer.png",
      },
    },
    createdAt: new Date(1000000),
  },
  {
    messageId: "2",
    text: "ain't no way you just beat me at nim",
    createdBy: {
      username: "jasonreed",
      display: "Jason Reed",
      createdAt: new Date(),
      profileBorderColor: "#f1c811",
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/animal.png",
      },
    },
    createdAt: new Date(2000000),
  },
  {
    messageId: "3",
    text: "gamenite is epic",
    createdBy: {
      username: "jayatal",
      display: "Jay Atal",
      createdAt: new Date(),
      profileBorderColor: "#9469ca",
      pfp: {
        type: "avatar",
        uploadId: undefined,
        avatarId: "/assets/avatars/gamer.png",
      },
    },
    createdAt: new Date(3000000),
  },
];

/**
 * A direct messaging page with messages from friends.
 * @returns direct messaging page
 */
export const MessagePage: React.FC = () => {
  const [friendList, setFriendList] = React.useState<FriendInfo[]>(DUMMY_FRIENDS /* [] */);
  const [selected, setSelected] = React.useState<FriendInfo>();
  const [messages, setMessages] = React.useState<MessageInfo[]>(DUMMY_MESSAGES /* [] */);
  const [curMessage, setCurMessage] = React.useState<string>("");
  const { theme } = React.useContext(ThemeContext);

  React.useEffect(() => {
    // TODO: Implementation
    if (friendList.length > 0) {
      setSelected(friendList[0]);
    }
  }, [friendList]);

  /**
   * Fires when the user selects a friend from the list
   */
  const handleSelectFriend = (friend: FriendInfo) => {
    setSelected(friend);
    // TODO: Implementation
  };

  /**
   * Handles the user sending a message
   */
  const handleSendMessage = () => {
    console.log("message sent");
    // TODO: Implementation
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
          {friendList.map((friendInfo) => {
            const color = friendInfo.friend.profileBorderColor;
            const isSelected = selected?.friend.username === friendInfo.friend.username;
            return (
              <div
                className={`friend-info ${isSelected && "selected"}`}
                style={{
                  color,
                  borderLeft: `4px solid ${isSelected ? color || "white" : "transparent"}`,
                }}
                onClick={() => handleSelectFriend(friendInfo)}
              >
                <Avatar
                  src={getProfilePicture(friendInfo.friend)}
                  size="small"
                  border={{ color: color }}
                />
                <Typography.ProfileText>
                  {friendInfo.friend.display || friendInfo.friend.username}
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
            <MessageList messages={messages} />
            <ChatBox
              sendTo={selected?.friend.display || selected?.friend.username || ""}
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

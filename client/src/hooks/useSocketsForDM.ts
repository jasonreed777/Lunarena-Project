import useLoginContext from "./useLoginContext.ts";
import { useEffect, useState } from "react";
import type { ChatNewMessagePayload, MessageInfo } from "@gamenite/shared";

export default function useSocketsForDM() {
  const { user, socket } = useLoginContext();
  const [messages, setMessages] = useState<Record<string, MessageInfo[]>>({});

  useEffect(() => {
    // Username pulled from socket on server side, join string is placeholder
    socket.emit("dmChatJoin", "join");

    socket.on("dmNewMessage", handleNewMessage);

    function handleNewMessage(message: ChatNewMessagePayload) {
      setMessages((prev) => ({
        ...prev,
        [message.chatId]: [...(prev[message.chatId] ?? []), message.message],
      }));
    }
    return () => {
      socket.off("dmNewMessage", handleNewMessage);
    };
  }, [user, socket]);

  function handleMessageCreation(chatId: string, text: string) {
    socket.emit("dmSendMessage", { chatId, text });
  }
  return { messages, handleMessageCreation };
}

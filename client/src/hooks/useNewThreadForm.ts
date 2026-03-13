import { type ChangeEvent, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createThread } from "../services/threadService.ts";

/**
 * Custom hook to manage thread creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form values `title` and `contents`
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange` and `handleSubmit`
 */
export default function useNewThreadForm() {
  const [title, setTitle] = useState("");
  const [contents, setContents] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Handles form input change
   */
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: "title" | "contents",
  ) => {
    if (field === "title") {
      setTitle(e.target.value);
    } else if (field === "contents") {
      setContents(e.target.value);
    }
  };

  /**
   * Handles submission of the form
   */
  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (title.trim() === "") {
      setErr("A title is required");
      return;
    }

    if (contents.trim() === "") {
      setErr("The post is required to have contents");
      return;
    }

    const thread = await createThread({ title, text: contents });
    if ("error" in thread) {
      setErr(thread.error);
      return;
    }

    navigate(`/forum/post/${thread.threadId}`);
  };

  return { title, contents, err, handleInputChange, handleSubmit };
}

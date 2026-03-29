import { useNavigate } from "react-router-dom";
import ThreadSummaryView from "../components/ThreadSummaryView.tsx";
import useThreadList from "../hooks/useThreadList.ts";
import React from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";

export default function ThreadList() {
  const threadList = useThreadList();
  const navigate = useNavigate();
  const { theme } = React.useContext(ThemeContext);

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>All forum posts</h2>
        <div>
          <button className="primary narrow" onClick={() => navigate("/forum/post/new")}>
            Create New Post
          </button>
        </div>
        <>
          {"message" in threadList ? (
            threadList.message
          ) : (
            <div className="dottedList" role="list">
              {threadList.map((thread, index) => (
                <ThreadSummaryView
                  thread={{ ...thread }}
                  theme={theme}
                  index={index}
                  key={thread.threadId.toString()}
                />
              ))}
            </div>
          )}
        </>
      </div>
    </div>
  );
}

/* eslint no-console: "off" */

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "./services/api.ts";
import Login from "./pages/Login.tsx";
import type { AuthContext } from "./contexts/LoginContext.ts";
import Layout from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import ThreadList from "./pages/ThreadList.tsx";
import Profile from "./pages/Profile.tsx";
import { io } from "socket.io-client";
import { Colors, type ColorTheme, type GameSocket } from "./util/types.ts";
import LoggedInRoute from "./components/LoggedInRoute.tsx";
import NewGame from "./pages/NewGame.tsx";
import Game from "./pages/Game.tsx";
import GameList from "./pages/GameList.tsx";
import FriendsList from "./pages/FriendsList.tsx";
import ThreadPage from "./pages/ThreadPage.tsx";
import { ErrorBoundary } from "react-error-boundary";
import fallback from "./fallback.tsx";
import NewThread from "./pages/NewThread.tsx";
import TimeContextKeeper from "./components/UpdatingTimeContext.tsx";
import { ClanPage } from "./pages/ClanPage.tsx";
import { THEME_KEY, ThemeContext } from "./contexts/ThemeContext.ts";
import { MessagePage } from "./pages/MessagePage.tsx";

/** If `true`, all incoming socket messages will be logged */
const DEBUG_SOCKETS = false;

/**
 * Websocket connection for the app. It would be natural to define this in a
 * useEffect hook, but the React docts advise against this.
 * https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
 * */
let socket: GameSocket | null = null;
if (typeof window !== "undefined") {
  socket = io({ autoConnect: false });
  socket.on("connect", () => console.log("[socket] connected, id=", socket?.id));
  socket.on("connect_error", (err) => console.log("[socket] connect_error:", err.message));
  socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
  if (DEBUG_SOCKETS) {
    socket.onAny((tag, payload) => {
      console.log(`from socket got ${tag}(${JSON.stringify(payload)})`);
    });
  }
}

function NoSuchRoute() {
  const { pathname } = useLocation();
  return `No page found for route '${pathname}'`;
}

export default function App() {
  const [auth, setAuth] = useState<AuthContext | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [theme, setTheme] = useState<ColorTheme>(
    window.localStorage.getItem(THEME_KEY) === "light" ? Colors.light : Colors.dark,
  );

  useEffect(() => {
    if (auth) {
      socket?.connect();
    } else {
      socket?.disconnect();
    }
  }, [auth]);

  useEffect(() => {
    api
      .get<{ user?: { username?: string } } | null>("/api/auth/get-session")
      .then(async (res) => {
        const username = res.data?.user?.username;
        if (username) {
          const userRes = await api.get<{
            error?: string;
            username?: string;
            display?: string;
            createdAt?: Date;
          }>(`/api/user/${username}`);
          if (!userRes.data.error) {
            const user = userRes.data as import("@gamenite/shared").SafeUserInfo;
            setAuth({ user, pass: "", reset: () => setAuth(null) });
          }
        }
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  if (!sessionChecked) return null;

  return (
    socket && (
      <BrowserRouter>
        <ThemeContext.Provider value={{ theme, setTheme }}>
          <Routes>
            <Route path="/login" element={<Login setAuth={(auth) => setAuth(auth)} />} />
            <Route
              element={
                <LoggedInRoute auth={auth} socket={socket}>
                  <TimeContextKeeper updateFrequency={20 * 1000}>
                    <ErrorBoundary fallbackRender={fallback}>
                      <Layout />
                    </ErrorBoundary>
                  </TimeContextKeeper>
                </LoggedInRoute>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/forum" element={<ThreadList />} />
              <Route path="/forum/post/new" element={<NewThread />} />
              <Route path="/forum/post/:threadId" element={<ThreadPage />} />
              <Route path="/games" element={<GameList />} />
              <Route path="/friends" element={<FriendsList />} />
              <Route path="/messages" element={<MessagePage />} />
              <Route path="/game/new" element={<NewGame />} />
              <Route path="/game/:gameId" element={<Game />} />
              <Route path="/clan" element={<ClanPage />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/*" element={<NoSuchRoute />} />
            </Route>
          </Routes>
        </ThemeContext.Provider>
      </BrowserRouter>
    )
  );
}

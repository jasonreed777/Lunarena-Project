import type { SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import NimGame from "./NimGame.tsx";
import GuessGame from "./GuessGame.tsx";
import MineFinderGame from "./MineFinderGame.tsx";
import CircleConnectGame from "./CircleConnectGame.tsx";
import { type JSX } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";

interface GameDispatchProps {
  userPlayerIndex: number;
  players: SafeUserInfo[];
  gameId: string;
  view: TaggedGameView;
}

export default function GameDispatch({
  userPlayerIndex,
  gameId,
  players,
  view,
}: GameDispatchProps): JSX.Element {
  const { socket } = useLoginContext();

  function makeMove(move: unknown) {
    socket.emit("gameMakeMove", { gameId, move });
  }

  const childProps = { userPlayerIndex, players, makeMove };
  switch (view.type) {
    case "nim":
      return <NimGame {...{ ...childProps, view: view.view }} />;
    case "guess":
      return <GuessGame {...{ ...childProps, view: view.view }} />;
    case "minesweeper":
      return <MineFinderGame {...{ ...childProps, view: view.view }} />;
    case "circleconnect":
      return <CircleConnectGame {...{ ...childProps, view: view.view }} />;
  }
}

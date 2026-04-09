import type { GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `gameKey`
 *  - Form value `isTutorial`
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange`, `handleTutorialChange`, and `handleSubmit`
 */
export default function useNewGameForm() {
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [isTutorial, setIsTutorial] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);

    // type assertion is safe because NewGame.tsx only allows selection of
    // valid game keys
    setGameKey(e.target.value as GameKey | "");
  };

  // update whether the user wants to play a tutorial game
  const handleTutorialChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    setIsTutorial(e.target.checked);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }

    setErr(null);
    const game = await createGame(gameKey, isTutorial);
    if ("error" in game) {
      setErr(game.error);
      return;
    }

    navigate(`/game/${game.gameId}`);
  };

  return {
    gameKey,
    isTutorial,
    err,
    handleInputChange,
    handleTutorialChange,
    handleSubmit,
  };
}

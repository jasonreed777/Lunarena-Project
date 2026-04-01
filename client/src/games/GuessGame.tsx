import type { GuessMove, GuessView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import { useContext, useState } from "react";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "../components/Buttons.tsx";

export default function GuessGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<GuessView, GuessMove>) {
  const { theme } = useContext(ThemeContext);
  const [guess, setGuess] = useState(16);
  const playerHasGuessed = view.finished || view.guesses[userPlayerIndex] !== false;

  /** Checks if a best is the best guess */
  function isBestGuess(index: number) {
    if (!view.finished) return false;
    const guess = view.guesses[index];
    for (const otherGuess of view.guesses) {
      if (Math.abs(otherGuess - view.secret) < Math.abs(guess - view.secret)) {
        return false;
      }
    }
    return true;
  }

  /** Get the response text for a specific player's guess */
  function getGuessText(guess: boolean | number, index: number) {
    if (index === userPlayerIndex) {
      if (view.finished) return `You guessed ${guess}`;
      return view.myGuess ? `You guessed ${view.myGuess}` : "You haven't guessed yet";
    }
    if (guess === false) {
      return `${players[index].display} hasn't guessed yet`;
    }
    if (guess === true) {
      return `${players[index].display} has guessed`;
    }
    return `${players[index].display} guessed ${guess}`;
  }

  return (
    <div className="content" style={{ color: theme.text }}>
      <Typography.Paragraph style={{ color: theme.text }}>
        In the guessing game, players guess a number between 1 and 100. The closest wins!
      </Typography.Paragraph>
      <ul>
        {view.guesses.map((guess, index) => (
          <li key={index}>
            <Typography.Paragraph style={{ color: theme.text }}>
              {getGuessText(guess, index)}
              {isBestGuess(index) && " 👑"}
            </Typography.Paragraph>
          </li>
        ))}
      </ul>
      <Divider color={theme.text} />
      {view.finished && (
        <Typography.Code
          style={{ color: theme.text }}
        >{`Game over! The secret was ${view.secret}`}</Typography.Code>
      )}
      {!view.finished &&
        userPlayerIndex >= 0 &&
        (playerHasGuessed ? (
          <Typography.Code style={{ color: theme.text }}>
            Waiting for other players...
          </Typography.Code>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              makeMove(guess);
            }}
          >
            <Typography.Paragraph style={{ color: theme.text }}>
              Guess a number between 1 and 100!
            </Typography.Paragraph>
            <input
              type="range"
              value={guess}
              min={1}
              max={100}
              step={1}
              onChange={(e) => setGuess(parseInt(e.target.value))}
            />
            <Typography.Paragraph style={{ marginBottom: "10px", color: theme.text }}>
              Ready to guess {guess}?
            </Typography.Paragraph>
            <Button color={theme.text} text={theme.text}>
              Submit Guess
            </Button>
          </form>
        ))}
    </div>
  );
}

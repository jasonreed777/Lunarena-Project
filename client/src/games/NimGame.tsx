import type { NimMove, NimView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import { TranslucentButton as Button } from "../components/Buttons.tsx";

export default function NimGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<NimView, NimMove>) {
  const { theme } = useContext(ThemeContext);
  const disabled = userPlayerIndex !== view.nextPlayer;

  /** Player's name */
  function playerDisplay(index: number) {
    return index === userPlayerIndex ? "you" : players[index].display;
  }

  /** Possessive form of player's name */
  function playerPoss(index: number) {
    return index === userPlayerIndex ? "your" : `${players[index].display}'s`;
  }

  return (
    <div className="content" style={{ color: theme.text }}>
      <div>
        <Typography.HeaderStats style={{ marginBottom: "10px" }}>
          The game of Nim is played as follows:
        </Typography.HeaderStats>
        <ol style={{ marginBottom: "10px" }}>
          <li>
            <Typography.Paragraph style={{ color: theme.text }}>
              The game starts with a pile of objects.
            </Typography.Paragraph>
          </li>
          <li>
            <Typography.Paragraph style={{ color: theme.text }}>
              Players take turns removing objects from the pile.
            </Typography.Paragraph>
          </li>
          <li>
            <Typography.Paragraph style={{ color: theme.text }}>
              On their turn, a player must remove 1, 2, or 3 objects from the pile.
            </Typography.Paragraph>
          </li>
          <li>
            <Typography.Paragraph style={{ color: theme.text }}>
              The player who removes the last object loses the game.
            </Typography.Paragraph>
          </li>
        </ol>
        <Typography.SmallText>
          Think strategically and try to force your opponent into a losing position!
        </Typography.SmallText>
      </div>
      <Divider color={theme.text} />
      <Typography.LargeParagraph style={{ color: theme.text }}>
        Current game
      </Typography.LargeParagraph>
      <Typography.Paragraph style={{ color: theme.text }}>
        There are {view.remaining} object{view.remaining !== 1 && "s"} left in the pile.
      </Typography.Paragraph>
      {view.remaining > 0 && (
        <Typography.Paragraph style={{ color: theme.text }}>
          Currently it is {playerPoss(view.nextPlayer)} turn.
        </Typography.Paragraph>
      )}
      {view.remaining === 0 && !view.forfeited && (
        <Typography.Code style={{ color: theme.text }}>
          The game is over: {playerDisplay(view.nextPlayer)} won by forcing{" "}
          {playerDisplay(1 - view.nextPlayer)} to take the last object.
        </Typography.Code>
      )}
      {view.remaining === 0 && view.forfeited && (
        <Typography.Code style={{ color: theme.text }}>
          The game is over: {playerDisplay(1 - view.nextPlayer)} forfeited.{" "}
          {view.nextPlayer === userPlayerIndex
            ? "You win!"
            : `${players[view.nextPlayer].display} wins!`}
        </Typography.Code>
      )}
      {userPlayerIndex >= 0 && (
        <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
          <Button
            disabled={disabled || view.remaining < 1}
            onClick={() => makeMove(1)}
            color="#43b9c6"
            text="#43b9c6"
          >
            Take one
          </Button>
          <Button
            disabled={disabled || view.remaining < 2}
            onClick={() => makeMove(2)}
            color="#43b9c6"
            text="#43b9c6"
          >
            Take two
          </Button>
          <Button
            disabled={disabled || view.remaining < 3}
            onClick={() => makeMove(3)}
            color="#43b9c6"
            text="#43b9c6"
          >
            Take three
          </Button>
          <Button disabled={disabled} onClick={() => makeMove(0)} color="#e01313" text="#e01313">
            Forfeit
          </Button>
        </div>
      )}
    </div>
  );
}

import "./ClanPage.css";
import * as Typography from "../libs/Typography";
import { type ClanRole, UserPill } from "../components/UserPill";
import { Divider } from "../components/Divider";
import { ClanPill } from "../components/ClanPill";
import useGameList from "../hooks/useGameList";
import { RecentlyPlayed } from "../components/RecentlyPlayed";
import type { Game, GameInfo } from "@gamenite/shared";

// TODO: This is very not-done
type Statistics = {
  nim: number;
  numGuess: number;
  minesweeper: number;
};

// TODO: Remove this type
export type SafeUserInfoClanStuff = {
  color: string;
  role: ClanRole;
  username: string;
  display: string;
  createdAt: Date;
};

export type Clan = {
  name: string;
  stats: Statistics;
  members: SafeUserInfoClanStuff[];
  color: string;
  sponsors?: string[];
  icon: string;
};

const ALL_GAMES = ["Nim", "Number Guesser", "Minesweeper"];

/**
 * A list of three clans in terms of overall placement of a single game
 * @param game the Game of this stat list
 * @param clans a list of three clans - the middle clan will be the user's clan
 * @param value the placement of the user's clan in a game
 * @returns
 */
const StatList: React.FC<{ game: Game; clans: Clan[]; value: number }> = ({
  game,
  clans,
  value,
}) => {
  return (
    <div id="statContainer">
      <Typography.SubtitleSmall>{game.toString().toUpperCase()}</Typography.SubtitleSmall>
      <div id="clanGroup">
        {clans.map((clan, index) => (
          <ClanPill clan={clan} small={index !== 1} value={index - 1 + value} />
        ))}
      </div>
    </div>
  );
};

/**
 * A clan page that contains clan information. This includes the name, picture, and statistics associated with each clan.
 * @returns Clan Page Component
 */
export const ClanPage: React.FC = () => {
  const gameList = useGameList(8) as GameInfo[]; // TODO: This will be extracted from the backend rather than here

  // TODO: This is just for testing purposes---clan type is not finalized
  const clan: Clan = {
    name: "Clan 307",
    stats: {
      nim: 57,
      numGuess: 24,
      minesweeper: 2,
    },
    members: [
      {
        username: "jason",
        display: "jasonreed777",
        createdAt: new Date(),
        color: "#BBD937",
        role: "admin",
      },
      {
        username: "jay",
        display: "jayatal",
        createdAt: new Date(),
        color: "#A4C1D6",
        role: "mod",
      },
      {
        username: "charlie",
        display: "SupremeLeaderC",
        createdAt: new Date(),
        color: "#E75D26",
        role: "member",
      },
      {
        username: "tucker",
        display: "ucktay",
        createdAt: new Date(),
        color: "#E5D9BD",
        role: "member",
      },
    ],
    color: "#FFFFFF",
    icon: "",
  };

  return (
    <div className="clanContainer">
      <Typography.PageTitle>{clan.name}</Typography.PageTitle>
      <Typography.Subtitle>Statistics</Typography.Subtitle>
      <Divider />
      <div className="stats">
        {ALL_GAMES.map((game) => (
          <div className="statContainer">
            <StatList game={game as unknown as Game} clans={[clan, clan, clan]} value={57} />
          </div>
        ))}
      </div>
      <div className="clanInfo">
        <div className="members">
          <Typography.Subtitle>Members</Typography.Subtitle>
          <Divider />
          <div className="member-list">
            {clan.members.map((member) => {
              /* Sort by role */
              return <UserPill user={member} />;
            })}
          </div>
          {/* <Divider vertical={true} /> */}
        </div>
        <div className="recentlyPlayed">
          <Typography.Subtitle>Recently Played</Typography.Subtitle>
          <Divider />
          {"message" in gameList ? (
            <p>waiting</p>
          ) : (
            gameList.map((game, index) => (
              <RecentlyPlayed
                game={game.type}
                players={game.players}
                position={index + 1}
                timeAgo={game.createdAt}
              />
            ))
          )}
          {/* <Divider vertical={true} /> */}
        </div>
        <div className="sponsors">
          <Typography.Subtitle>Sponsors</Typography.Subtitle>
          <Divider />
        </div>
      </div>
    </div>
  );
};

import "./ClanPage.css";
import * as Typography from "../libs/Typography";
import { UserPill } from "../components/UserPill";
import { Divider } from "../components/Divider";
import { ClanPill } from "../components/ClanPill";
import useGameList from "../hooks/useGameList";
import { RecentlyPlayed } from "../components/RecentlyPlayed";
import type { Game, GameInfo } from "@gamenite/shared";
import type { UserProfileRecord } from "../util/types";
import { LogoImage } from "../components/LogoImage";
import React from "react";
import { ThemeContext } from "../contexts/ThemeContext";

// TODO: This can include more if needed-right now it just references the overall placement of the clan
type Statistics = {
  nim: number;
  guess: number;
  minesweeper: number;
};

export type Clan = {
  name: string;
  stats: Statistics;
  members: UserProfileRecord[];
  color: string;
  sponsors?: string[];
  icon: string;
};

const ALL_GAMES = ["nim", "guess", "minesweeper"];

/**
 * A list of three clans in terms of overall placement of a single game
 * @param game the Game of this stat list
 * @param clans a list of three clans - the middle clan will be the user's clan
 * @param value the placement of the user's clan in a game
 * @returns
 */
const StatList: React.FC<{
  game: Game;
  clans: Clan[];
  value: number;
  color: string;
  themeId: string;
}> = ({ game, clans, value, color, themeId }) => {
  return (
    <div>
      <Typography.SubtitleSmall style={{ color }}>
        {game.toString().toUpperCase()}
      </Typography.SubtitleSmall>
      <div id="clanGroup">
        {clans.map((clan, index) => (
          <ClanPill clan={clan} small={index !== 1} value={index - 1 + value} themeId={themeId} />
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
      guess: 24,
      minesweeper: 2,
    },
    members: [
      {
        username: "jason",
        titleId: "jasonreed777",
        profileBorderColor: "#BBD937",
        bio: "jason's bio",
        pfp: {
          type: "avatar",
          uploadId: undefined,
          avatarId: "/assets/avatars/wizard.png", // This will normally reference an ID, but I'm faking it for now for testing
        },
        updatedAt: new Date(),
        onlinePresence: {
          status: "active",
          activeGameId: undefined,
          lastActive: new Date(),
        },
      },
      {
        username: "jay",
        titleId: "jayatal",
        profileBorderColor: "#A4C1D6",
        bio: "jay's bio",
        pfp: {
          type: "avatar",
          uploadId: undefined,
          avatarId: "/public/avatars/knight.png",
        },
        updatedAt: new Date(),
        onlinePresence: {
          status: "active",
          activeGameId: undefined,
          lastActive: new Date(),
        },
      },
      {
        username: "charlie",
        titleId: "SupremeLeaderC",
        profileBorderColor: "#E75D26",
        bio: "charlie's bio",
        pfp: {
          type: "avatar",
          uploadId: undefined,
          avatarId: "/public/avatars/dog.png",
        },
        updatedAt: new Date(),
        onlinePresence: {
          status: "active",
          activeGameId: undefined,
          lastActive: new Date(),
        },
      },
      {
        username: "tucker",
        titleId: "ucktay",
        profileBorderColor: "#E5D9BD",
        bio: "tucker's bio",
        pfp: {
          type: "avatar",
          uploadId: undefined,
          avatarId: "/public/avatars/gamer.png",
        },
        updatedAt: new Date(),
        onlinePresence: {
          status: "active",
          activeGameId: undefined,
          lastActive: new Date(),
        },
      },
    ],
    color: "#D193ED",
    icon: "/assets/avatars/gorilla.png",
  };
  const clan2: Clan = {
    name: "2GoodAtNim",
    stats: {
      nim: 56,
      guess: 30,
      minesweeper: 10,
    },
    members: [],
    color: "#49DBD2",
    icon: "/assets/avatars/dragon.png",
  };
  const clan3: Clan = {
    name: "Great Group",
    stats: {
      nim: 58,
      guess: 31,
      minesweeper: 11,
    },
    members: [],
    color: "#FF7A14",
    icon: "/assets/avatars/tiger.png",
  };

  const { theme } = React.useContext(ThemeContext);

  return (
    <div className="clan-container" style={{ backgroundColor: theme.primary, color: theme.text }}>
      <div className="title-row">
        <Typography.PageTitle>{clan.name}</Typography.PageTitle>
        <img src={clan.icon} className="icon-lg" style={{ border: `10px solid ${clan.color}` }} />
      </div>
      <Typography.Subtitle>Statistics</Typography.Subtitle>
      <Divider color={theme.text} />
      <div className="stats">
        {ALL_GAMES.map((game) => (
          <div className="stat-container">
            <StatList
              game={game as unknown as Game}
              clans={/* this should pull two clans from the backend */ [clan, clan2, clan3]}
              value={clan.stats[game as Game]}
              color={theme.secondaryText}
              themeId={theme._id}
            />
          </div>
        ))}
      </div>
      <div className="clan-info">
        <div className="members">
          <Typography.Subtitle>Members</Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 20 }} />
          <div className="member-list clan-info-column">
            {clan.members.map((member) => {
              /* Sort by role */
              return <UserPill user={member} themeId={theme._id} />;
            })}
          </div>
        </div>
        <div className="recently-played">
          <Typography.Subtitle>Recently Played</Typography.Subtitle>
          <Divider color={theme.text} style={{ marginBottom: 10 }} />
          <div className="recently-played-list clan-info-column">
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
          </div>
        </div>
        {
          <div className="sponsors">
            <Typography.Subtitle>Sponsors</Typography.Subtitle>
            <Divider color={theme.text} style={{ marginBottom: 20 }} />
            <div className="sponsor-list">
              {clan.sponsors?.map((sponsor) => (
                <img src="/assets/avatars/knight.png" />
              ))}
            </div>
          </div>
        }
        <LogoImage />
      </div>
    </div>
  );
};

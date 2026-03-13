import { type GameKey } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
};

// Avatars to choose from for profile pictures
export const AVATARS = [
  { avatarId: "wizard", label: "Wizard", imageUrl: "/public/avatars/wizard.png" },
  { avatarId: "knight", label: "Knight", imageUrl: "/public/avatars/knight.png" },
  { avatarId: "tiger", label: "Tiger", imageUrl: "/public/avatars/tiger.png" },
  { avatarId: "dog", label: "Dog", imageUrl: "/public/avatars/dog.png" },
  { avatarId: "dragon", label: "Dragon", imageUrl: "/public/avatars/dragon.png" },
  { avatarId: "gamer", label: "Gamer", imageUrl: "/public/avatars/gamer.png" },
  { avatarId: "gorilla", label: "Gorilla", imageUrl: "/public/avatars/gorilla.png" },
  { avatarId: "chef", label: "Chef", imageUrl: "/public/avatars/chef.png" },
  {
    avatarId: "soccer_player",
    label: "Soccer Player",
    imageUrl: "/public/avatars/soccer player.png",
  },
];

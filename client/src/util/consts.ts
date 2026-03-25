import { type GameKey } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
};

// Avatars to choose from for profile pictures
export const AVATARS = [
  { avatarId: "wizard", label: "Wizard", imageUrl: "/avatars/wizard.png" },
  { avatarId: "knight", label: "Knight", imageUrl: "/avatars/knight.png" },
  { avatarId: "tiger", label: "Tiger", imageUrl: "/avatars/tiger.png" },
  { avatarId: "dog", label: "Dog", imageUrl: "/avatars/dog.png" },
  { avatarId: "dragon", label: "Dragon", imageUrl: "/avatars/dragon.png" },
  { avatarId: "gamer", label: "Gamer", imageUrl: "/avatars/gamer.png" },
  { avatarId: "gorilla", label: "Gorilla", imageUrl: "/avatars/gorilla.png" },
  { avatarId: "chef", label: "Chef", imageUrl: "/avatars/chef.png" },
  {
    avatarId: "soccer_player",
    label: "Soccer Player",
    imageUrl: "/avatars/soccer player.png",
  },
];

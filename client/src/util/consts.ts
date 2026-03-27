import { type GameKey } from "@gamenite/shared";

export const gameNames: { [key in GameKey]: string } = {
  nim: "Nim",
  guess: "Number Guesser",
};

// Avatars to choose from for profile pictures
export const AVATARS = [
  { avatarId: "wizard", label: "Wizard", imageUrl: "/assets/avatars/wizard.png" },
  { avatarId: "knight", label: "Knight", imageUrl: "/assets/avatars/knight.png" },
  { avatarId: "tiger", label: "Tiger", imageUrl: "/assets/avatars/tiger.png" },
  { avatarId: "dog", label: "Dog", imageUrl: "/assets/avatars/dog.png" },
  { avatarId: "dragon", label: "Dragon", imageUrl: "/assets/avatars/dragon.png" },
  { avatarId: "gamer", label: "Gamer", imageUrl: "/assets/avatars/gamer.png" },
  { avatarId: "gorilla", label: "Gorilla", imageUrl: "/assets/avatars/gorilla.png" },
  { avatarId: "chef", label: "Chef", imageUrl: "/assets/avatars/chef.png" },
  {
    avatarId: "soccer_player",
    label: "Soccer Player",
    imageUrl: "/assets/avatars/soccer player.png",
  },
];

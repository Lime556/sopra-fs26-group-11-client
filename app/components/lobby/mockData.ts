import type { LobbyItem } from "@/components/lobby/LobbiesTab";
import type { Friend } from "@/components/lobby/FriendDetailTab";
import type { FriendRequest } from "@/components/lobby/FriendsTab";

export const mockFriendRequests: FriendRequest[] = [
  {
    id: 1,
    userId: "USR-78291",
    username: "ProGamer",
    message: "Hey, want to play some Catan?",
    date: "2026-03-14",
  },
  {
    id: 2,
    userId: "USR-45632",
    username: "CatanMaster",
    message: "Looking for regular game partners!",
    date: "2026-03-13",
  },
];

export const mockLobbies: LobbyItem[] = [
  {
    id: 1,
    name: "Epic Game",
    capacity: 4,
    currentPlayers: 2,
    privateLobby: false,
  },
  {
    id: 2,
    name: "Beginners Welcome",
    capacity: 3,
    currentPlayers: 1,
    privateLobby: false,
  },
  {
    id: 3,
    name: "Pro Players Only",
    capacity: 4,
    currentPlayers: 3,
    privateLobby: true,
  },
  {
    id: 4,
    name: "Casual Fun",
    capacity: 4,
    currentPlayers: 2,
    privateLobby: false,
  },
];

export const mockFriends: Friend[] = [
  {
    id: 1,
    name: "Player123",
    userId: "USR-12345",
    status: "online",
    gamesPlayed: 10,
    wins: 5,
    gameHistory: [
      { id: 1, date: "2026-03-12", result: "Victory", points: 10 },
      { id: 2, date: "2026-03-11", result: "2nd Place", points: 8 },
      { id: 3, date: "2026-03-10", result: "3rd Place", points: 6 },
    ],
  },
  {
    id: 2,
    name: "GameMaster",
    userId: "USR-67890",
    status: "in-game",
    gamesPlayed: 15,
    wins: 8,
    gameHistory: [
      { id: 4, date: "2026-03-09", result: "Victory", points: 12 },
      { id: 5, date: "2026-03-08", result: "2nd Place", points: 9 },
      { id: 6, date: "2026-03-07", result: "3rd Place", points: 7 },
    ],
  },
  {
    id: 3,
    name: "CatanFan",
    userId: "USR-54321",
    status: "offline",
    gamesPlayed: 5,
    wins: 2,
    gameHistory: [
      { id: 7, date: "2026-03-06", result: "Victory", points: 11 },
      { id: 8, date: "2026-03-05", result: "2nd Place", points: 8 },
      { id: 9, date: "2026-03-04", result: "3rd Place", points: 5 },
    ],
  },
];

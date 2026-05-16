export type TutorialStep = {
  id: string;
  target?: string;
  title: string;
  description: string;
};

export const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to the Catan Tutorial!",
    description:
      "This short tutorial will guide you through the game interface and explain the most important parts of the board.",
  },
  {
    id: "board",
    target: "board",
    title: "The Board",
    description:
      "This is the Catan board. Hex tiles adjacent to buildings produce resources when their dice number is rolled. The robber blocks resource production on the tile it occupies. The menu below the board allows you to roll dice, build roads, settlements, and cities, buy development cards, and end your turn.",
  },
  {
    id: "players",
    target: "players-panel",
    title: "Player Overview",
    description:
      "Here you can see the players and their assigned color, the amount of resources and development cards they have, the number ofknight cards played and the length of their longest road. The top right corner shows their victory points. The yellow background indicates the current player.",
  },
  {
    id: "resources",
    target: "resources-panel",
    title: "Resources",
    description:
      "The overview of your resources shows the amount of each resource you have. Resources are used to build roads, settlements, cities, and to buy development cards. It also shows how many roads and buildings you can still build.",
  },
  {
    id: "bank",
    target: "bank-panel",
    title: "Bank",
    description:
      "The bank stores remaining resources and development cards.",
  },
  {
    id: "trade",
    target: "trade-button",
    title: "Trading",
    description:
      "Players can trade with others or with the bank to gain needed resources.",
  },
  {
    id: "chat",
    target: "chat-panel",
    title: "Chat & Game Log",
    description:
      "The game log tracks important actions while the chat lets players communicate.",
  },
  {
    id: "exit",
    target: "exit-button",
    title: "Leaving the Game",
    description:
      "Use this button to leave the tutorial or game, and return to the lobby.",
  },
];
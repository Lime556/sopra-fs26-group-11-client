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
      "This is the Catan board. Hex tiles adjacent to buildings produce resources when their dice number is rolled. The desert tile produces no resources, which where the robber is placed. The robber blocks resource production on the tile it occupies.",
  },
  {
    id: "players",
    target: "players-panel",
    title: "Player Overview",
    description:
      "Here you can see the players and their assigned color. The four fields show the amount of resources and development cards they have, the number of knight cards played and the length of their longest road. The top right corner shows their victory points. The yellow background indicates the current player.",
  },
  {
    id: "victory-points",
    title: "Victory Points",
    description:
      "The goal of the game is to reach 10 victory points. You can earn them by...\n• Building settlements and upgrading them to cities\n• Having Victory Point cards\n• Having the longest road\n• Playing the most knight cards.",
  },
  {
    id: "resources",
    target: "resources-panel",
    title: "Resources",
    description:
      "The overview of your resources shows the amount of each resource you have. Resources are used to build roads, settlements, cities, and to buy development cards. It also shows how many roads and buildings you can still build.",
  },
  {
    id: "roll-dice",
    target: "roll-dice-button",
    title: "Rolling Dice",
    description:
      "At the start of each turn, you have to roll the dice. The result determines which hexes produce resources.\nIf you roll a 7, the robber is activated: You must move the robber to a new hex, blocking its resource production and stealing 1 random resource from a player with a building adjacent to that hex. If you have more than 7 resource cards, you must also discard half of them (rounded down).",
  },
  {
    id: "action-grid",
    target: "action-grid",
    title: "Action Overview",
    description:
      "Here you can build roads, settlements and cities, buy and play development cards. The needed resources for each action are shown while hovering over the buttons.",
  },
  {
    id: "development-cards",
    title: "Development Cards",
    description:
      "• Knight: Move the robber and steal 1 random resource from a player next to the robber’s new hex.\n • Victory Point: Gives you 1 victory point.\n• Road Building: Place 2 free roads.\n• Year of Plenty: Take 2 resource cards from the bank.\n• Monopoly: Choose a resource type and take all cards of that type from the other players.\nDevelopment cards appear with different frequencies.",
  },
  {
    id: "bank",
    target: "bank-panel",
    title: "Bank",
    description:
      "The bank stores remaining resources and development cards.",
  },
  {
    id: "trading",
    title: "Trading",
    description:
      "Players can trade with others or with the bank to gain needed resources. The standard bank trade ratio is 4:1, but if you have a settlement or city on a port, you can trade at a better ratio for that resource type.",
  },
  {
    id: "trade",
    target: "trade-button",
    title: "Trading Requests",
    description:
      "Trade requests can be sent here. Choose which resources you want to trade with other players or the bank.",
  },
  {
    id: "chat",
    target: "chat-panel",
    title: "Chat & Game Log",
    description:
      "The game log tracks important actions while the chat lets players communicate.",
  },
  {
    id: "end-turn",
    target: "end-turn-button",
    title: "Ending Your Turn",
    description:
      "After completing your actions, click the 'End Turn' button to pass the turn to the next player.",
  },
  {
    id: "exit",
    target: "exit-button",
    title: "Leaving the Game",
    description:
      "Use this button to leave the tutorial or game, and return to the lobby.",
  },
];
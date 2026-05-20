# Settlers of Catan - Web Client

## Introduction

This repository contains the web client for our SoPra implementation of Settlers of Catan. The client is responsible for everything the player sees and interacts with: login and registration, the lobby overview, joining or creating lobbies, the tutorial, and the actual in-browser game board.

Our goal was to make a playable online version of Catan where several players can meet in a lobby and play a full match together. We also added bots, a small social area, game history, and ambience/weather options to make the game feel less empty when testing or playing with fewer people.

## Technologies

- Next.js with React and TypeScript
- CSS Modules for styling
- Ant Design for some UI components
- Deno tools for linting and formatting through npm scripts

## High-level components

- **Gameboard**: Renders the main game UI and handles most board interactions, such as rolling, building, trading, and playing development cards. Main file: [app/gameboard/Gameboard.tsx](app/gameboard/Gameboard.tsx).
- **Lobby and matchmaking**: Lets users create, join, and manage lobbies before a game starts. Main folders: [app/(protected)/lobby](<app/(protected)/lobby>) and [app/components/lobby](app/components/lobby).
- **API client**: Contains the shared request logic used by the pages and components to communicate with the server. Main files: [app/api/apiService.ts](app/api/apiService.ts) and [app/api/pollingService.ts](app/api/pollingService.ts).
- **Hooks and shared helpers**: Small reusable utilities for API calls, local storage, environment handling, and other client-side state. Examples: [app/hooks/useApi.ts](app/hooks/useApi.ts), [app/hooks/useLocalStorage.tsx](app/hooks/useLocalStorage.tsx), and [app/utils/domain.ts](app/utils/domain.ts).

The general flow is that pages and components call the API service through hooks or helper functions. The lobby creates or joins a game session, and once the match starts the Gameboard polls the backend for updated game state.

## Launch & Development

Prerequisites:

- Node.js and npm
- Deno, if you want to run linting or formatting
- A running backend server, usually on `http://localhost:8080`

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The client then runs on [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run build      # build the production version
npm run start      # start the built production server
npm run lint       # run Deno lint
npm run fmt        # format the code with Deno
```

The API URL is selected in [app/utils/domain.ts](app/utils/domain.ts). In development it uses `http://localhost:8080`. In production it uses `NEXT_PUBLIC_PROD_API_URL` if it is set, otherwise it falls back to the deployed server URL.

We currently do not have a separate client-side test suite. Most testing for the game logic is done in the server repository, while the client was checked manually during development.

For deployment, build the project with `npm run build` and provide the production backend URL through `NEXT_PUBLIC_PROD_API_URL` if the default deployed server should not be used.

## Illustrations - Main user flows

![Lobby overview](<public/Read ME/Lobby screen .png>)

After login, the player arrives at the lobby overview. From here they can start the tutorial, create a new lobby, or join an existing one. The sidebar also gives access to friends, settings, and the game log of recently played matches.

![Lobby room](<public/Read ME/Lobby.png>)

Inside a lobby, players can wait until everyone is ready. The host can add bots and start the game once enough players have joined.

![Catan game board](<public/Read ME/Catan board.png>)

The game board is the main screen during a match. It shows the current board, player resources, development cards, victory points, longest road, largest army, the bank, chat/game log, and the possible actions for the current turn.

Important parts of the board:

1. Ambience/weather toggle, based on the current outside weather.
2. Bot mode toggle, for switching between Hugging Face based bots and deterministic fallback bots.
3. Total resources per player.
4. Development card count.
5. Played knights and largest army progress.
6. Longest road progress.
7. Victory points. The first player to reach 10 wins.
8. The current player's resources.
9. Bank resources and available development cards.
10. Trade window for bank and player trades.
11. In-game chat and game log.
12. Settlements, worth 1 victory point.
13. Cities, worth 2 victory points.
14. Ports, which improve trading ratios.
15. Available game actions, such as rolling, building, trading, and playing development cards.
16. Development cards in the player's hand.

## Roadmap

- Replace polling with WebSockets for smoother updates and better scalability.
- Improve accessibility and keyboard navigation on the game board.
- Add a replay or observer mode for finished and ongoing games.

## Authors & Acknowledgments

Developed by the `sopra-fs26-group-11` team for the SoPra course project in 2026.

## License

This repository is licensed under the Apache License 2.0. The license file is currently kept in the server repository.

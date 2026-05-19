# Settlers of Catan — Web Client

## Introduction

This repository contains the web client for a multiplayer implementation of Settlers of Catan used in the course project. The client provides the user interface for authentication, lobby management, and the in-browser gameboard used to play matches against other players.

The motivation for the project was to bring players together through a seamless and engaging  online experience, making strategy and competition accessible anytime, anywhere.


## Technologies

- Next.js (React + TypeScript)
- CSS Modules
- Ant Design components
- Deno tools for linting/formatting (project uses `deno lint` / `deno fmt` via npm scripts)

## High-level components

- **Gameboard**: Renders the main game UI and handles board interactions — `app/gameboard/Gameboard.tsx`.
- **Lobby / Matchmaking**: Create or join lobbies and ready-up flow — `app/(protected)/lobby` and `app/components/lobby`.
- **API client**: Communicates with the backend (REST) — `app/api/apiService.ts` and `app/api/pollingService.ts`.
- **Hooks & State**: Reusable hooks for API calls and local storage — `app/hooks/useApi.ts`, `app/hooks/useLocalStorage.tsx`.

These components interact as follows: the UI pages use hooks to call the API service; the Gameboard subscribes to game state updates polling served by the server; lobby components create and manage game sessions before handoff to the Gameboard.

## Launch & Development

Prerequisites: Node.js and npm.

Local development commands:

```bash
npm install
npm run dev        # Starts Next.js dev server on http://localhost:3000
npm run build      # Build for production
npm run start      # Start built production server
```

Linting / formatting:

```bash
npm run lint
npm run fmt
```

Notes: The client expects a running backend (see the server README in `../sopra-fs26-group-11-server`) reachable at the configured API base URL (default: `http://localhost:8080`).

## Illustrations — Main user flows
![alt text](<public/Read ME/Lobby screen .png>)

After login the Player gets in the Lobby overview screen where he can try the Tutorial to get to know the game, create a Lobby or join a already existing one. In the sidebar he can also chose to go to the frieds tab, his personal settings and his gamelog of the last 10 games played.

![alt text](<public/Read ME/Lobby.png>)

In the Lobby the host can add bots to the game and start the game after a sufficient amounts of players have joined.

![alt text](<public/Read ME/Catan board.png>)

On the Gameboard there are many things happening. To get a overview:

**1.**  To have a better ambiente the player can switch on and off the wather. The wather is based on what is outside at the moment.

**2.** To switch the bots from the Huggingface to the deterministic mode incase the Huggingface does not work anymore.

**3.** The ressources a player has counted togeather.

**4.** The amount of development cards a player has.

**5.** The amount of knights a player has played. When having more or equal to 3 the player with the most knights gets 2 victory points.

**6.** The amount of roads built in a system without any interruption. The longest longer or equal to 5 gets 2 victory points.

**7.** The victory points a player has. First to 10 wins. 

**8.** The ressources the player has at the moment.

**9.** The ressources and development cards in the Bank that can be distributed by rolling or trading with it.

**10.** Opens a trading window up where player and bank trades can be initiated.

**11.** The ingame chat combined with the gamelog to better understand what happened in the game.

**12.** A settlement built gives 1 victory point.

**13.** A citty built gives 2 victory points.

**14.** The port gives the player settled next to it a better trading ratio with the bank.

**15.** Game actions a player can make: Rolling the dice to get ressources (once a turn), play a development card, build a road, build a settlement, build a city and play a development card.

**16.** Development cards in the players hand that can be played.

## Roadmap

- For better scalability implement websocket for the polling.
- Improve accessibility & keyboard navigation for the Gameboard.
- Add client-side replay/observer mode.

## Authors & Acknowledgments

Project developed by the `sopra-fs26-group-11` team in the year 2026.

## License

This repository is licensed under the Apache License 2.0 — see the server `LICENSE` for the full text.

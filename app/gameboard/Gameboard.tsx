"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getApiDomain } from "@/utils/domain";
import { LogOut, Send } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { ApplicationError } from "@/types/error";
import { BoardColumn } from "./components/BoardColumn";
import { EndGameOverlay } from "./components/EndGameOverlay";
import { TradeModal } from "./components/TradeModal";
import {
	bankResourceColorByType,
	bankResources,
	developmentCardsRemaining,
	hexSize,
	resourceEmojiByType,
	resourceTypes,
	} from "./constants";
import {
	createCanonicalCornerKey,
	createCanonicalEdgeKey,
	getCanonicalRoadEndpoints,
	getCornerPoint,
	toPixel,
} from "./geometry";
import {
	createInitialGameState,
	fallbackColorForPlayer,
	findDesertHexId,
	mapBoardDtoToHexes,
	mapBoardDtoToPorts,
	mapResourcesFromServer,
	parseGameId,
} from "./mappers";
import {
	computeLongestRoadLength,
	mergeRoadLists,
	parseRoadEntry,
	rememberRoadsInCache,
} from "./roads";
import {
	type BoardGetDTO,
	type GameChatMessageDTO,
	type GameEventDTO,
	type GameGetDTO,
	type DevelopmentDeckDTO,
	type GameState,
	type GameStateDTO,
	type HexTile,
	type Player,
	type ResourceType,
	type TradeMode,
} from "./types";

const DEBUG_LOCAL = false;    // Set to true to use a hardcoded board and player state 

const developmentCardDisplayName: Record<string, string> = {
	knight: "Knight",
	victory_point: "Victory Point",
	road_building: "Road Building",
	year_of_plenty: "Year of Plenty",
	monopoly: "Monopoly",
};

function formatDevelopmentCardName(cardName: string): string {
	return developmentCardDisplayName[cardName] ?? cardName;
}

function drawLocalDevelopmentCard(deck: DevelopmentDeckDTO | null): { card: string; deck: DevelopmentDeckDTO } | null {
	const currentDeck: DevelopmentDeckDTO = deck ?? {
		knight: 14,
		victory_point: 5,
		road_building: 2,
		year_of_plenty: 2,
		monopoly: 2,
		remaining: developmentCardsRemaining,
	};

	const counts = {
		knight: Math.max(0, currentDeck.knight ?? 14),
		victory_point: Math.max(0, currentDeck.victory_point ?? 5),
		road_building: Math.max(0, currentDeck.road_building ?? 2),
		year_of_plenty: Math.max(0, currentDeck.year_of_plenty ?? 2),
		monopoly: Math.max(0, currentDeck.monopoly ?? 2),
	};

	const total = counts.knight + counts.victory_point + counts.road_building + counts.year_of_plenty + counts.monopoly;
	if (total <= 0) {
		return null;
	}

	const knightCount = counts.knight;
	const victoryPointCount = counts.victory_point;
	const roadBuildingCount = counts.road_building;
	const yearOfPlentyCount = counts.year_of_plenty;
	const monopolyCount = counts.monopoly;

	let draw = Math.floor(Math.random() * total);
	const nextDeck: DevelopmentDeckDTO = {
		knight: knightCount,
		victory_point: victoryPointCount,
		road_building: roadBuildingCount,
		year_of_plenty: yearOfPlentyCount,
		monopoly: monopolyCount,
		remaining: Math.max(0, (currentDeck.remaining ?? total) - 1),
	};

	if (draw < knightCount) {
		nextDeck.knight = knightCount - 1;
		return { card: "knight", deck: nextDeck };
	}

	draw -= knightCount;
	if (draw < victoryPointCount) {
		nextDeck.victory_point = victoryPointCount - 1;
		return { card: "victory_point", deck: nextDeck };
	}

	draw -= victoryPointCount;
	if (draw < roadBuildingCount) {
		nextDeck.road_building = roadBuildingCount - 1;
		return { card: "road_building", deck: nextDeck };
	}

	draw -= roadBuildingCount;
	if (draw < yearOfPlentyCount) {
		nextDeck.year_of_plenty = yearOfPlentyCount - 1;
		return { card: "year_of_plenty", deck: nextDeck };
	}

	nextDeck.monopoly = monopolyCount - 1;
	return { card: "monopoly", deck: nextDeck };
}

export default function Gameboard() {
	const router = useRouter();
	const apiService = useApi();
	const searchParams = useSearchParams();
	const { value: sessionUsername } = useLocalStorage<string>("username", "", { storage: "session" });
	const [state, setState] = useState<GameState>(createInitialGameState);
	const [boardStatus, setBoardStatus] = useState<string>("Loading board...");
	const [gameLog, setGameLog] = useState<string[]>(["Trading ready."]);
	const [tradeMode, setTradeMode] = useState<TradeMode>("bank");
	const [giveResource, setGiveResource] = useState<ResourceType>("wood");
	const [receiveResource, setReceiveResource] = useState<ResourceType>("wheat");
	const [tradeAmount, setTradeAmount] = useState<number>(1);
	const [targetPlayerId, setTargetPlayerId] = useState<number | null>(null);
	const [showTradePopup, setShowTradePopup] = useState<boolean>(false);
	const [chatMessage, setChatMessage] = useState<string>("");
	const [winnerPlayerName, setWinnerPlayerName] = useState<string | null>(null);
	const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
	const [showDicePopup, setShowDicePopup] = useState<boolean>(false);
	const [dicePopupValue, setDicePopupValue] = useState<number | null>(null);
	const [activeGameId, setActiveGameId] = useState<number | null>(null);
	const [placementMode, setPlacementMode] = useState<"road" | "settlement" | "city" | "knight" | null>(null);
	const [isDevCardPlayMode, setIsDevCardPlayMode] = useState<boolean>(false);
	const syncedChatMessagesRef = useRef<Set<string>>(new Set());
	const roadCacheRef = useRef<Map<number, Set<string>>>(new Map());
	const dicePopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const ports = Array.isArray(state.ports) ? state.ports : [];

	const showDiceResultPopup = (diceValue: number) => {
		setDicePopupValue(diceValue);
		setShowDicePopup(true);
		if (dicePopupTimeoutRef.current !== null) {
			globalThis.clearTimeout(dicePopupTimeoutRef.current);
		}
		dicePopupTimeoutRef.current = globalThis.setTimeout(() => {
			setShowDicePopup(false);
			dicePopupTimeoutRef.current = null;
		}, 2600);
	};

	useEffect(() => {
		if (!activeGameId) {
			return;
		}

		const storageKey = `gameLog:${activeGameId}`;
		const stored = sessionStorage.getItem(storageKey);
		if (!stored) {
			return;
		}

		try {
			const parsed = JSON.parse(stored) as unknown;
			if (Array.isArray(parsed)) {
				const restoredEntries = parsed
					.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
					.slice(0, 40);
				if (restoredEntries.length > 0) {
					setGameLog(restoredEntries);
				}
			}
		} catch {
			// Ignore corrupted local log cache.
		}
	}, [activeGameId]);

	useEffect(() => {
		if (!activeGameId) {
			return;
		}

		const storageKey = `gameLog:${activeGameId}`;
		sessionStorage.setItem(storageKey, JSON.stringify(gameLog.slice(0, 40)));
	}, [activeGameId, gameLog]);

	useEffect(() => {
		if (!Array.isArray(state.ports)) {
			setState((previousState) => ({
				...previousState,
				ports: [],
			}));
		}
	}, [state.ports]);

	useEffect(() => {
		let cancelled = false;

		if (DEBUG_LOCAL) {
			const mockBoard: BoardGetDTO = {
				hexTiles: [
					"SHEEP", "WHEAT", "WOOD",
					"BRICK", "ORE", "SHEEP", "WHEAT",
					"WOOD", "DESERT", "WOOD", "WHEAT", "BRICK",
					"ORE", "WOOD", "ORE", "SHEEP",
					"BRICK", "WHEAT", "SHEEP",
				],
				hexTile_DiceNumbers: [
					10, 2, 9,
					12, 6, 4, 10,
					9, -1, 11, 3, 8,
					8, 3, 4, 5,
					5, 6, 11,
				],
				intersections: [],
				edges: [],
				ports: [],
				boats: [],
			};
		
			const mappedHexes = mapBoardDtoToHexes(mockBoard);
		
			setActiveGameId(999);
			setBoardStatus("");
			setState({
				hexes: mappedHexes,
				ports: [],
				robberHexId: 9,
				currentPlayerId: myPlayer?.id ? myPlayer.id : 1,
				diceResult: 8,
				turnPhase: "ACTION",
				developmentDeck: {
					knight: 14,
					victory_point: 5,
					road_building: 2,
					year_of_plenty: 2,
					monopoly: 2,
					remaining: developmentCardsRemaining,
				},
				players: [
					{
						id: 1,
						name: sessionUsername?.trim() ? sessionUsername : "Tester 1",
						color: "#d13f34",
						resources: {
							wood: 100,
							brick: 100,
							wool: 100,
							wheat: 100,
							ore: 100,
						},
						victoryPoints: 3,
						developmentCards: [],
						knightsPlayed: 0,
						developmentCardVictoryPoints: 0,
						freeRoadBuildsRemaining: 0,
						hasLongestRoad: false,
						roadsOnEdges: [{ hexId: 9, edge: 0 }],
						settlementsOnCorners: [{ hexId: 9, corner: 0 }],
						citiesOnCorners: [],
					},
					{
						id: 2,
						name: "Bot Blue",
						color: "#2e7ccf",
						resources: {
							wood: 5,
							brick: 5,
							wool: 5,
							wheat: 5,
							ore: 5,
						},
						victoryPoints: 2,
						developmentCards: [],
						knightsPlayed: 0,
						developmentCardVictoryPoints: 0,
						freeRoadBuildsRemaining: 0,
						hasLongestRoad: false,
						roadsOnEdges: [{ hexId: 5, edge: 2 }],
						settlementsOnCorners: [{ hexId: 5, corner: 2 }],
						citiesOnCorners: [],
					},
				],
			});
		
			return;
		}

		syncedChatMessagesRef.current = new Set();
		roadCacheRef.current = new Map();

		const readStoredGameId = (): number | null => {
			const sessionGameId = parseGameId(sessionStorage.getItem("gameId"));
			if (sessionGameId) {
				return sessionGameId;
			}

			const legacyGameId = parseGameId(localStorage.getItem("gameId"));
			if (legacyGameId) {
				sessionStorage.setItem("gameId", JSON.stringify(legacyGameId));
				localStorage.removeItem("gameId");
			}

			return legacyGameId;
		};

		const syncGameState = async (gameId: number): Promise<"ok" | "unauthorized" | "notfound" | "error"> => {
			try {
				const [boardDto, gameDto] = await Promise.all([
					apiService.get<BoardGetDTO>(`/games/${gameId}/board`),
					apiService.get<GameGetDTO>(`/games/${gameId}`),
				]);

				const resolvedBoard = boardDto ?? gameDto?.board ?? null;
				const hasBoardData = Boolean(
					resolvedBoard
					&& Array.isArray(resolvedBoard.hexTiles)
					&& resolvedBoard.hexTiles.length >= 19
					&& Array.isArray(resolvedBoard.hexTile_DiceNumbers)
					&& resolvedBoard.hexTile_DiceNumbers.length >= 19
				);

				if (!hasBoardData) {
					if (!cancelled) {
						setBoardStatus("Board is initializing. Please wait...");
					}
					return "error";
				}

				if (!cancelled) {
					const mappedHexes = mapBoardDtoToHexes(resolvedBoard as BoardGetDTO);
					const mappedPorts = mapBoardDtoToPorts(resolvedBoard as BoardGetDTO);
					const serverPlayers = Array.isArray(gameDto?.players) ? gameDto.players : [];
					const serverChatMessages = Array.isArray(gameDto?.chatMessages)
						? gameDto.chatMessages.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
						: [];
					setState((previousState) => ({
						...previousState,
						hexes: mappedHexes,
						ports: mappedPorts,
						robberHexId: gameDto?.robberTileIndex ?? findDesertHexId(mappedHexes),
						developmentDeck: gameDto?.developmentDeck ?? previousState.developmentDeck,
						players:
							serverPlayers.length > 0
								? serverPlayers.map((serverPlayer, index) => {
									const previousPlayer = previousState.players.find((player) => player.id === serverPlayer.id);
									const cachedRoads = Array.from(roadCacheRef.current.get(serverPlayer.id) ?? []).map((entry) => parseRoadEntry(entry)).filter((entry): entry is { hexId: number; edge: number } => entry !== null);
									const serverRoads = Array.isArray(serverPlayer.roadsOnEdges)
										? serverPlayer.roadsOnEdges.map((entry) => parseRoadEntry(entry)).filter((entry): entry is { hexId: number; edge: number } => entry !== null)
										: [];
									const mergedRoads = mergeRoadLists(serverRoads, mergeRoadLists(cachedRoads, previousPlayer?.roadsOnEdges ?? []));
									rememberRoadsInCache(roadCacheRef.current, serverPlayer.id, mergedRoads);
									return {
										id: serverPlayer.id,
										name: serverPlayer.name,
										color: previousPlayer?.color ?? fallbackColorForPlayer(index),
										resources: mapResourcesFromServer(serverPlayer),
										victoryPoints: serverPlayer.victoryPoints ?? 0,
										developmentCards: serverPlayer.developmentCards ?? previousPlayer?.developmentCards ?? [],
										knightsPlayed: serverPlayer.knightsPlayed ?? previousPlayer?.knightsPlayed ?? 0,
										developmentCardVictoryPoints: serverPlayer.developmentCardVictoryPoints ?? previousPlayer?.developmentCardVictoryPoints ?? 0,
										freeRoadBuildsRemaining: serverPlayer.freeRoadBuildsRemaining ?? previousPlayer?.freeRoadBuildsRemaining ?? 0,
										hasLongestRoad: serverPlayer.hasLongestRoad ?? false,
										settlementsOnCorners: previousPlayer?.settlementsOnCorners ?? [],
										citiesOnCorners: previousPlayer?.citiesOnCorners ?? [],
										roadsOnEdges: mergedRoads,
									};
								})
								: previousState.players,
						currentPlayerId: (() => {
							if (serverPlayers.length === 0) {
								return previousState.currentPlayerId;
							}

							const serverTurnIndex = gameDto?.currentTurnIndex;
							if (typeof serverTurnIndex === "number") {
								const normalizedIndex = ((serverTurnIndex % serverPlayers.length) + serverPlayers.length) % serverPlayers.length;
								return serverPlayers[normalizedIndex].id;
							}

							if (previousState.currentPlayerId && serverPlayers.some((player) => player.id === previousState.currentPlayerId)) {
								return previousState.currentPlayerId;
							}

							return serverPlayers[0].id;
						})(),
						turnPhase: gameDto?.turnPhase ?? previousState.turnPhase,
						diceResult: gameDto?.diceValue ?? previousState.diceResult,
					}));

					setWinnerPlayerName(gameDto?.winner?.name ?? null);
					setIsGameFinished(Boolean(gameDto?.gameFinished) || Boolean(gameDto?.finishedAt));

					if (serverChatMessages.length > 0) {
						setGameLog((previous) => {
							const known = syncedChatMessagesRef.current;
							const unseen = serverChatMessages.filter((message) => !known.has(message));
							if (unseen.length === 0) {
								return previous;
							}

							unseen.forEach((message) => known.add(message));
							return [...unseen.reverse(), ...previous].slice(0, 40);
						});
					}

					setBoardStatus("");
				}

				return "ok";
			} catch (error) {
				const status = (error as Partial<ApplicationError>)?.status;
				if (status === 401) {
					return "unauthorized";
				}
				if (status === 404) {
					return "notfound";
				}

				if (!cancelled) {
					setBoardStatus("Could not load board data from server.");
				}

				return "error";
			}
		};

		let lastDiceSyncKey: string | null = null;
		const syncDiceValue = async (gameId: number): Promise<"ok" | "unauthorized" | "notfound" | "error"> => {
			try {
				const diceDto = await apiService.get<{ diceValue?: number | null; diceRolledAt?: string | null }>(`/games/${gameId}/dice`);
				if (cancelled) {
					return "ok";
				}

				const nextDiceValue = typeof diceDto?.diceValue === "number" ? diceDto.diceValue : null;
				const nextSyncKey = `${diceDto?.diceRolledAt ?? "none"}:${nextDiceValue ?? "none"}`;
				if (lastDiceSyncKey === null) {
					lastDiceSyncKey = nextSyncKey;
					if (nextDiceValue !== null) {
						setState((previousState) => ({
							...previousState,
							diceResult: nextDiceValue,
						}));
					}
					return "ok";
				}
				if (nextSyncKey === lastDiceSyncKey) {
					return "ok";
				}

				lastDiceSyncKey = nextSyncKey;
				if (nextDiceValue !== null) {
					setState((previousState) => ({
						...previousState,
						diceResult: nextDiceValue,
					}));
					showDiceResultPopup(nextDiceValue);
				}

				return "ok";
			} catch (error) {
				const status = (error as Partial<ApplicationError>)?.status;
				if (status === 401) {
					return "unauthorized";
				}
				if (status === 404) {
					return "notfound";
				}
				return "error";
			}
		};

		const createGameIfNeeded = async (): Promise<number | null> => {
			let createdGame: GameGetDTO | null = null;
			try {
				createdGame = await apiService.post<GameGetDTO>("/games", {});
			} catch (error) {
				const status = (error as Partial<ApplicationError>)?.status;
				if (!cancelled && status === 401) {
					setBoardStatus("Session expired. Please log in again.");
					router.replace("/login");
				}
				return null;
			}

			if (!createdGame?.id) {
				return null;
			}

			sessionStorage.setItem("gameId", JSON.stringify(createdGame.id));
			localStorage.removeItem("gameId");

			if (createdGame.board?.hexTiles && createdGame.board?.hexTile_DiceNumbers && !cancelled) {
				const mappedHexes = mapBoardDtoToHexes(createdGame.board as BoardGetDTO);
				const mappedPorts = mapBoardDtoToPorts(createdGame.board as BoardGetDTO);
				setState((previousState) => ({
					...previousState,
					hexes: mappedHexes,
					ports: mappedPorts,
					robberHexId: createdGame.robberTileIndex ?? findDesertHexId(mappedHexes),
				}));
				setBoardStatus("");
			}

			router.replace(`/gameboard?gameId=${createdGame.id}`);
			return createdGame.id;
		};

		const bootstrapBoard = async () => {
			const queryGameId = parseGameId(searchParams.get("gameId"));
			const storedGameId = readStoredGameId();

			if (queryGameId) {
				sessionStorage.setItem("gameId", JSON.stringify(queryGameId));
				localStorage.removeItem("gameId");
			}

			let gameId = queryGameId ?? storedGameId;

			if (!gameId) {
				gameId = await createGameIfNeeded();
			}

			if (!gameId) {
				if (!cancelled) {
					setBoardStatus("No game available. Please create or join a game.");
				}
				return;
			}

			if (!cancelled) {
				setActiveGameId(gameId);
			}

			let syncStatus = await syncGameState(gameId);
			if (syncStatus === "unauthorized") {
				if (!cancelled) {
					setBoardStatus("Session expired. Please log in again.");
					router.replace("/login");
				}
				return;
			}

			if (syncStatus === "notfound") {
				sessionStorage.removeItem("gameId");
				localStorage.removeItem("gameId");
				const newGameId = await createGameIfNeeded();
				if (!newGameId) {
					if (!cancelled) {
						setBoardStatus("Could not recover game state. Please rejoin the lobby.");
					}
					return;
				}
				syncStatus = await syncGameState(newGameId);
				if (syncStatus !== "ok") {
					if (!cancelled) {
						setBoardStatus("Could not load board data from server.");
					}
					return;
				}
				gameId = newGameId;
				if (!cancelled) {
					setActiveGameId(newGameId);
				}
			}

			const poll = window.setInterval(() => {
				void syncGameState(gameId as number).then((status) => {
					if (cancelled || status === "ok") {
						return;
					}

					if (status === "unauthorized") {
						setBoardStatus("Session expired. Please log in again.");
						router.replace("/login");
						window.clearInterval(poll);
						return;
					}

					if (status === "notfound") {
						setBoardStatus("Game no longer exists. Recreating board...");
						sessionStorage.removeItem("gameId");
						localStorage.removeItem("gameId");
						void createGameIfNeeded().then((newGameId) => {
							if (newGameId) {
								void syncGameState(newGameId);
							}
						});
					}
				});
			}, 6000);

			void syncDiceValue(gameId as number);
			const dicePoll = window.setInterval(() => {
				void syncDiceValue(gameId as number).then((status) => {
					if (cancelled || status === "ok") {
						return;
					}

					if (status === "unauthorized") {
						setBoardStatus("Session expired. Please log in again.");
						router.replace("/login");
						window.clearInterval(dicePoll);
						return;
					}

					if (status === "notfound") {
						window.clearInterval(dicePoll);
					}
				});
			}, 1000);

			if (cancelled) {
				window.clearInterval(poll);
				window.clearInterval(dicePoll);
				return;
			}

			return { poll, dicePoll };
		};

		let pollHandle: number | undefined;
		let dicePollHandle: number | undefined;
		void bootstrapBoard().then((handles) => {
			pollHandle = handles?.poll;
			dicePollHandle = handles?.dicePoll;
		});

		return () => {
			cancelled = true;
			if (pollHandle !== undefined) {
				window.clearInterval(pollHandle);
			}
			if (dicePollHandle !== undefined) {
				window.clearInterval(dicePollHandle);
			}
			if (dicePopupTimeoutRef.current !== null) {
				globalThis.clearTimeout(dicePopupTimeoutRef.current);
				dicePopupTimeoutRef.current = null;
			}
		};
	}, [apiService, router, searchParams]);

	const hexById = useMemo(() => {
		const map = new Map<number, HexTile>();
		state.hexes.forEach((hex) => map.set(hex.id, hex));
		return map;
	}, [state.hexes]);

	const currentPlayerIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
	const currentPlayer = state.players.find((player) => player.id === state.currentPlayerId) ?? null;
	const myPlayer =
		state.players.find((player) => player.name === sessionUsername) ??
		state.players.find((player) => player.id === 1) ??
		null;
	const myPlayerIdRef = useRef<number | null>(null);
	myPlayerIdRef.current = myPlayer?.id ?? null;
	const isMyTurn = myPlayer !== null && myPlayer.id === state.currentPlayerId;
	const otherPlayers = state.players.filter((player) => player.id !== state.currentPlayerId);

	useEffect(() => {
		if (!isMyTurn || state.turnPhase !== "ACTION") {
			setIsDevCardPlayMode(false);
		}
	}, [isMyTurn, state.turnPhase]);

	useEffect(() => {
		if (otherPlayers.length > 0 && !targetPlayerId) {
			setTargetPlayerId(otherPlayers[0].id);
		}
	}, [otherPlayers, targetPlayerId]);

	const leaderboardPlayers = useMemo(
		() =>
			[...state.players].sort((firstPlayer, secondPlayer) => {
				if (secondPlayer.victoryPoints !== firstPlayer.victoryPoints) {
					return secondPlayer.victoryPoints - firstPlayer.victoryPoints;
				}

				const firstBuildings =
					firstPlayer.roadsOnEdges.length + firstPlayer.settlementsOnCorners.length + firstPlayer.citiesOnCorners.length;
				const secondBuildings =
					secondPlayer.roadsOnEdges.length + secondPlayer.settlementsOnCorners.length + secondPlayer.citiesOnCorners.length;

				if (secondBuildings !== firstBuildings) {
					return secondBuildings - firstBuildings;
				}

				return firstPlayer.name.localeCompare(secondPlayer.name);
			}),
		[state.players]
	);
	const winnerDisplayName = winnerPlayerName ?? leaderboardPlayers[0]?.name ?? "Unknown Player";
	const perPlayerGameStats = useMemo(() => {
		const statsByPlayerId = new Map<number, {
			cardsPlayedCount: number;
			knightsPlayedCount: number;
			roadsBuiltCount: number;
			settlementsBuiltCount: number;
			citiesBuiltCount: number;
			buildingsBuiltCount: number;
		}>();

		const escapeForRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		state.players.forEach((player) => {
			const escapedPlayerName = escapeForRegex(player.name);
			const cardsPlayedCount = gameLog.filter((entry) => new RegExp(`${escapedPlayerName}.*(development card|dev card)`, "i").test(entry)).length;
			const knightsPlayedCount = gameLog.filter((entry) => new RegExp(`${escapedPlayerName}.*knight`, "i").test(entry)).length;
			const roadsBuiltCount = player.roadsOnEdges.length;
			const settlementsBuiltCount = player.settlementsOnCorners.length;
			const citiesBuiltCount = player.citiesOnCorners.length;

			statsByPlayerId.set(player.id, {
				cardsPlayedCount,
				knightsPlayedCount,
				roadsBuiltCount,
				settlementsBuiltCount,
				citiesBuiltCount,
				buildingsBuiltCount: roadsBuiltCount + settlementsBuiltCount + citiesBuiltCount,
			});
		});

		return statsByPlayerId;
	}, [gameLog, state.players]);
	const gameSummaryStats = useMemo(() => {
		const cardsPlayedCount = gameLog.filter((entry) => /development card|dev card/i.test(entry)).length;
		const knightsPlayedCount = gameLog.filter((entry) => /knight/i.test(entry)).length;
		const roadsBuiltCount = state.players.reduce((sum, player) => sum + player.roadsOnEdges.length, 0);
		const settlementsBuiltCount = state.players.reduce((sum, player) => sum + player.settlementsOnCorners.length, 0);
		const citiesBuiltCount = state.players.reduce((sum, player) => sum + player.citiesOnCorners.length, 0);

		return {
			cardsPlayedCount,
			knightsPlayedCount,
			roadsBuiltCount,
			settlementsBuiltCount,
			citiesBuiltCount,
			buildingsBuiltCount: roadsBuiltCount + settlementsBuiltCount + citiesBuiltCount,
		};
	}, [gameLog, state.players]);

	const addToLog = (message: string) => {
		setGameLog((previous) => {
			if (previous[0] === message) {
				return previous;
			}
			return [message, ...previous].slice(0, 12);
		});
	};

	const parseChatEntry = (entry: string): { sender: string; message: string } | null => {
		const normalizedEntry = entry.startsWith("[CHAT] ") ? entry.slice(7) : entry;
		const separatorIndex = normalizedEntry.indexOf(": ");
		if (separatorIndex <= 0) {
			return null;
		}

		const sender = normalizedEntry.slice(0, separatorIndex).trim();
		const message = normalizedEntry.slice(separatorIndex + 2).trim();
		if (!sender || !message) {
			return null;
		}

		return { sender, message };
	};

	const parseResourceInput = (value: string | null): ResourceType | null => {
		if (!value) {
			return null;
		}

		const normalized = value.trim().toLowerCase();
		return resourceTypes.includes(normalized as ResourceType) ? (normalized as ResourceType) : null;
	};

	const getPlayerTotalResources = (player: Player): number =>
		resourceTypes.reduce((sum, resource) => sum + player.resources[resource], 0);
	const occupiedEdgeKeys = useMemo(() => {
		const occupied = new Set<string>();
		state.players.forEach((player) => {
			player.roadsOnEdges.forEach((road) => {
				const hex = hexById.get(road.hexId);
				if (!hex) {
					return;
				}

				occupied.add(createCanonicalEdgeKey(hex, road.edge));
			});
		});
		return occupied;
	}, [state.players, hexById]);

	const longestRoadLengthByPlayerId = useMemo(() => {
		const lengths = new Map<number, number>();
		state.players.forEach((player) => {
			lengths.set(player.id, computeLongestRoadLength(player, hexById));
		});
		return lengths;
	}, [state.players, hexById]);

	const renderedRoadSegments = useMemo(() => {
		return state.players.flatMap((player) => {
			const uniqueRoads = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();

			player.roadsOnEdges.forEach((road) => {
				const hex = hexById.get(road.hexId);
				if (!hex) {
					return;
				}

				const edgeKey = createCanonicalEdgeKey(hex, road.edge);
				if (uniqueRoads.has(edgeKey)) {
					return;
				}

				const { cx, cy } = toPixel(hex);
				const p1 = getCornerPoint(cx, cy, road.edge);
				const p2 = getCornerPoint(cx, cy, (road.edge + 1) % 6);
				uniqueRoads.set(edgeKey, { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
			});

			return Array.from(uniqueRoads.entries()).map(([edgeKey, line]) => ({
				key: `road-${player.id}-${edgeKey}`,
				color: player.color,
				...line,
			}));
		});
	}, [state.players, hexById]);

	const canAffordRoad = !!myPlayer && (myPlayer.freeRoadBuildsRemaining > 0 || (myPlayer.resources.wood >= 1 && myPlayer.resources.brick >= 1));
	const canAffordDevelopmentCard = !!myPlayer && myPlayer.resources.wool >= 1 && myPlayer.resources.wheat >= 1 && myPlayer.resources.ore >= 1;
	const developmentCardsLeft = Math.max(0, state.developmentDeck?.remaining ?? developmentCardsRemaining);

	const isLegalRoadPlacement = (hexId: number, edge: number): boolean => {
		if (!myPlayer) {
			return false;
		}

		const hex = hexById.get(hexId);
		if (!hex) {
			return false;
		}

		const edgeKey = createCanonicalEdgeKey(hex, edge);
		if (occupiedEdgeKeys.has(edgeKey)) {
			return false;
		}

		const [fromCorner, toCorner] = getCanonicalRoadEndpoints(hex, edge);

		const hasAdjacentOwnRoad = myPlayer.roadsOnEdges.some((road) => {
			const roadHex = hexById.get(road.hexId);
			if (!roadHex) {
				return false;
			}

			const [roadFrom, roadTo] = getCanonicalRoadEndpoints(roadHex, road.edge);
			return roadFrom === fromCorner || roadFrom === toCorner || roadTo === fromCorner || roadTo === toCorner;
		});

		const ownsCornerBuilding = (cornerKey: string): boolean => {
			const hasSettlement = myPlayer.settlementsOnCorners.some((settlement) => {
				const settlementHex = hexById.get(settlement.hexId);
				return settlementHex ? createCanonicalCornerKey(settlementHex, settlement.corner) === cornerKey : false;
			});

			if (hasSettlement) {
				return true;
			}

			return myPlayer.citiesOnCorners.some((city) => {
				const cityHex = hexById.get(city.hexId);
				return cityHex ? createCanonicalCornerKey(cityHex, city.corner) === cornerKey : false;
			});
		};

		const hasAdjacentOwnBuilding = ownsCornerBuilding(fromCorner) || ownsCornerBuilding(toCorner);

		if (!hasAdjacentOwnRoad && !hasAdjacentOwnBuilding) {
			// addToLog("Road must connect to your own road or one of your buildings."); -> rule disabled because it caused bugs
			return false;
		}

		return true;
	};

	const occupiedCornerKeys = useMemo(() => {
		const occupied = new Set<string>();
	
		state.players.forEach((player) => {
			player.settlementsOnCorners.forEach((settlement) => {
				const hex = hexById.get(settlement.hexId);
				if (!hex) {
					return;
				}
				occupied.add(createCanonicalCornerKey(hex, settlement.corner));
			});
	
			player.citiesOnCorners.forEach((city) => {
				const hex = hexById.get(city.hexId);
				if (!hex) {
					return;
				}
				occupied.add(createCanonicalCornerKey(hex, city.corner));
			});
		});
	
		return occupied;
	}, [state.players, hexById]);
	
	const doesPlayerOwnRoadAtCorner = (cornerKey: string): boolean => {
		if (!myPlayer) {
			return false;
		}
	
		return myPlayer.roadsOnEdges.some((road) => {
			const roadHex = hexById.get(road.hexId);
			if (!roadHex) {
				return false;
			}
	
			const [fromCorner, toCorner] = getCanonicalRoadEndpoints(roadHex, road.edge);
			return fromCorner === cornerKey || toCorner === cornerKey;
		});
	};
	
	const isLegalSettlementPlacement = (hexId: number, corner: number): boolean => {
		if (!myPlayer) {
			return false;
		}
	
		const hex = hexById.get(hexId);
		if (!hex) {
			return false;
		}
	
		const targetCornerKey = createCanonicalCornerKey(hex, corner);
	
		if (occupiedCornerKeys.has(targetCornerKey)) {
			return false;
		}
	
		const adjacentCorners = state.hexes.flatMap((candidateHex) =>
			Array.from({ length: 6 }, (_, candidateCorner) => {
				const candidateCornerKey = createCanonicalCornerKey(candidateHex, candidateCorner);
				if (candidateCornerKey === targetCornerKey) {
					return null;
				}
	
				const candidatePoint = getCornerPoint(toPixel(candidateHex).cx, toPixel(candidateHex).cy, candidateCorner);
				const targetPoint = getCornerPoint(toPixel(hex).cx, toPixel(hex).cy, corner);
				const distance = Math.hypot(candidatePoint.x - targetPoint.x, candidatePoint.y - targetPoint.y);
	
				return distance < hexSize * 1.1 ? candidateCornerKey : null;
			})
		).filter((value): value is string => value !== null);
	
		const hasAdjacentBuilding = adjacentCorners.some((cornerKey) => occupiedCornerKeys.has(cornerKey));
		if (hasAdjacentBuilding) {
			// addToLog("Settlement cannot be placed next to another building."); -> rule disabled because it caused bugs
			return false;
		}
	
		if (!doesPlayerOwnRoadAtCorner(targetCornerKey)) {
			// addToLog("Settlement must connect to one of your roads."); -> rule disabled because it caused bugs
			return false;
		}
	
		return true;
	};

	const canAffordSettlement =
	!!myPlayer
	&& myPlayer.resources.wood >= 1
	&& myPlayer.resources.brick >= 1
	&& myPlayer.resources.wool >= 1
	&& myPlayer.resources.wheat >= 1;

	const canAffordCity =
		!!myPlayer
		&& myPlayer.resources.wheat >= 2
		&& myPlayer.resources.ore >= 3;

	const isLegalCityPlacement = (hexId: number, corner: number): boolean => {
		if (!myPlayer) {
			return false;
		}
	
		const hex = hexById.get(hexId);
		if (!hex) {
			return false;
		}
	
		const targetCornerKey = createCanonicalCornerKey(hex, corner);
	
		return myPlayer.settlementsOnCorners.some((settlement) => {
			const settlementHex = hexById.get(settlement.hexId);
			if (!settlementHex) {
				return false;
			}
	
			return createCanonicalCornerKey(settlementHex, settlement.corner) === targetCornerKey;
		});
	};

	const handleBuildSettlementAction = () => {
		if (!isMyTurn || !myPlayer) {
			return;
		}

		setIsDevCardPlayMode(false);

		if (!canAffordSettlement) {
			addToLog("Building a settlement costs 1 wood, 1 brick, 1 wool and 1 wheat.");
			return;
		}

		setPlacementMode((previous) => {
			const nextMode = previous === "settlement" ? null : "settlement";
			addToLog(nextMode === "settlement" ? "Select a legal corner for your settlement." : "Settlement placement cancelled.");
			return nextMode;
		});
	};

	const handleBuildCityAction = () => {
		if (!isMyTurn || !myPlayer) {
			return;
		}

		setIsDevCardPlayMode(false);

		if (!canAffordCity) {
			addToLog("Building a city costs 2 wheat and 3 ore.");
			return;
		}

		setPlacementMode((previous) => {
			const nextMode = previous === "city" ? null : "city";
			addToLog(nextMode === "city" ? "Select one of your settlements to upgrade." : "City placement cancelled.");
			return nextMode;
		});
	};

	const handleSettlementCornerClick = async (hexId: number, corner: number) => {
		if (placementMode !== "settlement" || !isMyTurn || !myPlayer || !activeGameId) {
			return;
		}

		if (!canAffordSettlement) {
			addToLog("Building a settlement costs 1 wood, 1 brick, 1 wool and 1 wheat.");
			return;
		}

		if (!isLegalSettlementPlacement(hexId, corner)) {
			return;
		}

		if (DEBUG_LOCAL) {
			setState((previousState) => ({
				...previousState,
				players: previousState.players.map((player) =>
					player.id === myPlayer.id
						? {
								...player,
								settlementsOnCorners: [...player.settlementsOnCorners, { hexId, corner }],
								victoryPoints: player.victoryPoints + 1,
								resources: {
									...player.resources,
									wood: player.resources.wood - 1,
									brick: player.resources.brick - 1,
									wool: player.resources.wool - 1,
									wheat: player.resources.wheat - 1,
								},
						  }
						: player
				),
			}));
			setPlacementMode(null);
			addToLog(`${myPlayer.name} built a settlement.`);
			return;
		}

		try {
			await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
				type: "SETTLEMENT_BUILT",
				sourcePlayerId: myPlayer.id,
				hexId,
				intersectionId: corner,
			});
		} catch {
			addToLog("Could not build settlement. Please try again.");
			return;
		}

		setPlacementMode(null);

		void apiService.post<GameChatMessageDTO>(`/games/${activeGameId}/chat`, {
			playerId: myPlayer.id,
			playerName: myPlayer.name,
			text: "built a settlement.",
		});
	};

	const handleCityCornerClick = async (hexId: number, corner: number) => {
		if (placementMode !== "city" || !isMyTurn || !myPlayer || !activeGameId) {
			return;
		}

		if (!canAffordCity) {
			addToLog("Building a city costs 2 wheat and 3 ore.");
			return;
		}

		if (!isLegalCityPlacement(hexId, corner)) {
			addToLog("You can only upgrade one of your own settlements.");
			return;
		}

		if (DEBUG_LOCAL) {
			setState((previousState) => ({
				...previousState,
				players: previousState.players.map((player) => {
					if (player.id !== myPlayer.id) {
						return player;
					}
		
					return {
						...player,
						settlementsOnCorners: player.settlementsOnCorners.filter(
							(settlement) => !(settlement.hexId === hexId && settlement.corner === corner)
						),
						citiesOnCorners: [...player.citiesOnCorners, { hexId, corner }],
						victoryPoints: player.victoryPoints + 1,
						resources: {
							...player.resources,
							wheat: player.resources.wheat - 2,
							ore: player.resources.ore - 3,
						},
					};
				}),
			}));
			setPlacementMode(null);
			addToLog(`${myPlayer.name} built a city.`);
			return;
		}

		try {
			await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
				type: "CITY_BUILT",
				sourcePlayerId: myPlayer.id,
				hexId,
				intersectionId: corner,
			});
		} catch {
			addToLog("Could not build city. Please try again.");
			return;
		}

		setPlacementMode(null);

		void apiService.post<GameChatMessageDTO>(`/games/${activeGameId}/chat`, {
			playerId: myPlayer.id,
			playerName: myPlayer.name,
			text: "built a city.",
		});
	};

	const applyGameEvent = (event: GameEventDTO) => {
		if (!event?.type) {
			return;
		}

		const localPlayerId = myPlayerIdRef.current;

		if (event.type === "ROAD_BUILT") {
			if (
				typeof event.sourcePlayerId !== "number"
				|| typeof event.hexId !== "number"
				|| typeof event.edge !== "number"
			) {
				return;
			}

			const targetHexId = event.hexId;
			const targetEdge = event.edge;

			if (typeof localPlayerId === "number" && event.sourcePlayerId === localPlayerId) {
				return;
			}

			setState((previousState) => {
				const sourceIndex = previousState.players.findIndex((player) => player.id === event.sourcePlayerId);
				if (sourceIndex < 0) {
					return previousState;
				}

				const previousHexById = new Map<number, HexTile>();
				previousState.hexes.forEach((hex) => previousHexById.set(hex.id, hex));

				const targetHexFromState = previousHexById.get(targetHexId);
				if (!targetHexFromState) {
					return previousState;
				}

				const targetEdgeKey = createCanonicalEdgeKey(targetHexFromState, targetEdge);

				const edgeAlreadyOccupied = previousState.players.some((player) =>
					player.roadsOnEdges.some((road) => {
						const roadHex = previousHexById.get(road.hexId);
						return roadHex ? createCanonicalEdgeKey(roadHex, road.edge) === targetEdgeKey : false;
					})
				);
				if (edgeAlreadyOccupied) {
					return previousState;
				}

				const source = previousState.players[sourceIndex];
				const alreadyPlaced = source.roadsOnEdges.some((road) => road.hexId === targetHexId && road.edge === targetEdge);
				if (alreadyPlaced) {
					return previousState;
				}

				const nextPlayers = [...previousState.players];
				nextPlayers[sourceIndex] = {
					...source,
					roadsOnEdges: [...source.roadsOnEdges, { hexId: targetHexId, edge: targetEdge }],
				};

				return {
					...previousState,
					players: nextPlayers,
				};
			});

			if (event.message) {
				addToLog(event.message);
			}
			return;
		}

		if (event.type === "TURN_END") {
			if (typeof event.nextPlayerId === "number") {
				setState((previousState) => ({
					...previousState,
					currentPlayerId: event.nextPlayerId as number,
				}));
			}

			if (!(typeof localPlayerId === "number" && typeof event.sourcePlayerId === "number" && event.sourcePlayerId === localPlayerId) && event.message) {
				addToLog(event.message);
			}
			return;
		}

		if (event.type === "ACTION") {
			if (typeof localPlayerId === "number" && typeof event.sourcePlayerId === "number" && event.sourcePlayerId === localPlayerId) {
				return;
			}
			if (event.message) {
				addToLog(event.message);
			}
			return;
		}

		if (typeof event.sourcePlayerId !== "number") {
			return;
		}

		if (typeof localPlayerId === "number" && event.sourcePlayerId === localPlayerId) {
			return;
		}

		if (!event.giveResource || !event.receiveResource || typeof event.amount !== "number") {
			return;
		}

		if (event.type === "BANK_TRADE") {
			if (event.message) {
				addToLog(event.message);
			}
			return;
		}

		if (event.type === "PLAYER_TRADE") {
			if (typeof event.targetPlayerId !== "number") {
				return;
			}

			if (event.message) {
				addToLog(event.message);
			}
		}
	};

	const handleRollDice = async () => {
		if (!isMyTurn || !activeGameId || state.turnPhase !== "ROLL_DICE") {
			return;
		}

		try {
			await apiService.post(`/games/${activeGameId}/actions/roll-dice`, {});
			addToLog("Dice rolled.");
		} catch (error) {
			const appError = error as Partial<ApplicationError>;
			if (appError.status === 409) {
				addToLog("Cannot roll dice: " + (appError.message || "Invalid turn phase"));
			} else {
				addToLog("Failed to roll dice.");
			}
		}
	};

	const applyGameEventRef = useRef<(event: GameEventDTO) => void>(() => {});
	applyGameEventRef.current = applyGameEvent;

	useEffect(() => {
		if (!activeGameId) {
			return;
		}

		if (DEBUG_LOCAL) {
			return;
		}

		const client = new Client({
			webSocketFactory: () => new SockJS(`${getApiDomain()}/ws`),
			onConnect: () => {
				client.subscribe(`/topic/games/${activeGameId}/state`, (message) => {
					try {
						const gameDto = JSON.parse(message.body) as GameGetDTO;
						if (!gameDto) {
							return;
						}

						setState((previousState) => ({
							...previousState,
							players: Array.isArray(gameDto.players)
								? gameDto.players.map((serverPlayer, index) => {
									const previousPlayer = previousState.players.find((player) => player.id === serverPlayer.id);
									const cachedRoads = Array.from(roadCacheRef.current.get(serverPlayer.id) ?? []).map((entry) => parseRoadEntry(entry)).filter((entry): entry is { hexId: number; edge: number } => entry !== null);
									const serverRoads = Array.isArray(serverPlayer.roadsOnEdges)
										? serverPlayer.roadsOnEdges.map((entry) => parseRoadEntry(entry)).filter((entry): entry is { hexId: number; edge: number } => entry !== null)
										: [];
									const mergedRoads = mergeRoadLists(serverRoads, mergeRoadLists(cachedRoads, previousPlayer?.roadsOnEdges ?? []));
									rememberRoadsInCache(roadCacheRef.current, serverPlayer.id, mergedRoads);
									return {
										id: serverPlayer.id,
										name: serverPlayer.name,
										color: previousPlayer?.color ?? fallbackColorForPlayer(index),
										resources: mapResourcesFromServer(serverPlayer),
										victoryPoints: serverPlayer.victoryPoints ?? 0,
										developmentCards: serverPlayer.developmentCards ?? previousPlayer?.developmentCards ?? [],
										knightsPlayed: serverPlayer.knightsPlayed ?? previousPlayer?.knightsPlayed ?? 0,
										developmentCardVictoryPoints: serverPlayer.developmentCardVictoryPoints ?? previousPlayer?.developmentCardVictoryPoints ?? 0,
										freeRoadBuildsRemaining: serverPlayer.freeRoadBuildsRemaining ?? previousPlayer?.freeRoadBuildsRemaining ?? 0,
										hasLongestRoad: serverPlayer.hasLongestRoad ?? false,
										settlementsOnCorners: previousPlayer?.settlementsOnCorners ?? [],
										citiesOnCorners: previousPlayer?.citiesOnCorners ?? [],
										roadsOnEdges: mergedRoads,
									};
								})
								: previousState.players,
							developmentDeck: gameDto.developmentDeck ?? previousState.developmentDeck,
							currentPlayerId: typeof gameDto.currentTurnIndex === "number" && Array.isArray(gameDto.players) && gameDto.players.length > 0
								? gameDto.players[((gameDto.currentTurnIndex % gameDto.players.length) + gameDto.players.length) % gameDto.players.length].id
								: previousState.currentPlayerId,
							robberHexId: gameDto.robberTileIndex ?? previousState.robberHexId,
							turnPhase: gameDto.turnPhase ?? previousState.turnPhase,
							diceResult: gameDto.diceValue ?? previousState.diceResult,
						}));
					} catch {
						// Ignore malformed state messages.
					}
				});

				client.subscribe(`/topic/games/${activeGameId}/events`, (message) => {
					try {
						applyGameEventRef.current(JSON.parse(message.body) as GameEventDTO);
					} catch {
						// Ignore malformed messages.
					}
				});

				client.subscribe(`/topic/games/${activeGameId}/chat`, (message) => {
					try {
						const payload = JSON.parse(message.body) as GameChatMessageDTO;
						if (payload?.text) {
							const logEntry = `${payload.playerName ?? "Player"}: ${payload.text}`;
							syncedChatMessagesRef.current.add(logEntry);
							addToLog(logEntry);
						}
					} catch {
						// Ignore malformed messages.
					}
				});
			},
		});

		client.activate();

		return () => {
			void client.deactivate();
		};
	}, [activeGameId]);

	const handleBankTrade = () => {
		if (currentPlayerIndex < 0 || !currentPlayer || !activeGameId) {
			addToLog("No active player for trading.");
			return;
		}

		if (giveResource === receiveResource) {
			addToLog("Choose different resources for bank trade.");
			return;
		}

		const ratio = 4;
		const giveAmount = ratio * tradeAmount;

		if (currentPlayer.resources[giveResource] < giveAmount) {
			addToLog(`${currentPlayer.name} needs ${giveAmount} ${giveResource} for this trade.`);
			return;
		}

		const logMessage = `${currentPlayer.name} trades ${giveAmount} ${giveResource} for ${tradeAmount} ${receiveResource} with bank.`;
		addToLog(logMessage);
		void apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
			type: "BANK_TRADE",
			sourcePlayerId: currentPlayer.id,
			giveResource,
			receiveResource,
			amount: tradeAmount,
			message: logMessage,
		});
	};

	const handlePlayerTrade = () => {
		if (currentPlayerIndex < 0 || !currentPlayer || !targetPlayerId || !activeGameId) {
			addToLog("Select a trade partner first.");
			return;
		}

		if (giveResource === receiveResource) {
			addToLog("Choose different resources for player trade.");
			return;
		}

		const targetIndex = state.players.findIndex((player) => player.id === targetPlayerId);
		if (targetIndex < 0) {
			addToLog("Selected trade partner was not found.");
			return;
		}

		const targetPlayer = state.players[targetIndex];

		if (currentPlayer.resources[giveResource] < tradeAmount) {
			addToLog(`${currentPlayer.name} lacks ${giveResource}.`);
			return;
		}

		if (targetPlayer.resources[receiveResource] < tradeAmount) {
			addToLog(`${targetPlayer.name} lacks ${receiveResource}.`);
			return;
		}

		const logMessage = `${currentPlayer.name} trades ${tradeAmount} ${giveResource} with ${targetPlayer.name} for ${receiveResource}.`;
		addToLog(logMessage);
		void apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
			type: "PLAYER_TRADE",
			sourcePlayerId: currentPlayer.id,
			targetPlayerId,
			giveResource,
			receiveResource,
			amount: tradeAmount,
			message: logMessage,
		});
	};

	const getValidStealTargetsForHex = (hexId: number): Player[] => {
		// Official Catan rules: can only steal from players with settlements/cities on hex corners adjacent to robber
		return state.players.filter((player) => {
			// Check if player has settlements on this hex
			const settlementsOnHex = player.settlementsOnCorners?.filter((settlement) => settlement.hexId === hexId);
			if (settlementsOnHex && settlementsOnHex.length > 0) {
				return true;
			}

			// Check if player has cities on this hex
			const citiesOnHex = player.citiesOnCorners?.filter((city) => city.hexId === hexId);
			if (citiesOnHex && citiesOnHex.length > 0) {
				return true;
			}

			return false;
		});
	};

	const chooseRandomStealableResource = (player: Player): ResourceType | null => {
		const availableResources = resourceTypes.filter((resource) => player.resources[resource] > 0);
		if (availableResources.length === 0) {
			return null;
		}

		return availableResources[Math.floor(Math.random() * availableResources.length)];
	};

	const playKnightCardAtHex = async (hexId: number) => {
		if (!isMyTurn || !myPlayer || state.turnPhase !== "ACTION") {
			return;
		}

		const validTargets = getValidStealTargetsForHex(hexId);
		const otherValidTargets = validTargets.filter((player) => player.id !== myPlayer.id);

		let parsedTarget: number | null = null;

		if (otherValidTargets.length === 0) {
			addToLog("No other players have settlements or cities on hex " + hexId + ". No steal target selected.");
		} else if (otherValidTargets.length === 1) {
			parsedTarget = otherValidTargets[0].id;
			addToLog("Only one valid target: " + otherValidTargets[0].name);
		} else {
			const targetsList = otherValidTargets.map((player) => player.id + " (" + player.name + ")").join(", ");
			const targetInput = window.prompt(
				"Knight: select target player id to steal from. Valid targets: " + targetsList + " (leave empty for none)",
				String(otherValidTargets[0]?.id ?? "")
			);

			if (targetInput === null) {
				return;
			}

			if (targetInput.trim().length > 0) {
				parsedTarget = Number(targetInput.trim());
				if (!Number.isInteger(parsedTarget)) {
					addToLog("Invalid target player id.");
					return;
				}

				if (!otherValidTargets.some((player) => player.id === parsedTarget)) {
					addToLog("Selected player is not a valid target (must have settlement/city on hex " + hexId + ").");
					return;
				}
			}
		}

		if (DEBUG_LOCAL) {
			setState((previousState) => ({
				...previousState,
				robberHexId: hexId,
				players: previousState.players.map((player) => {
					if (player.id === myPlayer.id) {
						const nextCards = [...player.developmentCards];
						const removedIndex = nextCards.indexOf("knight");
						if (removedIndex >= 0) {
							nextCards.splice(removedIndex, 1);
						}

						return {
							...player,
							developmentCards: nextCards,
							knightsPlayed: player.knightsPlayed + 1,
						};
					}

					if (parsedTarget === null || player.id !== parsedTarget) {
						return player;
					}

					const stolenResource = chooseRandomStealableResource(player);
					if (!stolenResource) {
						return player;
					}

					const nextResources = {
						...player.resources,
						[stolenResource]: player.resources[stolenResource] - 1,
					};

					return {
						...player,
						resources: nextResources,
					};
				}),
			}));
			setPlacementMode(null);
			addToLog(`${myPlayer.name} played Knight.`);
			return;
		}

		if (!activeGameId) {
			return;
		}

		try {
			await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
				type: "DEVELOPMENT_CARD_PLAYED_KNIGHT",
				sourcePlayerId: myPlayer.id,
				hexId,
				targetPlayerId: parsedTarget ?? undefined,
			});
			addToLog(`${myPlayer.name} played Knight.`);
		} catch {
			addToLog("Could not play development card. Please try again.");
			return;
		}

		setPlacementMode(null);
	};

	const handleBuyDevelopmentCard = async () => {
		setPlacementMode(null);
		setIsDevCardPlayMode(false);
		if (!isMyTurn || !activeGameId || !myPlayer) {
			return;
		}

		if (developmentCardsLeft <= 0) {
			addToLog("No development cards left in the bank.");
			return;
		}

		if (!canAffordDevelopmentCard) {
			addToLog("Buying a development card costs 1 wool, 1 wheat and 1 ore.");
			return;
		}

		if (DEBUG_LOCAL) {
			const draw = drawLocalDevelopmentCard(state.developmentDeck);
			if (!draw) {
				addToLog("No development cards left in the bank.");
				return;
			}

			setState((previousState) => ({
				...previousState,
				developmentDeck: draw.deck,
				players: previousState.players.map((player) =>
					player.id === myPlayer.id
						? {
							...player,
							resources: {
								...player.resources,
								wool: player.resources.wool - 1,
								wheat: player.resources.wheat - 1,
								ore: player.resources.ore - 1,
							},
							developmentCards: [...player.developmentCards, draw.card],
									victoryPoints: draw.card === "victory_point" ? player.victoryPoints + 1 : player.victoryPoints,
							developmentCardVictoryPoints:
								draw.card === "victory_point"
									? player.developmentCardVictoryPoints + 1
									: player.developmentCardVictoryPoints,
						}
						: player
				),
			}));

			addToLog(`${myPlayer.name} buys a development card.`);
			return;
		}

		try {
			await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
				type: "DEVELOPMENT_CARD_BOUGHT",
				sourcePlayerId: myPlayer.id,
			});
			addToLog(`${myPlayer.name} buys a development card.`);
		} catch {
			addToLog("Could not buy development card. Please try again.");
		}
	};

	const handlePlayDevelopmentCard = async (card: string) => {
		if (!isMyTurn || !activeGameId || !myPlayer || state.turnPhase !== "ACTION") {
			return;
		}

		if (!isDevCardPlayMode) {
			addToLog("Click 'Play Dev Card' first.");
			return;
		}

		setIsDevCardPlayMode(false);

		if (!myPlayer.developmentCards.includes(card)) {
			addToLog("You do not own this development card.");
			return;
		}

		try {
			if (card === "knight") {
				setPlacementMode("knight");
				addToLog("Click a hexagon to place the robber.");
				return;
			}

			if (card === "road_building") {
				if (DEBUG_LOCAL) {
					setState((previousState) => ({
						...previousState,
						players: previousState.players.map((player) =>
							player.id === myPlayer.id
								? {
									...player,
									developmentCards: (() => {
										const nextCards = [...player.developmentCards];
										const removedIndex = nextCards.indexOf("road_building");
										if (removedIndex >= 0) {
											nextCards.splice(removedIndex, 1);
										}
										return nextCards;
									})(),
									freeRoadBuildsRemaining: (player.freeRoadBuildsRemaining ?? 0) + 2,
								}
								: player
						),
					}));
					setPlacementMode("road");
					addToLog(`${myPlayer.name} played Road Building. Place 2 roads for free.`);
					return;
				}

				await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
					type: "DEVELOPMENT_CARD_PLAYED_ROAD_BUILDING",
					sourcePlayerId: myPlayer.id,
				});
				setPlacementMode("road");
				addToLog(`${myPlayer.name} played Road Building. Place 2 roads for free.`);
				return;
			}

			if (card === "year_of_plenty") {
				const first = parseResourceInput(window.prompt("Year of Plenty: first resource (wood/brick/wool/wheat/ore)", "wood"));
				if (!first) {
					addToLog("Invalid first resource.");
					return;
				}

				const second = parseResourceInput(window.prompt("Year of Plenty: second resource (wood/brick/wool/wheat/ore)", "brick"));
				if (!second) {
					addToLog("Invalid second resource.");
					return;
				}

				await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
					type: "DEVELOPMENT_CARD_PLAYED_YEAR_OF_PLENTY",
					sourcePlayerId: myPlayer.id,
					giveResource: first,
					secondResource: second,
				});
				addToLog(`${myPlayer.name} played Year of Plenty.`);
				return;
			}

			if (card === "monopoly") {
				const resource = parseResourceInput(window.prompt("Monopoly: resource to claim (wood/brick/wool/wheat/ore)", "wheat"));
				if (!resource) {
					addToLog("Invalid resource for Monopoly.");
					return;
				}

				await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
					type: "DEVELOPMENT_CARD_PLAYED_MONOPOLY",
					sourcePlayerId: myPlayer.id,
					giveResource: resource,
				});
				addToLog(`${myPlayer.name} played Monopoly (${resource}).`);
				return;
			}

			addToLog("Victory Point cards are applied automatically.");
		} catch {
			addToLog("Could not play development card. Please try again.");
		}
	};

	const handleBuildRoadAction = () => {
		if (!isMyTurn || !myPlayer) {
			return;
		}

		setIsDevCardPlayMode(false);

		if (!canAffordRoad) {
			addToLog("Building a road costs 1 wood and 1 brick.");
			return;
		}

		setPlacementMode((previous) => {
			const nextMode = previous === "road" ? null : "road";
			addToLog(nextMode === "road" ? "Select a legal edge for your road." : "Road placement cancelled.");
			return nextMode;
		});
	};

	const handleRoadEdgeClick = async (hexId: number, edge: number) => {
		if (placementMode !== "road" || !isMyTurn || !myPlayer || !activeGameId) {
			return;
		}

		const hex = hexById.get(hexId);
		if (!hex) {
			return;
		}

		const edgeKey = createCanonicalEdgeKey(hex, edge);
		if (occupiedEdgeKeys.has(edgeKey)) {
			addToLog("That edge is already occupied by another road.");
			return;
		}

		const freeRoadBuildsRemaining = myPlayer.freeRoadBuildsRemaining ?? 0;

		if (!canAffordRoad) {
			addToLog("Building a road costs 1 wood and 1 brick.");
			return;
		}

		if (!isLegalRoadPlacement(hexId, edge)) {
			return;
		}

		if (DEBUG_LOCAL) {
			setState((previousState) => ({
				...previousState,
				players: previousState.players.map((player) =>
					player.id === myPlayer.id
						? {
								...player,
								roadsOnEdges: [...player.roadsOnEdges, { hexId, edge }],
								resources: {
									...player.resources,
									wood: freeRoadBuildsRemaining > 0 ? player.resources.wood : player.resources.wood - 1,
									brick: freeRoadBuildsRemaining > 0 ? player.resources.brick : player.resources.brick - 1,
								},
								freeRoadBuildsRemaining: Math.max(0, freeRoadBuildsRemaining - 1),
						  }
						: player
				),
			}));
			setPlacementMode(freeRoadBuildsRemaining > 1 ? "road" : null);
			addToLog(`${myPlayer.name} built a road.`);
			return;
		}

		try {
			await apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
				type: "ROAD_BUILT",
				sourcePlayerId: myPlayer.id,
				hexId,
				edge,
			});
		} catch {
			addToLog("Could not build road. Please try again.");
			return;
		}

		setPlacementMode(freeRoadBuildsRemaining > 1 ? "road" : null);
		const message = "built a road.";

		void apiService.post<GameChatMessageDTO>(`/games/${activeGameId}/chat`, {
			playerId: myPlayer.id,
			playerName: myPlayer.name,
			text: message,
		});
	};

	const handleEndTurn = async () => {
		if (!isMyTurn || !activeGameId || !myPlayer || state.players.length === 0) {
			return;
		}

		const currentIndex = state.players.findIndex((player) => player.id === state.currentPlayerId);
		if (currentIndex < 0) {
			return;
		}

		const nextIndex = (currentIndex + 1) % state.players.length;
		const nextPlayer = state.players[nextIndex];
		setPlacementMode(null);
		setIsDevCardPlayMode(false);

		setState((previousState) => ({
			...previousState,
			currentPlayerId: nextPlayer.id,
			turnPhase: "ROLL_DICE",
			diceResult: null,
		}));

		const message = `${myPlayer.name} ended turn. ${nextPlayer.name} is now active.`;
		addToLog(message);

		try {
			await apiService.post<GameStateDTO>(`/games/${activeGameId}/actions/end-turn`, {});
		} catch {
			// Keep local progression even if persistence fails; polling will eventually re-sync.
		}

		void apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
			type: "TURN_END",
			sourcePlayerId: myPlayer.id,
			nextPlayerId: nextPlayer.id,
			message,
		});
	};

	const handleToggleDevCardPlayMode = () => {
		if (!isMyTurn || state.turnPhase !== "ACTION") {
			return;
		}

		setPlacementMode(null);
		setIsDevCardPlayMode((previous) => {
			const nextMode = !previous;
			addToLog(nextMode ? "Select a development card to play." : "Development card play cancelled.");
			return nextMode;
		});
	};

	const handleSendTradeRequest = () => {
		if (!currentPlayer) {
			addToLog("No active player for trade requests.");
			return;
		}

		setShowTradePopup(true);
		addToLog(`${currentPlayer.name} opened trade requests.`);
	};

	const handleSendChatMessage = () => {
		if (!chatMessage.trim() || !activeGameId) {
			return;
		}

		void apiService.post<GameChatMessageDTO>(`/games/${activeGameId}/chat`, {
			playerId: myPlayer?.id,
			playerName: myPlayer?.name ?? "Player",
			text: chatMessage.trim(),
		});
		setChatMessage("");
	};

	return (
		<>
			<EndGameOverlay
				isVisible={isGameFinished}
				winnerDisplayName={winnerDisplayName}
				leaderboardPlayers={leaderboardPlayers}
				perPlayerGameStats={perPlayerGameStats}
				gameSummaryStats={gameSummaryStats}
				onBackToMain={() => router.push("/lobby")}
			/>

			<TradeModal
				isVisible={showTradePopup}
				tradeMode={tradeMode}
				giveResource={giveResource}
				receiveResource={receiveResource}
				tradeAmount={tradeAmount}
				targetPlayerId={targetPlayerId}
				otherPlayers={otherPlayers}
				currentPlayer={currentPlayer}
				onClose={() => setShowTradePopup(false)}
				onSetTradeMode={setTradeMode}
				onSetGiveResource={setGiveResource}
				onSetReceiveResource={setReceiveResource}
				onSetTradeAmount={setTradeAmount}
				onSetTargetPlayerId={setTargetPlayerId}
				onBankTrade={handleBankTrade}
				onPlayerTrade={handlePlayerTrade}
			/>

			{showDicePopup && dicePopupValue !== null ? (
				<div className={styles.dicePopupOverlay}>
					<div className={styles.dicePopupCard} role="status" aria-live="polite">
						<div className={styles.dicePopupTitle}>Dice Rolled</div>
						<div className={styles.dicePopupValue}>{dicePopupValue}</div>
					</div>
				</div>
			) : null}

			<div className={styles.layout}>
				<BoardColumn
					boardStatus={boardStatus}
					state={state}
					ports={ports}
					hexById={hexById}
					renderedRoadSegments={renderedRoadSegments}
					isRoadPlacementMode={placementMode === "road"}
					isSettlementPlacementMode={placementMode === "settlement"}
					isCityPlacementMode={placementMode === "city"}
					isKnightPlacementMode={placementMode === "knight"}
					isMyTurn={isMyTurn}
					isLegalRoadPlacement={isLegalRoadPlacement}
					isLegalSettlementPlacement={isLegalSettlementPlacement}
					isLegalCityPlacement={isLegalCityPlacement}
					handleRoadEdgeClick={handleRoadEdgeClick}
					handleKnightHexClick={playKnightCardAtHex}
					handleSettlementCornerClick={handleSettlementCornerClick}
					handleCityCornerClick={handleCityCornerClick}
					handleBuyDevelopmentCard={handleBuyDevelopmentCard}
					developmentCards={myPlayer?.developmentCards ?? []}
					isDevCardPlayMode={isDevCardPlayMode}
					handleToggleDevCardPlayMode={handleToggleDevCardPlayMode}
					handlePlayDevelopmentCard={handlePlayDevelopmentCard}
					handleRollDice={handleRollDice}
					handleBuildRoadAction={handleBuildRoadAction}
					handleBuildSettlementAction={handleBuildSettlementAction}
					handleBuildCityAction={handleBuildCityAction}
					handleEndTurn={handleEndTurn}
				/>
			<aside className={styles.rightPanel}>
				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Players</h2>
					<ul className={styles.playerList}>
						{state.players.map((player) => (
							<li
								key={player.id}
								className={`${styles.playerCard} ${player.id === state.currentPlayerId ? styles.playerCardCurrent : ""}`}
							>
								<div className={styles.playerHeader}>
									<div className={styles.playerName}>
										<span className={styles.colorDot} style={{ backgroundColor: player.color }} />
										<span>{player.name}</span>
									</div>
									<span className={styles.playerVpBadge}>{player.victoryPoints}</span>
								</div>

								<div className={styles.playerStatsGrid}>
									<div className={`${styles.playerStatCell} ${styles.totalResourceCell}`}>
										<span className={styles.playerStatIcon}>?</span>
										<span className={styles.playerStatValue}>{getPlayerTotalResources(player)}</span>
									</div>
									<div className={`${styles.playerStatCell} ${styles.devCardCell}`}>
										<span className={styles.playerStatIcon}>🎴</span>
										<span className={styles.playerStatValue}>{player.developmentCards.length}</span>
									</div>
									<div className={`${styles.playerStatCell} ${styles.knightCell}`}>
										<span className={styles.playerStatIcon}>⚔️</span>
										<span className={styles.playerStatValue}>{player.knightsPlayed}</span>
									</div>
									<div className={`${styles.playerStatCell} ${styles.roadCell} ${player.hasLongestRoad ? styles.roadCellHolder : ""}`}>
										<span className={styles.playerStatIcon}>🛣️</span>
										<span className={styles.playerStatValue}>{longestRoadLengthByPlayerId.get(player.id) ?? 0}</span>
									</div>
								</div>
							</li>
						))}
					</ul>
				</section>

				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Resources</h2>
					{myPlayer ? (
						<>
							<div className={styles.resourcePanelGrid}>
								{resourceTypes.map((resource) => (
									<div key={`res-${resource}`} className={`${styles.resourcePanelTile} ${styles[`resourcePanelTile${resource.charAt(0).toUpperCase() + resource.slice(1)}`]}`}>
										<span>{resourceEmojiByType[resource]}</span>
										<strong>{myPlayer.resources[resource]}</strong>
									</div>
								))}
							</div>
							<div className={styles.currentPlayerLine}>
								Free roads available: {myPlayer.freeRoadBuildsRemaining}
							</div>
						</>
					) : (
						<div className={styles.currentPlayerLine}>No personal resource data available</div>
					)}
				</section>

				<section className={styles.sidebarCard}>
					<div className={styles.bankHeaderVisual}>
						<svg viewBox="0 0 100 100" className={styles.bankHeaderIcon} xmlns="http://www.w3.org/2000/svg">
							<path d="M50 10 L90 30 L90 35 L10 35 L10 30 Z" />
							<rect x="15" y="40" width="12" height="35" />
							<rect x="32" y="40" width="12" height="35" />
							<rect x="56" y="40" width="12" height="35" />
							<rect x="73" y="40" width="12" height="35" />
							<rect x="10" y="77" width="80" height="8" />
							<rect x="10" y="87" width="80" height="5" />
							<circle cx="50" cy="20" r="8" fill="#FCD34D" />
							<text x="50" y="26" fontSize="12" fontWeight="bold" fill="#92400E" textAnchor="middle">$</text>
						</svg>
					</div>

					<div className={styles.bankPanel}>
						<div className={styles.bankGrid}>
							<div className={styles.devCardSlot}>
								<div className={styles.devCardIcon}>🎴</div>
								<div className={styles.devCardValue}>{developmentCardsLeft}</div>
							</div>

							{resourceTypes.map((resource) => (
								<div key={`bank-${resource}`} className={styles.bankResourceCell} style={{ backgroundColor: bankResourceColorByType[resource] }}>
									<span className={styles.bankResourceIcon}>{resourceEmojiByType[resource]}</span>
									<span className={styles.bankResourceValue}>{bankResources[resource]}</span>
								</div>
							))}
						</div>
					</div>
				</section>

				<section className={styles.sidebarCard}>
					<button type="button" className={styles.tradeRequestButton} onClick={handleSendTradeRequest}>
						Send Trade Request
					</button>
					<div className={styles.logBox}>
						{gameLog.map((entry, index) => (
							(() => {
								const parsedChat = parseChatEntry(entry);
								if (!parsedChat) {
									return <p key={`log-${index}`}>{entry}</p>;
								}

								const senderPlayer = state.players.find((player) => player.name === parsedChat.sender);
								const senderColor = senderPlayer?.color ?? "#f8e7bf";

								return (
									<p key={`log-${index}`}>
										<span style={{ color: senderColor, fontWeight: 700 }}>{parsedChat.sender}</span>
										{`: ${parsedChat.message}`}
									</p>
								);
							})()
						))}
					</div>
					<div className={styles.chatRow}>
						<input
							type="text"
							className={styles.chatInput}
							placeholder="Type a message..."
							value={chatMessage}
							onChange={(event) => setChatMessage(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									handleSendChatMessage();
								}
							}}
						/>
						<button type="button" className={styles.chatSendButton} onClick={handleSendChatMessage} aria-label="Send message">
							<Send size={16} />
						</button>
					</div>
					<button className={styles.leaveButton} onClick={() => router.push("/lobby")}>
						<LogOut size={16} />
						<span>Leave Lobby</span>
					</button>
				</section>
			</aside>
			</div>
		</>
	);
}

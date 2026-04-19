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
type GameState,
type GameStateDTO,
type HexTile,
type Player,
type ResourceType,
type TradeMode,
} from "./types";

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
	const [activeGameId, setActiveGameId] = useState<number | null>(null);
	const [isRoadPlacementMode, setIsRoadPlacementMode] = useState<boolean>(false);
	const syncedChatMessagesRef = useRef<Set<string>>(new Set());
	const roadCacheRef = useRef<Map<number, Set<string>>>(new Map());
	const ports = Array.isArray(state.ports) ? state.ports : [];

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
						diceValue: gameDto?.diceValue ?? previousState.diceValue,
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

			if (cancelled) {
				window.clearInterval(poll);
				return;
			}

			return poll;
		};

		let pollHandle: number | undefined;
		void bootstrapBoard().then((poll) => {
			pollHandle = poll;
		});

		return () => {
			cancelled = true;
			if (pollHandle !== undefined) {
				window.clearInterval(pollHandle);
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
	const myPlayer = state.players.find((player) => player.name === sessionUsername) ?? null;
	const myPlayerIdRef = useRef<number | null>(null);
	myPlayerIdRef.current = myPlayer?.id ?? null;
	const isMyTurn = myPlayer !== null && myPlayer.id === state.currentPlayerId;
	const otherPlayers = state.players.filter((player) => player.id !== state.currentPlayerId);

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

	const canAffordRoad = !!myPlayer && myPlayer.resources.wood >= 1 && myPlayer.resources.brick >= 1;

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

		if (!hasAdjacentOwnRoad || !hasAdjacentOwnBuilding) {
			addToLog("Road must connect to your own road and one of your buildings.");
			return false;
		}

		return true;
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
										hasLongestRoad: serverPlayer.hasLongestRoad ?? false,
										settlementsOnCorners: previousPlayer?.settlementsOnCorners ?? [],
										citiesOnCorners: previousPlayer?.citiesOnCorners ?? [],
										roadsOnEdges: mergedRoads,
									};
								})
								: previousState.players,
							currentPlayerId: typeof gameDto.currentTurnIndex === "number" && Array.isArray(gameDto.players) && gameDto.players.length > 0
								? gameDto.players[((gameDto.currentTurnIndex % gameDto.players.length) + gameDto.players.length) % gameDto.players.length].id
								: previousState.currentPlayerId,
							robberHexId: gameDto.robberTileIndex ?? previousState.robberHexId,
							turnPhase: gameDto.turnPhase ?? previousState.turnPhase,
							diceValue: gameDto.diceValue ?? previousState.diceValue,
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

	const handleActionPlaceholder = (actionName: string) => {
		setIsRoadPlacementMode(false);
		const message = `Action clicked: ${actionName} (implementation pending).`;
		addToLog(message);
		if (!activeGameId || !myPlayer) {
			return;
		}

		void apiService.post<GameEventDTO>(`/games/${activeGameId}/events`, {
			type: "ACTION",
			sourcePlayerId: myPlayer.id,
			message,
		});
	};

	const handleBuildRoadAction = () => {
		if (!isMyTurn || !myPlayer) {
			return;
		}

		if (!canAffordRoad) {
			addToLog("Building a road costs 1 wood and 1 brick.");
			return;
		}

		setIsRoadPlacementMode((previous) => {
			const nextMode = !previous;
			addToLog(nextMode ? "Select a legal edge connected to your own road and building." : "Road placement cancelled.");
			return nextMode;
		});
	};

	const handleRoadEdgeClick = async (hexId: number, edge: number) => {
		if (!isRoadPlacementMode || !isMyTurn || !myPlayer || !activeGameId) {
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

		if (!canAffordRoad) {
			addToLog("Building a road costs 1 wood and 1 brick.");
			return;
		}

		if (!isLegalRoadPlacement(hexId, edge)) {
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

		setIsRoadPlacementMode(false);
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
		setIsRoadPlacementMode(false);

		setState((previousState) => ({
			...previousState,
			currentPlayerId: nextPlayer.id,
		}));

		const message = `${myPlayer.name} ended turn. ${nextPlayer.name} is now active.`;
		addToLog(message);

		try {
			await apiService.put<GameGetDTO>(`/games/${activeGameId}`, {
				currentTurnIndex: nextIndex,
			});
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

			<div className={styles.layout}>
				<BoardColumn
					boardStatus={boardStatus}
					state={state}
					ports={ports}
					hexById={hexById}
					renderedRoadSegments={renderedRoadSegments}
					isRoadPlacementMode={isRoadPlacementMode}
					isMyTurn={isMyTurn}
					isLegalRoadPlacement={isLegalRoadPlacement}
					handleRoadEdgeClick={handleRoadEdgeClick}
					handleActionPlaceholder={handleActionPlaceholder}
					handleRollDice={handleRollDice}
					handleBuildRoadAction={handleBuildRoadAction}
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
										<span className={styles.playerStatValue}>0</span>
									</div>
									<div className={`${styles.playerStatCell} ${styles.knightCell}`}>
										<span className={styles.playerStatIcon}>⚔️</span>
										<span className={styles.playerStatValue}>0</span>
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
								<div className={styles.devCardValue}>{developmentCardsRemaining}</div>
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

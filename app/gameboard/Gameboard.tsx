"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getApiDomain } from "@/utils/domain";
import { Castle, Home, LogOut, Minus, Send } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { ApplicationError } from "@/types/error";

export type ResourceType = "wood" | "brick" | "wool" | "wheat" | "ore";

export interface Resources {
	wood: number;
	brick: number;
	wool: number;
	wheat: number;
	ore: number;
}

export interface HexTile {
	id: number;
	type: ResourceType | "desert";
	number: number | null;
	x: number;
	y: number;
}

export interface Player {
	id: number;
	name: string;
	color: string;
	resources: Resources;
	victoryPoints: number;
	hasLongestRoad?: boolean;
	settlementsOnCorners: { hexId: number; corner: number }[];
	citiesOnCorners: { hexId: number; corner: number }[];
	roadsOnEdges: { hexId: number; edge: number }[];
}

export interface GameState {
	hexes: HexTile[];
	ports: PortVisual[];
	players: Player[];
	currentPlayerId: number;
	diceResult: [number, number] | null;
	robberHexId: number | null;
}

type PortType = "3:1" | ResourceType;

interface PortVisual {
	id: number;
	type: PortType;
	hexId: number;
	corners: [number, number];
}

type TradeMode = "bank" | "player";

interface BoardGetDTO {
	id?: number;
	hexTiles: string[];
	intersections: boolean[];
	edges: boolean[];
	ports: string[];
	boats?: BoatGetDTO[];
	hexTile_DiceNumbers: number[];
}

interface BoatGetDTO {
	id?: number;
	boatType?: string;
	hexId?: number;
	firstCorner?: number;
	secondCorner?: number;
}

interface GameGetDTO {
	id: number;
	board?: BoardGetDTO | null;
	currentTurnIndex?: number | null;
	robberTileIndex?: number | null;
	players?: PlayerGetDTO[];
	winner?: PlayerGetDTO | null;
	leaderboard?: PlayerGetDTO[];
	targetVictoryPoints?: number | null;
	finishedAt?: string | null;
	gameFinished?: boolean | null;
	chatMessages?: string[];
}

interface PlayerGetDTO {
	id: number;
	name: string;
	victoryPoints?: number | null;
	settlementPoints?: number | null;
	cityPoints?: number | null;
	developmentCardVictoryPoints?: number | null;
	hasLongestRoad?: boolean | null;
	hasLargestArmy?: boolean | null;
	roadsOnEdges?: string[];
	wood?: number | null;
	brick?: number | null;
	wool?: number | null;
	wheat?: number | null;
	ore?: number | null;
}

interface GameEventDTO {
	type: "BANK_TRADE" | "PLAYER_TRADE" | "ACTION" | "TURN_END" | "ROAD_BUILT";
	sourcePlayerId?: number;
	targetPlayerId?: number;
	giveResource?: ResourceType;
	receiveResource?: ResourceType;
	amount?: number;
	hexId?: number;
	edge?: number;
	nextPlayerId?: number;
	message?: string;
}

interface GameChatMessageDTO {
	playerId?: number;
	playerName?: string;
	text?: string;
}

const hexSize = 58;
const sqrt3 = Math.sqrt(3);
const originX = 150;
const originY = 130;
const hexSpacingX = hexSize * sqrt3;
const hexSpacingY = hexSize * 1.5;

const tileImageByType: Record<HexTile["type"], string> = {
	wood: "/Wood.png",
	brick: "/Brick.png",
	wool: "/Sheep.png",
	wheat: "/Wheat.png",
	ore: "/Stone.png",
	desert: "/Desert.png",
};

const resourceTypes: ResourceType[] = ["wood", "brick", "wool", "wheat", "ore"];
const resourceEmojiByType: Record<ResourceType, string> = {
	wood: "🌲",
	brick: "🧱",
	wool: "🐑",
	wheat: "🌾",
	ore: "⛰️",
};

const bankResources: Resources = {
	wood: 19,
	brick: 19,
	wool: 19,
	wheat: 19,
	ore: 19,
};

const bankResourceColorByType: Record<ResourceType, string> = {
	wood: "#16a34a",
	brick: "#dc2626",
	wool: "#84cc16",
	wheat: "#eab308",
	ore: "#475569",
};

const developmentCardsRemaining = 21;


const boardCoordinatesById: Record<number, { x: number; y: number }> = {
	1: { x: 1, y: 0 },
	2: { x: 2, y: 0 },
	3: { x: 3, y: 0 },
	4: { x: 0.5, y: 1 },
	5: { x: 1.5, y: 1 },
	6: { x: 2.5, y: 1 },
	7: { x: 3.5, y: 1 },
	8: { x: 0, y: 2 },
	9: { x: 1, y: 2 },
	10: { x: 2, y: 2 },
	11: { x: 3, y: 2 },
	12: { x: 4, y: 2 },
	13: { x: 0.5, y: 3 },
	14: { x: 1.5, y: 3 },
	15: { x: 2.5, y: 3 },
	16: { x: 3.5, y: 3 },
	17: { x: 1, y: 4 },
	18: { x: 2, y: 4 },
	19: { x: 3, y: 4 },
};

function toPixel(hex: Pick<HexTile, "x" | "y">) {
	return {
		cx: originX + hex.x * hexSpacingX,
		cy: originY + hex.y * hexSpacingY,
	};
}

function getCornerPoint(centerX: number, centerY: number, cornerIndex: number) {
	const angle = (Math.PI / 3) * cornerIndex + Math.PI / 6;
	return {
		x: centerX + hexSize * Math.cos(angle),
		y: centerY + hexSize * Math.sin(angle),
	};
}

function calculateHexPoints(centerX: number, centerY: number) {
	const points: string[] = [];

	for (let i = 0; i < 6; i += 1) {
		const corner = getCornerPoint(centerX, centerY, i);
		points.push(`${corner.x},${corner.y}`);
	}

	return points.join(" ");
}

function createCanonicalEdgeKey(hex: HexTile, edge: number): string {
	const { cx, cy } = toPixel(hex);
	const point1 = getCornerPoint(cx, cy, edge);
	const point2 = getCornerPoint(cx, cy, (edge + 1) % 6);
	const a = `${Math.round(point1.x)}:${Math.round(point1.y)}`;
	const b = `${Math.round(point2.x)}:${Math.round(point2.y)}`;
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function createCanonicalCornerKey(hex: HexTile, corner: number): string {
	const { cx, cy } = toPixel(hex);
	const point = getCornerPoint(cx, cy, corner);
	return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

function getCanonicalRoadEndpoints(hex: HexTile, edge: number): [string, string] {
	const from = createCanonicalCornerKey(hex, edge);
	const to = createCanonicalCornerKey(hex, (edge + 1) % 6);
	return from < to ? [from, to] : [to, from];
}

function computeLongestRoadLength(player: Player, hexById: Map<number, HexTile>): number {
	const uniqueEdges = new Map<string, [string, string]>();

	player.roadsOnEdges.forEach((road) => {
		const hex = hexById.get(road.hexId);
		if (!hex) {
			return;
		}

		const [from, to] = getCanonicalRoadEndpoints(hex, road.edge);
		const edgeKey = `${from}|${to}`;
		if (!uniqueEdges.has(edgeKey)) {
			uniqueEdges.set(edgeKey, [from, to]);
		}
	});

	const edges = Array.from(uniqueEdges.values());
	if (edges.length === 0) {
		return 0;
	}

	const adjacency = new Map<string, number[]>();
	edges.forEach(([from, to], index) => {
		const fromList = adjacency.get(from) ?? [];
		fromList.push(index);
		adjacency.set(from, fromList);

		const toList = adjacency.get(to) ?? [];
		toList.push(index);
		adjacency.set(to, toList);
	});

	const usedEdge = new Array<boolean>(edges.length).fill(false);

	const dfs = (node: string): number => {
		const connected = adjacency.get(node) ?? [];
		let best = 0;

		for (const edgeIndex of connected) {
			if (usedEdge[edgeIndex]) {
				continue;
			}

			usedEdge[edgeIndex] = true;
			const [from, to] = edges[edgeIndex];
			const nextNode = node === from ? to : from;
			best = Math.max(best, 1 + dfs(nextNode));
			usedEdge[edgeIndex] = false;
		}

		return best;
	};

	let longest = 0;
	adjacency.forEach((_, node) => {
		longest = Math.max(longest, dfs(node));
	});

	return longest;
}

function createInitialGameState(): GameState {
	return {
		hexes: [],
		ports: [],
		currentPlayerId: 0,
		diceResult: null,
		players: [],
		robberHexId: null,
	};
}

function parseRoadEntry(roadEntry: string): { hexId: number; edge: number } | null {
	const [rawHexId, rawEdge] = roadEntry.split(":");
	const hexId = Number(rawHexId);
	const edge = Number(rawEdge);
	if (!Number.isInteger(hexId) || !Number.isInteger(edge)) {
		return null;
	}
	return { hexId, edge };
}

function createRoadEdgeId(road: { hexId: number; edge: number }): string {
	return `${road.hexId}:${road.edge}`;
}

function mergeRoadLists(
	serverRoads: { hexId: number; edge: number }[],
	localRoads: { hexId: number; edge: number }[]
): { hexId: number; edge: number }[] {
	const merged = new Map<string, { hexId: number; edge: number }>();
	[...localRoads, ...serverRoads].forEach((road) => {
		merged.set(createRoadEdgeId(road), road);
	});
	return Array.from(merged.values());
}

function rememberRoadsInCache(
	roadCache: Map<number, Set<string>>,
	playerId: number,
	roads: { hexId: number; edge: number }[]
) {
	const cacheEntry = roadCache.get(playerId) ?? new Set<string>();
	roads.forEach((road) => cacheEntry.add(createRoadEdgeId(road)));
	roadCache.set(playerId, cacheEntry);
}

function mapServerPortType(type: string | undefined): PortType {
	if (!type) {
		return "3:1";
	}

	switch (type.toUpperCase()) {
		case "WOOD":
			return "wood";
		case "BRICK":
			return "brick";
		case "SHEEP":
			return "wool";
		case "WHEAT":
			return "wheat";
			case "STONE":
		case "ORE":
			return "ore";
			case "STANDARD":
				return "3:1";
		case "3:1":
		case "THREE_TO_ONE":
		case "ANY":
			return "3:1";
		default:
			return "3:1";
	}
}

function mapBoardDtoToPorts(boardDto: BoardGetDTO): PortVisual[] {
	if (!Array.isArray(boardDto.boats)) {
		return [];
	}

	return boardDto.boats
		.filter((boat): boat is BoatGetDTO =>
			boat !== undefined
			&& boat !== null
			&& typeof boat.hexId === "number"
			&& typeof boat.firstCorner === "number"
			&& typeof boat.secondCorner === "number"
		)
		.map((boat, index) => ({
			id: boat.id ?? index + 1,
			type: mapServerPortType(boat.boatType),
			hexId: boat.hexId as number,
			corners: [boat.firstCorner as number, boat.secondCorner as number],
		}));
}

function getPortColor(type: PortType): string {
	if (type === "3:1") {
		return "#8b4513";
	}

	const colors: Record<ResourceType, string> = {
		wood: "#22c55e",
		brick: "#ef4444",
		wool: "#a3e635",
		wheat: "#fbbf24",
		ore: "#64748b",
	};

	return colors[type];
}

function getPortLabel(type: PortType): string {
	return type === "3:1" ? "3:1" : "2:1";
}

function getPortIcon(type: PortType): string {
	switch (type) {
		case "wood":
			return "🌲";
		case "brick":
			return "🧱";
		case "wool":
			return "🐑";
		case "wheat":
			return "🌾";
		case "ore":
			return "⛰️";
		default:
			return "?";
	}
}

function calculatePortPosition(centerX: number, centerY: number, corner1Index: number, corner2Index: number, distance: number) {
	const corner1 = getCornerPoint(centerX, centerY, corner1Index);
	const corner2 = getCornerPoint(centerX, centerY, corner2Index);

	const midX = (corner1.x + corner2.x) / 2;
	const midY = (corner1.y + corner2.y) / 2;

	const dx = midX - centerX;
	const dy = midY - centerY;
	const length = Math.sqrt(dx * dx + dy * dy);

	return {
		portX: centerX + (dx / length) * (length + distance),
		portY: centerY + (dy / length) * (length + distance),
		corner1,
		corner2,
	};
}

function mapServerTileType(type: string): HexTile["type"] {
	switch (type.toUpperCase()) {
		case "WOOD":
			return "wood";
		case "BRICK":
			return "brick";
		case "SHEEP":
			return "wool";
		case "WHEAT":
			return "wheat";
		case "ORE":
			return "ore";
		default:
			return "desert";
	}
}

function mapBoardDtoToHexes(boardDto: BoardGetDTO): HexTile[] {
	return Array.from({ length: 19 }, (_, index) => {
		const id = index + 1;
		const coord = boardCoordinatesById[id] ?? { x: 0, y: 0 };
		const serverType = boardDto.hexTiles[index] ?? "DESERT";
		const dice = boardDto.hexTile_DiceNumbers[index] ?? -1;

		return {
			id,
			type: mapServerTileType(serverType),
			number: dice > 0 ? dice : null,
			x: coord.x,
			y: coord.y,
		};
	});
}

function findDesertHexId(hexes: HexTile[]): number | null {
	const desertHex = hexes.find((hex) => hex.type === "desert");
	return desertHex?.id ?? null;
}

function parseGameId(rawValue: string | null): number | null {
	if (!rawValue) {
		return null;
	}

	const normalized = rawValue.replace(/"/g, "").trim();
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

const fallbackPlayerColors = ["#d13f34", "#2e7ccf", "#e0a120", "#3f9e56"];

function fallbackColorForPlayer(index: number): string {
	return fallbackPlayerColors[index % fallbackPlayerColors.length];
}

function safeResourceValue(value: number | null | undefined): number {
	return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 10;
}

function mapResourcesFromServer(player: PlayerGetDTO): Resources {
	return {
		wood: safeResourceValue(player.wood),
		brick: safeResourceValue(player.brick),
		wool: safeResourceValue(player.wool),
		wheat: safeResourceValue(player.wheat),
		ore: safeResourceValue(player.ore),
	};
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
	const [targetVictoryPoints, setTargetVictoryPoints] = useState<number>(10);
	const [winnerPlayerId, setWinnerPlayerId] = useState<number | null>(null);
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
					}));

					setTargetVictoryPoints(gameDto?.targetVictoryPoints ?? 10);
					setWinnerPlayerId(gameDto?.winner?.id ?? null);
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

	const diceLabel = state.diceResult ? `${state.diceResult[0]} + ${state.diceResult[1]}` : "-";

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
			{showTradePopup ? (
				<div className={styles.modalOverlay}>
					<div className={styles.tradeModal}>
						<div className={styles.tradeModalHeader}>
							<h2 className={styles.panelTitle}>Trading</h2>
							<button type="button" className={styles.tradeCloseButton} onClick={() => setShowTradePopup(false)}>
								Close
							</button>
						</div>

						<div className={styles.tradeRow}>
							<button
								type="button"
								className={`${styles.tradeModeButton} ${tradeMode === "bank" ? styles.tradeModeButtonActive : ""}`}
								onClick={() => setTradeMode("bank")}
							>
								Bank
							</button>
							<button
								type="button"
								className={`${styles.tradeModeButton} ${tradeMode === "player" ? styles.tradeModeButtonActive : ""}`}
								onClick={() => setTradeMode("player")}
							>
								Player
							</button>
						</div>

						<div className={styles.tradeGrid}>
							<select className={styles.tradeSelect} value={giveResource} onChange={(event) => setGiveResource(event.target.value as ResourceType)}>
								{resourceTypes.map((resource) => (
									<option key={`give-${resource}`} value={resource}>
										Give: {resource}
									</option>
								))}
							</select>
							<select className={styles.tradeSelect} value={receiveResource} onChange={(event) => setReceiveResource(event.target.value as ResourceType)}>
								{resourceTypes.map((resource) => (
									<option key={`receive-${resource}`} value={resource}>
										Receive: {resource}
									</option>
								))}
							</select>
							<input
								className={styles.tradeInput}
								type="number"
								min={1}
								value={tradeAmount}
								onChange={(event) => setTradeAmount(Math.max(1, Number(event.target.value) || 1))}
							/>
							{tradeMode === "player" ? (
								<select
									className={styles.tradeSelect}
									value={targetPlayerId ?? ""}
									onChange={(event) => setTargetPlayerId(Number(event.target.value))}
								>
									{otherPlayers.map((player) => (
										<option key={`target-${player.id}`} value={player.id}>
											{player.name}
										</option>
									))}
								</select>
							) : null}
						</div>

						<button
							type="button"
							className={styles.tradeActionButton}
							onClick={tradeMode === "bank" ? handleBankTrade : handlePlayerTrade}
							disabled={!currentPlayer || (tradeMode === "player" && otherPlayers.length === 0)}
						>
							{tradeMode === "bank" ? "Execute Bank Trade (4:1)" : "Execute Player Trade (1:1)"}
						</button>
					</div>
				</div>
			) : null}

			<div className={styles.layout}>
			<div className={styles.boardColumn}>
				<main className={styles.boardViewport}>
					{boardStatus ? <div className={styles.boardStatus}>{boardStatus}</div> : null}
					<svg viewBox="0 0 1000 800" className={styles.board} role="img" aria-label="Settlers of Catan board">
						<defs>
							{state.hexes.map((hex) => {
								const { cx, cy } = toPixel(hex);
								return (
									<clipPath id={`clip-${hex.id}`} key={`clip-${hex.id}`}>
										<polygon points={calculateHexPoints(cx, cy)} />
									</clipPath>
								);
							})}
						</defs>

						<g>
							{state.hexes.map((hex) => {
								const { cx, cy } = toPixel(hex);
								const baseImageSize = hexSize * 2.35;
								const imageSize =
															hex.type === "wheat"
										? baseImageSize + 10
										: hex.type === "desert"
											? baseImageSize - 12
											: baseImageSize;
														const imageYOffset = hex.type === "wheat" ? 0 : 0;
								return (
									<g key={hex.id}>
										<image
											href={tileImageByType[hex.type]}
											x={cx - imageSize / 2}
											y={cy - imageSize / 2 + imageYOffset}
											width={imageSize}
											height={imageSize}
											preserveAspectRatio="xMidYMid slice"
											clipPath={`url(#clip-${hex.id})`}
										/>
										<polygon className={styles.hex} points={calculateHexPoints(cx, cy)} fill="none" />
										{hex.number !== null ? (
											<>
												<circle cx={cx} cy={cy} r={17} fill="#fff" fillOpacity={0.55} stroke="#333" strokeWidth={2} />
												<text
													className={styles.hexLabel}
													x={cx}
													y={cy + 1}
													fill={hex.number === 6 || hex.number === 8 ? "#dc2626" : "#1f1408"}
												>
													{hex.number}
												</text>
											</>
										) : null}
									</g>
								);
							})}
						</g>

						{ports.map((port) => {
							const connectedHex = hexById.get(port.hexId);
							if (!connectedHex) {
								return null;
							}

							const { cx: hexCenterX, cy: hexCenterY } = toPixel(connectedHex);
							const portDistance = 45;
							const { portX, portY, corner1, corner2 } = calculatePortPosition(
								hexCenterX,
								hexCenterY,
								port.corners[0],
								port.corners[1],
								portDistance
							);

							let edgeAngle = (Math.atan2(corner2.y - corner1.y, corner2.x - corner1.x) * 180) / Math.PI;
							if (port.id === 1 || port.id === 2) {
								edgeAngle += 180;
							}

							const outwardX = portX - hexCenterX;
							const outwardY = portY - hexCenterY;
							const edgeX = corner2.x - corner1.x;
							const edgeY = corner2.y - corner1.y;
							const perpX = -edgeY;
							const perpY = edgeX;
							const dotProduct = perpX * outwardX + perpY * outwardY;
							const sailSide = dotProduct < 0 ? 1 : -1;

							return (
								<g key={`port-${port.id}`}>
									<line x1={portX} y1={portY} x2={corner1.x} y2={corner1.y} stroke="#654321" strokeWidth={3} strokeLinecap="round" />
									<line x1={portX} y1={portY} x2={corner2.x} y2={corner2.y} stroke="#654321" strokeWidth={3} strokeLinecap="round" />

									<g transform={`translate(${portX}, ${portY}) rotate(${edgeAngle})`}>
										<path d="M-20,5 L-15,15 L15,15 L20,5 L15,-5 L-15,-5 Z" fill="#8b5a3c" stroke="#654321" strokeWidth={2} />
										<rect x={-15} y={-5} width={30} height={10} fill="#a0826d" stroke="#654321" strokeWidth={1} />
										<line x1={0} y1={-5} x2={0} y2={-40} stroke="#654321" strokeWidth={2} />
										<path
											d={sailSide > 0 ? "M0,-40 L20,-25 L20,-10 L0,-5 Z" : "M0,-40 L-20,-25 L-20,-10 L0,-5 Z"}
											fill={getPortColor(port.type)}
											stroke="#fff"
											strokeWidth={2}
											opacity={0.9}
										/>

										{port.type === "3:1" ? (
											<text x={sailSide * 10} y={-18} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={800} style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>
												?
											</text>
										) : (
											<>
												<circle cx={sailSide * 10} cy={-22} r={8} fill="#fff" opacity={0.3} />
												<text x={sailSide * 10} y={-18} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={800} style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
													{getPortIcon(port.type)}
												</text>
											</>
										)}

										<text x={0} y={28} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={800} style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.9)" }}>
											{getPortLabel(port.type)}
										</text>
									</g>
								</g>
							);
						})}

						{isRoadPlacementMode && isMyTurn
							? state.hexes.flatMap((hex) =>
								Array.from({ length: 6 }, (_, edge) => {
									const p1 = getCornerPoint(toPixel(hex).cx, toPixel(hex).cy, edge);
									const p2 = getCornerPoint(toPixel(hex).cx, toPixel(hex).cy, (edge + 1) % 6);
									const legal = isLegalRoadPlacement(hex.id, edge);
									if (!legal) {
										return null;
									}

									return (
										<line
											key={`select-road-${hex.id}-${edge}`}
											x1={p1.x}
											y1={p1.y}
											x2={p2.x}
											y2={p2.y}
											className={styles.roadEdgeSelectable}
											onClick={() => {
												handleRoadEdgeClick(hex.id, edge);
											}}
										/>
									);
								})
							)
							: null}

						<g>
							{renderedRoadSegments.map((segment) => (
								<line
									key={segment.key}
									x1={segment.x1}
									y1={segment.y1}
									x2={segment.x2}
									y2={segment.y2}
									stroke={segment.color}
									strokeWidth={9}
									strokeLinecap="round"
								/>
							))}
						</g>

						<g>
							{state.players.flatMap((player) =>
								player.settlementsOnCorners.map((settlement, index) => {
									const hex = hexById.get(settlement.hexId);

									if (!hex) {
										return null;
									}

									const { cx, cy } = toPixel(hex);
									const point = getCornerPoint(cx, cy, settlement.corner);

									return (
										<rect
											key={`settlement-${player.id}-${settlement.hexId}-${settlement.corner}-${index}`}
											x={point.x - 8}
											y={point.y - 8}
											width={16}
											height={16}
											rx={2}
											fill={player.color}
											stroke="#ffffff"
											strokeWidth={2}
										/>
									);
								})
							)}

							{state.players.flatMap((player) =>
								player.citiesOnCorners.map((city, index) => {
									const hex = hexById.get(city.hexId);

									if (!hex) {
										return null;
									}

									const { cx, cy } = toPixel(hex);
									const point = getCornerPoint(cx, cy, city.corner);

									return (
										<rect
											key={`city-${player.id}-${city.hexId}-${city.corner}-${index}`}
											x={point.x - 11}
											y={point.y - 11}
											width={22}
											height={22}
											rx={3}
											fill={player.color}
											stroke="#ffffff"
											strokeWidth={3}
										/>
									);
								})
							)}
						</g>

						{(() => {
							const fallbackRobberHexId = findDesertHexId(state.hexes);
							const robberHex = hexById.get(state.robberHexId ?? fallbackRobberHexId ?? -1);
							if (!robberHex) {
								return null;
							}

							const { cx, cy } = toPixel(robberHex);
							return (
								<g key="robber">
									<circle cx={cx} cy={cy + 10} r={12} fill="#1a1a1a" stroke="#000" strokeWidth={2} />
									<ellipse cx={cx} cy={cy - 5} rx={10} ry={15} fill="#1a1a1a" stroke="#000" strokeWidth={2} />
									<circle cx={cx} cy={cy - 20} r={8} fill="#1a1a1a" stroke="#000" strokeWidth={2} />
								</g>
							);
						})()}
					</svg>
				</main>

				<div className={styles.actionStrip}>
					<div className={styles.actionBox}>
						<button type="button" className={styles.rollDiceButton} onClick={() => handleActionPlaceholder("Roll Dice")} disabled={!isMyTurn}>
							<span className={styles.actionEmoji}>🎲</span>
							<span>Roll Dice</span>
						</button>

						<div className={styles.actionGrid}>
							<button type="button" className={`${styles.actionSquareButton} ${styles.knightButton}`} onClick={() => handleActionPlaceholder("Knight")} disabled={!isMyTurn}>
								<span className={styles.actionEmoji}>⚔️</span>
								<span className={styles.actionLabel}>Knight</span>
							</button>
							<button
								type="button"
								className={`${styles.actionSquareButton} ${styles.roadButton}`}
								onClick={handleBuildRoadAction}
								disabled={!isMyTurn}
							>
								<Minus size={26} />
								<span className={styles.actionLabel}>{isRoadPlacementMode ? "Cancel Road" : "Road"}</span>
								{!isRoadPlacementMode ? (
									<span className={styles.roadCostOverlay} aria-hidden="true">
										<span className={styles.roadCostChip}>🌲</span>
										<span className={styles.roadCostPlus}>+</span>
										<span className={styles.roadCostChip}>🧱</span>
									</span>
								) : null}
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.settlementButton}`} onClick={() => handleActionPlaceholder("Build Settlement")} disabled={!isMyTurn}>
								<Home size={24} />
								<span className={styles.actionLabel}>Settlement</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.cityButton}`} onClick={() => handleActionPlaceholder("Build City")} disabled={!isMyTurn}>
								<Castle size={24} />
								<span className={styles.actionLabel}>City</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.devCardButton}`} onClick={() => handleActionPlaceholder("Development Card")} disabled={!isMyTurn}>
								<span className={styles.actionEmoji}>🎴</span>
								<span className={styles.actionLabel}>Development Card</span>
							</button>
						</div>

						<button type="button" className={styles.endTurnButton} onClick={handleEndTurn} disabled={!isMyTurn}>
							End Turn
						</button>
					</div>
				</div>
			</div>

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

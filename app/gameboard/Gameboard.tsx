"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Castle, Home, LogOut, Minus, Send } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { ApplicationError } from "@/types/error";

export type ResourceType = "wood" | "brick" | "wool" | "grain" | "ore";

export interface Resources {
	wood: number;
	brick: number;
	wool: number;
	grain: number;
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
	robberTileIndex?: number | null;
	players?: PlayerGetDTO[];
	winner?: PlayerGetDTO | null;
	leaderboard?: PlayerGetDTO[];
	targetVictoryPoints?: number | null;
	finishedAt?: string | null;
	gameFinished?: boolean | null;
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
	grain: "/Wheat.png",
	ore: "/Stone.png",
	desert: "/Desert.png",
};

const resourceTypes: ResourceType[] = ["wood", "brick", "wool", "grain", "ore"];
const resourceEmojiByType: Record<ResourceType, string> = {
	wood: "🌲",
	brick: "🧱",
	wool: "🐑",
	grain: "🌾",
	ore: "⛰️",
};

const bankResources: Resources = {
	wood: 19,
	brick: 19,
	wool: 19,
	grain: 19,
	ore: 19,
};

const bankResourceColorByType: Record<ResourceType, string> = {
	wood: "#16a34a",
	brick: "#dc2626",
	wool: "#84cc16",
	grain: "#eab308",
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
			return "grain";
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
		grain: "#fbbf24",
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
		case "grain":
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
			return "grain";
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

function createEmptyResources(): Resources {
	return {
		wood: 0,
		brick: 0,
		wool: 0,
		grain: 0,
		ore: 0,
	};
}

export default function Gameboard() {
	const router = useRouter();
	const apiService = useApi();
	const searchParams = useSearchParams();
	const [state, setState] = useState<GameState>(createInitialGameState);
	const [boardStatus, setBoardStatus] = useState<string>("Loading board...");
	const [gameLog, setGameLog] = useState<string[]>(["Trading ready."]);
	const [tradeMode, setTradeMode] = useState<TradeMode>("bank");
	const [giveResource, setGiveResource] = useState<ResourceType>("wood");
	const [receiveResource, setReceiveResource] = useState<ResourceType>("grain");
	const [tradeAmount, setTradeAmount] = useState<number>(1);
	const [targetPlayerId, setTargetPlayerId] = useState<number | null>(null);
	const [showTradePopup, setShowTradePopup] = useState<boolean>(false);
	const [chatMessage, setChatMessage] = useState<string>("");
	const [targetVictoryPoints, setTargetVictoryPoints] = useState<number>(10);
	const [winnerPlayerId, setWinnerPlayerId] = useState<number | null>(null);
	const [winnerPlayerName, setWinnerPlayerName] = useState<string | null>(null);
	const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
	const ports = Array.isArray(state.ports) ? state.ports : [];

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

		const syncGameState = async (gameId: number): Promise<"ok" | "unauthorized" | "notfound" | "error"> => {
			try {
				const [boardDto, gameDto] = await Promise.all([
					apiService.get<BoardGetDTO>(`/games/${gameId}/board`),
					apiService.get<GameGetDTO>(`/games/${gameId}`),
				]);

				if (!cancelled && boardDto?.hexTiles && boardDto?.hexTile_DiceNumbers) {
					const mappedHexes = mapBoardDtoToHexes(boardDto);
					const mappedPorts = mapBoardDtoToPorts(boardDto);
					const serverPlayers = Array.isArray(gameDto?.players) ? gameDto.players : [];
					setState((previousState) => ({
						...previousState,
						hexes: mappedHexes,
						ports: mappedPorts,
						robberHexId: gameDto?.robberTileIndex ?? findDesertHexId(mappedHexes),
						players:
							serverPlayers.length > 0
								? serverPlayers.map((serverPlayer, index) => {
									const previousPlayer = previousState.players.find((player) => player.id === serverPlayer.id);
									return {
										id: serverPlayer.id,
										name: serverPlayer.name,
										color: previousPlayer?.color ?? fallbackColorForPlayer(index),
										resources: previousPlayer?.resources ?? createEmptyResources(),
										victoryPoints: serverPlayer.victoryPoints ?? 0,
										settlementsOnCorners: previousPlayer?.settlementsOnCorners ?? [],
										citiesOnCorners: previousPlayer?.citiesOnCorners ?? [],
										roadsOnEdges: previousPlayer?.roadsOnEdges ?? [],
									};
								})
								: previousState.players,
						currentPlayerId:
							serverPlayers.length > 0
								? previousState.currentPlayerId && serverPlayers.some((player) => player.id === previousState.currentPlayerId)
									? previousState.currentPlayerId
									: serverPlayers[0].id
								: previousState.currentPlayerId,
					}));

					setTargetVictoryPoints(gameDto?.targetVictoryPoints ?? 10);
					setWinnerPlayerId(gameDto?.winner?.id ?? null);
					setWinnerPlayerName(gameDto?.winner?.name ?? null);
					setIsGameFinished(Boolean(gameDto?.gameFinished) || Boolean(gameDto?.finishedAt));
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

			localStorage.setItem("gameId", JSON.stringify(createdGame.id));

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
			const storedGameId = parseGameId(localStorage.getItem("gameId"));

			if (queryGameId) {
				localStorage.setItem("gameId", JSON.stringify(queryGameId));
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

			let syncStatus = await syncGameState(gameId);
			if (syncStatus === "unauthorized") {
				if (!cancelled) {
					setBoardStatus("Session expired. Please log in again.");
					router.replace("/login");
				}
				return;
			}

			if (syncStatus === "notfound") {
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
	const otherPlayers = state.players.filter((player) => player.id !== state.currentPlayerId);

	useEffect(() => {
		if (otherPlayers.length > 0 && !targetPlayerId) {
			setTargetPlayerId(otherPlayers[0].id);
		}
	}, [otherPlayers, targetPlayerId]);

	const diceLabel = state.diceResult ? `${state.diceResult[0]} + ${state.diceResult[1]}` : "-";
	const totalCurrentResources = currentPlayer
		? resourceTypes.reduce((acc, resource) => acc + currentPlayer.resources[resource], 0)
		: 0;

	const addToLog = (message: string) => {
		setGameLog((previous) => [message, ...previous].slice(0, 12));
	};

	const getPlayerTotalResources = (player: Player): number =>
		resourceTypes.reduce((sum, resource) => sum + player.resources[resource], 0);

	const handleBankTrade = () => {
		if (currentPlayerIndex < 0 || !currentPlayer) {
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

		setState((previousState) => {
			const nextPlayers = [...previousState.players];
			const nextCurrent = { ...nextPlayers[currentPlayerIndex], resources: { ...nextPlayers[currentPlayerIndex].resources } };
			nextCurrent.resources[giveResource] -= giveAmount;
			nextCurrent.resources[receiveResource] += tradeAmount;
			nextPlayers[currentPlayerIndex] = nextCurrent;

			return {
				...previousState,
				players: nextPlayers,
			};
		});

		addToLog(`${currentPlayer.name} trades ${giveAmount} ${giveResource} for ${tradeAmount} ${receiveResource} with bank.`);
	};

	const handlePlayerTrade = () => {
		if (currentPlayerIndex < 0 || !currentPlayer || !targetPlayerId) {
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

		setState((previousState) => {
			const nextPlayers = [...previousState.players];
			const nextCurrent = { ...nextPlayers[currentPlayerIndex], resources: { ...nextPlayers[currentPlayerIndex].resources } };
			const nextTarget = { ...nextPlayers[targetIndex], resources: { ...nextPlayers[targetIndex].resources } };

			nextCurrent.resources[giveResource] -= tradeAmount;
			nextCurrent.resources[receiveResource] += tradeAmount;
			nextTarget.resources[receiveResource] -= tradeAmount;
			nextTarget.resources[giveResource] += tradeAmount;

			nextPlayers[currentPlayerIndex] = nextCurrent;
			nextPlayers[targetIndex] = nextTarget;

			return {
				...previousState,
				players: nextPlayers,
			};
		});

		addToLog(`${currentPlayer.name} trades ${tradeAmount} ${giveResource} with ${targetPlayer.name} for ${receiveResource}.`);
	};

	const handleActionPlaceholder = (actionName: string) => {
		addToLog(`Action clicked: ${actionName} (implementation pending).`);
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
		if (!chatMessage.trim()) {
			return;
		}

		addToLog(`[CHAT] ${currentPlayer ? currentPlayer.name : "Player"}: ${chatMessage.trim()}`);
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
									hex.type === "grain"
										? baseImageSize + 10
										: hex.type === "desert"
											? baseImageSize - 12
											: baseImageSize;
								const imageYOffset = hex.type === "grain" ? 0 : 0;
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

						<g>
							{state.players.flatMap((player) =>
								player.roadsOnEdges.map((road, index) => {
									const hex = hexById.get(road.hexId);
									if (!hex) {
										return null;
									}

									const { cx, cy } = toPixel(hex);
									const p1 = getCornerPoint(cx, cy, road.edge);
									const p2 = getCornerPoint(cx, cy, (road.edge + 1) % 6);

									return (
										<line
											key={`road-${player.id}-${road.hexId}-${road.edge}-${index}`}
											x1={p1.x}
											y1={p1.y}
											x2={p2.x}
											y2={p2.y}
											stroke={player.color}
											strokeWidth={9}
											strokeLinecap="round"
										/>
									);
								})
							)}
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
						<button type="button" className={styles.rollDiceButton} onClick={() => handleActionPlaceholder("Roll Dice")}>
							<span className={styles.actionEmoji}>🎲</span>
							<span>Roll Dice</span>
						</button>

						<div className={styles.actionGrid}>
							<button type="button" className={`${styles.actionSquareButton} ${styles.knightButton}`} onClick={() => handleActionPlaceholder("Knight")}>
								<span className={styles.actionEmoji}>⚔️</span>
								<span className={styles.actionLabel}>Knight</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.roadButton}`} onClick={() => handleActionPlaceholder("Build Road")}>
								<Minus size={26} />
								<span className={styles.actionLabel}>Road</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.settlementButton}`} onClick={() => handleActionPlaceholder("Build Settlement")}>
								<Home size={24} />
								<span className={styles.actionLabel}>Settlement</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.cityButton}`} onClick={() => handleActionPlaceholder("Build City")}>
								<Castle size={24} />
								<span className={styles.actionLabel}>City</span>
							</button>
							<button type="button" className={`${styles.actionSquareButton} ${styles.devCardButton}`} onClick={() => handleActionPlaceholder("Development Card")}>
								<span className={styles.actionEmoji}>🎴</span>
								<span className={styles.actionLabel}>Development Card</span>
							</button>
						</div>

						<button type="button" className={styles.endTurnButton} onClick={() => handleActionPlaceholder("End Turn")}>
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
									<div className={`${styles.playerStatCell} ${styles.roadCell}`}>
										<span className={styles.playerStatIcon}>🛣️</span>
										<span className={styles.playerStatValue}>{player.roadsOnEdges.length}</span>
									</div>
								</div>
							</li>
						))}
					</ul>
				</section>

				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Resources</h2>
					{currentPlayer ? (
						<>
							<div className={styles.currentPlayerLine}>{currentPlayer.name} · Total {totalCurrentResources}</div>
							<div className={styles.resourcePanelGrid}>
								{resourceTypes.map((resource) => (
									<div key={`res-${resource}`} className={`${styles.resourcePanelTile} ${styles[`resourcePanelTile${resource.charAt(0).toUpperCase() + resource.slice(1)}`]}`}>
										<span>{resourceEmojiByType[resource]}</span>
										<strong>{currentPlayer.resources[resource]}</strong>
									</div>
								))}
							</div>
						</>
					) : (
						<div className={styles.currentPlayerLine}>No active player</div>
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
							<p key={`log-${index}`}>{entry}</p>
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

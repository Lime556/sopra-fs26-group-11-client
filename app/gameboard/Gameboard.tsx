"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import styles from "@/styles/gameboard.module.css";

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
	players: Player[];
	currentPlayerId: number;
	diceResult: [number, number] | null;
}

type TradeMode = "bank" | "player";

interface BoardGetDTO {
	id?: number;
	hexTiles: string[];
	intersections: boolean[];
	edges: boolean[];
	ports: string[];
	hexTile_DiceNumbers: number[];
}

interface GameGetDTO {
	id: number;
	board?: BoardGetDTO | null;
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
	grain: "/Wheet.png",
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

// Follows the board layout from the src guideline component (game-board.tsx).
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
		currentPlayerId: 0,
		diceResult: null,
		players: [],
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

function parseGameId(rawValue: string | null): number | null {
	if (!rawValue) {
		return null;
	}

	const normalized = rawValue.replace(/"/g, "").trim();
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
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

	useEffect(() => {
		let cancelled = false;

		const syncGameState = async (gameId: number) => {
			try {
				const boardDto = await apiService.get<BoardGetDTO>(`/games/${gameId}/board`);

				if (!cancelled && boardDto?.hexTiles && boardDto?.hexTile_DiceNumbers) {
					setState((previousState) => ({
						...previousState,
						hexes: mapBoardDtoToHexes(boardDto),
					}));
					setBoardStatus("");
				}
			} catch {
				if (!cancelled) {
					setBoardStatus("Could not load board data from server.");
				}
			}
		};

		const createGameIfNeeded = async (): Promise<number | null> => {
			const createdGame = await apiService.post<GameGetDTO>("/games", {});

			if (!createdGame?.id) {
				return null;
			}

			localStorage.setItem("gameId", JSON.stringify(createdGame.id));

			if (createdGame.board?.hexTiles && createdGame.board?.hexTile_DiceNumbers && !cancelled) {
				setState((previousState) => ({
					...previousState,
					hexes: mapBoardDtoToHexes(createdGame.board as BoardGetDTO),
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

			await syncGameState(gameId);
			const poll = window.setInterval(() => {
				void syncGameState(gameId as number);
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
					</svg>
				</main>

				<div className={styles.actionStrip}>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Roll Dice")}>Roll Dice</button>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Knight")}>Knight</button>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Build Road")}>Road</button>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Build Settlement")}>Settlement</button>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Build City")}>City</button>
					<button type="button" className={styles.actionButton} onClick={() => handleActionPlaceholder("Development Card")}>Development Card</button>
					<button type="button" className={`${styles.actionButton} ${styles.endTurnButton}`} onClick={() => handleActionPlaceholder("End Turn")}>End Turn</button>
				</div>
			</div>

			<aside className={styles.rightPanel}>
				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Players</h2>
					<ul className={styles.playerList}>
						{state.players.map((player) => (
							<li key={player.id} className={styles.playerCard}>
								<div className={styles.playerHeader}>
									<div className={styles.playerName}>
										<span className={styles.colorDot} style={{ backgroundColor: player.color }} />
										<span>{player.name}</span>
									</div>
									<span className={styles.vpTag}>{player.victoryPoints} VP</span>
								</div>
								<div className={styles.resourceRow}>
									{resourceTypes.map((resource) => (
										<span key={resource} className={styles.resourceChip}>
											{resourceEmojiByType[resource]} {player.resources[resource]}
										</span>
									))}
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
							<div className={styles.resourceGrid}>
								{resourceTypes.map((resource) => (
									<div key={`res-${resource}`} className={styles.resourceTile}>
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
					<h2 className={styles.panelTitle}>Bank</h2>
					<div className={styles.resourceGrid}>
						{resourceTypes.map((resource) => (
							<div key={`bank-${resource}`} className={styles.resourceTile}>
								<span>{resourceEmojiByType[resource]}</span>
								<strong>{bankResources[resource]}</strong>
							</div>
						))}
					</div>
				</section>

				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Trading</h2>
					<button type="button" className={styles.tradeActionButton} onClick={() => setShowTradePopup(true)}>
						Open Trade Popup
					</button>
				</section>

				<section className={styles.sidebarCard}>
					<h2 className={styles.panelTitle}>Game Log</h2>
					<div className={styles.logBox}>
						{gameLog.map((entry, index) => (
							<p key={`log-${index}`}>{entry}</p>
						))}
					</div>
					<button className={styles.leaveButton} onClick={() => router.push("/lobby")}>Leave Lobby</button>
				</section>
			</aside>
			</div>
		</>
	);
}

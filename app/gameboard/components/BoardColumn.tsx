import { Castle, Home, Minus } from "lucide-react";
import styles from "@/styles/gameboard.module.css";
import { findDesertHexId, getPortColor, getPortIcon, getPortLabel } from "../mappers";
import { calculateHexPoints, calculatePortPosition, getCornerPoint, toPixel } from "../geometry";
import { hexSize, tileImageByType } from "../constants";
import { GameState, HexTile, PortVisual } from "../types";

interface RenderedRoadSegment {
	key: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color: string;
}

interface BoardColumnProps {
	boardStatus: string;
	state: GameState;
	ports: PortVisual[];
	hexById: Map<number, HexTile>;
	renderedRoadSegments: RenderedRoadSegment[];
	isRoadPlacementMode: boolean;
	isSettlementPlacementMode: boolean;
	isCityPlacementMode: boolean;
	isMyTurn: boolean;
	isLegalRoadPlacement: (hexId: number, edge: number) => boolean;
	isLegalSettlementPlacement: (hexId: number, corner: number) => boolean;
	isLegalCityPlacement: (hexId: number, corner: number) => boolean;
	handleRoadEdgeClick: (hexId: number, edge: number) => void;
	handleSettlementCornerClick: (hexId: number, corner: number) => void;
	handleCityCornerClick: (hexId: number, corner: number) => void;
	handleBuyDevelopmentCard: () => void;
	handleRollDice: () => void;
	handleBuildRoadAction: () => void;
	handleBuildSettlementAction: () => void;
	handleBuildCityAction: () => void;
	handleEndTurn: () => void;
}

export function BoardColumn({
	boardStatus,
	state,
	ports,
	hexById,
	renderedRoadSegments,
	isRoadPlacementMode,
	isSettlementPlacementMode,
	isCityPlacementMode,
	isMyTurn,
	isLegalRoadPlacement,
	isLegalSettlementPlacement,
	isLegalCityPlacement,
	handleRoadEdgeClick,
	handleSettlementCornerClick,
	handleCityCornerClick,
	handleBuyDevelopmentCard,
	handleRollDice,
	handleBuildRoadAction,
	handleBuildSettlementAction,
	handleBuildCityAction,
	handleEndTurn,
}: BoardColumnProps) {
	return (
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

					{isSettlementPlacementMode && isMyTurn
						? state.hexes.flatMap((hex) =>
								Array.from({ length: 6 }, (_, corner) => {
									const point = getCornerPoint(toPixel(hex).cx, toPixel(hex).cy, corner);
									const legal = isLegalSettlementPlacement(hex.id, corner);
									if (!legal) {
										return null;
									}

									return (
										<circle
											key={`select-settlement-${hex.id}-${corner}`}
											cx={point.x}
											cy={point.y}
											r={10}
											className={styles.cornerSelectable}
											onClick={() => handleSettlementCornerClick(hex.id, corner)}
										/>
									);
								})
							)
						: null}

					{isCityPlacementMode && isMyTurn
						? state.hexes.flatMap((hex) =>
								Array.from({ length: 6 }, (_, corner) => {
									const point = getCornerPoint(toPixel(hex).cx, toPixel(hex).cy, corner);
									const legal = isLegalCityPlacement(hex.id, corner);
									if (!legal) {
										return null;
									}

									return (
										<circle
											key={`select-city-${hex.id}-${corner}`}
											cx={point.x}
											cy={point.y}
											r={10}
											className={styles.cornerSelectable}
											onClick={() => handleCityCornerClick(hex.id, corner)}
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
					<button
						type="button"
						className={`${styles.rollDiceButton} ${!isMyTurn || state.turnPhase !== "ROLL_DICE" ? styles.buttonDisabled : styles.rollDiceButton}`}
						onClick={handleRollDice}
						disabled={!isMyTurn || state.turnPhase !== "ROLL_DICE"}
					>
						<span className={styles.actionEmoji}>🎲</span>
						<span>Roll Dice</span>
					</button>

					<div className={styles.actionGrid}>
						<button
							type="button"
							className={`${styles.actionSquareButton} ${styles.knightButton}`}
							onClick={handleBuyDevelopmentCard}
							disabled={!isMyTurn || state.turnPhase !== "ACTION"}
						>
							<span className={styles.actionEmoji}>🎴</span>
							<span className={styles.actionLabel}>Buy Dev Card</span>
							<span className={styles.roadCostOverlay} aria-hidden="true">
								<span className={styles.roadCostChip}>🐑</span>
								<span className={styles.roadCostPlus}>+</span>
								<span className={styles.roadCostChip}>🌾</span>
								<span className={styles.roadCostPlus}>+</span>
								<span className={styles.roadCostChip}>⛰️</span>
							</span>
						</button>

						<button
							type="button"
							className={`${styles.actionSquareButton} ${styles.roadButton}`}
							onClick={handleBuildRoadAction}
							disabled={!isMyTurn || state.turnPhase !== "ACTION"}
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

						<button
							type="button"
							className={`${styles.actionSquareButton} ${styles.settlementButton}`}
							onClick={handleBuildSettlementAction}
							disabled={!isMyTurn || state.turnPhase !== "ACTION"}
						>
							<Home size={24} />
							<span className={styles.actionLabel}>
								{isSettlementPlacementMode ? "Cancel Settlement" : "Settlement"}
							</span>
							{!isSettlementPlacementMode ? (
								<span className={styles.settlementCostOverlay} aria-hidden="true">
									<span className={styles.roadCostChip}>🌲</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>🧱</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>🐑</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>🌾</span>
								</span>
							) : null}
						</button>

						<button
							type="button"
							className={`${styles.actionSquareButton} ${styles.cityButton}`}
							onClick={handleBuildCityAction}
							disabled={!isMyTurn || state.turnPhase !== "ACTION"}
						>
							<Castle size={24} />
							<span className={styles.actionLabel}>
								{isCityPlacementMode ? "Cancel City" : "City"}
							</span>
							{!isCityPlacementMode ? (
								<span className={styles.cityCostOverlay} aria-hidden="true">
									<span className={styles.roadCostChip}>🌾</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>🌾</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>⛰️</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>⛰️</span>
									<span className={styles.roadCostPlus}>+</span>
									<span className={styles.roadCostChip}>⛰️</span>
								</span>
							) : null}
						</button>
					</div>

					<button
						type="button"
						className={`${styles.endTurnButton} ${!isMyTurn || state.turnPhase !== "ACTION" ? styles.buttonDisabled : styles.endTurnButton}`}
						onClick={handleEndTurn}
						disabled={!isMyTurn || state.turnPhase !== "ACTION"}
					>
						End Turn
					</button>
				</div>
			</div>
		</div>
	);
}

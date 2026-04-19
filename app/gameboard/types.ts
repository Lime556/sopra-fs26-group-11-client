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
	diceResult: number | null;
	robberHexId: number | null;
	turnPhase: string;
}

export type PortType = "3:1" | ResourceType;

export interface PortVisual {
	id: number;
	type: PortType;
	hexId: number;
	corners: [number, number];
}

export type TradeMode = "bank" | "player";

export interface BoardGetDTO {
	id?: number;
	hexTiles: string[];
	intersections: boolean[];
	edges: boolean[];
	ports: string[];
	boats?: BoatGetDTO[];
	hexTile_DiceNumbers: number[];
}

export interface BoatGetDTO {
	id?: number;
	boatType?: string;
	hexId?: number;
	firstCorner?: number;
	secondCorner?: number;
}

export interface GameGetDTO {
	id: number;
	board?: BoardGetDTO | null;
	currentTurnIndex?: number | null;
	turnPhase?: string | null;
	diceValue?: number | null;
	robberTileIndex?: number | null;
	players?: PlayerGetDTO[];
	winner?: PlayerGetDTO | null;
	leaderboard?: PlayerGetDTO[];
	targetVictoryPoints?: number | null;
	finishedAt?: string | null;
	gameFinished?: boolean | null;
	chatMessages?: string[];
}

export interface GameStateDTO {
	currentPlayerId: number;
	turnPhase: string;
	diceValue: number | null;
	gameFinished: boolean;
}

export interface PlayerGetDTO {
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

export interface GameEventDTO {
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

export interface GameChatMessageDTO {
	playerId?: number;
	playerName?: string;
	text?: string;
}

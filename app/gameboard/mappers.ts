import { boardCoordinatesById, fallbackPlayerColors } from "./constants";
import { BoardGetDTO, BoatGetDTO, GameState, HexTile, PlayerGetDTO, PortType, PortVisual, ResourceType, Resources } from "./types";

export function createInitialGameState(): GameState {
	return {
		hexes: [],
		ports: [],
		currentPlayerId: 0,
		diceResult: null,
		players: [],
		robberHexId: null,
		turnPhase: "ROLL_DICE",
		gamePhase: "ACTIVE",
		developmentDeck: null,
	};
}

export function mapServerPortType(type: string | undefined): PortType {
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

export function mapBoardDtoToPorts(boardDto: BoardGetDTO): PortVisual[] {
	if (!Array.isArray(boardDto.boats)) {
		return [];
	}

	return boardDto.boats
		.filter(
			(boat): boat is BoatGetDTO =>
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

export function getPortColor(type: PortType): string {
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

export function getPortLabel(type: PortType): string {
	return type === "3:1" ? "3:1" : "2:1";
}

export function getPortIcon(type: PortType): string {
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

export function mapServerTileType(type: string): HexTile["type"] {
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

export function mapBoardDtoToHexes(boardDto: BoardGetDTO): HexTile[] {
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

export function findDesertHexId(hexes: HexTile[]): number | null {
	const desertHex = hexes.find((hex) => hex.type === "desert");
	return desertHex?.id ?? null;
}

export function parseGameId(rawValue: string | null): number | null {
	if (!rawValue) {
		return null;
	}

	const normalized = rawValue.replace(/"/g, "").trim();
	const value = Number(normalized);
	return Number.isFinite(value) ? value : null;
}

export function fallbackColorForPlayer(index: number): string {
	return fallbackPlayerColors[index % fallbackPlayerColors.length];
}

export function safeResourceValue(value: number | null | undefined): number {
	return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 10;
}

export function mapResourcesFromServer(player: PlayerGetDTO): Resources {
	return {
		wood: safeResourceValue(player.wood),
		brick: safeResourceValue(player.brick),
		wool: safeResourceValue(player.wool),
		wheat: safeResourceValue(player.wheat),
		ore: safeResourceValue(player.ore),
	};
}

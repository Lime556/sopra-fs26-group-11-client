import { HexTile, ResourceType, Resources } from "./types";

export const hexSize = 58;
export const sqrt3 = Math.sqrt(3);
export const originX = 150;
export const originY = 130;
export const hexSpacingX = hexSize * sqrt3;
export const hexSpacingY = hexSize * 1.5;

export const tileImageByType: Record<HexTile["type"], string> = {
	wood: "/Wood.png",
	brick: "/Brick.png",
	wool: "/Sheep.png",
	wheat: "/Wheat.png",
	ore: "/Stone.png",
	desert: "/Desert.png",
};

export const resourceTypes: ResourceType[] = ["wood", "brick", "wool", "wheat", "ore"];

export const resourceEmojiByType: Record<ResourceType, string> = {
	wood: "🌲",
	brick: "🧱",
	wool: "🐑",
	wheat: "🌾",
	ore: "⛰️",
};

export const bankResources: Resources = {
	wood: 19,
	brick: 19,
	wool: 19,
	wheat: 19,
	ore: 19,
};

export const bankResourceColorByType: Record<ResourceType, string> = {
	wood: "#16a34a",
	brick: "#dc2626",
	wool: "#84cc16",
	wheat: "#eab308",
	ore: "#475569",
};

export const developmentCardsRemaining = 25;

export const boardCoordinatesById: Record<number, { x: number; y: number }> = {
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

export const fallbackPlayerColors = ["#d13f34", "#2e7ccf", "#e0a120", "#3f9e56"];

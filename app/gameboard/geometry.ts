import { hexSize, hexSpacingX, hexSpacingY, originX, originY } from "./constants";
import { HexTile } from "./types";

export function toPixel(hex: Pick<HexTile, "x" | "y">) {
	return {
		cx: originX + hex.x * hexSpacingX,
		cy: originY + hex.y * hexSpacingY,
	};
}

export function getCornerPoint(centerX: number, centerY: number, cornerIndex: number) {
	const angle = (Math.PI / 3) * cornerIndex + Math.PI / 6;
	return {
		x: centerX + hexSize * Math.cos(angle),
		y: centerY + hexSize * Math.sin(angle),
	};
}

export function calculateHexPoints(centerX: number, centerY: number) {
	const points: string[] = [];

	for (let i = 0; i < 6; i += 1) {
		const corner = getCornerPoint(centerX, centerY, i);
		points.push(`${corner.x},${corner.y}`);
	}

	return points.join(" ");
}

export function createCanonicalEdgeKey(hex: HexTile, edge: number): string {
	const { cx, cy } = toPixel(hex);
	const point1 = getCornerPoint(cx, cy, edge);
	const point2 = getCornerPoint(cx, cy, (edge + 1) % 6);
	const a = `${Math.round(point1.x)}:${Math.round(point1.y)}`;
	const b = `${Math.round(point2.x)}:${Math.round(point2.y)}`;
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function createCanonicalCornerKey(hex: HexTile, corner: number): string {
	const { cx, cy } = toPixel(hex);
	const point = getCornerPoint(cx, cy, corner);
	return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

export function getCanonicalRoadEndpoints(hex: HexTile, edge: number): [string, string] {
	const from = createCanonicalCornerKey(hex, edge);
	const to = createCanonicalCornerKey(hex, (edge + 1) % 6);
	return from < to ? [from, to] : [to, from];
}

export function calculatePortPosition(
	centerX: number,
	centerY: number,
	corner1Index: number,
	corner2Index: number,
	distance: number
) {
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

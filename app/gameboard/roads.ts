import { getCanonicalRoadEndpoints, createCanonicalCornerKey } from "./geometry";
import { HexTile, Player } from "./types";

export function computeLongestRoadLength(
	player: Player,
	hexById: Map<number, HexTile>,
	allPlayers: Player[]
): number {
	const opponentSettlements = new Set<string>();
	allPlayers.forEach((p) => {
		if (p.id === player.id) return;
		p.settlementsOnCorners.forEach((s) => {
			const hex = hexById.get(s.hexId);
			if (hex) opponentSettlements.add(createCanonicalCornerKey(hex, s.corner));
		});
		p.citiesOnCorners.forEach((c) => {
			const hex = hexById.get(c.hexId);
			if (hex) opponentSettlements.add(createCanonicalCornerKey(hex, c.corner));
		});
	});

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

			if (opponentSettlements.has(nextNode)) {
				best = Math.max(best, 1);
			} else {
				best = Math.max(best, 1 + dfs(nextNode));
			}
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

export function parseRoadEntry(roadEntry: string): { hexId: number; edge: number } | null {
	const [rawHexId, rawEdge] = roadEntry.split(":");
	const hexId = Number(rawHexId);
	const edge = Number(rawEdge);
	if (!Number.isInteger(hexId) || !Number.isInteger(edge)) {
		return null;
	}
	return { hexId, edge };
}

export function createRoadEdgeId(road: { hexId: number; edge: number }): string {
	return `${road.hexId}:${road.edge}`;
}

export function mergeRoadLists(
	serverRoads: { hexId: number; edge: number }[],
	localRoads: { hexId: number; edge: number }[]
): { hexId: number; edge: number }[] {
	const merged = new Map<string, { hexId: number; edge: number }>();
	[...localRoads, ...serverRoads].forEach((road) => {
		merged.set(createRoadEdgeId(road), road);
	});
	return Array.from(merged.values());
}

export function rememberRoadsInCache(
	roadCache: Map<number, Set<string>>,
	playerId: number,
	roads: { hexId: number; edge: number }[]
) {
	const cacheEntry = roadCache.get(playerId) ?? new Set<string>();
	roads.forEach((road) => cacheEntry.add(createRoadEdgeId(road)));
	roadCache.set(playerId, cacheEntry);
}

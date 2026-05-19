"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "@/styles/gameboard.module.css";
import { BoardColumn } from "../gameboard/components/BoardColumn";
import { boardCoordinatesById } from "../gameboard/constants";
import { findDesertHexId, createInitialGameState } from "../gameboard/mappers";
import { type GameState, type HexTile, type PortVisual, type Player } from "../gameboard/types";
import { createCanonicalEdgeKey, getCornerPoint, toPixel } from "../gameboard/geometry";
import { LogOut, Send } from "lucide-react";
import { TutorialOverlay } from "../tutorial/TutorialOverlay";


const tutorialHexTypes: HexTile["type"][] = [
  "wool",
  "wheat",
  "wood",
  "brick",
  "ore",
  "wool",
  "wheat",
  "wood",
  "desert",
  "wood",
  "wheat",
  "brick",
  "ore",
  "wood",
  "ore",
  "wool",
  "brick",
  "wheat",
  "wool",
];

const tutorialHexNumbers: Array<number | null> = [
  5, 2, 6, 3, 8,
  10, 9, 11, null, 4,
  8, 5, 6, 3, 9,
  4, 10, 11, 12,
];

const tutorialHexes: HexTile[] = Object.keys(boardCoordinatesById)
  .map((key) => Number(key))
  .sort((a, b) => a - b)
  .map((id, index) => ({
    id,
    type: tutorialHexTypes[index] ?? "desert",
    number: tutorialHexNumbers[index] ?? null,
    x: boardCoordinatesById[id].x,
    y: boardCoordinatesById[id].y,
  }));

const tutorialPorts: PortVisual[] = [
  {
    id: 1,
    type: "3:1",
    hexId: 16,
    corners: [0, 5],
  },
  {
    id: 2,
    type: "wood",
    hexId: 2,
    corners: [4, 3],
  },
  {
    id: 3,
    type: "brick",
    hexId: 3,
    corners: [4, 5],
  },
  {
    id: 4,
    type: "3:1",
    hexId: 4,
    corners: [3, 4],
  },
  {
    id: 5,
    type: "wool",
    hexId: 7,
    corners: [4, 5],
  },
  {
    id: 6,
    type: "wheat",
    hexId: 12,
    corners: [5, 0],
  },
  {
    id: 7,
    type: "3:1",
    hexId: 13,
    corners: [2, 3],
  },
  {
    id: 8,
    type: "ore",
    hexId: 19,
    corners: [0, 1],
  },
  {
    id: 9,
    type: "3:1",
    hexId: 18,
    corners: [1, 2],
  },
];

const tutorialPlayer: Player = {
  id: 1,
  userId: null,
  name: "Tutorial Player",
  color: "#d13f34",
  resources: {
    wood: 1,
    brick: 0,
    wool: 1,
    wheat: 0,
    ore: 1,
  },
  victoryPoints: 2,
  developmentCards: [],
  knightsPlayed: 0,
  developmentCardVictoryPoints: 0,
  freeRoadBuildsRemaining: 0,
  settlementsOnCorners: [{ hexId: 6, corner: 2 }],
  citiesOnCorners: [{ hexId: 15, corner: 5 }],
  roadsOnEdges: [{ hexId: 6, edge: 1 }, { hexId: 15, edge : 4 }],
};

const tutorialState: GameState = {
  ...createInitialGameState(),
  hexes: tutorialHexes,
  ports: tutorialPorts,
  players: [tutorialPlayer],
  currentPlayerId: tutorialPlayer.id,
  robberHexId: findDesertHexId(tutorialHexes),
  turnPhase: "ACTION",
  gamePhase: "ACTIVE",
};

export default function TutorialPage() {
  const router = useRouter();
  const [isTutorialPopupVisible, setIsTutorialPopupVisible] = useState(true);

  const noop = () => {
    // Tutorial board is static in this mode.
  };

  const hexById = new Map(tutorialState.hexes.map((hex) => [hex.id, hex]));

  const renderedRoadSegments = useMemo(() => {
    return tutorialState.players.flatMap((player) => {
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
  }, [hexById]);

  return (
    <div className={styles.layout}>
    <div data-tutorial="board">
      <BoardColumn
        boardStatus="Tutorial mode enabled"
        state={tutorialState}
        ports={tutorialPorts}
        hexById={hexById}
        renderedRoadSegments={renderedRoadSegments}
        isRoadPlacementMode={false}
        isSettlementPlacementMode={false}
        isCityPlacementMode={false}
        isKnightPlacementMode={false}
        isSetupPhase={false}
        isMyTurn={true}
        isLegalRoadPlacement={() => false}
        isLegalSettlementPlacement={() => false}
        isLegalCityPlacement={() => false}
        handleRoadEdgeClick={noop}
        handleKnightHexClick={noop}
        handleSettlementCornerClick={noop}
        handleCityCornerClick={noop}
        handleBuyDevelopmentCard={noop}
        developmentCards={[]}
        isDevCardPlayMode={false}
        handleToggleDevCardPlayMode={noop}
        handlePlayDevelopmentCard={noop}
        handleRollDice={noop}
        diceWonResources={null}
        initialPlacementWonResources={null}
        handleBuildRoadAction={noop}
        handleBuildSettlementAction={noop}
        handleBuildCityAction={noop}
        handleEndTurn={noop}
        mustMoveRobberBeforeEndTurn={false}
        tutorialMode={true}
      />
      </div>

      <aside className={styles.rightPanel}>
        <section className={styles.sidebarCard} data-tutorial="players-panel">
          <h2 className={styles.panelTitle}>Players</h2>
          <ul className={styles.playerList}>
            <li className={`${styles.playerCard} ${styles.playerCardCurrent}`}>
              <div className={styles.playerHeader}>
                <div className={styles.playerName}>
                  <div className={styles.colorDot} style={{ backgroundColor: tutorialPlayer.color }} />
                  <span>{tutorialPlayer.name}</span>
                  <span className={styles.meBadge}>Me</span>
                  <span className={`${styles.statusBadge} ${styles.onlineBadge}`}>Online</span>
                </div>
                <span className={styles.playerVpBadge}>{tutorialPlayer.victoryPoints}</span>
              </div>

              <div className={styles.playerStatsGrid}>
                <div className={`${styles.playerStatCell} ${styles.totalResourceCell}`}>
                  <span className={styles.playerStatIcon}>📦</span>
                  <span className={styles.playerStatValue}>{Object.values(tutorialPlayer.resources).reduce((s, v) => s + v, 0)}</span>
                </div>
                <div className={`${styles.playerStatCell} ${styles.devCardCell}`}>
                  <span className={styles.playerStatIcon}>🎴</span>
                  <span className={styles.playerStatValue}>{tutorialPlayer.developmentCards.length}</span>
                </div>
                <div className={`${styles.playerStatCell} ${styles.knightCell}`}>
                  <span className={styles.playerStatIcon}>⚔️</span>
                  <span className={styles.playerStatValue}>{tutorialPlayer.knightsPlayed}</span>
                </div>
                <div className={`${styles.playerStatCell} ${styles.roadCell}`}>
                  <span className={styles.playerStatIcon}>🛤️</span>
                  <span className={styles.playerStatValue}>{tutorialPlayer.roadsOnEdges.length/2}</span>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <section className={styles.sidebarCard} data-tutorial="resources-panel">
          <h2 className={styles.panelTitle}>Resources</h2>
          <div className={styles.resourcePanelGrid}>
            <div className={styles.resourcePanelTile} style={{ backgroundColor: '#16a34a' }}>
              <span>🌲</span>
              <strong>{tutorialPlayer.resources.wood}</strong>
            </div>
            <div className={styles.resourcePanelTile} style={{ backgroundColor: '#dc2626' }}>
              <span>🧱</span>
              <strong>{tutorialPlayer.resources.brick}</strong>
            </div>
            <div className={styles.resourcePanelTile} style={{ backgroundColor: '#84cc16' }}>
              <span>🐑</span>
              <strong>{tutorialPlayer.resources.wool}</strong>
            </div>
            <div className={styles.resourcePanelTile} style={{ backgroundColor: '#eab308' }}>
              <span>🌾</span>
              <strong>{tutorialPlayer.resources.wheat}</strong>
            </div>
            <div className={styles.resourcePanelTile} style={{ backgroundColor: '#475569' }}>
              <span>⛰️</span>
              <strong>{tutorialPlayer.resources.ore}</strong>
            </div>
          </div>
          <div className={styles.currentPlayerLine}>
            Remaining: Roads {Math.max(0, 15 - tutorialPlayer.roadsOnEdges.length)} | Settlements {Math.max(0, 5 - tutorialPlayer.settlementsOnCorners.length)} | Cities {Math.max(0, 4 - tutorialPlayer.citiesOnCorners.length)}
          </div>
        </section>

        <section className={styles.sidebarCard} data-tutorial="bank-panel">
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
                <div className={styles.devCardValue}>14</div>
              </div>

              <div className={styles.bankResourceCell} style={{ backgroundColor: '#16a34a' }}>
                <span className={styles.bankResourceIcon}>🌲</span>
                <span className={styles.bankResourceValue}>19</span>
              </div>
              <div className={styles.bankResourceCell} style={{ backgroundColor: '#dc2626' }}>
                <span className={styles.bankResourceIcon}>🧱</span>
                <span className={styles.bankResourceValue}>19</span>
              </div>
              <div className={styles.bankResourceCell} style={{ backgroundColor: '#84cc16' }}>
                <span className={styles.bankResourceIcon}>🐑</span>
                <span className={styles.bankResourceValue}>19</span>
              </div>
              <div className={styles.bankResourceCell} style={{ backgroundColor: '#eab308' }}>
                <span className={styles.bankResourceIcon}>🌾</span>
                <span className={styles.bankResourceValue}>19</span>
              </div>
              <div className={styles.bankResourceCell} style={{ backgroundColor: '#475569' }}>
                <span className={styles.bankResourceIcon}>⛰️</span>
                <span className={styles.bankResourceValue}>19</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sidebarCard} data-tutorial="chat-panel">
          <button type="button" className={styles.tradeRequestButton} disabled data-tutorial="trade-button">
            Send Trade Request
          </button>
          <div className={styles.logBox}>
            <div className={styles.logEventEntry}>Tutorial mode enabled.</div>
            <div className={styles.logEventEntry}>Explore the board and learn the game mechanics.</div>
          </div>
          <div className={styles.chatRow}>
            <input type="text" className={styles.chatInput} placeholder="Type a message..." disabled />
            <button type="button" className={styles.chatSendButton} disabled aria-label="Send message">
              <Send size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push("/lobby")}
            className={styles.leaveButton}
            data-tutorial="exit-button"
          >
            <LogOut size={20} />
            Exit Tutorial
          </button>
        </section>
      </aside>

      {isTutorialPopupVisible ? (
        <TutorialOverlay
          onClose={() => setIsTutorialPopupVisible(false)}
        />
      ) : null}
    </div>
  );
}

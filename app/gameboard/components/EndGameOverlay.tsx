import { Fragment } from "react";
import styles from "@/styles/gameboard.module.css";
import { Player } from "../types";

interface PlayerGameStats {
	cardsPlayedCount: number;
	knightsPlayedCount: number;
	roadsBuiltCount: number;
	settlementsBuiltCount: number;
	citiesBuiltCount: number;
	buildingsBuiltCount: number;
}

interface EndGameOverlayProps {
	isVisible: boolean;
	winnerDisplayName: string;
	leaderboardPlayers: Player[];
	perPlayerGameStats: Map<number, PlayerGameStats>;
	gameSummaryStats: PlayerGameStats;
	onBackToMain: () => void;
}

const emptyStats: PlayerGameStats = {
	cardsPlayedCount: 0,
	knightsPlayedCount: 0,
	roadsBuiltCount: 0,
	settlementsBuiltCount: 0,
	citiesBuiltCount: 0,
	buildingsBuiltCount: 0,
};

export function EndGameOverlay({
	isVisible,
	winnerDisplayName,
	leaderboardPlayers,
	perPlayerGameStats,
	gameSummaryStats,
	onBackToMain,
}: EndGameOverlayProps) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className={styles.endGameOverlay}>
			<div className={styles.endGameCard}>
				<h1 className={styles.endGameTitle}>Game Finished</h1>
				<p className={styles.endGameWinnerLine}>
					Winner: <strong>{winnerDisplayName}</strong>
				</p>

				<div className={styles.endGameSection}>
					<h2 className={styles.endGameSectionTitle}>Leaderboard</h2>
					<div className={styles.endGameLeaderboardScroll}>
						<div className={styles.endGameLeaderboard}>
							<div className={styles.endGameLeaderboardHeader}>Rank</div>
							<div className={styles.endGameLeaderboardHeader}>Player</div>
							<div className={styles.endGameLeaderboardHeader}>VP</div>
							<div className={styles.endGameLeaderboardHeader}>Cards</div>
							<div className={styles.endGameLeaderboardHeader}>Knights</div>
							<div className={styles.endGameLeaderboardHeader}>Roads</div>
							<div className={styles.endGameLeaderboardHeader}>Settlements</div>
							<div className={styles.endGameLeaderboardHeader}>Cities</div>
							<div className={styles.endGameLeaderboardHeader}>Buildings</div>
							{leaderboardPlayers.map((player, index) => {
								const playerStats = perPlayerGameStats.get(player.id) ?? emptyStats;
								const rowClass = index % 2 === 1 ? styles.endGameLeaderboardCellAlt : "";

								return (
									<Fragment key={`leaderboard-row-${player.id}`}>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>#{index + 1}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{player.name}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{player.victoryPoints}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.cardsPlayedCount}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.knightsPlayedCount}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.roadsBuiltCount}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.settlementsBuiltCount}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.citiesBuiltCount}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>{playerStats.buildingsBuiltCount}</div>
									</Fragment>
								);
							})}
						</div>
					</div>
				</div>

				<div className={styles.endGameSection}>
					<h2 className={styles.endGameSectionTitle}>Game Stats</h2>
					<div className={styles.endGameStatsGrid}>
						<div className={styles.endGameStatItem}>
							<span>Cards Played</span>
							<strong>{gameSummaryStats.cardsPlayedCount}</strong>
						</div>
						<div className={styles.endGameStatItem}>
							<span>Knights Played</span>
							<strong>{gameSummaryStats.knightsPlayedCount}</strong>
						</div>
						<div className={styles.endGameStatItem}>
							<span>Buildings Built</span>
							<strong>{gameSummaryStats.buildingsBuiltCount}</strong>
						</div>
						<div className={styles.endGameStatItem}>
							<span>Roads</span>
							<strong>{gameSummaryStats.roadsBuiltCount}</strong>
						</div>
						<div className={styles.endGameStatItem}>
							<span>Settlements</span>
							<strong>{gameSummaryStats.settlementsBuiltCount}</strong>
						</div>
						<div className={styles.endGameStatItem}>
							<span>Cities</span>
							<strong>{gameSummaryStats.citiesBuiltCount}</strong>
						</div>
					</div>
				</div>

				<div className={styles.endGameActionsRow}>
					<button type="button" className={styles.endGameActionButton} onClick={onBackToMain}>
						Back to Main Screen
					</button>
				</div>
			</div>
		</div>
	);
}

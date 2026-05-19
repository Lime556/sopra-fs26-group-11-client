import { CSSProperties, Fragment } from "react";
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
	winnerDisplayName: string | null;
	leaderboardPlayers: Player[];
	perPlayerGameStats: Map<number, PlayerGameStats>;
	gameSummaryStats: PlayerGameStats;
	currentPlayerId: number | null;
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
	currentPlayerId,
	onBackToMain,
}: EndGameOverlayProps) {
	if (!isVisible) {
		return null;
	}

	const winnerPlayer = winnerDisplayName
		? leaderboardPlayers.find((player) => player.name === winnerDisplayName) ?? null
		: null;
	const currentPlayer = currentPlayerId !== null
		? leaderboardPlayers.find((player) => player.id === currentPlayerId) ?? null
		: null;
	const currentPlayerWon = Boolean(currentPlayer && winnerPlayer && currentPlayer.id === winnerPlayer.id);
	const currentPlayerLost = Boolean(currentPlayer && winnerPlayer && currentPlayer.id !== winnerPlayer.id);
	const resultTitle = currentPlayerWon
		? "You Won"
		: currentPlayerLost
			? "You Lost"
			: winnerPlayer
				? `${winnerPlayer.name} Won`
				: "Game Ended";
	const resultClassName = currentPlayerWon
		? styles.endGameResultWon
		: currentPlayerLost
			? styles.endGameResultLost
			: styles.endGameResultSpectator;

	return (
		<div className={styles.endGameOverlay}>
			<div className={styles.confettiLayer} aria-hidden="true">
				{Array.from({ length: 72 }, (_, index) => {
					const style = {
						"--confetti-x": `${(index * 17 + 5) % 100}`,
						"--confetti-duration": `${4.2 + (index % 11) * 0.23}s`,
						"--confetti-delay": `${-((index * 0.31) % 5.8)}s`,
						"--confetti-rotation": `${(index * 47) % 180}deg`,
					} as CSSProperties;

					return <span key={`confetti-${index}`} className={styles.confettiPiece} style={style} />;
				})}
			</div>
			<div className={styles.endGameCard}>
				<div className={`${styles.endGameResultBanner} ${resultClassName}`}>
					<div className={styles.endGameResultIcon} aria-hidden="true">
						{currentPlayerWon ? "🏆" : currentPlayerLost ? "💀" : "👑"}
					</div>
					<div>
						<h1 className={styles.endGameTitle}>{resultTitle}</h1>
						{winnerPlayer ? (
							<p className={styles.endGameWinnerLine}>
								{currentPlayerWon
									? "Victory is yours. The island belongs to you."
									: currentPlayerLost
										? `${winnerPlayer.name} reached victory first.`
										: `${winnerPlayer.name} won this match.`}
							</p>
						) : (
							<p className={styles.endGameWinnerLine}>No winner. All players left the game.</p>
						)}
					</div>
				</div>

				<div className={styles.endGameSection}>
					<h2 className={styles.endGameSectionTitle}>🏅 Leaderboard</h2>
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
								const isWinner = winnerPlayer?.id === player.id;
								const rowClass = [
									index % 2 === 1 ? styles.endGameLeaderboardCellAlt : "",
									isWinner ? styles.endGameLeaderboardCellWinner : "",
								].filter(Boolean).join(" ");

								return (
									<Fragment key={`leaderboard-row-${player.id}`}>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>#{index + 1}</div>
										<div className={`${styles.endGameLeaderboardCell} ${rowClass}`}>
											<span className={styles.endGamePlayerName}>{player.name}</span>
											{isWinner ? <span className={styles.endGameWinnerBadge}>Winner</span> : null}
										</div>
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
					<h2 className={styles.endGameSectionTitle}>📊 Game Stats</h2>
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

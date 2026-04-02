"use client";

import React from "react";
import styles from "@/styles/lobby.module.css";

interface GameHistoryItem {
  id: number;
  date: string;
  result: string;
  points: number;
}

interface HistoryTabData {
  gamesPlayed: number;
  wins: number;
  gameHistory: GameHistoryItem[];
}

interface HistoryTabProps {
  data: HistoryTabData;
}

export default function HistoryTab({ data }: HistoryTabProps) {
  const gamesPlayed = data.gamesPlayed;
  const wins = data.wins;
  const winRate =
    gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <h2 className={styles.sectionTitle}>Game History</h2>

      <div className={styles.profileCard}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{gamesPlayed}</p>
            <p className={styles.statLabel}>Games Played</p>
          </div>

          <div className={styles.statCard}>
            <p className={styles.statValueGreen}>{wins}</p>
            <p className={styles.statLabel}>Wins</p>
          </div>

          <div className={styles.statCard}>
            <p className={styles.statValueAmber}>{winRate}%</p>
            <p className={styles.statLabel}>Win Rate</p>
          </div>
        </div>
      </div>

      <div className={styles.listColumn}>
        {data.gameHistory.map((game) => (
          <div key={game.id} className={styles.historyCard}>
            <div>
              <p className={styles.historyTitle}>{game.result}</p>
              <p className={styles.historyDate}>{game.date}</p>
            </div>

            <div className={styles.historyPoints}>
              <p className={styles.historyPointsValue}>{game.points} VP</p>
              <p className={styles.historyPointsLabel}>Victory Points</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
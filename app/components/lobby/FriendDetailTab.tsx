"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import styles from "@/styles/lobby.module.css";

interface GameHistoryItem {
  id: number;
  date: string;
  result: string;
  points: number;
}

export interface Friend {
  id: number;
  name: string;
  userId: string;
  status: string;
  gamesPlayed: number;
  wins: number;
  gameHistory: GameHistoryItem[];
}

interface FriendDetailTabProps {
  friend: Friend;
  onBack: () => void;
}

export default function FriendDetailTab({
  friend,
  onBack,
}: FriendDetailTabProps) {
  const winRate =
    friend.gamesPlayed > 0
      ? ((friend.wins / friend.gamesPlayed) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={18} />
        Back to Friends
      </button>

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarLarge}>{friend.name[0]}</div>
          <div>
            <h2 className={styles.profileName}>{friend.name}</h2>
            <p className={styles.profileId}>{friend.userId}</p>
            <p className={styles.profileStatus}>{friend.status}</p>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{friend.gamesPlayed}</p>
            <p className={styles.statLabel}>Games Played</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValueGreen}>{friend.wins}</p>
            <p className={styles.statLabel}>Wins</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValueAmber}>{winRate}%</p>
            <p className={styles.statLabel}>Win Rate</p>
          </div>
        </div>
      </div>

      <h3 className={styles.subSectionTitle}>Game History</h3>
      <div className={styles.listColumn}>
        {friend.gameHistory.map((game) => (
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
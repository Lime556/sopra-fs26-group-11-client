"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "@/styles/lobby.module.css";
import { useApi } from "@/hooks/useApi";

interface UserProfile {
  id: number;
  username: string;
  userStatus: string;
  winRate: number;
}

interface GameHistoryEntry {
  gameId: number;
  startedAt: string;
  finishedAt: string | null;
  won: boolean;
  playerVictoryPoints: number;
  playerNames: string[];
}

interface UserProfileModalProps {
  open: boolean;
  userId: number;
  currentUserId: number;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function UserProfileModal({
  open,
  userId,
  currentUserId,
  onClose,
  onOpenSettings,
}: UserProfileModalProps) {
  const apiService = useApi();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setProfile(null);
    setHistory([]);

    Promise.all([
      apiService.get<UserProfile>(`/users/${userId}`),
      apiService.get<GameHistoryEntry[]>(`/users/${userId}/history`),
    ])
      .then(([profileData, historyData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setHistory(historyData.slice(0, 10));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message ?? "Failed to load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId, apiService]);

  if (!open) return null;

  const isOwnProfile = userId === currentUserId;
  const winRateDisplay = profile ? (profile.winRate * 100).toFixed(1) : "—";

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div
        className={styles.profileModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {profile ? profile.username : "Profile"}
          </h3>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {loading && (
          <p className={styles.modalText}>Loading profile…</p>
        )}

        {error && (
          <p className={styles.errorText}>{error}</p>
        )}

        {profile && !loading && (
          <>
            {/* Avatar + identity */}
            <div className={styles.profileHeader}>
              <div className={styles.avatarLarge}>
                {profile.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className={styles.profileName}>{profile.username}</h2>
                <p className={styles.profileStatus}>
                  {profile.userStatus?.toLowerCase() ?? "offline"}
                </p>
              </div>
            </div>

            {/* Win rate stat */}
            <div className={styles.statsGrid} style={{ gridTemplateColumns: "1fr" }}>
              <div className={styles.statCard}>
                <p className={styles.statValueAmber}>{winRateDisplay}%</p>
                <p className={styles.statLabel}>Win Rate</p>
              </div>
            </div>

            {/* Game history */}
            <h4 className={styles.subSectionTitle} style={{ marginTop: "20px" }}>
              Last 10 Games
            </h4>

            {history.length === 0 ? (
              <p className={styles.emptyState}>No games played yet.</p>
            ) : (
              <div className={styles.listColumn}>
                {history.map((game) => (
                  <div key={game.gameId} className={styles.historyCard}>
                    <div>
                      <p className={styles.historyTitle}>
                        {game.won ? "Victory" : "Defeat"}
                      </p>
                      <p className={styles.historyDate}>
                        {formatDate(game.finishedAt ?? game.startedAt)}
                      </p>
                      {game.playerNames?.length > 0 && (
                        <p className={styles.historyDate}>
                          vs. {game.playerNames.filter((n) => n !== profile.username).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className={styles.historyPoints}>
                      <p className={styles.historyPointsValue}>
                        {game.playerVictoryPoints} VP
                      </p>
                      <p className={styles.historyPointsLabel}>Victory Points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Own-profile password change note */}
            {isOwnProfile && (
              <div className={styles.formStack} style={{ marginTop: "16px" }}>
                <p className={styles.modalText}>
                  This is your profile. You can change your password in Settings.
                </p>
                <button
                  type="button"
                  className={styles.modalActionButton}
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                >
                  Open Settings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Plus, Play, Lock, Unlock, Users } from "lucide-react";
import styles from "@/styles/lobby.module.css";

export interface LobbyItem {
  id: number;
  name: string;
  host: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
}

interface LobbiesTabProps {
  lobbies: LobbyItem[];
  onCreateLobby: () => void;
  onJoinLobby: (lobby: LobbyItem) => void;
}

export default function LobbiesTab({
  lobbies,
  onCreateLobby,
  onJoinLobby,
}: LobbiesTabProps) {
  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Available Lobbies</h2>
        <button className={styles.primaryButton} onClick={onCreateLobby}>
          <Plus size={20} />
          Create Lobby
        </button>
      </div>

      <div className={styles.lobbyGrid}>
        {lobbies.map((lobby) => (
          <div key={lobby.id} className={styles.lobbyCard}>
            <div className={styles.lobbyTitleRow}>
              <h3 className={styles.lobbyTitle}>{lobby.name}</h3>
              {lobby.isPrivate ? (
                <Lock size={18} color="#98A2B3" />
              ) : (
                <Unlock size={18} color="#22c55e" />
              )}
            </div>

            <p className={styles.hostText}>Host: {lobby.host}</p>

            <div className={styles.lobbyFooter}>
              <div className={styles.playersText}>
                <Users size={18} />
                <span>
                  {lobby.players}/{lobby.maxPlayers} Players
                </span>
              </div>

              <button
                onClick={() => onJoinLobby(lobby)}
                className={styles.joinButton}
              >
                <Play size={18} />
                Join
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
"use client";

import React from "react";
import { Plus, Play, Lock, Unlock, Users, Search } from "lucide-react";
import styles from "@/styles/lobby.module.css";

export interface LobbyItem {
  id: number;
  name: string;
  capacity: number;
  currentPlayers: number;
  privateLobby: boolean;
}

interface LobbiesTabProps {
  lobbies: LobbyItem[];
  showLobbySearch: boolean;
  searchLobbyQuery: string;
  searchLobbyResult: LobbyItem | null;
  searchLobbyError: string;
  onCreateLobby: () => void;
  onToggleLobbySearch: () => void;
  onSearchLobbyQueryChange: (value: string) => void;
  onSearchLobby: () => void;
  onJoinLobby: (lobby: LobbyItem) => void;
}

export default function LobbiesTab({
  lobbies,
  showLobbySearch,
  searchLobbyQuery,
  searchLobbyResult,
  searchLobbyError,
  onCreateLobby,
  onToggleLobbySearch,
  onSearchLobbyQueryChange,
  onSearchLobby,
  onJoinLobby,
}: LobbiesTabProps) {
  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Available Lobbies</h2>
        <div className={styles.headerActions}>
          <button
            onClick={onToggleLobbySearch}
            className={`${styles.secondaryButton} ${styles.badgeButton}`}
          >
            <Search size={18} />
            Find Lobby
          </button>

          <button className={styles.primaryButton} onClick={onCreateLobby}>
            <Plus size={20} />
            Create Lobby
          </button>
        </div>
      </div>

      {showLobbySearch && (
        <div className={styles.panelBox}>
          <div className={styles.searchRow}>
            <Search size={18} />
            <input
              type="text"
              value={searchLobbyQuery}
              onChange={(e) => onSearchLobbyQueryChange(e.target.value)}
              placeholder="Search by Lobby ID (e.g. 42)"
              className={styles.input}
            />
            <button onClick={onSearchLobby} className={styles.primaryButton}>
              Search
            </button>
          </div>
          {searchLobbyError ? (
            <p className={styles.errorText}>{searchLobbyError}</p>
          ) : null}
          {searchLobbyResult ? (
            <div className={styles.listColumn}>
              <p className={styles.panelTitle}>Search Results</p>
              <div className={styles.resultRow}>
                <div className={styles.resultInfo}>
                  <div className={styles.avatarSmall}>{searchLobbyResult.name[0]}</div>
                  <div>
                    <p className={styles.resultName}>{searchLobbyResult.name}</p>
                    <p className={styles.resultMeta}>ID: {searchLobbyResult.id}</p>
                    <p className={styles.resultMeta}>
                      {searchLobbyResult.currentPlayers}/{searchLobbyResult.capacity} players
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onJoinLobby(searchLobbyResult)}
                  className={styles.successButton}
                >
                  <Play size={14} />
                  Join
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.lobbyGrid}>
        {lobbies.map((lobby) => (
          <div key={lobby.id} className={styles.lobbyCard}>
            <div className={styles.lobbyTitleRow}>
              <h3 className={styles.lobbyTitle}>{lobby.name}</h3>
              {lobby.privateLobby ? (
                <Lock size={18} color="#98A2B3" />
              ) : (
                <Unlock size={18} color="#22c55e" />
              )}
            </div>

            <p className={styles.hostText}>ID: {lobby.id}</p>

            <div className={styles.lobbyFooter}>
              <div className={styles.playersText}>
                <Users size={18} />
                <span>
                  {lobby.currentPlayers}/{lobby.capacity} Players
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

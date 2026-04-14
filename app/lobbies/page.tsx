"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import {
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  HistoryOutlined,
  LogoutOutlined,
  PlusOutlined,
  LoginOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import styles from "@/styles/lobbies.module.css";

interface LobbyGetDTO {
  id: number;
  name: string;
  capacity: number;
  currentPlayers: number;
  playerIds: number[];
  privateLobby: boolean;
}

export default function Lobbies() {
  const router = useRouter();
  const apiService = useApi();

  const { value: token, clear: clearToken } = useLocalStorage<string>("token", "");
  const { clear: clearUserId } = useLocalStorage<string>("userId", "");
  const { value: username } = useLocalStorage<string>("username", "");

  const [lobbies, setLobbies] = useState<LobbyGetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  const loadLobbies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.get<LobbyGetDTO[]>("/lobbies");
      setLobbies(data);
    } catch {
      setError("Failed to load lobbies. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    void loadLobbies();
  }, [loadLobbies]);

  const handleLogout = () => {
    clearToken();
    clearUserId();
    router.push("/login");
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>Settlers of Catan</h1>
          <p className={styles.headerWelcome}>Welcome, {username || "Player"}!</p>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <LogoutOutlined />
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className={styles.main}>
        {/* Sidebar navigation */}
        <aside className={styles.sidebar}>
          <button className={`${styles.navButton} ${styles.navButtonActive}`}>
            <TeamOutlined />
            Lobbies
          </button>
          <button className={styles.navButton}>
            <UserOutlined />
            Friends
          </button>
          <button className={styles.navButton}>
            <SettingOutlined />
            Settings
          </button>
          <button className={styles.navButton}>
            <HistoryOutlined />
            Game History
          </button>
        </aside>

        {/* Lobby list panel */}
        <section className={styles.content}>
          <div className={styles.contentHeader}>
            <h2 className={styles.contentTitle}>Available Lobbies</h2>
            <button className={styles.createButton}>
              <PlusOutlined />
              Create Lobby
            </button>
          </div>

          {loading && <p className={styles.statusText}>Loading lobbies...</p>}
          {error && <p className={styles.errorText}>{error}</p>}
          {!loading && !error && lobbies.length === 0 && (
            <p className={styles.statusText}>No open lobbies yet. Create one!</p>
          )}

          {!loading && !error && lobbies.length > 0 && (
            <div className={styles.lobbyGrid}>
              {lobbies.map((lobby) => {
                const isFull = lobby.currentPlayers >= lobby.capacity;
                return (
                  <div
                    key={lobby.id}
                    className={`${styles.lobbyCard} ${isFull ? styles.lobbyCardFull : ""}`}
                  >
                    {/* Card top: name, privacy icon, host */}
                    <div className={styles.lobbyCardTop}>
                      <div className={styles.lobbyNameRow}>
                        <span className={styles.lobbyName}>{lobby.name}</span>
                        {lobby.privateLobby ? (
                          <LockOutlined className={styles.lockIconClosed} />
                        ) : (
                          <UnlockOutlined className={styles.lockIconOpen} />
                        )}
                      </div>
                      <span className={styles.lobbyHost}>
                        Host: Player #{lobby.playerIds?.[0] ?? "—"}
                      </span>
                    </div>

                    {/* Card bottom: player count + join button */}
                    <div className={styles.lobbyCardBottom}>
                      <div className={styles.playerCount}>
                        <TeamOutlined className={styles.playerCountIcon} />
                        <span>
                          {lobby.currentPlayers}/{lobby.capacity} Players
                        </span>
                      </div>
                      <button
                        className={`${styles.joinButton} ${isFull ? styles.joinButtonFull : ""}`}
                        disabled={isFull}
                        onClick={() => {}}
                      >
                        <LoginOutlined />
                        {isFull ? "Full" : "Join"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

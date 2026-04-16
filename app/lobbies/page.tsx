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
import { Input, Modal } from "antd";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getApiDomain } from "@/utils/domain";
import { ApplicationError } from "@/types/error";
import styles from "@/styles/lobbies.module.css";

interface LobbyGetDTO {
  id: number;
  name: string;
  capacity: number;
  currentPlayers: number;
  playerIds: number[];
  privateLobby: boolean;
}

interface LobbyJoinDTO {
  lobbyId: number;
  password?: string;
}

export default function Lobbies() {
  const router = useRouter();
  const apiService = useApi();

  const { value: token, clear: clearToken } = useLocalStorage<string>("token", "", { storage: "session" });
  const { clear: clearUserId } = useLocalStorage<string>("userId", "", { storage: "session" });
  const { value: username } = useLocalStorage<string>("username", "", { storage: "session" });

  const [lobbies, setLobbies] = useState<LobbyGetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joiningLobbyId, setJoiningLobbyId] = useState<number | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState<LobbyGetDTO | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!token) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${getApiDomain()}/ws`),
      onConnect: () => {
        client.subscribe("/topic/lobbies", (msg) => {
          const updated: LobbyGetDTO = JSON.parse(msg.body) as LobbyGetDTO;
          setLobbies((prev) =>
            prev.some((l) => l.id === updated.id)
              ? prev.map((l) => (l.id === updated.id ? updated : l))
              : [...prev, updated]
          );
        });
      },
    });
    client.activate();
    return () => { void client.deactivate(); };
  }, [token]);

  const handleLogout = () => {
    clearToken();
    clearUserId();
    router.push("/login");
  };

  const mapJoinErrorMessage = (joinError: unknown): string => {
    if (!(joinError instanceof Error)) {
      return "Joining the lobby failed. Please try again.";
    }

    const appError = joinError as ApplicationError;
    if (appError.status === 401) {
      clearToken();
      clearUserId();
      router.push("/login");
      return "Your session expired. Please log in again.";
    }
    if (appError.status === 403) {
      return "Incorrect lobby password.";
    }
    if (appError.status === 404) {
      return "This lobby no longer exists.";
    }
    if (appError.status === 409) {
      if (joinError.message.toLowerCase().includes("already")) {
        return "You are already in this lobby.";
      }
      return "This lobby is full.";
    }

    return "Joining the lobby failed. Please try again.";
  };

  const joinLobby = async (lobbyId: number, lobbyPassword?: string) => {
    setJoiningLobbyId(lobbyId);
    setJoinMessage(null);
    setError(null);

    try {
      const payload: LobbyJoinDTO = {
        lobbyId,
        ...(lobbyPassword ? { password: lobbyPassword } : {}),
      };

      await apiService.post<LobbyGetDTO>(`/lobbies/${lobbyId}/join`, payload);
      setJoinMessage("Successfully joined lobby.");
      await loadLobbies();
      router.push(`/lobby/${lobbyId}`);
      return true;
    } catch (joinError: unknown) {
      setJoinMessage(mapJoinErrorMessage(joinError));
      await loadLobbies();
      return false;
    } finally {
      setJoiningLobbyId(null);
    }
  };

  const handleJoinClick = (lobby: LobbyGetDTO) => {
    if (lobby.privateLobby) {
      setSelectedLobby(lobby);
      setPassword("");
      setPasswordError(null);
      setShowPasswordModal(true);
      return;
    }

    void joinLobby(lobby.id);
  };

  const handlePrivateJoinConfirm = async () => {
    if (!selectedLobby) {
      return;
    }
    if (!password.trim()) {
      setPasswordError("Please enter the lobby password.");
      return;
    }

    const success = await joinLobby(selectedLobby.id, password.trim());
    if (success) {
      setShowPasswordModal(false);
      setSelectedLobby(null);
      setPassword("");
      setPasswordError(null);
      return;
    }

    setPasswordError("Incorrect lobby password.");
  };

  const handlePrivateJoinCancel = () => {
    setShowPasswordModal(false);
    setSelectedLobby(null);
    setPassword("");
    setPasswordError(null);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
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
            <button className={styles.createButton} onClick={() => router.push("/lobby")}>
              <PlusOutlined />
              Create Lobby
            </button>
          </div>

          {loading && <p className={styles.statusText}>Loading lobbies...</p>}
          {error && <p className={styles.errorText}>{error}</p>}
          {joinMessage && <p className={styles.statusText}>{joinMessage}</p>}
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
                        disabled={isFull || joiningLobbyId === lobby.id}
                        onClick={() => handleJoinClick(lobby)}
                      >
                        <LoginOutlined />
                        {isFull ? "Full" : joiningLobbyId === lobby.id ? "Joining..." : "Join"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Modal
            title={selectedLobby ? `Join ${selectedLobby.name}` : "Join Lobby"}
            open={showPasswordModal}
            onOk={() => void handlePrivateJoinConfirm()}
            onCancel={handlePrivateJoinCancel}
            okText="Join"
            confirmLoading={selectedLobby !== null && joiningLobbyId === selectedLobby.id}
          >
            <Input.Password
              placeholder="Enter lobby password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(null);
              }}
            />
            {passwordError && <p className={styles.errorText}>{passwordError}</p>}
          </Modal>
        </section>
      </div>
    </div>
  );
}

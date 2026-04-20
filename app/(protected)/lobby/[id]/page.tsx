"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LogOut, Users, Bot, Crown, Play, UserMinus } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";

import styles from "@/styles/lobbyRoom.module.css";

interface LobbyParticipantGetDTO {
  id: number;
  userId: number | null;
  username: string;
  bot: boolean;
}

interface LobbyGetDTO {
  id: number;
  name: string;
  capacity: number;
  currentParticipants: number;
  participants: LobbyParticipantGetDTO[];
  hostParticipantId: number | null;
  gameId?: number | null;
  privateLobby: boolean;
}

interface GameStartGetDTO {
  gameId: number;
}

export default function LobbyRoom() {
  const router = useRouter();
  const params = useParams();
  const lobbyId = params.id as string;

  const apiService = useApi();
  const { value: userId } = useLocalStorage<string>("userId", "", { storage: "session" });
  const [lobby, setLobby] = useState<LobbyGetDTO | null>(null);
  const [error, setError] = useState("");
  const [startInfo, setStartInfo] = useState("");
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [kickingParticipantId, setKickingParticipantId] = useState<number | null>(null);
  const [transferringParticipantId, setTransferringParticipantId] = useState<number | null>(null);
  const [hostTransferMessage, setHostTransferMessage] = useState("");
  const currentUserId = userId ? Number(userId) : null;

  // Load lobby details on component mount
  useEffect(() => {
    const loadLobby = async () => {
      try {
        const data = await apiService.get<LobbyGetDTO>(`/lobbies/${lobbyId}`);
        setLobby(data);
      } catch (err) {
        setError("Failed to load lobby.");
        console.error(err);
      }
    };

    if (lobbyId) {
      void loadLobby();
    }
  }, [apiService, lobbyId]);

  // Polling for lobby updates every 2 seconds
  useEffect(() => {
    if (!lobbyId) return;

    const interval = setInterval(async () => {
      try {
        const updatedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobbyId}`);
        if (currentUserId !== null) {
          const stillInLobby = updatedLobby.participants.some((p) => p.userId === currentUserId);
          if (!stillInLobby) {
            router.push("/lobby?kicked=1");
            return;
          }
        }

        if (lobby && lobby.hostParticipantId !== updatedLobby.hostParticipantId) {
          const newHost = updatedLobby.participants.find(
            (p) => p.id === updatedLobby.hostParticipantId,
          );
          if (newHost) {
            setHostTransferMessage(`Host role was transferred to ${newHost.username}.`);
          } else {
            setHostTransferMessage("Host role was transferred.");
          }
        }
        setLobby(updatedLobby);

        if (updatedLobby.gameId) {
          router.push(`/gameboard?gameId=${updatedLobby.gameId}`);
        }
      } catch (err) {
        const status = err instanceof Error ? (err as { status?: number }).status : undefined;
        if (status === 403 || status === 404) {
          router.push("/lobby?kicked=1");
          return;
        }
        console.error("Failed to refresh lobby.", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [apiService, currentUserId, lobby, lobbyId, router]);

  useEffect(() => {
    if (!hostTransferMessage) return;
    const timeout = setTimeout(() => setHostTransferMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [hostTransferMessage]);

  const currentParticipants = lobby?.currentParticipants ?? 0;
  const maxPlayers = lobby?.capacity ?? 4;
  const canAddBot = (lobby?.currentParticipants ?? 0) < maxPlayers;

  // determining current user/host
  const currentParticipant = lobby?.participants.find((p) => p.userId === currentUserId);
  const isHost =
    lobby !== null &&
    currentParticipant !== undefined &&
    currentParticipant.id === lobby.hostParticipantId;

  const startGame = async () => {
    if (!lobby) return;
    setStartInfo("");
    if (currentParticipants < 2) {
      alert("At least 2 players are required to start the game.");
      return;
    }

    try {
      setStarting(true);
      const response = await apiService.post<GameStartGetDTO>(`/lobbies/${lobby.id}/start`, {});
      router.push(`/gameboard?gameId=${response.gameId}`);
    } catch (err) {
      const status = err instanceof Error ? (err as { status?: number }).status : undefined;

      if (status === 403) {
        try {
          const refreshedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobby.id}`);
          setLobby(refreshedLobby);
          if (refreshedLobby.gameId) {
            router.push(`/gameboard?gameId=${refreshedLobby.gameId}`);
            return;
          }
        } catch {
          // Ignore refresh failures here and show a user-facing hint below.
        }

        setStartInfo("Only the host can start the game.");
        return;
      }

      if (status === 409) {
        try {
          const refreshedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobby.id}`);
          if (refreshedLobby.gameId) {
            router.push(`/gameboard?gameId=${refreshedLobby.gameId}`);
            return;
          }
        } catch (refreshError) {
          console.error(refreshError);
        }
      }

      setError("Failed to start the game.");
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const leaveLobby = async () => {
    if (!lobby) return;
    try {
      setLeaving(true);
      await apiService.post(`/lobbies/${lobby.id}/leave`, null);
      router.push("/lobby");
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to leave lobby. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const kickParticipant = async (targetUserId: number) => {
    if (!lobby || !isHost) return;

    try {
      const targetParticipant = lobby.participants.find((p) => p.userId === targetUserId);
      setKickingParticipantId(targetParticipant?.id ?? null);
      setStartInfo("");
      await apiService.post(`/lobbies/${lobby.id}/kick`, { userId: targetUserId });
      const refreshedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobby.id}`);
      setLobby(refreshedLobby);
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to remove participant.");
    } finally {
      setKickingParticipantId(null);
    }
  };

  const transferHost = async (targetUserId: number) => {
    if (!lobby || !isHost) return;

    try {
      const targetParticipant = lobby.participants.find((p) => p.userId === targetUserId);
      setTransferringParticipantId(targetParticipant?.id ?? null);
      setStartInfo("");
      await apiService.post(`/lobbies/${lobby.id}/host-transfer`, {
        userId: targetUserId,
      });
      const refreshedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobby.id}`);
      setLobby(refreshedLobby);
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to transfer host.");
    } finally {
      setTransferringParticipantId(null);
    }
  };

  if (error) {
    return <div className={styles.stateMessage}>{error}</div>;
  }

  if (!lobby) {
    return <div className={styles.stateMessage}>Loading lobby...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundOverlay} />
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <button
            onClick={() => void leaveLobby()}
            className={styles.backButton}
            disabled={leaving}
          >
            <LogOut className={`${styles.leaveIcon} w-5 h-5`} />
            {leaving ? "Leaving..." : "Leave Lobby"}
          </button>
          <h1 className={styles.headerTitle}>{lobby.name}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        <div className={styles.card}>
          <div className={styles.topRow}>
            <div className={styles.titleGroup}>
              <Users className="w-8 h-8 text-white" />
              <h2 className={styles.title}>
                Lobby ({currentParticipants}/{maxPlayers})
              </h2>
            </div>

            <button
              onClick={() => alert("Add Bot functionality not implemented yet.")}
              disabled={!canAddBot}
              className={`${styles.addBotButton} ${
                canAddBot ? styles.addBotButtonEnabled : styles.addBotButtonDisabled
              }`}
            >
              <Bot className="w-5 h-5" />
              Add Bot
            </button>
          </div>
          {hostTransferMessage && (
            <p className={styles.transferBanner}>{hostTransferMessage}</p>
          )}

          <div className={styles.participantList}>
            {lobby.participants.map((participant) => {
              const participantIsHost = participant.id === lobby.hostParticipantId;
              const canKick =
                isHost &&
                participant.userId !== null &&
                !participantIsHost &&
                participant.id !== currentParticipant?.id;
              const canTransferHost =
                isHost &&
                participant.userId !== null &&
                !participantIsHost &&
                participant.id !== currentParticipant?.id;

              return (
                <div key={participant.id} className={styles.participantCard}>
                  <div className={styles.participantInfo}>
                    <div className={styles.avatar}>
                      {participant.bot ? <Bot className="w-6 h-6" /> : participant.username[0]}
                    </div>

                    <div className={styles.participantText}>
                      <div className={styles.nameRow}>
                        <p className={styles.participantName}>{participant.username}</p>
                        {participantIsHost && (
                          <span className={styles.hostBadge}>
                            <Crown className="w-4 h-4 text-yellow-600" />
                            Host
                          </span>
                        )}
                      </div>

                      <p className={styles.participantRole}>
                        {participant.bot ? "AI Player" : "Human Player"}
                      </p>
                    </div>
                  </div>

                  {(canKick || canTransferHost) && (
                    <div className={styles.participantActions}>
                      {canTransferHost && (
                        <button
                          className={styles.transferButton}
                          onClick={() => void transferHost(participant.userId as number)}
                          disabled={transferringParticipantId === participant.id}
                        >
                          <Crown className="w-4 h-4" />
                          {transferringParticipantId === participant.id ? "Transferring..." : "Make Host"}
                        </button>
                      )}
                      {canKick && (
                        <button
                          className={styles.kickButton}
                          onClick={() => void kickParticipant(participant.userId as number)}
                          disabled={kickingParticipantId === participant.id}
                        >
                          <UserMinus className="w-4 h-4" />
                          {kickingParticipantId === participant.id ? "Removing..." : "Kick"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty slots */}
            {Array.from({ length: maxPlayers - currentParticipants }).map((_, index) => (
              <div key={`empty-${index}`} className={styles.emptySlot}>
                <p className={styles.emptySlotText}>Waiting for player...</p>
              </div>
            ))}
          </div>

          {isHost && (
            <div className={styles.startSection}>
              <button
                onClick={startGame}
                disabled={starting || currentParticipants < 2}
                className={`${styles.startButton} ${
                  starting || currentParticipants < 2
                    ? styles.startButtonDisabled
                    : styles.startButtonEnabled
                }`}
              >
                <Play className="w-6 h-6" />
                {starting ? "Starting..." : "Start Game"}
              </button>
            </div>
          )}

          {!isHost && (
            <p className={styles.waitingText}>
              Waiting for host to start the game...
            </p>
          )}

          {startInfo && <p className={styles.waitingText}>{startInfo}</p>}
        </div>
      </div>
    </div>
  );
}

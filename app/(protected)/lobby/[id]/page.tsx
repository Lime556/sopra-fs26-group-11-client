"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Users, Bot, Crown, Play } from "lucide-react";
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
  const { value: userId } = useLocalStorage<string>("userId", "");
  const [lobby, setLobby] = useState<LobbyGetDTO | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

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
  
  // Polling for lobby updates every 1.5 seconds
  useEffect(() => {
    if (!lobbyId) return;

    const interval = setInterval(async () => {
      try {
        const updatedLobby = await apiService.get<LobbyGetDTO>(`/lobbies/${lobbyId}`);
        setLobby(updatedLobby);

        if (updatedLobby.gameId) {
          router.push(`/game/${updatedLobby.gameId}`);
        }
      } catch (err) {
        console.error("Failed to refresh lobby.", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [apiService, lobbyId, router]);

  const currentParticipants = lobby?.currentParticipants ?? 0;
  const maxPlayers = lobby?.capacity ?? 4;
  const canAddBot = (lobby?.currentParticipants ?? 0) < maxPlayers;

  // determining current user/host
  const currentUserId = userId ? Number(userId) : null;
  const currentParticipant = lobby?.participants.find((p) => p.userId === currentUserId);
  const isHost = 
    lobby !== null && 
    currentParticipant !== undefined &&
    currentParticipant.id === lobby.hostParticipantId;

  const startGame = async () => {
    if (!lobby) return;
    if (currentParticipants < 2) {
      alert("At least 2 players are required to start the game.");
      return;
    }

    try {
      setStarting(true);
      const response = await apiService.post<GameStartGetDTO>(`/lobbies/${lobby.id}/start`, {});
      router.push(`/game/${response.gameId}`);
    } catch (err) {
      setError("Failed to start the game.");
      console.error(err);
    } finally {
      setStarting(false);
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
            onClick={() => router.push("/lobby")}
            className={styles.backButton}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Lobbies
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

          <div className={styles.participantList}>
            {lobby?.participants.map((participant) => {
              const participantIsHost = participant.id === lobby.hostParticipantId;
              
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
        </div>
      </div>
    </div>
  );
}

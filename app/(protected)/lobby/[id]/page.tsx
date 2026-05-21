"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { LogOut, Users, Bot, Crown, Play, UserMinus, UserPlus, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import UserProfileModal from "@/components/lobby/UserProfileModal";

import styles from "@/styles/lobbyRoom.module.css";

interface LobbyParticipantGetDTO {
  id: number;
  userId: number | null;
  username: string;
  bot: boolean;
  online?: boolean;
  lastSeenAt?: string | null;
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

interface FriendGetDTO {
  id: number;
  username: string;
  userStatus?: string;
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
  const [closing, setClosing] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [kickingParticipantId, setKickingParticipantId] = useState<number | null>(null);
  const [transferringParticipantId, setTransferringParticipantId] = useState<number | null>(null);
  const [hostTransferMessage, setHostTransferMessage] = useState("");
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number>(0);
  const [friends, setFriends] = useState<FriendGetDTO[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState<number[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const currentUserId = userId ? Number(userId) : null;
  const isLeavingLobbyRef = useRef(false);

  const handleOpenProfile = (targetUserId: number | null) => {
    if (!targetUserId) {
      return;
    }

    setSelectedProfileUserId(targetUserId);
    setShowUserProfileModal(true);
  };

  const redirectWithFlash = useCallback((reason: "left" | "kicked" | "closed") => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lobbyFlashMessage", reason);
    }
    router.push("/lobby");
  }, [router]);

  // Load lobby details on component mount
  useEffect(() => {
    const loadLobby = async () => {
      try {
        const data = await apiService.post<LobbyGetDTO>(`/lobbies/${lobbyId}/heartbeat`, {});
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
        const updatedLobby = await apiService.post<LobbyGetDTO>(`/lobbies/${lobbyId}/heartbeat`, {});
        if (currentUserId !== null) {
          const stillInLobby = updatedLobby.participants.some((p) => p.userId === currentUserId);
          if (!stillInLobby) {
            if (isLeavingLobbyRef.current) {
              redirectWithFlash("left");
              return;
            }
            redirectWithFlash("kicked");
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
        if (status === 404) {
          redirectWithFlash("closed");
          return;
        }
        if (status === 403) {
          redirectWithFlash("kicked");
          return;
        }
        console.error("Failed to refresh lobby.", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [apiService, currentUserId, lobby, lobbyId, router, redirectWithFlash]);

  useEffect(() => {
    if (!hostTransferMessage) return;
    const timeout = setTimeout(() => setHostTransferMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [hostTransferMessage]);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const friendsData = await apiService.get<FriendGetDTO[]>("/friends");
        setFriends(friendsData);
      } catch (err) {
        console.error("Failed to load friends.", err);
      }
    };

    void loadFriends();

    const interval = setInterval(() => {
      void loadFriends();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [apiService]);

  const currentParticipants = lobby?.currentParticipants ?? 0;
  const maxPlayers = lobby?.capacity ?? 4;
  const sortedParticipants = lobby
    ? [...lobby.participants].sort((a, b) => {
        const aIsHost = a.id === lobby.hostParticipantId;
        const bIsHost = b.id === lobby.hostParticipantId;
        if (aIsHost !== bIsHost) return aIsHost ? -1 : 1;

        if (a.bot !== b.bot) return a.bot ? 1 : -1;

        const nameCompare = a.username.localeCompare(b.username);
        if (nameCompare !== 0) return nameCompare;

        return a.id - b.id;
      })
    : [];

  // determining current user/host
  const currentParticipant = lobby?.participants.find((p) => p.userId === currentUserId);
  const isHost =
    lobby !== null &&
    currentParticipant !== undefined &&
    currentParticipant.id === lobby.hostParticipantId;
  const canAddBot = isHost && currentParticipants < maxPlayers;
  const invitedOrInLobbyIds = new Set(
    (lobby?.participants ?? [])
      .filter((participant) => participant.userId !== null)
      .map((participant) => participant.userId as number)
  );
  const invitableFriends = friends.filter((friend) => !invitedOrInLobbyIds.has(friend.id));

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
      isLeavingLobbyRef.current = true;
      await apiService.post(`/lobbies/${lobby.id}/leave`, null);
      redirectWithFlash("left");
    } catch (err) {
      isLeavingLobbyRef.current = false;
      const status = err instanceof Error ? (err as { status?: number }).status : undefined;
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

      console.error(err);
      setStartInfo("Failed to leave lobby. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const closeLobby = async () => {
    if (!lobby || !isHost) return;
    try {
      setClosing(true);
      await apiService.post(`/lobbies/${lobby.id}/close`, null);
      redirectWithFlash("closed");
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to close lobby. Please try again.");
    } finally {
      setClosing(false);
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

  const addBot = async () => {
    if (!lobby || !isHost || !canAddBot) return;

    try {
      setAddingBot(true);
      setStartInfo("");
      const refreshedLobby = await apiService.post<LobbyGetDTO>(`/lobbies/${lobby.id}/bots`, {});
      setLobby(refreshedLobby);
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to add bot.");
    } finally {
      setAddingBot(false);
    }
  };

  const removeBot = async (participantId: number) => {
    if (!lobby || !isHost) return;

    try {
      setKickingParticipantId(participantId);
      setStartInfo("");
      const refreshedLobby = await apiService.post<LobbyGetDTO>(`/lobbies/${lobby.id}/bots/${participantId}/remove`, {});
      setLobby(refreshedLobby);
    } catch (err) {
      console.error(err);
      setStartInfo("Failed to remove bot.");
    } finally {
      setKickingParticipantId(null);
    }
  };

  const handleToggleInviteSelection = (friendId: number) => {
    setSelectedInviteUserIds((previousIds) => {
      if (previousIds.includes(friendId)) {
        return previousIds.filter((id) => id !== friendId);
      }
      return [...previousIds, friendId];
    });
  };

  const handleOpenInviteModal = () => {
    setSelectedInviteUserIds([]);
    setShowInviteModal(true);
  };

  const handleCloseInviteModal = () => {
    if (sendingInvites) {
      return;
    }
    setShowInviteModal(false);
    setSelectedInviteUserIds([]);
  };

  const handleSendInvites = async () => {
    if (!lobby || selectedInviteUserIds.length === 0) {
      return;
    }

    try {
      setSendingInvites(true);
      setStartInfo("");

      const inviteCalls = selectedInviteUserIds.map((receiverId) =>
        apiService.post(`/lobbies/${lobby.id}/invites`, { receiverId })
      );

      await Promise.all(inviteCalls);
      setStartInfo("Lobby invitations sent.");
      setShowInviteModal(false);
      setSelectedInviteUserIds([]);
    } catch (err) {
      if (err instanceof Error) {
        setStartInfo(err.message);
      } else {
        setStartInfo("Failed to send one or more invitations.");
      }
    } finally {
      setSendingInvites(false);
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
          <div className={styles.headerSpacer} />
          <h1 className={styles.headerTitle}>{lobby.name}</h1>
          <div className={styles.headerSpacer2}/>
          <h1 className={styles.title}>ID: {lobby.id}</h1>
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

            <div className={styles.topActions}>
              <button
                type="button"
                onClick={handleOpenInviteModal}
                className={styles.inviteFriendsButton}
                disabled={invitableFriends.length === 0}
              >
                <UserPlus className="w-5 h-5" />
                Invite Friends
              </button>
              {isHost && (
                <button
                  onClick={() => void closeLobby()}
                  disabled={closing}
                  className={styles.closeLobbyButton}
                >
                  {closing ? "Closing..." : "Close Lobby"}
                </button>
              )}
              <button
                onClick={() => void addBot()}
                disabled={!canAddBot || addingBot}
                className={`${styles.addBotButton} ${
                  canAddBot && !addingBot ? styles.addBotButtonEnabled : styles.addBotButtonDisabled
                }`}
              >
                <Bot className="w-5 h-5" />
                {addingBot ? "Adding..." : "Add Bot"}
              </button>
            </div>
          </div>
          {hostTransferMessage && (
            <p className={styles.transferBanner}>{hostTransferMessage}</p>
          )}

          <div className={styles.participantList}>
            {sortedParticipants.map((participant) => {
              const participantIsHost = participant.id === lobby.hostParticipantId;
              const participantIsMe = participant.userId !== null && participant.userId === currentUserId;
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
              const canRemoveBot = isHost && participant.bot;

              return (
                <div key={participant.id} className={styles.participantCard}>
                  <div className={styles.participantInfo}>
                    <div className={styles.avatar}>
                      {participant.bot ? <Bot className="w-6 h-6" /> : participant.username[0]}
                    </div>

                    <div className={styles.participantText}>
                      <div className={styles.nameRow}>
                        {participant.bot || participant.userId === null ? (
                          <p className={styles.participantName}>{participant.username}</p>
                        ) : (
                          <button
                            type="button"
                            className={styles.participantNameButton}
                            onClick={() => handleOpenProfile(participant.userId)}
                          >
                            {participant.username}
                          </button>
                        )}
                        {participantIsHost && (
                          <span className={styles.hostBadge}>
                            <Crown className="w-4 h-4 text-yellow-600" />
                            Host
                          </span>
                        )}
                        {participantIsMe && <span className={styles.meBadge}>Me</span>}
                        <span className={`${styles.statusBadge} ${participant.online === false ? styles.offlineBadge : styles.onlineBadge}`}>
                          {participant.online === false ? "Offline" : "Online"}
                        </span>
                      </div>

                      <p className={styles.participantRole}>
                        {participant.bot ? "Bot Player" : "Human Player"}
                      </p>
                    </div>
                  </div>

                  {(canKick || canTransferHost || canRemoveBot) && (
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
                      {canRemoveBot && (
                        <button
                          className={styles.kickButton}
                          onClick={() => void removeBot(participant.id)}
                          disabled={kickingParticipantId === participant.id}
                        >
                          <UserMinus className="w-4 h-4" />
                          {kickingParticipantId === participant.id ? "Removing..." : "Remove"}
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

      <UserProfileModal
        open={showUserProfileModal}
        userId={selectedProfileUserId}
        currentUserId={currentUserId ?? 0}
        onClose={() => setShowUserProfileModal(false)}
        onOpenSettings={() => router.push("/lobby")}
      />

      {showInviteModal && (
        <div className={styles.inviteModalBackdrop} onClick={handleCloseInviteModal}>
          <div className={styles.inviteModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.inviteModalHeader}>
              <h3 className={styles.inviteModalTitle}>Invite Friends</h3>
              <button
                type="button"
                className={styles.inviteModalCloseButton}
                onClick={handleCloseInviteModal}
                disabled={sendingInvites}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invitableFriends.length === 0 ? (
              <p className={styles.inviteModalEmptyText}>No available friends to invite right now.</p>
            ) : (
              <div className={styles.inviteFriendList}>
                {invitableFriends.map((friend) => {
                  const selected = selectedInviteUserIds.includes(friend.id);
                  return (
                    <label key={friend.id} className={styles.inviteFriendRow}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleInviteSelection(friend.id)}
                      />
                      <span className={styles.inviteFriendName}>{friend.username}</span>
                      <span className={styles.inviteFriendStatus}>{friend.userStatus ?? "UNKNOWN"}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className={styles.inviteModalActions}>
              <button
                type="button"
                className={styles.inviteModalCancelButton}
                onClick={handleCloseInviteModal}
                disabled={sendingInvites}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.inviteModalSendButton}
                disabled={sendingInvites || selectedInviteUserIds.length === 0}
                onClick={() => void handleSendInvites()}
              >
                {sendingInvites ? "Sending..." : "Send Invites"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

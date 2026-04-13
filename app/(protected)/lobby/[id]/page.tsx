"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Users, Bot, Crown, Play } from "lucide-react";
import catanBg from "figma:asset/a3d5e0e01f9dba8936ad89072a0382297571bf96.png";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";

interface LobbyParticipantGetDTO {
  id: number;
  userId: number | null;
  username: string;
  host: boolean;
  bot: boolean;
}

interface LobbyGetDTO {
  id: number;
  name: string;
  capacity: number;
  currentParticipants: number;
  participants: LobbyParticipantGetDTO[];
  hostId: number;
  gameId?: number | null;
  privateLobby: boolean;
}

interface GameStartGetDTO {
  gameId: number;
}

export default function LobbyRoom() {
  const router = useRouter();
  const params = useParams();
  const lobbyId = params.lobbyId as string;

  const apiService = useApi();
  const { value: userId } = useLocalStorage<string>("userId", "");
  const [lobby, setLobby] = useState<LobbyGetDTO | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);


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

  const currentParticipants = lobby?.currentParticipants ?? 0;
  const maxPlayers = lobby?.capacity ?? 4;
  const canAddBot = (lobby?.currentParticipants ?? 0) < maxPlayers;

  // determining current user/host
  const currentUserId = userId ? Number(userId) : null;
  const isHost = lobby && currentUserId !== null
    ? lobby.hostId === currentUserId
    : false;

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
    return <div className="p-8 text-white">{error}</div>;
  }
  
  if (!lobby) {
    return <div className="p-8 text-white">Loading lobby...</div>;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${catanBg})`,
          filter: "brightness(0.7)",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-cyan-800/40 to-teal-900/40" />

      {/* Header */}
      <div className="bg-yellow-600/70 backdrop-blur-sm shadow-sm border-b border-yellow-700/50 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/lobby")}
            className="flex items-center gap-2 text-white hover:text-yellow-100"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Lobbies
          </button>
          <h1 className="text-3xl font-bold text-white">Epic Game</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="bg-yellow-600/70 backdrop-blur-sm rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-bold text-white">
                Lobby ({currentParticipants}/{maxPlayers})
              </h2>
            </div>
            <button
              onClick={() => alert("Add Bot functionality not implemented yet.")}
              disabled={!canAddBot}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                canAddBot
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              <Bot className="w-5 h-5" />
              Add Bot
            </button>
          </div>

          <div className="space-y-4 mb-8">
            {lobby?.participants.map((participant) => (
              <div
                key={participant.id}
                className="bg-white/90 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {participant.bot ? <Bot className="w-6 h-6" /> : participant.username[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{participant.username}</p>
                      {participant.host && (
                        <>
                          <Crown className="w-4 h-4 text-yellow-600" />
                          <span className="text-xs text-yellow-700">Host</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {participant.bot ? "AI Player" : "Human Player"}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: maxPlayers - currentParticipants }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-white/30 rounded-lg p-4 border-2 border-dashed border-white/50 flex items-center justify-center"
              >
                <p className="text-white text-sm">Waiting for player...</p>
              </div>
            ))}
          </div>
          {isHost && (
          <div className="flex justify-center">
            <button
              onClick={startGame}
              disabled={starting || currentParticipants < 2}
              className={`flex items-center gap-3 px-8 py-4 rounded-lg text-xl font-bold transition-colors shadow-lg ${
                starting || currentParticipants < 2
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              <Play className="w-6 h-6" />
              {starting ? "Starting..." : "Start Game"}
            </button>
          </div>
          )}

          {!isHost && (
            <p className="text-center text-white/80 text-sm mt-4">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

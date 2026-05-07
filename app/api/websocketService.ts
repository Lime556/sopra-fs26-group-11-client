import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { getApiDomain } from "@/utils/domain";
import type {
  GameChatMessageDTO,
  GameEventDTO,
  GameGetDTO,
  Resources,
} from "@/gameboard/types";

export type WebSocketErrorDTO = {
  status: number;
  message: string;
  destination?: string | null;
};

type Callback<T> = (payload: T) => void;

type ConnectOptions = {
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: WebSocketErrorDTO | Error) => void;
};

class WebSocketService {
  private client: Client | null = null;

  connect(options: ConnectOptions = {}): Client {
    const token = this.resolveToken(options.token);
    if (!token) {
      throw new Error("Missing websocket authentication token.");
    }

    this.disconnect();

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${getApiDomain()}/ws`) as unknown as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        options.onConnect?.();
      },
      onDisconnect: () => {
        options.onDisconnect?.();
      },
      onStompError: (frame) => {
        options.onError?.({
          status: 400,
          message: frame.headers.message || frame.body || "STOMP error",
          destination: frame.headers.destination || null,
        });
      },
      onWebSocketError: () => {
        options.onError?.(new Error("WebSocket connection failed."));
      },
    });

    this.client.activate();
    return this.client;
  }

  disconnect(): void {
    if (!this.client) {
      return;
    }

    void this.client.deactivate();
    this.client = null;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  subscribeGameState(gameId: number, callback: Callback<GameGetDTO>): void {
    this.subscribe(`/topic/games/${gameId}/state`, callback);
  }

  subscribeGameEvents(gameId: number, callback: Callback<GameEventDTO>): void {
    this.subscribe(`/topic/games/${gameId}/events`, callback);
  }

  subscribeGameChat(gameId: number, callback: Callback<GameChatMessageDTO>): void {
    this.subscribe(`/topic/games/${gameId}/chat`, callback);
  }

  subscribeErrors(callback: Callback<WebSocketErrorDTO>): void {
    this.subscribe("/user/queue/errors", callback);
  }

  sendGameEvent(gameId: number, payload: GameEventDTO): void {
    this.publish(`/app/games/${gameId}/events`, payload);
  }

  sendGameChat(gameId: number, payload: GameChatMessageDTO): void {
    this.publish(`/app/games/${gameId}/chat`, payload);
  }

  sendBuildSettlement(gameId: number, payload: { playerId: number; intersectionId: number }): void {
    this.publish(`/app/games/${gameId}/actions/build-settlement`, payload);
  }

  sendBuildRoad(gameId: number, payload: { playerId: number; edgeId: number }): void {
    this.publish(`/app/games/${gameId}/actions/build-road`, payload);
  }

  sendRollDice(gameId: number, payload?: { discardResources?: Partial<Resources> }): void {
    this.publish(`/app/games/${gameId}/actions/roll-dice`, payload ?? {});
  }

  sendMoveRobber(gameId: number, hexId: number): void {
    this.publish(`/app/games/${gameId}/actions/move-robber`, hexId);
  }

  sendEndTurn(gameId: number): void {
    this.publish(`/app/games/${gameId}/actions/end-turn`, {});
  }

  private subscribe<T>(destination: string, callback: Callback<T>): void {
    if (!this.client) {
      throw new Error("WebSocket client is not connected.");
    }

    this.client.subscribe(destination, (message) => {
      try {
        callback(JSON.parse(message.body) as T);
      } catch {
        // Ignore malformed payloads.
      }
    });
  }

  private publish(destination: string, payload: unknown): void {
    if (!this.client) {
      throw new Error("WebSocket client is not connected.");
    }

    this.client.publish({
      destination,
      body: JSON.stringify(payload),
    });
  }

  private resolveToken(explicitToken?: string): string | null {
    if (explicitToken && explicitToken.trim()) {
      return explicitToken.trim();
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      const sessionRaw = window.sessionStorage.getItem("token");
      const localRaw = window.localStorage.getItem("token");
      const raw = sessionRaw ?? localRaw;
      return raw ? (JSON.parse(raw) as string) : null;
    } catch {
      return null;
    }
  }
}

export const websocketService = new WebSocketService();
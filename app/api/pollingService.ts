import { getApiDomain } from "@/utils/domain";
import type {
  GameChatMessageDTO,
  GameEventDTO,
  GameGetDTO,
  Resources,
} from "@/gameboard/types";

type Callback<T> = (payload: T) => void;

type ConnectOptions = {
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
};

class PollingService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private token: string | null = null;
  private isConnected: boolean = false;

  connect(options: ConnectOptions = {}): void {
    const token = this.resolveToken(options.token);
    if (!token) {
      throw new Error("Missing authentication token.");
    }

    this.token = token;
    this.isConnected = true;
    options.onConnect?.();
  }

  disconnect(): void {
    // Clear all polling intervals
    for (const [, interval] of this.pollingIntervals.entries()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();

    this.token = null;
    this.isConnected = false;
  }

  getConnected(): boolean {
    return this.isConnected;
  }

  startPollingGameState(gameId: number, callback: Callback<GameGetDTO>, interval: number = 1000): void {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    const key = `gameState-${gameId}`;
    const pollFunction = async () => {
      try {
        const response = await fetch(`${getApiDomain()}/games/${gameId}`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          callback(data as GameGetDTO);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    // Clear existing interval if any
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key)!);
    }

    // Start polling
    const pollInterval = setInterval(pollFunction, interval);
    this.pollingIntervals.set(key, pollInterval);

    // Do an initial call immediately
    void pollFunction();
  }

  stopPollingGameState(gameId: number): void {
    const key = `gameState-${gameId}`;
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
    }
  }

  async sendGameEvent(gameId: number, payload: GameEventDTO): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async sendGameChat(gameId: number, payload: GameChatMessageDTO): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async sendBuildSettlement(
    gameId: number,
    payload: { playerId: number; intersectionId: number }
  ): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/actions/build-settlement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async sendBuildRoad(
    gameId: number,
    payload: { playerId: number; edgeId: number }
  ): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/actions/build-road`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async sendRollDice(
    gameId: number,
    payload?: { discardResources?: Partial<Resources> }
  ): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/actions/roll-dice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload ?? {}),
    });
  }

  async sendMoveRobber(gameId: number, hexId: number): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/actions/move-robber`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(hexId),
    });
  }

  async sendEndTurn(gameId: number): Promise<Response> {
    if (!this.token) {
      throw new Error("Service is not connected.");
    }

    return fetch(`${getApiDomain()}/games/${gameId}/actions/end-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({}),
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

export const pollingService = new PollingService();

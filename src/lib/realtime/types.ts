import type { GameId } from "@/lib/casino/games";

export interface ChatUser {
  name: string;
  /** Farbe für Avatar und Namen */
  color: string;
  level: number;
  isYou?: boolean;
}

export interface ChatMessage {
  id: string;
  user: ChatUser;
  text: string;
  createdAt: number;
}

export interface LiveBet {
  id: string;
  user: ChatUser;
  game: GameId;
  /** Einsatz in Cent */
  amount: number;
  multiplier: number;
  /** Auszahlung in Cent (0 bei Verlust) */
  payout: number;
  createdAt: number;
}

/** Events vom (simulierten) Server an den Client – wie bei Socket.io typisiert. */
export interface ServerToClientEvents {
  "chat:message": ChatMessage;
  "bets:new": LiveBet;
  "presence:update": { online: number };
}

/** Events vom Client an den Server. */
export interface ClientToServerEvents {
  "chat:send": { user: ChatUser; text: string };
  "bets:publish": LiveBet;
}

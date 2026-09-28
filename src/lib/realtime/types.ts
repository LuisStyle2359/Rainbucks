import type { GameId } from "@/lib/casino/games";

export interface ChatUser {
  name: string;
  /** Color for avatar and name */
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
  /** Stake in cents */
  amount: number;
  multiplier: number;
  /** Payout in cents (0 on a loss) */
  payout: number;
  createdAt: number;
}

/** Events from the (simulated) server to the client, typed like Socket.io. */
export interface ServerToClientEvents {
  "chat:message": ChatMessage;
  "bets:new": LiveBet;
  "presence:update": { online: number };
}

/** Events from the client to the server. */
export interface ClientToServerEvents {
  "chat:send": { user: ChatUser; text: string };
  "bets:publish": LiveBet;
}

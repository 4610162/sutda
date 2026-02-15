// 서버와 공유하는 타입 정의

export interface SutdaCard {
  month: number;
  isKwang: boolean;
  id: string;
}

export interface HandResult {
  rank: number;
  name: string;
  score: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  cardCount: number;
  cards: SutdaCard[];
  totalBet: number;
  folded: boolean;
  isHost: boolean;
  hand?: HandResult;
}

export type Phase = "waiting" | "playing" | "result";
export type BetAction = "half" | "quarter" | "die";

export interface SyncMessage {
  type: "sync";
  phase: Phase;
  players: PublicPlayer[];
  pot: number;
  baseBet: number;
  currentTurnId: string | null;
  turnOrder: string[];
  roundCount: number;
  playerId: string;
  hostId: string | null;
}

export interface ResultMessage {
  type: "result";
  winnerId: string;
  winnerName: string;
  winnerHand: string;
  pot: number;
  players: PublicPlayer[];
}

export interface WelcomeMessage {
  type: "welcome";
  playerId: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage = SyncMessage | ResultMessage | WelcomeMessage | ErrorMessage;

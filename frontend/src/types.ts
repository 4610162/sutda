// ============================================================
// 섯다 게임 프런트엔드 타입 정의 (Convex 기반)
// ============================================================

/** 화투 카드 한 장 */
export interface SutdaCard {
  month: number;      // 1~12
  isKwang: boolean;   // 광패 여부 (1, 3, 8월)
  id: string;         // 고유 ID (예: "1K_a")
  imageFile: string;  // 이미지 파일명 (예: "Hwatu_January_Hikari.svg")
}

/** 족보 평가 결과 */
export interface HandResult {
  rank: number;
  name: string;
  score: number;
}

/** 게임 페이즈 */
export type Phase = "waiting" | "playing" | "result" | "ended";

/** 베팅 액션 */
export type BetAction = "half" | "quarter" | "call" | "die" | "check" | "pping" | "ddadang";

// ─────────────────────────────────────────────
// Convex DB 레코드 타입
// ─────────────────────────────────────────────
export interface PlayerRow {
  _id: string;
  roomId: string;
  playerId: string;
  name: string;
  cards: SutdaCard[];
  totalBet: number;
  folded: boolean;
  balance: number;
  ready: boolean;
  handName?: string;
  handRank?: number;
  isBot?: boolean;
}

export interface RoomRow {
  _id: string;
  roomCode: string;
  phase: Phase;
  pot: number;
  baseBet: number;
  currentTurnId?: string;
  turnOrder: string[];
  turnIndex: number;
  roundCount: number;
  maxRounds: number;
  hostId?: string;
  totalRoundsPlayed: number;
  isRematch?: boolean;
}

// ─────────────────────────────────────────────
// UI 전용 뷰 타입 (카드 숨김 처리 후)
// ─────────────────────────────────────────────
export interface PublicPlayer {
  id: string;
  name: string;
  cards: SutdaCard[];   // 본인 or 결과 페이즈에서만 실제 카드
  cardCount: number;
  totalBet: number;
  folded: boolean;
  balance: number;
  ready: boolean;
  isHost: boolean;
  isBot: boolean;
  hand?: { name: string; rank: number };
  lastAction?: string;  // 마지막 베팅 액션 (UI 피드백용)
}

/** 봇 정의 (프리셋) */
export interface BotDefinition {
  name: string;
  personality: "aggressive" | "tight";
  description: string;
}

/** 사전 정의된 봇 목록 */
export const BOT_DEFINITIONS: BotDefinition[] = [
  { name: "김타짜", personality: "aggressive", description: "공격적인 베팅 성향" },
  { name: "이판사", personality: "tight", description: "보수적인 판단형" },
  { name: "박도박", personality: "aggressive", description: "과감한 블러퍼" },
  { name: "최신중", personality: "tight", description: "신중한 계산파" },
  { name: "정승부", personality: "aggressive", description: "승부사 기질" },
  { name: "한수비", personality: "tight", description: "수비 중심 플레이" },
];

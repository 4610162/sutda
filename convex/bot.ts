// ============================================================
// 섯다 봇 시스템
// - 전수 조사 기반 승률 계산 (C(38,2) = 703 조합)
// - EV(기댓값) 기반 베팅 전략
// - Aggressive / Tight 성향별 가중치
// ============================================================

import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal, api } from "./_generated/api";
import {
  calculateRank,
  resolveSpecialHands,
  type SutdaCard,
} from "./game";

const INITIAL_BALANCE = 100_000;
const BASE_BET = 1_000;

// ─────────────────────────────────────────────
// 1. 40장 풀 덱 생성 (game.ts의 createBaseDeck 재현)
// ─────────────────────────────────────────────

const MONTH_IMAGES: Record<number, [string, string]> = {
  1:  ["Hwatu_January_Hikari.svg",   "Hwatu_January_Tanzaku.svg"],
  2:  ["Hwatu_February_Tane.svg",    "Hwatu_February_Tanzaku.svg"],
  3:  ["Hwatu_March_Hikari.svg",     "Hwatu_March_Tanzaku.svg"],
  4:  ["Hwatu_April_Tane.svg",       "Hwatu_April_Tanzaku.svg"],
  5:  ["Hwatu_May_Tane.svg",         "Hwatu_May_Tanzaku.svg"],
  6:  ["Hwatu_June_Tane.svg",        "Hwatu_June_Tanzaku.svg"],
  7:  ["Hwatu_July_Tane.svg",        "Hwatu_July_Tanzaku.svg"],
  8:  ["Hwatu_August_Hikari.svg",    "Hwatu_August_Tane.svg"],
  9:  ["Hwatu_September_Tane.svg",   "Hwatu_September_Tanzaku.svg"],
  10: ["Hwatu_October_Tane.svg",     "Hwatu_October_Tanzaku.svg"],
};

function buildFullDeck(): SutdaCard[] {
  const deck: SutdaCard[] = [];
  for (const setLabel of ["a", "b"] as const) {
    for (let m = 1; m <= 10; m++) {
      const [imgK, imgN] = MONTH_IMAGES[m];
      deck.push({
        month: m,
        isKwang: imgK.includes("Hikari"),
        id: `${m}K_${setLabel}`,
        imageFile: imgK,
      });
      deck.push({
        month: m,
        isKwang: imgN.includes("Hikari"),
        id: `${m}N_${setLabel}`,
        imageFile: imgN,
      });
    }
  }
  return deck;
}

// ─────────────────────────────────────────────
// 2. 승률 계산 — 전수 조사 (C(38,2) = 703)
//
// 40장 덱 - 봇 2장 = 38장 잔여.
// 가능한 상대 핸드: C(38,2) = 703개.
// 703 × calculateRank + resolveSpecialHands ≈ O(1)이므로
// 몬테카를로(500회)보다 정확하면서도 충분히 빠름.
// ─────────────────────────────────────────────

function calculateWinRate(botCards: SutdaCard[]): number {
  const fullDeck = buildFullDeck();
  const remaining = fullDeck.filter(
    (c) => c.id !== botCards[0].id && c.id !== botCards[1].id,
  );

  let wins = 0;
  let total = 0;

  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      const botResult = calculateRank(botCards[0], botCards[1]);
      const oppResult = calculateRank(remaining[i], remaining[j]);
      const resolution = resolveSpecialHands([
        { playerId: "bot", result: botResult },
        { playerId: "opp", result: oppResult },
      ]);

      if (resolution.winnerId === "bot") {
        wins++;
      } else if (resolution.isRematch) {
        wins += 0.5; // 무승부 = 0.5승 취급
      }
      total++;
    }
  }

  return total > 0 ? wins / total : 0.5;
}

// ─────────────────────────────────────────────
// 3. EV(기댓값) 계산
// ─────────────────────────────────────────────

function calculateEV(
  winRate: number,
  pot: number,
  callCost: number,
): number {
  return winRate * pot - (1 - winRate) * callCost;
}

// ─────────────────────────────────────────────
// 4. 전략 맵 (Aggressive / Tight)
// ─────────────────────────────────────────────

type BotPersonality = "aggressive" | "tight";
type BetAction =
  | "check"
  | "pping"
  | "half"
  | "quarter"
  | "call"
  | "ddadang"
  | "die";

interface GameContext {
  isFirstPlayer: boolean;
  callCost: number;
  pot: number;
  baseBet: number;
  balance: number;
  /** 상대방의 마지막 베팅 액션 (Bayesian 보정용) */
  lastOpponentAction: string | null;
  /** 이번 라운드에서 봇이 레이즈한 횟수 (무한 베팅 방지) */
  botRaiseCount: number;
}

// ─────────────────────────────────────────────
// 4-1. 상대 액션에 따른 승률 보정 (Bayesian Weighting)
// ─────────────────────────────────────────────

/** 상대 액션 강도별 승률 페널티 */
const OPPONENT_ACTION_PENALTY: Record<string, number> = {
  "삥": 0.05,
  "쿼터": 0.05,
  "하프": 0.10,
  "따당": 0.10,
  "콜": 0.05,
};

// ─────────────────────────────────────────────
// 4-2. 심리적 위축 (Risk Aversion)
// ─────────────────────────────────────────────

/**
 * pot이 잔고 대비 클수록 승률 허들을 높임.
 * potRatio = pot / balance
 * - 40% 미만: 페널티 없음
 * - 40~70%:  추가 -10%
 * - 70% 이상: 추가 -20%
 */
function getRiskPenalty(pot: number, balance: number): number {
  if (balance <= 0) return 0.20;
  const potRatio = pot / balance;
  if (potRatio >= 0.70) return 0.20;
  if (potRatio >= 0.40) return 0.10;
  return 0;
}

/** 최종 보정 승률 계산 */
function getAdjustedWinRate(
  rawWinRate: number,
  gc: GameContext,
): number {
  let penalty = 0;

  // 1) 상대 액션 페널티
  if (gc.lastOpponentAction) {
    penalty += OPPONENT_ACTION_PENALTY[gc.lastOpponentAction] ?? 0;
  }

  // 2) 심리적 위축 페널티
  penalty += getRiskPenalty(gc.pot, gc.balance);

  return Math.max(rawWinRate - penalty, 0);
}

// ─────────────────────────────────────────────
// 4-3. 무한 베팅 방지 상수
// ─────────────────────────────────────────────

/** 한 라운드 내 봇 최대 레이즈 횟수 */
const MAX_RAISE_PER_ROUND = 3;

/**
 * 성향별 전략 맵
 *
 * - callCost === 0 (앞선 베팅 없음)
 *   → 선: check / pping / half
 *   → 후: check / half
 *
 * - callCost > 0 (앞선 베팅 있음)
 *   → call / ddadang / die
 *
 * 보정 승률(adjustedWinRate) 사용 + 레이즈 캡 적용
 */
const STRATEGY_MAP: Record<
  BotPersonality,
  (wr: number, ev: number, gc: GameContext) => BetAction
> = {
  aggressive: (wr, ev, gc) => {
    const awr = getAdjustedWinRate(wr, gc);
    const raiseCapped = gc.botRaiseCount >= MAX_RAISE_PER_ROUND;

    if (gc.callCost === 0) {
      if (!raiseCapped && awr > 0.75) return "half";
      if (!raiseCapped && gc.isFirstPlayer && awr > 0.45) return "pping";
      return "check";
    }
    // 레이즈 캡 도달 시 콜/다이만 허용
    if (!raiseCapped && awr > 0.7) return "ddadang";
    if (ev > 0 || awr > 0.3) return "call";
    return "die";
  },

  tight: (wr, ev, gc) => {
    const awr = getAdjustedWinRate(wr, gc);
    const raiseCapped = gc.botRaiseCount >= MAX_RAISE_PER_ROUND;

    if (gc.callCost === 0) {
      if (!raiseCapped && awr > 0.8) return "half";
      if (!raiseCapped && gc.isFirstPlayer && awr > 0.6) return "pping";
      return "check";
    }
    if (!raiseCapped && awr > 0.8) return "ddadang";
    if (ev > 0 && awr > 0.5) return "call";
    return "die";
  },
};

/** playerId 해시 기반 성향 결정 (봇별 고정) */
function getPersonality(playerId: string): BotPersonality {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return hash % 2 === 0 ? "aggressive" : "tight";
}

// ─────────────────────────────────────────────
// 5. Internal Query: 봇 게임 상태 조회
// ─────────────────────────────────────────────

export const getBotGameState = internalQuery({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room || room.phase !== "playing") return null;
    if (room.currentTurnId !== playerId) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const me = players.find((p) => p.playerId === playerId);
    if (!me || me.folded || me.cards.length < 2) return null;

    const activePlayers = players.filter((p) => !p.folded);
    const maxBet =
      activePlayers.length > 0
        ? Math.max(...activePlayers.map((p) => p.totalBet))
        : me.totalBet;

    // 상대방의 마지막 베팅 액션 조회 (가장 최근 액션을 가진 상대)
    const opponents = activePlayers.filter((p) => p.playerId !== playerId);
    const lastOpponentAction =
      opponents.find((p) => p.lastAction)?.lastAction ?? null;

    return {
      botCards: me.cards,
      pot: room.pot,
      baseBet: room.baseBet,
      myTotalBet: me.totalBet,
      maxBet,
      balance: me.balance,
      isFirstPlayer: room.turnOrder[0] === playerId,
      lastOpponentAction,
      botRaiseCount: me.botRaiseCount ?? 0,
    };
  },
});

// ─────────────────────────────────────────────
// 6. Internal Action: 봇 턴 실행
// ─────────────────────────────────────────────

export const botTakeTurn = internalAction({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    const state = await ctx.runQuery(internal.bot.getBotGameState, {
      roomCode,
      playerId,
    });
    if (!state) return;

    // 승률 계산 (전수 조사)
    const winRate = calculateWinRate(state.botCards as SutdaCard[]);

    // EV 계산
    const callCost = Math.max(state.maxBet - state.myTotalBet, 0);
    const ev = calculateEV(winRate, state.pot, callCost);

    // 성향 결정 + 전략 실행
    const personality = getPersonality(playerId);
    const action = STRATEGY_MAP[personality](winRate, ev, {
      isFirstPlayer: state.isFirstPlayer,
      callCost,
      pot: state.pot,
      baseBet: state.baseBet,
      balance: state.balance,
      lastOpponentAction: state.lastOpponentAction,
      botRaiseCount: state.botRaiseCount,
    });

    // 베팅 실행
    await ctx.runMutation(api.rooms.placeBet, {
      roomCode,
      playerId,
      action,
    });
  },
});

// ─────────────────────────────────────────────
// 7. Internal Action: 봇 자동 레디
// ─────────────────────────────────────────────

export const botAutoReady = internalAction({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    await ctx.runMutation(api.rooms.setReady, { roomCode, playerId });
  },
});

// ─────────────────────────────────────────────
// 8. Internal Mutation: 봇 턴 확인 및 스케줄링
//    - playing + 현재 턴 봇 → botTakeTurn 스케줄 (1~3초 딜레이)
//    - result/waiting → 미레디 봇 → botAutoReady 스케줄
// ─────────────────────────────────────────────

export const checkBotTurn = internalMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    // ── playing: 현재 턴 봇이면 행동 스케줄 ──
    if (room.phase === "playing" && room.currentTurnId) {
      const current = players.find(
        (p) => p.playerId === room.currentTurnId,
      );
      if (current?.isBot) {
        const delay = 1000 + Math.floor(Math.random() * 2000);
        await ctx.scheduler.runAfter(delay, internal.bot.botTakeTurn, {
          roomCode: room.roomCode,
          playerId: current.playerId,
        });
      }
      return;
    }

    // ── result / waiting: 미레디 봇 자동 레디 스케줄 ──
    if (room.phase === "result" || room.phase === "waiting") {
      const isRematchMode =
        room.isRematch &&
        room.rematchPlayerIds &&
        room.rematchPlayerIds.length > 0;
      const rematchIds = room.rematchPlayerIds ?? [];

      for (const p of players) {
        if (!p.isBot || p.ready) continue;
        // 재경기 모드면 해당 봇만
        if (isRematchMode && !rematchIds.includes(p.playerId)) continue;
        const delay = 1000 + Math.floor(Math.random() * 2000);
        await ctx.scheduler.runAfter(delay, internal.bot.botAutoReady, {
          roomCode: room.roomCode,
          playerId: p.playerId,
        });
      }
    }
  },
});

// ─────────────────────────────────────────────
// 9. Public Mutation: 방에 봇 추가
// ─────────────────────────────────────────────

export const addBot = mutation({
  args: {
    roomCode: v.string(),
    botName: v.optional(v.string()),
  },
  handler: async (ctx, { roomCode, botName }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.phase !== "waiting")
      throw new Error("대기 중인 방에서만 봇을 추가할 수 있습니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length >= 4) throw new Error("방이 가득 찼습니다 (최대 4명).");

    const botCount = players.filter((p) => p.isBot).length;
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const name = botName ?? `봇${botCount + 1}`;

    await ctx.db.insert("players", {
      roomId: room._id,
      playerId: botId,
      name,
      cards: [],
      totalBet: 0,
      folded: false,
      balance: INITIAL_BALANCE,
      ready: true, // 봇은 즉시 레디
      isBot: true,
    });

    await ctx.db.patch(room._id, { lastActivity: Date.now() });

    return { botId, botName: name };
  },
});

// ─────────────────────────────────────────────
// 10. Public Mutation: 방에서 봇 제거
// ─────────────────────────────────────────────

export const removeBot = mutation({
  args: {
    roomCode: v.string(),
    botPlayerId: v.string(),
  },
  handler: async (ctx, { roomCode, botPlayerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.phase !== "waiting")
      throw new Error("대기 중인 방에서만 봇을 제거할 수 있습니다.");

    const bot = await ctx.db
      .query("players")
      .withIndex("by_room_player", (q) =>
        q.eq("roomId", room._id).eq("playerId", botPlayerId),
      )
      .first();
    if (!bot || !bot.isBot) throw new Error("해당 봇을 찾을 수 없습니다.");

    await ctx.db.delete(bot._id);
    await ctx.db.patch(room._id, { lastActivity: Date.now() });
  },
});

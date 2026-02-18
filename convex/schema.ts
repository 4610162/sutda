import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardSchema = v.object({
  month: v.number(),
  isKwang: v.boolean(),
  id: v.string(),
  imageFile: v.string(),
});

export default defineSchema({
  rooms: defineTable({
    roomCode: v.string(),
    phase: v.union(
      v.literal("waiting"),
      v.literal("playing"),
      v.literal("result"),
      v.literal("ended"),
    ),
    pot: v.number(),
    baseBet: v.number(),
    currentTurnId: v.optional(v.string()),
    turnOrder: v.array(v.string()),
    turnIndex: v.number(),
    roundCount: v.number(),
    maxRounds: v.number(),
    hostId: v.optional(v.string()),
    totalRoundsPlayed: v.number(),
    endReason: v.optional(v.string()),
    isRematch: v.optional(v.boolean()),
    accumulatedPot: v.optional(v.number()),
    // 선 결정용: 직전 라운드 승자
    lastWinnerId: v.optional(v.string()),
    // 재경기 선 결정용: 마지막 베팅 액션을 한 플레이어
    lastBettorId: v.optional(v.string()),
    // 재경기 시 참여할 플레이어 목록 (무승부 플레이어만)
    rematchPlayerIds: v.optional(v.array(v.string())),
    // 마지막 활동 시간 (비활성 방 자동 삭제용)
    lastActivity: v.optional(v.number()),
  }).index("by_roomCode", ["roomCode"]),

  players: defineTable({
    roomId: v.id("rooms"),
    playerId: v.string(),
    name: v.string(),
    cards: v.array(cardSchema),
    totalBet: v.number(),
    folded: v.boolean(),
    balance: v.number(),
    ready: v.boolean(),
    handName: v.optional(v.string()),
    handRank: v.optional(v.number()),
    // 마지막 베팅 액션 (UI 피드백용)
    lastAction: v.optional(v.string()),
    // 봇 여부
    isBot: v.optional(v.boolean()),
    // 봇 레이즈 횟수 (라운드당, 무한 베팅 방지용)
    botRaiseCount: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_player", ["roomId", "playerId"]),
});

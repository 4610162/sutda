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
  })
    .index("by_room", ["roomId"])
    .index("by_room_player", ["roomId", "playerId"]),
});

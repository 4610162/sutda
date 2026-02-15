import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { calculateRank, shuffleAndDeal } from "./game";

const INITIAL_BALANCE = 100_000;
const BASE_BET = 1_000;
const MAX_ROUNDS = 2;

// ─────────────────────────────────────────────
// Query: 로비용 방 목록 (ended 제외)
// ─────────────────────────────────────────────
export const listRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("rooms")
      .filter((q) => q.neq(q.field("phase"), "ended"))
      .collect();

    const result = await Promise.all(
      rooms.map(async (room) => {
        const players = await ctx.db
          .query("players")
          .withIndex("by_room", (q) => q.eq("roomId", room._id))
          .collect();
        return { ...room, playerCount: players.length };
      }),
    );
    // 빈 방 숨기기
    return result.filter((r) => r.playerCount > 0);
  },
});

// ─────────────────────────────────────────────
// Query: 방 상태 실시간 구독
// ─────────────────────────────────────────────
export const getRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    return { room, players };
  },
});

// ─────────────────────────────────────────────
// Mutation: 방 입장 (없으면 생성)
// ─────────────────────────────────────────────
export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    playerName: v.string(),
    playerId: v.string(),
  },
  handler: async (ctx, { roomCode, playerName, playerId }) => {
    let room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();

    if (!room) {
      const roomId = await ctx.db.insert("rooms", {
        roomCode,
        phase: "waiting",
        pot: 0,
        baseBet: BASE_BET,
        currentTurnId: undefined,
        turnOrder: [],
        turnIndex: 0,
        roundCount: 0,
        maxRounds: MAX_ROUNDS,
        hostId: playerId,
        totalRoundsPlayed: 0,
        isRematch: false,
      });
      room = (await ctx.db.get(roomId))!;
    }

    if (room.phase === "ended") throw new Error("이미 종료된 방입니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const existing = players.find((p) => p.playerId === playerId);
    if (existing) {
      await ctx.db.patch(existing._id, { name: playerName });
      return { roomId: room._id };
    }

    if (room.phase !== "waiting") throw new Error("게임이 이미 진행 중입니다.");
    if (players.length >= 4) throw new Error("방이 가득 찼습니다 (최대 4명).");

    if (players.length === 0) await ctx.db.patch(room._id, { hostId: playerId });

    await ctx.db.insert("players", {
      roomId: room._id,
      playerId,
      name: playerName || `플레이어${players.length + 1}`,
      cards: [],
      totalBet: 0,
      folded: false,
      balance: INITIAL_BALANCE,
      ready: false,
    });

    return { roomId: room._id };
  },
});

// ─────────────────────────────────────────────
// Mutation: 게임 시작 (방장 전용)
// ─────────────────────────────────────────────
export const startGame = mutation({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.phase !== "waiting") throw new Error("이미 진행 중입니다.");
    if (room.hostId !== playerId) throw new Error("방장만 시작할 수 있습니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const solvent = players.filter((p) => p.balance >= BASE_BET);
    if (solvent.length < 2) throw new Error("잔액이 충분한 플레이어가 2명 미만입니다.");

    const { hands } = shuffleAndDeal(solvent.length);
    const turnOrder = solvent.map((p) => p.playerId);

    for (let i = 0; i < solvent.length; i++) {
      await ctx.db.patch(solvent[i]._id, {
        cards: hands[i],
        totalBet: BASE_BET,
        folded: false,
        ready: false,
        balance: solvent[i].balance - BASE_BET,
        handName: undefined,
        handRank: undefined,
      });
    }

    // 잔액 부족 플레이어 폴드 처리
    for (const p of players.filter((p) => p.balance < BASE_BET)) {
      await ctx.db.patch(p._id, { folded: true, ready: false });
    }

    // 재경기면 기존 판돈 이월, 아니면 초기화
    const carryoverPot = room.isRematch ? room.pot : 0;

    await ctx.db.patch(room._id, {
      phase: "playing",
      pot: carryoverPot + solvent.length * BASE_BET,
      turnOrder,
      turnIndex: 0,
      currentTurnId: turnOrder[0],
      roundCount: 0,
      totalRoundsPlayed: room.totalRoundsPlayed + 1,
      isRematch: false,
    });
  },
});

// ─────────────────────────────────────────────
// Mutation: 베팅 (half / quarter / call / die / check / pping / ddadang)
// ─────────────────────────────────────────────
export const placeBet = mutation({
  args: {
    roomCode: v.string(),
    playerId: v.string(),
    action: v.union(
      v.literal("half"),
      v.literal("quarter"),
      v.literal("call"),
      v.literal("die"),
      v.literal("check"),
      v.literal("pping"),
      v.literal("ddadang"),
    ),
  },
  handler: async (ctx, { roomCode, playerId, action }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.phase !== "playing") throw new Error("게임 중이 아닙니다.");
    if (room.currentTurnId !== playerId) throw new Error("당신의 턴이 아닙니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const me = players.find((p) => p.playerId === playerId);
    if (!me || me.folded) throw new Error("유효하지 않은 플레이어입니다.");

    const activePlayers = players.filter((p) => !p.folded);
    const maxBet = activePlayers.length > 0
      ? Math.max(...activePlayers.map((p) => p.totalBet))
      : me.totalBet;

    // ── 다이 ──────────────────────────────────────────────────
    if (action === "die") {
      await ctx.db.patch(me._id, { folded: true });
      const updated = players.map((p) => (p.playerId === playerId ? { ...p, folded: true } : p));
      const active = updated.filter((p) => !p.folded);
      if (active.length === 1) {
        await resolveWinner(ctx, room._id, active[0].playerId, updated, room.pot);
        return;
      }
      await advanceTurn(ctx, room, updated);
      return;
    }

    // ── 체크 (앞선 베팅 없을 때) ──────────────────────────────
    if (action === "check") {
      if (maxBet > me.totalBet) {
        throw new Error("앞선 베팅이 있어 체크할 수 없습니다. 콜 또는 따당을 선택하세요.");
      }
      const freshRoom = (await ctx.db.get(room._id))!;
      await advanceTurn(ctx, freshRoom, players);
      return;
    }

    // ── 삥 (선 플레이어만 / 앞선 베팅 없을 때) ───────────────
    if (action === "pping") {
      if (room.turnOrder.length === 0 || room.currentTurnId !== room.turnOrder[0]) {
        throw new Error("선 플레이어만 삥을 할 수 있습니다.");
      }
      if (maxBet > me.totalBet) {
        throw new Error("앞선 베팅이 있어 삥을 할 수 없습니다.");
      }
      const amount = Math.min(room.baseBet, me.balance);
      await ctx.db.patch(me._id, {
        totalBet: me.totalBet + amount,
        balance: me.balance - amount,
      });
      await ctx.db.patch(room._id, { pot: room.pot + amount });
      const freshRoom = (await ctx.db.get(room._id))!;
      const freshPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      await advanceTurn(ctx, freshRoom, freshPlayers);
      return;
    }

    // ── 따당 (앞선 베팅 콜 + 콜 금액의 2배 추가) ─────────────
    if (action === "ddadang") {
      const callAmt = maxBet - me.totalBet;
      if (callAmt <= 0) {
        throw new Error("앞선 베팅이 없어 따당을 할 수 없습니다. 삥 또는 체크를 선택하세요.");
      }
      // 따당 = 콜 금액 + 콜 금액 × 2 = callAmt × 3
      const amount = Math.min(callAmt * 3, me.balance);
      await ctx.db.patch(me._id, {
        totalBet: me.totalBet + amount,
        balance: me.balance - amount,
      });
      await ctx.db.patch(room._id, { pot: room.pot + amount });
      const freshRoom = (await ctx.db.get(room._id))!;
      const freshPlayers = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      await advanceTurn(ctx, freshRoom, freshPlayers);
      return;
    }

    // ── half / quarter / call ─────────────────────────────────
    let amount: number;
    if (action === "half") {
      amount = Math.max(Math.floor(room.pot / 2), room.baseBet);
    } else if (action === "quarter") {
      amount = Math.max(Math.floor(room.pot / 4), room.baseBet);
    } else {
      // call: 앞선 최고 베팅에 맞춤 (즉시 쇼다운 X → advanceTurn에서 처리)
      amount = Math.max(maxBet - me.totalBet, 0);
    }

    const actualAmount = Math.min(amount, me.balance);
    await ctx.db.patch(me._id, {
      totalBet: me.totalBet + actualAmount,
      balance: me.balance - actualAmount,
    });
    const newPot = room.pot + actualAmount;
    await ctx.db.patch(room._id, { pot: newPot });

    const freshRoom = (await ctx.db.get(room._id))!;
    const freshPlayers = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    await advanceTurn(ctx, freshRoom, freshPlayers);
  },
});

// ─────────────────────────────────────────────
// Mutation: 다음 라운드 준비
// ─────────────────────────────────────────────
export const setReady = mutation({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) throw new Error("방을 찾을 수 없습니다.");
    if (room.phase !== "result") throw new Error("결과 페이즈가 아닙니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const me = players.find((p) => p.playerId === playerId);
    if (!me) throw new Error("플레이어를 찾을 수 없습니다.");
    await ctx.db.patch(me._id, { ready: true });

    // 잔액이 있는 플레이어 전원 레디 → 대기 페이즈
    const eligible = players.map((p) => (p.playerId === playerId ? { ...p, ready: true } : p))
      .filter((p) => p.balance >= BASE_BET);

    if (eligible.length >= 2 && eligible.every((p) => p.ready)) {
      await ctx.db.patch(room._id, {
        phase: "waiting",
        pot: 0,
        currentTurnId: undefined,
        turnOrder: [],
        turnIndex: 0,
        roundCount: 0,
      });
      for (const p of players) {
        await ctx.db.patch(p._id, {
          cards: [],
          totalBet: 0,
          folded: false,
          ready: false,
          handName: undefined,
          handRank: undefined,
        });
      }
    }
  },
});

// ─────────────────────────────────────────────
// Mutation: 방 나가기
// ─────────────────────────────────────────────
export const leaveRoom = mutation({
  args: { roomCode: v.string(), playerId: v.string() },
  handler: async (ctx, { roomCode, playerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) return;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const me = players.find((p) => p.playerId === playerId);
    if (!me) return;

    if (room.phase === "playing") {
      // 게임 중 → 다이 처리
      await ctx.db.patch(me._id, { folded: true });
      if (room.currentTurnId === playerId) {
        const updated = players.map((p) => (p.playerId === playerId ? { ...p, folded: true } : p));
        const active = updated.filter((p) => !p.folded);
        if (active.length === 1) {
          await resolveWinner(ctx, room._id, active[0].playerId, updated, room.pot);
        } else {
          const freshRoom = (await ctx.db.get(room._id))!;
          await advanceTurn(ctx, freshRoom, updated);
        }
      }
      // 나간 플레이어 삭제
      await ctx.db.delete(me._id);
    } else {
      await ctx.db.delete(me._id);
    }

    // 남은 플레이어 확인
    const remaining = players.filter((p) => p.playerId !== playerId);

    if (remaining.length === 0) {
      // 방 비어있음 → 삭제
      await ctx.db.delete(room._id);
      return;
    }

    // 방장 재지정
    if (room.hostId === playerId && room.phase !== "playing") {
      const newHost = remaining[0].playerId;
      await ctx.db.patch(room._id, { hostId: newHost });
    }
  },
});

// ─────────────────────────────────────────────
// 내부: 턴 진행
// ─────────────────────────────────────────────
async function advanceTurn(ctx: { db: any }, room: any, players: any[]) {
  const order = room.turnOrder as string[];
  let nextIdx = (room.turnIndex + 1) % order.length;
  let newRoundCount = room.roundCount;

  const wrapping = nextIdx <= room.turnIndex;

  if (wrapping) {
    newRoundCount++;

    // 모든 활성 플레이어 베팅 동일 → 쇼다운
    const active = players.filter((p) => !p.folded);
    if (active.length > 1) {
      const maxBet = Math.max(...active.map((p) => p.totalBet));
      if (active.every((p) => p.totalBet === maxBet)) {
        await determineWinner(ctx, room._id, active, room.pot);
        return;
      }
    }

    // 최대 라운드 초과 → 쇼다운
    if (newRoundCount >= room.maxRounds) {
      await determineWinner(ctx, room._id, players.filter((p) => !p.folded), room.pot);
      return;
    }
  }

  let attempts = 0;
  while (attempts < order.length) {
    const candidate = players.find((p) => p.playerId === order[nextIdx]);
    if (candidate && !candidate.folded) {
      await ctx.db.patch(room._id, {
        turnIndex: nextIdx,
        currentTurnId: order[nextIdx],
        roundCount: newRoundCount,
      });
      return;
    }
    nextIdx = (nextIdx + 1) % order.length;
    attempts++;
  }
  await determineWinner(ctx, room._id, players.filter((p) => !p.folded), room.pot);
}

// ─────────────────────────────────────────────
// 내부: 족보 비교 → 승자 결정 (동점 시 재경기)
// ─────────────────────────────────────────────
async function determineWinner(ctx: { db: any }, roomId: any, players: any[], pot: number) {
  if (players.length === 0) return;

  // 각 플레이어 족보 계산
  const playerResults = players.map((p) => ({
    player: p,
    result: calculateRank(p.cards[0], p.cards[1]),
  }));

  const bestRank = Math.max(...playerResults.map((pr) => pr.result.rank));
  const winners = playerResults.filter((pr) => pr.result.rank === bestRank);

  // 동점 → 구사 재경기
  if (winners.length > 1) {
    // 족보 기록
    for (const { player, result } of playerResults) {
      const dbPlayer = await ctx.db
        .query("players")
        .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
        .filter((q: any) => q.eq(q.field("playerId"), player.playerId))
        .first();
      if (dbPlayer) {
        await ctx.db.patch(dbPlayer._id, { handName: result.name, handRank: result.rank });
      }
    }

    // 모든 플레이어 상태 초기화 (카드, 베팅 등)
    const allPlayers = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
      .collect();
    for (const p of allPlayers) {
      await ctx.db.patch(p._id, {
        cards: [],
        totalBet: 0,
        folded: false,
        ready: false,
        handName: undefined,
        handRank: undefined,
      });
    }

    // 방 상태: waiting + 재경기 플래그 + 판돈 이월
    await ctx.db.patch(roomId, {
      phase: "waiting",
      isRematch: true,
      currentTurnId: undefined,
      turnOrder: [],
      turnIndex: 0,
      roundCount: 0,
      // pot 유지 (다음 라운드로 이월)
    });
    return;
  }

  // 단독 승자
  await resolveWinner(ctx, roomId, winners[0].player.playerId, players, pot);
}

// ─────────────────────────────────────────────
// 내부: 승패 정산 + 파산/인원부족 체크
// ─────────────────────────────────────────────
async function resolveWinner(
  ctx: { db: any },
  roomId: any,
  winnerId: string,
  players: any[],
  pot: number,
) {
  // 족보 기록 + 승자 잔액 정산
  for (const p of players) {
    const dbPlayer = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
      .filter((q: any) => q.eq(q.field("playerId"), p.playerId))
      .first();
    if (!dbPlayer) continue;

    let handName: string | undefined;
    let handRank: number | undefined;
    if (p.cards?.length === 2) {
      const result = calculateRank(p.cards[0], p.cards[1]);
      handName = result.name;
      handRank = result.rank;
    }

    if (p.playerId === winnerId) {
      await ctx.db.patch(dbPlayer._id, { handName, handRank, balance: dbPlayer.balance + pot });
    } else {
      await ctx.db.patch(dbPlayer._id, { handName, handRank });
    }
  }

  // ── 파산·인원부족 체크 ──────────────────────────────────
  const allPlayers = await ctx.db
    .query("players")
    .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
    .collect();

  const solvent = allPlayers.filter((p: any) => p.balance >= BASE_BET);

  if (solvent.length < 2) {
    // 게임 종료 (파산 또는 혼자 남음)
    const endReason = solvent.length === 0 ? "bankruptcy" : "solo_survivor";
    await ctx.db.patch(roomId, {
      phase: "ended",
      currentTurnId: undefined,
      endReason,
    });
  } else {
    await ctx.db.patch(roomId, {
      phase: "result",
      currentTurnId: undefined,
    });
  }
}

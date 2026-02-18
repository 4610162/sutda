import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { calculateRank, resolveSpecialHands, shuffleAndDeal } from "./game";

const INITIAL_BALANCE = 100_000;
const BASE_BET = 1_000;

/** 베팅 액션 한글 라벨 (UI 피드백용) */
const ACTION_LABELS: Record<string, string> = {
  check: "체크",
  pping: "삥",
  half: "하프",
  quarter: "쿼터",
  call: "콜",
  ddadang: "따당",
  die: "다이",
};

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
  args: { roomCode: v.string(), playerId: v.optional(v.string()) },
  handler: async (ctx, { roomCode, playerId }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode))
      .first();
    if (!room) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    // 본인에게만 playing 중에도 족보를 미리 계산하여 전달
    const enrichedPlayers = players.map((p) => {
      const isMe = playerId && p.playerId === playerId;
      const isRevealed = room.phase === "result" || room.phase === "ended";

      // 이미 DB에 족보가 저장된 경우 (result/ended)
      if (isRevealed && p.handName != null) {
        return p;
      }

      // 본인이고 카드가 2장 있으면 족보를 계산하여 전달
      if (isMe && p.cards?.length === 2) {
        const result = calculateRank(p.cards[0], p.cards[1]);
        return { ...p, handName: result.name, handRank: result.rank };
      }

      return p;
    });

    return { room, players: enrichedPlayers };
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
        maxRounds: 0,
        hostId: playerId,
        totalRoundsPlayed: 0,
        isRematch: false,
        lastActivity: Date.now(),
      });
      room = (await ctx.db.get(roomId))!;
    }

    if (room.phase === "ended") throw new Error("이미 종료된 방입니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    // 활동 시간 갱신
    await ctx.db.patch(room._id, { lastActivity: Date.now() });

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

    // lastAction 기록 (UI 피드백용) + 활동 시간 갱신
    await ctx.db.patch(me._id, { lastAction: ACTION_LABELS[action] ?? action });
    await ctx.db.patch(room._id, { lastActivity: Date.now() });

    // 봇 레이즈 카운트 증가 (무한 베팅 방지)
    const isRaiseAction = action === "pping" || action === "half" || action === "ddadang";
    if (me.isBot && isRaiseAction) {
      await ctx.db.patch(me._id, { botRaiseCount: (me.botRaiseCount ?? 0) + 1 });
    }

    // lastBettorId 기록 (체크와 다이 제외 - 실제 베팅 액션만)
    if (action !== "check" && action !== "die") {
      await ctx.db.patch(room._id, { lastBettorId: playerId });
    }

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
      // call: 앞선 최고 베팅에 맞춤
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
    if (room.phase !== "result" && room.phase !== "waiting") throw new Error("레디할 수 없는 페이즈입니다.");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const me = players.find((p) => p.playerId === playerId);
    if (!me) throw new Error("플레이어를 찾을 수 없습니다.");
    await ctx.db.patch(me._id, { ready: true });
    // 활동 시간 갱신
    await ctx.db.patch(room._id, { lastActivity: Date.now() });

    // 잔액이 있는 플레이어 전원 레디 → 즉시 게임 시작 (playing)
    const updatedPlayers = players.map((p) => (p.playerId === playerId ? { ...p, ready: true } : p));

    // 재경기 모드: rematchPlayerIds에 포함된 플레이어만 참여
    const isRematchMode = room.isRematch && room.rematchPlayerIds && room.rematchPlayerIds.length > 0;
    const rematchIds = room.rematchPlayerIds ?? [];

    let eligible: typeof updatedPlayers;
    if (isRematchMode) {
      // 재경기: 무승부 플레이어 중 잔액 있는 플레이어만
      eligible = updatedPlayers.filter(
        (p) => rematchIds.includes(p.playerId) && p.balance >= BASE_BET,
      );
    } else {
      // 일반 게임: 잔액 있는 모든 플레이어
      eligible = updatedPlayers.filter((p) => p.balance >= BASE_BET);
    }

    // 재경기 모드에서는 참여 대상 플레이어만 전원 레디해야 시작
    const readyCheck = isRematchMode
      ? eligible.length >= 2 && eligible.every((p) => p.ready)
      : eligible.length >= 2 && eligible.every((p) => p.ready);

    if (readyCheck) {
      // ── 선(First Player) 결정 ──
      // 전체 플레이어 목록 (입장 순서 = DB 순서)
      const allPlayerIds = players.map((p) => p.playerId);
      const eligibleIds = eligible.map((p) => p.playerId);

      let firstPlayerId: string;

      if (isRematchMode && room.lastBettorId && eligibleIds.includes(room.lastBettorId)) {
        // 재경기: 마지막 베팅 액션을 한 플레이어가 선
        firstPlayerId = room.lastBettorId;
      } else if (room.lastWinnerId && eligibleIds.includes(room.lastWinnerId)) {
        // 두 번째 라운드 이후: 직전 라운드 승자가 선
        firstPlayerId = room.lastWinnerId;
      } else if (room.hostId && eligibleIds.includes(room.hostId)) {
        // 첫 라운드: 방장이 선
        firstPlayerId = room.hostId;
      } else {
        // 폴백: eligible 중 입장 순서가 가장 빠른 플레이어
        firstPlayerId = eligibleIds[0];
      }

      // turnOrder: 선 플레이어부터 시작, 입장 순서(인덱스 증가 순)로 순환
      const firstIdx = allPlayerIds.indexOf(firstPlayerId);
      const turnOrder: string[] = [];
      for (let i = 0; i < allPlayerIds.length; i++) {
        const pid = allPlayerIds[(firstIdx + i) % allPlayerIds.length];
        if (eligibleIds.includes(pid)) {
          turnOrder.push(pid);
        }
      }

      // 카드 배분
      const { hands } = shuffleAndDeal(eligible.length);

      for (let i = 0; i < eligible.length; i++) {
        // turnOrder 순서에 맞게 카드 배분
        const targetPlayerId = turnOrder[i];
        const dbP = players.find((p) => p.playerId === targetPlayerId)!;
        await ctx.db.patch(dbP._id, {
          cards: hands[i],
          totalBet: BASE_BET,
          folded: false,
          ready: false,
          balance: dbP.balance - BASE_BET,
          handName: undefined,
          handRank: undefined,
          lastAction: undefined,
          botRaiseCount: 0,
        });
      }

      // 잔액 부족 플레이어 또는 재경기 미참여 플레이어 폴드 처리
      for (const p of players) {
        const isEligible = eligibleIds.includes(p.playerId);
        if (!isEligible) {
          await ctx.db.patch(p._id, { folded: true, ready: false, lastAction: undefined });
        }
      }

      // 누적 판돈(재경기 이월분) + 새 판돈
      const accumulated = room.accumulatedPot ?? 0;

      await ctx.db.patch(room._id, {
        phase: "playing",
        pot: accumulated + turnOrder.length * BASE_BET,
        turnOrder,
        turnIndex: 0,
        currentTurnId: turnOrder[0],
        roundCount: 0,
        totalRoundsPlayed: room.totalRoundsPlayed + 1,
        isRematch: accumulated > 0,
        accumulatedPot: 0,
        lastBettorId: undefined,
        rematchPlayerIds: undefined,
      });
      // 첫 턴 플레이어가 봇이면 행동 스케줄링
      await ctx.scheduler.runAfter(0, internal.bot.checkBotTurn, { roomId: room._id });
    } else {
      // 게임이 아직 시작되지 않았으면, 미준비 봇을 위해 checkBotTurn 재트리거
      // (레이스 컨디션 방지: 봇들이 순차적으로 ready할 때 누락 방지)
      await ctx.scheduler.runAfter(500, internal.bot.checkBotTurn, { roomId: room._id });
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

    // 실제 유저(비봇)가 0명이고 봇만 남은 경우 → 방 즉시 삭제
    const realPlayersRemaining = remaining.filter((p) => !p.isBot);
    if (realPlayersRemaining.length === 0) {
      for (const p of remaining) {
        await ctx.db.delete(p._id);
      }
      await ctx.db.delete(room._id);
      return;
    }

    // 활동 시간 갱신
    await ctx.db.patch(room._id, { lastActivity: Date.now() });

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
async function advanceTurn(ctx: { db: any; scheduler: any }, room: any, players: any[]) {
  const order = room.turnOrder as string[];
  let nextIdx = (room.turnIndex + 1) % order.length;
  let newRoundCount = room.roundCount;

  const wrapping = nextIdx <= room.turnIndex;

  if (wrapping) {
    newRoundCount++;
  }

  // 활성 플레이어 (폴드하지 않은)
  const active = players.filter((p) => !p.folded);

  if (active.length > 1) {
    const maxBet = Math.max(...active.map((p) => p.totalBet));

    // 추가 베팅이 필요한 플레이어: 올인이 아니고(balance > 0), 최대 베팅에 미달
    const needToAct = active.filter((p) => p.balance > 0 && p.totalBet < maxBet);

    // 조건 1: 실제 베팅이 진행된 상태(maxBet > 앤티)에서
    // 모든 플레이어가 최대 베팅에 맞췄거나 올인 → 즉시 쇼다운
    if (needToAct.length === 0 && maxBet > room.baseBet) {
      await determineWinner(ctx, room._id, active, room.pot);
      return;
    }

    // 조건 2: 턴이 한 바퀴 돌았고, 모든 활성 플레이어 베팅 동일 → 쇼다운
    // (체크-체크-체크 등 앤티 상태에서 전원 체크한 경우)
    if (wrapping && active.every((p) => p.totalBet === maxBet)) {
      await determineWinner(ctx, room._id, active, room.pot);
      return;
    }
  }

  // 다음 유효한 플레이어 찾기 (폴드 및 올인 제외)
  let attempts = 0;
  while (attempts < order.length) {
    const candidate = players.find((p) => p.playerId === order[nextIdx]);
    if (candidate && !candidate.folded && candidate.balance > 0) {
      await ctx.db.patch(room._id, {
        turnIndex: nextIdx,
        currentTurnId: order[nextIdx],
        roundCount: newRoundCount,
      });
      // 봇 턴 확인 및 스케줄링
      await ctx.scheduler.runAfter(0, internal.bot.checkBotTurn, { roomId: room._id });
      return;
    }
    nextIdx = (nextIdx + 1) % order.length;
    attempts++;
  }

  // 유효한 플레이어가 없음 (전원 올인 또는 폴드) → 쇼다운
  await determineWinner(ctx, room._id, players.filter((p) => !p.folded), room.pot);
}

// ─────────────────────────────────────────────
// 내부: 족보 비교 → 승자 결정 (특수패 + 동점 재경기)
// ─────────────────────────────────────────────
async function determineWinner(ctx: { db: any; scheduler: any }, roomId: any, players: any[], pot: number) {
  if (players.length === 0) return;

  // 각 플레이어 족보 계산
  const playerHands = players.map((p) => ({
    playerId: p.playerId as string,
    result: calculateRank(p.cards[0], p.cards[1]),
  }));

  // 특수 족보 해석 (구사/멍텅구리구사/암행어사/땡잡이 + 동점 판정)
  const resolution = resolveSpecialHands(playerHands);

  // ── 재경기: 판돈을 accumulatedPot에 누적 후 waiting 전환 ──
  if (resolution.isRematch) {
    // 족보 기록 (최종 해석된 결과 사용)
    for (const { playerId, result } of resolution.results) {
      const dbPlayer = await ctx.db
        .query("players")
        .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
        .filter((q: any) => q.eq(q.field("playerId"), playerId))
        .first();
      if (dbPlayer) {
        await ctx.db.patch(dbPlayer._id, { handName: result.name, handRank: result.rank });
      }
    }

    // 재경기 참여 플레이어 목록 결정
    // 구사/멍텅구리구사 재경기: 모든 활성 플레이어가 참여
    // 일반 동점 재경기: 동점인 플레이어들만 참여
    const hasGusaRematch = resolution.results.some(
      (r) => r.result.special?.type === "gusa" || r.result.special?.type === "mung_gusa"
        || r.result.name === "구사" || r.result.name === "멍텅구리구사",
    );
    let tiedPlayerIds: string[];
    if (hasGusaRematch) {
      // 구사 재경기: 모든 활성(비폴드) 플레이어 참여
      tiedPlayerIds = players.map((p) => p.playerId as string);
    } else {
      // 일반 동점: 가장 높은 rank인 플레이어들만
      const bestRank = Math.max(...resolution.results.map((r) => r.result.rank));
      tiedPlayerIds = resolution.results
        .filter((r) => r.result.rank === bestRank)
        .map((r) => r.playerId);
    }

    // 모든 플레이어 상태 초기화
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
        lastAction: undefined,
      });
    }

    // 현재 pot을 accumulatedPot에 누적
    const room = await ctx.db.get(roomId);
    const prevAccumulated = room?.accumulatedPot ?? 0;

    await ctx.db.patch(roomId, {
      phase: "waiting",
      isRematch: true,
      currentTurnId: undefined,
      turnOrder: [],
      turnIndex: 0,
      roundCount: 0,
      pot: 0,
      accumulatedPot: prevAccumulated + pot,
      // 재경기 시 참여할 무승부 플레이어 목록 저장
      rematchPlayerIds: tiedPlayerIds,
      // lastBettorId는 유지 (재경기 선 결정에 사용)
    });
    // 봇 자동 레디 스케줄링
    await ctx.scheduler.runAfter(0, internal.bot.checkBotTurn, { roomId });
    return;
  }

  // ── 단독 승자: resolveWinner에 최종 해석 결과 전달 ──
  await resolveWinnerWithResults(ctx, roomId, resolution.winnerId!, resolution.results, players, pot);
}

// ─────────────────────────────────────────────
// 내부: 승패 정산 + 파산/인원부족 체크
// (resolveSpecialHands 해석 결과를 직접 사용)
// ─────────────────────────────────────────────
async function resolveWinnerWithResults(
  ctx: { db: any; scheduler: any },
  roomId: any,
  winnerId: string,
  resolvedResults: { playerId: string; result: { rank: number; name: string; score: number } }[],
  players: any[],
  pot: number,
) {
  // 족보 기록 + 승자 잔액 정산 (해석된 결과 사용)
  for (const p of players) {
    const dbPlayer = await ctx.db
      .query("players")
      .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
      .filter((q: any) => q.eq(q.field("playerId"), p.playerId))
      .first();
    if (!dbPlayer) continue;

    // resolvedResults에서 최종 해석된 이름/rank를 가져옴
    const resolved = resolvedResults.find((r) => r.playerId === p.playerId);
    const handName = resolved?.result.name;
    const handRank = resolved?.result.rank;

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
    const endReason = solvent.length === 0 ? "bankruptcy" : "solo_survivor";
    await ctx.db.patch(roomId, {
      phase: "ended",
      currentTurnId: undefined,
      endReason,
      lastWinnerId: winnerId,
    });
  } else {
    await ctx.db.patch(roomId, {
      phase: "result",
      currentTurnId: undefined,
      lastWinnerId: winnerId,
    });
    // 봇 자동 레디 스케줄링
    await ctx.scheduler.runAfter(0, internal.bot.checkBotTurn, { roomId });
  }
}

// ─────────────────────────────────────────────
// Mutation: 전체 방 목록 초기화 (관리자용)
// 실행: npx convex run rooms:clearAllRooms
// ─────────────────────────────────────────────
export const clearAllRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    let deletedRooms = 0;
    let deletedPlayers = 0;

    for (const room of rooms) {
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const p of players) {
        await ctx.db.delete(p._id);
        deletedPlayers++;
      }
      await ctx.db.delete(room._id);
      deletedRooms++;
    }

    return { deletedRooms, deletedPlayers };
  },
});

// ─────────────────────────────────────────────
// Internal Mutation: 비활성 방 자동 삭제 (1분 기준)
// ─────────────────────────────────────────────
export const cleanupInactiveRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60_000; // 1분 전
    const rooms = await ctx.db.query("rooms").collect();

    for (const room of rooms) {
      // lastActivity가 없거나 1분 이상 비활성인 방
      const lastActivity = room.lastActivity ?? 0;
      if (lastActivity > cutoff) continue;

      // 방에 속한 플레이어 모두 삭제
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const p of players) {
        await ctx.db.delete(p._id);
      }
      await ctx.db.delete(room._id);
    }
  },
});

// 다이에 의한 단독 생존자 처리용 (기존 resolveWinner 유지)
async function resolveWinner(
  ctx: { db: any; scheduler: any },
  roomId: any,
  winnerId: string,
  players: any[],
  pot: number,
) {
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

  const allPlayers = await ctx.db
    .query("players")
    .withIndex("by_room", (q: any) => q.eq("roomId", roomId))
    .collect();

  const solvent = allPlayers.filter((p: any) => p.balance >= BASE_BET);

  if (solvent.length < 2) {
    const endReason = solvent.length === 0 ? "bankruptcy" : "solo_survivor";
    await ctx.db.patch(roomId, {
      phase: "ended",
      currentTurnId: undefined,
      endReason,
      lastWinnerId: winnerId,
    });
  } else {
    await ctx.db.patch(roomId, {
      phase: "result",
      currentTurnId: undefined,
      lastWinnerId: winnerId,
    });
    // 봇 자동 레디 스케줄링
    await ctx.scheduler.runAfter(0, internal.bot.checkBotTurn, { roomId });
  }
}

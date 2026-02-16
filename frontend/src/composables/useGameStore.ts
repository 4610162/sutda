// ============================================================
// useGameStore — ConvexClient 직접 사용 (convex/browser)
// convex/vue subpath 없이 onUpdate + mutation API 활용
// ============================================================
import { ref, computed, onMounted, onUnmounted } from "vue";
import { api } from "../convex/api";
import { getConvexClient } from "./convexClient";
import type { BetAction, PublicPlayer, Phase } from "../types";

// ── 브라우저 탭마다 고유 playerId (localStorage 영속) ─────────
function getOrCreatePlayerId(): string {
  const KEY = "sutda_player_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────
export function useGameStore(roomCode: string, playerName: string) {
  const client = getConvexClient();
  const playerId = getOrCreatePlayerId();

  // ── 원시 상태 (Convex DB 레코드 그대로) ──────────────────────
  const roomData = ref<{ room: any; players: any[] } | null>(null);
  const errorMsg = ref("");
  const joined = ref(false);
  const joining = ref(false);

  // ── Convex onUpdate 구독 ──────────────────────────────────
  let unsubscribe: (() => void) | null = null;

  function subscribe() {
    unsubscribe = client.onUpdate(
      api.rooms.getRoom,
      { roomCode },
      (data: any) => {
        roomData.value = data ?? null;
      },
    );
  }

  onMounted(() => {
    subscribe();
    doJoin();
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  // ── 파생 상태 ──────────────────────────────────────────────
  const room = computed(() => roomData.value?.room ?? null);
  const rawPlayers = computed(() => roomData.value?.players ?? []);

  const phase = computed<Phase>(() => room.value?.phase ?? "waiting");
  const pot = computed<number>(() => room.value?.pot ?? 0);
  const baseBet = computed<number>(() => room.value?.baseBet ?? 2000);
  const currentTurnId = computed<string | null>(() => room.value?.currentTurnId ?? null);
  const roundCount = computed<number>(() => room.value?.roundCount ?? 0);
  const hostId = computed<string | null>(() => room.value?.hostId ?? null);
  const totalRoundsPlayed = computed<number>(() => room.value?.totalRoundsPlayed ?? 0);
  const endReason = computed<string | null>(() => room.value?.endReason ?? null);
  const isRematch = computed<boolean>(() => room.value?.isRematch ?? false);
  const turnOrder = computed<string[]>(() => room.value?.turnOrder ?? []);

  /** 카드 숨김 처리: 본인 / result·ended 페이즈만 실제 카드 노출 */
  const players = computed<PublicPlayer[]>(() => {
    const p = phase.value;
    return rawPlayers.value.map((rp: any) => ({
      id: rp.playerId,
      name: rp.name,
      cards: rp.playerId === playerId || p === "result" || p === "ended" ? rp.cards : [],
      cardCount: rp.cards?.length ?? 0,
      totalBet: rp.totalBet,
      folded: rp.folded,
      balance: rp.balance,
      ready: rp.ready,
      isHost: rp.playerId === hostId.value,
      hand: rp.handName != null && rp.handRank != null
        ? { name: rp.handName, rank: rp.handRank }
        : undefined,
      lastAction: rp.lastAction ?? undefined,
    }));
  });

  const myPlayer = computed(() =>
    players.value.find((p) => p.id === playerId) ?? null,
  );
  const otherPlayers = computed(() =>
    players.value.filter((p) => p.id !== playerId),
  );
  const isMyTurn = computed(() => currentTurnId.value === playerId);
  const isHost = computed(() => hostId.value === playerId);

  /** 결과 요약 (WinnerPopup에 전달) — result·ended 페이즈에서 사용 */
  const resultSummary = computed(() => {
    if (phase.value !== "result" && phase.value !== "ended") return null;
    const activePlayers = players.value.filter((p) => !p.folded && p.hand);
    if (activePlayers.length === 0) return null;
    const winner = activePlayers.reduce((best, p) =>
      (p.hand?.rank ?? 0) > (best.hand?.rank ?? 0) ? p : best,
    );
    return {
      winnerId: winner.id,
      winnerName: winner.name,
      winnerHand: winner.hand?.name ?? "",
      pot: pot.value,
      players: players.value,
    };
  });

  // ── 액션 헬퍼 ─────────────────────────────────────────────
  function setError(msg: string) {
    errorMsg.value = msg;
    setTimeout(() => (errorMsg.value = ""), 3000);
  }

  async function doJoin() {
    if (joining.value) return;
    joining.value = true;
    try {
      await client.mutation(api.rooms.joinRoom, {
        roomCode,
        playerName,
        playerId,
      });
      joined.value = true;
    } catch (e: any) {
      setError(e?.data ?? e?.message ?? "입장 실패");
    } finally {
      joining.value = false;
    }
  }

  async function bet(action: BetAction) {
    try {
      await client.mutation(api.rooms.placeBet, { roomCode, playerId, action });
    } catch (e: any) {
      setError(e?.data ?? e?.message ?? "베팅 실패");
    }
  }

  async function setReady() {
    try {
      await client.mutation(api.rooms.setReady, { roomCode, playerId });
    } catch (e: any) {
      setError(e?.data ?? e?.message ?? "레디 실패");
    }
  }

  async function leaveRoom() {
    try {
      await client.mutation(api.rooms.leaveRoom, { roomCode, playerId });
    } catch (e: any) {
      // 나가기 실패는 무시
    }
    joined.value = false;
  }

  return {
    playerId,
    phase,
    players,
    pot,
    baseBet,
    currentTurnId,
    roundCount,
    hostId,
    totalRoundsPlayed,
    endReason,
    isRematch,
    turnOrder,
    errorMsg,
    joined,
    myPlayer,
    otherPlayers,
    isMyTurn,
    isHost,
    resultSummary,
    bet,
    setReady,
    leaveRoom,
  };
}

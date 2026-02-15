import type * as Party from "partykit/server";
import {
  type SutdaCard,
  type HandResult,
  shuffleAndDeal,
  calculateRank,
} from "./logic";

// ============================================================
// 타입 정의
// ============================================================

type Phase = "waiting" | "playing" | "result";
type BetAction = "half" | "quarter" | "die";

interface Player {
  id: string;
  name: string;
  cards: SutdaCard[];
  totalBet: number;
  folded: boolean;
  isHost: boolean;
}

interface RoomState {
  phase: Phase;
  players: Map<string, Player>;
  pot: number;
  baseBet: number;
  currentTurnId: string | null;
  turnOrder: string[];
  turnIndex: number;
  roundCount: number;
  maxRounds: number;
}

// --- 클라이언트로 보내는 플레이어 정보 ---
interface PublicPlayer {
  id: string;
  name: string;
  cardCount: number;
  cards: SutdaCard[];       // 본인 or 결과 페이즈에서만 채워짐
  totalBet: number;
  folded: boolean;
  isHost: boolean;
  hand?: HandResult;        // 결과 페이즈에서만
}

// --- 클라이언트 수신 메시지 ---
type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start" }
  | { type: "bet"; action: BetAction }
  | { type: "restart" };

// ============================================================
// 헬퍼
// ============================================================

function getHostId(players: Map<string, Player>): string | null {
  for (const [id, p] of players) {
    if (p.isHost) return id;
  }
  return null;
}

function buildPublicPlayer(
  player: Player,
  viewerId: string,
  phase: Phase
): PublicPlayer {
  const showCards = player.id === viewerId || phase === "result";
  const pub: PublicPlayer = {
    id: player.id,
    name: player.name,
    cardCount: player.cards.length,
    cards: showCards ? player.cards : [],
    totalBet: player.totalBet,
    folded: player.folded,
    isHost: player.isHost,
  };
  if (phase === "result" && player.cards.length === 2) {
    pub.hand = calculateRank(player.cards[0], player.cards[1]);
  }
  return pub;
}

// ============================================================
// PartyKit 서버
// ============================================================

export default class SutdaServer implements Party.Server {
  private state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = {
      phase: "waiting",
      players: new Map(),
      pot: 0,
      baseBet: 100,
      currentTurnId: null,
      turnOrder: [],
      turnIndex: 0,
      roundCount: 0,
      maxRounds: 2,
    };
  }

  // ---- 연결 / 해제 ----

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "welcome", playerId: conn.id }));
  }

  onClose(conn: Party.Connection) {
    const player = this.state.players.get(conn.id);
    if (!player) return;

    if (this.state.phase === "playing") {
      // 게임 중 퇴장 → 다이 처리
      player.folded = true;

      if (this.state.currentTurnId === conn.id) {
        this.advanceTurn();
      }

      const active = this.getActivePlayers();
      if (active.length === 1) {
        this.resolveWinner(active[0].id);
        return;
      }
      this.broadcastState();
    } else {
      // 대기 중 퇴장 → 제거
      const wasHost = player.isHost;
      this.state.players.delete(conn.id);

      if (wasHost && this.state.players.size > 0) {
        const next = this.state.players.values().next().value!;
        next.isHost = true;
      }
      this.broadcastState();
    }
  }

  // ---- 메시지 라우팅 ----

  onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg.name);
        break;
      case "start":
        this.handleStart(sender);
        break;
      case "bet":
        this.handleBet(sender, msg.action);
        break;
      case "restart":
        this.handleRestart(sender);
        break;
    }
  }

  // ---- join ----

  private handleJoin(conn: Party.Connection, name: string) {
    if (this.state.phase !== "waiting") {
      this.sendError(conn, "게임이 이미 진행 중입니다.");
      return;
    }
    if (this.state.players.size >= 4) {
      this.sendError(conn, "방이 가득 찼습니다 (최대 4명).");
      return;
    }
    if (this.state.players.has(conn.id)) {
      this.state.players.get(conn.id)!.name = name;
      this.broadcastState();
      return;
    }

    const isFirst = this.state.players.size === 0;
    this.state.players.set(conn.id, {
      id: conn.id,
      name: name || `플레이어${this.state.players.size + 1}`,
      cards: [],
      totalBet: 0,
      folded: false,
      isHost: isFirst,
    });
    this.broadcastState();
  }

  // ---- start (방장만) ----

  private handleStart(conn: Party.Connection) {
    if (this.state.phase !== "waiting") return;
    const player = this.state.players.get(conn.id);
    if (!player?.isHost) {
      this.sendError(conn, "방장만 게임을 시작할 수 있습니다.");
      return;
    }
    if (this.state.players.size < 2) {
      this.sendError(conn, "최소 2명이 필요합니다.");
      return;
    }

    // 패 셔플 & 딜
    const playerIds = Array.from(this.state.players.keys());
    const { hands } = shuffleAndDeal(playerIds.length);

    playerIds.forEach((id, i) => {
      const p = this.state.players.get(id)!;
      p.cards = hands[i];
      p.totalBet = 0;
      p.folded = false;
    });

    this.state.phase = "playing";
    this.state.pot = 0;
    this.state.turnOrder = playerIds;
    this.state.turnIndex = 0;
    this.state.currentTurnId = playerIds[0];
    this.state.roundCount = 0;

    this.broadcastState();
  }

  // ---- bet (half / quarter / die) ----

  private handleBet(conn: Party.Connection, action: BetAction) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurnId !== conn.id) {
      this.sendError(conn, "당신의 턴이 아닙니다.");
      return;
    }

    const player = this.state.players.get(conn.id);
    if (!player || player.folded) return;

    // 다이
    if (action === "die") {
      player.folded = true;
      const active = this.getActivePlayers();
      if (active.length === 1) {
        this.resolveWinner(active[0].id);
        return;
      }
      this.advanceTurn();
      this.broadcastState();
      return;
    }

    // 베팅 금액
    let amount: number;
    if (action === "half") {
      amount = Math.max(Math.floor(this.state.pot / 2), this.state.baseBet);
    } else {
      amount = Math.max(Math.floor(this.state.pot / 4), this.state.baseBet);
    }

    player.totalBet += amount;
    this.state.pot += amount;

    this.advanceTurn();
    this.broadcastState();
  }

  // ---- 턴 진행 ----

  private advanceTurn() {
    const order = this.state.turnOrder;
    let nextIdx = (this.state.turnIndex + 1) % order.length;

    if (nextIdx <= this.state.turnIndex) {
      this.state.roundCount++;
    }

    if (this.state.roundCount >= this.state.maxRounds) {
      this.determineWinner();
      return;
    }

    let attempts = 0;
    while (attempts < order.length) {
      const p = this.state.players.get(order[nextIdx]);
      if (p && !p.folded) {
        this.state.turnIndex = nextIdx;
        this.state.currentTurnId = order[nextIdx];
        return;
      }
      nextIdx = (nextIdx + 1) % order.length;
      attempts++;
    }

    this.determineWinner();
  }

  private getActivePlayers(): Player[] {
    return Array.from(this.state.players.values()).filter((p) => !p.folded);
  }

  // ---- 승자 결정 ----

  private determineWinner() {
    const active = this.getActivePlayers();
    if (active.length === 0) return;

    let bestId = active[0].id;
    let bestRank = calculateRank(active[0].cards[0], active[0].cards[1]);

    for (let i = 1; i < active.length; i++) {
      const r = calculateRank(active[i].cards[0], active[i].cards[1]);
      if (r.rank > bestRank.rank) {
        bestRank = r;
        bestId = active[i].id;
      }
    }
    this.resolveWinner(bestId);
  }

  private resolveWinner(winnerId: string) {
    this.state.phase = "result";
    this.state.currentTurnId = null;

    const winner = this.state.players.get(winnerId);
    let winnerHand = "승리";
    if (winner && winner.cards.length === 2) {
      winnerHand = calculateRank(winner.cards[0], winner.cards[1]).name;
    }

    for (const conn of this.room.getConnections()) {
      const players = Array.from(this.state.players.values()).map((p) =>
        buildPublicPlayer(p, conn.id, "result")
      );
      conn.send(
        JSON.stringify({
          type: "result",
          winnerId,
          winnerName: winner?.name || "알 수 없음",
          winnerHand,
          pot: this.state.pot,
          players,
        })
      );
    }
  }

  // ---- restart ----

  private handleRestart(conn: Party.Connection) {
    const player = this.state.players.get(conn.id);
    if (!player?.isHost) {
      this.sendError(conn, "방장만 재시작할 수 있습니다.");
      return;
    }

    this.state.phase = "waiting";
    this.state.pot = 0;
    this.state.currentTurnId = null;
    this.state.turnOrder = [];
    this.state.turnIndex = 0;
    this.state.roundCount = 0;

    // 퇴장한 유저 제거 (현재 연결 중인 유저만 유지)
    const connectedIds = new Set<string>();
    for (const c of this.room.getConnections()) {
      connectedIds.add(c.id);
    }
    for (const [id] of this.state.players) {
      if (!connectedIds.has(id)) {
        this.state.players.delete(id);
      }
    }

    // 방장 재지정
    if (!getHostId(this.state.players) && this.state.players.size > 0) {
      this.state.players.values().next().value!.isHost = true;
    }

    this.state.players.forEach((p) => {
      p.cards = [];
      p.totalBet = 0;
      p.folded = false;
    });

    this.broadcastState();
  }

  // ---- 브로드캐스트 ----

  private broadcastState() {
    const hostId = getHostId(this.state.players);

    for (const conn of this.room.getConnections()) {
      const players = Array.from(this.state.players.values()).map((p) =>
        buildPublicPlayer(p, conn.id, this.state.phase)
      );

      conn.send(
        JSON.stringify({
          type: "sync",
          phase: this.state.phase,
          players,
          pot: this.state.pot,
          baseBet: this.state.baseBet,
          currentTurnId: this.state.currentTurnId,
          turnOrder: this.state.turnOrder,
          roundCount: this.state.roundCount,
          playerId: conn.id,
          hostId,
        })
      );
    }
  }

  private sendError(conn: Party.Connection, message: string) {
    conn.send(JSON.stringify({ type: "error", message }));
  }
}

SutdaServer satisfies Party.Worker;

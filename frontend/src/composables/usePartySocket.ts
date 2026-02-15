import { ref, onMounted, onUnmounted, computed } from "vue";
import PartySocket from "partysocket";
import type {
  ServerMessage,
  SyncMessage,
  ResultMessage,
  PublicPlayer,
  Phase,
  BetAction,
} from "../types";

const PARTY_HOST = import.meta.env.VITE_PARTY_URL || "localhost:1999";

export function usePartySocket(roomId: string, playerName: string) {
  // ---- 상태 ----
  const playerId = ref("");
  const phase = ref<Phase>("waiting");
  const players = ref<PublicPlayer[]>([]);
  const pot = ref(0);
  const baseBet = ref(100);
  const currentTurnId = ref<string | null>(null);
  const turnOrder = ref<string[]>([]);
  const roundCount = ref(0);
  const hostId = ref<string | null>(null);
  const errorMsg = ref("");
  const connected = ref(false);

  // 결과
  const resultData = ref<ResultMessage | null>(null);

  // ---- 파생 상태 ----
  const myPlayer = computed(() =>
    players.value.find((p) => p.id === playerId.value) ?? null
  );
  const otherPlayers = computed(() =>
    players.value.filter((p) => p.id !== playerId.value)
  );
  const isMyTurn = computed(() => currentTurnId.value === playerId.value);
  const isHost = computed(() => hostId.value === playerId.value);

  // ---- 소켓 ----
  let socket: PartySocket | null = null;

  function connect() {
    socket = new PartySocket({
      host: PARTY_HOST,
      room: roomId,
    });

    socket.addEventListener("open", () => {
      connected.value = true;
    });

    socket.addEventListener("close", () => {
      connected.value = false;
    });

    socket.addEventListener("message", (event) => {
      const msg: ServerMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "welcome":
          playerId.value = msg.playerId;
          send({ type: "join", name: playerName });
          break;

        case "sync":
          applySyncState(msg);
          if (msg.phase !== "result") {
            resultData.value = null;
          }
          break;

        case "result":
          resultData.value = msg;
          phase.value = "result";
          // 결과에도 플레이어 정보가 있으므로 갱신
          players.value = msg.players;
          break;

        case "error":
          errorMsg.value = msg.message;
          setTimeout(() => (errorMsg.value = ""), 3000);
          break;
      }
    });
  }

  function applySyncState(msg: SyncMessage) {
    phase.value = msg.phase;
    players.value = msg.players;
    pot.value = msg.pot;
    baseBet.value = msg.baseBet;
    currentTurnId.value = msg.currentTurnId;
    turnOrder.value = msg.turnOrder;
    roundCount.value = msg.roundCount;
    hostId.value = msg.hostId;
  }

  function send(data: Record<string, unknown>) {
    socket?.send(JSON.stringify(data));
  }

  // ---- 액션 ----
  function startGame() {
    send({ type: "start" });
  }

  function bet(action: BetAction) {
    send({ type: "bet", action });
  }

  function restart() {
    send({ type: "restart" });
  }

  function disconnect() {
    socket?.close();
    socket = null;
  }

  // ---- 라이프사이클 ----
  onMounted(() => connect());
  onUnmounted(() => disconnect());

  return {
    // 상태
    playerId,
    phase,
    players,
    pot,
    baseBet,
    currentTurnId,
    turnOrder,
    roundCount,
    hostId,
    errorMsg,
    connected,
    resultData,

    // 파생
    myPlayer,
    otherPlayers,
    isMyTurn,
    isHost,

    // 액션
    startGame,
    bet,
    restart,
    disconnect,
  };
}

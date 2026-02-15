// ============================================================
// useLobbyStore — 로비 방 목록 실시간 구독
// ============================================================
import { ref, onMounted, onUnmounted } from "vue";
import { api } from "/@convex/api";
import { getConvexClient } from "./convexClient";

export interface LobbyRoom {
  _id: string;
  roomCode: string;
  phase: string;
  playerCount: number;
}

export function useLobbyStore() {
  const client = getConvexClient();
  const rooms = ref<LobbyRoom[]>([]);
  const loading = ref(true);

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = client.onUpdate(
      api.rooms.listRooms,
      {},
      (data: any) => {
        rooms.value = (data ?? []) as LobbyRoom[];
        loading.value = false;
      },
    );
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return { rooms, loading };
}

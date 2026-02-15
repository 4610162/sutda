<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useLobbyStore } from "../composables/useLobbyStore";

const emit = defineEmits<{
  join: [name: string, room: string];
}>();

const { rooms, loading } = useLobbyStore();

const playerName = ref("");
const newRoomCode = ref("");
const showCreateForm = ref(false);
const nameError = ref("");

onMounted(() => {
  const saved = localStorage.getItem("sutda_player_name");
  if (saved) playerName.value = saved;
});

function saveName() {
  const trimmed = playerName.value.trim();
  if (trimmed) {
    localStorage.setItem("sutda_player_name", trimmed);
    nameError.value = "";
  }
}

function requireName(): boolean {
  if (!playerName.value.trim()) {
    nameError.value = "닉네임을 먼저 입력해주세요.";
    return false;
  }
  saveName();
  return true;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function handleCreateRoom() {
  if (!requireName()) return;
  const code = newRoomCode.value.trim() || generateCode();
  emit("join", playerName.value.trim(), code);
}

function handleJoinRoom(roomCode: string) {
  if (!requireName()) return;
  emit("join", playerName.value.trim(), roomCode);
}

function phaseLabel(phase: string): string {
  if (phase === "waiting") return "대기 중";
  if (phase === "playing") return "게임 중";
  if (phase === "result")  return "결과 중";
  return phase;
}

function canJoin(room: { phase: string; playerCount: number }): boolean {
  return room.phase === "waiting" && room.playerCount < 4;
}
</script>

<template>
  <div class="w-full max-w-lg mx-auto space-y-4">
    <!-- 닉네임 입력 -->
    <div class="bg-gray-800 rounded-xl p-5 shadow-xl">
      <label class="block text-sm text-gray-300 mb-1.5">닉네임</label>
      <input
        v-model="playerName"
        type="text"
        placeholder="닉네임을 입력하세요"
        maxlength="10"
        @blur="saveName"
        @keyup.enter="showCreateForm = true"
        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
               text-white placeholder-gray-400 focus:outline-none focus:border-sutda-gold"
      />
      <p v-if="nameError" class="text-red-400 text-xs mt-1.5">{{ nameError }}</p>
    </div>

    <!-- 방 목록 -->
    <div class="bg-gray-800 rounded-xl p-5 shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-bold text-white">열린 방</h2>
        <button
          @click="showCreateForm = !showCreateForm"
          class="btn-primary text-sm px-4 py-1.5"
        >
          {{ showCreateForm ? "취소" : "방 만들기" }}
        </button>
      </div>

      <!-- 방 만들기 폼 -->
      <Transition name="slide">
        <div v-if="showCreateForm" class="bg-gray-700 rounded-lg p-4 mb-4">
          <label class="block text-xs text-gray-400 mb-1.5">
            방 코드 (비워두면 자동 생성)
          </label>
          <div class="flex gap-2">
            <input
              v-model="newRoomCode"
              type="text"
              placeholder="예: ROOM1"
              maxlength="20"
              @keyup.enter="handleCreateRoom"
              class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg
                     text-white placeholder-gray-400 focus:outline-none focus:border-sutda-gold text-sm"
            />
            <button @click="handleCreateRoom" class="btn-primary text-sm px-4 py-2">
              만들기
            </button>
          </div>
        </div>
      </Transition>

      <!-- 목록 로딩 -->
      <div v-if="loading" class="text-center text-gray-400 py-8 text-sm">
        <span class="animate-pulse">방 목록 로딩 중...</span>
      </div>

      <!-- 빈 목록 -->
      <div v-else-if="rooms.length === 0" class="text-center text-gray-500 py-8 text-sm">
        열린 방이 없습니다.<br />
        <span class="text-sutda-gold/70">'방 만들기'로 새 방을 열어보세요!</span>
      </div>

      <!-- 방 목록 -->
      <div v-else class="space-y-2">
        <div
          v-for="room in rooms"
          :key="room._id"
          class="flex items-center justify-between bg-gray-700/70 rounded-lg px-4 py-3
                 border border-gray-600/40"
        >
          <div class="min-w-0">
            <span class="text-white font-semibold">{{ room.roomCode }}</span>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-gray-400 text-xs">{{ room.playerCount }}/4명</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="
                  room.phase === 'waiting'
                    ? 'bg-green-800/70 text-green-300'
                    : 'bg-yellow-800/70 text-yellow-300'
                "
              >
                {{ phaseLabel(room.phase) }}
              </span>
            </div>
          </div>
          <button
            @click="handleJoinRoom(room.roomCode)"
            :disabled="!canJoin(room)"
            class="btn-secondary text-sm px-4 py-1.5 ml-3 shrink-0"
            :class="{ 'opacity-40 cursor-not-allowed': !canJoin(room) }"
          >
            입장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-enter-to,
.slide-leave-from {
  max-height: 120px;
}
</style>

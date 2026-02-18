<script setup lang="ts">
import { ref } from "vue";
import Lobby from "./components/Lobby.vue";
import Game from "./components/Game.vue";

const playerName = ref("");
const roomCode = ref("");
const joined = ref(false);

function handleJoin(name: string, room: string) {
  playerName.value = name;
  roomCode.value = room;
  joined.value = true;
}

function handleLeave() {
  joined.value = false;
}
</script>

<template>
  <!-- 로비: 중앙 정렬 + 제목 -->
  <div v-if="!joined" class="min-h-screen flex flex-col items-center justify-center p-4">
    <h1 class="text-4xl font-bold text-sutda-gold mb-8">섯다</h1>
    <Lobby @join="handleJoin" />
  </div>

  <!-- 게임: 스크롤 없이 뷰포트에 맞춤 -->
  <div v-else class="game-viewport">
    <Game
      :player-name="playerName"
      :room-code="roomCode"
      @leave="handleLeave"
    />
  </div>
</template>

<style scoped>
.game-viewport {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}
@media (min-width: 640px) {
  .game-viewport {
    padding: 1rem;
  }
}
</style>

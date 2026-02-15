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
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <h1 class="text-4xl font-bold text-sutda-gold mb-8">섯다</h1>

    <Lobby v-if="!joined" @join="handleJoin" />

    <Game
      v-else
      :player-name="playerName"
      :room-code="roomCode"
      @leave="handleLeave"
    />
  </div>
</template>

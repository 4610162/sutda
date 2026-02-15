<script setup lang="ts">
import { usePartySocket } from "../composables/usePartySocket";
import PlayerSlot from "./PlayerSlot.vue";
import SutdaCard from "./SutdaCard.vue";
import WinnerPopup from "./WinnerPopup.vue";

const props = defineProps<{
  playerName: string;
  roomId: string;
}>();

const emit = defineEmits<{
  leave: [];
}>();

const {
  phase,
  players,
  pot,
  currentTurnId,
  roundCount,
  errorMsg,
  connected,
  resultData,
  myPlayer,
  otherPlayers,
  isMyTurn,
  isHost,
  startGame,
  bet,
  restart,
  disconnect,
} = usePartySocket(props.roomId, props.playerName);

function handleLeave() {
  disconnect();
  emit("leave");
}

function handleRestart() {
  restart();
}
</script>

<template>
  <div class="w-full max-w-5xl mx-auto">
    <!-- 상단 바 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <span class="text-gray-400 text-sm">
          방: <span class="text-white font-medium">{{ roomId }}</span>
        </span>
        <span
          class="w-2 h-2 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-red-500'"
        ></span>
      </div>
      <button @click="handleLeave" class="text-gray-400 hover:text-white text-sm transition-colors">
        나가기
      </button>
    </div>

    <!-- 에러 메시지 -->
    <Transition name="slide">
      <div
        v-if="errorMsg"
        class="bg-red-900/60 border border-red-500 text-red-200 px-4 py-2
               rounded-lg mb-4 text-center text-sm"
      >
        {{ errorMsg }}
      </div>
    </Transition>

    <!-- ====== 게임 테이블 ====== -->
    <div
      class="relative bg-gradient-to-b from-sutda-green/90 to-emerald-900/90
             border-4 border-sutda-gold/40 rounded-3xl
             p-6 min-h-[500px] flex flex-col shadow-2xl"
    >
      <!-- 상단: 다른 플레이어들 -->
      <div class="flex justify-center gap-6 flex-wrap">
        <PlayerSlot
          v-for="p in otherPlayers"
          :key="p.id"
          :player="p"
          :is-current-turn="currentTurnId === p.id"
          :phase="phase"
        />
        <!-- 빈 슬롯 -->
        <div
          v-for="i in Math.max(0, 1 - otherPlayers.length)"
          :key="'empty-' + i"
          class="flex flex-col items-center gap-2 p-3 opacity-30"
        >
          <div class="player-avatar bg-gray-700 border-dashed">?</div>
          <span class="text-sm text-gray-500">대기 중</span>
        </div>
      </div>

      <!-- 중앙: 판돈 & 상태 -->
      <div class="flex-1 flex flex-col items-center justify-center my-8">
        <!-- 판돈 -->
        <div
          v-if="phase !== 'waiting'"
          class="bg-black/30 rounded-2xl px-8 py-4 text-center"
        >
          <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">판돈</div>
          <div class="text-sutda-gold text-3xl font-bold">
            {{ pot.toLocaleString() }}
          </div>
          <div v-if="phase === 'playing'" class="text-gray-400 text-xs mt-1">
            라운드 {{ roundCount + 1 }}
          </div>
        </div>

        <!-- 대기 중 메시지 -->
        <div v-if="phase === 'waiting'" class="text-center">
          <div class="text-gray-300 text-lg mb-2">
            플레이어 대기 중 ({{ players.length }}/4)
          </div>
          <div class="flex gap-2 justify-center mb-4">
            <div
              v-for="i in 4"
              :key="i"
              class="w-3 h-3 rounded-full"
              :class="i <= players.length ? 'bg-green-500' : 'bg-gray-600'"
            ></div>
          </div>
          <button
            v-if="isHost && players.length >= 2"
            @click="startGame"
            class="btn-primary text-lg px-10 py-3"
          >
            게임 시작
          </button>
          <p v-else-if="!isHost" class="text-gray-400 text-sm">
            방장이 게임을 시작합니다
          </p>
          <p v-else class="text-gray-400 text-sm">
            최소 2명이 필요합니다
          </p>
        </div>
      </div>

      <!-- 하단: 내 영역 -->
      <div class="flex flex-col items-center gap-4">
        <!-- 내 카드 -->
        <div class="flex gap-3">
          <template v-if="myPlayer?.cards?.length">
            <SutdaCard
              v-for="(card, idx) in myPlayer.cards"
              :key="card.id"
              :month="card.month"
              :is-kwang="card.isKwang"
              :face-up="true"
            />
          </template>
        </div>

        <!-- 내 이름 & 정보 -->
        <div class="flex items-center gap-2">
          <div
            class="player-avatar text-sm"
            :class="isMyTurn ? 'bg-yellow-600 border-yellow-400' : 'bg-blue-700 border-blue-500'"
          >
            {{ (myPlayer?.name || playerName).charAt(0) }}
          </div>
          <div>
            <span class="font-semibold" :class="isMyTurn ? 'text-yellow-300' : 'text-white'">
              {{ myPlayer?.name || playerName }}
            </span>
            <span v-if="myPlayer?.isHost" class="ml-1 text-xs text-sutda-gold">(방장)</span>
            <div v-if="myPlayer?.totalBet" class="text-xs text-yellow-300">
              내 베팅: {{ myPlayer.totalBet.toLocaleString() }}
            </div>
          </div>
        </div>

        <!-- 족보 표시 (결과 시) -->
        <div
          v-if="phase === 'result' && myPlayer?.hand"
          class="bg-sutda-gold/20 text-sutda-gold px-4 py-1 rounded-full text-sm font-bold"
        >
          {{ myPlayer.hand.name }}
        </div>

        <!-- 베팅 버튼 -->
        <div v-if="phase === 'playing'" class="flex items-center gap-3">
          <button
            @click="bet('half')"
            :disabled="!isMyTurn || myPlayer?.folded"
            class="btn-primary"
          >
            하프
          </button>
          <button
            @click="bet('quarter')"
            :disabled="!isMyTurn || myPlayer?.folded"
            class="btn-secondary"
          >
            쿼터
          </button>
          <button
            @click="bet('die')"
            :disabled="!isMyTurn || myPlayer?.folded"
            class="btn-danger"
          >
            다이
          </button>
        </div>

        <!-- 내 턴 안내 -->
        <p
          v-if="phase === 'playing' && !isMyTurn && !myPlayer?.folded"
          class="text-gray-400 text-sm animate-pulse"
        >
          상대방의 턴을 기다리는 중...
        </p>
        <p
          v-if="phase === 'playing' && myPlayer?.folded"
          class="text-gray-500 text-sm"
        >
          다이 처리됨
        </p>
      </div>
    </div>

    <!-- ====== 승자 팝업 ====== -->
    <WinnerPopup
      v-if="resultData"
      :result="resultData"
      :is-host="isHost"
      @restart="handleRestart"
      @close="() => {}"
    />
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

<script setup lang="ts">
import type { ResultMessage } from "../types";

defineProps<{
  result: ResultMessage;
  isHost: boolean;
}>();

const emit = defineEmits<{
  restart: [];
  close: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="popup">
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 배경 오버레이 -->
        <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>

        <!-- 팝업 카드 -->
        <div
          class="relative bg-gray-800 border-2 border-sutda-gold rounded-2xl
                 p-8 w-full max-w-md shadow-2xl animate-bounce-in"
        >
          <!-- 승자 타이틀 -->
          <div class="text-center mb-6">
            <div class="text-5xl mb-2">&#127942;</div>
            <h2 class="text-2xl font-bold text-sutda-gold">
              {{ result.winnerName }} 승리!
            </h2>
            <p class="text-yellow-300 text-lg mt-1">
              {{ result.winnerHand }}
            </p>
            <p class="text-gray-300 mt-2">
              획득 금액: <span class="text-sutda-gold font-bold">{{ result.pot.toLocaleString() }}</span>
            </p>
          </div>

          <!-- 전체 결과 테이블 -->
          <div class="space-y-2 mb-6">
            <div
              v-for="player in result.players"
              :key="player.id"
              class="flex items-center justify-between px-4 py-2.5 rounded-lg"
              :class="{
                'bg-sutda-gold/20 border border-sutda-gold/40': player.id === result.winnerId,
                'bg-gray-700/60': player.id !== result.winnerId,
              }"
            >
              <div class="flex items-center gap-2">
                <span
                  v-if="player.id === result.winnerId"
                  class="text-sutda-gold"
                >&#127942;</span>
                <span :class="{ 'line-through text-gray-500': player.folded }">
                  {{ player.name }}
                </span>
              </div>
              <span
                class="font-bold"
                :class="{
                  'text-sutda-gold': player.id === result.winnerId,
                  'text-gray-400': player.folded,
                  'text-white': player.id !== result.winnerId && !player.folded,
                }"
              >
                {{ player.folded ? "다이" : player.hand?.name ?? "-" }}
              </span>
            </div>
          </div>

          <!-- 다시하기 버튼 -->
          <button
            v-if="isHost"
            @click="emit('restart')"
            class="btn-primary w-full text-center"
          >
            다시 하기
          </button>
          <p v-else class="text-center text-gray-400 text-sm">
            방장이 다시 시작할 수 있습니다
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  60% {
    transform: scale(1.03) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-bounce-in {
  animation: bounce-in 0.5s ease-out;
}
.popup-enter-active {
  transition: opacity 0.3s ease;
}
.popup-leave-active {
  transition: opacity 0.2s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}
</style>

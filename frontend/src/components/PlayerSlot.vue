<script setup lang="ts">
import { computed } from "vue";
import type { PublicPlayer, Phase } from "../types";
import SutdaCard from "./SutdaCard.vue";

const props = defineProps<{
  player: PublicPlayer;
  isCurrentTurn: boolean;
  phase: Phase;
  isMe?: boolean;
  isWinner?: boolean;
  position?: "left" | "right" | "top";
}>();

// 베팅 액션: 새로운 베팅이 발생하여 값이 업데이트될 때까지 유지
const visibleAction = computed(() => props.player.lastAction);
</script>

<template>
  <div
    class="player-slot flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-xl transition-all duration-300"
    :class="[
      {
        'ring-2 ring-yellow-400 bg-yellow-400/10': isCurrentTurn && !player.folded,
        'opacity-40': player.folded,
        'ring-2 ring-sutda-gold bg-sutda-gold/10': isWinner && phase === 'result' && !player.folded,
      },
      position === 'left' || position === 'right' ? 'player-slot--side' : '',
    ]"
  >
    <!-- 이름 + 뱃지 + 액션 (한 줄) -->
    <div class="flex items-center gap-1 max-w-full flex-wrap justify-center">
      <span
        class="text-xs sm:text-sm font-bold max-w-[80px] sm:max-w-[100px] truncate"
        :class="{
          'text-yellow-300': isCurrentTurn && !player.folded && !isWinner,
          'text-sutda-gold': isWinner && phase === 'result' && !player.folded,
          'text-gray-400 line-through': player.folded,
          'text-white': !isCurrentTurn && !player.folded && !isWinner,
        }"
      >
        {{ player.name }}
      </span>
      <span
        v-if="player.isBot"
        class="text-[10px] bg-purple-500/80 text-white px-1 py-0.5 rounded-full font-bold leading-none"
      >봇</span>
      <span
        v-else-if="player.isHost"
        class="text-[10px] bg-sutda-gold/80 text-black px-1 py-0.5 rounded-full font-bold leading-none"
      >방장</span>
      <!-- 승리 배지 (이름 옆) -->
      <span
        v-if="isWinner && phase === 'result' && !player.folded"
        class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sutda-gold text-black animate-pulse"
      >
        승리
      </span>
      <!-- 베팅 액션 (이름 옆) -->
      <Transition name="action-fade">
        <span
          v-if="visibleAction && phase === 'playing'"
          class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black whitespace-nowrap"
        >
          {{ visibleAction }}
        </span>
      </Transition>
    </div>

    <!-- 카드 영역 -->
    <div class="card-area flex gap-1 flex-shrink-0">
      <template v-if="player.cards.length > 0">
        <SutdaCard
          v-for="card in player.cards"
          :key="card.id"
          :card="card"
          :face-up="true"
        />
      </template>
      <template v-else-if="player.cardCount > 0">
        <div v-for="i in player.cardCount" :key="i" class="sutda-card-back"></div>
      </template>
    </div>

    <!-- 족보 (result 때만 표시, 공간 예약 없이) -->
    <span
      v-if="(phase === 'result' || phase === 'ended') && player.hand"
      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      :class="player.folded ? 'bg-gray-700 text-gray-400' : 'bg-sutda-gold/20 text-sutda-gold'"
    >
      {{ player.folded ? '다이' : player.hand.name }}
    </span>

    <!-- 잔액 + 베팅 (한 줄) -->
    <div class="flex items-center gap-1.5 text-[10px]">
      <span class="text-green-300/70">{{ player.balance.toLocaleString() }}원</span>
      <span v-if="player.totalBet > 0" class="text-yellow-300">베팅 {{ player.totalBet.toLocaleString() }}원</span>
    </div>

    <!-- 레디 표시 (result 때만) -->
    <span
      v-if="phase === 'result' && player.ready"
      class="text-[10px] font-bold text-green-400"
    >
      준비완료
    </span>
  </div>
</template>

<style scoped>
.player-slot {
  min-width: 100px;
  width: 100px;
  position: relative;
  z-index: 0;
  isolation: isolate;
  overflow: visible;
}
@media (min-width: 640px) {
  .player-slot {
    min-width: 130px;
    width: 130px;
  }
}

.player-slot--side {
  width: 100px;
  min-width: 100px;
}
@media (min-width: 640px) {
  .player-slot--side {
    width: 130px;
    min-width: 130px;
  }
}

.card-area {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.action-fade-enter-active {
  transition: all 0.3s ease;
}
.action-fade-leave-active {
  transition: all 0.5s ease;
}
.action-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.8);
}
.action-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.8);
}
</style>

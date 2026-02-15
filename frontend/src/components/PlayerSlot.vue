<script setup lang="ts">
import type { PublicPlayer, Phase } from "../types";
import SutdaCard from "./SutdaCard.vue";

const props = defineProps<{
  player: PublicPlayer;
  isCurrentTurn: boolean;
  phase: Phase;
  isMe?: boolean;
}>();

const AVATAR_COLORS = [
  "bg-blue-600", "bg-green-600", "bg-purple-600", "bg-pink-600",
  "bg-cyan-600", "bg-orange-600", "bg-teal-600", "bg-indigo-600",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}
</script>

<template>
  <div
    class="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300"
    :class="{
      'ring-2 ring-yellow-400 bg-yellow-400/10': isCurrentTurn && !player.folded,
      'opacity-40': player.folded,
    }"
  >
    <!-- 아바타 -->
    <div class="relative">
      <div class="player-avatar" :class="avatarColor(player.name)">
        {{ player.name.charAt(0) }}
      </div>
      <span
        v-if="player.isHost"
        class="absolute -top-1 -right-1 text-[10px] bg-sutda-gold text-black
               rounded-full w-4 h-4 flex items-center justify-center font-bold"
      >
        H
      </span>
    </div>

    <!-- 이름 -->
    <span
      class="text-sm font-semibold max-w-[80px] truncate"
      :class="{
        'text-yellow-300': isCurrentTurn && !player.folded,
        'text-gray-400 line-through': player.folded,
        'text-white': !isCurrentTurn && !player.folded,
      }"
    >
      {{ player.name }}
    </span>

    <!-- 카드 영역 -->
    <div class="flex gap-1.5">
      <template v-if="player.cards.length > 0">
        <SutdaCard
          v-for="(card, idx) in player.cards"
          :key="card.id"
          :month="card.month"
          :is-kwang="card.isKwang"
          :face-up="true"
        />
      </template>
      <template v-else-if="player.cardCount > 0">
        <!-- 뒷면 카드 -->
        <div v-for="i in player.cardCount" :key="i" class="sutda-card-back">
          <span class="text-sutda-gold text-xl font-serif">花</span>
        </div>
      </template>
    </div>

    <!-- 족보 (결과 시) -->
    <span
      v-if="phase === 'result' && player.hand"
      class="text-xs font-bold px-2 py-0.5 rounded-full"
      :class="{
        'bg-sutda-gold/20 text-sutda-gold': !player.folded,
        'bg-gray-700 text-gray-400': player.folded,
      }"
    >
      {{ player.folded ? "다이" : player.hand.name }}
    </span>

    <!-- 베팅 금액 -->
    <span v-if="player.totalBet > 0" class="text-xs text-yellow-300">
      {{ player.totalBet.toLocaleString() }}
    </span>
  </div>
</template>

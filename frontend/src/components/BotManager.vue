<script setup lang="ts">
import { computed } from "vue";
import { BOT_DEFINITIONS, type PublicPlayer } from "../types";

const props = defineProps<{
  botPlayers: PublicPlayer[];
  playerCount: number;
}>();

const emit = defineEmits<{
  addBot: [botName: string];
  removeBot: [botPlayerId: string];
}>();

const isFull = computed(() => props.playerCount >= 7);

/** 이미 방에 추가된 봇 이름 목록 */
const addedBotNames = computed(() =>
  new Set(props.botPlayers.map((p) => p.name)),
);

/** 순서대로 추가할 다음 봇 */
const nextBot = computed(() =>
  BOT_DEFINITIONS.find((b) => !addedBotNames.value.has(b.name)) ?? null,
);

const canAddBot = computed(() => !isFull.value && nextBot.value !== null);
</script>

<template>
  <div class="bg-black/20 rounded-xl p-2 space-y-1.5 max-w-[120px] mx-auto">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-xs font-bold text-gray-300 uppercase tracking-wider whitespace-nowrap">
        BOT 추가
      </h3>
      <button
        :disabled="!canAddBot"
        @click="canAddBot && emit('addBot', nextBot!.name)"
        class="flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium
               transition-all duration-200 whitespace-nowrap flex-shrink-0"
        :class="canAddBot
          ? 'border-sutda-gold/50 bg-sutda-gold/10 text-sutda-gold hover:bg-sutda-gold/20 hover:border-sutda-gold'
          : 'border-gray-700 bg-gray-800/50 text-gray-600 cursor-not-allowed'"
      >
        <span class="leading-none">+</span>
      </button>
    </div>

    <!-- 추가 불가 안내 -->
    <p v-if="isFull" class="text-[10px] text-gray-500">
      FULL (최대 7명)
    </p>
    <p v-else-if="!nextBot" class="text-[10px] text-gray-500">
      모든 봇이 추가되었습니다
    </p>

    <!-- 참여 중인 봇 목록 -->
    <div v-if="botPlayers.length > 0">
      <div class="space-y-1">
        <div
          v-for="bot in botPlayers"
          :key="bot.id"
          class="flex items-center justify-between bg-gray-700/40 rounded-lg px-2 py-1.5
                 border border-gray-600/30"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <div
              class="w-5 h-5 rounded-full bg-purple-700 border border-purple-400
                     flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            >
              {{ bot.name.charAt(0) }}
            </div>
            <span class="text-xs text-white font-medium truncate">{{ bot.name }}</span>
          </div>
          <button
            @click="emit('removeBot', bot.id)"
            class="text-red-500 hover:text-red-300 transition-colors
                   w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/30 flex-shrink-0 ml-1"
            title="봇 제거"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BOT_DEFINITIONS, type PublicPlayer, type BotDefinition } from "../types";

const props = defineProps<{
  botPlayers: PublicPlayer[];
  playerCount: number;
}>();

const emit = defineEmits<{
  addBot: [botName: string];
  removeBot: [botPlayerId: string];
}>();

const isFull = computed(() => props.playerCount >= 4);

/** 이미 방에 추가된 봇 이름 목록 */
const addedBotNames = computed(() =>
  new Set(props.botPlayers.map((p) => p.name)),
);

/** 추가 가능한 봇 목록 */
const availableBots = computed<BotDefinition[]>(() =>
  BOT_DEFINITIONS.filter((b) => !addedBotNames.value.has(b.name)),
);

function personalityLabel(personality: string): string {
  return personality === "aggressive" ? "공격형" : "수비형";
}

function personalityColor(personality: string): string {
  return personality === "aggressive"
    ? "text-red-400 bg-red-900/40 border-red-700/50"
    : "text-blue-400 bg-blue-900/40 border-blue-700/50";
}
</script>

<template>
  <div class="bg-black/20 rounded-xl p-4 space-y-3">
    <h3 class="text-sm font-bold text-gray-300 uppercase tracking-wider">
      봇 관리
    </h3>

    <!-- ── 봇 선택 (BotSelector) ── -->
    <div v-if="availableBots.length > 0 && !isFull">
      <p class="text-xs text-gray-500 mb-2">봇을 추가하려면 클릭하세요</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="bot in availableBots"
          :key="bot.name"
          @click="emit('addBot', bot.name)"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-600
                 bg-gray-700/50 hover:bg-gray-600/70 hover:border-sutda-gold/50
                 transition-all duration-200 text-sm group"
        >
          <span class="text-white group-hover:text-sutda-gold transition-colors">
            {{ bot.name }}
          </span>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded border"
            :class="personalityColor(bot.personality)"
          >
            {{ personalityLabel(bot.personality) }}
          </span>
          <span class="text-green-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            +
          </span>
        </button>
      </div>
    </div>
    <p v-else-if="isFull" class="text-xs text-gray-500">
      방이 가득 찼습니다 (최대 4명)
    </p>
    <p v-else class="text-xs text-gray-500">
      모든 봇이 추가되었습니다
    </p>

    <!-- ── 활성 봇 리스트 (ActiveBotList) ── -->
    <div v-if="botPlayers.length > 0">
      <p class="text-xs text-gray-500 mb-2">참여 중인 봇</p>
      <div class="space-y-1.5">
        <div
          v-for="bot in botPlayers"
          :key="bot.id"
          class="flex items-center justify-between bg-gray-700/40 rounded-lg px-3 py-2
                 border border-gray-600/30"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full bg-purple-700 border-2 border-purple-400
                     flex items-center justify-center text-xs font-bold text-white"
            >
              {{ bot.name.charAt(0) }}
            </div>
            <div>
              <span class="text-sm text-white font-medium">{{ bot.name }}</span>
              <span class="text-[10px] text-gray-400 ml-1.5">BOT</span>
            </div>
            <span v-if="bot.ready" class="text-[10px] text-green-400 font-bold">
              준비완료
            </span>
          </div>
          <button
            @click="emit('removeBot', bot.id)"
            class="text-xs text-gray-500 hover:text-red-400 transition-colors
                   px-2 py-1 rounded hover:bg-red-900/30"
            title="봇 제거"
          >
            제거
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

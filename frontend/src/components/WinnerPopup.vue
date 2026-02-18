<script setup lang="ts">
import type { PublicPlayer, Phase } from "../types";

interface ResultSummary {
  winnerId: string;
  winnerName: string;
  winnerHand: string;
  pot: number;
  players: PublicPlayer[];
}

defineProps<{
  result: ResultSummary;
  myPlayerId: string;
  phase: Phase;
  myPlayerReady: boolean;
  endReason?: string;
}>();

const emit = defineEmits<{
  ready: [];
  goToLobby: [];
}>();
</script>

<template>
  <Teleport to="body">
    <!-- 전체 오버레이: fixed로 게임판에 영향 없음 -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="absolute inset-0 bg-black/75"></div>

      <!-- 팝업 카드: 모바일 최적화 -->
      <div
        class="relative z-10 bg-gray-800 border-2 rounded-xl sm:rounded-2xl
               p-4 sm:p-8 w-full max-w-sm sm:max-w-md max-h-[85dvh] overflow-y-auto
               shadow-2xl animate-bounce-in"
        :class="phase === 'ended' ? 'border-red-500' : 'border-sutda-gold'"
      >
        <!-- ── 게임 종료 헤더 ── -->
        <template v-if="phase === 'ended'">
          <div class="text-center mb-4 sm:mb-6">
            <div class="text-3xl sm:text-5xl mb-2">💸</div>
            <h2 class="text-xl sm:text-2xl font-bold text-red-400">게임 종료</h2>
            <p class="text-gray-300 mt-1.5 sm:mt-2 text-xs sm:text-sm">
              {{
                endReason === "bankruptcy"
                  ? "모든 플레이어가 파산했습니다."
                  : endReason === "solo_survivor"
                  ? "게임을 계속할 플레이어가 부족합니다."
                  : "게임이 종료되었습니다."
              }}
            </p>
          </div>
        </template>

        <!-- ── 라운드 결과 헤더 ── -->
        <template v-else>
          <div class="text-center mb-4 sm:mb-6">
            <div class="text-3xl sm:text-5xl mb-2">🏆</div>
            <h2 class="text-xl sm:text-2xl font-bold text-sutda-gold">
              {{ result.winnerName }} 승리!
            </h2>
            <p class="text-yellow-300 text-sm sm:text-lg mt-1">{{ result.winnerHand }}</p>
            <p class="text-gray-300 mt-1.5 sm:mt-2 text-xs sm:text-base">
              획득 금액:
              <span class="text-sutda-gold font-bold">
                {{ result.pot.toLocaleString() }}원
              </span>
            </p>
          </div>
        </template>

        <!-- ── 전체 결과 테이블 ── -->
        <div class="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
          <div
            v-for="player in result.players"
            :key="player.id"
            class="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-sm"
            :class="{
              'bg-sutda-gold/20 border border-sutda-gold/40': player.id === result.winnerId,
              'bg-gray-700/60': player.id !== result.winnerId,
            }"
          >
            <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span v-if="player.id === result.winnerId" class="text-sutda-gold shrink-0">🏆</span>
              <span
                class="truncate"
                :class="{
                  'line-through text-gray-500': player.folded,
                  'text-white': !player.folded,
                }"
              >
                {{ player.name }}
                <span v-if="player.id === myPlayerId" class="text-[10px] sm:text-xs text-gray-400">(나)</span>
              </span>
            </div>
            <div class="text-right shrink-0 ml-2">
              <span
                class="font-bold text-xs sm:text-sm"
                :class="{
                  'text-sutda-gold': player.id === result.winnerId,
                  'text-gray-400': player.folded,
                  'text-white': player.id !== result.winnerId && !player.folded,
                }"
              >
                {{ player.folded ? "다이" : (player.hand?.name ?? "-") }}
              </span>
              <div class="text-[10px] sm:text-xs text-green-300">
                잔액 {{ player.balance.toLocaleString() }}원
              </div>
            </div>
          </div>
        </div>

        <!-- ── 액션 버튼: 터치 친화적 크기 ── -->
        <div v-if="phase === 'ended'">
          <button
            @click="emit('goToLobby')"
            class="btn-primary w-full text-center py-3 text-sm sm:text-base min-h-[48px]"
          >
            로비로 돌아가기
          </button>
        </div>
        <div v-else>
          <button
            v-if="!myPlayerReady"
            @click="emit('ready')"
            class="btn-primary w-full text-center py-3 text-sm sm:text-base min-h-[48px]"
          >
            다음 라운드 준비
          </button>
          <p v-else class="text-center text-green-400 text-xs sm:text-sm animate-pulse py-3">
            다른 플레이어를 기다리는 중...
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes bounce-in {
  0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
  60%  { transform: scale(1.03) translateY(-5px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-bounce-in { animation: bounce-in 0.5s ease-out; }
</style>

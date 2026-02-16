<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../composables/useGameStore";
import PlayerSlot from "./PlayerSlot.vue";
import SutdaCard from "./SutdaCard.vue";
import WinnerPopup from "./WinnerPopup.vue";
import HandGuide from "./HandGuide.vue";

const props = defineProps<{
  playerName: string;
  roomCode: string;
}>();

const emit = defineEmits<{ leave: [] }>();

const showHandGuide = ref(false);

const {
  playerId,
  phase,
  players,
  pot,
  currentTurnId,
  roundCount,
  totalRoundsPlayed,
  endReason,
  isRematch,
  turnOrder,
  errorMsg,
  resultSummary,
  myPlayer,
  otherPlayers,
  isMyTurn,
  bet,
  setReady,
  leaveRoom,
} = useGameStore(props.roomCode, props.playerName);

// 현재 활성 플레이어 중 최고 베팅액
const maxActiveBet = computed(() => {
  const active = players.value.filter((p) => !p.folded);
  return active.length > 0 ? Math.max(...active.map((p) => p.totalBet)) : 0;
});

// 나보다 높은 베팅이 있는지 (콜/따당 필요 여부)
const hasRaise = computed(() => {
  if (!myPlayer.value) return false;
  return maxActiveBet.value > myPlayer.value.totalBet;
});

// 내가 선(첫 번째) 플레이어인지
const isFirstPlayer = computed(() => {
  return turnOrder.value.length > 0 && turnOrder.value[0] === playerId;
});

// 라운드 결과에서 승자 ID
const winnerId = computed(() => resultSummary.value?.winnerId ?? null);

async function handleLeave() {
  await leaveRoom();
  emit("leave");
}
</script>

<template>
  <div class="w-full max-w-5xl mx-auto">
    <!-- 상단 바 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <span class="text-gray-400 text-sm">
          방: <span class="text-white font-medium">{{ roomCode }}</span>
        </span>
        <span class="text-gray-400 text-xs">{{ totalRoundsPlayed }}판 진행</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="showHandGuide = true"
          class="text-gray-400 hover:text-sutda-gold text-sm transition-colors border
                 border-gray-600 hover:border-sutda-gold/50 rounded-lg px-3 py-1"
        >
          족보 보기
        </button>
        <button
          @click="handleLeave"
          class="text-gray-400 hover:text-red-400 text-sm transition-colors"
        >
          나가기
        </button>
      </div>
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

    <!-- 구사 재경기 알림 -->
    <Transition name="slide">
      <div
        v-if="phase === 'waiting' && isRematch"
        class="bg-amber-900/70 border-2 border-amber-500 text-amber-100 px-4 py-3
               rounded-xl mb-4 text-center shadow-lg"
      >
        <div class="font-bold text-lg">⚡ 구사 재경기!</div>
        <div class="text-sm mt-1">동점으로 재경기가 시작됩니다. 판돈이 다음 라운드로 이월됩니다.</div>
        <div class="text-amber-300 text-sm font-bold mt-1">
          이월 판돈: {{ pot.toLocaleString() }}원
        </div>
      </div>
    </Transition>

    <!-- ====== 게임 테이블 ====== -->
    <div
      class="relative bg-gradient-to-b from-sutda-green/90 to-emerald-900/90
             border-4 border-sutda-gold/40 rounded-3xl
             p-6 min-h-[520px] flex flex-col shadow-2xl"
    >
      <!-- 상단: 다른 플레이어들 -->
      <div class="flex justify-center gap-6 flex-wrap">
        <PlayerSlot
          v-for="p in otherPlayers"
          :key="p.id"
          :player="p"
          :is-current-turn="currentTurnId === p.id"
          :phase="phase"
          :is-winner="phase === 'result' && p.id === winnerId"
        />
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
        <!-- 판돈 (playing / result) -->
        <div
          v-if="phase !== 'waiting' && phase !== 'ended'"
          class="bg-black/30 rounded-2xl px-8 py-4 text-center"
        >
          <div class="text-gray-400 text-xs uppercase tracking-wider mb-1">판돈</div>
          <div class="text-sutda-gold text-3xl font-bold">
            {{ pot.toLocaleString() }}원
          </div>
          <!-- result: 승자 표시 -->
          <div v-if="phase === 'result' && resultSummary" class="mt-2">
            <div class="text-white font-bold text-lg">
              {{ resultSummary.winnerName }}
              <span class="text-sutda-gold ml-1">승리!</span>
            </div>
            <div class="text-yellow-300 text-sm">{{ resultSummary.winnerHand }}</div>
          </div>
          <!-- playing: 라운드 표시 -->
          <div v-if="phase === 'playing'" class="text-gray-400 text-xs mt-1">
            배팅 라운드 {{ roundCount + 1 }}
          </div>
        </div>

        <!-- 대기 중 -->
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
            v-if="players.length >= 2 && !myPlayer?.ready"
            @click="setReady"
            class="btn-primary text-lg px-10 py-3"
          >
            준비 완료
          </button>
          <p v-else-if="myPlayer?.ready" class="text-green-400 text-sm">
            준비 완료! 다른 플레이어를 기다리는 중...
          </p>
          <p v-else class="text-gray-400 text-sm">
            최소 2명이 필요합니다
          </p>
        </div>

        <!-- 게임 종료 -->
        <div v-if="phase === 'ended'" class="text-center">
          <div class="text-gray-400 text-sm">게임이 종료되었습니다</div>
        </div>
      </div>

      <!-- 하단: 내 영역 -->
      <div class="flex flex-col items-center gap-4">
        <!-- 내 카드 -->
        <div class="flex gap-3">
          <template v-if="myPlayer?.cards?.length">
            <SutdaCard
              v-for="card in myPlayer.cards"
              :key="card.id"
              :card="card"
              :face-up="true"
            />
          </template>
        </div>

        <!-- 내 이름 & 잔액 & 승리 배지 -->
        <div class="flex items-center gap-3">
          <div
            class="player-avatar text-sm"
            :class="
              phase === 'result' && winnerId === playerId
                ? 'bg-sutda-gold/80 border-sutda-gold'
                : isMyTurn
                ? 'bg-yellow-600 border-yellow-400'
                : 'bg-blue-700 border-blue-500'
            "
          >
            {{ (myPlayer?.name || playerName).charAt(0) }}
          </div>
          <div>
            <span
              class="font-semibold"
              :class="
                phase === 'result' && winnerId === playerId
                  ? 'text-sutda-gold'
                  : isMyTurn
                  ? 'text-yellow-300'
                  : 'text-white'
              "
            >
              {{ myPlayer?.name || playerName }}
            </span>
            <span v-if="myPlayer?.isHost" class="ml-1 text-xs text-sutda-gold">(방장)</span>
            <!-- 내 승리 배지 -->
            <span
              v-if="phase === 'result' && winnerId === playerId"
              class="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-sutda-gold text-black animate-pulse"
            >
              🏆 승리
            </span>
            <div class="text-xs text-green-300">
              잔액: {{ (myPlayer?.balance ?? 0).toLocaleString() }}원
            </div>
            <div v-if="myPlayer?.totalBet" class="text-xs text-yellow-300">
              이번 판 베팅: {{ myPlayer.totalBet.toLocaleString() }}원
            </div>
          </div>
        </div>

        <!-- 족보 (결과 시) -->
        <div
          v-if="(phase === 'result' || phase === 'ended') && myPlayer?.hand"
          class="bg-sutda-gold/20 text-sutda-gold px-4 py-1 rounded-full text-sm font-bold"
        >
          {{ myPlayer.hand.name }}
        </div>

        <!-- 다음 라운드 준비 버튼 (result 페이즈 인라인) -->
        <div v-if="phase === 'result'" class="mt-1">
          <button
            v-if="!myPlayer?.ready"
            @click="setReady"
            class="btn-primary px-8 py-2"
          >
            다음 라운드 준비
          </button>
          <p v-else class="text-green-400 text-sm animate-pulse">
            다른 플레이어를 기다리는 중...
          </p>
        </div>

        <!-- 베팅 버튼 -->
        <div
          v-if="phase === 'playing' && !myPlayer?.folded && isMyTurn"
          class="flex items-center gap-2 flex-wrap justify-center"
        >
          <!-- 앞선 베팅 없음: 체크 / 삥 / 하프 / 쿼터 / 다이 -->
          <template v-if="!hasRaise">
            <button
              @click="bet('check')"
              class="btn-secondary"
              title="베팅 없이 턴 넘김"
            >
              체크
            </button>
            <button
              v-if="isFirstPlayer"
              @click="bet('pping')"
              class="btn-secondary border-green-500 text-green-300 hover:bg-green-800/40"
              title="최소 금액(1,000원) 베팅"
            >
              삥
            </button>
            <button
              @click="bet('half')"
              class="btn-primary"
              title="판돈의 절반"
            >
              하프 (½)
            </button>
            <button
              @click="bet('quarter')"
              class="btn-secondary"
              title="판돈의 1/4"
            >
              쿼터 (¼)
            </button>
          </template>

          <!-- 앞선 베팅 있음: 콜 / 따당 / 하프 / 쿼터 / 다이 -->
          <template v-else>
            <button
              @click="bet('call')"
              class="btn-primary bg-blue-700 hover:bg-blue-600 border-blue-400"
              title="앞선 베팅에 맞춰 콜"
            >
              콜
            </button>
            <button
              @click="bet('ddadang')"
              class="btn-primary bg-orange-700 hover:bg-orange-600 border-orange-400"
              title="콜하고 콜 금액의 2배 추가 베팅"
            >
              따당
            </button>
            <button
              @click="bet('half')"
              class="btn-primary"
              title="판돈의 절반"
            >
              하프 (½)
            </button>
            <button
              @click="bet('quarter')"
              class="btn-secondary"
              title="판돈의 1/4"
            >
              쿼터 (¼)
            </button>
          </template>

          <!-- 다이는 항상 표시 -->
          <button
            @click="bet('die')"
            class="btn-danger"
          >
            다이
          </button>
        </div>

        <!-- 내 턴 대기 안내 -->
        <p
          v-if="phase === 'playing' && !isMyTurn && !myPlayer?.folded"
          class="text-gray-400 text-sm animate-pulse"
        >
          상대방의 턴을 기다리는 중...
        </p>
        <p v-if="phase === 'playing' && myPlayer?.folded" class="text-gray-500 text-sm">
          다이 처리됨
        </p>
      </div>
    </div>

    <!-- ====== 게임 종료 팝업 (ended 페이즈만) ====== -->
    <WinnerPopup
      v-if="resultSummary && phase === 'ended'"
      :result="resultSummary"
      :my-player-id="playerId"
      :phase="phase"
      :my-player-ready="myPlayer?.ready ?? false"
      :end-reason="endReason ?? undefined"
      @ready="setReady"
      @go-to-lobby="handleLeave"
    />

    <!-- ====== 족보 가이드 ====== -->
    <HandGuide v-if="showHandGuide" @close="showHandGuide = false" />
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

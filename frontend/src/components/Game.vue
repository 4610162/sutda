<script setup lang="ts">
import { ref, computed } from "vue";
import { useGameStore } from "../composables/useGameStore";
import PlayerSlot from "./PlayerSlot.vue";
import SutdaCard from "./SutdaCard.vue";
import WinnerPopup from "./WinnerPopup.vue";
import HandGuide from "./HandGuide.vue";
import BotManager from "./BotManager.vue";

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
  botPlayers,
  bet,
  setReady,
  leaveRoom,
  addBot,
  removeBot,
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

// 내 베팅 액션: 새로운 베팅이 발생하여 값이 업데이트될 때까지 유지
const myVisibleAction = computed(() => myPlayer.value?.lastAction);

async function handleLeave() {
  await leaveRoom();
  emit("leave");
}
</script>

<template>
  <div class="game-layout">
    <!-- ====== 모바일 상단 바 (sm 이하에서만 표시) ====== -->
    <div class="mobile-topbar sm:hidden">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-gray-400 text-[10px] truncate">{{ roomCode }}</span>
        <span class="text-gray-600 text-[10px]">·</span>
        <span class="text-gray-400 text-[10px]">{{ totalRoundsPlayed }}판</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="showHandGuide = true"
          class="mobile-icon-btn"
          title="족보 보기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button
          @click="handleLeave"
          class="mobile-icon-btn text-gray-500 hover:text-red-400"
          title="나가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ====== 메인 영역 (게임 테이블) ====== -->
    <div class="game-main flex flex-col min-h-0 min-w-0">
      <!-- 에러 메시지 -->
      <Transition name="slide">
        <div
          v-if="errorMsg"
          class="bg-red-900/60 border border-red-500 text-red-200 px-3 py-1 rounded-lg mb-1 text-center text-xs"
        >
          {{ errorMsg }}
        </div>
      </Transition>

      <!-- 구사 재경기 알림 -->
      <Transition name="slide">
        <div
          v-if="phase === 'waiting' && isRematch"
          class="bg-amber-900/70 border-2 border-amber-500 text-amber-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl mb-1 text-center"
        >
          <div class="font-bold text-xs sm:text-sm">⚡ 구사 재경기!</div>
          <div class="text-[10px] sm:text-xs mt-0.5">동점으로 재경기가 시작됩니다. 판돈이 다음 라운드로 이월됩니다.</div>
          <div class="text-amber-300 text-[10px] sm:text-xs font-bold mt-0.5">
            이월 판돈: {{ pot.toLocaleString() }}원
          </div>
        </div>
      </Transition>

      <!-- ====== 게임 테이블 ====== -->
      <div
        class="game-table relative bg-gradient-to-b from-sutda-green/90 to-emerald-900/90
               border-2 border-sutda-gold/40 rounded-2xl
               shadow-2xl flex-1 min-h-0"
      >
        <!-- 판돈: 절대 중앙 고정 -->
        <div class="pot-overlay">
          <!-- 판돈 (playing / result) -->
          <div
            v-if="phase !== 'waiting' && phase !== 'ended'"
            class="bg-black/30 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-center"
          >
            <div class="text-gray-400 text-[9px] sm:text-[10px] uppercase tracking-wider mb-0.5">판돈</div>
            <div class="text-sutda-gold text-lg sm:text-2xl font-bold">
              {{ pot.toLocaleString() }}원
            </div>
            <!-- result: 승자 표시 -->
            <div v-if="phase === 'result' && resultSummary" class="mt-0.5 sm:mt-1">
              <div class="text-white font-bold text-xs sm:text-sm">
                {{ resultSummary.winnerName }}
                <span class="text-sutda-gold ml-1">승리!</span>
              </div>
              <div class="text-yellow-300 text-[10px] sm:text-xs">{{ resultSummary.winnerHand }}</div>
            </div>
            <!-- playing: 라운드 표시 -->
            <div v-if="phase === 'playing'" class="text-gray-400 text-[9px] sm:text-[10px] mt-0.5">
              배팅 라운드 {{ roundCount + 1 }}
            </div>
          </div>

          <!-- 대기 중 -->
          <div v-if="phase === 'waiting'" class="text-center">
            <div class="text-gray-300 text-xs sm:text-sm mb-1 sm:mb-1.5">
              플레이어 대기 중 ({{ players.length }}/4)
            </div>
            <div class="flex gap-2 justify-center mb-2">
              <div
                v-for="i in 4"
                :key="i"
                class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                :class="i <= players.length ? 'bg-green-500' : 'bg-gray-600'"
              ></div>
            </div>
            <button
              v-if="players.length >= 2 && !myPlayer?.ready"
              @click="setReady"
              class="btn-primary text-xs sm:text-sm px-4 py-1.5 sm:px-6 sm:py-2"
            >
              준비 완료
            </button>
            <p v-else-if="myPlayer?.ready" class="text-green-400 text-[10px] sm:text-xs">
              준비 완료! 다른 플레이어를 기다리는 중...
            </p>
            <p v-else class="text-gray-400 text-[10px] sm:text-xs">
              최소 2명이 필요합니다
            </p>

            <!-- 봇 관리 (대기 중일 때만) -->
            <div class="mt-2 w-full max-w-md mx-auto">
              <BotManager
                :bot-players="botPlayers"
                :player-count="players.length"
                @add-bot="addBot"
                @remove-bot="removeBot"
              />
            </div>
          </div>

          <!-- 게임 종료 -->
          <div v-if="phase === 'ended'" class="text-center">
            <div class="text-gray-400 text-xs">게임이 종료되었습니다</div>
          </div>
        </div>

        <div class="table-grid">
          <!-- 상단: 2인일 때 첫 번째 상대, 3인 이상일 때 두 번째 상대 -->
          <div class="table-top">
            <PlayerSlot
              v-if="otherPlayers.length === 1 && otherPlayers[0]"
              :player="otherPlayers[0]"
              :is-current-turn="currentTurnId === otherPlayers[0].id"
              :phase="phase"
              :is-winner="phase === 'result' && otherPlayers[0].id === winnerId"
            />
            <PlayerSlot
              v-else-if="otherPlayers.length >= 2 && otherPlayers[1]"
              :player="otherPlayers[1]"
              :is-current-turn="currentTurnId === otherPlayers[1].id"
              :phase="phase"
              :is-winner="phase === 'result' && otherPlayers[1].id === winnerId"
            />
            <div v-else class="flex flex-col items-center gap-1 p-2 opacity-30">
              <span class="text-xs text-gray-500">대기 중</span>
            </div>
          </div>

          <!-- 좌측 -->
          <div class="table-left">
            <PlayerSlot
              v-if="otherPlayers.length >= 2 && otherPlayers[0]"
              :player="otherPlayers[0]"
              :is-current-turn="currentTurnId === otherPlayers[0].id"
              :phase="phase"
              :is-winner="phase === 'result' && otherPlayers[0].id === winnerId"
              position="left"
            />
          </div>

          <!-- 중앙: 투명 스페이서 -->
          <div class="table-center"></div>

          <!-- 우측 -->
          <div class="table-right">
            <PlayerSlot
              v-if="otherPlayers.length >= 3 && otherPlayers[2]"
              :player="otherPlayers[2]"
              :is-current-turn="currentTurnId === otherPlayers[2].id"
              :phase="phase"
              :is-winner="phase === 'result' && otherPlayers[2].id === winnerId"
              position="right"
            />
          </div>

          <!-- 하단: 내 영역 -->
          <div class="table-bottom flex flex-col items-center gap-0.5 sm:gap-1">
            <!-- 내 카드 -->
            <div class="flex gap-1.5 sm:gap-2">
              <template v-if="myPlayer?.cards?.length">
                <SutdaCard
                  v-for="card in myPlayer.cards"
                  :key="card.id"
                  :card="card"
                  :face-up="true"
                />
              </template>
            </div>

            <!-- 내 이름 & 잔액 (한 줄로 압축) -->
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
              <span
                class="font-bold text-xs sm:text-sm"
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
              <span v-if="myPlayer?.isHost" class="text-[9px] sm:text-[10px] bg-sutda-gold/80 text-black px-1 py-0.5 rounded-full font-bold leading-none">방장</span>
              <!-- 내 베팅 액션 텍스트 -->
              <Transition name="action-fade">
                <span
                  v-if="myVisibleAction && phase === 'playing'"
                  class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black whitespace-nowrap"
                >
                  {{ myVisibleAction }}
                </span>
              </Transition>
              <!-- 내 승리 배지 -->
              <span
                v-if="phase === 'result' && winnerId === playerId"
                class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sutda-gold text-black animate-pulse"
              >
                승리
              </span>
              <!-- 잔액 + 베팅 (이름 옆에 한 줄) -->
              <span class="text-[9px] sm:text-[10px] text-green-300">{{ (myPlayer?.balance ?? 0).toLocaleString() }}원</span>
              <span v-if="myPlayer?.totalBet" class="text-[9px] sm:text-[10px] text-yellow-300">베팅 {{ myPlayer.totalBet.toLocaleString() }}원</span>
            </div>

            <!-- 족보 -->
            <div
              v-if="myPlayer?.hand"
              class="bg-sutda-gold/20 text-sutda-gold px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold"
            >
              {{ myPlayer.hand.name }}
            </div>

            <!-- 하단 액션 영역 -->
            <div class="bottom-action-area">
              <!-- 다음 라운드 준비 버튼 -->
              <div v-if="phase === 'result'">
                <button
                  v-if="!myPlayer?.ready"
                  @click="setReady"
                  class="btn-primary px-4 py-1 sm:px-6 sm:py-1.5 text-xs sm:text-sm"
                >
                  다음 라운드 준비
                </button>
                <p v-else class="text-green-400 text-[10px] sm:text-xs animate-pulse">
                  다른 플레이어를 기다리는 중...
                </p>
              </div>

              <!-- 베팅 영역 -->
              <template v-else-if="phase === 'playing'">
                <div
                  v-if="!myPlayer?.folded && isMyTurn"
                  class="bet-buttons"
                >
                  <template v-if="!hasRaise">
                    <button @click="bet('check')" class="btn-secondary btn-bet" title="베팅 없이 턴 넘김">체크</button>
                    <button
                      v-if="isFirstPlayer"
                      @click="bet('pping')"
                      class="btn-secondary btn-bet border-green-500 text-green-300 hover:bg-green-800/40"
                      title="최소 금액(1,000원) 베팅"
                    >삥</button>
                    <button @click="bet('half')" class="btn-primary btn-bet" title="판돈의 절반">하프</button>
                    <button @click="bet('quarter')" class="btn-secondary btn-bet" title="판돈의 1/4">쿼터</button>
                  </template>
                  <template v-else>
                    <button @click="bet('call')" class="btn-primary btn-bet bg-blue-700 hover:bg-blue-600 border-blue-400" title="앞선 베팅에 맞춰 콜">콜</button>
                    <button @click="bet('ddadang')" class="btn-primary btn-bet bg-orange-700 hover:bg-orange-600 border-orange-400" title="콜하고 콜 금액의 2배 추가 베팅">따당</button>
                    <button @click="bet('half')" class="btn-primary btn-bet" title="판돈의 절반">하프</button>
                    <button @click="bet('quarter')" class="btn-secondary btn-bet" title="판돈의 1/4">쿼터</button>
                  </template>
                  <button @click="bet('die')" class="btn-danger btn-bet">다이</button>
                </div>
                <p v-else-if="!myPlayer?.folded" class="text-gray-400 text-[10px] sm:text-xs animate-pulse text-center">
                  상대방의 턴을 기다리는 중...
                </p>
                <p v-else class="text-gray-500 text-[10px] sm:text-xs text-center">다이 처리됨</p>
              </template>
            </div>
          </div>
        </div><!-- /table-grid -->
      </div>
    </div>

    <!-- ====== 우측 사이드바 (sm 이상에서만 표시) ====== -->
    <aside class="game-sidebar hidden sm:flex">
      <div class="flex flex-col gap-3">
        <!-- 방 정보 -->
        <div class="sidebar-section">
          <div class="text-gray-400 text-[10px] uppercase tracking-wider mb-1">방 정보</div>
          <div class="text-white text-sm font-medium">{{ roomCode }}</div>
          <div class="text-gray-400 text-[10px] mt-0.5">{{ totalRoundsPlayed }}판 진행</div>
        </div>

        <!-- 족보 버튼 -->
        <button
          @click="showHandGuide = true"
          class="w-full text-gray-300 hover:text-sutda-gold text-xs transition-colors border
                 border-gray-600 hover:border-sutda-gold/50 rounded-lg px-2 py-1.5 text-center"
        >
          족보 보기
        </button>

        <!-- 나가기 버튼 -->
        <button
          @click="handleLeave"
          class="w-full text-gray-400 hover:text-red-400 text-xs transition-colors border
                 border-gray-700 hover:border-red-500/50 rounded-lg px-2 py-1.5 text-center"
        >
          나가기
        </button>
      </div>
    </aside>

    <!-- ====== 게임 종료 팝업 ====== -->
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
/* 전체 레이아웃: 사이드바 + 메인 (뷰포트에 맞춤) */
.game-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
@media (min-width: 640px) {
  .game-layout {
    flex-direction: row;
    gap: 0.5rem;
  }
}

/* 모바일 상단 바 */
.mobile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.125rem 0.5rem;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.mobile-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 0.375rem;
  color: #9ca3af;
  transition: color 0.2s, background 0.2s;
}
.mobile-icon-btn:hover,
.mobile-icon-btn:active {
  color: #fbbf24;
  background: rgba(255, 255, 255, 0.05);
}

/* 메인 게임 영역 */
.game-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* 우측 사이드바 (sm 이상) */
.game-sidebar {
  width: 100px;
  flex-shrink: 0;
  padding: 0.5rem;
  flex-direction: column;
}

.sidebar-section {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

/* 게임 테이블 */
.game-table {
  max-width: 850px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 판돈 오버레이: 절대 중앙 고정 */
.pot-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 4방향 그리드 레이아웃 */
.table-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "top    top    top"
    "left center right"
    "bottom bottom bottom";
  flex: 1;
  padding: 0.25rem;
  min-height: 0;
}
@media (min-width: 640px) {
  .table-grid {
    padding: 0.5rem;
  }
}

.table-top {
  grid-area: top;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
}
@media (min-width: 640px) {
  .table-top {
    padding: 0.125rem 0;
  }
}

.table-left {
  grid-area: left;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
@media (min-width: 640px) {
  .table-left {
    padding: 0 0.25rem;
  }
}

.table-center {
  grid-area: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
}
@media (min-width: 640px) {
  .table-center {
    min-height: 110px;
  }
}

.table-right {
  grid-area: right;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
@media (min-width: 640px) {
  .table-right {
    padding: 0 0.25rem;
  }
}

.table-bottom {
  grid-area: bottom;
  padding-top: 0;
}
@media (min-width: 640px) {
  .table-bottom {
    padding-top: 0.125rem;
  }
}

/* 하단 액션 영역 */
.bottom-action-area {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
@media (min-width: 640px) {
  .bottom-action-area {
    min-height: 40px;
  }
}

/* 베팅 버튼 컨테이너: 모바일에서 한 줄 compact */
.bet-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: center;
}
@media (min-width: 640px) {
  .bet-buttons {
    gap: 0.375rem;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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

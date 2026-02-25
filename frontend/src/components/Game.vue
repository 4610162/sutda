<script setup lang="ts">
import { ref, computed, watch } from "vue";
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

// 내 베팅 액션
const myVisibleAction = computed(() => myPlayer.value?.lastAction);

async function handleLeave() {
  const confirmed = window.confirm("정말 퇴장하시겠습니까?");
  if (!confirmed) return;
  await leaveRoom();
  emit("leave");
}

// 내 족보 이름 (playing 중 표시)
const myHandName = computed(() => myPlayer.value?.hand?.name ?? null);

// ── U자형 상대 플레이어 배치 (최대 6명) ──────────
// n=1: 상단 중앙 1명
// n=2: 상단 좌우 2명
// n=3: 상단 3명
// n=4: 좌1 + 상단2 + 우1
// n=5: 좌1 + 상단3 + 우1
// n=6: 좌2 + 상단2 + 우2
const nOthers = computed(() => otherPlayers.value.length);

/** 상단 행 (n<=3: 전원, n=4,5: 가운데, n=6: 중앙 2명) */
const topOpponents = computed(() => {
  const n = nOthers.value;
  const o = otherPlayers.value;
  if (n <= 3) return o;
  if (n === 4) return o.slice(1, 3);
  if (n === 5) return o.slice(1, 4);
  return o.slice(2, 4); // n=6
});

/** 좌측 컬럼 (n<=3: 없음, n=4,5: 1명, n=6: 2명) */
const leftOpponents = computed(() => {
  const n = nOthers.value;
  const o = otherPlayers.value;
  if (n <= 3) return [];
  if (n <= 5) return [o[0]];
  return o.slice(0, 2); // n=6
});

/** 우측 컬럼 (n<=3: 없음, n=4: 1명, n=5: 1명, n=6: 2명) */
const rightOpponents = computed(() => {
  const n = nOthers.value;
  const o = otherPlayers.value;
  if (n <= 3) return [];
  if (n === 4) return [o[3]];
  if (n === 5) return [o[4]];
  return o.slice(4, 6); // n=6
});

/** 상단 행 3명 이상일 때 컴팩트 (n>=5) */
const isCompact = computed(() => nOthers.value >= 5);

// ===== 판돈 Count-up 애니메이션 =====
const displayPot = ref(0);
const coinBounce = ref(false);

watch(
  pot,
  (newVal) => {
    const start = displayPot.value;
    const end = newVal;
    if (start === end) return;

    if (end > start) {
      coinBounce.value = true;
      setTimeout(() => { coinBounce.value = false; }, 750);
    }

    // 숫자 카운트업 (600ms, 20단계 easeOut)
    const steps = 20;
    const diff = end - start;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        displayPot.value = end;
        clearInterval(timer);
      } else {
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 2);
        displayPot.value = Math.round(start + diff * eased);
      }
    }, 30);
  },
  { immediate: true },
);
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
        <button @click="showHandGuide = true" class="mobile-icon-btn" title="족보 보기">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button @click="handleLeave" class="mobile-icon-btn text-gray-500 hover:text-red-400" title="나가기">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ====== 메인 영역 ====== -->
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
          <div class="text-amber-300 text-[10px] sm:text-xs font-bold mt-0.5">이월 판돈: {{ pot.toLocaleString() }}원</div>
        </div>
      </Transition>

      <!-- ====== 게임 테이블 ====== -->
      <div
        class="game-table bg-gradient-to-b from-sutda-green/90 to-emerald-900/90
               border-2 border-sutda-gold/40 rounded-2xl shadow-2xl flex-1 min-h-0"
      >
        <!-- ① 상단 상대 플레이어 행 -->
        <div class="opp-top-row">
          <template v-if="topOpponents.length">
            <PlayerSlot
              v-for="p in topOpponents"
              :key="p.id"
              :player="p"
              :compact="isCompact"
              :is-current-turn="currentTurnId === p.id"
              :phase="phase"
              :is-winner="phase === 'result' && p.id === winnerId"
              position="top"
            />
          </template>
          <!-- 빈 슬롯 플레이스홀더 (상대 없을 때) -->
          <div v-else class="opacity-20 flex flex-col items-center pt-2">
            <div class="w-8 h-12 sm:w-10 sm:h-16 bg-gray-700/50 rounded-lg border border-dashed border-gray-600/50"></div>
            <div class="text-[9px] text-gray-600 mt-1">대기 중</div>
          </div>
        </div>

        <!-- ② 중간 행: 좌측 사이드 · 녹색 필드 · 우측 사이드 -->
        <div class="game-middle">
          <!-- 좌측 사이드 (n>=4) -->
          <div v-if="leftOpponents.length" class="opp-side opp-left">
            <PlayerSlot
              v-for="p in leftOpponents"
              :key="p.id"
              :player="p"
              :compact="true"
              :is-current-turn="currentTurnId === p.id"
              :phase="phase"
              :is-winner="phase === 'result' && p.id === winnerId"
              position="left"
            />
          </div>

          <!-- 녹색 필드 (중앙 공간 + 상태별 콘텐츠) -->
          <div class="green-field">
            <!-- 대기 중 -->
            <div v-if="phase === 'waiting'" class="flex flex-col items-center gap-2 w-full">
              <div class="text-gray-300 text-xs sm:text-sm">플레이어 대기 중 ({{ players.length }}/7)</div>
              <div class="flex gap-1.5 justify-center">
                <div
                  v-for="i in 7" :key="i"
                  class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors duration-300"
                  :class="i <= players.length ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-gray-700'"
                ></div>
              </div>
              <button
                v-if="players.length >= 2 && !myPlayer?.ready"
                @click="setReady"
                class="btn-primary text-xs sm:text-sm px-4 py-1.5 sm:px-6 sm:py-2"
              >준비 완료</button>
              <p v-else-if="myPlayer?.ready" class="text-green-400 text-[10px] sm:text-xs animate-pulse">
                준비 완료! 다른 플레이어를 기다리는 중...
              </p>
              <p v-else class="text-gray-500 text-[10px] sm:text-xs">최소 2명이 필요합니다</p>
              <div class="mt-1 w-full max-w-xs sm:max-w-md mx-auto">
                <BotManager
                  :bot-players="botPlayers"
                  :player-count="players.length"
                  @add-bot="addBot"
                  @remove-bot="removeBot"
                />
              </div>
            </div>

            <!-- 게임 종료 -->
            <div v-else-if="phase === 'ended'" class="text-center">
              <div class="text-gray-400 text-xs">게임이 종료되었습니다</div>
            </div>

            <!-- playing/result: 판돈 바 (정중앙) + playing일 때 테이블 장식 -->
            <template v-else>
              <div class="pot-bar">
                <div class="flex items-center gap-2 justify-center">
                  <!-- 코인 아이콘 (판돈 증가 시 바운스) -->
                  <svg
                    class="w-5 h-5 flex-shrink-0"
                    :class="{ 'coin-icon-bounce': coinBounce }"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#FDE68A" /> <stop offset="50%" style="stop-color:#D4A843" /> <stop offset="100%" style="stop-color:#926117" /> </linearGradient>
                    </defs>
                    <circle cx="12" cy="12" r="10" stroke="url(#goldGradient)" stroke-width="2" />
                    <path
                      d="M12 6V18M15 8.5C15 8.5 14.5 7 12 7C9.5 7 9 8.5 9 9.5C9 11.5 15 11.5 15 14.5C15 15.5 14.5 17 12 17C9.5 17 9 15.5 9 15.5M12 6V5M12 18V19"
                      stroke="url(#goldGradient)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span class="text-sutda-gold font-bold text-base sm:text-xl pot-amount leading-none tabular-nums">
                    {{ displayPot.toLocaleString() }}
                  </span>
                </div>
                <!-- 결과: 승자 정보 -->
                <div v-if="phase === 'result' && resultSummary" class="text-center mt-1">
                  <span class="text-white text-xs sm:text-sm font-semibold">{{ resultSummary.winnerName }}</span>
                  <span class="text-sutda-gold text-xs ml-1">승리!</span>
                  <span class="text-yellow-300/80 text-[10px] ml-1">{{ resultSummary.winnerHand }}</span>
                </div>
              </div>
              <!-- playing: 테이블 장식 -->
              <div v-if="phase === 'playing'" class="felt-ring"></div>
            </template>
          </div>

          <!-- 우측 사이드 (n>=4) -->
          <div v-if="rightOpponents.length" class="opp-side opp-right">
            <PlayerSlot
              v-for="p in rightOpponents"
              :key="p.id"
              :player="p"
              :compact="true"
              :is-current-turn="currentTurnId === p.id"
              :phase="phase"
              :is-winner="phase === 'result' && p.id === winnerId"
              position="right"
            />
          </div>
        </div>

        <!-- ④ 내 카드 영역 -->
        <div class="my-cards-area">
          <!-- 족보 뱃지 (playing 중, 카드 위) -->
          <div v-if="myHandName && phase === 'playing'" class="my-hand-badge">
            {{ myHandName }}
          </div>
          <!-- 내 카드 -->
          <div class="flex gap-2 sm:gap-2">
            <template v-if="myPlayer?.cards?.length">
              <SutdaCard
                v-for="card in myPlayer.cards"
                :key="card.id"
                :card="card"
                :face-up="true"
              />
            </template>
          </div>
        </div>

        <!-- ⑤ 베팅 액션 영역 -->
        <div class="bet-area">
          <!-- 다음 라운드 준비 -->
          <div v-if="phase === 'result'">
            <button
              v-if="!myPlayer?.ready"
              @click="setReady"
              class="btn-primary px-4 py-1 sm:px-6 sm:py-1.5 text-xs sm:text-sm"
            >다음 라운드 준비</button>
            <p v-else class="text-green-400 text-[10px] sm:text-xs animate-pulse">
              다른 플레이어를 기다리는 중...
            </p>
          </div>

          <!-- 베팅 버튼 -->
          <template v-else-if="phase === 'playing'">
            <div v-if="!myPlayer?.folded && isMyTurn" class="bet-buttons">
              <template v-if="!hasRaise">
                <button @click="bet('check')" class="btn-secondary btn-bet-mobile" title="베팅 없이 턴 넘김">체크</button>
                <button
                  v-if="isFirstPlayer"
                  @click="bet('pping')"
                  class="btn-secondary btn-bet-mobile border-green-500 text-green-300 hover:bg-green-800/40"
                  title="최소 금액(1,000원) 베팅"
                >삥</button>
                <button @click="bet('half')" class="btn-primary btn-bet-mobile" title="판돈의 절반">하프</button>
                <button @click="bet('quarter')" class="btn-secondary btn-bet-mobile" title="판돈의 1/4">쿼터</button>
              </template>
              <template v-else>
                <button @click="bet('call')" class="btn-primary btn-bet-mobile bg-blue-700 hover:bg-blue-600 border-blue-400" title="앞선 베팅에 맞춰 콜">콜</button>
                <button @click="bet('ddadang')" class="btn-primary btn-bet-mobile bg-orange-700 hover:bg-orange-600 border-orange-400" title="콜하고 콜 금액의 2배 추가 베팅">따당</button>
                <button @click="bet('half')" class="btn-primary btn-bet-mobile" title="판돈의 절반">하프</button>
                <button @click="bet('quarter')" class="btn-secondary btn-bet-mobile" title="판돈의 1/4">쿼터</button>
              </template>
              <button @click="bet('die')" class="btn-danger btn-bet-mobile">다이</button>
            </div>
            <p v-else-if="!myPlayer?.folded" class="text-gray-400 text-[10px] sm:text-xs animate-pulse text-center">
              상대방의 턴을 기다리는 중...
            </p>
            <p v-else class="text-gray-500 text-[10px] sm:text-xs text-center">다이</p>
          </template>
        </div>

        <!-- ⑥ 내 정보 바 (최하단 수평 바) -->
        <div class="my-info-bar">
          <!-- 왼쪽: 이름 + 뱃지들 -->
          <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              class="font-bold text-sm truncate"
              :class="
                phase === 'result' && winnerId === playerId ? 'text-sutda-gold' :
                isMyTurn ? 'text-yellow-300' : 'text-white'
              "
            >{{ myPlayer?.name || playerName }}</span>
            <span
              v-if="myPlayer?.isHost"
              class="text-[9px] sm:text-[10px] bg-sutda-gold/80 text-black px-1.5 py-0.5 rounded-full font-bold leading-none flex-shrink-0"
            >방장</span>
            <Transition name="action-fade">
              <span
                v-if="myVisibleAction && phase === 'playing'"
                class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/90 text-black whitespace-nowrap flex-shrink-0"
              >{{ myVisibleAction }}</span>
            </Transition>
            <span
              v-if="phase === 'result' && winnerId === playerId"
              class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sutda-gold text-black animate-pulse flex-shrink-0"
            >승리</span>
          </div>
          <!-- 오른쪽: 족보 + 잔액 + 베팅 -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span
              v-if="myPlayer?.hand && (phase === 'result' || phase === 'ended')"
              class="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sutda-gold/20 text-sutda-gold"
            >{{ myPlayer.hand.name }}</span>
            <span class="text-green-300 text-[10px] sm:text-[11px]">{{ (myPlayer?.balance ?? 0).toLocaleString() }}원</span>
            <span v-if="myPlayer?.totalBet" class="text-yellow-300 text-[10px]">베팅 {{ myPlayer.totalBet.toLocaleString() }}원</span>
          </div>
        </div>
      </div><!-- /game-table -->
    </div><!-- /game-main -->

    <!-- ====== 우측 사이드바 (sm 이상에서만 표시) ====== -->
    <aside class="game-sidebar hidden sm:flex">
      <div class="flex flex-col gap-3">
        <div class="sidebar-section">
          <div class="text-gray-400 text-[10px] uppercase tracking-wider mb-1">방 정보</div>
          <div class="text-white text-sm font-medium">{{ roomCode }}</div>
          <div class="text-gray-400 text-[10px] mt-0.5">{{ totalRoundsPlayed }}판 진행</div>
        </div>
        <button
          @click="showHandGuide = true"
          class="w-full text-gray-300 hover:text-sutda-gold text-xs transition-colors border
                 border-gray-600 hover:border-sutda-gold/50 rounded-lg px-2 py-1.5 text-center"
        >족보 보기</button>
        <button
          @click="handleLeave"
          class="w-full text-gray-400 hover:text-red-400 text-xs transition-colors border
                 border-gray-700 hover:border-red-500/50 rounded-lg px-2 py-1.5 text-center"
        >나가기</button>
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
/* ===== 전체 레이아웃 ===== */
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

/* ===== 모바일 상단 바 ===== */
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

/* ===== 메인 게임 영역 ===== */
.game-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

/* ===== 우측 사이드바 ===== */
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

/* ===== 게임 테이블 (flex column) ===== */
.game-table {
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
@media (min-width: 640px) {
  .game-table {
    max-width: 850px;
    margin: 0 auto;
  }
}

/* ===== ① 상단 상대 플레이어 행 ===== */
.opp-top-row {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 0.375rem;
  width: 100%;
  flex-shrink: 0;
  padding: 0.25rem 0.375rem 0.125rem;
}

@media (min-width: 640px) {
  .opp-top-row {
    gap: 0.5rem;
  }
}

/* ===== ② 중간 행: 좌측 · 녹색 필드 · 우측 ===== */
.game-middle {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

/* 사이드 컬럼 공통 */
.opp-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.25rem 0.25rem;
  flex-shrink: 0;
}

/* ===== 녹색 필드 (중앙 넓은 공간) ===== */
.green-field {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem;
  overflow-y: auto;
}

.felt-ring {
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  border: 2px solid rgba(212, 168, 67, 0.12);
  box-shadow:
    0 0 0 8px rgba(212, 168, 67, 0.05),
    0 0 0 16px rgba(212, 168, 67, 0.03);
}
@media (min-width: 640px) {
  .felt-ring {
    width: 64px;
    height: 64px;
  }
}

/* ===== ③ 판돈 바 (중앙 배치) ===== */
.pot-bar {
  background: rgba(0, 0, 0, 0.62);
  border: 1.5px solid rgba(212, 168, 67, 0.60);
  border-radius: 1.25rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 0.5rem 1.5rem;
  min-width: 220px;
  text-align: center;
  box-shadow:
    0 0 22px rgba(212, 168, 67, 0.22),
    0 0 48px rgba(212, 168, 67, 0.08),
    0 2px 16px rgba(212, 168, 67, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -1px 0 rgba(0, 0, 0, 0.20);
}
@media (min-width: 640px) {
  .pot-bar {
    min-width: 290px;
    padding: 0.625rem 2rem;
  }
}

.pot-amount {
  text-shadow: 0 0 18px rgba(218, 165, 32, 0.80), 0 0 36px rgba(218, 165, 32, 0.35);
}

/* ===== 금화 바운스 애니메이션 ===== */
@keyframes coin-icon-bounce {
  0%   { transform: translateY(0)    scale(1);    }
  28%  { transform: translateY(-9px) scale(1.30); }
  55%  { transform: translateY(-3px) scale(1.10); }
  75%  { transform: translateY(-6px) scale(1.18); }
  100% { transform: translateY(0)    scale(1);    }
}

.coin-icon-bounce {
  animation: coin-icon-bounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ===== ④ 내 카드 영역 ===== */
.my-cards-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem 0.75rem;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

/* 내 족보 뱃지 */
.my-hand-badge {
  background: linear-gradient(135deg, rgba(218, 165, 32, 0.22), rgba(218, 165, 32, 0.12));
  border: 1px solid rgba(218, 165, 32, 0.5);
  color: #fbbf24;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 0.125rem 0.75rem;
  border-radius: 9999px;
  text-shadow: 0 0 6px rgba(218, 165, 32, 0.4);
  letter-spacing: 0.025em;
}

/* ===== ⑤ 베팅 영역 ===== */
.bet-area {
  /* 버튼 min-height(42px) + 상하 padding(4px+6px) = 52px 고정 → 레이아웃 시프트 방지 */
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem 0.375rem;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}
@media (min-width: 640px) {
  .bet-area {
    /* sm: 버튼 min-height(44px) + 상하 padding(4px+6px) = 54px */
    min-height: 54px;
  }
}

.bet-buttons {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.btn-bet-mobile {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  min-width: 48px;
  min-height: 42px;
  border-radius: 0.5rem;
}
@media (min-width: 640px) {
  .btn-bet-mobile {
    padding: 0.625rem 1.5rem;
    font-size: 0.875rem;
    min-width: 44px;
    min-height: 44px;
  }
}

/* ===== ⑥ 내 정보 바 (최하단 수평 바) ===== */
.my-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.55);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  position: relative;
  z-index: 3;
}

/* ===== 애니메이션 ===== */
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

/* ===== 아이폰 17 프로 세로 모드 핏-투-스크린 (430px 이하) ===== */
@media (max-width: 430px) {
  /* 상단 상대 행: 좁은 화면에서 간격 줄이기 */
  .opp-top-row {
    gap: 0.25rem;
    padding: 0.25rem 0.25rem 0.125rem;
  }

  /* 사이드 컬럼: 패딩 최소화 */
  .opp-side {
    padding: 0.25rem 0.125rem;
    gap: 0.25rem;
  }

  /* 판돈 바: 좁은 화면에서 최소 폭 조정 */
  .pot-bar {
    min-width: 0;
    width: 90%;
    max-width: 280px;
    padding: 0.4rem 1rem;
  }

  /* 내 카드 영역: 하단 여백 유지하되 상단 줄임 */
  .my-cards-area {
    padding: 0 0.5rem 0.625rem;
  }

  /* 베팅 영역: 버튼 min-height(36px) + 상하 padding(2px+4px) = 42px 고정 */
  .bet-area {
    min-height: 42px;
    padding: 0.125rem 0.5rem 0.25rem;
  }

  /* 베팅 버튼: 더 촘촘하게 */
  .bet-buttons {
    gap: 0.25rem;
  }

  .btn-bet-mobile {
    min-height: 36px;
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>

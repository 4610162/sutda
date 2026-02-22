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

const visibleAction = computed(() => props.player.lastAction);
</script>

<template>
  <div
    class="player-slot transition-all duration-300"
    :class="[
      {
        'is-current-turn': isCurrentTurn && !player.folded,
        'is-winner': isWinner && phase === 'result' && !player.folded,
        'is-folded': player.folded,
      },
      position === 'left' || position === 'right' ? 'player-slot--side' : '',
    ]"
  >
    <!-- 이름 + 뱃지 행 -->
    <div class="name-row">
      <span class="player-name" :class="{
        'name--turn': isCurrentTurn && !player.folded && !isWinner,
        'name--winner': isWinner && phase === 'result' && !player.folded,
        'name--folded': player.folded,
      }">{{ player.name }}</span>

      <span v-if="player.isBot" class="badge badge--bot">봇</span>
      <span v-else-if="player.isHost" class="badge badge--host">방장</span>

      <!-- 승리 배지 -->
      <span
        v-if="isWinner && phase === 'result' && !player.folded"
        class="badge badge--win animate-pulse"
      >승리</span>
    </div>

    <!-- 베팅 액션 배지 -->
    <Transition name="action-fade">
      <span
        v-if="visibleAction && phase === 'playing'"
        class="action-badge"
      >{{ visibleAction }}</span>
    </Transition>

    <!-- 카드 영역 -->
    <div class="card-area">
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

    <!-- 족보 (result/ended 때만) -->
    <span
      v-if="(phase === 'result' || phase === 'ended') && player.hand"
      class="hand-badge"
      :class="player.folded ? 'hand-badge--folded' : 'hand-badge--active'"
    >{{ player.folded ? '다이' : player.hand.name }}</span>

    <!-- 잔액 + 베팅 -->
    <div class="balance-row">
      <span class="balance-text">{{ player.balance.toLocaleString() }}원</span>
      <span v-if="player.totalBet > 0" class="bet-text">+{{ player.totalBet.toLocaleString() }}</span>
    </div>

    <!-- 준비완료 (result 때) -->
    <span v-if="phase === 'result' && player.ready" class="ready-text">준비완료</span>
  </div>
</template>

<style scoped>
/* ===== 슬롯 기본 구조 ===== */
.player-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0.4rem 0.4rem 0.35rem;
  border-radius: 0.75rem;
  min-width: 110px;
  width: 110px;
  position: relative;
  isolation: isolate;
  overflow: visible;

  /* 글래스 카드 기본 */
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
@media (min-width: 640px) {
  .player-slot {
    min-width: 152px;
    width: 152px;
    padding: 0.625rem 0.625rem 0.45rem;
    border-radius: 0.875rem;
  }
}

/* 사이드 슬롯 (좌/우) */
.player-slot--side {
  width: 104px;
  min-width: 104px;
}
@media (min-width: 640px) {
  .player-slot--side {
    width: 148px;
    min-width: 148px;
  }
}

/* ===== 상태별 슬롯 스타일 ===== */
/* 현재 턴 */
.is-current-turn {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25), 0 0 12px rgba(251, 191, 36, 0.15);
}

/* 승리 */
.is-winner {
  background: rgba(212, 168, 67, 0.14);
  border-color: rgba(212, 168, 67, 0.60);
  box-shadow: 0 0 0 1px rgba(212, 168, 67, 0.30), 0 0 16px rgba(212, 168, 67, 0.18);
}

/* 다이 */
.is-folded {
  opacity: 0.38;
  filter: grayscale(0.5);
}

/* ===== 이름 행 ===== */
.name-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 0.1rem;
}

.player-name {
  font-size: 0.6875rem;
  font-weight: 700;
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e5e7eb;
  transition: color 0.2s;
}
@media (min-width: 640px) {
  .player-name {
    font-size: 0.75rem;
    max-width: 104px;
  }
}

.name--turn   { color: #fde68a; }
.name--winner { color: #d4a843; }
.name--folded { color: #6b7280; text-decoration: line-through; }

/* ===== 뱃지 ===== */
.badge {
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 9999px;
  line-height: 1;
  flex-shrink: 0;
}
@media (min-width: 640px) {
  .badge { font-size: 0.625rem; }
}

.badge--bot  { background: rgba(139, 92, 246, 0.75); color: #fff; }
.badge--host { background: rgba(212, 168, 67, 0.80); color: #000; }
.badge--win  { background: #d4a843; color: #000; }

/* ===== 액션 배지 ===== */
.action-badge {
  display: inline-block;
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  background: rgba(245, 158, 11, 0.88);
  color: #000;
  white-space: nowrap;
  margin-bottom: 0.15rem;
}
@media (min-width: 640px) {
  .action-badge { font-size: 0.625rem; }
}

/* ===== 카드 영역 ===== */
.card-area {
  display: flex;
  gap: 0.25rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
@media (min-width: 640px) {
  .card-area { gap: 0.3rem; }
}

/* ===== 족보 배지 ===== */
.hand-badge {
  font-size: 0.5625rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 9999px;
  margin-top: 0.15rem;
}
@media (min-width: 640px) {
  .hand-badge { font-size: 0.625rem; }
}

.hand-badge--active { background: rgba(212, 168, 67, 0.18); color: #d4a843; }
.hand-badge--folded { background: rgba(75, 85, 99, 0.5);    color: #9ca3af; }

/* ===== 잔액 행 ===== */
.balance-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.balance-text {
  font-size: 0.5625rem;
  color: rgba(134, 239, 172, 0.75);
}
.bet-text {
  font-size: 0.5625rem;
  color: rgba(253, 224, 71, 0.85);
}
@media (min-width: 640px) {
  .balance-text, .bet-text { font-size: 0.625rem; }
}

/* ===== 준비완료 ===== */
.ready-text {
  font-size: 0.5625rem;
  font-weight: 700;
  color: #4ade80;
  margin-top: 0.1rem;
}

/* ===== 상대 카드 크기: 내 카드보다 소형 (슬롯 내 fit) ===== */
/* SVG 원본 비율 103.2×168.2 (≈ 1:1.630) 에 맞게 높이 산출
   mobile: 3rem × 4.89rem  / sm: 4.2rem × 6.85rem             */
.player-slot :deep(.card-flip-container) {
  width: 3rem;
  height: 4.89rem;
}
.player-slot :deep(.sutda-card) {
  width: 3rem;
  height: 4.89rem;
  border-radius: 0.375rem;
}
.player-slot :deep(.sutda-card-back) {
  width: 3rem;
  height: 4.89rem;
  border-radius: 0.375rem;
}
@media (min-width: 640px) {
  .player-slot :deep(.card-flip-container) {
    width: 4.2rem;
    height: 6.85rem;
  }
  .player-slot :deep(.sutda-card) {
    width: 4.2rem;
    height: 6.85rem;
    border-radius: 0.5rem;
  }
  .player-slot :deep(.sutda-card-back) {
    width: 4.2rem;
    height: 6.85rem;
    border-radius: 0.5rem;
  }
}

/* ===== 액션 트랜지션 ===== */
.action-fade-enter-active { transition: all 0.3s ease; }
.action-fade-leave-active { transition: all 0.5s ease; }
.action-fade-enter-from { opacity: 0; transform: translateY(-6px) scale(0.8); }
.action-fade-leave-to   { opacity: 0; transform: translateY(6px)  scale(0.8); }
</style>

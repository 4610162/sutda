<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useLobbyStore } from "../composables/useLobbyStore";

const emit = defineEmits<{
  join: [name: string, room: string];
}>();

const { rooms, loading } = useLobbyStore();

const playerName = ref("");
const newRoomCode = ref("");
const showCreateForm = ref(false);
const nameError = ref("");

onMounted(() => {
  const saved = localStorage.getItem("sutda_player_name");
  if (saved) playerName.value = saved;
});

function saveName() {
  const trimmed = playerName.value.trim();
  if (trimmed) {
    localStorage.setItem("sutda_player_name", trimmed);
    nameError.value = "";
  }
}

function requireName(): boolean {
  if (!playerName.value.trim()) {
    nameError.value = "닉네임을 먼저 입력해주세요.";
    return false;
  }
  saveName();
  return true;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function handleCreateRoom() {
  if (!requireName()) return;
  const code = newRoomCode.value.trim() || generateCode();
  emit("join", playerName.value.trim(), code);
}

function handleJoinRoom(roomCode: string) {
  if (!requireName()) return;
  emit("join", playerName.value.trim(), roomCode);
}

function phaseLabel(phase: string): string {
  if (phase === "waiting") return "대기 중";
  if (phase === "playing") return "게임 중";
  if (phase === "result")  return "결과 중";
  return phase;
}

function canJoin(room: { phase: string; playerCount: number }): boolean {
  return room.phase === "waiting" && room.playerCount < 4;
}
</script>

<template>
  <div class="lobby-wrapper">

    <!-- ── 장식용 화투 카드 (배경 분위기) ── -->
    <div class="decor-cards" aria-hidden="true">
      <div class="decor-card dc-1">
        <img src="/cards/Hwatu_January_Hikari.svg" alt="" />
      </div>
      <div class="decor-card dc-2">
        <img src="/cards/Hwatu_August_Hikari.svg" alt="" />
      </div>
      <div class="decor-card dc-3">
        <img src="/cards/Hwatu_March_Hikari.svg" alt="" />
      </div>
      <div class="decor-card dc-4">
        <img src="/cards/Hwatu_November_Hikari.svg" alt="" />
      </div>
      <div class="decor-card dc-5">
        <img src="/cards/Hwatu_December_Hikari.svg" alt="" />
      </div>
    </div>

    <!-- ── 메인 컨텐츠 ── -->
    <div class="lobby-content">

      <!-- 헤더: 타이틀 -->
      <header class="lobby-header">
        <h1 class="lobby-title">섯다</h1>
        <p class="lobby-subtitle">화투 카드 게임</p>
        <div class="gold-divider">
          <span class="divider-line"></span>
          <span class="divider-gem">◆</span>
          <span class="divider-line"></span>
        </div>
      </header>

      <!-- 닉네임 패널 -->
      <div class="glass-panel">
        <label class="panel-label">닉네임</label>
        <input
          v-model="playerName"
          type="text"
          placeholder="닉네임을 입력하세요"
          maxlength="10"
          @blur="saveName"
          @keyup.enter="showCreateForm = true"
          class="wood-input"
        />
        <p v-if="nameError" class="error-msg">{{ nameError }}</p>
      </div>

      <!-- 방 목록 패널 -->
      <div class="glass-panel">
        <div class="panel-header">
          <h2 class="panel-title">열린 방</h2>
          <button
            @click="showCreateForm = !showCreateForm"
            class="btn-create"
            :class="{ 'btn-create--cancel': showCreateForm }"
          >
            {{ showCreateForm ? "취소" : "방 만들기" }}
          </button>
        </div>

        <!-- 방 만들기 폼 -->
        <Transition name="slide-down">
          <div v-if="showCreateForm" class="create-form">
            <label class="panel-label-sm">방 코드 (비워두면 자동 생성)</label>
            <div class="create-form-row">
              <input
                v-model="newRoomCode"
                type="text"
                placeholder="예: ROOM1"
                maxlength="20"
                @keyup.enter="handleCreateRoom"
                class="wood-input"
              />
              <button @click="handleCreateRoom" class="btn-make">만들기</button>
            </div>
          </div>
        </Transition>

        <!-- 로딩 -->
        <div v-if="loading" class="state-box">
          <span class="loading-text">방 목록 불러오는 중…</span>
        </div>

        <!-- 빈 목록 -->
        <div v-else-if="rooms.length === 0" class="state-box">
          <p class="empty-text">진행 중인 방이 없습니다.</p>
          <p class="empty-hint">'방 만들기'로 판을 열어보세요!</p>
        </div>

        <!-- 방 카드 그리드 -->
        <div v-else class="room-grid">
          <div
            v-for="room in rooms"
            :key="room._id"
            class="room-card"
            :class="{ 'room-card--disabled': !canJoin(room) }"
          >
            <div class="room-card-top">
              <span class="room-code">{{ room.roomCode }}</span>
              <span
                class="phase-badge"
                :class="room.phase === 'waiting' ? 'phase-waiting' : 'phase-playing'"
              >{{ phaseLabel(room.phase) }}</span>
            </div>
            <div class="room-player-count">
              <span class="player-icon">♟</span>
              {{ room.playerCount }}/4명
            </div>
            <button
              @click="handleJoinRoom(room.roomCode)"
              :disabled="!canJoin(room)"
              class="room-join-btn"
              :class="{ 'room-join-btn--disabled': !canJoin(room) }"
            >
              {{ canJoin(room) ? "입장" : "만석" }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   레이아웃
══════════════════════════════════════ */
.lobby-wrapper {
  position: relative;
  width: 100%;
  max-width: 32rem;
  margin: 0 auto;
  padding: 0 0.5rem;
}

.lobby-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ══════════════════════════════════════
   장식 화투 카드
══════════════════════════════════════ */
.decor-cards {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 1;
}

.decor-card {
  position: absolute;
  width: 2.8rem;
  height: 4.2rem;
  border-radius: 0.35rem;
  overflow: hidden;
  border: 1.5px solid rgba(212, 175, 55, 0.45);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.75),
    0 3px 8px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  opacity: 0.5;
}

.decor-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 카드 배치 & 개별 플로팅 애니메이션 */
.dc-1 {
  top: 2.5rem;
  left: -2.4rem;
  transform: rotate(-17deg);
  animation: float1 6.2s ease-in-out infinite;
}
.dc-2 {
  top: 7.5rem;
  left: -3.2rem;
  transform: rotate(-7deg);
  animation: float2 7.4s ease-in-out infinite;
}
.dc-3 {
  top: 2rem;
  right: -2rem;
  transform: rotate(14deg);
  animation: float3 5.8s ease-in-out infinite;
}
.dc-4 {
  top: 8rem;
  right: -3rem;
  transform: rotate(21deg);
  animation: float4 8.1s ease-in-out infinite;
}
.dc-5 {
  top: 1rem;
  right: 2.5rem;
  transform: rotate(7deg) scale(0.82);
  animation: float5 6.7s ease-in-out infinite;
}

@keyframes float1 {
  0%, 100% { transform: rotate(-17deg) translateY(0); }
  50%       { transform: rotate(-17deg) translateY(-7px); }
}
@keyframes float2 {
  0%, 100% { transform: rotate(-7deg) translateY(0); }
  50%       { transform: rotate(-7deg) translateY(-5px); }
}
@keyframes float3 {
  0%, 100% { transform: rotate(14deg) translateY(0); }
  50%       { transform: rotate(14deg) translateY(-9px); }
}
@keyframes float4 {
  0%, 100% { transform: rotate(21deg) translateY(0); }
  50%       { transform: rotate(21deg) translateY(-6px); }
}
@keyframes float5 {
  0%, 100% { transform: rotate(7deg) scale(0.82) translateY(0); }
  50%       { transform: rotate(7deg) scale(0.82) translateY(-8px); }
}

/* ══════════════════════════════════════
   헤더
══════════════════════════════════════ */
.lobby-header {
  text-align: center;
  padding: 1.75rem 0 0.25rem;
}

.lobby-title {
  font-family: 'Noto Serif KR', 'Nanum Myeongjo', Georgia, serif;
  font-size: 4.5rem;
  font-weight: 900;
  letter-spacing: 0.4em;
  line-height: 1;
  margin-bottom: 0.6rem;
  background: linear-gradient(
    150deg,
    #f9eea0 0%,
    #d4af37 40%,
    #b8860b 70%,
    #d4af37 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 12px rgba(212, 175, 55, 0.5));
}

.lobby-subtitle {
  font-family: 'Noto Serif KR', serif;
  font-size: 0.72rem;
  letter-spacing: 0.55em;
  color: rgba(212, 175, 55, 0.55);
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.gold-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 15rem;
  margin: 0 auto;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(212, 175, 55, 0.55),
    transparent
  );
}

.divider-gem {
  color: #d4af37;
  font-size: 0.6rem;
  opacity: 0.85;
}

/* ══════════════════════════════════════
   글라스모피즘 패널
══════════════════════════════════════ */
.glass-panel {
  position: relative;
  background: rgba(18, 8, 8, 0.78);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1px solid rgba(212, 175, 55, 0.18);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.65),
    0 4px 16px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(212, 175, 55, 0.14),
    inset 0 -1px 0 rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

/* 금색 상단 강조선 */
.glass-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(212, 175, 55, 0.55),
    transparent
  );
}

/* ══════════════════════════════════════
   레이블
══════════════════════════════════════ */
.panel-label {
  display: block;
  font-family: 'Noto Serif KR', serif;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: rgba(212, 175, 55, 0.65);
  margin-bottom: 0.625rem;
}

.panel-label-sm {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 0.5rem;
}

/* ══════════════════════════════════════
   패널 헤더
══════════════════════════════════════ */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.panel-title {
  font-family: 'Noto Serif KR', serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.06em;
}

/* ══════════════════════════════════════
   인풋
══════════════════════════════════════ */
.wood-input {
  width: 100%;
  padding: 0.6rem 0.875rem;
  background: rgba(6, 3, 3, 0.65);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 0.5rem;
  color: white;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}

.wood-input:focus {
  border-color: rgba(212, 175, 55, 0.55);
  box-shadow:
    0 0 0 3px rgba(212, 175, 55, 0.08),
    0 0 14px rgba(212, 175, 55, 0.12);
  background: rgba(10, 5, 5, 0.85);
}

.wood-input::placeholder {
  color: rgba(255, 255, 255, 0.22);
}

.error-msg {
  color: #ff7070;
  font-size: 0.72rem;
  margin-top: 0.45rem;
  letter-spacing: 0.03em;
}

/* ══════════════════════════════════════
   버튼들
══════════════════════════════════════ */

/* 방 만들기 / 취소 */
.btn-create {
  padding: 0.45rem 1.1rem;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.04em;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f4e47a 0%, #d4af37 50%, #a87820 100%);
  color: #1a0f0f;
  border: 1px solid rgba(212, 175, 55, 0.5);
  box-shadow:
    0 3px 10px rgba(212, 175, 55, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-create:hover {
  background: linear-gradient(135deg, #fff8a0 0%, #e8c53a 50%, #c89c30 100%);
  box-shadow:
    0 5px 18px rgba(212, 175, 55, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  transform: translateY(-1px);
}

.btn-create:active {
  transform: scale(0.96);
}

.btn-create--cancel {
  background: transparent;
  color: rgba(212, 175, 55, 0.7);
  border-color: rgba(212, 175, 55, 0.3);
  box-shadow: none;
}

.btn-create--cancel:hover {
  background: rgba(212, 175, 55, 0.1);
  box-shadow: none;
  transform: none;
}

/* 방 만들기 폼 내부 '만들기' 버튼 */
.btn-make {
  flex-shrink: 0;
  padding: 0.6rem 1.1rem;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  white-space: nowrap;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #d4af37 0%, #a87820 100%);
  color: #1a0f0f;
  border: 1px solid rgba(212, 175, 55, 0.5);
  box-shadow: 0 3px 10px rgba(212, 175, 55, 0.2);
}

.btn-make:hover {
  box-shadow: 0 5px 16px rgba(212, 175, 55, 0.4);
  transform: translateY(-1px);
}

/* ══════════════════════════════════════
   방 만들기 폼
══════════════════════════════════════ */
.create-form {
  background: rgba(6, 3, 3, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.12);
  border-radius: 0.75rem;
  padding: 1rem;
  overflow: hidden;
}

.create-form-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ══════════════════════════════════════
   상태 메시지 (로딩 / 빈 목록)
══════════════════════════════════════ */
.state-box {
  text-align: center;
  padding: 2.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.loading-text {
  color: rgba(212, 175, 55, 0.6);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  animation: pulse-opacity 1.6s ease-in-out infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}

.empty-icon {
  font-size: 2.2rem;
  opacity: 0.35;
  line-height: 1;
}

.empty-text {
  color: rgba(255, 255, 255, 0.38);
  font-size: 0.875rem;
  letter-spacing: 0.04em;
}

.empty-hint {
  color: rgba(212, 175, 55, 0.45);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}

/* ══════════════════════════════════════
   방 카드 그리드
══════════════════════════════════════ */
.room-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (max-width: 380px) {
  .room-grid {
    grid-template-columns: 1fr;
  }
}

/* ── 방 카드 ── */
.room-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(150deg, #1e0e0e 0%, #160909 100%);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 0.75rem;
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.55),
    0 2px 6px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition:
    transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1),
    border-color 0.35s ease,
    box-shadow 0.35s ease;
  overflow: hidden;
}

/* 상단 금색 강조선 */
.room-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(212, 175, 55, 0.4),
    transparent
  );
}

.room-card:hover:not(.room-card--disabled) {
  transform: translateY(-4px);
  border-color: rgba(212, 175, 55, 0.38);
  box-shadow:
    0 14px 38px rgba(0, 0, 0, 0.65),
    0 0 22px rgba(212, 175, 55, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.room-card--disabled {
  opacity: 0.5;
}

.room-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
}

.room-code {
  font-family: 'Noto Serif KR', serif;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.04em;
  word-break: break-all;
  line-height: 1.25;
}

.phase-badge {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.phase-waiting {
  background: rgba(30, 90, 45, 0.5);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.25);
}

.phase-playing {
  background: rgba(110, 70, 8, 0.55);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.room-player-count {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  letter-spacing: 0.03em;
}

.player-icon {
  color: rgba(212, 175, 55, 0.5);
  font-size: 0.72rem;
}

/* 입장 버튼 */
.room-join-btn {
  margin-top: 0.25rem;
  width: 100%;
  padding: 0.45rem;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.1em;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(212, 175, 55, 0.1);
  color: rgba(212, 175, 55, 0.85);
  border: 1px solid rgba(212, 175, 55, 0.3);
}

.room-join-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #d4af37 0%, #a87820 100%);
  color: #1a0f0f;
  border-color: transparent;
  box-shadow: 0 3px 14px rgba(212, 175, 55, 0.4);
}

.room-join-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.room-join-btn--disabled {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.22);
  border-color: rgba(255, 255, 255, 0.08);
  cursor: not-allowed;
}

/* ══════════════════════════════════════
   트랜지션 — 방 만들기 폼 슬라이드
══════════════════════════════════════ */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.32s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 140px;
  margin-bottom: 1.25rem;
}
</style>

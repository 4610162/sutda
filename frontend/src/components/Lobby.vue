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
const showRulesModal = ref(false);

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

    <!-- ── 최상단 화투패 행 (1월·3월·8월) ── -->
    <div class="hwatu-row" aria-hidden="true">
      <div class="hwatu-card hc-1">
        <img src="/cards/Hwatu_January_Hikari.svg" alt="" />
      </div>
      <div class="hwatu-card hc-2">
        <img src="/cards/Hwatu_March_Hikari.svg" alt="" />
      </div>
      <div class="hwatu-card hc-3">
        <img src="/cards/Hwatu_August_Hikari.svg" alt="" />
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
          <h2 class="panel-title">방 목록</h2>
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
            <label class="panel-label-sm">방 이름 (비워두면 자동 생성)</label>
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

      <!-- ── 게임 규칙 버튼 ── -->
      <footer class="rules-footer">
        <button class="btn-rules" @click="showRulesModal = true">
          <span class="btn-rules-icon">◈</span>
          게임 규칙
        </button>
      </footer>

    </div>

    <!-- ── 게임 규칙 모달 ── -->
    <Transition name="modal-fade">
      <div v-if="showRulesModal" class="modal-overlay" @click.self="showRulesModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <h2 class="modal-title">게임 규칙</h2>
            <button class="modal-close" @click="showRulesModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="rules-section">
              <h3 class="rules-section-title">기본 규칙</h3>
              <ul class="rules-list">
                <li>2~4명이 참여하여 진행합니다.</li>
                <li>각 플레이어는 화투패 2장을 받습니다.</li>
                <li>패의 합산 끝자리가 높을수록 유리합니다.</li>
                <li>9가 최고이며, 0(망통)이 최하입니다.</li>
                <li>베팅 후 최종 패를 공개하여 승자를 결정합니다.</li>
              </ul>
            </div>
            <div class="rules-section">
              <h3 class="rules-section-title">주요 족보 (강한 순)</h3>
              <ul class="rules-list rules-list--rank">
                <li><span class="rank-name">삼팔광땡</span> 3월 + 8월 (최강)</li>
                <li><span class="rank-name">땡</span> 같은 월 2장 (숫자 높을수록 유리)</li>
                <li><span class="rank-name">알리</span> 1월 + 2월</li>
                <li><span class="rank-name">독사</span> 1월 + 4월</li>
                <li><span class="rank-name">구삥</span> 1월 + 9월</li>
                <li><span class="rank-name">장삥</span> 1월 + 10월</li>
                <li><span class="rank-name">장사</span> 4월 + 10월</li>
                <li><span class="rank-name">세륙</span> 4월 + 6월</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ══════════════════════════════════════
   최상위 래퍼 — 아이폰 17 프로 세로 최적화
   전체 뷰포트 높이를 flex column 으로 분할
══════════════════════════════════════ */
.lobby-wrapper {
  position: relative;
  width: 100%;
  max-width: 32rem;
  margin: 0 auto;
  min-height: 100svh; /* safe viewport height (구형 브라우저는 100vh 폴백) */
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* ══════════════════════════════════════
   최상단 화투패 행 (부채꼴 배치)
══════════════════════════════════════ */
.hwatu-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  gap: 2rem;
  padding: 1.5rem 1.25rem 0.875rem;
  flex-shrink: 0;
}

.hwatu-card {
  width: 3.1rem;
  height: 4.65rem;
  border-radius: 0.4rem;
  overflow: hidden;
  border: 1.5px solid rgba(212, 175, 55, 0.5);
  box-shadow:
    0 10px 28px rgba(0, 0, 0, 0.75),
    0 3px 8px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.hwatu-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 부채꼴 회전 + 개별 플로팅 */
.hc-1 {
  transform: rotate(-12deg) translateY(6px);
  animation: hfloat1 6.2s ease-in-out infinite;
}
.hc-2 {
  transform: rotate(0deg) translateY(0);
  animation: hfloat2 7.4s ease-in-out infinite;
}
.hc-3 {
  transform: rotate(12deg) translateY(6px);
  animation: hfloat3 5.8s ease-in-out infinite;
}

@keyframes hfloat1 {
  0%, 100% { transform: rotate(-12deg) translateY(6px); }
  50%       { transform: rotate(-12deg) translateY(0px); }
}
@keyframes hfloat2 {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50%       { transform: rotate(0deg) translateY(-6px); }
}
@keyframes hfloat3 {
  0%, 100% { transform: rotate(12deg) translateY(6px); }
  50%       { transform: rotate(12deg) translateY(0px); }
}


/* ══════════════════════════════════════
   메인 콘텐츠 영역 (flex: 1 로 남은 공간 차지)
══════════════════════════════════════ */
.lobby-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
  padding: 0 1.25rem;
}

/* ══════════════════════════════════════
   최하단 게임 규칙 푸터
══════════════════════════════════════ */
.rules-footer {
  display: flex;
  justify-content: center;
  padding: 0.25rem 0 1rem;
}

.btn-rules {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 2.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.12em;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: rgba(212, 175, 55, 0.7);
  border: 1px solid rgba(212, 175, 55, 0.32);
  box-shadow: 0 0 18px rgba(212, 175, 55, 0.05);
}

.btn-rules:hover {
  background: rgba(212, 175, 55, 0.08);
  color: rgba(212, 175, 55, 0.95);
  border-color: rgba(212, 175, 55, 0.55);
  box-shadow: 0 0 24px rgba(212, 175, 55, 0.18);
  transform: translateY(-1px);
}

.btn-rules:active {
  transform: scale(0.96);
}

.btn-rules-icon {
  font-size: 0.7rem;
  opacity: 0.75;
}

/* ══════════════════════════════════════
   헤더
══════════════════════════════════════ */
.lobby-header {
  text-align: center;
  padding: 0.75rem 0 0.25rem;
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
  box-sizing: border-box;
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
  scrollbar-width: thin;
  scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
  -webkit-overflow-scrolling: touch;
}

.room-grid::-webkit-scrollbar        { width: 3px; }
.room-grid::-webkit-scrollbar-track  { background: transparent; }
.room-grid::-webkit-scrollbar-thumb  {
  background: rgba(212, 175, 55, 0.35);
  border-radius: 2px;
}

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

/* ══════════════════════════════════════
   게임 규칙 모달
══════════════════════════════════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-box {
  width: 100%;
  max-width: 32rem;
  max-height: 75vh;
  background: linear-gradient(160deg, #1e0c0c 0%, #130808 100%);
  border: 1px solid rgba(212, 175, 55, 0.22);
  border-radius: 1.25rem 1.25rem 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 -20px 60px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(212, 175, 55, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(212, 175, 55, 0.12);
  flex-shrink: 0;
}

.modal-title {
  font-family: 'Noto Serif KR', serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(135deg, #f9eea0 0%, #d4af37 60%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.modal-close {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(212, 175, 55, 0.15);
  border-color: rgba(212, 175, 55, 0.35);
  color: rgba(212, 175, 55, 0.9);
}

.modal-body {
  padding: 1.25rem 1.5rem 1.75rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.rules-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.rules-section-title {
  font-family: 'Noto Serif KR', serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(212, 175, 55, 0.65);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rules-list li {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
  line-height: 1.5;
  padding-left: 1rem;
  position: relative;
}

.rules-list li::before {
  content: '·';
  position: absolute;
  left: 0;
  color: rgba(212, 175, 55, 0.6);
}

.rules-list--rank li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-left: 0;
}

.rules-list--rank li::before {
  display: none;
}

.rank-name {
  flex-shrink: 0;
  font-weight: 700;
  color: rgba(212, 175, 55, 0.9);
  font-size: 0.8rem;
  min-width: 4rem;
  letter-spacing: 0.04em;
}

/* 모달 트랜지션 (하단 슬라이드 업) */
.modal-fade-enter-active {
  transition: opacity 0.28s ease;
}
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}
.modal-fade-enter-active .modal-box {
  transition: transform 0.32s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.modal-fade-leave-active .modal-box {
  transition: transform 0.24s cubic-bezier(0.55, 0, 1, 0.45);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-box,
.modal-fade-leave-to .modal-box {
  transform: translateY(100%);
}

/* ══════════════════════════════════════
   모바일 세로 핏-투-스크린 최적화
   ── 가로폭 768px 이하
══════════════════════════════════════ */
@media (max-width: 768px) {
  .lobby-content {
    gap: 1rem;
  }

  .lobby-header {
    padding: 0.5rem 0 0.125rem;
  }

  .lobby-title {
    font-size: clamp(3rem, 13vw, 4.5rem);
    margin-bottom: 0.4rem;
  }

  .lobby-subtitle {
    margin-bottom: 0.75rem;
  }

  .glass-panel {
    padding: 1.125rem;
  }

  .panel-header {
    margin-bottom: 1rem;
  }

  .state-box {
    padding: 1.5rem 1rem;
  }
}

/* ══════════════════════════════════════
   ── 아이폰 17 프로 세로 모드
      (폭 393px~430px, 높이 852px~956px)
══════════════════════════════════════ */
@media (max-width: 430px) {
  .hwatu-row {
    gap: 0.4rem;
    padding: 1.25rem 1rem 0.75rem;
  }

  .hwatu-card {
    width: 2.9rem;
    height: 4.35rem;
  }

  .lobby-content {
    gap: 0.875rem;
    padding: 0 1rem;
  }

  .rules-footer {
    padding: 0.875rem 1rem;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 1.25rem));
  }

  .room-grid {
    grid-template-columns: 1fr;
    max-height: 32vh;
    overflow-y: auto;
  }
}

/* ══════════════════════════════════════
   ── 세로 높이 기준: 800px 이하
══════════════════════════════════════ */
@media (max-height: 800px) {
  .hwatu-row {
    padding: 1rem 1.25rem 0.5rem;
  }

  .hwatu-card {
    width: 2.8rem;
    height: 4.2rem;
  }

  .lobby-content {
    gap: 0.875rem;
  }

  .lobby-header {
    padding: 0.25rem 0 0;
  }

  .lobby-title {
    font-size: clamp(2.75rem, 9vw, 4rem);
    margin-bottom: 0.3rem;
  }

  .lobby-subtitle {
    margin-bottom: 0.625rem;
  }

  .glass-panel {
    padding: 1rem;
  }

  .panel-header {
    margin-bottom: 0.875rem;
  }

  .state-box {
    padding: 1.25rem 1rem;
  }

  .room-grid {
    max-height: 30vh;
    overflow-y: auto;
  }
}

/* ══════════════════════════════════════
   ── 세로 높이 기준: 700px 이하
══════════════════════════════════════ */
@media (max-height: 700px) {
  .hwatu-row {
    padding: 0.75rem 1.25rem 0.375rem;
  }

  .hwatu-card {
    width: 2.5rem;
    height: 3.75rem;
  }

  .lobby-content {
    gap: 0.625rem;
  }

  .lobby-header {
    padding: 0.125rem 0 0;
  }

  .lobby-title {
    font-size: clamp(2.25rem, 8vw, 3.25rem);
    margin-bottom: 0.2rem;
  }

  .lobby-subtitle {
    font-size: 0.65rem;
    margin-bottom: 0.375rem;
  }

  .glass-panel {
    padding: 0.875rem;
    border-radius: 0.75rem;
  }

  .panel-label {
    margin-bottom: 0.375rem;
  }

  .panel-header {
    margin-bottom: 0.625rem;
  }

  .wood-input {
    padding: 0.5rem 0.75rem;
    font-size: 0.825rem;
  }

  .state-box {
    padding: 1rem;
  }

  .room-grid {
    max-height: 28vh;
    overflow-y: auto;
    gap: 0.625rem;
  }

  .rules-footer {
    padding: 0.5rem 1.25rem;
    padding-bottom: max(0.875rem, env(safe-area-inset-bottom, 0.875rem));
  }

  .btn-rules {
    padding: 0.5rem 1.75rem;
    font-size: 0.8rem;
  }
}

/* ══════════════════════════════════════
   ── 세로 높이 600px 이하
      (아이폰 SE 가로 모드 / 초소형 기기)
══════════════════════════════════════ */
@media (max-height: 600px) {
  .hwatu-row {
    display: none; /* 세로 공간 매우 부족 시 화투패 행 숨김 */
  }

  .lobby-content {
    gap: 0.5rem;
  }

  .lobby-header {
    padding: 0.375rem 0 0;
  }

  .lobby-title {
    font-size: clamp(1.85rem, 7vw, 2.75rem);
    margin-bottom: 0.125rem;
  }

  .lobby-subtitle {
    font-size: 0.6rem;
    letter-spacing: 0.35em;
    margin-bottom: 0.25rem;
  }

  .gold-divider {
    display: none;
  }

  .glass-panel {
    padding: 0.75rem;
    border-radius: 0.625rem;
  }

  .panel-label {
    font-size: 0.68rem;
    margin-bottom: 0.3rem;
  }

  .panel-header {
    margin-bottom: 0.5rem;
  }

  .wood-input {
    padding: 0.4rem 0.625rem;
    font-size: 0.8rem;
  }

  .btn-create {
    padding: 0.35rem 0.875rem;
    font-size: 0.78rem;
  }

  .state-box {
    padding: 0.75rem;
    gap: 0.25rem;
  }

  .room-grid {
    max-height: 25vh;
    overflow-y: auto;
    gap: 0.5rem;
  }

  .room-card {
    padding: 0.625rem;
    gap: 0.3rem;
  }

  .room-join-btn {
    padding: 0.35rem;
    font-size: 0.72rem;
    margin-top: 0.1rem;
  }

  .rules-footer {
    padding: 0.375rem 1.25rem;
    padding-bottom: max(0.625rem, env(safe-area-inset-bottom, 0.625rem));
  }

  .btn-rules {
    padding: 0.4rem 1.25rem;
    font-size: 0.75rem;
  }
}
</style>

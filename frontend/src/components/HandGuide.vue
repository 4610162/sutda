<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();

const HANDS = [
  { tier: "광땡", name: "38광땡", desc: "3월 광 + 8월 광", color: "text-yellow-300" },
  { tier: "광땡", name: "18광땡", desc: "1월 광 + 8월 광", color: "text-yellow-300" },
  { tier: "광땡", name: "13광땡", desc: "1월 광 + 3월 광", color: "text-yellow-300" },
  { tier: "땡",   name: "장땡",   desc: "10 + 10 (동일 월 최강)", color: "text-orange-300" },
  { tier: "땡",   name: "9땡",    desc: "9 + 9", color: "text-orange-300" },
  { tier: "땡",   name: "8땡",    desc: "8 + 8", color: "text-orange-300" },
  { tier: "땡",   name: "7땡",    desc: "7 + 7", color: "text-orange-300" },
  { tier: "땡",   name: "6땡",    desc: "6 + 6", color: "text-orange-300" },
  { tier: "땡",   name: "5땡",    desc: "5 + 5", color: "text-orange-300" },
  { tier: "땡",   name: "4땡",    desc: "4 + 4", color: "text-orange-300" },
  { tier: "땡",   name: "3땡",    desc: "3 + 3", color: "text-orange-300" },
  { tier: "땡",   name: "2땡",    desc: "2 + 2", color: "text-orange-300" },
  { tier: "땡",   name: "1땡",    desc: "1 + 1", color: "text-orange-300" },
  { tier: "특수",  name: "알리",   desc: "1 + 2", color: "text-blue-300" },
  { tier: "특수",  name: "독사",   desc: "1 + 4", color: "text-blue-300" },
  { tier: "특수",  name: "구삥",   desc: "1 + 9", color: "text-blue-300" },
  { tier: "특수",  name: "장삥",   desc: "1 + 10", color: "text-blue-300" },
  { tier: "특수",  name: "장사",   desc: "4 + 10", color: "text-blue-300" },
  { tier: "특수",  name: "세륙",   desc: "4 + 6", color: "text-blue-300" },
  { tier: "끗",   name: "9끗",    desc: "합산 mod 10 = 9", color: "text-gray-300" },
  { tier: "끗",   name: "8끗",    desc: "합산 mod 10 = 8", color: "text-gray-300" },
  { tier: "끗",   name: "7끗",    desc: "합산 mod 10 = 7", color: "text-gray-300" },
  { tier: "끗",   name: "6끗",    desc: "합산 mod 10 = 6", color: "text-gray-300" },
  { tier: "끗",   name: "5끗",    desc: "합산 mod 10 = 5", color: "text-gray-300" },
  { tier: "끗",   name: "4끗",    desc: "합산 mod 10 = 4", color: "text-gray-300" },
  { tier: "끗",   name: "3끗",    desc: "합산 mod 10 = 3", color: "text-gray-300" },
  { tier: "끗",   name: "2끗",    desc: "합산 mod 10 = 2", color: "text-gray-300" },
  { tier: "끗",   name: "1끗",    desc: "합산 mod 10 = 1", color: "text-gray-300" },
  { tier: "꼴찌",  name: "망통",   desc: "합산 mod 10 = 0 (광땡 아닐 때)", color: "text-red-400" },
] as const;

const TIERS = ["광땡", "땡", "특수", "끗", "꼴찌"] as const;
type Tier = typeof TIERS[number];

function handsForTier(tier: Tier) {
  return HANDS.filter((h) => h.tier === tier);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="guide-fade">
      <!--
        [핵심 구조]
        - 이 div가 배경(Overlay) 역할을 겸함: 클릭하면 닫힘
        - z-index를 인라인 style로 9999 지정 → Tailwind 유틸리티 클래스나
          Game.vue scoped z-index의 stacking context에 무관하게 항상 최상단
        - backdrop-blur-sm: 뒤 배경과 시각적으로 확실히 분리
      -->
      <div
        class="fixed inset-0 flex items-center justify-center p-4
               bg-black/65 backdrop-blur-sm"
        style="z-index: 9999;"
        @click="emit('close')"
      >
        <!--
          [팝업 본체]
          - @click.stop: 내부 클릭 이벤트가 부모(overlay)로 버블링되는 것을 차단
          - z-index를 인라인 style로 10000 지정 → overlay 위에 확실히 위치
          - pointer-events: auto (기본값) → 팝업 내 모든 클릭 정상 동작
        -->
        <div
          class="relative flex flex-col bg-gray-900 border border-sutda-gold/50
                 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(0,0,0,0.7)]
                 ring-1 ring-white/10"
          style="max-height: 85vh; z-index: 10000;"
          @click.stop
        >
          <!-- 상단 골드 글로우 라인 -->
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sutda-gold/70 to-transparent rounded-t-2xl"></div>

          <!-- 헤더 -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-sutda-gold tracking-wide">족보 가이드</h2>
            </div>
            <button
              @click="emit('close')"
              class="w-7 h-7 flex items-center justify-center rounded-full
                     text-gray-500 hover:text-white hover:bg-white/10
                     transition-colors leading-none text-xl"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          <!-- 스크롤 가능한 콘텐츠 영역 -->
          <div class="overflow-y-auto flex-1 px-5 py-4 space-y-4 min-h-0">
            <p class="text-gray-500 text-xs">위에서 아래로 강한 순서입니다.</p>

            <div v-for="tier in TIERS" :key="tier" class="space-y-1.5">
              <!-- 등급 헤더 -->
              <div class="flex items-center gap-2">
                <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  {{ tier }}
                </div>
                <div class="flex-1 h-px bg-white/5"></div>
              </div>
              <!-- 패 목록 -->
              <div class="space-y-1">
                <div
                  v-for="hand in handsForTier(tier)"
                  :key="hand.name"
                  class="flex items-center justify-between
                         bg-white/5 hover:bg-white/8 rounded-lg px-3.5 py-2
                         transition-colors"
                >
                  <span class="font-bold text-sm" :class="hand.color">{{ hand.name }}</span>
                  <span class="text-gray-500 text-xs">{{ hand.desc }}</span>
                </div>
              </div>
            </div>

            <!-- 추가 규칙 -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
              <p class="text-[11px] text-gray-400 font-semibold mb-2 uppercase tracking-wider">추가 규칙</p>
              <ul class="text-xs text-gray-500 space-y-1.5 list-none">
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>광땡은 해당 월 카드가 모두 <span class="text-yellow-300">光(Hikari)</span>일 때만 성립</li>
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>땡은 같은 월 두 장 (1~10월, 장땡 = 10땡)</li>
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>특수패는 땡보다 약하지만 끗보다 강함</li>
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>끗은 두 장 월 합계의 1의 자리 (높을수록 강함)</li>
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>망통(0끗)은 특수패가 아닐 때 가장 약함</li>
                <li class="flex gap-2"><span class="text-gray-700 select-none">·</span>콜(Call)은 상대 베팅에 맞추고 즉시 족보 비교</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 팝업 등장/퇴장 트랜지션 */
.guide-fade-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.guide-fade-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.guide-fade-enter-from {
  opacity: 0;
  transform: scale(0.97);
}
.guide-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>

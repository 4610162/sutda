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

// 등급별 그룹핑
const TIERS = ["광땡", "땡", "특수", "끗", "꼴찌"] as const;
type Tier = typeof TIERS[number];

function handsForTier(tier: Tier) {
  return HANDS.filter((h) => h.tier === tier);
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="absolute inset-0 bg-black/75" @click="emit('close')"></div>

      <div
        class="relative z-10 bg-gray-800 border-2 border-sutda-gold/60 rounded-2xl
               w-full max-w-lg shadow-2xl overflow-hidden"
        style="max-height: 85vh;"
      >
        <!-- 헤더 -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 class="text-xl font-bold text-sutda-gold">족보 가이드</h2>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <!-- 순위 설명 -->
        <div class="overflow-y-auto px-6 py-4 space-y-4" style="max-height: calc(85vh - 72px);">
          <p class="text-gray-400 text-xs">위에서 아래로 강한 순서입니다.</p>

          <div v-for="tier in TIERS" :key="tier">
            <!-- 등급 헤더 -->
            <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {{ tier }}
            </div>
            <div class="space-y-1">
              <div
                v-for="hand in handsForTier(tier)"
                :key="hand.name"
                class="flex items-center justify-between bg-gray-700/60 rounded-lg px-4 py-2"
              >
                <span class="font-bold text-sm" :class="hand.color">{{ hand.name }}</span>
                <span class="text-gray-400 text-xs">{{ hand.desc }}</span>
              </div>
            </div>
          </div>

          <!-- 추가 규칙 -->
          <div class="bg-gray-700/40 rounded-lg p-4 mt-2">
            <p class="text-xs text-gray-400 font-semibold mb-2">추가 규칙</p>
            <ul class="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>광땡은 해당 월 카드가 모두 <span class="text-yellow-300">光(Hikari)</span>일 때만 성립</li>
              <li>땡은 같은 월 두 장 (1~10월, 장땡=10땡)</li>
              <li>특수패는 땡보다 약하지만 끗보다 강함</li>
              <li>끗은 두 장 월 합계의 1의 자리 (높을수록 강함)</li>
              <li>망통(0끗)은 특수패가 아닐 때 가장 약함</li>
              <li>콜(Call)은 상대 베팅에 맞추고 즉시 족보 비교</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  month: number;
  isKwang: boolean;
  faceUp?: boolean; // true면 앞면, false면 뒷면 (기본: true)
}>();

const MONTH_NAMES: Record<number, string> = {
  1: "일", 2: "이", 3: "삼", 4: "사", 5: "오",
  6: "육", 7: "칠", 8: "팔", 9: "구", 10: "장",
};

const KWANG_MONTHS = new Set([1, 3, 8]);
const isKwangCard = KWANG_MONTHS.has(props.month) && props.isKwang;

// 뒤집기 애니메이션 상태
const flipped = ref(props.faceUp !== false);

watch(
  () => props.faceUp,
  (val) => {
    // 약간의 딜레이 후 뒤집기
    setTimeout(() => {
      flipped.value = val !== false;
    }, 100);
  }
);
</script>

<template>
  <div class="card-flip-container">
    <div class="card-flipper" :class="{ flipped }">
      <!-- 뒷면 -->
      <div class="card-back-face sutda-card-back">
        <span class="text-sutda-gold text-2xl font-serif">花</span>
      </div>
      <!-- 앞면 -->
      <div
        class="card-front sutda-card"
        :class="{
          'border-red-500 bg-red-50': isKwangCard,
          'border-blue-400 bg-blue-50': props.isKwang && !isKwangCard,
        }"
      >
        <span class="text-[10px] text-gray-400">{{ month }}월</span>
        <span
          class="text-3xl leading-none"
          :class="{
            'text-red-600': isKwangCard,
            'text-blue-600': props.isKwang && !isKwangCard,
            'text-gray-800': !props.isKwang,
          }"
        >
          {{ MONTH_NAMES[month] }}
        </span>
        <span v-if="isKwangCard" class="text-[10px] text-red-500 mt-0.5">光</span>
        <span v-else-if="props.isKwang" class="text-[10px] text-blue-500 mt-0.5">특</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { SutdaCard } from "../types";

const props = defineProps<{
  card: SutdaCard;
  faceUp?: boolean;
}>();

// 이미지 경로
const imgSrc = computed(() =>
  `/cards/${props.card.imageFile}`,
);

// 뒤집기 애니메이션
const flipped = ref(props.faceUp !== false);
watch(
  () => props.faceUp,
  (val) => {
    setTimeout(() => {
      flipped.value = val !== false;
    }, 100);
  },
);

// 광패 테두리 색상
const isKwang = computed(() => props.card.isKwang);
</script>

<template>
  <div class="card-flip-container">
    <div class="card-flipper" :class="{ flipped }">
      <!-- 뒷면 -->
      <div class="card-back-face sutda-card-back">
        <span class="text-sutda-gold text-2xl font-serif">花</span>
      </div>
      <!-- 앞면: 실제 화투 이미지 -->
      <div
        class="card-front sutda-card overflow-hidden p-0"
        :class="{ 'ring-2 ring-yellow-400': isKwang }"
      >
        <img
          :src="imgSrc"
          :alt="`${card.month}월 카드`"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <!-- 광 배지 -->
        <div
          v-if="isKwang"
          class="absolute top-0.5 right-0.5 bg-yellow-500 text-black text-[9px]
                 font-bold px-0.5 rounded leading-tight"
        >
          光
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-front {
  position: relative;
}
</style>

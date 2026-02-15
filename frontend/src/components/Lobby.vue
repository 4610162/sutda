<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  join: [name: string, room: string];
}>();

const name = ref("");
const room = ref("default");

function handleSubmit() {
  if (!name.value.trim()) return;
  emit("join", name.value.trim(), room.value.trim() || "default");
}
</script>

<template>
  <div class="bg-gray-800 rounded-xl p-8 w-full max-w-md shadow-2xl">
    <h2 class="text-2xl font-bold text-center text-sutda-gold mb-6">
      게임 참가
    </h2>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm text-gray-300 mb-1">닉네임</label>
        <input
          v-model="name"
          type="text"
          placeholder="닉네임을 입력하세요"
          maxlength="10"
          class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                 text-white placeholder-gray-400 focus:outline-none focus:border-sutda-gold"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-300 mb-1">방 이름</label>
        <input
          v-model="room"
          type="text"
          placeholder="방 이름 (기본: default)"
          maxlength="20"
          class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg
                 text-white placeholder-gray-400 focus:outline-none focus:border-sutda-gold"
        />
      </div>

      <button
        type="submit"
        :disabled="!name.trim()"
        class="btn-primary w-full text-center"
      >
        입장하기
      </button>
    </form>
  </div>
</template>

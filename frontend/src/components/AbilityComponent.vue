<template>
  <div
    class="flex flex-col items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
  >
    <div class="flex flex-col items-center justify-center w-16 h-16">
      <img :src="icon" class="object-contain w-full h-full" />
    </div>
    <span class="mt-2 text-xs font-bold text-amber-200">{{ ability }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AbilityComponent',
  props: {
    icon: String,
    ability: String,
  },
  setup() {
    // Ihre Logik hier
  },
})
</script>

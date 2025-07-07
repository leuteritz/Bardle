<template>
  <div
    class="flex flex-col items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
    @click="increaseLevel"
  >
    <div class="flex flex-row gap-0.5 mb-1">
      <div
        v-for="n in 5"
        :key="n"
        class="w-2 h-2 border-2 rounded border-amber-400"
        :class="n <= abilityLevel ? 'bg-white/60' : ''"
      ></div>
    </div>
    <div class="flex flex-col items-center justify-center w-16 h-16">
      <img :src="icon" class="object-contain w-full h-full drop-shadow-lg" />
    </div>
    <span class="mt-2 text-xs font-bold text-amber-400">{{ ability }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'AbilityComponent',
  props: {
    icon: String,
    ability: String,
  },
  setup() {
    const abilityLevel = ref(0)
    function increaseLevel() {
      if (abilityLevel.value < 5) abilityLevel.value++
    }
    return { abilityLevel, increaseLevel }
  },
})
</script>

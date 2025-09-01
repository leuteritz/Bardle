<template>
  <div
    class="relative p-3 overflow-hidden"
    :class="{ 'backdrop-blur-sm': gameStore.isCPSModalOpen }"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-16 h-16 bg-purple-500 rounded-full top-2 left-2 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute w-12 h-12 bg-pink-500 rounded-full top-2 right-2 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
    </div>

    <!-- Kompakter Header -->
    <div class="relative z-10 mb-3 text-center">
      <div class="text-xs">
        <span
          class="px-2 py-1 text-xs font-semibold text-purple-300 border rounded-full bg-purple-500/20 border-purple-400/30 backdrop-blur-sm"
        >
          Skill Points: {{ gameStore.skillPoints }}
        </span>
      </div>
    </div>

    <!-- Kompakte Abilities Grid -->
    <div class="relative z-10 flex justify-center gap-2">
      <AbilityComponent
        v-for="(icon, idx) in abilityIcons"
        :key="abilityKeys[idx]"
        :icon="icon"
        :ability="abilityKeys[idx]"
        :abilityLevel="gameStore.abilityLevels[idx]"
        :canUpgrade="gameStore.skillPoints > 0 && gameStore.abilityLevels[idx] < 5"
        @upgrade="gameStore.upgradeAbility(idx)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import AbilityComponent from './AbilityComponent.vue'

const abilityIcons = [
  '/img/BardAbilities/BardQ.png',
  '/img/BardAbilities/BardW.png',
  '/img/BardAbilities/BardE.png',
  '/img/BardAbilities/BardR.png',
]
const abilityKeys = ['Q', 'W', 'E', 'R']

export default defineComponent({
  name: 'AbilityBarComponent',
  components: { AbilityComponent },
  setup() {
    const gameStore = useGameStore()
    return { gameStore, abilityIcons, abilityKeys }
  },
})
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(15px, -25px) scale(1.1);
  }
  66% {
    transform: translate(-10px, 10px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
</style>

<template>
  <div class="p-3">
    <!-- Kompakter Header -->
    <div class="mb-3 text-center">
      <div class="text-xs">
        <span
          class="px-2 py-1 text-xs font-semibold border rounded-full bg-amber-100/20 text-amber-100 border-amber-300/30"
        >
          Skill Points: {{ gameStore.skillPoints }}
        </span>
      </div>
    </div>

    <!-- Kompakte Abilities Grid -->
    <div class="flex justify-center gap-2">
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

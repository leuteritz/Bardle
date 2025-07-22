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

<template>
  <div
    class="flex flex-row items-end gap-4 p-4 border-4 shadow-2xl bg-white/90 border-amber-300 rounded-2xl"
  >
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
</template>

<style scoped></style>

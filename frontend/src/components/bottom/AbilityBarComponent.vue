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
    class="flex flex-row items-end w-full h-full gap-2 p-4 border-l-2 border-r-2 border-amber-400"
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

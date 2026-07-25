<template>
  <!-- Fifth column of the career ledger: multikills and MVP awards -->
  <StatGroupPanel
    title="HIGHLIGHTS"
    icon="game-icons:laurels-trophy"
    color="#e8c040"
    :rows="rows"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { formatNumber } from '@/config/numberFormat'
import StatGroupPanel, { type StatRow } from './StatGroupPanel.vue'

const battleStore = useBattleStore()
const { allTime } = storeToRefs(battleStore)

// Career multikills plus the running battle's (live delta zeroes on finalize)
const rows = computed<StatRow[]>(() => {
  const live = battleStore.liveBattleStats.multikills
  return [
    {
      label: 'Double',
      value: formatNumber(allTime.value.multikills.double + live.double),
      color: '#93c5fd',
    },
    {
      label: 'Triple',
      value: formatNumber(allTime.value.multikills.triple + live.triple),
      color: '#7ce0a0',
    },
    {
      label: 'Quadra',
      value: formatNumber(allTime.value.multikills.quadra + live.quadra),
      color: '#e8c040',
    },
    {
      label: 'Penta',
      value: formatNumber(allTime.value.multikills.penta + live.penta),
      color: '#ff9a40',
    },
    {
      label: 'MVP Awards',
      value: formatNumber(allTime.value.mvpAwards),
      color: '#e8c040',
    },
  ]
})
</script>

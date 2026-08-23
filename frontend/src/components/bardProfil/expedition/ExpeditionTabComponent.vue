<script setup lang="ts">
/**
 * Der Expeditions-Reiter.
 *
 * Oben die Sternenkarte der befreiten Galaxien, darunter das Vertragsbrett.
 * Die Karte sagt WO der Spieler war, das Brett WAS er dorthin schicken kann —
 * die eigentliche Entscheidung liegt unten, deshalb bekommt sie die Fläche.
 *
 * Der Reiter bleibt nach dem ersten Öffnen gemountet. Alles, was läuft, hängt
 * deshalb an `isVisible` und nicht an der Lebensdauer, und der Fokus der Karte
 * wird beim VERLASSEN zurückgesetzt.
 */
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import ExpeditionStarChart from './ExpeditionStarChart.vue'
import ExpeditionBoard from './ExpeditionBoard.vue'

const uiStore = useUiStore()
const chartStore = useExpeditionChartStore()

const isVisible = computed(() => uiStore.bardActiveTab === 'expedition')

watch(isVisible, (visible) => {
  if (visible) return
  // Zustand beim Verlassen räumen, nicht beim Betreten — sonst trägt der Reiter
  // seinen alten Fokus in die nächste Sitzung.
  chartStore.selectedGalaxy = 0
})
</script>

<template>
  <div class="etc">
    <header class="etc-bar">
      <Icon icon="ph:map-trifold-fill" width="26" height="26" class="etc-bar-ico" />
      <div class="etc-bar-text">
        <span class="etc-bar-title">Expeditions</span>
        <span class="etc-bar-sub">
          The board fights — the rest of the company travels. Destinations are galaxies you
          have already freed.
        </span>
      </div>
    </header>

    <ExpeditionStarChart />

    <div class="etc-board">
      <ExpeditionBoard />
    </div>
  </div>
</template>

<style scoped>
.etc {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #111008;
}

.etc-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 11px;
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
}
.etc-bar-ico {
  flex-shrink: 0;
  color: #e8c040;
}
.etc-bar-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.etc-bar-title {
  font-family: 'MedievalSharp', Georgia, serif;
  font-size: 18px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8c040;
  line-height: 1.1;
}
.etc-bar-sub {
  font-size: 12.5px;
  color: rgba(200, 144, 64, 0.6);
  line-height: 1.2;
}

.etc-rank {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 5px 12px;
  background: #141410;
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: #e8c040;
}
.etc-rank-text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.etc-rank-name {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.5);
}

.etc-board {
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>

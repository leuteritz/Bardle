<script setup lang="ts">
/**
 * Die linke Spalte der Live-Bühne: welcher Stern was hergab, in Besuchsreihenfolge.
 *
 * Das Gegenstück zur Manifestreihe des Atlas — dort liegt sie als Scrim über der
 * Karte, hier steht sie im Rand, den die quadratische Fläche ohnehin frei lässt.
 * Die kommende Etappe steht als offene Zeile darunter: die Karte enthüllt
 * nichts, was noch vor dem Schiff liegt, ein WARTENDER Platz ist aber keine
 * Enthüllung.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { starCoreTint } from '@/utils/fx/galaxyPlate'
import { FIRMAMENT_LOST_COLOR, LANDMARK_FREED_CORE, ROLE_BY_KEY } from '@/config/constants'

const galaxyStore = useGalaxyStore()

const seats = computed(() =>
  galaxyStore.attemptResults.map((outcome, i) => {
    const manifest = galaxyStore.starManifests[i]
    const role = manifest?.role ? ROLE_BY_KEY[manifest.role] : null
    const lost = outcome === 'failed'
    return {
      index: i,
      lost,
      role,
      tint: lost ? FIRMAMENT_LOST_COLOR : (starCoreTint(manifest) ?? LANDMARK_FREED_CORE),
      champion: manifest?.champion ?? (lost ? 'Never reached' : 'No champion aboard'),
    }
  }),
)

const pending = computed(() => {
  if (galaxyStore.starsRescued >= galaxyStore.starsRequired) return null
  const role = galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null
  return { index: galaxyStore.attemptResults.length, role }
})
</script>

<template>
  <section class="erl" aria-label="Stars of this run">
    <h3 class="erl-title">This run</h3>

    <ol class="erl-list rpg-scrollbar">
      <li v-for="seat in seats" :key="seat.index" class="erl-row" :style="{ '--erl-t': seat.tint }">
        <span class="erl-num">{{ seat.index + 1 }}</span>
        <Icon
          v-if="seat.role"
          :icon="seat.role.icon"
          width="20"
          height="20"
          class="erl-glyph"
          :aria-label="seat.role.label"
        />
        <span v-else class="erl-glyph erl-glyph--none">✦</span>
        <span class="erl-name">{{ seat.champion }}</span>
        <span class="erl-mark">{{ seat.lost ? 'Lost' : 'Freed' }}</span>
      </li>

      <li v-if="pending" class="erl-row erl-row--open">
        <span class="erl-num">{{ pending.index + 1 }}</span>
        <Icon
          v-if="pending.role"
          :icon="pending.role.icon"
          width="20"
          height="20"
          class="erl-glyph"
        />
        <span v-else class="erl-glyph erl-glyph--none">?</span>
        <span class="erl-name">{{ pending.role ? pending.role.label : 'Awaiting a role' }}</span>
        <span class="erl-mark">Ahead</span>
      </li>

      <li v-if="!seats.length && !pending" class="erl-empty">Nothing logged yet.</li>
    </ol>
  </section>
</template>

<style scoped>
/* Ohne eigene Flaeche: die Liste liegt als Scrim auf der Live-Platte, und ein
   undurchsichtiger Kasten loeschte die Marken darunter aus. Den Verlauf legt
   ExpeditionLiveStage darunter. */
.erl {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
  padding: 10px;
}

.erl-title {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.erl-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.erl-row {
  position: relative;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 14px 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 5px 7px 5px 9px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
}
/* Die Kante trägt den Ausgang — dieselbe Paarung wie der Kernfunke der Marke. */
.erl-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--erl-t, #5ce8b4);
}
/* Was noch aussteht, ist gestrichelt und ohne Ton — es ist keine Chronik. */
.erl-row--open {
  background: #141410;
  border-style: dashed;
  border-color: #3e2a12;
}
.erl-row--open::before {
  background: rgba(122, 78, 32, 0.5);
}

.erl-num {
  font-size: 10px;
  font-weight: 800;
  color: rgba(216, 200, 160, 0.42);
  text-align: right;
}

.erl-glyph {
  color: var(--erl-t, #5ce8b4);
}
.erl-glyph--none {
  font-size: 13px;
  text-align: center;
  color: rgba(216, 200, 160, 0.35);
}

.erl-name {
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(236, 224, 192, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.erl-mark {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.45);
}

.erl-empty {
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.4);
}
</style>

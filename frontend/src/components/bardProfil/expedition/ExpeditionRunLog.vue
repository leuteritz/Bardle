<script setup lang="ts">
/**
 * Die rechte Spalte der Live-Bühne: was auf den Etappen geschah, in
 * Buchungsreihenfolge.
 *
 * Die Karte trägt dafür Marken ohne Namen — hier stehen die Namen. Gelesen wird
 * aus DEMSELBEN gespeicherten Ausgang, den auch die Marken lesen; die Kataloge
 * liefern Name und Glyph über die ID, damit nicht zwei Quellen für dieselbe
 * Auskunft auseinanderlaufen.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { getLandfall } from '@/config/world/landfalls'
import { getVoidRift } from '@/config/world/void'
import { getDrifter } from '@/config/world/drifters'
import {
  FIRMAMENT_LOST_COLOR,
  LANDMARK_FREED_CORE,
  MATERIAL_SOURCE_ICONS,
  VOID_SEVERITY_COLOR,
} from '@/config/constants'

const galaxyStore = useGalaxyStore()

const entries = computed(() => {
  const rows: { key: string; icon: string; name: string; note: string; tint: string }[] = []

  galaxyStore.landfallResults.forEach((l, i) => {
    const def = getLandfall(l.kind)
    rows.push({
      key: `l${i}`,
      icon: def?.icon ?? MATERIAL_SOURCE_ICONS.landfall,
      name: def?.name ?? 'Landfall',
      note: l.cleared ? 'Made' : 'Missed',
      tint: l.cleared ? LANDMARK_FREED_CORE : FIRMAMENT_LOST_COLOR,
    })
  })

  galaxyStore.incidentResults.forEach((e, i) => {
    if (e.kind === 'void-impact') {
      const def = getVoidRift(e.id)
      rows.push({
        key: `v${i}`,
        icon: def?.icon ?? MATERIAL_SOURCE_ICONS.void,
        name: def?.name ?? 'Void breach',
        note: `Leg ${e.leg + 1}`,
        tint: def?.color ?? VOID_SEVERITY_COLOR.lesser,
      })
      return
    }
    const def = getDrifter(e.id)
    const caught = e.kind === 'drifter-caught'
    rows.push({
      key: `d${i}`,
      icon: def?.icon ?? MATERIAL_SOURCE_ICONS.drifter,
      name: def?.name ?? 'Drifter',
      note: caught ? 'Caught' : 'Missed',
      tint: caught ? LANDMARK_FREED_CORE : FIRMAMENT_LOST_COLOR,
    })
  })

  return rows
})
</script>

<template>
  <section class="erg" aria-label="Chronicle of this run">
    <h3 class="erg-title">Chronicle</h3>

    <ol class="erg-list rpg-scrollbar">
      <li v-for="row in entries" :key="row.key" class="erg-row" :style="{ '--erg-t': row.tint }">
        <Icon :icon="row.icon" width="20" height="20" class="erg-glyph" />
        <span class="erg-body">
          <span class="erg-name">{{ row.name }}</span>
          <span class="erg-note">{{ row.note }}</span>
        </span>
      </li>

      <li v-if="!entries.length" class="erg-empty">
        Nothing has crossed your path on this run.
      </li>
    </ol>
  </section>
</template>

<style scoped>
/* Ohne eigene Flaeche: die Liste liegt als Scrim auf der Live-Platte, und ein
   undurchsichtiger Kasten loeschte die Marken darunter aus. Den Verlauf legt
   ExpeditionLiveStage darunter. */
.erg {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-height: 0;
  padding: 10px;
}

.erg-title {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(200, 160, 80, 0.6);
}

.erg-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.erg-row {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 7px 5px 9px;
  background: #1c1c18;
  border: 1px solid #32210c;
  border-radius: 4px;
}
.erg-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--erg-t, #5ce8b4);
}

.erg-glyph {
  flex-shrink: 0;
  color: var(--erg-t, #5ce8b4);
}

.erg-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.erg-name {
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(236, 224, 192, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.erg-note {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.45);
}

.erg-empty {
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: rgba(200, 144, 64, 0.4);
}
</style>

<script setup lang="ts">
/**
 * Die Universumsleiste — sie waehlt die BAHN, die die Karte zeigt.
 *
 * Waehlbar ist, was Inhalt hat, nicht was Auskunft hat: `pickable` haengt an den
 * Galaxien des Universums. Damit gibt es keinen leeren Buehnenzustand — eine
 * Bahn ohne Knoten kann gar nicht erst gewaehlt werden, und das ist billiger als
 * jeder Leerzustand.
 *
 * Am Fuss steht die eine Auskunft, die es sonst nirgends gibt: was einen
 * Aufbruch ueberlebt. Alle fuenf Zahlen kommen aus der EINEN Metrik-Registry
 * (`progressMetricValue`) bzw. den beiden Zielsystem-Zaehlern — keine zweite,
 * parallel gepflegte Rechnung.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { universes } from '@/config/progression/universes'
import { progressMetricValue } from '@/utils/game/progressMetrics'
import { formatCompactDuration, toRoman } from '@/utils/ui/format'
import {
  FIRMAMENT_HERE_COLOR,
  MS_PER_SECOND,
  UNIVERSE_DISC_RAIL_PX,
} from '@/config/constants'
import UniverseDisc from './UniverseDisc.vue'
import type { UniverseDiscState } from '@/utils/fx/universeDisc'
import type { FirmamentSelection } from '@/types'

const props = defineProps<{
  folded: boolean
  selection: FirmamentSelection
}>()

const emit = defineEmits<{
  (e: 'select', value: FirmamentSelection): void
  (e: 'toggle'): void
}>()

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const missionStore = useMissionStore()
const achievementStore = useAchievementStore()

/** Der letzte Lauf JE Universum. Ein Universum kann mehrfach besucht werden;
 *  die Leiste zeigt eine Zeile je Ort, nicht je Besuch. */
const runByUniverse = computed(() => {
  const map = new Map<number, { runs: number; galaxiesFreed: number; durationSeconds: number }>()
  for (const run of gameStore.universeRuns) {
    const prev = map.get(run.universe)
    map.set(run.universe, {
      runs: (prev?.runs ?? 0) + 1,
      galaxiesFreed: run.galaxiesFreed,
      durationSeconds: run.durationSeconds,
    })
  }
  return map
})

/** Die Galaxien, die auf der Bahn eines Universums liegen — dieselbe Zaehlung
 *  wie `buildFirmamentPath`, samt Boden fuer einen Datensatz ohne Feld. */
const galaxiesByUniverse = computed(() => {
  const map = new Map<number, number>()
  for (const r of galaxyStore.completedGalaxies) {
    const u = r.universe ?? universes[0].id
    map.set(u, (map.get(u) ?? 0) + 1)
  }
  return map
})

const rows = computed(() =>
  universes.map((u) => {
    const current = u.id === gameStore.currentUniverse
    const past = runByUniverse.value.get(u.id)
    const galaxies = galaxiesByUniverse.value.get(u.id) ?? 0
    const walked = current || past !== undefined || galaxies > 0
    return {
      id: u.id,
      name: u.name,
      roman: toRoman(u.id),
      tint: u.tint,
      walked,
      current,
      picked: props.selection.universe === u.id,
      /** Waehlbar ist, was etwas zu zeigen hat. */
      pickable: current || galaxies > 0,
      note: current
        ? `you are here · ${galaxies} freed`
        : galaxies > 0
          ? `${galaxies} freed${past ? ` · ${formatCompactDuration(past.durationSeconds * MS_PER_SECOND)}` : ''}`
          : past
            ? 'walked · no galaxies freed'
            : 'not yet walked',
      stateIcon: current ? 'lucide:crosshair' : walked ? 'lucide:check' : 'lucide:lock',
      /** Die Scheibe traegt den Zustand selbst — leer heisst nie betreten. */
      discState: (current ? 'current' : walked ? 'walked' : 'unlit') as UniverseDiscState,
    }
  }),
)

const walkedCount = computed(() => rows.value.filter((r) => r.walked).length)

/** Was einen Aufbruch ueberlebt. Alle fuenf sind ereignisgetrieben — keine
 *  davon tickt, die Leiste rechnet also nicht im Sekundentakt neu. */
const carryOver = computed(() => [
  {
    key: 'meeps',
    label: 'Meep nodes',
    icon: 'game-icons:acorn',
    value: progressMetricValue('meepNodesBought'),
  },
  {
    key: 'forge',
    label: 'Forge levels',
    icon: 'game-icons:anvil-impact',
    value: progressMetricValue('forgeLevels'),
  },
  {
    key: 'rays',
    label: 'Solar rays',
    icon: 'game-icons:sun-radiations',
    value: progressMetricValue('solarRayLevels'),
  },
  {
    key: 'codex',
    label: 'Codex stages',
    icon: 'game-icons:star-swirl',
    value: achievementStore.unlockedStageCount,
  },
  {
    key: 'way',
    label: 'Milestones',
    icon: 'ph:compass-rose-fill',
    value: missionStore.claimedCount,
  },
])

/** Kein Toggle: die Bahn ist der Ansichtszustand, es gibt kein Nichts. */
function pick(row: { id: number; pickable: boolean; picked: boolean }) {
  if (!row.pickable || row.picked) return
  emit('select', { universe: row.id, galaxy: null })
}

const hereColor = FIRMAMENT_HERE_COLOR
</script>

<template>
  <aside class="fm-rail" :class="{ 'fm-rail--folded': folded }">
    <div class="fm-rail-head">
      <button
        class="fm-rail-grip"
        :aria-label="folded ? 'Show the universe rail' : 'Collapse the universe rail'"
        :title="folded ? 'Show universes' : 'Collapse'"
        @click="emit('toggle')"
      >
        <Icon
          :icon="folded ? 'lucide:chevron-right' : 'lucide:chevron-left'"
          width="14"
          height="14"
        />
      </button>
      <span v-if="!folded" class="fm-rail-title">Universes</span>
      <span v-if="!folded" class="fm-rail-count">{{ walkedCount }} / {{ rows.length }}</span>
    </div>

    <div class="fm-rail-list rpg-scrollbar">
      <button
        v-for="row in rows"
        :key="row.id"
        class="fm-rail-row"
        :class="{
          'is-current': row.current,
          'is-picked': row.picked,
          'is-dim': !row.walked,
          'is-inert': !row.pickable,
        }"
        :style="{ '--fm-row-tint': row.tint }"
        :aria-label="`Universe ${row.roman} — ${row.name}, ${row.note}`"
        :aria-pressed="row.picked"
        :title="folded ? `${row.roman} · ${row.name} — ${row.note}` : undefined"
        @click="pick(row)"
      >
        <UniverseDisc :universe="row.id" :state="row.discState" :px="UNIVERSE_DISC_RAIL_PX" />
        <span v-if="!folded" class="fm-rail-body">
          <span class="fm-rail-name-line">
            <span class="fm-rail-roman">{{ row.roman }}</span>
            <span class="fm-rail-name">{{ row.name }}</span>
          </span>
          <span class="fm-rail-note">{{ row.note }}</span>
        </span>
        <Icon v-if="!folded" :icon="row.stateIcon" width="14" height="14" class="fm-rail-state" />
      </button>
    </div>

    <div class="fm-rail-carry">
      <span v-if="!folded" class="fm-rail-carry-head">What carries over</span>
      <span
        v-for="item in carryOver"
        :key="item.key"
        class="fm-rail-carry-row"
        :title="folded ? `${item.label}: ${item.value}` : undefined"
      >
        <Icon :icon="item.icon" width="14" height="14" class="fm-rail-carry-ico" />
        <span v-if="!folded" class="fm-rail-carry-k">{{ item.label }}</span>
        <span class="fm-rail-carry-v">{{ item.value }}</span>
      </span>
    </div>
  </aside>
</template>

<style scoped>
/* Eingeklappt wird VERSCHOBEN, nicht abgerissen: `clip`, nicht `hidden` — ein
   Scrollport liesse sich verschieben und riebe an der Kante. */
.fm-rail {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: clip;
  background: #141008;
  border-right: 1px solid #3e200a;
}

.fm-rail-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 7px;
  border-bottom: 1px solid #2a1c0c;
}

.fm-rail-grip {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: #c8b890;
  background: #151109;
  border: 1px solid #3a2c14;
  border-radius: 3px;
  cursor: pointer;
  transition: color 0.12s;
}

.fm-rail-grip:hover {
  color: #e8c040;
}

.fm-rail-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
  overflow: hidden;
}

.fm-rail-count {
  font-size: 11px;
  color: #5c4a30;
  white-space: nowrap;
}

.fm-rail-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.fm-rail-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 8px;
  text-align: left;
  color: inherit;
  background: #151109;
  border: 1px solid #2f2410;
  border-left: 3px solid #2f2410;
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 0.12s,
    background-color 0.12s;
}

/* Die LINKE Kante bleibt aussen vor: sie traegt die Bedeutung (Ton des
   Universums, „du bist hier"), der Hover meint die Fassung. Ein `border-color`
   hier gewinnt gegen `.is-picked` und schluckte den Ton genau dann, wenn der
   Zeiger daraufsteht. */
.fm-rail-row:hover:not(.is-inert) {
  border-top-color: #7a4e20;
  border-right-color: #7a4e20;
  border-bottom-color: #7a4e20;
}

.fm-rail-row.is-inert {
  cursor: default;
}

/* KEIN pauschales `opacity` mehr: die leere Scheibe sagt „nie betreten", und
   eine Deckkraftstufe daempfte auch den Text, statt ihn einzuordnen. */
.fm-rail-row.is-current {
  background: linear-gradient(90deg, #1b1a10, #151109);
  border-left-color: v-bind(hereColor);
}

/* Die Kante traegt den Ton DIESES Universums, nicht den einer Zustandsfarbe —
   `universeTint.spec.ts` haelt beide auseinander. */
.fm-rail-row.is-picked {
  background: #2a2010;
  border-color: #7a4e20;
  border-left-color: var(--fm-row-tint);
}

/* Feste Zeilenkaesten, kein Zwischenraum: so treibt die SCHEIBE die Zeilenhoehe
   und nicht die Schriftmetrik — nur dann sagt `UNIVERSE_RAIL_ROW_H` die Wahrheit. */
.fm-rail-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.fm-rail-name-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  line-height: 18px;
}

.fm-rail-roman {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 900;
  color: #8a7a52;
}

.fm-rail-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-rail-row.is-dim .fm-rail-name {
  color: #7a6a46;
}

.fm-rail-row.is-dim .fm-rail-roman,
.fm-rail-row.is-dim .fm-rail-note,
.fm-rail-row.is-dim .fm-rail-state {
  color: #5c4e34;
}

.fm-rail-note {
  font-size: 11px;
  line-height: 14px;
  color: #7a6c50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-rail-state {
  flex-shrink: 0;
  color: #7a6c50;
}

.fm-rail-row.is-current .fm-rail-state {
  color: v-bind(hereColor);
}

/* Was einen Aufbruch ueberlebt. */
.fm-rail-carry {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 8px 10px;
  border-top: 1px solid #2a1c0c;
  background: #100e08;
}

.fm-rail-carry-head {
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a7a52;
  white-space: nowrap;
  overflow: hidden;
}

.fm-rail-carry-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #9a9184;
  white-space: nowrap;
}

.fm-rail-carry-ico {
  flex-shrink: 0;
  color: #a07a3c;
}

.fm-rail-carry-k {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fm-rail-carry-v {
  font-weight: 900;
  color: #e8dcc0;
}

/* Eingeklappt: nur Glyphen, mittig, kein Text. */
.fm-rail--folded .fm-rail-head {
  justify-content: center;
  padding: 8px 4px 7px;
}

.fm-rail--folded .fm-rail-list,
.fm-rail--folded .fm-rail-carry {
  align-items: center;
  padding-left: 4px;
  padding-right: 4px;
}

.fm-rail--folded .fm-rail-row {
  justify-content: center;
  padding: 5px 4px;
  border-left-width: 2px;
}

/* Einzeilig, nicht gestapelt: gestapelt kostet der Fuss 60 px mehr, und die
   zehnte Scheibe faellt unter die Kante — die Leiste rollte, obwohl sie
   eingeklappt genau dafuer da ist, alles auf einen Blick zu zeigen. */
.fm-rail--folded .fm-rail-carry-row {
  justify-content: center;
  gap: 4px;
  font-size: 10px;
}
</style>

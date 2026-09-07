<script setup lang="ts">
/**
 * Der Fuss der Live-Bühne — was die Karte darüber gerade tut, in einer Zeile.
 *
 * Dieselbe Höhe wie das Datenband des Atlas (`VOYAGE_MAP_STATS_BAND_H`): beim
 * Bühnenwechsel darf die Karte nicht springen. Dieselbe Typografie, damit die
 * beiden Füsse als EIN Instrument gelesen werden.
 *
 * Keine eigene Uhr — die Zahlen hängen an `travelRemainingMs` und
 * `travelProgressPercent`, und die sind über `_travelTickMs` im Sekundentakt
 * reaktiv.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { splitDuration } from '@/utils/ui/format'
import { formatLY, travelRemainingLY, travelTotalLY } from '@/utils/game/travelDistance'
import {
  LANDMARK_FREED_CORE,
  MATERIAL_SOURCE_ICONS,
  MS_PER_SECOND,
  ROLE_BY_KEY,
  VOYAGE_LIVE_BAND_LABELS,
  VOYAGE_LIVE_ETA_CH,
  VOYAGE_LIVE_STARS_CH,
  VOYAGE_MAP_STATS_BAND_H,
} from '@/config/constants'

const galaxyStore = useGalaxyStore()

const bandH = `${VOYAGE_MAP_STATS_BAND_H}px`
const etaW = `${VOYAGE_LIVE_ETA_CH}ch`
const starsW = `${VOYAGE_LIVE_STARS_CH}ch`

const traveling = computed(() => galaxyStore.championTravelState === 'traveling')

const role = computed(() =>
  galaxyStore.nextStarRole ? ROLE_BY_KEY[galaxyStore.nextStarRole] : null,
)

const eta = computed(() => {
  if (!traveling.value) return '—'
  const total = Math.max(0, Math.ceil(galaxyStore.travelRemainingMs / MS_PER_SECOND))
  const { hours, minutes, seconds } = splitDuration(total)
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
})

const distance = computed(() =>
  formatLY(
    traveling.value
      ? travelRemainingLY(galaxyStore.currentGalaxy, galaxyStore.travelProgressPercent)
      : travelTotalLY(galaxyStore.currentGalaxy),
  ),
)

const chronicleMarks = computed(() => {
  let voids = 0
  let drifters = 0
  for (const e of galaxyStore.incidentResults) {
    if (e.kind === 'void-impact') voids++
    else drifters++
  }
  return [
    {
      key: 'landfall',
      icon: MATERIAL_SOURCE_ICONS.landfall,
      count: galaxyStore.landfallResults.length,
      tip: 'Landfalls logged on this run',
    },
    { key: 'void', icon: MATERIAL_SOURCE_ICONS.void, count: voids, tip: 'Void impacts logged' },
    { key: 'drifter', icon: MATERIAL_SOURCE_ICONS.drifter, count: drifters, tip: 'Drifters logged' },
  ]
})

/** Die Etappe, nicht der Lauf: die Spur unter dem Band ist die laufende Fahrt. */
const legScale = computed(() =>
  traveling.value ? Math.min(1, Math.max(0, galaxyStore.travelProgressPercent / 100)) : 0,
)
</script>

<template>
  <div class="elb" :style="{ '--elb-freed': LANDMARK_FREED_CORE }">
    <div class="elb-row">
      <div class="elb-col">
        <span class="elb-val elb-val--role">
          <Icon v-if="role" :icon="role.icon" width="24" height="24" class="elb-role-ico" />
          <span v-ink-center.y>{{ role ? role.short : '—' }}</span>
        </span>
        <span v-ink-center.y class="elb-lbl">{{ VOYAGE_LIVE_BAND_LABELS.next }}</span>
      </div>

      <div class="elb-col">
        <span v-ink-center.y class="elb-val elb-val--eta">{{ eta }}</span>
        <span v-ink-center.y class="elb-lbl">{{ VOYAGE_LIVE_BAND_LABELS.eta }}</span>
      </div>

      <div class="elb-col">
        <span class="elb-val elb-val--stars">
          <span v-ink-center.y class="elb-freed">{{ galaxyStore.starsRescued }}</span>
          <span v-ink-center.y class="elb-of">/{{ galaxyStore.starsRequired }}</span>
        </span>
        <span v-ink-center.y class="elb-lbl">{{ VOYAGE_LIVE_BAND_LABELS.stars }}</span>
      </div>

      <div class="elb-col">
        <span class="elb-val">
          <span v-ink-center.y>{{ distance }}</span>
          <span v-ink-center.y class="elb-unit">LY</span>
        </span>
        <span v-ink-center.y class="elb-lbl">{{ VOYAGE_LIVE_BAND_LABELS.distance }}</span>
      </div>

      <div class="elb-col elb-col--seam">
        <!-- Eine Bedeutung, ein Glyph: dieselben drei, die die Materialquellen
             im ganzen Spiel tragen. -->
        <span class="elb-val elb-val--chron">
          <span v-for="m in chronicleMarks" :key="m.key" v-tip="m.tip" class="elb-mark">
            <Icon :icon="m.icon" width="20" height="20" />{{ m.count }}
          </span>
        </span>
        <span v-ink-center.y class="elb-lbl">{{ VOYAGE_LIVE_BAND_LABELS.chronicle }}</span>
      </div>
    </div>

    <!-- Die laufende Etappe. `scaleX` und nicht die Breite: eine wandernde
         Breite legt jede Sekunde ein Layout an. -->
    <span class="elb-leg" aria-hidden="true">
      <span class="elb-leg-fill" :style="{ transform: `scaleX(${legScale})` }" />
    </span>
  </div>
</template>

<style scoped>
.elb {
  container-type: inline-size;
  position: relative;
  flex: 0 0 auto;
  height: v-bind(bandH);
  background: #111008;
  border-top: 1px solid rgba(122, 78, 32, 0.42);
}

.elb-row {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 4px clamp(12px, 1.5cqw, 30px);
}

.elb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  padding: 0 clamp(9px, 1.4cqw, 24px);
}
.elb-col + .elb-col {
  border-left: 1px solid rgba(122, 78, 32, 0.34);
}
/* Die kräftigere Naht trennt die Fahrt von der Chronik — zwei Aussagen, nicht
   zwei Zahlen. */
.elb-col--seam {
  border-left-color: rgba(122, 78, 32, 0.62);
}

.elb-val {
  display: inline-flex;
  align-items: center;
  gap: 0.24em;
  font-size: clamp(17px, 3.1cqw, 30px);
  font-weight: 800;
  line-height: 0.94;
  color: #ece0c0;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
/* Reservierte Zellen: MedievalSharp hat keine Tabellenziffern, sonst wandert
   das Band im Sekundentakt unter dem Zeiger. */
.elb-val--eta {
  justify-content: center;
  min-width: v-bind(etaW);
}
.elb-val--stars {
  justify-content: center;
  min-width: v-bind(starsW);
  gap: 0.06em;
}
.elb-val--role {
  color: #e8c040;
}
.elb-role-ico {
  color: #c89040;
}
.elb-freed {
  color: var(--elb-freed);
}
.elb-of {
  color: rgba(216, 200, 160, 0.52);
}
.elb-unit {
  font-size: 0.56em;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(216, 200, 160, 0.52);
}

.elb-val--chron {
  gap: 0.6em;
  font-size: clamp(13px, 2.1cqw, 20px);
}
.elb-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.28em;
  color: rgba(216, 200, 160, 0.82);
}

.elb-lbl {
  font-size: clamp(10px, 1.35cqw, 13px);
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.52);
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.elb-leg {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(122, 78, 32, 0.26);
  overflow: hidden;
}
.elb-leg-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: #e8c040;
  transition: transform 1s linear;
}
@media (prefers-reduced-motion: reduce) {
  .elb-leg-fill {
    transition: none;
  }
}
</style>

<script setup lang="ts">
/**
 * Was auf einer Marke liegt, ohne sie anzuklicken.
 *
 * Nur beim Hover gemountet (`v-if` hinter dem Teleport in `RpgBadgeTooltip`) —
 * im Ruhezustand kostet die Karte deshalb nichts. Der Inhalt kommt aus
 * `buildVoyageTip`, die Uhr liest allein diese Komponente.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import ExpeditionMarkTooltip from './ExpeditionMarkTooltip.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatMinuteClock, formatShortDuration } from '@/utils/ui/format'
import { buildVoyageTip } from '@/utils/game/voyageTip'
import { pinKeyOf } from '@/utils/game/voyageSites'
import {
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
  EXPEDITION_EXPIRY_WARNING_MS,
  VOYAGE_TIP_CREW_MAX,
} from '@/config/constants'
import type { VoyageRosterSubject } from '@/types'

const props = defineProps<{ pinKey: string; now: number }>()

const expeditionStore = useExpeditionStore()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()

/** Der Schlüssel überlebt den Übergang Vertrag → Mission, die Suche findet beides. */
const subject = computed<VoyageRosterSubject | null>(() => {
  const offer = expeditionStore.availableExpeditions.find((o) => pinKeyOf(o) === props.pinKey)
  if (offer) return { pinKey: props.pinKey, offer, mission: null }
  const mission = expeditionStore.activeExpeditions.find((m) => pinKeyOf(m) === props.pinKey)
  return mission ? { pinKey: props.pinKey, offer: null, mission } : null
})

const view = computed(() =>
  subject.value
    ? buildVoyageTip(subject.value, {
        projectedReward: expeditionStore.projectedRewardFor,
        seatsOf: (offer) => expeditionStore.crewFor(offer),
        offerOdds: expeditionStore.offerOddsFor,
        destinationName: (galaxy) => {
          const rec = galaxyStore.completedGalaxies.find((r) => r.galaxy === galaxy)
          return rec ? destinationFor(rec).name : `Galaxy ${galaxy}`
        },
      })
    : null,
)

const expiresIn = computed(() => {
  const at = view.value?.expiresAt
  return at === null || at === undefined ? null : at - props.now
})
const remaining = computed(() => {
  const at = view.value?.endsAt
  return at === null || at === undefined ? null : at - props.now
})
const urgent = computed(
  () => expiresIn.value !== null && expiresIn.value < EXPEDITION_EXPIRY_WARNING_MS,
)

const oddsTone = computed(() => {
  const o = view.value?.odds
  if (o === null || o === undefined) return 'is-dim'
  if (o >= EXPEDITION_CHANCE_GOOD * 100) return 'is-good'
  return o >= EXPEDITION_CHANCE_MID * 100 ? 'is-mid' : 'is-poor'
})

/** Die drei grossen Ablesungen — je Zustand dieselben Plätze, andere Fragen. */
const readings = computed(() => {
  const v = view.value
  if (!v) return []
  const odds = { value: v.odds === null ? '—' : `${v.odds}%`, label: 'Odds', tone: oddsTone.value }
  if (v.state === 'offer') {
    return [
      {
        value: formatMinuteClock(expiresIn.value ?? 0),
        label: 'Expires in',
        tone: urgent.value ? 'is-poor' : '',
      },
      odds,
      { value: formatShortDuration(v.durationSeconds), label: 'Voyage', tone: '' },
    ]
  }
  if (v.state === 'field') {
    return [
      { value: formatMinuteClock(remaining.value ?? 0), label: 'Returns in', tone: '' },
      odds,
      { value: formatShortDuration(v.durationSeconds), label: 'Voyage', tone: '' },
    ]
  }
  return [
    {
      value: `+${formatNumber(v.reward)}`,
      label: v.state === 'ready' ? 'Spoils' : 'Salvage',
      tone: v.state === 'ready' ? 'is-good' : 'is-poor',
    },
    odds,
    { value: `${v.crew.length}`, label: 'Crew home', tone: '' },
  ]
})

const expectedDrops = computed(() => {
  const s = view.value?.spoils
  return s ? s.materialRolls * s.materialChance : 0
})

/** Ausliegend die Draft-Sitze, sonst die Crew — ein leerer Sitz bleibt als Ring stehen. */
const seats = computed(() => {
  const v = view.value
  if (!v) return []
  const names =
    v.state === 'offer'
      ? Array.from({ length: v.seatsTotal ?? 0 }, (_, i) => v.crew[i] ?? null)
      : v.crew
  return names.slice(0, VOYAGE_TIP_CREW_MAX).map((name, i) => ({
    key: `${i}:${name ?? ''}`,
    name: name ?? '',
    image: name ? battleStore.getChampionImage(name, { size: 'sm' }) : '',
    color: name ? getOriginColor(name) : '',
  }))
})

const seatNote = computed(() => {
  const v = view.value
  if (!v) return ''
  if (v.state === 'offer') return `${v.seatsFilled} / ${v.seatsTotal} seats crewed`
  const n = v.crew.length
  return v.state === 'field' ? `${n} crew in the field` : `${n} crew home`
})

const collectable = computed(() => view.value?.state === 'ready' || view.value?.state === 'failed')
</script>

<template>
  <ExpeditionMarkTooltip
    v-if="view"
    :icon="view.icon"
    :accent="view.accent"
    :name="view.name"
    :state="view.stateLabel"
    :context="view.destination"
    :readings="readings"
  >
    <template #foot>
      
      <span class="vtt-line vtt-pay">
        <img src="/img/BardAbilities/BardChime-128.png" class="vtt-chime" alt="" />
        <b>{{ view.rewardPrefix }}{{ $formatNumber(view.reward) }}</b>
        <i class="vtt-sep">·</i>
        <Icon icon="ph:diamond-fill" width="13" height="13" class="vtt-mat" />
        <span>≈{{ expectedDrops.toFixed(1) }} materials</span>
        <template v-if="view.spoils.meep">
          <i class="vtt-sep">·</i>
          <Icon icon="game-icons:meeple" width="13" height="13" class="vtt-meep" />
          <span>×{{ view.spoils.meep }}</span>
        </template>
      </span>

      <span v-for="h in view.hazards" :key="h.id" class="vtt-line vtt-hazard">
        <Icon :icon="h.icon" width="14" height="14" />
        <b>{{ h.name }}</b>
        <template v-if="h.requirement">
          <i class="vtt-dash">—</i>
          <span>{{ h.requirement }}</span>
        </template>
      </span>

      <span class="vtt-line vtt-crew">
        <span class="vtt-seats" aria-hidden="true">
          <span
            v-for="s in seats"
            :key="s.key"
            class="vtt-seat"
            :class="{ 'is-empty': !s.image }"
            :style="{ '--seat': s.color }"
          >
            <img v-if="s.image" :src="s.image" alt="" class="vtt-face" />
          </span>
        </span>
        <span>{{ seatNote }}</span>
      </span>

      <span v-if="collectable" class="vtt-cta">Click the marker to collect</span>
    </template>
  </ExpeditionMarkTooltip>
</template>

<style scoped>
/* Gestalt, Kopf und Ablesungen liegen in `ExpeditionMarkTooltip` — hier steht
   nur, was der Fuss dieser Karte allein braucht. */

/* ── Fuss: Lohn, Gefahren, Sitze ─────────────────────────────────────────── */
.vtt-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  line-height: 1.3;
  color: rgba(230, 220, 196, 0.72);
}
.vtt-sep,
.vtt-dash {
  font-style: normal;
  color: rgba(200, 144, 64, 0.34);
}
.vtt-pay b {
  font-weight: 800;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.vtt-chime {
  width: 16px;
  height: 16px;
}
.vtt-mat {
  color: #7aa8e0;
}
.vtt-meep {
  color: #c090e0;
}

.vtt-hazard {
  color: rgba(230, 220, 196, 0.58);
}
.vtt-hazard > svg {
  flex-shrink: 0;
  color: #cc6050;
}
.vtt-hazard b {
  font-weight: 800;
  color: #e08a7a;
}

.vtt-seats {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-right: 3px;
}
.vtt-seat {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--seat, rgba(200, 144, 64, 0.55));
  overflow: hidden;
  background: #141410;
}
.vtt-seat.is-empty {
  border-style: dashed;
  border-color: rgba(200, 144, 64, 0.32);
}
.vtt-face {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

.vtt-cta {
  margin-top: 1px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64dcb4;
}
</style>

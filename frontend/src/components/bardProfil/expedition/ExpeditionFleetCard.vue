<script setup lang="ts">
/**
 * Eine Expedition als Karte des Fleet-Bandes.
 *
 * Sie ist der EINZIGE Ort hier, der die Uhr liest: `VoyageFleetCard` trägt
 * Zeitstempel, kein fertiges Ziffernblatt. Pro Sekunde ändern sich damit zwei
 * Textknoten und ein `transform`, nicht das Band.
 *
 * Die Crew-Reihe ist der Grund für den Umbau — Zählerstände je Galaxie sagten
 * nicht, WER draußen ist. Ein Vertrag zeigt dieselbe Reihe mit leeren Sitzen, so
 * dass „drei von fünf bemannt" ohne Zahl lesbar ist.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { formatMinuteClock } from '@/utils/ui/format'
import {
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_EXPIRY_WARNING_MS,
  VOYAGE_FLEET_AVATAR_PX,
  VOYAGE_FLEET_CARD_H,
  VOYAGE_FLEET_CARD_MIN_W,
} from '@/config/constants'
import type { VoyageFleetCard } from '@/types'

const props = defineProps<{ card: VoyageFleetCard; now: number; selected: boolean }>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string] }>()

const battleStore = useBattleStore()

const cardW = `${VOYAGE_FLEET_CARD_MIN_W}px`
const cardH = `${VOYAGE_FLEET_CARD_H}px`
const avatarPx = `${VOYAGE_FLEET_AVATAR_PX}px`

const row = computed(() => props.card.row)

const expiresIn = computed(() =>
  row.value.expiresAt === null ? null : row.value.expiresAt - props.now,
)
const remaining = computed(() => (row.value.endsAt === null ? null : row.value.endsAt - props.now))
const urgent = computed(
  () => expiresIn.value !== null && expiresIn.value < EXPEDITION_EXPIRY_WARNING_MS,
)

/** Laufend: der zurückgelegte Weg. Ausliegend: was von der Auslage übrig ist. */
const progress = computed(() => {
  const { endsAt, spanMs } = row.value
  if (endsAt !== null && spanMs !== null) {
    return Math.min(1, Math.max(0, (props.now - (endsAt - spanMs)) / spanMs))
  }
  if (expiresIn.value !== null) {
    return Math.min(1, Math.max(0, expiresIn.value / EXPEDITION_AVAILABILITY_DURATION_MS))
  }
  return 1
})

/**
 * Eine Reihe für alle Zustände: unterwegs und heimgekehrt die Crew, ausliegend
 * die Draft-Sitze. `null` ist ein leerer Sitz und bleibt als Ring stehen.
 */
const slots = computed<(string | null)[]>(() =>
  row.value.state === 'offer' ? props.card.seats : props.card.crew.map((c) => c.name),
)

const portraits = computed(() =>
  slots.value.map((name, i) => ({
    key: `${i}:${name ?? ''}`,
    name: name ?? '',
    image: name ? battleStore.getChampionImage(name, { size: 'sm' }) : '',
    color: name ? getOriginColor(name) : '',
  })),
)

const footTail = computed(() => {
  switch (row.value.state) {
    case 'field':
      return `${row.value.odds}%`
    case 'offer':
      return formatMinuteClock(expiresIn.value ?? 0)
    case 'ready':
      return 'collect'
    default:
      return 'salvage'
  }
})

const note = computed(() => {
  const r = row.value
  if (r.state === 'offer') {
    return `${r.seatsFilled} of ${r.seatsTotal} seats crewed, expires ${formatMinuteClock(expiresIn.value ?? 0)}`
  }
  if (r.state === 'field') {
    return `${formatMinuteClock(remaining.value ?? 0)} left, ${r.odds}% odds`
  }
  return r.state === 'ready' ? 'ready to collect' : 'failed, salvage only'
})

const crewNames = computed(() => slots.value.filter(Boolean).join(', '))
const aria = computed(
  () =>
    `${row.value.name}, ${props.card.galaxyName} — ${note.value}` +
    (crewNames.value ? `, crew ${crewNames.value}` : ''),
)
</script>

<template>
  <button
    class="vfc"
    :class="[
      `vfc--${row.state}`,
      { 'vfc--sendable': card.sendable, 'vfc--on': selected, 'vfc--urgent': urgent },
    ]"
    :style="{ '--gx-accent': `rgb(${card.accent})` }"
    :aria-label="aria"
    :title="aria"
    @click="emit('open', card.galaxy, card.pinKey)"
  >
    <span class="vfc-head">
      <Icon :icon="row.icon" class="vfc-ico" />
      <span class="vfc-name">{{ row.name }}</span>
    </span>

    <span class="vfc-crew">
      <span v-for="p in portraits" :key="p.key" class="vfc-seat" :style="{ '--seat': p.color }">
        <img v-if="p.image" :src="p.image" :alt="p.name" class="vfc-face" />
      </span>
    </span>

    <span class="vfc-foot">
      <span class="vfc-lead">
        <template v-if="row.state === 'field'">{{ formatMinuteClock(remaining ?? 0) }}</template>
        <template v-else-if="row.reward !== null">
          <Icon icon="game-icons:windchimes" class="vfc-chime" />
          {{ row.rewardPrefix }}{{ $formatNumber(row.reward) }}
        </template>
      </span>
      <span class="vfc-tail">{{ footTail }}</span>
    </span>

    <span class="vfc-rail" aria-hidden="true">
      <span class="vfc-rail-fill" :style="{ transform: `scaleX(${progress})` }" />
    </span>
  </button>
</template>

<style scoped>
/* Die linke Kante ist der Zustandskanal — nie über die Kurzschreibweise färben,
   das löschte sie. */
.vfc {
  position: relative;
  flex: 0 0 auto;
  width: v-bind(cardW);
  height: v-bind(cardH);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: 8px 9px;
  text-align: left;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid rgba(230, 220, 196, 0.4);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.16s ease;
}
.vfc:hover {
  background: #241f14;
}
.vfc:active {
  transform: scale(0.99);
}
.vfc:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -3px;
}
.vfc--ready {
  border-left-color: #64dcb4;
}
.vfc--failed {
  border-left-color: #cc6050;
}
.vfc--offer {
  border-left-color: rgba(200, 144, 64, 0.45);
}
.vfc--sendable {
  border-left-color: #e8c040;
}
/* Die gewählte Karte nimmt den Akzent ihrer Galaxie — die drei Kanten einzeln,
   damit die Zustandskante links stehen bleibt. */
.vfc--on {
  border-top-color: var(--gx-accent, #c89040);
  border-right-color: var(--gx-accent, #c89040);
  border-bottom-color: var(--gx-accent, #c89040);
  background: color-mix(in srgb, var(--gx-accent, #c89040) 18%, #12100a);
}

/* ── Kopf ───────────────────────────────────────────────────── */
/* ZWEIZEILIG. Der Missionsname ist `Adjektiv + Zielname + Aktion` und wird im
   schlimmsten Fall 220 px breit („Forgotten Crimson Expanse Pilgrimage") —
   einzeilig war JEDER Name beschnitten, im Browser an zwölf Verträgen gemessen.
   Die Galaxie-Ziffer, die hier stand, ist dafür gefallen und war ohnehin
   doppelt: der Zielname steht mitten IM Missionsnamen. */
.vfc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  overflow: hidden;
}
.vfc-ico {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  color: #c89040;
}
.vfc-name {
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1.15;
  color: #ece0c0;
  overflow: hidden;
}
.vfc--on .vfc-name {
  color: #fff4dc;
}
/* ── Crew ───────────────────────────────────────────────────── */
.vfc-crew {
  display: flex;
  align-items: center;
  gap: 4px;
  height: v-bind(avatarPx);
}
.vfc-seat {
  flex-shrink: 0;
  width: v-bind(avatarPx);
  height: v-bind(avatarPx);
  border-radius: 50%;
  overflow: hidden;
  background: #0f0d08;
  box-shadow: inset 0 0 0 2px var(--seat, rgba(122, 78, 32, 0.55));
}
.vfc-face {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Fuß ────────────────────────────────────────────────────── */
.vfc-foot {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  height: 16px;
}
.vfc-lead {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.vfc--ready .vfc-lead {
  color: #64dcb4;
}
.vfc--failed .vfc-lead {
  color: #e08a7a;
}
.vfc-chime {
  width: 12px;
  height: 12px;
  color: #c89040;
}
.vfc-tail {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(216, 200, 160, 0.48);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.vfc--urgent .vfc-tail {
  color: #e08a7a;
}

/* ── Schiene ────────────────────────────────────────────────── */
.vfc-rail {
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(200, 164, 90, 0.14);
}
.vfc-rail-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #c89040);
}
.vfc--ready .vfc-rail-fill {
  background: linear-gradient(to right, #2e7a4e, #64dcb4);
}
.vfc--sendable .vfc-rail-fill {
  background: linear-gradient(to right, #8a5a1c, #e8c060);
}
.vfc--urgent .vfc-rail-fill {
  background: linear-gradient(to right, #7a2c1c, #cc6050);
}
</style>

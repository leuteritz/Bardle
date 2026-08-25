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
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { formatMinuteClock } from '@/utils/ui/format'
import {
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
  EXPEDITION_EXPIRY_WARNING_MS,
  VOYAGE_FLEET_AVATAR_PX,
  VOYAGE_FLEET_CARD_H,
  VOYAGE_FLEET_CARD_INSET_X,
  VOYAGE_FLEET_CARD_INSET_Y,
  VOYAGE_FLEET_CARD_MIN_W,
  VOYAGE_FLEET_CARD_ROW_GAP,
  VOYAGE_FLEET_FOOT_H,
  VOYAGE_FLEET_HEAD_GAP,
  VOYAGE_FLEET_HEAD_H,
  VOYAGE_FLEET_HEAD_ICON,
  VOYAGE_FLEET_ODDS_W,
  VOYAGE_FLEET_RAIL_H,
  VOYAGE_FLEET_TIER_BAR_GAP,
  VOYAGE_FLEET_TIER_BAR_H,
  EXPEDITION_TIER_COLORS,
  EXPEDITION_TIER_SEGMENTS,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_WIDTH,
} from '@/config/constants'
import type { VoyageFleetCard } from '@/types'
import ExpeditionSubjectTooltip from './ExpeditionSubjectTooltip.vue'

const props = defineProps<{ card: VoyageFleetCard; now: number; selected: boolean }>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string] }>()

const battleStore = useBattleStore()

const cardW = `${VOYAGE_FLEET_CARD_MIN_W}px`
const cardH = `${VOYAGE_FLEET_CARD_H}px`
const avatarPx = `${VOYAGE_FLEET_AVATAR_PX}px`
const headH = `${VOYAGE_FLEET_HEAD_H}px`
const footH = `${VOYAGE_FLEET_FOOT_H}px`
const railH = `${VOYAGE_FLEET_RAIL_H}px`
const rowGap = `${VOYAGE_FLEET_CARD_ROW_GAP}px`
const inset = `${VOYAGE_FLEET_CARD_INSET_Y}px ${VOYAGE_FLEET_CARD_INSET_X}px`
const headGap = `${VOYAGE_FLEET_HEAD_GAP}px`
const headIcon = `${VOYAGE_FLEET_HEAD_ICON}px`
const oddsW = `${VOYAGE_FLEET_ODDS_W}px`
const tierBarH = `${VOYAGE_FLEET_TIER_BAR_H}px`
const tierGap = `${VOYAGE_FLEET_TIER_BAR_GAP}px`
/* Der Streifen endet, wo der Inhalt beginnt — sonst liefe er unter die
   Zustandskante links und läse sich als deren Fortsetzung. */
const tierInsetX = `${VOYAGE_FLEET_CARD_INSET_X}px`

const row = computed(() => props.card.row)

const expiresIn = computed(() =>
  row.value.expiresAt === null ? null : row.value.expiresAt - props.now,
)
const remaining = computed(() => (row.value.endsAt === null ? null : row.value.endsAt - props.now))

/**
 * SECHS Zustände, nicht vier: ein bemannter Vertrag ohne freien Feldplatz sieht
 * sonst aus wie einer, den man jetzt losschicken kann.
 */
type CardState = 'offer' | 'sendable' | 'blocked' | 'field' | 'ready' | 'failed'
const state = computed<CardState>(() => {
  const s = row.value.state
  if (s !== 'offer') return s
  if (props.card.blocked) return 'blocked'
  return props.card.sendable ? 'sendable' : 'offer'
})

/**
 * Steht „The Waiting Road", verfällt ein Angebot nicht mehr — `availableUntil`
 * bleibt als toter Stempel liegen. Ohne diese Klemmung alarmiert die Karte für
 * immer rot und die Schiene steht für immer leer.
 */
const urgent = computed(
  () =>
    !props.card.noDeadline &&
    expiresIn.value !== null &&
    expiresIn.value < EXPEDITION_EXPIRY_WARNING_MS,
)

/** Laufend: der zurückgelegte Weg. Ausliegend: was von der Auslage übrig ist. */
const progress = computed(() => {
  const { endsAt, spanMs } = row.value
  if (endsAt !== null && spanMs !== null) {
    return Math.min(1, Math.max(0, (props.now - (endsAt - spanMs)) / spanMs))
  }
  // Ohne Frist misst die Schiene keine Restzeit mehr, sondern Bereitschaft.
  if (props.card.noDeadline) return 1
  if (expiresIn.value !== null) {
    return Math.min(1, Math.max(0, expiresIn.value / EXPEDITION_AVAILABILITY_DURATION_MS))
  }
  return 1
})

/** Erleuchtete von drei Segmenten — Farbe UND Länge sagen dieselbe Stufe. */
const tierLit = computed(() => EXPEDITION_TIER_SEGMENTS[props.card.tier])
const tierColor = computed(() => EXPEDITION_TIER_COLORS[props.card.tier])

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

/**
 * Das Wort im Fuß — der dritte Zustandskanal neben Grund und Kante, und der
 * einzige, der auch ohne Farbsehen trägt. Die Uhr steht nur, wo sie etwas misst.
 */
const footTail = computed(() => {
  switch (state.value) {
    case 'ready':
      return 'collect'
    case 'failed':
      return 'salvage'
    case 'field':
      return 'in field'
    case 'blocked':
      return 'field full'
    case 'sendable':
      return props.card.noDeadline ? 'send' : formatMinuteClock(expiresIn.value ?? 0)
    default:
      // Unbemannt heisst hier: es ist kein Champion mehr frei — `crewFor`
      // bemannt sonst automatisch vor.
      return props.card.noDeadline ? 'no crew' : formatMinuteClock(expiresIn.value ?? 0)
  }
})

/** Was eine Handlung oder eine Sperre meint, steht als Plakette statt als Zeile. */
const tailIsBadge = computed(() =>
  ['ready', 'failed', 'blocked'].includes(state.value),
)

/** Die Chance steht nur, wo sie noch etwas ändert — nicht nach dem Wurf. */
const odds = computed(() =>
  row.value.state === 'offer' || row.value.state === 'field' ? row.value.odds : null,
)
const oddsTone = computed(() => {
  const o = odds.value
  if (o === null) return ''
  if (o >= EXPEDITION_CHANCE_GOOD * 100) return 'is-good'
  return o >= EXPEDITION_CHANCE_MID * 100 ? 'is-mid' : 'is-poor'
})

const note = computed(() => {
  const r = row.value
  if (r.state === 'offer') {
    const seats = `${r.seatsFilled} of ${r.seatsTotal} seats crewed`
    const when = props.card.noDeadline
      ? 'no deadline'
      : `expires ${formatMinuteClock(expiresIn.value ?? 0)}`
    const gate = state.value === 'blocked' ? ', no free expedition slot' : ''
    return `${props.card.tier} contract, ${seats}, ${when}${gate}`
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
  <RpgBadgeTooltip
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
  >
    <button
      class="vfc"
      :class="[`vfc--${state}`, { 'vfc--on': selected, 'vfc--urgent': urgent }]"
      :style="{ '--gx-accent': `rgb(${card.accent})`, '--tier': tierColor }"
      :aria-label="aria"
      @click="emit('open', card.galaxy, card.pinKey)"
    >
      <!-- Die STUFE: drei Segmente, davon 1/2/3 erleuchtet. Absolut gesetzt, es
           kostet also keine Zeile — der Höhenhaushalt der Karte hat keine. -->
      <span class="vfc-tier" aria-hidden="true">
        <span
          v-for="seg in 3"
          :key="seg"
          class="vfc-tier-seg"
          :class="{ 'is-lit': seg <= tierLit }"
        />
      </span>

      <!-- Der ZIELNAME, nicht der Missionsname: der ist `Adjektiv + Ziel +
           Aktion`, und zwei der vier Wörter sind gewürfelte Würze. Vollständig
           steht er im Hover-Tooltip und im `aria-label`. -->
      <span class="vfc-head">
        <Icon :icon="row.icon" class="vfc-ico" />
        <span class="vfc-name">{{ card.galaxyName }}</span>
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
        <span class="vfc-end">
          <span v-if="odds !== null" class="vfc-odds" :class="oddsTone">{{ odds }}%</span>
          <span class="vfc-tail" :class="{ 'vfc-tail--badge': tailIsBadge }">{{ footTail }}</span>
        </span>
      </span>

      <span class="vfc-rail" aria-hidden="true">
        <span class="vfc-rail-fill" :style="{ transform: `scaleX(${progress})` }" />
      </span>
    </button>

    <template #tip>
      <ExpeditionSubjectTooltip :pin-key="card.pinKey" :now="now" />
    </template>
  </RpgBadgeTooltip>
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
  gap: v-bind(rowGap);
  padding: v-bind(inset);
  text-align: left;
  /* Der ZUSTAND läuft über DREI Kanäle — Grund, linke Kante, Wort im Fuss —
     damit er auch ohne Farbsehen trägt und in einer Reihe von zehn Karten nicht
     erst gesucht werden muss. Die drei Gründe sind dieselben, mit denen das
     Missions-Dossier arbeitet (`ExpeditionFieldCard.vue`): Karte und Dossier
     sprechen so dieselbe Sprache. */
  background: var(--vfc-bg, #1c1c18);
  border: 1px solid #3e200a;
  border-left: 3px solid var(--vfc-edge, rgba(230, 220, 196, 0.4));
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.16s ease;
}
.vfc:hover {
  background: color-mix(in srgb, #e8dcc0 7%, var(--vfc-bg, #1c1c18));
}
.vfc:active {
  transform: scale(0.99);
}
.vfc:focus-visible {
  outline: 2px solid #e8c040;
  outline-offset: -3px;
}
.vfc--offer {
  --vfc-edge: rgba(200, 144, 64, 0.45);
}
.vfc--sendable {
  --vfc-edge: #e8c040;
}
/* Bemannt, aber kein Feldplatz frei. Matt statt golden — golden hiesse „los!",
   und genau das geht gerade nicht. */
.vfc--blocked {
  --vfc-edge: #8a5a1c;
}
.vfc--field {
  --vfc-edge: rgba(230, 220, 196, 0.4);
  --vfc-bg: #1a1008;
}
.vfc--ready {
  --vfc-edge: #64dcb4;
  --vfc-bg: #0e1a0e;
}
.vfc--failed {
  --vfc-edge: #cc6050;
  --vfc-bg: #1a0e0e;
}
/* Die gewählte Karte nimmt den Akzent ihrer Galaxie — die drei Kanten einzeln,
   damit die Zustandskante links stehen bleibt. Der Akzent wird in den
   Zustandsgrund GEMISCHT statt ihn zu ersetzen: eine Auswahl darf nicht
   löschen, was die Karte über sich sagt. */
.vfc--on {
  border-top-color: var(--gx-accent, #c89040);
  border-right-color: var(--gx-accent, #c89040);
  border-bottom-color: var(--gx-accent, #c89040);
  background: color-mix(in srgb, var(--gx-accent, #c89040) 16%, var(--vfc-bg, #1c1c18));
}
.vfc--on:hover {
  background: color-mix(in srgb, var(--gx-accent, #c89040) 24%, var(--vfc-bg, #1c1c18));
}

/* ── Stufe: drei Segmente an der Oberkante ──────────────────── */
/* Absolut, damit sie keine Zeile kostet — die Karte hat keine übrig. Farbe UND
   Länge tragen dieselbe Auskunft, die Stufe bleibt damit auch lesbar, wenn
   jemand Blau und Lila nicht trennt. */
.vfc-tier {
  position: absolute;
  left: v-bind(tierInsetX);
  right: v-bind(tierInsetX);
  top: 0;
  display: flex;
  gap: v-bind(tierGap);
  height: v-bind(tierBarH);
  pointer-events: none;
}
.vfc-tier-seg {
  flex: 1;
  border-radius: 0 0 1px 1px;
  background: rgba(200, 164, 90, 0.12);
}
.vfc-tier-seg.is-lit {
  background: var(--tier, #c89040);
}

/* ── Kopf ───────────────────────────────────────────────────── */
/* EINZEILIG, seit hier der ZIELNAME steht statt des Missionsnamens: alle zwanzig
   Themennamen sind zweiwortig, der längste („Crimson Expanse") misst bei 13 px
   gemessene 101,7 in einer 125-px-Spalte. Der volle Missionsname wäre auch
   zweizeilig knapp — er steht im Hover-Tooltip und im `aria-label`.

   Der GLYPH bleibt, und er ist mit dem Kurznamen wichtiger geworden, nicht
   unwichtiger: drei Verträge derselben Galaxie tragen jetzt denselben Namen, und
   er ist dann das Einzige, was sie unterscheidet. Deshalb steht die Chance im
   FUSS und nicht hier — neben Glyph und Pille blieben dem Namen 89 px, und
   „Crimson Expanse" wäre beschnitten. */
.vfc-head {
  display: flex;
  align-items: center;
  gap: v-bind(headGap);
  height: v-bind(headH);
  overflow: hidden;
}
.vfc-ico {
  flex-shrink: 0;
  width: v-bind(headIcon);
  height: v-bind(headIcon);
  color: #c89040;
}
.vfc-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.15;
  color: #ece0c0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  height: v-bind(footH);
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
/* Chance und Uhr stehen als EINE Gruppe rechts — getrennt wanderte die Chance
   mit der Breite des Lohns. */
.vfc-end {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 5px;
}
/* Reservierte Zahlenbreite, sonst wandert die Uhr, wenn 100 % auf 98 % fällt. */
.vfc-odds {
  flex-shrink: 0;
  min-width: v-bind(oddsW);
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(11, 8, 6, 0.55);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
  color: rgba(230, 220, 196, 0.72);
  font-variant-numeric: tabular-nums;
}
.vfc-odds.is-good {
  color: #64dcb4;
}
.vfc-odds.is-mid {
  color: #e8c040;
}
.vfc-odds.is-poor {
  color: #cc6050;
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
/* Was eine Handlung oder eine Sperre meint, wird zur Plakette — dieselbe Formel
   wie „✓ Returned" im Dossier: Farbe, Rand auf 40 %, Grund auf 12 %. KEIN
   gefüllter Knopf: der Klick wählt die Karte, er sammelt nicht ein. */
.vfc-tail--badge {
  padding: 1px 5px;
  border: 1px solid;
  border-radius: 3px;
  letter-spacing: 0.07em;
}
.vfc--ready .vfc-tail--badge {
  color: #52b830;
  border-color: rgba(82, 184, 48, 0.4);
  background: rgba(82, 184, 48, 0.12);
}
.vfc--failed .vfc-tail--badge {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.12);
}
.vfc--blocked .vfc-tail--badge {
  color: #c08a50;
  border-color: rgba(192, 138, 80, 0.4);
  background: rgba(192, 138, 80, 0.12);
}

/* ── Schiene ────────────────────────────────────────────────── */
.vfc-rail {
  height: v-bind(railH);
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
/* Fehlte bisher — eine gescheiterte Karte trug die goldene Standardschiene und
   sah damit aus wie eine gelungene. */
.vfc--failed .vfc-rail-fill {
  background: linear-gradient(to right, #7a2c1c, #cc6050);
}
.vfc--sendable .vfc-rail-fill {
  background: linear-gradient(to right, #8a5a1c, #e8c060);
}
.vfc--blocked .vfc-rail-fill {
  background: linear-gradient(to right, #4a3416, #8a5a1c);
}
.vfc--urgent .vfc-rail-fill {
  background: linear-gradient(to right, #7a2c1c, #cc6050);
}
</style>

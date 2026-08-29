<script setup lang="ts">
/**
 * Eine Expedition als Karte des Fleet-Bandes.
 *
 * Sie ist der EINZIGE Ort hier, der die Uhr liest: `VoyageFleetCard` trägt
 * Zeitstempel, kein fertiges Ziffernblatt.
 *
 * Vier Zeilen, jede für eine Frage: WER fährt (Crew), WAS es bringt (Lohn,
 * Loot), WIE LANGE und WIE WAHRSCHEINLICH. Der Zielname ist Kontext und steht
 * klein — der volle Missionsname im Tooltip und im `aria-label`.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { formatMinuteClock, formatShortDuration } from '@/utils/ui/format'
import {
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
  EXPEDITION_EXPIRY_WARNING_MS,
  UNIVERSE_TOOLTIP_IMAGES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
  VOYAGE_FLEET_AVATAR_PX,
  VOYAGE_FLEET_CARD_H,
  VOYAGE_FLEET_CARD_INSET_X,
  VOYAGE_FLEET_CARD_INSET_Y,
  VOYAGE_FLEET_CARD_MIN_W,
  VOYAGE_FLEET_CARD_ROW_GAP,
  VOYAGE_FLEET_CHIME_PX,
  VOYAGE_FLEET_EARN_GAP,
  VOYAGE_FLEET_EARN_TIGHT,
  VOYAGE_FLEET_FOOT_H,
  VOYAGE_FLEET_HEAD_GAP,
  VOYAGE_FLEET_HEAD_H,
  VOYAGE_FLEET_HEAD_ICON,
  VOYAGE_FLEET_LOOT_ICON,
  VOYAGE_FLEET_ODDS_W,
  VOYAGE_FLEET_RAIL_H,
  VOYAGE_FLEET_SEAT_GAP,
  VOYAGE_FLEET_TIER_BAR_GAP,
  VOYAGE_FLEET_TIER_BAR_H,
  VOYAGE_FLEET_TIME_W,
  EXPEDITION_TIER_COLORS,
  EXPEDITION_TIER_SEGMENTS,
  VOYAGE_TIP_GAP_PX,
  VOYAGE_TIP_OPEN_DELAY_MS,
  VOYAGE_TIP_MISSION_WIDTH,
} from '@/config/constants'
import type { VoyageFleetCard } from '@/types'
import ExpeditionSubjectTooltip from './ExpeditionSubjectTooltip.vue'

/** Eigenes Artwork statt eines Iconify-Ersatzes: dieselbe Währung, dasselbe Bild. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes
const MEEP_IMG = UNIVERSE_TOOLTIP_IMAGES.meeps

const props = defineProps<{ card: VoyageFleetCard; now: number; selected: boolean }>()
const emit = defineEmits<{ open: [galaxy: number, pinKey: string] }>()

const battleStore = useBattleStore()

const cardW = `${VOYAGE_FLEET_CARD_MIN_W}px`
const cardH = `${VOYAGE_FLEET_CARD_H}px`
const avatarPx = `${VOYAGE_FLEET_AVATAR_PX}px`
const seatGap = `${VOYAGE_FLEET_SEAT_GAP}px`
const headH = `${VOYAGE_FLEET_HEAD_H}px`
const earnH = `${VOYAGE_FLEET_FOOT_H}px`
const railH = `${VOYAGE_FLEET_RAIL_H}px`
const rowGap = `${VOYAGE_FLEET_CARD_ROW_GAP}px`
const inset = `${VOYAGE_FLEET_CARD_INSET_Y}px ${VOYAGE_FLEET_CARD_INSET_X}px`
const headGap = `${VOYAGE_FLEET_HEAD_GAP}px`
const headIcon = `${VOYAGE_FLEET_HEAD_ICON}px`
const oddsW = `${VOYAGE_FLEET_ODDS_W}px`
const timeW = `${VOYAGE_FLEET_TIME_W}px`
const earnGap = `${VOYAGE_FLEET_EARN_GAP}px`
const earnTight = `${VOYAGE_FLEET_EARN_TIGHT}px`
const chimePx = `${VOYAGE_FLEET_CHIME_PX}px`
const lootIcon = `${VOYAGE_FLEET_LOOT_ICON}px`
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

/* ── Kopf: Name · Chance · Uhr ──────────────────────────────────────────────
   Die Uhr misst, was gerade läuft — Auslagefenster oder Reise. Nach der
   Rückkehr misst nichts mehr, dort steht die Plakette. */

/**
 * Was eine Handlung oder eine Sperre meint, steht als Plakette — und zwar an
 * der Stelle der UHR, nicht der Chance. Ein Raster für alle sechs Zustände:
 * die Namensspalte springt nicht, wenn ein Vertrag blockiert.
 */
const badge = computed(() => {
  switch (state.value) {
    case 'ready':
      return 'collect'
    case 'failed':
      return 'salvage'
    case 'blocked':
      return 'full'
    default:
      return ''
  }
})

const clock = computed(() => {
  if (badge.value) return ''
  if (state.value === 'field') return formatMinuteClock(remaining.value ?? 0)
  return formatMinuteClock(expiresIn.value ?? 0)
})

/** Die Chance steht nur, wo sie noch etwas ändert — nach dem Wurf nicht mehr. */
const odds = computed(() =>
  row.value.state === 'offer' || row.value.state === 'field' ? row.value.odds : null,
)
const oddsTone = computed(() => {
  const o = odds.value
  if (o === null) return ''
  if (o >= EXPEDITION_CHANCE_GOOD * 100) return 'is-good'
  return o >= EXPEDITION_CHANCE_MID * 100 ? 'is-mid' : 'is-poor'
})

/* ── Ertrag: Lohn · Dauer · Loot ────────────────────────────────────────────
   Die Reisedauer steht nur beim Vertrag: unterwegs zählt die Uhr im Kopf sie
   ohnehin herunter, und nach der Rückkehr entscheidet sie nichts mehr. */

const duration = computed(() =>
  row.value.state === 'offer' ? formatShortDuration(row.value.durationSeconds) : '',
)

/**
 * Erwartung, solange nichts gewürfelt ist — danach die Stücke, die WIRKLICH
 * bereitliegen. Dieselbe Regel wie in der Hover-Karte: ein Erwartungswert über
 * einer heimgekehrten Crew wäre eine Lüge.
 */
const loot = computed(() => {
  const { payout, spoils } = row.value
  if (payout) {
    return {
      materials: `${payout.materials.reduce((n, m) => n + m.qty, 0)}`,
      meep: payout.meep,
      exact: true,
    }
  }
  return {
    materials: (spoils.materialRolls * spoils.materialChance).toFixed(1),
    meep: spoils.meep,
    exact: false,
  }
})

const lootAria = computed(
  () =>
    `${loot.value.exact ? '' : 'about '}${loot.value.materials} materials` +
    (loot.value.meep ? `, ${loot.value.meep} meep` : ''),
)

const note = computed(() => {
  const r = row.value
  if (r.state === 'offer') {
    const seats = `${r.seatsFilled} of ${r.seatsTotal} seats crewed`
    const when = `expires ${formatMinuteClock(expiresIn.value ?? 0)}`
    const gate = state.value === 'blocked' ? ', no free expedition slot' : ''
    return `${props.card.tier} contract, ${seats}, ${duration.value} voyage, ${when}${gate}`
  }
  if (r.state === 'field') {
    return `${formatMinuteClock(remaining.value ?? 0)} left, ${r.odds}% odds`
  }
  return r.state === 'ready' ? 'ready to collect' : 'failed, salvage only'
})

const crewNames = computed(() => slots.value.filter(Boolean).join(', '))
const aria = computed(
  () =>
    `${row.value.name}, ${props.card.galaxyName} — ${note.value}, ${lootAria.value}` +
    (crewNames.value ? `, crew ${crewNames.value}` : ''),
)
</script>

<template>
  <RpgBadgeTooltip
    passive
    :gap="VOYAGE_TIP_GAP_PX"
    :width="VOYAGE_TIP_MISSION_WIDTH"
    :open-delay="VOYAGE_TIP_OPEN_DELAY_MS"
    accent="#e8c040"
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

      <span class="vfc-head">
        <Icon :icon="row.icon" class="vfc-ico" />
        <span class="vfc-name">{{ card.galaxyName }}</span>
        <span v-if="odds !== null" class="vfc-odds" :class="oddsTone">{{ odds }}%</span>
        <span v-if="clock" class="vfc-clock">{{ clock }}</span>
        <span v-else-if="badge" class="vfc-badge">{{ badge }}</span>
      </span>

      <span class="vfc-crew">
        <span v-for="p in portraits" :key="p.key" class="vfc-seat" :style="{ '--seat': p.color }">
          <img v-if="p.image" :src="p.image" :alt="p.name" class="vfc-face" />
        </span>
      </span>

      <span class="vfc-earn">
        <span class="vfc-pay">
          <img class="vfc-chime" :src="CHIME_IMG" alt="" aria-hidden="true" />
          <span class="vfc-pay-n">{{ row.rewardPrefix }}{{ $formatNumber(row.reward ?? 0) }}</span>
        </span>
        <span v-if="duration" class="vfc-dur">{{ duration }}</span>
        <span class="vfc-loot" aria-hidden="true">
          <Icon icon="ph:diamond-fill" class="vfc-mat" />
          <span>{{ loot.materials }}</span>
          <template v-if="loot.meep">
            <img class="vfc-meep" :src="MEEP_IMG" alt="" />
            <span>{{ loot.meep }}</span>
          </template>
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
  /* Der ZUSTAND läuft über DREI Kanäle — Grund, linke Kante, Wort im Kopf —
     damit er auch ohne Farbsehen trägt. */
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
/* Der Akzent wird in den Zustandsgrund GEMISCHT statt ihn zu ersetzen: eine
   Auswahl darf nicht löschen, was die Karte über sich sagt. */
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
/* Farbe UND Länge tragen dieselbe Auskunft — die Stufe bleibt lesbar, wenn
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

/* ── Kopf: Name · Chance · Uhr ──────────────────────────────── */
/* Der Name ist Kontext und trägt die kleinste Schrift der Karte; die Auskunft
   steht darunter. Von 188 px Innenbreite bleiben ihm 89, und
   `VOYAGE_FLEET_NAME_MAX_PX` bindet, dass der längste Themename hineinpasst. */
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
  font-size: 11px;
  font-weight: 700;
  line-height: 1.15;
  color: rgba(236, 224, 192, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vfc--on .vfc-name {
  color: rgba(255, 244, 220, 0.82);
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
  line-height: 1.2;
  text-align: center;
  color: rgba(230, 220, 196, 0.72);
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
/* Dieselbe Formel wie „✓ Returned": Farbe, Rand auf 40 %, Grund auf 12 %. KEIN
   gefüllter Knopf — der Klick wählt die Karte, er sammelt nicht ein. */
/* Sie steht an der Stelle der Uhr und misst mindestens deren reservierte
   Breite — sonst wanderte die Namensspalte beim Zustandswechsel. */
.vfc-badge {
  flex-shrink: 0;
  min-width: v-bind(timeW);
  padding: 1px 5px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
}
.vfc--ready .vfc-badge {
  color: #52b830;
  border-color: rgba(82, 184, 48, 0.4);
  background: rgba(82, 184, 48, 0.12);
}
.vfc--failed .vfc-badge {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.12);
}
.vfc--blocked .vfc-badge {
  color: #c08a50;
  border-color: rgba(192, 138, 80, 0.4);
  background: rgba(192, 138, 80, 0.12);
}
/* Die laufende Zahl der Karte — reservierte Breite, weil MedievalSharp keine
   Tabellenziffern hat und `tabular-nums` hier nichts ausrichtet. */
.vfc-clock {
  flex-shrink: 0;
  min-width: v-bind(timeW);
  text-align: right;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
}
.vfc--urgent .vfc-clock {
  color: #e08a7a;
}

/* ── Crew: die breiteste Aussage der Karte ──────────────────── */
.vfc-crew {
  display: flex;
  align-items: center;
  gap: v-bind(seatGap);
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
  object-position: center top;
}

/* ── Ertrag: Lohn · Dauer · Loot ────────────────────────────── */
.vfc-earn {
  display: flex;
  align-items: center;
  gap: v-bind(earnGap);
  height: v-bind(earnH);
}
/* Lohn und Loot geben NICHT nach — sie sind die Auskunft der Zeile. Weichen
   darf allein die Dauer; kürzte sich der Lohn selbst weg, verschwände die eine
   Zahl, wegen der die Zeile da ist. */
.vfc-pay {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: v-bind(earnTight);
}
.vfc-pay-n {
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
}
.vfc--ready .vfc-pay-n {
  color: #64dcb4;
}
.vfc--failed .vfc-pay-n {
  color: #e08a7a;
}
/* Das ECHTE Artwork, kein Iconify-Ersatz — dieselbe Währung sieht überall
   gleich aus. 16 px bleiben unter der 34-px-Schwelle der 128er-Stufe. */
.vfc-chime {
  flex-shrink: 0;
  width: v-bind(chimePx);
  height: v-bind(chimePx);
  object-fit: contain;
}
/* Was die Reise an ZEIT kostet — untergeordnet durch Grösse, nicht durch eine
   eigene Zeile, und als EINZIGE Zelle der Zeile nachgebend. Keine reservierte
   Breite: sie steht statisch am Vertrag und wandert nicht im Takt. */
.vfc-dur {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: rgba(216, 200, 160, 0.5);
  white-space: nowrap;
}
.vfc-loot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: v-bind(earnTight);
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: rgba(232, 220, 192, 0.68);
  white-space: nowrap;
}
.vfc-mat {
  flex-shrink: 0;
  width: v-bind(lootIcon);
  height: v-bind(lootIcon);
  color: #7aa8e0;
}
/* Hochformatiges Sprite mit breitem Alpha-Rand — dieselbe Korrektur wie im
   Header und in der Hover-Karte. */
.vfc-meep {
  flex-shrink: 0;
  width: v-bind(lootIcon);
  height: v-bind(lootIcon);
  margin-left: v-bind(earnTight);
  object-fit: contain;
  transform: scale(v-bind(UNIVERSE_TOOLTIP_MEEP_SCALE));
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
/* Eine gescheiterte Karte trug einmal die goldene Standardschiene und sah damit
   aus wie eine gelungene. */
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

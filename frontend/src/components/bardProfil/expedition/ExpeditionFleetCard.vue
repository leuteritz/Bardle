<script setup lang="ts">
/**
 * Eine Expedition als Karte des Fleet-Bandes.
 *
 * Sie ist der EINZIGE Ort hier, der die Uhr liest: `VoyageFleetCard` trägt
 * Zeitstempel, kein fertiges Ziffernblatt.
 *
 * DREI Zeilen für drei Fragen: WER fährt, WAS es bringt, WIE LANGE noch. Der
 * Zielname und die Fortschrittsschiene sind dafür gefallen — der Name steht im
 * Tooltip und im `aria-label`, die Schiene maß dieselbe Spanne wie die Uhr.
 *
 * Geschnitten wird nach BEDEUTUNG, nicht nach Datentyp: der Ertrag steht
 * vollständig in EINER Zeile, und die trägt als einzige einen eigenen Grund.
 * Vorher lagen die Chimes über und der Rest unter der Uhr; was zusammengehört,
 * las sich als drei unabhängige Zahlen.
 *
 * Der Ertrag der KARTE sind Chimes und Meeps — sonst nichts. Material ist die
 * dritte Zahl in einer Zeile, die von zwei Währungen handelt, und sein Glyph
 * bleibt eine Fremdform zwischen zwei echten Artworks; es steht vollständig in
 * `ExpeditionSubjectTooltip`, in beiden Zuständen. Nur weil es gefallen ist,
 * konnte der Lohn von 24 auf 28 px wachsen.
 */
import { computed } from 'vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { formatMinuteClock, formatShortDuration } from '@/utils/ui/format'
import {
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
  VOYAGE_FLEET_DUR_W,
  VOYAGE_FLEET_EARN_GAP,
  VOYAGE_FLEET_EARN_TIGHT,
  VOYAGE_FLEET_LOOT_ICON,
  VOYAGE_FLEET_ODDS_W,
  VOYAGE_FLEET_PAY_H,
  VOYAGE_FLEET_READ_H,
  VOYAGE_FLEET_SEAT_OVERLAP,
  VOYAGE_FLEET_SEAT_RING,
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
/* Negativ: der Sitz rückt UNTER seinen linken Nachbarn. */
const seatLap = `-${VOYAGE_FLEET_SEAT_OVERLAP}px`
const seatRing = `${VOYAGE_FLEET_SEAT_RING}px`
const payH = `${VOYAGE_FLEET_PAY_H}px`
const readH = `${VOYAGE_FLEET_READ_H}px`
const rowGap = `${VOYAGE_FLEET_CARD_ROW_GAP}px`
const inset = `${VOYAGE_FLEET_CARD_INSET_Y}px ${VOYAGE_FLEET_CARD_INSET_X}px`
const oddsW = `${VOYAGE_FLEET_ODDS_W}px`
const timeW = `${VOYAGE_FLEET_TIME_W}px`
const durW = `${VOYAGE_FLEET_DUR_W}px`
const earnGap = `${VOYAGE_FLEET_EARN_GAP}px`
const earnTight = `${VOYAGE_FLEET_EARN_TIGHT}px`
const chimePx = `${VOYAGE_FLEET_CHIME_PX}px`
const lootIcon = `${VOYAGE_FLEET_LOOT_ICON}px`
const tierBarH = `${VOYAGE_FLEET_TIER_BAR_H}px`
const tierGap = `${VOYAGE_FLEET_TIER_BAR_GAP}px`
/* Der Streifen endet, wo der Inhalt beginnt — sonst liefe er unter die
   Zustandskante links und läse sich als deren Fortsetzung. */
const tierInsetX = `${VOYAGE_FLEET_CARD_INSET_X}px`
/* Der Ertragsgrund läuft über die volle Kartenbreite — so kostet er keine
   Innenbreite, und die Ertragszeile ist auf den Pixel belegt. */
const earnBleed = `-${VOYAGE_FLEET_CARD_INSET_X}px`

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
    /** Der LINKE Sitz liegt oben — sonst verdeckt der Nachbar sein Gesicht. */
    z: slots.value.length - i,
  })),
)

/* ── Ertragszeile: was es bringt, vollständig ─────────────────────────────── */

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

/* ── Ablesezeile: welche Frist, welche Aussicht ───────────────────────────── */

/** Was eine Handlung oder eine Sperre meint, steht als Plakette statt als Zahl. */
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

/** Nach der Rückkehr misst nichts mehr — dort steht die Plakette. */
const clock = computed(() => {
  if (state.value === 'ready' || state.value === 'failed') return ''
  if (state.value === 'field') return formatMinuteClock(remaining.value ?? 0)
  return formatMinuteClock(expiresIn.value ?? 0)
})

/**
 * Nur beim Vertrag: was die Fahrt an ZEIT kostet. Unterwegs zählt die Uhr.
 *
 * Sie steht OBEN neben dem Crew-Stapel, nicht mehr unter der Uhr — dort waren es
 * zwei Zeitangaben in einer Zeile, die Verschiedenes meinen, und die Dauer war
 * mit 11 px die kleinste Schrift der Karte.
 */
const duration = computed(() =>
  row.value.state === 'offer' ? formatShortDuration(row.value.durationSeconds) : '',
)

/**
 * Die Plakette nimmt das Ende, das der Zustand frei lässt: heimgekehrt steht sie
 * links statt der Uhr, blockiert rechts — dort, wo sonst die Erfolgsaussicht
 * steht. Das ist kein Verlust: wer nicht losschicken kann, ändert mit der Quote
 * nichts. Dieselbe Regel, nach der die Chance nach dem Wurf verschwindet.
 */
const lead = computed(() => clock.value || badge.value)
const tail = computed(() => (clock.value && badge.value ? badge.value : ''))

/**
 * Das Label nennt den VOLLEN Ertrag, auch das Material, das die Karte nicht mehr
 * zeigt — dass die Optik sich auf die beiden Währungen beschränkt, ist eine
 * Layoutentscheidung. Und dies ist der einzige Ort dafür: die Hover-Karte trägt
 * kein eigenes `aria`.
 */
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

/** Der Name steht nicht mehr im Bild — hier ist er der einzige Ort neben dem Tooltip. */
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

      <!-- WER fährt, und WIE LANGE die Fahrt dauert. Der Stapel gibt der Dauer
           den Platz, den fünf gereihte Sitze ihr nicht liessen. -->
      <span class="vfc-crew">
        <span class="vfc-stack">
          <span
            v-for="p in portraits"
            :key="p.key"
            class="vfc-seat"
            :style="{ '--seat': p.color, zIndex: p.z }"
          >
            <img v-if="p.image" :src="p.image" :alt="p.name" class="vfc-face" />
          </span>
        </span>
        <span v-if="duration" class="vfc-dur">{{ duration }}</span>
      </span>

      <!-- WAS es bringt: die beiden Währungen, mehr nicht. Material steht in
           der Hover-Karte — es ist die dritte Zahl in einer Zeile, die von
           zweien handelt. -->
      <span class="vfc-earn" aria-hidden="true">
        <span class="vfc-chimes">
          <img class="vfc-chime" :src="CHIME_IMG" alt="" />
          <span class="vfc-pay">{{ row.rewardPrefix }}{{ $formatNumber(row.reward ?? 0) }}</span>
        </span>
        <span v-if="loot.meep" class="vfc-meep">
          <img class="vfc-meep-i" :src="MEEP_IMG" alt="" />
          <span>{{ loot.meep }}</span>
        </span>
      </span>

      <!-- Welche FRIST, welche AUSSICHT. Die Plakette verdrängt die Quote:
           wer nicht losschicken kann, ändert mit ihr nichts. -->
      <span class="vfc-read">
        <span class="vfc-lead" :class="{ 'vfc-mark': !clock }">{{ lead }}</span>
        <span v-if="tail" class="vfc-tail vfc-mark">{{ tail }}</span>
        <span v-else-if="odds !== null" class="vfc-odds" :class="oddsTone">{{ odds }}%</span>
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
  /* Der ZUSTAND läuft über DREI Kanäle — Grund, linke Kante, Wort der
     Ablesezeile — damit er auch ohne Farbsehen trägt. */
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

/* ── Crew: der Stapel, und rechts daneben die Reisedauer ────── */
/* 34 px ist die Schwelle, bis zu der die 128er-Auflösungsstufe trägt. */
.vfc-crew {
  display: flex;
  align-items: center;
  gap: v-bind(earnGap);
  height: v-bind(avatarPx);
}
/* GESTAPELT, nicht gereiht: gereiht belegten fünf Sitze 186 von 188 px, und die
   Reisedauer hatte in der Zeile keinen Platz. */
.vfc-stack {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}
.vfc-seat {
  position: relative;
  flex-shrink: 0;
  width: v-bind(avatarPx);
  height: v-bind(avatarPx);
  border-radius: 50%;
  overflow: hidden;
  background: #0f0d08;
  /* Zwei Ringe, zwei Aufgaben: innen die HERKUNFT, aussen die Kartenfarbe. Ohne
     den äusseren laufen zwei Nachbarn zu EINER Form zusammen. */
  box-shadow:
    inset 0 0 0 2px var(--seat, rgba(122, 78, 32, 0.55)),
    0 0 0 v-bind(seatRing) var(--vfc-bg, #1c1c18);
}
.vfc-seat + .vfc-seat {
  margin-left: v-bind(seatLap);
}
.vfc-face {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
}

/* Die STATISCHE Zeit der Karte, gedämpft: die laufende Uhr darunter ist die
   lautere. Auseinander gehalten werden sie an der Schreibweise — „2m 30s" mit
   Einheiten gegen „2:55" mit Doppelpunkt. */
.vfc-dur {
  flex: 0 0 auto;
  min-width: v-bind(durW);
  margin-left: auto;
  text-align: right;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: rgba(216, 200, 160, 0.62);
  white-space: nowrap;
}

/* ── Ertragszeile: Chimes, Material, Meep — in DIESER Reihenfolge ──── */
/* Die einzige Zeile mit eigenem Grund. Er läuft über die volle Kartenbreite,
   damit er keine Innenbreite kostet, und ist flach: er gruppiert, er leuchtet
   nicht. */
.vfc-earn {
  display: flex;
  align-items: center;
  gap: v-bind(earnGap);
  height: v-bind(payH);
  margin: 0 v-bind(earnBleed);
  padding: 0 v-bind(tierInsetX);
  background: rgba(0, 0, 0, 0.25);
}
.vfc-chimes,
.vfc-meep {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: v-bind(earnTight);
}
/* Keine Zelle der Zeile gibt mehr nach: seit Material gefallen ist, stehen
   18 px Reserve. Eine Zahl, die schrumpfen darf, ist eine Zahl, die abschneiden
   kann. */
.vfc-meep {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: rgba(232, 220, 192, 0.68);
  white-space: nowrap;
}
/* Das ECHTE Artwork, kein Iconify-Ersatz — dieselbe Währung sieht überall
   gleich aus. 18 px bleiben unter der 34-px-Schwelle der 128er-Stufe. */
.vfc-chime {
  flex-shrink: 0;
  width: v-bind(chimePx);
  height: v-bind(chimePx);
  object-fit: contain;
}
/* Sie gibt nie nach: kürzte sie sich weg, verschwände die eine Zahl, wegen der
   die Zeile da ist. 28 px — gewachsen, als Material die Zeile verliess. */
.vfc-pay {
  flex-shrink: 0;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
}
.vfc--ready .vfc-pay {
  color: #64dcb4;
}
.vfc--failed .vfc-pay {
  color: #e08a7a;
}
/* Reservierte Zahlenbreite, sonst wandert die Pille, wenn 100 % auf 98 % fällt. */
.vfc-odds {
  flex: 0 0 auto;
  min-width: v-bind(oddsW);
  margin-left: auto;
  padding: 2px 5px;
  border-radius: 3px;
  background: rgba(11, 8, 6, 0.55);
  font-size: 13px;
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

/* Hochformatiges Sprite mit breitem Alpha-Rand — dieselbe Korrektur wie im
   Header und in der Hover-Karte. */
.vfc-meep-i {
  flex-shrink: 0;
  width: v-bind(lootIcon);
  height: v-bind(lootIcon);
  object-fit: contain;
  transform: scale(v-bind(UNIVERSE_TOOLTIP_MEEP_SCALE));
}

/* ── Ablesezeile: Frist · Aussicht ──────────────────────────── */
/* Sie trägt seit dem Umbau nur noch zwei Dinge; die Luft ist Absicht. */
.vfc-read {
  display: flex;
  align-items: center;
  gap: v-bind(earnGap);
  height: v-bind(readH);
}
/* Die laufende Zahl — reservierte Breite, weil MedievalSharp keine
   Tabellenziffern hat und `tabular-nums` hier nichts ausrichtet. */
.vfc-lead {
  flex: 0 0 auto;
  min-width: v-bind(timeW);
  font-size: 19px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  white-space: nowrap;
}
.vfc--urgent .vfc-lead {
  color: #e08a7a;
}
/* Sie nimmt den Platz der Erfolgsaussicht, nicht einen eigenen. */
.vfc-tail {
  flex: 0 0 auto;
  margin-left: auto;
}

/* Dieselbe Formel wie „✓ Returned": Farbe, Rand auf 40 %, Grund auf 12 %. KEIN
   gefüllter Knopf — der Klick wählt die Karte, er sammelt nicht ein. */
.vfc-mark {
  padding: 2px 5px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
}
.vfc--ready .vfc-mark {
  color: #52b830;
  border-color: rgba(82, 184, 48, 0.4);
  background: rgba(82, 184, 48, 0.12);
}
.vfc--failed .vfc-mark {
  color: #cc6050;
  border-color: rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.12);
}
.vfc--blocked .vfc-mark {
  color: #c08a50;
  border-color: rgba(192, 138, 80, 0.4);
  background: rgba(192, 138, 80, 0.12);
}
</style>

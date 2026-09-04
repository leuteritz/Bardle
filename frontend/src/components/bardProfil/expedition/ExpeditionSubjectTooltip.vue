<script setup lang="ts">
/**
 * Was auf einer Marke liegt, ohne sie anzuklicken.
 *
 * VERDIKT ZUERST: was ein Klick taete, stand einmal klein und grau unter drei
 * Fliesstextzeilen, waehrend eine Chip-Reihe darueber den Zustand VIERMAL
 * nannte (`IN THE FIELD`, `BACK 0:05`, `1 crew in the field`, `STILL IN THE
 * FIELD`). Jetzt sagt eine Zeile es einmal und gross, alles darunter ist ihr
 * BELEG, und die Chip-Reihe ist ersatzlos entfallen.
 *
 * Bausteine wie `ExpeditionStarTooltip`: nur `.tip-*`, jedes Mass in `em` gegen
 * `--tip-u`. Der Fuss trug hier einmal feste 12.5px neben 1.4em Name.
 *
 * Nur beim Hover gemountet, der Inhalt kommt aus `buildVoyageTip`, die Uhr liest
 * allein diese Komponente.
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
import { voyageMarkAction } from '@/utils/game/voyageAction'
import { pinKeyOf } from '@/utils/game/voyageSites'
import {
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_CHANCE_GOOD,
  EXPEDITION_CHANCE_MID,
  EXPEDITION_EXPIRY_WARNING_MS,
  MATERIAL_ACCENT_HEX,
  UNIVERSE_TOOLTIP_IMAGES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
  VOYAGE_ACTION_COLLECT_LABEL,
  VOYAGE_ACTION_ICONS,
  VOYAGE_ACTION_SEND_LABEL,
  VOYAGE_ACTION_WAITING_LABEL,
  VOYAGE_ODDS_COLORS,
  VOYAGE_TIP_CREW_MAX,
  VOYAGE_VERDICT_COLORS,
} from '@/config/constants'
import type { VoyageRosterSubject } from '@/types'

/** Eigenes Artwork statt eines Iconify-Ersatzes: dieselbe Währung, dasselbe Bild. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes
const MEEP_IMG = UNIVERSE_TOOLTIP_IMAGES.meeps

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

/** Dieselbe Regel, die der Klick auf die Marke ausführt — nur benannt. */
const action = computed(() =>
  subject.value
    ? voyageMarkAction(subject.value, {
        crewFor: (offer) => expeditionStore.crewFor(offer),
        canStart: expeditionStore.canStartExpedition,
        now: props.now,
      })
    : null,
)

/* ── Das Verdikt ───────────────────────────────────────────────────────────
   Die eine Zeile, wegen der die Karte aufgeht. Sie nennt den Ausgang aus
   `voyageMarkAction` — dieselbe Funktion, die der Klick ausführt. */

/** `collect` trennt sich nach Ausgang: dieselbe Geste, anderes Ergebnis. */
const verdictKey = computed<keyof typeof VOYAGE_VERDICT_COLORS>(() => {
  const a = action.value
  if (!a) return 'waiting'
  if (a.kind === 'collect') return a.success ? 'collect' : 'lost'
  return a.kind
})

const verdict = computed(() => {
  const a = action.value
  if (!a) return null
  const icon = VOYAGE_ACTION_ICONS[a.kind]
  if (a.kind === 'send') return { icon, label: VOYAGE_ACTION_SEND_LABEL, clock: '' }
  if (a.kind === 'collect') {
    return { icon, label: `${VOYAGE_ACTION_COLLECT_LABEL} +${formatNumber(a.reward)}`, clock: '' }
  }
  if (a.kind === 'waiting') {
    const clock = formatMinuteClock(remaining.value ?? 0)
    return { icon, label: VOYAGE_ACTION_WAITING_LABEL, clock }
  }
  return { icon, label: a.reason, clock: '' }
})

/** Nur beim Vertrag: wie lange die Crew gebunden wäre. Unterwegs sagt es die Uhr. */
const voyageLength = computed(() =>
  view.value?.state === 'offer' ? formatShortDuration(view.value.durationSeconds) : '',
)

/**
 * Der Vertrag zeigt sein Restfenster, die laufende Mission ihren Weg.
 *
 * Das Fenster LEERT sich und ist deshalb `--tinted` — ein voller Balken heisst
 * dort nicht „geschafft". Die Reise FÜLLT sich auf ihr Ziel zu und behält den
 * Goldverlauf.
 */
const bar = computed(() => {
  const v = view.value
  if (!v) return null
  if (v.state === 'offer') {
    const left = Math.max(0, expiresIn.value ?? 0)
    return {
      fill: Math.min(1, left / EXPEDITION_AVAILABILITY_DURATION_MS),
      clock: formatMinuteClock(left),
      urgent: left < EXPEDITION_EXPIRY_WARNING_MS,
      tinted: true,
    }
  }
  if (v.state === 'field' && v.spanMs) {
    const left = Math.max(0, remaining.value ?? 0)
    return { fill: Math.min(1, 1 - left / v.spanMs), clock: '', urgent: false, tinted: false }
  }
  return null
})

/* ── Die zwei Ablesungen ───────────────────────────────────────────────────
   Zelle 1 zeigt, was das Verdikt NICHT schon sagt: solange der Lohn dort fehlt,
   die Chimes — danach die Stücke, die bereitliegen. */

/** Erwarteter Materialertrag, solange nichts gewürfelt ist. */
/* Seit die Fleet-Karte Material nicht mehr zeigt, ist DIESE Karte sein Ort —
   also trägt sie auch seinen Ton. Vorher stand hier `#7aa8e0`, und das ist
   `EXPEDITION_TIER_COLORS.rare`: dieselbe Kollision, die die Karte schon hatte. */
const matTint = MATERIAL_ACCENT_HEX

const expectedDrops = computed(() => {
  const s = view.value?.spoils
  return s ? s.materialRolls * s.materialChance : 0
})

/** Was WIRKLICH bereitliegt. Der Erwartungswert wäre hier eine Lüge. */
const payout = computed(() => view.value?.payout ?? null)

const lootCount = computed(() => {
  const p = payout.value
  return p ? p.materials.reduce((n, m) => n + m.qty, 0) : 0
})

/** Die Tonstufe ist eine Entscheidungshilfe. Nach der Rückkehr ist die Chance
 *  Geschichte — ein rotes 24 % über einem GEGLÜCKTEN Lauf widerspräche sich. */
const oddsColor = computed(() => {
  const o = view.value?.odds
  if (o === null || o === undefined || payout.value) return VOYAGE_ODDS_COLORS.dim
  if (o >= EXPEDITION_CHANCE_GOOD * 100) return VOYAGE_ODDS_COLORS.good
  return o >= EXPEDITION_CHANCE_MID * 100 ? VOYAGE_ODDS_COLORS.mid : VOYAGE_ODDS_COLORS.poor
})

/* ── Crew und Gefahren ─────────────────────────────────────────────────────*/

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
    image: name ? battleStore.getChampionImage(name, { size: 'sm' }) : '',
    color: name ? getOriginColor(name) : '',
  }))
})

/** Nur die LÜCKE bekommt ein Wort — eine volle Crew zeigen die Ringe selbst. */
const seatGap = computed(() => {
  const v = view.value
  if (!v || v.seatsTotal === null || v.seatsFilled === v.seatsTotal) return ''
  return `${v.seatsFilled} / ${v.seatsTotal}`
})

/** Die Farbe des Balkens gehört der FRIST, nicht der Geste: Gold, solange Zeit
 *  ist, rot erst kurz davor. Der Reisebalken läuft auf ein Ziel zu und behält
 *  seinen Goldverlauf ohnehin. */
const gaugeColor = computed(() =>
  bar.value?.urgent ? VOYAGE_VERDICT_COLORS.blocked : VOYAGE_VERDICT_COLORS.waiting,
)

/** Der Rat gilt der BESETZUNG; unterwegs ist sie entschieden. */
const showRequirement = computed(() => view.value?.state === 'offer')
</script>

<template>
  <ExpeditionMarkTooltip
    v-if="view"
    :icon="view.icon"
    :accent="view.accent"
    :name="view.name"
    :state="view.stateLabel"
  >
    <template #foot>
      <div class="vtt-body">
        <!-- Kein Knopf: die Karte ist `passive`, getroffen wird die Marke selbst.
             `--tip-color` liegt lokal auf dem Block, damit die linke Kante der
             `.tip-effect` die AKTIONS-Farbe trägt — Pfeil und Akzentleiste der
             Hülle bleiben davon unberührt. -->
        <p
          v-if="verdict"
          class="tip-effect vtt-say"
          :style="{ '--tip-color': VOYAGE_VERDICT_COLORS[verdictKey] }"
        >
          <Icon :icon="verdict.icon" width="20" height="20" class="vtt-say-ico" />
          <b class="vtt-say-label">{{ verdict.label }}</b>
          <span v-if="verdict.clock" class="vtt-say-clock">{{ verdict.clock }}</span>
          <span v-if="voyageLength" class="vtt-say-aside">{{ voyageLength }}</span>
        </p>

        <!-- Der Balken steht AUSSERHALB des Verdikt-Blocks: er misst die FRIST,
             nicht die Geste. Erbte er `--tip-color`, liefe er beim blockierten
             Vertrag rot voll, während das Fenster noch offen ist. -->
        <div v-if="bar" class="vtt-gauge" :style="{ '--tip-color': gaugeColor }">
          <div class="tip-bar">
            <i
              class="tip-bar-fill"
              :class="{ 'tip-bar-fill--tinted': bar.tinted }"
              :style="{ transform: `scaleX(${bar.fill})` }"
            />
          </div>
          <span v-if="bar.clock" class="vtt-gauge-clock">{{ bar.clock }}</span>
        </div>

        <div class="tip-read tip-read--lg">
          <span class="tip-read-cell">
            <span class="tip-read-k">{{ payout ? 'Loot' : 'Spoils' }}</span>
            <span v-if="payout" class="tip-read-v">
              <Icon icon="ph:cube-fill" width="16" height="16" class="vtt-mat" />
              <span>{{ lootCount }}</span>
              <template v-if="payout.meep">
                <img class="vtt-meep" :src="MEEP_IMG" alt="" aria-hidden="true" />
                <span>{{ payout.meep }}</span>
              </template>
            </span>
            <span v-else class="tip-read-v">
              <img class="vtt-chime" :src="CHIME_IMG" alt="" aria-hidden="true" />
              <span>{{ $formatNumber(view.reward) }}</span>
              <span class="vtt-loot">
                <Icon icon="ph:cube-fill" width="16" height="16" class="vtt-mat" />
                <span>{{ expectedDrops.toFixed(1) }}</span>
                <template v-if="view.spoils.meep">
                  <img class="vtt-meep" :src="MEEP_IMG" alt="" aria-hidden="true" />
                  <span>{{ view.spoils.meep }}</span>
                </template>
              </span>
            </span>
          </span>

          <span class="tip-read-cell vtt-read-end">
            <span class="tip-read-k">Odds</span>
            <span class="tip-read-v" :style="{ color: oddsColor }">
              {{ view.odds === null ? '—' : `${view.odds}%` }}
            </span>
          </span>
        </div>

        <div class="vtt-crew">
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
          <span v-if="seatGap" class="tip-meta vtt-gap">{{ seatGap }}</span>
        </div>

        <p v-for="h in view.hazards" :key="h.id" class="vtt-hazard">
          <Icon :icon="h.icon" width="16" height="16" class="vtt-hazard-ico" />
          <span>
            <b>{{ h.name }}</b>
            <span v-if="showRequirement && h.requirement" class="tip-meta">
              — {{ h.requirement }}
            </span>
          </span>
        </p>
      </div>
    </template>
  </ExpeditionMarkTooltip>
</template>

<style scoped>
/* Fläche, Kopf, Effektblock, Balken und Ablesungen kommen aus der
   Tooltip-Sprache (`.tip-*` in `rpg-theme.css`). Hier steht nur, was DIESE
   Karte davon unterscheidet — und alles in `em` gegen `--tip-u`. */
.vtt-body {
  display: flex;
  flex-direction: column;
  gap: 0.74em;
}

/* ── Das Verdikt ───────────────────────────────────────────────────────────
   Fläche, linke Kante und Schriftgrösse kommen aus `.tip-effect`. */
.vtt-say {
  display: flex;
  align-items: baseline;
  gap: 0.44em;
  margin: 0;
}

.vtt-say-ico {
  flex-shrink: 0;
  align-self: center;
  width: 1em;
  height: 1em;
  color: var(--tip-color);
}

.vtt-say-label {
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--tip-color);
}

/* Die grösste Zahl der Karte — sie ist der Grund, warum nichts zu tun ist.
   Die BREITE ist reserviert: `tabular-nums` trägt das nicht, MedievalSharp hat
   keine Tabellenziffern, und die Zeile wanderte sonst im Sekundentakt. */
.vtt-say-clock {
  min-width: 4.2ch;
  font-size: 1.36em;
  font-weight: 900;
  line-height: 1;
  color: var(--tip-color);
}

/* Ein blockierter Grund bricht auf zwei Zeilen um; ohne `nowrap` bräche die
   Reisedauer daneben mit und stünde als `3m` über `20s`. */
.vtt-say-aside {
  flex-shrink: 0;
  margin-left: auto;
  white-space: nowrap;
  font-size: 0.76em;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.5);
}

/* Der Balken gehört zum Verdikt darüber und rückt deshalb enger heran, als der
   Abstand der Karte es täte. */
.vtt-gauge {
  display: flex;
  align-items: center;
  gap: 0.58em;
  margin-top: -0.34em;
}

.vtt-gauge .tip-bar {
  flex: 1;
}

/* Ablaufende Frist: statischer Farbwechsel über `--tip-color`, keine laufende
   Animation — die Karte steht über dem laufenden Orbit. */
.vtt-gauge-clock {
  min-width: 4.2ch;
  text-align: right;
  font-size: 0.9em;
  font-weight: 800;
  color: var(--tip-color);
}

/* ── Die Ablesungen ──────────────────────────────────────────────────────── */
.vtt-read-end {
  flex: 0 0 auto;
  align-items: flex-end;
}

/* Das ECHTE Artwork, kein Iconify-Ersatz — dieselbe Währung sieht überall
   gleich aus. In `em`, damit sie neben der 1.7em-Zahl mitwächst: gemessen unter
   der 34-px-Schwelle der 128er-Stufe. */
.vtt-chime,
.vtt-meep {
  flex-shrink: 0;
  width: 0.82em;
  height: 0.82em;
  object-fit: contain;
}

/* Hochformatiges Sprite mit breitem Alpha-Rand — dieselbe Korrektur wie im
   Header und im Universums-Panel. */
.vtt-meep {
  transform: scale(v-bind(UNIVERSE_TOOLTIP_MEEP_SCALE));
}

/* Die Beute steht NEBEN dem Lohn, nicht unter ihm — untergeordnet durch Grösse,
   nicht durch eine eigene Zeile. */
.vtt-loot {
  display: flex;
  align-items: center;
  gap: 0.2em;
  font-size: 0.62em;
  font-weight: 700;
  color: rgba(232, 220, 192, 0.62);
}

/* Die Masse bleiben in `em`: der Tooltip skaliert über `--tip-u`, hier gilt kein
   Pixelmass der Karte. Die FARBE ist dieselbe. */
.vtt-mat {
  flex-shrink: 0;
  width: 0.82em;
  height: 0.82em;
  color: v-bind(matTint);
}

/* ── Crew ────────────────────────────────────────────────────────────────── */
.vtt-crew {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.vtt-seats {
  display: flex;
  align-items: center;
  gap: 0.18em;
}

.vtt-seat {
  flex-shrink: 0;
  width: 1.8em;
  height: 1.8em;
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

.vtt-gap {
  color: #e8c040;
}

/* ── Gefahren ────────────────────────────────────────────────────────────── */
.vtt-hazard {
  display: flex;
  align-items: baseline;
  gap: 0.44em;
  margin: 0;
  font-size: 0.95em;
  line-height: 1.32;
  color: rgba(230, 220, 196, 0.58);
}

.vtt-hazard-ico {
  flex-shrink: 0;
  align-self: center;
  width: 1em;
  height: 1em;
  color: #cc6050;
}

.vtt-hazard b {
  font-weight: 800;
  color: #e08a7a;
}
</style>

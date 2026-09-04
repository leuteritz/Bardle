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
 *
 * ZWEI Anker, ein Schnitt je Anker (`VOYAGE_TIP_BLOCKS`): an der MARKE steht
 * alles, sie zeigt von sich aus nichts. Ueber der FLEET-Karte faellt jeder
 * Block, den die Karte selbst traegt — Uhr, Fristbalken, Lohn, Meep, Aussicht
 * und die Gesichter standen dort zweimal. Uebrig bleibt, was auf 210 x 105 px
 * keinen Platz hat: Galaxie, Material, Gefahren, die Crew mit NAMEN und Rollen.
 *
 * Und die Geste gehoert der MARKE: ein Klick auf die Fleet-Karte springt nur
 * dorthin. Sie sagt deshalb den ZUSTAND (`VOYAGE_FLEET_TIP_STATUS`) statt
 * „Click to send" — und in der Fusszeile, was der Klick wirklich tut.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import ExpeditionMarkTooltip from './ExpeditionMarkTooltip.vue'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { getOriginColor } from '@/config/champions/championOrigins'
import { destinationFor } from '@/config/economy/expeditionDestinations'
import { MATERIALS } from '@/config/economy/materials'
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
  MATERIAL_COLOR,
  MATERIAL_PLACEHOLDER_LABELS,
  ROLE_BY_KEY,
  UNIVERSE_TOOLTIP_IMAGES,
  UNIVERSE_TOOLTIP_MEEP_SCALE,
  VOYAGE_ACTION_COLLECT_LABEL,
  VOYAGE_ACTION_ICONS,
  VOYAGE_ACTION_SEND_LABEL,
  VOYAGE_ACTION_WAITING_LABEL,
  VOYAGE_FLEET_TIP_HINT,
  VOYAGE_FLEET_TIP_MAT_PX,
  VOYAGE_FLEET_TIP_STATUS,
  VOYAGE_ODDS_COLORS,
  VOYAGE_TIP_BLOCKS,
  VOYAGE_TIP_CREW_MAX,
  VOYAGE_VERDICT_COLORS,
} from '@/config/constants'
import type { VoyageRosterSubject } from '@/types'

/** Eigenes Artwork statt eines Iconify-Ersatzes: dieselbe Währung, dasselbe Bild. */
const CHIME_IMG = UNIVERSE_TOOLTIP_IMAGES.chimes
const MEEP_IMG = UNIVERSE_TOOLTIP_IMAGES.meeps

const props = withDefaults(
  defineProps<{ pinKey: string; now: number; context?: 'mark' | 'fleet' }>(),
  { context: 'mark' },
)

/** Welche Bloecke dieser Anker traegt — die EINE Stelle steht in `constants`. */
const blocks = computed(() => VOYAGE_TIP_BLOCKS[props.context])
/** Nicht jeder Unterschied ist ein Block: Beschriftungen haengen am ANKER. */
const isFleet = computed(() => props.context === 'fleet')

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

/**
 * Die Beschriftung ueber dem Namen. An der Marke der blosse Zustand; ueber der
 * Fleet-Karte zusaetzlich die GALAXIENUMMER — das Band mischt Galaxien und
 * nennt nur ihren Farbton. Der Themenname bleibt weg: er steckt schon im
 * Missionsnamen (`Adjektiv + Zielname + Aktion`).
 */
const headState = computed(() => {
  const v = view.value
  if (!v) return ''
  return isFleet.value ? `${v.stateLabel} · Galaxy ${v.galaxy}` : v.stateLabel
})

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
  // Der Grund einer Sperre steht in BEIDEN Ankern woertlich — er ist die
  // Auskunft, und die Karte kennt ihn nicht.
  if (a.kind === 'blocked') return { icon, label: a.reason, clock: '' }
  // Die Fleet-Karte fuehrt die Geste nicht aus, sie springt nur zur Marke.
  if (isFleet.value) {
    return { icon, label: VOYAGE_FLEET_TIP_STATUS[verdictKey.value], clock: '' }
  }
  if (a.kind === 'send') return { icon, label: VOYAGE_ACTION_SEND_LABEL, clock: '' }
  if (a.kind === 'collect') {
    return { icon, label: `${VOYAGE_ACTION_COLLECT_LABEL} +${formatNumber(a.reward)}`, clock: '' }
  }
  const clock = formatMinuteClock(remaining.value ?? 0)
  return { icon, label: VOYAGE_ACTION_WAITING_LABEL, clock }
})

/** Nur beim Vertrag: wie lange die Crew gebunden wäre. Unterwegs sagt es die Uhr.
 *  Ueber der Fleet-Karte gar nicht — dort steht sie neben dem Trupp-Stapel. */
const voyageLength = computed(() =>
  blocks.value.deadline && view.value?.state === 'offer'
    ? formatShortDuration(view.value.durationSeconds)
    : '',
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
  if (!v || !blocks.value.deadline) return null
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
const matArtPx = `${VOYAGE_FLEET_TIP_MAT_PX}px`

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

/**
 * Ueber der Fleet-Karte stehen die Gesichter schon auf der Karte — hier tragen
 * die Sitze deshalb NAMEN. Ein leerer Sitz nennt die Rolle, die fehlt: die
 * Karte zeigt dafuer nur einen leeren Ring.
 *
 * KEINE Rollenfarbe: `top` `#e05050` laege neben dem Gefahrenrot und `adc`
 * `#e89840` neben dem Tooltip-Gold. Die Rolle traegt ihr Glyph.
 */
const crewChips = computed(() =>
  (view.value?.crewSeats ?? []).slice(0, VOYAGE_TIP_CREW_MAX).map((seat, i) => ({
    key: `${i}:${seat.name ?? seat.role}`,
    name: seat.name,
    role: ROLE_BY_KEY[seat.role],
  })),
)

/**
 * Die Stuecke, die WIRKLICH bereitliegen — mit Namen und eigenem Artwork. Die
 * Fleet-Karte sagt ueber Material gar nichts, und ein Erwartungswert waere nach
 * dem Wurf eine Luege (dieselbe Regel wie in `loot` der Karte).
 */
const lootPieces = computed(() =>
  (payout.value?.materials ?? []).map((m) => {
    const def = MATERIALS.find((x) => x.id === m.id)
    const name = def?.name ?? m.id
    return {
      id: m.id,
      qty: m.qty,
      name,
      // Vier Materialien haben noch kein Artwork. Ein leeres `src` fordert die
      // SEITE nach — es braucht dieselbe Ersatzkachel wie der Header.
      image: def?.image ?? '',
      color: MATERIAL_COLOR[m.id] ?? '#e8c040',
      initials: MATERIAL_PLACEHOLDER_LABELS[m.id] ?? name.slice(0, 2).toUpperCase(),
    }
  }),
)

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
    :state="headState"
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
        <div v-if="bar && blocks.deadline" class="vtt-gauge" :style="{ '--tip-color': gaugeColor }">
          <div class="tip-bar">
            <i
              class="tip-bar-fill"
              :class="{ 'tip-bar-fill--tinted': bar.tinted }"
              :style="{ transform: `scaleX(${bar.fill})` }"
            />
          </div>
          <span v-if="bar.clock" class="vtt-gauge-clock">{{ bar.clock }}</span>
        </div>

        <!-- Lohn, Beute und Aussicht — an der MARKE. Ueber der Fleet-Karte
             stehen alle drei Zahlen schon auf der Karte selbst. -->
        <div v-if="blocks.figures" class="tip-read tip-read--lg">
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

        <!-- Das EINE, was die Fleet-Karte an ihrem Ertrag nicht zeigt. Der Meep
             gehoert NICHT dazu: er steht dort neben dem Lohn. -->
        <div v-if="blocks.loot" class="vtt-mats">
          <span class="tip-read-k">{{ payout ? 'Loot' : 'Expected loot' }}</span>
          <span v-if="payout" class="vtt-mats-v">
            <span v-for="m in lootPieces" :key="m.id" class="vtt-piece">
              <img
                v-if="m.image"
                class="vtt-piece-art"
                :src="m.image"
                alt=""
                aria-hidden="true"
              />
              <span v-else class="vtt-piece-ph" :style="{ color: m.color }">{{ m.initials }}</span>
              <b>{{ m.qty }}</b>
              <span class="tip-meta">{{ m.name }}</span>
            </span>
            <span v-if="!lootPieces.length" class="tip-meta">nothing salvaged</span>
          </span>
          <span v-else class="vtt-mats-v">
            <Icon icon="ph:cube-fill" width="16" height="16" class="vtt-mat" />
            <b>{{ expectedDrops.toFixed(1) }}</b>
            <span class="tip-meta">materials</span>
          </span>
        </div>

        <!-- WER faehrt. An der Marke die Gesichter, ueber der Fleet-Karte die
             NAMEN — dort stehen die Gesichter schon auf der Karte, und ein
             leerer Ring sagt nicht, welche Rolle fehlt. -->
        <div v-if="blocks.faces" class="vtt-crew">
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

        <div v-else class="vtt-mats">
          <span class="tip-read-k">Crew</span>
          <span class="vtt-chips">
            <span
              v-for="c in crewChips"
              :key="c.key"
              class="tip-chip"
              :class="{ 'tip-chip--muted': !c.name }"
            >
              <Icon :icon="c.role.icon" width="14" height="14" class="tip-chip-ico" />
              {{ c.name || c.role.short }}
            </span>
          </span>
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

        <!-- Die Geste sitzt an der MARKE. Ein Klick auf die Fleet-Karte springt
             nur dorthin — und genau das steht hier, statt „Click to send". -->
        <div v-if="blocks.hint" class="tip-hint vtt-cta">↗ {{ VOYAGE_FLEET_TIP_HINT }}</div>
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

/* ── Material und Crew der Fleet-Variante ───────────────────────────────────
   Die zwei Zeilen, die es nur ueber der Fleet-Karte gibt. WAAGERECHT, nicht als
   Zelle: eine Zeile traegt hier genau EINEN Gedanken, und die Beschriftung ist
   das Stichwort davor. Ihre Breite ist reserviert, sonst stehen Material und
   Crew nicht untereinander — „EXPECTED LOOT" ist die laengere der beiden. */
.vtt-mats {
  display: flex;
  align-items: baseline;
  gap: 0.62em;
}

.vtt-mats > .tip-read-k {
  flex: 0 0 auto;
  min-width: 6.6em;
}

.vtt-mats-v {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.34em;
  font-size: 1.05em;
  font-weight: 800;
  color: var(--tip-text);
}

/* Ein Stueck ist EIN Objekt: Bild, Zahl und Name binden sich enger aneinander
   als die Stuecke untereinander. */
.vtt-piece {
  display: flex;
  align-items: center;
  gap: 0.22em;
}

.vtt-piece + .vtt-piece {
  margin-left: 0.4em;
}

/* Das echte Material-Artwork — die `-128`-Stufe liegt in `Material.image`, und
   VOYAGE_FLEET_TIP_MAT_PX bleibt unter der 34-px-Schwelle. Nur hier, wo die
   Stuecke BENANNT sind; der Erwartungswert kennt seine Art noch nicht und
   bleibt beim Wuerfel-Glyph. */
.vtt-piece-art {
  flex-shrink: 0;
  width: v-bind(matArtPx);
  height: v-bind(matArtPx);
  object-fit: contain;
}

/* Dieselbe Ersatzkachel wie im Header — Initialen im Materialton, solange das
   Artwork fehlt. */
.vtt-piece-ph {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind(matArtPx);
  height: v-bind(matArtPx);
  border: 1px solid rgba(200, 144, 64, 0.28);
  border-radius: 4px;
  background: linear-gradient(to bottom, #241b12, #16110b);
  font-size: 0.62em;
  font-weight: 900;
  letter-spacing: 0.04em;
}

/* Die Chips brechen um — fuenf Namen passen in keine Zeile. */
.vtt-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3em;
}

/* Die Fusszeile sagt, was der Klick tut. Gold wie die uebrigen CTA-Zeilen des
   Spiels (`FirmamentGalaxyTip`), nicht in der Verdikt-Farbe: sie gehoert der
   Geste, nicht dem Zustand. */
.vtt-cta {
  color: #e8c040;
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

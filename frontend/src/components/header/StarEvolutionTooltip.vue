<script setup lang="ts">
/**
 * Hover-Dashboard der Sternentwicklung im Header.
 *
 * Das Abzeichen daneben zeigt einen Orb und eine Restzeit — und verschweigt
 * damit die HÄLFTE der Wahrheit: die Entwicklung hat ZWEI Tore. Die Zeit ist
 * das eine, die fünf Kernstrahlen sind das andere (`branchesReadyForEvolve`
 * verlangt jeden auf `starPhase + 1`). Wer nur auf den Ring schaut, wartet auf
 * ein READY, das schon dasteht, während in Wahrheit ein Strahl fehlt. Genau
 * das räumt dieses Panel auf: erst wo der Stern steht, dann was ihn hält.
 *
 * Aufbau: Kopf (wer bin ich) → Lebenslauf-Schiene (woher, wohin) → die beiden
 * Tore → die Strahlen im Einzelnen → verbrachte Zeit.
 *
 * Ohne eigenen Timer: der Verweilfortschritt hängt an `solarStore.dwellNow`,
 * das der Spieltakt jede Sekunde fortschreibt. Und da das Panel nur im
 * geöffneten Zustand existiert (v-if hinter dem Teleport in RpgBadgeTooltip),
 * kostet der Header im Ruhezustand nichts.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import { formatCompactDuration } from '@/utils/ui/format'
import { solarSignatureStages } from '@/utils/game/solarSignature'
import type { SunBody } from '@/types'
import SunOrb from '../ui/SunOrb.vue'
import {
  MS_PER_SECOND,
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SUN_PHASE_DISPLAY_TOTAL,
  SOLAR_BRANCHES,
  SOLAR_MAX_LEVELS,
  STAR_EVOLUTION_ICONS,
  SUN_ORB_SPRITE_PX,
} from '@/config/constants'

const solarStore = useSolarUpgradeStore()
const { currentDisplayPhase } = useSunPhaseDisplay()

/* ── Wer der Stern gerade ist ────────────────────────────────────────────── */

const isComet = computed(() => solarStore.isCometState)
const isFinal = computed(() => solarStore.isCollapsedStar)

const current = computed(() =>
  isComet.value ? COMET_PHASE_DATA : STAR_PHASE_DATA[solarStore.starPhase],
)

const accent = computed(() =>
  isComet.value ? COMET_PHASE_DATA.accent : STAR_PHASE_DATA[solarStore.starPhase].phasePrimary,
)

/** Der Körper einer Stufe — mit der HEUTIGEN Signatur: die Leiter zeigt, wie
 *  die Sonne dort aussähe. `index` zählt −1 = Komet, 0…5 = Sternphasen. */
function bodyAt(index: number): SunBody {
  const sig = solarSignatureStages(solarStore.solarSignature)
  if (index < 0) return { kind: 'comet', stage: solarStore.cometStage, sig }
  if (index >= STAR_PHASE_FINAL_INDEX) return { kind: 'blackHole', stage: STAR_PHASE_FINAL_INDEX, sig }
  return { kind: 'star', stage: index, sig }
}

function orbStyle(index: number): Record<string, string> {
  const glow = index < 0 ? COMET_PHASE_DATA.glow : STAR_PHASE_DATA[index].glow1
  return { '--orb-glow': glow }
}

/* ── Die Lebenslauf-Schiene ──────────────────────────────────────────────── */

const duration = (seconds: number) => formatCompactDuration(seconds * MS_PER_SECOND)

/** Sekunden, die in der laufenden Stufe schon vergangen sind. */
const elapsedHere = computed(() => Math.floor(solarStore.phaseDwellElapsedMs / MS_PER_SECOND))

/**
 * Sieben Stufen: der Komet und die sechs Sternphasen. Jede weiß, ob sie hinter
 * dem Spieler liegt, gerade läuft oder noch aussteht — und wie lange er in ihr
 * verbracht hat. Die verbrachte Zeit steht im `title`, nicht im Layout: sieben
 * Beschriftungen nebeneinander wären auf Full HD unlesbar.
 */
interface Stage {
  index: number
  displayNo: number
  name: string
  astroName: string
  state: 'done' | 'current' | 'future'
  spentSeconds: number
}

const stages = computed<Stage[]>(() => {
  const out: Stage[] = []
  const cometSpent = solarStore.cometSeconds + (isComet.value ? elapsedHere.value : 0)
  out.push({
    index: -1,
    displayNo: 1,
    name: COMET_PHASE_DATA.name,
    astroName: COMET_PHASE_DATA.astroName,
    state: isComet.value ? 'current' : 'done',
    spentSeconds: cometSpent,
  })
  for (let i = 0; i < STAR_PHASE_DATA.length; i++) {
    const reached = !isComet.value && solarStore.starPhase > i
    const here = !isComet.value && solarStore.starPhase === i
    out.push({
      index: i,
      displayNo: i + 2,
      name: STAR_PHASE_DATA[i].name,
      astroName: STAR_PHASE_DATA[i].astroName,
      state: here ? 'current' : reached ? 'done' : 'future',
      spentSeconds: (solarStore.phaseTimeHistory[i] ?? 0) + (here ? elapsedHere.value : 0),
    })
  }
  return out
})

function stageTitle(s: Stage): string {
  const spent = s.spentSeconds > 0 ? ` · ${duration(s.spentSeconds)} spent` : ''
  return `${s.name} — ${s.astroName}${spent}`
}

/* ── Die beiden Tore ─────────────────────────────────────────────────────── */

/** Stufe, die JEDER Kernstrahl für die nächste Entwicklung tragen muss. */
const requiredRayLevel = computed(() => solarStore.starPhase + 1)

const raysMet = computed(
  () =>
    SOLAR_BRANCHES.filter(
      (b) => solarStore.branchLevel(b.id as SolarBranchId) >= requiredRayLevel.value,
    ).length,
)

const dwellPercent = computed(() => {
  const required = solarStore.phaseDwellRequiredMs
  if (required <= 0) return 100
  return Math.min(100, (solarStore.phaseDwellElapsedMs / required) * 100)
})

const dwellMet = computed(() => solarStore.phaseDwellRemainingMs <= 0)
const raysAllMet = computed(() => raysMet.value >= SOLAR_BRANCHES.length)

const dwellRemainingText = computed(() =>
  formatCompactDuration(solarStore.phaseDwellRemainingMs),
)

/** Die nächste Stufe — `null`, sobald der Stern kollabiert ist. */
const nextStage = computed(() => {
  if (isFinal.value) return null
  if (isComet.value) return { index: 0, data: STAR_PHASE_DATA[0] }
  const i = solarStore.starPhase + 1
  return i < STAR_PHASE_DATA.length ? { index: i, data: STAR_PHASE_DATA[i] } : null
})

/** „1 ray" / „3 rays" — die Klammerform „ray(s)" liest sich wie ein Formular. */
const raysShortText = computed(() => {
  const missing = SOLAR_BRANCHES.length - raysMet.value
  return `${missing} ray${missing === 1 ? '' : 's'}`
})

/** Ein Satz, der sagt, woran es liegt — oder dass es losgehen kann. */
const verdict = computed<{ tone: 'ready' | 'blocked' | 'end'; icon: string; text: string }>(() => {
  if (!nextStage.value) {
    return {
      tone: 'end',
      icon: STAR_EVOLUTION_ICONS.ready,
      text: 'The last light has gone out — nothing follows the collapse',
    }
  }
  if (dwellMet.value && raysAllMet.value) {
    return {
      tone: 'ready',
      icon: STAR_EVOLUTION_ICONS.ready,
      text: isComet.value
        ? 'Ready to ignite — light the core under the Bard tab’s sun'
        : 'Ready to evolve — raise the core under the Bard tab’s sun',
    }
  }
  if (!dwellMet.value && !raysAllMet.value) {
    return {
      tone: 'blocked',
      icon: STAR_EVOLUTION_ICONS.blocked,
      text: `Both gates hold — ${dwellRemainingText.value} of dwell and ${raysShortText.value} short`,
    }
  }
  if (!dwellMet.value) {
    return {
      tone: 'blocked',
      icon: STAR_EVOLUTION_ICONS.blocked,
      text: `Rays are set — the star still needs ${dwellRemainingText.value} in this phase`,
    }
  }
  return {
    tone: 'blocked',
    icon: STAR_EVOLUTION_ICONS.blocked,
    text: `Time is served — ${raysShortText.value} below Lv ${requiredRayLevel.value}`,
  }
})

/* ── Die fünf Kernstrahlen ───────────────────────────────────────────────── */

const rayRows = computed(() =>
  SOLAR_BRANCHES.map((b) => {
    const level = solarStore.branchLevel(b.id as SolarBranchId)
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      level,
      stat: solarStore.statDisplay(b.id as SolarBranchId, level),
      met: level >= requiredRayLevel.value,
    }
  }),
)

/** Ein Pip je möglicher Stufe — gefüllt, gefordert, oder noch leer. */
const rayPips = SOLAR_MAX_LEVELS

/* ── Verbrachte Zeit ─────────────────────────────────────────────────────── */

const longestPhaseSeconds = computed(() => {
  const spans = stages.value.map((s) => s.spentSeconds)
  return spans.length > 0 ? Math.max(...spans) : 0
})

/**
 * Der Verweil-Multiplikator zeigt sich als Tempo, nicht als Faktor: `×0,8`
 * beantwortet die Frage „wie schnell?" erst nach einer Kopfrechnung.
 */
const dwellPaceText = computed(() => {
  const m = solarStore.dwellTimeMultiplier
  if (m === 1) return 'standard'
  const delta = Math.round(Math.abs(1 - m) * 100)
  return m < 1 ? `${delta}% faster` : `${delta}% slower`
})

const phasesBehind = computed(
  () => stages.value.filter((s) => s.state === 'done').length,
)

interface StatRow {
  key: string
  icon: string
  label: string
  value: string
}

const timeRows = computed<StatRow[]>(() => [
  {
    key: 'here',
    icon: STAR_EVOLUTION_ICONS.timeInPhase,
    label: 'Time in this phase',
    value: duration(elapsedHere.value),
  },
  {
    key: 'star',
    icon: STAR_EVOLUTION_ICONS.totalAsStar,
    label: 'Burning as a star',
    value: duration(solarStore.totalPhaseSeconds + (isComet.value ? 0 : elapsedHere.value)),
  },
  {
    key: 'comet',
    icon: STAR_EVOLUTION_ICONS.cometDrift,
    label: 'Drifted as a comet',
    value: duration(solarStore.cometSeconds + (isComet.value ? elapsedHere.value : 0)),
  },
  {
    key: 'longest',
    icon: STAR_EVOLUTION_ICONS.longestPhase,
    label: 'Longest phase',
    value: longestPhaseSeconds.value > 0 ? duration(longestPhaseSeconds.value) : '—',
  },
  {
    key: 'behind',
    icon: STAR_EVOLUTION_ICONS.phasesBehind,
    label: 'Phases behind you',
    value: `${phasesBehind.value} / ${SUN_PHASE_DISPLAY_TOTAL}`,
  },
  {
    key: 'pace',
    icon: STAR_EVOLUTION_ICONS.dwellPace,
    label: 'Dwell pace',
    value: dwellPaceText.value,
  },
])
</script>

<template>
  <div class="set" :style="{ '--ph-accent': accent, '--tip-color': accent }">

    <!-- ════════ Kopf: welcher Stern, und der wievielte Zustand ════════ -->
    <header class="tip-head tip-head--banded set-head">
      <div
        class="set-head-orb"
        :class="{ 'set-head-orb--collapse': isFinal }"
        :style="orbStyle(isComet ? -1 : solarStore.starPhase)"
        aria-hidden="true"
      >
        <SunOrb :body="bodyAt(isComet ? -1 : solarStore.starPhase)" />
      </div>
      <div class="set-head-text">
        <div class="set-name">{{ current.name }}</div>
        <div class="set-subname">{{ current.astroName }}</div>
      </div>
      <div class="set-head-phase">
        <span class="set-head-phase-v">{{ currentDisplayPhase }}</span>
        <span class="set-head-phase-k">of {{ SUN_PHASE_DISPLAY_TOTAL }}</span>
      </div>
    </header>

    <!-- ════════ Der Lebenslauf ════════ -->
    <!-- Sieben Kugeln auf einer Schiene, jede in IHREN eigenen Farben: die
         Reihe ist damit dieselbe Aussage wie der Orb im Header, nur über die
         ganze Zeit gelesen statt über den Augenblick. -->
    <section class="set-block">
      <div class="set-block-title set-block-title--solo">Lifecycle</div>
      <div class="set-rail">
        <div
          v-for="(s, i) in stages"
          :key="s.index"
          class="set-stage"
          :class="`set-stage--${s.state}`"
          :title="stageTitle(s)"
        >
          <span
            v-if="i > 0"
            class="set-rail-link"
            :class="{ 'set-rail-link--lit': stages[i - 1].state === 'done' }"
            aria-hidden="true"
          />
          <span
            class="set-stage-orb"
            :class="{ 'set-stage-orb--collapse': s.index >= STAR_PHASE_FINAL_INDEX }"
            :style="orbStyle(s.index)"
          >
            <SunOrb :body="bodyAt(s.index)" :px="SUN_ORB_SPRITE_PX / 2" />
          </span>
          <span class="set-stage-no">{{ s.displayNo }}</span>
        </div>
      </div>
      <div class="set-rail-legend">
        <span class="set-rail-legend-now">{{ current.name }}</span>
        <span v-if="nextStage" class="set-rail-legend-next">
          → {{ nextStage.data.name }} · {{ nextStage.data.astroName }}
        </span>
        <span v-else class="set-rail-legend-next">→ the end of the journey</span>
      </div>
    </section>

    <!-- ════════ Die zwei Tore ════════ -->
    <section class="set-block">
      <div class="set-block-head">
        <span class="set-block-title">{{ nextStage ? 'Next evolution' : 'Journey’s end' }}</span>
        <span v-if="nextStage" class="set-count">both gates must open</span>
      </div>

      <!-- Nach dem Kollaps gibt es kein Tor mehr, das sich öffnen ließe — dann
           steht hier nur noch das Urteil. Zwei erfüllte Balken für eine
           Entwicklung, die nicht mehr kommt, wären eine Falschaussage. -->
      <template v-if="nextStage">
        <div class="set-gate" :class="{ 'set-gate--met': dwellMet }">
          <Icon
            :icon="STAR_EVOLUTION_ICONS.gateTime"
            width="16"
            height="16"
            class="set-gate-icon"
            aria-hidden="true"
          />
          <span class="set-gate-k">Dwell time</span>
          <span class="set-gate-v">{{ dwellMet ? 'served' : dwellRemainingText }}</span>
          <div class="set-gate-bar" aria-hidden="true">
            <div class="set-gate-bar-fill" :style="{ width: `${dwellPercent}%` }"></div>
          </div>
        </div>

        <div class="set-gate" :class="{ 'set-gate--met': raysAllMet }">
          <Icon
            :icon="STAR_EVOLUTION_ICONS.gateRays"
            width="16"
            height="16"
            class="set-gate-icon"
            aria-hidden="true"
          />
          <span class="set-gate-k">Core rays at Lv {{ requiredRayLevel }}</span>
          <span class="set-gate-v">{{ raysMet }} / {{ SOLAR_BRANCHES.length }}</span>
          <div class="set-gate-bar" aria-hidden="true">
            <div
              class="set-gate-bar-fill"
              :style="{ width: `${(raysMet / SOLAR_BRANCHES.length) * 100}%` }"
            ></div>
          </div>
        </div>
      </template>

      <div class="set-verdict" :class="`set-verdict--${verdict.tone}`">
        <Icon
          :icon="verdict.icon"
          width="16"
          height="16"
          class="set-verdict-icon"
          aria-hidden="true"
        />
        <span>{{ verdict.text }}</span>
      </div>
    </section>

    <!-- ════════ Die Strahlen im Einzelnen ════════ -->
    <section class="set-block">
      <div class="set-block-title set-block-title--solo">Core rays</div>
      <div class="set-rays">
        <div
          v-for="r in rayRows"
          :key="r.id"
          class="set-ray"
          :class="{ 'set-ray--short': !r.met }"
        >
          <Icon
            :icon="r.icon"
            width="15"
            height="15"
            class="set-ray-icon"
            :style="{ color: r.color }"
            aria-hidden="true"
          />
          <span class="set-ray-k">{{ r.name }}</span>
          <span class="set-ray-pips" aria-hidden="true">
            <span
              v-for="p in rayPips"
              :key="p"
              class="set-pip"
              :class="{
                'set-pip--on': p <= r.level,
                'set-pip--need': p > r.level && p <= requiredRayLevel,
              }"
              :style="p <= r.level ? { background: r.color } : undefined"
            />
          </span>
          <span class="set-ray-v">{{ r.stat }}</span>
        </div>
      </div>
    </section>

    <!-- ════════ Verbrachte Zeit ════════ -->
    <section class="set-block">
      <div class="set-block-title set-block-title--solo">Time in the light</div>
      <div class="set-rows">
        <div v-for="row in timeRows" :key="row.key" class="set-row">
          <Icon :icon="row.icon" class="set-row-icon" width="15" height="15" aria-hidden="true" />
          <span class="set-row-k">{{ row.label }}</span>
          <span class="set-row-v">{{ row.value }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ================================================================
   Sternentwicklungs-Tooltip — Panel-Innenleben. Der Rahmen (Holz +
   Schatten) kommt von RpgBadgeTooltip; hier nur der Inhalt.

   Maßsystem wie in den Nachbar-Panels des Headers: alles hängt an
   der Wurzel-font-size, die mit dem Viewport skaliert.

   Farbträger ist --ph-accent: die Kopfzeile, die Schienen-Legende
   und der laufende Stufenring tragen die Farbe der AKTUELLEN Phase,
   statt einer festen. Das Panel wechselt damit über den Spielverlauf
   von Orange über Blau und Gold bis Violett mit — dieselbe Sprache,
   die der Orb im Header spricht.
   ================================================================ */
.set {
  border-radius: 2px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ── Kopf ──────────────────────────────────────────────────────── */
.set-head {
  padding: 0.7em 0.9em;
}

/* Der Orb ist statisch: das Abzeichen daneben atmet bereits, ein zweiter
   pulsierender Schein wäre nur zusätzliche Paint-Arbeit im Dauerbetrieb. */
.set-head-orb {
  position: relative;
  flex-shrink: 0;
  width: 2.1em;
  height: 2.1em;
  border-radius: 50%;
  box-shadow: 0 0 12px 2px var(--orb-glow);
}

/* Das Schwarze Loch ist keine Kugel — der Inset-Schatten würde eine Hälfte
   des Horizonts aufhellen und den Photonenring dort auffressen. */
.set-head-orb--collapse {
  box-shadow: 0 0 12px 2px var(--orb-glow);
}

.set-head-text {
  min-width: 0;
  flex: 1;
}

.set-name {
  font-size: 1.32em;
  font-weight: 700;
  color: var(--ph-accent);
  letter-spacing: 0.03em;
  line-height: 1.15;
}

.set-subname {
  font-size: 0.95em;
  color: #9b8461;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.set-head-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05em;
  flex-shrink: 0;
  padding: 0.25em 0.6em;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #33220e;
}

.set-head-phase-v {
  font-size: 1.2em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  line-height: 1;
}

.set-head-phase-k {
  font-size: 0.8em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8a7c66;
}

/* ── Blöcke ────────────────────────────────────────────────────── */
.set-block {
  padding: 0.7em 0.9em;
  border-bottom: 1px solid #26190c;
}

.set-block:last-child {
  border-bottom: none;
}

.set-block-head {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  margin-bottom: 0.5em;
}

.set-block-title {
  font-size: 0.86em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #8a7c66;
}

.set-block-title--solo {
  display: block;
  margin-bottom: 0.55em;
}

.set-count {
  margin-left: auto;
  font-size: 0.88em;
  color: #6f634f;
  font-style: italic;
}

/* ── Lebenslauf-Schiene ────────────────────────────────────────── */
.set-rail {
  display: flex;
  align-items: flex-start;
}

/* Jede Stufe trägt ihr Verbindungsstück SELBST (links von sich) — so bleibt
   die Kette bei sieben gleich breiten Feldern automatisch bündig, ohne dass
   Kugel und Strich getrennt positioniert werden müssten. */
.set-stage {
  position: relative;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
  min-width: 0;
}

.set-rail-link {
  position: absolute;
  top: 0.85em;
  right: 50%;
  left: -50%;
  height: 2px;
  background: #33220e;
}

.set-rail-link--lit {
  background: linear-gradient(to right, #5c3310, #c89040);
}

.set-stage-orb {
  position: relative;
  z-index: 1;
  width: 1.7em;
  height: 1.7em;
  border-radius: 50%;
}

.set-stage-no {
  font-size: 0.82em;
  font-variant-numeric: tabular-nums;
  color: #6f634f;
  line-height: 1;
}

/* Erledigt, laufend, ausstehend — allein über Opazität und einen Ring.
   Kein `filter: grayscale`: die Kugeln stünden dann alle gleich aus, und
   gerade ihre Farbfolge IST die Aussage der Schiene. */
.set-stage--future .set-stage-orb {
  opacity: 0.25;
}

.set-stage--future .set-stage-no {
  opacity: 0.45;
}

.set-stage--done .set-stage-orb {
  opacity: 0.65;
}

.set-stage--current .set-stage-orb {
  outline: 2px solid var(--ph-accent);
  outline-offset: 2px;
}

.set-stage--current .set-stage-no {
  color: var(--ph-accent);
  font-weight: 800;
}

.set-rail-legend {
  display: flex;
  align-items: baseline;
  gap: 0.5em;
  margin-top: 0.75em;
  font-size: 0.92em;
  min-width: 0;
}

.set-rail-legend-now {
  font-weight: 700;
  color: var(--ph-accent);
  white-space: nowrap;
}

.set-rail-legend-next {
  color: #8a7c66;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Die zwei Tore ─────────────────────────────────────────────── */
/* Ein Raster statt einer Flex-Zeile: Bezeichnung und Wert stehen in beiden
   Toren auf derselben Achse, und der Balken läuft darunter über die volle
   Breite — nebeneinander bliebe ihm zu wenig, um Fortschritt zu zeigen. */
.set-gate {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.2em 0.45em;
  padding: 0.4em 0.55em;
  margin-bottom: 0.4em;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #33220e;
}

.set-gate-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
}

.set-gate-k {
  font-size: 0.95em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.set-gate-v {
  font-size: 0.95em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}

.set-gate-bar {
  grid-column: 1 / -1;
  height: 0.3em;
  border-radius: 2px;
  background: #0d0904;
  overflow: hidden;
}

.set-gate-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to right, #b8791c, #e0a828);
}

.set-gate--met {
  border-color: #2e7a1a;
}

.set-gate--met .set-gate-icon,
.set-gate--met .set-gate-v {
  color: #a8e878;
}

.set-gate--met .set-gate-bar-fill {
  background: linear-gradient(to right, #2e7a1a, #6ec040);
}

/* ── Urteil ────────────────────────────────────────────────────── */
.set-verdict {
  display: flex;
  align-items: center;
  gap: 0.45em;
  margin-top: 0.55em;
  padding: 0.4em 0.55em;
  border-radius: 4px;
  font-size: 0.95em;
  background: #1a1008;
  border: 1px solid #33220e;
}

.set-verdict-icon {
  width: 1.3em;
  height: 1.3em;
  flex-shrink: 0;
}

.set-verdict--ready {
  color: #a8e878;
  background: #14200e;
  border-color: #2e7a1a;
}

.set-verdict--blocked {
  color: #d8b06a;
}

.set-verdict--blocked .set-verdict-icon {
  color: #cc6050;
}

.set-verdict--end {
  color: var(--ph-accent);
  background: #221208;
  border-color: #7a3a1a;
}

/* ── Kernstrahlen ──────────────────────────────────────────────── */
.set-rays {
  display: flex;
  flex-direction: column;
  gap: 0.12em;
}

.set-ray {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.5em;
  padding: 0.18em 0;
  min-width: 0;
}

.set-ray-icon {
  width: 1.3em;
  height: 1.3em;
  flex-shrink: 0;
}

.set-ray-k {
  font-size: 0.95em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ein Strahl, dem für die nächste Entwicklung eine Stufe fehlt, wird nicht
   rot markiert — die fehlenden Pips sagen es schon. Nur die Bezeichnung
   dimmt, damit die erfüllten Strahlen im Vergleich vortreten. */
.set-ray--short .set-ray-k {
  color: #6f634f;
}

.set-ray-pips {
  display: flex;
  gap: 0.18em;
  flex-shrink: 0;
}

.set-pip {
  width: 0.42em;
  height: 0.42em;
  border-radius: 1px;
  transform: rotate(45deg);
  background: #0d0904;
  border: 1px solid #33220e;
}

.set-pip--on {
  border-color: rgba(0, 0, 0, 0.5);
}

/* Die Stufe, die das nächste Tor verlangt, steht als leerer Goldrahmen da —
   der Abstand zwischen gefüllt und gefordert IST die fehlende Arbeit. */
.set-pip--need {
  border-color: rgba(232, 192, 64, 0.85);
}

.set-ray-v {
  font-size: 0.92em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
  min-width: 4.2em;
  text-align: right;
}

/* ── Zweispaltige Zeilenblöcke ─────────────────────────────────── */
.set-rows {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 1.1em;
  row-gap: 0.1em;
}

.set-row {
  display: grid;
  grid-template-columns: 1.3em minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45em;
  padding: 0.18em 0;
  min-width: 0;
}

/* Überschreibt die Attributgröße, damit das Glyph der Panel-Schriftgröße
   folgt — feste 15px wären auf 2K/4K neben dem größeren Text ein Fleck. */
.set-row-icon {
  width: 1.3em;
  height: 1.3em;
  color: #a08a5e;
  flex-shrink: 0;
}

.set-row-k {
  font-size: 0.98em;
  color: #93866f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.set-row-v {
  font-size: 0.98em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e8c040;
  white-space: nowrap;
}
</style>

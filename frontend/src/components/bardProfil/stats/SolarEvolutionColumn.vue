<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatCompactDuration, splitDuration } from '@/utils/ui/format'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useUiStore } from '@/stores/core/uiStore'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  STAR_PHASE_MIN_DWELL_SECONDS,
  COMET_PHASE_DATA,
  COMET_DISC_FILL,
  COMET_MIN_DWELL_SECONDS,
  COMET_STAGE_RADII,
  STATS_TAB_ORBIT,
  SUN_PHASE_DISPLAY_TOTAL,
  MS_PER_SECOND,
} from '@/config/constants'
import { useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import StatsColumnHeader from './StatsColumnHeader.vue'
import ChronicleSection from './ChronicleSection.vue'

/**
 * Middle column of the Bard-Stats deck — the stage.
 * The player's live celestial body sits at the centre of an open arc carrying
 * the seven phases it evolves through. Everything the sun has to say lives ON
 * the dial: identity and the evolve gate fill the arc's open bottom, and the
 * evolve call-to-action rides the sun itself. Below that, the Chronicle — the
 * augment collection moved to the right column, under the galaxy archive.
 */
const solarStore = useSolarUpgradeStore()
const uiStore = useUiStore()

/* ── Star phase (sun dial) ───────────────────────────────────── */
const totalPhases = STAR_PHASE_DATA.length
/* Orbit steps include the Comet origin as step 0 (7 total) */
const totalSteps = SUN_PHASE_DISPLAY_TOTAL
const displayIndex = computed(() => (solarStore.isCometState ? 0 : solarStore.starPhase + 1))
const phase = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
const isMax = computed(() => !solarStore.isCometState && solarStore.starPhase >= totalPhases - 1)

/** Phase palette for everything the dial tints: arc, labels, status pill. */
const phaseVars = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
    }
  }
  return {
    '--phase-primary': phase.value.phasePrimary,
    '--phase-glow': phase.value.phaseGlow,
    '--pulse-speed': phase.value.pulseSpeed,
  }
})

const { phaseLabel: phaseDisplayLabel } = useSunPhaseDisplay()

/** Name + astronomical name of the body currently rendered in the dial's centre. */
const phaseName = computed(() => (solarStore.isCometState ? COMET_PHASE_DATA.name : phase.value.name))
const phaseAstroName = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA.astroName : phase.value.astroName,
)

/* ── Orbit dial geometry ──────────────────────────────────────────
   The seven phases sit on an open arc around the live sun. Everything is
   expressed in the SVG's 100×100 units — which are also % of the square
   stage — so the same numbers place the SVG arc AND the HTML dots. */
const O = STATS_TAB_ORBIT
const ORBIT_CIRCUMFERENCE = 2 * Math.PI * O.RADIUS
const ORBIT_ARC_LEN = (ORBIT_CIRCUMFERENCE * O.SPAN_DEG) / 360
/** one step of the arc — the distance between two neighbouring phases */
const ORBIT_SEG_LEN = ORBIT_ARC_LEN / (totalSteps - 1)
/** an SVG circle starts at 3 o'clock; rotate it so the path starts at START_DEG */
const ORBIT_ROTATION = O.START_DEG - 90

/** Angle of step i, measured from 12 o'clock, clockwise. */
function stepAngle(i: number): number {
  return O.START_DEG + (i * O.SPAN_DEG) / (totalSteps - 1)
}


/* ── Marker meta ──────────────────────────────────────────────────
   Every step on the arc carries its own record: how long the sun actually
   spent there, how long it has to before it may leave, and how big it is
   compared with the first star. Live seconds only ever apply to the step the
   sun is standing on — everything else is history or still unwritten. */
const DASH = '—'
/** The first star's radius is the yardstick every other body is measured in. */
const BASE_RADIUS = STAR_PHASE_DATA[0].radius

/** Seconds the sun has been on the current step, ticking. */
const liveSeconds = computed(() =>
  Math.floor((now.value - (solarStore.phaseEnteredAt || now.value)) / 1000),
)

function spentLabel(banked: number, isCurrent: boolean): string {
  const secs = banked + (isCurrent ? liveSeconds.value : 0)
  return secs > 0 ? formatCompactDuration(secs * 1000) : DASH
}

/** Minimum dwell of a step, with every dwell-shortening upgrade applied. */
function dwellLabel(secs: number | undefined): string {
  if (secs === undefined) return DASH
  return formatCompactDuration(secs * 1000 * solarStore.dwellTimeMultiplier)
}

const orbitDots = computed(() => {
  const cometDone = !solarStore.isCometState
  const steps = [
    /* Step 0 — the Comet origin: a tiny rock, before any sun ever burned */
    {
      label: COMET_PHASE_DATA.name,
      astro: COMET_PHASE_DATA.astroName,
      comet: true,
      collapse: false,
      color: COMET_PHASE_DATA.accent,
      glow: COMET_PHASE_DATA.glow,
      core: COMET_PHASE_DATA.core,
      mid: COMET_PHASE_DATA.mid,
      edge: COMET_PHASE_DATA.edge,
      size: O.COMET_DOT_PCT,
      done: cometDone,
      current: solarStore.isCometState,
      spent: spentLabel(solarStore.cometSeconds, solarStore.isCometState),
      dwell: dwellLabel(COMET_MIN_DWELL_SECONDS),
      scale: (COMET_STAGE_RADII[solarStore.cometStage] ?? COMET_STAGE_RADII[0]) / BASE_RADIUS,
    },
    ...STAR_PHASE_DATA.map((p, i) => ({
      label: p.name,
      astro: p.astroName,
      comet: false,
      /* Letzter Schritt: kein Stern mehr, sondern das Schwarze Loch */
      collapse: i === STAR_PHASE_FINAL_INDEX,
      color: p.phasePrimary,
      glow: p.phaseGlow,
      core: p.core,
      mid: p.mid,
      edge: p.edge,
      /* diameter true to the in-game sun proportions */
      size: p.radius * O.DOT_PCT_PER_RADIUS,
      done: cometDone && i < solarStore.starPhase,
      current: cometDone && i === solarStore.starPhase,
      spent: spentLabel(
        solarStore.phaseTimeHistory[i] ?? 0,
        cometDone && i === solarStore.starPhase,
      ),
      dwell: dwellLabel(STAR_PHASE_MIN_DWELL_SECONDS[i]),
      scale: p.radius / BASE_RADIUS,
    })),
  ]
  return steps.map((s, i) => {
    const rad = (stepAngle(i) * Math.PI) / 180
    const x = 50 + O.RADIUS * Math.sin(rad)
    const y = O.CENTER_Y - O.RADIUS * Math.cos(rad)
    /* The tag sits on the same radial as its marker — outward where the stage
       has room beyond the ring, inward for the two markers on the flanks,
       where it would otherwise hang off the edge. The offset starts at the
       DISC's edge, so the collapse marker pushes its tag further than the
       comet speck does instead of swallowing it. */
    const flank = Math.abs(Math.sin(rad)) > O.TAG_FLANK_SIN
    const tagR = flank
      ? O.RADIUS - s.size / 2 - O.TAG_IN_PCT
      : O.RADIUS + s.size / 2 + O.TAG_OUT_PCT
    return {
      ...s,
      x,
      y,
      tagX: 50 + tagR * Math.sin(rad),
      tagY: O.CENTER_Y - tagR * Math.cos(rad),
      step: `Phase ${i + 1} / ${totalSteps}`,
      state: s.current ? 'Current' : s.done ? 'Passed' : 'Locked',
      /* The card always grows toward the middle of the stage — downward for
         markers on the upper half, and anchored by the near edge out on the
         flanks. That is what keeps a card this wide fully on screen at every
         point of the ring. */
      below: y < O.CENTER_Y,
      side: x < O.TIP_EDGE_PCT ? 'start' : x > 100 - O.TIP_EDGE_PCT ? 'end' : 'mid',
    }
  })
})

/** Arc already travelled — comet through the current phase. */
const orbitFillLen = computed(() => ORBIT_SEG_LEN * displayIndex.value)

/* ── Live sun disc ────────────────────────────────────────────────
   PhaseSunDisc / CometDisc take a pixel diameter, so the stage measures
   itself and the disc is sized as a share of that square. */
const stageEl = ref<HTMLElement | null>(null)
const stagePx = ref(0)
let stageObserver: ResizeObserver | null = null

const sunPct = computed(() => {
  if (solarStore.isCometState) return O.COMET_SUN_PCT
  const first = STAR_PHASE_DATA[0].radius
  const last = STAR_PHASE_DATA[STAR_PHASE_FINAL_INDEX].radius
  const t = (phase.value.radius - first) / (last - first)
  return O.SUN_PCT_MIN + t * (O.SUN_PCT_MAX - O.SUN_PCT_MIN)
})

const sunDiameter = computed(() => Math.round((stagePx.value * sunPct.value) / 100))

/** Baseline of the identity block: the body's VISIBLE top edge, minus the clear
 *  air. The block grows upward from here (translateY(-100%)), so it hugs
 *  whatever the player currently is — a speck of a comet or the widest sun.
 *  The comet's rock only fills part of its box, so measuring against the box
 *  alone would strand the caption above it while a sun sits tight. */
const identTopPct = computed(() => {
  const visiblePct = sunPct.value * (solarStore.isCometState ? COMET_DISC_FILL : 1)
  return O.CENTER_Y - visiblePct / 2 - O.IDENT_GAP_PCT
})

/* ── Time in phase ticker ────────────────────────────────────── */
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval>

onMounted(() => {
  if (!solarStore.phaseEnteredAt) solarStore.phaseEnteredAt = Date.now()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  if (stageEl.value) {
    stagePx.value = stageEl.value.clientWidth
    stageObserver = new ResizeObserver((entries) => {
      stagePx.value = entries[0].contentRect.width
    })
    stageObserver.observe(stageEl.value)
  }
})

onUnmounted(() => {
  clearInterval(ticker)
  stageObserver?.disconnect()
})

/* ── Phase dwell time (evolve time gate) ─────────────────────── */
const dwellRequiredMs = computed(() => solarStore.phaseDwellRequiredMs)
const dwellElapsedMs = computed(() =>
  Math.max(0, now.value - (solarStore.phaseEnteredAt ?? now.value)),
)
const dwellRemainingMs = computed(() => Math.max(0, dwellRequiredMs.value - dwellElapsedMs.value))
const dwellMet = computed(() => dwellRemainingMs.value <= 0)
const dwellPct = computed(() =>
  dwellRequiredMs.value <= 0
    ? 100
    : Math.min(100, (dwellElapsedMs.value / dwellRequiredMs.value) * 100),
)

/* Active arc segment (current phase → next) creeping forward with dwell progress */
const orbitActiveLen = computed(() => (ORBIT_SEG_LEN * dwellPct.value) / 100)

/** How long the sun has already been what it is — the reading that turns the
 *  dial into a log book instead of a countdown. */
const phaseAge = computed(() => {
  if (!solarStore.phaseEnteredAt) return null
  const {
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
  } = splitDuration((now.value - solarStore.phaseEnteredAt) / MS_PER_SECOND)
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
})

/* ── The evolve gate, worn by the sun ────────────────────────────
   Everything about evolving now sits on the body it happens to: the chip rides
   the disc's lower edge and reads as a countdown, then as the call to act.
   Whether the solar branches are high enough is the Solar Shop's business —
   the dial only ever counts TIME. */
const canEvolveNow = computed(() => solarStore.canUpgradeStar)

interface EvolveGate {
  value: string
  icon: string
  tone: 'wait' | 'met' | 'max'
  title: string
}

const gate = computed<EvolveGate>(() => {
  if (isMax.value)
    return {
      value: 'Fully Evolved',
      icon: 'game-icons:laurel-crown',
      tone: 'max',
      title: 'This sun has reached the final phase of its life',
    }
  if (dwellMet.value)
    return {
      value: 'Evolve',
      icon: 'game-icons:upgrade',
      tone: 'met',
      title: canEvolveNow.value
        ? 'Every requirement is met — click to open the Solar Shop and evolve'
        : 'The time in this phase is served — open the Solar Shop to see what else this evolve needs',
    }
  return {
    value: formatCompactDuration(dwellRemainingMs.value),
    icon: 'game-icons:sands-of-time',
    tone: 'wait',
    title: `${formatCompactDuration(dwellElapsedMs.value)} of ${formatCompactDuration(dwellRequiredMs.value)} in this phase — time the sun must spend before it can evolve`,
  }
})

/* Der Astral Codex unter dem Dial bringt seinen eigenen Kopf samt Suche mit —
   die stand vorher hier oben und filterte von dort seine Wappen. */
</script>

<template>
  <section class="sf-panel sf-col sf-col--solar" :style="phaseVars">
    <!-- Ohne Suchfeld: die Spalte ist EIN Schaubild, an dem es nichts zu
         filtern gibt. Das Feld, das hier stand, gehörte dem Codex darunter und
         steht jetzt in dessen eigenem Kopf. -->
    <StatsColumnHeader title="Solar Evolution" />

    <div class="sf-p-body sf-solar-body">
      <!-- ─ Orbit dial: the live sun ringed by its seven phases ─ -->
      <div
        class="sf-orbit-wrap"
        :style="{
          '--orbit-max': STATS_TAB_ORBIT.MAX_PX + 'px',
          '--orbit-max-compact': STATS_TAB_ORBIT.MAX_PX_COMPACT + 'px',
          '--tip-w': STATS_TAB_ORBIT.TIP_WIDTH_PCT + 'cqmin',
          '--tag-w': STATS_TAB_ORBIT.TAG_WIDTH_PCT + 'cqmin',
        }"
      >
        <div ref="stageEl" class="sf-orbit">
          <svg
            class="sf-orbit-svg"
            :viewBox="`0 0 ${STATS_TAB_ORBIT.VIEW} ${STATS_TAB_ORBIT.VIEW}`"
            aria-hidden="true"
          >
            <!-- Unlit rest of the journey -->
            <circle
              class="sf-orbit-track"
              :cx="STATS_TAB_ORBIT.VIEW / 2"
              :cy="STATS_TAB_ORBIT.CENTER_Y"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${ORBIT_ARC_LEN} ${ORBIT_CIRCUMFERENCE}`"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.CENTER_Y})`"
            />
            <!-- Arc already travelled -->
            <circle
              class="sf-orbit-fill"
              :cx="STATS_TAB_ORBIT.VIEW / 2"
              :cy="STATS_TAB_ORBIT.CENTER_Y"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${orbitFillLen} ${ORBIT_CIRCUMFERENCE}`"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.CENTER_Y})`"
            />
            <!-- Segment current → next phase, creeping with dwell progress -->
            <circle
              v-if="!isMax"
              class="sf-orbit-active"
              :class="{ 'is-met': dwellMet }"
              :cx="STATS_TAB_ORBIT.VIEW / 2"
              :cy="STATS_TAB_ORBIT.CENTER_Y"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${orbitActiveLen} ${ORBIT_CIRCUMFERENCE}`"
              :stroke-dashoffset="-orbitFillLen"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.CENTER_Y})`"
            />
          </svg>

          <!-- Who the sun is — riding the body itself, right above its upper
               edge, the mirror of the evolve chip on its lower one. It moves
               with the disc from phase to phase, so the comet is named at the
               comet instead of up at the ring. -->
          <div class="sf-orbit-ident" :style="{ top: identTopPct + '%' }">
            <span class="sf-ident-step">{{ phaseDisplayLabel }}</span>
            <span class="sf-ident-name" :title="phaseAstroName">{{ phaseName }}</span>
          </div>

          <!-- The player's actual celestial body, same renderer as the orbit view.
               It is also the evolve control: the chip on its lower edge counts the
               phase down and turns into the call to act, so everything about
               evolving happens on the body it happens to. -->
          <div
            class="sf-orbit-sun"
            :class="{ 'is-ready': canEvolveNow }"
            role="button"
            :title="
              canEvolveNow
                ? 'Ready to evolve — open the Solar Shop'
                : 'Open the Solar Shop'
            "
            :style="{ width: sunPct + '%', height: sunPct + '%', top: STATS_TAB_ORBIT.CENTER_Y + '%' }"
            @click="uiStore.setBardTab('shop')"
          >
            <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
            <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />

            <template v-if="canEvolveNow">
              <span class="sf-sun-ring" aria-hidden="true"></span>
              <span class="sf-sun-ring sf-sun-ring--late" aria-hidden="true"></span>
            </template>

            <button
              class="sf-sun-cta"
              type="button"
              :class="[`is-${gate.tone}`, { 'is-live': canEvolveNow }]"
              :title="gate.title"
              @click.stop="uiStore.setBardTab('shop')"
            >
              <Icon :icon="gate.icon" width="15" height="15" />
              {{ gate.value }}
            </button>
          </div>

          <!-- How long this phase has already lasted — the dial's log book, parked
               on the floor of the arc's open bottom so it sits right above the
               augment deck's rule. -->
          <div class="sf-orbit-age" :title="`Time spent in the ${phaseName} phase`">
            <span class="sf-age-lbl">In Phase</span>
            <span class="sf-age-val">{{ phaseAge ?? '—' }}</span>
          </div>

          <!-- Standing tags: every step names itself and says how long the sun
               stayed there, without waiting to be hovered. They sit on their
               marker's radial (outward, or inward on the flanks) and never take
               the pointer, so the markers keep their own hitboxes. -->
          <div
            v-for="(dot, i) in orbitDots"
            :key="`tag-${i}`"
            class="sf-orbit-tag"
            :class="{ 'is-done': dot.done, 'is-current': dot.current }"
            :style="{
              left: dot.tagX + '%',
              top: dot.tagY + '%',
              '--dot-color': dot.color,
              '--dot-glow': dot.glow,
            }"
          >
            <span class="sf-tag-name">{{ dot.label }}</span>
            <span class="sf-tag-time">{{ dot.spent }}</span>
          </div>

          <!-- Phase markers riding the arc -->
          <div
            v-for="(dot, i) in orbitDots"
            :key="i"
            class="sf-orbit-node"
            :class="[{ 'is-below': dot.below }, `is-side-${dot.side}`]"
            :style="{
              left: dot.x + '%',
              top: dot.y + '%',
              width: dot.size + '%',
              height: dot.size + '%',
            }"
          >
            <div
              class="sf-orbit-dot"
              :class="{
                'is-done': dot.done,
                'is-current': dot.current,
                'sf-orbit-dot--comet': dot.comet,
                'sf-orbit-dot--collapse': dot.collapse,
              }"
              :style="{
                '--dot-color': dot.color,
                '--dot-glow': dot.glow,
                '--dot-core': dot.core,
                '--dot-mid': dot.mid,
                '--dot-edge': dot.edge,
              }"
            />
            <span class="sf-orbit-tip" :style="{ '--dot-color': dot.color }">
              <span class="sf-tip-head">
                <span class="sf-tip-step">{{ dot.step }}</span>
                <span class="sf-tip-state" :class="`is-${dot.state.toLowerCase()}`">
                  {{ dot.state }}
                </span>
              </span>
              <span class="sf-orbit-tip-name">{{ dot.label }}</span>
              <span class="sf-orbit-tip-astro">{{ dot.astro }}</span>
              <span class="sf-tip-meta">
                <span class="sf-tip-cell">
                  <span class="sf-tip-key">Time here</span>
                  <span class="sf-tip-num">{{ dot.spent }}</span>
                </span>
                <span class="sf-tip-cell">
                  <span class="sf-tip-key">Min. dwell</span>
                  <span class="sf-tip-num">{{ dot.dwell }}</span>
                </span>
                <span class="sf-tip-cell">
                  <span class="sf-tip-key">Size</span>
                  <span class="sf-tip-num">×{{ dot.scale.toFixed(1) }}</span>
                </span>
              </span>
            </span>
          </div>
        </div>

        <!-- TEMP: admin dwell-skip — floated into the stage corner so it never
             affects the layout (remove later incl. adminSkipDwellTime in solarUpgradeStore) -->
        <button
          v-if="!isMax && !dwellMet"
          class="sf-dev-skip"
          type="button"
          title="Admin: skip the remaining dwell time of this phase"
          @click.stop="solarStore.adminSkipDwellTime()"
        >
          DEV · Skip
        </button>
        <!-- /TEMP -->
      </div>

      <!-- ─ Astral Codex: die Meilenstein-Bahnen unter dem Dial ─ -->
      <ChronicleSection />
    </div>
  </section>
</template>

<style scoped>
/* ═══ Solar Evolution — the deck's middle column and its stage ═══
   The player's live sun sits at the centre of a dial; the seven phases it
   travels through ride an open arc around it. The ring is SVG in a square
   viewBox and the phase markers are positioned in % of that same square, so
   the whole dial scales with whatever the column gives it — one layout for
   Full HD through 4K, no per-resolution geometry. */
.sf-panel {
  position: relative;
  z-index: 1;
  background: transparent;
}

.sf-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
}

.sf-solar-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* The augment deck scrolls on its own — the column itself never does, hence
     `clip` rather than `hidden` (no scroll container at all). The margin is the
     headroom the phase markers' hover labels need: the outermost markers sit
     close to the stage's edges, and a label clipped in half is worse than one
     overhanging a column border by a few pixels. */
  overflow: clip;
  overflow-clip-margin: 40px;
  /* The middle column absorbs every pixel the two fixed side columns do not
     use, so on 4K it is over 2000px wide. Capping the CONTENT keeps the dial,
     its readouts and the augment cards reading as one centred block instead of
     three things drifting apart across the width. */
  width: 100%;
  max-width: 1180px;
  margin-inline: auto;
}

/* The dial claims every row the identity block and augment deck leave over */
.sf-orbit-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* lets the square below measure itself against the column's REMAINING
     height (100cqh) instead of the viewport — no vh math, no breakpoints */
  container-type: size;
}

.sf-orbit {
  position: relative;
  /* fallback first for engines without container query units */
  width: min(100%, var(--orbit-max));
  width: min(100%, 100cqh, var(--orbit-max));
  aspect-ratio: 1;
}

.sf-orbit-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* the arc's glow and the round caps may bleed past the box */
  overflow: visible;
}

/* The road not yet travelled — light enough to read as "there is more to come"
   against the deep-space backdrop, dim enough not to compete with the fill */
.sf-orbit-track {
  fill: none;
  stroke: #3d2712;
  stroke-linecap: round;
}

/* The stretch already travelled — comet through the current phase */
.sf-orbit-fill {
  fill: none;
  stroke: var(--phase-primary);
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px var(--phase-glow));
  transition: stroke-dasharray 0.6s ease;
}

/* Dwell progress creeping from the current phase toward the next one */
.sf-orbit-active {
  fill: none;
  stroke: #ffffff;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px var(--phase-glow));
  animation: sf-seg-pulse 2.4s ease-in-out infinite;
  transition: stroke-dasharray 0.6s ease;
}
.sf-orbit-active.is-met {
  stroke: #9ae070;
  filter: drop-shadow(0 0 3px rgba(82, 184, 48, 0.75));
  animation: none;
}
@keyframes sf-seg-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Click target around the disc — PhaseSunDisc / CometDisc centre themselves
   absolutely inside it, so this box IS the sun's footprint on the stage.
   `top` comes from the template (the dial's CENTER_Y). */
.sf-orbit-sun {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  cursor: pointer;
  transition: filter 0.18s;
}
.sf-orbit-sun:hover {
  filter: brightness(1.12);
}

/* ─ Evolve, announced by the sun itself ─
   Two rings expand out of the core, half a cycle apart. Both animate transform
   + opacity ONLY, so the announcement stays compositor work — and it exists at
   most once on screen, for the seconds between "ready" and the player's click. */
.sf-sun-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #6ec040;
  pointer-events: none;
  animation: sf-sun-ring 2.8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
}
.sf-sun-ring--late {
  animation-delay: 1.4s;
}
@keyframes sf-sun-ring {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  /* by the time it reaches the caption riding the disc's upper edge it has
     faded out — the last stretch of the ring is already invisible */
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

/* Chip straddling the sun's lower edge — the evolve gate, on the body it acts
   on. It counts the phase down, then becomes the call to act. Sized off the
   dial so it never becomes a speck on 4K. */
.sf-sun-cta {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translate(-50%, -50%);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 13px;
  padding: clamp(4px, 1.1cqmin, 10px) clamp(9px, 2.6cqmin, 22px);
  font-size: 12px;
  font-size: clamp(12.5px, 2.9cqmin, 26px);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  border-radius: 4px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: transform 0.14s;
}
/* Waiting: a dark plate, readable against any phase colour behind it */
.sf-sun-cta.is-wait {
  color: #e8e4d8;
  background: #16130c;
  border: 1px solid #5c3310;
}
.sf-sun-cta.is-met {
  color: #f0ffe0;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
}
.sf-sun-cta.is-max {
  color: #f0e0a0;
  background: #1e1a06;
  border: 1px solid #e8c040;
}
.sf-sun-cta:hover {
  transform: translate(-50%, -50%) scale(1.06);
}
/* the icon rides the chip's font size instead of its own fixed box */
.sf-sun-cta :deep(svg) {
  width: 1.25em;
  height: 1.25em;
  flex-shrink: 0;
}

/* ─ Identity, worn by the body ─
   Which step of seven, and who the sun is on it. `top` comes from the template
   and is the body's upper edge less a gap, so the block hangs off the disc
   rather than off the ring — it grows UPWARD from that line (translateY -100%)
   and therefore never pushes into the body no matter how tall the caption gets.
   Everything sizes itself off the DIAL (cqmin of the stage container), not off
   the viewport: the dial is ~390px on Full HD but over 600px on 2K, so a fixed
   px size that reads right on one is a speck on the other. */
.sf-orbit-ident {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  /* Narrow on purpose: the tags of the two markers at 10 and 2 o'clock reach in
     to 27% and 73% of the stage, and at the largest sun the block rises to
     their height. Its text is centred and never wider than "Collapse", so it
     stays clear. */
  width: 46%;
  text-align: center;
  /* the ring's markers reach into this band's corners and carry generous hover
     hitboxes — only the name itself takes the pointer, for its tooltip */
  pointer-events: none;
}

.sf-ident-step {
  font-size: 11px;
  font-size: clamp(11px, 2.1cqmin, 20px);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #b0a080;
  white-space: nowrap;
}

.sf-ident-name {
  pointer-events: auto;
  font-size: 26px;
  font-size: clamp(25px, 7cqmin, 62px);
  line-height: 1.05;
  letter-spacing: 0.04em;
  color: var(--phase-primary);
  text-shadow: 0 0 10px var(--phase-glow);
  white-space: nowrap;
  cursor: help;
}

/* ─ Time in phase, on the floor of the arc ─
   The dial's log book: no gate, no countdown, just how long this sun has been
   what it is. Anchored to the stage's bottom edge so it sits directly above
   the augment deck's rule instead of floating in the ring. */
.sf-orbit-age {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  width: 96%;
  text-align: center;
  cursor: help;
}

.sf-age-lbl {
  font-size: 10px;
  font-size: clamp(10px, 1.9cqmin, 18px);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6a5a3a;
  white-space: nowrap;
}

.sf-age-val {
  font-size: 20px;
  font-size: clamp(19px, 5.4cqmin, 48px);
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1.1;
  color: #e8e4d8;
  text-shadow: 0 0 8px rgba(232, 228, 216, 0.35);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ─ Phase markers riding the arc ─
   Each marker is placed in % of the square stage, so it stays glued to its
   point on the ring at every stage size. Sizes follow the in-game sun radii:
   the comet is a speck, the collapse disc the widest body on the ring. */
.sf-orbit-node {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
}
/* Generous invisible hitbox — the comet speck is only a few px across, far
   too small to hover reliably for its label */
.sf-orbit-node::after {
  content: '';
  position: absolute;
  inset: -11px;
  border-radius: 50%;
}

.sf-orbit-dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #1c1c18;
  border: 1px solid #3e200a;
  transition:
    box-shadow 0.2s ease,
    background 0.2s ease;
}
/* Reached phases render as miniature suns in their real palette */
.sf-orbit-dot.is-done,
.sf-orbit-dot.is-current {
  border: none;
  background: radial-gradient(
    circle at 38% 35%,
    var(--dot-core),
    var(--dot-mid) 55%,
    var(--dot-edge)
  );
}
.sf-orbit-dot.is-done {
  box-shadow: 0 0 8px color-mix(in srgb, var(--dot-glow) 55%, transparent);
}
.sf-orbit-dot.is-current {
  box-shadow:
    0 0 12px var(--dot-glow),
    0 0 22px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  animation: sf-dot-pulse var(--pulse-speed) ease-in-out infinite;
}
/* Comet origin — a rocky speck with a faint gold rim; it marks the very START
   of the evolution arc, so nothing extends behind it. */
.sf-orbit-dot--comet.is-done,
.sf-orbit-dot--comet.is-current {
  /* rocky body: grey core with a faint gold rim instead of a sun corona */
  background: radial-gradient(
    circle at 38% 35%,
    var(--dot-core),
    var(--dot-mid) 55%,
    var(--dot-edge)
  );
  box-shadow: 0 0 6px color-mix(in srgb, var(--dot-glow) 45%, transparent);
}
.sf-orbit-dot--comet.is-done {
  opacity: 0.75;
}

/* Collapse marker — das Ende des Bogens ist kein Stern. Auf wenigen Pixeln
   trägt nur die Dreilagen-Silhouette: Photonenring, schwarzer Horizont
   darunter, ganz unten die fast von der Kante gesehene Scheibe.
   Reihenfolge = Malreihenfolge. */
.sf-orbit-dot--collapse.is-done,
.sf-orbit-dot--collapse.is-current {
  background:
    radial-gradient(
      circle at 50% 50%,
      transparent 0 42%,
      var(--dot-core) 44% 49%,
      transparent 53%
    ),
    radial-gradient(circle at 50% 50%, #000 0 43%, transparent 45%),
    radial-gradient(
      ellipse 100% 22% at 50% 50%,
      var(--dot-core) 0%,
      var(--dot-mid) 32%,
      var(--dot-edge) 64%,
      transparent 84%
    );
}

@keyframes sf-dot-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px var(--dot-glow),
      0 0 14px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  }
  50% {
    box-shadow:
      0 0 16px var(--dot-glow),
      0 0 28px color-mix(in srgb, var(--dot-glow) 60%, transparent);
  }
}

/* ─ Standing tag beside every marker ─
   The ring's own legend: which step this is and how long the sun stayed there,
   readable without touching anything. Fixed width so a long name never drags
   the tag off its radial, and no pointer events so the marker underneath keeps
   its hover card. Three weights carry the state — lit for the step the sun is
   on, plain for the ones behind it, dim for what is still ahead. */
.sf-orbit-tag {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  width: 74px;
  width: var(--tag-w);
  text-align: center;
  pointer-events: none;
}

.sf-tag-name {
  font-size: 11px;
  font-size: clamp(11px, 2.2cqmin, 21px);
  line-height: 1.15;
  letter-spacing: 0.04em;
  color: #6a5a3a;
  white-space: nowrap;
}
.sf-orbit-tag.is-done .sf-tag-name {
  color: color-mix(in srgb, var(--dot-color) 78%, #6a5a3a);
}
.sf-orbit-tag.is-current .sf-tag-name {
  color: var(--dot-color);
  text-shadow: 0 0 8px var(--dot-glow);
}

.sf-tag-time {
  font-size: 9px;
  font-size: clamp(9px, 1.7cqmin, 16px);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.2;
  color: #4e422c;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-orbit-tag.is-done .sf-tag-time,
.sf-orbit-tag.is-current .sf-tag-time {
  color: #8a7a58;
}

/* ─ Marker card on hover ─
   Seven records on one ring cannot all be visible at once — they would collide
   and fall off the stage at the flanks — so the arc shows only the one under
   the cursor, and shows it properly: step, state, both names and the three
   numbers that describe the phase.
   Placement is geometric, not guessed: the card always grows toward the middle
   of the stage (see `below` / `side` in orbitDots), which is what keeps a card
   this wide fully on screen at every point of the ring. */
.sf-orbit-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 11px);
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1px;
  width: 250px;
  width: var(--tip-w);
  padding: clamp(7px, 1.8cqmin, 18px) clamp(9px, 2.4cqmin, 24px)
    clamp(8px, 2cqmin, 20px);
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  /* the phase's own colour bleeds in from the top edge, so the card belongs to
     the marker it describes instead of looking like a generic tooltip */
  border-top: 3px solid var(--dot-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  text-align: left;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}
.sf-orbit-node.is-below .sf-orbit-tip {
  bottom: auto;
  top: calc(100% + 11px);
}
/* Out on the flanks the card hangs off its near edge and grows inward */
.sf-orbit-node.is-side-start .sf-orbit-tip {
  left: 0;
  transform: none;
}
.sf-orbit-node.is-side-end .sf-orbit-tip {
  left: auto;
  right: 0;
  transform: none;
}
.sf-orbit-node:hover .sf-orbit-tip {
  opacity: 1;
}

.sf-tip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sf-tip-step {
  font-size: 9px;
  font-size: clamp(9px, 1.7cqmin, 16px);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8a7a58;
}

/* State plaque — the three colours the whole game uses for done / live / shut */
.sf-tip-state {
  padding: 2px 7px;
  font-size: 9px;
  font-size: clamp(9px, 1.6cqmin, 15px);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 3px;
}
.sf-tip-state.is-passed {
  color: #7ac060;
  background: #16200f;
  border: 1px solid #3a5a28;
}
.sf-tip-state.is-current {
  color: #1a1408;
  background: var(--dot-color);
}
.sf-tip-state.is-locked {
  color: #6a5a3a;
  background: #14120c;
  border: 1px solid #2c1806;
}

.sf-orbit-tip-name {
  font-size: 17px;
  font-size: clamp(17px, 4cqmin, 38px);
  font-weight: 400;
  letter-spacing: 0.05em;
  line-height: 1.1;
  color: var(--dot-color);
}

.sf-orbit-tip-astro {
  font-size: 10px;
  font-size: clamp(10px, 1.8cqmin, 17px);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8a7a58;
}

/* Three readouts in a row under a hairline — the phase in numbers.
   Equal columns, not space-between: on a 2K card the latter pushed the three
   apart until they read as three unrelated things. */
.sf-tip-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: start;
  gap: clamp(8px, 2.2cqmin, 22px);
  margin-top: clamp(6px, 1.5cqmin, 15px);
  padding-top: clamp(5px, 1.3cqmin, 13px);
  border-top: 1px solid #2c1806;
}

.sf-tip-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.sf-tip-key {
  font-size: 8.5px;
  font-size: clamp(8.5px, 1.5cqmin, 14px);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a5a3a;
}

.sf-tip-num {
  font-size: 13px;
  font-size: clamp(13px, 2.8cqmin, 27px);
  font-weight: 900;
  line-height: 1.1;
  color: #e8e4d8;
  font-variant-numeric: tabular-nums;
}

/* TEMP: admin dwell-skip chip — floated into the dial's top-right corner so
   it is out of the flow and never influences the stage / status-button layout */
.sf-dev-skip {
  position: absolute;
  top: 5px;
  right: 8px;
  z-index: 4;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cc6050;
  background: #16100c;
  border: 1px dashed #cc6050;
  border-radius: 4px;
  opacity: 0.5;
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.sf-dev-skip:hover {
  opacity: 1;
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}

/* Full HD / WUXGA: the flattest viewports — a smaller dial, so the Chronicle
   below still gets its rows. */
@media (max-height: 1100px) {
  .sf-orbit {
    width: min(100%, var(--orbit-max-compact));
    width: min(100%, 100cqh, var(--orbit-max-compact));
  }
  .sf-solar-body {
    gap: 8px;
  }
  /* the caption is NOT stepped down here — it scales off the dial itself */
}

@media (prefers-reduced-motion: reduce) {
  .sf-orbit-active,
  .sf-orbit-dot.is-current,
  .sf-sun-ring {
    animation: none;
  }
  /* without the pulse the ring must still be visible, or "ready" says nothing */
  .sf-sun-ring--late {
    display: none;
  }
}
</style>

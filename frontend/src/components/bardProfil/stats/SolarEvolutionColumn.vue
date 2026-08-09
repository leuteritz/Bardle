<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/ui/format'
import {
  useSolarUpgradeStore,
  type SolarBranchId,
} from '@/stores/progression/solarUpgradeStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  STAR_PHASE_MIN_DWELL_SECONDS,
  COMET_PHASE_DATA,
  COMET_DISC_FILL,
  COMET_MIN_DWELL_SECONDS,
  COMET_STAGE_RADII,
  SOLAR_BRANCHES,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  STATS_TAB_ORBIT,
  SUN_PHASE_DISPLAY_TOTAL,
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
const { showToast } = useActionToast()

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

/** Share of its box the body actually paints. A sun glows out to the edge, the
 *  comet's rock is inset — so everything that places itself against the body's
 *  edge measures against THIS, not the box, or it hovers in the void at the
 *  comet while sitting tight at every sun. */
const bodyFill = computed(() => (solarStore.isCometState ? COMET_DISC_FILL : 1))
const bodyVisiblePct = computed(() => sunPct.value * bodyFill.value)

/** Baseline of the identity block: the body's visible top edge, minus the clear
 *  air. The block grows upward from here (translateY(-100%)), so it hugs
 *  whatever the player currently is — a speck of a comet or the widest sun. */
const identTopPct = computed(() => O.CENTER_Y - bodyVisiblePct.value / 2 - O.BODY_GAP_PCT)

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

/* Kein „In Phase"-Block mehr auf der Bogenmitte: dieselbe Zahl steht bereits
   am Marker der laufenden Phase (`sf-tag-time`), und die Konsole darunter
   trägt die Zeit, die für das Evolve zählt. Drei Anzeigen für eine Uhr. */

/* ══ The evolve console ══════════════════════════════════════════
   The whole mechanic lives HERE now, under the dial it acts on — the dial
   shows the state, the console performs the act. It used to be a chip on the
   sun's edge that only counted TIME and then sent the player to the Solar
   Shop to actually evolve; both gates and the button itself now stand
   together, so nobody has to leave the tab to find out what is missing.

   Both gates read the same store getters the header's hover panel does
   (`StarEvolutionTooltip`) — one truth, two windows onto it. */
const canEvolveNow = computed(() => solarStore.canUpgradeStar)

/** Level EVERY core ray must carry before the next evolution opens. */
const requiredRayLevel = computed(() =>
  solarStore.isCometState ? 1 : solarStore.starPhase + 1,
)

/** The five rays, each with its own colour — the gate is a row of five pips,
 *  not a bare fraction, so a glance says WHICH ray is short. */
const rayPips = computed(() =>
  SOLAR_BRANCHES.map((b) => {
    const level = solarStore.branchLevel(b.id as SolarBranchId)
    return {
      id: b.id,
      name: b.name,
      icon: b.icon,
      color: b.color,
      level,
      met: level >= requiredRayLevel.value,
    }
  }),
)
const raysMet = computed(() => rayPips.value.filter((r) => r.met).length)
const raysAllMet = computed(() => raysMet.value >= SOLAR_BRANCHES.length)
const raysShortText = computed(() => {
  const missing = SOLAR_BRANCHES.length - raysMet.value
  return `${missing} ray${missing === 1 ? '' : 's'}`
})

/** Where this evolution leads — Spark while still a comet. */
const nextStage = computed(() =>
  solarStore.isCometState
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, totalPhases - 1)],
)

/** What the next phase actually opens up — the reason to bother. */
const nextPhaseGain = computed(() => {
  const next = solarStore.starPhase + 1
  if (next === FORGE_BRANCH_UNLOCK_PHASE) return 'Opens 10 Star Forge branches'
  if (next === FORGE_LEAF_UNLOCK_PHASE) return 'Opens 10 Star Forge leaves'
  return '+1 max level on every Star Forge branch'
})

/** What holds the evolution — or, once nothing does, what it pays out.
 *
 *  Deliberately a fragment, not a sentence: the two gates right above already
 *  SHOW their state, so repeating "both gates stand open" spends a line saying
 *  what the reader just read. What is left is the part the gates cannot say —
 *  the number that is missing, or the reward that is waiting. */
const verdict = computed<{
  tone: 'ready' | 'blocked' | 'end'
  text: string
  /** rays are (part of) the blocker — only then is a pointer at the tree useful */
  raysShort: boolean
}>(() => {
  if (isMax.value)
    return { tone: 'end', text: 'Nothing follows the collapse', raysShort: false }
  if (solarStore.isUpgrading)
    return { tone: 'ready', text: `${nextStage.value.name} is taking shape…`, raysShort: false }
  if (dwellMet.value && raysAllMet.value)
    return { tone: 'ready', text: nextPhaseGain.value, raysShort: false }
  if (!dwellMet.value && !raysAllMet.value)
    return {
      tone: 'blocked',
      text: `${formatCompactDuration(dwellRemainingMs.value)} of dwell · ${raysShortText.value} below Lv ${requiredRayLevel.value}`,
      raysShort: true,
    }
  if (!dwellMet.value)
    return {
      tone: 'blocked',
      text: `${formatCompactDuration(dwellRemainingMs.value)} of dwell left`,
      raysShort: false,
    }
  return {
    tone: 'blocked',
    text: `${raysShortText.value} below Lv ${requiredRayLevel.value}`,
    raysShort: true,
  }
})

const evolveLabel = computed(() => {
  if (solarStore.isUpgrading) return solarStore.isCometState ? 'Igniting…' : 'Evolving…'
  if (solarStore.isCometState) return '✦ Ignite the Core'
  return `✦ Evolve → ${nextStage.value.name}`
})

/** The act itself — this is the ONLY place the sun evolves. */
function handleEvolve(): void {
  if (!solarStore.canUpgradeStar) return
  const wasComet = solarStore.isCometState
  const targetName = nextStage.value.name
  solarStore.upgradeStar()
  showToast(
    wasComet ? `The comet ignites into ${targetName}…` : `Star evolving to ${targetName}…`,
    'event',
  )
}

/** Rays are BOUGHT on the Star Forge tree — a pointer there is a navigation
 *  aid, not a second way to evolve. It only appears while rays are the thing
 *  in the way. */
function openSolarTree(): void {
  uiStore.setBardTab('shop')
}

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
               It is a DISPLAY, not a control: the act of evolving happens in the
               console below, where both its gates stand. All the body does is
               announce readiness — two rings breaking out of the core. -->
          <div
            class="sf-orbit-sun"
            :class="{ 'is-ready': canEvolveNow }"
            :title="`${phaseName} — ${phaseAstroName}`"
            :style="{ width: sunPct + '%', height: sunPct + '%', top: STATS_TAB_ORBIT.CENTER_Y + '%' }"
          >
            <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
            <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />

            <template v-if="canEvolveNow">
              <span class="sf-sun-ring" aria-hidden="true"></span>
              <span class="sf-sun-ring sf-sun-ring--late" aria-hidden="true"></span>
            </template>
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

      <!-- ─ Evolve console: both gates, and the act they open ─
           The dial above says what the sun IS; this says what it takes to
           become the next thing, and does it. It is the ONLY evolve control in
           the game — the Star Forge only grows the rays that feed gate one. -->
      <footer class="se-console" :class="[`is-${verdict.tone}`, { 'is-live': canEvolveNow }]">
        <div v-if="!isMax" class="se-gates">
          <!-- Gate one: the five core rays, each a pip in its own colour, so a
               glance says WHICH one is short instead of just how many. The
               required level lives in the pip's title and in the verdict — the
               gate itself only has to answer "open or not". -->
          <div class="se-gate" :class="{ 'is-met': raysAllMet }" :title="`Every core ray must reach Lv ${requiredRayLevel}`">
            <span class="se-gate-k">Rays</span>
            <span class="se-gate-v">
              {{ raysMet }}<span class="se-gate-cap">/{{ SOLAR_BRANCHES.length }}</span>
            </span>
            <span class="se-pips">
              <span
                v-for="ray in rayPips"
                :key="ray.id"
                class="se-pip"
                :class="{ 'is-on': ray.met }"
                :style="ray.met ? { background: ray.color, borderColor: ray.color } : undefined"
                :title="`${ray.name} — Lv ${ray.level}${ray.met ? '' : ` · needs Lv ${requiredRayLevel}`}`"
              />
            </span>
          </div>

          <!-- Gate two: the time this phase is owed. Compact, not a clock —
               "00:02:58" spends two thirds of its width on a zero hour. -->
          <div class="se-gate" :class="{ 'is-met': dwellMet }" title="Time the sun must spend in this phase">
            <span class="se-gate-k">Dwell</span>
            <span class="se-gate-v">
              {{ dwellMet ? 'Served' : formatCompactDuration(dwellRemainingMs) }}
            </span>
            <span class="se-bar">
              <span class="se-bar-fill" :style="{ transform: `scaleX(${dwellPct / 100})` }" />
            </span>
          </div>
        </div>

        <!-- one hairline parts state from action; without it the big gate
             values and the button read as one undifferentiated block -->
        <span v-if="!isMax" class="se-rule" aria-hidden="true"></span>

        <div class="se-act">
          <button
            v-if="!isMax"
            class="se-evolve"
            type="button"
            :disabled="!canEvolveNow"
            :title="verdict.text"
            @click="handleEvolve"
          >
            {{ evolveLabel }}
          </button>
          <span v-else class="se-crown">
            <Icon icon="game-icons:laurel-crown" width="18" height="18" aria-hidden="true" />
            Fully Evolved
          </span>
        </div>

        <p class="se-verdict">
          <span class="se-verdict-txt">{{ verdict.text }}</span>
          <button
            v-if="verdict.raysShort"
            class="se-goto"
            type="button"
            title="Core rays are grown on the Star Forge tree"
            @click="openSolarTree"
          >
            Star Forge ›
          </button>
        </p>
      </footer>

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

/* The disc's footprint on the stage — PhaseSunDisc / CometDisc centre
   themselves absolutely inside it. `top` comes from the template (the dial's
   CENTER_Y). Not a control any more: the evolve button lives in the console
   below, so the body neither takes the pointer nor lights up under it. */
.sf-orbit-sun {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  cursor: help;
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

/* ═══ Evolve console ═══════════════════════════════════════════════
   The instrument under the dial: two gates on the left, the act on the right,
   the reason underneath. Its own inline-size container, so every size here
   scales with the console's WIDTH — the middle column runs from ~600px on
   Full HD to over 2000px on 4K, and a fixed px scale would read right on
   exactly one of them. Clamped at both ends so neither extreme runs away. */
/* Two rows, not one: the middle column measures 415px on Full HD (the two side
   columns of the deck are fixed), and a single row of gates-plus-button left
   each gate ~106px — enough to ellipsis "Core R…" and "D…", which is no gate
   at all. The gates therefore claim the full width, and the act shares the row
   below with its reason. Same layout at every size: on 2K the row simply
   breathes instead of rearranging. */
.se-console {
  flex: 0 0 auto;
  container-type: inline-size;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'gates gates'
    'rule rule'
    'act verdict';
  align-items: center;
  column-gap: clamp(9px, 1.3cqw, 20px);
  row-gap: clamp(6px, 0.8cqw, 13px);
  width: 100%;
  max-width: 780px;
  margin-inline: auto;
  padding: clamp(8px, 1.1cqw, 17px) clamp(10px, 1.4cqw, 22px);
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
}
/* Ready reads as a state of the whole instrument, not just of its button */
.se-console.is-live {
  border-color: #6ec040;
  background: #141c0c;
}
.se-console.is-end {
  border-color: #4a2a7a;
  background: #170f22;
}

/* ── the two gates ───────────────────────────────────────────────── */
/* No boxes inside the box: the gates used to be bordered tiles sitting on a
   bordered console — three nested frames for two numbers. They are zones now,
   parted by a single hairline, and the state is carried by the colour of the
   value and its track alone. */
.se-gates {
  grid-area: gates;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

/* Label and value on one line, the pips / the track full width underneath —
   side by side neither would have the room to say anything. */
.se-gate {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  gap: clamp(4px, 0.55cqw, 9px) clamp(6px, 0.8cqw, 13px);
  padding: 0 clamp(8px, 1.1cqw, 18px);
  min-width: 0;
  cursor: help;
}
.se-gate:first-child {
  padding-left: 0;
}
.se-gate + .se-gate {
  border-left: 1px solid #2c1806;
}
.se-gate:last-child {
  padding-right: 0;
}

.se-gate-k {
  font-size: clamp(9px, 1.05cqw, 16px);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7a6c56;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The one thing in the console that has to read across the room */
.se-gate-v {
  font-size: clamp(16px, 2cqw, 32px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.se-gate.is-met .se-gate-v {
  color: #a8e878;
}

.se-gate-cap {
  font-size: 0.58em;
  font-weight: 700;
  color: #7a6c56;
}

/* ── gate one: five pips, one per core ray ───────────────────────── */
.se-pips {
  grid-column: 1 / -1;
  display: flex;
  gap: clamp(4px, 0.6cqw, 9px);
}

/* A grown ray burns in its OWN colour, a short one stays an empty socket —
   which ray is missing is the one thing a bare "3/5" cannot say. */
.se-pip {
  flex: 1 1 0;
  height: clamp(5px, 0.6cqw, 9px);
  background: #0d0904;
  border: 1px solid #2c1806;
  border-radius: 2px;
  cursor: help;
}

/* ── gate two: the dwell track ───────────────────────────────────── */
.se-bar {
  grid-column: 1 / -1;
  height: clamp(5px, 0.6cqw, 9px);
  background: #0d0904;
  border: 1px solid #2c1806;
  border-radius: 2px;
  overflow: hidden;
}

/* scaleX, not width — this creeps forward every second the panel is open */
.se-bar-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #b8791c, #e0a828);
}
.se-gate.is-met .se-bar-fill {
  background: linear-gradient(to right, #2e7a1a, #6ec040);
}

.se-rule {
  grid-area: rule;
  height: 1px;
  background: #2c1806;
}

/* ── the act ─────────────────────────────────────────────────────── */
.se-act {
  grid-area: act;
  display: flex;
  align-items: center;
}

.se-evolve {
  position: relative;
  padding: clamp(9px, 1.25cqw, 20px) clamp(14px, 2cqw, 32px);
  font-size: clamp(12px, 1.4cqw, 22px);
  font-weight: 900;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: #08130a;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  cursor: pointer;
}
.se-evolve:hover:not(:disabled) {
  filter: brightness(1.12);
}

/* Blocked is not hidden — the button stays, so the player always sees WHAT is
   being unlocked; the verdict line beside it says why it will not press. */
.se-evolve:disabled {
  color: #7d7364;
  background: #16130c;
  border-color: #3e200a;
  cursor: not-allowed;
}

/* The call to act breathes on its OWN layer: the glow stands still in CSS and
   only its opacity animates. Pulsing the button's box-shadow directly would
   re-raster the box every frame (see „Performance" Regel 2/11). */
.se-evolve:not(:disabled)::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 5px;
  box-shadow: 0 0 16px 2px rgba(140, 240, 110, 0.8);
  pointer-events: none;
  animation: se-evolve-breathe 2s ease-in-out infinite;
}
@keyframes se-evolve-breathe {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.9;
  }
}

.se-crown {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.7cqw, 11px);
  padding: clamp(8px, 1.1cqw, 18px) clamp(13px, 1.8cqw, 29px);
  font-size: clamp(12px, 1.35cqw, 21px);
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
  color: #e8c040;
  background: #1e1a06;
  border: 1px solid #e8c040;
  border-radius: 4px;
}
.se-crown :deep(svg) {
  width: 1.3em;
  height: 1.3em;
  flex-shrink: 0;
}

/* ── the reason ──────────────────────────────────────────────────── */
/* Beside the button, not under it — and it WRAPS rather than truncating: the
   longest verdict names both gates and their numbers, and an ellipsis would
   eat exactly the part the player came for. */
.se-verdict {
  grid-area: verdict;
  align-self: center;
  display: flex;
  align-items: center;
  /* generous: with the longest verdict the pointer beside it would otherwise
     butt straight against the last word */
  gap: clamp(12px, 1.5cqw, 24px);
  font-size: clamp(10px, 1.15cqw, 18px);
  line-height: 1.25;
  color: #d8b06a;
  min-width: 0;
}

.se-verdict-txt {
  min-width: 0;
}

.se-console.is-ready .se-verdict {
  color: #a8e878;
}
.se-console.is-end .se-verdict {
  color: #b89ad8;
}

/* Rays are BOUGHT on the tree — this points at it while they are the blocker.
   A plain worded link, not a chip: a bordered button beside the evolve button
   would read as a second way to evolve, which is exactly what it is not. */
.se-goto {
  flex-shrink: 0;
  margin-left: auto;
  padding: 0;
  font-size: clamp(9px, 1.05cqw, 16px);
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: #9a7538;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}
.se-goto:hover {
  color: #e8c060;
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

  /* Every row the console takes here comes straight off the dial, which is
     already at its tightest on these viewports — so it gives up padding and
     the gates lose a hair of height. The type keeps scaling off the width. */
  .se-console {
    padding: 6px 9px;
    column-gap: 9px;
    row-gap: 5px;
  }
  .se-gate {
    padding: 4px 7px;
  }
  .se-evolve {
    padding: 8px 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-orbit-active,
  .sf-orbit-dot.is-current,
  .sf-sun-ring,
  .se-evolve:not(:disabled)::after {
    animation: none;
  }
  /* without the breathing glow the ready button must still stand out */
  .se-evolve:not(:disabled)::after {
    opacity: 0.6;
  }
  /* without the pulse the ring must still be visible, or "ready" says nothing */
  .sf-sun-ring--late {
    display: none;
  }
}
</style>

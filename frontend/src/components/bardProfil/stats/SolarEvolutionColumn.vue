<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/ui/format'
import {
  useSolarUpgradeStore,
  type SolarBranchId,
} from '@/stores/progression/solarUpgradeStore'
import { useActionToast } from '@/composables/ui/useActionToast'
import {
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
  SOLAR_BRANCHES,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  SOLAR_EVOLUTION_PANEL,
} from '@/config/constants'
import { useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import StatsColumnHeader from './StatsColumnHeader.vue'
import ChronicleSection from './ChronicleSection.vue'

/**
 * Middle column of the Bard-Stats deck — the sun's control desk.
 *
 * It used to be an orbit dial: the live sun ringed by all seven phases, each
 * marker carrying a name tag and a hover card, with the evolve console squeezed
 * underneath. On Full HD the column is 391px wide, so everything on that ring
 * had to be 9–11px to fit — the display was complete and unreadable at once.
 *
 * Now it is a stack, and every row owns the full width:
 *
 *   body        the live sun, nothing else on the band
 *   identity    who it is, and which of the seven steps that is
 *   rail        the journey as seven dots — names on hover
 *   dwell       the time gate, as one large number and one track
 *   rays        the five core rays, one tile each, level on the tile
 *   act         the evolve button, carrying its own reason as a subline
 *
 * The three things the player acts on — time, rays, button — are the three
 * largest things on the panel. The journey lost its labels, not its place: the
 * full lifecycle with names, dwell times and sizes lives in the hover panel on
 * the header's sun badge (`StarEvolutionTooltip`), which has the room for it.
 */
const solarStore = useSolarUpgradeStore()
const { showToast } = useActionToast()

const totalPhases = STAR_PHASE_DATA.length
const isComet = computed(() => solarStore.isCometState)
const phase = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
const isMax = computed(() => !isComet.value && solarStore.starPhase >= totalPhases - 1)

/** Phase palette — the identity, the live rail dot and the dwell track tint. */
const phaseVars = computed(() => {
  if (isComet.value)
    return {
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
    }
  return {
    '--phase-primary': phase.value.phasePrimary,
    '--phase-glow': phase.value.phaseGlow,
    '--pulse-speed': phase.value.pulseSpeed,
  }
})

const { phaseLabel: phaseDisplayLabel } = useSunPhaseDisplay()
const phaseName = computed(() => (isComet.value ? COMET_PHASE_DATA.name : phase.value.name))
const phaseAstroName = computed(() =>
  isComet.value ? COMET_PHASE_DATA.astroName : phase.value.astroName,
)

/* ── Live clock ───────────────────────────────────────────────────
   One ticker for the whole panel: the dwell readout, its track and the time
   banked on the rail's current step all read from it. */
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval>

/** Seconds banked on the step the sun is standing on. */
const liveSeconds = computed(() =>
  Math.floor((now.value - (solarStore.phaseEnteredAt || now.value)) / 1000),
)

/* ── The sun ──────────────────────────────────────────────────────
   PhaseSunDisc / CometDisc take a pixel diameter, so the band measures itself
   and the disc is a share of its SHORT side — on Full HD that is the height,
   on 4K the width, and the same number covers both. */
const stageEl = ref<HTMLElement | null>(null)
const stageW = ref(0)
const stageH = ref(0)
let stageObserver: ResizeObserver | null = null

const P = SOLAR_EVOLUTION_PANEL

const sunPct = computed(() => {
  if (isComet.value) return P.COMET_SUN_PCT
  const first = STAR_PHASE_DATA[0].radius
  const last = STAR_PHASE_DATA[STAR_PHASE_FINAL_INDEX].radius
  const t = (phase.value.radius - first) / (last - first)
  return P.SUN_PCT_MIN + t * (P.SUN_PCT_MAX - P.SUN_PCT_MIN)
})

const sunDiameter = computed(() => {
  const short = Math.min(stageW.value, stageH.value)
  return Math.round(Math.min(P.SUN_MAX_PX, (short * sunPct.value) / 100))
})

onMounted(() => {
  if (!solarStore.phaseEnteredAt) solarStore.phaseEnteredAt = Date.now()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  if (stageEl.value) {
    stageW.value = stageEl.value.clientWidth
    stageH.value = stageEl.value.clientHeight
    stageObserver = new ResizeObserver((entries) => {
      stageW.value = entries[0].contentRect.width
      stageH.value = entries[0].contentRect.height
    })
    stageObserver.observe(stageEl.value)
  }
})

onUnmounted(() => {
  clearInterval(ticker)
  stageObserver?.disconnect()
})

/* ── The journey rail ─────────────────────────────────────────────
   Seven dots on a line, each in its own phase colour: passed, current, still
   ahead. Names and banked time live in the title — seven labels side by side
   on a 391px column is exactly the crowding this redesign removed. */
const railSteps = computed(() => {
  const cometDone = !isComet.value
  const steps = [
    {
      key: 'comet',
      name: COMET_PHASE_DATA.name,
      astro: COMET_PHASE_DATA.astroName,
      color: COMET_PHASE_DATA.accent,
      glow: COMET_PHASE_DATA.glow,
      done: cometDone,
      current: isComet.value,
      spent: solarStore.cometSeconds + (isComet.value ? liveSeconds.value : 0),
    },
    ...STAR_PHASE_DATA.map((p, i) => ({
      key: p.name,
      name: p.name,
      astro: p.astroName,
      color: p.phasePrimary,
      glow: p.phaseGlow,
      done: cometDone && i < solarStore.starPhase,
      current: cometDone && i === solarStore.starPhase,
      spent:
        (solarStore.phaseTimeHistory[i] ?? 0) +
        (cometDone && i === solarStore.starPhase ? liveSeconds.value : 0),
    })),
  ]
  return steps.map((s) => ({
    ...s,
    title: `${s.name} — ${s.astro}${s.spent > 0 ? ` · ${formatCompactDuration(s.spent * 1000)} spent` : ''}`,
  }))
})

/* ── Gate one: the dwell time ─────────────────────────────────────
   Absolute timestamps in the store, so a throttled tab cannot desync them. */
const dwellRequiredMs = computed(() => solarStore.phaseDwellRequiredMs)
const dwellElapsedMs = computed(() =>
  Math.max(0, now.value - (solarStore.phaseEnteredAt ?? now.value)),
)
const dwellRemainingMs = computed(() => Math.max(0, dwellRequiredMs.value - dwellElapsedMs.value))
const dwellMet = computed(() => dwellRemainingMs.value <= 0)
const dwellPct = computed(() =>
  dwellRequiredMs.value <= 0
    ? 1
    : Math.min(1, dwellElapsedMs.value / dwellRequiredMs.value),
)

/* ── Gate two: the five core rays ─────────────────────────────────
   A tile each, carrying the ray's own glyph and its level against the level
   this evolution demands. The count alone ("3/5") never said WHICH one. */
const requiredRayLevel = computed(() => (isComet.value ? 1 : solarStore.starPhase + 1))

const rayTiles = computed(() =>
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
const raysMet = computed(() => rayTiles.value.filter((r) => r.met).length)
const raysAllMet = computed(() => raysMet.value >= SOLAR_BRANCHES.length)
const raysShortText = computed(() => {
  const missing = SOLAR_BRANCHES.length - raysMet.value
  return `${missing} ray${missing === 1 ? '' : 's'}`
})

/* ── The act ──────────────────────────────────────────────────────
   This panel is the ONLY place the sun evolves. The Star Forge grows the rays
   that feed gate one; it never calls `upgradeStar()`. */
const canEvolveNow = computed(() => solarStore.canUpgradeStar)

const nextStage = computed(() =>
  isComet.value
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, totalPhases - 1)],
)

/** What the next phase opens up — the reason to bother. */
const nextPhaseGain = computed(() => {
  const next = solarStore.starPhase + 1
  if (next === FORGE_BRANCH_UNLOCK_PHASE) return 'Opens 10 Star Forge branches'
  if (next === FORGE_LEAF_UNLOCK_PHASE) return 'Opens 10 Star Forge leaves'
  return '+1 max level on every Star Forge branch'
})

/**
 * The button's subline: what holds the evolution, or what it pays out.
 *
 * A fragment, not a sentence — the two slabs above already SHOW their state,
 * so "both gates stand open" would spend a line on what was just read. What is
 * left is the part the slabs cannot say: the missing number, or the reward.
 */
const verdict = computed<{ tone: 'ready' | 'blocked' | 'end'; text: string }>(() => {
  if (isMax.value) return { tone: 'end', text: 'Nothing follows the collapse' }
  if (solarStore.isUpgrading)
    return { tone: 'ready', text: `${nextStage.value.name} is taking shape…` }
  if (dwellMet.value && raysAllMet.value) return { tone: 'ready', text: nextPhaseGain.value }
  if (!dwellMet.value && !raysAllMet.value)
    return {
      tone: 'blocked',
      text: `${formatCompactDuration(dwellRemainingMs.value)} of dwell · ${raysShortText.value} below Lv ${requiredRayLevel.value}`,
    }
  if (!dwellMet.value)
    return {
      tone: 'blocked',
      text: `${formatCompactDuration(dwellRemainingMs.value)} of dwell left`,
    }
  /* Rays only: there is room on this line to also say WHERE they grow, which
     replaces the pointer chip that used to sit in the rays slab and crowded
     its label. Not added to the both-gates case — that line is already full. */
  return {
    tone: 'blocked',
    text: `${raysShortText.value} below Lv ${requiredRayLevel.value} — grow them in the Star Forge`,
  }
})

const evolveLabel = computed(() => {
  if (solarStore.isUpgrading) return isComet.value ? 'Igniting…' : 'Evolving…'
  if (isComet.value) return '✦ Ignite the Core'
  return `✦ Evolve → ${nextStage.value.name}`
})

function handleEvolve(): void {
  if (!solarStore.canUpgradeStar) return
  const wasComet = isComet.value
  const targetName = nextStage.value.name
  solarStore.upgradeStar()
  showToast(
    wasComet ? `The comet ignites into ${targetName}…` : `Star evolving to ${targetName}…`,
    'event',
  )
}

</script>

<template>
  <section class="sf-panel sf-col sf-col--solar" :style="phaseVars">
    <StatsColumnHeader title="Solar Evolution" />

    <div class="sf-p-body sf-solar-body">
      <!-- ═ 1 · the body itself ═══════════════════════════════════ -->
      <div ref="stageEl" class="se-stage">
        <!-- The disc renderers centre themselves absolutely inside their
             parent, so this box IS the body's footprint and the ready-rings
             can simply take its inset. -->
        <div
          class="se-sun"
          :title="phaseAstroName"
          :style="{ width: sunDiameter + 'px', height: sunDiameter + 'px' }"
        >
          <CometDisc v-if="isComet" :diameter="sunDiameter" />
          <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />

          <!-- Readiness announced by the body: two rings breaking out of the
               core, half a cycle apart. transform + opacity only. -->
          <template v-if="canEvolveNow">
            <span class="se-ring" aria-hidden="true"></span>
            <span class="se-ring se-ring--late" aria-hidden="true"></span>
          </template>
        </div>

        <!-- TEMP: admin dwell-skip — floated into the corner so it never
             affects the layout (remove with adminSkipDwellTime in the store) -->
        <button
          v-if="!isMax && !dwellMet"
          class="se-dev-skip"
          type="button"
          title="Admin: skip the remaining dwell time of this phase"
          @click.stop="solarStore.adminSkipDwellTime()"
        >
          DEV · Skip
        </button>
        <!-- /TEMP -->
      </div>

      <!-- ═ 2 · who, and where on the road ════════════════════════ -->
      <div class="se-ident">
        <span class="se-ident-name">{{ phaseName }}</span>
        <span class="se-ident-step">{{ phaseDisplayLabel }}</span>
      </div>

      <div class="se-rail">
        <span
          v-for="step in railSteps"
          :key="step.key"
          class="se-step"
          :class="{ 'is-done': step.done, 'is-current': step.current }"
          :style="{ '--step-color': step.color, '--step-glow': step.glow }"
          :title="step.title"
        >
          <i class="se-step-dot" />
        </span>
      </div>

      <!-- ═ 3 · the deck: time, rays, act ═════════════════════════ -->
      <div class="se-deck" :class="[`is-${verdict.tone}`, { 'is-live': canEvolveNow }]">
        <!-- gate one -->
        <div v-if="!isMax" class="se-slab" :class="{ 'is-met': dwellMet }">
          <span class="se-slab-k">Dwell</span>
          <span class="se-slab-v">
            {{ dwellMet ? 'Served' : formatCompactDuration(dwellRemainingMs) }}
          </span>
          <span class="se-track">
            <i class="se-track-fill" :style="{ transform: `scaleX(${dwellPct})` }" />
          </span>
        </div>

        <!-- gate two -->
        <div v-if="!isMax" class="se-slab" :class="{ 'is-met': raysAllMet }">
          <span class="se-slab-k">Rays</span>
          <span class="se-slab-v">
            {{ raysMet }}<span class="se-slab-cap">/{{ SOLAR_BRANCHES.length }}</span>
          </span>
          <div class="se-rays">
            <div
              v-for="ray in rayTiles"
              :key="ray.id"
              class="se-ray"
              :class="{ 'is-met': ray.met }"
              :style="{ '--ray': ray.color }"
              :title="`${ray.name} — Lv ${ray.level} of ${requiredRayLevel} needed`"
            >
              <Icon :icon="ray.icon" class="se-ray-ico" width="22" height="22" aria-hidden="true" />
              <span class="se-ray-lv">
                {{ ray.level }}<span class="se-ray-req">/{{ requiredRayLevel }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- the act, carrying its own reason -->
        <button
          v-if="!isMax"
          class="se-fire"
          type="button"
          :disabled="!canEvolveNow"
          @click="handleEvolve"
        >
          <span class="se-fire-lbl">{{ evolveLabel }}</span>
          <span class="se-fire-sub">{{ verdict.text }}</span>
        </button>
        <div v-else class="se-fire se-fire--done">
          <span class="se-fire-lbl">
            <Icon icon="game-icons:laurel-crown" width="22" height="22" aria-hidden="true" />
            Fully Evolved
          </span>
          <span class="se-fire-sub">{{ verdict.text }}</span>
        </div>
      </div>

      <!-- ═ Astral Codex: die Meilenstein-Bahnen darunter ═════════ -->
      <ChronicleSection />
    </div>
  </section>
</template>

<style scoped>
/* ═══ Solar Evolution — the sun's control desk ══════════════════════
   Stacked slabs, each with the full column width. Type sizes hang on the
   panel's own container width (`cqw`), not on the viewport: this column runs
   from ~390px on Full HD to over 800px on 2K, and a fixed px scale would read
   right on exactly one of them. Every clamp is bounded at both ends so neither
   extreme runs away. */
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
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  /* Fixed, NOT cqw: a container query unit used on the container ELEMENT
     itself resolves against the nearest ANCESTOR container — and with none
     above, against the viewport. `1.3cqw` read 25px off the 1920 viewport
     instead of 5px off this 391px column, and the three row gaps ate 40px
     straight out of the sun. Everything INSIDE this element resolves against
     it correctly; only its own properties must stay clear of cqw. */
  gap: 12px;
  overflow: clip;
  /* The middle column absorbs every pixel the two fixed side columns leave, so
     on 4K it is over 2000px wide. Capping the CONTENT keeps the sun, the deck
     and the codex reading as one centred block. */
  width: 100%;
  max-width: 1180px;
  margin-inline: auto;
}

/* ── 1 · the body ────────────────────────────────────────────────
   The only row that flexes: it takes whatever the fixed rows below leave, and
   the disc is sized against it in script. */
.se-stage {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.se-sun {
  position: relative;
  flex-shrink: 0;
  cursor: help;
}

/* Two rings out of the core, half a cycle apart. transform + opacity only, so
   the announcement stays compositor work — and it exists at most once on
   screen, for the seconds between "ready" and the player's click. */
.se-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #6ec040;
  pointer-events: none;
  animation: se-ring 2.8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
}
.se-ring--late {
  animation-delay: 1.4s;
}
@keyframes se-ring {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.35);
    opacity: 0;
  }
}

/* TEMP: admin dwell-skip chip */
.se-dev-skip {
  position: absolute;
  top: 0;
  right: 0;
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
  transition: opacity 0.15s;
}
.se-dev-skip:hover {
  opacity: 1;
}

/* ── 2 · identity and journey ────────────────────────────────────
   Name on the left in the phase's own colour, step count on the right. The
   name is the largest word on the panel — it is what the sun IS. */
.se-ident {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: clamp(8px, 1.8cqw, 28px);
  min-width: 0;
}

.se-ident-name {
  font-size: clamp(26px, 6.4cqw, 76px);
  line-height: 1;
  letter-spacing: 0.03em;
  color: var(--phase-primary);
  text-shadow: 0 0 10px var(--phase-glow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.se-ident-step {
  flex-shrink: 0;
  font-size: clamp(10px, 1.8cqw, 24px);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #8a7c66;
  white-space: nowrap;
}

/* Seven dots on one line — the journey, without the labels that used to make
   it unreadable at this width. Each step carries its own connector (to its
   left), so the chain stays flush at any width without separate positioning. */
.se-rail {
  display: flex;
  align-items: center;
}

.se-step {
  position: relative;
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: clamp(14px, 3.4cqw, 40px);
  min-width: 0;
  cursor: help;
}

.se-step + .se-step::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 50%;
  left: -50%;
  height: 2px;
  margin-top: -1px;
  background: #33220e;
}
.se-step.is-done::before,
.se-step.is-current::before {
  background: linear-gradient(to right, #5c3310, var(--step-color));
}

.se-step-dot {
  position: relative;
  z-index: 1;
  width: clamp(8px, 1.7cqw, 22px);
  height: clamp(8px, 1.7cqw, 22px);
  border-radius: 50%;
  background: #1c1c18;
  border: 1px solid #3e200a;
}
.se-step.is-done .se-step-dot {
  background: var(--step-color);
  border-color: transparent;
  opacity: 0.75;
}

/* The step the sun stands on: larger, in full colour, with a halo. The only
   thing on the rail that carries a glow, so it is found instantly. */
.se-step.is-current .se-step-dot {
  width: clamp(14px, 2.9cqw, 34px);
  height: clamp(14px, 2.9cqw, 34px);
  background: var(--step-color);
  border: none;
  box-shadow:
    0 0 10px var(--step-glow),
    0 0 20px color-mix(in srgb, var(--step-glow) 45%, transparent);
}

/* ── 3 · the deck ────────────────────────────────────────────────
   One plate holding the two gates and the act. Its border carries the overall
   state, so "ready" reads before a single number is read. */
.se-deck {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(6px, 1.3cqw, 18px);
  padding: clamp(8px, 1.8cqw, 24px) clamp(9px, 2cqw, 27px);
  background: #1a1008;
  border: 2px solid #5c3310;
  border-radius: 4px;
}
.se-deck.is-live {
  border-color: #6ec040;
  background: #141c0c;
}
.se-deck.is-end {
  border-color: #4a2a7a;
  background: #170f22;
}

/* Label left, value right, the visual underneath — full width, because that is
   the whole point of the stack. */
.se-slab {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: clamp(4px, 1cqw, 13px) clamp(8px, 1.8cqw, 24px);
}

.se-slab-k {
  font-size: clamp(10px, 1.8cqw, 24px);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7a6c56;
  white-space: nowrap;
}

/* The numbers this panel exists for */
.se-slab-v {
  grid-column: 3;
  font-size: clamp(24px, 4.55cqw, 62px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.se-slab.is-met .se-slab-v {
  color: #a8e878;
}

.se-slab-cap {
  font-size: 0.5em;
  font-weight: 700;
  color: #7a6c56;
}

/* ── gate one: the dwell track ───────────────────────────────────
   scaleX, not width — this creeps forward every second the panel is open. */
.se-track {
  grid-column: 1 / -1;
  height: clamp(7px, 1.2cqw, 16px);
  background: #0d0904;
  border: 1px solid #2c1806;
  border-radius: 3px;
  overflow: hidden;
}

.se-track-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #b8791c, #e0a828);
}
.se-slab.is-met .se-track-fill {
  background: linear-gradient(to right, #2e7a1a, #6ec040);
}

/* ── gate two: five tiles, one per core ray ──────────────────────
   Its own glyph and its own level on every tile: a bare "3 / 5" never said
   WHICH ray was short, and that is the only thing the player can act on. */
.se-rays {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(4px, 1.1cqw, 14px);
}

.se-ray {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2px, 0.5cqw, 7px);
  padding: clamp(5px, 1.2cqw, 16px) 2px;
  background: #141410;
  border: 1px solid #2c1806;
  border-radius: 4px;
  cursor: help;
}

/* A grown ray burns in its own colour; a short one stays a dark socket. No
   `filter: grayscale` — the colour IS the ray's name here. */
.se-ray-ico {
  width: clamp(18px, 3.6cqw, 44px);
  height: clamp(18px, 3.6cqw, 44px);
  color: #4e422c;
}
.se-ray.is-met {
  background: color-mix(in srgb, var(--ray) 12%, #141410);
  border-color: color-mix(in srgb, var(--ray) 55%, #2c1806);
}
.se-ray.is-met .se-ray-ico {
  color: var(--ray);
}

.se-ray-lv {
  font-size: clamp(12px, 2.4cqw, 30px);
  font-weight: 900;
  line-height: 1;
  color: #6a5a3a;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.se-ray.is-met .se-ray-lv {
  color: #e8e4d8;
}

.se-ray-req {
  font-size: 0.72em;
  font-weight: 700;
  color: #4e422c;
}
.se-ray.is-met .se-ray-req {
  color: #7a6c56;
}

/* ── the act ─────────────────────────────────────────────────────
   Full width, two lines: what it does, and why it will or will not fire. The
   subline is why no separate verdict row is needed. */
.se-fire {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(2px, 0.6cqw, 8px);
  padding: clamp(9px, 1.9cqw, 26px) clamp(10px, 2.2cqw, 30px);
  width: 100%;
  color: #08130a;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  border: 1px solid #6ec040;
  border-radius: 4px;
  cursor: pointer;
}
.se-fire:hover:not(:disabled) {
  filter: brightness(1.12);
}

.se-fire-lbl {
  display: flex;
  align-items: center;
  gap: clamp(5px, 1.2cqw, 16px);
  font-size: clamp(16px, 3.1cqw, 42px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.se-fire-sub {
  font-size: clamp(10px, 1.8cqw, 22px);
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: #10300c;
  text-align: center;
}

/* Blocked is not hidden — the button stays, so the target is always visible;
   its subline says what holds it. */
.se-fire:disabled {
  color: #9a8f7c;
  background: #16130c;
  border-color: #3e200a;
  cursor: not-allowed;
}
.se-fire:disabled .se-fire-sub {
  color: #d8b06a;
}

.se-fire--done {
  color: #e8c040;
  background: #1e1a06;
  border-color: #e8c040;
  cursor: default;
}
.se-fire--done .se-fire-sub {
  color: #b89ad8;
}

/* The call to act breathes on its OWN layer: the glow stands still in CSS and
   only its opacity animates. Pulsing the button's box-shadow directly would
   re-raster the box every frame (see „Performance" Regel 2/11). */
.se-fire:not(:disabled):not(.se-fire--done)::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 5px;
  box-shadow: 0 0 18px 2px rgba(140, 240, 110, 0.8);
  pointer-events: none;
  animation: se-fire-breathe 2s ease-in-out infinite;
}
@keyframes se-fire-breathe {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.9;
  }
}

/* Full HD / WUXGA — the flattest viewports. Every pixel the deck gives back
   here goes straight into the sun, which is the row that flexes. */
@media (max-height: 1100px) {
  .sf-solar-body {
    gap: 7px;
  }
  .se-deck {
    padding: 7px 9px;
    gap: 5px;
  }
  .se-ray {
    padding: 4px 2px;
  }
  .se-fire {
    padding: 8px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .se-ring,
  .se-fire:not(:disabled)::after {
    animation: none;
  }
  .se-ring--late {
    display: none;
  }
  .se-fire:not(:disabled)::after {
    opacity: 0.6;
  }
}
</style>

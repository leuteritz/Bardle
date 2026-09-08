<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/ui/format'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useHerald } from '@/composables/ui/useHerald'
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
import { gameNow } from '@/utils/game/gameClock'

/** Die Sonne auf der Journey-Übersicht — die EINZIGE Stelle, an der sie evolviert. */
const solarStore = useSolarUpgradeStore()
const { announceReceipt } = useHerald()

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
const now = ref(gameNow())
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
  if (!solarStore.phaseEnteredAt) solarStore.phaseEnteredAt = gameNow()
  ticker = setInterval(() => {
    now.value = gameNow()
  }, 1000)
  if (stageEl.value) {
    stageW.value = stageEl.value.clientWidth
    stageH.value = stageEl.value.clientHeight
    stageObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      // 0×0 = per v-show versteckt; letzte Größe behalten, sonst unmountet die Disc
      if (!width || !height) return
      stageW.value = width
      stageH.value = height
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
  dwellRequiredMs.value <= 0 ? 1 : Math.min(1, dwellElapsedMs.value / dwellRequiredMs.value),
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
  announceReceipt({
    kind: 'event',
    eyebrow: 'SOLAR ASCENT',
    headline: targetName,
    subline: wasComet ? 'The comet ignites' : 'The star is evolving',
    icon: 'game-icons:heraldic-sun',
  })
}
</script>

<template>
  <section class="jt-sun" :style="phaseVars">
    <!-- ═ 1 · the body itself ═══════════════════════════════════ -->
    <div ref="stageEl" class="se-stage">
      <!-- The disc renderers centre themselves absolutely inside their
           parent, so this box IS the body's footprint and the ready-rings
           can simply take its inset. -->
      <div
        class="se-sun"
        v-tip="phaseAstroName"
        :style="{ width: sunDiameter + 'px', height: sunDiameter + 'px' }"
      >
        <!-- Not before the stage has measured itself: a body without a box. -->
        <template v-if="sunDiameter > 0">
          <CometDisc v-if="isComet" :diameter="sunDiameter" />
          <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />
        </template>

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
        v-tip="'Admin: skip the remaining dwell time of this phase'"
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
        v-tip="step.title"
      >
        <i class="se-step-dot" />
      </span>
    </div>

    <!-- ═ 3 · the deck: time, rays, act ═════════════════════════ -->
    <section class="se-deck" :class="[`is-${verdict.tone}`, { 'is-live': canEvolveNow }]">
      <div class="se-next">
        <span class="se-next-mark" aria-hidden="true">
          <Icon icon="game-icons:heraldic-sun" width="24" height="24" />
        </span>
        <span class="se-next-copy">
          <span class="se-next-k">{{ isMax ? 'Solar path' : 'Next solar phase' }}</span>
          <strong class="se-next-name">{{ isMax ? 'Fully Evolved' : nextStage.name }}</strong>
          <span class="se-next-gain">{{ isMax ? verdict.text : nextPhaseGain }}</span>
        </span>
        <span class="se-next-index"
          >{{ isMax ? totalPhases : solarStore.starPhase + 1 }}/{{ totalPhases }}</span
        >
      </div>

      <div v-if="!isMax" class="se-requirements">
        <div class="se-requirements-head">
          <span class="se-requirements-k">Requirements</span>
          <span class="se-requirements-state" :class="{ 'is-ready': canEvolveNow }">
            {{ canEvolveNow ? 'Ready to evolve' : 'Not ready yet' }}
          </span>
        </div>

        <div class="se-requirement" :class="{ 'is-met': dwellMet }">
          <div class="se-requirement-copy">
            <Icon
              icon="lucide:hourglass"
              class="se-requirement-ico"
              width="17"
              height="17"
              aria-hidden="true"
            />
            <span>
              <span class="se-requirement-name">Dwell</span>
              <span class="se-requirement-value">
                {{ dwellMet ? 'Served' : `${formatCompactDuration(dwellRemainingMs)} remaining` }}
              </span>
            </span>
          </div>
          <span class="se-track">
            <i class="se-track-fill" :style="{ transform: `scaleX(${dwellPct})` }" />
          </span>
        </div>

        <div class="se-requirement se-requirement--rays" :class="{ 'is-met': raysAllMet }">
          <div class="se-requirement-copy">
            <Icon
              icon="game-icons:solar-power"
              class="se-requirement-ico"
              width="18"
              height="18"
              aria-hidden="true"
            />
            <span>
              <span class="se-requirement-name">Core rays</span>
              <span class="se-requirement-value"
                >{{ raysMet }}/{{ SOLAR_BRANCHES.length }} attuned · Lv
                {{ requiredRayLevel }} needed</span
              >
            </span>
          </div>
          <div class="se-rays">
            <div
              v-for="ray in rayTiles"
              :key="ray.id"
              class="se-ray"
              :class="{ 'is-met': ray.met }"
              :style="{ '--ray': ray.color }"
              v-tip="`${ray.name} — Lv ${ray.level} of ${requiredRayLevel} needed`"
            >
              <Icon :icon="ray.icon" class="se-ray-ico" width="22" height="22" aria-hidden="true" />
              <span class="se-ray-lv">
                {{ ray.level }}<span class="se-ray-req">/{{ requiredRayLevel }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="!isMax"
        class="se-fire"
        type="button"
        :disabled="!canEvolveNow"
        @click="handleEvolve"
      >
        <span class="se-fire-mark" aria-hidden="true">✦</span>
        <span class="se-fire-copy">
          <span class="se-fire-lbl">{{ evolveLabel }}</span>
          <span class="se-fire-sub">{{ verdict.text }}</span>
        </span>
        <span class="se-fire-arrow" aria-hidden="true">→</span>
      </button>
      <div v-else class="se-fire se-fire--done">
        <span class="se-fire-mark" aria-hidden="true">
          <Icon icon="game-icons:laurel-crown" width="22" height="22" aria-hidden="true" />
        </span>
        <span class="se-fire-copy">
          <span class="se-fire-lbl">Fully Evolved</span>
          <span class="se-fire-sub">{{ verdict.text }}</span>
        </span>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* Sonnen-Bühne: gestapelte Bänder, Schrift an der eigenen Containerbreite (cqw). */
.jt-sun {
  container-type: inline-size;
  /* Sonne links über Name und Rail, die Konsole rechts über die volle Höhe:
     untereinander fraß die Konsole der Sonne die Höhe weg (gemessen 37 px Disc) */
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 40%);
  grid-template-rows: minmax(0, 1fr) auto auto;
  /* eigene Eigenschaften NIE in cqw: das Container-Element misst gegen den Vorfahren */
  column-gap: 18px;
  row-gap: 10px;
  overflow: clip;
  min-height: 0;
  min-width: 0;
  height: 100%;
  padding: 12px 16px 14px;
}

/* ── 1 · the body ────────────────────────────────────────────────
   The only row that flexes: it takes whatever the fixed rows below leave, and
   the disc is sized against it in script. */
.se-stage {
  position: relative;
  grid-column: 1;
  grid-row: 1;
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
  grid-column: 1;
  grid-row: 2;
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
  grid-column: 1;
  grid-row: 3;
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
  grid-column: 2;
  grid-row: 1 / -1;
  align-self: center;
  width: min(100%, 520px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 1.5cqw, 18px);
  padding: clamp(10px, 1.5cqw, 18px) 0;
  --se-state: #5c3310;
}
.se-deck.is-live {
  --se-state: #6ec040;
}
.se-deck.is-end {
  --se-state: #4a2a7a;
}

.se-next {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(8px, 1.2cqw, 15px);
  padding-bottom: clamp(9px, 1.4cqw, 17px);
  border-bottom: 1px solid #2c1806;
}

.se-next-mark {
  display: grid;
  place-items: center;
  width: clamp(30px, 4.4cqw, 42px);
  height: clamp(30px, 4.4cqw, 42px);
  color: var(--phase-primary);
  border: 1px solid var(--se-state);
  border-radius: 50%;
}

.se-next-copy,
.se-requirement-copy,
.se-fire-copy {
  min-width: 0;
}

.se-next-copy,
.se-requirement-copy {
  display: flex;
  flex-direction: column;
}

.se-next-k,
.se-requirements-k,
.se-requirement-name {
  font-size: clamp(9px, 1.1cqw, 13px);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7a6c56;
}

.se-next-name {
  margin-top: 2px;
  font-size: clamp(20px, 2.6cqw, 30px);
  line-height: 1;
  letter-spacing: 0.03em;
  color: var(--phase-primary);
}

.se-next-gain {
  margin-top: 4px;
  font-size: clamp(10px, 1.25cqw, 15px);
  line-height: 1.2;
  color: #c7b98d;
}

.se-next-index {
  align-self: start;
  padding-top: 2px;
  font-size: clamp(10px, 1.2cqw, 14px);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--se-state);
  white-space: nowrap;
}

.se-requirements {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.1cqw, 14px);
}

.se-requirements-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.se-requirements-state {
  font-size: clamp(9px, 1.1cqw, 13px);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8a7c66;
  white-space: nowrap;
}

.se-requirements-state.is-ready {
  color: #a8e878;
}

.se-requirement {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-bottom: clamp(8px, 1.1cqw, 13px);
  border-bottom: 1px solid #2c1806;
}

.se-requirement-copy {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: 8px;
}

.se-requirement-ico {
  color: #6a5a3a;
}

.se-requirement.is-met .se-requirement-ico,
.se-requirement.is-met .se-requirement-name {
  color: #8bcf60;
}

.se-requirement-name,
.se-requirement-value {
  display: block;
}

.se-requirement-value {
  margin-top: 2px;
  font-size: clamp(10px, 1.25cqw, 15px);
  line-height: 1.2;
  color: #c7b98d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.se-requirement--rays {
  gap: clamp(7px, 1cqw, 12px);
}

/* Label left, value right, the visual underneath — full width, because that is
   the whole point of the stack. */
/* ── gate one: the dwell track ───────────────────────────────────
   scaleX, not width — this creeps forward every second the panel is open. */
.se-track {
  display: block;
  width: 100%;
  height: clamp(6px, 0.8cqw, 10px);
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
.se-requirement.is-met .se-track-fill {
  background: linear-gradient(to right, #2e7a1a, #6ec040);
}

/* ── gate two: five tiles, one per core ray ──────────────────────
   Its own glyph and its own level on every tile: a bare "3 / 5" never said
   WHICH ray was short, and that is the only thing the player can act on. */
.se-rays {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(4px, 0.8cqw, 10px);
}

.se-ray {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2px, 0.4cqw, 5px);
  padding: clamp(6px, 0.9cqw, 11px) 2px 5px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid #2c1806;
  border-radius: 0;
  cursor: help;
}

/* A grown ray burns in its own colour; a short one stays a dark socket. No
   `filter: grayscale` — the colour IS the ray's name here. */
.se-ray-ico {
  width: clamp(18px, 2.7cqw, 32px);
  height: clamp(18px, 2.7cqw, 32px);
  color: #4e422c;
}
.se-ray.is-met {
  border-bottom-color: color-mix(in srgb, var(--ray) 55%, #2c1806);
}
.se-ray.is-met .se-ray-ico {
  color: var(--ray);
}

.se-ray-lv {
  font-size: clamp(11px, 1.8cqw, 22px);
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(8px, 1.2cqw, 15px);
  padding: clamp(10px, 1.4cqw, 16px) clamp(11px, 1.6cqw, 20px);
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
  display: block;
  font-size: clamp(14px, 1.9cqw, 23px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.se-fire-sub {
  display: block;
  margin-top: 3px;
  font-size: clamp(10px, 1.15cqw, 14px);
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: #10300c;
  text-align: left;
}

.se-fire-mark {
  display: grid;
  place-items: center;
  width: clamp(22px, 3.2cqw, 32px);
  height: clamp(22px, 3.2cqw, 32px);
  font-size: clamp(17px, 2.4cqw, 24px);
  line-height: 1;
}

.se-fire-arrow {
  font-size: clamp(18px, 2.5cqw, 26px);
  line-height: 1;
}

/* Blocked is not hidden — the button stays, so the target is always visible;
   its subline says what holds it. */
.se-fire:disabled {
  color: #9a8f7c;
  background: transparent;
  border-color: #3e200a;
  cursor: not-allowed;
}
.se-fire:disabled .se-fire-sub {
  color: #d8b06a;
}

.se-fire--done {
  color: #e8c040;
  background: transparent;
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
  .jt-sun {
    row-gap: 7px;
    padding: 8px 12px 10px;
  }
  .se-deck {
    padding: 8px 0;
    gap: 8px;
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

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

/* ── The act ──────────────────────────────────────────────────────
   This panel is the ONLY place the sun evolves, and the BODY is the button —
   same doctrine as the orbit sun (IdleGameComponent: „the sun itself is the
   button, no static icon"). The Star Forge grows the rays that feed gate two;
   it never calls `upgradeStar()`. */
const canEvolveNow = computed(() => solarStore.canUpgradeStar)

const nextStage = computed(() =>
  isComet.value
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, totalPhases - 1)],
)

const sunTip = computed(() => {
  if (!canEvolveNow.value) return phaseAstroName.value
  return isComet.value ? 'Click to ignite the core' : `Click to evolve → ${nextStage.value.name}`
})

/** The wreath line under the body — only while there is something to do. */
const callText = computed(() => {
  if (isMax.value) return ''
  if (solarStore.isUpgrading) return isComet.value ? 'Igniting…' : 'Evolving…'
  if (!canEvolveNow.value) return ''
  return isComet.value ? 'Click to ignite' : `Click to evolve → ${nextStage.value.name}`
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

function handleSunClick(): void {
  if (!canEvolveNow.value) return
  handleEvolve()
}

function handleSunKey(e: KeyboardEvent): void {
  if (!canEvolveNow.value) return
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  handleEvolve()
}
</script>

<template>
  <section class="jt-sun" :style="phaseVars">
    <!-- ═ 1 · the body itself — and the button ══════════════════ -->
    <div ref="stageEl" class="se-stage">
      <!-- The disc renderers centre themselves absolutely inside their
           parent, so this box IS the body's footprint and the ready-rings
           can simply take its inset. -->
      <div
        class="se-sun"
        :class="{ 'is-armed': canEvolveNow, 'is-working': solarStore.isUpgrading }"
        v-tip="sunTip"
        :role="canEvolveNow ? 'button' : null"
        :tabindex="canEvolveNow ? 0 : null"
        :aria-label="canEvolveNow ? sunTip : null"
        :style="{ width: sunDiameter + 'px', height: sunDiameter + 'px' }"
        @click="handleSunClick"
        @keydown="handleSunKey"
      >
        <!-- Not before the stage has measured itself: a body without a box. -->
        <template v-if="sunDiameter > 0">
          <CometDisc v-if="isComet" :diameter="sunDiameter" />
          <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />
        </template>

        <!-- Readiness announced by the body: a standing halo whose opacity
             breathes, plus two rings breaking out of the core half a cycle
             apart. transform + opacity only. -->
        <template v-if="canEvolveNow">
          <span class="se-halo" aria-hidden="true"></span>
          <span class="se-ring" aria-hidden="true"></span>
          <span class="se-ring se-ring--late" aria-hidden="true"></span>
        </template>
      </div>

      <!-- Sits in the band `.se-stage` reserves below itself, so it can never
           collide with the disc no matter how flat the viewport gets. -->
      <span v-if="callText" class="se-call" aria-hidden="true">{{ callText }}</span>

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

    <!-- ═ 3 · the two gates, and nothing else ═══════════════════ -->
    <section v-if="!isMax" class="se-gates" :class="{ 'is-open': canEvolveNow }">
      <span class="se-gates-k">Requirements</span>

      <div class="se-gates-grid">
        <article class="se-gate" :class="{ 'is-met': dwellMet }">
          <div class="se-gate-head">
            <Icon
              icon="lucide:hourglass"
              class="se-gate-ico"
              width="24"
              height="24"
              aria-hidden="true"
            />
            <span class="se-gate-copy">
              <span class="se-gate-name">Dwell</span>
              <span class="se-gate-value">
                {{ dwellMet ? 'Served' : `${formatCompactDuration(dwellRemainingMs)} remaining` }}
              </span>
            </span>
          </div>
          <span class="se-track">
            <i class="se-track-fill" :style="{ transform: `scaleX(${dwellPct})` }" />
          </span>
        </article>

        <article class="se-gate se-gate--rays" :class="{ 'is-met': raysAllMet }">
          <div class="se-gate-head">
            <Icon
              icon="game-icons:solar-power"
              class="se-gate-ico"
              width="24"
              height="24"
              aria-hidden="true"
            />
            <span class="se-gate-copy">
              <span class="se-gate-name">Core rays</span>
              <span class="se-gate-value"
                >{{ raysMet }}/{{ SOLAR_BRANCHES.length }} rays · Lv {{ requiredRayLevel }}</span
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
              <Icon :icon="ray.icon" class="se-ray-ico" width="28" height="28" aria-hidden="true" />
              <span class="se-ray-lv">
                {{ ray.level }}<span class="se-ray-req">/{{ requiredRayLevel }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-else class="se-gates se-gates--done">
      <Icon
        icon="game-icons:laurel-crown"
        class="se-done-ico"
        width="32"
        height="32"
        aria-hidden="true"
      />
      <span class="se-done-copy">
        <strong class="se-done-name">Fully Evolved</strong>
        <span class="se-done-sub">Nothing follows the collapse</span>
      </span>
    </div>
  </section>
</template>

<style scoped>
/* Sonnen-Bühne: gestapelte Bänder, Schrift an der eigenen Containerbreite (cqw). */
.jt-sun {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto auto auto;
  /* eigene Eigenschaften NIE in cqw: das Container-Element misst gegen den Vorfahren */
  column-gap: 0;
  row-gap: 10px;
  overflow: clip;
  min-height: 0;
  min-width: 0;
  height: 100%;
  padding: 12px 16px 14px;
}

/* ── 1 · the body ────────────────────────────────────────────────
   The only row that flexes: it takes whatever the fixed rows below leave, and
   the disc is sized against it in script.
   Das untere Polster ist das Band der Kranzzeile. Es steht IMMER, auch leer:
   `contentRect` schließt Polster aus, also rechnet die Scheibe schon ohne es —
   so springt beim Bereitwerden nichts, und nichts überdeckt sich je. */
.se-stage {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  min-height: 0;
  padding-bottom: clamp(20px, 2.6cqw, 34px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.se-sun {
  position: relative;
  flex-shrink: 0;
  cursor: help;
}

/* Bereit = der Körper IST der Knopf. Hover fährt nur `transform`. */
.se-sun.is-armed {
  cursor: pointer;
  transition: transform 0.18s ease-out;
}
.se-sun.is-armed:hover {
  transform: scale(1.03);
}
.se-sun.is-armed:focus-visible {
  outline: 2px solid #6ec040;
  outline-offset: 6px;
  border-radius: 50%;
}
.se-sun.is-working {
  cursor: progress;
}

/* Stehender Schein auf eigener Ebene — animiert wird nur seine Deckkraft. */
.se-halo {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 26px 6px rgba(140, 240, 110, 0.55);
  animation: se-halo-breathe 2.4s ease-in-out infinite;
}
@keyframes se-halo-breathe {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.85;
  }
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

/* Die Aufforderung, im reservierten Band unter dem Körper. */
.se-call {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: 2px;
  font-size: clamp(11px, 1.9cqw, 20px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  text-align: center;
  color: #8bcf60;
  text-shadow: 0 0 12px rgba(110, 192, 64, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
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

/* ── 3 · die Tore ────────────────────────────────────────────────
   Unter der Perlenschnur steht nur noch, was der Spieler wirklich liest: die
   zwei Bedingungen. Kein Ziel-Steckbrief, kein Knopf — der Knopf ist oben die
   Sonne. Deshalb bekommt jedes Tor rund die dreifache Breite von vorher und
   darf endlich in lesbaren Graden stehen. */
.se-gates {
  grid-column: 1;
  grid-row: 4;
  width: 100%;
  min-width: 0;
  padding-top: clamp(12px, 1.6cqw, 20px);
  border-top: 1px solid #2c1806;
}

.se-gates-k {
  display: block;
  margin-bottom: clamp(8px, 1.1cqw, 14px);
  font-size: clamp(11px, 1.7cqw, 18px);
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  text-align: center;
  color: #7a6c56;
}

.se-gates.is-open .se-gates-k {
  color: #8bcf60;
}

/* Mittig, mit Deckel: auf 4K soll die Zeile nicht auf 1,5 m auseinanderlaufen. */
.se-gates-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(14px, 2cqw, 30px);
  max-width: clamp(560px, 94cqw, 1120px);
  margin-inline: auto;
}

.se-gate {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(8px, 1.1cqw, 14px);
  min-width: 0;
  padding: clamp(10px, 1.3cqw, 16px) clamp(12px, 1.6cqw, 20px);
  background: #1a1008;
  border: 1px solid #2c1806;
  border-radius: 4px;
}
.se-gate.is-met {
  border-color: #2e7a1a;
}

.se-gate-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: clamp(9px, 1.2cqw, 15px);
  min-width: 0;
}

.se-gate-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.se-gate-ico {
  width: clamp(20px, 3cqw, 34px);
  height: clamp(20px, 3cqw, 34px);
  color: #6a5a3a;
}

.se-gate.is-met .se-gate-ico,
.se-gate.is-met .se-gate-name {
  color: #8bcf60;
}

.se-gate-name {
  display: block;
  font-size: clamp(12px, 1.9cqw, 20px);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #7a6c56;
}

.se-gate-value {
  display: block;
  margin-top: 3px;
  font-size: clamp(14px, 2.4cqw, 26px);
  line-height: 1.15;
  color: #e8e4d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── gate one: the dwell track ───────────────────────────────────
   scaleX, not width — this creeps forward every second the panel is open. */
.se-track {
  display: block;
  width: 100%;
  height: clamp(9px, 1.1cqw, 14px);
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
.se-gate.is-met .se-track-fill {
  background: linear-gradient(to right, #2e7a1a, #6ec040);
}

/* ── gate two: five tiles, one per core ray ──────────────────────
   Its own glyph and its own level on every tile: a bare "3 / 5" never said
   WHICH ray was short, and that is the only thing the player can act on. */
.se-rays {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(5px, 0.9cqw, 12px);
}

.se-ray {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(3px, 0.5cqw, 7px);
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
  width: clamp(24px, 4.2cqw, 46px);
  height: clamp(24px, 4.2cqw, 46px);
  color: #4e422c;
}
.se-ray.is-met {
  border-bottom-color: color-mix(in srgb, var(--ray) 55%, #2c1806);
}
.se-ray.is-met .se-ray-ico {
  color: var(--ray);
}

.se-ray-lv {
  font-size: clamp(15px, 2.9cqw, 30px);
  font-weight: 900;
  line-height: 1;
  color: #6a5a3a;
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

/* ── das Ende der Straße ─────────────────────────────────────────
   Statt der Tore: eine Zeile, mittig, in Gold. */
.se-gates--done {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 1.4cqw, 18px);
}

.se-done-ico {
  width: clamp(28px, 3.2cqw, 42px);
  height: clamp(28px, 3.2cqw, 42px);
  color: #e8c040;
}

.se-done-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.se-done-name {
  font-size: clamp(18px, 2.4cqw, 30px);
  line-height: 1.05;
  letter-spacing: 0.03em;
  color: #e8c040;
}

.se-done-sub {
  margin-top: 3px;
  font-size: clamp(12px, 1.5cqw, 18px);
  line-height: 1.2;
  color: #b89ad8;
}

/* Full HD / WUXGA — the flattest viewports. Every pixel the gates give back
   here goes straight into the sun, which is the row that flexes. */
@media (max-height: 1100px) {
  .jt-sun {
    row-gap: 7px;
    padding: 8px 12px 10px;
  }
  .se-stage {
    padding-bottom: clamp(17px, 2.1cqw, 26px);
  }
  .se-gates {
    padding-top: 9px;
  }
  .se-gates-k {
    margin-bottom: 7px;
  }
  .se-gate {
    gap: 7px;
    padding: 7px 11px;
  }
  .se-ray {
    padding: 4px 2px;
  }
}

/* Gestapelt erst, wenn nebeneinander wirklich nicht mehr geht: die Spalte ist
   auf Full HD nur ~466px breit, und jede gestapelte Zeile nimmt der Sonne 70px. */
@container (max-width: 430px) {
  .se-gates-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .se-ring,
  .se-halo {
    animation: none;
  }
  .se-ring--late {
    display: none;
  }
  .se-halo {
    opacity: 0.6;
  }
  .se-sun.is-armed {
    transition: none;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/format'
import { useGameStore } from '@/stores/gameStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import {
  AUGMENT_RARITY_COLOR,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
  STATS_TAB_ORBIT,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'
import { AUGMENTS } from '@/config/augments'
import { useSunPhaseDisplay } from '@/composables/useSunPhaseDisplay'
import PhaseSunDisc from '@/components/idle/sun/PhaseSunDisc.vue'
import CometDisc from '@/components/idle/sun/CometDisc.vue'
import StatsColumnHeader from './StatsColumnHeader.vue'
import type { AugmentDefinition } from '@/types'

/**
 * Middle column of the Bard-Stats deck — the stage.
 * The player's live celestial body sits at the centre of an open arc carrying
 * the seven phases it evolves through; identity, dwell time and the evolve
 * action sit right beneath it, and the augment deck folds into a short strip
 * at the bottom.
 */
const gameStore = useGameStore()
const synergyStore = useSynergyStore()
const augmentStore = useAugmentStore()
const solarStore = useSolarUpgradeStore()
const uiStore = useUiStore()

const { activeModifier, abilityCPSMultiplier, abilityCPCMultiplier, abilityPowerBonus } =
  storeToRefs(gameStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

const dpsPct = computed(() => Math.round((dpsSynergyMultiplier.value - 1) * 100))

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
/** the arc's open bottom, where the dwell clock lives */
const ORBIT_GAP_TOP_PCT = 50 + O.RADIUS

/** Angle of step i, measured from 12 o'clock, clockwise. */
function stepAngle(i: number): number {
  return O.START_DEG + (i * O.SPAN_DEG) / (totalSteps - 1)
}

const orbitDots = computed(() => {
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
      done: !solarStore.isCometState,
      current: solarStore.isCometState,
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
      done: !solarStore.isCometState && i < solarStore.starPhase,
      current: !solarStore.isCometState && i === solarStore.starPhase,
    })),
  ]
  return steps.map((s, i) => {
    const rad = (stepAngle(i) * Math.PI) / 180
    return {
      ...s,
      x: 50 + O.RADIUS * Math.sin(rad),
      y: 50 - O.RADIUS * Math.cos(rad),
      /* tooltips flip below the dot on the arc's lower third, so they never
         leave the stage at the two ends of the ring */
      below: Math.cos(rad) < -0.4,
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

const phaseAge = computed(() => {
  if (!solarStore.phaseEnteredAt) return null
  const secs = Math.floor((now.value - solarStore.phaseEnteredAt) / 1000)
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
})

/* ── Augment shelf ───────────────────────────────────────────── */
interface AugCard {
  aug: AugmentDefinition
  key: string
  color: string
}

const augCards = computed<AugCard[]>(() =>
  gameStore.activeAugments.flatMap((id, idx) => {
    const aug = AUGMENTS.find((a) => a.id === id)
    if (!aug) return []
    return [{ aug, key: `${id}-${idx}`, color: AUGMENT_RARITY_COLOR[aug.rarity] }]
  }),
)

/* ── Aggregate buff chips (augments + abilities + synergies) ─── */
const buffCPSPct = computed(() => {
  const mod = activeModifier.value
  const total =
    (mod.cpsMultiplier ?? 1) -
    1 +
    (abilityCPSMultiplier.value - 1) +
    (cpsSynergyMultiplier.value - 1) +
    (temporaryCPSMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffCPCPct = computed(() => {
  const mod = activeModifier.value
  const total = (mod.cpcMultiplier ?? 1) - 1 + (abilityCPCMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffPowerSynergyPct = computed(() => Math.round((powerSynergyMultiplier.value - 1) * 100))
const buffPowerFlat = computed(() => abilityPowerBonus.value)
const buffMeepPct = computed(() =>
  Math.round(((activeModifier.value.meepPowerMultiplier ?? 1) - 1) * 100),
)
const buffCDRPct = computed(() => {
  const mul = activeModifier.value.cooldownMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffExpPct = computed(() =>
  Math.round(((activeModifier.value.expeditionRewardMultiplier ?? 1) - 1) * 100),
)
const buffCostPct = computed(() => {
  const mul = activeModifier.value.buildingCostMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffEnemyPct = computed(() => {
  const mul = activeModifier.value.enemySpeedMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})

interface BuffChip {
  key: string
  icon: string
  label: string
  value: string
  positive: boolean
}

const totalChips = computed<BuffChip[]>(() => {
  const chips: BuffChip[] = []
  if (buffCPSPct.value > 0)
    chips.push({
      key: 'cps',
      icon: 'game-icons:lyre',
      label: 'Production',
      value: `+${buffCPSPct.value}%`,
      positive: true,
    })
  if (buffCPCPct.value > 0)
    chips.push({
      key: 'cpc',
      icon: 'game-icons:hand',
      label: 'Click',
      value: `+${buffCPCPct.value}%`,
      positive: true,
    })
  if (buffPowerSynergyPct.value > 0 || buffPowerFlat.value > 0) {
    const parts: string[] = []
    if (buffPowerSynergyPct.value > 0) parts.push(`+${buffPowerSynergyPct.value}%`)
    if (buffPowerFlat.value > 0) parts.push(`+${buffPowerFlat.value}`)
    chips.push({
      key: 'power',
      icon: 'game-icons:magic-swirl',
      label: 'Power',
      value: parts.join(' & '),
      positive: true,
    })
  }
  if (buffMeepPct.value > 0)
    chips.push({
      key: 'meep',
      icon: 'game-icons:crystal-ball',
      label: 'Meep Power',
      value: `+${buffMeepPct.value}%`,
      positive: true,
    })
  if (dpsPct.value > 0)
    chips.push({
      key: 'dps',
      icon: 'game-icons:crossed-swords',
      label: 'Combat DPS',
      value: `+${dpsPct.value}%`,
      positive: true,
    })
  if (buffCDRPct.value > 0)
    chips.push({
      key: 'cdr',
      icon: 'game-icons:sand-clock',
      label: 'Cooldowns',
      value: `-${buffCDRPct.value}%`,
      positive: false,
    })
  if (buffExpPct.value > 0)
    chips.push({
      key: 'exp',
      icon: 'game-icons:treasure-map',
      label: 'Expeditions',
      value: `+${buffExpPct.value}%`,
      positive: true,
    })
  if (buffCostPct.value > 0)
    chips.push({
      key: 'cost',
      icon: 'game-icons:stone-wall',
      label: 'Build Cost',
      value: `-${buffCostPct.value}%`,
      positive: false,
    })
  if (buffEnemyPct.value > 0)
    chips.push({
      key: 'enemy',
      icon: 'game-icons:turtle',
      label: 'Enemy Speed',
      value: `-${buffEnemyPct.value}%`,
      positive: false,
    })
  return chips
})

/* The column's context search filters the augment deck below the dial */
const augmentSearch = ref('')

const filteredChips = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return totalChips.value
  return totalChips.value.filter((c) => c.label.toLowerCase().includes(q) || c.key.includes(q))
})

const filteredAugCards = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return augCards.value
  return augCards.value.filter(
    (c) =>
      c.aug.name.toLowerCase().includes(q) ||
      c.aug.effectLine.toLowerCase().includes(q) ||
      c.aug.rarity.toLowerCase().includes(q),
  )
})
</script>

<template>
  <section class="sf-panel sf-col sf-col--solar" :style="phaseVars">
    <StatsColumnHeader
      v-model="augmentSearch"
      title="Solar Evolution"
      placeholder="Search augments…"
    />

    <div class="sf-p-body sf-solar-body">
      <!-- ─ Orbit dial: the live sun ringed by its seven phases ─ -->
      <div
        class="sf-orbit-wrap"
        :style="{
          '--orbit-max': STATS_TAB_ORBIT.MAX_PX + 'px',
          '--orbit-max-compact': STATS_TAB_ORBIT.MAX_PX_COMPACT + 'px',
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
              :cy="STATS_TAB_ORBIT.VIEW / 2"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${ORBIT_ARC_LEN} ${ORBIT_CIRCUMFERENCE}`"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.VIEW / 2})`"
            />
            <!-- Arc already travelled -->
            <circle
              class="sf-orbit-fill"
              :cx="STATS_TAB_ORBIT.VIEW / 2"
              :cy="STATS_TAB_ORBIT.VIEW / 2"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${orbitFillLen} ${ORBIT_CIRCUMFERENCE}`"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.VIEW / 2})`"
            />
            <!-- Segment current → next phase, creeping with dwell progress -->
            <circle
              v-if="!isMax"
              class="sf-orbit-active"
              :class="{ 'is-met': dwellMet }"
              :cx="STATS_TAB_ORBIT.VIEW / 2"
              :cy="STATS_TAB_ORBIT.VIEW / 2"
              :r="STATS_TAB_ORBIT.RADIUS"
              :stroke-width="STATS_TAB_ORBIT.STROKE"
              :stroke-dasharray="`${orbitActiveLen} ${ORBIT_CIRCUMFERENCE}`"
              :stroke-dashoffset="-orbitFillLen"
              :transform="`rotate(${ORBIT_ROTATION} ${STATS_TAB_ORBIT.VIEW / 2} ${STATS_TAB_ORBIT.VIEW / 2})`"
            />
          </svg>

          <!-- The player's actual celestial body, same renderer as the orbit view -->
          <div
            class="sf-orbit-sun"
            role="button"
            title="Open the Solar Shop"
            :style="{ width: sunPct + '%', height: sunPct + '%' }"
            @click="uiStore.setBardTab('shop')"
          >
            <CometDisc v-if="solarStore.isCometState" :diameter="sunDiameter" />
            <PhaseSunDisc v-else :diameter="sunDiameter" :pulse="true" />
          </div>

          <!-- Dwell clock, parked in the arc's open bottom -->
          <div
            v-if="!isMax"
            class="sf-orbit-clock"
            :style="{ top: ORBIT_GAP_TOP_PCT + '%' }"
            :title="`${formatCompactDuration(dwellElapsedMs)} of ${formatCompactDuration(dwellRequiredMs)} in this phase — time the sun must spend before it can evolve`"
          >
            <span v-if="dwellMet" class="sf-orbit-clock-val is-met">✓ Ready</span>
            <span v-else class="sf-orbit-clock-val">{{
              formatCompactDuration(dwellRemainingMs)
            }}</span>
            <span class="sf-orbit-clock-lbl">until evolve</span>
          </div>

          <!-- Phase markers riding the arc -->
          <div
            v-for="(dot, i) in orbitDots"
            :key="i"
            class="sf-orbit-node"
            :class="{ 'is-below': dot.below }"
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
              <span class="sf-orbit-tip-name">{{ dot.label }}</span>
              <span class="sf-orbit-tip-astro">{{ dot.astro }}</span>
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

      <!-- ─ Phase identity + evolve action, right under the dial ─ -->
      <div class="sf-orbit-foot">
        <div class="sf-foot-id">
          <span class="sf-kicker">{{ phaseDisplayLabel }}</span>
          <span class="sf-phase-name">{{ phaseName }}</span>
          <span class="sf-phase-astro">{{ phaseAstroName }}</span>
        </div>
        <div class="sf-foot-age" :title="`Time spent in the ${phaseName} phase`">
          <span class="sf-kicker">In Phase</span>
          <span class="sf-solar-age">{{ phaseAge ?? '—' }}</span>
        </div>
        <div class="sf-solar-status">
          <div v-if="isMax" class="sf-pill sf-pill--max">Fully Evolved</div>
          <div
            v-else-if="solarStore.canUpgradeStar"
            class="sf-pill sf-pill--ready"
            role="button"
            @click="uiStore.setBardTab('shop')"
          >
            Evolve
          </div>
          <div v-else-if="solarStore.branchesReadyForEvolve" class="sf-pill sf-pill--wait">
            Evolving in {{ formatCompactDuration(dwellRemainingMs) }}
          </div>
          <div
            v-else
            v-ink-center
            class="sf-pill sf-pill--hint"
            role="button"
            @click="uiStore.setBardTab('shop')"
          >
            Evolve
          </div>
        </div>
      </div>

      <!-- ─ Augments: the compact deck under the dial ─ -->
      <div class="sf-aug-zone">
        <div class="sf-zone-rule">
          <span v-ink-center class="sf-zone-lbl">Augments</span>
          <span class="sf-zone-count">{{ filteredAugCards.length }}</span>
        </div>
        <div class="sf-aug-scroll rpg-scrollbar">
          <div class="sf-buff-chips">
            <div v-if="filteredChips.length === 0" class="sf-empty-line">
              {{ totalChips.length === 0 ? 'No buffs active yet' : 'No buffs match' }}
            </div>
            <div v-for="chip in filteredChips" :key="chip.key" class="sf-chip-buff">
              <Icon :icon="chip.icon" width="14" height="14" class="sf-chip-buff-icon" />
              <span class="sf-chip-buff-lbl">{{ chip.label }}</span>
              <span class="sf-chip-buff-val" :class="chip.positive ? 'is-up' : 'is-down'">
                {{ chip.value }}
              </span>
            </div>
          </div>

          <div v-if="filteredAugCards.length === 0" class="sf-empty-block">
            <Icon icon="game-icons:gems" width="22" height="22" class="sf-empty-icon" />
            <span>
              {{
                augCards.length === 0
                  ? 'No augments active yet — level up to pick your first one'
                  : 'No augments match your search'
              }}
            </span>
          </div>
          <div v-else class="sf-aug-grid">
            <div
              v-for="card in filteredAugCards"
              :key="card.key"
              class="sf-aug-card"
              :style="{ '--rarity': card.color }"
              :title="`${card.aug.name} — ${card.aug.effectLine}`"
            >
              <div class="sf-aug-icon">
                <img v-if="card.aug.image" :src="card.aug.image" :alt="card.aug.name" />
                <Icon
                  v-else-if="card.aug.icon.includes(':')"
                  :icon="card.aug.icon"
                  width="20"
                  height="20"
                />
                <span v-else class="sf-aug-emoji">{{ card.aug.icon }}</span>
              </div>
              <div class="sf-aug-body">
                <span class="sf-aug-name">{{ card.aug.name }}</span>
                <span class="sf-aug-effect">{{ card.aug.effectLine }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  /* the augment deck scrolls on its own — the column itself never does */
  overflow: hidden;
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
   absolutely inside it, so this box IS the sun's footprint on the stage. */
.sf-orbit-sun {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  cursor: pointer;
  transition: filter 0.18s;
}
.sf-orbit-sun:hover {
  filter: brightness(1.12);
}

/* Dwell clock, parked in the arc's open bottom — the one place on the ring
   that carries no phase marker.
   It sizes itself off the DIAL (cqmin of the stage container), not off the
   viewport: the dial is 379px on Full HD but 710px on 2K, so a fixed px size
   that reads right on one is a speck on the other. Being absolutely placed,
   growing it moves nothing — the arc's gap is 44% of the stage wide and the
   arc ends sit at 76% height, so the box has room to spare below that. */
.sf-orbit-clock {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  /* fixed box: ticking digits never nudge the label */
  width: 116px;
  width: min(34cqmin, 100%);
  text-align: center;
  cursor: help;
}

.sf-orbit-clock-val {
  font-size: 15px;
  font-size: clamp(16px, 4.8cqmin, 44px);
  font-weight: 900;
  letter-spacing: 0.03em;
  line-height: 1.1;
  color: #e8e4d8;
  text-shadow: 0 0 8px rgba(232, 228, 216, 0.35);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-orbit-clock-val.is-met {
  color: #7ac060;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.55);
}

.sf-orbit-clock-lbl {
  font-size: 8px;
  font-size: clamp(8px, 1.5cqmin, 14px);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6a5a3a;
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

/* Marker label on hover. Names on a ring either collide or leave the stage at
   the flanks, so they only appear for the marker under the cursor — floating
   above it, and below it on the arc's lower ends where there is no headroom. */
.sf-orbit-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 11px);
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 11px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}
.sf-orbit-node.is-below .sf-orbit-tip {
  bottom: auto;
  top: calc(100% + 11px);
}
.sf-orbit-node:hover .sf-orbit-tip {
  opacity: 1;
}

.sf-orbit-tip-name {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dot-color);
}

.sf-orbit-tip-astro {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #8a7a58;
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

/* ─ Phase identity + evolve action, in one line under the dial ─
   Three blocks on a wrapping row: who the sun is, how long it has been that,
   and what it can do next. On a narrow column the row breaks instead of
   squeezing — nothing ever overlaps the dial above it. */
.sf-orbit-foot {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px clamp(14px, 3%, 28px);
  padding-bottom: 9px;
  border-bottom: 1px solid #2c1806;
}

.sf-foot-id,
.sf-foot-age {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}
.sf-foot-age {
  cursor: help;
}

.sf-kicker {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #b0a080;
  white-space: nowrap;
}

.sf-phase-name {
  font-size: 25px;
  line-height: 1.05;
  letter-spacing: 0.04em;
  color: var(--phase-primary);
  text-shadow: 0 0 10px var(--phase-glow);
  white-space: nowrap;
}

.sf-phase-astro {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8a7a58;
  white-space: nowrap;
}

.sf-solar-age {
  /* Fixed width so the ticking phase time never reflows the row */
  width: 136px;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sf-solar-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  min-width: 132px;
}

.sf-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  border-radius: 6px;
  white-space: nowrap;
  transition:
    box-shadow 0.15s,
    color 0.15s,
    border-color 0.15s,
    transform 0.12s;
}
.sf-pill--ready {
  background: rgba(26, 42, 16, 0.9);
  border: 1px solid #52b830;
  color: #8adc50;
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.35);
  cursor: pointer;
}
.sf-pill--ready:hover {
  box-shadow: 0 0 24px rgba(82, 184, 48, 0.55);
  transform: translateY(-1px);
}
.sf-pill--hint:hover {
  transform: translateY(-1px);
}
.sf-pill--max {
  background: #1e1a06;
  border: 1px solid #e8c040;
  color: #e8c040;
}
.sf-pill--wait {
  background: #16130c;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 40%, #3e200a);
  color: var(--phase-primary);
  font-variant-numeric: tabular-nums;
}
.sf-pill--hint {
  background: #16130c;
  border: 1px solid #3e200a;
  color: var(--rpg-text-dim);
  cursor: pointer;
}
.sf-pill--hint:hover {
  color: var(--phase-primary);
  border-color: #5c3310;
}

/* ─ Augment deck — the compact half of the middle column ─
   Capped to a share of the column so the dial above always keeps the larger
   half; the deck scrolls internally once the collection outgrows it. */
.sf-aug-zone {
  flex: 0 1 auto;
  min-height: 0;
  /* the absolute cap matters on 4K: 34% of a 1700px column would be a
     600px "compact" deck and the dial would stop being the centrepiece */
  max-height: min(34%, 340px);
  display: flex;
  flex-direction: column;
}

/* Rubric line — the deck's own heading, since the column header now names
   the sun. Label left, live count right, hairline underneath. */
.sf-zone-rule {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
  margin-bottom: 7px;
  border-bottom: 1px solid #2c1806;
}

.sf-zone-lbl {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-gold);
  white-space: nowrap;
}

.sf-zone-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  padding: 3px 8px;
  color: var(--rpg-text-muted);
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 4px;
  font-variant-numeric: tabular-nums;
}

.sf-aug-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.sf-buff-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-bottom: 7px;
  margin-bottom: 7px;
  border-bottom: 1px solid #241a0c;
}

.sf-empty-line {
  width: 100%;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}

.sf-chip-buff {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.sf-chip-buff-icon {
  color: #c89040;
  flex-shrink: 0;
}
.sf-chip-buff-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}
.sf-chip-buff-val {
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-chip-buff-val.is-up {
  color: var(--rpg-gold);
}
.sf-chip-buff-val.is-down {
  color: #52b830;
}

/* Horizontal augment cards in a fluid grid — each row ~44px, so even a long
   collection stays scannable in the short deck under the dial. */
.sf-aug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
  gap: 6px;
}

.sf-aug-card {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 8px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--rarity);
  border-radius: 5px;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--rarity) 8%, transparent);
  transition:
    box-shadow 0.15s,
    background 0.15s;
}
.sf-aug-card:hover {
  background: #221f18;
  box-shadow:
    inset 0 0 10px color-mix(in srgb, var(--rarity) 15%, transparent),
    0 0 8px color-mix(in srgb, var(--rarity) 30%, transparent);
}

.sf-aug-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid #2a1a08;
  border-radius: 5px;
  overflow: hidden;
  color: var(--rarity);
}
.sf-aug-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.sf-aug-emoji {
  font-size: 18px;
  line-height: 1;
}

.sf-aug-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sf-aug-name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rarity);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-aug-effect {
  font-size: 12px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The short deck has no room for a tall centred empty state, so the message
   sits on one line next to its icon. */
.sf-empty-block {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 4px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
  color: var(--rpg-text-dim);
}
.sf-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}

/* Full HD / WUXGA: the flattest viewports — a smaller dial and a tighter
   identity row, so the augment deck below still gets its rows. */
@media (max-height: 1100px) {
  .sf-orbit {
    width: min(100%, var(--orbit-max-compact));
    width: min(100%, 100cqh, var(--orbit-max-compact));
  }
  .sf-solar-body {
    gap: 8px;
  }
  .sf-phase-name {
    font-size: 21px;
  }
  .sf-solar-age {
    font-size: 17px;
    width: 124px;
  }
  /* the dwell clock is NOT stepped down here — it scales off the dial itself */
  .sf-pill {
    padding: 9px 16px;
    font-size: 13px;
  }
  .sf-orbit-foot {
    padding-bottom: 7px;
  }
  .sf-aug-zone {
    max-height: min(30%, 220px);
  }
}

/* 4K and taller: the dial has the room to become the room's centrepiece, so
   the readouts around it grow with it instead of floating in empty space. */
@media (min-height: 1600px) {
  .sf-phase-name {
    font-size: 30px;
  }
  .sf-phase-astro {
    font-size: 13px;
  }
  .sf-solar-age {
    font-size: 22px;
    width: 152px;
  }
  /* 4K leaves the dial more room than it can use, so the deck takes the slack */
  .sf-aug-zone {
    max-height: min(34%, 460px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-orbit-active,
  .sf-orbit-dot.is-current {
    animation: none;
  }
}
</style>

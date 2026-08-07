<template>
  <div class="sf-panel" :style="phaseStyle">
    <!-- ══ Phase bar ═════════════════════════════════════════════
         The sun's own progression, moved off the tree and up here where a
         header belongs. It floated over the canvas as a dock, covering the
         crown of the tree and duplicating a frame the sidebar already had.
         Built like the expedition tab's command bar: one continuous strip, the
         phase as its title, hairline-separated readouts, and the strip's bottom
         edge doubling as the dwell track it measures. -->
    <header class="sf-bar" :class="{ 'sf-bar--ready': solarStore.canUpgradeStar }">
      <!-- who the sun is right now -->
      <div class="sf-bar-title">
        <Icon :icon="phaseIcon" width="30" height="30" class="sf-bar-ico" />
        <span class="sf-phase-name">{{ phaseName }}</span>
        <span class="sf-phase-count">{{ phaseLabel }}</span>
        <span class="sf-pips">
          <span
            v-for="(phase, i) in STAR_PHASE_DATA"
            :key="phase.name"
            class="sf-pip"
            :class="{ 'sf-pip--done': !solarStore.isCometState && i <= solarStore.starPhase }"
            :style="
              !solarStore.isCometState && i <= solarStore.starPhase
                ? { background: phase.phasePrimary }
                : {}
            "
            :title="phase.name"
          />
        </span>
      </div>

      <!-- what stands between here and the next phase -->
      <p class="sf-phase-hint">
        <template v-if="solarStore.isCometState && solarStore.canUpgradeStar">
          Ignite the comet into <b class="sf-hint-key">Spark</b> — your first star.
        </template>
        <template v-else-if="isCollapsed">
          The star burned out and <b class="sf-hint-key">collapsed</b> — the tree is fully grown.
        </template>
        <template v-else-if="solarStore.canUpgradeStar">
          Evolve to <b class="sf-hint-key">{{ nextStage.name }}</b>
          <span class="sf-hint-arrow">→</span>
          <b class="sf-hint-gain">{{ nextPhaseUnlockText }}</b>
        </template>
        <template v-else-if="!solarStore.branchesReadyForEvolve">
          Grow all five core rays to Lv {{ raysRequired }} to ready the next evolution.
        </template>
        <template v-else>
          Every ray is grown — the sun only has to dwell here a while longer.
        </template>
      </p>

      <!-- the two gates, and the act they open -->
      <!-- Once the star has collapsed both gates read READY forever and neither
           opens anything — only the badge still says something true. -->
      <div class="sf-bar-gates">
        <div
          v-if="!isCollapsed"
          class="sf-read"
          :class="{ 'sf-read--live': solarStore.branchesReadyForEvolve }"
        >
          <span class="sf-read-value">
            {{ raysReady }}<span class="sf-read-cap">/{{ SOLAR_BRANCHES.length }}</span>
          </span>
          <span class="sf-read-label">Rays</span>
        </div>
        <div
          v-if="!isCollapsed"
          class="sf-read"
          :class="{ 'sf-read--live': solarStore.phaseDwellRemainingMs <= 0 }"
        >
          <span class="sf-read-value">
            {{
              solarStore.phaseDwellRemainingMs <= 0
                ? 'READY'
                : formatClock(solarStore.phaseDwellRemainingMs)
            }}
          </span>
          <span class="sf-read-label">Dwell</span>
        </div>

        <button
          v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
          class="sf-evolve"
          :disabled="solarStore.isUpgrading"
          @click="handleEvolve"
        >
          {{ evolveLabel }}
        </button>
        <span v-else-if="isCollapsed" class="sf-complete">✦ COMPLETE</span>
      </div>

      <div class="sf-bar-progress">
        <div class="sf-bar-progress-fill" :style="{ transform: `scaleX(${dwellProgress})` }" />
      </div>
    </header>

    <!-- ══ Scrolling body ════════════════════════════════════════ -->
    <div class="sf-body">
      <!-- Active blessings — running bargain buffs with countdown -->
      <div v-if="activeBuffs.length > 0" class="blessing-row">
        <div v-for="buff in activeBuffs" :key="buff.id" class="blessing-chip">
          <Icon icon="game-icons:magic-swirl" width="14" height="14" class="blessing-icon" />
          <span class="blessing-name">{{ buffLabel(buff.id) }}</span>
          <span class="blessing-time">{{ formatClock(buff.expiresAt - forgeStore.forgeNow) }}</span>
        </div>
      </div>

      <!-- ── CRAFTED RELICS ───────────────────────────────────── -->
      <section class="sf-sec">
        <header class="sf-sec-head sf-sec-head--relic">
          <Icon icon="game-icons:anvil-impact" width="20" height="20" class="sf-sec-ico" />
          <span class="sf-sec-title">Crafted Relics</span>
          <span class="sf-sec-note">fuse a grown branch with materials</span>
        </header>

        <div
          v-for="relic in FORGE_RELICS"
          :key="relic.id"
          class="relic-card"
          :class="{
            'relic-card--ready': forgeStore.canForgeRelic(relic.id),
            'relic-card--owned': forgeStore.relicLevel(relic.id) > 0,
            'relic-card--locked': !forgeStore.relicRequirementMet(relic.id) && forgeStore.relicLevel(relic.id) === 0,
          }"
        >
          <div class="relic-top">
            <div class="relic-icon-box">
              <Icon :icon="relic.icon" width="26" height="26" :style="{ color: relic.color }" />
            </div>
            <div class="relic-info">
              <div class="relic-name-row">
                <span class="relic-name" :style="{ color: relic.color }">{{ relic.name }}</span>
                <span class="rarity-chip" :class="`rarity-chip--${relic.rarity}`">
                  {{ relic.rarity.toUpperCase() }}
                </span>
              </div>
              <span class="relic-source">{{ relic.sourceLabel }}</span>
            </div>
            <span v-if="forgeStore.relicLevel(relic.id) > 0" class="level-badge">
              Lv {{ forgeStore.relicLevel(relic.id) }}
            </span>
          </div>
          <div class="relic-desc">{{ relicDesc(relic) }}</div>
          <div class="relic-cost-row">
            <template v-if="forgeStore.relicLevel(relic.id) >= relic.maxLevel">
              <span class="maxed-note">✦ MAX LEVEL</span>
            </template>
            <template v-else-if="!forgeStore.relicRequirementMet(relic.id)">
              <span class="lock-note">
                Requires {{ nodeName(relic.requiresNode) }} Lv {{ relic.requiresLevel }}
              </span>
            </template>
            <template v-else>
              <span class="cost-pair">
                <img src="/img/BardGold-128.png" class="cost-img" alt="Chimes" />
                <span class="cost-gold">{{ formatNumber(forgeStore.relicGoldCost(relic.id)) }}</span>
              </span>
              <span
                v-for="(qty, matId) in forgeStore.relicMaterialCost(relic.id)"
                :key="matId"
                class="cost-pair"
                :class="{ 'cost-pair--missing': (inventoryStore.collectedMaterials[matId] ?? 0) < qty }"
              >
                <img v-if="materialImage(matId)" :src="materialImage(matId)" class="cost-img" :alt="String(matId)" />
                <span class="cost-qty">×{{ qty }}</span>
              </span>
              <button
                class="forge-btn"
                :disabled="!forgeStore.canForgeRelic(relic.id)"
                @click="handleForgeRelic(relic)"
              >
                {{ forgeStore.relicLevel(relic.id) === 0 ? '✦ Forge' : `Upgrade → Lv ${forgeStore.relicLevel(relic.id) + 1}` }}
              </button>
            </template>
          </div>
        </div>
      </section>

      <!-- ── CONSTELLATIONS ───────────────────────────────────── -->
      <section class="sf-sec">
        <header class="sf-sec-head sf-sec-head--constellation">
          <Icon icon="game-icons:barbed-star" width="20" height="20" class="sf-sec-ico" />
          <span class="sf-sec-title">Constellations</span>
          <span class="sf-sec-count">{{ forgedCount }} / {{ FORGE_CONSTELLATIONS.length }} forged</span>
        </header>

        <div
          v-for="constellation in FORGE_CONSTELLATIONS"
          :key="constellation.id"
          class="constellation-row"
          :class="{
            'constellation-row--forged': forgeStore.constellationForged(constellation.id),
            'constellation-row--ready': forgeStore.canForgeConstellation(constellation.id),
            'constellation-row--locked':
              !forgeStore.constellationForged(constellation.id) &&
              !forgeStore.constellationRequirementMet(constellation.id),
          }"
        >
          <Icon :icon="constellation.icon" width="24" height="24" :style="{ color: constellation.color }" class="constellation-icon" />
          <div class="constellation-info">
            <div class="constellation-name" :style="{ color: constellation.color }">
              {{ constellation.name }}
            </div>
            <div class="constellation-pair">{{ constellation.pairLabel }}</div>
          </div>
          <span v-if="forgeStore.constellationForged(constellation.id)" class="forged-badge">✦ FORGED</span>
          <button
            v-else-if="forgeStore.constellationRequirementMet(constellation.id)"
            class="forge-btn forge-btn--small"
            :disabled="!forgeStore.canForgeConstellation(constellation.id)"
            :title="constellationCostTitle(constellation)"
            @click="handleForgeConstellation(constellation)"
          >
            Forge
          </button>
          <span v-else class="lock-note lock-note--tight">
            Both branches Lv {{ FORGE_CONSTELLATION_REQUIRED_LEVEL }}
          </span>
        </div>
      </section>

      <!-- ── COSMIC BARGAIN ───────────────────────────────────── -->
      <section class="sf-sec">
        <header class="sf-sec-head sf-sec-head--bargain">
          <Icon icon="game-icons:cash" width="20" height="20" class="sf-sec-ico" />
          <span v-ink-center class="sf-sec-title">Cosmic Bargain</span>
          <span class="sf-sec-count">
            restocks in {{ formatClock(forgeStore.bargainRestockRemainingMs) }}
          </span>
        </header>

        <div v-if="deal" class="bargain-card">
          <div class="bargain-shine" aria-hidden="true" />
          <div class="bargain-top">
            <div class="bargain-icon-box">
              <Icon :icon="deal.icon" width="30" height="30" class="bargain-icon" />
            </div>
            <div class="bargain-info">
              <div class="bargain-name-row">
                <span class="bargain-name">{{ deal.name }}</span>
                <span v-if="deal.discountPct > 0" class="discount-chip">−{{ Math.round(deal.discountPct * 100) }}%</span>
              </div>
              <span class="bargain-desc">{{ bargainDescLine }}</span>
            </div>
          </div>
          <div class="bargain-cost-row">
            <template v-if="forgeStore.bargainPurchased">
              <span class="sold-note">✦ SOLD — restocking…</span>
            </template>
            <template v-else>
              <span v-if="deal.discountPct > 0" class="price-struck">
                {{ formatNumber(deal.basePrice) }} G
              </span>
              <span v-if="dealPrice > 0" class="cost-pair">
                <img src="/img/BardGold-128.png" class="cost-img cost-img--big" alt="Chimes" />
                <span class="cost-gold cost-gold--big">{{ formatNumber(dealPrice) }}</span>
              </span>
              <span
                v-for="(qty, matId) in deal.kind === 'gold' ? deal.materials ?? {} : {}"
                :key="matId"
                class="cost-pair"
                :class="{ 'cost-pair--missing': (inventoryStore.collectedMaterials[matId] ?? 0) < qty }"
              >
                <img v-if="materialImage(matId)" :src="materialImage(matId)" class="cost-img" :alt="String(matId)" />
                <span class="cost-qty">×{{ qty }}</span>
              </span>
              <button class="buy-btn" :disabled="!forgeStore.canBuyBargain" @click="handleBuyBargain">
                Buy Bargain
              </button>
            </template>
            <button class="reroll-btn" :disabled="!forgeStore.canRerollBargain" @click="handleReroll">
              <Icon icon="game-icons:card-exchange" width="14" height="14" />
              Reroll · {{ FORGE_BARGAIN_REROLL_COST }}
              <img v-if="rerollMatImage" :src="rerollMatImage" class="cost-img" alt="Dark Matter" />
            </button>
          </div>
        </div>

        <!-- Placeholder while no deal is stocked (e.g. right after a save migration) -->
        <div v-else class="bargain-card bargain-card--empty">
          <div class="bargain-top">
            <div class="bargain-icon-box bargain-icon-box--empty">
              <Icon icon="game-icons:night-sky" width="28" height="28" class="bargain-icon-empty" />
            </div>
            <div class="bargain-info">
              <span class="bargain-name bargain-name--empty">The merchant drifts between stars…</span>
              <span class="bargain-desc">A new bargain arrives with the next restock.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatClock } from '@/utils/ui/format'
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore, type SolarBranchId } from '@/stores/progression/solarUpgradeStore'
import { useSunPhaseDisplay } from '@/composables/orbit/useSunPhaseDisplay'
import { MATERIALS } from '@/config/economy/materials'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  getForgeNode,
} from '@/config/progression/starForge'
import {
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_BARGAIN_REROLL_COST,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  SOLAR_BRANCHES,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  COMET_PHASE_DATA,
} from '@/config/constants'
import { formatNumber } from '@/config/ui/numberFormat'
import { useActionToast } from '@/composables/ui/useActionToast'
import type { ForgeRelicDef, ForgeConstellationDef, ForgeActiveBuff } from '@/types'

const inventoryStore = useInventoryStore()
const forgeStore = useStarForgeStore()
const solarStore = useSolarUpgradeStore()
const { phaseLabel } = useSunPhaseDisplay()
const { showToast } = useActionToast()

// ── Sun phase header ─────────────────────────────────────────────────────────
/** Endphase: der Stern ist kollabiert — nichts wächst mehr. */
const isCollapsed = computed(
  () => !solarStore.isCometState && solarStore.starPhase >= STAR_PHASE_FINAL_INDEX,
)

const currentStage = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
/** Solange Komet, ist das nächste Ziel Spark (Phase 0). */
const nextStage = computed(() =>
  solarStore.isCometState
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, STAR_PHASE_DATA.length - 1)],
)

const phaseName = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA.name : currentStage.value.name,
)

const phaseIcon = computed(() => {
  if (solarStore.isCometState) return 'game-icons:asteroid'
  if (isCollapsed.value) return 'game-icons:black-hole-bolas'
  return 'game-icons:sunbeams'
})

/** Die Kopfleiste trägt die Farbe der laufenden Phase — dieselbe Quelle, aus
 *  der auch die Sonne im Baum-Panel ihren Verlauf zieht. */
const phaseStyle = computed(() => ({
  '--ph-c': solarStore.isCometState ? COMET_PHASE_DATA.accent : currentStage.value.phasePrimary,
  '--ph-glow': solarStore.isCometState ? COMET_PHASE_DATA.glow : currentStage.value.phaseGlow,
}))

/** Stufe, auf die alle fünf Strahlen für das nächste Evolve müssen. */
const raysRequired = computed(() => (solarStore.isCometState ? 1 : solarStore.starPhase + 1))

/** Wie viele der fünf schon dort sind — die Zahl, die das Evolve blockiert. */
const raysReady = computed(
  () =>
    SOLAR_BRANCHES.filter(
      (b) => solarStore.branchLevel(b.id as SolarBranchId) >= raysRequired.value,
    ).length,
)

/** Anteil der abgesessenen Verweildauer — treibt die Unterkante der Leiste. */
const dwellProgress = computed(() => {
  const required = solarStore.phaseDwellRequiredMs
  if (required <= 0) return 1
  return Math.min(1, solarStore.phaseDwellElapsedMs / required)
})

const nextPhaseUnlockText = computed(() => {
  const nextPhase = solarStore.starPhase + 1
  if (nextPhase === FORGE_BRANCH_UNLOCK_PHASE) return '10 new branches open on the tree'
  if (nextPhase === FORGE_LEAF_UNLOCK_PHASE) return '10 leaves open on the tree'
  return 'branches gain +1 max level'
})

const evolveLabel = computed(() => {
  if (solarStore.isUpgrading) return solarStore.isCometState ? 'Igniting…' : 'Evolving…'
  return solarStore.isCometState ? '✦ Ignite' : '✦ Evolve'
})

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

// ── Active blessings (running bargain buffs) ─────────────────────────────────
const activeBuffs = computed(() =>
  forgeStore.activeBuffs.filter((b) => b.expiresAt > forgeStore.forgeNow),
)

function buffLabel(id: ForgeActiveBuff['id']): string {
  return id === 'cpcX2' ? '2× Chimes / Click' : '2× Chimes / Sec'
}

// ── Relics ────────────────────────────────────────────────────────────────────
function relicDesc(relic: ForgeRelicDef): string {
  const level = Math.max(1, forgeStore.relicLevel(relic.id))
  return relic.desc.replace('{v}', String(level * relic.effectPerLevel))
}

function nodeName(nodeId: string): string {
  return getForgeNode(nodeId)?.name ?? nodeId
}

function materialImage(matId: string): string | undefined {
  return MATERIALS.find((m) => m.id === matId)?.image
}

function handleForgeRelic(relic: ForgeRelicDef): void {
  if (forgeStore.forgeRelic(relic.id)) {
    showToast(`${relic.name} forged — Lv ${forgeStore.relicLevel(relic.id)}!`, 'forge')
  }
}

// ── Constellations ────────────────────────────────────────────────────────────
const forgedCount = computed(() => forgeStore.forgedConstellations.length)

function constellationCostTitle(constellation: ForgeConstellationDef): string {
  const mats = Object.entries(constellation.materialCost)
    .map(([matId, qty]) => `${qty}× ${MATERIALS.find((m) => m.id === matId)?.name ?? matId}`)
    .join(', ')
  return `${formatNumber(constellation.goldCost)} G · ${mats}`
}

function handleForgeConstellation(constellation: ForgeConstellationDef): void {
  if (forgeStore.forgeConstellation(constellation.id)) {
    showToast(`Constellation forged: ${constellation.name}!`, 'forge')
  }
}

// ── Cosmic Bargain ────────────────────────────────────────────────────────────
const deal = computed(() => forgeStore.activeDeal)
const dealPrice = computed(() => (deal.value ? forgeStore.bargainPrice(deal.value) : 0))

const bargainDescLine = computed(() => {
  if (!deal.value) return ''
  const cache =
    deal.value.kind === 'materials' && deal.value.materials
      ? ' ' +
        Object.entries(deal.value.materials)
          .map(([matId, qty]) => `${qty}× ${MATERIALS.find((m) => m.id === matId)?.name ?? matId}`)
          .join(', ') +
        '.'
      : ''
  return `Today only · ${deal.value.desc}${cache}`
})

const rerollMatImage = computed(() =>
  MATERIALS.find((m) => m.id === FORGE_BARGAIN_REROLL_MATERIAL)?.image,
)

function handleBuyBargain(): void {
  const name = deal.value?.name ?? 'Bargain'
  if (forgeStore.buyBargain()) {
    showToast(`${name} purchased!`, 'purchase')
  }
}

function handleReroll(): void {
  if (forgeStore.rerollBargain()) {
    showToast('Bargain rerolled!', 'info')
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
   Same surface the role detail page opens onto (#111008, the flat deep base)
   with the same 2px seam — a sidebar in this game reads as one kind of place,
   not one per tab. The old #1a1008 made the forge look like a third surface
   next to the shop frame and the team rail.
══════════════════════════════════════════════════ */
.sf-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #111008;
  border-left: 2px solid #5c3310;
}

/* ══════════════════════════════════════════════════
   PHASE BAR
══════════════════════════════════════════════════ */
/* Three stacked lines, not one strip: at the sidebar's 440px the identity, the
   sentence and the two gates cannot share a row without the phase name being
   squeezed to an ellipsis. Stacked, each line keeps its full reading width and
   the header still closes on a single edge. */
.sf-bar {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px 13px;
  background: linear-gradient(180deg, #1e1006 0%, #16100a 100%);
  border-bottom: 2px solid #3e200a;
  transition: border-color 0.3s ease;
}

.sf-bar--ready {
  border-bottom-color: #4a8a28;
}

.sf-bar-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* Glow instead of a frame — the phase reads as an emblem, not a button. */
.sf-bar-ico {
  flex-shrink: 0;
  color: var(--ph-c, #e8c040);
  filter: drop-shadow(0 0 10px var(--ph-glow, rgba(232, 192, 64, 0.4)));
}

.sf-phase-name {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: var(--ph-c, #e8c040);
  text-shadow: 0 0 14px var(--ph-glow, rgba(232, 192, 64, 0.3));
}

.sf-phase-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  white-space: nowrap;
  color: rgba(200, 144, 64, 0.5);
  font-variant-numeric: tabular-nums;
}

/* One tick per star phase — the whole ladder at a glance, six marks wide. */
.sf-pips {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sf-pip {
  width: 13px;
  height: 4px;
  border-radius: 2px;
  background: #241708;
  border: 1px solid #3e200a;
}

.sf-pip--done {
  border-color: transparent;
}

.sf-phase-hint {
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.4;
  color: rgba(200, 144, 64, 0.6);
}

.sf-hint-key {
  color: #ffb347;
}

.sf-hint-arrow {
  color: rgba(200, 144, 64, 0.35);
  padding: 0 2px;
}

.sf-hint-gain {
  color: #7ad0a0;
}

/* ── Gates: hairline-separated readouts, never boxed ─────────── */
.sf-bar-gates {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.sf-read {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 5px;
  min-width: 64px;
  padding: 1px 14px;
  border-left: 1px solid #402a12;
}

.sf-read:first-child {
  border-left: 0;
  padding-left: 2px;
}

.sf-read-value {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  color: #e8dcc0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: color 0.2s;
}

.sf-read-cap {
  font-size: 12px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.42);
}

.sf-read-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  line-height: 1;
}

.sf-read--live .sf-read-value {
  color: #a0f0d0;
}

.sf-read--live .sf-read-label {
  color: rgba(160, 240, 208, 0.6);
}

.sf-evolve {
  position: relative;
  margin-left: auto;
  align-self: center;
  flex-shrink: 0;
  padding: 9px 15px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
}

/* The call to act breathes on its OWN layer — the glow stands still in CSS and
   only its opacity animates. Pulsing the button's box-shadow directly would
   re-raster the box every frame, which is exactly what the tree panel's node
   ring was rebuilt away from. */
.sf-evolve::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 5px;
  box-shadow: 0 0 16px 2px rgba(140, 240, 110, 0.8);
  pointer-events: none;
  animation: sf-evolve-breathe 2s ease-in-out infinite;
}

@keyframes sf-evolve-breathe {
  0%, 100% { opacity: 0.28; }
  50% { opacity: 0.9; }
}

.sf-evolve:hover:not(:disabled) {
  filter: brightness(1.12);
}

.sf-evolve:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.sf-evolve:disabled::after {
  display: none;
}

.sf-complete {
  margin-left: auto;
  align-self: center;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.4);
  border-radius: 4px;
  padding: 5px 9px;
}

/* The bar's own bottom edge, doubling as the dwell track. */
.sf-bar-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  overflow: hidden;
  pointer-events: none;
}

.sf-bar-progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, var(--ph-c, #c89040) 55%, #e8c060);
  transition: transform 0.45s ease;
}

/* ══════════════════════════════════════════════════
   BODY
══════════════════════════════════════════════════ */
.sf-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.sf-body::-webkit-scrollbar {
  width: 4px;
}

.sf-body::-webkit-scrollbar-track {
  background: #111;
}

.sf-body::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

/* Cards must never be squashed by the flex column — children with
   overflow:hidden (e.g. the bargain card) would otherwise shrink to a sliver. */
.sf-body > *,
.sf-sec > * {
  flex-shrink: 0;
}

.sf-sec {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

/* ══════════════════════════════════════════════════
   SECTION HEADS
   The rule under the title fades out to the right — the same underline the
   expedition columns use, so a section head means the same thing in both tabs.
══════════════════════════════════════════════════ */
.sf-sec-head {
  --sec-c: #e8c040;
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 2px 8px;
}

.sf-sec-head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--sec-c),
    color-mix(in srgb, var(--sec-c) 35%, transparent) 55%,
    transparent
  );
}

.sf-sec-head--relic {
  --sec-c: #e8a020;
}

.sf-sec-head--constellation {
  --sec-c: #86d0ff;
}

.sf-sec-head--bargain {
  --sec-c: #e8c040;
}

.sf-sec-ico {
  align-self: center;
  flex-shrink: 0;
  color: var(--sec-c);
}

.sf-sec-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  color: var(--sec-c);
}

.sf-sec-note {
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.35);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sf-sec-count {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--sec-c) 65%, transparent);
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   ACTIVE BLESSINGS
══════════════════════════════════════════════════ */
.blessing-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.blessing-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(150, 80, 220, 0.1);
  border: 1px solid rgba(150, 80, 220, 0.35);
  border-radius: 4px;
}

.blessing-icon {
  color: #c9a0ff;
  flex-shrink: 0;
}

.blessing-name {
  font-size: 11px;
  font-weight: 900;
  color: #c9a0ff;
}

.blessing-time {
  font-size: 10px;
  font-weight: 700;
  color: rgba(201, 160, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   RELIC CARDS
══════════════════════════════════════════════════ */
.relic-card {
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.relic-card:not(.relic-card--locked):hover {
  border-color: #7a4e20;
  transform: translateY(-1px);
}

.relic-card--ready {
  border-color: #c89040;
  animation: sf-ready 2s ease-in-out infinite;
}

.relic-card--owned:not(.relic-card--ready) {
  border-color: #4a8a28;
  box-shadow: inset 0 0 22px rgba(82, 184, 48, 0.1);
}

.relic-card--locked {
  opacity: 0.5;
  filter: grayscale(55%);
}

.relic-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.relic-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #5c3310;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.relic-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.relic-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.relic-name {
  font-size: 14px;
  font-weight: 900;
}

.rarity-chip {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
}

.rarity-chip--epic {
  color: #c9a0ff;
  background: rgba(150, 80, 220, 0.15);
  border: 1px solid rgba(150, 80, 220, 0.4);
}

.rarity-chip--rare {
  color: #7bb8ff;
  background: rgba(74, 144, 217, 0.15);
  border: 1px solid rgba(74, 144, 217, 0.4);
}

.relic-source {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.level-badge {
  font-size: 10px;
  font-weight: 900;
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.4);
  border-radius: 3px;
  padding: 3px 8px;
  flex-shrink: 0;
}

.relic-desc {
  font-size: 11px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.62);
}

.relic-cost-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ══════════════════════════════════════════════════
   COST DISPLAY (shared)
══════════════════════════════════════════════════ */
.cost-pair {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.cost-pair--missing .cost-qty {
  color: #cc6050;
}

.cost-img {
  height: 15px;
  width: auto;
  object-fit: contain;
}

.cost-img--big {
  width: 16px;
  height: 16px;
}

.cost-gold {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
}

.cost-gold--big {
  font-size: 14px;
}

.cost-qty {
  font-size: 11px;
  font-weight: 900;
  color: #e8d8b0;
}

.maxed-note {
  font-size: 11px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 1px;
}

.lock-note {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 200, 80, 0.55);
}

.lock-note--tight {
  flex-shrink: 0;
  text-align: right;
}

.sold-note {
  font-size: 11px;
  font-weight: 900;
  color: rgba(160, 255, 160, 0.7);
  letter-spacing: 0.5px;
}

/* ══════════════════════════════════════════════════
   BUTTONS
══════════════════════════════════════════════════ */
.forge-btn {
  margin-left: auto;
  padding: 7px 16px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.forge-btn--small {
  padding: 6px 14px;
  font-size: 11px;
  margin-left: 0;
  flex-shrink: 0;
}

.forge-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

.forge-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   CONSTELLATIONS
══════════════════════════════════════════════════ */
.constellation-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  transition: border-color 0.2s ease;
}

.constellation-row:not(.constellation-row--locked):hover {
  border-color: #7a4e20;
}

.constellation-row--forged {
  background: #101a14;
  border-color: #4a8a28;
}

.constellation-row--ready {
  border-color: #c89040;
  animation: sf-ready 2s ease-in-out infinite;
}

.constellation-row--locked {
  opacity: 0.5;
  filter: grayscale(55%);
}

.constellation-icon {
  flex-shrink: 0;
}

.constellation-info {
  flex: 1;
  min-width: 0;
}

.constellation-name {
  font-size: 13px;
  font-weight: 900;
}

.constellation-pair {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.forged-badge {
  font-size: 10px;
  font-weight: 900;
  color: #a0ffa0;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   COSMIC BARGAIN
══════════════════════════════════════════════════ */
.bargain-card {
  position: relative;
  border-radius: 4px;
  border: 1px solid #7a4e20;
  padding: 13px;
  background: linear-gradient(120deg, #1c130a, #241608);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bargain-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255, 225, 150, 0.14) 50%, transparent 70%);
  background-size: 220% 100%;
  animation: sf-shine 4.5s ease-in-out infinite;
  pointer-events: none;
}

.bargain-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.bargain-card--empty {
  border-color: #3e200a;
  background: #1c1c18;
}

.bargain-icon-box.bargain-icon-box--empty {
  background: #141410;
  border-color: #3e200a;
  box-shadow: none;
}

.bargain-icon-empty {
  color: rgba(255, 255, 255, 0.3);
}

.bargain-name.bargain-name--empty {
  color: rgba(255, 223, 128, 0.55);
  font-size: 13px;
}

.bargain-icon-box {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  background: radial-gradient(circle at 40% 35%, #ffe6a0, #c88018 75%);
  border: 1px solid #e8c060;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.4);
}

.bargain-icon {
  color: #3a2408;
}

.bargain-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.bargain-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.bargain-name {
  font-size: 15px;
  font-weight: 900;
  color: #ffdf80;
}

.discount-chip {
  font-size: 9px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 3px;
  color: #08130a;
  background: #e8a020;
}

.bargain-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}

.bargain-cost-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.price-struck {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: line-through;
}

.buy-btn {
  margin-left: auto;
  padding: 7px 16px;
  border: 1px solid #e8c060;
  border-radius: 4px;
  background: linear-gradient(to bottom, #e8c040, #b8860a);
  color: #2a1a04;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.buy-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.buy-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.reroll-btn {
  padding: 7px 12px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1e1006;
  color: #c9a0ff;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reroll-btn:hover:not(:disabled) {
  border-color: #7a4e20;
}

.reroll-btn:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   SHARED ANIMATIONS
══════════════════════════════════════════════════ */
@keyframes sf-ready {
  0%, 100% {
    box-shadow: 0 0 14px rgba(200, 144, 64, 0.4);
    border-color: #c89040;
  }
  50% {
    box-shadow: 0 0 26px rgba(232, 200, 80, 0.75);
    border-color: #e8c060;
  }
}

@keyframes sf-shine {
  0% { background-position: -140% 0; }
  60%, 100% { background-position: 240% 0; }
}

/* Stacked layout (below every desktop reference) — the tree carries the seam
   as its bottom edge there, so the panel drops its own. */
@media (max-width: 900px) {
  .sf-panel {
    border-left: none;
  }
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD is the flattest viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .sf-bar {
    gap: 7px;
    padding: 9px 12px 10px;
  }

  .sf-phase-name {
    font-size: 15px;
  }

  .sf-read {
    min-width: 58px;
    padding: 1px 11px;
  }

  .sf-body {
    padding: 11px 13px 18px;
    gap: 14px;
  }
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .relic-card--ready,
  .constellation-row--ready,
  .sf-evolve::after,
  .bargain-shine {
    animation: none;
  }
}
</style>

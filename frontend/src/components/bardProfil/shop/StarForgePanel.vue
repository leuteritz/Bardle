<template>
  <div class="forge-panel">
    <!-- Header -->
    <div class="forge-header">
      <span class="forge-title">THE STAR FORGE</span>
      <span class="forge-tagline">Grow the tree outward. Craft its light into legend.</span>
    </div>

    <!-- Currency chips -->
    <div class="chip-row">
      <div class="chip">
        <img src="/img/BardGold.png" class="chip-img chip-img--gold" alt="Chimes" />
        <span class="chip-value chip-value--gold">{{ formatNumber(gameStore.chimes) }}</span>
      </div>
      <div
        v-for="mat in MATERIALS"
        :key="mat.id"
        class="chip"
        :class="{ 'chip--empty': (inventoryStore.collectedMaterials[mat.id] ?? 0) === 0 }"
        :title="mat.name"
      >
        <img v-if="mat.image" :src="mat.image" class="chip-img" :alt="mat.name" />
        <span class="chip-value" :style="{ color: MATERIAL_CHIP_COLORS[mat.id] }">
          {{ inventoryStore.collectedMaterials[mat.id] ?? 0 }}
        </span>
      </div>
    </div>

    <!-- Phase status banner -->
    <div class="phase-banner" :class="{ 'phase-banner--ready': solarStore.canUpgradeStar }">
      <Icon
        :icon="solarStore.isCometState ? 'game-icons:asteroid' : 'game-icons:sunbeams'"
        width="30"
        height="30"
        class="phase-banner-icon"
      />
      <div class="phase-banner-body">
        <div class="phase-banner-title-row">
          <span
            class="phase-name"
            :style="{ color: solarStore.isCometState ? COMET_PHASE_DATA.accent : currentStage.phasePrimary }"
          >
            {{ solarStore.isCometState ? COMET_PHASE_DATA.name : currentStage.name }}
          </span>
          <span class="phase-count">
            {{
              solarStore.isCometState
                ? `Phase 1 / ${SUN_PHASE_DISPLAY_TOTAL}`
                : `Phase ${solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET} / ${SUN_PHASE_DISPLAY_TOTAL}`
            }}
          </span>
        </div>
        <div v-if="solarStore.isCometState && solarStore.canUpgradeStar" class="phase-hint">
          Ignite the comet into <b class="phase-hint-next">Spark</b> — your first star.
        </div>
        <div v-else-if="solarStore.isCometState && !solarStore.branchesReadyForEvolve" class="phase-hint">
          Grow all five core rays to Lv 1 to ready the Ignition —
          <b class="phase-hint-next">{{ solarStore.cometStage }} / 5 kindled</b>
        </div>
        <div v-else-if="solarStore.isCometState" class="phase-hint">
          The comet must drift a while longer — ready in
          <b class="phase-hint-next">{{ formatDuration(solarStore.phaseDwellRemainingMs) }}</b>
        </div>
        <div v-else-if="solarStore.starPhase >= STAR_PHASE_DATA.length - 1" class="phase-hint">
          The sun has reached its <b class="phase-hint-next">Finale</b> — the tree is fully grown.
        </div>
        <div v-else-if="solarStore.canUpgradeStar" class="phase-hint">
          Evolve to <b class="phase-hint-next">{{ nextStage.name }}</b> to advance the tree —
          <b class="phase-hint-unlock">{{ nextPhaseUnlockText }}</b>
        </div>
        <div v-else-if="!solarStore.branchesReadyForEvolve" class="phase-hint">
          Grow all five core rays to Lv {{ solarStore.starPhase + 1 }} to ready the next evolution.
        </div>
        <div v-else class="phase-hint">
          The sun must dwell in this phase — ready in
          <b class="phase-hint-next">{{ formatDuration(solarStore.phaseDwellRemainingMs) }}</b>
        </div>
      </div>
      <button
        v-if="solarStore.canUpgradeStar || solarStore.isUpgrading"
        class="evolve-btn"
        :disabled="solarStore.isUpgrading"
        @click="handleEvolve"
      >
        {{
          solarStore.isUpgrading
            ? solarStore.isCometState ? 'Igniting…' : 'Evolving…'
            : solarStore.isCometState ? '✦ Ignite' : '✦ Evolve'
        }}
      </button>
      <span v-else-if="solarStore.starPhase >= STAR_PHASE_DATA.length - 1" class="ready-badge">✦ COMPLETE</span>
    </div>

    <!-- Phase progress pips -->
    <div class="phase-pips">
      <span
        v-for="(phase, i) in STAR_PHASE_DATA"
        :key="phase.name"
        class="phase-pip"
        :class="{ 'phase-pip--done': !solarStore.isCometState && i <= solarStore.starPhase }"
        :style="!solarStore.isCometState && i <= solarStore.starPhase ? { background: phase.phasePrimary, boxShadow: `0 0 5px ${phase.phaseGlow}` } : {}"
        :title="phase.name"
      />
    </div>

    <!-- ── CRAFTED RELICS ─────────────────────────────────────────────────── -->
    <div class="section-head">
      <Icon icon="game-icons:anvil-impact" width="18" height="18" class="section-icon section-icon--relic" />
      <span class="section-title section-title--relic">CRAFTED RELICS</span>
      <span class="section-sub">— fuse a grown branch with materials</span>
    </div>

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
            <img src="/img/BardGold.png" class="cost-img" alt="Chimes" />
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

    <!-- ── CONSTELLATIONS ─────────────────────────────────────────────────── -->
    <div class="section-head">
      <Icon icon="game-icons:barbed-star" width="18" height="18" class="section-icon section-icon--constellation" />
      <span class="section-title section-title--constellation">CONSTELLATIONS</span>
      <span class="section-count">{{ forgedCount }} / {{ FORGE_CONSTELLATIONS.length }} FORGED</span>
    </div>

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

    <!-- ── COSMIC BARGAIN ─────────────────────────────────────────────────── -->
    <div class="section-head">
      <Icon icon="game-icons:cash" width="18" height="18" class="section-icon section-icon--bargain" />
      <span class="section-title section-title--bargain">COSMIC BARGAIN</span>
      <span class="section-count section-count--bargain">
        restocks in {{ formatDuration(forgeStore.bargainRestockRemainingMs) }}
      </span>
    </div>

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
            <img src="/img/BardGold.png" class="cost-img cost-img--big" alt="Chimes" />
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/starForgeStore'
import { MATERIALS } from '@/config/materials'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  getForgeNode,
} from '@/config/starForge'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_BARGAIN_REROLL_COST,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  SUN_PHASE_DISPLAY_OFFSET,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'
import { formatNumber } from '@/config/numberFormat'
import { useActionToast } from '@/composables/useActionToast'
import type { ForgeRelicDef, ForgeConstellationDef } from '@/types'

const gameStore = useGameStore()
const inventoryStore = useInventoryStore()
const solarStore = useSolarUpgradeStore()
const forgeStore = useStarForgeStore()
const { showToast } = useActionToast()

/** Chip text colors per material — tuned to each material's artwork. */
const MATERIAL_CHIP_COLORS: Record<string, string> = {
  stardust: '#f0d878',
  moon_crystal: '#a8d8ff',
  nebula_quartz: '#86d0ff',
  solar_essence: '#ffb860',
  void_shard: '#b98cff',
  dark_matter: '#c060ff',
}

// ── Phase banner ──────────────────────────────────────────────────────────────
const currentStage = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
/** While still a comet, the next evolution target is Spark (phase 0). */
const nextStage = computed(() =>
  solarStore.isCometState
    ? STAR_PHASE_DATA[0]
    : STAR_PHASE_DATA[Math.min(solarStore.starPhase + 1, STAR_PHASE_DATA.length - 1)],
)

const nextPhaseUnlockText = computed(() => {
  const nextPhase = solarStore.starPhase + 1
  if (nextPhase === FORGE_BRANCH_UNLOCK_PHASE) return '10 new branches open on the tree'
  if (nextPhase === FORGE_LEAF_UNLOCK_PHASE) return '10 leaves open on the tree'
  return 'branches gain +1 max level'
})

function handleEvolve(): void {
  if (!solarStore.canUpgradeStar) return
  const wasComet = solarStore.isCometState
  const targetName = nextStage.value.name
  solarStore.upgradeStar()
  showToast(wasComet ? `The comet ignites into ${targetName}…` : `Star evolving to ${targetName}…`)
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
    showToast(`${relic.name} forged — Lv ${forgeStore.relicLevel(relic.id)}!`)
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
    showToast(`Constellation forged: ${constellation.name}!`)
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
    showToast(`${name} purchased!`)
  }
}

function handleReroll(): void {
  if (forgeStore.rerollBargain()) {
    showToast('Bargain rerolled!')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════════ */
.forge-panel {
  height: 100%;
  overflow-y: auto;
  padding: 18px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #1a1008;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

/* ══════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════ */
.forge-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.forge-title {
  font-size: 21px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 1px;
}

.forge-tagline {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* ══════════════════════════════════════════════════
   CURRENCY CHIPS
══════════════════════════════════════════════════ */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #1e1006;
  border: 1px solid #5c3310;
  border-radius: 4px;
}

.chip--empty {
  opacity: 0.45;
}

.chip-img {
  height: 15px;
  width: auto;
  object-fit: contain;
}

.chip-img--gold {
  width: 18px;
  height: 18px;
}

.chip-value {
  font-size: 12px;
  font-weight: 900;
}

.chip-value--gold {
  color: #e8c040;
}

/* ══════════════════════════════════════════════════
   PHASE BANNER
══════════════════════════════════════════════════ */
.phase-banner {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 13px;
  background: linear-gradient(120deg, #16120c, #100d07);
  border: 2px solid #5c3310;
  border-radius: 4px;
}

.phase-banner--ready {
  background: linear-gradient(120deg, #12160c, #0d1207);
  border-color: #4a8a28;
  box-shadow: inset 0 0 22px rgba(82, 184, 48, 0.1);
}

.phase-banner-icon {
  color: #8fe060;
  flex-shrink: 0;
}

.phase-banner:not(.phase-banner--ready) .phase-banner-icon {
  color: #c89040;
}

.phase-banner-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.phase-banner-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phase-name {
  font-size: 14px;
  font-weight: 900;
}

.phase-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.phase-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}

.phase-hint-next {
  color: #ffb347;
}

.phase-hint-unlock {
  color: #8fe060;
}

.ready-badge {
  font-size: 10px;
  font-weight: 900;
  color: #a0ffa0;
  background: rgba(82, 184, 48, 0.15);
  border: 1px solid rgba(82, 184, 48, 0.4);
  border-radius: 3px;
  padding: 4px 9px;
  flex-shrink: 0;
}

.evolve-btn {
  padding: 8px 16px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  animation: sf-ready 2s ease-in-out infinite;
}

.evolve-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  animation: none;
}

/* ══════════════════════════════════════════════════
   PHASE PIPS
══════════════════════════════════════════════════ */
.phase-pips {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 2px;
}

.phase-pip {
  flex: 1;
  height: 5px;
  border-radius: 2px;
  background: #2a1a08;
  border: 1px solid #3e200a;
}

.phase-pip--done {
  border: none;
}

/* ══════════════════════════════════════════════════
   SECTION HEADERS
══════════════════════════════════════════════════ */
.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.section-icon--relic {
  color: #e8a020;
}

.section-icon--constellation {
  color: #86d0ff;
}

.section-icon--bargain {
  color: #e8c040;
}

.section-title {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.section-title--relic {
  color: #e8a020;
}

.section-title--constellation {
  color: #86d0ff;
}

.section-title--bargain {
  color: #e8c040;
}

.section-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
}

.section-count {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  color: rgba(134, 208, 255, 0.7);
}

.section-count--bargain {
  color: rgba(255, 200, 80, 0.7);
}

/* ══════════════════════════════════════════════════
   RELIC CARDS
══════════════════════════════════════════════════ */
.relic-card {
  background: #16140e;
  border: 2px solid #3e200a;
  border-radius: 4px;
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  opacity: 0.55;
  filter: grayscale(35%);
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
  background: #12100a;
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
  padding: 9px 12px;
  background: #16140e;
  border: 2px solid #3e200a;
  border-radius: 4px;
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
  opacity: 0.55;
  filter: grayscale(35%);
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
  border: 2px solid #7a4e20;
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
    box-shadow: inset 0 0 0 1px #3e200a, 0 0 14px rgba(200, 144, 64, 0.4);
    border-color: #c89040;
  }
  50% {
    box-shadow: inset 0 0 0 1px #3e200a, 0 0 26px rgba(232, 200, 80, 0.75);
    border-color: #e8c060;
  }
}

@keyframes sf-shine {
  0% { background-position: -140% 0; }
  60%, 100% { background-position: 240% 0; }
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .relic-card--ready,
  .constellation-row--ready,
  .evolve-btn,
  .bargain-shine {
    animation: none;
  }
}
</style>

<template>
  <div class="sf-panel">
    <!-- ══ Section tabs ══════════════════════════════════════════
         Three sections stacked in a 440px column meant scrolling past two of
         them to reach the third. As tabs each one owns the full height — which
         is what pays for the larger type below. The badge counts only what can
         be ACTED on right now, so a closed tab still says "there is something
         for you here". -->
    <nav class="sf-tabs" role="tablist" aria-label="Star Forge sections">
      <button
        v-for="sec in FORGE_PANEL_SECTIONS"
        :key="sec.id"
        class="sf-tab"
        :class="{ 'sf-tab--on': activeSection === sec.id }"
        :style="{ '--tab-c': sec.accent }"
        role="tab"
        :aria-selected="activeSection === sec.id"
        @click="selectSection(sec.id)"
      >
        <span class="sf-tab-ico-wrap">
          <Icon :icon="sec.icon" width="23" height="23" class="sf-tab-ico" />
          <span v-if="readyCounts[sec.id] > 0" class="sf-tab-badge">{{ readyCounts[sec.id] }}</span>
        </span>
        <span v-ink-center class="sf-tab-label">{{ sec.label }}</span>
      </button>
    </nav>

    <!-- Running bargain buffs stay above the fold whatever tab is open — they
         are the only thing on this panel with a clock on it. -->
    <div v-if="activeBuffs.length > 0" class="sf-buffs">
      <div v-for="buff in activeBuffs" :key="buff.id" class="blessing-chip">
        <Icon icon="ph:sparkle-fill" width="17" height="17" class="blessing-icon" />
        <span class="blessing-name">{{ buffLabel(buff.id) }}</span>
        <span class="blessing-time">{{ formatClock(buff.expiresAt - forgeStore.forgeNow) }}</span>
      </div>
    </div>

    <!-- ══ Scrolling body ════════════════════════════════════════ -->
    <div class="sf-body">
      <!-- ── CRAFTED RELICS ───────────────────────────────────── -->
      <template v-if="activeSection === 'relics'">
        <div class="sf-meta">
          <span class="sf-meta-main">
            <b>{{ relicsForged }}</b> of {{ FORGE_RELICS.length }} relics forged
          </span>
          <span v-if="readyCounts.relics > 0" class="sf-meta-live">
            {{ readyCounts.relics }} ready
          </span>
        </div>

        <template v-for="view in relicViews" :key="view.def.id">
          <!-- Locked and maxed relics have nothing to decide — they collapse to
               one line so the cards that DO want a decision stand alone. -->
          <div v-if="!view.reqMet" class="rr rr--locked" :title="view.desc">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="rr-body">
              <span class="rr-name">{{ view.def.name }}</span>
              <span class="rr-meta">
                <Icon icon="lucide:lock" width="14" height="14" />
                Grow {{ view.reqNodeName }} to Lv {{ view.reqNeed }}
              </span>
            </div>
            <span class="rr-num">{{ view.reqHave }}/{{ view.reqNeed }}</span>
            <div class="rr-track">
              <i :style="{ transform: `scaleX(${view.reqProgress})` }" />
            </div>
          </div>

          <div v-else-if="view.maxed" class="rr rr--max" :title="view.desc">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="rr-body">
              <span class="rr-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
              <span class="rr-meta rr-meta--gain">{{ view.desc }}</span>
            </div>
            <span class="rr-max-badge">✦ MAX</span>
          </div>

          <article v-else class="rc" :class="{ 'rc--ready': view.ready, 'rc--owned': view.level > 0 }">
            <div v-if="view.ready" class="rc-glow" aria-hidden="true" />

            <header class="rc-head">
              <div class="rc-ico">
                <Icon :icon="view.def.icon" width="34" height="34" :style="{ color: view.def.color }" />
              </div>
              <div class="rc-id">
                <div class="rc-name-row">
                  <span class="rc-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
                  <span class="rarity-chip" :class="`rarity-chip--${view.def.rarity}`">
                    {{ view.def.rarity.toUpperCase() }}
                  </span>
                </div>
                <div class="rc-lvl-row">
                  <span class="rc-pips">
                    <i
                      v-for="step in view.maxLevel"
                      :key="step"
                      class="rc-pip"
                      :class="{ 'rc-pip--on': step <= view.level }"
                    />
                  </span>
                  <span class="rc-lvl">Lv {{ view.level }} / {{ view.maxLevel }}</span>
                </div>
              </div>
            </header>

            <p class="rc-desc">{{ view.desc }}</p>

            <!-- What the next strike actually buys — the one number the old
                 card never showed. -->
            <div class="rc-delta">
              <div class="rc-delta-cell">
                <span class="rc-delta-label">Now</span>
                <span class="rc-delta-value">{{ view.nowText }}</span>
              </div>
              <span class="rc-delta-arrow">→</span>
              <div class="rc-delta-cell rc-delta-cell--next">
                <span class="rc-delta-label">After forging</span>
                <span class="rc-delta-value rc-delta-value--next">{{ view.nextText }}</span>
              </div>
            </div>

            <div class="cost-row">
              <span class="cost-pair" :class="{ 'cost-pair--missing': !view.goldOk }">
                <img src="/img/BardGold-128.png" class="cost-img" alt="Chimes" />
                <span class="cost-gold">{{ formatNumber(view.gold) }}</span>
              </span>
              <span
                v-for="mat in view.mats"
                :key="mat.id"
                class="cost-pair"
                :class="{ 'cost-pair--missing': !mat.ok }"
                :title="mat.name"
              >
                <img v-if="mat.image" :src="mat.image" class="cost-img" :alt="mat.name" />
                <span class="cost-qty">{{ mat.have }}<span class="cost-need">/{{ mat.need }}</span></span>
              </span>
            </div>

            <button class="act-btn" :disabled="!view.ready" @click="handleForgeRelic(view.def)">
              {{ view.level === 0 ? '✦ Forge Relic' : `Upgrade → Lv ${view.level + 1}` }}
            </button>
          </article>
        </template>
      </template>

      <!-- ── CONSTELLATIONS ───────────────────────────────────── -->
      <template v-else-if="activeSection === 'constellations'">
        <div class="sf-meta">
          <span class="sf-meta-main">
            <b>{{ forgedCount }}</b> of {{ FORGE_CONSTELLATIONS.length }} constellations fused
          </span>
          <span v-if="readyCounts.constellations > 0" class="sf-meta-live">
            {{ readyCounts.constellations }} ready
          </span>
        </div>

        <template v-for="view in constellationViews" :key="view.def.id">
          <div v-if="view.forged" class="rr rr--done">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="rr-body">
              <span class="rr-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
              <span class="rr-meta rr-meta--gain">{{ view.def.desc }}</span>
            </div>
            <span class="rr-max-badge rr-max-badge--forged">✦ FUSED</span>
          </div>

          <article v-else class="cc" :class="{ 'cc--ready': view.ready, 'cc--locked': !view.reqMet }">
            <div v-if="view.ready" class="rc-glow" aria-hidden="true" />

            <header class="cc-head">
              <Icon :icon="view.def.icon" width="30" height="30" :style="{ color: view.def.color }" />
              <span class="cc-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
            </header>
            <p class="cc-desc">{{ view.def.desc }}</p>

            <!-- The old row said "Both branches Lv 3" and left the player to go
                 look up where they stand. Now it says it. -->
            <div class="cc-reqs">
              <div v-for="req in view.reqs" :key="req.id" class="cc-req">
                <span class="cc-req-name" :class="{ 'cc-req-name--met': req.met }">{{ req.name }}</span>
                <span class="cc-req-track">
                  <i :class="{ 'cc-req-fill--met': req.met }" :style="{ transform: `scaleX(${req.progress})` }" />
                </span>
                <span class="cc-req-num" :class="{ 'cc-req-num--met': req.met }">
                  {{ req.have }}/{{ req.need }}
                </span>
              </div>
            </div>

            <div class="cost-row">
              <span class="cost-pair" :class="{ 'cost-pair--missing': !view.goldOk }">
                <img src="/img/BardGold-128.png" class="cost-img" alt="Chimes" />
                <span class="cost-gold">{{ formatNumber(view.def.goldCost) }}</span>
              </span>
              <span
                v-for="mat in view.mats"
                :key="mat.id"
                class="cost-pair"
                :class="{ 'cost-pair--missing': !mat.ok }"
                :title="mat.name"
              >
                <img v-if="mat.image" :src="mat.image" class="cost-img" :alt="mat.name" />
                <span class="cost-qty">{{ mat.have }}<span class="cost-need">/{{ mat.need }}</span></span>
              </span>
            </div>

            <button class="act-btn" :disabled="!view.ready" @click="handleForgeConstellation(view.def)">
              {{ view.reqMet ? '✦ Fuse Constellation' : 'Branches not grown yet' }}
            </button>
          </article>
        </template>
      </template>

      <!-- ── COSMIC BARGAIN ───────────────────────────────────── -->
      <template v-else>
        <div class="sf-meta">
          <span class="sf-meta-main">The merchant restocks in</span>
          <span class="sf-meta-live sf-meta-live--calm">
            {{ formatCompactDuration(forgeStore.bargainRestockRemainingMs) }}
          </span>
        </div>
        <div class="bg-restock-track">
          <i :style="{ transform: `scaleX(${restockProgress})` }" />
        </div>

        <article v-if="deal" class="bg-card">
          <div class="bg-shine" aria-hidden="true" />

          <header class="bg-head">
            <div class="bg-ico">
              <Icon :icon="forgeStore.activeDealIcon" width="38" height="38" class="bg-ico-glyph" />
            </div>
            <div class="bg-id">
              <div class="bg-name-row">
                <span class="bg-name">{{ deal.name }}</span>
                <span v-if="deal.discountPct > 0" class="discount-chip">
                  −{{ Math.round(deal.discountPct * 100) }}%
                </span>
              </div>
              <span class="bg-kind">{{ dealKindLabel }}</span>
            </div>
          </header>

          <p class="bg-desc">{{ deal.desc }}</p>

          <!-- A crate's contents used to be a comma list glued onto the end of
               the description. Icons and counts read in one glance. -->
          <div v-if="dealRewards.length > 0" class="bg-line">
            <span class="bg-line-label">You get</span>
            <span class="bg-line-items">
              <span v-for="item in dealRewards" :key="item.id" class="cost-pair" :title="item.name">
                <img v-if="item.image" :src="item.image" class="cost-img" :alt="item.name" />
                <span class="cost-qty">×{{ item.need }}</span>
              </span>
              <span v-if="deal.kind === 'gold' && deal.goldReward" class="cost-pair">
                <img src="/img/BardGold-128.png" class="cost-img" alt="Chimes" />
                <span class="cost-gold">{{ formatNumber(deal.goldReward) }}</span>
              </span>
            </span>
          </div>

          <div class="bg-line bg-line--price">
            <span class="bg-line-label">You pay</span>
            <span class="bg-line-items">
              <span v-if="deal.discountPct > 0" class="price-struck">
                {{ formatNumber(deal.basePrice) }}
              </span>
              <span v-if="dealPrice > 0" class="cost-pair" :class="{ 'cost-pair--missing': !dealGoldOk }">
                <img src="/img/BardGold-128.png" class="cost-img cost-img--big" alt="Chimes" />
                <span class="cost-gold cost-gold--big">{{ formatNumber(dealPrice) }}</span>
              </span>
              <span
                v-for="mat in dealCosts"
                :key="mat.id"
                class="cost-pair"
                :class="{ 'cost-pair--missing': !mat.ok }"
                :title="mat.name"
              >
                <img v-if="mat.image" :src="mat.image" class="cost-img" :alt="mat.name" />
                <span class="cost-qty">{{ mat.have }}<span class="cost-need">/{{ mat.need }}</span></span>
              </span>
              <span v-if="dealPrice === 0 && dealCosts.length === 0" class="bg-free">Free</span>
            </span>
          </div>

          <div class="bg-actions">
            <span v-if="forgeStore.bargainPurchased" class="sold-note">✦ SOLD — restocking…</span>
            <button
              v-else
              class="act-btn act-btn--gold"
              :disabled="!forgeStore.canBuyBargain"
              @click="handleBuyBargain"
            >
              Buy Bargain
            </button>
            <button
              class="reroll-btn"
              :disabled="!forgeStore.canRerollBargain"
              title="Draw a different bargain"
              @click="handleReroll"
            >
              <Icon icon="ph:arrows-clockwise-bold" width="17" height="17" />
              Reroll
              <img v-if="rerollMatImage" :src="rerollMatImage" class="cost-img" alt="Dark Matter" />
              <span class="cost-qty">{{ rerollMatHave }}<span class="cost-need">/{{ FORGE_BARGAIN_REROLL_COST }}</span></span>
            </button>
          </div>
        </article>

        <!-- Placeholder while no deal is stocked (e.g. right after a save migration) -->
        <article v-else class="bg-card bg-card--empty">
          <header class="bg-head">
            <div class="bg-ico bg-ico--empty">
              <Icon :icon="FORGE_BARGAIN_EMPTY_ICON" width="36" height="36" class="bg-ico-glyph--empty" />
            </div>
            <div class="bg-id">
              <span class="bg-name bg-name--empty">The merchant drifts between stars…</span>
              <span class="bg-kind">A new bargain arrives with the next restock.</span>
            </div>
          </header>
        </article>

        <!-- What else he might bring — the question a reroll actually asks. -->
        <section class="bg-wares">
          <header class="bg-wares-head">Also in his cart</header>
          <div v-for="ware in otherWares" :key="ware.id" class="bg-ware">
            <span class="bg-ware-name">{{ ware.name }}</span>
            <span class="bg-ware-kind">{{ bargainKindLabel(ware) }}</span>
          </div>
        </section>

        <p class="bg-note">
          One bargain lies out at a time. It is gone once bought and the merchant returns with
          another; a Dark Matter shard sends him back to his cart right away.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatClock, formatCompactDuration } from '@/utils/ui/format'
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { MATERIALS } from '@/config/economy/materials'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
  getForgeNode,
} from '@/config/progression/starForge'
import {
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_BARGAIN_REROLL_COST,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BARGAIN_RESTOCK_MS,
  FORGE_BARGAIN_EMPTY_ICON,
  FORGE_PANEL_SECTIONS,
  FORGE_DESC_VALUE_TOKEN,
  FORGE_DESC_PERCENT_TOKEN,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
} from '@/config/constants'
import { formatNumber } from '@/config/ui/numberFormat'
import { useActionToast } from '@/composables/ui/useActionToast'
import type {
  ForgeRelicDef,
  ForgeConstellationDef,
  ForgeBargainDef,
  ForgeActiveBuff,
  ForgeCostItem,
  ForgeSectionId,
} from '@/types'

const inventoryStore = useInventoryStore()
const gameStore = useGameStore()
const forgeStore = useStarForgeStore()
const { showToast } = useActionToast()

// ── Sections ─────────────────────────────────────────────────────────────────
const activeSection = ref<ForgeSectionId>('relics')

function selectSection(id: ForgeSectionId): void {
  activeSection.value = id
}

// ── Active blessings (running bargain buffs) ─────────────────────────────────
const activeBuffs = computed(() =>
  forgeStore.activeBuffs.filter((b) => b.expiresAt > forgeStore.forgeNow),
)

function buffLabel(id: ForgeActiveBuff['id']): string {
  return id === 'cpcX2' ? '2× Chimes / Click' : '2× Chimes / Sec'
}

// ── Shared cost helpers ──────────────────────────────────────────────────────
function materialImage(matId: string): string | undefined {
  return MATERIALS.find((m) => m.id === matId)?.image
}

function materialName(matId: string): string {
  return MATERIALS.find((m) => m.id === matId)?.name ?? matId
}

/** Kostenpositionen samt Lagerstand — „2/3" statt „×3". */
function costItems(cost: Record<string, number>): ForgeCostItem[] {
  return Object.entries(cost).map(([id, need]) => {
    const have = inventoryStore.collectedMaterials[id] ?? 0
    return { id, name: materialName(id), image: materialImage(id), need, have, ok: have >= need }
  })
}

/** Die Einheit eines Stufenwerts steckt im Beschreibungstext seiner Definition. */
function valueUnit(desc: string): string {
  return desc.includes(FORGE_DESC_PERCENT_TOKEN) ? '%' : ''
}

// ── Relics ────────────────────────────────────────────────────────────────────
interface RelicView {
  def: ForgeRelicDef
  level: number
  maxLevel: number
  maxed: boolean
  reqMet: boolean
  ready: boolean
  reqNodeName: string
  reqHave: number
  reqNeed: number
  reqProgress: number
  gold: number
  goldOk: boolean
  mats: ForgeCostItem[]
  desc: string
  now: number
  nowText: string
  nextText: string
}

const relicViews = computed<RelicView[]>(() => {
  const views = FORGE_RELICS.map((def) => {
    const level = forgeStore.relicLevel(def.id)
    const maxed = level >= def.maxLevel
    const reqMet = forgeStore.relicRequirementMet(def.id)
    const reqHave = forgeStore.nodeLevel(def.requiresNode)
    const gold = forgeStore.relicGoldCost(def.id)
    const unit = valueUnit(def.desc)
    const now = level * def.effectPerLevel
    const next = (level + 1) * def.effectPerLevel
    return {
      def,
      level,
      maxLevel: def.maxLevel,
      maxed,
      reqMet,
      ready: forgeStore.canForgeRelic(def.id),
      reqNodeName: getForgeNode(def.requiresNode)?.name ?? def.requiresNode,
      reqHave,
      reqNeed: def.requiresLevel,
      reqProgress: Math.min(1, reqHave / def.requiresLevel),
      gold,
      goldOk: gameStore.chimes >= gold,
      mats: costItems(forgeStore.relicMaterialCost(def.id)),
      desc: def.desc.replace(FORGE_DESC_VALUE_TOKEN, String(Math.max(1, level) * def.effectPerLevel)),
      now,
      nowText: level === 0 ? '—' : `+${now}${unit}`,
      nextText: `+${next}${unit}`,
    }
  })
  // Was jetzt eine Entscheidung will, steht oben; Gesperrtes und Fertiges
  // sinkt. Sortiert wird nach ZUSTAND, nicht nach Kaufbarkeit — sonst
  // springen die Karten, während die Chimes ticken.
  const rank = (v: RelicView): number => (v.maxed ? 2 : v.reqMet ? 0 : 1)
  return views.sort((a, b) => rank(a) - rank(b))
})

const relicsForged = computed(() => relicViews.value.filter((v) => v.level > 0).length)

function handleForgeRelic(relic: ForgeRelicDef): void {
  if (forgeStore.forgeRelic(relic.id)) {
    showToast(`${relic.name} forged — Lv ${forgeStore.relicLevel(relic.id)}!`, 'forge')
  }
}

// ── Constellations ────────────────────────────────────────────────────────────
interface ConstellationReq {
  id: string
  name: string
  have: number
  need: number
  met: boolean
  progress: number
}

interface ConstellationView {
  def: ForgeConstellationDef
  forged: boolean
  reqMet: boolean
  ready: boolean
  reqs: ConstellationReq[]
  goldOk: boolean
  mats: ForgeCostItem[]
}

function constellationReq(nodeId: string): ConstellationReq {
  const have = forgeStore.nodeLevel(nodeId)
  const need = FORGE_CONSTELLATION_REQUIRED_LEVEL
  return {
    id: nodeId,
    name: getForgeNode(nodeId)?.name ?? nodeId,
    have,
    need,
    met: have >= need,
    progress: Math.min(1, have / need),
  }
}

const constellationViews = computed<ConstellationView[]>(() => {
  const views = FORGE_CONSTELLATIONS.map((def) => ({
    def,
    forged: forgeStore.constellationForged(def.id),
    reqMet: forgeStore.constellationRequirementMet(def.id),
    ready: forgeStore.canForgeConstellation(def.id),
    reqs: [constellationReq(def.nodeA), constellationReq(def.nodeB)],
    goldOk: gameStore.chimes >= def.goldCost,
    mats: costItems(def.materialCost),
  }))
  return views.sort((a, b) => Number(a.forged) - Number(b.forged))
})

const forgedCount = computed(() => forgeStore.forgedConstellations.length)

function handleForgeConstellation(constellation: ForgeConstellationDef): void {
  if (forgeStore.forgeConstellation(constellation.id)) {
    showToast(`Constellation forged: ${constellation.name}!`, 'forge')
  }
}

// ── Cosmic Bargain ────────────────────────────────────────────────────────────
const deal = computed(() => forgeStore.activeDeal)
const dealPrice = computed(() => (deal.value ? forgeStore.bargainPrice(deal.value) : 0))
const dealGoldOk = computed(() => gameStore.chimes >= dealPrice.value)

/** Anteil des abgelaufenen Restock-Fensters — treibt den Balken unter der Zeile. */
const restockProgress = computed(() =>
  Math.min(1, 1 - forgeStore.bargainRestockRemainingMs / FORGE_BARGAIN_RESTOCK_MS),
)

/** Was für ein Handel das ist — der Satz darunter erklärt, dieser Chip ordnet ein. */
function bargainKindLabel(def: ForgeBargainDef): string {
  switch (def.kind) {
    case 'buff': {
      const minutes = Math.round((def.durationMs ?? 0) / (MS_PER_SECOND * SECONDS_PER_MINUTE))
      const hours = (def.durationMs ?? 0) / (MS_PER_SECOND * SECONDS_PER_HOUR)
      return hours >= 1 ? `Timed blessing · ${hours} h` : `Timed blessing · ${minutes} min`
    }
    case 'materials':
      return 'Material crate'
    case 'gold':
      return 'Trade'
    case 'dwellSkip':
      return 'Phase skip'
    case 'heal':
      return 'Instant repair'
  }
  return ''
}

const dealKindLabel = computed(() => (deal.value ? bargainKindLabel(deal.value) : ''))

/** Der Rest des Sortiments — die Frage, die ein Reroll in Wahrheit stellt. */
const otherWares = computed(() =>
  FORGE_BARGAINS.filter((b) => b.id !== forgeStore.bargainDealId),
)

/** Was im Kasten liegt (Materialhandel) — vorher an den Beschreibungstext geklebt. */
const dealRewards = computed<ForgeCostItem[]>(() => {
  const def = deal.value
  if (!def || def.kind !== 'materials' || !def.materials) return []
  return costItems(def.materials)
})

/** Materialien, die ein Tausch VERLANGT (kind 'gold'). */
const dealCosts = computed<ForgeCostItem[]>(() => {
  const def = deal.value
  if (!def || def.kind !== 'gold' || !def.materials) return []
  return costItems(def.materials)
})

const rerollMatImage = computed(() =>
  MATERIALS.find((m) => m.id === FORGE_BARGAIN_REROLL_MATERIAL)?.image,
)

const rerollMatHave = computed(
  () => inventoryStore.collectedMaterials[FORGE_BARGAIN_REROLL_MATERIAL] ?? 0,
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

// ── Tab badges — only what can be acted on right now ─────────────────────────
const readyCounts = computed<Record<ForgeSectionId, number>>(() => ({
  relics: relicViews.value.filter((v) => v.ready).length,
  constellations: constellationViews.value.filter((v) => v.ready).length,
  bargain: forgeStore.canBuyBargain ? 1 : 0,
}))
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
   SECTION TABS
══════════════════════════════════════════════════ */
.sf-tabs {
  container-type: inline-size;
  flex-shrink: 0;
  display: flex;
  background: #16120a;
  border-bottom: 2px solid #3e200a;
}

/* `flex-basis: auto`, nicht `0` — bei gleichen Dritteln passt „Constellations"
   nicht in seine Zelle, während „Relics" die Hälfte seiner leer lässt. So
   startet jeder Reiter auf seiner Inhaltsbreite, und der Rest wird gleichmäßig
   verteilt. */
.sf-tab {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 8px 16px;
  border: 0;
  border-right: 1px solid #2a1a08;
  background: transparent;
  cursor: pointer;
  color: rgba(200, 144, 64, 0.6);
  transition: color 0.18s ease, background-color 0.18s ease;
}

.sf-tab:last-child {
  border-right: 0;
}

.sf-tab:hover:not(.sf-tab--on) {
  background: #1c1408;
  color: rgba(232, 192, 64, 0.85);
}

.sf-tab--on {
  background: #1e1408;
  color: var(--tab-c, #e8c040);
}

/* The active marker is a solid rule on the tab's own bottom edge — it overlays
   the strip's border rather than adding a second line. */
.sf-tab--on::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: var(--tab-c, #e8c040);
}

.sf-tab-ico-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
}

.sf-tab-ico {
  color: currentColor;
}

.sf-tab-label {
  font-size: 13.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: currentColor;
}

/* Only what can be acted on RIGHT NOW — a closed tab still says "something is
   waiting here". It hangs off the ICON, not off the tab's corner: the corner
   sits over the label, and "Constellations" is long enough to reach it. */
.sf-tab-badge {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #52b830;
  border: 1px solid #6ec040;
  color: #08130a;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

/* Narrow sidebars (small desktops): the longest label would otherwise clip. */
@container (max-width: 400px) {
  .sf-tab {
    gap: 5px;
    padding-left: 4px;
    padding-right: 4px;
  }

  .sf-tab-label {
    font-size: 11.5px;
    letter-spacing: 0.02em;
  }
}

/* ══════════════════════════════════════════════════
   RUNNING BLESSINGS
══════════════════════════════════════════════════ */
.sf-buffs {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 11px 18px;
  border-bottom: 1px solid #2a1a08;
  background: #14100c;
}

.blessing-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  background: rgba(150, 80, 220, 0.12);
  border: 1px solid rgba(150, 80, 220, 0.4);
  border-radius: 4px;
}

.blessing-icon {
  color: #c9a0ff;
  flex-shrink: 0;
}

.blessing-name {
  font-size: 13.5px;
  font-weight: 900;
  color: #c9a0ff;
}

.blessing-time {
  font-size: 13px;
  font-weight: 700;
  color: rgba(201, 160, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

/* ══════════════════════════════════════════════════
   BODY
══════════════════════════════════════════════════ */
.sf-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 18px 26px;
  display: flex;
  flex-direction: column;
  gap: 13px;
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
.sf-body > * {
  flex-shrink: 0;
}

/* ── Section meta line: what the tab holds, in one sentence ──── */
.sf-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 0 2px 2px;
}

.sf-meta-main {
  font-size: 14px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.6);
}

.sf-meta-main b {
  font-weight: 900;
  color: #e8c040;
}

.sf-meta-live {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a0f0d0;
  font-variant-numeric: tabular-nums;
}

.sf-meta-live--calm {
  color: #e8c040;
  text-transform: none;
  letter-spacing: 0;
  font-size: 15px;
}

/* ══════════════════════════════════════════════════
   COMPACT ROWS — locked, maxed, already fused
   Nothing to decide here, so nothing takes a card's worth of height.
══════════════════════════════════════════════════ */
.rr {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 15px 13px;
  background: #17170f;
  border: 1px solid #32210c;
  border-radius: 4px;
  overflow: hidden;
}

.rr--locked {
  opacity: 0.68;
}

.rr--max {
  border-color: #7a5a1c;
  background: #1a1408;
}

.rr--done {
  border-color: #3f6b2c;
  background: #101a14;
}

.rr-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rr-name {
  font-size: 15px;
  font-weight: 900;
  color: #e8dcc0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rr-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rr-meta--gain {
  color: rgba(160, 240, 208, 0.72);
}

.rr-num {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 900;
  color: rgba(255, 200, 80, 0.7);
  font-variant-numeric: tabular-nums;
}

.rr-max-badge {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #e8c040;
  border: 1px solid rgba(232, 192, 64, 0.4);
  background: rgba(232, 192, 64, 0.1);
  border-radius: 4px;
  padding: 5px 9px;
}

.rr-max-badge--forged {
  color: #a0ffa0;
  border-color: rgba(82, 184, 48, 0.45);
  background: rgba(82, 184, 48, 0.12);
}

/* The requirement's progress reads along the row's own bottom edge. */
.rr-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: #241708;
  overflow: hidden;
}

.rr-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

/* ══════════════════════════════════════════════════
   RELIC CARDS
══════════════════════════════════════════════════ */
.rc {
  position: relative;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  padding: 15px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s ease;
}

.rc:hover {
  border-color: #7a4e20;
}

.rc--owned {
  border-color: #4a8a28;
}

.rc--ready {
  border-color: #c89040;
}

/* Ready-to-forge breathes on its own layer: the glow is static CSS, only its
   opacity animates. See "Performance" rule 11 — the previous keyframe pulsed
   box-shadow and border-color, which re-rasters every card, every frame. */
.rc-glow {
  position: absolute;
  inset: -1px;
  border-radius: 5px;
  border: 1px solid #e8c060;
  box-shadow: 0 0 20px 1px rgba(232, 192, 64, 0.55);
  pointer-events: none;
  animation: sf-breathe 2.2s ease-in-out infinite;
}

.rc-head {
  display: flex;
  align-items: center;
  gap: 13px;
}

.rc-ico {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  background: #141410;
  border: 1px solid #5c3310;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rc-id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rc-name {
  font-size: 17.5px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rarity-chip {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.06em;
  padding: 4px 8px;
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

.rc-lvl-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.rc-pips {
  display: flex;
  gap: 4px;
}

.rc-pip {
  width: 21px;
  height: 6px;
  border-radius: 2px;
  background: #241708;
  border: 1px solid #3e200a;
}

.rc-pip--on {
  background: #e8a020;
  border-color: #e8c060;
}

.rc-lvl {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.65);
  font-variant-numeric: tabular-nums;
}

.rc-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* ── The one number the old card never showed ────────────────── */
.rc-delta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.rc-delta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rc-delta-cell--next {
  margin-left: auto;
  align-items: flex-end;
  text-align: right;
}

.rc-delta-label {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
  line-height: 1;
  white-space: nowrap;
}

.rc-delta-value {
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
  color: rgba(232, 220, 192, 0.75);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rc-delta-value--next {
  color: #7ad0a0;
}

.rc-delta-arrow {
  flex-shrink: 0;
  font-size: 19px;
  color: rgba(200, 144, 64, 0.4);
}

/* ══════════════════════════════════════════════════
   COST DISPLAY (shared)
   Always "have / need" — a bare "×3" leaves the player to go count.
══════════════════════════════════════════════════ */
.cost-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cost-pair {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.cost-pair--missing .cost-qty,
.cost-pair--missing .cost-gold {
  color: #cc6050;
}

.cost-pair--missing .cost-need {
  color: rgba(204, 96, 80, 0.65);
}

.cost-img {
  height: 22px;
  width: auto;
  object-fit: contain;
}

.cost-img--big {
  height: 26px;
}

.cost-gold {
  font-size: 15px;
  font-weight: 900;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}

.cost-gold--big {
  font-size: 19.5px;
}

.cost-qty {
  font-size: 15px;
  font-weight: 900;
  color: #e8d8b0;
  font-variant-numeric: tabular-nums;
}

.cost-need {
  font-size: 13px;
  font-weight: 700;
  color: rgba(232, 216, 176, 0.45);
}

.sold-note {
  font-size: 15px;
  font-weight: 900;
  color: rgba(160, 255, 160, 0.75);
  letter-spacing: 0.05em;
}

/* ══════════════════════════════════════════════════
   ACTION BUTTON — full width, one decision per card
══════════════════════════════════════════════════ */
.act-btn {
  width: 100%;
  padding: 13px 16px;
  border: 1px solid #6ec040;
  border-radius: 4px;
  background: linear-gradient(to bottom, #52b830, #2e7a1a);
  color: #08130a;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.act-btn--gold {
  border-color: #e8c060;
  background: linear-gradient(to bottom, #e8c040, #b8860a);
  color: #2a1a04;
}

.act-btn:hover:not(:disabled) {
  filter: brightness(1.12);
}

/* Ein ausgegrauter Grünverlauf trägt seine fast schwarze Schrift nicht mehr —
   die Zeile darauf sagt aber, WARUM der Knopf nicht geht. Der gesperrte Zustand
   wird deshalb flach und heller beschriftet statt gedimmt. */
.act-btn:disabled {
  border-color: #4a3a1c;
  background: #241a0c;
  color: rgba(232, 216, 176, 0.55);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   CONSTELLATIONS
══════════════════════════════════════════════════ */
.cc {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px 16px 16px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
  transition: border-color 0.2s ease;
}

.cc:hover:not(.cc--locked) {
  border-color: #7a4e20;
}

.cc--ready {
  border-color: #c89040;
}

.cc--locked {
  opacity: 0.72;
}

.cc-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.cc-name {
  font-size: 17.5px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
}

/* Both gates, spelled out — the old row only named the level and left the
   player to look up where they stood. */
.cc-reqs {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 11px 14px;
  background: #141410;
  border: 1px solid #32210c;
  border-radius: 4px;
}

.cc-req {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cc-req-name {
  flex: 0 0 42%;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cc-req-name--met {
  color: #a0f0d0;
}

.cc-req-track {
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: #241708;
  overflow: hidden;
}

.cc-req-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8a020);
}

.cc-req-track i.cc-req-fill--met {
  background: linear-gradient(to right, #2e7a1a, #7ad0a0);
}

.cc-req-num {
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
  font-size: 14px;
  font-weight: 900;
  color: rgba(255, 200, 80, 0.7);
  font-variant-numeric: tabular-nums;
}

.cc-req-num--met {
  color: #a0f0d0;
}

/* ══════════════════════════════════════════════════
   COSMIC BARGAIN
══════════════════════════════════════════════════ */
.bg-restock-track {
  height: 6px;
  border-radius: 3px;
  background: #241708;
  border: 1px solid #32210c;
  overflow: hidden;
}

.bg-restock-track i {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(to right, #8a5a1c, #e8c060);
}

.bg-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 16px;
  border-radius: 4px;
  border: 1px solid #7a4e20;
  background: linear-gradient(120deg, #1c130a, #241608);
  overflow: hidden;
}

/* A translating band, not an animated background-position — the sweep stays
   compositor work. */
.bg-shine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -45%;
  width: 45%;
  background: linear-gradient(105deg, transparent, rgba(255, 225, 150, 0.16), transparent);
  pointer-events: none;
  animation: bg-sweep 5s ease-in-out infinite;
}

@keyframes bg-sweep {
  0% {
    transform: translateX(0);
  }
  60%,
  100% {
    transform: translateX(340%);
  }
}

.bg-card--empty {
  border-color: #3e200a;
  background: #1c1c18;
}

.bg-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
}

.bg-ico {
  width: 66px;
  height: 66px;
  border-radius: 4px;
  background: radial-gradient(circle at 40% 35%, #ffe6a0, #c88018 75%);
  border: 1px solid #e8c060;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 16px rgba(232, 192, 64, 0.4);
}

.bg-ico--empty {
  background: #141410;
  border-color: #3e200a;
  box-shadow: none;
}

.bg-ico-glyph {
  color: #3a2408;
}

.bg-ico-glyph--empty {
  color: rgba(255, 255, 255, 0.3);
}

.bg-id {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bg-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bg-name {
  font-size: 20.5px;
  font-weight: 900;
  color: #ffdf80;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bg-name--empty {
  font-size: 15.5px;
  color: rgba(255, 223, 128, 0.6);
  white-space: normal;
}

.discount-chip {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 3px;
  color: #08130a;
  background: #e8a020;
}

.bg-kind {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.65);
}

.bg-desc {
  position: relative;
  margin: 0;
  font-size: 14.5px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.72);
}

.bg-line {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: rgba(10, 8, 4, 0.5);
  border: 1px solid #3e200a;
  border-radius: 4px;
}

.bg-line-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.5);
}

.bg-line-items {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-left: auto;
}

.price-struck {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.bg-free {
  font-size: 15px;
  font-weight: 900;
  color: #a0f0d0;
}

.bg-wares {
  display: flex;
  flex-direction: column;
  border: 1px solid #2a1a08;
  border-radius: 4px;
  background: #16140e;
  overflow: hidden;
}

.bg-wares-head {
  padding: 10px 14px;
  background: #1e1006;
  border-bottom: 1px solid #2a1a08;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.55);
}

.bg-ware {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 9px 14px;
  border-top: 1px solid #221806;
}

.bg-ware:first-of-type {
  border-top: 0;
}

.bg-ware-name {
  font-size: 14px;
  font-weight: 800;
  color: rgba(232, 220, 192, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bg-ware-kind {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.45);
}

.bg-note {
  margin: 2px 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.55;
  color: rgba(200, 144, 64, 0.42);
}

.bg-actions {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 9px;
}

.bg-actions .act-btn {
  flex: 1;
}

.bg-actions .sold-note {
  flex: 1;
  display: flex;
  align-items: center;
}

.reroll-btn {
  flex-shrink: 0;
  padding: 11px 13px;
  border: 1px solid #5c3310;
  border-radius: 4px;
  background: #1e1006;
  color: #c9a0ff;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reroll-btn:hover:not(:disabled) {
  border-color: #7a4e20;
}

.reroll-btn:disabled {
  border-color: #3a2a12;
  color: rgba(201, 160, 255, 0.4);
  cursor: not-allowed;
}

/* ══════════════════════════════════════════════════
   SHARED ANIMATIONS
   Only opacity — the glow itself stands still in CSS.
══════════════════════════════════════════════════ */
@keyframes sf-breathe {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
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
  .sf-tab {
    padding: 11px 8px 12px;
  }

  .sf-buffs {
    padding: 9px 15px;
  }

  .sf-body {
    padding: 14px 15px 22px;
    gap: 11px;
  }

  .rc,
  .cc {
    padding: 13px 14px 14px;
    gap: 11px;
  }

  .rc-ico {
    width: 52px;
    height: 52px;
  }

  .bg-ico {
    width: 60px;
    height: 60px;
  }
}

/* ══════════════════════════════════════════════════
   REDUCED MOTION
══════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .rc-glow,
  .bg-shine {
    animation: none;
  }
}
</style>

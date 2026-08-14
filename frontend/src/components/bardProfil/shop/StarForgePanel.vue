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
        :title="sec.label"
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
      <!-- ── THE TREE ITSELF ──────────────────────────────────── -->
      <ForgeUpgradesSection v-if="activeSection === 'upgrades'" />

      <!-- ── CRAFTED RELICS ───────────────────────────────────── -->
      <template v-else-if="activeSection === 'relics'">
        <div class="fc-meta">
          <span class="fc-meta-main">
            <b>{{ relicsForged }}</b> of {{ FORGE_RELICS.length }} relics forged
          </span>
          <span v-if="readyCounts.relics > 0" class="fc-meta-live">
            {{ readyCounts.relics }} ready
          </span>
        </div>

        <template v-for="view in relicViews" :key="view.def.id">
          <!-- Locked and maxed relics have nothing to decide — they collapse to
               one line so the cards that DO want a decision stand alone. -->
          <div v-if="!view.reqMet" class="fc-row fc-row--locked" :title="view.desc">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="fc-row-body">
              <span class="fc-row-name">{{ view.def.name }}</span>
              <span class="fc-row-meta">
                <Icon icon="lucide:lock" width="14" height="14" />
                Grow {{ view.reqNodeName }} to Lv {{ view.reqNeed }}
              </span>
            </div>
            <span class="fc-row-num">{{ view.reqHave }}/{{ view.reqNeed }}</span>
            <div class="fc-track">
              <i :style="{ transform: `scaleX(${view.reqProgress})` }" />
            </div>
          </div>

          <div v-else-if="view.maxed" class="fc-row fc-row--max" :title="view.desc">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="fc-row-body">
              <span class="fc-row-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
              <span class="fc-row-meta fc-row-meta--gain">{{ view.desc }}</span>
            </div>
            <span class="fc-badge">✦ MAX</span>
          </div>

          <article
            v-else
            class="fc-card"
            :class="{ 'fc-card--ready': view.ready, 'fc-card--owned': view.level > 0 && !view.ready }"
            :style="{ '--node-c': view.def.color }"
          >
            <div v-if="view.ready" class="fc-glow" aria-hidden="true" />

            <header class="fc-card-head">
              <div class="fc-ico">
                <Icon :icon="view.def.icon" width="38" height="38" :style="{ color: view.def.color }" />
              </div>
              <div class="fc-id">
                <div class="fc-name-row">
                  <span class="fc-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
                  <span class="fc-chip" :style="{ '--chip-c': FORGE_RELIC_RARITY_COLOR[view.def.rarity] }">
                    {{ view.def.rarity.toUpperCase() }}
                  </span>
                </div>
                <div class="fc-lvl-row">
                  <span class="fc-pips">
                    <i
                      v-for="step in view.maxLevel"
                      :key="step"
                      class="fc-pip"
                      :class="{ 'fc-pip--on': step <= view.level }"
                    />
                  </span>
                  <span class="fc-lvl">Lv {{ view.level }} / {{ view.maxLevel }}</span>
                </div>
              </div>
            </header>

            <p class="fc-desc">{{ view.desc }}</p>

            <!-- What the next strike actually buys — the one number the old
                 card never showed. -->
            <div class="fc-delta">
              <div class="fc-delta-cell">
                <span class="fc-delta-label">Now</span>
                <span class="fc-delta-value">{{ view.nowText }}</span>
              </div>
              <span class="fc-delta-arrow">→</span>
              <div class="fc-delta-cell fc-delta-cell--next">
                <span class="fc-delta-label">After forging</span>
                <span class="fc-delta-value fc-delta-value--next">{{ view.nextText }}</span>
              </div>
            </div>

            <ForgeCostRow :gold="view.gold" :gold-ok="view.goldOk" :materials="view.mats" />

            <button class="fc-act" :disabled="!view.ready" @click="handleForgeRelic(view.def)">
              {{ view.level === 0 ? '✦ Forge Relic' : `Upgrade → Lv ${view.level + 1}` }}
            </button>
          </article>
        </template>
      </template>

      <!-- ── CONSTELLATIONS ───────────────────────────────────── -->
      <template v-else-if="activeSection === 'constellations'">
        <div class="fc-meta">
          <span class="fc-meta-main">
            <b>{{ forgedCount }}</b> of {{ FORGE_CONSTELLATIONS.length }} constellations fused
          </span>
          <span v-if="readyCounts.constellations > 0" class="fc-meta-live">
            {{ readyCounts.constellations }} ready
          </span>
        </div>

        <template v-for="view in constellationViews" :key="view.def.id">
          <div v-if="view.forged" class="fc-row fc-row--done">
            <Icon :icon="view.def.icon" width="27" height="27" :style="{ color: view.def.color }" />
            <div class="fc-row-body">
              <span class="fc-row-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
              <span class="fc-row-meta fc-row-meta--gain">{{ view.def.desc }}</span>
            </div>
            <span class="fc-badge fc-badge--forged">✦ FUSED</span>
          </div>

          <article
            v-else
            class="fc-card"
            :class="{ 'fc-card--ready': view.ready, 'fc-card--locked': !view.reqMet }"
            :style="{ '--node-c': view.def.color }"
          >
            <div v-if="view.ready" class="fc-glow" aria-hidden="true" />

            <header class="cc-head">
              <Icon :icon="view.def.icon" width="30" height="30" :style="{ color: view.def.color }" />
              <span class="fc-name" :style="{ color: view.def.color }">{{ view.def.name }}</span>
            </header>
            <p class="fc-desc">{{ view.def.desc }}</p>

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

            <ForgeCostRow :gold="view.def.goldCost" :gold-ok="view.goldOk" :materials="view.mats" />

            <button class="fc-act" :disabled="!view.ready" @click="handleForgeConstellation(view.def)">
              {{ view.reqMet ? '✦ Fuse Constellation' : 'Branches not grown yet' }}
            </button>
          </article>
        </template>
      </template>

      <!-- ── COSMIC BARGAIN ───────────────────────────────────── -->
      <template v-else>
        <div class="fc-meta">
          <span class="fc-meta-main">The merchant restocks in</span>
          <span class="fc-meta-live fc-meta-live--calm">
            {{ formatCompactDuration(forgeStore.bargainRestockRemainingMs) }}
          </span>
        </div>
        <div class="fc-track bg-restock-track">
          <i :style="{ transform: `scaleX(${restockProgress})` }" />
        </div>

        <article v-if="deal" class="fc-card bg-card">
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
              <span v-for="item in dealRewards" :key="item.id" class="fc-cost-pair" :title="item.name">
                <img v-if="item.image" :src="item.image" class="fc-cost-img" :alt="item.name" />
                <span class="fc-cost-qty">×{{ item.need }}</span>
              </span>
              <span v-if="deal.kind === 'gold' && deal.goldReward" class="fc-cost-pair">
                <img :src="FORGE_CHIME_IMAGE" class="fc-cost-img" alt="Chimes" />
                <span class="fc-cost-gold">{{ formatNumber(deal.goldReward) }}</span>
              </span>
            </span>
          </div>

          <div class="bg-line bg-line--price">
            <span class="bg-line-label">You pay</span>
            <span class="bg-line-items">
              <span v-if="deal.discountPct > 0" class="price-struck">
                {{ formatNumber(deal.basePrice) }}
              </span>
              <span v-if="dealPrice > 0" class="fc-cost-pair" :class="{ 'fc-cost-pair--missing': !dealGoldOk }">
                <img :src="FORGE_CHIME_IMAGE" class="fc-cost-img fc-cost-img--big" alt="Chimes" />
                <span class="fc-cost-gold fc-cost-gold--big">{{ formatNumber(dealPrice) }}</span>
              </span>
              <span
                v-for="mat in dealCosts"
                :key="mat.id"
                class="fc-cost-pair"
                :class="{ 'fc-cost-pair--missing': !mat.ok }"
                :title="mat.name"
              >
                <img v-if="mat.image" :src="mat.image" class="fc-cost-img" :alt="mat.name" />
                <span class="fc-cost-qty">{{ mat.have }}<span class="fc-cost-need">/{{ mat.need }}</span></span>
              </span>
              <span v-if="dealPrice === 0 && dealCosts.length === 0" class="bg-free">Free</span>
            </span>
          </div>

          <div class="bg-actions">
            <span v-if="forgeStore.bargainPurchased" class="sold-note">✦ SOLD — restocking…</span>
            <button
              v-else
              class="fc-act fc-act--gold"
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
              <img v-if="rerollMatImage" :src="rerollMatImage" class="fc-cost-img" alt="Dark Matter" />
              <span class="fc-cost-qty">{{ rerollMatHave }}<span class="fc-cost-need">/{{ FORGE_BARGAIN_REROLL_COST }}</span></span>
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
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
  FORGE_BARGAINS,
  FORGE_NODES,
  getForgeNode,
} from '@/config/progression/starForge'
import ForgeUpgradesSection from './ForgeUpgradesSection.vue'
import ForgeCostRow from './ForgeCostRow.vue'
import {
  FORGE_CONSTELLATION_REQUIRED_LEVEL,
  FORGE_BARGAIN_REROLL_COST,
  FORGE_BARGAIN_REROLL_MATERIAL,
  FORGE_BARGAIN_RESTOCK_MS,
  FORGE_BARGAIN_EMPTY_ICON,
  FORGE_PANEL_SECTIONS,
  FORGE_RELIC_RARITY_COLOR,
  FORGE_CHIME_IMAGE,
  SOLAR_BRANCHES,
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
const solarStore = useSolarUpgradeStore()
const { showToast } = useActionToast()

// ── Sections ─────────────────────────────────────────────────────────────────
/** Der Baum steht vorn: Relikte, Konstellationen und der Handel zeigen, was aus
 *  ihm FOLGT — dieser Reiter zeigt ihn selbst. */
const activeSection = ref<ForgeSectionId>('upgrades')

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
/**
 * Der Upgrade-Zähler fragt die Stores DIREKT und nicht `useForgeUpgrades()`.
 * Der Grund ist der Lebenszyklus: der Shop-Tab wird einmal gemountet und danach
 * nur noch per `v-show` umgeschaltet, die Reiterleiste rechnet also auch bei
 * geschlossenem Reiter weiter. Über das Ansichtsmodell liefe dabei jede Sekunde
 * der volle Aufbau aller 25 Einträge samt Materiallisten mit — hier bleiben es
 * 25 Getter-Aufrufe, dieselbe Größenordnung wie bei den Relikten darunter.
 */
const readyCounts = computed<Record<ForgeSectionId, number>>(() => ({
  upgrades:
    SOLAR_BRANCHES.filter((branch) => solarStore.canAfford(branch.id)).length +
    FORGE_NODES.filter((node) => forgeStore.canAffordNode(node.id)).length,
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

/* Gestapelt statt nebeneinander, seit „Upgrades" als vierter Reiter dazukam.
   Nebeneinander brauchten die vier Beschriftungen bei 13,5px zusammen 526px —
   die Spalte ist auf `clamp(340px, 32vw, 470px)` gedeckelt, „Constellations"
   wäre also auf jedem Desktop abgeschnitten. Übereinander bekommt jedes Label
   die volle Zellenbreite, und die vier Zellen teilen sich die Spalte gleich
   (`flex-basis: 0`, weil die Breite jetzt nicht mehr am längsten Wort hängt). */
.sf-tab {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 6px 12px;
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
  max-width: 100%;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
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

/* Der Deckel der Spalte liegt bei 470px, vier Reiter bekommen davon also je
   rund 117px — und „Constellations" ist das längste Wort der Leiste. Die Stufe
   MUSS deshalb oberhalb dieser 470px greifen, sonst schaltet sie auf keinem
   Desktop je um und das Wort steht dauerhaft abgeschnitten da. Gemessen bei
   1920×1080 nachgezogen, nicht geschätzt. */
@container (max-width: 560px) {
  .sf-tab {
    gap: 5px;
    padding-left: 3px;
    padding-right: 3px;
  }

  .sf-tab-label {
    font-size: 10.5px;
    letter-spacing: 0;
  }
}

@container (max-width: 400px) {
  .sf-tab-label {
    font-size: 9.5px;
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

.sold-note {
  font-size: 15px;
  font-weight: 900;
  color: rgba(160, 255, 160, 0.75);
  letter-spacing: 0.05em;
}

.cc-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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

.bg-actions .fc-act {
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
    gap: 5px;
    padding: 8px 6px 9px;
  }

  .sf-buffs {
    padding: 9px 15px;
  }

  .sf-body {
    padding: 14px 15px 22px;
    gap: 11px;
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
  .bg-shine {
    animation: none;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlanetShopStore, PLANET_ROLES } from '@/stores/world/planetShopStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useHerald } from '@/composables/ui/useHerald'
import { useNotifyBadgeCount } from '@/composables/ui/useNotifyBadges'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { NOTIFY_BADGE_BY_KIND, NOTIFY_BADGE_TIP_COLOR } from '@/config/ui/notifyBadges'
import {
  CHAMP_TOOLTIP_MAX_VISIBLE,
  ROLE_BY_KEY,
  STAR_PHASE_DATA,
  CHIMES_COST_ICON,
  FORGE_AFFORDABLE_TOTAL_ICON,
  FORGE_PANEL_SECTIONS,
  NOTIFY_BADGE_TITLE,
  type NotifyBadgeKind,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

/* Shared body for every notify-badge hover tooltip (rendered inside the
   #tip slot of RpgBadgeTooltip). One component, one frame, one CSS block —
   the `kind` prop selects which content is shown. Interactive kinds
   (expedition/champions) close the surrounding tooltip via the `close` prop
   handed down from RpgBadgeTooltip's #tip slot. */
const props = defineProps<{
  kind: NotifyBadgeKind
  /** close callback from RpgBadgeTooltip's #tip slot — lets interactive
      tooltips dismiss themselves after an action */
  close?: () => void
}>()

/* Motiv und Leitfarbe kommen aus der Marken-Registry — dieselbe Quelle, aus
   der Marke und Herold lesen. Die Farbe färbt Kopf, Kanten und Chips; die
   Hülle bekommt sie als `accent` und trägt damit Leiste und Pfeil. */
const badge = computed(() => NOTIFY_BADGE_BY_KIND[props.kind])
const accent = computed(() => NOTIFY_BADGE_TIP_COLOR[props.kind])

const gameStore = useGameStore()
const meepTree = useMeepTreeStore()
const expeditionStore = useExpeditionStore()
const solarStore = useSolarUpgradeStore()
const battleStore = useBattleStore()
const planetShopStore = usePlanetShopStore()
const starForgeStore = useStarForgeStore()
const uiStore = useUiStore()
const { announceReceipt } = useHerald()

/* ── expedition ─────────────────────────────────────────────────────── */
const readyExpeditions = computed(() => expeditionStore.readyExpeditions)

function collectAll() {
  const ready = [...readyExpeditions.value]
  if (ready.length === 0) return
  const reward = ready.reduce((sum, exp) => sum + (exp.reward ?? 0), 0)
  for (const exp of ready) expeditionStore.collectExpedition(exp.id)
  announceReceipt({
    kind: 'expedition',
    headline: 'Rewards collected',
    subline: `${ready.length} crew${ready.length === 1 ? '' : 's'} home`,
    delta: reward > 0 ? { value: reward, unit: 'chimes' } : undefined,
    // Derselbe Schlüssel wie im Expeditions-Tab — dieselbe Handlung, zwei Wege
    // dorthin.
    mergeKey: 'expedition/collect',
  })
  props.close?.()
}

/* ── forge ──────────────────────────────────────────────────────────── */
const nextPhase = computed(() => {
  if (solarStore.isCometState) return STAR_PHASE_DATA[0]
  return STAR_PHASE_DATA[solarStore.starPhase + 1] ?? null
})

/* ── champions ──────────────────────────────────────────────────────── */
const newChampions = computed(() =>
  battleStore.newlyUnlockedChampions.slice(0, CHAMP_TOOLTIP_MAX_VISIBLE),
)
const extraChampions = computed(() =>
  Math.max(0, battleStore.newlyUnlockedChampions.length - CHAMP_TOOLTIP_MAX_VISIBLE),
)

/* Game-wide role palette (ROLE_BY_KEY) — same colors as orbit, shop & roster. */
function roleOf(name: string) {
  return ROLE_BY_KEY[(CHAMPION_ROLES[name] ?? 'mid') as ChampionRole]
}

function pickChampion(name: string) {
  uiStore.requestOpenShopTabWithSearch(name)
  props.close?.()
}

/* ── skill ──────────────────────────────────────────────────────────── */
// Die Marke zählt UNGESEHENE, nicht kaufbare Knoten — der Tooltip zeigt beides,
// sonst nennt er eine Zahl, die neben der Marke daneben steht.
const skillCount = useNotifyBadgeCount('skill')
const skillBuyableCount = computed(() => meepTree.buyableNodeCount)

/* ── planet ─────────────────────────────────────────────────────────── */
// Total level-ups affordable across all six slots (matches the header badge).
const planetLevelCount = computed(() => planetShopStore.affordableLevelCount)

interface PlanetUpgradeRow {
  id: string
  name: string
  color: string
  image: string
  level: number
  count: number
  nextCost: number
}

// One row per orbit slot that has at least one affordable level-up right now.
// Reactive: reads chimes + slots + phase via the store getters, so rows update
// (and vanish) live as the player buys from inside the tooltip.
const upgradeableSlots = computed<PlanetUpgradeRow[]>(() => {
  void gameStore.chimes // ensure re-eval when chimes change
  return planetShopStore.slots
    .filter((s) => s.purchased && !!s.role && planetShopStore.getMaxAffordableLevelCount(s.id) > 0)
    .map((s) => {
      const role = PLANET_ROLES[s.role!]
      return {
        id: s.id,
        name: role.name,
        color: role.color,
        image: role.image,
        level: s.level,
        count: planetShopStore.getMaxAffordableLevelCount(s.id),
        nextCost: planetShopStore.getPlanetLevelUpCost(s.id),
      }
    })
})

// Buy every affordable level-up for one slot at once. When the last affordable
// upgrade anywhere is spent the header badge unmounts, which closes this tooltip
// automatically — no explicit close needed.
function levelUpMax(id: string) {
  const n = planetShopStore.getMaxAffordableLevelCount(id)
  if (n > 0) planetShopStore.levelUpPlanetTimes(id, n)
}

// Open the Bard modal on the Planets tab with this orbit slot pre-selected.
function openPlanetSlot(id: string) {
  uiStore.requestOpenPlanetsTab(id)
  props.close?.()
}

/* ── shop ───────────────────────────────────────────────────────────── */
/**
 * Die Aufschlüsselung hinter der einen Zahl an der Shop-Ecktaste: in welcher der
 * vier Abteilungen der Star Forge gerade etwas NEUES wartet.
 *
 * Die FRISCHEN Zahlen und nicht die kaufbaren — der Tooltip erklärt das
 * Abzeichen, und zwei verschiedene Zahlen für dieselbe Marke wären schlimmer als
 * gar keine Aufschlüsselung. Was insgesamt bezahlbar ist, sagt die Fußzeile.
 *
 * Nur Zeilen mit `count > 0` — eine Abteilung mit einer Null sagt nichts, was
 * das Abzeichen nicht schon gesagt hätte. Gespeist aus demselben Store-Getter,
 * den auch die Schienen-Marken im Skill-Tree-Reiter lesen; Label, Glyph und Akzent
 * kommen aus `FORGE_PANEL_SECTIONS`, damit hier keine zweite Namensquelle
 * entsteht.
 */
const shopFreshSections = computed(() =>
  FORGE_PANEL_SECTIONS.map((sec) => ({
    id: sec.id,
    label: sec.label,
    icon: sec.icon,
    accent: sec.accent,
    count: starForgeStore.shopFreshCounts[sec.id],
  })).filter((row) => row.count > 0),
)

/**
 * „21 affordable in total" — die Auskunft, die das Abzeichen bis zur Umstellung
 * selbst trug.
 *
 * Sie beantwortet genau die Frage, die die neue Zählweise sonst offenließe:
 * warum dort `3` steht, obwohl die Kasse für zwanzig Käufe reicht. Nur, wenn
 * sie mehr sagt als die Zeilen darüber — bei Gleichstand wäre sie eine
 * Wiederholung.
 */
const shopAffordableTotal = computed(() => starForgeStore.shopReadyTotal)

const shopShowAffordableTotal = computed(
  () => shopAffordableTotal.value > starForgeStore.shopFreshTotal,
)

// Buy all possible upgrades across every slot, spending chimes greedily in slot
// order until the budget runs dry.
function buyAllUpgrades() {
  for (const s of planetShopStore.slots) {
    if (!s.purchased || !s.role) continue
    const n = planetShopStore.getMaxAffordableLevelCount(s.id)
    if (n > 0) planetShopStore.levelUpPlanetTimes(s.id, n)
  }
}
</script>

<template>
  <div class="bt" :class="`bt--${kind}`" :style="{ '--tip-color': accent }">
    <!-- Kopf der Sprache: Motiv, dann der Wortlaut, den auch der `ready`-Herold
         als Schlagzeile trägt (NOTIFY_BADGE_TITLE). -->
    <div class="tip-head">
      <Icon v-if="badge.icon" :icon="badge.icon" width="20" height="20" class="tip-ico" />
      <span class="tip-name">{{ NOTIFY_BADGE_TITLE[kind] }}</span>
    </div>

    <!-- ══════════ EXPEDITION ══════════ -->
    <template v-if="kind === 'expedition'">
      <ul class="tip-rows">
        <li v-for="exp in readyExpeditions" :key="exp.id" class="tip-row">
          <Icon
            :icon="exp.icon || 'game-icons:rolled-cloth'"
            width="22"
            height="22"
            class="tip-row-ico"
          />
          <span class="tip-row-name">{{ exp.name }}</span>
          <span
            class="tip-chip"
            :style="{ '--cc': exp.status === 'success' ? '#6ec040' : '#cc6050' }"
          >
            {{ exp.status === 'success' ? 'Success' : 'Failed' }}
          </span>
        </li>
      </ul>
      <button class="tip-act" @click.stop="collectAll">
        Collect
        <span class="tip-act-count">{{ readyExpeditions.length }}</span>
      </button>
    </template>

    <!-- ══════════ FORGE ══════════ -->
    <template v-else-if="kind === 'forge'">
      <div class="tip-effect">
        <template v-if="nextPhase">
          Next phase:
          <strong :style="{ color: nextPhase.phasePrimary }">{{ nextPhase.name }}</strong>
        </template>
        <template v-else>Your sun has reached its final phase</template>
      </div>
      <div class="tip-hint">Open the Bard tab and evolve at the sun dial</div>
    </template>

    <!-- ══════════ CHAMPIONS ══════════ -->
    <template v-else-if="kind === 'champions'">
      <ul class="tip-rows">
        <li
          v-for="name in newChampions"
          :key="name"
          class="tip-row bt-click"
          :style="{ '--cc': roleOf(name).color }"
          @click.stop="pickChampion(name)"
        >
          <img
            :src="battleStore.getChampionImage(name, { size: 'md' })"
            class="bt-portrait"
            :alt="name"
          />
          <span class="tip-row-name" :style="{ color: roleOf(name).color }">{{ name }}</span>
          <span class="tip-chip">{{ roleOf(name).short }}</span>
        </li>
      </ul>
      <div v-if="extraChampions > 0" class="tip-hint">+{{ extraChampions }} more</div>
      <div class="tip-hint">Click a champion to open the shop</div>
    </template>

    <!-- ══════════ SKILL ══════════ -->
    <template v-else-if="kind === 'skill'">
      <div class="tip-effect bt-lead">
        <img
          src="/img/BardAbilities/BardMeep-64.png"
          class="bt-lead-ico"
          alt=""
          aria-hidden="true"
        />
        <span>
          <strong>{{ skillCount }}</strong> skill{{ skillCount === 1 ? '' : 's' }} ready to learn
        </span>
      </div>
      <div class="tip-meta tip-num">
        {{ $formatNumber(gameStore.meeps) }} Meeps · {{ skillBuyableCount }} affordable
      </div>
      <div class="tip-hint">Open the Skill Tree to learn</div>
    </template>

    <!-- ══════════ PLANET ══════════ -->
    <template v-else-if="kind === 'planet'">
      <button class="tip-act" @click.stop="buyAllUpgrades">
        <Icon icon="ph:arrow-fat-up-fill" width="15" height="15" />
        Buy All
        <span class="tip-act-count">{{ planetLevelCount }}</span>
      </button>
      <ul class="tip-rows">
        <li
          v-for="slot in upgradeableSlots"
          :key="slot.id"
          class="tip-row bt-click"
          :style="{ '--cc': slot.color }"
          @click.stop="openPlanetSlot(slot.id)"
        >
          <span class="bt-frame">
            <img :src="slot.image" class="bt-planet" :alt="slot.name" />
          </span>
          <div class="bt-stack">
            <span class="tip-row-name" :style="{ color: slot.color }">{{ slot.name }}</span>
            <span class="bt-sub">
              <span class="tip-chip tip-chip--muted">Lv {{ slot.level }}</span>
              <span class="bt-cost tip-num">
                <Icon :icon="CHIMES_COST_ICON" width="12" height="12" />
                {{ $formatNumber(slot.nextCost) }}
              </span>
            </span>
          </div>
          <button
            class="tip-act bt-inline"
            :aria-label="`Level up ${slot.name} ${slot.count} time${slot.count === 1 ? '' : 's'}`"
            @click.stop="levelUpMax(slot.id)"
          >
            <Icon icon="ph:arrow-fat-up-fill" width="14" height="14" />
            ×{{ slot.count }}
          </button>
        </li>
      </ul>
      <div class="tip-hint tip-num">
        <Icon :icon="CHIMES_COST_ICON" width="12" height="12" />
        {{ $formatNumber(gameStore.chimes) }} Chimes available
      </div>
    </template>

    <!-- ══════════ SHOP ══════════ -->
    <!-- „Ready to Forge" und nicht „Shop Ready": der Reiter „Shop" ist seit der
         Trennung der Champion-Laden, diese Marke meint den Sternbaum. Die Zeilen
         sind bewusst NICHT klickbar — die Abteilung wählt der Skill-Tree-Reiter
         in einem lokalen Zustand, es gibt keinen Weg, sie von außen
         vorzuwählen. -->
    <template v-else-if="kind === 'shop'">
      <ul class="tip-rows">
        <li
          v-for="sec in shopFreshSections"
          :key="sec.id"
          class="tip-row"
          :style="{ '--cc': sec.accent }"
        >
          <Icon :icon="sec.icon" width="18" height="18" class="tip-row-ico" />
          <span class="tip-row-name">{{ sec.label }}</span>
          <span class="tip-row-val">{{ sec.count }}</span>
        </li>
      </ul>
      <!-- Steht ÜBER der Kasse: „wie viel geht überhaupt" gehört näher an die
           Zeilen als „wie viel habe ich". -->
      <div v-if="shopShowAffordableTotal" class="tip-hint tip-num">
        <Icon :icon="FORGE_AFFORDABLE_TOTAL_ICON" width="12" height="12" />
        {{ shopAffordableTotal }} affordable in total
      </div>
      <div class="tip-hint tip-num">
        <Icon :icon="CHIMES_COST_ICON" width="12" height="12" />
        {{ $formatNumber(gameStore.chimes) }} Chimes available
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Kopf, Zeilen, Chips, Wirkungsblock, Fußzeile und Knopf stehen als `.tip-*`
   global in `rpg-theme.css` — dieselbe Karte wie im Skill Tree. Hier bleibt
   nur, was diese sechs Arten voneinander unterscheidet: ein Porträt, ein
   Planetenmedaillon, eine zweizeilige Zelle. */
.bt {
  display: flex;
  flex-direction: column;
  gap: 0.74em;
  padding: 1.07em 1.24em 1.16em;
}

.bt--champions,
.bt--planet {
  min-width: 22em;
}

/* Eine Zeile, die etwas öffnet, muss den Zeiger fangen — `.tip` gibt ihn
   grundsätzlich nicht an. */
.bt-click {
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.12s;
}

.bt-click:hover {
  background: var(--rpg-bg-hover);
}

.bt-portrait {
  flex-shrink: 0;
  display: block;
  width: 2.2em;
  height: 2.2em;
  border-radius: 4px;
  object-fit: cover;
  object-position: top;
}

/* Medaillon in der Rollenfarbe des Slots. */
.bt-frame {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2.1em;
  height: 2.1em;
  background: radial-gradient(circle at 50% 38%, #191712 0%, #0c0a06 100%);
  border: 1px solid var(--cc, #3a8040);
  border-radius: 4px;
  box-shadow: inset 0 0 6px color-mix(in srgb, var(--cc, #3a8040) 30%, transparent);
}

.bt-planet {
  width: 1.6em;
  height: 1.6em;
  object-fit: contain;
}

.bt-stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15em;
}

.bt-sub {
  display: flex;
  align-items: center;
  gap: 0.45em;
}

.bt-cost {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  font-size: 0.9em;
  font-weight: 700;
  color: var(--rpg-gold);
}

/* Der Knopf IN einer Zeile: schmaler als der volle Balken darunter. */
.bt-inline {
  flex-shrink: 0;
  width: auto;
  gap: 0.3em;
  padding: 0.35em 0.7em;
  font-size: 0.9em;
}

/* Ein Wirkungsblock mit Motiv davor. */
.bt-lead {
  display: flex;
  align-items: center;
  gap: 0.62em;
}

.bt-lead-ico {
  flex-shrink: 0;
  width: 1.6em;
  height: 1.6em;
  object-fit: contain;
}

.bt-lead strong {
  color: var(--tip-color);
}
</style>

<script setup lang="ts">
import { watch, computed, ref, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GOLD,
  BOTTOM_FRAME_W_SHADOW,
  BOTTOM_FRAME_W_WOOD,
  BOTTOM_FRAME_W_GOLD,
  BOTTOM_BAR_EDGE_INSET,
} from '@/config/constants'
import { useUiStore } from '@/stores/uiStore'
import { useExpeditionStore } from '@/stores/expeditionStore'
import { useBattleStore } from '@/stores/battleStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import type { BardTabId } from '@/stores/uiStore'
import ShopComponent from '@/components/bardProfil/shop/ShopComponent.vue'
import SkillTreeComponent from '@/components/bardProfil/skill/SkillTreeComponent.vue'
import AdminDashboard from '@/components/bardProfil/admin/AdminDashboard.vue'
import BattleResultComponent from '@/components/bardProfil/battle/BattleResultComponent.vue'
import TeamTabComponent from '@/components/bardProfil/team/TeamTabComponent.vue'
import PlanetSelectTabComponent from '@/components/bardProfil/planets/PlanetSelectTabComponent.vue'
import BardStatsTab from '@/components/bardProfil/stats/BardStatsTab.vue'
import ActionToast from '@/components/bardProfil/ActionToast.vue'
import RpgBadgeTooltip from '@/components/ui/RpgBadgeTooltip.vue'
import ExpeditionReadyTip from '@/components/ui/ExpeditionReadyTip.vue'
import NewChampionsTip from '@/components/ui/NewChampionsTip.vue'
import ForgeReadyTip from '@/components/ui/ForgeReadyTip.vue'

const uiStore = useUiStore()
const expeditionStore = useExpeditionStore()
const battleStore = useBattleStore()
const solarStore = useSolarUpgradeStore()
const { newlyUnlockedChampions } = storeToRefs(battleStore)

const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)
const shopBadgeCount = computed(() => newlyUnlockedChampions.value.length)
const forgeBadgeReady = computed(() => solarStore.canUpgradeStar)

const menuItems: {
  id: BardTabId
  label: string
  icon: string
  src: string
}[] = [
  { id: 'bard', label: '', icon: '', src: '/img/BardAbilities/Bard.png' },
  { id: 'shop', label: '', icon: '', src: '/img/menu/SHOP.png' },
  { id: 'tree', label: '', icon: '', src: '/img/menu/TREE.png' },
  { id: 'team', label: '', icon: '', src: '/img/menu/TEAM.png' },
  { id: 'battle', label: '', icon: '', src: '/img/menu/BATTLE.png' },
  { id: 'planets', label: '', icon: '', src: '/img/planet.png' },
  { id: 'admin', label: 'Admin', icon: 'game-icons:settings-knobs', src: '' },
]

/* Tree-Tab lazy mounten und danach behalten (v-show): der Vue-Flow-Remount
   (26 Nodes + fitView) bei jedem Tab-Wechsel verursachte spürbare FPS-Drops. */
const treeTabMounted = ref(false)

/* ── SVG-Holzrahmen (gleiche Technik wie BottomBar / Header / Encyclopedia):
   Schatten → Holz → Goldlinie als Strokes über dem Content. Maße + Eckradius
   werden vom gerenderten Modal gelesen (Radius = notch-r × hud-scale). */
const modalRef = ref<HTMLDivElement | null>(null)
const modalW = ref(0)
const modalH = ref(0)
const modalR = ref(0)

let frameObserver: ResizeObserver | null = null

function measureModal(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  modalW.value = rect.width
  modalH.value = rect.height
  modalR.value = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
}

watch(modalRef, (el) => {
  frameObserver?.disconnect()
  frameObserver = null
  if (el) {
    measureModal(el)
    frameObserver = new ResizeObserver(() => measureModal(el))
    frameObserver.observe(el)
  }
})

/** Geschlossene Rundrect-Kontur, um BOTTOM_BAR_EDGE_INSET nach innen versetzt —
    gleiche Konstruktion wie framePath in BottomBarComponent / EncyclopediaPanel. */
const modalFramePath = computed(() => {
  const O = BOTTOM_BAR_EDGE_INSET
  const W = modalW.value
  const H = modalH.value
  const r = Math.max(0, modalR.value - O)
  return [
    `M ${O + r},${O}`,
    `L ${W - O - r},${O}`,
    `A ${r},${r} 0 0,1 ${W - O},${O + r}`,
    `L ${W - O},${H - O - r}`,
    `A ${r},${r} 0 0,1 ${W - O - r},${H - O}`,
    `L ${O + r},${H - O}`,
    `A ${r},${r} 0 0,1 ${O},${H - O - r}`,
    `L ${O},${O + r}`,
    `A ${r},${r} 0 0,1 ${O + r},${O}`,
    'Z',
  ].join(' ')
})

onUnmounted(() => {
  frameObserver?.disconnect()
  frameObserver = null
})

watch(
  () => uiStore.bardActiveTab,
  (val) => {
    document.body.classList.toggle('bard-modal-open', val !== null)
    if (val === 'tree') treeTabMounted.value = true
    // Modal geschlossen → Wrapper (v-if) zerstört alle Tabs mit; ein noch
    // offener Battle-Return-Kontext ist dann obsolet (Return-Button hat beim
    // Klick bereits selbst gecleart — hier greift nur das manuelle Schließen)
    else if (val === null) {
      treeTabMounted.value = false
      uiStore.clearBattleReturn()
    }
  },
)
</script>

<template>
  <button class="btn-gem btn-gem--corner-left" title="Open Shop" @click="uiStore.setBardTab('shop')">
    <img src="/img/menu/SHOP.png" class="btn-gem-img" alt="Open Shop" />
  </button>

  <!-- ══ Backdrop + Modal ══ -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="uiStore.bardActiveTab !== null"
        class="fixed inset-0 z-[115] bg-black/80"
        @click="uiStore.closeBardModal()"
      />
    </Transition>

    <Transition name="modal-pop">
      <div v-if="uiStore.bardActiveTab !== null" class="rp-wrapper">
        <div ref="modalRef" class="flex flex-col rp-modal">
          <!-- Rahmen über dem Content — identischer Aufbau wie .bar-frame der
               Bottom-Bar / .enc-frame (Schatten → Holz → Goldlinie) -->
          <svg
            v-if="modalW && modalH"
            class="rp-frame"
            :width="modalW"
            :height="modalH"
            aria-hidden="true"
          >
            <path
              :d="modalFramePath"
              fill="none"
              :stroke="BOTTOM_FRAME_STROKE_SHADOW"
              :stroke-width="BOTTOM_FRAME_W_SHADOW"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              :d="modalFramePath"
              fill="none"
              :stroke="BOTTOM_FRAME_STROKE_WOOD"
              :stroke-width="BOTTOM_FRAME_W_WOOD"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              :d="modalFramePath"
              fill="none"
              :stroke="BOTTOM_FRAME_STROKE_GOLD"
              :stroke-width="BOTTOM_FRAME_W_GOLD"
              stroke-linecap="round"
            />
          </svg>

          <div class="rp-accent-bar" />

          <div class="flex items-center flex-shrink-0 rp-modal-header">
            <div class="flex items-center justify-center flex-1 gap-1.5 px-2 py-2">
              <button
                v-for="item in menuItems"
                :key="item.id"
                @click="uiStore.setBardTab(item.id)"
                class="rp-tab relative flex items-center justify-center gap-1.5 overflow-hidden"
                :class="uiStore.bardActiveTab === item.id ? 'rp-tab--active' : ''"
              >
                <img
                  v-if="item.src"
                  :src="item.src"
                  :alt="item.label"
                  class="relative z-10 object-contain rp-tab-img"
                  :class="uiStore.bardActiveTab === item.id ? 'rp-tab-img-glow' : ''"
                />
                <Icon v-else-if="item.icon.includes(':')" :icon="item.icon" class="relative z-10 rp-tab-icon" />
                <span v-else class="relative z-10 text-sm">{{ item.icon }}</span>
                <span v-if="item.label" class="relative z-10 rp-tab-label">{{ item.label }}</span>
                <span
                  v-if="uiStore.bardActiveTab === item.id"
                  class="absolute bottom-0 rp-tab-indicator left-2 right-2"
                />
                <div v-if="item.id === 'team'" class="team-badge-row">
                  <RpgBadgeTooltip>
                    <span v-if="expeditionBadgeCount > 0" class="mini-badge mini-badge--expedition">{{ expeditionBadgeCount }}</span>
                    <template #tip="{ close }">
                      <ExpeditionReadyTip @collected="close" />
                    </template>
                  </RpgBadgeTooltip>
                  <RpgBadgeTooltip>
                    <span v-if="shopBadgeCount > 0" class="mini-badge mini-badge--shop">{{ shopBadgeCount }}</span>
                    <template #tip="{ close }">
                      <NewChampionsTip @picked="close" />
                    </template>
                  </RpgBadgeTooltip>
                </div>
                <div v-if="item.id === 'shop' && forgeBadgeReady" class="team-badge-row">
                  <RpgBadgeTooltip>
                    <span class="mini-badge mini-badge--forge">✦</span>
                    <template #tip>
                      <ForgeReadyTip />
                    </template>
                  </RpgBadgeTooltip>
                </div>
              </button>
            </div>
          </div>

          <div class="relative flex-1 min-h-0 overflow-hidden rp-modal-content">
            <ActionToast />
            <!-- Battle-Tab: immer gemountet (v-show), Watch + Simulation bleiben aktiv -->
            <div v-show="uiStore.bardActiveTab === 'battle'" class="battle-tab-layer">
              <BattleResultComponent />
            </div>

            <!-- Tree-Tab: nach erstem Öffnen gemountet lassen (v-show) — spart
                 den teuren Vue-Flow-Remount bei jedem erneuten Reintappen -->
            <div v-show="uiStore.bardActiveTab === 'tree'" class="tree-tab-layer">
              <SkillTreeComponent v-if="treeTabMounted" />
            </div>

            <Transition name="tab-fade" mode="out-in">
              <div v-if="uiStore.bardActiveTab === 'bard'" key="bard" class="h-full">
                <BardStatsTab />
              </div>
              <div
                v-else-if="uiStore.bardActiveTab === 'shop'"
                key="shop"
                class="h-full overflow-y-auto rp-scrollbar"
              >
                <ShopComponent />
              </div>
              <div v-else-if="uiStore.bardActiveTab === 'team'" key="team" class="h-full">
                <TeamTabComponent />
              </div>

              <div
                v-else-if="uiStore.bardActiveTab === 'planets'"
                key="planets"
                class="h-full overflow-hidden"
              >
                <PlanetSelectTabComponent />
              </div>

              <div
                v-else-if="uiStore.bardActiveTab === 'admin'"
                key="admin"
                class="h-full overflow-hidden"
              >
                <AdminDashboard />
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<!-- xp-tt Level-Tooltip → ersetzt durch ui/RpgBadgeTooltip.vue + LevelProgressTip.vue -->

<style scoped>
.team-badge-row {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  /* the row itself stays click-through; the badges re-enable hover so their
     tooltips work — clicks on a badge still bubble to the tab button */
  pointer-events: none;
  z-index: 20;
}

.mini-badge {
  pointer-events: auto;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  animation: team-badge-pulse 1.8s ease-in-out infinite;
}

.mini-badge--expedition {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  border: 1.5px solid #c9a0ff;
  --tb-glow-a: rgba(168, 85, 247, 0.5);
  --tb-glow-b: rgba(168, 85, 247, 0.9);
  --tb-glow-c: rgba(124, 58, 237, 0.4);
}

.mini-badge--forge {
  background: linear-gradient(135deg, #f0d060, #c89040);
  border: 1.5px solid #ffe080;
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.5);
  --tb-glow-a: rgba(232, 192, 64, 0.55);
  --tb-glow-b: rgba(240, 208, 96, 0.95);
  --tb-glow-c: rgba(200, 144, 64, 0.45);
}

.mini-badge--shop {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  border: 1.5px solid #38bdf8;
  --tb-glow-a: rgba(6, 182, 212, 0.5);
  --tb-glow-b: rgba(6, 182, 212, 0.9);
  --tb-glow-c: rgba(8, 145, 178, 0.4);
}

@keyframes team-badge-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 4px var(--tb-glow-a);
  }
  50% {
    transform: scale(1.15);
    box-shadow:
      0 0 10px var(--tb-glow-b),
      0 0 18px var(--tb-glow-c);
  }
}

/* ═══════════════════════════════════════════
   MODAL RAHMEN
   ═══════════════════════════════════════════ */
.rp-wrapper {
  position: fixed;
  z-index: 125;
  /* one uniform gap to the bottom-bar neighbours: left → MiniMap edge,
     right → CommandPanel edge, bottom → scoreboard strip. Both side panels
     are exactly --hud-panel-size wide (BOTTOM_BAR_SIDE_W × --hud-scale). */
  --bp-gap: 10px;
  left: calc(var(--hud-panel-size, 330px) + var(--bp-gap));
  right: calc(var(--hud-panel-size, 330px) + var(--bp-gap));
  top: calc(var(--level-badge-bottom, calc(var(--header-total-height) + 60px)) + 8px);
  bottom: calc(var(--bottom-center-strip-h, 79px) + var(--bp-gap));
}

.rp-modal {
  position: relative;
  overflow: hidden;
  background: #111008;
  /* same curve as the bottom-bar notches directly beside the modal, where the
     minimap/command panels meet the scoreboard strip (BOTTOM_BAR_NOTCH_R ×
     --hud-scale) — corner and notch share one curvature at every resolution */
  border-radius: calc(var(--bottom-notch-r, 26px) * var(--hud-scale, 1));
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
  height: 100%;
}

/* Rahmen-SVG ÜBER dem Content (Muster: Bottom-Bar .bar-frame / .enc-frame) —
   Content scrollt sichtbar unter den Strichen durch, der Rahmen bleibt zu */
.rp-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}

.rp-accent-bar {
  height: 3px;
  flex-shrink: 0;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c060, #d4a020, #c89040, #5c3310);
  box-shadow: 0 0 8px rgba(200, 150, 30, 0.5);
}

/* ═══════════════════════════════════════════
   MODAL HEADER
   ═══════════════════════════════════════════ */
.rp-modal-header {
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════ */
/* height-aware tab art: smaller header leaves more room for tab content */
.rp-tab-img {
  width: clamp(34px, 5vh, 48px);
  height: clamp(34px, 5vh, 48px);
}

.rp-tab-icon {
  width: clamp(26px, 3.8vh, 36px);
  height: clamp(26px, 3.8vh, 36px);
}

.rp-tab {
  padding: clamp(5px, 0.9vh, 9px) clamp(10px, 1.2vw, 16px);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #555;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition: all 0.12s;
}

.rp-tab:hover:not(.rp-tab--active) {
  color: #999;
  background: rgba(255, 255, 255, 0.04);
  border-color: #333;
}

.rp-tab--active {
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border-color: #4a8a28;
  color: #fff;
  box-shadow:
    0 0 10px rgba(74, 138, 40, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.rp-tab-img-glow {
  filter: drop-shadow(0 0 6px rgba(100, 210, 50, 0.55));
}

.rp-tab-label {
  font-size: 11px;
  font-weight: 900;
}

.rp-tab-indicator {
  height: 2px;
  background: #52b830;
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(82, 184, 48, 0.7);
}

/* ═══════════════════════════════════════════
   MODAL CONTENT
   ═══════════════════════════════════════════ */
.rp-modal-content {
  background: #1a1008;
}

.battle-tab-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.tree-tab-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

/* ═══════════════════════════════════════════
   SCROLLBAR
   ═══════════════════════════════════════════ */
.rp-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}
.rp-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.rp-scrollbar::-webkit-scrollbar-track {
  background: #111;
}
.rp-scrollbar::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 3px;
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease;
}
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}

</style>

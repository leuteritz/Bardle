<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
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

watch(
  () => uiStore.bardActiveTab,
  (val) => {
    document.body.classList.toggle('bard-modal-open', val !== null)
    if (val === 'tree') treeTabMounted.value = true
    // Modal geschlossen → Wrapper (v-if) zerstört alle Tabs mit
    else if (val === null) treeTabMounted.value = false
  },
)
</script>

<template>
  <button class="btn-gem" title="Open Shop" @click="uiStore.setBardTab('shop')">
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
        <div class="flex flex-col rp-modal">
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
  border: 4px solid #7a4e20;
  border-radius: var(--bp-radius);
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
  height: 100%;
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

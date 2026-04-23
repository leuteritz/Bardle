<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePersistence } from '@/composables/usePersistence'
import ShopComponent from '@/components/bardProfil/shop/ShopComponent.vue'
import SkillTreeComponent from '@/components/bardProfil/skill/SkillTreeComponent.vue'
import AdminDashboard from '@/components/bardProfil/admin/AdminDashboard.vue'
import BattleResultComponent from '@/components/bardProfil/battle/BattleResultComponent.vue'
import TeamTabComponent from '@/components/bardProfil/team/TeamTabComponent.vue'
import PlanetShopSection from '@/components/bardProfil/planet/PlanetShopSection.vue'

const gameStore = useGameStore()
const xpProgress = computed(() => gameStore.levelProgress / 100)

const { resetGame } = usePersistence()
const handleReset = () => {
  if (
    window.confirm(
      'Spielstand wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    )
  ) {
    resetGame()
  }
}

type ModalId = 'shop' | 'tree' | 'team' | 'kampf' | 'admin' | 'planets'
const activeModal = ref<ModalId | null>(null)

const menuItems: {
  id: ModalId
  label: string
  icon: string
  src: string
}[] = [
  { id: 'shop', label: '', icon: '', src: '/img/menu/SHOP.png' },
  { id: 'tree', label: '', icon: '', src: '/img/menu/TREE.png' },
  { id: 'team', label: '', icon: '', src: '/img/menu/TEAM.png' },
  { id: 'kampf', label: '', icon: '', src: '/img/menu/BATTLE.png' },
  { id: 'planets', label: '', icon: '⚙️', src: '' },
  { id: 'admin', label: 'Admin', icon: '⚙️', src: '' },
]

const openBardModal = () => {
  activeModal.value = activeModal.value !== null ? null : 'shop'
}
const setTab = (id: ModalId) => {
  activeModal.value = id
}
const closeModal = () => {
  activeModal.value = null
}

watch(activeModal, (val) => {
  document.body.classList.toggle('bard-modal-open', val !== null)
})

const chimesForLevel = computed(() => ({
  current: gameStore.currentLevelChimes,
  total: gameStore.totalChimesThisLevel,
}))

const portraitRef = ref<HTMLElement | null>(null)
const showXpTooltip = ref(false)
const xpTooltipStyle = ref<{ left: string; top: string }>({ left: '0px', top: '0px' })

function onPortraitEnter() {
  if (portraitRef.value) {
    const rect = portraitRef.value.getBoundingClientRect()
    xpTooltipStyle.value = {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 10}px`,
    }
  }
  showXpTooltip.value = true
}

function onPortraitLeave() {
  showXpTooltip.value = false
}
</script>

<template>
  <!-- Kein flex-gap mehr – Portrait allein, kein Layoutplatz für Reset -->
  <div class="relative">
    <!-- ══ Bard Portrait ══ -->
    <div
      ref="portraitRef"
      class="bard-portrait-wrapper group"
      @click="openBardModal"
      @mouseenter="onPortraitEnter"
      @mouseleave="onPortraitLeave"
    >
      <div class="relative w-36 h-36">
        <!-- XP-Ring (Gold) -->
        <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(160,110,15,0.25)"
            stroke-width="7"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#d4a020"
            stroke-width="7"
            stroke-linecap="butt"
            :stroke-dasharray="`${xpProgress * 283} 283`"
            class="transition-all duration-1000 ease-out"
          />
        </svg>

        <!-- Portrait -->
        <div class="absolute overflow-hidden inset-2 bard-portrait-inner">
          <img
            src="/img/BardAbilities/Bard.png"
            class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
        </div>

        <!-- Level Badge -->
        <div class="absolute flex items-center -bottom-1 -right-1">
          <div class="z-10 flex items-center justify-center bard-level-badge h-9 w-9">
            <span class="bard-level-text">{{ gameStore.level }}</span>
          </div>
        </div>

        <!-- ══ Reset: absolut unten-links, erscheint nur bei Hover, 0px Layoutbreite ══ -->
        <button class="rp-reset-overlay" title="Spielstand löschen" @click.stop="handleReset">
          ✕
        </button>
      </div>
    </div>
  </div>

  <!-- ══ XP-Tooltip (Teleport → body, position:fixed) ══ -->
  <Teleport to="body">
    <Transition name="xp-tt">
      <div v-if="showXpTooltip" class="xp-tt" :style="xpTooltipStyle" aria-hidden="true">
        <div class="xp-tt__caret" />
        <span class="xp-tt__label">Nächstes Level</span>
        <div class="xp-tt__row">
          <span class="xp-tt__current">{{ chimesForLevel.current.toLocaleString('de-DE') }}</span>
          <span class="xp-tt__sep">/</span>
          <span class="xp-tt__total">{{ chimesForLevel.total.toLocaleString('de-DE') }}</span>
          <span class="xp-tt__unit">Chimes</span>
        </div>
        <div class="xp-tt__bar-track">
          <div class="xp-tt__bar-fill" :style="{ width: `${xpProgress * 100}%` }" />
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ══ Backdrop + Modal ══ -->
  <Teleport to="body">
    <Transition name="backdrop">
      <div
        v-if="activeModal !== null"
        class="fixed inset-0 z-[115] bg-black/80"
        @click="closeModal"
      />
    </Transition>

    <Transition name="modal-pop">
      <div
        v-if="activeModal !== null"
        class="fixed z-[125] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[960px] max-w-[95vw]"
      >
        <div class="rp-modal flex flex-col h-[960px]">
          <div class="rp-accent-bar" />

          <div class="flex items-center flex-shrink-0 rp-modal-header">
            <div class="relative flex items-center justify-center flex-shrink-0 w-20 h-20">
              <img
                src="/img/BardPortalRichtig.png"
                alt="Portal"
                class="relative z-10 object-contain w-[72px] h-[72px]"
              />
              <div class="absolute inset-0 portal-effect">
                <div class="portal-glow" />
                <div class="portal-vortex" />
                <div class="portal-ring" />
              </div>
            </div>

            <div class="flex items-center justify-center flex-1 gap-1.5 px-2 py-2">
              <button
                v-for="item in menuItems"
                :key="item.id"
                @click="setTab(item.id)"
                class="rp-tab relative flex items-center justify-center gap-1.5 overflow-hidden"
                :class="activeModal === item.id ? 'rp-tab--active' : ''"
              >
                <img
                  v-if="item.src"
                  :src="item.src"
                  :alt="item.label"
                  class="relative z-10 object-contain w-14 h-14"
                  :class="activeModal === item.id ? 'rp-tab-img-glow' : ''"
                />
                <span v-else class="relative z-10 text-sm">{{ item.icon }}</span>
                <span v-if="item.label" class="relative z-10 rp-tab-label">{{ item.label }}</span>
                <span
                  v-if="activeModal === item.id"
                  class="absolute bottom-0 rp-tab-indicator left-2 right-2"
                />
              </button>
            </div>

            <div class="relative flex items-center justify-center flex-shrink-0 w-20 h-20">
              <img
                src="/img/PortalEndeRichtig.png"
                alt="Portal Ende"
                class="relative z-10 object-contain w-[72px] h-[72px]"
              />
              <div class="absolute inset-0 portal-effect">
                <div class="portal-glow" />
                <div class="portal-vortex" />
                <div class="portal-ring" />
              </div>
            </div>
          </div>

          <div class="relative flex-1 min-h-0 overflow-hidden rp-modal-content">
            <Transition name="tab-fade" mode="out-in">
              <div
                v-if="activeModal === 'shop'"
                key="shop"
                class="h-full overflow-y-auto rp-scrollbar"
              >
                <ShopComponent />
              </div>
              <div v-else-if="activeModal === 'tree'" key="tree" class="h-full p-4 overflow-hidden">
                <SkillTreeComponent />
              </div>
              <div v-else-if="activeModal === 'team'" key="team" class="h-full">
                <TeamTabComponent />
              </div>
              <div
                v-else-if="activeModal === 'kampf'"
                key="kampf"
                class="h-full overflow-y-auto rp-scrollbar"
              >
                <BattleResultComponent />
              </div>
              <!-- ← NEU: Planeten-Tab -->
              <div
                v-else-if="activeModal === 'planets'"
                key="planets"
                class="h-full overflow-y-auto rp-scrollbar"
              >
                <PlanetShopSection />
              </div>
              <div
                v-else-if="activeModal === 'admin'"
                key="admin"
                class="h-full overflow-y-auto rp-scrollbar"
              >
                <AdminDashboard :inline="true" />
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<!-- Globale Styles für teleportierte Elemente -->
<style>
.xp-tt {
  position: fixed;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 16px;
  background: linear-gradient(to bottom, #1e1a0e, #130f09);
  border: 2px solid #7a4e20;
  border-radius: 4px;
  white-space: nowrap;
  min-width: 158px;
  box-shadow:
    0 10px 32px rgba(0, 0, 0, 0.92),
    inset 0 0 0 1px rgba(255, 200, 80, 0.09),
    inset 0 1px 0 rgba(255, 200, 80, 0.06);
}

.xp-tt__caret {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 8px solid #7a4e20;
}
.xp-tt__caret::after {
  content: '';
  position: absolute;
  top: 3px;
  left: -5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 6px solid #1e1a0e;
}

.xp-tt__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 200, 80, 0.38);
  line-height: 1;
  margin-bottom: 2px;
}

.xp-tt__row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.xp-tt__current {
  font-size: 14px;
  font-weight: 900;
  color: #e8c040;
}
.xp-tt__sep {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.22);
}
.xp-tt__total {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.52);
}
.xp-tt__unit {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  margin-left: 3px;
}

.xp-tt__bar-track {
  height: 3px;
  background: rgba(255, 200, 80, 0.1);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}
.xp-tt__bar-fill {
  height: 100%;
  background: linear-gradient(to right, #c89040, #f0d060);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(240, 208, 96, 0.5);
  transition: width 0.8s ease;
}

.xp-tt-enter-active,
.xp-tt-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.xp-tt-enter-from,
.xp-tt-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-5px);
}
.xp-tt-enter-to,
.xp-tt-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>

<style scoped>
/* ═══════════════════════════════════════════
   BARD PORTRAIT
   ═══════════════════════════════════════════ */
.bard-portrait-wrapper {
  cursor: pointer;
}

.bard-portrait-inner {
  border-radius: 50%;
}

.bard-level-badge {
  border-radius: 50%;
  background: linear-gradient(to bottom, #4a8a28, #2e6018);
  border: 2px solid #6ec040;
  box-shadow:
    0 0 8px rgba(80, 180, 40, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.bard-level-text {
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

/* ═══════════════════════════════════════════
   RESET OVERLAY – nimmt keinen Layoutplatz ein
   ═══════════════════════════════════════════ */
.rp-reset-overlay {
  position: absolute;
  bottom: 5px;
  left: 5px;
  width: 20px;
  height: 20px;
  font-size: 9px;
  font-weight: 900;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  background: linear-gradient(to bottom, #4a1010, #2e0808);
  border: 1.5px solid #8a3020;
  border-radius: 50%;
  color: #cc6050;
  cursor: pointer;
  z-index: 20;

  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    background 0.12s ease,
    border-color 0.12s ease;
}

.group:hover .rp-reset-overlay {
  opacity: 1;
  transform: scale(1);
}

.rp-reset-overlay:hover {
  background: linear-gradient(to bottom, #6a1818, #4a0e0e);
  color: #ff9080;
  border-color: #cc4830;
}

.rp-reset-overlay:active {
  transform: scale(0.88);
}

/* ═══════════════════════════════════════════
   MODAL RAHMEN
   ═══════════════════════════════════════════ */
.rp-modal {
  position: relative;
  overflow: hidden;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310,
    0 25px 60px rgba(0, 0, 0, 0.95),
    0 0 0 1px #2a1608;
  max-height: 90dvh;
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
.rp-tab {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #555;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
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
   PORTAL EFFECTS
   ═══════════════════════════════════════════ */
.portal-effect {
  border-radius: 50%;
  position: absolute;
  overflow: visible;
}

.portal-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 215, 0, 0.45) 0%,
    rgba(255, 180, 0, 0.28) 40%,
    rgba(180, 120, 0, 0.08) 70%,
    transparent 100%
  );
  filter: blur(10px);
  animation: portalPulse 4s ease-in-out infinite;
}

.portal-vortex {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 215, 0, 0.6),
    rgba(180, 130, 20, 0.2),
    rgba(255, 200, 50, 0.5),
    rgba(120, 80, 10, 0.15),
    rgba(255, 215, 0, 0.6)
  );
  mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
  -webkit-mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
}
.portal-vortex::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(40, 20, 5, 0.45) 0%,
    rgba(80, 50, 10, 0.35) 35%,
    rgba(180, 120, 20, 0.3) 60%,
    transparent 80%
  );
}

.portal-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)) padding-box,
    linear-gradient(135deg, #ffd700, #b8860b, #ffd700, #daa520, #ffd700) border-box;
  box-shadow:
    0 0 12px 2px rgba(255, 215, 0, 0.4),
    inset 0 0 10px 2px rgba(255, 215, 0, 0.25);
  animation: portalPulse 4s ease-in-out infinite;
}

@keyframes portalPulse {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
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
  transform: translate(-50%, -50%) scale(0.95);
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

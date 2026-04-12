<script setup lang="ts">
// ── Script identisch, keine Änderungen ──
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { usePersistence } from '@/composables/usePersistence'
import ShopComponent from '@/components/bardProfil/shop/ShopComponent.vue'
import SkillTreeComponent from '@/components/bardProfil/skill/SkillTreeComponent.vue'
import AdminDashboard from '@/components/bardProfil/admin/AdminDashboard.vue'
import BattleResultComponent from '@/components/bardProfil/battle/BattleResultComponent.vue'
import TeamTabComponent from '@/components/bardProfil/team/TeamTabComponent.vue' // ←

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

type ModalId = 'shop' | 'tree' | 'team' | 'kampf' | 'admin'
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

const chimesForLevel = computed(() => {
  const progress = gameStore.levelProgress / 100
  if (progress <= 0) return { current: 0, total: gameStore.chimesToNextLevel }
  const total = Math.round(gameStore.chimesToNextLevel / (1 - progress))
  const current = total - gameStore.chimesToNextLevel
  return { current, total }
})
</script>

<template>
  <div class="relative flex items-start gap-2">
    <!-- ══ Bard Portrait ══ -->
    <div class="bard-portrait-wrapper group" @click="openBardModal">
      <div class="relative w-36 h-36">
        <!-- XP-Ring (Gold statt Blau) -->
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

        <!-- Level Badge + Hover XP Tooltip -->
        <div class="absolute flex items-center -bottom-1 -right-1">
          <div class="z-10 flex items-center justify-center bard-level-badge h-9 w-9">
            <span class="bard-level-text">{{ gameStore.level }}</span>
          </div>

          <div
            class="absolute ml-2 transition-all duration-200 scale-95 opacity-0 pointer-events-none bard-xp-tooltip left-full group-hover:opacity-100 group-hover:scale-100 whitespace-nowrap"
          >
            <span class="xp-current">{{ chimesForLevel.current.toLocaleString() }}</span>
            <span class="xp-sep">/</span>
            <span class="xp-total">{{ chimesForLevel.total.toLocaleString() }}</span>
            <span class="xp-label">Chimes</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Button -->
    <button class="mt-1 rp-reset-btn" title="Spielstand löschen" @click="handleReset">Reset</button>
  </div>

  <Teleport to="body">
    <!-- ══ Backdrop ══ -->
    <Transition name="backdrop">
      <div
        v-if="activeModal !== null"
        class="fixed inset-0 z-[115] bg-black/80"
        @click="closeModal"
      />
    </Transition>

    <!-- ══ Modal ══ -->
    <Transition name="modal-pop">
      <div
        v-if="activeModal !== null"
        class="fixed z-[125] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[960px] max-w-[95vw]"
      >
        <div class="rp-modal flex flex-col h-[960px]">
          <!-- Goldene Akzentlinie oben -->
          <div class="rp-accent-bar" />

          <!-- ── Header ── -->
          <div class="flex items-center flex-shrink-0 rp-modal-header">
            <!-- Portal Links -->
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

            <!-- Tabs -->
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
                <!-- Aktiv-Indikator -->
                <span
                  v-if="activeModal === item.id"
                  class="absolute bottom-0 rp-tab-indicator left-2 right-2"
                />
              </button>
            </div>

            <!-- Portal Rechts -->
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

          <!-- ── Content ── -->
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

/* XP Tooltip */
.bard-xp-tooltip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: #16140e;
  border: 2px solid #7a4e20;
  border-radius: 3px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.8),
    inset 0 0 0 1px #2a1a08;
}
.xp-current {
  font-size: 13px;
  font-weight: 900;
  color: #e8c040;
}
.xp-sep {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.25);
}
.xp-total {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
}
.xp-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  margin-left: 2px;
}

/* ═══════════════════════════════════════════
   RESET BUTTON
   ═══════════════════════════════════════════ */
.rp-reset-btn {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.5px;
  background: linear-gradient(to bottom, #4a1010, #2e0808);
  border: 2px solid #8a3020;
  border-radius: 3px;
  color: #cc6050;
  cursor: pointer;
  transition: all 0.1s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
.rp-reset-btn:hover {
  background: linear-gradient(to bottom, #5a1515, #3e0c0c);
  color: #e08070;
  border-color: #aa4030;
}

/* ═══════════════════════════════════════════
   MODAL RAHMEN (gleicher Holz-Stil wie Shop)
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

/* Gold-Shimmer oben */
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
   PORTAL EFFECTS (unverändert)
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

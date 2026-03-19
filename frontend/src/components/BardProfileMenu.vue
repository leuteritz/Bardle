<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import ShopComponent from './gameCenter/idle/ShopComponent.vue'
import RankComponent from './RankComponent.vue'
import SkillTreeComponent from './SkillTreeComponent.vue'
import AdminDashboard from './AdminDashboard.vue'
import ChampionLobbyComponent from './gameCenter/champion/ChampionLobbyComponent.vue'
import BattleResultComponent from './gameCenter/battle/BattleResultComponent.vue'
import MissionComponent from './missions/MissionComponent.vue'

const gameStore = useGameStore()
const xpProgress = computed(() => gameStore.levelProgress / 100)

type ModalId = 'shop' | 'charakter' | 'kampf' | 'admin'

const activeModal = ref<ModalId | null>(null)

const menuItems: {
  id: ModalId
  label: string
  icon: string
  src: string
  color: string
  gradient: string
}[] = [
  {
    id: 'charakter',
    label: 'Charakter',
    icon: '🎭',
    src: '',
    color: 'violet',
    gradient: 'bg-gradient-to-r from-violet-500 to-purple-600',
  },
  {
    id: 'kampf',
    label: 'Kampf',
    icon: '',
    src: '/img/menu/BATTLE.png',
    color: 'rose',
    gradient: 'bg-gradient-to-r from-rose-500 to-red-600',
  },
  {
    id: 'shop',
    label: 'Shop',
    icon: '',
    src: '/img/menu/SHOP.png',
    color: 'emerald',
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '⚙️',
    src: '',
    color: 'cyan',
    gradient: 'bg-gradient-to-r from-cyan-500 to-indigo-600',
  },
]

const activeCharTab = ref<'rang' | 'faehigkeiten' | 'missionen'>('rang')
const activeKampfTab = ref<'champions' | 'ergebnisse'>('champions')

const openBardModal = () => {
  activeModal.value = activeModal.value !== null ? null : 'charakter'
}
const setTab = (id: ModalId) => {
  activeModal.value = id
}
const closeModal = () => {
  activeModal.value = null
}

const modalTheme = computed(() => {
  const themes: Record<
    ModalId,
    {
      accentBar: string
      headerBg: string
      border: string
      glow: string
      tabActive: string
      iconGlow: string
      closeHover: string
    }
  > = {
    charakter: {
      accentBar: 'from-violet-500 via-purple-400 to-violet-500',
      headerBg: 'bg-gradient-to-r from-violet-950/50 via-purple-950/30 to-transparent',
      border: 'border-violet-500/20',
      glow: 'shadow-[0_0_80px_rgba(124,58,237,0.12)]',
      tabActive: 'bg-gradient-to-r from-violet-500 to-purple-600',
      iconGlow: 'shadow-[0_0_12px_rgba(124,58,237,0.4)] ring-1 ring-violet-400/40',
      closeHover: 'hover:bg-violet-500/20',
    },
    kampf: {
      accentBar: 'from-rose-500 via-red-400 to-rose-500',
      headerBg: 'bg-gradient-to-r from-rose-950/50 via-red-950/30 to-transparent',
      border: 'border-rose-500/20',
      glow: 'shadow-[0_0_80px_rgba(225,29,72,0.10)]',
      tabActive: 'bg-gradient-to-r from-rose-500 to-red-600',
      iconGlow: 'shadow-[0_0_12px_rgba(225,29,72,0.4)] ring-1 ring-rose-400/40',
      closeHover: 'hover:bg-rose-500/20',
    },
    shop: {
      accentBar: 'from-emerald-400 via-amber-400 to-emerald-400',
      headerBg: 'bg-gradient-to-r from-emerald-950/50 via-teal-950/30 to-transparent',
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_80px_rgba(16,185,129,0.10)]',
      tabActive: '',
      iconGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/40',
      closeHover: 'hover:bg-emerald-500/20',
    },
    admin: {
      accentBar: 'from-cyan-400 via-indigo-400 to-cyan-400',
      headerBg: 'bg-gradient-to-r from-cyan-950/50 via-indigo-950/30 to-transparent',
      border: 'border-cyan-500/20',
      glow: 'shadow-[0_0_80px_rgba(6,182,212,0.10)]',
      tabActive: '',
      iconGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/40',
      closeHover: 'hover:bg-cyan-500/20',
    },
  }
  return activeModal.value ? themes[activeModal.value] : themes.charakter
})
</script>

<template>
  <div class="relative flex items-start">
    <!-- ─── Bard Portrait ─── -->
    <div class="cursor-pointer group" @click="openBardModal">
      <div class="relative w-36 h-36">
        <div
          class="absolute rounded-full -inset-1 bg-gradient-to-r from-blue-400 via-violet-400 to-blue-500 opacity-40 animate-pulse"
        />
        <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(59 130 246 / 0.3)"
            stroke-width="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(59 130 246)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="`${xpProgress * 283} 283`"
            class="transition-all duration-1000 ease-out"
            style="filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))"
          />
        </svg>
        <div
          class="absolute overflow-hidden border-2 rounded-full shadow-2xl inset-2 border-blue-400/50 bg-gradient-to-br from-white/20 to-white/5"
        >
          <img
            src="/img/BardAbilities/Bard.png"
            class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div class="absolute -bottom-1 -right-1">
          <div
            class="flex items-center justify-center border-2 rounded-full shadow-lg h-9 w-9 bg-gradient-to-br from-blue-500 to-violet-600 border-blue-300/50"
          >
            <span class="text-xl font-black text-white">{{ gameStore.level }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── Backdrop ─── -->
  <Transition name="backdrop">
    <div
      v-if="activeModal !== null"
      class="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
      @click="closeModal"
    />
  </Transition>

  <!-- ─── Modal ─── -->
  <Transition name="modal-pop">
    <div
      v-if="activeModal !== null"
      class="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] max-w-[95vw]"
    >
      <div
        class="group relative overflow-hidden rounded-3xl border backdrop-blur-xl bg-gradient-to-b from-[#050310]/97 via-[#0c0828]/95 to-[#060415]/97 flex flex-col max-h-[90vh]"
        :class="[modalTheme.border, modalTheme.glow]"
      >
        <!-- Top Accent Bar -->
        <Transition name="accent-bar">
          <div
            :key="activeModal"
            class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r rounded-t-3xl pointer-events-none"
            :class="modalTheme.accentBar"
          />
        </Transition>

        <!-- Shimmer Sweep -->
        <div
          class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
        />

        <!-- ─── Top-Level Tab Bar ─── -->
        <div class="flex p-1.5 gap-1 bg-white/[0.04] border-b border-white/10 flex-shrink-0">
          <button
            v-for="item in menuItems"
            :key="item.id"
            @click="setTab(item.id)"
            class="relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 rounded-xl overflow-hidden"
            :class="
              activeModal === item.id
                ? 'text-white shadow-lg'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            "
          >
            <span
              v-if="activeModal === item.id"
              class="absolute inset-0 rounded-xl"
              :class="item.gradient"
            />
            <img
              v-if="item.src"
              :src="item.src"
              :alt="item.label"
              class="relative z-10 object-contain w-5 h-5"
            />
            <span v-else class="relative z-10 text-base leading-none">{{ item.icon }}</span>
            <span class="relative z-10">{{ item.label }}</span>
          </button>
        </div>

        <!-- Modal Header -->
        <div
          class="relative flex items-center flex-shrink-0 overflow-hidden border-b"
          :class="[modalTheme.headerBg, modalTheme.border]"
        >
          <!-- Portal Links -->
          <div class="relative flex items-center justify-center flex-shrink-0 w-20 h-20">
            <img
              src="/img/BardPortalRichtig.png"
              alt="Portal Start"
              class="relative z-10 object-contain w-16 h-16"
            />
            <div class="absolute inset-0 portal-effect">
              <div class="portal-glow"></div>
              <div class="portal-vortex"></div>
              <div class="portal-ring"></div>
            </div>
          </div>

          <!-- Mitte: Bard-Info + Close -->
          <div class="flex items-center justify-between flex-1 px-4 py-5">
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center overflow-hidden border w-9 h-9 rounded-xl border-white/10 bg-white/5"
              >
                <img src="/img/BardAbilities/Bard.png" class="object-cover w-full h-full" />
              </div>
              <span
                class="text-2xl font-black tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent font-['MedievalSharp']"
              >
                Bard
              </span>
            </div>
            <button
              class="flex items-center justify-center w-8 h-8 text-blue-300 transition-all duration-200 border rounded-xl border-white/10 bg-white/5 hover:text-white hover:scale-105"
              :class="modalTheme.closeHover"
              @click="closeModal"
            >
              ✕
            </button>
          </div>

          <!-- Portal Rechts -->
          <div class="relative flex items-center justify-center flex-shrink-0 w-20 h-20">
            <img
              src="/img/PortalEndeRichtig.png"
              alt="Portal Ende"
              class="relative z-10 object-contain w-16 h-16"
            />
            <div class="absolute inset-0 portal-effect">
              <div class="portal-glow"></div>
              <div class="portal-vortex"></div>
              <div class="portal-ring"></div>
            </div>
          </div>
        </div>

        <!-- ─── Charakter Tabs ─── -->
        <div
          v-if="activeModal === 'charakter'"
          class="flex p-1.5 gap-1 bg-white/[0.04] border border-white/10 mx-4 my-3 rounded-2xl flex-shrink-0"
        >
          <button
            v-for="tab in [
              { id: 'rang', label: 'Rang' },
              { id: 'faehigkeiten', label: 'Fähigkeiten' },
              { id: 'missionen', label: 'Missionen' },
            ]"
            :key="tab.id"
            @click="activeCharTab = tab.id as 'rang' | 'faehigkeiten' | 'missionen'"
            class="relative flex-1 px-4 py-2 overflow-hidden text-sm font-bold tracking-wide transition-all duration-200 rounded-xl"
            :class="
              activeCharTab === tab.id
                ? 'text-white shadow-lg shadow-violet-500/30'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            "
          >
            <span
              v-if="activeCharTab === tab.id"
              class="absolute inset-0 rounded-xl"
              :class="modalTheme.tabActive"
            />
            <span class="relative z-10">{{ tab.label }}</span>
          </button>
        </div>

        <!-- ─── Kampf Tabs ─── -->
        <div
          v-if="activeModal === 'kampf'"
          class="flex p-1.5 gap-1 bg-white/[0.04] border border-white/10 mx-4 my-3 rounded-2xl flex-shrink-0"
        >
          <button
            v-for="tab in [
              { id: 'champions', label: 'Champions' },
              { id: 'ergebnisse', label: 'Ergebnisse' },
            ]"
            :key="tab.id"
            @click="activeKampfTab = tab.id as 'champions' | 'ergebnisse'"
            class="relative flex-1 px-4 py-2 overflow-hidden text-sm font-bold tracking-wide transition-all duration-200 rounded-xl"
            :class="
              activeKampfTab === tab.id
                ? 'text-white shadow-lg shadow-rose-500/30'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
            "
          >
            <span
              v-if="activeKampfTab === tab.id"
              class="absolute inset-0 rounded-xl"
              :class="modalTheme.tabActive"
            />
            <span class="relative z-10">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="relative flex-1 min-h-0 overflow-y-auto">
          <!-- Shop -->
          <ShopComponent v-if="activeModal === 'shop'" />

          <!-- Charakter -->
          <div v-else-if="activeModal === 'charakter'">
            <div v-if="activeCharTab === 'rang'" class="p-4">
              <RankComponent />
            </div>
            <div v-else-if="activeCharTab === 'faehigkeiten'" class="p-2 overflow-hidden">
              <SkillTreeComponent />
            </div>
            <MissionComponent v-else-if="activeCharTab === 'missionen'" />
          </div>

          <!-- Kampf -->
          <div v-else-if="activeModal === 'kampf'">
            <ChampionLobbyComponent v-if="activeKampfTab === 'champions'" />
            <BattleResultComponent v-else-if="activeKampfTab === 'ergebnisse'" />
          </div>

          <!-- Admin -->
          <AdminDashboard v-else-if="activeModal === 'admin'" :inline="true" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Portal Effect ── */
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
    rgba(255, 215, 0, 0.65) 0%,
    rgba(255, 180, 0, 0.38) 40%,
    rgba(180, 120, 0, 0.1) 70%,
    transparent 100%
  );
  filter: blur(14px);
  animation: portalPulse 3s ease-in-out infinite;
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
    0 0 15px 3px rgba(255, 215, 0, 0.65),
    inset 0 0 15px 3px rgba(255, 215, 0, 0.4),
    0 0 30px 6px rgba(255, 180, 0, 0.3);
  animation: portalPulse 3s ease-in-out infinite;
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

.accent-bar-enter-active,
.accent-bar-leave-active {
  transition: opacity 0.15s ease;
}
.accent-bar-enter-from,
.accent-bar-leave-to {
  opacity: 0;
}
.modal-pop-enter-active,
.modal-pop-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>

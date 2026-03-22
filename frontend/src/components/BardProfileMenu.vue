<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { usePersistence } from '../composables/usePersistence'
import ShopComponent from './gameCenter/idle/ShopComponent.vue'
import SkillTreeComponent from './SkillTreeComponent.vue'
import AdminDashboard from './AdminDashboard.vue'
import ChampionLobbyComponent from './gameCenter/champion/ChampionLobbyComponent.vue'
import BattleResultComponent from './gameCenter/battle/BattleResultComponent.vue'
import TeamTabComponent from './missions/TeamTabComponent.vue'

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
  color: string
  gradient: string
}[] = [
  {
    id: 'shop',
    label: 'Shop',
    icon: '',
    src: '/img/menu/SHOP.png',
    color: 'emerald',
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
  },
  {
    id: 'tree',
    label: 'Tree',
    icon: '🌳',
    src: '',
    color: 'violet',
    gradient: 'bg-gradient-to-r from-violet-500 to-purple-600',
  },
  {
    id: 'team',
    label: 'Team',
    icon: '👥',
    src: '',
    color: 'amber',
    gradient: 'bg-gradient-to-r from-amber-500 to-orange-600',
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
    id: 'admin',
    label: 'Admin',
    icon: '⚙️',
    src: '',
    color: 'cyan',
    gradient: 'bg-gradient-to-r from-cyan-500 to-indigo-600',
  },
]

const activeKampfTab = ref<'champions' | 'ergebnisse'>('champions')

const openBardModal = () => {
  activeModal.value = activeModal.value !== null ? null : 'shop'
}
const setTab = (id: ModalId) => {
  activeModal.value = id
}
const closeModal = () => {
  activeModal.value = null
}

const chimesForLevel = computed(() => {
  const progress = gameStore.levelProgress / 100
  if (progress <= 0) return { current: 0, total: gameStore.chimesToNextLevel }
  const total = Math.round(gameStore.chimesToNextLevel / (1 - progress))
  const current = total - gameStore.chimesToNextLevel
  return { current, total }
})

const modalTheme = computed(() => {
  const themes: Record<
    ModalId,
    {
      accentBar: string
      tabActive: string
      tabIndicator: string
      iconGlow: string
      closeHover: string
    }
  > = {
    shop: {
      accentBar: 'from-emerald-400 via-amber-400 to-emerald-400',
      tabActive: 'bg-emerald-500/15 border-emerald-500/25',
      tabIndicator: 'bg-emerald-400',
      iconGlow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/40',
      closeHover: 'hover:bg-white/[0.08]',
    },
    tree: {
      accentBar: 'from-violet-500 via-purple-400 to-violet-500',
      tabActive: 'bg-violet-500/15 border-violet-500/25',
      tabIndicator: 'bg-violet-400',
      iconGlow: 'shadow-[0_0_12px_rgba(124,58,237,0.4)] ring-1 ring-violet-400/40',
      closeHover: 'hover:bg-white/[0.08]',
    },
    team: {
      accentBar: 'from-amber-500 via-orange-400 to-amber-500',
      tabActive: 'bg-amber-500/15 border-amber-500/25',
      tabIndicator: 'bg-amber-400',
      iconGlow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/40',
      closeHover: 'hover:bg-white/[0.08]',
    },
    kampf: {
      accentBar: 'from-rose-500 via-red-400 to-rose-500',
      tabActive: 'bg-rose-500/15 border-rose-500/25',
      tabIndicator: 'bg-rose-400',
      iconGlow: 'shadow-[0_0_12px_rgba(225,29,72,0.4)] ring-1 ring-rose-400/40',
      closeHover: 'hover:bg-white/[0.08]',
    },
    admin: {
      accentBar: 'from-cyan-400 via-indigo-400 to-cyan-400',
      tabActive: 'bg-cyan-500/15 border-cyan-500/25',
      tabIndicator: 'bg-cyan-400',
      iconGlow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/40',
      closeHover: 'hover:bg-white/[0.08]',
    },
  }
  return activeModal.value ? themes[activeModal.value] : themes.shop
})
</script>

<template>
  <div class="relative flex items-start gap-2">
    <!-- Bard Portrait -->
    <div class="cursor-pointer group" @click="openBardModal">
      <div class="relative w-36 h-36">
        <div
          class="absolute rounded-full -inset-1 bg-gradient-to-r from-blue-400 via-violet-400 to-blue-500 opacity-25 animate-pulse"
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

        <!-- Level Badge + Hover Tooltip -->
        <div class="absolute flex items-center -bottom-1 -right-1">
          <div
            class="z-10 flex items-center justify-center border-2 rounded-full shadow-lg h-9 w-9 bg-gradient-to-br from-blue-500 to-violet-600 border-blue-300/50"
          >
            <span class="text-xl font-black text-white">{{ gameStore.level }}</span>
          </div>

          <div
            class="absolute left-full ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-500/25 bg-gradient-to-r from-[#0a0820]/90 to-[#0d0a2a]/90 backdrop-blur-md shadow-[0_0_16px_rgba(59,130,246,0.15)] opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out whitespace-nowrap"
          >
            <span class="text-sm font-bold text-amber-300">
              {{ chimesForLevel.current.toLocaleString() }}
            </span>
            <span class="text-sm text-white/30">/</span>
            <span class="text-sm font-semibold text-white/60">
              {{ chimesForLevel.total.toLocaleString() }}
            </span>
            <span class="text-sm text-white/30 ml-0.5">Chimes</span>
          </div>
        </div>
      </div>
    </div>
    <!-- Reset Button -->
    <button
      class="mt-1 px-3 py-1.5 text-xs rounded-lg border border-red-500/40 bg-gradient-to-b from-red-900/60 to-red-950/80 backdrop-blur-sm text-red-300 hover:text-red-200 hover:border-red-400/60 hover:from-red-800/70 transition-all duration-200"
      title="Spielstand löschen (Entwickler-Reset)"
      @click="handleReset"
    >
      Reset
    </button>
  </div>

  <!-- Backdrop -->
  <Transition name="backdrop">
    <div
      v-if="activeModal !== null"
      class="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
      @click="closeModal"
    />
  </Transition>

  <!-- Modal -->
  <Transition name="modal-pop">
    <div
      v-if="activeModal !== null"
      class="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] max-w-[95vw]"
    >
      <div
        class="relative overflow-hidden rounded-3xl border border-white/[0.08] backdrop-blur-xl bg-gradient-to-b from-[#080520] via-[#0a0730] to-[#060418] shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col h-[850px] max-h-[90vh]"
      >
        <!-- Top Accent Bar -->
        <Transition name="accent-bar">
          <div
            :key="activeModal"
            class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r rounded-t-3xl pointer-events-none z-10"
            :class="modalTheme.accentBar"
          />
        </Transition>

        <!-- Close Button -->
        <button
          class="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
          @click="closeModal"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <!-- Modal Header -->
        <div
          class="relative flex items-center flex-shrink-0 overflow-hidden bg-white/[0.03] border-b border-white/[0.06]"
        >
          <!-- Portal Left -->
          <div class="relative flex items-center justify-center flex-shrink-0 w-16 h-16">
            <img
              src="/img/BardPortalRichtig.png"
              alt="Portal Start"
              class="relative z-10 object-contain w-12 h-12"
            />
            <div class="absolute inset-0 portal-effect">
              <div class="portal-glow"></div>
              <div class="portal-vortex"></div>
              <div class="portal-ring"></div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="relative flex items-center justify-center flex-1 gap-1.5 px-2 py-2">
            <button
              v-for="item in menuItems"
              :key="item.id"
              @click="setTab(item.id)"
              class="relative flex items-center justify-center gap-1.5 px-3 py-2 overflow-hidden text-base font-bold tracking-wide transition-all duration-200 rounded-lg"
              :class="
                activeModal === item.id
                  ? 'text-white bg-white/[0.06]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              "
            >
              <img
                v-if="item.src"
                :src="item.src"
                :alt="item.label"
                class="relative z-10 object-contain w-7 h-7"
                :class="activeModal === item.id ? modalTheme.iconGlow + ' rounded-md' : ''"
              />
              <span v-else class="relative z-10 text-sm leading-none">{{ item.icon }}</span>
              <span class="relative z-10">{{ item.label }}</span>
              <!-- Bottom indicator -->
              <span
                v-if="activeModal === item.id"
                class="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                :class="modalTheme.tabIndicator"
              />
            </button>
          </div>

          <!-- Portal Right -->
          <div class="relative flex items-center justify-center flex-shrink-0 w-16 h-16">
            <img
              src="/img/PortalEndeRichtig.png"
              alt="Portal Ende"
              class="relative z-10 object-contain w-12 h-12"
            />
            <div class="absolute inset-0 portal-effect">
              <div class="portal-glow"></div>
              <div class="portal-vortex"></div>
              <div class="portal-ring"></div>
            </div>
          </div>
        </div>

        <!-- Kampf Sub-tabs -->
        <div
          v-if="activeModal === 'kampf'"
          class="flex p-1 gap-1 bg-white/[0.03] border border-white/[0.06] mx-5 mt-3 mb-1 rounded-xl flex-shrink-0"
        >
          <button
            v-for="tab in [
              { id: 'champions', label: 'Champions' },
              { id: 'ergebnisse', label: 'Ergebnisse' },
            ]"
            :key="tab.id"
            @click="activeKampfTab = tab.id as 'champions' | 'ergebnisse'"
            class="relative flex-1 px-4 py-2 overflow-hidden text-xs font-semibold tracking-wider uppercase transition-all duration-200 rounded-lg"
            :class="
              activeKampfTab === tab.id
                ? 'text-white bg-rose-500/15 border border-rose-500/20'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
            "
          >
            <span class="relative z-10">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="relative flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <Transition name="tab-fade" mode="out-in">
            <div v-if="activeModal === 'shop'" key="shop">
              <ShopComponent />
            </div>

            <div v-else-if="activeModal === 'tree'" key="tree" class="p-2 overflow-hidden">
              <SkillTreeComponent />
            </div>

            <div v-else-if="activeModal === 'team'" key="team">
              <TeamTabComponent />
            </div>

            <div v-else-if="activeModal === 'kampf'" :key="'kampf-' + activeKampfTab">
              <ChampionLobbyComponent v-if="activeKampfTab === 'champions'" />
              <BattleResultComponent v-else-if="activeKampfTab === 'ergebnisse'" />
            </div>

            <div v-else-if="activeModal === 'admin'" key="admin">
              <AdminDashboard :inline="true" />
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Portal Effect */
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

/* Transitions */
.accent-bar-enter-active,
.accent-bar-leave-active {
  transition: opacity 0.2s ease;
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

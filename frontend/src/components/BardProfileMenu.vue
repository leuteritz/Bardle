<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { MAX_ABILITY_LEVEL } from '../config/constants'
import ShopComponent from './gameCenter/idle/ShopComponent.vue'
import RankComponent from './RankComponent.vue'
import AbilityComponent from './bottom/AbilityComponent.vue'
import AdminDashboard from './AdminDashboard.vue'
import ChampionLobbyComponent from './gameCenter/champion/ChampionLobbyComponent.vue'
import BattleResultComponent from './gameCenter/battle/BattleResultComponent.vue'
import MissionComponent from './missions/MissionComponent.vue'

const gameStore = useGameStore()
const xpProgress = computed(() => gameStore.levelProgress / 100)

const abilityIcons = [
  '/img/BardAbilities/BardQ.png',
  '/img/BardAbilities/BardW.png',
  '/img/BardAbilities/BardE.png',
  '/img/BardAbilities/BardR.png',
]
const abilityKeys = ['Q', 'W', 'E', 'R']

type ModalId = 'shop' | 'charakter' | 'kampf' | 'admin'

const menuOpen = ref(false)
const activeModal = ref<ModalId | null>(null)

const menuItems: { id: ModalId; label: string; icon: string; src: string }[] = [
  { id: 'charakter', label: 'Charakter', icon: '🎭', src: '' },
  { id: 'kampf', label: 'Kampf', icon: '', src: '/img/menu/BATTLE.png' },
  { id: 'shop', label: 'Shop', icon: '', src: '/img/menu/SHOP.png' },
  { id: 'admin', label: 'Admin', icon: '⚙️', src: '' },
]

const activeCharTab = ref<'rang' | 'faehigkeiten' | 'missionen'>('rang')
const activeKampfTab = ref<'champions' | 'ergebnisse'>('champions')

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) activeModal.value = null
}

const openModal = (id: ModalId) => {
  activeModal.value = activeModal.value === id ? null : id
}

const closeAll = () => {
  menuOpen.value = false
  activeModal.value = null
}
const closeModal = () => {
  activeModal.value = null
}
const activeMenuItem = computed(() => menuItems.find((m) => m.id === activeModal.value))
</script>

<template>
  <div class="relative flex items-start">
    <!-- ─── Bard Portrait ─── -->
    <div class="cursor-pointer group" @click="toggleMenu">
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

    <!-- ─── Vertikales Menü ─── -->
    <Transition name="slide-down">
      <div v-show="menuOpen" class="absolute top-full left-0 mt-6 z-50 flex flex-col gap-1.5 w-48">
        <div
          v-for="item in menuItems"
          :key="item.id"
          @click.stop="openModal(item.id)"
          class="group/item relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-md hover:scale-[1.015] hover:-translate-y-0.5"
          :class="
            activeModal === item.id
              ? 'bg-gradient-to-br from-blue-600/40 via-violet-600/30 to-blue-600/20 border-blue-400/50 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
              : 'bg-gradient-to-br from-white/10 to-white/[0.04] border-white/10 hover:border-white/20'
          "
        >
          <!-- Shimmer Sweep -->
          <div
            class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700"
          />
          <!-- Active Glow Pulse -->
          <div
            v-if="activeModal === item.id"
            class="absolute inset-0 border pointer-events-none rounded-2xl border-blue-400/40 animate-pulse"
          />
          <div class="relative flex items-center gap-3 px-4 py-2.5">
            <div
              class="relative flex items-center justify-center flex-shrink-0 w-10 h-10 transition-transform duration-300 group-hover/item:scale-110"
            >
              <img
                v-if="item.src"
                :src="item.src"
                :alt="item.label"
                class="relative z-10 object-contain w-10 h-10 drop-shadow-lg"
              />
              <span v-else class="relative z-10 text-lg drop-shadow-lg">{{ item.icon }}</span>
            </div>
            <span
              class="text-xl font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- ─── Backdrop ─── -->
  <Transition name="backdrop">
    <div
      v-if="activeModal !== null"
      class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      @click="closeAll"
    />
  </Transition>

  <!-- ─── Modal ─── -->
  <Transition name="modal-pop">
    <div
      v-if="activeModal !== null"
      class="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw]"
      :class="{
        'w-[720px]': activeModal === 'charakter' || activeModal === 'kampf',
        'w-[640px]': activeModal === 'shop',
        'w-[700px]': activeModal === 'admin',
      }"
    >
      <div
        class="group relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-black/30 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh]"
      >
        <!-- Shimmer Sweep -->
        <div
          class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
        />

        <!-- Modal Header -->
        <div
          class="relative flex items-center justify-between flex-shrink-0 px-6 py-5 border-b border-white/10"
        >
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8">
              <img
                v-if="activeMenuItem?.src"
                :src="activeMenuItem.src"
                :alt="activeMenuItem.label"
                class="object-contain w-12 h-12"
              />
              <span v-else class="text-base">{{ activeMenuItem?.icon }}</span>
            </div>
            <span
              class="text-2xl font-black tracking-wide bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent font-['MedievalSharp']"
            >
              {{ activeMenuItem?.label }}
            </span>
          </div>
          <button
            class="flex items-center justify-center w-8 h-8 text-blue-300 transition-all duration-200 border rounded-xl border-white/10 bg-white/5 hover:bg-white/15 hover:text-white hover:scale-105"
            @click="closeModal"
          >
            ✕
          </button>
        </div>

        <!-- ─── Charakter Tabs ─── -->
        <div
          v-if="activeModal === 'charakter'"
          class="flex border-b border-white/10 flex-shrink-0"
        >
          <button
            v-for="tab in [{ id: 'rang', label: 'Rang' }, { id: 'faehigkeiten', label: 'Fähigkeiten' }, { id: 'missionen', label: 'Missionen' }]"
            :key="tab.id"
            @click="activeCharTab = tab.id as 'rang' | 'faehigkeiten' | 'missionen'"
            class="px-6 py-3 text-sm font-bold tracking-wide transition-all duration-200"
            :class="
              activeCharTab === tab.id
                ? 'border-b-2 border-blue-400 text-white'
                : 'text-white/50 hover:text-white/80'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ─── Kampf Tabs ─── -->
        <div
          v-if="activeModal === 'kampf'"
          class="flex border-b border-white/10 flex-shrink-0"
        >
          <button
            v-for="tab in [{ id: 'champions', label: 'Champions' }, { id: 'ergebnisse', label: 'Ergebnisse' }]"
            :key="tab.id"
            @click="activeKampfTab = tab.id as 'champions' | 'ergebnisse'"
            class="px-6 py-3 text-sm font-bold tracking-wide transition-all duration-200"
            :class="
              activeKampfTab === tab.id
                ? 'border-b-2 border-blue-400 text-white'
                : 'text-white/50 hover:text-white/80'
            "
          >
            {{ tab.label }}
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
            <div v-else-if="activeCharTab === 'faehigkeiten'" class="p-4 space-y-4">
              <div
                class="flex items-center justify-center p-3 backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <span class="mr-2 text-xs font-bold tracking-widest uppercase text-white/50">
                  Skill Points
                </span>
                <span
                  class="px-3 py-1 text-xs font-black tracking-wider text-blue-200 border rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border-blue-400/30"
                >
                  {{ gameStore.skillPoints }} SP
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <AbilityComponent
                  v-for="(icon, idx) in abilityIcons"
                  :key="abilityKeys[idx]"
                  :icon="icon"
                  :ability="abilityKeys[idx]"
                  :abilityLevel="gameStore.abilityLevels[idx]"
                  :canUpgrade="
                    gameStore.skillPoints > 0 && gameStore.abilityLevels[idx] < MAX_ABILITY_LEVEL
                  "
                  @upgrade="gameStore.upgradeAbility(idx)"
                />
              </div>
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
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-8px);
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

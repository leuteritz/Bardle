<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { MAX_ABILITY_LEVEL } from '../config/constants'
import ShopComponent from './gameCenter/idle/ShopComponent.vue'
import RankComponent from './RankComponent.vue'
import AbilityComponent from './bottom/AbilityComponent.vue'
import AdminDashboard from './AdminDashboard.vue'

defineProps<{ activeTab: string }>()
const emit = defineEmits<{ 'update:activeTab': [value: string] }>()

const gameStore = useGameStore()

const xpProgress = computed(() => gameStore.levelProgress / 100)

const abilityIcons = [
  '/img/BardAbilities/BardQ.png',
  '/img/BardAbilities/BardW.png',
  '/img/BardAbilities/BardE.png',
  '/img/BardAbilities/BardR.png',
]
const abilityKeys = ['Q', 'W', 'E', 'R']

type ModalId = 'shop' | 'rank' | 'abilities' | 'admin' | 'idle' | 'battle' | 'champions'

const menuOpen = ref(false)
const activeModal = ref<ModalId | null>(null)

const menuItems: { id: ModalId; label: string; icon: string; src: string }[] = [
  { id: 'shop', label: 'Shop', icon: '', src: '/img/menu/SHOP.png' },
  { id: 'rank', label: 'Rang', icon: '', src: '/img/menu/RANK.png' },
  { id: 'abilities', label: 'Skills', icon: '⚡', src: '/img/menu/SKILLS.png' },
  { id: 'idle', label: 'Idle', icon: '🎵', src: '/img/menu/IDLE.png' },
  { id: 'battle', label: 'Battle', icon: '⚔️', src: '' },
  { id: 'champions', label: 'Champions', icon: '🏆', src: '' },
  { id: 'admin', label: 'Admin', icon: '⚙️', src: '' },
]

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) activeModal.value = null
}
const openModal = (id: ModalId) => {
  if (id === 'idle' || id === 'battle' || id === 'champions') {
    emit('update:activeTab', id)
    menuOpen.value = false
    return
  }
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
    <!-- Clickable Bard portrait -->
    <div class="cursor-pointer group" @click="toggleMenu">
      <div class="relative w-36 h-36">
        <!-- Pulse glow -->
        <div
          class="absolute rounded-full -inset-1 bg-gradient-to-r from-blue-400 via-violet-400 to-blue-500 opacity-40 animate-pulse"
        ></div>
        <!-- XP ring -->
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
        <!-- Portrait image -->
        <div
          class="absolute overflow-hidden border-2 rounded-full shadow-2xl inset-2 border-blue-400/50 bg-gradient-to-br from-white/20 to-white/5"
        >
          <img
            src="/img/BardAbilities/Bard.png"
            class="object-cover w-full h-full transition-transform duration-500 transform group-hover:scale-110"
          />
        </div>
        <!-- Level badge -->
        <div class="absolute -bottom-1 -right-1">
          <div
            class="flex items-center justify-center border-2 rounded-full shadow-lg h-9 w-9 bg-gradient-to-br from-blue-500 to-violet-600 border-blue-300/50"
          >
            <span class="text-xl font-black text-white">{{ gameStore.level }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vertical menu below portrait -->
    <Transition name="slide-down">
      <div v-show="menuOpen" class="absolute top-full left-0 mt-5 z-50 flex flex-col gap-1.5">
        <button
          v-for="item in menuItems"
          :key="item.id"
          class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 flex items-center gap-3 hover:bg-white/20 transition-all text-left whitespace-nowrap"
          :class="
            activeModal === item.id || (activeTab === item.id && (item.id === 'idle' || item.id === 'battle' || item.id === 'champions'))
              ? 'bg-gradient-to-r from-blue-600/60 to-violet-600/60 border-blue-400/40'
              : ''
          "
          @click.stop="openModal(item.id)"
        >
          <img v-if="item.src" :src="item.src" class="object-contain w-10 h-10" :alt="item.label" />
          <span v-else class="text-lg">{{ item.icon }}</span>
          <span class="text-xl font-semibold text-white/90">{{ item.label }}</span>
        </button>
      </div>
    </Transition>
  </div>

  <!-- Modal Backdrop -->
  <Transition name="backdrop">
    <div
      v-if="activeModal !== null"
      class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      @click="closeAll"
    />
  </Transition>

  <!-- Modal Container -->
  <Transition name="modal-pop">
    <div
      v-if="activeModal !== null"
      class="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw]"
      :class="activeModal === 'admin' ? 'w-[600px]' : 'w-96'"
    >
      <div
        class="bg-gradient-to-b from-[#0d0830]/95 to-[#110b3d]/95 backdrop-blur-xl border border-blue-400/20 rounded-2xl shadow-2xl flex flex-col"
        :class="activeModal === 'shop' || activeModal === 'admin' ? 'max-h-[80vh]' : ''"
      >
        <!-- Modal header -->
        <div
          class="flex items-center justify-between flex-shrink-0 px-5 py-4 border-b border-blue-400/20"
        >
          <span
            class="text-lg font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text font-['MedievalSharp']"
          >
            {{ activeMenuItem?.icon }} {{ activeMenuItem?.label }}
          </span>
          <button
            class="flex items-center justify-center w-8 h-8 text-blue-300 transition-all duration-200 rounded-lg hover:bg-white/10 hover:text-white"
            @click="closeModal"
          >
            ✕
          </button>
        </div>

        <!-- Modal content -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <!-- Shop -->
          <ShopComponent v-if="activeModal === 'shop'" />

          <!-- Rang -->
          <div v-else-if="activeModal === 'rank'" class="p-4">
            <RankComponent />
          </div>

          <!-- Fähigkeiten -->
          <div v-else-if="activeModal === 'abilities'" class="p-4">
            <div class="flex justify-center mb-4">
              <span
                class="px-3 py-1 text-sm font-semibold text-blue-300 border rounded-full bg-blue-500/20 border-blue-400/30"
              >
                SP: {{ gameStore.skillPoints }}
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

          <!-- Admin -->
          <AdminDashboard v-else-if="activeModal === 'admin'" :inline="true" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Vertical menu slide-down transition */
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

/* Modal pop transition */
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

/* Backdrop fade transition */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.3s ease;
}
.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}
</style>

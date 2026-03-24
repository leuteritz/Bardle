<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { useMissionStore } from '../stores/missionStore'
import { CHAMPION_ROLES } from '../config/championRoles'

const props = defineProps<{
  show: boolean
  slotIndex: number
}>()

const emit = defineEmits<{
  close: []
}>()

const battleStore = useBattleStore()
const missionStore = useMissionStore()

const selectedRole = ref<string>('all')
const roles = ['all', 'top', 'jungle', 'mid', 'adc', 'support']

const roleLabel: Record<string, string> = {
  all: 'Alle',
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
}

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

watch(() => props.show, (val) => {
  if (val) {
    searchQuery.value = ''
    nextTick(() => searchInput.value?.focus())
  }
})

const currentChampion = computed(() => battleStore.teamSlotAssignments[props.slotIndex])

const allChampions = computed(() =>
  battleStore.ownedChampions.filter((c) => c !== 'Bard')
)

const championsInOtherSlots = computed(() => {
  const map: Record<string, number> = {}
  battleStore.teamSlotAssignments.forEach((name, idx) => {
    if (name && idx !== props.slotIndex) map[name] = idx + 1
  })
  return map
})

const onMissionSet = computed(() => new Set(missionStore.championsOnMission))

const filteredChampions = computed(() =>
  allChampions.value.filter((c) => {
    const matchesSearch =
      !searchQuery.value || c.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole =
      selectedRole.value === 'all' ||
      CHAMPION_ROLES[c]?.includes(selectedRole.value as 'top' | 'jungle' | 'mid' | 'adc' | 'support')
    return matchesSearch && matchesRole
  })
)

function getChampionStatus(champion: string): 'current' | 'other-slot' | 'on-mission' | 'available' {
  if (currentChampion.value === champion) return 'current'
  if (championsInOtherSlots.value[champion] !== undefined) return 'other-slot'
  if (onMissionSet.value.has(champion)) return 'on-mission'
  return 'available'
}

function selectChampion(champion: string) {
  const status = getChampionStatus(champion)
  if (status === 'other-slot' || status === 'on-mission') return
  battleStore.assignToSlot(props.slotIndex, champion)
  emit('close')
}

function clearSlot() {
  battleStore.removeFromSlot(props.slotIndex)
  emit('close')
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-lg mx-4 overflow-hidden border shadow-2xl rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-white/20 flex flex-col max-h-[85vh]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b bg-white/5 border-white/10 flex-shrink-0">
          <div>
            <h2
              class="text-lg font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              Slot {{ slotIndex + 1 }} belegen
            </h2>
            <p class="mt-0.5 text-xs text-blue-300/50">Champion auswählen oder Slot leeren</p>
          </div>
          <button
            @click="emit('close')"
            class="flex items-center justify-center w-8 h-8 text-white/40 transition-colors rounded-lg hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <!-- Current Champion -->
        <div v-if="currentChampion" class="flex items-center gap-3 px-5 py-3 border-b bg-emerald-900/20 border-emerald-500/20 flex-shrink-0">
          <img
            :src="battleStore.getChampionImage(currentChampion)"
            :alt="currentChampion"
            class="w-8 h-8 rounded-lg object-cover ring-1 ring-emerald-400/40"
            @error="onImgError"
          />
          <div class="flex-1 min-w-0">
            <span class="text-xs font-bold text-emerald-300">Aktuell: {{ currentChampion }}</span>
          </div>
          <button
            @click="clearSlot"
            class="px-2.5 py-1 text-[10px] font-black rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 transition-colors"
          >
            Entfernen
          </button>
        </div>

        <!-- Role Filter -->
        <div class="flex gap-1.5 px-5 py-3 border-b border-white/10 flex-wrap flex-shrink-0">
          <button
            v-for="role in roles"
            :key="role"
            @click="selectedRole = role"
            class="px-2.5 py-1 text-[10px] font-black rounded-full border transition-all duration-200"
            :class="
              selectedRole === role
                ? 'bg-blue-500/40 border-blue-400/60 text-blue-200'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
            "
          >
            {{ roleLabel[role] }}
          </button>
        </div>

        <!-- Search -->
        <div class="px-5 py-2.5 border-b border-white/10 flex-shrink-0">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Champion suchen..."
            class="w-full px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-400/40 focus:bg-white/[0.08] transition-all"
          />
        </div>

        <!-- Champion Grid -->
        <div class="flex-1 overflow-y-auto p-4 min-h-0">
          <!-- Empty state -->
          <div
            v-if="filteredChampions.length === 0"
            class="flex flex-col items-center justify-center gap-3 p-8"
          >
            <span class="text-3xl">🛒</span>
            <p class="text-sm font-bold text-white/30">Keine Champions verfügbar</p>
            <p class="text-xs text-blue-400/60">{{ allChampions.length === 0 ? 'Kaufe Champions im Shop!' : 'Kein Champion gefunden.' }}</p>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="champion in filteredChampions"
              :key="champion"
              @click="selectChampion(champion)"
              class="group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left overflow-hidden"
              :class="{
                'bg-gradient-to-br from-emerald-900/50 to-teal-900/30 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]':
                  getChampionStatus(champion) === 'current',
                'opacity-50 cursor-not-allowed bg-white/[0.03] border-white/10':
                  getChampionStatus(champion) === 'other-slot' || getChampionStatus(champion) === 'on-mission',
                'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-blue-400/40 hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]':
                  getChampionStatus(champion) === 'available',
              }"
            >
              <!-- Shimmer -->
              <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

              <!-- Status badges -->
              <div
                v-if="getChampionStatus(champion) === 'other-slot'"
                class="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold rounded-full bg-orange-500/70 border border-orange-400/30 text-white z-10 pointer-events-none"
              >
                Slot {{ championsInOtherSlots[champion] }}
              </div>
              <div
                v-else-if="getChampionStatus(champion) === 'on-mission'"
                class="absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold rounded-full bg-purple-500/70 border border-purple-400/30 text-white z-10 pointer-events-none"
              >
                Auf Expedition
              </div>

              <div class="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                <img
                  :src="battleStore.getChampionImage(champion)"
                  :alt="champion"
                  class="w-full h-full object-cover"
                  @error="onImgError"
                />
                <!-- Checkmark for current -->
                <div
                  v-if="currentChampion === champion"
                  class="absolute inset-0 flex items-center justify-center bg-emerald-900/70"
                >
                  <span class="text-lg text-emerald-300">✓</span>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-xs font-black leading-tight truncate bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text text-transparent">
                  {{ champion }}
                </p>
                <div class="flex flex-wrap gap-0.5 mt-1">
                  <span
                    v-for="role in (CHAMPION_ROLES[champion] ?? []).slice(0, 2)"
                    :key="role"
                    class="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-500/20 border border-blue-400/20 text-blue-300"
                  >
                    {{ role }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

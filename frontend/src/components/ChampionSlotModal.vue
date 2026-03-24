<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { useMissionStore } from '../stores/missionStore'
import { useItemStore } from '../stores/itemStore'
import { CHAMPION_ROLES } from '../config/championRoles'
import { SHOP_ITEMS, getItemById } from '../config/items'
import type { ItemCategory } from '../types'

const props = defineProps<{
  show: boolean
  slotIndex: number
}>()

const emit = defineEmits<{
  close: []
}>()

const battleStore = useBattleStore()
const missionStore = useMissionStore()
const itemStore = useItemStore()

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
const activePickerCategory = ref<ItemCategory | null>(null)

const equipCategories: { key: ItemCategory; icon: string }[] = [
  { key: 'weapon', icon: '⚔️' },
  { key: 'armor', icon: '🛡️' },
  { key: 'misc', icon: '📿' },
]

watch(() => props.show, (val) => {
  if (val) {
    searchQuery.value = ''
    activePickerCategory.value = null
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

const equippedItemInPicker = computed(() => {
  if (!activePickerCategory.value) return null
  const eq = itemStore.slotEquipment[props.slotIndex]
  const itemId = eq[activePickerCategory.value]
  return itemId ? (getItemById(itemId) ?? null) : null
})

const availableItemsForPicker = computed(() => {
  if (!activePickerCategory.value) return []
  const cat = activePickerCategory.value
  return SHOP_ITEMS.filter(
    (item) => item.category === cat && itemStore.availableCount(item.id) > 0,
  )
})

function getEquipIcon(cat: ItemCategory): string | null {
  const eq = itemStore.slotEquipment[props.slotIndex]
  const itemId = eq[cat]
  if (!itemId) return null
  return getItemById(itemId)?.icon ?? null
}

function togglePicker(cat: ItemCategory) {
  activePickerCategory.value = activePickerCategory.value === cat ? null : cat
}

function equipItemFromPicker(itemId: string) {
  itemStore.equipItem(props.slotIndex, itemId)
  activePickerCategory.value = null
}

function unequipCurrent() {
  if (!activePickerCategory.value) return
  itemStore.unequipItem(props.slotIndex, activePickerCategory.value)
  activePickerCategory.value = null
}

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
              Slot {{ slotIndex + 1 }}
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

        <!-- ── Sektion 1 + 2: Hero & Items (nur wenn besetzt) ── -->
        <div v-if="currentChampion" class="flex-shrink-0 border-b border-white/10">
          <!-- Hero-Bereich -->
          <div class="flex items-end gap-5 px-5 pt-5 pb-4">
            <!-- Champion-Bild -->
            <div class="relative flex-shrink-0 w-28 h-32 rounded-2xl overflow-hidden border border-white/15 shadow-lg">
              <img
                :src="battleStore.getChampionImage(currentChampion)"
                :alt="currentChampion"
                class="w-full h-full object-cover object-top"
                @error="onImgError"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <!-- Name + Entfernen -->
            <div class="flex flex-col gap-2 pb-1">
              <p class="text-base font-black leading-tight text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text">
                {{ currentChampion }}
              </p>
              <div class="flex flex-wrap gap-0.5">
                <span
                  v-for="role in (CHAMPION_ROLES[currentChampion] ?? []).slice(0, 3)"
                  :key="role"
                  class="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-500/20 border border-blue-400/20 text-blue-300"
                >
                  {{ role }}
                </span>
              </div>
              <button
                @click="clearSlot"
                class="mt-1 px-3 py-1 text-[10px] font-black rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 transition-colors w-fit"
              >
                Entfernen
              </button>
            </div>
          </div>

          <!-- Item-Slots -->
          <div class="relative px-5 pb-4">
            <p class="mb-2 text-[9px] font-bold tracking-widest uppercase text-white/30">Ausrüstung</p>
            <div class="flex items-center gap-3">
              <div
                v-for="cat in equipCategories"
                :key="cat.key"
                class="relative flex flex-col items-center gap-1 cursor-pointer"
                @click="togglePicker(cat.key)"
              >
                <!-- Slot-Box -->
                <div
                  class="flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-150"
                  :class="
                    getEquipIcon(cat.key)
                      ? activePickerCategory === cat.key
                        ? 'bg-blue-500/25 border border-blue-400/60 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                        : 'bg-white/10 border border-white/20 hover:bg-white/20 shadow-inner'
                      : activePickerCategory === cat.key
                        ? 'border border-blue-400/50 bg-blue-900/20'
                        : 'border border-dashed border-white/15 hover:border-blue-400/40 hover:bg-blue-900/15'
                  "
                >
                  <img
                    v-if="getEquipIcon(cat.key)?.startsWith('/')"
                    :src="getEquipIcon(cat.key)!"
                    class="object-contain w-10 h-10"
                  />
                  <span v-else class="text-xl leading-none">{{ getEquipIcon(cat.key) || cat.icon }}</span>
                </div>
                <!-- Item-Name oder Kategorie-Label -->
                <span class="text-[8px] text-white/30 leading-none max-w-[56px] truncate text-center">
                  {{ getEquipIcon(cat.key) ? (equippedItemInPicker && activePickerCategory === cat.key ? equippedItemInPicker.name : '') : cat.key }}
                </span>
              </div>
            </div>

            <!-- Inline-Picker -->
            <Transition name="equip-picker">
              <div
                v-if="activePickerCategory"
                class="absolute left-5 right-5 top-full mt-1 z-10 p-2 rounded-xl border border-white/15 bg-[#0d0b1e]/97 backdrop-blur-xl shadow-2xl"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[10px] font-bold tracking-widest uppercase text-white/40">
                    {{ activePickerCategory === 'weapon' ? 'Waffe' : activePickerCategory === 'armor' ? 'Rüstung' : 'Misc' }}
                  </span>
                  <button
                    @click="activePickerCategory = null"
                    class="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <!-- Ausgerüstetes Item -->
                <div
                  v-if="equippedItemInPicker"
                  class="flex items-center justify-between p-1.5 mb-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20"
                >
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="equippedItemInPicker.icon.startsWith('/')"
                      :src="equippedItemInPicker.icon"
                      class="object-contain w-6 h-6"
                    />
                    <span v-else class="text-base">{{ equippedItemInPicker.icon }}</span>
                    <span class="text-[10px] font-bold text-white/70">{{ equippedItemInPicker.name }}</span>
                  </div>
                  <button
                    @click="unequipCurrent"
                    class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 border border-red-400/25 text-red-300 hover:bg-red-500/40 transition-colors"
                  >
                    Ablegen
                  </button>
                </div>
                <!-- Verfügbare Items -->
                <div class="space-y-1 overflow-y-auto max-h-32">
                  <div
                    v-for="item in availableItemsForPicker"
                    :key="item.id"
                    class="flex items-center justify-between p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] cursor-pointer transition-colors duration-150"
                    @click="equipItemFromPicker(item.id)"
                  >
                    <div class="flex items-center gap-1.5">
                      <img
                        v-if="item.icon.startsWith('/')"
                        :src="item.icon"
                        class="object-contain w-6 h-6"
                      />
                      <span v-else class="text-base">{{ item.icon }}</span>
                      <span class="text-[10px] font-bold text-white/60">{{ item.name }}</span>
                    </div>
                    <span class="text-[9px] text-white/30">x{{ itemStore.availableCount(item.id) }}</span>
                  </div>
                  <div
                    v-if="availableItemsForPicker.length === 0 && !equippedItemInPicker"
                    class="py-2 text-center"
                  >
                    <span class="text-[9px] text-white/20">Keine Items verfügbar</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- ── Sektion 3: Champion-Auswahl ── -->
        <!-- Abschnitt-Header -->
        <div class="flex items-center gap-2 px-5 pt-4 pb-2 flex-shrink-0">
          <div class="flex-1 h-px bg-white/[0.08]" />
          <span class="text-[9px] font-bold tracking-widest uppercase text-white/25">
            {{ currentChampion ? 'Champion wechseln' : 'Champion auswählen' }}
          </span>
          <div class="flex-1 h-px bg-white/[0.08]" />
        </div>

        <!-- Role Filter -->
        <div class="flex gap-1.5 px-5 pb-2 border-b border-white/10 flex-wrap flex-shrink-0">
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
              <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

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
.equip-picker-enter-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.equip-picker-leave-active {
  transition: opacity 0.08s ease, transform 0.08s ease;
}
.equip-picker-enter-from,
.equip-picker-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>

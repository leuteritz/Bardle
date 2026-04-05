<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useExpeditionStore } from '@/stores/expedetionStore'
import { useItemStore } from '@/stores/itemStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
import { SHOP_ITEMS, getItemById } from '@/config/items'
import type { ItemCategory } from '@/types'

const props = defineProps<{
  show: boolean
  slotIndex: number
}>()

const emit = defineEmits<{
  close: []
}>()

const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore() // ← Tippfehler + Name gefixt
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

watch(
  () => props.show,
  (val) => {
    if (val) {
      searchQuery.value = ''
      activePickerCategory.value = null
      nextTick(() => searchInput.value?.focus())
    }
  },
)

const currentChampion = computed(() => battleStore.teamSlotAssignments[props.slotIndex])

const allChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const championsInOtherSlots = computed(() => {
  const map: Record<string, number> = {}
  battleStore.teamSlotAssignments.forEach((name, idx) => {
    if (name && idx !== props.slotIndex) map[name] = idx + 1
  })
  return map
})

const onExpeditionSet = computed(() => new Set(expeditionStore.championsOnExpedition))

const filteredChampions = computed(() =>
  allChampions.value.filter((c) => {
    const matchesSearch =
      !searchQuery.value || c.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesRole =
      selectedRole.value === 'all' ||
      CHAMPION_ROLES[c]?.includes(
        selectedRole.value as 'top' | 'jungle' | 'mid' | 'adc' | 'support',
      )
    return matchesSearch && matchesRole
  }),
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
  return SHOP_ITEMS.filter((item) => item.category === cat && itemStore.availableCount(item.id) > 0)
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

function getChampionStatus(
  champion: string,
): 'current' | 'other-slot' | 'on-expedition' | 'available' {
  if (currentChampion.value === champion) return 'current'
  if (championsInOtherSlots.value[champion] !== undefined) return 'other-slot'
  if (onExpeditionSet.value.has(champion)) return 'on-expedition'
  return 'available'
}

function selectChampion(champion: string) {
  const status = getChampionStatus(champion)
  if (status === 'other-slot' || status === 'on-expedition') return
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
      class="rpg-overlay fixed inset-0 z-[200] flex items-center justify-center"
      @click.self="emit('close')"
    >
      <div
        class="rpg-frame modal-container relative w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[78vh]"
      >
        <!-- Gold accent bar -->
        <div class="rpg-accent-bar" />

        <!-- Header -->
        <div class="flex items-center justify-between flex-shrink-0 p-5 rpg-header modal-header">
          <div>
            <h2 class="text-lg font-black modal-title">Slot {{ slotIndex + 1 }}</h2>
          </div>
          <button
            @click="emit('close')"
            class="flex items-center justify-center w-8 h-8 rpg-close-btn"
          >
            ✕
          </button>
        </div>

        <!-- Section 1 + 2: Hero & Items (only when occupied) -->
        <div v-if="currentChampion" class="flex-shrink-0 hero-section">
          <!-- Hero area -->
          <div class="flex flex-col items-center gap-2 px-5 pt-5 pb-4">
            <!-- Champion image -->
            <div class="relative flex-shrink-0 h-40 overflow-hidden champion-portrait w-36">
              <img
                :src="battleStore.getChampionImage(currentChampion)"
                :alt="currentChampion"
                class="object-cover object-top w-full h-full rpg-img"
                @error="onImgError"
              />
              <div class="absolute inset-0 portrait-overlay" />
            </div>

            <!-- Name, roles, remove -->
            <p class="text-base font-black leading-tight text-center champion-name">
              {{ currentChampion }}
            </p>
            <div class="flex flex-wrap gap-0.5 justify-center">
              <span
                v-for="role in (CHAMPION_ROLES[currentChampion] ?? []).slice(0, 3)"
                :key="role"
                class="role-badge inline-block px-1.5 py-0.5 text-[9px] font-bold"
              >
                {{ role }}
              </span>
            </div>
            <button @click="clearSlot" class="btn-remove px-3 py-1 text-[10px] font-black">
              Entfernen
            </button>
          </div>

          <!-- Item Slots -->
          <div class="relative px-5 pb-4">
            <p class="equip-label mb-2 text-[9px] font-bold tracking-widest uppercase text-center">
              Ausrüstung
            </p>
            <div class="flex items-center justify-center gap-3">
              <div
                v-for="cat in equipCategories"
                :key="cat.key"
                class="relative flex flex-col items-center gap-1 cursor-pointer"
                @click="togglePicker(cat.key)"
              >
                <!-- Slot Box -->
                <div
                  class="flex items-center justify-center equip-slot w-14 h-14"
                  :class="{
                    'equip-slot--filled': getEquipIcon(cat.key) && activePickerCategory !== cat.key,
                    'equip-slot--active': activePickerCategory === cat.key,
                    'equip-slot--empty': !getEquipIcon(cat.key) && activePickerCategory !== cat.key,
                  }"
                >
                  <img
                    v-if="getEquipIcon(cat.key)?.startsWith('/')"
                    :src="getEquipIcon(cat.key)!"
                    class="object-contain w-10 h-10"
                  />
                  <span v-else class="text-xl leading-none">{{
                    getEquipIcon(cat.key) || cat.icon
                  }}</span>
                </div>
                <!-- Item name or category label -->
                <span
                  class="equip-slot-label text-[8px] leading-none max-w-[56px] truncate text-center"
                >
                  {{
                    getEquipIcon(cat.key)
                      ? equippedItemInPicker && activePickerCategory === cat.key
                        ? equippedItemInPicker.name
                        : ''
                      : cat.key
                  }}
                </span>
              </div>
            </div>

            <!-- Inline Picker -->
            <Transition name="equip-picker">
              <div
                v-if="activePickerCategory"
                class="absolute z-10 p-2 mt-1 picker-dropdown left-5 right-5 top-full"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="picker-title text-[10px] font-bold tracking-widest uppercase">
                    {{
                      activePickerCategory === 'weapon'
                        ? 'Waffe'
                        : activePickerCategory === 'armor'
                          ? 'Rüstung'
                          : 'Misc'
                    }}
                  </span>
                  <button @click="activePickerCategory = null" class="picker-close text-[10px]">
                    ✕
                  </button>
                </div>
                <!-- Equipped item -->
                <div
                  v-if="equippedItemInPicker"
                  class="equipped-row flex items-center justify-between p-1.5 mb-1"
                >
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="equippedItemInPicker.icon.startsWith('/')"
                      :src="equippedItemInPicker.icon"
                      class="object-contain w-6 h-6"
                    />
                    <span v-else class="text-base">{{ equippedItemInPicker.icon }}</span>
                    <span class="equipped-name text-[10px] font-bold">{{
                      equippedItemInPicker.name
                    }}</span>
                  </div>
                  <button
                    @click="unequipCurrent"
                    class="btn-unequip text-[9px] font-bold px-1.5 py-0.5"
                  >
                    Ablegen
                  </button>
                </div>
                <!-- Available items -->
                <div class="space-y-1 overflow-y-auto rpg-scrollbar max-h-32">
                  <div
                    v-for="item in availableItemsForPicker"
                    :key="item.id"
                    class="picker-item flex items-center justify-between p-1.5 cursor-pointer"
                    @click="equipItemFromPicker(item.id)"
                  >
                    <div class="flex items-center gap-1.5">
                      <img
                        v-if="item.icon.startsWith('/')"
                        :src="item.icon"
                        class="object-contain w-6 h-6"
                      />
                      <span v-else class="text-base">{{ item.icon }}</span>
                      <span class="picker-item-name text-[10px] font-bold">{{ item.name }}</span>
                    </div>
                    <span class="picker-item-count text-[9px]"
                      >x{{ itemStore.availableCount(item.id) }}</span
                    >
                  </div>
                  <div
                    v-if="availableItemsForPicker.length === 0 && !equippedItemInPicker"
                    class="py-2 text-center"
                  >
                    <span class="empty-text text-[9px]">Keine Items verfügbar</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Section 3: Champion selection -->
        <!-- Section header -->
        <div class="flex items-center flex-shrink-0 gap-2 px-5 pt-2 pb-1">
          <div class="flex-1 h-px section-divider" />
          <span class="section-label text-[9px] font-bold tracking-widest uppercase">
            {{ currentChampion ? 'Champion wechseln' : 'Champion auswählen' }}
          </span>
          <div class="flex-1 h-px section-divider" />
        </div>

        <!-- Role Filter -->
        <div class="role-filter-row flex gap-1.5 px-4 pb-1 flex-wrap flex-shrink-0">
          <button
            v-for="role in roles"
            :key="role"
            @click="selectedRole = role"
            class="role-filter-btn px-2.5 py-1 text-[10px] font-black"
            :class="{
              'role-filter-btn--active': selectedRole === role,
            }"
          >
            {{ roleLabel[role] }}
          </button>
        </div>

        <!-- Search -->
        <div class="search-row px-4 py-1.5 flex-shrink-0">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Champion suchen..."
            class="search-input w-full px-3 py-1.5 text-xs"
          />
        </div>

        <!-- Champion Grid -->
        <div class="flex-1 min-h-0 p-4 overflow-y-auto rpg-scrollbar">
          <div
            v-if="filteredChampions.length === 0"
            class="flex flex-col items-center justify-center gap-3 p-8"
          >
            <span class="text-3xl">🛒</span>
            <p class="text-sm font-bold empty-title">Keine Champions verfügbar</p>
            <p class="text-xs empty-hint">
              {{
                allChampions.length === 0 ? 'Kaufe Champions im Shop!' : 'Kein Champion gefunden.'
              }}
            </p>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <button
              v-for="champion in filteredChampions"
              :key="champion"
              @click="selectChampion(champion)"
              class="relative flex items-center gap-3 p-3 overflow-hidden text-left champ-card"
              :class="{
                'champ-card--current': getChampionStatus(champion) === 'current',
                'champ-card--locked':
                  getChampionStatus(champion) === 'other-slot' ||
                  getChampionStatus(champion) === 'on-expedition',
                'champ-card--available': getChampionStatus(champion) === 'available',
              }"
            >
              <div
                v-if="getChampionStatus(champion) === 'other-slot'"
                class="status-badge status-badge--slot absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold z-10 pointer-events-none"
              >
                Slot {{ championsInOtherSlots[champion] }}
              </div>
              <div
                v-else-if="getChampionStatus(champion) === 'on-expedition'"
                class="status-badge status-badge--expedition absolute top-1 right-1 px-1.5 py-0.5 text-[8px] font-bold z-10 pointer-events-none"
              >
                Auf Expedition
              </div>

              <div class="relative flex-shrink-0 w-12 h-12 overflow-hidden champ-thumb">
                <img
                  :src="battleStore.getChampionImage(champion)"
                  :alt="champion"
                  class="object-cover w-full h-full rpg-img"
                  @error="onImgError"
                />
                <div
                  v-if="currentChampion === champion"
                  class="absolute inset-0 flex items-center justify-center champ-check"
                >
                  <span class="text-lg" style="color: var(--rpg-green-border)">✓</span>
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-xs font-black leading-tight truncate champion-name">
                  {{ champion }}
                </p>
                <div class="flex flex-wrap gap-0.5 mt-1">
                  <span
                    v-for="role in (CHAMPION_ROLES[champion] ?? []).slice(0, 2)"
                    :key="role"
                    class="role-badge inline-block px-1.5 py-0.5 text-[9px] font-bold"
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
/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.equip-picker-enter-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.equip-picker-leave-active {
  transition:
    opacity 0.08s ease,
    transform 0.08s ease;
}
.equip-picker-enter-from,
.equip-picker-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

/* ── Modal container ── */
.modal-container {
  border-radius: 4px;
}

/* ── Header ── */
.modal-header {
  border-bottom: 3px solid var(--rpg-wood-mid);
}

.modal-title {
  color: var(--rpg-gold);
}

/* ── Hero section ── */
.hero-section {
  border-bottom: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-dark);
}

.champion-portrait {
  border-radius: 4px;
  border: 2px solid var(--rpg-wood-mid);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.portrait-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.champion-name {
  color: var(--rpg-gold);
}

/* ── Role badges ── */
.role-badge {
  border-radius: 4px;
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  color: var(--rpg-gold-dim);
}

/* ── Remove button ── */
.btn-remove {
  border-radius: 4px;
  background: var(--rpg-bg-red-subtle);
  border: 1px solid var(--rpg-red);
  color: var(--rpg-red);
  transition: background 0.15s ease;
}

.btn-remove:hover {
  background: var(--rpg-bg-red-hover);
}

/* ── Equipment slots ── */
.equip-label {
  color: var(--rpg-text-dim);
}

.equip-slot {
  border-radius: 4px;
  transition: all 0.15s ease;
}

.equip-slot--filled {
  background: var(--rpg-bg-dark);
  border: 1px solid #3a3a28;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.3);
}

.equip-slot--filled:hover {
  background: var(--rpg-bg-hover);
}

.equip-slot--active {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-gold-dim);
  box-shadow: 0 0 8px rgba(200, 144, 64, 0.2);
}

.equip-slot--empty {
  border: 1px dashed #3a3a28;
}

.equip-slot--empty:hover {
  border-color: var(--rpg-gold-dim);
  background: var(--rpg-bg-dark);
}

.equip-slot-label {
  color: var(--rpg-text-dim);
}

/* ── Inline picker dropdown ── */
.picker-dropdown {
  background: var(--rpg-bg-deep);
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}

.picker-title {
  color: var(--rpg-text-dim);
}

.picker-close {
  color: var(--rpg-text-dim);
  transition: color 0.15s ease;
}

.picker-close:hover {
  color: var(--rpg-text);
}

/* ── Equipped row ── */
.equipped-row {
  border-radius: 4px;
  background: var(--rpg-bg-green-subtle);
  border: 1px solid #2e5a1a;
}

.equipped-name {
  color: var(--rpg-text-muted);
}

.btn-unequip {
  border-radius: 4px;
  background: var(--rpg-bg-red-subtle);
  border: 1px solid #884040;
  color: var(--rpg-red);
  transition: background 0.15s ease;
}

.btn-unequip:hover {
  background: var(--rpg-bg-red-hover);
}

/* ── Picker item rows ── */
.picker-item {
  border-radius: 4px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-row);
  transition: background 0.15s ease;
}

.picker-item:hover {
  background: var(--rpg-bg-hover);
}

.picker-item-name {
  color: var(--rpg-text-muted);
}

.picker-item-count {
  color: var(--rpg-text-dim);
}

.empty-text {
  color: var(--rpg-text-dim);
}

/* ── Section divider ── */
.section-divider {
  background: var(--rpg-border-row);
}

.section-label {
  color: var(--rpg-text-dim);
}

/* ── Role filter ── */
.role-filter-row {
  border-bottom: 1px solid var(--rpg-border-row);
}

.role-filter-btn {
  border-radius: 4px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-row);
  color: var(--rpg-text-dim);
  transition: all 0.15s ease;
}

.role-filter-btn:hover {
  border-color: #3a3a28;
  color: var(--rpg-text-muted);
}

.role-filter-btn--active {
  background: var(--rpg-bg-selected);
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}

/* ── Search ── */
.search-row {
  border-bottom: 1px solid var(--rpg-border-row);
}

.search-input {
  border-radius: 4px;
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
  color: var(--rpg-text);
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.search-input::placeholder {
  color: var(--rpg-text-dim);
}

.search-input:focus {
  border-color: var(--rpg-gold-dim);
  background: var(--rpg-bg-dark);
}

/* ── Empty state ── */
.empty-title {
  color: var(--rpg-text-dim);
}

.empty-hint {
  color: var(--rpg-gold-dim);
}

/* ── Champion cards ── */
.champ-card {
  border-radius: 4px;
  transition: all 0.2s ease;
}

.champ-card--available {
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
}

.champ-card--available:hover {
  background: var(--rpg-bg-hover);
  border-color: var(--rpg-gold-dim);
  box-shadow: 0 0 10px rgba(200, 144, 64, 0.15);
}

.champ-card--current {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-green-border);
  box-shadow: 0 0 12px rgba(110, 192, 64, 0.2);
}

.champ-card--locked {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--rpg-bg-row);
  border: 1px solid var(--rpg-border-row);
}

/* ── Status badges ── */
.status-badge {
  border-radius: 4px;
  color: var(--rpg-text);
}

.status-badge--slot {
  background: var(--rpg-wood);
  border: 1px solid var(--rpg-gold-dim);
}

.status-badge--expedition {
  background: #4a2060;
  border: 1px solid #8050a0;
}

/* ── Champion thumbnails ── */
.champ-thumb {
  border-radius: 4px;
  border: 1px solid var(--rpg-border-row);
}

.champ-check {
  background: rgba(26, 46, 20, 0.8);
}
</style>

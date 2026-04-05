<template>
  <!-- 2×2 Grid: Shop | Team / Expedition | ItemShop -->
  <div class="w-full h-full p-4 overflow-hidden">
    <!-- 2 Flex-Spalten: Links 3fr (ChampionShop + Expedition), Rechts 2fr (Team + ItemShop 50/50) -->
    <div class="flex h-full gap-3">
      <!-- ╔══════════════════════════╗
           ║  Linke Spalte (3fr)       ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col min-h-0 gap-3" style="flex: 3">
        <!-- ╔══════════════════════════╗
             ║  Oben links: Champion Shop ║
             ╚══════════════════════════╝ -->
        <div class="flex flex-col min-h-0 tt-panel" style="flex: 2">
          <div class="flex-1 min-h-0 overflow-hidden">
            <ChampionShopComponent />
          </div>
        </div>

        <!-- ╔══════════════════════════╗
             ║  Unten links: Expedition  ║
             ╚══════════════════════════╝ -->
        <div
          class="flex flex-col min-h-0 px-4 pt-3 pb-3 overflow-hidden tt-panel-expedition"
          style="flex: 3"
        >
          <!-- Header -->
          <div class="flex items-center flex-shrink-0 gap-3 mb-3">
            <div
              class="relative"
              @mouseenter="showTooltip = true"
              @mouseleave="showTooltip = false"
            >
              <div
                class="flex items-center gap-2 px-3 py-1.5 cursor-default transition-all duration-200 tt-expedition-badge"
                :class="
                  missionStore.activeMissions.length > 0
                    ? completedExpeditionCount > 0
                      ? 'tt-expedition-badge--completed'
                      : 'tt-expedition-badge--active'
                    : 'tt-expedition-badge--empty'
                "
              >
                <span class="text-sm">🧭</span>
                <span class="text-xs font-bold tracking-wide">
                  {{ activeExpeditionCount }}/{{ MAX_ACTIVE_MISSIONS }}
                </span>
              </div>
              <span
                v-if="completedExpeditionCount > 0"
                class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full tt-pulse-dot animate-pulse"
              />

              <!-- Tooltip -->
              <Transition name="expedition-tooltip">
                <div
                  v-show="showTooltip && missionStore.activeMissions.length > 0"
                  class="absolute left-0 z-50 p-4 mt-2 top-full w-72 rpg-tooltip tt-tooltip-wide"
                >
                  <template v-if="activeExpeditionCount > 0">
                    <span class="block mb-3 tt-tooltip-label"> Aktive Expeditionen </span>
                    <div class="space-y-4">
                      <div
                        v-for="mission in missionStore.activeMissions.filter(
                          (m) => m.status === 'active',
                        )"
                        :key="mission.id"
                        class="space-y-2"
                      >
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-semibold tt-text-muted">
                            {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                          </span>
                          <span class="font-mono text-xs tt-text-dim">{{
                            getTimeRemaining(mission)
                          }}</span>
                        </div>
                        <div class="w-full h-1 overflow-hidden tt-progress-track">
                          <div
                            class="h-full transition-all duration-1000 tt-progress-bar"
                            :style="{ width: getProgress(mission) + '%' }"
                          />
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-if="completedExpeditionCount > 0">
                    <div :class="activeExpeditionCount > 0 ? 'mt-4 pt-4 tt-divider-top' : ''">
                      <span class="block mb-3 tt-tooltip-label tt-tooltip-label--green">
                        Abgeschlossen
                      </span>
                      <div class="space-y-2">
                        <div
                          v-for="mission in missionStore.activeMissions.filter(
                            (m) => m.status !== 'active',
                          )"
                          :key="mission.id"
                          class="flex items-center justify-between"
                        >
                          <span class="text-xs font-semibold tt-text-muted">
                            {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                          </span>
                          <button
                            @click="missionStore.collectMission(mission.id)"
                            class="text-[11px] font-bold px-2 py-0.5 transition-colors cursor-pointer tt-collect-btn"
                            :class="
                              mission.status === 'success'
                                ? 'tt-collect-btn--success'
                                : 'tt-collect-btn--fail'
                            "
                          >
                            {{
                              mission.status === 'success'
                                ? `+${mission.reward} Einsammeln`
                                : '✕ Entfernen'
                            }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Mission-Komponenten -->
          <div class="flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto rpg-scrollbar">
            <MissionCreateComponent />
          </div>
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Rechte Spalte (2fr)      ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col min-h-0 gap-3" style="flex: 2">
        <!-- ╔══════════════════════════╗
             ║  Oben rechts: Team        ║
             ╚══════════════════════════╝ -->
        <div class="flex flex-col min-h-0 p-3 overflow-hidden tt-panel" style="flex: 3">
          <!-- Header -->
          <div class="flex items-center justify-between flex-shrink-0 mb-3">
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1.5 px-3 py-1 tt-team-counter">
                <span class="text-sm font-bold tt-team-counter-value">{{
                  battleStore.selectedChampions.length
                }}</span>
                <span class="text-sm font-bold tt-text-dim">/4</span>
              </div>
              <div class="flex items-center gap-1.5 px-3 py-1 tt-unlock-counter">
                <span class="text-sm font-bold tt-unlock-counter-value">{{
                  battleStore.ownedChampions.length
                }}</span>
                <span class="text-sm font-bold tt-text-dim">/{{ totalChampionCount || '…' }}</span>
              </div>
            </div>
          </div>

          <!-- Team-Slots -->
          <div class="grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-2">
            <div
              v-for="(assignment, index) in battleStore.teamSlotAssignments"
              :key="'slot-' + index"
              class="h-full group/slot"
            >
              <!-- Gefuellter Slot -->
              <div
                v-if="assignment"
                class="relative flex flex-col overflow-hidden transition-all duration-200 cursor-pointer group/card tt-slot-card"
                :class="
                  isOnExpedition(assignment) ? 'tt-slot-card--expedition' : 'tt-slot-card--active'
                "
                style="height: 100%"
              >
                <!-- Champion Image -->
                <div class="relative flex-1 min-h-0 overflow-hidden" @click="openSlotIndex = index">
                  <img
                    :src="battleStore.getChampionImage(assignment)"
                    :alt="assignment"
                    class="absolute inset-0 object-cover object-top w-full h-full transition-transform duration-500 rpg-img group-hover/card:scale-105"
                    :class="isOnExpedition(assignment) ? 'grayscale' : ''"
                    @error="onImgError"
                  />
                  <div class="absolute inset-0 tt-image-overlay" />

                  <!-- Slot-Nummer -->
                  <div class="absolute z-10 top-2 left-2">
                    <span
                      class="text-[9px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 tt-slot-number"
                    >
                      #{{ index + 1 }}
                    </span>
                  </div>

                  <!-- Name + Status/Button -->
                  <div class="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-1 p-2">
                    <span
                      class="text-[13px] font-bold leading-tight drop-shadow-lg tracking-wide tt-champ-name"
                    >
                      {{ truncate(assignment, 10) }}
                    </span>
                    <span
                      v-if="isOnExpedition(assignment)"
                      class="text-[10px] font-semibold flex items-center gap-1 tt-expedition-label"
                    >
                      <span>⏳</span> Expedition
                    </span>
                    <button
                      v-else
                      @click.stop="removeChampion(assignment)"
                      class="w-full py-1 text-[10px] font-bold transition-all duration-200 opacity-0 group-hover/card:opacity-100 translate-y-1 group-hover/card:translate-y-0 tt-remove-btn"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <!-- Equipment Row -->
                <div
                  class="flex-shrink-0 flex items-center justify-center gap-1.5 px-2 py-1.5 tt-equip-row"
                >
                  <div
                    v-for="cat in equipCategories"
                    :key="cat.key"
                    class="relative flex items-center justify-center transition-all duration-150 cursor-pointer w-9 h-9 tt-equip-slot"
                    :class="
                      getEquipIcon(index, cat.key)
                        ? 'tt-equip-slot--filled'
                        : 'tt-equip-slot--empty'
                    "
                    @click.stop="toggleEquipPicker(index, cat.key)"
                  >
                    <img
                      v-if="getEquipIcon(index, cat.key)?.startsWith('/')"
                      :src="getEquipIcon(index, cat.key)!"
                      class="object-contain w-10 h-10"
                    />
                    <span v-else class="text-sm leading-none">{{
                      getEquipIcon(index, cat.key) || cat.icon
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Leerer Slot -->
              <div
                v-else
                class="flex flex-col items-center justify-center gap-1.5 p-2 transition-all duration-200 cursor-pointer tt-slot-empty group-hover/slot:border-color-hover"
                style="height: 100%"
                @click="openSlotIndex = index"
              >
                <div
                  class="flex items-center justify-center w-8 h-8 transition-colors duration-200 tt-slot-empty-icon group-hover/slot:border-color-hover"
                >
                  <span
                    class="text-lg transition-colors duration-200 tt-text-dim group-hover/slot:text-hover"
                    >+</span
                  >
                </div>
                <span
                  class="text-[10px] font-bold tracking-wider uppercase tt-text-dim group-hover/slot:text-hover-light transition-colors duration-200"
                >
                  Slot {{ index + 1 }}
                </span>
                <div class="flex items-center gap-1 mt-1">
                  <div
                    v-for="cat in equipCategories"
                    :key="cat.key"
                    class="relative flex items-center justify-center w-8 h-8 transition-all duration-150 cursor-pointer tt-equip-slot-mini"
                    @click.stop="toggleEquipPicker(index, cat.key)"
                  >
                    <img
                      v-if="getEquipIcon(index, cat.key)?.startsWith('/')"
                      :src="getEquipIcon(index, cat.key)!"
                      class="object-contain w-5 h-5"
                    />
                    <span v-else class="text-xs">{{
                      getEquipIcon(index, cat.key) || cat.icon
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Equipment Picker Popup -->
          <Transition name="equip-picker">
            <div
              v-if="equipPicker"
              class="absolute z-50 p-2 rpg-tooltip tt-equip-picker"
              :style="{ bottom: '10px', right: '10px', width: '200px' }"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold tracking-widest uppercase tt-text-dim">
                  {{ equipPickerLabel }}
                </span>
                <button @click="equipPicker = null" class="text-[10px] tt-text-dim tt-close-btn">
                  X
                </button>
              </div>
              <!-- Ausgeruestetes Item -->
              <div
                v-if="equippedItemInPicker"
                class="flex items-center justify-between p-1.5 mb-1 tt-equipped-item"
              >
                <div class="flex items-center gap-1.5">
                  <img
                    v-if="equippedItemInPicker.icon.startsWith('/')"
                    :src="equippedItemInPicker.icon"
                    class="object-contain w-6 h-6"
                  />
                  <span v-else class="text-base">{{ equippedItemInPicker.icon }}</span>
                  <span class="text-[10px] font-bold tt-text-muted">{{
                    equippedItemInPicker.name
                  }}</span>
                </div>
                <button
                  @click="unequipCurrent"
                  class="text-[9px] font-bold px-1.5 py-0.5 tt-unequip-btn"
                >
                  Ablegen
                </button>
              </div>
              <!-- Verfuegbare Items -->
              <div class="space-y-1 overflow-y-auto max-h-32 rpg-scrollbar">
                <div
                  v-for="item in availableItemsForPicker"
                  :key="item.id"
                  class="flex items-center justify-between p-1.5 cursor-pointer transition-colors duration-150 tt-picker-item"
                  @click="equipItemFromPicker(item.id)"
                >
                  <div class="flex items-center gap-1.5">
                    <img
                      v-if="item.icon.startsWith('/')"
                      :src="item.icon"
                      class="object-contain w-6 h-6"
                    />
                    <span v-else class="text-base">{{ item.icon }}</span>
                    <span class="text-[10px] font-bold tt-text-muted">{{ item.name }}</span>
                  </div>
                  <span class="text-[9px] tt-text-dim"
                    >x{{ itemStore.availableCount(item.id) }}</span
                  >
                </div>
                <div
                  v-if="availableItemsForPicker.length === 0 && !equippedItemInPicker"
                  class="py-2 text-center"
                >
                  <span class="text-[9px] tt-text-dim">Keine Items verfuegbar</span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Champion Slot Modal -->
          <ChampionSlotModal
            :show="openSlotIndex !== null"
            :slotIndex="openSlotIndex ?? 0"
            @close="openSlotIndex = null"
          />
        </div>

        <!-- ╔══════════════════════════╗
             ║  Unten rechts: Item Shop  ║
             ╚══════════════════════════╝ -->
        <div class="min-h-0 p-3 overflow-y-auto rpg-scrollbar tt-panel" style="flex: 2">
          <ItemShopComponent />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useMissionStore } from '@/stores/missionStore'
import { useGameStore } from '@/stores/gameStore'
import { useItemStore } from '@/stores/itemStore'
import { MAX_ACTIVE_MISSIONS } from '@/config/constants'
import { MISSION_CONFIGS } from '@/config/missions'
import { SHOP_ITEMS, getItemById } from '@/config/items'
import { truncate } from '@/config/numberFormat'
import { fetchChampionNames } from '@/utils/champions'
import MissionCreateComponent from '../team/missions/MissionCreateComponent.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'
import ItemShopComponent from './ItemShopComponent.vue'
import ChampionSlotModal from './ChampionSlotModal.vue'
import type { Mission, ItemCategory } from '@/types'

export default defineComponent({
  name: 'TeamTabComponent',
  components: {
    MissionCreateComponent,
    ChampionShopComponent,
    ItemShopComponent,
    ChampionSlotModal,
  },
  setup() {
    const battleStore = useBattleStore()
    const missionStore = useMissionStore()
    const gameStore = useGameStore()
    const itemStore = useItemStore()
    const now = ref(Date.now())
    const totalChampionCount = ref(0)
    const openSlotIndex = ref<number | null>(null)
    const showTooltip = ref(false)
    const equipPicker = ref<{ slotIndex: number; category: ItemCategory } | null>(null)
    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
      fetchChampionNames()
        .then((names) => {
          totalChampionCount.value = names.length
        })
        .catch(() => {})
    })
    onUnmounted(() => {
      if (timer) clearInterval(timer)
    })

    const equipCategories = [
      { key: 'weapon' as ItemCategory, icon: '⚔️' },
      { key: 'armor' as ItemCategory, icon: '🛡️' },
      { key: 'misc' as ItemCategory, icon: '📿' },
    ]

    const selectableChampions = computed(() => {
      const onMission = missionStore.championsOnMission
      return battleStore.ownedChampions.filter(
        (c) => c !== 'Bard' && !battleStore.selectedChampions.includes(c) && !onMission.includes(c),
      )
    })

    const activeExpeditionCount = computed(
      () => missionStore.activeMissions.filter((m) => m.status === 'active').length,
    )
    const completedExpeditionCount = computed(
      () => missionStore.activeMissions.filter((m) => m.status !== 'active').length,
    )

    const equipPickerLabel = computed(() => {
      if (!equipPicker.value) return ''
      const labels: Record<ItemCategory, string> = {
        weapon: 'Waffe',
        armor: 'Ruestung',
        misc: 'Misc',
      }
      return labels[equipPicker.value.category]
    })

    const equippedItemInPicker = computed(() => {
      if (!equipPicker.value) return null
      const eq = itemStore.slotEquipment[equipPicker.value.slotIndex]
      const itemId = eq[equipPicker.value.category]
      return itemId ? (getItemById(itemId) ?? null) : null
    })

    const availableItemsForPicker = computed(() => {
      if (!equipPicker.value) return []
      const cat = equipPicker.value.category
      return SHOP_ITEMS.filter(
        (item) => item.category === cat && itemStore.availableCount(item.id) > 0,
      )
    })

    function isOnExpedition(champion: string): boolean {
      return missionStore.championsOnMission.includes(champion)
    }
    function addChampion(champion: string) {
      if (battleStore.selectedChampions.length < 4) {
        const emptySlot = battleStore.teamSlotAssignments.indexOf(null)
        if (emptySlot !== -1) {
          battleStore.assignToSlot(emptySlot, champion)
        }
      }
    }
    function removeChampion(champion: string) {
      battleStore.removeChampionFromSlots(champion)
    }
    function getProgress(mission: Mission): number {
      return Math.min(
        100,
        ((now.value - mission.startTime) / (mission.durationSeconds * 1000)) * 100,
      )
    }
    function getTimeRemaining(mission: Mission): string {
      const remaining = Math.max(
        0,
        mission.durationSeconds * 1000 - (now.value - mission.startTime),
      )
      const secs = Math.ceil(remaining / 1000)
      const min = Math.floor(secs / 60)
      const sec = secs % 60
      return `${min}:${sec.toString().padStart(2, '0')}`
    }
    function getMissionIcon(configId: string): string {
      return MISSION_CONFIGS.find((m) => m.id === configId)?.icon ?? '📜'
    }
    function onImgError(e: Event) {
      const img = e.target as HTMLImageElement
      img.style.display = 'none'
    }

    function getEquipIcon(slotIndex: number, category: ItemCategory): string | null {
      const eq = itemStore.slotEquipment[slotIndex]
      const itemId = eq[category]
      if (!itemId) return null
      const item = getItemById(itemId)
      return item?.icon ?? null
    }

    function toggleEquipPicker(slotIndex: number, category: ItemCategory) {
      if (
        equipPicker.value &&
        equipPicker.value.slotIndex === slotIndex &&
        equipPicker.value.category === category
      ) {
        equipPicker.value = null
      } else {
        equipPicker.value = { slotIndex, category }
      }
    }

    function equipItemFromPicker(itemId: string) {
      if (!equipPicker.value) return
      itemStore.equipItem(equipPicker.value.slotIndex, itemId)
      equipPicker.value = null
    }

    function unequipCurrent() {
      if (!equipPicker.value) return
      itemStore.unequipItem(equipPicker.value.slotIndex, equipPicker.value.category)
      equipPicker.value = null
    }

    return {
      battleStore,
      missionStore,
      gameStore,
      itemStore,
      totalChampionCount,
      openSlotIndex,
      showTooltip,
      equipPicker,
      equipCategories,
      selectableChampions,
      activeExpeditionCount,
      completedExpeditionCount,
      equipPickerLabel,
      equippedItemInPicker,
      availableItemsForPicker,
      isOnExpedition,
      addChampion,
      removeChampion,
      getProgress,
      getTimeRemaining,
      getMissionIcon,
      truncate,
      onImgError,
      getEquipIcon,
      toggleEquipPicker,
      equipItemFromPicker,
      unequipCurrent,
      MAX_ACTIVE_MISSIONS,
    }
  },
})
</script>

<style scoped>
/* ── Panel frames ── */
.tt-panel {
  border: 4px solid var(--rpg-wood);
  border-radius: 4px;
  background: var(--rpg-bg-deep);
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid);
}

.tt-panel-expedition {
  border: 2px solid var(--rpg-wood-mid);
  border-radius: 4px;
  background: var(--rpg-bg-dark);
}

/* ── Expedition badge states ── */
.tt-expedition-badge {
  border-radius: 4px;
  border: 1px solid #444;
}

.tt-expedition-badge--active {
  background: var(--rpg-bg-selected);
  border-color: #5c4420;
  color: var(--rpg-gold-dim);
}

.tt-expedition-badge--completed {
  background: var(--rpg-bg-green-subtle);
  border-color: #2e5a1a;
  color: var(--rpg-green-light);
}

.tt-expedition-badge--empty {
  background: var(--rpg-bg-row);
  border-color: #333;
  color: #666;
}

/* ── Pulse dot (intentionally round) ── */
.tt-pulse-dot {
  background: var(--rpg-green-top);
}

/* ── Tooltip (extends global rpg-tooltip) ── */
.tt-tooltip-wide {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
}

.tt-tooltip-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7040;
}

.tt-tooltip-label--green {
  color: #4a8a30;
}

/* ── Text helpers ── */
.tt-text-muted {
  color: var(--rpg-text-muted);
}

.tt-text-dim {
  color: var(--rpg-text-dim);
}

/* ── Progress bar ── */
.tt-progress-track {
  background: var(--rpg-border-row);
  border-radius: 4px;
}

.tt-progress-bar {
  border-radius: 4px;
  background: linear-gradient(to right, var(--rpg-gold-dim), var(--rpg-gold));
}

/* ── Divider ── */
.tt-divider-top {
  border-top: 1px solid var(--rpg-border-row);
}

/* ── Collect buttons in tooltip ── */
.tt-collect-btn {
  border-radius: 4px;
}

.tt-collect-btn--success {
  background: var(--rpg-bg-green-subtle);
  color: var(--rpg-green-light);
}

.tt-collect-btn--success:hover {
  background: #2a4a1e;
}

.tt-collect-btn--fail {
  background: #2e1414;
  color: var(--rpg-red);
}

.tt-collect-btn--fail:hover {
  background: #4a1e1e;
}

/* ── Team counter ── */
.tt-team-counter {
  border-radius: 4px;
  background: #141828;
  border: 1px solid #2a3050;
}

.tt-team-counter-value {
  color: var(--rpg-blue);
}

/* ── Unlock counter ── */
.tt-unlock-counter {
  border-radius: 4px;
  background: #1c1408;
  border: 1px solid #4a3010;
}

.tt-unlock-counter-value {
  color: #e8c040;
}

/* ── Slot card (filled) ── */
.tt-slot-card {
  border-radius: 4px;
  border: 1px solid #333;
}

.tt-slot-card--active {
  border-color: #444;
}

.tt-slot-card--active:hover {
  border-color: var(--rpg-blue);
  box-shadow: 0 4px 12px rgba(40, 60, 100, 0.15);
}

.tt-slot-card--expedition {
  border-color: var(--rpg-border-row);
  opacity: 0.5;
}

/* ── Image overlay (gradient kept as CSS) ── */
.tt-image-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.2), transparent);
}

/* ── Slot number badge ── */
.tt-slot-number {
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #777;
  border: 1px solid #333;
}

/* ── Champion name ── */
.tt-champ-name {
  color: #ffffff;
}

/* ── Expedition label ── */
.tt-expedition-label {
  color: var(--rpg-gold);
}

/* ── Remove button ── */
.tt-remove-btn {
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
  color: #777;
}

.tt-remove-btn:hover {
  background: var(--rpg-bg-red-subtle);
  border-color: #8a4040;
  color: var(--rpg-red);
}

/* ── Equipment row ── */
.tt-equip-row {
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid var(--rpg-border-row);
}

/* ── Equipment slot ── */
.tt-equip-slot {
  border-radius: 4px;
}

.tt-equip-slot--filled {
  background: var(--rpg-border-row);
  border: 1px solid #444;
}

.tt-equip-slot--filled:hover {
  background: var(--rpg-bg-hover);
}

.tt-equip-slot--empty {
  border: 1px dashed #333;
}

.tt-equip-slot--empty:hover {
  border-color: var(--rpg-blue);
  background: #141828;
}

/* ── Empty slot ── */
.tt-slot-empty {
  border-radius: 4px;
  border: 1px dashed #333;
  background: var(--rpg-bg-icon);
}

.tt-slot-empty:hover,
.group\/slot:hover .tt-slot-empty {
  border-color: var(--rpg-blue);
  background: #141828;
}

.tt-slot-empty-icon {
  border: 1px dashed #333;
  border-radius: 4px;
}

.group\/slot:hover .border-color-hover {
  border-color: var(--rpg-blue);
}

.group\/slot:hover .text-hover {
  color: var(--rpg-blue);
}

.group\/slot:hover .text-hover-light {
  color: #999;
}

/* ── Equipment slot (mini, in empty card) ── */
.tt-equip-slot-mini {
  border: 1px dashed #333;
  border-radius: 4px;
}

.tt-equip-slot-mini:hover {
  border-color: var(--rpg-blue);
  background: #141828;
}

/* ── Equipment picker popup ── */
.tt-equip-picker {
  border-radius: 4px;
}

.tt-close-btn {
  transition: color 0.15s;
}

.tt-close-btn:hover {
  color: var(--rpg-text-muted);
}

/* ── Equipped item row ── */
.tt-equipped-item {
  border-radius: 4px;
  background: var(--rpg-bg-green-subtle);
  border: 1px solid #2e5a1a;
}

/* ── Unequip button ── */
.tt-unequip-btn {
  border-radius: 4px;
  background: var(--rpg-bg-red-subtle);
  border: 1px solid #5a2020;
  color: var(--rpg-red);
  transition: background 0.15s;
}

.tt-unequip-btn:hover {
  background: var(--rpg-bg-red-hover);
}

/* ── Picker item row ── */
.tt-picker-item {
  border-radius: 4px;
  border: 1px solid var(--rpg-border-row);
  background: var(--rpg-bg-dark);
}

.tt-picker-item:hover {
  background: var(--rpg-bg-hover);
}

/* ── Transitions (kept from original) ── */
.team-slot-card {
  height: 100%;
}

.available-card {
  min-height: 90px;
  height: 90px;
}

.expedition-tooltip-enter-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.expedition-tooltip-leave-active {
  transition:
    opacity 0.08s ease,
    transform 0.08s ease;
}

.expedition-tooltip-enter-from,
.expedition-tooltip-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-2px);
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
  transform: scale(0.95) translateY(4px);
}
</style>

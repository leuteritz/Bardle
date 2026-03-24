<template>
  <!-- 2×2 Grid: Shop | Team / Expedition | ItemShop -->
  <div class="w-full h-full p-4 overflow-hidden">
    <div class="grid grid-cols-[3fr_2fr] grid-rows-[3fr_2fr] gap-3 h-full">
      <!-- ╔══════════════════════════╗
           ║  Oben links: Champion Shop ║
           ╚══════════════════════════╝ -->
      <div class="flex flex-col overflow-hidden border rounded-2xl border-white/15 bg-black/20">
        <div class="flex-1 min-h-0 overflow-hidden">
          <ChampionShopComponent />
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Oben rechts: Team        ║
           ╚══════════════════════════╝ -->
      <div
        class="flex flex-col p-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between flex-shrink-0 mb-3">
          <div
            class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-400/20"
          >
            <span class="text-sm font-bold text-blue-300/80">{{
              battleStore.selectedChampions.length
            }}</span>
            <span class="text-sm font-bold text-white/30">/4</span>
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
              class="relative flex flex-col overflow-hidden transition-all duration-200 border cursor-pointer rounded-xl group/card"
              :class="
                isOnExpedition(assignment)
                  ? 'border-white/[0.06] opacity-50'
                  : 'border-white/10 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10'
              "
              style="height: 100%"
            >
              <!-- Champion Image -->
              <div class="relative flex-1 min-h-0 overflow-hidden" @click="openSlotIndex = index">
                <img
                  :src="battleStore.getChampionImage(assignment)"
                  :alt="assignment"
                  class="absolute inset-0 object-cover object-top w-full h-full transition-transform duration-500 group-hover/card:scale-105"
                  :class="isOnExpedition(assignment) ? 'grayscale' : ''"
                  @error="onImgError"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"
                />

                <!-- Slot-Nummer -->
                <div class="absolute z-10 top-2 left-2">
                  <span
                    class="text-[9px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-white/40 border border-white/[0.08]"
                  >
                    #{{ index + 1 }}
                  </span>
                </div>

                <!-- Name + Status/Button -->
                <div class="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-1 p-2">
                  <span
                    class="text-[13px] font-bold leading-tight text-white drop-shadow-lg tracking-wide"
                  >
                    {{ truncate(assignment, 10) }}
                  </span>
                  <span
                    v-if="isOnExpedition(assignment)"
                    class="text-[10px] font-semibold text-amber-400/80 flex items-center gap-1"
                  >
                    <span>⏳</span> Expedition
                  </span>
                  <button
                    v-else
                    @click.stop="removeChampion(assignment)"
                    class="w-full py-1 text-[10px] font-bold rounded-lg transition-all duration-200 bg-black/50 backdrop-blur-sm border border-white/[0.08] text-white/40 hover:bg-red-500/30 hover:border-red-400/40 hover:text-red-300 opacity-0 group-hover/card:opacity-100 translate-y-1 group-hover/card:translate-y-0"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <!-- Equipment Row -->
              <div
                class="flex-shrink-0 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-black/80 border-t border-white/[0.05]"
              >
                <div
                  v-for="cat in equipCategories"
                  :key="cat.key"
                  class="relative flex items-center justify-center transition-all duration-150 rounded-lg cursor-pointer w-7 h-7"
                  :class="
                    getEquipIcon(index, cat.key)
                      ? 'bg-white/10 border border-white/20 hover:bg-white/20 shadow-inner'
                      : 'border border-dashed border-white/[0.12] hover:border-blue-400/40 hover:bg-blue-900/15'
                  "
                  @click.stop="toggleEquipPicker(index, cat.key)"
                >
                  <span class="text-[11px] leading-none">{{
                    getEquipIcon(index, cat.key) || cat.icon
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Leerer Slot -->
            <div
              v-else
              class="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015] transition-all duration-200 hover:border-blue-400/30 hover:bg-blue-900/10 group-hover/slot:border-blue-400/30 cursor-pointer"
              style="height: 100%"
              @click="openSlotIndex = index"
            >
              <div
                class="flex items-center justify-center w-8 h-8 transition-colors duration-200 border border-dashed rounded-xl border-white/10 group-hover/slot:border-blue-400/30"
              >
                <span
                  class="text-lg transition-colors duration-200 text-white/20 group-hover/slot:text-blue-400/70"
                  >+</span
                >
              </div>
              <span
                class="text-[10px] font-bold tracking-wider uppercase text-white/20 group-hover/slot:text-white/40 transition-colors duration-200"
              >
                Slot {{ index + 1 }}
              </span>
              <div class="flex items-center gap-1 mt-1">
                <div
                  v-for="cat in equipCategories"
                  :key="cat.key"
                  class="relative flex items-center justify-center w-6 h-6 transition-all duration-150 border border-dashed rounded-md cursor-pointer border-white/10 hover:border-blue-400/30 hover:bg-blue-900/10"
                  @click.stop="toggleEquipPicker(index, cat.key)"
                >
                  <span class="text-[10px]">{{ getEquipIcon(index, cat.key) || cat.icon }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Equipment Picker Popup -->
        <Transition name="equip-picker">
          <div
            v-if="equipPicker"
            class="absolute z-50 p-2 rounded-xl border border-white/15 bg-[#0d0b1e]/97 backdrop-blur-xl shadow-2xl"
            :style="{ bottom: '10px', right: '10px', width: '200px' }"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold tracking-widest uppercase text-white/40">
                {{ equipPickerLabel }}
              </span>
              <button
                @click="equipPicker = null"
                class="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                X
              </button>
            </div>
            <!-- Ausgeruestetes Item -->
            <div
              v-if="equippedItemInPicker"
              class="flex items-center justify-between p-1.5 mb-1 rounded-lg bg-emerald-500/10 border border-emerald-400/20"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-sm">{{ equippedItemInPicker.icon }}</span>
                <span class="text-[10px] font-bold text-white/70">{{
                  equippedItemInPicker.name
                }}</span>
              </div>
              <button
                @click="unequipCurrent"
                class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 border border-red-400/25 text-red-300 hover:bg-red-500/40 transition-colors"
              >
                Ablegen
              </button>
            </div>
            <!-- Verfuegbare Items -->
            <div class="space-y-1 overflow-y-auto max-h-32">
              <div
                v-for="item in availableItemsForPicker"
                :key="item.id"
                class="flex items-center justify-between p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] cursor-pointer transition-colors duration-150"
                @click="equipItemFromPicker(item.id)"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-sm">{{ item.icon }}</span>
                  <span class="text-[10px] font-bold text-white/60">{{ item.name }}</span>
                </div>
                <span class="text-[9px] text-white/30"
                  >x{{ itemStore.availableCount(item.id) }}</span
                >
              </div>
              <div
                v-if="availableItemsForPicker.length === 0 && !equippedItemInPicker"
                class="py-2 text-center"
              >
                <span class="text-[9px] text-white/20">Keine Items verfuegbar</span>
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
           ║  Unten links: Expedition  ║
           ╚══════════════════════════╝ -->
      <div
        class="flex flex-col px-4 pt-3 pb-3 overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-950/[0.06]"
      >
        <!-- Header -->
        <div class="flex items-center flex-shrink-0 gap-3 mb-3">
          <div class="relative" @mouseenter="showTooltip = true" @mouseleave="showTooltip = false">
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-default transition-all duration-200"
              :class="
                missionStore.activeMissions.length > 0
                  ? completedExpeditionCount > 0
                    ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300/70'
                    : 'bg-amber-500/10 border-amber-400/20 text-amber-300/70'
                  : 'bg-white/[0.03] border-white/10 text-white/30'
              "
            >
              <span class="text-sm">🧭</span>
              <span class="text-xs font-bold tracking-wide">
                {{ activeExpeditionCount }}/{{ MAX_ACTIVE_MISSIONS }}
              </span>
            </div>
            <span
              v-if="completedExpeditionCount > 0"
              class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
            />

            <!-- Tooltip -->
            <Transition name="expedition-tooltip">
              <div
                v-show="showTooltip && missionStore.activeMissions.length > 0"
                class="absolute left-0 top-full mt-2 z-50 w-72 p-4 rounded-2xl border border-amber-500/15 bg-[#09071a]/97 backdrop-blur-xl shadow-2xl"
              >
                <template v-if="activeExpeditionCount > 0">
                  <span
                    class="block mb-3 text-[10px] font-bold tracking-widest uppercase text-amber-300/40"
                  >
                    Aktive Expeditionen
                  </span>
                  <div class="space-y-4">
                    <div
                      v-for="mission in missionStore.activeMissions.filter(
                        (m) => m.status === 'active',
                      )"
                      :key="mission.id"
                      class="space-y-2"
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-white/60">
                          {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                        </span>
                        <span class="font-mono text-xs text-white/35">{{
                          getTimeRemaining(mission)
                        }}</span>
                      </div>
                      <div class="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          class="h-full transition-all duration-1000 rounded-full bg-gradient-to-r from-amber-500/80 to-orange-400/80"
                          :style="{ width: getProgress(mission) + '%' }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <template v-if="completedExpeditionCount > 0">
                  <div
                    :class="
                      activeExpeditionCount > 0 ? 'mt-4 pt-4 border-t border-white/[0.06]' : ''
                    "
                  >
                    <span
                      class="block mb-3 text-[10px] font-bold tracking-widest uppercase text-emerald-300/40"
                    >
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
                        <span class="text-xs font-semibold text-white/60">
                          {{ getMissionIcon(mission.configId) }} {{ mission.name }}
                        </span>
                        <button
                          @click="missionStore.collectMission(mission.id)"
                          class="text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                          :class="
                            mission.status === 'success'
                              ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30'
                              : 'bg-red-500/15 text-red-300 hover:bg-red-500/30'
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
        <div class="flex flex-col flex-1 min-h-0 gap-3 overflow-y-auto custom-scrollbar">
          <MissionCreateComponent />
        </div>
      </div>

      <!-- ╔══════════════════════════╗
           ║  Unten rechts: Item Shop  ║
           ╚══════════════════════════╝ -->
      <div
        class="overflow-y-auto custom-scrollbar rounded-2xl border border-white/15 bg-white/[0.01] p-3"
      >
        <ItemShopComponent />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '../../stores/battleStore'
import { useMissionStore } from '../../stores/missionStore'
import { useGameStore } from '../../stores/gameStore'
import { useItemStore } from '../../stores/itemStore'
import { MAX_ACTIVE_MISSIONS } from '../../config/constants'
import { MISSION_CONFIGS } from '../../config/missions'
import { SHOP_ITEMS, getItemById } from '../../config/items'
import { truncate } from '../../config/numberFormat'
import MissionCreateComponent from './MissionCreateComponent.vue'
import ChampionShopComponent from '../gameCenter/champion/ChampionShopComponent.vue'
import ItemShopComponent from '../gameCenter/ItemShopComponent.vue'
import ChampionSlotModal from '../ChampionSlotModal.vue'
import type { Mission, ItemCategory } from '../../types'

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
    const openSlotIndex = ref<number | null>(null)
    const showTooltip = ref(false)
    const equipPicker = ref<{ slotIndex: number; category: ItemCategory } | null>(null)
    let timer: ReturnType<typeof setInterval> | null = null

    onMounted(() => {
      timer = setInterval(() => {
        now.value = Date.now()
      }, 1000)
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

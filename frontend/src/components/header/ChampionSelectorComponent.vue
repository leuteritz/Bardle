<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import ChampionPickerModal from './ChampionPickerModal.vue'

const battleStore = useBattleStore()
const { headerSlots } = storeToRefs(battleStore)

const pickerOpen = ref(false)
const pickerSlotIndex = ref<number | null>(null)

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']
const ROLE_KEYS = ['top', 'jungle', 'mid', 'adc', 'support']

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

function openPicker(slotIndex: number) {
  pickerSlotIndex.value = slotIndex
  pickerOpen.value = true
}

function closePicker() {
  pickerOpen.value = false
  pickerSlotIndex.value = null
}

function handleSelect(champion: string, slotIdx: number) {
  battleStore.setHeaderSlot(slotIdx, champion)
}

function clearSlot(slotIndex: number, event: Event) {
  event.stopPropagation()
  battleStore.clearHeaderSlot(slotIndex)
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<template>
  <div class="champ-selector">
    <!-- ── 5 Slots ── -->
    <div class="panel-slots">
      <button
        v-for="(slot, i) in headerSlots"
        :key="i"
        class="slot-tile"
        :class="{ 'slot-tile--filled': slot !== null, [`slot-tile--role-${ROLE_KEYS[i]}`]: true }"
        :title="
          slot ? `${slot} (${ROLES[i]}) – klicken zum Ändern` : `${ROLES[i]} – Champion wählen`
        "
        @click="openPicker(i)"
      >
        <span class="slot-corner slot-corner--tl" aria-hidden="true" />
        <span class="slot-corner slot-corner--br" aria-hidden="true" />

        <div class="slot-portrait-wrap">
          <img
            v-if="slot"
            :src="battleStore.getChampionImage(slot)"
            :alt="slot"
            class="slot-portrait"
            @error="onImgError"
          />
          <span v-else class="slot-add-icon" aria-hidden="true">＋</span>
          <div class="slot-hover-glow" aria-hidden="true" />
        </div>

        <div class="slot-name-badge">
          <span class="slot-name-text">{{ ROLES[i] }}</span>
        </div>

        <button v-if="slot" class="slot-clear" title="Entfernen" @click.stop="clearSlot(i, $event)">
          ✕
        </button>
      </button>
    </div>

    <<ChampionPickerModal
      :open="pickerOpen"
      :slot-index="pickerSlotIndex"
      :header-slots="headerSlots"
      :available-champions="availableChampions"
      @close="closePicker"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════
   WRAPPER
   ════════════════════════════════════════════════ */
.champ-selector {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 4px;
}

/* ════════════════════════════════════════════════
   SLOT-LEISTE
   ════════════════════════════════════════════════ */
.panel-slots {
  display: flex;
  gap: 4px;
  flex: 1;
  align-items: stretch;
  height: 100%;
  padding: 4px 0;
}

/* ── Einzelner Slot ── */
.slot-tile {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 1px solid rgba(122, 78, 32, 0.45);
  border-radius: 5px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 200, 80, 0.05);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.slot-tile:hover {
  background: linear-gradient(170deg, #261c08 0%, #1a1206 100%);
  border-color: rgba(200, 144, 64, 0.75);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.1),
    0 0 12px rgba(200, 144, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}
.slot-tile:active {
  transform: translateY(0px) scale(0.97);
}

.slot-tile--filled {
  background: linear-gradient(170deg, #1e1208 0%, #150f04 100%);
  border-color: rgba(160, 100, 20, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.4);
}
.slot-tile--filled:hover {
  border-color: #c89040;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.14),
    0 0 14px rgba(200, 144, 64, 0.22),
    0 2px 10px rgba(0, 0, 0, 0.55);
}

/* ── Eck-Ornamente ── */
.slot-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.35);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.2s ease;
}
.slot-tile:hover .slot-corner,
.slot-tile--filled .slot-corner {
  border-color: rgba(200, 144, 64, 0.65);
}
.slot-corner--tl {
  top: 3px;
  left: 3px;
  border-width: 1px 0 0 1px;
}
.slot-corner--br {
  bottom: 3px;
  right: 3px;
  border-width: 0 1px 1px 0;
}

/* ── Portrait füllt den gesamten Slot ── */
.slot-portrait-wrap {
  position: absolute;
  inset: 0;
  background: #0e0c08;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.slot-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
}
.slot-tile:hover .slot-portrait {
  transform: scale(1.06);
}

/* ── Plus-Icon für leere Slots ── */
.slot-add-icon {
  font-size: 20px;
  color: rgba(200, 144, 64, 0.2);
  line-height: 1;
  z-index: 1;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}
.slot-tile:hover .slot-add-icon {
  color: rgba(200, 144, 64, 0.55);
  transform: scale(1.2);
}

/* ── Hover-Glow innen ── */
.slot-hover-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(200, 144, 64, 0.12), transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.slot-tile:hover .slot-hover-glow {
  opacity: 1;
}

/* ── Name-Badge als Overlay am unteren Rand ── */
.slot-name-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 3px 3px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0) 100%);
}
.slot-name-text {
  font-size: 8px;
  font-weight: 800;
  color: rgba(180, 130, 50, 0.55);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1;
  transition: color 0.2s ease;
}
.slot-tile--filled .slot-name-text {
  color: rgba(220, 170, 60, 0.9);
}
.slot-tile:hover .slot-name-text {
  color: #e8c040;
}

/* ── Clear-Button ── */
.slot-clear {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  font-size: 7px;
  color: #cc6050;
  background: rgba(20, 10, 6, 0.85);
  border: 1px solid rgba(180, 60, 40, 0.4);
  border-radius: 2px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 10;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;
}
.slot-tile:hover .slot-clear {
  opacity: 1;
}
.slot-clear:hover {
  background: rgba(160, 40, 20, 0.7) !important;
  border-color: #cc6050;
}

/* ── Rollen-Akzentfarben ── */
.slot-tile--role-top     { border-color: rgba(224, 80, 80, 0.45); }
.slot-tile--role-jungle  { border-color: rgba(80, 192, 96, 0.45); }
.slot-tile--role-mid     { border-color: rgba(80, 144, 232, 0.45); }
.slot-tile--role-adc     { border-color: rgba(232, 152, 64, 0.45); }
.slot-tile--role-support { border-color: rgba(184, 200, 216, 0.45); }

.slot-tile--role-top.slot-tile--filled     { border-color: rgba(224, 80, 80, 0.75); box-shadow: inset 0 1px 0 rgba(224, 80, 80, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.4); }
.slot-tile--role-jungle.slot-tile--filled  { border-color: rgba(80, 192, 96, 0.75); box-shadow: inset 0 1px 0 rgba(80, 192, 96, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.4); }
.slot-tile--role-mid.slot-tile--filled     { border-color: rgba(80, 144, 232, 0.75); box-shadow: inset 0 1px 0 rgba(80, 144, 232, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.4); }
.slot-tile--role-adc.slot-tile--filled     { border-color: rgba(232, 152, 64, 0.75); box-shadow: inset 0 1px 0 rgba(232, 152, 64, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.4); }
.slot-tile--role-support.slot-tile--filled { border-color: rgba(184, 200, 216, 0.75); box-shadow: inset 0 1px 0 rgba(184, 200, 216, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.4); }

.slot-tile--role-top:hover     { border-color: #e05050; box-shadow: inset 0 1px 0 rgba(224, 80, 80, 0.12), 0 0 10px rgba(224, 80, 80, 0.2), 0 2px 8px rgba(0, 0, 0, 0.5); }
.slot-tile--role-jungle:hover  { border-color: #50c060; box-shadow: inset 0 1px 0 rgba(80, 192, 96, 0.12), 0 0 10px rgba(80, 192, 96, 0.2), 0 2px 8px rgba(0, 0, 0, 0.5); }
.slot-tile--role-mid:hover     { border-color: #5090e8; box-shadow: inset 0 1px 0 rgba(80, 144, 232, 0.12), 0 0 10px rgba(80, 144, 232, 0.2), 0 2px 8px rgba(0, 0, 0, 0.5); }
.slot-tile--role-adc:hover     { border-color: #e89840; box-shadow: inset 0 1px 0 rgba(232, 152, 64, 0.12), 0 0 10px rgba(232, 152, 64, 0.2), 0 2px 8px rgba(0, 0, 0, 0.5); }
.slot-tile--role-support:hover { border-color: #b8c8d8; box-shadow: inset 0 1px 0 rgba(184, 200, 216, 0.12), 0 0 10px rgba(184, 200, 216, 0.2), 0 2px 8px rgba(0, 0, 0, 0.5); }
</style>

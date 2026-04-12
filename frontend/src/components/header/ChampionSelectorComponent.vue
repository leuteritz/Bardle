<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'

const battleStore = useBattleStore()

const { headerSlots } = storeToRefs(battleStore)

const pickerOpen = ref(false)
const pickerSlotIndex = ref<number | null>(null)
const searchQuery = ref('')

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const availableChampions = computed(() => battleStore.ownedChampions.filter((c) => c !== 'Bard'))

const filteredChampions = computed(() => {
  if (!searchQuery.value) return availableChampions.value
  return availableChampions.value.filter((c) =>
    c.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

function openPicker(slotIndex: number) {
  pickerSlotIndex.value = slotIndex
  pickerOpen.value = true
  searchQuery.value = ''
}

function closePicker() {
  pickerOpen.value = false
  pickerSlotIndex.value = null
}

function selectChampion(champion: string) {
  if (pickerSlotIndex.value === null) return
  battleStore.setHeaderSlot(pickerSlotIndex.value, champion)
  closePicker()
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
        :class="{ 'slot-tile--filled': slot !== null }"
        :title="slot ? `${slot} (${ROLES[i]}) – klicken zum Ändern` : `${ROLES[i]} – Champion wählen`"
        @click="openPicker(i)"
      >
        <!-- Eckornament oben-links -->
        <span class="slot-corner slot-corner--tl" aria-hidden="true" />
        <!-- Eckornament unten-rechts -->
        <span class="slot-corner slot-corner--br" aria-hidden="true" />

        <!-- Portrait füllt gesamten Slot -->
        <div class="slot-portrait-wrap">
          <img
            v-if="slot"
            :src="battleStore.getChampionImage(slot)"
            :alt="slot"
            class="slot-portrait"
            @error="onImgError"
          />
          <span v-else class="slot-add-icon" aria-hidden="true">＋</span>

          <!-- Glow-Overlay beim Hover -->
          <div class="slot-hover-glow" aria-hidden="true" />
        </div>

        <!-- Name-Badge als Overlay am unteren Rand -->
        <div class="slot-name-badge">
          <span class="slot-name-text">{{ ROLES[i] }}</span>
        </div>

        <!-- Clear-Button -->
        <button v-if="slot" class="slot-clear" title="Entfernen" @click.stop="clearSlot(i, $event)">
          ✕
        </button>
      </button>
    </div>

    <!-- ── Champion-Picker Modal ── -->
    <Transition name="picker-pop">
      <div v-if="pickerOpen" class="picker-overlay" @click.self="closePicker">
        <div class="picker-frame" role="dialog" aria-modal="true" aria-label="Champion wählen">
          <!-- Goldener Akzentbalken -->
          <div class="picker-accent-bar" />

          <!-- Header -->
          <div class="picker-header">
            <div class="picker-header-left">
              <img src="/img/BardAbilities/BardChime.png" class="picker-header-icon" alt="" />
              <span class="picker-title">Champion wählen</span>
              <span class="picker-subtitle">
                Rolle: {{ pickerSlotIndex !== null ? ROLES[pickerSlotIndex] : '' }}
              </span>
            </div>
            <button class="picker-close" @click="closePicker" title="Schließen">✕</button>
          </div>

          <!-- Suchzeile -->
          <div class="picker-search-row">
            <div class="picker-search-wrap">
              <span class="picker-search-icon">🔍</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Champion suchen …"
                class="picker-search"
                autofocus
              />
            </div>
          </div>

          <!-- Ergebnis-Info -->
          <div class="picker-result-info">
            <span
              >{{ filteredChampions.length }} von {{ availableChampions.length }} Champions</span
            >
          </div>

          <!-- Grid -->
          <div class="picker-body">
            <div v-if="filteredChampions.length === 0" class="picker-empty">
              <span class="picker-empty-icon">🎵</span>
              <span>{{
                availableChampions.length === 0
                  ? 'Kaufe Champions im Shop!'
                  : 'Kein Champion gefunden.'
              }}</span>
            </div>

            <div v-else class="picker-grid">
              <button
                v-for="champion in filteredChampions"
                :key="champion"
                class="picker-champ"
                :class="{
                  'picker-champ--active':
                    pickerSlotIndex !== null && headerSlots[pickerSlotIndex] === champion,
                  'picker-champ--taken':
                    headerSlots.includes(champion) && headerSlots[pickerSlotIndex!] !== champion,
                }"
                @click="selectChampion(champion)"
              >
                <!-- Portrait mit Overlay -->
                <div class="picker-thumb">
                  <img
                    :src="battleStore.getChampionImage(champion)"
                    :alt="champion"
                    class="picker-thumb-img"
                    @error="onImgError"
                  />
                  <!-- Aktiv-Haken -->
                  <div
                    v-if="pickerSlotIndex !== null && headerSlots[pickerSlotIndex] === champion"
                    class="picker-active-overlay"
                  >
                    <span class="picker-check">✓</span>
                  </div>
                  <!-- Bereits belegt -->
                  <div v-else-if="headerSlots.includes(champion)" class="picker-taken-overlay">
                    <span class="picker-taken-badge">
                      {{ headerSlots.indexOf(champion) + 1 }}
                    </span>
                  </div>
                </div>

                <!-- Name unter Portrait -->
                <span class="picker-champ-name">{{ champion }}</span>
              </button>
            </div>
          </div>

          <!-- Unterer Akzentbalken -->
          <div class="picker-accent-bar picker-accent-bar--bottom" />
        </div>
      </div>
    </Transition>
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
  /* kein padding, kein gap – Portrait füllt alles */
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

.slot-tile--filled .slot-portrait-wrap {
  /* border sitzt bereits am slot-tile */
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

/* ════════════════════════════════════════════════
   PICKER OVERLAY
   ════════════════════════════════════════════════ */
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-frame {
  background: linear-gradient(175deg, #130f06 0%, #0d0a04 100%);
  border: 3px solid #7a4e20;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 0 3px rgba(92, 51, 16, 0.5),
    0 0 0 1px rgba(200, 144, 64, 0.12),
    0 16px 60px rgba(0, 0, 0, 0.95),
    0 0 40px rgba(200, 144, 64, 0.06);
  width: min(520px, 94vw);
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-accent-bar {
  height: 3px;
  background: linear-gradient(
    to right,
    #3e1a06,
    #7a3a10 15%,
    #c89040 35%,
    #f0d060 50%,
    #c89040 65%,
    #7a3a10 85%,
    #3e1a06
  );
  flex-shrink: 0;
}
.picker-accent-bar--bottom {
  opacity: 0.6;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px 10px;
  background: linear-gradient(to bottom, #1e1206, #160e04);
  border-bottom: 2px solid #4a2a0e;
  flex-shrink: 0;
  gap: 10px;
}
.picker-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.picker-header-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.6));
  flex-shrink: 0;
}
.picker-title {
  font-size: 12px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  line-height: 1;
}
.picker-subtitle {
  font-size: 9px;
  font-weight: 600;
  color: rgba(200, 144, 64, 0.45);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-left: 1px solid rgba(200, 144, 64, 0.2);
  padding-left: 8px;
  line-height: 1;
}
.picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(60, 30, 10, 0.6);
  border: 1px solid #5c3310;
  border-radius: 4px;
  color: rgba(200, 144, 64, 0.7);
  cursor: pointer;
  font-size: 10px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.picker-close:hover {
  background: rgba(160, 40, 20, 0.45);
  color: #e87060;
  border-color: #884040;
}

.picker-search-row {
  padding: 10px 16px 8px;
  border-bottom: 1px solid #2a1a06;
  flex-shrink: 0;
}
.picker-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #181208;
  border: 1px solid #3a2510;
  border-radius: 4px;
  padding: 6px 10px;
  transition: border-color 0.15s ease;
}
.picker-search-wrap:focus-within {
  border-color: #c89040;
  box-shadow: 0 0 0 2px rgba(200, 144, 64, 0.1);
}
.picker-search-icon {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
  line-height: 1;
}
.picker-search {
  flex: 1;
  background: transparent;
  border: none;
  color: #e8c040;
  font-size: 12px;
  outline: none;
  min-width: 0;
  line-height: 1;
}
.picker-search::placeholder {
  color: rgba(200, 144, 64, 0.28);
}

.picker-result-info {
  display: flex;
  align-items: center;
  padding: 5px 16px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.32);
  border-bottom: 1px solid rgba(42, 26, 6, 0.8);
  flex-shrink: 0;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 14px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: rgba(200, 144, 64, 0.35);
  font-size: 12px;
  letter-spacing: 0.05em;
}
.picker-empty-icon {
  font-size: 28px;
  opacity: 0.4;
}

/* ── Picker Champion-Grid ── */
.picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
}

.picker-champ {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 6px 7px;
  background: linear-gradient(170deg, #1a1408 0%, #120e04 100%);
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 5px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.picker-champ::before,
.picker-champ::after {
  content: '';
  position: absolute;
  width: 5px;
  height: 5px;
  border-color: rgba(200, 144, 64, 0.25);
  border-style: solid;
  transition: border-color 0.15s ease;
}
.picker-champ::before {
  top: 2px;
  left: 2px;
  border-width: 1px 0 0 1px;
}
.picker-champ::after {
  bottom: 2px;
  right: 2px;
  border-width: 0 1px 1px 0;
}
.picker-champ:hover {
  background: linear-gradient(170deg, #261c08 0%, #1a1206 100%);
  border-color: rgba(200, 144, 64, 0.8);
  box-shadow: 0 0 10px rgba(200, 144, 64, 0.14);
  transform: translateY(-1px);
}
.picker-champ:hover::before,
.picker-champ:hover::after {
  border-color: rgba(200, 144, 64, 0.6);
}
.picker-champ--active {
  background: linear-gradient(170deg, #162008 0%, #0e1804 100%);
  border-color: #6ec040;
  box-shadow:
    0 0 12px rgba(110, 192, 64, 0.22),
    inset 0 0 8px rgba(110, 192, 64, 0.04);
}
.picker-champ--active::before,
.picker-champ--active::after {
  border-color: rgba(110, 192, 64, 0.5);
}
.picker-champ--taken {
  opacity: 0.65;
}

.picker-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(92, 51, 16, 0.7);
  background: #0e0c08;
  flex-shrink: 0;
  transition: border-color 0.15s ease;
}
.picker-champ:hover .picker-thumb {
  border-color: rgba(200, 144, 64, 0.75);
}
.picker-champ--active .picker-thumb {
  border-color: #6ec040;
}
.picker-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  transition: transform 0.2s ease;
}
.picker-champ:hover .picker-thumb-img {
  transform: scale(1.08);
}

.picker-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(14, 40, 8, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}
.picker-check {
  font-size: 22px;
  color: #6ec040;
  filter: drop-shadow(0 0 4px rgba(110, 192, 64, 0.7));
  line-height: 1;
}

.picker-taken-overlay {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 2px 5px;
  background: rgba(14, 10, 4, 0.82);
  border-top: 1px solid rgba(200, 144, 64, 0.3);
  border-left: 1px solid rgba(200, 144, 64, 0.3);
  border-radius: 3px 0 0 0;
}
.picker-taken-badge {
  font-size: 9px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.65);
  line-height: 1;
}

.picker-champ-name {
  font-size: 9px;
  font-weight: 800;
  color: rgba(200, 160, 80, 0.65);
  letter-spacing: 0.04em;
  line-height: 1.2;
  text-transform: uppercase;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-align: center;
  transition: color 0.15s ease;
  width: 100%;
}
.picker-champ:hover .picker-champ-name {
  color: #e8c040;
}
.picker-champ--active .picker-champ-name {
  color: #8ed84a;
}

/* ════════════════════════════════════════════════
   TRANSITION
   ════════════════════════════════════════════════ */
.picker-pop-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s cubic-bezier(0.22, 0.9, 0.45, 1.05);
}
.picker-pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.picker-pop-enter-from {
  opacity: 0;
  transform: scale(0.93) translateY(8px);
}
.picker-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}
</style>

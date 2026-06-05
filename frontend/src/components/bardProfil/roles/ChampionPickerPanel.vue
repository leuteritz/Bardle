<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const props = withDefaults(
  defineProps<{
    activeRole: string
    pickerTitle?: string
    roleFilteredChampions: string[]
    headerSlots: (string | null)[]
    secondarySlots?: (string | null)[][]
    activeSlotIndex: number
    activeSubSlot?: number
  }>(),
  {
    pickerTitle: '',
    secondarySlots: () => [
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ],
    activeSubSlot: -1,
  },
)

const emit = defineEmits<{
  back: []
  select: [champion: string]
}>()

const battleStore = useBattleStore()
const searchQuery = ref('')

const headerTitle = computed(() =>
  props.pickerTitle ? props.pickerTitle : `${props.activeRole} — Select Champion`,
)

const filteredChampions = computed(() => {
  const list = searchQuery.value
    ? props.roleFilteredChampions.filter((c) =>
        c.toLowerCase().includes(searchQuery.value.toLowerCase()),
      )
    : props.roleFilteredChampions
  return [...list].sort((a, b) => a.localeCompare(b))
})

function isActiveSelection(champion: string): boolean {
  if (props.activeSubSlot === -1) {
    return props.headerSlots[props.activeSlotIndex] === champion
  }
  return props.secondarySlots[props.activeSlotIndex]?.[props.activeSubSlot] === champion
}

function takenLabel(champion: string): string | null {
  if (isActiveSelection(champion)) return null
  const mainIdx = props.headerSlots.indexOf(champion)
  if (mainIdx >= 0) return ROLES[mainIdx]
  for (let r = 0; r < props.secondarySlots.length; r++) {
    const sub = props.secondarySlots[r].indexOf(champion)
    if (sub >= 0) return `${ROLES[r]}·S${sub + 1}`
  }
  return null
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="champion-picker-panel">
    <div class="sub-header">
      <span class="sub-header-title">{{ headerTitle }}</span>
      <button class="back-btn" @click="emit('back')">← Back</button>
    </div>

    <div class="search-row">
      <Icon icon="game-icons:magnifying-glass" width="16" height="16" class="search-icon" style="color: #7a4e20" />
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="`Search ${activeRole} Champion…`"
        class="search-input"
      />
      <span class="search-count">
        {{ filteredChampions.length }}<span class="search-count-sep">/</span
        >{{ roleFilteredChampions.length }}
      </span>
    </div>

    <div class="picker-body">
      <div v-if="filteredChampions.length === 0" class="picker-empty">
        <Icon icon="game-icons:lyre" class="picker-empty-icon" />
        <span>{{
          roleFilteredChampions.length === 0
            ? `No ${activeRole} champions purchased!`
            : 'No champion found.'
        }}</span>
      </div>
      <div v-else class="picker-grid">
        <button
          v-for="champion in filteredChampions"
          :key="champion"
          class="picker-champ"
          :class="{
            'picker-champ--active': isActiveSelection(champion),
            'picker-champ--taken': !!takenLabel(champion),
          }"
          @click="emit('select', champion)"
        >
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="picker-champ-img"
            @error="onImgError"
          />
          <div class="picker-champ-gradient" />
          <span class="picker-champ-name">{{ champion }}</span>
          <span class="pchamp-corner pchamp-corner--tl" />
          <span class="pchamp-corner pchamp-corner--br" />
          <div v-if="isActiveSelection(champion)" class="picker-active-overlay">
            <span class="picker-check">✓</span>
          </div>
          <div v-else-if="takenLabel(champion)" class="picker-taken-badge">
            {{ takenLabel(champion) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.champion-picker-panel {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --green: #6ec040;
  --green-glow: rgba(110, 192, 64, 0.32);
  --border: rgba(92, 51, 16, 0.45);

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sub-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.9);
  flex-shrink: 0;
  background: linear-gradient(to bottom, #1a1006, #120d04);
}
.sub-header-title {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold-bright);
  line-height: 1;
}
.back-btn {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(200, 144, 64, 0.55);
  background: rgba(60, 30, 10, 0.5);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  color: var(--gold-bright);
  border-color: rgba(200, 144, 64, 0.5);
  background: rgba(80, 40, 10, 0.7);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.7);
  flex-shrink: 0;
}
.search-icon {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  background: #181208;
  border: 1px solid #3a2510;
  border-radius: 5px;
  padding: 5px 10px;
  color: var(--gold-bright);
  font-size: 11px;
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
}
.search-input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(200, 144, 64, 0.08);
}
.search-input::placeholder {
  color: rgba(200, 144, 64, 0.28);
}
.search-count {
  font-size: 10px;
  font-weight: 700;
  color: var(--gold-dim);
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.search-count-sep {
  opacity: 0.3;
  margin: 0 1px;
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 12px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
  min-height: 220px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba(200, 144, 64, 0.3);
}
.picker-empty-icon {
  font-size: 34px;
  opacity: 0.38;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  align-content: start;
}

.picker-champ {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #0c0906;
  padding: 0;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.12s;
}
.picker-champ:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow: 0 0 14px var(--gold-glow);
  transform: translateY(-2px) scale(1.025);
}
.picker-champ--active {
  border-color: var(--green);
  box-shadow: 0 0 16px var(--green-glow);
}
.picker-champ--taken {
  opacity: 0.42;
}

.picker-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s;
  display: block;
}
.picker-champ:hover .picker-champ-img {
  transform: scale(1.08);
}
.picker-champ-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, transparent 52%);
  pointer-events: none;
  z-index: 1;
}
.picker-champ-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 0 3px 5px;
  font-size: 8px;
  font-weight: 900;
  color: rgba(215, 175, 75, 0.88);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}
.picker-champ:hover .picker-champ-name {
  color: #f0d060;
}
.picker-champ--active .picker-champ-name {
  color: #8ed84a;
}

.pchamp-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.22);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s;
}
.picker-champ:hover .pchamp-corner {
  border-color: rgba(200, 144, 64, 0.6);
}
.picker-champ--active .pchamp-corner {
  border-color: rgba(110, 192, 64, 0.5);
}
.pchamp-corner--tl {
  top: 2px;
  left: 2px;
  border-width: 1px 0 0 1px;
}
.pchamp-corner--br {
  bottom: 2px;
  right: 2px;
  border-width: 0 1px 1px 0;
}

.picker-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 36, 6, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.picker-check {
  font-size: 26px;
  color: var(--green);
  filter: drop-shadow(0 0 8px rgba(110, 192, 64, 0.9));
  line-height: 1;
}
.picker-taken-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 4;
  padding: 2px 5px;
  background: rgba(14, 10, 4, 0.9);
  border: 1px solid rgba(200, 144, 64, 0.3);
  border-radius: 3px;
  font-size: 7px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.7);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1;
}
</style>

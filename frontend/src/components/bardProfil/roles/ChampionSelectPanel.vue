<script setup lang="ts">
import { ref, computed } from 'vue'
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
    secondarySlots: () => [[null, null], [null, null], [null, null], [null, null], [null, null]],
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
  props.pickerTitle ? props.pickerTitle : `${props.activeRole} — Champion wählen`,
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
  return props.secondarySlots?.[props.activeSlotIndex]?.[props.activeSubSlot] === champion
}

function takenLabel(champion: string): string | null {
  if (isActiveSelection(champion)) return null
  const mainIdx = props.headerSlots.indexOf(champion)
  if (mainIdx >= 0) return ROLES[mainIdx]
  if (props.secondarySlots) {
    for (let r = 0; r < props.secondarySlots.length; r++) {
      const sub = props.secondarySlots[r].indexOf(champion)
      if (sub >= 0) return `${ROLES[r]}·S${sub + 1}`
    }
  }
  return null
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <div class="csp-root">
    <!-- ── Header ── -->
    <div class="csp-header">
      <span class="csp-title">{{ headerTitle }}</span>
      <button class="csp-back-btn" @click="emit('back')">← Zurück</button>
    </div>

    <!-- ── Search ── -->
    <div class="csp-search-row">
      <span class="csp-search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="`${activeRole}-Champion suchen …`"
        class="csp-search-input"
      />
      <span class="csp-search-count">
        {{ filteredChampions.length }}<span class="csp-count-sep">/</span>{{ roleFilteredChampions.length }}
      </span>
    </div>

    <!-- ── Grid ── -->
    <div class="csp-body">
      <div v-if="filteredChampions.length === 0" class="csp-empty">
        <span class="csp-empty-icon">🎵</span>
        <span>{{
          roleFilteredChampions.length === 0
            ? `Keine ${activeRole}-Champions gekauft!`
            : 'Kein Champion gefunden.'
        }}</span>
      </div>

      <div v-else class="csp-grid">
        <button
          v-for="champion in filteredChampions"
          :key="champion"
          class="csp-champ"
          :class="{
            'csp-champ--active': isActiveSelection(champion),
            'csp-champ--taken': !!takenLabel(champion),
          }"
          @click="emit('select', champion)"
        >
          <img
            :src="battleStore.getChampionImage(champion)"
            :alt="champion"
            class="csp-champ-img"
            @error="onImgError"
          />
          <div class="csp-champ-gradient" />
          <span class="csp-champ-name">{{ champion }}</span>
          <span class="csp-corner csp-corner--tl" />
          <span class="csp-corner csp-corner--br" />
          <div v-if="isActiveSelection(champion)" class="csp-active-overlay">
            <span class="csp-check">✓</span>
          </div>
          <div v-else-if="takenLabel(champion)" class="csp-taken-badge">
            {{ takenLabel(champion) }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csp-root {
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

/* ── Header ── */
.csp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 7px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.9);
  flex-shrink: 0;
  background: linear-gradient(to bottom, #1a1006, #120d04);
}

.csp-title {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold-bright);
  line-height: 1;
}

.csp-back-btn {
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
.csp-back-btn:hover {
  color: var(--gold-bright);
  border-color: rgba(200, 144, 64, 0.5);
  background: rgba(80, 40, 10, 0.7);
}

/* ── Search ── */
.csp-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(42, 26, 6, 0.7);
  flex-shrink: 0;
}

.csp-search-icon {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
}

.csp-search-input {
  flex: 1;
  background: #181208;
  border: 1px solid #3a2510;
  border-radius: 4px;
  padding: 5px 10px;
  color: var(--gold-bright);
  font-size: 11px;
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
}
.csp-search-input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 2px rgba(200, 144, 64, 0.08);
}
.csp-search-input::placeholder {
  color: rgba(200, 144, 64, 0.28);
}

.csp-search-count {
  font-size: 10px;
  font-weight: 700;
  color: var(--gold-dim);
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.csp-count-sep {
  opacity: 0.3;
  margin: 0 1px;
}

/* ── Body / Grid ── */
.csp-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 12px;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
}

.csp-empty {
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
.csp-empty-icon {
  font-size: 34px;
  opacity: 0.38;
}

.csp-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  align-content: start;
}

/* ── Champion Card ── */
.csp-champ {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 4px;
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
.csp-champ:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow: 0 0 14px var(--gold-glow);
  transform: translateY(-2px) scale(1.025);
}
.csp-champ--active {
  border-color: var(--green);
  box-shadow: 0 0 16px var(--green-glow);
}
.csp-champ--taken {
  opacity: 0.42;
}

.csp-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s;
  display: block;
}
.csp-champ:hover .csp-champ-img {
  transform: scale(1.08);
}

.csp-champ-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, transparent 52%);
  pointer-events: none;
  z-index: 1;
}

.csp-champ-name {
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
.csp-champ:hover .csp-champ-name {
  color: #f0d060;
}
.csp-champ--active .csp-champ-name {
  color: #8ed84a;
}

/* Corner decorations */
.csp-corner {
  position: absolute;
  width: 6px;
  height: 6px;
  border-color: rgba(200, 144, 64, 0.22);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s;
}
.csp-champ:hover .csp-corner {
  border-color: rgba(200, 144, 64, 0.6);
}
.csp-champ--active .csp-corner {
  border-color: rgba(110, 192, 64, 0.5);
}
.csp-corner--tl {
  top: 2px;
  left: 2px;
  border-width: 1px 0 0 1px;
}
.csp-corner--br {
  bottom: 2px;
  right: 2px;
  border-width: 0 1px 1px 0;
}

/* Active overlay */
.csp-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(12, 36, 6, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.csp-check {
  font-size: 26px;
  color: var(--green);
  filter: drop-shadow(0 0 8px rgba(110, 192, 64, 0.9));
  line-height: 1;
}

/* Taken badge */
.csp-taken-badge {
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

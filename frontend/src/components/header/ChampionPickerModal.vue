<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { getChampionRoles } from '@/config/championRoles'
import type { ChampionRole } from '@/types'

const props = defineProps<{
  open: boolean
  slotIndex: number | null
  headerSlots: (string | null)[]
  availableChampions: string[]
}>()

const emit = defineEmits<{
  close: []
  select: [champion: string, slotIndex: number]
}>()

const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Supp']

const ROLE_MAP: Record<string, ChampionRole> = {
  Top: 'top',
  Jungle: 'jungle',
  Mid: 'mid',
  ADC: 'adc',
  Supp: 'support',
}

const battleStore = useBattleStore()
const searchQuery = ref('')
const activeSlotIndex = ref<number>(props.slotIndex ?? 0)

watch(
  () => props.open,
  (val) => {
    if (val) {
      searchQuery.value = ''
      activeSlotIndex.value = props.slotIndex ?? 0
    }
  },
)

const activeRole = computed(() => ROLES[activeSlotIndex.value])

const roleFilteredChampions = computed(() => {
  const internalRole = ROLE_MAP[activeRole.value]
  if (!internalRole) return props.availableChampions
  return props.availableChampions.filter((c) => getChampionRoles(c).includes(internalRole))
})

const filteredChampions = computed(() => {
  const list = searchQuery.value
    ? roleFilteredChampions.value.filter((c) =>
        c.toLowerCase().includes(searchQuery.value.toLowerCase()),
      )
    : roleFilteredChampions.value
  return [...list].sort((a, b) => a.localeCompare(b))
})

function switchSlot(index: number) {
  activeSlotIndex.value = index
  searchQuery.value = ''
}

function handleSelect(champion: string) {
  emit('select', champion, activeSlotIndex.value)
}

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}
</script>

<template>
  <Transition name="picker-pop">
    <div v-if="open" class="picker-overlay" @click.self="emit('close')">
      <div class="picker-frame" role="dialog" aria-modal="true" aria-label="Champion wählen">
        <div class="picker-accent-bar" />

        <!-- Header -->
        <div class="picker-header">
          <div class="picker-header-left">
            <img src="/img/BardAbilities/BardChime.png" class="picker-header-icon" alt="" />
            <span class="picker-title">Champion wählen</span>
            <span class="picker-subtitle">{{ activeRole }}</span>
          </div>
          <button class="picker-close" title="Schließen" @click="emit('close')">✕</button>
        </div>

        <!-- ── Slot-Switcher ── -->
        <div class="slot-switcher">
          <button
            v-for="(role, i) in ROLES"
            :key="i"
            class="switcher-tile"
            :class="{
              'switcher-tile--active': activeSlotIndex === i,
              'switcher-tile--filled': headerSlots[i] !== null,
            }"
            :title="`${role}${headerSlots[i] ? ': ' + headerSlots[i] : ' – leer'}`"
            @click="switchSlot(i)"
          >
            <div class="switcher-portrait-wrap">
              <img
                v-if="headerSlots[i]"
                :src="battleStore.getChampionImage(headerSlots[i]!)"
                :alt="headerSlots[i]!"
                class="switcher-portrait"
                @error="onImgError"
              />
              <span v-else class="switcher-empty-icon">＋</span>
              <div v-if="activeSlotIndex === i" class="switcher-active-glow" />
            </div>
            <span class="switcher-role-label">{{ role }}</span>
            <div v-if="activeSlotIndex === i" class="switcher-active-bar" />
          </button>
        </div>

        <!-- Suche -->
        <div class="picker-search-row">
          <div class="picker-search-wrap">
            <span class="picker-search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="`${activeRole}-Champion suchen …`"
              class="picker-search"
              autofocus
            />
          </div>
        </div>

        <!-- Ergebnis-Info -->
        <div class="picker-result-info">
          <span
            >{{ filteredChampions.length }} von {{ roleFilteredChampions.length }}
            {{ activeRole }}-Champions</span
          >
        </div>

        <!-- Grid -->
        <div class="picker-body">
          <div v-if="filteredChampions.length === 0" class="picker-empty">
            <span class="picker-empty-icon">🎵</span>
            <span>{{
              roleFilteredChampions.length === 0
                ? `Keine ${activeRole}-Champions gekauft!`
                : 'Kein Champion gefunden.'
            }}</span>
          </div>

          <div v-else class="picker-grid">
            <button
              v-for="champion in filteredChampions"
              :key="champion"
              class="picker-champ"
              :class="{
                'picker-champ--active': headerSlots[activeSlotIndex] === champion,
                'picker-champ--taken':
                  headerSlots.includes(champion) && headerSlots[activeSlotIndex] !== champion,
              }"
              @click="handleSelect(champion)"
            >
              <!-- Bild füllt gesamte Karte -->
              <img
                :src="battleStore.getChampionImage(champion)"
                :alt="champion"
                class="picker-champ-img"
                @error="onImgError"
              />

              <!-- Name-Overlay unten -->
              <span class="picker-champ-name">{{ champion }}</span>

              <!-- Eck-Ornamente -->
              <span class="champ-corner champ-corner--tl" />
              <span class="champ-corner champ-corner--br" />

              <!-- Aktiv-Overlay -->
              <div v-if="headerSlots[activeSlotIndex] === champion" class="picker-active-overlay">
                <span class="picker-check">✓</span>
              </div>

              <!-- Bereits belegt -->
              <div v-else-if="headerSlots.includes(champion)" class="picker-taken-overlay">
                <span class="picker-taken-badge">
                  {{ ROLES[headerSlots.indexOf(champion)] }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div class="picker-accent-bar picker-accent-bar--bottom" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Overlay ── */
.picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Frame ── */
.picker-frame {
  background: linear-gradient(175deg, #130f06 0%, #0d0a04 100%);
  border: 3px solid #7a4e20;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 0 3px rgba(92, 51, 16, 0.5),
    0 0 0 1px rgba(200, 144, 64, 0.12),
    0 24px 80px rgba(0, 0, 0, 0.97),
    0 0 60px rgba(200, 144, 64, 0.07);
  width: min(720px, 96vw);
  height: min(680px, 92vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Akzentbalken ── */
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

/* ── Header ── */
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 13px;
  background: linear-gradient(to bottom, #211408, #180f04);
  border-bottom: 1px solid #3a2008;
  flex-shrink: 0;
  gap: 12px;
}
.picker-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.picker-header-icon {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.65));
  flex-shrink: 0;
}
.picker-title {
  font-size: 14px;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
}
.picker-subtitle {
  font-size: 11px;
  font-weight: 700;
  color: rgba(200, 144, 64, 0.55);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-left: 1px solid rgba(200, 144, 64, 0.25);
  padding-left: 10px;
  line-height: 1;
}
.picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(60, 30, 10, 0.6);
  border: 1px solid #5c3310;
  border-radius: 5px;
  color: rgba(200, 144, 64, 0.7);
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.picker-close:hover {
  background: rgba(160, 40, 20, 0.45);
  color: #e87060;
  border-color: #884040;
}

/* ════════════════════════════════════════════════
   SLOT-SWITCHER
   ════════════════════════════════════════════════ */
.slot-switcher {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(to bottom, #160f05, #100c03);
  border-bottom: 2px solid #3a2008;
  flex-shrink: 0;
}

.switcher-tile {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  background: linear-gradient(170deg, #1c1408 0%, #130e04 100%);
  border: 1px solid rgba(92, 51, 16, 0.5);
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 80px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.12s ease,
    box-shadow 0.15s ease;
}
.switcher-tile:hover {
  border-color: rgba(200, 144, 64, 0.65);
  background: linear-gradient(170deg, #261c08 0%, #1a1206 100%);
  transform: translateY(-2px);
  box-shadow: 0 0 12px rgba(200, 144, 64, 0.15);
}
.switcher-tile:active {
  transform: scale(0.97);
}

.switcher-tile--active {
  border-color: #c89040 !important;
  background: linear-gradient(170deg, #2e1e06 0%, #201604 100%) !important;
  box-shadow:
    0 0 18px rgba(200, 144, 64, 0.3),
    inset 0 1px 0 rgba(255, 200, 80, 0.12) !important;
}
.switcher-tile--filled {
  border-color: rgba(160, 110, 30, 0.7);
}

.switcher-portrait-wrap {
  position: relative;
  width: 100%;
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0804;
}
.switcher-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.2s ease;
}
.switcher-tile:hover .switcher-portrait {
  transform: scale(1.08);
}

.switcher-empty-icon {
  font-size: 18px;
  color: rgba(200, 144, 64, 0.18);
  line-height: 1;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}
.switcher-tile:hover .switcher-empty-icon {
  color: rgba(200, 144, 64, 0.5);
  transform: scale(1.2);
}
.switcher-tile--active .switcher-empty-icon {
  color: rgba(200, 144, 64, 0.6);
}

.switcher-active-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 60%, rgba(200, 144, 64, 0.2), transparent 70%);
  pointer-events: none;
}

.switcher-role-label {
  display: block;
  width: 100%;
  text-align: center;
  padding: 3px 2px 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  line-height: 1;
  color: rgba(180, 130, 50, 0.5);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%);
  transition: color 0.15s ease;
  flex-shrink: 0;
}
.switcher-tile:hover .switcher-role-label {
  color: rgba(220, 170, 60, 0.95);
}
.switcher-tile--active .switcher-role-label {
  color: #e8c040;
}
.switcher-tile--filled .switcher-role-label {
  color: rgba(220, 170, 60, 0.9);
}

.switcher-active-bar {
  position: absolute;
  bottom: 0;
  left: 8%;
  right: 8%;
  height: 2px;
  background: linear-gradient(to right, transparent, #e8c040, transparent);
  border-radius: 2px 2px 0 0;
}

/* ── Suche ── */
.picker-search-row {
  padding: 10px 18px 9px;
  border-bottom: 1px solid #2a1a06;
  flex-shrink: 0;
}
.picker-search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #181208;
  border: 1px solid #3a2510;
  border-radius: 5px;
  padding: 8px 14px;
  transition: border-color 0.15s ease;
}
.picker-search-wrap:focus-within {
  border-color: #c89040;
  box-shadow: 0 0 0 2px rgba(200, 144, 64, 0.1);
}
.picker-search-icon {
  font-size: 13px;
  opacity: 0.5;
  flex-shrink: 0;
  line-height: 1;
}
.picker-search {
  flex: 1;
  background: transparent;
  border: none;
  color: #e8c040;
  font-size: 13px;
  outline: none;
  min-width: 0;
}
.picker-search::placeholder {
  color: rgba(200, 144, 64, 0.3);
}

/* ── Ergebnis-Info ── */
.picker-result-info {
  display: flex;
  align-items: center;
  padding: 5px 18px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(200, 144, 64, 0.35);
  border-bottom: 1px solid rgba(42, 26, 6, 0.8);
  flex-shrink: 0;
}

/* ── Body ── */
.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 16px;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #0d0a04;
  min-height: 0;
}

.picker-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  min-height: 340px;
  color: rgba(200, 144, 64, 0.35);
  font-size: 14px;
  letter-spacing: 0.06em;
}
.picker-empty-icon {
  font-size: 40px;
  opacity: 0.4;
}

/* ── Champion-Grid ── */
.picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  min-height: 340px;
  align-content: start;
}

/* Karte: Bild füllt alles, Name als Overlay */
.picker-champ {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid rgba(92, 51, 16, 0.55);
  background: #0e0c08;
  padding: 0;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease;
}
.picker-champ:hover {
  border-color: rgba(200, 144, 64, 0.9);
  box-shadow: 0 0 16px rgba(200, 144, 64, 0.22);
  transform: translateY(-2px) scale(1.02);
}
.picker-champ--active {
  border-color: #6ec040;
  box-shadow:
    0 0 18px rgba(110, 192, 64, 0.35),
    inset 0 0 10px rgba(110, 192, 64, 0.06);
}
.picker-champ--taken {
  opacity: 0.5;
}

/* Bild füllt gesamte Karte */
.picker-champ-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.25s ease;
  display: block;
}
.picker-champ:hover .picker-champ-img {
  transform: scale(1.07);
}

/* Name-Overlay unten */
.picker-champ-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: 20px 5px 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
  font-size: 10px;
  font-weight: 800;
  color: rgba(220, 180, 80, 0.9);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.15s ease;
  pointer-events: none;
}
.picker-champ:hover .picker-champ-name {
  color: #f0d060;
}
.picker-champ--active .picker-champ-name {
  color: #8ed84a;
}

/* Eck-Ornamente */
.champ-corner {
  position: absolute;
  width: 7px;
  height: 7px;
  border-color: rgba(200, 144, 64, 0.3);
  border-style: solid;
  pointer-events: none;
  z-index: 3;
  transition: border-color 0.15s ease;
}
.picker-champ:hover .champ-corner {
  border-color: rgba(200, 144, 64, 0.7);
}
.picker-champ--active .champ-corner {
  border-color: rgba(110, 192, 64, 0.6);
}
.champ-corner--tl {
  top: 3px;
  left: 3px;
  border-width: 1px 0 0 1px;
}
.champ-corner--br {
  bottom: 3px;
  right: 3px;
  border-width: 0 1px 1px 0;
}

/* Aktiv-Overlay */
.picker-active-overlay {
  position: absolute;
  inset: 0;
  background: rgba(14, 40, 8, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
}
.picker-check {
  font-size: 32px;
  color: #6ec040;
  filter: drop-shadow(0 0 8px rgba(110, 192, 64, 0.9));
  line-height: 1;
}

/* Belegt-Badge oben-rechts */
.picker-taken-overlay {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 4;
  padding: 2px 6px;
  background: rgba(14, 10, 4, 0.88);
  border: 1px solid rgba(200, 144, 64, 0.4);
  border-radius: 3px;
}
.picker-taken-badge {
  font-size: 9px;
  font-weight: 900;
  color: rgba(200, 144, 64, 0.8);
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Transition ── */
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
  transform: scale(0.93) translateY(10px);
}
.picker-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(5px);
}
</style>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/core/gameStore'
import { AUGMENT_RARITY_COLOR, AUTO_PICK_ICON } from '@/config/constants'
import { AUGMENTS } from '@/config/economy/augments'
import { augmentIcon } from '@/utils/game/rolledIcons'
import StatsColumnHeader from './StatsColumnHeader.vue'
import StatsSubRule from './StatsSubRule.vue'
import type { AugmentDefinition } from '@/types'

/** Augments: das aktive Regal und der Not-Aus für den Auto-Pick. */
const gameStore = useGameStore()

interface AugCard {
  aug: AugmentDefinition
  icon: string
  key: string
  color: string
}

const augCards = computed<AugCard[]>(() =>
  gameStore.activeAugments.flatMap((id, idx) => {
    const aug = AUGMENTS.find((a) => a.id === id)
    if (!aug) return []
    // der Platz in der Liste ist der Seed des Glyphs
    return [{ aug, icon: augmentIcon(id, idx), key: `${id}-${idx}`, color: AUGMENT_RARITY_COLOR[aug.rarity] }]
  }),
)

const search = ref('')

const filteredAugCards = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return augCards.value
  return augCards.value.filter(
    (c) =>
      c.aug.name.toLowerCase().includes(q) ||
      c.aug.effectLine.toLowerCase().includes(q) ||
      c.aug.rarity.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="jt-page">
    <StatsColumnHeader v-model="search" title="Augments" placeholder="Search augments…" />

    <div class="jt-body rpg-scrollbar">
      <div class="jt-augments">
        <!-- Not-Aus: solange Auto-Pick läuft, ist das der einzige Weg zurück -->
        <button
          v-if="gameStore.autoPickAugments"
          class="jt-auto-row"
          type="button"
          v-tip="'Augments are being picked at random on every level-up — click to choose yourself again'"
          @click="gameStore.setAutoPickAugments(false)"
        >
          <Icon :icon="AUTO_PICK_ICON" width="20" height="20" class="jt-auto-icon" />
          <span class="jt-auto-lbl">Auto-Pick</span>
          <span class="jt-auto-state">On</span>
          <span class="jt-auto-stop">Stop</span>
        </button>

        <StatsSubRule label="Active Augments" :count="filteredAugCards.length" />

        <div v-if="filteredAugCards.length === 0" class="jt-empty">
          <Icon icon="game-icons:gems" width="30" height="30" class="jt-empty-icon" />
          <span>
            {{
              augCards.length === 0
                ? 'No augments active yet — level up to pick your first one'
                : 'No augments match your search'
            }}
          </span>
        </div>
        <div v-else class="jt-aug-grid">
          <div
            v-for="card in filteredAugCards"
            :key="card.key"
            class="jt-aug-card"
            :style="{ '--rarity': card.color }"
            v-tip="`${card.aug.name} — ${card.aug.effectLine}`"
          >
            <div class="jt-aug-icon">
              <Icon :icon="card.icon" width="30" height="30" />
            </div>
            <div class="jt-aug-body">
              <span class="jt-aug-name">{{ card.aug.name }}</span>
              <span class="jt-aug-effect">{{ card.aug.effectLine }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jt-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
}
.jt-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;
}
.jt-augments {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 1100px;
  margin-inline: auto;
}

.jt-auto-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: #161a12;
  border: 1px solid #3a5a28;
  border-left: 3px solid #52b830;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.16s ease;
}
.jt-auto-row:hover {
  border-color: #6ec040;
}
.jt-auto-icon {
  flex-shrink: 0;
  color: #52b830;
}
.jt-auto-lbl {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fd070;
}
.jt-auto-state {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #52b830;
}
.jt-auto-stop {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cc6050;
  background: #2a0e0c;
  border: 1px solid #8a3020;
  border-radius: 3px;
}
.jt-auto-row:hover .jt-auto-stop {
  color: #ff9080;
  border-color: #cc4830;
}

.jt-aug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
}

.jt-aug-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 12px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--rarity);
  border-radius: 5px;
  cursor: help;
}
.jt-aug-card:hover {
  border-color: color-mix(in srgb, var(--rarity) 55%, #3e200a);
  border-left-color: var(--rarity);
}

.jt-aug-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--rarity) 55%, #14120c);
  background: radial-gradient(
    circle at 50% 38%,
    color-mix(in srgb, var(--rarity) 18%, #14120c),
    #100e08 74%
  );
  color: var(--rarity);
}

.jt-aug-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.jt-aug-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rarity);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jt-aug-effect {
  font-size: 16px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jt-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 10px;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--rpg-text-muted);
}
.jt-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}

@media (min-width: 2400px) {
  .jt-augments {
    max-width: 1400px;
  }
}
</style>

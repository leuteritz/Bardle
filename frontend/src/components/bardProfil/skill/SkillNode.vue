<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useGameStore } from '@/stores/gameStore'

const props = defineProps<{
  data: {
    skill: { key: string; icon: string; effect: string; description: string }
    index: number
    cost: number
  }
}>()

const gameStore = useGameStore()
const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

const state = computed((): 'bought' | 'buyable' | 'locked' => {
  const idx = props.data.index
  if (gameStore.abilityLevels[idx] > 0) return 'bought'
  if (
    (idx === 0 || gameStore.abilityLevels[idx - 1] > 0) &&
    gameStore.meeps >= SKILL_MEEP_COSTS[idx]
  )
    return 'buyable'
  return 'locked'
})

function handleBuy() {
  if (state.value === 'buyable') gameStore.unlockSkillWithMeeps(props.data.index)
}
</script>

<template>
  <div :class="['sn-root', `sn-root--${state}`]" style="pointer-events: none">
    <Handle type="target" :position="Position.Left" class="!opacity-0 !w-1 !h-1" />
    <Handle type="source" :position="Position.Right" class="!opacity-0 !w-1 !h-1" />

    <!-- Key Badge -->
    <div :class="['sn-badge', `sn-badge--${state}`]">
      {{ data.skill.key }}
    </div>

    <!-- Main Button -->
    <button
      :class="['sn-btn', `sn-btn--${state}`]"
      style="pointer-events: all"
      :disabled="state !== 'buyable'"
      @click.stop="handleBuy"
    >
      <div v-if="state === 'bought'" class="sn-shimmer" />
      <img :src="data.skill.icon" :alt="data.skill.key" class="sn-icon" />
    </button>

    <!-- Effect Label -->
    <div class="sn-labels">
      <span :class="['sn-effect', `sn-effect--${state}`]">
        {{ data.skill.effect }}
      </span>
    </div>

    <!-- Cost / Unlocked pill -->
    <div class="sn-pill-row">
      <div v-if="state !== 'bought'" :class="['sn-pill', `sn-pill--${state}`]">
        <img src="/img/BardAbilities/BardMeep.png" alt="Meeps" class="sn-pill__meeps-icon" />
        <span class="sn-pill__cost">{{ data.cost }}</span>
      </div>
      <div v-else class="sn-pill sn-pill--bought">✓ Aktiv</div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ──────────────────────────────────────────────── */
.sn-root {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 116px;
  transition: opacity 0.2s;
}
.sn-root--locked {
  opacity: 0.4;
  filter: grayscale(55%);
}

/* ── Key Badge ─────────────────────────────────────────── */
.sn-badge {
  position: absolute;
  top: -10px;
  left: -10px;
  z-index: 10;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  border-radius: 50%;
  border: 1px solid;
  line-height: 1;
}
.sn-badge--bought {
  background: #332008;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}
.sn-badge--buyable {
  background: #142808;
  border-color: var(--rpg-green-border);
  color: var(--rpg-green-top);
}
.sn-badge--locked {
  background: var(--rpg-bg-icon);
  border-color: var(--rpg-border-row);
  color: var(--rpg-text-dim);
}

/* ── Button ────────────────────────────────────────────── */
.sn-btn {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 20px;
  border: 1.5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.15s;
  outline: none;
}

/* Gekauft → Gold wie Shop-Gold-Akzent */
.sn-btn--bought {
  border-color: var(--rpg-gold-dim);
  background: linear-gradient(135deg, #2a1808, #1a1008);
  box-shadow:
    0 0 18px rgba(232, 192, 64, 0.25),
    inset 0 1px 0 rgba(232, 192, 64, 0.1);
  cursor: default;
  animation: rpg-legendary-pulse 2s ease-in-out infinite;
}

/* Kaufbar → Grün wie Shop-Affordable */
.sn-btn--buyable {
  border-color: var(--rpg-green-border);
  background: linear-gradient(135deg, #1c3a10, #0e2008);
  box-shadow: 0 0 0 transparent;
  cursor: pointer;
  animation: perm-pulse 2s ease-in-out infinite;
}
.sn-btn--buyable:hover {
  background: linear-gradient(135deg, #264e16, #1a3410);
  box-shadow: 0 0 16px rgba(80, 180, 40, 0.5);
  transform: translateY(-2px);
}
.sn-btn--buyable:active {
  transform: scale(0.96);
  background: linear-gradient(135deg, #0e2008, #081408);
}

/* Gesperrt */
.sn-btn--locked {
  border-color: var(--rpg-border-row);
  background: var(--rpg-bg-icon);
  cursor: not-allowed;
}

/* ── Shimmer (bought) ──────────────────────────────────── */
.sn-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(232, 192, 64, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

/* ── Icon ──────────────────────────────────────────────── */
.sn-icon {
  position: relative;
  z-index: 1;
  width: 58px;
  height: 58px;
  object-fit: contain;
  image-rendering: crisp-edges;
}

/* ── Labels ────────────────────────────────────────────── */
.sn-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.sn-effect {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.sn-effect--bought {
  color: var(--rpg-gold);
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.4);
}
.sn-effect--buyable {
  color: var(--rpg-green-top);
  text-shadow: 0 0 6px rgba(80, 180, 40, 0.4);
}
.sn-effect--locked {
  color: var(--rpg-text-dim);
}

/* ── Cost / Status pill ────────────────────────────────── */
.sn-pill-row {
  display: flex;
  justify-content: center;
  margin-top: 5px;
}

.sn-pill {
  font-size: 15px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
  line-height: 1.5;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sn-pill--buyable {
  background: #142808;
  border-color: var(--rpg-green-bottom);
  color: var(--rpg-green-top);
}
.sn-pill--locked {
  background: var(--rpg-bg-icon);
  border-color: var(--rpg-border-row);
  color: var(--rpg-text-dim);
}
.sn-pill--bought {
  background: #1c1008;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}
.sn-pill__cost {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}
.sn-pill__meeps-icon {
  height: 1.6em;
  width: auto;
}
</style>

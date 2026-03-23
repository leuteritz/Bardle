<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useGameStore } from '../stores/gameStore'

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
      <!-- Bought shimmer overlay -->
      <div v-if="state === 'bought'" class="sn-shimmer" />
      <img :src="data.skill.icon" :alt="data.skill.key" class="sn-icon" />
    </button>

    <!-- Labels: nur Effect, keine Description -->
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
  width: 116px; /* ↑ vorher 88px */
  transition: opacity 0.2s;
}
.sn-root--locked {
  opacity: 0.4;
}

/* ── Key Badge ─────────────────────────────────────────── */
.sn-badge {
  position: absolute;
  top: -10px;
  left: -10px;
  z-index: 10;
  width: 24px; /* ↑ vorher 20px */
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px; /* ↑ vorher 10px */
  font-weight: 800;
  border-radius: 50%;
  border: 1px solid;
  line-height: 1;
}
.sn-badge--bought {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(253, 212, 77, 0.6);
  color: #fcd34d;
}
.sn-badge--buyable {
  background: rgba(139, 92, 246, 0.25);
  border-color: rgba(167, 139, 250, 0.6);
  color: #ddd6fe;
}
.sn-badge--locked {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.35);
}

/* ── Button ────────────────────────────────────────────── */
.sn-btn {
  position: relative;
  width: 96px; /* ↑ vorher 72px */
  height: 96px; /* ↑ vorher 72px */
  border-radius: 20px; /* ↑ vorher 16px */
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

.sn-btn--bought {
  border-color: rgba(251, 191, 36, 0.55);
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.35), rgba(78, 35, 10, 0.25));
  box-shadow:
    0 0 18px rgba(234, 179, 8, 0.22),
    inset 0 1px 0 rgba(253, 212, 77, 0.08);
  cursor: default;
}

.sn-btn--buyable {
  border-color: rgba(139, 92, 246, 0.5);
  background: linear-gradient(135deg, rgba(76, 29, 149, 0.3), rgba(46, 16, 101, 0.2));
  box-shadow: 0 0 0 rgba(139, 92, 246, 0);
  cursor: pointer;
}
.sn-btn--buyable:hover {
  border-color: rgba(167, 139, 250, 0.75);
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.35);
  transform: translateY(-1px);
}
.sn-btn--buyable:active {
  transform: translateY(0);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.2);
}

.sn-btn--locked {
  border-color: rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.03);
  cursor: not-allowed;
}

/* ── Shimmer (bought) ──────────────────────────────────── */
.sn-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(253, 212, 77, 0.06) 0%, transparent 60%);
  pointer-events: none;
}

/* ── Icon ──────────────────────────────────────────────── */
.sn-icon {
  position: relative;
  z-index: 1;
  width: 58px; /* ↑ vorher 42px */
  height: 58px;
  object-fit: contain;
}

/* ── Labels ────────────────────────────────────────────── */
.sn-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.sn-effect {
  font-size: 18px; /* ↑ vorher 11px */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
}
.sn-effect--bought {
  color: #fcd34d;
}
.sn-effect--buyable {
  color: #c4b5fd;
}
.sn-effect--locked {
  color: rgba(255, 255, 255, 0.25);
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
  background: rgba(76, 29, 149, 0.3);
  border-color: rgba(139, 92, 246, 0.35);
  color: #ddd6fe;
}
.sn-pill--locked {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.25);
}
.sn-pill--bought {
  background: rgba(120, 53, 15, 0.25);
  border-color: rgba(251, 191, 36, 0.35);
  color: #fcd34d;
}
.sn-pill__cost {
  font-size: 20px; /* ← nach Geschmack anpassen */
  font-weight: 700;
  line-height: 1;
}
.sn-pill__meeps-icon {
  height: 1.6em; /* mitwachsen lassen, damit Bild zur Zahl passt */
  width: auto;
}
</style>

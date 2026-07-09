<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { getChampionTier } from '@/config/championTiers'
import {
  ROLES,
  SIGIL_NODE_SIZE,
  SIGIL_ALLY_SIZE,
  ALLIES_PER_ROLE,
  SIGIL_ALLY_HOVER_SCALE,
  SIGIL_ALLY_HOVER_DIM_OPACITY,
  SIGIL_ALLY_HOVER_PING_MS,
} from '@/config/constants'
import type { SigilPoint } from '@/composables/useTeamSigil'

const props = defineProps<{
  roleIndex: number
  point: SigilPoint
  allyPoints: SigilPoint[]
  selected: boolean
  full: boolean
  /** Champions spotlighted by the synergies search — hits pulse gold, the rest dims. */
  searchHighlights?: string[]
  /** Sub-slot hovered in the details panel — that satellite gets a spotlight, siblings dim. */
  hoveredAlly?: number | null
}>()

const emit = defineEmits<{
  select: []
  'select-ally': [subSlot: number]
}>()

const battleStore = useBattleStore()
const { headerSlots, secondarySlots } = storeToRefs(battleStore)

const roleDef = computed(() => ROLES[props.roleIndex])
const main = computed(() => headerSlots.value[props.roleIndex])
const mainImage = computed(() =>
  main.value ? battleStore.getChampionImage(main.value) : '',
)
const tier = computed(() => (main.value ? getChampionTier(main.value) : null))
const allies = computed(
  () => secondarySlots.value[props.roleIndex] ?? Array<string | null>(ALLIES_PER_ROLE).fill(null),
)

function allyImage(ally: string | null): string {
  return ally ? battleStore.getChampionImage(ally) : ''
}

// ── Search spotlight ─────────────────────────────────────────────────────────
const searchActive = computed(() => (props.searchHighlights?.length ?? 0) > 0)
const searchSet = computed(() => new Set(props.searchHighlights ?? []))
const mainHit = computed(() => main.value !== null && searchSet.value.has(main.value))

function allyHit(ally: string | null): boolean {
  return ally !== null && searchSet.value.has(ally)
}

// ── Ally-hover spotlight (details panel row → board satellite) ──────────────
const hoverActive = computed(() => props.hoveredAlly !== null && props.hoveredAlly !== undefined)
const hoverScale = String(SIGIL_ALLY_HOVER_SCALE)
const hoverDimOpacity = String(SIGIL_ALLY_HOVER_DIM_OPACITY)
const hoverPingMs = `${SIGIL_ALLY_HOVER_PING_MS}ms`

function nodeStyle(point: SigilPoint, size: number): Record<string, string> {
  return {
    left: `${point.x}px`,
    top: `${point.y}px`,
    width: `${size}px`,
    height: `${size}px`,
  }
}
</script>

<template>
  <!-- ally satellites (behind the role node) -->
  <button
    v-for="(ally, sub) in allies"
    :key="`ally-${roleIndex}-${sub}`"
    class="sigil-ally"
    :class="{
      'sigil-ally--filled': !!ally,
      'sigil-ally--highlight': selected,
      'sigil-ally--search-hit': allyHit(ally),
      'sigil-ally--search-miss': searchActive && !allyHit(ally),
      'sigil-ally--spotlight': hoveredAlly === sub,
      'sigil-ally--dimmed': hoverActive && hoveredAlly !== sub,
    }"
    :style="[
      nodeStyle(allyPoints[sub], SIGIL_ALLY_SIZE),
      { '--role-color': roleDef.color, '--sub': String(sub) },
    ]"
    :title="ally ?? `${roleDef.label} — Ally ${sub + 1}`"
    :aria-label="ally ? `${ally} (Ally ${sub + 1})` : `Assign Ally ${sub + 1} for ${roleDef.label}`"
    @click.stop="emit('select-ally', sub)"
  >
    <img v-if="ally" :src="allyImage(ally)" :alt="ally" class="sigil-ally-img" />
    <span v-else class="sigil-ally-plus">＋</span>
  </button>

  <!-- role node -->
  <button
    class="sigil-node"
    :class="{
      'sigil-node--selected': selected,
      'sigil-node--full': full,
      'sigil-node--search-hit': mainHit,
      'sigil-node--search-miss': searchActive && !mainHit,
    }"
    :style="[nodeStyle(point, SIGIL_NODE_SIZE), { '--role-color': roleDef.color }]"
    :aria-label="main ? `${main} (${roleDef.label})` : `Assign a champion for ${roleDef.label}`"
    @click.stop="emit('select')"
  >
    <span v-if="full" class="sigil-node-aura" aria-hidden="true" />
    <span v-if="full" class="sigil-node-conic" aria-hidden="true" />
    <span class="sigil-node-circle">
      <img v-if="main" :src="mainImage" :alt="main" class="sigil-node-img" />
      <span v-else class="sigil-node-empty">
        <img :src="roleDef.image" :alt="roleDef.label" class="sigil-node-role-ghost" />
      </span>
      <span v-if="main && tier" class="sigil-node-star" :style="{ color: tier.color }">
        ★{{ tier.starLevel }}
      </span>
    </span>
    <span class="sigil-node-name">{{ main ?? roleDef.label }}</span>
  </button>
</template>

<style scoped>
/* ── ally satellites ── */
.sigil-ally {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  background: rgba(10, 7, 4, 0.75);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--role-color) 40%, transparent);
  z-index: 1;
  transition:
    transform 0.15s,
    box-shadow 0.2s,
    opacity 0.25s,
    filter 0.25s;
  /* constellation feel: each satellite reacts with a slight cascade */
  transition-delay: calc(var(--sub, 0) * 25ms);
}
.sigil-ally--filled {
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 12px color-mix(in srgb, var(--role-color) 50%, transparent);
}
/* selected role: its ally constellation lights up with it (cascade via --sub delay) */
.sigil-ally--highlight {
  transform: translate(-50%, -50%) scale(1.12);
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 16px color-mix(in srgb, var(--role-color) 65%, transparent);
  z-index: 2;
}
.sigil-ally--highlight .sigil-ally-plus {
  opacity: 1;
}
.sigil-ally:hover {
  transform: translate(-50%, -50%) scale(1.15);
}
.sigil-ally-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
.sigil-ally-plus {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  color: var(--role-color);
  opacity: 0.85;
}

/* ── role node ── */
.sigil-node {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 2;
  transition:
    transform 0.18s,
    opacity 0.25s,
    filter 0.25s;
}
.sigil-node--selected {
  transform: translate(-50%, -50%) scale(1.12);
  z-index: 3;
}
.sigil-node:hover {
  transform: translate(-50%, -50%) scale(1.08);
}
.sigil-node--selected:hover {
  transform: translate(-50%, -50%) scale(1.12);
}

/* full-role escalation: pulsing ring + spinning conic glow */
.sigil-node-aura {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120%;
  height: 120%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid var(--role-color);
  pointer-events: none;
  animation: sigil-aura 2.3s ease-in-out infinite;
}
.sigil-node--selected .sigil-node-aura {
  animation-duration: 1.5s;
}
.sigil-node-conic {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 132%;
  height: 132%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent,
    color-mix(in srgb, var(--role-color) 80%, transparent),
    transparent 62%
  );
  filter: blur(1px);
  opacity: 0.7;
  pointer-events: none;
  animation: sigil-conic 9s linear infinite;
}
.sigil-node--selected .sigil-node-conic {
  animation-duration: 6s;
}

.sigil-node-circle {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: #0a0704;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--role-color) 60%, transparent),
    0 0 12px color-mix(in srgb, var(--role-color) 30%, transparent),
    0 4px 10px rgba(0, 0, 0, 0.55);
  transition: box-shadow 0.2s;
}
.sigil-node--selected .sigil-node-circle {
  box-shadow:
    0 0 0 4px var(--role-color),
    0 0 28px color-mix(in srgb, var(--role-color) 80%, transparent),
    0 4px 12px rgba(0, 0, 0, 0.6);
}
.sigil-node-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
.sigil-node-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sigil-node-role-ghost {
  width: 64%;
  height: 64%;
  object-fit: contain;
  opacity: 0.55;
}
.sigil-node-star {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2px 0;
  text-align: center;
  background: rgba(0, 0, 0, 0.72);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.1;
}
.sigil-node-name {
  position: absolute;
  left: 50%;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(10, 7, 4, 0.88);
  border: 1px solid var(--role-color);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--role-color);
  white-space: nowrap;
}
.sigil-node--selected .sigil-node-name {
  background: var(--role-color);
  color: #0a0806;
}

/* ── search spotlight: hits pulse gold, the rest recedes ── */
.sigil-node--search-miss,
.sigil-ally--search-miss {
  opacity: 0.35;
  filter: grayscale(45%);
}
.sigil-node--search-hit {
  z-index: 3;
}
.sigil-node--search-hit .sigil-node-circle {
  animation: sigil-search-pulse 1.6s ease-in-out infinite;
}
.sigil-ally--search-hit {
  z-index: 2;
  animation: sigil-search-pulse 1.6s ease-in-out infinite;
}
@keyframes sigil-search-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 3px #e8c040,
      0 0 14px rgba(232, 192, 64, 0.55);
  }
  50% {
    box-shadow:
      0 0 0 4px #e8c060,
      0 0 26px rgba(232, 192, 64, 0.85);
  }
}

/* ── ally-hover spotlight: hovering a panel row lights its board satellite ── */
.sigil-ally--spotlight {
  transform: translate(-50%, -50%) scale(v-bind(hoverScale));
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent);
  z-index: 4;
  transition-duration: 0.12s;
  transition-delay: 0ms;
  animation: sigil-ally-ping v-bind(hoverPingMs) ease-out 1;
}
.sigil-ally--spotlight .sigil-ally-plus {
  opacity: 1;
}
.sigil-ally--dimmed {
  opacity: v-bind(hoverDimOpacity);
  filter: saturate(0.6);
  transition-duration: 0.12s;
  transition-delay: 0ms;
}
@keyframes sigil-ally-ping {
  0% {
    box-shadow:
      0 0 0 2px var(--role-color),
      0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent),
      0 0 0 0 color-mix(in srgb, var(--role-color) 60%, transparent);
  }
  100% {
    box-shadow:
      0 0 0 2px var(--role-color),
      0 0 18px color-mix(in srgb, var(--role-color) 85%, transparent),
      0 0 0 16px transparent;
  }
}

@keyframes sigil-aura {
  0%,
  100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.85;
    transform: translate(-50%, -50%) scale(1.09);
  }
}
@keyframes sigil-conic {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
.sigil-node-conic {
  transform: translate(-50%, -50%);
}
@media (prefers-reduced-motion: reduce) {
  .sigil-node-aura,
  .sigil-node-conic {
    animation: none !important;
  }
  .sigil-node--search-hit .sigil-node-circle,
  .sigil-ally--search-hit {
    animation: none !important;
    box-shadow:
      0 0 0 3px #e8c040,
      0 0 14px rgba(232, 192, 64, 0.55);
  }
  .sigil-ally--spotlight {
    animation: none !important;
  }
}
</style>

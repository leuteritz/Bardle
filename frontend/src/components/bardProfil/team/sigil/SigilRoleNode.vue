<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBattleStore } from '@/stores/battleStore'
import { getChampionTier } from '@/config/championTiers'
import { ROLES, SIGIL_NODE_SIZE, SIGIL_ALLY_SIZE } from '@/config/constants'
import type { SigilPoint } from '@/composables/useTeamSigil'

const props = defineProps<{
  roleIndex: number
  point: SigilPoint
  allyPoints: SigilPoint[]
  selected: boolean
  full: boolean
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
const allies = computed(() => secondarySlots.value[props.roleIndex] ?? [null, null])

function allyImage(ally: string | null): string {
  return ally ? battleStore.getChampionImage(ally) : ''
}

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
    :class="{ 'sigil-ally--filled': !!ally }"
    :style="[nodeStyle(allyPoints[sub], SIGIL_ALLY_SIZE), { '--role-color': roleDef.color }]"
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
    :class="{ 'sigil-node--selected': selected, 'sigil-node--full': full }"
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
      <span v-if="main" class="sigil-node-role-chip">
        <img :src="roleDef.image" :alt="''" class="sigil-node-role-chip-img" />
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
    box-shadow 0.2s;
}
.sigil-ally--filled {
  background: #0a0704;
  box-shadow:
    0 0 0 2px var(--role-color),
    0 0 12px color-mix(in srgb, var(--role-color) 50%, transparent);
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
  transition: transform 0.18s;
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
.sigil-node-role-chip {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
}
.sigil-node-role-chip-img {
  width: 15px;
  height: 15px;
  object-fit: contain;
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
}
</style>

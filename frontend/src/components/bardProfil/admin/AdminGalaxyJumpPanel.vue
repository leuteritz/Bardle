<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { CHAMPION_TIERS_BY_STAR, requiredGalaxyForTier } from '@/config/championTiers'
import { GALAXY_JUMP_WARP_MS } from '@/config/constants'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

const galaxyStore = useGalaxyStore()

const input = ref<number | null>(null)
const warping = ref(false)
const shake = ref(false)
const statusMsg = ref('')

let warpTimer: ReturnType<typeof setTimeout> | undefined
let shakeTimer: ReturnType<typeof setTimeout> | undefined

// Each champion tier → the galaxy that unlocks it (for one-click tier testing).
const tierPresets = computed(() =>
  CHAMPION_TIERS_BY_STAR.map((t) => ({
    starLevel: t.starLevel,
    name: t.name,
    icon: t.icon,
    color: t.color,
    galaxy: requiredGalaxyForTier(t.starLevel),
  })),
)

function triggerShake() {
  statusMsg.value = ''
  shake.value = false
  // Re-arm the CSS animation even on repeated invalid input.
  nextTick(() => {
    shake.value = true
    if (shakeTimer) clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shake.value = false
    }, 450)
  })
}

function jump(target: number | null) {
  const n = Math.floor(Number(target))
  if (!Number.isFinite(n) || n < 1) {
    triggerShake()
    return
  }
  galaxyStore.adminJumpToGalaxy(n)
  statusMsg.value = `Warped to Galaxy ${galaxyStore.currentGalaxy}`
  warping.value = true
  if (warpTimer) clearTimeout(warpTimer)
  warpTimer = setTimeout(() => {
    warping.value = false
  }, GALAXY_JUMP_WARP_MS)
}

function jumpFromInput() {
  jump(input.value)
}

onBeforeUnmount(() => {
  if (warpTimer) clearTimeout(warpTimer)
  if (shakeTimer) clearTimeout(shakeTimer)
})
</script>

<template>
  <AdminCollapsiblePanel title="Galaxy Jump" icon="game-icons:teleport">
    <template #meta>Current: Galaxy {{ galaxyStore.currentGalaxy }}</template>

    <div class="gj-body">
      <!-- Number input + Warp button -->
      <div class="flex items-stretch gap-2 mb-2" :class="{ 'gj-shake': shake }">
        <input
          v-model.number="input"
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="Galaxy #"
          class="gj-input"
          aria-label="Target galaxy number"
          @keydown.enter="jumpFromInput"
        />
        <button class="gj-warp-btn flex items-center gap-1.5" @click="jumpFromInput">
          <Icon icon="game-icons:teleport" width="20" height="20" class="gj-warp-icon" />
          Warp
        </button>
      </div>

      <!-- Tier presets: jump to the galaxy that unlocks each champion tier -->
      <div class="gj-tier-grid">
        <button
          v-for="t in tierPresets"
          :key="t.starLevel"
          class="gj-tier"
          :class="{ 'gj-tier--unlocked': galaxyStore.currentGalaxy >= t.galaxy }"
          :style="{ '--tier-c': t.color }"
          :title="`${t.name} — unlocks in Galaxy ${t.galaxy}`"
          @click="jump(t.galaxy)"
        >
          <Icon :icon="t.icon" width="22" height="22" class="gj-tier-icon" />
          <span class="gj-tier-star">★{{ t.starLevel }}</span>
          <span class="gj-tier-name">{{ t.name }}</span>
          <span class="gj-tier-galaxy">G{{ t.galaxy }}</span>
        </button>
      </div>

      <div v-if="statusMsg" class="gj-status">{{ statusMsg }}</div>

      <div v-if="warping" class="gj-warp-sweep" />
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
.gj-body {
  position: relative;
  overflow: hidden;
}

/* ── Input + Warp button ───────────────────────────────────────────────────── */

.gj-input {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  font-family: 'MedievalSharp', cursive;
  font-size: 1rem;
  color: var(--rpg-text);
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  outline: none;
}

.gj-input::placeholder {
  color: var(--rpg-text-dim);
}

.gj-input:focus {
  border-color: var(--rpg-gold-dim);
}

.gj-warp-btn {
  min-height: 44px;
  padding: 0 18px;
  font-family: 'MedievalSharp', cursive;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--rpg-gold);
  background: linear-gradient(to bottom, #2a1a0a, #1a1008);
  border: 1px solid var(--rpg-wood);
  border-radius: var(--bp-radius);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;
}

.gj-warp-btn:hover {
  background: linear-gradient(to bottom, #3a2410, #241606);
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold-bright);
  box-shadow: 0 0 10px rgba(200, 144, 64, 0.4);
}

.gj-warp-btn:active {
  transform: scale(0.97);
}

.gj-warp-icon {
  color: var(--rpg-gold-dim);
}

/* ── Tier presets ──────────────────────────────────────────────────────────── */

.gj-tier-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.gj-tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding: 8px 4px 6px;
  border-radius: var(--bp-radius);
  border: 2px solid #3e200a;
  background: #111008;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s,
    box-shadow 0.12s;
}

.gj-tier:hover {
  border-color: var(--tier-c);
  color: var(--tier-c);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tier-c) 40%, transparent);
}

/* Galaxies already reached → tier shown in full color (unlocked in the shop). */
.gj-tier--unlocked {
  background: color-mix(in srgb, var(--tier-c) 14%, #111008);
  border-color: var(--tier-c);
  color: var(--tier-c);
}

.gj-tier-icon {
  color: inherit;
}

.gj-tier-star {
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1;
  color: inherit;
}

.gj-tier-name {
  font-size: 0.55rem;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
  opacity: 0.85;
  color: inherit;
}

.gj-tier-galaxy {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-gold-dim);
}

/* ── Status + feedback ─────────────────────────────────────────────────────── */

.gj-status {
  margin-top: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--rpg-gold);
}

.gj-warp-sweep {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: var(--bp-radius);
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(200, 144, 64, 0.16) 40%,
    rgba(232, 192, 96, 0.5) 50%,
    rgba(200, 144, 64, 0.16) 60%,
    transparent 100%
  );
  background-size: 250% 100%;
  animation: gj-warp-sweep 0.42s ease-in forwards;
}

@keyframes gj-warp-sweep {
  0% {
    background-position: 140% 0;
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    background-position: -60% 0;
    opacity: 0;
  }
}

.gj-shake {
  animation: gj-shake 0.4s ease;
}

@keyframes gj-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(3px);
  }
}
</style>

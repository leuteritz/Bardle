<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { ROLES } from '@/config/constants'
import type { ChampionRole } from '@/types'

const galaxyStore = useGalaxyStore()

type RoleDef = { key: ChampionRole; label: string; short: string; image: string; color: string }

const FLAVOUR: Record<ChampionRole, string> = {
  top:     'Unyielding. A titan at the vanguard.',
  jungle:  'Shadows stir. The hunt begins.',
  mid:     'Power flows through every rune.',
  adc:     'From a distance, nothing survives.',
  support: 'Bonds forged in starlight never break.',
}

const displayedRoles = ref<RoleDef[]>([])
const selectedKey = ref<ChampionRole | null>(null)

watch(
  () => galaxyStore.pendingRoleSelection,
  (pending) => {
    if (pending) {
      selectedKey.value = null
      const shuffled = [...(ROLES as unknown as RoleDef[])].sort(() => Math.random() - 0.5)
      displayedRoles.value = shuffled.slice(0, 3)
    }
  },
  { immediate: true },
)

function choose(role: RoleDef) {
  if (selectedKey.value) return
  selectedKey.value = role.key
  setTimeout(() => {
    galaxyStore.confirmRoleSelection(role.key)
  }, 260)
}
</script>

<template>
  <Transition name="role-fade">
    <div
      v-if="galaxyStore.pendingRoleSelection"
      class="fixed inset-0 z-[210] flex items-center justify-center role-overlay"
    >
      <div class="relative w-full max-w-4xl mx-4 overflow-hidden role-frame">
        <!-- Gold accent bar -->
        <div class="role-accent-bar"></div>

        <!-- Header -->
        <div class="role-header">
          <p class="role-eyebrow">Next Champion</p>
          <h2 class="role-title">✦ CHOOSE YOUR PATH ✦</h2>
          <p class="role-subtitle">Select the role for your next champion</p>
        </div>

        <!-- Role panels -->
        <div class="flex flex-row gap-4 p-6">
          <button
            v-for="role in displayedRoles"
            :key="role.key"
            class="role-card flex-1"
            :class="[
              selectedKey === role.key ? 'role-card--selected' : '',
              selectedKey && selectedKey !== role.key ? 'role-card--faded' : '',
            ]"
            :style="{ '--role-color': role.color }"
            @click="choose(role)"
          >
            <!-- Full-card artwork -->
            <img :src="role.image" :alt="role.label" class="role-artwork" />

            <!-- Vignette + text overlay -->
            <div class="role-overlay-layer">
              <h3 class="role-name">{{ role.short }}</h3>
              <p class="role-flavour">{{ FLAVOUR[role.key] }}</p>
            </div>

            <!-- Role-colored bottom border accent -->
            <div class="role-bottom-bar"></div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.role-fade-enter-active,
.role-fade-leave-active {
  transition: opacity 0.3s ease;
}
.role-fade-enter-from,
.role-fade-leave-to {
  opacity: 0;
}

/* ── Overlay ─────────────────────────────────────────────────────────── */
.role-overlay {
  background: rgba(5, 4, 2, 0.92);
}

/* ── Frame ───────────────────────────────────────────────────────────── */
.role-frame {
  background: #111008;
  border: 4px solid #7a4e20;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 0 0 4px #5c3310;
  border-radius: 4px;
}

/* ── Gold accent bar ─────────────────────────────────────────────────── */
.role-accent-bar {
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
}

/* ── Header ──────────────────────────────────────────────────────────── */
.role-header {
  background: #1e1006;
  border-bottom: 3px solid #5c3310;
  padding: 20px 24px 16px;
  text-align: center;
}

.role-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c89040;
  margin-bottom: 4px;
}

.role-title {
  font-size: 22px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.45);
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.role-subtitle {
  font-size: 11px;
  color: #8a7a60;
}

/* ── Cards ───────────────────────────────────────────────────────────── */
.role-card {
  position: relative;
  height: 260px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid var(--role-color);
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    opacity 0.18s ease;
}

.role-card:hover {
  transform: scale(1.04) translateY(-3px);
  box-shadow:
    0 0 30px color-mix(in srgb, var(--role-color) 60%, transparent),
    0 10px 36px rgba(0, 0, 0, 0.65);
}

.role-card--selected {
  animation: role-pulse 0.26s ease forwards;
  box-shadow:
    0 0 44px color-mix(in srgb, var(--role-color) 80%, transparent),
    0 0 88px color-mix(in srgb, var(--role-color) 32%, transparent);
}

.role-card--faded {
  opacity: 0.3;
  pointer-events: none;
}

@keyframes role-pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.07); }
  100% { transform: scale(1.04); }
}

/* ── Artwork ─────────────────────────────────────────────────────────── */
.role-artwork {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  transition: transform 0.38s ease;
}

.role-card:hover .role-artwork {
  transform: scale(1.07);
}

/* ── Text overlay ────────────────────────────────────────────────────── */
.role-overlay-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 14px 16px 20px;
  background: linear-gradient(
    to bottom,
    transparent 28%,
    rgba(5, 4, 2, 0.55) 58%,
    rgba(5, 4, 2, 0.88) 100%
  );
  pointer-events: none;
}

.role-name {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--role-color);
  text-shadow:
    0 0 12px color-mix(in srgb, var(--role-color) 70%, transparent),
    0 2px 6px rgba(0, 0, 0, 0.8);
  line-height: 1;
  margin-bottom: 5px;
}

.role-flavour {
  font-size: 10px;
  color: rgba(200, 185, 158, 0.75);
  font-style: italic;
  line-height: 1.4;
}

/* ── Bottom color bar ────────────────────────────────────────────────── */
.role-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--role-color);
  opacity: 0.9;
  pointer-events: none;
}
</style>

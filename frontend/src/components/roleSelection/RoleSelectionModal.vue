<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { ROLES } from '@/config/constants'
import type { ChampionRole } from '@/types'

const galaxyStore = useGalaxyStore()

type RoleDef = { key: ChampionRole; label: string; short: string; image: string; color: string }

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
          <h2 class="role-title">✦ CHOOSE YOUR NEXT CHAMPION ROLE ✦</h2>
        </div>

        <!-- Role panels -->
        <div class="flex flex-col sm:flex-row gap-4 p-6">
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
              <h3 class="role-name">{{ role.label }}</h3>
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
:root {
  --role-top:     #c0392b;
  --role-jungle:  #27ae60;
  --role-mid:     #2980b9;
  --role-adc:     #d4a020;
  --role-support: #16a085;
}

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

.role-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(200, 150, 40, 0.05) 0%, transparent 70%);
  pointer-events: none;
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
  padding: 18px 24px 16px;
  text-align: center;
}

.role-title {
  font-size: 26px;
  font-weight: 900;
  color: #e8c040;
  text-shadow: 0 0 18px rgba(232, 192, 64, 0.55);
  letter-spacing: 0.06em;
}

/* ── Cards ───────────────────────────────────────────────────────────── */
.role-card {
  position: relative;
  height: 290px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.role-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 42px color-mix(in srgb, var(--role-color) 55%, transparent),
    0 20px 52px rgba(0, 0, 0, 0.7),
    0 6px 16px rgba(0, 0, 0, 0.5);
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
  transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
}

.role-card:hover .role-artwork {
  transform: scale(1.05);
}

/* ── Text overlay ────────────────────────────────────────────────────── */
.role-overlay-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 14px 16px 24px;
  background: linear-gradient(
    to bottom,
    transparent 28%,
    rgba(5, 4, 2, 0.55) 58%,
    rgba(5, 4, 2, 0.88) 100%
  );
  pointer-events: none;
}

.role-name {
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--role-color);
  text-shadow:
    0 0 20px color-mix(in srgb, var(--role-color) 70%, transparent),
    0 2px 8px rgba(0, 0, 0, 0.9);
  line-height: 1;
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

/* ── Mobile ──────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .role-card {
    height: 200px;
  }
}
</style>

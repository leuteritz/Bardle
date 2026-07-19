<template>
  <div v-if="strikers.length" class="rsq" aria-hidden="true">
    <div
      v-for="s in strikers"
      :key="s.role"
      class="rsq-item"
      :class="{ 'rsq-item--ready': s.ready }"
      :style="{ '--rc': s.color }"
    >
      <div class="rsq-portrait">
        <img
          :src="s.img"
          :alt="s.champion"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div v-if="!s.ready" class="rsq-veil" :style="{ '--el': s.readyDeg + 'deg' }" />
      </div>
      <svg class="rsq-ring" viewBox="0 0 100 100">
        <circle class="rsq-ring-track" cx="50" cy="50" r="44" />
        <circle class="rsq-ring-arc" cx="50" cy="50" r="44" :style="{ strokeDasharray: s.dash }" />
      </svg>
      <div class="rsq-badge"><img :src="s.roleImage" alt="" draggable="false" /></div>
      <span v-if="s.ready" class="rsq-ready">{{ s.readyText }}</span>
      <span v-else class="rsq-cd">{{ s.secs }}</span>
      <span class="rsq-label">{{ s.label }}</span>
      <TransitionGroup name="rsq-pop">
        <span
          v-for="f in floatsFor(s.role)"
          :key="f.id"
          class="rsq-float"
          :class="`rsq-float--${s.role}`"
        >
          -{{ f.value }}
        </span>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import {
  ROLE_BY_KEY,
  ROLE_TOP_SHIELD_REBUILD_MS,
  ROLE_MID_CURSE_INTERVAL_MS,
  ROLE_ADC_BURST_INTERVAL_MS,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_MID_CURSE_DOT_DPS,
  GAME_TICK_INTERVAL_MS,
  STRIKER_FLOAT_DURATION_MS,
  STRIKER_FLOAT_MAX,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()
const bossStore = usePlanetBossStore()

// r=44 im 100er-viewBox → Umfang 2πr (wie sf-star-ring im Modal)
const RING_CIRCUMFERENCE = 2 * Math.PI * 44

// headerSlots-Index je Rolle: top=0, jungle=1, mid=2, adc=3, support=4
interface StrikerDef {
  role: ChampionRole
  slot: number
  label: string
  readyText: string
  remainingMs: () => number
  totalMs: number
}

const STRIKER_DEFS: StrikerDef[] = [
  {
    role: 'top',
    slot: 0,
    label: 'Top · Shield',
    readyText: 'SHIELD',
    remainingMs: () =>
      roleBehaviorStore.tankShieldActive ? 0 : roleBehaviorStore.tankShieldBrokenMs,
    totalMs: ROLE_TOP_SHIELD_REBUILD_MS,
  },
  {
    role: 'mid',
    slot: 2,
    label: 'Mid · Curse',
    readyText: 'CURSE',
    remainingMs: () => roleBehaviorStore.midCurseCooldownMs,
    totalMs: ROLE_MID_CURSE_INTERVAL_MS,
  },
  {
    role: 'adc',
    slot: 3,
    label: `ADC · ${ROLE_ADC_BURST_DAMAGE} dmg`,
    readyText: 'BURST',
    remainingMs: () => roleBehaviorStore.adcBurstCooldownMs,
    totalMs: ROLE_ADC_BURST_INTERVAL_MS,
  },
]

const strikers = computed(() =>
  STRIKER_DEFS.flatMap((def) => {
    const champion = battleStore.headerSlots[def.slot]
    if (!champion) return []
    const remaining = Math.max(0, def.remainingMs())
    const readyFrac = Math.max(0, Math.min(1, 1 - remaining / def.totalMs))
    const ready = remaining <= 0
    return [
      {
        role: def.role,
        champion,
        img: battleStore.getChampionImage(champion),
        roleImage: ROLE_BY_KEY[def.role].image,
        color: ROLE_BY_KEY[def.role].color,
        label: def.label,
        readyText: def.readyText,
        ready,
        secs: Math.ceil(remaining / 1000),
        readyDeg: Math.round(readyFrac * 360),
        dash: `${(readyFrac * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`,
      },
    ]
  }),
)

// ── Floating damage: ADC-Burst + Corruption-DoT ──────────────────────────
interface StrikerFloat {
  id: number
  role: ChampionRole
  value: number
}

const floats = ref<StrikerFloat[]>([])
let floatId = 0
const floatTimeouts: number[] = []

function floatsFor(role: ChampionRole): StrikerFloat[] {
  return floats.value.filter((f) => f.role === role)
}

function pushFloat(role: ChampionRole, value: number) {
  if (floats.value.length >= STRIKER_FLOAT_MAX) floats.value.shift()
  const id = ++floatId
  floats.value.push({ id, role, value })
  floatTimeouts.push(
    window.setTimeout(() => {
      floats.value = floats.value.filter((f) => f.id !== id)
    }, STRIKER_FLOAT_DURATION_MS),
  )
}

const hasLiveBoss = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

watch(
  () => roleBehaviorStore.adcBurstActive,
  (active) => {
    if (active && hasLiveBoss.value) pushFloat('adc', ROLE_ADC_BURST_DAMAGE)
  },
)

// Corruption tickt einmal pro Game-Tick — der Interval spiegelt das visuell
let dotInterval: number | null = null

onMounted(() => {
  dotInterval = window.setInterval(() => {
    if (roleBehaviorStore.activeCurse?.type === 'corruption' && hasLiveBoss.value) {
      pushFloat('mid', ROLE_MID_CURSE_DOT_DPS)
    }
  }, GAME_TICK_INTERVAL_MS)
})

onUnmounted(() => {
  if (dotInterval !== null) window.clearInterval(dotInterval)
  floatTimeouts.forEach(window.clearTimeout)
  floatTimeouts.length = 0
})
</script>

<style scoped>
.rsq {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 44px;
  pointer-events: none;
}

.rsq-item {
  position: relative;
  width: 72px;
  height: 72px;
}

/* ── Portrait ────────────────────────────────────────────────────────────── */
.rsq-portrait {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--rc, #c8922a);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 14px color-mix(in srgb, var(--rc) 55%, transparent),
    0 4px 10px rgba(0, 0, 0, 0.7);
}

.rsq-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

/* Dunkler Kegel = verbleibender Cooldown (dreht sich mit Fortschritt weg) */
.rsq-veil {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from -90deg,
    transparent 0 var(--el, 0deg),
    rgba(3, 1, 0, 0.74) var(--el, 0deg) 360deg
  );
}

/* ── Cooldown-Ring ───────────────────────────────────────────────────────── */
.rsq-ring {
  position: absolute;
  inset: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 10px);
  transform: rotate(-90deg);
}

.rsq-ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.09);
  stroke-width: 4;
}

.rsq-ring-arc {
  fill: none;
  stroke: var(--rc, #c8922a);
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray 0.9s linear;
  filter: drop-shadow(0 0 4px var(--rc, #c8922a));
}

/* ── Rollen-Badge ────────────────────────────────────────────────────────── */
.rsq-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #0c0803;
  border: 1.5px solid var(--rc, #c8922a);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.7);
  z-index: 2;
}

.rsq-badge img {
  width: 17px;
  height: 17px;
  object-fit: contain;
}

/* ── Countdown / Ready ───────────────────────────────────────────────────── */
.rsq-cd {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  font-weight: 900;
  color: #fff;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 8px rgba(0, 0, 0, 0.9),
    0 1px 2px #000;
  z-index: 2;
}

.rsq-ready {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #fff;
  text-shadow:
    0 0 8px var(--rc, #c8922a),
    0 1px 2px #000;
  z-index: 2;
}

.rsq-item--ready .rsq-portrait {
  animation: rsq-ready-pulse 1.1s ease-in-out infinite alternate;
}

@keyframes rsq-ready-pulse {
  from {
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 10px color-mix(in srgb, var(--rc) 45%, transparent),
      0 4px 10px rgba(0, 0, 0, 0.7);
  }
  to {
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 22px color-mix(in srgb, var(--rc) 90%, transparent),
      0 0 34px color-mix(in srgb, var(--rc) 50%, transparent),
      0 4px 10px rgba(0, 0, 0, 0.7);
  }
}

/* ── Label-Chip unter dem Portrait ───────────────────────────────────────── */
.rsq-label {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(8, 5, 2, 0.9);
  border: 1px solid color-mix(in srgb, var(--rc) 45%, #3a2410);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--rc) 55%, #f0e6cc);
  white-space: nowrap;
  text-transform: uppercase;
}

.rsq-item--ready .rsq-label {
  color: color-mix(in srgb, var(--rc) 70%, #fff);
  background: color-mix(in srgb, var(--rc) 22%, rgba(8, 5, 2, 0.9));
}

/* ── Floating Damage über dem Striker ────────────────────────────────────── */
.rsq-float {
  position: absolute;
  left: 50%;
  top: -14px;
  transform: translateX(-50%);
  font-size: 1.2rem;
  font-weight: 900;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  z-index: 3;
}

.rsq-float--adc {
  color: #ffb454;
  text-shadow: 0 0 12px #ff7a00;
}

.rsq-float--mid {
  color: #d99bff;
  text-shadow: 0 0 12px #a030ff;
  font-size: 0.95rem;
}

.rsq-float--top {
  color: #ff9a90;
  text-shadow: 0 0 12px #e05050;
}

.rsq-pop-enter-active {
  animation: rsq-float-up 1.4s ease-out forwards;
  will-change: transform, opacity;
}

.rsq-pop-leave-active {
  display: none;
}

@keyframes rsq-float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(-4px) scale(1.15);
  }
  40% {
    transform: translateX(-50%) translateY(-18px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-52px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rsq-item--ready .rsq-portrait,
  .rsq-pop-enter-active {
    animation: none;
  }
}
</style>

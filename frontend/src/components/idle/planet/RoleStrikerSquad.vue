<template>
  <div v-if="strikers.length" class="rsq" aria-hidden="true">
    <div
      v-for="(s, i) in strikers"
      :key="s.role"
      class="rsq-item"
      :class="{ 'rsq-item--firing': firingRoles.has(s.role) }"
      :style="{ '--rc': s.color }"
    >
      <div class="rsq-portrait">
        <img
          :src="s.img"
          :alt="s.champion"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div v-if="s.secs > 0" class="rsq-veil" :style="{ '--el': s.readyDeg + 'deg' }" />
      </div>
      <svg class="rsq-ring" viewBox="0 0 100 100">
        <circle class="rsq-ring-track" cx="50" cy="50" r="44" />
        <circle class="rsq-ring-arc" cx="50" cy="50" r="44" :style="{ strokeDasharray: s.dash }" />
      </svg>
      <div class="rsq-badge"><img :src="s.roleImage" alt="" draggable="false" /></div>
      <div
        class="rsq-ability"
        :class="{ 'rsq-ability--lit': s.abilityLit }"
        :title="s.abilityName"
      >
        <Icon :icon="s.abilityIcon" width="13" height="13" />
      </div>
      <span class="rsq-cd">{{ s.secs }}</span>
      <span class="rsq-label">{{ s.label }}</span>

      <!-- Projektile + Impacts dieses Strikers (fliegen zum Boss hoch) -->
      <template v-for="shot in shotsFor(s.role)" :key="shot.id">
        <span
          v-if="shot.phase === 'fly'"
          class="rsq-proj"
          :style="{ '--px': projDx(i) + 'px', '--py': -STRIKER_PROJECTILE_RISE_PX + 'px' }"
        />
        <span
          v-else
          class="rsq-impact"
          :style="{
            transform: `translate(calc(-50% + ${projDx(i)}px), ${-STRIKER_PROJECTILE_RISE_PX}px)`,
          }"
        >
          <span class="rsq-impact-burst" />
          <span class="rsq-impact-num">-{{ shot.value }}</span>
        </span>
      </template>

      <!-- Ticks der normalen Fähigkeit (Corruption-DoT) über dem Striker -->
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
import { computed, ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import {
  ROLE_BY_KEY,
  ROLE_STAR_ATTACKS,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_MID_CURSE_DOT_DPS,
  ORBIT_ROLE_ABILITIES,
  GAME_TICK_INTERVAL_MS,
  STRIKER_FLOAT_DURATION_MS,
  STRIKER_FLOAT_MAX,
  STRIKER_ITEM_PX,
  STRIKER_GAP_PX,
  STRIKER_PROJECTILE_RISE_PX,
  STRIKER_PROJECTILE_FLIGHT_MS,
  STRIKER_IMPACT_MS,
  STRIKER_FIRE_FLASH_MS,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

const battleStore = useBattleStore()
const roleBehaviorStore = useRoleBehaviorStore()
const bossStore = usePlanetBossStore()

// r=44 im 100er-viewBox → Umfang 2πr (wie sf-star-ring im Modal)
const RING_CIRCUMFERENCE = 2 * Math.PI * 44

// headerSlots-Index je Rolle (SLOT_ROLES-Reihenfolge aus getOrbitingRoles)
const SLOT_BY_ROLE: Record<ChampionRole, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
}

const SQUAD_ROLES = Object.keys(ROLE_STAR_ATTACKS) as ChampionRole[]

// ── Normale Rollen-Fähigkeit: Badge leuchtet wenn bereit / aktiv ─────────
function abilityLit(role: ChampionRole): boolean {
  switch (role) {
    case 'top':
      return roleBehaviorStore.tankShieldActive
    case 'jungle':
      return roleBehaviorStore.jungleBuffCooldownMs <= 0
    case 'mid':
      return roleBehaviorStore.activeCurse !== null || roleBehaviorStore.midCurseCooldownMs <= 0
    case 'adc':
      return roleBehaviorStore.adcBurstActive || roleBehaviorStore.adcBurstCooldownMs <= 0
    case 'support':
      return roleBehaviorStore.supportPlanetHealActive
  }
}

const strikers = computed(() =>
  SQUAD_ROLES.flatMap((role) => {
    const champion = battleStore.headerSlots[SLOT_BY_ROLE[role]]
    if (!champion) return []
    const def = ROLE_STAR_ATTACKS[role]
    const remaining = Math.max(0, roleBehaviorStore.roleAttackCooldownMs[role])
    const readyFrac = Math.max(0, Math.min(1, 1 - remaining / def.intervalMs))
    return [
      {
        role,
        champion,
        img: battleStore.getChampionImage(champion),
        roleImage: ROLE_BY_KEY[role].image,
        color: ROLE_BY_KEY[role].color,
        label: `${ROLE_BY_KEY[role].short} · ${def.damage} dmg`,
        abilityIcon: ORBIT_ROLE_ABILITIES[role].icon,
        abilityName: ORBIT_ROLE_ABILITIES[role].name,
        abilityLit: abilityLit(role),
        secs: Math.ceil(remaining / 1000),
        readyDeg: Math.round(readyFrac * 360),
        dash: `${(readyFrac * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`,
      },
    ]
  }),
)

/** Horizontaler Versatz vom Striker i zur Squad-Mitte (= Boss-Achse) */
function projDx(i: number): number {
  const n = strikers.value.length
  return -Math.round((i - (n - 1) / 2) * (STRIKER_ITEM_PX + STRIKER_GAP_PX))
}

// ── Projektile: Striker → Boss, dann Impact-Burst + Schadenszahl ─────────
interface StrikerShot {
  id: number
  role: ChampionRole
  value: number
  phase: 'fly' | 'hit'
}

const shots = ref<StrikerShot[]>([])
const firingRoles = reactive(new Set<ChampionRole>())
let shotId = 0
const timeouts: number[] = []

function shotsFor(role: ChampionRole): StrikerShot[] {
  return shots.value.filter((s) => s.role === role)
}

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function fireProjectile(role: ChampionRole, value: number) {
  const id = ++shotId
  shots.value.push({ id, role, value, phase: 'fly' })
  firingRoles.add(role)
  later(STRIKER_FIRE_FLASH_MS, () => firingRoles.delete(role))
  later(STRIKER_PROJECTILE_FLIGHT_MS, () => {
    const shot = shots.value.find((s) => s.id === id)
    if (shot) shot.phase = 'hit'
  })
  later(STRIKER_PROJECTILE_FLIGHT_MS + STRIKER_IMPACT_MS, () => {
    shots.value = shots.value.filter((s) => s.id !== id)
  })
}

const hasLiveBoss = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

// Jeder Stern-Angriff (Shot-Counter aus dem Store) feuert ein Projektil
for (const role of SQUAD_ROLES) {
  watch(
    () => roleBehaviorStore.roleAttackShots[role],
    () => fireProjectile(role, ROLE_STAR_ATTACKS[role].damage),
  )
}

// ADC-Burst (normale Fähigkeit) fliegt als schwereres Projektil mit
watch(
  () => roleBehaviorStore.adcBurstActive,
  (active) => {
    if (active && hasLiveBoss.value) fireProjectile('adc', ROLE_ADC_BURST_DAMAGE)
  },
)

// ── Corruption-DoT: kleine Ticks über dem Mid-Striker ────────────────────
interface StrikerFloat {
  id: number
  role: ChampionRole
  value: number
}

const floats = ref<StrikerFloat[]>([])
let floatId = 0

function floatsFor(role: ChampionRole): StrikerFloat[] {
  return floats.value.filter((f) => f.role === role)
}

function pushFloat(role: ChampionRole, value: number) {
  if (floats.value.length >= STRIKER_FLOAT_MAX) floats.value.shift()
  const id = ++floatId
  floats.value.push({ id, role, value })
  later(STRIKER_FLOAT_DURATION_MS, () => {
    floats.value = floats.value.filter((f) => f.id !== id)
  })
}

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
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
.rsq {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* Muss STRIKER_GAP_PX entsprechen (Projektil-Geometrie) */
  gap: 34px;
  pointer-events: none;
}

.rsq-item {
  position: relative;
  /* Muss STRIKER_ITEM_PX entsprechen (Projektil-Geometrie) */
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

/* ── Rollen-Badge (oben links) ───────────────────────────────────────────── */
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

/* ── Fähigkeits-Badge (unten rechts): leuchtet wenn Ability bereit/aktiv ── */
.rsq-ability {
  position: absolute;
  bottom: -5px;
  right: -7px;
  width: 23px;
  height: 23px;
  border-radius: 50%;
  background: #0c0803;
  border: 1.5px solid #3a2410;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6a5a40;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.7);
  z-index: 2;
  transition:
    border-color 0.25s,
    color 0.25s,
    box-shadow 0.25s;
}

.rsq-ability--lit {
  border-color: var(--rc, #c8922a);
  color: var(--rc, #c8922a);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--rc) 60%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.7);
}

/* ── Countdown ───────────────────────────────────────────────────────────── */
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

/* Abschuss-Puls */
.rsq-item--firing .rsq-portrait {
  animation: rsq-fire-flash 0.5s ease-out;
}

@keyframes rsq-fire-flash {
  0% {
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 26px var(--rc, #c8922a),
      0 0 42px color-mix(in srgb, var(--rc) 55%, transparent),
      0 4px 10px rgba(0, 0, 0, 0.7);
    filter: brightness(1.6);
  }
  100% {
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 14px color-mix(in srgb, var(--rc) 55%, transparent),
      0 4px 10px rgba(0, 0, 0, 0.7);
    filter: brightness(1);
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

/* ── Projektil: Orb in Rollenfarbe fliegt vom Striker zum Boss ───────────── */
.rsq-proj {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--rc, #c8922a) 45%, transparent 75%);
  box-shadow:
    0 0 10px var(--rc, #c8922a),
    0 0 22px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-proj-fly 0.55s cubic-bezier(0.3, 0, 0.75, 0.5) forwards;
  will-change: transform, opacity;
  z-index: 3;
}

/* Schweif */
.rsq-proj::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 26px;
  transform: translate(-50%, -12%);
  border-radius: 2px;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in srgb, var(--rc) 70%, transparent)
  );
  filter: blur(1px);
}

@keyframes rsq-proj-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  12% {
    opacity: 1;
    transform: translate(calc(var(--px) * 0.06), calc(var(--py) * 0.06)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate(var(--px), var(--py)) scale(1.05);
  }
}

/* ── Impact am Boss: Burst-Ring + Schadenszahl ───────────────────────────── */
.rsq-impact {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  pointer-events: none;
}

.rsq-impact-burst {
  position: absolute;
  left: 50%;
  top: 0;
  width: 26px;
  height: 26px;
  margin-left: -13px;
  border-radius: 50%;
  border: 2px solid var(--rc, #c8922a);
  box-shadow:
    0 0 12px var(--rc, #c8922a),
    inset 0 0 8px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-impact-burst 0.45s ease-out forwards;
}

@keyframes rsq-impact-burst {
  0% {
    opacity: 1;
    transform: scale(0.35);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
}

.rsq-impact-num {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  font-size: 1.2rem;
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  text-shadow: 0 0 12px var(--rc, #c8922a);
  white-space: nowrap;
  animation: rsq-impact-num 0.9s ease-out forwards;
}

@keyframes rsq-impact-num {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(4px) scale(0.8);
  }
  18% {
    opacity: 1;
    transform: translateX(-50%) translateY(-6px) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-34px) scale(0.85);
  }
}

/* ── DoT-Ticks über dem Striker (Corruption) ─────────────────────────────── */
.rsq-float {
  position: absolute;
  left: 50%;
  top: -14px;
  transform: translateX(-50%);
  font-size: 0.95rem;
  font-weight: 900;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  z-index: 3;
}

.rsq-float--mid {
  color: #d99bff;
  text-shadow: 0 0 12px #a030ff;
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
  .rsq-item--firing .rsq-portrait,
  .rsq-proj,
  .rsq-impact-burst,
  .rsq-impact-num,
  .rsq-pop-enter-active {
    animation: none;
  }
}
</style>

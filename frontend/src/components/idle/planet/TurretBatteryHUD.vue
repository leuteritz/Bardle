<template>
  <div v-if="turrets.length > 0 && bossAlive" ref="rootEl" class="tbh" aria-hidden="true">
    <!-- Batterie-Spalte: ein Eintrag pro Turret-Planet -->
    <div
      v-for="(t, i) in visibleTurrets"
      :key="t.slotId"
      class="tbh-turret"
      :style="{ left: `${TURRET_BATTERY_X_PCT}%`, top: `${turretYPct(i)}%` }"
    >
      <div
        class="tbh-planet"
        :class="{ 'tbh-planet--firing': volleyFlash }"
        :style="lungeStyle(i)"
      >
        <img :src="turretImage" alt="" draggable="false" />
        <!-- Cooldown-Ring: füllt sich über den 1s-Salventakt, Restart pro Salve -->
        <svg
          :key="'ring-' + volleyCount"
          class="tbh-ring"
          viewBox="0 0 100 100"
        >
          <circle class="tbh-ring-track" cx="50" cy="50" r="46" pathLength="100" />
          <circle class="tbh-ring-arc" cx="50" cy="50" r="46" pathLength="100" />
        </svg>
      </div>
      <span class="tbh-dmg">{{ t.dmg }} dmg</span>
    </div>

    <!-- Overflow-Chip, wenn mehr Turrets als Plätze -->
    <div
      v-if="hiddenCount > 0"
      class="tbh-more"
      :style="{ left: `${TURRET_BATTERY_X_PCT}%`, top: `${turretYPct(visibleTurrets.length)}%` }"
    >
      +{{ hiddenCount }}
    </div>

    <!-- Label unter der Batterie -->
    <div
      class="tbh-caption"
      :style="{ left: `${TURRET_BATTERY_X_PCT}%`, top: `${captionYPct}%` }"
    >
      <span class="tbh-caption-title">Turret Battery</span>
      <span class="tbh-caption-dps">{{ totalDps }} dmg/s</span>
    </div>

    <!-- Kometen-Volleys Richtung Boss -->
    <span
      v-for="v in volleys"
      :key="v.id"
      class="tbh-comet"
      :style="{
        left: `${TURRET_BATTERY_X_PCT}%`,
        top: `${v.fromYPct}%`,
        '--px': v.px + 'px',
        '--py': v.py + 'px',
      }"
    />

    <!-- Schadenszahl am Boss beim Einschlag -->
    <TransitionGroup name="tbh-pop">
      <span v-for="f in floats" :key="f.id" class="tbh-float" :style="{ left: '50%', top: '33%' }">
        -{{ f.value }}
      </span>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  planetLevelBonusMultiplier,
} from '@/stores/planetShopStore'
import {
  TURRET_PROJECTILE_FLIGHT_MS,
  TURRET_BATTERY_X_PCT,
  TURRET_BATTERY_Y_PCT,
  TURRET_BATTERY_SPACING_PCT,
  TURRET_BATTERY_MAX_VISIBLE,
  TURRET_DAMAGE_FLOAT_MS,
  TURRET_ATTACK_LUNGE_PX,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
} from '@/config/constants'

const bossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()

const turretImage = PLANET_ROLES.turret_planet.image
const turretColor = PLANET_ROLES.turret_planet.color

const bossAlive = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

// Alle Turret-Planeten des Spielers mit ihrem individuellen Schadensanteil
const turrets = computed(() =>
  planetShopStore.purchasedSlots
    .filter((s) => s.role === 'turret_planet')
    .map((s) => {
      const mul = s.jungleBuff?.active ? s.jungleBuff.multiplier : 1
      return {
        slotId: s.id,
        dmg:
          Math.round(
            PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(s.level) * mul * 10,
          ) / 10,
      }
    }),
)

const visibleTurrets = computed(() => turrets.value.slice(0, TURRET_BATTERY_MAX_VISIBLE))
const hiddenCount = computed(() => Math.max(0, turrets.value.length - TURRET_BATTERY_MAX_VISIBLE))
const totalDps = computed(
  () => Math.round(planetShopStore.autoAttackDPS * 10) / 10,
)

// Vertikale Verteilung: Spalte zentriert um TURRET_BATTERY_Y_PCT
function turretYPct(index: number): number {
  const count = visibleTurrets.value.length + (hiddenCount.value > 0 ? 1 : 0)
  const start = TURRET_BATTERY_Y_PCT - ((count - 1) / 2) * TURRET_BATTERY_SPACING_PCT
  return start + index * TURRET_BATTERY_SPACING_PCT
}

const captionYPct = computed(() => {
  const count = visibleTurrets.value.length + (hiddenCount.value > 0 ? 1 : 0)
  return TURRET_BATTERY_Y_PCT + ((count - 1) / 2) * TURRET_BATTERY_SPACING_PCT + 9
})

// Schnips-Vektor pro Turret: Einheitsvektor Richtung Boss × Lunge-Distanz —
// jeder Planet stößt entlang seiner eigenen Flugachse vor
function lungeStyle(index: number): Record<string, string> {
  const { w, h } = arenaSize.value
  const dx = ((STRIKER_BOSS_ANCHOR_X_PCT - TURRET_BATTERY_X_PCT) / 100) * w
  const dy = ((STRIKER_BOSS_ANCHOR_Y_PCT - turretYPct(index)) / 100) * h
  const dist = Math.hypot(dx, dy) || 1
  return {
    '--ax': `${Math.round((dx / dist) * TURRET_ATTACK_LUNGE_PX)}px`,
    '--ay': `${Math.round((dy / dist) * TURRET_ATTACK_LUNGE_PX)}px`,
  }
}

// Arena-Größe für die Kometen-Flugvektoren
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

// ── Volleys + Floats — getrieben vom geteilten Salven-Counter ─────────────
interface Volley {
  id: number
  fromYPct: number
  px: number
  py: number
}

const volleys = ref<Volley[]>([])
const floats = ref<{ id: number; value: number }[]>([])
const volleyFlash = ref(false)
const volleyCount = ref(0)
let volleyId = 0
const timeouts: number[] = []

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function fireVolley() {
  if (!bossAlive.value || visibleTurrets.value.length === 0) return
  volleyCount.value++

  volleyFlash.value = false
  requestAnimationFrame(() => {
    volleyFlash.value = true
  })

  const { w, h } = arenaSize.value
  const groupId = ++volleyId

  visibleTurrets.value.forEach((_, i) => {
    const fromYPct = turretYPct(i)
    const id = ++volleyId
    volleys.value.push({
      id,
      fromYPct,
      px: Math.round(
        ((STRIKER_BOSS_ANCHOR_X_PCT - TURRET_BATTERY_X_PCT) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC,
      ),
      py: Math.round(
        ((STRIKER_BOSS_ANCHOR_Y_PCT - fromYPct) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC,
      ),
    })
    later(TURRET_PROJECTILE_FLIGHT_MS, () => {
      volleys.value = volleys.value.filter((v) => v.id !== id)
    })
  })

  // Eine gebündelte Schadenszahl beim Einschlag (Gesamt-DPS der Batterie)
  later(TURRET_PROJECTILE_FLIGHT_MS, () => {
    if (!bossAlive.value) return
    floats.value.push({ id: groupId, value: totalDps.value })
    later(TURRET_DAMAGE_FLOAT_MS, () => {
      floats.value = floats.value.filter((f) => f.id !== groupId)
    })
  })
}

// Geteilter Takt: dieselbe Salve treibt Idle-Orbit-Schüsse und dieses HUD
watch(
  () => bossStore.turretVolleyCounter,
  () => fireVolley(),
)

onMounted(() => {
  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) arenaSize.value = { w: rect.width, h: rect.height }
  })
})

watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (el && resizeObserver) {
    resizeObserver.observe(el)
    const rect = el.getBoundingClientRect()
    arenaSize.value = { w: rect.width, h: rect.height }
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
.tbh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* über der .arena (z-index 1), unter HUD (3) und Squad (4) */
  z-index: 2;
  --tc: v-bind(turretColor);
}

/* ── Turret-Eintrag: Planet + Ring + Schadenswert ────────────────────────── */
.tbh-turret {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.tbh-planet {
  position: relative;
  width: 58px;
  height: 58px;
}

.tbh-planet img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--tc) 45%, transparent))
    drop-shadow(0 3px 6px rgba(0, 0, 0, 0.8));
}

/* Schnips beim Salvenstart: kurz vom Boss weg ausholen, dann samt Ring
   Richtung Boss vorschnellen und federnd zurück — wie die Striker */
.tbh-planet--firing {
  animation: tbh-snap 0.5s linear;
  will-change: transform;
}

@keyframes tbh-snap {
  0% {
    transform: translate(0, 0) scale(1);
    animation-timing-function: cubic-bezier(0.3, 0, 0.5, 1);
  }
  /* Ausholen: vom Boss weg, leicht aufgeladen */
  24% {
    transform: translate(calc(var(--ax, 0px) * -0.7), calc(var(--ay, 0px) * -0.7)) scale(1.06);
    animation-timing-function: cubic-bezier(0.7, 0, 0.25, 1);
  }
  /* Schnips: Richtung Boss vorschnellen */
  48% {
    transform: translate(var(--ax, 0px), var(--ay, 0px)) scale(1.14);
    animation-timing-function: cubic-bezier(0.25, 0.8, 0.35, 1);
  }
  /* weich abbremsen und zurückfedern */
  72% {
    transform: translate(calc(var(--ax, 0px) * -0.1), calc(var(--ay, 0px) * -0.1)) scale(0.99);
    animation-timing-function: cubic-bezier(0.3, 0, 0.45, 1);
  }
  100% {
    transform: translate(0, 0) scale(1);
  }
}

/* ── Cooldown-Ring: füllt sich linear über den 1s-Salventakt ─────────────── */
.tbh-ring {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  transform: rotate(-90deg);
  pointer-events: none;
}

.tbh-ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.09);
  stroke-width: 4;
}

.tbh-ring-arc {
  fill: none;
  stroke: var(--tc, #cc4444);
  stroke-width: 4;
  stroke-linecap: round;
  animation: tbh-ring-refill 1s linear forwards;
}

@keyframes tbh-ring-refill {
  from {
    stroke-dasharray: 0 100;
  }
  to {
    stroke-dasharray: 100 100;
  }
}

.tbh-dmg {
  font-size: 0.7rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 55%, #f0e6cc);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 8px color-mix(in srgb, var(--tc) 45%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.95);
}

/* ── Overflow-Chip ───────────────────────────────────────────────────────── */
.tbh-more {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 0.95rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 60%, #fff);
  text-shadow:
    0 0 10px color-mix(in srgb, var(--tc) 50%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.95);
}

/* ── Caption ─────────────────────────────────────────────────────────────── */
.tbh-caption {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tbh-caption-title {
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--tc) 65%, #f0e6cc);
  white-space: nowrap;
  text-shadow: 0 0 8px color-mix(in srgb, var(--tc) 40%, transparent), 0 1px 2px rgba(0, 0, 0, 0.95);
}

.tbh-caption-dps {
  font-size: 1rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 45%, #fff);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-shadow:
    0 0 12px color-mix(in srgb, var(--tc) 55%, transparent),
    0 2px 3px rgba(0, 0, 0, 0.95);
}

/* ── Komet Richtung Boss ─────────────────────────────────────────────────── */
.tbh-comet {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--tc, #cc4444) 45%, transparent 75%);
  box-shadow:
    0 0 12px var(--tc, #cc4444),
    0 0 26px color-mix(in srgb, var(--tc) 55%, transparent);
  animation: tbh-comet-fly 0.42s cubic-bezier(0.3, 0, 0.75, 0.5) forwards;
  will-change: transform, opacity;
  z-index: 1;
}

@keyframes tbh-comet-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  15% {
    opacity: 1;
    transform: translate(calc(var(--px) * 0.08), calc(var(--py) * 0.08)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate(var(--px), var(--py)) scale(1.15);
  }
}

/* ── Schadenszahl am Boss ────────────────────────────────────────────────── */
.tbh-float {
  position: absolute;
  transform: translateX(-50%);
  font-size: 1.1rem;
  font-weight: 900;
  color: color-mix(in srgb, var(--tc) 35%, #fff);
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 0 12px var(--tc, #cc4444);
  z-index: 2;
}

.tbh-pop-enter-active {
  animation: tbh-float-up 1s ease-out forwards;
  will-change: transform, opacity;
}

.tbh-pop-leave-active {
  display: none;
}

@keyframes tbh-float-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.8);
  }
  18% {
    opacity: 1;
    transform: translateX(-50%) translateY(-6px) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-42px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tbh-planet--firing,
  .tbh-comet,
  .tbh-pop-enter-active {
    animation: none;
  }

  .tbh-ring-arc {
    animation: none;
    stroke-dasharray: 100 100;
  }
}
</style>

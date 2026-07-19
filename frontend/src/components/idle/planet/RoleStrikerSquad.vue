<template>
  <div v-if="strikers.length" ref="rootEl" class="rsq" aria-hidden="true">
    <!-- Halbkreis-Führungslinie hinter den Strikern -->
    <div class="rsq-arc-guide" :style="arcGuideStyle" />

    <div
      v-for="s in strikers"
      :key="s.role"
      class="rsq-item"
      :class="{ 'rsq-item--firing': firingRoles.has(s.role) }"
      :style="{
        '--rc': s.color,
        '--ax': s.ax + 'px',
        '--ay': s.ay + 'px',
        left: `${s.xPct}%`,
        top: `${s.yPct}%`,
      }"
    >
      <div class="rsq-portrait">
        <img
          :src="s.img"
          :alt="s.champion"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
      </div>
      <svg class="rsq-ring" viewBox="0 0 100 100">
        <circle class="rsq-ring-track" cx="50" cy="50" r="44" />
        <circle class="rsq-ring-arc" cx="50" cy="50" r="44" :style="{ strokeDasharray: s.dash }" />
      </svg>
      <div class="rsq-badge"><img :src="s.roleImage" alt="" draggable="false" /></div>

      <!-- Cooldown-Pill am unteren Portraitrand -->
      <span class="rsq-cdpill" :class="{ 'rsq-cdpill--ready': s.secs <= 1 }">
        {{ s.secs }}s
      </span>

      <!-- Info-Plate: Champion-Name + Rolle · Schaden -->
      <div class="rsq-plate">
        <span class="rsq-plate-name">{{ s.champion }}</span>
        <span class="rsq-plate-stats">{{ s.roleShort }} · {{ s.attackDamage }} dmg</span>
      </div>

      <!-- Mündungsblitz Richtung Boss beim Abschuss -->
      <span
        v-if="firingRoles.has(s.role)"
        class="rsq-muzzle"
        :style="{ '--mx': s.mx + 'px', '--my': s.my + 'px' }"
      />

      <!-- Projektile + Impacts dieses Strikers -->
      <template v-for="shot in shotsFor(s.role)" :key="shot.id">
        <span
          v-if="shot.phase === 'fly'"
          class="rsq-proj"
          :style="{ '--px': s.px + 'px', '--py': s.py + 'px', '--rot': s.rot + 'deg' }"
        />
        <span
          v-else
          class="rsq-impact"
          :style="{ transform: `translate(${s.px}px, ${s.py}px)` }"
        >
          <span class="rsq-impact-burst" />
          <span
            v-for="k in 6"
            :key="k"
            class="rsq-spark"
            :style="{ '--sx': SPARK_DIRS[k - 1].x + 'px', '--sy': SPARK_DIRS[k - 1].y + 'px' }"
          />
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
import { useBattleStore } from '@/stores/battleStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import {
  ROLE_BY_KEY,
  ROLE_STAR_ATTACKS,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_MID_CURSE_DOT_DPS,
  GAME_TICK_INTERVAL_MS,
  STRIKER_FLOAT_DURATION_MS,
  STRIKER_FLOAT_MAX,
  STRIKER_PROJECTILE_FLIGHT_MS,
  STRIKER_IMPACT_MS,
  STRIKER_FIRE_FLASH_MS,
  STRIKER_ARC_ANGLES,
  STRIKER_ARC_RX_PCT,
  STRIKER_ARC_RY_PCT,
  STRIKER_ARC_CENTER_Y_PCT,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
  STRIKER_ATTACK_LUNGE_PX,
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

// Funken-Richtungen für den Impact (fixe Streuung, kein Math.random pro Frame)
const SPARK_DIRS = [
  { x: 24, y: -8 },
  { x: 14, y: -22 },
  { x: -10, y: -24 },
  { x: -24, y: -6 },
  { x: -16, y: 18 },
  { x: 18, y: 16 },
]

// Arena-Größe in px — nötig für die Projektil-Flugvektoren (transform braucht px)
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

const strikers = computed(() =>
  SQUAD_ROLES.flatMap((role) => {
    const champion = battleStore.headerSlots[SLOT_BY_ROLE[role]]
    if (!champion) return []
    const def = ROLE_STAR_ATTACKS[role]
    const remaining = Math.max(0, roleBehaviorStore.roleAttackCooldownMs[role])
    const readyFrac = Math.max(0, Math.min(1, 1 - remaining / def.intervalMs))

    // Position auf dem Halbkreis — in % der Arena, skaliert mit jeder Auflösung
    const rad = (STRIKER_ARC_ANGLES[role] * Math.PI) / 180
    const xPct = 50 + Math.cos(rad) * STRIKER_ARC_RX_PCT
    const yPct = STRIKER_ARC_CENTER_Y_PCT + Math.sin(rad) * STRIKER_ARC_RY_PCT

    // Flugvektor zum Boss-Anker in px (Impact kurz vor dem Boss)
    const { w, h } = arenaSize.value
    const px = Math.round(((STRIKER_BOSS_ANCHOR_X_PCT - xPct) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC)
    const py = Math.round(((STRIKER_BOSS_ANCHOR_Y_PCT - yPct) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC)
    const dist = Math.hypot(px, py) || 1

    return [
      {
        role,
        champion,
        img: battleStore.getChampionImage(champion),
        roleImage: ROLE_BY_KEY[role].image,
        color: ROLE_BY_KEY[role].color,
        roleShort: ROLE_BY_KEY[role].short,
        attackDamage: def.damage,
        secs: Math.ceil(remaining / 1000),
        dash: `${(readyFrac * RING_CIRCUMFERENCE).toFixed(1)} ${RING_CIRCUMFERENCE.toFixed(1)}`,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        px,
        py,
        // Schweif zeigt der Flugrichtung entgegen
        rot: Math.round((Math.atan2(py, px) * 180) / Math.PI) + 90,
        // Mündungsblitz am Portraitrand Richtung Boss
        mx: Math.round((px / dist) * 52),
        my: Math.round((py / dist) * 52),
        // Angriffs-Lunge: Portrait stößt Richtung Boss vor
        ax: Math.round((px / dist) * STRIKER_ATTACK_LUNGE_PX),
        ay: Math.round((py / dist) * STRIKER_ATTACK_LUNGE_PX),
      },
    ]
  }),
)

// Halbkreis-Führungslinie (Ellipse, oberer Teil ausgeblendet) — reine %-Maße
const arcGuideStyle = computed(() => ({
  width: `${STRIKER_ARC_RX_PCT * 2}%`,
  height: `${STRIKER_ARC_RY_PCT * 2}%`,
  left: `${50 - STRIKER_ARC_RX_PCT}%`,
  top: `${STRIKER_ARC_CENTER_Y_PCT - STRIKER_ARC_RY_PCT}%`,
}))

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

  resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect
    if (rect) arenaSize.value = { w: rect.width, h: rect.height }
  })
})

// rootEl existiert erst, wenn v-if greift — Observer dann (re-)anbinden
watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (el && resizeObserver) {
    resizeObserver.observe(el)
    const rect = el.getBoundingClientRect()
    arenaSize.value = { w: rect.width, h: rect.height }
  }
})

onUnmounted(() => {
  if (dotInterval !== null) window.clearInterval(dotInterval)
  resizeObserver?.disconnect()
  resizeObserver = null
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
.rsq {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── Halbkreis-Führungslinie — verbindet die Striker optisch ─────────────── */
.rsq-arc-guide {
  position: absolute;
  border: 1px dashed rgba(232, 192, 64, 0.22);
  border-radius: 50%;
  /* nur der untere Bogen: oberen Teil ausblenden */
  -webkit-mask: linear-gradient(to bottom, transparent 0 26%, #000 44%);
  mask: linear-gradient(to bottom, transparent 0 26%, #000 44%);
}

.rsq-item {
  position: absolute;
  width: 96px;
  height: 96px;
  transform: translate(-50%, -50%);
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
    0 0 16px color-mix(in srgb, var(--rc) 55%, transparent),
    0 5px 12px rgba(0, 0, 0, 0.7);
}

.rsq-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

/* ── Cooldown-Ring ───────────────────────────────────────────────────────── */
.rsq-ring {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
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
  top: -5px;
  left: -5px;
  width: 30px;
  height: 30px;
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
  width: 19px;
  height: 19px;
  object-fit: contain;
}

/* ── Cooldown-Pill am unteren Portraitrand ───────────────────────────────── */
.rsq-cdpill {
  position: absolute;
  left: 50%;
  bottom: -9px;
  transform: translateX(-50%);
  min-width: 34px;
  padding: 2px 8px;
  border-radius: 9px;
  text-align: center;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 32%, #16100a),
    #0c0803
  );
  border: 1px solid color-mix(in srgb, var(--rc) 65%, #3a2410);
  box-shadow:
    0 0 8px color-mix(in srgb, var(--rc) 35%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
  font-size: 0.68rem;
  font-weight: 900;
  color: #f4ead0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  z-index: 3;
  transition: box-shadow 0.25s, border-color 0.25s;
}

/* Kurz vor dem Abschuss aufglühen */
.rsq-cdpill--ready {
  border-color: var(--rc, #c8922a);
  color: #fff;
  box-shadow:
    0 0 12px color-mix(in srgb, var(--rc) 75%, transparent),
    0 2px 5px rgba(0, 0, 0, 0.75);
  animation: rsq-cdpill-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes rsq-cdpill-pulse {
  from {
    box-shadow:
      0 0 8px color-mix(in srgb, var(--rc) 50%, transparent),
      0 2px 5px rgba(0, 0, 0, 0.75);
  }
  to {
    box-shadow:
      0 0 18px color-mix(in srgb, var(--rc) 90%, transparent),
      0 2px 5px rgba(0, 0, 0, 0.75);
  }
}

/* Abschuss: Lunge Richtung Boss → Recoil → abklingender Shake + Glow */
.rsq-item--firing .rsq-portrait {
  animation: rsq-attack 0.5s cubic-bezier(0.3, 0, 0.4, 1);
  will-change: transform, filter;
}

@keyframes rsq-attack {
  0% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
  /* Ausholen: kurz vom Boss weg */
  10% {
    transform: translate(calc(var(--ax, 0px) * -0.35), calc(var(--ay, 0px) * -0.35)) scale(0.94);
    filter: brightness(0.85);
  }
  /* Vorstoß Richtung Boss + hellster Moment */
  26% {
    transform: translate(var(--ax, 0px), var(--ay, 0px)) scale(1.1);
    filter: brightness(1.8) saturate(1.3);
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 28px var(--rc, #c8922a),
      0 0 46px color-mix(in srgb, var(--rc) 55%, transparent),
      0 5px 12px rgba(0, 0, 0, 0.7);
  }
  /* Recoil über die Mitte hinaus */
  44% {
    transform: translate(calc(var(--ax, 0px) * -0.28), calc(var(--ay, 0px) * -0.28)) scale(0.98);
    filter: brightness(1.15);
  }
  /* abklingender Shake */
  58% {
    transform: translate(calc(var(--ax, 0px) * 0.14), calc(var(--ay, 0px) * 0.14)) scale(1.02);
  }
  72% {
    transform: translate(calc(var(--ax, 0px) * -0.07), calc(var(--ay, 0px) * -0.07)) scale(1);
  }
  86% {
    transform: translate(calc(var(--ax, 0px) * 0.03), calc(var(--ay, 0px) * 0.03)) scale(1);
  }
  100% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
}

/* ── Info-Plate unter dem Portrait ───────────────────────────────────────── */
.rsq-plate {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 96px;
  padding: 4px 10px 5px;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.92);
  border: 1px solid color-mix(in srgb, var(--rc) 40%, #3a2410);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

/* Goldlinie oben — wie die Modal-Karten */
.rsq-plate::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rc) 75%, #e8c060),
    transparent
  );
}

.rsq-plate-name {
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: #f0e6cc;
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.rsq-plate-stats {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--rc) 65%, #f0e6cc);
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── Mündungsblitz Richtung Boss ─────────────────────────────────────────── */
.rsq-muzzle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--rc, #c8922a) 40%, transparent 70%);
  transform: translate(var(--mx), var(--my));
  animation: rsq-muzzle 0.28s ease-out forwards;
  z-index: 3;
}

@keyframes rsq-muzzle {
  0% {
    opacity: 1;
    transform: translate(var(--mx), var(--my)) scale(0.4);
  }
  100% {
    opacity: 0;
    transform: translate(var(--mx), var(--my)) scale(1.5);
  }
}

/* ── Projektil: Komet in Rollenfarbe fliegt zum Boss ─────────────────────── */
.rsq-proj {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--rc, #c8922a) 45%, transparent 75%);
  box-shadow:
    0 0 12px var(--rc, #c8922a),
    0 0 26px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-proj-fly 0.55s cubic-bezier(0.3, 0, 0.75, 0.5) forwards;
  will-change: transform, opacity;
  z-index: 3;
}

/* Schweif — entgegen der Flugrichtung rotiert */
.rsq-proj::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 32px;
  transform: translate(-50%, -10%) rotate(var(--rot, 0deg));
  transform-origin: top center;
  border-radius: 3px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--rc) 85%, #fff),
    transparent
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
    transform: translate(var(--px), var(--py)) scale(1.1);
  }
}

/* ── Impact am Boss: Schockwelle + Funken + Schadenszahl ─────────────────── */
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
  width: 30px;
  height: 30px;
  margin-left: -15px;
  border-radius: 50%;
  border: 2px solid var(--rc, #c8922a);
  box-shadow:
    0 0 14px var(--rc, #c8922a),
    inset 0 0 10px color-mix(in srgb, var(--rc) 60%, transparent);
  animation: rsq-impact-burst 0.45s ease-out forwards;
}

@keyframes rsq-impact-burst {
  0% {
    opacity: 1;
    transform: scale(0.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

.rsq-spark {
  position: absolute;
  left: 50%;
  top: 0;
  width: 4px;
  height: 4px;
  margin-left: -2px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--rc) 80%, #fff);
  box-shadow: 0 0 6px var(--rc, #c8922a);
  animation: rsq-spark-fly 0.5s ease-out forwards;
}

@keyframes rsq-spark-fly {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--sx), var(--sy)) scale(0.4);
  }
}

.rsq-impact-num {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  font-size: 1.3rem;
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
    transform: translateX(-50%) translateY(-8px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px) scale(0.85);
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
  .rsq-cdpill--ready,
  .rsq-muzzle,
  .rsq-proj,
  .rsq-impact-burst,
  .rsq-spark,
  .rsq-impact-num,
  .rsq-pop-enter-active {
    animation: none;
  }
}
</style>

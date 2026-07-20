<template>
  <div v-if="turrets.length > 0 && bossAlive" ref="rootEl" class="tbh" aria-hidden="true">
    <!-- Turrets an ihren festen Slot-Ankern: Slot 1–3 links, Slot 4–6 rechts -->
    <div
      v-for="t in turrets"
      :key="t.slotId"
      class="tbh-turret"
      :class="t.isLeft ? 'tbh-turret--left' : 'tbh-turret--right'"
      :style="{ left: `${t.xPct}%`, top: `${t.yPct}%` }"
    >
      <!-- Die gesamte Einheit (Planet + Pill + Plate) schnipst beim Angriff
           gemeinsam — wie die rsq-unit der Champions -->
      <div
        class="tbh-unit"
        :class="{ 'tbh-unit--firing': volleyFlash }"
        :style="lungeStyle(t)"
      >
        <div class="tbh-planet" :class="{ 'tbh-planet--hit': hitFlash }">
          <img :src="turretImage" alt="" draggable="false" />

          <!-- Cooldown-Pill wie bei den Champions — eigener 100ms-Ticker in
               der Kind-Komponente, re-rendert nicht die ganze Batterie -->
          <TurretCdPill />

          <!-- Roter Schadens-Float, wenn der Boss die Turrets trifft -->
          <span v-if="hitSeq > 0" :key="'hit-' + hitSeq" class="tbh-hitfloat">
            -{{ hitDmg }}
          </span>
        </div>

        <!-- Info-Plate wie bei den Champions: HP-Bar → Slot-Nummer → dmg/s -->
        <div class="tbh-plate-anchor">
          <StrikerInfoPlate
            :color="turretColor"
            :hp-pct="t.hpPct"
            :hp-text="`${t.hpCur} / ${t.hpMax}`"
            :name="`Slot ${t.slotNum}`"
            :stats="`${t.dmg} dmg/s`"
          />
        </div>
      </div>
    </div>

    <!-- Cooldown-Ringe: EIN Canvas für alle Turrets, ein Draw-Pass pro Frame —
         statt 6 SVGs mit durchgehender stroke-dasharray-Animation -->
    <canvas ref="ringCanvas" class="tbh-ring-canvas" />

    <!-- Kometen-Volleys Richtung Boss -->
    <span
      v-for="v in volleys"
      :key="v.id"
      class="tbh-comet"
      :style="{
        left: `${v.fromXPct}%`,
        top: `${v.fromYPct}%`,
        '--px': v.px + 'px',
        '--py': v.py + 'px',
      }"
    />

    <!-- Schadenszahl pro Projektil am Einschlagpunkt — wie bei den Champions -->
    <span
      v-for="f in impactFloats"
      :key="f.id"
      class="tbh-impact-num"
      :style="{ left: `calc(${f.xPct}% + ${f.px}px)`, top: `calc(${f.yPct}% + ${f.py}px)` }"
    >
      -{{ f.value }}
    </span>
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
import StrikerInfoPlate from '@/components/idle/planet/StrikerInfoPlate.vue'
import TurretCdPill from '@/components/idle/planet/TurretCdPill.vue'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import {
  GAME_TICK_INTERVAL_MS,
  PLANET_SLOT_MAX_HP,
  CHAMPION_HIT_FLASH_MS,
  TURRET_PROJECTILE_FLIGHT_MS,
  TURRET_BATTERY_LEFT_X_PCT,
  TURRET_BATTERY_RIGHT_X_PCT,
  TURRET_BATTERY_Y_PCT,
  TURRET_BATTERY_SPACING_PCT,
  TURRET_DAMAGE_FLOAT_MS,
  TURRET_ATTACK_LUNGE_PX,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
} from '@/config/constants'

const bossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()
const roleBehaviorStore = useRoleBehaviorStore()

const turretImage = PLANET_ROLES.turret_planet.image
const turretColor = PLANET_ROLES.turret_planet.color

const bossAlive = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

interface TurretEntry {
  slotId: string
  slotNum: number
  isLeft: boolean
  dmg: number
  hpPct: number
  hpCur: number
  hpMax: number
  xPct: number
  yPct: number
}

// Feste Slot-Anker: Slot 1–3 → linke Flanke (Reihe 0–2), Slot 4–6 → rechte
// Flanke (Reihe 0–2) — die Position spiegelt immer den belegten Planet-Slot
const turrets = computed<TurretEntry[]>(() =>
  planetShopStore.purchasedSlots
    .filter((s) => s.role === 'turret_planet')
    .map((s) => {
      const slotNum = parseInt(s.id.replace('slot_', ''), 10)
      const isLeft = slotNum <= 3
      const row = (slotNum - 1) % 3
      const mul = s.jungleBuff?.active ? s.jungleBuff.multiplier : 1
      const hpCur = s.currentHp ?? PLANET_SLOT_MAX_HP
      const hpMax = s.maxHp ?? PLANET_SLOT_MAX_HP
      return {
        slotId: s.id,
        slotNum,
        isLeft,
        hpCur: Math.round(hpCur),
        hpMax,
        hpPct: hpMax > 0 ? Math.max(0, Math.min(100, (hpCur / hpMax) * 100)) : 100,
        dmg:
          Math.round(
            PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(s.level) * mul * 10,
          ) / 10,
        xPct: isLeft ? TURRET_BATTERY_LEFT_X_PCT : TURRET_BATTERY_RIGHT_X_PCT,
        yPct: TURRET_BATTERY_Y_PCT + (row - 1) * TURRET_BATTERY_SPACING_PCT,
      }
    }),
)

// ── Boss-Treffer auf die Turrets: Flash + roter Float ─────────────────────
const hitFlash = ref(false)
const hitSeq = ref(0)
const hitDmg = computed(() => roleBehaviorStore.turretHitDmg)

watch(
  () => roleBehaviorStore.turretHitAt,
  () => {
    hitSeq.value++
    hitFlash.value = false
    requestAnimationFrame(() => {
      hitFlash.value = true
      later(CHAMPION_HIT_FLASH_MS, () => {
        hitFlash.value = false
      })
    })
  },
)

// Arena-Größe für Kometen-Flugvektoren + Schnips-Richtung
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

// ── Cooldown-Ringe auf EINEM Canvas — ein Draw-Pass pro Frame statt sechs
// dauerhaft repaintender SVG-dasharray-Animationen ────────────────────────
const ringCanvas = ref<HTMLCanvasElement | null>(null)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const TWO_PI = Math.PI * 2
let lastVolleyMs = Date.now()
let ringAnimFrame = 0

function drawRings() {
  const cv = ringCanvas.value
  const c = cv?.getContext('2d')
  if (cv && c) {
    c.clearRect(0, 0, cv.width, cv.height)
    const { w, h } = arenaSize.value
    // Radius folgt der CSS-Planetengröße: clamp(54px, 7vh, 76px) / 2 + Saum
    const planetPx = Math.max(54, Math.min(76, window.innerHeight * 0.07))
    const r = planetPx / 2 + 7
    const progress = reducedMotion
      ? 1
      : Math.min(1, (Date.now() - lastVolleyMs) / GAME_TICK_INTERVAL_MS)

    for (const t of turrets.value) {
      const cx = (t.xPct / 100) * w
      const cy = (t.yPct / 100) * h

      // Leise Spur, damit der Ring auch bei wenig Fortschritt lesbar ist
      c.beginPath()
      c.arc(cx, cy, r, 0, TWO_PI)
      c.strokeStyle = 'rgba(255,255,255,0.09)'
      c.lineWidth = 3
      c.stroke()

      if (progress <= 0.004) continue
      const start = -Math.PI / 2
      const end = start + progress * TWO_PI
      const hot = progress > 0.92
      c.beginPath()
      c.arc(cx, cy, r, start, end)
      c.strokeStyle = hot ? 'rgba(255,150,140,0.9)' : 'rgba(220,90,80,0.6)'
      c.lineWidth = 3
      c.lineCap = 'round'
      c.stroke()

      // Glüh-Spitze am Ende des Bogens
      if (progress < 1) {
        c.beginPath()
        c.arc(cx + Math.cos(end) * r, cy + Math.sin(end) * r, hot ? 3 : 2.2, 0, TWO_PI)
        c.fillStyle = 'rgba(255,180,170,0.85)'
        c.fill()
      }
    }
  }
  // Bei reduced motion steht der Ring statisch voll — kein Dauer-Loop nötig
  if (!reducedMotion) ringAnimFrame = requestAnimationFrame(drawRings)
}

function sizeRingCanvas() {
  const cv = ringCanvas.value
  if (cv) {
    cv.width = arenaSize.value.w
    cv.height = arenaSize.value.h
  }
}

watch(arenaSize, sizeRingCanvas)

// Canvas existiert nur, solange das Root-v-if greift — Loop daran koppeln
watch(ringCanvas, (cv) => {
  cancelAnimationFrame(ringAnimFrame)
  if (cv) {
    sizeRingCanvas()
    ringAnimFrame = requestAnimationFrame(drawRings)
  }
})

// Schnips-Vektor: Einheitsvektor Richtung Boss × Lunge-Distanz — jeder
// Turret stößt entlang seiner eigenen Flugachse vor
function lungeStyle(t: TurretEntry): Record<string, string> {
  const { w, h } = arenaSize.value
  const dx = ((STRIKER_BOSS_ANCHOR_X_PCT - t.xPct) / 100) * w
  const dy = ((STRIKER_BOSS_ANCHOR_Y_PCT - t.yPct) / 100) * h
  const dist = Math.hypot(dx, dy) || 1
  return {
    '--ax': `${Math.round((dx / dist) * TURRET_ATTACK_LUNGE_PX)}px`,
    '--ay': `${Math.round((dy / dist) * TURRET_ATTACK_LUNGE_PX)}px`,
  }
}

// ── Volleys + Floats — getrieben vom geteilten Salven-Counter ─────────────
interface Volley {
  id: number
  fromXPct: number
  fromYPct: number
  px: number
  py: number
}

interface ImpactFloat {
  id: number
  xPct: number
  yPct: number
  px: number
  py: number
  value: number
}

const volleys = ref<Volley[]>([])
const impactFloats = ref<ImpactFloat[]>([])
const volleyFlash = ref(false)
let volleyId = 0
const timeouts: number[] = []

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function fireVolley() {
  if (!bossAlive.value || turrets.value.length === 0) return
  lastVolleyMs = Date.now()

  volleyFlash.value = false
  requestAnimationFrame(() => {
    volleyFlash.value = true
  })

  const { w, h } = arenaSize.value

  for (const t of turrets.value) {
    const id = ++volleyId
    const px = Math.round(
      ((STRIKER_BOSS_ANCHOR_X_PCT - t.xPct) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC,
    )
    const py = Math.round(
      ((STRIKER_BOSS_ANCHOR_Y_PCT - t.yPct) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC,
    )
    volleys.value.push({ id, fromXPct: t.xPct, fromYPct: t.yPct, px, py })

    // Einschlag: Komet entfernen, Schadenszahl dieses Schusses am Impact-Punkt
    later(TURRET_PROJECTILE_FLIGHT_MS, () => {
      volleys.value = volleys.value.filter((v) => v.id !== id)
      if (!bossAlive.value) return
      impactFloats.value.push({ id, xPct: t.xPct, yPct: t.yPct, px, py, value: t.dmg })
      later(TURRET_DAMAGE_FLOAT_MS, () => {
        impactFloats.value = impactFloats.value.filter((f) => f.id !== id)
      })
    })
  }
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
  cancelAnimationFrame(ringAnimFrame)
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
  /* Style/Layout/Paint-Invalidierungen bleiben im HUD-Subtree */
  contain: layout style paint;
  --tc: v-bind(turretColor);
  /* Skaliert mit der Viewport-Höhe — auf 1080p ≈ 72px, auf Laptops ≈ 58px.
     Muss mit planetPx in drawRings() übereinstimmen (54 / 7vh / 76) */
  --tbh-size: clamp(54px, 7vh, 76px);
}

/* ── Turret-Eintrag: Planet + Ring + Info-Plate ──────────────────────────
   Container-Box = Planet (die Plate ist absolut positioniert) — der Anker
   (left/top) ist damit exakt das Planet-Zentrum für den Canvas-Ring */
.tbh-turret {
  position: absolute;
  transform: translate(-50%, -50%);
}

/* Einheit = Planet-Box (Plate ist absolut) — Schnips bewegt beides zusammen */
.tbh-unit {
  position: relative;
}

.tbh-planet {
  position: relative;
  width: var(--tbh-size);
  height: var(--tbh-size);
}

/* Glow als statisches ::before statt drop-shadow-Filter: der Filter würde
   das Image bei jeder Snap-Animation (×6 pro Sekunde) neu rastern */
.tbh-planet::before {
  content: '';
  position: absolute;
  inset: -18%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--tc, #cc4444) 32%, transparent) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.tbh-planet img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Schnips beim Salvenstart: kurz vom Boss weg ausholen, dann samt Pill und
   Info-Plate Richtung Boss vorschnellen und federnd zurück — wie die Striker */
.tbh-unit--firing {
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

/* ── Cooldown-Ring-Canvas — ein Layer über allen Turrets ─────────────────── */
.tbh-ring-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── Info-Plate seitlich neben dem Planeten — linke Flanke links vom Image,
   rechte Flanke rechts davon; Karte kommt aus der geteilten StrikerInfoPlate ── */
.tbh-plate-anchor {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  --sip-min-w: 82px;
}

.tbh-turret--left .tbh-plate-anchor {
  right: calc(100% + 12px);
}

.tbh-turret--right .tbh-plate-anchor {
  left: calc(100% + 12px);
}

/* ── Komet Richtung Boss ─────────────────────────────────────────────────── */
.tbh-comet {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, var(--tc, #cc4444) 45%, transparent 75%);
  box-shadow: 0 0 12px var(--tc, #cc4444);
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

/* ── Boss-Treffer: roter Flash-Overlay (nur ::after — kollidiert nicht mit
   der Snap-Animation auf dem Element selbst) ─────────────────────────────── */
.tbh-planet--hit::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 90, 60, 0.55) 0%,
    rgba(255, 40, 20, 0.28) 65%,
    transparent 100%
  );
  animation: tbh-hitflash-fade 0.45s ease-out forwards;
  pointer-events: none;
}

@keyframes tbh-hitflash-fade {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Roter Schadens-Float über dem Planeten, wenn der Boss trifft */
.tbh-hitfloat {
  position: absolute;
  left: 50%;
  top: -12px;
  transform: translateX(-50%);
  font-size: 0.9rem;
  font-weight: 900;
  color: #ff7060;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 0 12px #e03020;
  animation: tbh-hitfloat-up 1s ease-out forwards;
  will-change: transform, opacity;
  z-index: 3;
}

@keyframes tbh-hitfloat-up {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.8);
  }
  16% {
    opacity: 1;
    transform: translateX(-50%) translateY(-4px) scale(1.12);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px) scale(0.8);
  }
}

/* ── Schadenszahl am Einschlagpunkt — wie rsq-impact-num der Champions ───── */
.tbh-impact-num {
  position: absolute;
  transform: translateX(-50%);
  font-size: 1.15rem;
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow: 0 0 12px var(--tc, #cc4444);
  animation: tbh-impact-num 0.9s ease-out forwards;
  will-change: transform, opacity;
  z-index: 2;
  pointer-events: none;
}

@keyframes tbh-impact-num {
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
    transform: translateX(-50%) translateY(-36px) scale(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tbh-unit--firing,
  .tbh-planet--hit::after,
  .tbh-hitfloat,
  .tbh-impact-num,
  .tbh-comet {
    animation: none;
  }
}
</style>

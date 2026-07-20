<template>
  <div v-if="turrets.length > 0 && bossAlive" ref="rootEl" class="tbh" aria-hidden="true">
    <!-- Turrets an ihren festen Slot-Ankern: Slot 1–3 links, Slot 4–6 rechts -->
    <div
      v-for="t in turrets"
      :key="t.slotId"
      class="tbh-turret"
      :style="{ left: `${t.xPct}%`, top: `${t.yPct}%` }"
    >
      <div
        class="tbh-planet"
        :class="{ 'tbh-planet--firing': volleyFlash }"
        :style="lungeStyle(t)"
      >
        <img :src="turretImage" alt="" draggable="false" />
      </div>
      <!-- Info-Plate im Striker-Stil: Slot-Nummer + dmg/s -->
      <div class="tbh-plate">
        <span class="tbh-plate-name">Slot {{ t.slotNum }}</span>
        <span class="tbh-plate-stats">{{ t.dmg }} dmg/s</span>
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
  GAME_TICK_INTERVAL_MS,
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

const turretImage = PLANET_ROLES.turret_planet.image
const turretColor = PLANET_ROLES.turret_planet.color

const bossAlive = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

interface TurretEntry {
  slotId: string
  slotNum: number
  dmg: number
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
      return {
        slotId: s.id,
        slotNum,
        dmg:
          Math.round(
            PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(s.level) * mul * 10,
          ) / 10,
        xPct: isLeft ? TURRET_BATTERY_LEFT_X_PCT : TURRET_BATTERY_RIGHT_X_PCT,
        yPct: TURRET_BATTERY_Y_PCT + (row - 1) * TURRET_BATTERY_SPACING_PCT,
      }
    }),
)

const totalDps = computed(() => Math.round(planetShopStore.autoAttackDPS * 10) / 10)

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

const volleys = ref<Volley[]>([])
const floats = ref<{ id: number; value: number }[]>([])
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
  const groupId = ++volleyId

  for (const t of turrets.value) {
    const id = ++volleyId
    volleys.value.push({
      id,
      fromXPct: t.xPct,
      fromYPct: t.yPct,
      px: Math.round(
        ((STRIKER_BOSS_ANCHOR_X_PCT - t.xPct) / 100) * w * STRIKER_PROJECTILE_IMPACT_FRAC,
      ),
      py: Math.round(
        ((STRIKER_BOSS_ANCHOR_Y_PCT - t.yPct) / 100) * h * STRIKER_PROJECTILE_IMPACT_FRAC,
      ),
    })
    later(TURRET_PROJECTILE_FLIGHT_MS, () => {
      volleys.value = volleys.value.filter((v) => v.id !== id)
    })
  }

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
  --tc: v-bind(turretColor);
  /* Skaliert mit der Viewport-Höhe — auf 1080p ≈ 72px, auf Laptops ≈ 58px.
     Muss mit planetPx in drawRings() übereinstimmen (54 / 7vh / 76) */
  --tbh-size: clamp(54px, 7vh, 76px);
}

/* ── Turret-Eintrag: Planet + Ring + Info-Plate ──────────────────────────
   Anker (left/top) = PLANET-Zentrum, nicht Container-Mitte: nur so liegt
   der Canvas-Ring exakt um das Planet-Bild — die Plate hängt frei darunter */
.tbh-turret {
  position: absolute;
  transform: translate(-50%, calc(var(--tbh-size) / -2));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
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

/* ── Cooldown-Ring-Canvas — ein Layer über allen Turrets ─────────────────── */
.tbh-ring-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ── Info-Plate unter dem Planeten — gleicher Stil wie die Striker-Plates
   (.rsq-plate): dunkle Karte, Farb-Signaturlinie oben, Name + Stats ──────── */
.tbh-plate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 74px;
  margin-top: 6px;
  padding: 3px 9px 4px;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.92);
  border: 1px solid color-mix(in srgb, var(--tc) 40%, #3a2410);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

/* Signaturlinie oben — wie bei den Striker-Plates */
.tbh-plate::before {
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
    color-mix(in srgb, var(--tc) 75%, #e8c060),
    transparent
  );
}

.tbh-plate-name {
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(240, 230, 204, 0.85);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.tbh-plate-stats {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: color-mix(in srgb, var(--tc) 70%, #f0e6cc);
  text-transform: uppercase;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 8px color-mix(in srgb, var(--tc) 40%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.9);
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
}
</style>

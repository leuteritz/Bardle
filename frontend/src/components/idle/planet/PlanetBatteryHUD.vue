<template>
  <div v-if="bossAlive" ref="rootEl" class="tbh" aria-hidden="true">
    <!-- Gestrichelte Führungslinie im Stil der Striker-Arc-Guide: ein runder
         Ellipsenbogen um den Boss, auf dem alle 6 Slot-Anker liegen.
         pathLength normiert die Dash-Länge unabhängig von der Arena-Größe. -->
    <svg class="tbh-arc-guide" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path :d="guidePath" pathLength="400" vector-effect="non-scaling-stroke" />
    </svg>

    <!-- ALLE 6 Planet-Slots an ihren festen Ankern: Slot 1–3 links, 4–6
         rechts — gefüllte Slots zeigen das Planet-Image ihrer Rolle, leere
         einen Geister-Platzhalter. Nur Turrets feuern zurück. -->
    <div
      v-for="t in entries"
      :key="t.slotId"
      class="tbh-turret"
      :class="t.isLeft ? 'tbh-turret--left' : 'tbh-turret--right'"
      :style="{ left: `${t.xPct}%`, top: `${t.yPct}%`, '--tc': t.color }"
    >
      <!-- Die gesamte Einheit (Planet + Pill + Plate) schnipst beim Angriff
           gemeinsam — wie die rsq-unit der Champions (nur Turrets feuern) -->
      <div
        class="tbh-unit"
        :class="{ 'tbh-unit--firing': t.isTurret && volleyFlash }"
        :style="t.isTurret ? lungeStyle(t) : undefined"
      >
        <div
          v-if="t.filled"
          class="tbh-planet"
          :class="{ 'tbh-planet--hit': hitFlash || autoHitSlotId === t.slotId }"
        >
          <img :src="t.image" alt="" draggable="false" />

          <!-- Cooldown-Pill nur für Turrets — eigener 100ms-Ticker in
               der Kind-Komponente, re-rendert nicht die ganze Batterie -->
          <TurretCdPill v-if="t.isTurret" />

          <!-- Roter Schadens-Float: Nova (alle Planeten) -->
          <span v-if="hitSeq > 0" :key="'hit-' + hitSeq" class="tbh-hitfloat">
            -{{ hitDmg }}
          </span>

          <!-- Roter Schadens-Float: Strike (nur das getroffene Ziel) -->
          <span
            v-if="autoHitSlotId === t.slotId && autoHitSeq > 0"
            :key="'auto-' + autoHitSeq"
            class="tbh-hitfloat"
          >
            -{{ autoHitDmg }}
          </span>
        </div>

        <!-- Leerer Slot: Geister-Platzhalter auf dem Anker -->
        <div v-else class="tbh-planet tbh-planet--vacant">
          <span class="tbh-vacant-num">{{ t.slotNum }}</span>
        </div>

        <!-- Info-Plate: HP-Bar → Slot-Nummer → dmg/s (Turret) bzw. Rolle -->
        <div v-if="t.filled" class="tbh-plate-anchor">
          <StrikerInfoPlate
            :color="t.color"
            :hp-pct="t.hpPct"
            :hp-text="`${t.hpCur} / ${t.hpMax}`"
            :name="`Slot ${t.slotNum}`"
            :stats="t.isTurret ? `${t.dmg} dmg/s` : t.roleName"
          />
        </div>
      </div>
    </div>

    <!-- Cooldown-Ringe: EIN Canvas für alle Turrets, ein Draw-Pass pro Frame —
         statt 6 SVGs mit durchgehender stroke-dasharray-Animation -->
    <canvas ref="ringCanvas" class="tbh-ring-canvas" />

    <!-- Strike-Bolt: Projektil vom Boss zum per Auto-Attack getroffenen Turret -->
    <span
      v-for="b in autoBolts"
      :key="'bolt-' + b.id"
      class="tbh-strike-bolt"
      :style="{ '--px': b.px + 'px', '--py': b.py + 'px' }"
    />

    <!-- Ziel-Reticle: markiert den anvisierten Turret während des Bolt-Flugs -->
    <span
      v-for="m in autoMarks"
      :key="'mark-' + m.id"
      class="tbh-strike-mark"
      :style="{ left: m.xPct + '%', top: m.yPct + '%' }"
    />

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
import { guideEndAngleDeg, ellipsePointPct, type ArcGuideEllipse } from '@/utils/arcGuide'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import {
  GAME_TICK_INTERVAL_MS,
  PLANET_SLOT_MAX_HP,
  CHAMPION_HIT_FLASH_MS,
  BOSS_WAVE_HIT_DELAY_MS,
  BOSS_AUTO_HIT_DELAY_MS,
  TURRET_PROJECTILE_FLIGHT_MS,
  TURRET_ARC_RX_PCT,
  TURRET_ARC_RY_PCT,
  TURRET_ARC_CENTER_Y_PCT,
  TURRET_ARC_ROW_ANGLE_DEG,
  TURRET_DAMAGE_FLOAT_MS,
  TURRET_ATTACK_LUNGE_PX,
  STRIKER_BOSS_ANCHOR_X_PCT,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STRIKER_PROJECTILE_IMPACT_FRAC,
} from '@/config/constants'

const bossStore = usePlanetBossStore()
const planetShopStore = usePlanetShopStore()
const roleBehaviorStore = useRoleBehaviorStore()

const VACANT_COLOR = '#8a8070'

// Slot-Winkel auf dem Ellipsenbogen (Striker-Konvention: 0° = rechts,
// 90° = unten): linke Reihen um 180° gefächert, rechte um 0°/360° — Reihe 0
// sitzt oben, Reihe 2 unten, die mittlere exakt auf der Horizontalen
function turretArcAngleDeg(isLeft: boolean, row: number): number {
  const off = (row - 1) * TURRET_ARC_ROW_ANGLE_DEG
  return isLeft ? 180 - off : off
}

const bossAlive = computed(() => {
  const boss = bossStore.activeBoss
  return !!boss && !boss.defeated && !boss.expired
})

interface SlotEntry {
  slotId: string
  slotNum: number
  isLeft: boolean
  filled: boolean
  isTurret: boolean
  image: string
  color: string
  roleName: string
  dmg: number
  hpPct: number
  hpCur: number
  hpMax: number
  xPct: number
  yPct: number
}

// ALLE 6 Slot-Anker auf dem Ellipsenbogen: Slot 1–3 → linke Bogenhälfte
// (Reihe 0–2), Slot 4–6 → rechte. Gefüllte Slots tragen das Planet-Image
// ihrer Rolle; nur Turrets feuern zurück und zeigen dmg/s.
const entries = computed<SlotEntry[]>(() =>
  planetShopStore.slots.map((s) => {
    const slotNum = parseInt(s.id.replace('slot_', ''), 10)
    const isLeft = slotNum <= 3
    const row = (slotNum - 1) % 3
    const rad = (turretArcAngleDeg(isLeft, row) * Math.PI) / 180
    const filled = s.purchased && s.role !== null
    const roleDef = filled ? PLANET_ROLES[s.role!] : null
    const mul = s.jungleBuff?.active ? s.jungleBuff.multiplier : 1
    const hpCur = s.currentHp ?? PLANET_SLOT_MAX_HP
    const hpMax = s.maxHp ?? PLANET_SLOT_MAX_HP
    return {
      slotId: s.id,
      slotNum,
      isLeft,
      filled,
      isTurret: filled && s.role === 'turret_planet',
      image: roleDef?.image ?? '',
      color: roleDef?.color ?? VACANT_COLOR,
      roleName: roleDef?.name ?? '',
      hpCur: Math.round(hpCur),
      hpMax,
      hpPct: hpMax > 0 ? Math.max(0, Math.min(100, (hpCur / hpMax) * 100)) : 100,
      dmg:
        Math.round(
          PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(s.level) * mul * 10,
        ) / 10,
      xPct: Math.round((50 + Math.cos(rad) * TURRET_ARC_RX_PCT) * 10) / 10,
      yPct:
        Math.round((TURRET_ARC_CENTER_Y_PCT + Math.sin(rad) * TURRET_ARC_RY_PCT) * 10) / 10,
    }
  }),
)

// Nur Turret-Slots feuern Volleys und tragen Cooldown-Ringe
const turretEntries = computed(() => entries.value.filter((e) => e.isTurret))

// ── Nova-Treffer auf alle Planeten: Flash + roter Float ───────────────────
const hitFlash = ref(false)
const hitSeq = ref(0)
const hitDmg = computed(() => roleBehaviorStore.planetHitDmg)

// Um BOSS_WAVE_HIT_DELAY_MS verzögert — Flash + Damage-Label treffen die
// Planeten genau, wenn die Boss-Schockwelle sie optisch erreicht
watch(
  () => roleBehaviorStore.planetHitAt,
  () => {
    later(BOSS_WAVE_HIT_DELAY_MS, () => {
      hitSeq.value++
      hitFlash.value = false
      requestAnimationFrame(() => {
        hitFlash.value = true
        later(CHAMPION_HIT_FLASH_MS, () => {
          hitFlash.value = false
        })
      })
    })
  },
)

// ── Boss-Auto-Attack "Strike": trifft EINEN Turret-Planeten — sichtbarer
// Bolt vom Boss zum Slot, Flash + Float exakt beim Einschlag
const autoHitSlotId = ref<string | null>(null)
const autoHitSeq = ref(0)
const autoHitDmg = ref(0)

interface AutoBolt {
  id: number
  px: number
  py: number
}
const autoBolts = ref<AutoBolt[]>([])
let autoBoltId = 0

// Ziel-Markierung: Reticle am anvisierten Turret während des Bolt-Flugs
interface AutoMark {
  id: number
  xPct: number
  yPct: number
}
const autoMarks = ref<AutoMark[]>([])

watch(
  () => roleBehaviorStore.autoCounter,
  () => {
    const slotId = roleBehaviorStore.autoTargetSlotId
    if (!slotId) return
    const dmg = roleBehaviorStore.autoDmg

    // Bolt: Boss-Anker → Position des getroffenen Turrets (px-Vektor)
    const target = entries.value.find((t) => t.filled && t.slotId === slotId)
    const { w, h } = arenaSize.value
    if (target && w > 0 && h > 0) {
      const id = ++autoBoltId
      autoBolts.value.push({
        id,
        px: Math.round(((target.xPct - STRIKER_BOSS_ANCHOR_X_PCT) / 100) * w),
        py: Math.round(((target.yPct - STRIKER_BOSS_ANCHOR_Y_PCT) / 100) * h),
      })
      autoMarks.value.push({ id, xPct: target.xPct, yPct: target.yPct })
      later(BOSS_AUTO_HIT_DELAY_MS + 80, () => {
        autoBolts.value = autoBolts.value.filter((b) => b.id !== id)
      })
      later(BOSS_AUTO_HIT_DELAY_MS + 250, () => {
        autoMarks.value = autoMarks.value.filter((m) => m.id !== id)
      })
    }

    later(BOSS_AUTO_HIT_DELAY_MS, () => {
      autoHitSlotId.value = slotId
      autoHitDmg.value = dmg
      autoHitSeq.value++
      later(CHAMPION_HIT_FLASH_MS, () => {
        if (autoHitSlotId.value === slotId) autoHitSlotId.value = null
      })
    })
  },
)

// Arena-Größe für Kometen-Flugvektoren + Schnips-Richtung
const rootEl = ref<HTMLDivElement | null>(null)
const arenaSize = ref({ w: 0, h: 0 })
let resizeObserver: ResizeObserver | null = null

// Führungslinie: EIN durchgehender Ellipsenbogen um den Boss — von den
// untersten Slots aus beidseitig bis an die Planeten-Silhouette verlängert,
// als liefe die Linie hinter dem Planeten weiter und schlösse sich dort
const TURRET_GUIDE_ELLIPSE: ArcGuideEllipse = {
  rxPct: TURRET_ARC_RX_PCT,
  ryPct: TURRET_ARC_RY_PCT,
  centerYPct: TURRET_ARC_CENTER_Y_PCT,
}

const guidePath = computed(() => {
  const { w, h } = arenaSize.value
  // beide Enden wandern vom untersten Slot einwärts Richtung 90° (untere
  // Mitte), bis sie den Planeten treffen
  const endL = guideEndAngleDeg(turretArcAngleDeg(true, 2), -1, TURRET_GUIDE_ELLIPSE, w, h)
  const endR = guideEndAngleDeg(turretArcAngleDeg(false, 2), 1, TURRET_GUIDE_ELLIPSE, w, h)
  const p1 = ellipsePointPct(endL, TURRET_GUIDE_ELLIPSE)
  const p2 = ellipsePointPct(endR, TURRET_GUIDE_ELLIPSE)
  return `M ${p1.x} ${p1.y} A ${TURRET_ARC_RX_PCT} ${TURRET_ARC_RY_PCT} 0 1 1 ${p2.x} ${p2.y}`
})

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

    for (const t of turretEntries.value) {
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
function lungeStyle(t: SlotEntry): Record<string, string> {
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
  if (!bossAlive.value || turretEntries.value.length === 0) return
  lastVolleyMs = Date.now()

  volleyFlash.value = false
  requestAnimationFrame(() => {
    volleyFlash.value = true
  })

  const { w, h } = arenaSize.value

  for (const t of turretEntries.value) {
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
  /* --tc kommt pro Slot-Eintrag als Inline-Var (Rollenfarbe des Planeten) */
  /* Skaliert mit der Viewport-Höhe — auf 1080p ≈ 72px, auf Laptops ≈ 58px.
     Muss mit planetPx in drawRings() übereinstimmen (54 / 7vh / 76) */
  --tbh-size: clamp(54px, 7vh, 76px);
}

/* ── Führungslinie — gleicher Look wie .rsq-arc-guide der Striker ────────── */
.tbh-arc-guide {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.tbh-arc-guide path {
  fill: none;
  stroke: rgba(232, 192, 64, 0.22);
  stroke-width: 1;
  /* mit pathLength="400" ≈ gleiche Dash-Optik wie 1px dashed border */
  stroke-dasharray: 1 1;
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

/* ── Leerer Slot: Geister-Platzhalter — gestrichelter Ring + Slot-Nummer ── */
.tbh-planet--vacant {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(138, 128, 112, 0.5);
  border-radius: 50%;
  opacity: 0.55;
}

.tbh-planet--vacant::before {
  display: none;
}

.tbh-vacant-num {
  font-size: 1.1rem;
  font-weight: 900;
  color: rgba(138, 128, 112, 0.75);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
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

/* ── Strike-Bolt: Bone-Silber-Komet Boss → getroffener Turret — Flugzeit =
   BOSS_AUTO_HIT_DELAY_MS (0.18s), Einschlag löst Flash + Float ───────────── */
.tbh-strike-bolt {
  position: absolute;
  /* Boss-Anker (STRIKER_BOSS_ANCHOR_*_PCT) */
  left: 50%;
  top: 41%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0%, #f0e6d0 30%, #d8d0c0 55%, transparent 78%);
  box-shadow:
    0 0 30px rgba(232, 220, 190, 1),
    0 0 70px rgba(216, 208, 192, 0.6),
    0 0 120px rgba(216, 208, 192, 0.3);
  pointer-events: none;
  z-index: 3;
  /* Flugzeit = BOSS_AUTO_HIT_DELAY_MS (0.45s) — deutlich sichtbar */
  animation: tbh-strike-bolt-fly 0.45s cubic-bezier(0.4, 0, 0.7, 0.5) forwards;
  will-change: transform, opacity;
}

@keyframes tbh-strike-bolt-fly {
  0% {
    opacity: 0.4;
    transform: translate(0, 0) scale(0.4);
  }
  15% {
    opacity: 1;
    transform: translate(calc(var(--px) * 0.06), calc(var(--py) * 0.06)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translate(var(--px), var(--py)) scale(1.25);
  }
}

/* ── Ziel-Reticle: schnappt aufs Ziel und pulsiert bis zum Einschlag ─────── */
.tbh-strike-mark {
  position: absolute;
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  border-radius: 50%;
  border: 2px dashed rgba(240, 228, 200, 0.85);
  box-shadow:
    0 0 18px rgba(232, 220, 190, 0.45),
    inset 0 0 14px rgba(232, 220, 190, 0.25);
  pointer-events: none;
  z-index: 3;
  animation:
    tbh-strike-mark-in 0.18s ease-out both,
    tbh-strike-mark-pulse 0.3s ease-in-out 0.18s infinite alternate;
  will-change: transform, opacity;
}

@keyframes tbh-strike-mark-in {
  0% {
    opacity: 0;
    transform: scale(1.9) rotate(-20deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes tbh-strike-mark-pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.09);
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

/* Boss-Treffer: großer Crit-Slam über dem Planeten — gleiche Choreografie
   wie der Champion-Hit-Float (rsq-float--hit) */
.tbh-hitfloat {
  position: absolute;
  left: 50%;
  top: -22px;
  transform: translateX(-50%);
  font-size: 1.5rem;
  font-weight: 900;
  color: #ff8a70;
  -webkit-text-stroke: 4px rgba(30, 2, 0, 0.92);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow:
    0 0 14px rgba(255, 60, 30, 0.95),
    0 0 34px rgba(230, 40, 20, 0.55),
    0 2px 4px rgba(0, 0, 0, 0.95);
  animation: tbh-hitfloat-slam 1.1s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
  will-change: transform, opacity;
  z-index: 3;
}

/* Ring-Burst hinter der Zahl im Moment des Einschlags */
.tbh-hitfloat::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 52px;
  height: 52px;
  margin: -26px 0 0 -26px;
  border-radius: 50%;
  border: 2px solid rgba(255, 80, 40, 0.75);
  box-shadow: 0 0 16px rgba(255, 60, 30, 0.5);
  animation: tbh-hit-ring 0.5s ease-out forwards;
  pointer-events: none;
  z-index: -1;
}

@keyframes tbh-hit-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes tbh-hitfloat-slam {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px) scale(2.4) rotate(-6deg);
  }
  16% {
    opacity: 1;
    transform: translateX(-50%) translateY(2px) scale(0.92) rotate(3deg);
  }
  28% {
    transform: translateX(-50%) translateY(-2px) scale(1.12) rotate(-1deg);
  }
  45% {
    transform: translateX(-50%) translateY(-12px) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-48px) scale(0.85);
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
  .tbh-hitfloat::before,
  .tbh-impact-num,
  .tbh-strike-bolt,
  .tbh-strike-mark,
  .tbh-comet {
    animation: none;
  }
}
</style>

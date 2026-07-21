<template>
  <!-- kein aria-hidden mehr: die Slot-Einheiten sind klickbar -->
  <div v-if="bossAlive" ref="rootEl" class="tbh">
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
        :class="{
          'tbh-unit--firing': t.isTurret && volleyFlash && !behindSlotIds.has(t.slotId),
        }"
        :style="t.isTurret ? lungeStyle(t) : undefined"
        :title="
          t.filled
            ? `Slot ${t.slotNum} — open Planets tab`
            : t.purchased
              ? `Slot ${t.slotNum} is empty — assign a planet`
              : t.unlockable
                ? `Unlock Slot ${t.slotNum} for ${formatNumber(t.cost)} chimes`
                : `Slot ${t.slotNum} is locked`
        "
        @click="onSlotClick(t)"
      >
        <div
          v-if="t.filled"
          class="tbh-planet"
          :class="{
            'tbh-planet--hit':
              (hitFlash && !behindSlotIds.has(t.slotId)) || autoHitSlotId === t.slotId,
            'tbh-planet--eclipsed': behindSlotIds.has(t.slotId),
          }"
        >
          <img :src="t.image" alt="" draggable="false" />

          <!-- Boss-Zielscheibe: liegt während der Aim-Phase über dem GANZEN
               Planeten-Bild — rotierendes Reticle-Icon + pulsierende Tönung -->
          <span v-if="roleBehaviorStore.autoAimSlotId === t.slotId" class="tbh-aim-lock">
            <Icon
              icon="game-icons:targeting"
              class="tbh-aim-lock-icon"
              width="100%"
              height="100%"
            />
          </span>

          <!-- Cooldown-Pill nur für Turrets — eigener 100ms-Ticker in
               der Kind-Komponente, re-rendert nicht die ganze Batterie -->
          <TurretCdPill v-if="t.isTurret" />

          <!-- Cooldown-Ring als Mini-Canvas IN der Einheit: schnipst mit der
               Snap-Animation mit (Kind des transformierten .tbh-unit) und
               repaintet pro Frame nur ~90×90px statt der ganzen Arena -->
          <canvas
            v-if="t.isTurret"
            :ref="(el) => setRingCanvas(t.slotId, el)"
            class="tbh-ring-canvas"
          />

          <!-- Eclipse-Medaillon: Planet steht hinter der Sonne — kein Kampf
               (gleiches Icon-Medaillon wie im Command Panel) -->
          <span
            v-if="behindSlotIds.has(t.slotId)"
            class="tbh-eclipse"
            title="Behind the Sun — combat paused"
          >
            <Icon icon="game-icons:eclipse-flare" width="20" height="20" />
          </span>

          <!-- Roter Schadens-Float: Nova (alle sichtbaren Planeten) -->
          <span
            v-if="hitSeq > 0 && !behindSlotIds.has(t.slotId)"
            :key="'hit-' + hitSeq"
            class="tbh-hitfloat"
          >
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

        <!-- Leerer Slot — ALLE unbefüllten Zustände im Geister-Platzhalter-
             Stil der Striker-Vacants (rotierender Dash-Ring, ＋-Pill,
             seitliche Vacant-Plate): gekauft+leer → grün mit Planet-Emblem ·
             freischaltbar → grüner Kauf-Puls mit Schloss · gesperrt →
             graues Schloss, gedimmt -->
        <div
          v-else
          class="tbh-planet tbh-planet--vacant"
          :class="{
            'tbh-planet--vacant-empty': t.purchased,
            'tbh-planet--vacant-unlock': !t.purchased && t.unlockable,
            'tbh-planet--vacant-locked': !t.purchased && !t.unlockable,
          }"
        >
          <svg class="tbh-vacant-ring" viewBox="0 0 100 100">
            <circle class="tbh-vacant-ring-dash" cx="50" cy="50" r="46" />
          </svg>
          <Icon
            v-if="t.purchased"
            class="tbh-vacant-emblem"
            icon="game-icons:planet-core"
            width="30"
            height="30"
          />
          <img v-else src="/img/lock.png" alt="" class="tbh-vacant-lock" draggable="false" />
          <span v-if="t.purchased || t.unlockable" class="tbh-vacant-pill">＋</span>
        </div>

        <!-- Vacant-Plate seitlich — gleiche Anker-Position wie die Info-Plate
             der befüllten Slots; leere Slots zeigen den Zuweisungs-Hinweis,
             gesperrte den Freischalt-Preis -->
        <div v-if="!t.filled" class="tbh-plate-anchor tbh-vacant-plate-anchor">
          <div
            class="tbh-vacant-plate"
            :class="{ 'tbh-vacant-plate--locked': !t.purchased && !t.unlockable }"
          >
            <span class="tbh-vacant-name">
              Slot {{ t.slotNum }}<template v-if="t.purchased"> · Vacant</template>
            </span>
            <span v-if="t.purchased" class="tbh-vacant-hint">Assign a planet</span>
            <span v-else class="tbh-vacant-hint tbh-vacant-hint--cost">
              <img src="/img/BardAbilities/BardChime.png" class="tbh-vacant-chime" alt="" />
              {{ formatNumber(t.cost) }}
            </span>
          </div>
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
import { playerSlotInForeground } from '@/utils/foregroundGate'
import { Icon } from '@iconify/vue'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { useUiStore } from '@/stores/uiStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { formatNumber } from '@/config/numberFormat'
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
const uiStore = useUiStore()

const VACANT_COLOR = '#8a8070'

// Klick auf einen Slot: Fight-Modal schließen (liegt über dem Profil-Menü)
// und den Planets-Tab mit vorausgewähltem Slot öffnen — gleiches Verhalten
// wie das Planet-Dock im Command Panel (inkl. Kauf-Versuch bei gesperrten
// Slots). Die Stern-ID wird als Battle-Return-Kontext gemerkt (Muster wie
// openRolePicker in RoleStrikerSquad).
function onSlotClick(t: SlotEntry) {
  const starGroupStore = useStarGroupStore()
  const starId = starGroupStore.activeFightStarId
  if (starId) uiStore.setBattleReturn(starId)
  starGroupStore.closeStarFightModal()
  uiStore.requestOpenPlanetsTab(t.slotId)
  if (!t.purchased) {
    planetShopStore.buySlot(t.slotId)
  }
}

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
  purchased: boolean
  unlockable: boolean
  cost: number
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
  planetShopStore.slots.map((s, index) => {
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
      purchased: s.purchased,
      unlockable: !s.purchased && planetShopStore.canUnlockPlanetSlot(index),
      cost: planetShopStore.getSlotCost(s.id),
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
      yPct: Math.round((TURRET_ARC_CENTER_Y_PCT + Math.sin(rad) * TURRET_ARC_RY_PCT) * 10) / 10,
    }
  }),
)

// Nur Turret-Slots feuern Volleys und tragen Cooldown-Ringe
const turretEntries = computed(() => entries.value.filter((e) => e.isTurret))

// ── Eclipse-Zustand: 2Hz-Tick liest die nicht-reaktive Positions-Map —
// Planeten hinter der Sonne kämpfen nicht und werden nicht getroffen
const behindTick = ref(0)
let behindInterval: number | null = null

const behindSlotIds = computed(() => {
  void behindTick.value
  const behind = new Set<string>()
  for (const e of entries.value) {
    if (e.filled && !playerSlotInForeground(e.slotId)) behind.add(e.slotId)
  }
  return behind
})

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
      // Reticle verschwindet exakt beim Einschlag des Bolts
      later(BOSS_AUTO_HIT_DELAY_MS + 80, () => {
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

// ── Cooldown-Ringe auf Mini-Canvases IN den Einheiten — sie schnipsen als
// Kinder des transformierten .tbh-unit gratis mit der Snap-Animation mit,
// und pro Frame werden nur ~90×90px pro Turret repaintet statt eines
// arena-großen Layers (voller Clear + Textur-Upload jede Frame = FPS-Killer)
const ringCanvases = new Map<string, HTMLCanvasElement>()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const TWO_PI = Math.PI * 2
// Rand um den Ring für Glüh-Spitze (r 3) + halbe Strichstärke (1.5)
const RING_CANVAS_PAD = 5
let lastVolleyMs = Date.now()
let ringAnimFrame = 0

function setRingCanvas(slotId: string, el: unknown) {
  if (el instanceof HTMLCanvasElement) {
    ringCanvases.set(slotId, el)
    startRingLoop()
  } else {
    ringCanvases.delete(slotId)
    if (ringCanvases.size === 0) stopRingLoop()
  }
}

function startRingLoop() {
  // Bei reduced motion steht der Ring statisch voll — einmal zeichnen reicht
  if (reducedMotion) {
    drawRings()
    return
  }
  if (!ringAnimFrame) ringAnimFrame = requestAnimationFrame(drawRings)
}

function stopRingLoop() {
  cancelAnimationFrame(ringAnimFrame)
  ringAnimFrame = 0
}

function drawRings() {
  // Radius folgt der CSS-Planetengröße: clamp(54px, 7vh, 76px) / 2 + Saum
  const planetPx = Math.max(54, Math.min(76, window.innerHeight * 0.07))
  const r = planetPx / 2 + 7
  const side = Math.round(r + RING_CANVAS_PAD) * 2
  const progress = reducedMotion
    ? 1
    : Math.min(1, (Date.now() - lastVolleyMs) / GAME_TICK_INTERVAL_MS)

  for (const [slotId, cv] of ringCanvases) {
    // Backing-Store folgt der Viewport-Höhe (7vh) — billiger Check pro Frame
    if (cv.width !== side) {
      cv.width = side
      cv.height = side
    }
    const c = cv.getContext('2d')
    if (!c) continue
    c.clearRect(0, 0, side, side)

    // Turrets hinter der Sonne pausieren — kein Cooldown-Ring
    if (behindSlotIds.value.has(slotId)) continue
    const cx = side / 2
    const cy = side / 2

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
  if (!reducedMotion) ringAnimFrame = requestAnimationFrame(drawRings)
}

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
    // Turrets hinter der Sonne feuern nicht
    if (behindSlotIds.value.has(t.slotId)) continue
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
  resizeObserver = new ResizeObserver((observed) => {
    const rect = observed[0]?.contentRect
    if (rect) arenaSize.value = { w: rect.width, h: rect.height }
  })
  behindInterval = window.setInterval(() => {
    behindTick.value++
  }, 500)
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
  if (behindInterval) window.clearInterval(behindInterval)
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

/* Einheit = Planet-Box (Plate ist absolut) — Schnips bewegt beides zusammen.
   Klickbar: öffnet den Planets-Tab mit vorausgewähltem Slot (wie das
   Command-Panel-Dock), daher pointer-events trotz HUD-Root wieder an */
.tbh-unit {
  position: relative;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.tbh-unit:hover {
  transform: translateY(-1px);
}
.tbh-unit:active {
  transform: translateY(0) scale(0.96);
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

/* ── Eclipse: Planet hinter der Sonne — gedimmt, kämpft nicht ────────────── */
.tbh-planet--eclipsed {
  opacity: 0.5;
  filter: grayscale(55%);
  transition:
    opacity 0.4s ease,
    filter 0.4s ease;
}

/* Medaillon-Design identisch zum Command Panel (cmd-eclipse-medal) */
.tbh-eclipse {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 35% 30%, rgba(38, 26, 8, 0.95), rgba(10, 7, 3, 0.95));
  border: 2px solid #5c3310;
  box-shadow:
    0 0 0 1px rgba(200, 144, 64, 0.35),
    0 0 12px rgba(232, 192, 64, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.7);
  color: #e8c040;
  z-index: 4;
  pointer-events: none;
  animation: tbh-eclipse-breathe 1.6s ease-in-out infinite alternate;
}
.tbh-eclipse :deep(svg) {
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.55));
}

@keyframes tbh-eclipse-breathe {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

/* ── Leerer Slot — Zustandssprache 1:1 vom Command-Panel-Dock ───────────── */
.tbh-planet--vacant {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 50%;
}

.tbh-planet--vacant::before {
  display: none;
}

/* Gekauft, aber noch kein Planet zugewiesen — Geister-Platzhalter im Stil
   der Striker-Vacants (rsq-vacant): gestrichelter Kreis mit subtilem grünen
   Kern-Glow, geisterhaftes Planet-Emblem, rotierender Warte-Ring, ＋-Pill */
.tbh-planet--vacant-empty {
  border: 2px dashed rgba(110, 192, 64, 0.45);
  background:
    radial-gradient(circle at 50% 42%, rgba(82, 184, 48, 0.1) 0%, transparent 68%),
    rgba(8, 5, 2, 0.72);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    inset 0 0 18px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}
.tbh-unit:hover .tbh-planet--vacant-empty {
  border-style: solid;
  border-color: rgba(110, 192, 64, 0.85);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 16px rgba(82, 184, 48, 0.4),
    inset 0 0 18px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
}

/* Geister-Planet-Emblem — "hier gehört ein Planet hin", atmet leise */
.tbh-vacant-emblem {
  color: #6ec040;
  opacity: 0.35;
  filter: grayscale(0.5);
  animation: tbh-vacant-breathe 2.8s ease-in-out infinite alternate;
}
.tbh-unit:hover .tbh-vacant-emblem {
  /* Breathe-Animation aus, sonst überschreiben ihre Keyframes die Opacity */
  animation: none;
  opacity: 0.65;
  filter: grayscale(0);
  transform: scale(1.06);
}

@keyframes tbh-vacant-breathe {
  from {
    opacity: 0.22;
    transform: scale(0.95);
  }
  to {
    opacity: 0.48;
    transform: scale(1.04);
  }
}

/* Gestrichelter Warte-Ring — rotiert langsam (nur transform, GPU) */
.tbh-vacant-ring {
  position: absolute;
  inset: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 10px);
  pointer-events: none;
  animation: tbh-vacant-spin 14s linear infinite;
  will-change: transform;
}

.tbh-vacant-ring-dash {
  fill: none;
  stroke: rgba(110, 192, 64, 0.5);
  stroke-width: 3;
  stroke-dasharray: 7 11;
  stroke-linecap: round;
  transition: stroke 0.18s ease;
}
.tbh-unit:hover .tbh-vacant-ring-dash {
  stroke: rgba(144, 224, 80, 0.85);
}

@keyframes tbh-vacant-spin {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}

/* ＋-Pill am unteren Kreisrand — lädt zum Zuweisen ein (wie rsq-vacant-pill) */
.tbh-vacant-pill {
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  min-width: 26px;
  padding: 1px 7px;
  border-radius: 9px;
  text-align: center;
  background: linear-gradient(to bottom, rgba(46, 122, 26, 0.55), #0c0803);
  border: 1px solid rgba(110, 192, 64, 0.6);
  box-shadow:
    0 0 8px rgba(82, 184, 48, 0.3),
    0 2px 5px rgba(0, 0, 0, 0.75);
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1.1;
  color: #b8f088;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.6);
  z-index: 3;
  animation: tbh-vacant-pill-pulse 1.6s ease-in-out infinite alternate;
}
.tbh-unit:hover .tbh-vacant-pill {
  animation: none;
  opacity: 1;
  color: #d8ffb0;
  border-color: #6ec040;
}

@keyframes tbh-vacant-pill-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* Vacant-Plate-Anker ohne translateY(-50%): der Transform würde die Karte
   auf Halb-Pixel schieben und das pixelige Chime-Icon unscharf rendern —
   Flex-Zentrierung über die volle Slot-Höhe wird dagegen pixel-gesnappt */
.tbh-vacant-plate-anchor {
  top: 0;
  bottom: 0;
  transform: none;
  display: flex;
  align-items: center;
}

/* Vacant-Plate seitlich neben dem Slot — gestrichelte, gedimmte Karte mit
   Goldlinien-Echo oben (wie rsq-vacant-plate, aber am Plate-Anker der HUD) */
.tbh-vacant-plate {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 82px;
  padding: 4px 10px 5px;
  border-radius: 4px;
  background: rgba(8, 5, 2, 0.82);
  border: 1px dashed rgba(110, 192, 64, 0.4);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
  transition: border-color 0.18s ease;
}

.tbh-vacant-plate::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 4px 4px 0 0;
  opacity: 0.55;
  background: linear-gradient(to right, transparent, #8ed060, transparent);
}

.tbh-unit:hover .tbh-vacant-plate {
  border-color: rgba(144, 224, 80, 0.7);
}

.tbh-vacant-name {
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: rgba(240, 230, 204, 0.6);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
}

.tbh-vacant-hint {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: rgba(144, 224, 80, 0.7);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  transition: color 0.18s ease;
}
.tbh-unit:hover .tbh-vacant-hint {
  color: #c8f0a0;
}

/* Preis-Zeile in der Plate (unlock/locked) — Gold statt Grün, mit Chime */
.tbh-vacant-hint--cost {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
}
.tbh-unit:hover .tbh-vacant-hint--cost {
  color: #f0d060;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.6);
}

/* Locked-Plate: graue Variante der Vacant-Karte */
.tbh-vacant-plate--locked {
  border-color: rgba(138, 128, 112, 0.35);
}
.tbh-vacant-plate--locked::before {
  background: linear-gradient(to right, transparent, #8a8070, transparent);
}
.tbh-unit:hover .tbh-vacant-plate--locked {
  border-color: rgba(170, 160, 140, 0.6);
}

/* Freischaltbar — gleicher Geister-Look, aber mit Kauf-Puls: das Schloss
   sitzt mittig, der grüne Puls signalisiert "jetzt leistbar" */
.tbh-planet--vacant-unlock {
  border: 2px dashed rgba(110, 192, 64, 0.55);
  background:
    radial-gradient(circle at 50% 42%, rgba(82, 184, 48, 0.12) 0%, transparent 68%),
    rgba(8, 5, 2, 0.72);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    inset 0 0 18px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
  animation: tbh-afford-pulse 2.2s ease-in-out infinite;
}
.tbh-unit:hover .tbh-planet--vacant-unlock {
  border-style: solid;
  border-color: #6ec040;
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    0 0 18px rgba(110, 192, 64, 0.6),
    inset 0 0 18px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
  animation: none;
}

/* Gesperrt — gleicher Geister-Look in Grau, gedimmt mit Schloss */
.tbh-planet--vacant-locked {
  border: 2px dashed rgba(138, 128, 112, 0.45);
  background:
    radial-gradient(circle at 50% 42%, rgba(138, 128, 112, 0.08) 0%, transparent 68%),
    rgba(8, 5, 2, 0.72);
  box-shadow:
    0 0 0 2px rgba(6, 3, 0, 0.9),
    inset 0 0 18px rgba(0, 0, 0, 0.8),
    0 5px 12px rgba(0, 0, 0, 0.7);
  opacity: 0.6;
  filter: grayscale(40%);
  transition:
    border-color 0.18s ease,
    opacity 0.18s ease;
}
.tbh-unit:hover .tbh-planet--vacant-locked {
  border-color: rgba(170, 160, 140, 0.7);
  opacity: 0.8;
}

/* Ring-Farbe je Zustand: grün (empty/unlock, Default) · grau (locked) */
.tbh-planet--vacant-locked .tbh-vacant-ring-dash {
  stroke: rgba(138, 128, 112, 0.4);
}
.tbh-unit:hover .tbh-planet--vacant-locked .tbh-vacant-ring-dash {
  stroke: rgba(170, 160, 140, 0.65);
}

/* Schloss mittig im Kreis — das zentrale "Image" der gesperrten Slots */
.tbh-vacant-lock {
  width: 22px;
  height: 22px;
  object-fit: contain;
  opacity: 0.85;
}

.tbh-vacant-chime {
  width: 15px;
  height: 15px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

@keyframes tbh-afford-pulse {
  0%,
  100% {
    border-color: rgba(110, 192, 64, 0.35);
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 6px rgba(110, 192, 64, 0.15),
      inset 0 0 18px rgba(0, 0, 0, 0.8),
      0 5px 12px rgba(0, 0, 0, 0.7);
  }
  50% {
    border-color: #6ec040;
    box-shadow:
      0 0 0 2px rgba(6, 3, 0, 0.9),
      0 0 16px rgba(110, 192, 64, 0.55),
      inset 0 0 18px rgba(0, 0, 0, 0.8),
      0 5px 12px rgba(0, 0, 0, 0.7);
  }
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

/* ── Cooldown-Ring-Canvas — Mini-Canvas mittig ÜBER dem Planeten, als Kind
   der Einheit bewegt es sich mit der Snap-Animation (GPU-Transform) mit;
   Anzeigegröße = Attribut-Größe aus drawRings(), kein CSS-Stretching ──────── */
.tbh-ring-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
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

/* ── Boss-Zielscheibe (Aim-Phase): liegt über dem GANZEN Planeten-Bild —
   rotierendes Reticle-Icon (game-icons:targeting) + pulsierende Tönung ───── */
.tbh-aim-lock {
  position: absolute;
  inset: -9px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 4;
  animation: tbh-aim-in 0.2s ease-out both;
}

/* Reticle-Icon füllt die ganze Zielfläche und dreht sich langsam — der
   drop-shadow-Glow rastert einmal, die Rotation ist reiner GPU-Transform */
.tbh-aim-lock-icon {
  position: absolute;
  inset: 0;
  color: #ff5040;
  filter: drop-shadow(0 0 6px rgba(255, 60, 40, 0.8));
  animation: tbh-aim-spin 2.2s linear infinite;
  will-change: transform;
}

/* Rote Tönung über der kompletten Planetenfläche — pulsiert deutlich */
.tbh-aim-lock::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 60, 40, 0.16) 0%,
    rgba(255, 60, 40, 0.3) 62%,
    rgba(255, 50, 30, 0.55) 100%
  );
  animation: tbh-aim-tint-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes tbh-aim-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes tbh-aim-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes tbh-aim-tint-pulse {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
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
  .tbh-aim-lock,
  .tbh-aim-lock-icon,
  .tbh-aim-lock::after,
  .tbh-comet,
  .tbh-eclipse,
  .tbh-vacant-emblem,
  .tbh-vacant-ring,
  .tbh-vacant-pill,
  .tbh-planet--vacant-unlock {
    animation: none;
  }
}
</style>

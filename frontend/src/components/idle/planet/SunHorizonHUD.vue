<template>
  <!-- Eigene Sonne (= der Spieler) als Horizont am unteren Arena-Rand: eine
       phasengefärbte Kuppel, über der die HP-Leiste und der Phasenname liegen.
       Die Champion-Row steht direkt darüber und folgt derselben Wölbung.
       Reine Anzeige — der Schaden ist autoritativ im roleBehaviorStore
       verrechnet (Shock Nova + Strike).

       Wichtig: der Wurzel-Container hat KEINEN z-index und kein `contain`,
       damit seine Kinder direkt im Stacking-Context der Arena liegen. Nur so
       liegt die Kuppel unter Arena (z1) und Turret-Planeten (z2), während
       HP-Leiste, Zielscheibe und Bolt darüber lesbar bleiben. -->
  <div ref="rootEl" class="sfsun" :style="rootVars" aria-hidden="true">
    <!-- Korona: weicher Schein, der weit über den Kamm in die Arena leuchtet -->
    <span class="sfsun-glow" />

    <!-- Sonnenkuppel — flache Halb-Ellipse, hellster Saum am Kamm -->
    <span class="sfsun-dome" />

    <!-- Kamm-Aufleuchten im Moment eines Treffers (Nova wie Strike) -->
    <span class="sfsun-crest" :class="{ 'sfsun-crest--hit': crestHit }" />

    <!-- HP + Phasenname direkt über dem Kamm -->
    <div class="sfsun-hp">
      <div class="sfsun-hp-head">
        <Icon icon="game-icons:hearts" width="15" height="15" class="sfsun-hp-icon" />
        <span class="sfsun-hp-value">
          {{ formatNumber(Math.ceil(playerStore.currentHP)) }}
          <span class="sfsun-hp-sep">/</span>
          {{ formatNumber(playerStore.maxHP) }}
        </span>
        <span class="sfsun-hp-phase">Sun · {{ phaseName }}</span>
      </div>
      <div class="sfsun-hp-track">
        <div
          class="sfsun-hp-fill"
          :class="{ 'sfsun-hp-fill--low': playerStore.isLow }"
          :style="{ width: hpPct + '%' }"
        />
        <div class="sfsun-hp-ticks" />
      </div>
    </div>

    <!-- Zielmarkierung: der Boss hat die Sonne im Visier (Aim-Phase des
         Strikes). Bewusst KEIN rundes Reticle wie bei Champions/Turrets — ein
         Kreis über dem Kamm würde die HP-Lese verdecken, die nur wenige Pixel
         darüber sitzt. Stattdessen eine zweite, kleinere Kuppel in derselben
         Silhouette, die vollständig UNTER dem Kamm auf der Sonnenoberfläche
         liegt, plus ein roter Glutsaum auf der Kammlinie. -->
    <template v-if="roleBehaviorStore.autoAimSun">
      <span class="sfsun-aim-dome" />
      <span class="sfsun-aim-crest" />
    </template>

    <!-- Strike-Bolt: Projektil vom Boss-Anker senkrecht hinab auf den Kamm -->
    <span
      v-for="b in bolts"
      :key="'bolt-' + b.id"
      class="sfsun-bolt"
      :style="{ '--py': b.py + 'px' }"
    />

    <!-- Schadenszahl über dem Einschlagpunkt -->
    <span v-for="f in floats" :key="'float-' + f.id" class="sfsun-float">-{{ f.value }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { usePlayerStore } from '@/stores/playerStore'
import { useRoleBehaviorStore } from '@/stores/roleBehaviorStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { formatNumber } from '@/config/numberFormat'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  SUN_HORIZON_BAND_MIN_PX,
  SUN_HORIZON_BAND_PCT,
  SUN_HORIZON_BAND_MAX_PX,
  SUN_HORIZON_DOME_MIN_WIDTH_PCT,
  SUN_HORIZON_DOME_MAX_WIDTH_PCT,
  SUN_HORIZON_CREST_MIN_FACTOR,
  SUN_HORIZON_CREST_MAX_FACTOR,
  SUN_HORIZON_GLOW_MIN_PCT,
  SUN_HORIZON_GLOW_MAX_PCT,
  SUN_HORIZON_HIT_FLASH_MS,
  SUN_HORIZON_FLOAT_MS,
  BOSS_WAVE_HIT_DELAY_MS,
  BOSS_AUTO_HIT_DELAY_MS,
} from '@/config/constants'

const playerStore = usePlayerStore()
const roleBehaviorStore = useRoleBehaviorStore()
const solarStore = useSolarUpgradeStore()

const hpPct = computed(() => Math.max(0, Math.min(100, playerStore.hpPercent)))

// ── Phase: Comet ist die Vorstufe und liegt bewusst NICHT in STAR_PHASE_DATA ──
const phaseData = computed(() => STAR_PHASE_DATA[solarStore.starPhase] ?? STAR_PHASE_DATA[0])

const phaseName = computed(() =>
  solarStore.isCometState ? COMET_PHASE_DATA.name : phaseData.value.name,
)

/** 0 = Comet … 1 = Finale — treibt Kuppelbreite, Kammhöhe und Korona. */
const phaseT = computed(() =>
  solarStore.isCometState ? 0 : Math.min(1, (solarStore.starPhase + 1) / STAR_PHASE_DATA.length),
)

// ── Arena-Höhe: der Kamm sitzt in einem geklemmten PX-Band über dem unteren
// Rand. Nur so bleibt der Abstand zur px-großen Champion-Row auf Full-HD wie
// auf 4K gleich (siehe SUN_HORIZON_BAND_* in constants.ts).
const rootEl = ref<HTMLDivElement | null>(null)
const arenaH = ref(0)

const bandPx = computed(() =>
  Math.min(
    Math.max(SUN_HORIZON_BAND_MIN_PX, (arenaH.value * SUN_HORIZON_BAND_PCT) / 100),
    SUN_HORIZON_BAND_MAX_PX,
  ),
)

/** Tatsächliche Kammhöhe über dem unteren Arena-Rand — Anker für ALLES. */
const crestPx = computed(() =>
  Math.round(
    bandPx.value *
      (SUN_HORIZON_CREST_MIN_FACTOR +
        (SUN_HORIZON_CREST_MAX_FACTOR - SUN_HORIZON_CREST_MIN_FACTOR) * phaseT.value),
  ),
)

let resizeObserver: ResizeObserver | null = null

// rootEl existiert erst, wenn das Modal offen ist — Observer dann anbinden
watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (!el) return
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) arenaH.value = rect.height
    })
  }
  resizeObserver.observe(el)
  arenaH.value = el.getBoundingClientRect().height
})

const rootVars = computed<Record<string, string>>(() => {
  const comet = solarStore.isCometState
  const ph = phaseData.value
  const t = phaseT.value
  const lerp = (a: number, b: number) => a + (b - a) * t
  return {
    '--sfsun-core': comet ? COMET_PHASE_DATA.core : ph.core,
    '--sfsun-mid': comet ? COMET_PHASE_DATA.mid : ph.mid,
    '--sfsun-edge': comet ? COMET_PHASE_DATA.edge : ph.edge,
    '--sfsun-glow': comet ? COMET_PHASE_DATA.glow : ph.phaseGlow,
    '--sfsun-pulse': comet ? COMET_PHASE_DATA.pulseSpeed : ph.pulseSpeed,
    '--sfsun-crest-h': `${crestPx.value}px`,
    '--sfsun-dome-w': `${lerp(
      SUN_HORIZON_DOME_MIN_WIDTH_PCT,
      SUN_HORIZON_DOME_MAX_WIDTH_PCT,
    ).toFixed(1)}%`,
    '--sfsun-glow-h': `${lerp(SUN_HORIZON_GLOW_MIN_PCT, SUN_HORIZON_GLOW_MAX_PCT).toFixed(1)}%`,
  }
})

// ── Treffer-Feedback: Kamm-Flash + Schadenszahl ───────────────────────────────
const timeouts: number[] = []

function later(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

const crestHit = ref(false)

interface SunFloat {
  id: number
  value: number
}
const floats = ref<SunFloat[]>([])
let floatId = 0

function registerHit(value: number) {
  // Klasse abräumen und im nächsten Frame neu setzen, damit die
  // Flash-Animation bei schnellen Folgetreffern wirklich neu startet
  crestHit.value = false
  requestAnimationFrame(() => {
    crestHit.value = true
    later(SUN_HORIZON_HIT_FLASH_MS, () => {
      crestHit.value = false
    })
  })
  const id = ++floatId
  floats.value.push({ id, value })
  later(SUN_HORIZON_FLOAT_MS, () => {
    floats.value = floats.value.filter((f) => f.id !== id)
  })
}

// Shock Nova: trifft die Sonne, sobald die Schockwelle sie optisch erreicht —
// derselbe Delay wie bei Champions und Turret-Planeten
watch(
  () => roleBehaviorStore.sunHitAt,
  (at) => {
    if (!at) return
    const dmg = roleBehaviorStore.sunHitDmg
    later(BOSS_WAVE_HIT_DELAY_MS, () => registerHit(dmg))
  },
)

// ── Strike: Bolt vom Boss-Anker auf den Kamm, Flash + Zahl beim Einschlag ─────
interface SunBolt {
  id: number
  py: number
}
const bolts = ref<SunBolt[]>([])
let boltId = 0

watch(
  () => roleBehaviorStore.autoCounter,
  () => {
    if (!roleBehaviorStore.autoTargetSun) return
    const dmg = roleBehaviorStore.autoDmg
    const h = arenaH.value

    if (h > 0) {
      const id = ++boltId
      // Flugstrecke: Boss-Anker (41 % der Arena-Höhe) → Kamm (Höhe − Kammhöhe)
      bolts.value.push({
        id,
        py: Math.round(h - crestPx.value - (STRIKER_BOSS_ANCHOR_Y_PCT / 100) * h),
      })
      later(BOSS_AUTO_HIT_DELAY_MS + 80, () => {
        bolts.value = bolts.value.filter((b) => b.id !== id)
      })
    }

    later(BOSS_AUTO_HIT_DELAY_MS, () => registerHit(dmg))
  },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  timeouts.forEach(window.clearTimeout)
  timeouts.length = 0
})
</script>

<style scoped>
/* Kein z-index und kein `contain` auf der Wurzel — beides würde einen eigenen
   Stacking-Context öffnen und alle Kinder gemeinsam über oder unter Arena,
   Turret-HUD und Champion-Squad schieben. */
.sfsun {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* ── Sonnenkuppel ───────────────────────────────────────────────────────────
   Flache Halb-Ellipse auf dem Arena-Boden: Breite = --sfsun-dome-w (% der
   Arena-Breite), Scheitel = --sfsun-crest-h über dem unteren Rand. Der
   Radialverlauf nutzt EXAKT dieselbe Ellipse als Mittelpunkt/Radien, seine
   Iso-Linien laufen also parallel zum Kamm — dadurch liegt der gleißende Saum
   sauber auf der Silhouette statt als waagerechtes Band darüber. */
.sfsun-dome {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--sfsun-dome-w, 90%);
  height: var(--sfsun-crest-h, 84px);
  transform: translateX(-50%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  z-index: 0;
  background: radial-gradient(
    ellipse 50% 100% at 50% 100%,
    #160a04 0%,
    color-mix(in srgb, var(--sfsun-edge, #cc5500) 55%, #160a04) 58%,
    var(--sfsun-edge, #cc5500) 78%,
    var(--sfsun-mid, #ffb347) 90%,
    var(--sfsun-core, #fff0c0) 97%,
    color-mix(in srgb, white 90%, var(--sfsun-core, #fff0c0)) 100%
  );
  /* Nur opacity animiert — der Verlauf wird EINMAL gerastert */
  animation: sfsun-pulse var(--sfsun-pulse, 4s) ease-in-out infinite;
  will-change: opacity;
}

/* ── Korona über dem Kamm — wächst mit der Phase in die Arena hinein ───────── */
.sfsun-glow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 130%;
  height: var(--sfsun-glow-h, 30%);
  transform: translateX(-50%);
  z-index: 0;
  background: radial-gradient(
    ellipse 60% 100% at 50% 100%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 42%, transparent) 0%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 14%, transparent) 42%,
    transparent 72%
  );
  animation: sfsun-breathe 5s ease-in-out infinite alternate;
  will-change: opacity;
}

/* ── Kamm-Aufleuchten beim Treffer — heißer Lichtbogen auf der Kammlinie ───── */
.sfsun-crest {
  position: absolute;
  left: 50%;
  bottom: var(--sfsun-crest-h, 84px);
  width: 46%;
  height: 64px;
  transform: translate(-50%, 50%);
  z-index: 1;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 50%,
    color-mix(in srgb, white 72%, var(--sfsun-glow, #ff8c00)) 0%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 45%, transparent) 46%,
    transparent 74%
  );
  opacity: 0;
}

.sfsun-crest--hit {
  animation: sfsun-crest-fade 0.42s ease-out forwards;
}

@keyframes sfsun-crest-fade {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes sfsun-pulse {
  0%,
  100% {
    opacity: 0.94;
  }
  50% {
    opacity: 1;
  }
}

@keyframes sfsun-breathe {
  from {
    opacity: 0.85;
  }
  to {
    opacity: 1;
  }
}

/* ── HP + Phasenname direkt über dem Kamm ───────────────────────────────────
   z-index 3 = Ebene des Ziel-HUDs: liegt über den Turret-Planeten (z2) und
   bleibt damit auch vor der hellen Kuppel lesbar. */
.sfsun-hp {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sfsun-crest-h, 84px) + 12px);
  transform: translateX(-50%);
  width: 320px;
  max-width: 46%;
  z-index: 3;
}

.sfsun-hp-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 5px;
}

.sfsun-hp-icon {
  color: #cc6050;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(220, 40, 18, 0.9));
}

.sfsun-hp-value {
  font-size: 0.88rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-shadow:
    0 0 12px rgba(220, 175, 40, 0.7),
    0 1px 2px rgba(0, 0, 0, 0.9);
}

.sfsun-hp-sep {
  color: #7a5820;
  font-weight: 400;
  letter-spacing: 0;
  margin: 0 2px;
}

.sfsun-hp-phase {
  margin-left: 4px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #e8b070;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.sfsun-hp-track {
  position: relative;
  width: 100%;
  height: 11px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.55);
  box-shadow:
    inset 0 1px 4px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(80, 40, 8, 0.45);
  overflow: hidden;
}

.sfsun-hp-fill {
  position: relative;
  height: 100%;
  background: linear-gradient(90deg, #620b05 0%, #a81206 30%, #d41e0e 68%, #f83820 100%);
  box-shadow: 0 0 10px rgba(240, 52, 18, 0.65);
  transition: width 0.4s ease;
}

/* Low-HP-Puls über opacity statt animiertem box-shadow (kein Repaint/Frame) */
.sfsun-hp-fill--low {
  animation: sfsun-hp-low 0.75s ease-in-out infinite alternate;
}

@keyframes sfsun-hp-low {
  from {
    opacity: 0.65;
  }
  to {
    opacity: 1;
  }
}

/* Segmentlinien bei 25 / 50 / 75 % — gleiche Lesart wie die PlayerHPBar */
.sfsun-hp-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) calc(25% - 0.5px),
    rgba(0, 0, 0, 0.45) 25%
  );
  z-index: 2;
  pointer-events: none;
}

/* ── Zielmarkierung des Strikes ─────────────────────────────────────────────
   Zweite Kuppel in derselben Silhouette wie .sfsun-dome, nur schmaler und
   flacher: sie liegt vollständig unter dem Kamm auf der Sonnenoberfläche und
   lässt damit die HP-Leiste (nur ~10 px über dem Kamm) frei. Gestrichelte
   Kontur + rote Tönung übernehmen die Signatur der Champion-/Turret-Reticles. */
.sfsun-aim-dome {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 44%;
  height: var(--sfsun-crest-h, 84px);
  transform: translateX(-50%);
  border: 2px dashed rgba(255, 90, 60, 0.85);
  border-bottom: none;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: radial-gradient(
    ellipse 50% 100% at 50% 100%,
    rgba(255, 50, 30, 0.5) 0%,
    rgba(255, 60, 40, 0.26) 62%,
    rgba(255, 60, 40, 0.12) 100%
  );
  box-shadow: 0 0 18px rgba(255, 60, 40, 0.45);
  z-index: 2;
  animation: sfsun-aim-tint 0.6s ease-in-out infinite alternate;
  will-change: opacity;
}

/* Glutsaum auf der Kammlinie — signalisiert "hier schlägt es ein" */
.sfsun-aim-crest {
  position: absolute;
  left: 50%;
  bottom: var(--sfsun-crest-h, 84px);
  width: 46%;
  height: 26px;
  transform: translate(-50%, 50%);
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(255, 120, 90, 0.85) 0%,
    rgba(255, 60, 40, 0.45) 45%,
    transparent 74%
  );
  z-index: 2;
  animation: sfsun-aim-tint 0.6s ease-in-out infinite alternate-reverse;
  will-change: opacity;
}

@keyframes sfsun-aim-tint {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 1;
  }
}

/* ── Strike-Bolt: derselbe Bone-Silber-Komet wie bei Champions/Turrets ─────── */
.sfsun-bolt {
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
  z-index: 5;
  /* Flugzeit = BOSS_AUTO_HIT_DELAY_MS (0.45s) */
  animation: sfsun-bolt-fly 0.45s cubic-bezier(0.4, 0, 0.7, 0.5) forwards;
  will-change: transform, opacity;
}

@keyframes sfsun-bolt-fly {
  0% {
    opacity: 0.4;
    transform: translateY(0) scale(0.4);
  }
  15% {
    opacity: 1;
    transform: translateY(calc(var(--py) * 0.06)) scale(1);
  }
  100% {
    opacity: 1;
    transform: translateY(var(--py)) scale(1.25);
  }
}

/* ── Schadenszahl über dem Kamm — Crit-Slam wie bei Champions/Turrets ──────── */
.sfsun-float {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sfsun-crest-h, 84px) + 54px);
  transform: translateX(-50%);
  z-index: 5;
  font-size: 1.6rem;
  font-weight: 900;
  color: #ff8a70;
  -webkit-text-stroke: 4px rgba(30, 2, 0, 0.92);
  paint-order: stroke fill;
  white-space: nowrap;
  text-shadow:
    0 0 14px rgba(255, 60, 30, 0.95),
    0 0 34px rgba(230, 40, 20, 0.55),
    0 2px 4px rgba(0, 0, 0, 0.95);
  animation: sfsun-float-slam 1.2s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
  will-change: transform, opacity;
}

/* Ring-Burst hinter der Zahl im Moment des Einschlags */
.sfsun-float::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 58px;
  height: 58px;
  margin: -29px 0 0 -29px;
  border-radius: 50%;
  border: 2px solid rgba(255, 80, 40, 0.75);
  box-shadow: 0 0 16px rgba(255, 60, 30, 0.5);
  animation: sfsun-float-ring 0.5s ease-out forwards;
  z-index: -1;
}

@keyframes sfsun-float-ring {
  0% {
    opacity: 0.9;
    transform: scale(0.3);
  }
  100% {
    opacity: 0;
    transform: scale(1.8);
  }
}

@keyframes sfsun-float-slam {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(2.4) rotate(-6deg);
  }
  16% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(0.92) rotate(3deg);
  }
  28% {
    transform: translateX(-50%) translateY(-4px) scale(1.12) rotate(-1deg);
  }
  45% {
    transform: translateX(-50%) translateY(-12px) scale(1) rotate(0deg);
  }
  /* Bewusst kurzer Steigflug: darüber beginnt bereits die Info-Plate des
     Mid-Champions (gleiche x-Spalte), die der Float sonst durchquert */
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-38px) scale(0.85);
  }
}

/* ── Kompakt-Layout für Full-HD-Höhen ──────────────────────────────────────
   Der Kamm selbst skaliert über das PX-Band mit; hier schrumpfen nur
   HP-Streifen, Kamm-Flash und Floats, damit sie der flacheren Arena nicht in
   die Champion-Row laufen. */
@media (max-height: 1100px) {
  .sfsun-hp {
    width: 280px;
    bottom: calc(var(--sfsun-crest-h, 84px) + 9px);
  }

  .sfsun-hp-head {
    margin-bottom: 4px;
  }

  .sfsun-hp-value {
    font-size: 0.8rem;
  }

  .sfsun-hp-phase {
    font-size: 0.56rem;
  }

  .sfsun-hp-track {
    height: 9px;
  }

  .sfsun-crest {
    height: 48px;
  }

  .sfsun-float {
    font-size: 1.3rem;
    bottom: calc(var(--sfsun-crest-h, 84px) + 38px);
  }
}

/* ── Große Auflösungen (2K/4K): HP-Streifen und Phasenname mitwachsen lassen —
   bei fixen 320 px wirkt der Balken auf einer 1660-px-Arena verloren. */
@media (min-height: 1300px) {
  .sfsun-hp {
    width: 420px;
    bottom: calc(var(--sfsun-crest-h, 84px) + 16px);
  }

  .sfsun-hp-head {
    gap: 8px;
    margin-bottom: 7px;
  }

  .sfsun-hp-value {
    font-size: 1.1rem;
  }

  .sfsun-hp-phase {
    font-size: 0.78rem;
  }

  .sfsun-hp-track {
    height: 14px;
  }

  .sfsun-float {
    font-size: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfsun-dome,
  .sfsun-glow,
  .sfsun-crest--hit,
  .sfsun-hp-fill--low,
  .sfsun-aim-dome,
  .sfsun-aim-crest,
  .sfsun-bolt,
  .sfsun-float,
  .sfsun-float::before {
    animation: none;
  }
}
</style>

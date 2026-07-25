<template>
  <!-- Eigene Sonne (= der Spieler) als exakter Halbkreis am unteren Arena-Rand:
       eine Kreisscheibe, deren Mittelpunkt auf dem Boden liegt — sichtbar ist
       damit genau die obere Hälfte. Jede Phase (Comet eingeschlossen) nutzt
       dieselbe Silhouette, nur der Radius wächst. Darüber die HP-Leiste, dann
       die Champion-Row. Reine Anzeige — der Schaden ist autoritativ im
       roleBehaviorStore verrechnet (Shock Nova + Strike).

       Wichtig: der Wurzel-Container hat KEINEN z-index und kein `contain`,
       damit seine Kinder direkt im Stacking-Context der Arena liegen. Nur so
       liegt die Kuppel unter Arena (z1) und Turret-Planeten (z2), während
       HP-Leiste, Zielscheibe und Bolt darüber lesbar bleiben. -->
  <div
    ref="rootEl"
    class="sfsun"
    :class="{ 'sfsun--comet': solarStore.isCometState }"
    :style="rootVars"
    aria-hidden="true"
  >
    <!-- Korona: weicher Halo, der die Kuppel umschließt -->
    <span class="sfsun-glow" />

    <!-- Sonnenkuppel — obere Hälfte einer Kreisscheibe auf dem Arena-Boden -->
    <span class="sfsun-dome" />

    <!-- Kamm-Aufleuchten im Moment eines Treffers (Nova wie Strike) -->
    <span class="sfsun-crest" :class="{ 'sfsun-crest--hit': crestHit }" />

    <!-- HP direkt über dem Kamm — nur xx / yy, mittig über der Kuppel -->
    <div class="sfsun-hp">
      <div class="sfsun-hp-head">
        <Icon icon="game-icons:hearts" width="15" height="15" class="sfsun-hp-icon" />
        <span class="sfsun-hp-value">
          {{ formatNumber(Math.ceil(playerStore.currentHP)) }}
          <span class="sfsun-hp-sep">/</span>
          {{ formatNumber(playerStore.maxHP) }}
        </span>
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
         Strikes). Genau derselbe Telegraph wie bei Champions (rsq-aim-lock) und
         Turret-Planeten (tbh-aim-lock): rotierendes game-icons:targeting über
         dem GANZEN Ziel plus pulsierende rote Tönung. Das Reticle ist
         konzentrisch zur Sonnenscheibe — sein Mittelpunkt liegt wie der
         Scheibenmittelpunkt auf dem Arena-Boden, die untere Hälfte wird vom
         Horizont beschnitten. -->
    <span v-if="roleBehaviorStore.autoAimSun" class="sfsun-aim-lock">
      <Icon icon="game-icons:targeting" class="sfsun-aim-lock-icon" width="100%" height="100%" />
    </span>

    <!-- Strike-Bolt: Projektil vom Boss-Anker senkrecht hinab auf den Kamm -->
    <span
      v-for="b in bolts"
      :key="'bolt-' + b.id"
      class="sfsun-bolt"
      :style="{ '--py': b.py + 'px' }"
    />

    <!-- Schadenszahl auf der getroffenen Sonnenoberfläche -->
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
  SUN_HORIZON_DOME_WIDTH_FACTOR,
  SUN_HORIZON_CREST_MIN_FACTOR,
  SUN_HORIZON_CREST_MAX_FACTOR,
  SUN_HORIZON_GLOW_WIDTH_FACTOR,
  SUN_HORIZON_GLOW_HEIGHT_FACTOR,
  SUN_HORIZON_HP_MIN_WIDTH_PX,
  SUN_HORIZON_HP_GAP_PX,
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

/** 0 = Comet … 1 = Finale — treibt den Radius des Halbkreises. */
const phaseT = computed(() =>
  solarStore.isCometState ? 0 : Math.min(1, (solarStore.starPhase + 1) / STAR_PHASE_DATA.length),
)

// ── Arena-Höhe: der Radius sitzt in einem geklemmten PX-Band. Nur so bleibt der
// Abstand zur px-großen Champion-Row auf Full-HD wie auf 4K gleich
// (siehe SUN_HORIZON_BAND_* in constants.ts).
const rootEl = ref<HTMLDivElement | null>(null)
const arenaH = ref(0)

const bandPx = computed(() =>
  Math.min(
    Math.max(SUN_HORIZON_BAND_MIN_PX, (arenaH.value * SUN_HORIZON_BAND_PCT) / 100),
    SUN_HORIZON_BAND_MAX_PX,
  ),
)

/** Radius der Sonnenscheibe = Kammhöhe über dem Arena-Boden — Anker für ALLES. */
const crestPx = computed(() =>
  Math.round(
    bandPx.value *
      (SUN_HORIZON_CREST_MIN_FACTOR +
        (SUN_HORIZON_CREST_MAX_FACTOR - SUN_HORIZON_CREST_MIN_FACTOR) * phaseT.value),
  ),
)

/** Kuppelbreite — beim Halbkreis exakt der doppelte Radius. */
const domeWidthPx = computed(() => crestPx.value * SUN_HORIZON_DOME_WIDTH_FACTOR)

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
  const r = crestPx.value
  const d = domeWidthPx.value
  return {
    '--sfsun-core': comet ? COMET_PHASE_DATA.core : ph.core,
    '--sfsun-mid': comet ? COMET_PHASE_DATA.mid : ph.mid,
    '--sfsun-edge': comet ? COMET_PHASE_DATA.edge : ph.edge,
    '--sfsun-glow': comet ? COMET_PHASE_DATA.glow : ph.phaseGlow,
    '--sfsun-pulse': comet ? COMET_PHASE_DATA.pulseSpeed : ph.pulseSpeed,
    // Nur der Comet braucht eine eigene Krater-/Vergoldungs-Palette
    '--sfsun-crater': COMET_PHASE_DATA.crater,
    '--sfsun-accent': COMET_PHASE_DATA.accent,
    // r = Radius = Kammhöhe, d = Kuppelbreite (2 r) — alles hängt daran
    '--sfsun-r': `${r}px`,
    '--sfsun-d': `${d}px`,
    '--sfsun-glow-w': `${Math.round(d * SUN_HORIZON_GLOW_WIDTH_FACTOR)}px`,
    '--sfsun-glow-h': `${Math.round(r * SUN_HORIZON_GLOW_HEIGHT_FACTOR)}px`,
    '--sfsun-hp-w': `${Math.max(SUN_HORIZON_HP_MIN_WIDTH_PX, d)}px`,
    '--sfsun-hp-gap': `${SUN_HORIZON_HP_GAP_PX}px`,
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
   Exakter Halbkreis auf dem Arena-Boden: Breite = 2 × Radius, Höhe = Radius,
   `border-radius: 50% 50% 0 0 / 100% 100% 0 0` ergibt bei diesem Seitenverhältnis
   eine echte Kreishälfte. Der Radialverlauf ist ein KREIS mit demselben Radius
   und demselben Mittelpunkt (Bodenmitte) — seine Iso-Linien laufen also parallel
   zur Silhouette, wie auf der Orbit-Sonnenscheibe (PhaseSunDisc). */
.sfsun-dome {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--sfsun-d, 200px);
  height: var(--sfsun-r, 100px);
  transform: translateX(-50%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  z-index: 0;
  background:
    /* Glanzpunkt oben links — gleiche Lichtsetzung wie PhaseSunDisc */
    radial-gradient(
      circle at 34% 60%,
      color-mix(in srgb, white 60%, var(--sfsun-core, #fff0c0)) 0%,
      transparent 32%
    ),
    /* Kern → Rand, konzentrisch zum Scheibenmittelpunkt auf dem Boden */
      radial-gradient(
        circle var(--sfsun-r, 100px) at 50% 100%,
        color-mix(in srgb, white 88%, var(--sfsun-core, #fff0c0)) 0%,
        var(--sfsun-core, #fff0c0) 18%,
        var(--sfsun-mid, #ffb347) 42%,
        var(--sfsun-edge, #cc5500) 68%,
        color-mix(in srgb, var(--sfsun-edge, #cc5500) 72%, #160a04) 100%
      );
  box-shadow: 0 0 32px color-mix(in srgb, var(--sfsun-glow, #ff8c00) 45%, transparent);
  /* Nur opacity animiert — der Verlauf wird EINMAL gerastert */
  animation: sfsun-pulse var(--sfsun-pulse, 4s) ease-in-out infinite;
  will-change: opacity;
}

/* ── Comet: dieselbe Halbkreis-Silhouette, aber kaltes Gestein statt Plasma —
   Krater mit sonnenbeschienenem Rand, Terminator und der Goldschimmer des
   schlafenden Bards (Palette und Lichtsetzung wie CometDisc). Ohne diese
   Überschreibung würde die Plasma-Rampe den dunklen Fels zu einer blassen
   Wand aufhellen. */
.sfsun--comet .sfsun-dome {
  background:
    /* Terminator: Tag-/Nachtgrenze liegt ganz oben und dimmt alles darunter */
    linear-gradient(128deg, transparent 40%, rgba(0, 0, 0, 0.22) 62%, rgba(0, 0, 0, 0.55) 88%),
    /* Goldvene — der Stern erwacht im Inneren */
      linear-gradient(
        112deg,
        transparent 47%,
        color-mix(in srgb, var(--sfsun-accent, #f0d878) 26%, transparent) 50%,
        transparent 53%
      ),
    /* Krater: dunkler Grund + heller Rand versetzt zur Lichtquelle (30 % 40 %) */
      radial-gradient(
        circle at 29.5% 55.5%,
        color-mix(in srgb, var(--sfsun-core, #8a7a68) 50%, white) 0 1.4%,
        transparent 2.2%
      ),
    radial-gradient(circle at 31% 58%, var(--sfsun-crater, #3a322b) 0 5.5%, transparent 6.6%),
    radial-gradient(
        circle at 61.5% 43.5%,
        color-mix(in srgb, var(--sfsun-core, #8a7a68) 42%, white) 0 1.1%,
        transparent 1.8%
      ),
    radial-gradient(circle at 63% 46%, var(--sfsun-crater, #3a322b) 0 4%, transparent 5%),
    radial-gradient(
        circle at 45.5% 76.5%,
        color-mix(in srgb, var(--sfsun-mid, #6b5d4f) 60%, white) 0 0.9%,
        transparent 1.5%
      ),
    radial-gradient(circle at 47% 79%, var(--sfsun-crater, #3a322b) 0 3.2%, transparent 4.2%),
    /* kleine Pockennarben — nur dunkel, ohne Randlicht */
      radial-gradient(circle at 74% 68%, var(--sfsun-crater, #3a322b) 0 1.6%, transparent 2.3%),
    radial-gradient(circle at 20% 82%, var(--sfsun-crater, #3a322b) 0 1.3%, transparent 2%),
    /* Grundfels — Lichtquelle oben links, dunkler Fels nach unten rechts */
      radial-gradient(
        circle calc(var(--sfsun-r, 100px) * 1.2) at 30% 40%,
        var(--sfsun-core, #8a7a68) 0%,
        var(--sfsun-mid, #6b5d4f) 44%,
        var(--sfsun-edge, #4a4038) 78%,
        var(--sfsun-crater, #3a322b) 100%
      );
  box-shadow: 0 0 24px color-mix(in srgb, var(--sfsun-glow, #e8c040) 24%, transparent);
}

/* ── Korona — Halo um die Kuppel, wächst mit ihrem Radius ──────────────────── */
.sfsun-glow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--sfsun-glow-w, 600px);
  height: var(--sfsun-glow-h, 220px);
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

/* ── Treffer-Aufleuchten — der komplette Sonnensaum glüht auf (Nova + Strike) */
.sfsun-crest {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--sfsun-d, 200px);
  height: var(--sfsun-r, 100px);
  transform: translateX(-50%);
  z-index: 1;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: radial-gradient(
    circle var(--sfsun-r, 100px) at 50% 100%,
    transparent 28%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 40%, transparent) 72%,
    color-mix(in srgb, white 72%, var(--sfsun-glow, #ff8c00)) 100%
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

/* ── HP direkt über dem Kamm ─────────────────────────────────────────────────
   z-index 3 = Ebene des Ziel-HUDs: liegt über den Turret-Planeten (z2) und
   bleibt damit auch vor der hellen Kuppel lesbar. Breite folgt der Kuppel
   (mindestens SUN_HORIZON_HP_MIN_WIDTH_PX), damit der Streifen die Sonne
   abschließt statt über sie hinauszuragen. */
.sfsun-hp {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sfsun-r, 100px) + var(--sfsun-hp-gap, 10px));
  transform: translateX(-50%);
  width: var(--sfsun-hp-w, 200px);
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
   Identische Signatur wie bei Champions (.rsq-aim-lock) und Turret-Planeten
   (.tbh-aim-lock): rotierendes game-icons:targeting über dem GANZEN Ziel plus
   pulsierende rote Tönung. Das Reticle ist konzentrisch zur Sonnenscheibe —
   Box = Durchmesser, Mittelpunkt auf dem Arena-Boden; die untere Hälfte
   schneidet der Horizont (overflow: hidden auf .sfsun) weg. */
.sfsun-aim-lock {
  position: absolute;
  left: 50%;
  bottom: calc(-1 * var(--sfsun-r, 100px));
  width: var(--sfsun-d, 200px);
  height: var(--sfsun-d, 200px);
  transform: translateX(-50%);
  z-index: 2;
  animation: sfsun-aim-in 0.2s ease-out both;
}

/* Reticle-Icon füllt die ganze Zielfläche und dreht sich langsam — der
   drop-shadow-Glow rastert einmal, die Rotation ist reiner GPU-Transform */
.sfsun-aim-lock-icon {
  position: absolute;
  inset: 0;
  color: #ff5040;
  filter: drop-shadow(0 0 6px rgba(255, 60, 40, 0.8));
  animation: sfsun-aim-spin 2.2s linear infinite;
  will-change: transform;
}

/* Rote Tönung + glühender Saum auf der Kuppel — die obere Hälfte der Box
   deckt sich exakt mit .sfsun-dome */
.sfsun-aim-lock::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 50%;
  border: 2px solid rgba(255, 90, 60, 0.9);
  border-bottom: none;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: radial-gradient(
    circle var(--sfsun-r, 100px) at 50% 100%,
    rgba(255, 60, 40, 0.16) 0%,
    rgba(255, 60, 40, 0.3) 62%,
    rgba(255, 50, 30, 0.55) 100%
  );
  box-shadow: 0 0 22px rgba(255, 60, 40, 0.5);
  animation: sfsun-aim-tint-pulse 0.6s ease-in-out infinite alternate;
}

@keyframes sfsun-aim-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes sfsun-aim-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes sfsun-aim-tint-pulse {
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

/* ── Schadenszahl AUF der Sonnenoberfläche — Crit-Slam wie bei Champions/
   Turrets. Bewusst unterhalb des Kamms: über dem Kamm liegen HP-Streifen und
   direkt darüber die Info-Plate des Mid-Champions (gleiche x-Spalte). */
.sfsun-float {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sfsun-r, 100px) * 0.34);
  transform: translateX(-50%);
  z-index: 5;
  font-size: 1.6rem;
  font-weight: 900;
  /* Heller als der Champion-Float (#ff8a70): die Zahl steht jetzt auf der
     leuchtenden Sonnenoberfläche, nicht vor dem dunklen Arena-Himmel */
  color: #ffe0d4;
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
   Kuppel, HP-Streifen und Floats hängen am PX-Band und skalieren damit von
   selbst; hier schrumpfen nur die Schriftgrößen, damit der Streifen der
   flacheren Arena nicht in die Champion-Row läuft. */
@media (max-height: 1100px) {
  .sfsun-hp-head {
    margin-bottom: 4px;
  }

  .sfsun-hp-value {
    font-size: 0.8rem;
  }

  .sfsun-hp-track {
    height: 9px;
  }

  .sfsun-float {
    font-size: 1.3rem;
  }
}

/* ── Große Auflösungen (2K/4K): HP-Werte mitwachsen lassen — bei 0.88 rem
   wirkt der Streifen über einer 320-px-Kuppel verloren. */
@media (min-height: 1300px) {
  .sfsun-hp-head {
    gap: 8px;
    margin-bottom: 7px;
  }

  .sfsun-hp-value {
    font-size: 1.1rem;
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
  .sfsun-aim-lock,
  .sfsun-aim-lock-icon,
  .sfsun-aim-lock::after,
  .sfsun-bolt,
  .sfsun-float,
  .sfsun-float::before {
    animation: none;
  }
}
</style>

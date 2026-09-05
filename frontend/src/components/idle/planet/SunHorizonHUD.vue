<template>
  <!-- Eigene Sonne (= der Spieler) als Kreiskalotte am unteren Arena-Rand. Der
       Comet ist ein exakter Halbkreis (Scheibenmittelpunkt auf dem Boden), mit
       jeder Phase wächst die Breite bis zur vollen Arenabreite — der Mittelpunkt
       wandert dabei unter den Boden, die Silhouette bleibt ein echter Kreisbogen.
       Darüber die HP-Leiste, dann die Champion-Row. Reine Anzeige — der Schaden
       ist autoritativ im roleBehaviorStore verrechnet (Shock Nova + Strike).

       Wichtig: der Wurzel-Container hat KEINEN z-index und kein `contain`,
       damit seine Kinder direkt im Stacking-Context der Arena liegen. Nur so
       liegt die Kuppel unter Arena (z1) und Turret-Planeten (z2), während
       HP-Leiste, Zielscheibe und Bolt darüber lesbar bleiben. -->
  <div
    ref="rootEl"
    class="sfsun"
    :class="{
      'sfsun--comet': solarStore.isCometState,
      'sfsun--collapse': isCollapsed,
      'sfsun--sprite': spriteShown,
    }"
    :style="rootVars"
    aria-hidden="true"
  >
    <!-- Korona: weicher Halo, der die Kuppel umschließt -->
    <span class="sfsun-glow" />

    <!-- Glut-Halo direkt auf der Silhouette: überstrahlt die Schnittkante von
         außen, damit der Helligkeitssprung nicht in einem Pixel passiert -->
    <span class="sfsun-limbglow" />

    <!-- Die Photosphäre als Sprite (dieselbe wie im Orbit), unter der Kuppel;
         die Kuppel behält Saum, Hotspot und Endverdunkelung als Überlagerung. -->
    <span v-if="spriteShown" ref="spriteHost" class="sfsun-body" :style="spriteBodyVars">
      <span class="sun-slot" data-layer="core" :style="spriteSlotStyle" />
      <!-- Das Äquatorband rollt auch hier — dieselbe Achsdrehung wie im Orbit -->
      <span class="sun-slot sun-band" data-layer="bandE" :style="spriteBandStyle" />
    </span>

    <!-- Sonnenkuppel — obere Hälfte einer Kreisscheibe auf dem Arena-Boden -->
    <span class="sfsun-dome" />

    <!-- Kamm-Aufleuchten im Moment eines Treffers (Nova wie Strike) -->
    <span class="sfsun-crest" :class="{ 'sfsun-crest--hit': crestHit }" />

    <!-- HP direkt über dem Kamm — nur xx / yy, mittig über der Kuppel -->
    <div class="sfsun-hp">
      <VitalityBar
        :current="playerStore.currentHP"
        :max="playerStore.maxHP"
        label-placement="above"
        lead-icon="ph:heart-fill"
      />
    </div>

    <!-- Zielmarkierung: der Boss hat die Sonne im Visier (Aim-Phase des
         Strikes). Genau derselbe Telegraph wie bei Champions (rsq-aim-lock) und
         Turret-Planeten (tbh-aim-lock): rotierendes game-icons:targeting über
         dem GANZEN Ziel plus pulsierende rote Tönung. Das Reticle ist
         konzentrisch zur Sonnenscheibe — sein Mittelpunkt liegt wie der
         Scheibenmittelpunkt auf dem Arena-Boden, die untere Hälfte wird vom
         Horizont beschnitten. -->
    <template v-if="roleBehaviorStore.autoAimSun">
      <span class="sfsun-aim-cap" />
      <span class="sfsun-aim-lock">
        <Icon icon="game-icons:targeting" class="sfsun-aim-lock-icon" width="100%" height="100%" />
      </span>
    </template>

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
import VitalityBar from '@/components/ui/VitalityBar.vue'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  SUN_HORIZON_BAND_MIN_PX,
  SUN_HORIZON_BAND_PCT,
  SUN_HORIZON_BAND_MAX_PX,
  SUN_HORIZON_DOME_WIDTH_FACTOR,
  SUN_HORIZON_WIDTH_MIN_PCT,
  SUN_HORIZON_WIDTH_MAX_PCT,
  SUN_HORIZON_CREST_MIN_FACTOR,
  SUN_HORIZON_CREST_MAX_FACTOR,
  SUN_HORIZON_RIM_FACTOR,
  SUN_HORIZON_RIM_MIN_PX,
  SUN_HORIZON_SOFT_FACTOR,
  SUN_HORIZON_SOFT_MIN_PX,
  SUN_HORIZON_PAD_FACTOR,
  SUN_HORIZON_PAD_MIN_PX,
  SUN_HORIZON_LIMB_GLOW_FACTOR,
  SUN_HORIZON_LIMB_GLOW_MIN_PX,
  SUN_HORIZON_BODY_RX_FACTOR,
  SUN_HORIZON_HOTSPOT_WIDTH_FACTOR,
  SUN_HORIZON_HOTSPOT_HEIGHT_FACTOR,
  SUN_HORIZON_GLOW_SPREAD_FACTOR,
  SUN_HORIZON_GLOW_HEIGHT_FACTOR,
  SUN_HORIZON_HP_WIDTH_FACTOR,
  SUN_HORIZON_HP_MIN_WIDTH_PX,
  SUN_HORIZON_HP_MAX_WIDTH_PX,
  SUN_HORIZON_HP_GAP_PX,
  SUN_HORIZON_HIT_FLASH_MS,
  SUN_HORIZON_FLOAT_MS,
  BOSS_WAVE_HIT_DELAY_MS,
  BOSS_AUTO_HIT_DELAY_MS,
  SUN_SPRITE_BODY_FRACTION,
  SUN_SPRITE_DOME_MAX_PX,
  SUN_SPRITE_DOME_STEP_PX,
  SUN_TURN_SEC_BY_PHASE,
} from '@/config/constants'
import { mountSunSprites, sunBandVars, sunBodyFor } from '@/utils/fx/sunBodySprite'

const playerStore = usePlayerStore()
const roleBehaviorStore = useRoleBehaviorStore()
const solarStore = useSolarUpgradeStore()

// ── Phase: Comet ist die Vorstufe und liegt bewusst NICHT in STAR_PHASE_DATA ──
const phaseData = computed(() => STAR_PHASE_DATA[solarStore.starPhase] ?? STAR_PHASE_DATA[0])

/** Endphase: die Kalotte am Horizont ist kein Plasma mehr, sondern der
 *  Ereignishorizont — schwarz, mit Photonensaum und Akkretionsband. */
const isCollapsed = computed(() => solarStore.isCollapsedStar)

/** 0 = Comet … 1 = Collapse — treibt Breite und Kammhöhe der Kalotte. */
const phaseT = computed(() =>
  solarStore.isCometState ? 0 : Math.min(1, (solarStore.starPhase + 1) / STAR_PHASE_DATA.length),
)

function lerpPhase(min: number, max: number): number {
  return min + (max - min) * phaseT.value
}

// ── Arena-Maße: die Kammhöhe sitzt in einem geklemmten PX-Band, die Breite in
// Prozent der Arena-Breite. Nur so bleibt der Abstand zur px-großen
// Champion-Row auf Full-HD wie auf 4K gleich (siehe SUN_HORIZON_* in
// constants.ts), während die Sonne pro Phase sichtbar in die Breite wächst.
const rootEl = ref<HTMLDivElement | null>(null)
const arenaH = ref(0)
const arenaW = ref(0)

const bandPx = computed(() =>
  Math.min(
    Math.max(SUN_HORIZON_BAND_MIN_PX, (arenaH.value * SUN_HORIZON_BAND_PCT) / 100),
    SUN_HORIZON_BAND_MAX_PX,
  ),
)

/** Sichtbare Kammhöhe über dem Arena-Boden — Anker für HP, Zielscheibe, Bolt. */
const crestPx = computed(() =>
  Math.round(
    bandPx.value * lerpPhase(SUN_HORIZON_CREST_MIN_FACTOR, SUN_HORIZON_CREST_MAX_FACTOR),
  ),
)

/**
 * Sichtbare Kuppelbreite. Wächst mit der Phase bis zur vollen Arenabreite,
 * unterschreitet aber nie den exakten Halbkreis (2 × Kammhöhe).
 */
const domeWidthPx = computed(() =>
  Math.max(
    crestPx.value * SUN_HORIZON_DOME_WIDTH_FACTOR,
    Math.round(
      (arenaW.value * lerpPhase(SUN_HORIZON_WIDTH_MIN_PCT, SUN_HORIZON_WIDTH_MAX_PCT)) / 100,
    ),
  ),
)

/**
 * Radius der zugehörigen Sonnenscheibe. Aus Sehne (= Kuppelbreite) und
 * Segmenthöhe (= Kammhöhe): R = (w² / 4 + h²) / (2 h). Beim Halbkreis fällt
 * R auf die Kammhöhe zurück, der Mittelpunkt liegt dann exakt auf dem Boden;
 * bei breiteren Phasen wandert er darunter — die Silhouette bleibt in JEDEM
 * Fall ein echter Kreisbogen (kein Ellipsenbogen mit senkrechten Enden).
 */
const sphereRadiusPx = computed(() => {
  const h = Math.max(1, crestPx.value)
  const w = domeWidthPx.value
  return Math.round(((w * w) / 4 + h * h) / (2 * h))
})

let resizeObserver: ResizeObserver | null = null

// rootEl existiert erst, wenn das Modal offen ist — Observer dann anbinden
watch(rootEl, (el, prev) => {
  if (prev && resizeObserver) resizeObserver.unobserve(prev)
  if (!el) return
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      arenaH.value = rect.height
      arenaW.value = rect.width
    })
  }
  resizeObserver.observe(el)
  const rect = el.getBoundingClientRect()
  arenaH.value = rect.height
  arenaW.value = rect.width
})

// ── Photosphäre als Sprite: nur die Plasmaphasen, nur bis zum Kugel-Deckel ──
const spriteHost = ref<HTMLElement | null>(null)
const spriteShown = computed(
  () =>
    !solarStore.isCometState && !isCollapsed.value && sphereRadiusPx.value * 2 <= SUN_SPRITE_DOME_MAX_PX,
)
/** Box des Sprites, auf Schritte gerundet — der ResizeObserver feuert bei jeder
 *  Arena-Änderung, und jeder neue Schlüssel wäre ein neues Raster. */
const spritePx = computed(
  () =>
    Math.ceil((sphereRadiusPx.value * 2) / SUN_SPRITE_BODY_FRACTION / SUN_SPRITE_DOME_STEP_PX) *
    SUN_SPRITE_DOME_STEP_PX,
)
const spriteSlotStyle = computed(() => {
  const px = spritePx.value
  const pad = Math.max(SUN_HORIZON_PAD_MIN_PX, Math.round(Math.max(SUN_HORIZON_RIM_MIN_PX, Math.round(crestPx.value * SUN_HORIZON_RIM_FACTOR)) * SUN_HORIZON_PAD_FACTOR))
  // Der Körper misst 0,74 · px/2 — auf den Scheibenradius skaliert, zentriert im Scheibenmittelpunkt
  const scale = (sphereRadiusPx.value * 2) / (px * SUN_SPRITE_BODY_FRACTION)
  return {
    width: `${px}px`,
    height: `${px}px`,
    left: `calc(50% - ${px / 2}px)`,
    top: `${sphereRadiusPx.value + pad - px / 2}px`,
    transform: `scale(${scale.toFixed(4)})`,
  }
})
const spriteBandStyle = computed(() => ({ ...spriteSlotStyle.value, ...sunBandVars('bandE', 'star') }))
const spriteBodyVars = computed(() => ({
  '--sun-turn': `${SUN_TURN_SEC_BY_PHASE[Math.min(solarStore.starPhase, SUN_TURN_SEC_BY_PHASE.length - 1)]}s`,
}))
const spriteBody = computed(() => sunBodyFor(solarStore, solarStore.solarSignature))
watch(
  [spriteHost, spriteBody, spritePx],
  () => {
    const el = spriteHost.value
    if (!el) return
    mountSunSprites(el, spriteBody.value, {
      px: spritePx.value,
      dpr: window.devicePixelRatio || 1,
      layers: ['core', 'bandE'],
    })
  },
  { flush: 'post', immediate: true },
)

const rootVars = computed<Record<string, string>>(() => {
  const comet = solarStore.isCometState
  const ph = phaseData.value
  const r = crestPx.value
  const d = domeWidthPx.value
  const rim = Math.max(SUN_HORIZON_RIM_MIN_PX, Math.round(r * SUN_HORIZON_RIM_FACTOR))
  const soft = Math.max(SUN_HORIZON_SOFT_MIN_PX, Math.round(rim * SUN_HORIZON_SOFT_FACTOR * 10) / 10)
  const pad = Math.max(SUN_HORIZON_PAD_MIN_PX, Math.round(rim * SUN_HORIZON_PAD_FACTOR))
  const limb = Math.max(SUN_HORIZON_LIMB_GLOW_MIN_PX, Math.round(rim * SUN_HORIZON_LIMB_GLOW_FACTOR))
  return {
    '--sfsun-core': comet ? COMET_PHASE_DATA.core : ph.core,
    '--sfsun-mid': comet ? COMET_PHASE_DATA.mid : ph.mid,
    '--sfsun-edge': comet ? COMET_PHASE_DATA.edge : ph.edge,
    '--sfsun-glow': comet ? COMET_PHASE_DATA.glow : ph.phaseGlow,
    '--sfsun-pulse': comet ? COMET_PHASE_DATA.pulseSpeed : ph.pulseSpeed,
    // Nur der Comet braucht eine eigene Krater-/Vergoldungs-Palette
    '--sfsun-crater': COMET_PHASE_DATA.crater,
    '--sfsun-accent': COMET_PHASE_DATA.accent,
    // r = sichtbare Kammhöhe, d = sichtbare Kuppelbreite, R = Scheibenradius
    '--sfsun-r': `${r}px`,
    '--sfsun-d': `${d}px`,
    '--sfsun-cr': `${sphereRadiusPx.value}px`,
    // Saum-, Hotspot- und Limbus-Maße wachsen mit der Kuppel (siehe constants.ts)
    '--sfsun-rim': `${rim}px`,
    '--sfsun-soft': `${soft}px`,
    '--sfsun-pad': `${pad}px`,
    '--sfsun-limb': `${limb}px`,
    // Mittelpunkt der Scheibe, gemessen von der OBERKANTE der (um pad höheren) Box
    '--sfsun-cy': `${sphereRadiusPx.value + pad}px`,
    '--sfsun-limb-cy': `${sphereRadiusPx.value + limb}px`,
    '--sfsun-hotspot': `${Math.round(
      Math.min(d * SUN_HORIZON_HOTSPOT_WIDTH_FACTOR, r * SUN_HORIZON_HOTSPOT_HEIGHT_FACTOR),
    )}px`,
    '--sfsun-rx': `${Math.round(Math.min(d / 2, r * SUN_HORIZON_BODY_RX_FACTOR))}px`,
    '--sfsun-glow-w': `${Math.round(d + r * SUN_HORIZON_GLOW_SPREAD_FACTOR)}px`,
    '--sfsun-glow-h': `${Math.round(r * SUN_HORIZON_GLOW_HEIGHT_FACTOR)}px`,
    '--sfsun-hp-w': `${Math.min(
      SUN_HORIZON_HP_MAX_WIDTH_PX,
      Math.max(SUN_HORIZON_HP_MIN_WIDTH_PX, Math.round(d * SUN_HORIZON_HP_WIDTH_FACTOR)),
    )}px`,
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

// Boss-Anker fuers Stylesheet — EINE Zahl mit den Projektilen
const bossAnchorTop = `${STRIKER_BOSS_ANCHOR_Y_PCT}%`
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

/* ── Silhouette der Sonne ───────────────────────────────────────────────────
   Kuppel, Treffer-Flash und Zielscheiben-Tönung teilen EXAKT dieselbe Kalotte:
   ausgeschnitten von einem Kreis mit Radius --sfsun-cr, dessen Mittelpunkt
   --sfsun-cy unter der Box-Oberkante liegt (beim Comet auf dem Arena-Boden, bei
   breiteren Phasen darunter).

   Bewusst per `mask` statt `border-radius`: eine Border-Radius-Kuppel ist immer
   ein ELLIPSENbogen und stünde bei den breiten Phasen mit senkrechten Enden am
   Boden wie eine Wand. Die Maske liefert einen echten Kreisbogen, der flach
   ausläuft — und kostet nur das sichtbare Band statt einer arenagroßen Scheibe.

   Die Box ragt um --sfsun-pad ÜBER den Kamm hinaus. Ohne diese Reserve läge der
   Scheitel exakt auf der Box-Oberkante und der weiche Maskenauslauf hätte dort
   keinen Platz — genau am Scheitel bliebe die Kante hart. Der Überstand ist
   maskiert und damit unsichtbar. */
.sfsun-dome,
.sfsun-body,
.sfsun-crest,
.sfsun-aim-cap {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--sfsun-d, 200px);
  height: calc(var(--sfsun-r, 100px) + var(--sfsun-pad, 10px));
  transform: translateX(-50%);
  /* Alpha läuft über --sfsun-soft aus statt in 0.75 px umzuschlagen */
  mask-image: radial-gradient(
    circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
    #000 calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px)),
    transparent var(--sfsun-cr, 100px)
  );
  -webkit-mask-image: radial-gradient(
    circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
    #000 calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px)),
    transparent var(--sfsun-cr, 100px)
  );
}

/* ── Glut-Halo direkt auf der Silhouette ────────────────────────────────────
   Unmaskierter Ring, der die Schnittkante von AUSSEN überstrahlt: der
   Helligkeitssprung Hintergrund → Sonne wird damit über --sfsun-limb Pixel
   verteilt statt in einem. Liegt im DOM vor der Kuppel, ist innen also von ihr
   verdeckt und nur außerhalb der Silhouette sichtbar. */
.sfsun-limbglow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: calc(var(--sfsun-d, 200px) + var(--sfsun-limb, 12px) * 4);
  height: calc(var(--sfsun-r, 100px) + var(--sfsun-limb, 12px));
  transform: translateX(-50%);
  z-index: 0;
  background: radial-gradient(
    circle calc(var(--sfsun-cr, 100px) + var(--sfsun-limb, 12px)) at 50%
      var(--sfsun-limb-cy, 112px),
    transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-limb, 12px)),
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 55%, transparent)
      calc(var(--sfsun-cr, 100px) - var(--sfsun-limb, 12px) * 0.2),
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 34%, transparent) var(--sfsun-cr, 100px),
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 12%, transparent)
      calc(var(--sfsun-cr, 100px) + var(--sfsun-limb, 12px) * 0.5),
    transparent calc(var(--sfsun-cr, 100px) + var(--sfsun-limb, 12px))
  );
}

/* Die Photosphäre: Sprite-Kern unter der Kuppel, in derselben Maske. Die
   Kuppel darüber verliert dann ihren flächigen Kern-Verlauf und trägt nur noch
   Saum, Hotspot und Endverdunkelung. */
.sfsun-body {
  z-index: 0;
  overflow: hidden;
}

.sfsun-body .sun-slot {
  transform-origin: center;
}

.sfsun--sprite .sfsun-dome {
  background:
    radial-gradient(
      circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 3.4),
      color-mix(in srgb, white 18%, var(--sfsun-mid, #ffb347))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 2.2),
      color-mix(in srgb, white 62%, var(--sfsun-core, #fff0c0))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 1.15),
      color-mix(in srgb, white 30%, var(--sfsun-mid, #ffb347))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 0.45),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px) * 0.5)
    ),
    radial-gradient(
      circle var(--sfsun-hotspot, 115px) at 50% calc(100% - var(--sfsun-r, 100px) * 0.58),
      color-mix(in srgb, white 45%, var(--sfsun-core, #fff0c0)) 0%,
      color-mix(in srgb, white 16%, var(--sfsun-core, #fff0c0)) 42%,
      transparent 100%
    ),
    radial-gradient(
      ellipse 52% 155% at 50% 100%,
      transparent 58%,
      color-mix(in srgb, var(--sfsun-edge, #cc5500) 60%, #160a04) 88%,
      color-mix(in srgb, var(--sfsun-edge, #cc5500) 35%, #160a04) 100%
    );
}

/* Kuppelfläche: heißer Kern am Boden, gedämpfter Saum an der Silhouette, dazu
   ein Hotspot in der Kammmitte — dort steht bei den breiten Phasen der
   Scheibenmittelpunkt hinter dem Horizont. */
.sfsun-dome {
  z-index: 0;
  background:
    /* Glutsaum — sitzt bewusst INNEN und ist an der Schnittkante schon wieder
       transparent. Läge der hellste Punkt auf der Kante, wäre der Kontrast dort
       maximal und jede 1-px-Treppe der fast waagerechten Silhouette sichtbar. */
    radial-gradient(
      circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 3.4),
      color-mix(in srgb, white 18%, var(--sfsun-mid, #ffb347))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 2.2),
      color-mix(in srgb, white 62%, var(--sfsun-core, #fff0c0))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 1.15),
      color-mix(in srgb, white 30%, var(--sfsun-mid, #ffb347))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 0.45),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px) * 0.5)
    ),
    /* Hotspot in der Kammmitte — Durchmesser folgt Breite UND Höhe der Kuppel,
         Lage vom BODEN aus gerechnet (die Box hat oben --sfsun-pad Reserve).
         Bewusst dezent: ein kräftiger Fleck würde die Phasenfarbe der breiten
         Sonnen in der Mitte zu Weiß auswaschen. */
      radial-gradient(
        circle var(--sfsun-hotspot, 115px) at 50% calc(100% - var(--sfsun-r, 100px) * 0.58),
        color-mix(in srgb, white 45%, var(--sfsun-core, #fff0c0)) 0%,
        color-mix(in srgb, white 16%, var(--sfsun-core, #fff0c0)) 42%,
        transparent 100%
      ),
    /* Enden abdunkeln — dort krümmt sich die Kalotte vom Betrachter weg */
      radial-gradient(
        ellipse 52% 155% at 50% 100%,
        transparent 58%,
        color-mix(in srgb, var(--sfsun-edge, #cc5500) 60%, #160a04) 88%,
        color-mix(in srgb, var(--sfsun-edge, #cc5500) 35%, #160a04) 100%
      ),
    /* Kern → Saum. Waagerecht auf --sfsun-rx geklemmt (siehe
         SUN_HORIZON_BODY_RX_FACTOR): bei schmalen Phasen liegt der Verlauf
         konzentrisch zur Kuppel und die Sonne wirkt kugelig, bei den breiten
         bleibt der heiße Kern in der Mitte statt die ganze untere Hälfte flächig
         weiß auszuwaschen. Viele Zwischenstopps, weil eine 3-Stopp-Rampe über
         diese Fläche gezogen sichtbar bandelt. */
      radial-gradient(
        ellipse var(--sfsun-rx, 100px) var(--sfsun-r, 100px) at 50% 100%,
        color-mix(in srgb, white 70%, var(--sfsun-core, #fff0c0)) 0%,
        color-mix(in srgb, white 28%, var(--sfsun-core, #fff0c0)) 8%,
        var(--sfsun-core, #fff0c0) 16%,
        color-mix(in srgb, var(--sfsun-core, #fff0c0) 50%, var(--sfsun-mid, #ffb347)) 26%,
        var(--sfsun-mid, #ffb347) 38%,
        color-mix(in srgb, var(--sfsun-mid, #ffb347) 50%, var(--sfsun-edge, #cc5500)) 52%,
        color-mix(in srgb, var(--sfsun-mid, #ffb347) 18%, var(--sfsun-edge, #cc5500)) 62%,
        var(--sfsun-edge, #cc5500) 74%,
        color-mix(in srgb, var(--sfsun-edge, #cc5500) 88%, #160a04) 100%
      );
  /* Nur opacity animiert. Bewusst OHNE will-change: die Kuppel ist in den
     späten Phasen mehrere Megapixel groß — ein dauerhaft promovierter Layer
     dieser Größe wird bei GPU-Speicherdruck heruntergerechnet und sieht dann
     verpixelt aus. Chrome kompositiert die Opacity-Animation ohnehin. */
  animation: sfsun-pulse var(--sfsun-pulse, 4s) ease-in-out infinite;
}

/* ── Collapse: dieselbe Silhouette, aber sie leuchtet nicht mehr — sie
   verschluckt. Die Fläche ist echtes Schwarz; getragen wird die Form allein vom
   Photonensaum knapp innerhalb der Schnittkante und vom flachen Akkretionsband
   darüber. Der Limbus-Halo davor (unmaskiert, liegt außen) bleibt unverändert
   und trennt die schwarze Kalotte sauber vom dunklen Arena-Hintergrund. */
.sfsun--collapse .sfsun-dome {
  background:
    /* Photonenring — der hellste Punkt sitzt wie bei den Plasmaphasen bewusst
       INNEN, sonst läge der maximale Kontrast auf der Kante und jede 1-px-Treppe
       der fast waagerechten Silhouette wäre sichtbar. */
    radial-gradient(
      circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 2.4),
      color-mix(in srgb, white 55%, var(--sfsun-mid, #ffd08a))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 1.5),
      color-mix(in srgb, white 80%, var(--sfsun-core, #ffffff))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 0.9),
      color-mix(in srgb, var(--sfsun-mid, #ffd08a) 55%, transparent)
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 0.3),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px) * 0.5)
    ),
    /* Akkretionsband — die Scheibe, fast von der Kante gesehen. Liegt tief in
         der Kalotte, damit es als Ring um den Horizont liest und nicht als
         zweiter Kamm. */
      radial-gradient(
        ellipse 92% 13% at 50% calc(100% - var(--sfsun-r, 100px) * 0.3),
        color-mix(in srgb, white 60%, var(--sfsun-core, #ffffff)) 0%,
        var(--sfsun-mid, #ffd08a) 32%,
        var(--sfsun-edge, #c8461a) 64%,
        transparent 92%
      ),
    /* Ereignishorizont — alles dazwischen ist echtes Schwarz, kein dunkler Ton */
      radial-gradient(
        circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
        #000 0%,
        #000 100%
      );
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
    /* Grundfels — Lichtquelle oben links, dunkler Fels nach unten rechts.
         Lage vom BODEN aus gerechnet, damit die Box-Reserve (--sfsun-pad) das
         Streiflicht nicht verschiebt. */
      radial-gradient(
        circle calc(var(--sfsun-r, 100px) * 1.2) at 30%
          calc(100% - var(--sfsun-r, 100px) * 0.6),
        var(--sfsun-core, #8a7a68) 0%,
        var(--sfsun-mid, #6b5d4f) 44%,
        var(--sfsun-edge, #4a4038) 78%,
        var(--sfsun-crater, #3a322b) 100%
      );
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
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 26%, transparent) 24%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 14%, transparent) 44%,
    color-mix(in srgb, var(--sfsun-glow, #ff8c00) 6%, transparent) 60%,
    transparent 74%
  );
  /* wie .sfsun-dome ohne will-change — der Halo ist das größte Element hier */
  animation: sfsun-breathe 5s ease-in-out infinite alternate;
}

/* ── Treffer-Aufleuchten — der komplette Sonnensaum glüht auf (Nova + Strike) */
.sfsun-crest {
  z-index: 1;
  background:
    /* heißer Lichtbogen entlang der Silhouette — wie der Glutsaum nach innen
       versetzt, damit die Schnittkante beim Treffer nicht hart aufblitzt */
    radial-gradient(
      circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 4),
      color-mix(in srgb, white 40%, var(--sfsun-glow, #ff8c00))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 1.6),
      color-mix(in srgb, white 78%, var(--sfsun-glow, #ff8c00))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 0.8),
      color-mix(in srgb, white 30%, var(--sfsun-glow, #ff8c00))
        calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px))
    ),
    /* flächiges Aufglühen der Kuppel */
      radial-gradient(
        ellipse 50% var(--sfsun-r, 100px) at 50% 100%,
        color-mix(in srgb, var(--sfsun-glow, #ff8c00) 55%, transparent) 0%,
        color-mix(in srgb, var(--sfsun-glow, #ff8c00) 28%, transparent) 70%,
        transparent 100%
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
   Breite folgt der Kuppel (mindestens SUN_HORIZON_HP_MIN_WIDTH_PX), damit der
   Streifen die Sonne abschließt statt über sie hinauszuragen.

   z-index 5 = über der Champion-Row (.sf-squad, z4). Das ist die eigene
   Lebensanzeige des Spielers — sie darf unter keinen Umständen verdeckt sein,
   auch nicht kurzzeitig. Der Mid-Striker steht exakt in ihrer Spalte und zieht
   sich beim Ausholen nach unten zurück; auf z3 schob sich seine Info-Plate
   dabei über die Zahlen (gemessen: 23 px auf Full HD, 27 px auf WUXGA).
   Die Ebene gehört damit zu Bolt und Schadenszahl der Sonne (beide z5) —
   alles, was den Spielerzustand meldet, liegt über der Choreografie. */
.sfsun-hp {
  position: absolute;
  left: 50%;
  bottom: calc(var(--sfsun-r, 100px) + var(--sfsun-hp-gap, 10px));
  transform: translateX(-50%);
  width: var(--sfsun-hp-w, 200px);
  z-index: 5;

  /* Maße der Leiste. Sie ist so schmal wie die im Orbit und trägt aus demselben
     Grund keinen Dauerglanz; die drei Höhenstufen weiter unten setzen nur noch
     Variablen. */
  --vb-h: 11px;
  --vb-radius: 2px;
  --vb-label-size: 0.88rem;
  --vb-label-sub-size: 0.88rem;
  --vb-label-gap: 5px;
  --vb-icon-size: 15px;
  --vb-num-gap: 4px;
  --vb-cur-reserve: 0;
}

/* ── Zielmarkierung des Strikes ─────────────────────────────────────────────
   Identische Signatur wie bei Champions (.rsq-aim-lock) und Turret-Planeten
   (.tbh-aim-lock): rotierendes game-icons:targeting über dem Ziel plus
   pulsierende rote Tönung. Die Tönung liegt als eigene Kappe auf der GANZEN
   Sonnenfläche (gleiche Maske wie .sfsun-dome), das Reticle sitzt mittig auf
   dem Kamm — sein Kreis ist doppelt so hoch wie die Kalotte, die untere Hälfte
   schneidet der Horizont (overflow: hidden auf .sfsun) weg. Bewusst an die
   Kammhöhe gekoppelt und nicht an die Breite: ein Reticle in Kuppelbreite
   würde bei den breiten Phasen weit in die Champion-Row ragen. */
.sfsun-aim-cap {
  z-index: 2;
  background:
    /* roter Glutsaum auf der Silhouette — ebenfalls nach innen versetzt */
    radial-gradient(
      circle var(--sfsun-cr, 100px) at 50% var(--sfsun-cy, 110px),
      transparent calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 2.4),
      rgba(255, 120, 90, 0.95) calc(var(--sfsun-cr, 100px) - var(--sfsun-rim, 7px) * 1),
      rgba(255, 90, 60, 0.5) calc(var(--sfsun-cr, 100px) - var(--sfsun-soft, 3px))
    ),
    /* rote Tönung rund um das Reticle — an die Kammhöhe gekoppelt, damit die
         arenabreite Finale-Sonne nicht flächig rot überlackiert wird, die kleine
         Comet-Kuppe aber vollständig getönt ist (wie das Champion-Portrait) */
      radial-gradient(
        circle calc(var(--sfsun-r, 100px) * 1.7) at 50% 100%,
        rgba(255, 50, 30, 0.5) 0%,
        rgba(255, 60, 40, 0.28) 55%,
        transparent 100%
      );
  /* ebenfalls ohne will-change — deckungsgleich mit der Kuppel und damit in den
     späten Phasen genauso groß */
  animation: sfsun-aim-tint-pulse 0.6s ease-in-out infinite alternate;
}

.sfsun-aim-lock {
  position: absolute;
  left: 50%;
  bottom: calc(-1 * var(--sfsun-r, 100px));
  width: calc(var(--sfsun-r, 100px) * 2);
  height: calc(var(--sfsun-r, 100px) * 2);
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
  top: v-bind(bossAnchorTop);
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
  .sfsun-hp {
    --vb-h: 9px;
    --vb-label-size: 0.8rem;
    --vb-label-sub-size: 0.8rem;
    --vb-label-gap: 4px;
    --vb-icon-size: 13px;
  }

  .sfsun-float {
    font-size: 1.3rem;
  }
}

/* ── Große Auflösungen (2K/4K): HP-Werte mitwachsen lassen — bei 0.88 rem
   wirkt der Streifen über einer 320-px-Kuppel verloren. */
@media (min-height: 1300px) {
  /* Untergrenze für die schmalen Phasen: der Streifen muss die größere Schrift
     tragen, auch wenn die Comet-Kuppe kaum breiter ist */
  .sfsun-hp {
    min-width: 210px;

    --vb-h: 14px;
    --vb-label-size: 1.1rem;
    --vb-label-sub-size: 1.1rem;
    --vb-label-gap: 7px;
    --vb-icon-size: 19px;
    --vb-num-gap: 6px;
  }

  .sfsun-float {
    font-size: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sfsun-dome,
  .sfsun-glow,
  .sfsun-crest--hit,
  .sfsun-aim-cap,
  .sfsun-aim-lock,
  .sfsun-aim-lock-icon,
  .sfsun-bolt,
  .sfsun-float,
  .sfsun-float::before {
    animation: none;
  }
}
</style>

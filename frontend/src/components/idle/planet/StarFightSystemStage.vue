<template>
  <div
    ref="rootEl"
    class="sfs"
    :class="[
      `sfs--${phase}`,
      { 'sfs--snap': snap, 'sfs--rm': reducedMotion, 'sfs--flash': flash },
    ]"
    aria-hidden="true"
  >
    <!-- Ferne Ebene: der Kampfstern des Systems, schwache Parallaxe -->
    <div class="sfs-far" :style="farStyle">
      <div
        :ref="mountStar"
        class="sfs-star"
        :class="`sfs-star--${star.look}`"
        :style="starStyle"
      >
        <div class="star-halo" />
        <div class="star-core" />
        <div class="star-spin" />
      </div>
      <span class="sfs-star-flash" :style="starFlashStyle" />
    </div>

    <!-- Nahe Ebene: Bahnen, Kurs, die kleinen Planeten — die volle Kamera -->
    <div class="sfs-near" :style="nearStyle" @transitionend="onNearEnd">
      <svg class="sfs-course-layer" :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`">
        <ellipse
          v-for="p in layout.planets"
          :key="`orbit-${p.planetId}`"
          class="sfs-orbit"
          :class="{ 'is-target': p.planetId === targetPlanetId }"
          :cx="p.orbit.cx"
          :cy="p.orbit.cy"
          :rx="p.orbit.rx"
          :ry="p.orbit.ry"
          :transform="`rotate(${(p.orbit.tilt * 180) / Math.PI} ${p.orbit.cx} ${p.orbit.cy})`"
        />
        <line
          v-if="course"
          class="sfs-course"
          :x1="course.x1"
          :y1="course.y1"
          :x2="course.x2"
          :y2="course.y2"
        />
      </svg>
      <div
        v-for="p in layout.planets"
        :key="p.planetId"
        class="sfs-planet"
        :class="{
          'is-cleared': isCleared(p),
          'is-target': p.planetId === targetPlanetId,
          'is-freed-now': p.planetId === freedNowId,
          'is-galaxy': p.isGalaxyBoss,
          'is-champion': p.isChampionPlanet,
        }"
        :style="planetStyle(p)"
      >
        <div class="sfs-planet-life" :style="planetLifeStyle(p)">
          <span class="sfs-planet-glow" />
          <div :ref="(el) => mountSmall(el, p)" class="sfs-planet-img planet-slot" />
        </div>
        <span class="sfs-freed-ring" />
        <span class="sfs-freed-pulse" />
        <span class="sfs-crosshair" />
      </div>
    </div>

    <!-- Der Zielplanet gross, statisch am Anker — nur seine Deckkraft blendet -->
    <div class="sfs-hero" :class="{ 'sfs-hero--galaxy': heroIsGalaxy }" :style="heroStyle">
      <span class="sfs-hero-glow" />
      <div :ref="mountHero" class="sfs-hero-img planet-slot" />
    </div>

    <!-- Deckel für reduced-motion: harter Schnitt hinter einer Blende -->
    <span class="sfs-fade" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import {
  STAR_FIGHT_ANCHOR_X_PCT,
  STAR_FIGHT_ANCHOR_Y_PCT,
  STAR_FIGHT_FIGHT_PLANET_D_PCT,
  STAR_FIGHT_CAM_INTRO_LOCK_MS,
  STAR_FIGHT_CAM_DEPART_MS,
  STAR_FIGHT_CAM_APPROACH_MS,
  STAR_FIGHT_CAM_RM_FADE_MS,
  STAR_FIGHT_CAM_EASE_OUT,
  STAR_FIGHT_CAM_EASE_IN,
  STAR_FIGHT_HERO_FADE_FRAC,
  STAR_FIGHT_FREED_PULSE_MS,
  STAR_FIGHT_STAR_FLASH_MS,
  STAR_FIGHT_STAR_FLASH_SPAN_K,
  STAR_FIGHT_STAR_BREATHE_MS,
  STAR_FIGHT_PLANET_DRIFT_MS,
  STAR_FIGHT_PLANET_DRIFT_VARIANCE_MS,
  STAR_FIGHT_PLANET_DRIFT_DELAY_MS,
  STAR_FIGHT_PLANET_DRIFT_DELAY_VARIANCE_MS,
  STAR_FIGHT_PLANET_DRIFT_PX,
  STAR_FIGHT_PLANET_DRIFT_SCALE,
  STAR_BODY_SPRITE_SPAN,
  STAR_BODY_SPIN_SEC,
  STAR_FIGHT_SYS_OVERVIEW_PLANET_SCALE,
} from '@/config/constants'
import {
  systemLayout,
  fightTransform,
  farTransform,
  systemTransform,
  courseLine,
  planetOf,
  cameraCss,
  quantSpritePx,
  systemSpritePx,
  heroSpritePx,
  type SystemPlanet,
  type SystemSlotInput,
} from '@/utils/orbit/starFightSystem'
import { mountStarSprites } from '@/utils/fx/starBodySprite'
import { mountPlanetSprite } from '@/utils/fx/planetSprite'
import type { StarLook } from '@/types'

export type StageStar = {
  look: StarLook
  starColor: [number, number, number]
  seed: number
  planetSlots: SystemSlotInput[]
}

export type CameraPhase = 'intro' | 'fight' | 'depart' | 'travel' | 'approach' | 'outro'

const props = withDefaults(
  defineProps<{
    star: StageStar
    phase: CameraPhase
    targetPlanetId: string | null
    prevPlanetId: string | null
    clearedIds: ReadonlySet<string>
    galaxyBossPlanetIds: ReadonlySet<string>
    reducedMotion: boolean
    flash?: boolean
  }>(),
  { flash: false },
)

const emit = defineEmits<{ 'near-transition-end': [] }>()

// ── Bühnenmass ────────────────────────────────────────────────────────────
const w = ref(0)
const h = ref(0)
const rootEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

// Erstanzeige und jede Massänderung: Kamera springt, statt zu fahren
const snap = ref(true)
let snapFrame = 0
function snapOnce() {
  snap.value = true
  cancelAnimationFrame(snapFrame)
  snapFrame = requestAnimationFrame(() => {
    snapFrame = requestAnimationFrame(() => {
      snap.value = false
    })
  })
}

onMounted(() => {
  const el = rootEl.value
  if (!el) return
  const measure = () => {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    if (Math.round(r.width) === w.value && Math.round(r.height) === h.value) return
    w.value = Math.round(r.width)
    h.value = Math.round(r.height)
    snapOnce()
  }
  measure()
  ro = new ResizeObserver(measure)
  ro.observe(el)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  cancelAnimationFrame(snapFrame)
})

const dpr = computed(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))

// ── Geometrie ─────────────────────────────────────────────────────────────
const layout = computed(() =>
  systemLayout(props.star, Math.max(1, w.value), Math.max(1, h.value), props.galaxyBossPlanetIds),
)

// Reduced motion: die Kamera kennt nur Kampfansichten, der Schnitt liegt unter dem Deckel
const cameraPlanetId = computed<string | null>(() => {
  if (props.reducedMotion) {
    return props.phase === 'depart' ? (props.prevPlanetId ?? props.targetPlanetId) : props.targetPlanetId
  }
  return props.phase === 'fight' || props.phase === 'approach' ? props.targetPlanetId : null
})

const nearStyle = computed(() => {
  const id = cameraPlanetId.value
  const t = id ? fightTransform(layout.value, id) : systemTransform()
  return { transform: cameraCss(t) }
})

const farStyle = computed(() => {
  const t = farTransform(layout.value, cameraPlanetId.value)
  const s = layout.value.star
  return { transform: cameraCss(t), transformOrigin: `${s.x}px ${s.y}px` }
})

const course = computed(() => {
  if (!props.prevPlanetId || !props.targetPlanetId || props.prevPlanetId === props.targetPlanetId) return null
  return courseLine(layout.value, props.prevPlanetId, props.targetPlanetId)
})

const freedNowId = computed(() => (props.phase === 'fight' ? null : props.prevPlanetId))

function isCleared(p: SystemPlanet): boolean {
  return p.cleared || props.clearedIds.has(p.planetId)
}

// ── Stern ─────────────────────────────────────────────────────────────────
const starStyle = computed(() => {
  const s = layout.value.star
  return {
    left: `${s.x}px`,
    top: `${s.y}px`,
    width: `${s.px}px`,
    height: `${s.px}px`,
    '--star-span': String(STAR_BODY_SPRITE_SPAN),
    '--star-spin-sec': `${STAR_BODY_SPIN_SEC[props.star.look]}s`,
    '--star-breathe-ms': `${STAR_FIGHT_STAR_BREATHE_MS}ms`,
  }
})

const starFlashStyle = computed(() => {
  const s = layout.value.star
  const d = s.px * STAR_BODY_SPRITE_SPAN * STAR_FIGHT_STAR_FLASH_SPAN_K
  return { left: `${s.x}px`, top: `${s.y}px`, width: `${d}px`, height: `${d}px` }
})

function mountStar(el: Element | ComponentPublicInstance | null) {
  if (!(el instanceof HTMLElement)) return
  const px = layout.value.star.px
  if (px <= 0) return
  // Auf die Schrittweite quantisiert: ein Resize rastert den Stern nicht neu
  mountStarSprites(el, props.star.look, props.star.starColor, props.star.seed, quantSpritePx(px), dpr.value)
}

// ── Planeten ──────────────────────────────────────────────────────────────
function planetStyle(p: SystemPlanet) {
  return {
    left: `${p.x}px`,
    top: `${p.y}px`,
    width: `${2 * p.r}px`,
    height: `${2 * p.r}px`,
  }
}

function planetLifeStyle(p: SystemPlanet) {
  const seed = Math.abs(p.seed)
  return {
    '--planet-drift-delay': `-${STAR_FIGHT_PLANET_DRIFT_DELAY_MS + (seed % STAR_FIGHT_PLANET_DRIFT_DELAY_VARIANCE_MS)}ms`,
    '--planet-drift-duration': `${STAR_FIGHT_PLANET_DRIFT_MS + (seed % STAR_FIGHT_PLANET_DRIFT_VARIANCE_MS)}ms`,
    '--planet-drift-px': `${STAR_FIGHT_PLANET_DRIFT_PX}px`,
    '--planet-drift-scale': String(STAR_FIGHT_PLANET_DRIFT_SCALE),
  }
}

function mountSmall(el: Element | ComponentPublicInstance | null, p: SystemPlanet) {
  if (!(el instanceof HTMLElement) || p.r <= 0) return
  mountPlanetSprite(el, {
    type: p.type,
    seed: p.seed,
    px: systemSpritePx(p.r),
    dpr: dpr.value,
    lightAngle: p.lightAngle,
  })
}

// ── Hero ──────────────────────────────────────────────────────────────────
const heroPlanetId = computed<string | null>(() => {
  if (props.phase === 'depart' || props.phase === 'outro') return props.prevPlanetId ?? props.targetPlanetId
  return props.targetPlanetId
})

const heroPlanet = computed(() => (heroPlanetId.value ? (planetOf(layout.value, heroPlanetId.value) ?? null) : null))
const heroIsGalaxy = computed(() => heroPlanet.value?.isGalaxyBoss ?? false)

const heroD = computed(() => (h.value * STAR_FIGHT_FIGHT_PLANET_D_PCT) / 100)

const heroStyle = computed(() => ({
  left: `${(w.value * STAR_FIGHT_ANCHOR_X_PCT) / 100}px`,
  top: `${(h.value * STAR_FIGHT_ANCHOR_Y_PCT) / 100}px`,
  width: `${heroD.value}px`,
  height: `${heroD.value}px`,
}))

const heroHost = ref<HTMLElement | null>(null)
function mountHero(el: Element | ComponentPublicInstance | null) {
  if (!(el instanceof HTMLElement)) return
  heroHost.value = el
  paintHero()
}

function paintHero() {
  const el = heroHost.value
  const p = heroPlanet.value
  if (!el || !p || heroD.value <= 0) return
  mountPlanetSprite(el, {
    type: p.type,
    seed: p.seed,
    px: heroSpritePx(h.value),
    dpr: dpr.value,
    lightAngle: p.lightAngle,
  })
}

watch([heroPlanet, heroD], paintHero)

// ── Takt ──────────────────────────────────────────────────────────────────
function onNearEnd(e: TransitionEvent) {
  if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
  emit('near-transition-end')
}

// CSS-Zeiten aus den Konstanten — EINE Quelle für Composable und Stylesheet
const introLockMs = `${STAR_FIGHT_CAM_INTRO_LOCK_MS}ms`
const departMs = `${STAR_FIGHT_CAM_DEPART_MS}ms`
const approachMs = `${STAR_FIGHT_CAM_APPROACH_MS}ms`
const rmFadeMs = `${STAR_FIGHT_CAM_RM_FADE_MS}ms`
const easeOut = STAR_FIGHT_CAM_EASE_OUT
const easeIn = STAR_FIGHT_CAM_EASE_IN
const heroOutMs = `${Math.round(STAR_FIGHT_CAM_DEPART_MS * STAR_FIGHT_HERO_FADE_FRAC)}ms`
const heroInMs = `${Math.round(STAR_FIGHT_CAM_APPROACH_MS * STAR_FIGHT_HERO_FADE_FRAC)}ms`
const heroInDelay = `${Math.round(STAR_FIGHT_CAM_APPROACH_MS * (1 - STAR_FIGHT_HERO_FADE_FRAC))}ms`
const orbitsInDelay = `${Math.round(STAR_FIGHT_CAM_DEPART_MS * 0.5)}ms`
const orbitsOutMs = `${Math.round(STAR_FIGHT_CAM_APPROACH_MS * 0.5)}ms`
const freedPulseMs = `${STAR_FIGHT_FREED_PULSE_MS}ms`
const starFlashMs = `${STAR_FIGHT_STAR_FLASH_MS}ms`
const overviewPlanetScale = String(STAR_FIGHT_SYS_OVERVIEW_PLANET_SCALE)
</script>

<style scoped>
.sfs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  --sfs-depart: v-bind(departMs);
  --sfs-approach: v-bind(approachMs);
  --sfs-rm-fade: v-bind(rmFadeMs);
  --sfs-ease-out: v-bind(easeOut);
  --sfs-ease-in: v-bind(easeIn);
  --sfs-overview-planet-scale: v-bind(overviewPlanetScale);
}

/* ── Kamera-Ebenen: nur transform fährt, kein will-change ─────────────────── */
.sfs-far,
.sfs-near {
  position: absolute;
  inset: 0;
}

.sfs-near {
  transform-origin: 0 0;
}

.sfs--depart .sfs-far,
.sfs--depart .sfs-near,
.sfs--outro .sfs-far,
.sfs--outro .sfs-near {
  transition: transform var(--sfs-depart) var(--sfs-ease-out);
}

.sfs--approach .sfs-far,
.sfs--approach .sfs-near {
  transition: transform var(--sfs-approach) var(--sfs-ease-in);
}

.sfs--snap .sfs-far,
.sfs--snap .sfs-near,
.sfs--rm .sfs-far,
.sfs--rm .sfs-near {
  transition: none;
}

/* ── Der Kampfstern: dieselben drei Ebenen wie im Orbit, ohne Fahne ──────── */
.sfs-star {
  position: absolute;
  translate: -50% -50%;
  border-radius: 50%;
}

.sfs-star .star-halo,
.sfs-star .star-core,
.sfs-star .star-spin {
  position: absolute;
  inset: calc(50% - var(--star-span, 2.2) * 50%);
}

.sfs-star :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
}

.sfs-star .star-spin {
  animation: sfs-star-spin var(--star-spin-sec, 40s) linear infinite;
}

.sfs-star .star-halo {
  animation: sfs-star-breathe var(--star-breathe-ms) ease-in-out infinite alternate;
}

.sfs--rm .sfs-star .star-spin,
.sfs--rm .sfs-star .star-halo {
  animation: none;
}

@keyframes sfs-star-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes sfs-star-breathe {
  from {
    opacity: 0.72;
  }
  to {
    opacity: 1;
  }
}

/* Blitz beim Abschluss des Sterns: eigene ruhende Ebene, nur Deckkraft */
.sfs-star-flash {
  position: absolute;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 250, 230, 0.95) 0%, rgba(255, 220, 150, 0.5) 30%, transparent 68%);
  opacity: 0;
}

.sfs--flash .sfs-star-flash {
  animation: sfs-flash v-bind(starFlashMs) ease-out both;
}

@keyframes sfs-flash {
  0% {
    opacity: 0;
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ── Reiseweg ────────────────────────────────────────────────────────────── */
.sfs-course-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  opacity: 0;
  transition: opacity v-bind(orbitsOutMs) ease-out;
}

.sfs-orbit {
  fill: none;
  stroke: rgba(236, 232, 220, 0.16);
  stroke-width: 1;
  stroke-dasharray: 2 9;
  vector-effect: non-scaling-stroke;
}

.sfs-orbit.is-target {
  stroke: rgba(232, 192, 64, 0.52);
  stroke-dasharray: 5 8;
}

.sfs--depart .sfs-course-layer,
.sfs--travel .sfs-course-layer,
.sfs--outro .sfs-course-layer {
  opacity: 1;
  transition: opacity 260ms ease-out v-bind(orbitsInDelay);
}

.sfs--intro .sfs-course-layer,
.sfs--travel .sfs-course-layer {
  opacity: 1;
  transition: none;
}

.sfs-course {
  stroke: rgba(240, 214, 120, 0.7);
  stroke-width: 1;
  stroke-dasharray: 4 8;
  opacity: 0;
  transition: opacity 180ms ease-out;
}

.sfs--travel .sfs-course {
  opacity: 1;
}

/* ── Die kleinen Planeten ────────────────────────────────────────────────── */
.sfs-planet {
  position: absolute;
  translate: -50% -50%;
}

.sfs-planet-life {
  position: absolute;
  inset: 0;
  transform-origin: center;
  animation: sfs-planet-drift var(--planet-drift-duration) ease-in-out infinite;
  animation-delay: var(--planet-drift-delay);
}

.sfs--intro .sfs-planet-life {
  --planet-overview-scale: var(--sfs-overview-planet-scale);
}

@keyframes sfs-planet-drift {
  0%,
  100% {
    transform: translateY(var(--planet-drift-px)) scale(var(--planet-overview-scale, 1));
  }
  50% {
    transform: translateY(calc(var(--planet-drift-px) * -1))
      scale(calc(var(--planet-drift-scale) * var(--planet-overview-scale, 1)));
  }
}

.planet-slot {
  position: absolute;
  inset: calc(50% - var(--planet-span, 1.05) * 50%);
}

.planet-slot :deep(img) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  opacity: 0;
  transition: opacity 250ms ease-out;
}

.planet-slot :deep(img.is-in) {
  opacity: 1;
}

/* Galaxieboss-Planet: violetter statischer Schein hinter dem Körper */
.sfs-planet-glow {
  position: absolute;
  inset: -45%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(180, 60, 230, 0.55) 0%, rgba(140, 30, 200, 0.18) 45%, transparent 70%);
  opacity: 0;
}

.sfs--intro .sfs-planet:not(.is-galaxy) .sfs-planet-glow {
  opacity: 0.38;
}

.sfs--intro .sfs-planet.is-target .sfs-planet-glow {
  opacity: 0.78;
}

.sfs-planet.is-galaxy .sfs-planet-glow {
  opacity: 1;
}

/* Befreit: dünner unbunter Ring, der Körper bleibt. Mindestmass gegen den 4 %-Planeten */
.sfs-freed-ring {
  position: absolute;
  inset: calc(50% - max(76%, 26px));
  border-radius: 50%;
  border: 1px solid rgba(236, 232, 220, 0.55);
  opacity: 0;
  transition: opacity 300ms ease-out;
}

.sfs-planet.is-cleared .sfs-freed-ring {
  opacity: 1;
}

/* Der Puls des soeben befreiten Planeten — einmal, beim Aufbruch */
.sfs-freed-pulse {
  position: absolute;
  inset: calc(50% - max(76%, 26px));
  border-radius: 50%;
  border: 2px solid rgba(236, 232, 220, 0.85);
  opacity: 0;
}

.sfs-planet.is-freed-now .sfs-freed-pulse {
  animation: sfs-freed v-bind(freedPulseMs) ease-out both;
}

@keyframes sfs-freed {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

/* Fadenkreuz auf dem nächsten Ziel — Aussendurchmesser mindestens 64 px */
.sfs-crosshair {
  position: absolute;
  inset: calc(50% - max(88%, 32px));
  border-radius: 50%;
  border: 1.5px solid rgba(232, 192, 64, 0.85);
  opacity: 0;
  transition: opacity 180ms ease-out;
}

.sfs-crosshair::before,
.sfs-crosshair::after {
  content: '';
  position: absolute;
  background: rgba(232, 192, 64, 0.85);
}

.sfs-crosshair::before {
  left: 50%;
  top: -22%;
  width: 1.5px;
  height: 144%;
  translate: -50% 0;
  clip-path: polygon(0 0, 100% 0, 100% 24%, 0 24%, 0 76%, 100% 76%, 100% 100%, 0 100%);
}

.sfs-crosshair::after {
  top: 50%;
  left: -22%;
  height: 1.5px;
  width: 144%;
  translate: 0 -50%;
  clip-path: polygon(0 0, 24% 0, 24% 100%, 0 100%, 76% 0, 100% 0, 100% 100%, 76% 100%);
}

.sfs--travel .sfs-planet.is-target .sfs-crosshair,
.sfs--approach .sfs-planet.is-target .sfs-crosshair {
  opacity: 1;
}

/* Intro: das Fadenkreuz rastet ein, sobald der Ladeschleier weg ist */
.sfs--intro .sfs-planet.is-target .sfs-crosshair {
  opacity: 1;
  transition-delay: v-bind(introLockMs);
}

.sfs--approach .sfs-planet.is-target .sfs-crosshair {
  opacity: 0;
  transition-delay: 120ms;
}

/* ── Hero: gross, statisch am Anker; nur seine Deckkraft blendet ─────────── */
.sfs-hero {
  position: absolute;
  translate: -50% -50%;
  opacity: 1;
  transition: opacity v-bind(heroOutMs) ease-out;
}

.sfs--depart .sfs-hero,
.sfs--travel .sfs-hero,
.sfs--outro .sfs-hero {
  opacity: 0;
}

.sfs--intro .sfs-hero {
  opacity: 0;
  transition: none;
}

.sfs--approach .sfs-hero {
  opacity: 1;
  transition: opacity v-bind(heroInMs) ease-in v-bind(heroInDelay);
}

.sfs--rm .sfs-hero,
.sfs--snap .sfs-hero {
  transition: none;
}

.sfs--rm.sfs--depart .sfs-hero,
.sfs--rm.sfs--travel .sfs-hero {
  opacity: 1;
}

/* Galaxieboss: statischer violetter Schein auf einer eigenen Ebene, die atmet */
.sfs-hero-glow {
  position: absolute;
  inset: -12%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(180, 60, 230, 0.42) 40%, rgba(140, 30, 200, 0.16) 62%, transparent 74%);
  opacity: 0;
}

.sfs-hero--galaxy .sfs-hero-glow {
  animation: sfs-hero-glow 3s ease-in-out infinite alternate;
}

@keyframes sfs-hero-glow {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 0.85;
  }
}

/* ── Deckel für reduced-motion ───────────────────────────────────────────── */
.sfs-fade {
  position: absolute;
  inset: 0;
  background: #111008;
  opacity: 0;
  transition: opacity var(--sfs-rm-fade) ease-out;
}

.sfs--rm.sfs--depart .sfs-fade,
.sfs--rm.sfs--travel .sfs-fade,
.sfs--rm.sfs--outro .sfs-fade {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .sfs-star .star-spin,
  .sfs-star .star-halo,
  .sfs-planet-life,
  .sfs-hero--galaxy .sfs-hero-glow,
  .sfs-planet.is-freed-now .sfs-freed-pulse,
  .sfs--flash .sfs-star-flash {
    animation: none;
  }
}
</style>

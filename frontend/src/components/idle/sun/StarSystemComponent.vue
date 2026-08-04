<template>
  <!-- ⓪ Permanent Orbit Tracks (nebula glow rings) -->
  <Teleport to="body">
    <svg class="orbit-tracks-svg" :viewBox="`0 0 ${screenW} ${screenH}`" aria-hidden="true">
      <template v-if="hasActiveStars">
        <OrbitPath
          v-for="(tier, i) in scaledStarOrbitTiers"
          :key="'track-star-' + i"
          :color="tier.color"
          :x="screenCx"
          :y="screenCy"
          :rx="tier.rx"
          :ry="tier.ry"
          :tiltDeg="tier.tiltDeg"
          :visible="starOrbitVisible[i]"
          :abilityActive="starTrackFocused(i)"
          :dimmed="starTrackDimmed(i)"
        />
      </template>

      <template v-if="hasActiveChampions">
        <OrbitPath
          v-for="(entry, i) in activeRoleOrbits"
          :key="'track-role-' + entry.role"
          :color="entry.color"
          :x="screenCx"
          :y="screenCy"
          :rx="entry.rx"
          :ry="entry.ry"
          :tiltDeg="entry.tiltDeg"
          :visible="roleOrbitVisibility[i]"
          :abilityActive="entry.role === hoveredChampionRole"
          :dimmed="roleOrbitDimmed(entry.role)"
        />
      </template>
    </svg>
  </Teleport>

  <!-- ① Back-Layer -->
  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
      <!-- Orbit-Glow-Ringe: Gaussian-Blur wird einmal pro Geometrie in ein
           Sprite gerendert und per Frame nur noch mit globalAlpha geblittet.
           Die frühere SVG-Variante hat den Blur jeden Frame neu gerastert. -->
      <canvas ref="hintBackCanvas" class="orbit-hints-canvas" />
    </div>
  </Teleport>

  <Teleport to="body">
    <div class="star-sys-layer star-sys-back" aria-hidden="true">
      <template v-for="star in backStars" :key="star.id">
        <div
          class="star-body"
          :class="`star-body--${star.starType}`"
          :style="starBodyBackStyle(star)"
          :ref="(el) => setMapEl(starBackEls, star.id, el)"
        >
          <div class="star-pulse-overlay" />
        </div>
      </template>
    </div>
  </Teleport>

  <!-- ② Front-Layer -->
  <Teleport to="body">
    <div
      class="star-sys-layer star-sys-front"
      aria-hidden="true"
    >
      <canvas ref="hintFrontCanvas" class="orbit-hints-canvas" />

      <template v-for="star in frontStars" :key="star.id">
        <div
          :class="[
            'star-body-wrap',
            {
              'star-hovered':
                hoveredSummaryStarId === star.id || starGroupStore.hoveredTimerStarId === star.id,
              'star-body-wrap--hover-dimmed': isStarHoverDimmed(star.id),
            },
          ]"
          :style="starWrapStyle(star)"
          :ref="(el) => setMapEl(starWrapEls, star.id, el)"
          @click="handleStarClick(star)"
          @mouseenter="setStarHover(star.id)"
          @mouseleave="setStarHover(null)"
        >
          <div
            class="star-body"
            :class="`star-body--${star.starType}`"
            :style="starBodyVisualStyle(star)"
            role="button"
            :aria-label="`${star.starType === 'galaxy_boss' ? 'Galaxy Boss' : star.starType === 'boss_escort' ? 'Boss Escort' : star.starType === 'champion' ? 'Champion' : 'Resource'} Star – Boss-Fight starten`"
            tabindex="0"
          >
            <div class="star-pulse-overlay" />
          </div>
        </div>
      </template>

      <!-- Angriffs-Cooldown-Ringe: ein einziges Canvas für alle Sterne, im
           RAF-Loop gezeichnet — kein Per-Stern-DOM, keine Style-Recalcs -->
      <canvas ref="cooldownCanvas" class="orbit-hints-canvas" />

      <!-- ③ Enemy Projectiles -->
      <AttackProjectileLayer :shots="enemyShots" />

      <!-- ③b Zielscheibe auf der Sonne: der Boss hat den Spieler im Visier.
           Gleicher Telegraph wie bei Champions (rsq-aim-lock) und Turret-
           Planeten (tbh-aim-lock), aber als CSS-Reticle statt als Icon: die
           game-icons sind gefüllte Silhouetten und würden auf Orbit-Größe
           (~500 px) die komplette Sonnenscheibe zudecken. -->
      <span v-if="roleBehaviorStore.autoAimSun" class="sun-aim-lock" :style="sunAimStyle">
        <span class="sun-aim-tint" />
        <span class="sun-aim-ring" />
        <span class="sun-aim-ring sun-aim-ring--inner" />
      </span>

      <!-- ④ Stern-Gesamt-Belohnung -->
      <template v-for="star in frontStars" :key="'summary-' + star.id">
        <div
          v-if="
            getStarRewardSummary(star).totalChimes > 0 ||
            getStarRewardSummary(star).materials.length > 0 ||
            getStarRewardSummary(star).champion
          "
          :class="[
            'star-reward-summary',
            {
              'star-reward-summary--star-hovered':
                hoveredStarId === star.id || starGroupStore.hoveredTimerStarId === star.id,
              'star-reward-summary--hover-dimmed': isStarHoverDimmed(star.id),
              'star-reward-summary--raging': ragingStarId === star.id,
              'star-reward-summary--cursed': isCursedStar(star.id),
            },
          ]"
          :style="rewardSummaryStyle(star)"
          :ref="(el) => setMapEl(summaryEls, star.id, el)"
          @click="handleStarClick(star)"
          @mouseenter="setSummaryHover(star.id)"
          @mouseleave="setSummaryHover(null)"
        >
          <div class="summary-inner">
            <!-- Statusmarken: die einzigen Zusätze am Stern selbst. Sie sitzen
                 über der Beute, weil sie sie qualifizieren — Fluch (unser
                 Debuff AUF dem Stern) oben, Rage (sein Buff) unten direkt an
                 der Leine. Liegt nur einer an, sitzt er allein unten; der
                 andere klappt darüber auf, ohne den Block zu verschieben. -->
            <div class="summary-states">
              <Transition name="summary-state">
                <div
                  v-if="isCursedStar(star.id) && curseSecsLeft > 0 && curseDef"
                  class="summary-state summary-state--curse"
                  :class="{ 'summary-state--urgent': curseSecsLeft <= 3 }"
                >
                  <Icon
                    :icon="curseDef.icon"
                    class="summary-state__icon"
                    width="16"
                    height="16"
                    aria-hidden="true"
                  />
                  <span class="summary-state__label">{{ curseDef.name }}</span>
                  <span class="summary-state__secs">{{ curseSecsLeft }}s</span>
                </div>
              </Transition>

              <Transition name="summary-state">
                <div v-if="ragingStarId === star.id" class="summary-state summary-state--rage">
                  <span class="summary-state__label">Rage</span>
                  <span class="summary-state__secs">{{ rageSecsLeft }}s</span>
                </div>
              </Transition>
            </div>

            <div
              v-if="getStarRewardSummary(star).champion"
              class="summary-champion"
              :style="getChampionRoleStyles(getStarRewardSummary(star).champion!.name)"
            >
              <img
                :src="getStarRewardSummary(star).champion!.image"
                :alt="getStarRewardSummary(star).champion!.name"
                class="summary-champion__portrait"
              />
              <span class="summary-champion__text">
                <span class="summary-champion__eyebrow">Champion</span>
                <span class="summary-champion__name">{{
                  getStarRewardSummary(star).champion!.name
                }}</span>
              </span>
            </div>

            <div
              v-if="
                getStarRewardSummary(star).champion &&
                (getStarRewardSummary(star).totalChimes > 0 ||
                  getStarRewardSummary(star).materials.length > 0)
              "
              class="summary-divider"
            />

            <div class="summary-loot-row">
              <div v-if="getStarRewardSummary(star).totalChimes > 0" class="summary-item">
                <img src="/img/BardAbilities/BardChime-128.png" alt="Chimes" class="summary-icon" />
                <span class="summary-count"
                  >×{{ formatNumber(getStarRewardSummary(star).totalChimes) }}</span
                >
              </div>
              <div
                v-for="mat in getStarRewardSummary(star).materials"
                :key="mat.name"
                class="summary-item"
              >
                <img :src="mat.image" :alt="mat.name" class="summary-icon" />
                <span class="summary-count">×{{ mat.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </Teleport>

  <!-- ③ Planet-Zähler über jedem Stern -->
  <Teleport to="body">
    <div class="star-count-layer">
      <template v-for="star in starRenders" :key="'cnt-' + star.id">
        <Transition name="star-cnt">
          <div
            v-if="star.remainingCount > 0"
            :key="star.remainingCount"
            class="star-planet-count"
            :class="{
              'star-planet-count--cursed': isCursedStar(star.id),
              'star-planet-count--raging': ragingStarId === star.id,
            }"
            :style="starCountStyle(star)"
            :ref="(el) => setMapEl(countEls, star.id, el)"
          >
            <span class="star-planet-count__current">{{ star.remainingCount }}</span>
            <span class="star-planet-count__sep">/</span>
            <span class="star-planet-count__total">{{ star.totalPlanets }}</span>
          </div>
        </Transition>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { hexToRgb } from '@/utils/format'
import { Icon } from '@iconify/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useStarSystem } from '../../../composables/useStarSystem'
import OrbitPath from './OrbitPath.vue'
import type { StarRenderEntry } from '../../../composables/useStarSystem'
import AttackProjectileLayer from './AttackProjectileLayer.vue'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { useCombatStore } from '../../../stores/combatStore'
import { useBattleStore } from '../../../stores/battleStore'
import { usePlanetShopStore } from '../../../stores/planetShopStore'
import { usePlayerStore } from '../../../stores/playerStore'
import { useRoleBehaviorStore, CURSE_DEFS } from '../../../stores/roleBehaviorStore'
import { useUiStore } from '../../../stores/uiStore'
import { useRenderingPaused } from '../../../composables/useRenderingPaused'
import { resetCanvasIfContextLost } from '../../../utils/canvasContext'
import { useOrbitScale } from '../../../composables/useOrbitScale'
import { useProjectileSystem } from '../../../composables/useProjectileSystem'
import { MATERIALS } from '../../../config/materials'
import { formatNumber } from '../../../config/numberFormat'
import {
  ORBIT_TIERS,
  ROLE_BY_KEY,
  ROLE_COLORS,
  ENEMY_PROJECTILE_DAMAGE,
  ROLE_MID_CURSE_ATTACK_DEBUFF,
  ROLE_MID_CURSE_ATTACK_SLOW,
  STAR_BURST_COOLDOWN,
  STAR_BURST_DELAY_BETWEEN_SHOTS,
  BOSS_NOVA_INTERVAL_MS,
  HOVER_DIM_OPACITY,
  HOVER_DIM_FADE_MS,
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_AIM_LOCK_RADIUS_FACTOR,
  ORBIT_MIN_RY_SUN_FACTOR_BY_ROLE,
  ORBIT_MIN_RY_VIEWPORT_FACTOR_BY_ROLE,
  ORBIT_MAX_RX_VIEWPORT_FRACTION,
  ORBIT_RING_MIN_OPACITY,
  COOLDOWN_RING_MIN_PROGRESS,
  COOLDOWN_RING_HOT_PROGRESS,
  COOLDOWN_RING_TIP_RADIUS,
  COOLDOWN_RING_TIP_RADIUS_HOT,
  STAR_ORBIT_MIN_SUN_SCALE,
  HINT_SPRITE_CACHE_LIMIT,
} from '../../../config/constants'
import { CHAMPION_ROLES } from '../../../config/championData'
import { activeChampionBehindState, activePlayerPlanetPositions, activeStarCombatState } from '../../../utils/liveState'
import type { ChampionRole, StarType } from '../../../types'
import { starBodySize } from '../../../utils/geometry'
import { clearStarVanishFx } from '../../../utils/starVanishFx'

const uiStore = useUiStore()
const hoveredChampionRole = computed(() => uiStore.hoveredChampionRole)
const hoveredPlanetSlotId = computed(() => uiStore.hoveredPlanetSlotId)

// Dim a role's orbit ring when the player is focusing a different role
// (champion-slot hover), any planet (planet-tile hover) or a star.
function roleOrbitDimmed(role: ChampionRole): boolean {
  if (starGroupStore.hoveredTimerStarId !== null) return true
  if (hoveredPlanetSlotId.value !== null) return true
  return hoveredChampionRole.value !== null && role !== hoveredChampionRole.value
}

const hoveredStarId = ref<string | null>(null)
const hoveredSummaryStarId = ref<string | null>(null)
const effectiveHoveredStarId = computed(
  () => hoveredStarId.value ?? hoveredSummaryStarId.value ?? starGroupStore.hoveredTimerStarId,
)

// Stern-Fokus: sobald ein Stern gehovert wird (Orbit-Stern, Reward-Summary,
// Header-Timer-Bar oder Minimap), bleibt nur dieser Stern samt Bahn sichtbar —
// alle anderen Sterne, Champions und Planeten blenden aus. Umgekehrt blenden
// beim Command-Panel-Hover über Champions/Planeten alle Sterne aus.
const starFocusActive = computed(() => starGroupStore.hoveredTimerStarId !== null)

function isStarHoverDimmed(starId: string): boolean {
  if (hoveredChampionRole.value !== null || hoveredPlanetSlotId.value !== null) return true
  return starFocusActive.value && starId !== starGroupStore.hoveredTimerStarId
}

// Weiche Blende OHNE CSS-Transition — gleiches Muster wie in ChampionOrbit und
// PlanetOrbit: der Wert wird pro Stern gehalten, in applyFrames() Richtung Ziel
// gezogen und in die ohnehin pro Frame gesetzte Inline-Opacity gerechnet. Eine
// CSS-Transition auf opacity würde hier jeden Frame neu anlaufen, weil dieselben
// Elemente pro Frame ein neues transform bekommen — siehe HOVER_DIM_FADE_MS.
const starDimFactors = new Map<string, number>()
const STAR_DIM_SPAN = Math.max(0.001, 1 - HOVER_DIM_OPACITY)

/** Aktueller Blendenwert ohne Fortschreiten — für den initialen Vue-Render. */
function starHoverDimFactor(starId: string): number {
  return starDimFactors.get(starId) ?? (isStarHoverDimmed(starId) ? HOVER_DIM_OPACITY : 1)
}

function stepStarDimFactor(starId: string, dt: number): number {
  const target = isStarHoverDimmed(starId) ? HOVER_DIM_OPACITY : 1
  const current = starDimFactors.get(starId) ?? target
  const maxStep = (dt / HOVER_DIM_FADE_MS) * STAR_DIM_SPAN
  const diff = target - current
  const next = Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep
  starDimFactors.set(starId, next)
  return next
}

// Stern-Orbit-Tracks: beim Stern-Fokus bleibt nur die Bahn des gehoverten
// Sterns sichtbar (mit Fokus-Glow), beim Champion-/Planeten-Hover dimmen alle.
function hoveredStarType(): string | null {
  const id = starGroupStore.hoveredTimerStarId
  if (id === null) return null
  return starRenders.value.find((s) => s.id === id)?.starType ?? null
}

function starTrackFocused(tierIndex: number): boolean {
  return starFocusActive.value && hoveredStarType() === (tierIndex === 0 ? 'champion' : 'resource')
}

function starTrackDimmed(tierIndex: number): boolean {
  if (hoveredChampionRole.value !== null || hoveredPlanetSlotId.value !== null) return true
  return starFocusActive.value && !starTrackFocused(tierIndex)
}

// ── Per-Frame-DOM-Updates am Vue-Rendering vorbei ─────────────────────────────
// Vue rendert nur bei strukturellen Änderungen (Stern/Planet kommt/geht,
// Ebenenwechsel). Die 60fps-Positionsupdates schreibt applyFrames() direkt
// auf die hier registrierten Elemente — ohne VNode-Diffing pro Frame.
const starBackEls = new Map<string, HTMLElement>()
const starWrapEls = new Map<string, HTMLElement>()
const summaryEls = new Map<string, HTMLElement>()
const countEls = new Map<string, HTMLElement>()

type TemplateRef = Element | ComponentPublicInstance | null | undefined

function setMapEl<T extends Element>(map: Map<string, T>, id: string, el: TemplateRef) {
  if (el) {
    map.set(id, el as T)
  } else {
    // Beim Ebenenwechsel feuert der alte null-Ref nach dem neuen Set-Ref:
    // nur löschen, wenn das gespeicherte Element wirklich entfernt wurde.
    const cur = map.get(id)
    if (cur && !cur.isConnected) map.delete(id)
  }
}

// Elemente in Transitions bleiben beim Unmount kurz "connected" und würden
// sonst als verwaiste Map-Einträge liegen bleiben — periodisch aufräumen.
const ALL_EL_MAPS: Map<string, Element>[] = [
  starBackEls,
  starWrapEls,
  summaryEls,
  countEls,
]
let sweepCounter = 0

// ── Orbit-Glow-Ringe als Canvas-Sprites ──────────────────────────────────────
// Der Gaussian-Blur der Orbit-Hints ist teuer. Statt ihn (wie früher via SVG-
// Filter) jeden Frame neu zu rastern, wird der geblurrte Ring EINMAL pro
// Geometrie/Farbe in ein Offscreen-Sprite gezeichnet und pro Frame nur noch
// mit globalAlpha auf zwei Fullscreen-Canvases geblittet.
const hintBackCanvas = ref<HTMLCanvasElement | null>(null)
const hintFrontCanvas = ref<HTMLCanvasElement | null>(null)
const cooldownCanvas = ref<HTMLCanvasElement | null>(null)
const hintSpriteCache = new Map<string, HTMLCanvasElement>()
const HINT_SPRITE_SCALE = 0.5 // Blur verzeiht Skalierung; spart 4× Speicher
const canvasFilterSupported = 'filter' in CanvasRenderingContext2D.prototype
let hintCanvasesDirty = false

function hintMargin(blur: number, strokeWidth: number): number {
  return blur * 2.5 + strokeWidth
}

function getHintSprite(
  rx: number,
  ry: number,
  strokeWidth: number,
  blur: number,
  color: string,
): HTMLCanvasElement {
  const key = `${Math.round(rx)}|${Math.round(ry)}|${strokeWidth.toFixed(1)}|${blur}|${color}`
  const cached = hintSpriteCache.get(key)
  if (cached) return cached

  const S = HINT_SPRITE_SCALE
  const margin = hintMargin(blur, strokeWidth)
  const cv = document.createElement('canvas')
  cv.width = Math.max(2, Math.ceil((rx + margin) * 2 * S))
  cv.height = Math.max(2, Math.ceil((ry + margin) * 2 * S))
  const c = cv.getContext('2d')!
  c.strokeStyle = color
  if (canvasFilterSupported) {
    c.filter = `blur(${blur * S}px)`
    c.lineWidth = Math.max(0.5, strokeWidth * S)
    c.beginPath()
    c.ellipse(cv.width / 2, cv.height / 2, rx * S, ry * S, 0, 0, Math.PI * 2)
    c.stroke()
  } else {
    // Fallback ohne ctx.filter (altes Safari): geschichtete Strokes
    const layers = [
      { widthAdd: blur * 2.4, alpha: 0.12 },
      { widthAdd: blur * 1.1, alpha: 0.25 },
      { widthAdd: 0, alpha: 0.5 },
    ]
    for (const layer of layers) {
      c.globalAlpha = layer.alpha
      c.lineWidth = Math.max(0.5, (strokeWidth + layer.widthAdd) * S)
      c.beginPath()
      c.ellipse(cv.width / 2, cv.height / 2, rx * S, ry * S, 0, 0, Math.PI * 2)
      c.stroke()
    }
  }

  if (hintSpriteCache.size > HINT_SPRITE_CACHE_LIMIT) hintSpriteCache.clear()
  hintSpriteCache.set(key, cv)
  return cv
}

function drawHintRing(
  c: CanvasRenderingContext2D,
  star: StarRenderEntry,
  blur: number,
  alpha: number,
  color: string,
  strokeWidth: number,
  cx: number,
  cy: number,
) {
  const sprite = getHintSprite(star.orbitRx, star.orbitRy, strokeWidth, blur, color)
  const margin = hintMargin(blur, strokeWidth)
  const dw = (star.orbitRx + margin) * 2
  const dh = (star.orbitRy + margin) * 2
  c.save()
  c.translate(cx, cy)
  c.rotate(star.orbitTilt)
  c.globalAlpha = Math.min(1, alpha)
  c.drawImage(sprite, -dw / 2, -dh / 2, dw, dh)
  c.restore()
}

function drawHintCanvases() {
  const backC = hintBackCanvas.value?.getContext('2d')
  const frontC = hintFrontCanvas.value?.getContext('2d')
  if (!backC || !frontC) return

  const stars = starRenders.value.filter((s) => s.isBehind && s.hintOpacity > 0.002)
  if (stars.length === 0 && !hintCanvasesDirty) return

  const cw = screenW.value
  const ch = screenH.value
  backC.clearRect(0, 0, cw, ch)
  frontC.clearRect(0, 0, cw, ch)
  hintCanvasesDirty = stars.length > 0
  // Leere Canvases komplett ausblenden, damit der Compositor sie überspringt
  const display = stars.length > 0 ? '' : 'none'
  hintBackCanvas.value!.style.display = display
  hintFrontCanvas.value!.style.display = display
  if (stars.length === 0) return

  const strokeWidth = 5 * planetShopStore.orbitSunScale
  for (const star of stars) {
    const dim = starHoverDimFactor(star.id)
    if (dim <= 0.002) continue
    const color = orbitHintColor(star)
    drawHintRing(backC, star, 14, star.hintOpacity * 0.65 * dim, color, strokeWidth, cw / 2, ch / 2)
    drawHintRing(frontC, star, 16, star.hintOpacity * 0.8 * dim, color, strokeWidth, cw / 2, ch / 2)
  }
}

function sizeHintCanvases() {
  for (const cv of [hintBackCanvas.value, hintFrontCanvas.value, cooldownCanvas.value]) {
    if (cv) {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
    }
  }
  hintCanvasesDirty = true
}
// ─────────────────────────────────────────────────────────────────────────────

let lastDimTs = 0

function applyFrames() {
  if (++sweepCounter >= 300) {
    sweepCounter = 0
    for (const map of ALL_EL_MAPS) {
      for (const [id, el] of map) {
        if (!el.isConnected) map.delete(id)
      }
    }
    // Blendenwerte despawnter Sterne mitnehmen, sonst wächst die Map mit
    // jedem Stern, der je im Orbit war.
    const alive = new Set(starRenders.value.map((s) => s.id))
    for (const id of starDimFactors.keys()) {
      if (!alive.has(id)) starDimFactors.delete(id)
    }
  }

  const nowTs = performance.now()
  const dt = lastDimTs === 0 ? 16 : Math.min(nowTs - lastDimTs, 50)
  lastDimTs = nowTs

  for (const star of starRenders.value) {
    const s = starSize(star.starType)
    const half = s / 2
    // Scale auf 1%-Stufen quantisieren: Translation ist für den Compositor
    // gratis, aber jede Scale-Änderung kann eine Re-Rasterung des Layers
    // (inkl. der teuren box-shadows) auslösen.
    const starTransform = `translate(${star.x - half}px, ${star.y - half}px) scale(${star.scale.toFixed(2)})`
    const focus = isFocusStar(star.id)
    const dimFactor = stepStarDimFactor(star.id, dt)
    const baseOpacity = focus ? 1 : star.opacity

    if (star.isBehind && !focus) {
      const body = starBackEls.get(star.id)
      if (body) {
        body.style.transform = starTransform
        body.style.opacity = (star.opacity * dimFactor).toFixed(3)
        body.style.filter = star.filterStyle
      }
    } else {
      const wrap = starWrapEls.get(star.id)
      if (wrap) {
        wrap.style.transform = starTransform
        // Die Blende sitzt hier am Wrap statt als CSS-Opacity am .star-body:
        // ein Wert, ein Element, kein zweiter Transparenz-Layer im Subtree.
        wrap.style.opacity = (baseOpacity * dimFactor).toFixed(3)
      }
      const summary = summaryEls.get(star.id)
      if (summary) {
        summary.style.transform = `translate(${star.x}px, ${star.y + half + 58}px) translateX(-50%)`
        summary.style.opacity = dimFactor.toFixed(3)
      }
    }

    const count = countEls.get(star.id)
    if (count) {
      count.style.transform = `translate(${star.x}px, ${star.y - half - 25}px) translateX(-50%) translateY(-100%)`
      count.style.opacity = (baseOpacity * dimFactor).toFixed(3)
    }
  }

  drawHintCanvases()
}
// ─────────────────────────────────────────────────────────────────────────────

const { starRenders } = useStarSystem(effectiveHoveredStarId, applyFrames)
const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()

function handleStarClick(star: StarRenderEntry) {
  if (starGroupStore.starFightModalOpen) return
  starGroupStore.openStarFightModal(star.id)
}

// Stern-Hover: Orbit-Stern und Reward-Summary setzen beide den geteilten
// Fokus-Zustand. Bewusst als Methoden statt als mehrteilige Inline-Handler im
// Template: Prettier läuft hier mit `semi: false` und würde ein
// `a = 1; b()` im Attribut auf zwei Zeilen OHNE Semikolon umbrechen — der
// Vue-Template-Compiler kann das dann nicht mehr parsen.
function setStarHover(id: string | null) {
  hoveredStarId.value = id
  starGroupStore.setHoveredTimerStar(id)
}

function setSummaryHover(id: string | null) {
  hoveredSummaryStarId.value = id
  starGroupStore.setHoveredTimerStar(id)
}
const combatStore = useCombatStore()
const battleStore = useBattleStore()
const planetShopStore = usePlanetShopStore()
const { orbitScale } = useOrbitScale()

const scaledStarOrbitTiers = computed(() =>
  ORBIT_TIERS.star.map((tier, i) => {
    const type = i === 0 ? 'champion' : 'resource'
    // Beim Stern-Fokus die Geometrie des gehoverten Sterns bevorzugen —
    // mehrere Sterne desselben Typs können unterschiedliche Bahnen haben.
    const hoveredId = starGroupStore.hoveredTimerStarId
    const activeStar =
      starRenders.value.find((s) => s.id === hoveredId && s.starType === type) ??
      starRenders.value.find((s) => s.starType === type)
    if (activeStar) {
      return { ...tier, rx: activeStar.orbitRx, ry: activeStar.orbitRy }
    }
    const sunScale = planetShopStore.orbitSunScale
    const starSunScale = Math.max(STAR_ORBIT_MIN_SUN_SCALE, sunScale)
    return {
      ...tier,
      rx: tier.rx * starSunScale * orbitScale.value,
      ry: tier.ry * starSunScale * orbitScale.value,
    }
  }),
)
const playerStore = usePlayerStore()
const roleBehaviorStore = useRoleBehaviorStore()
const { isIdleRenderingPaused, isIdleSimulationPaused } = useRenderingPaused()

// ── Midlaner Fluch am Stern ───────────────────────────────────────────────────
// Der Fluch wird exakt wie die Boss-Rage getragen: Marke auf der Leine über der
// Beute plus Umfärben von Beute-Block und Planetenzähler. Gegenrichtung, gleiche
// Grammatik — Rage ist der Buff DES Sterns (Crimson), der Fluch unser Debuff AUF
// ihm (Violett, wie im Boss-HUD des Rescue-Overlays).
const curseSecsLeft = ref(0)
const curseDef = computed(() => {
  const curse = roleBehaviorStore.activeCurse
  return curse ? CURSE_DEFS[curse.type] : null
})

function isCursedStar(starId: string): boolean {
  return cursedStarId.value === starId
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Boss-Rage am Stern ────────────────────────────────────────────────────────
// Rage gehört immer genau EINEM Stern: `roleBehaviorStore.rageStarId` ist ein
// Einzelwert und folgt dem aktiv bekämpften Boss — nie eine Map über alle
// Sterne. Praktisch kann also höchstens eine Rage-Anzeige gleichzeitig laufen.
//
// Trotzdem ist die Darstellung so gebaut, dass sie das auch bei jedem Stern
// gleichzeitig aushielte: Der Zustand hängt an zwei Refs statt an einer
// Berechnung pro Stern, die Klassen sind reine String-Vergleiche, und die
// Bewegung steckt ausschließlich in opacity-animierten Pseudo-Elementen —
// Compositor-Arbeit ohne Layout und ohne Repaint. Der Sekundenwert wird nur
// beim Sekundenwechsel geschrieben, also höchstens ein Re-Render pro Sekunde
// statt einem pro Frame.
const ragingStarId = ref<string | null>(null)
const rageSecsLeft = ref(0)
// ─────────────────────────────────────────────────────────────────────────────

const SLOT_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

const activeRoleOrbits = computed(() => {
  const sunScale = planetShopStore.orbitSunScale
  const orbitScaleVal = orbitScale.value
  const vMin = Math.min(screenW.value, screenH.value)

  return battleStore.headerSlots
    .map((slot, i) => (slot != null ? SLOT_ROLES[i] : null))
    .filter((r): r is ChampionRole => r != null)
    .map((role) => {
      const roleTier = ROLE_BY_KEY[role].orbit
      const minRy = Math.max(
        planetShopStore.orbitSunRadius * ORBIT_MIN_RY_SUN_FACTOR_BY_ROLE[role],
        vMin * ORBIT_MIN_RY_VIEWPORT_FACTOR_BY_ROLE[role],
      )
      const aspectRatio = roleTier.rx / roleTier.ry
      const flooredRy = Math.max(roleTier.ry * sunScale * orbitScaleVal, minRy)
      const flooredRx = flooredRy * aspectRatio
      const capFactor = Math.min(
        1.0,
        ((screenW.value / 2) * ORBIT_MAX_RX_VIEWPORT_FRACTION) / flooredRx,
      )
      return {
        role,
        rx: flooredRx * capFactor,
        ry: flooredRy * capFactor,
        tiltDeg: roleTier.tiltDeg,
        color: roleTier.color,
      }
    })
})

// Fokussierter Stern (Timer-Bar/Minimap/Orbit-Hover): bleibt auch hinter der
// Sonne voll sichtbar — er wandert in den Front-Layer (inkl. Reward-Panel und
// Planeten-Zähler) und ignoriert Behind-Fade/Blur. Nur Optik: das Kampf-
// Gating (star.isBehind, Burst-Feuer, Foreground-Targeting) bleibt unberührt.
function isFocusStar(starId: string): boolean {
  return starGroupStore.hoveredTimerStarId === starId
}

const backStars = computed(() => starRenders.value.filter((s) => s.isBehind && !isFocusStar(s.id)))
const frontStars = computed(() => starRenders.value.filter((s) => !s.isBehind || isFocusStar(s.id)))

const cursedStarId = computed(() => {
  const curse = roleBehaviorStore.activeCurse
  if (!curse) return null
  const boss = bossStore.activeBoss
  if (!boss || boss.defeated || boss.expired) return null
  return (
    starRenders.value.find((s) => s.planets.some((p) => p.planetId === boss.planetId))?.id ?? null
  )
})

const hasActiveStars = computed(() => starRenders.value.length > 0)
const hasActiveChampions = computed(() => combatStore.champions.length > 0)

const starOrbitVisible = computed(() => [
  starRenders.value.some((s) => s.starType === 'champion' && s.isBehind),
  starRenders.value.some((s) => s.starType === 'resource' && s.isBehind),
])

const roleOrbitVisibility = computed(() =>
  activeRoleOrbits.value.map((entry) => {
    const slotIdx = SLOT_ROLES.indexOf(entry.role)
    const champName = battleStore.headerSlots[slotIdx]
    return champName ? (activeChampionBehindState[champName] ?? false) : false
  }),
)

const screenW = ref(window.innerWidth)
const screenH = ref(window.innerHeight)
const screenCx = computed(() => screenW.value / 2)
const screenCy = computed(() => screenH.value / 2)

function onResize() {
  screenW.value = window.innerWidth
  screenH.value = window.innerHeight
  sizeHintCanvases()
}

// ── Enemy Planet Attack System ────────────────────────────────────────────────
const {
  shots: enemyShots,
  spawnShot: spawnEnemyShot,
  tickShots: tickEnemyShots,
} = useProjectileSystem()

const ENEMY_TRAIL_COLOR = '#cc5500'
const ENEMY_HEAD_COLOR = '#ff8800'
const TOP_INTERCEPT_RADIUS = 50

interface StarBurstState {
  cooldownMs: number
  // Gesamtdauer des laufenden Cooldowns — kann pro Zyklus variieren
  // (Glaciation-Fluch), wird für die Fortschrittsanzeige gebraucht
  totalMs: number
  shotsLeft: number
  shotDelayMs: number
}
const starBurstStates = new Map<string, StarBurstState>()

// ── Shock Nova: der Stern des aktiven Bosses folgt NICHT dem normalen
// Burst-Takt — sein Ring spiegelt 1:1 den Nova-Cooldown aus dem
// roleBehaviorStore (synchron zum Nova-Ring im Star-Fight-Modal)
const novaStarId = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || boss.defeated || boss.expired) return null
  return (
    starGroupStore.activeStars.find((s) => s.planetSlots.some((p) => p.planetId === boss.planetId))
      ?.id ?? null
  )
})

const NOVA_TRAIL_COLOR = '#ff4400'
const NOVA_HEAD_COLOR = '#ffd080'

// Nova gezündet → der Boss-Stern feuert eine Salve auf alle Orbit-Champions,
// alle Spieler-Planeten und den Spieler in der Mitte. Der Schaden ist bereits
// autoritativ im roleBehaviorStore verrechnet — die Schüsse hier sind die
// Visualisierung des Treffers im Idle-Orbit.
watch(
  () => roleBehaviorStore.novaCounter,
  () => {
    if (reducedMotion || isIdleRenderingPaused.value) return
    const starId = novaStarId.value
    if (!starId) return
    const star = starRenders.value.find((s) => s.id === starId)
    if (!star || star.isBehind || star.opacity <= ORBIT_RING_MIN_OPACITY) return

    const novaOpts = { trailColor: NOVA_TRAIL_COLOR, headColor: NOVA_HEAD_COLOR }

    // Spieler in der Orbit-Mitte
    spawnEnemyShot(
      star.x,
      star.y,
      window.innerWidth / 2,
      window.innerHeight / 2,
      true,
      true,
      novaOpts,
    )

    // Alle sichtbaren Spieler-Planeten
    for (const [, pos] of activePlayerPlanetPositions) {
      if (pos.isForeground) spawnEnemyShot(star.x, star.y, pos.cx, pos.cy, true, true, novaOpts)
    }

    // Alle Orbit-Champions (mit bekannter Screen-Position, nicht hinter der Sonne)
    for (const champ of combatStore.champions) {
      if (champ.screenX === 0 && champ.screenY === 0) continue
      if (activeChampionBehindState[champ.name]) continue
      spawnEnemyShot(star.x, star.y, champ.screenX, champ.screenY, true, true, novaOpts)
    }
  },
)

// ── Boss-Auto-Attack "Strike": der Boss-Stern feuert EINEN Schuss auf exakt
// das Ziel, das auch im Star-Fight-Modal getroffen wurde (Champion-Orbit,
// Planeten-Slot ODER die Sonne in der Orbit-Mitte) — Schaden ist autoritativ
// im Store verrechnet, die Schüsse hier sind nur die Visualisierung
const STRIKE_TRAIL_COLOR = '#b0a890'
const STRIKE_HEAD_COLOR = '#f4ecd8'
const ROLE_SLOT_INDEX: Record<ChampionRole, number> = {
  top: 0,
  jungle: 1,
  mid: 2,
  adc: 3,
  support: 4,
}

watch(
  () => roleBehaviorStore.autoCounter,
  () => {
    if (reducedMotion || isIdleRenderingPaused.value) return
    const starId = novaStarId.value
    if (!starId) return
    const star = starRenders.value.find((s) => s.id === starId)
    if (!star || star.isBehind || star.opacity <= ORBIT_RING_MIN_OPACITY) return

    const strikeOpts = { trailColor: STRIKE_TRAIL_COLOR, headColor: STRIKE_HEAD_COLOR }
    const role = roleBehaviorStore.autoTargetRole
    if (role) {
      const name = battleStore.headerSlots[ROLE_SLOT_INDEX[role]]
      if (!name || activeChampionBehindState[name]) return
      const champ = combatStore.champions.find((c) => c.name === name)
      if (!champ || (champ.screenX === 0 && champ.screenY === 0)) return
      spawnEnemyShot(star.x, star.y, champ.screenX, champ.screenY, true, true, strikeOpts)
    } else if (roleBehaviorStore.autoTargetSun) {
      // Die eigene Sonne (= der Spieler) steht immer in der Orbit-Mitte und
      // immer im Vordergrund — der Schuss fliegt direkt auf den Bildschirmkern
      spawnEnemyShot(
        star.x,
        star.y,
        window.innerWidth / 2,
        window.innerHeight / 2,
        true,
        true,
        strikeOpts,
      )
    } else if (roleBehaviorStore.autoTargetSlotId) {
      const pos = activePlayerPlanetPositions.get(roleBehaviorStore.autoTargetSlotId)
      if (pos?.isForeground) {
        spawnEnemyShot(star.x, star.y, pos.cx, pos.cy, true, true, strikeOpts)
      }
    }
  },
)

// Zielscheibe auf der Sonne (Aim-Phase des Strikes): wächst mit dem
// Sonnenradius, damit sie in jeder Phase die Scheibe sauber umschließt
const sunAimStyle = computed(() => {
  const d = planetShopStore.currentSunRadius * SUN_AIM_LOCK_RADIUS_FACTOR
  return {
    width: `${Math.round(d)}px`,
    height: `${Math.round(d)}px`,
    '--sun-disc-inset': `${Math.round(
      (d - planetShopStore.currentSunRadius * SUN_BG_DISC_RADIUS_FACTOR) / 2,
    )}px`,
  }
})

let enemyAnimFrame = 0
let enemyLastTs = 0
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function effectiveBurstCooldown(): number {
  const curse = roleBehaviorStore.activeCurse
  const glaciated = curse?.type === 'glaciation' && Date.now() < curse.activeUntil
  return glaciated ? STAR_BURST_COOLDOWN * ROLE_MID_CURSE_ATTACK_SLOW : STAR_BURST_COOLDOWN
}

/** Zielwahl einer Salve: zufälliger sichtbarer Spieler-Planet, sonst der Bard in der Mitte. */
function pickEnemyShotTarget(): { x: number; y: number; slotId: string | null } {
  const foregroundSlots = [...activePlayerPlanetPositions.entries()].filter(
    ([, p]) => p.isForeground,
  )
  if (foregroundSlots.length > 0) {
    const [slotId, slotPos] = foregroundSlots[Math.floor(Math.random() * foregroundSlots.length)]
    return { x: slotPos.cx, y: slotPos.cy, slotId }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2, slotId: null }
}

/** Trefferschaden einer Salve — Fluch-Abschwächung inklusive. */
function applyEnemyShotDamage(slotId: string | null) {
  const curse = roleBehaviorStore.activeCurse
  const weakened = curse?.type === 'weakness' && Date.now() < curse.activeUntil
  const dmg = weakened
    ? Math.max(1, Math.round(ENEMY_PROJECTILE_DAMAGE * ROLE_MID_CURSE_ATTACK_DEBUFF))
    : ENEMY_PROJECTILE_DAMAGE
  if (slotId) {
    planetShopStore.takeDamage(slotId, dmg)
  } else {
    playerStore.takeDamage(dmg)
  }
}

/**
 * Salve ohne Projektil — unter dem Bard-Profil fliegt nichts, also wird der
 * Treffer sofort verrechnet statt beim Einschlag.
 *
 * Der Tank-Intercept wird dabei nachgebildet: Ohne diesen Zweig verlöre der
 * Spieler den Schild-Schutz seines Top-Laners genau dann, wenn er ihn nicht
 * sehen kann. Die Ausweichrichtung ist frei gewählt — sie steuert nur die
 * Animation, die hier ohnehin niemand sieht.
 */
function fireEnemyShotHeadless() {
  const target = pickEnemyShotTarget()
  const topLaneName = battleStore.headerSlots[0]

  if (target.slotId === null && topLaneName && roleBehaviorStore.tankShieldActive) {
    if (!activeChampionBehindState[topLaneName]) {
      const topChamp = combatStore.champions.find((c) => c.name === topLaneName)
      if (topChamp) {
        roleBehaviorStore.triggerIntercept(0, -1, topChamp.screenX, topChamp.screenY)
        return
      }
    }
  }

  applyEnemyShotDamage(target.slotId)
}

function fireEnemyShot(fromX: number, fromY: number) {
  const { x: targetX, y: targetY, slotId: capturedSlotId } = pickEnemyShotTarget()
  const capturedTopLaneName = battleStore.headerSlots[0]
  spawnEnemyShot(fromX, fromY, targetX, targetY, true, true, {
    trailColor: ENEMY_TRAIL_COLOR,
    headColor: ENEMY_HEAD_COLOR,
    interceptCheck:
      capturedSlotId === null && capturedTopLaneName
        ? (headX: number, headY: number) => {
            if (!roleBehaviorStore.tankShieldActive) return false
            if (activeChampionBehindState[capturedTopLaneName]) return false
            const topChamp = combatStore.champions.find((c) => c.name === capturedTopLaneName)
            if (!topChamp) return false
            return (
              Math.hypot(headX - topChamp.screenX, headY - topChamp.screenY) < TOP_INTERCEPT_RADIUS
            )
          }
        : undefined,
    onIntercept:
      capturedSlotId === null && capturedTopLaneName
        ? (headX: number, headY: number) => {
            const topChamp = combatStore.champions.find((c) => c.name === capturedTopLaneName)
            if (!topChamp) return
            const dx = headX - topChamp.screenX
            const dy = headY - topChamp.screenY
            const len = Math.hypot(dx, dy) || 1
            roleBehaviorStore.triggerIntercept(
              dx / len,
              dy / len,
              topChamp.screenX,
              topChamp.screenY,
            )
          }
        : undefined,
    onHit() {
      applyEnemyShotDamage(capturedSlotId)
    },
  })
}

// ── Cooldown-Ringe: alle Sterne auf EINEM Canvas, ein Draw-Pass pro Frame.
// Canvas-Arcs statt DOM/SVG pro Stern: kein Style-Recalc, keine Layer-
// Re-Rasterung — konstant billig auch bei 40+ Sternen gleichzeitig.
const TWO_PI = Math.PI * 2
let cooldownCanvasWasEmpty = false

function drawCooldownRings() {
  const cv = cooldownCanvas.value
  const c = cv?.getContext('2d')
  if (!cv || !c) return

  const stars = starRenders.value
  let drewAny = false
  c.clearRect(0, 0, cv.width, cv.height)

  for (const star of stars) {
    if (star.isBehind || star.opacity <= ORBIT_RING_MIN_OPACITY) continue

    // Boss-Stern: Ring spiegelt den Shock-Nova-Cooldown aus dem Store —
    // exakt synchron zum Nova-Ring im Star-Fight-Modal
    const isNovaStar = star.id === novaStarId.value
    const state = starBurstStates.get(star.id)
    if (!state && !isNovaStar) continue

    const r = (starSize(star.starType) / 2 + 9) * star.scale
    const alpha = star.opacity * starHoverDimFactor(star.id)
    if (alpha <= ORBIT_RING_MIN_OPACITY) continue
    const bursting = !isNovaStar && state!.shotsLeft > 0
    // Nova: Zeitstempel-Interpolation pro Frame — smooth wie die Burst-Ringe,
    // statt im 1s-Raster des Store-Ticks zu springen
    const progress = isNovaStar
      ? roleBehaviorStore.novaReadyAt > 0
        ? Math.max(
            0,
            Math.min(1, 1 - (roleBehaviorStore.novaReadyAt - Date.now()) / BOSS_NOVA_INTERVAL_MS),
          )
        : 0
      : bursting
        ? 1
        : 1 - Math.max(0, state!.cooldownMs) / state!.totalMs
    const lineW = isNovaStar ? 3 : 2
    drewAny = true

    // Leise Spur, damit der Ring auch bei wenig Fortschritt lesbar ist
    c.beginPath()
    c.arc(star.x, star.y, r, 0, TWO_PI)
    c.strokeStyle = isNovaStar ? `rgba(255,80,0,${0.14 * alpha})` : `rgba(255,136,0,${0.1 * alpha})`
    c.lineWidth = lineW
    c.stroke()

    if (progress <= COOLDOWN_RING_MIN_PROGRESS) continue
    const start = -Math.PI / 2
    const end = start + progress * TWO_PI
    const hot = bursting || progress > COOLDOWN_RING_HOT_PROGRESS
    c.beginPath()
    c.arc(star.x, star.y, r, start, end)
    c.strokeStyle = isNovaStar
      ? hot
        ? `rgba(255,190,120,${0.95 * alpha})`
        : `rgba(255,105,30,${0.7 * alpha})`
      : hot
        ? `rgba(255,205,95,${0.9 * alpha})`
        : `rgba(255,150,45,${0.55 * alpha})`
    c.lineWidth = lineW
    c.lineCap = 'round'
    c.stroke()

    // Glüh-Spitze am Ende des Bogens
    if (!bursting) {
      c.beginPath()
      c.arc(star.x + Math.cos(end) * r, star.y + Math.sin(end) * r, hot ? COOLDOWN_RING_TIP_RADIUS_HOT : COOLDOWN_RING_TIP_RADIUS, 0, TWO_PI)
      c.fillStyle = `rgba(255,215,130,${0.85 * alpha})`
      c.fill()
    }
  }

  // Leeres Canvas ausblenden, damit der Compositor es überspringt
  const empty = !drewAny
  if (empty !== cooldownCanvasWasEmpty) {
    cooldownCanvasWasEmpty = empty
    cv.style.display = empty ? 'none' : ''
  }
}

function enemyAttackLoop(ts: number) {
  const dt = enemyLastTs === 0 ? 16 : Math.min(ts - enemyLastTs, 50)
  enemyLastTs = ts

  if (!reducedMotion) {
    // Unter dem Bard-Profil läuft der Salven-Takt weiter, aber ohne Projektile:
    // Treffer werden dann sofort verrechnet statt beim Einschlag. Der Zustand
    // kommt aus activeStarCombatState statt aus der Render-Liste — die wird im
    // verdeckten Zustand bewusst nicht mehr fortgeschrieben.
    const headless = isIdleRenderingPaused.value
    if (!headless) tickEnemyShots(dt)

    for (const [starId, star] of activeStarCombatState) {
      if (star.isBehind) continue

      // Boss-Stern: feuert nicht im Burst-Takt — seine Shock Nova läuft über
      // den Store-Cooldown (siehe novaCounter-Watch), Ring kommt aus dem Store
      if (starId === novaStarId.value) {
        starBurstStates.delete(starId)
        continue
      }

      let state = starBurstStates.get(starId)
      if (!state) {
        state = {
          cooldownMs: STAR_BURST_COOLDOWN,
          totalMs: STAR_BURST_COOLDOWN,
          shotsLeft: 0,
          shotDelayMs: 0,
        }
        starBurstStates.set(starId, state)
      }

      if (state.shotsLeft > 0) {
        state.shotDelayMs -= dt
        if (state.shotDelayMs <= 0) {
          if (headless) fireEnemyShotHeadless()
          else fireEnemyShot(star.x, star.y)
          state.shotsLeft -= 1
          if (state.shotsLeft === 0) {
            state.cooldownMs = effectiveBurstCooldown()
            state.totalMs = state.cooldownMs
          } else {
            state.shotDelayMs = STAR_BURST_DELAY_BETWEEN_SHOTS
          }
        }
      } else {
        state.cooldownMs -= dt
        if (state.cooldownMs <= 0) {
          const count = star.firablePlanets
          if (count > 0) {
            state.shotsLeft = count
            state.shotDelayMs = 0
          } else {
            state.cooldownMs = effectiveBurstCooldown()
            state.totalMs = state.cooldownMs
          }
        }
      }
    }

    for (const id of starBurstStates.keys()) {
      if (!activeStarCombatState.has(id)) starBurstStates.delete(id)
    }

    if (headless) {
      enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
      return
    }

    // ── Fluch-Timer aktualisieren (ganze Sekunden → max. 1 Re-Render/s) ──────
    const curse = roleBehaviorStore.activeCurse
    const secsLeft =
      curse && Date.now() < curse.activeUntil
        ? Math.max(0, Math.ceil((curse.activeUntil - Date.now()) / 1000))
        : 0
    if (secsLeft !== curseSecsLeft.value) curseSecsLeft.value = secsLeft
    // ─────────────────────────────────────────────────────────────────────────

    // ── Rage-Timer aktualisieren (gleiches Muster: nur bei Sekundenwechsel) ──
    // Kein eigener Interval: der Zustand hängt an zwei Refs, die hier im ohnehin
    // laufenden Frame nachgezogen werden. Zwischen zwei Sekunden schreibt die
    // Schleife nichts, also rendert Vue auch nichts neu.
    const rageUntil = roleBehaviorStore.rageActiveUntil
    const rageSecs =
      rageUntil > Date.now() ? Math.max(0, Math.ceil((rageUntil - Date.now()) / 1000)) : 0
    const ragingId = rageSecs > 0 ? roleBehaviorStore.rageStarId : null
    if (rageSecs !== rageSecsLeft.value) rageSecsLeft.value = rageSecs
    if (ragingId !== ragingStarId.value) ragingStarId.value = ragingId
    // ─────────────────────────────────────────────────────────────────────────

    drawCooldownRings()
  }

  enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
}

// Gestoppt wird nur bei echtem Stillstand — unter dem Bard-Profil feuern die
// Sterne headless weiter (siehe oben).
watch(isIdleSimulationPaused, (paused) => {
  if (paused) {
    cancelAnimationFrame(enemyAnimFrame)
    enemyAnimFrame = 0
  } else if (!enemyAnimFrame) {
    enemyLastTs = 0
    enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
  }
})

// Zurück aus dem verdeckten Zustand: Nach langem Hintergrund-Aufenthalt können
// die Canvas-Buffer vom Browser verworfen worden sein → frisch allozieren;
// hintCanvasesDirty erzwingt den vollständigen Neuaufbau der Orbit-Hints.
//
// Bewusst einen Frame später: der Frame, in dem das Star-Fight-Modal schließt,
// trägt schon den Unmount des ganzen Modal-Subtrees und den ersten wieder
// ausgegebenen Orbit-Frame. Kämen der Neuaufbau zweier viewportgroßer Canvases
// und die Context-Prüfungen dort noch dazu, wäre das der lange Frame, den man
// als Ruckler beim Zurückwechseln sieht.
let hintResumeFrame = 0
watch(isIdleRenderingPaused, (paused) => {
  cancelAnimationFrame(hintResumeFrame)
  if (paused) return
  hintResumeFrame = requestAnimationFrame(() => {
    resetCanvasIfContextLost(hintBackCanvas.value)
    resetCanvasIfContextLost(hintFrontCanvas.value)
    resetCanvasIfContextLost(cooldownCanvas.value)
    hintCanvasesDirty = true
  })
})
// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  window.addEventListener('resize', onResize)
  sizeHintCanvases()
  enemyAnimFrame = requestAnimationFrame(enemyAttackLoop)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(enemyAnimFrame)
  cancelAnimationFrame(hintResumeFrame)
  // Das FX-Canvas hängt direkt am body — ohne die Sternebene hat es nichts mehr
  // zu zeigen (Prestige, Universe-Wechsel).
  clearStarVanishFx()
})

function orbitHintColor(star: StarRenderEntry): string {
  const [r, g, b] = star.starColor
  return `rgb(${r},${g},${b})`
}

function starSize(type: StarType): number {
  return starBodySize(type, planetShopStore.orbitSunScale)
}

function starBoxShadow(starColor: [number, number, number], s: number): string {
  const rn = (n: number) => Math.round(s * n)
  const [r, g, b] = starColor
  return [
    `0 0 ${rn(0.19)}px rgba(${r},${g},${b},0.95)`,
    `0 0 ${rn(0.44)}px rgba(${r},${g},${b},0.65)`,
    `0 0 ${rn(0.8)}px rgba(${r},${g},${b},0.35)`,
  ].join(', ')
}

function starWrapStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x - s / 2}px, ${star.y - s / 2}px) scale(${star.scale.toFixed(2)})`,
    opacity: ((isFocusStar(star.id) ? 1 : star.opacity) * starHoverDimFactor(star.id)).toFixed(3),
    width: `${s}px`,
    height: `${s}px`,
  }
}

function starBodyVisualStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  const ringInset = Math.round(s * 0.16)
  const [r, g, b] = star.starColor
  const r2 = Math.round(r * 0.55),
    g2 = Math.round(g * 0.55),
    b2 = Math.round(b * 0.55)
  const r3 = Math.round(r * 0.22),
    g3 = Math.round(g * 0.22),
    b3 = Math.round(b * 0.22)
  return {
    background: `radial-gradient(circle, rgb(${r},${g},${b}) 0%, rgb(${r2},${g2},${b2}) 45%, rgb(${r3},${g3},${b3}) 100%)`,
    boxShadow: starBoxShadow(star.starColor, s),
    '--star-rgb': `${r}, ${g}, ${b}`,
    '--ring-inset': `-${ringInset}px`,
    // Fokussierter Stern: kein Behind-Blur — er soll vor der Sonne klar lesbar sein
    filter: (isFocusStar(star.id) ? '' : star.filterStyle) || undefined,
    // Nur der Filter-Umschlag darf weich sein — die Opacity wird pro Frame
    // inline geschrieben, eine Transition darauf liefe jeden Frame neu an.
    transition: 'filter 0.3s ease',
  }
}

function starBodyBackStyle(star: StarRenderEntry) {
  return {
    ...starWrapStyle(star),
    ...starBodyVisualStyle(star),
    opacity: (star.opacity * starHoverDimFactor(star.id)).toFixed(3),
    // Back-Layer-Sterne bekommen opacity + filter pro Frame inline geschrieben —
    // eine Transition würde dabei jeden Frame neu anlaufen (Style-Recalc +
    // Animations-Engine pro Stern pro Frame) und nie sichtbar zu Ende laufen.
    transition: 'none',
  }
}

function getChampionRoleStyles(name: string): Record<string, string> {
  const role = CHAMPION_ROLES[name]
  const hex = (role && ROLE_COLORS[role]) ?? '#e8c040'
  const [r, g, b] = hexToRgb(hex)
  return {
    '--champ-color': hex,
    '--champ-glow': `rgba(${r}, ${g}, ${b}, 0.5)`,
    '--champ-glow-dim': `rgba(${r}, ${g}, ${b}, 0.25)`,
    '--champ-glow-bright': `rgba(${r}, ${g}, ${b}, 0.8)`,
    '--champ-glow-mid': `rgba(${r}, ${g}, ${b}, 0.45)`,
  }
}

interface StarRewardSummary {
  totalChimes: number
  materials: { image: string; name: string; count: number }[]
  champion: { name: string; image: string } | null
}

const EMPTY_REWARD_SUMMARY: StarRewardSummary = { totalChimes: 0, materials: [], champion: null }

// Memoized pro Stern: rechnet nur bei Boss-/Slot-Änderungen neu, nicht pro Frame.
// Vorher lief das bis zu 8× pro Stern pro Frame mit find() über alle Bosses (O(n²)).
const rewardSummaries = computed(() => {
  const bossByPlanet = new Map(bossStore.activeBosses.map((b) => [b.planetId, b]))
  const map = new Map<string, StarRewardSummary>()

  for (const star of starGroupStore.activeStars) {
    let totalChimes = 0
    const materialMap = new Map<string, { image: string; name: string; count: number }>()
    let champion: { name: string; image: string } | null = null

    for (const slot of star.planetSlots) {
      if (slot.cleared) continue
      const boss = bossByPlanet.get(slot.planetId)
      if (!boss || boss.defeated || boss.expired) continue

      totalChimes += boss.rewardSlots
        .filter((s) => s.type === 'chimes')
        .reduce((sum, s) => sum + (s.amount ?? 0), 0)

      for (const rewardSlot of boss.rewardSlots.filter((s) => s.type === 'material')) {
        if (rewardSlot.materialId) {
          const mat = MATERIALS.find((m) => m.id === rewardSlot.materialId)
          if (mat) {
            const existing = materialMap.get(rewardSlot.materialId)
            if (existing) {
              existing.count += 1
            } else {
              materialMap.set(rewardSlot.materialId, {
                image: mat.image ?? '',
                name: mat.name,
                count: 1,
              })
            }
          }
        }
      }

      if (!champion && boss.isChampionPlanet && boss.homePlanetChampion) {
        champion = {
          name: boss.homePlanetChampion,
          image: battleStore.getChampionImage(boss.homePlanetChampion, { size: 'md' }),
        }
      }
    }

    map.set(star.id, { totalChimes, materials: [...materialMap.values()], champion })
  }

  return map
})

function getStarRewardSummary(star: StarRenderEntry): StarRewardSummary {
  return rewardSummaries.value.get(star.id) ?? EMPTY_REWARD_SUMMARY
}

function rewardSummaryStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y + s / 2 + 58}px) translateX(-50%)`,
  }
}

function starCountStyle(star: StarRenderEntry) {
  const s = starSize(star.starType)
  return {
    transform: `translate(${star.x}px, ${star.y - s / 2 - 25}px) translateX(-50%) translateY(-100%)`,
    opacity: isFocusStar(star.id) ? '1' : (star.opacity * starHoverDimFactor(star.id)).toFixed(3),
  }
}
</script>

<style scoped>
.orbit-tracks-svg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  overflow: visible;
}

.star-sys-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.star-sys-back {
  z-index: 3;
}

.star-sys-front {
  z-index: 7;
}

.orbit-hints-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ── Zielscheibe auf der Sonne: der Boss visiert den Spieler mit "Strike" an.
   Gleiche Signatur wie rsq-aim-lock (Champions) und tbh-aim-lock (Turrets) —
   rotierender Reticle-Ring + rote Tönung —, hier aber komplett in CSS: die
   game-icons sind gefüllte Silhouetten und decken bei ~500 px die ganze
   Sonnenscheibe zu. Nur transform/opacity animiert (Compositor). ──────────── */
.sun-aim-lock {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 8;
  animation: sun-aim-in 0.2s ease-out both;
}

/* Peil-Ring: gestrichelt, dreht langsam — die Striche lesen sich als Skala */
.sun-aim-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px dashed rgba(255, 90, 60, 0.85);
  box-shadow:
    0 0 20px rgba(255, 60, 40, 0.4),
    inset 0 0 20px rgba(255, 60, 40, 0.18);
  animation: sun-aim-spin 7s linear infinite;
  will-change: transform;
}

/* Innerer, durchgezogener Ring auf Höhe der Sonnenscheibe — gegenläufig */
.sun-aim-ring--inner {
  inset: var(--sun-disc-inset, 0px);
  border: 2px solid rgba(255, 130, 100, 0.5);
  box-shadow: none;
  animation-duration: 11s;
  animation-direction: reverse;
}

/* Vier Fadenkreuz-Marken am Ring (N/O/S/W) über zwei gekreuzte Bänder */
.sun-aim-lock::before,
.sun-aim-lock::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
}

.sun-aim-lock::before {
  width: 2px;
  height: 100%;
  margin: -50% 0 0 -1px;
  background: linear-gradient(
    to bottom,
    rgba(255, 100, 70, 0.85) 0 9%,
    transparent 9% 91%,
    rgba(255, 100, 70, 0.85) 91% 100%
  );
}

.sun-aim-lock::after {
  height: 2px;
  width: 100%;
  margin: -1px 0 0 -50%;
  background: linear-gradient(
    to right,
    rgba(255, 100, 70, 0.85) 0 9%,
    transparent 9% 91%,
    rgba(255, 100, 70, 0.85) 91% 100%
  );
}

/* Rote Tönung genau auf der Sonnenscheibe (SUN_BG_DISC_RADIUS_FACTOR) —
   nur ein Hauch, die Sonne soll ihre Phasenfarbe behalten */
.sun-aim-tint {
  position: absolute;
  inset: var(--sun-disc-inset, 0px);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 60, 40, 0.03) 0%,
    rgba(255, 60, 40, 0.08) 62%,
    rgba(255, 50, 30, 0.2) 100%
  );
  animation: sun-aim-tint 0.6s ease-in-out infinite alternate;
  will-change: opacity;
}

@keyframes sun-aim-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes sun-aim-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes sun-aim-tint {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}

.star-body-wrap {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  cursor: pointer;
  will-change: transform, opacity;
}

.star-body {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  will-change: transform, filter;
  animation: star-spawn 0.7s ease-out;
  pointer-events: none;
}

/* Puls über Opacity eines Overlays statt filter: brightness() —
   läuft auf dem Compositor und erzwingt keine Repaints pro Frame. */
.star-pulse-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.15) 55%,
    transparent 78%
  );
  opacity: 0;
  animation: star-pulse-opacity 2.8s ease-in-out 0.7s infinite;
  will-change: opacity;
  pointer-events: none;
}

@keyframes star-pulse-opacity {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.75;
  }
}

.star-body-wrap:hover .star-body,
.star-body-wrap.star-hovered .star-body {
  animation: star-hover-pulse 0.6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px #ffe066) drop-shadow(0 0 22px rgba(255, 224, 102, 0.45))
    brightness(1.3);
}

.star-body-wrap:active .star-body {
  animation: star-hover-pulse 0.6s ease-in-out infinite;
  filter: drop-shadow(0 0 10px #ffe066) brightness(1.3);
}

@keyframes star-hover-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-body-wrap:hover .star-body,
  .star-body-wrap:active .star-body,
  .star-body-wrap.star-hovered .star-body {
    animation: none;
    filter: drop-shadow(0 0 14px #ffe066) brightness(1.25);
  }

  .sun-aim-lock,
  .sun-aim-ring,
  .sun-aim-tint {
    animation: none;
  }
}

/* ── Hover-Fokus (Stern gehovert oder Champion-/Planeten-Hover im Command
   Panel): nicht fokussierte Sterne ausblenden — gleiches Muster wie bei
   Champions und Planeten. ── */
/* Die Blende selbst läuft über die pro Frame gesetzte Inline-Opacity am Wrap
   (applyFrames → stepStarDimFactor); hier bleibt nur, was kein Malen kostet. */
.star-body-wrap--hover-dimmed {
  pointer-events: none;
}

.star-body--champion::after,
.star-body--resource::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -11px);
  border-radius: 50%;
  border: 1.5px solid rgba(var(--star-rgb), 0.45);
  animation: star-ring-pulse 2.8s ease-in-out infinite;
  pointer-events: none;
}

/* ── Galaxieboss: episches Doppelring- + Corona-Styling ─────────────────────
   Alle Animationen laufen über transform/opacity auf eigenen Pseudo-Layern —
   Compositor-only, keine Repaints pro Frame. */
.star-body--galaxy_boss::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -14px);
  border-radius: 50%;
  border: 2.5px solid rgba(var(--star-rgb), 0.75);
  box-shadow:
    0 0 12px rgba(var(--star-rgb), 0.55),
    inset 0 0 10px rgba(var(--star-rgb), 0.4);
  animation: star-ring-pulse 1.6s ease-in-out infinite;
  pointer-events: none;
}

/* Rotierende Corona: conic-gradient-Speichen, die langsam ums Zentrum kreisen */
.star-body--galaxy_boss::before {
  content: '';
  position: absolute;
  inset: calc(var(--ring-inset, -14px) * 2.4);
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(var(--star-rgb), 0.5) 0deg,
    transparent 30deg,
    rgba(var(--star-rgb), 0.28) 60deg,
    transparent 95deg,
    rgba(var(--star-rgb), 0.5) 120deg,
    transparent 150deg,
    rgba(var(--star-rgb), 0.28) 180deg,
    transparent 215deg,
    rgba(var(--star-rgb), 0.5) 240deg,
    transparent 270deg,
    rgba(var(--star-rgb), 0.28) 300deg,
    transparent 335deg,
    rgba(var(--star-rgb), 0.5) 360deg
  );
  -webkit-mask-image: radial-gradient(circle, transparent 42%, #000 55%, transparent 76%);
  mask-image: radial-gradient(circle, transparent 42%, #000 55%, transparent 76%);
  animation: galaxy-boss-corona-spin 9s linear infinite;
  will-change: transform;
  pointer-events: none;
}

@keyframes galaxy-boss-corona-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Herzschlag des Bosses: schnellerer, härterer Kern-Puls als bei normalen Sternen */
.star-body--galaxy_boss .star-pulse-overlay {
  animation-duration: 1.4s;
}

/* Eskorten: kleiner, aggressiver Warnring */
.star-body--boss_escort::after {
  content: '';
  position: absolute;
  inset: var(--ring-inset, -8px);
  border-radius: 50%;
  border: 1.5px solid rgba(var(--star-rgb), 0.65);
  animation: star-ring-pulse 1.3s ease-in-out infinite;
  pointer-events: none;
}

.star-body--boss_escort .star-pulse-overlay {
  animation-duration: 1.8s;
}

@media (prefers-reduced-motion: reduce) {
  .star-body--galaxy_boss::before {
    animation: none;
  }
}

@keyframes star-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.82;
  }
}

@keyframes star-spawn {
  0% {
    filter: brightness(3.5) saturate(1.8);
  }
  50% {
    filter: brightness(2) saturate(1.3);
  }
  100% {
    filter: brightness(1) saturate(1);
  }
}

.star-reward-summary {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  cursor: pointer;
  z-index: 8;
  /* Eigener Compositor-Layer: bewegt sich pro Frame per transform,
     ohne will-change malt der Browser die Box samt Schatten jedes Mal neu.
     Bewusst OHNE transition auf opacity: dieselbe Box bekommt pro Frame ein
     neues transform, eine laufende Opacity-Transition liefe damit jeden Frame
     neu an. Die Blende kommt aus applyFrames als Inline-Opacity. */
  will-change: transform;
}

.star-reward-summary--hover-dimmed {
  pointer-events: none;
}

.summary-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Basis-Schriftgröße skaliert mit dem Viewport, alle inneren Größen hängen
     per em daran: ~11.8px @1440 (MacBook), ~13.4px @1920, ~15px ab 2560 */
  font-size: clamp(0.65rem, 0.35vw + 0.42rem, 0.95rem);
  gap: 0.45em;
  padding: 0.55em 0.9em;
  border-radius: 4px;
  background: linear-gradient(160deg, #0e0b1a 0%, #111008 100%);
  border: 1px solid rgba(232, 192, 64, 0.45);
  box-shadow:
    0 0 8px rgba(232, 192, 64, 0.12),
    inset 0 0 0 1px rgba(232, 192, 64, 0.08);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
  user-select: none;
  position: relative;
}

.summary-inner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 1px;
  height: 52px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(232, 192, 64, 0.25) 40%,
    rgba(232, 192, 64, 0.5) 100%
  );
}

.star-reward-summary:hover .summary-inner {
  transform: translateY(-3px);
  border-color: rgba(232, 192, 64, 0.85);
  box-shadow:
    0 0 18px rgba(232, 192, 64, 0.35),
    inset 0 0 0 1px rgba(232, 192, 64, 0.2);
}

.star-reward-summary:active .summary-inner {
  transform: translateY(-1px);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.2);
}

.star-reward-summary--star-hovered .summary-inner {
  border-color: rgba(232, 192, 64, 0.9);
  box-shadow:
    0 0 22px rgba(232, 192, 64, 0.4),
    0 0 6px rgba(255, 220, 80, 0.25),
    inset 0 0 0 1px rgba(232, 192, 64, 0.2);
}

/* ── Statuszustände am Stern: Boss-Rage & Fluch ──────────────────────────────
   Der Sternkörper bleibt bewusst unberührt: er trägt bereits Eigenfarbe, Glow
   und Typ-Puls — ein zweites Signal darauf macht beide unlesbar. Getragen wird
   der Zustand von den zwei Elementen, die ohnehin schon Text zeigen: Beute-
   Block und Planetenzähler.

   Zwei Zustände, eine Grammatik, zwei Farben — das Vorzeichen steckt allein in
   der Farbe:
     Rage  = Buff DES Sterns  → Crimson (#ff2e63 / #ff5c85 / #ffb0c4), wie der
             Rage-Ring im Star-Fight
     Fluch = unser Debuff AUF dem Stern → Violett (#c060ff / #d9a0ff), wie das
             Curse-Panel im Rescue-Overlay
   Beide sprechen damit die Sprache, die der Spieler an anderer Stelle für
   dieselbe Mechanik schon kennt.

   Bewegt wird ausschließlich die Opazität eines Overlays. Weder border-color
   noch box-shadow werden je animiert: beide zwingen den Browser, die Box samt
   Schatten in jedem Frame neu zu rastern — genau der Paint-Sturm, der bei
   vielen gleichzeitig markierten Sternen die Framerate bricht. Über Opazität
   bleibt es eine reine Compositor-Aufgabe, unabhängig von der Sternzahl. Der
   einmalige Farbwechsel darf dagegen weich sein: eine Transition läuft nur
   beim Umschalten, nicht dauerhaft. */
.star-reward-summary--raging .summary-inner {
  border-color: rgba(255, 46, 99, 0.72);
  box-shadow:
    0 0 14px rgba(255, 46, 99, 0.3),
    inset 0 0 0 1px rgba(255, 46, 99, 0.14);
}

.star-reward-summary--cursed .summary-inner {
  border-color: rgba(160, 40, 255, 0.72);
  box-shadow:
    0 0 14px rgba(160, 40, 255, 0.3),
    inset 0 0 0 1px rgba(160, 40, 255, 0.14);
}

/* Auch das Verbindungsstrichlein zum Stern zieht mit — sonst hinge ein roter
   Block an einer goldenen Leine. */
.star-reward-summary--raging .summary-inner::before {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 46, 99, 0.3) 40%,
    rgba(255, 92, 133, 0.7) 100%
  );
}

.star-reward-summary--cursed .summary-inner::before {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(160, 40, 255, 0.3) 40%,
    rgba(192, 96, 255, 0.7) 100%
  );
}

.star-reward-summary--raging .summary-inner::after,
.star-reward-summary--cursed .summary-inner::after {
  content: '';
  position: absolute;
  inset: -1px;
  border: 1px solid rgba(255, 92, 133, 0.95);
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  animation: summary-state-pulse 1.1s ease-in-out infinite;
}

/* Der Fluch pulst langsamer als die Rage: er ist unser Zeitfenster, keine
   Warnung — und zwei gleich schnelle Pulse nebeneinander flackerten. */
.star-reward-summary--cursed .summary-inner::after {
  border-color: rgba(200, 120, 255, 0.95);
  animation-duration: 1.6s;
}

/* ── Beides gleichzeitig ──────────────────────────────────────────────────────
   Die statische Kontur gehört der Rage: sie ist die Gefahr, und Gefahr gewinnt
   die ruhige Fläche. Der Puls darüber wird zum Verlauf Violett → Crimson und
   zeigt damit beide Kräfte an einem Rahmen, statt zwei Ringe übereinander zu
   stapeln. Technisch ein 1px-Gradient-Rahmen per Masken-Trick (border kann
   keinen Verlauf) — animiert wird weiterhin nur opacity. */
.star-reward-summary--cursed.star-reward-summary--raging .summary-inner {
  border-color: rgba(255, 46, 99, 0.72);
  box-shadow:
    0 0 14px rgba(255, 46, 99, 0.26),
    0 0 22px rgba(160, 40, 255, 0.22),
    inset 0 0 0 1px rgba(200, 120, 255, 0.12);
}

.star-reward-summary--cursed.star-reward-summary--raging .summary-inner::before {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(192, 96, 255, 0.55) 45%,
    rgba(255, 92, 133, 0.75) 100%
  );
}

.star-reward-summary--cursed.star-reward-summary--raging .summary-inner::after {
  border: none;
  padding: 1px;
  background: linear-gradient(150deg, #c060ff 0%, #e0509f 50%, #ff2e63 100%);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  animation-duration: 1.1s;
}

@keyframes summary-state-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* Statusmarken über der Beute: sie qualifizieren den Loot darunter — solange
   Rage steht, kostet dieser Stern doppelten Schaden; solange der Fluch steht,
   ist er angeschlagen.

   Bewusst absolut aus dem Fluss genommen und in den leeren Verbindungsstrich
   zum Stern gehängt, statt als zusätzliche Zeile im Block: der Block hängt
   unter dem Stern und wächst nach unten: eine Zeile mehr schiebt ihn bei tief
   stehenden Sternen in die Bottom-Bar. So bleibt seine Höhe unverändert, und
   der Platz auf der Leine war ohnehin ungenutzt.

   Der Stapel ist unten verankert (bottom) und wächst nach oben in die Leine
   hinein: liegt nur ein Zustand an, sitzt seine Marke exakt dort, wo die
   Rage-Marke bisher saß — der zweite klappt darüber auf, ohne die erste zu
   verschieben. Zwei Marken belegen zusammen ~46px der 52px langen Leine, der
   Stern darüber bleibt also frei. */
.summary-states {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
}

.summary-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.38em;
  white-space: nowrap;
  padding: 0.14em 0.5em;
  border-radius: 4px;
}

.summary-state--rage {
  background: rgba(26, 5, 14, 0.88);
  border: 1px solid rgba(255, 46, 99, 0.75);
}

.summary-state--curse {
  background: rgba(16, 4, 30, 0.88);
  border: 1px solid rgba(160, 40, 255, 0.75);
}

.summary-state__label {
  font-size: 0.72em;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state__secs {
  font-size: 1.05em;
  font-weight: 800;
  line-height: 1;
  /* Tabellenziffern: die Zeile darf beim Herunterzählen nicht zappeln */
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state__icon {
  width: 1.15em;
  height: 1.15em;
  flex-shrink: 0;
}

.summary-state--rage .summary-state__label {
  color: #ffb0c4;
  text-shadow:
    0 0 8px rgba(255, 46, 99, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state--rage .summary-state__secs {
  color: #ff5c85;
  text-shadow:
    0 0 8px rgba(255, 46, 99, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state--curse .summary-state__label {
  /* Fluchnamen sind länger als "Rage" (CORRUPTION) — etwas engere Sperrung,
     damit die Marke nicht breiter wird als der Beute-Block darunter. */
  letter-spacing: 0.14em;
  color: #d9a0ff;
  text-shadow:
    0 0 8px rgba(160, 40, 255, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state--curse .summary-state__secs {
  color: #c060ff;
  text-shadow:
    0 0 8px rgba(160, 40, 255, 0.7),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.summary-state--curse .summary-state__icon {
  color: #cc44ff;
  filter: drop-shadow(0 0 4px rgba(180, 50, 255, 0.85));
}

/* Letzte 3 Sekunden: der Fluch blinkt, bleibt aber violett. Ein Umschlag auf
   Rot (wie beim alten Chip) wäre hier fatal — direkt über der Crimson-Rage
   läse sich der auslaufende Fluch als zweiter Rage-Zustand. */
.summary-state--urgent {
  animation: summary-state-urgent 0.55s ease-in-out infinite;
}

@keyframes summary-state-urgent {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* Da die Marken aus dem Fluss genommen sind, können sie ohne Höhen-
   Interpolation ein- und ausblenden — der Block darunter bewegt sich dabei
   nie. Der Stapel selbst ist unten verankert, deshalb rutscht die Rage-Marke
   auch nicht, wenn der Fluch darüber kommt oder geht. */
.summary-state-enter-active,
.summary-state-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.summary-state-enter-from,
.summary-state-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.summary-loot-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35em;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.35em;
}

.summary-icon {
  width: 2em;
  height: 2em;
  object-fit: contain;
  filter: drop-shadow(0 0 4px rgba(232, 192, 64, 0.6));
}

.summary-count {
  font-size: 1em;
  font-weight: 700;
  color: #e8c040;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(232, 192, 64, 0.55);
}

.summary-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(195, 160, 255, 0.35) 40%,
    rgba(195, 160, 255, 0.35) 60%,
    transparent
  );
}

.summary-champion {
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding: 0.1em 0.2em;
}

.summary-champion__portrait {
  width: 3.4em;
  height: 3.4em;
  flex-shrink: 0;
  object-fit: cover;
  object-position: center top;
  border-radius: 0.55em;
  border: 1px solid var(--champ-color, rgba(232, 192, 64, 0.8));
  box-shadow:
    0 0 12px var(--champ-glow, rgba(232, 192, 64, 0.45)),
    0 2px 6px rgba(0, 0, 0, 0.8);
}

.summary-champion__text {
  display: inline-flex;
  flex-direction: column;
  gap: 0.1em;
}

.summary-champion__eyebrow {
  font-size: 0.62em;
  font-weight: 900;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--champ-color, #e8c040);
  opacity: 0.75;
  text-shadow: 0 0 8px var(--champ-glow, rgba(232, 192, 64, 0.5));
  white-space: nowrap;
}

.summary-champion__name {
  font-size: 1.35em;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.05;
  white-space: nowrap;
  background: linear-gradient(
    105deg,
    color-mix(in srgb, var(--champ-color, #e8c040), #fff 35%) 0%,
    var(--champ-color, #e8c040) 40%,
    color-mix(in srgb, var(--champ-color, #e8c040), #fff 78%) 50%,
    var(--champ-color, #e8c040) 60%,
    color-mix(in srgb, var(--champ-color, #e8c040), #fff 35%) 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: champ-shimmer-star 3s linear infinite;
  filter: drop-shadow(0 0 10px var(--champ-glow, rgba(232, 192, 64, 0.5)))
    drop-shadow(0 2px 3px rgba(0, 0, 0, 0.9));
}

@keyframes champ-shimmer-star {
  from {
    background-position: 220% 0;
  }
  to {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .summary-champion__name {
    animation: none;
  }

  /* Puls aus, Ring an: ohne die Animation stünde das Overlay auf opacity 0 und
     Rage bzw. Fluch verlören ausgerechnet ihr auffälligstes Signal. */
  .star-reward-summary--raging .summary-inner::after,
  .star-reward-summary--cursed .summary-inner::after,
  .star-planet-count--raging::after,
  .star-planet-count--cursed::after {
    animation: none;
    opacity: 1;
  }

  .summary-state--urgent {
    animation: none;
  }

  .summary-state-enter-active,
  .summary-state-leave-active {
    transition: none;
  }
}

/* ── Planet-Zähler über Sternen ─────────────────────────────────────────────── */
.star-count-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9;
}

.star-planet-count {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  will-change: transform;
  user-select: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  /* Basis-Schriftgröße skaliert mit dem Viewport (siehe .summary-inner):
     ~12.2px @1440, ~14px @1920, capped bei 16px */
  font-size: clamp(0.68rem, 0.4vw + 0.42rem, 1rem);
  background: rgba(8, 5, 18, 0.82);
  border: 1px solid rgba(232, 192, 64, 0.55);
  border-radius: 4px;
  padding: 0.15em 0.55em;
  /* Nur für den einmaligen Umschlag in den Rage-Zustand — nichts läuft
     dauerhaft, der Zähler bleibt zwischen zwei Rages völlig ruhig. */
  transition:
    border-color 0.25s ease,
    background-color 0.25s ease;
}

/* Border-Puls über Opacity eines Overlays statt border-color-Animation —
   border-color muss der Browser jeden Frame neu malen, Opacity nicht. */
.star-planet-count::after {
  content: '';
  position: absolute;
  inset: -1px;
  border: 1px solid rgba(232, 192, 64, 0.95);
  border-radius: 4px;
  opacity: 0;
  animation: star-count-pulse-fade 2.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes star-count-pulse-fade {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

.star-planet-count__current {
  font-size: 1.45em;
  font-weight: 700;
  color: #e8c040;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.8),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.star-planet-count__sep {
  font-size: 1.05em;
  font-weight: 700;
  color: #e8c040;
  opacity: 0.45;
  margin-inline: 1px;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

.star-planet-count__total {
  font-size: 1.05em;
  font-weight: 700;
  color: #e8c040;
  opacity: 0.4;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 4px rgba(232, 160, 20, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
  line-height: 1;
}

/* Fluch: derselbe Zähler in Violett, Puls etwas schneller als im Ruhezustand.
   Steht gleichzeitig Rage an, gewinnen deren Regeln (sie stehen danach) — auf
   dieser Fläche ist für zwei Farben kein Platz, und die Warnung wiegt schwerer
   als die Chance. Der Fluch bleibt über Marke und Block-Rahmen präsent. */
.star-planet-count--cursed {
  background: rgba(16, 4, 30, 0.86);
  border-color: rgba(160, 40, 255, 0.75);
}

.star-planet-count--cursed::after {
  border-color: rgba(200, 120, 255, 0.95);
  animation-duration: 1.6s;
}

.star-planet-count--cursed .star-planet-count__current {
  color: #c060ff;
  text-shadow:
    0 0 5px rgba(160, 40, 255, 0.85),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.star-planet-count--cursed .star-planet-count__sep,
.star-planet-count--cursed .star-planet-count__total {
  color: #d9a0ff;
  text-shadow:
    0 0 4px rgba(160, 40, 255, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

/* Rage: derselbe Zähler, nur in Crimson und mit doppelt so schnellem Puls.
   Bewusst kein zusätzliches Element und keine zweite Animation — der
   vorhandene Opazitäts-Puls bekommt nur andere Werte, die laufenden Kosten
   pro Stern bleiben damit exakt dieselben wie im Normalzustand. */
.star-planet-count--raging {
  background: rgba(26, 5, 14, 0.86);
  border-color: rgba(255, 46, 99, 0.75);
}

.star-planet-count--raging::after {
  border-color: rgba(255, 92, 133, 0.95);
  animation-duration: 1.1s;
}

.star-planet-count--raging .star-planet-count__current {
  color: #ff5c85;
  text-shadow:
    0 0 5px rgba(255, 46, 99, 0.85),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.star-planet-count--raging .star-planet-count__sep,
.star-planet-count--raging .star-planet-count__total {
  color: #ffb0c4;
  text-shadow:
    0 0 4px rgba(255, 46, 99, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.95);
}

.star-cnt-enter-active {
  transition:
    opacity 0.22s ease,
    scale 0.22s ease;
}

.star-cnt-leave-active {
  transition:
    opacity 0.15s ease,
    scale 0.15s ease;
}

.star-cnt-enter-from {
  opacity: 0;
  scale: 0.7;
}

.star-cnt-leave-to {
  opacity: 0;
  scale: 0.7;
}

</style>

<template>
  <div class="relative flex flex-col w-full h-full p-4 space-y-3 overflow-hidden">
    <!-- ══ UNIVERSE ANIMATION OVERLAY ══ -->
    <div
      v-if="universePhase === 'animating'"
      class="absolute inset-0 z-30 universe-overlay"
      ref="universeContainer"
    >
      <canvas ref="universeCanvas" class="universe-canvas" />
      <Transition name="planet-found-fade">
        <div v-if="showPlanetFound" class="planet-found-overlay">
          <span class="planet-found-icon">🪐</span>
          <span class="planet-found-text">PLANET GEFUNDEN!</span>
        </div>
      </Transition>
    </div>

    <!-- ══ START SCREEN ══ -->
    <Transition name="start-fade">
      <div
        v-if="!battleStore.isAutoBattleInitialized && universePhase !== 'animating' && !isStarting"
        class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 start-screen"
      >
        <div class="start-crest">
          <img src="/img/menu/BATTLE.png" class="start-crest-img" alt="Battle" />
        </div>
        <div class="start-title">RANKED QUEUE</div>
        <p class="start-desc">
          Bard betritt die Arena. Der Auto-Battle läuft im Hintergrund weiter –<br />
          auch wenn du den Tab schließt.
        </p>
        <button class="start-btn" :disabled="isStarting" @click="startBattle">
          <span class="start-btn-icon">
            <template v-if="isStarting">⏳</template>
            <img v-else src="/img/menu/BATTLE.png" class="start-btn-img" alt="Battle" />
          </span>
          {{ isStarting ? 'WIRD GESTARTET...' : 'KAMPF STARTEN' }}
        </button>
      </div>
    </Transition>

    <!-- ══ BATTLE UI ══ -->
    <template v-if="battleStore.isAutoBattleInitialized">
      <!-- ── PLANET BATTLE BACKGROUND ────────────────────────────────────── -->
      <div class="absolute inset-0 z-0 pointer-events-none planet-battle-bg" aria-hidden="true">
        <!-- Starfield -->
        <div class="starfield" aria-hidden="true" />

        <!-- Planet sphere -->
        <div class="planet-sphere" :class="`planet-v${planetVariant}`">
          <div class="planet-atmo" />
          <div class="planet-terrain" :class="`terrain-v${planetVariant}`" />
          <div class="planet-cloud" />
          <div class="planet-highlight" />
          <div class="planet-rim" :class="`rim-v${planetVariant}`" />

        </div>

        <!-- Atmospheric glow halo (outside sphere, in background) -->
        <div class="planet-halo" :class="`halo-v${planetVariant}`" />
      </div>

      <!-- Battle Header Bar -->
      <div class="relative z-10 flex items-center justify-between flex-shrink-0 p-3 battle-header">
        <span class="battle-id-badge px-2 py-0.5 text-xs font-black tracking-wider">
          Battle #{{ currentBattleId }}
        </span>

        <!-- Letztes Ergebnis kompakt -->
        <div
          v-if="battleStore.battlePhase === 'playing' && battleStore.lastAutoBattleResult"
          class="flex items-center gap-1.5 px-2 py-1 text-xs font-black"
          :class="lastResult.won ? 'last-result--win' : 'last-result--loss'"
        >
          <span>{{ lastResult.won ? '🏆' : '💀' }}</span>
          <span>{{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP</span>
        </div>

        <!-- Countdown -->
        <div
          v-if="isAutoBattleActive && battleStore.battlePhase === 'playing'"
          class="flex items-center gap-2 px-3 py-1 countdown-badge"
        >
          <span class="text-xs animate-spin">⏱️</span>
          <span class="text-xs font-black"> {{ timeUntilNextBattle }}s </span>
        </div>

        <!-- W/L Session Badge -->
        <div
          v-if="battleStore.battlePhase === 'playing'"
          class="flex items-center gap-1 px-2 py-1 wl-badge"
        >
          <span class="wl-win">{{ battleStore.totalWins }}W</span>
          <span class="wl-sep">/</span>
          <span class="wl-loss">{{ battleStore.totalLosses }}L</span>
        </div>
      </div>

      <!-- Two-column layout: MiniMap left | Chat+Scoreboard right -->
      <div class="relative z-10 flex flex-row flex-1 min-h-0 gap-3">
        <!-- Left: MiniMap -->
        <div class="flex items-center justify-center flex-1 min-w-0 min-h-0">
          <MiniMapComponent
            class="w-full max-h-full aspect-square"
            :battle-id="currentBattleId"
            :score="score"
          />
        </div>
        <!-- Right: Chat + Scoreboard -->
        <div class="flex flex-col flex-shrink-0 h-full gap-3 w-72">
          <ChatPanelComponent class="flex-1 min-h-0" />
          <ScoreboardComponent class="flex-1 min-h-0" />
        </div>
      </div>
    </template>
  </div>

  <!-- Result Modal (Teleport) -->
  <Teleport to="body">
    <div
      v-if="battleStore.battlePhase === 'result' && battleStore.showAutoBattleResult"
      class="fixed inset-0 z-[9999] flex items-center justify-center rpg-overlay"
    >
      <div
        class="relative w-full max-w-sm p-6 mx-4 text-center result-modal rpg-frame"
        :class="lastResult.won ? 'result-modal--win' : 'result-modal--loss'"
      >
        <div class="mb-4 rpg-accent-bar" />
        <div class="mb-2 text-5xl">{{ lastResult.won ? '🏆' : '💀' }}</div>
        <div
          class="mb-3 text-3xl font-black tracking-widest"
          :class="lastResult.won ? 'result-text--win' : 'result-text--loss'"
        >
          {{ lastResult.won ? 'VICTORY!' : 'DEFEAT!' }}
        </div>
        <div
          class="lp-badge inline-flex items-center gap-1 px-4 py-1.5 text-sm font-black mb-5"
          :class="lpChange >= 0 ? 'lp-badge--pos' : 'lp-badge--neg'"
        >
          {{ lpChange >= 0 ? '+' : '' }}{{ lpChange }} LP
        </div>
        <div class="flex items-center justify-center gap-3">
          <button
            @click="battleStore.manualDismissResult()"
            class="px-5 py-2 text-sm font-black result-btn"
          >
            Weiter →
          </button>
          <button
            @click="battleStore.toggleAutoSkip()"
            class="px-4 py-2 text-sm font-black result-btn"
            :class="battleStore.autoSkipEnabled ? 'result-btn--active' : ''"
          >
            {{ battleStore.autoSkipEnabled ? '⏭️ Auto-Skip AN' : '⏸️ Auto-Skip AUS' }}
            <span
              v-if="battleStore.autoSkipEnabled && battleStore.resultCountdown > 0"
              class="ml-1 text-xs opacity-70"
            >
              ({{ battleStore.resultCountdown }}s)
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, nextTick, onUnmounted } from 'vue'
import MiniMapComponent from './MiniMapComponent.vue'
import ChatPanelComponent from './ChatPanelComponent.vue'
import ScoreboardComponent from './ScoreboardComponent.vue'
import { useBattleStore } from '../../../stores/battleStore'

// ─── Module-level animation helpers ───────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function lighten(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`
}

function darken(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`
}

const ANIM_DURATION = 5000
const SLOW_AT = 3500
const PLANET_TEXT_MS = 3600
const STAR_COUNT = 300

const PLANET_PALETTES: Array<[string, string]> = [
  ['#3060c8', '#2255ff'],
  ['#c85020', '#ff5500'],
  ['#c02828', '#ff2020'],
  ['#28a050', '#20d060'],
  ['#8030b8', '#8000ff'],
]

interface Star {
  x: number
  y: number
  z: number
  pz: number
}
interface PlanetDef {
  startDelay: number
  ix: number
  iy: number
  vx: number
  vy: number
  size: number
  color: string
  glow: string
  rot: number
  rotSpeed: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default defineComponent({
  name: 'BattleResultComponent',
  components: { MiniMapComponent, ChatPanelComponent, ScoreboardComponent },

  setup() {
    const battleStore = useBattleStore()

    const isStarting = ref(false)

    const universePhase = ref<'idle' | 'animating'>('idle')
    const showPlanetFound = ref(false)
    const universeCanvas = ref<HTMLCanvasElement | null>(null)

    let rafId: number | null = null
    let planetFoundTimer: ReturnType<typeof setTimeout> | null = null

    const planetVariant = computed(() => battleStore.currentBattleId % 5)

    function buildStars(W: number, H: number): Star[] {
      return Array.from({ length: STAR_COUNT }, () => ({
        x: (Math.random() - 0.5) * W * 2,
        y: (Math.random() - 0.5) * H * 2,
        z: Math.random() * W,
        pz: W,
      }))
    }

    function buildPlanets(W: number, H: number): PlanetDef[] {
      const count = 2 + Math.floor(Math.random() * 2)
      return Array.from({ length: count }, (_, i) => {
        const [color, glow] = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)]
        const goRight = Math.random() < 0.5
        const size = 32 + Math.random() * 56
        return {
          startDelay: 200 + i * 700 + Math.random() * 300,
          ix: goRight ? -size * 3 : W + size * 3,
          iy: H * (0.18 + Math.random() * 0.64),
          vx: goRight ? 0.055 + Math.random() * 0.045 : -(0.055 + Math.random() * 0.045),
          vy: (Math.random() - 0.5) * 0.025,
          size,
          color,
          glow,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.028,
        }
      })
    }

    function runCanvasAnimation(canvas: HTMLCanvasElement): Promise<void> {
      return new Promise<void>((resolve) => {
        const ctx = canvas.getContext('2d')!
        const W = canvas.width
        const H = canvas.height
        const CX = W / 2
        const CY = H / 2
        const MAXZ = W

        const stars = buildStars(W, H)
        const planets = buildPlanets(W, H)
        const t0 = performance.now()

        function frame(now: number) {
          const elapsed = now - t0
          if (elapsed >= ANIM_DURATION) {
            ctx.clearRect(0, 0, W, H)
            resolve()
            return
          }

          const warp =
            elapsed < SLOW_AT ? 1.0 : 1.0 - ((elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT)) * 0.95
          const speed = warp * 20 + 0.4

          ctx.fillStyle = '#0a0a0f'
          ctx.fillRect(0, 0, W, H)

          for (const s of stars) {
            s.pz = s.z
            s.z -= speed
            if (s.z <= 0) {
              s.x = (Math.random() - 0.5) * W * 2
              s.y = (Math.random() - 0.5) * H * 2
              s.z = MAXZ
              s.pz = MAXZ
              continue
            }
            const sx = (s.x / s.z) * W + CX
            const sy = (s.y / s.z) * H + CY
            const px = (s.x / s.pz) * W + CX
            const py = (s.y / s.pz) * H + CY
            if (sx < 0 || sx > W || sy < 0 || sy > H) continue
            const bright = 1 - s.z / MAXZ
            const alpha = 0.12 + bright * 0.88
            const rv = Math.floor(185 + bright * 70)
            const gv = Math.floor(205 + bright * 50)
            if (warp > 0.22) {
              ctx.strokeStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.lineWidth = Math.max(0.4, bright * 2.2)
              ctx.beginPath()
              ctx.moveTo(px, py)
              ctx.lineTo(sx, sy)
              ctx.stroke()
            } else {
              ctx.fillStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.beginPath()
              ctx.arc(sx, sy, Math.max(0.5, bright * 1.8), 0, Math.PI * 2)
              ctx.fill()
            }
          }

          for (const p of planets) {
            if (elapsed < p.startDelay) continue
            const pe = elapsed - p.startDelay
            const px = p.ix + p.vx * pe * warp
            const py = p.iy + p.vy * pe * warp
            p.rot += p.rotSpeed
            if (px < -p.size * 3 || px > W + p.size * 3) continue
            const [gr, gg, gb] = hexToRgb(p.glow)
            const og = ctx.createRadialGradient(px, py, p.size * 0.6, px, py, p.size * 2.6)
            og.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`)
            og.addColorStop(1, `rgba(${gr},${gg},${gb},0)`)
            ctx.fillStyle = og
            ctx.beginPath()
            ctx.arc(px, py, p.size * 2.6, 0, Math.PI * 2)
            ctx.fill()
            const bg = ctx.createRadialGradient(
              px - p.size * 0.32,
              py - p.size * 0.38,
              0,
              px,
              py,
              p.size,
            )
            bg.addColorStop(0, lighten(p.color, 55))
            bg.addColorStop(0.5, p.color)
            bg.addColorStop(1, darken(p.color, 65))
            ctx.fillStyle = bg
            ctx.beginPath()
            ctx.arc(px, py, p.size, 0, Math.PI * 2)
            ctx.fill()
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate(p.rot)
            ctx.fillStyle = 'rgba(0,0,0,0.16)'
            ctx.beginPath()
            ctx.ellipse(0, p.size * 0.16, p.size * 0.94, p.size * 0.13, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
            ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.55)`
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.arc(px, py, p.size + 2, 0, Math.PI * 2)
            ctx.stroke()
          }

          if (elapsed > SLOW_AT) {
            const t = (elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT)
            const vg = ctx.createRadialGradient(
              CX,
              CY,
              Math.min(W, H) * 0.18,
              CX,
              CY,
              Math.max(W, H) * 0.78,
            )
            vg.addColorStop(0, 'rgba(10,10,15,0)')
            vg.addColorStop(1, `rgba(10,10,15,${t * 0.7})`)
            ctx.fillStyle = vg
            ctx.fillRect(0, 0, W, H)
            const zR = 38 + t * 96
            const za = t * 0.92
            const zg = ctx.createRadialGradient(CX, CY, zR * 0.4, CX, CY, zR * 2.4)
            zg.addColorStop(0, `rgba(90,150,255,${za * 0.45})`)
            zg.addColorStop(1, 'rgba(90,150,255,0)')
            ctx.fillStyle = zg
            ctx.beginPath()
            ctx.arc(CX, CY, zR * 2.4, 0, Math.PI * 2)
            ctx.fill()
            const zb = ctx.createRadialGradient(CX - zR * 0.3, CY - zR * 0.35, 0, CX, CY, zR)
            zb.addColorStop(0, `rgba(135,185,255,${za})`)
            zb.addColorStop(0.5, `rgba(55,100,205,${za})`)
            zb.addColorStop(1, `rgba(18,38,100,${za})`)
            ctx.fillStyle = zb
            ctx.beginPath()
            ctx.arc(CX, CY, zR, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = `rgba(100,165,255,${za * 0.75})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(CX, CY, zR + 2, 0, Math.PI * 2)
            ctx.stroke()
          }

          rafId = requestAnimationFrame(frame)
        }

        rafId = requestAnimationFrame(frame)
      })
    }

    async function triggerUniverseAnimation(): Promise<void> {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (universePhase.value === 'animating') return

      universePhase.value = 'animating'
      showPlanetFound.value = false
      await nextTick()

      const canvas = universeCanvas.value
      if (!canvas) {
        universePhase.value = 'idle'
        return
      }

      const parent = canvas.parentElement as HTMLElement
      canvas.width = parent.offsetWidth || 420
      canvas.height = parent.offsetHeight || 320

      planetFoundTimer = setTimeout(() => {
        showPlanetFound.value = true
      }, PLANET_TEXT_MS)
      await runCanvasAnimation(canvas)
      if (planetFoundTimer) {
        clearTimeout(planetFoundTimer)
        planetFoundTimer = null
      }
      showPlanetFound.value = false
      universePhase.value = 'idle'
    }

    function stopAnimation(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (planetFoundTimer) {
        clearTimeout(planetFoundTimer)
        planetFoundTimer = null
      }
    }

    watch(
      () => battleStore.showAutoBattleResult,
      (newVal, oldVal) => {
        if (oldVal === true && newVal === false && battleStore.isAutoBattleInitialized) {
          triggerUniverseAnimation()
        }
      },
    )

    onUnmounted(stopAnimation)

    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      await triggerUniverseAnimation()
      await battleStore.initializePersistentAutoBattle()
      isStarting.value = false
    }

    const score = computed(() => ({
      team1Kills: battleStore.team1.reduce((sum, c) => sum + c.kills, 0),
      team2Kills: battleStore.team2.reduce((sum, c) => sum + c.kills, 0),
    }))

    const isAutoBattleActive = computed(() => battleStore.autoBattleEnabled)
    const timeUntilNextBattle = computed(() => battleStore.timeUntilNextBattle)
    const currentBattleId = computed(() => battleStore.currentBattleId)
    const lastResult = computed(() => battleStore.lastAutoBattleResult ?? { won: false })
    const lpChange = computed(() => battleStore.lastLpChange ?? 0)

    return {
      battleStore,
      isStarting,
      universePhase,
      showPlanetFound,
      universeCanvas,
      planetVariant,
      startBattle,
      score,
      isAutoBattleActive,
      timeUntilNextBattle,
      currentBattleId,
      lastResult,
      lpChange,
    }
  },
})
</script>

<style scoped>
/* ═══════════════════════════════════════════
   PLANET BATTLE BACKGROUND
   ═══════════════════════════════════════════ */
.planet-battle-bg {
  overflow: hidden;
  /* Dunkles Weltraum-Fundament damit Sterne sichtbar werden */
  background: radial-gradient(ellipse at 22% 78%, #0b1424 0%, #05080e 100%);
}

/* ═══════════════════════════════════════════
   STARFIELD  –  statischer Sternenhimmel
   ═══════════════════════════════════════════ */
.starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: starfieldTwinkle 9s ease-in-out infinite;
  background-image:
    /* ── BRIGHT STARS (1.2 px) ── */
    radial-gradient(circle 1.2px at 16% 5%, rgba(255, 255, 255, 0.95) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 42% 15%, rgba(220, 235, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 72% 8%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 88% 22%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 28% 32%, rgba(255, 255, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 58% 42%, rgba(200, 220, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 85% 55%, rgba(255, 255, 255, 0.92) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 12% 65%, rgba(220, 235, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 38% 78%, rgba(255, 255, 255, 0.85) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 68% 68%, rgba(200, 220, 255, 0.9) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 92% 85%, rgba(255, 255, 255, 0.88) 0%, transparent 100%),
    radial-gradient(circle 1.2px at 52% 92%, rgba(220, 235, 255, 0.85) 0%, transparent 100%),
    /* ── MEDIUM STARS (0.8 px) ── */
      radial-gradient(circle 0.8px at 8% 14%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 23% 8%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 38% 21%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 53% 11%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 68% 18%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 83% 8%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 97% 22%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 15% 38%, rgba(220, 230, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 30% 28%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 45% 42%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 60% 32%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 75% 45%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 90% 32%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 7% 58%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 22% 52%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 37% 62%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 52% 55%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 67% 65%, rgba(200, 215, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 82% 52%, rgba(255, 255, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 96% 62%, rgba(220, 230, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 18% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 33% 85%, rgba(200, 215, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 48% 78%, rgba(255, 255, 255, 0.62) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 63% 88%, rgba(220, 230, 255, 0.6) 0%, transparent 100%),
    radial-gradient(circle 0.8px at 78% 75%, rgba(255, 255, 255, 0.65) 0%, transparent 100%),
    /* ── SMALL DIM STARS (0.5 px) ── */
      radial-gradient(circle 0.5px at 5% 8%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 13% 22%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 22% 5%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 31% 18%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 40% 11%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 49% 25%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 58% 7%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 67% 19%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 76% 13%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 85% 28%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 94% 6%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 3% 35%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 11% 42%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 20% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 29% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 38% 32%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 47% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 56% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 65% 48%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 74% 33%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 83% 45%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 92% 38%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 8% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 17% 62%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 26% 58%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 35% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 52%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 53% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 62% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 71% 65%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 80% 58%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 89% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 97% 55%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 4% 72%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 12% 78%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 21% 68%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 30% 82%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 39% 75%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 48% 88%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 57% 72%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 66% 85%, rgba(255, 255, 255, 0.42) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 75% 78%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 84% 92%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 93% 78%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 6% 95%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 25% 92%, rgba(220, 230, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 44% 97%, rgba(255, 255, 255, 0.4) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 63% 95%, rgba(200, 215, 255, 0.38) 0%, transparent 100%),
    radial-gradient(circle 0.5px at 82% 97%, rgba(255, 255, 255, 0.42) 0%, transparent 100%);
}

/* ═══════════════════════════════════════════
   PLANET SPHERE  –  größer & sichtbarer
   ═══════════════════════════════════════════ */
.planet-sphere {
  position: absolute;
  width: 74%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -15%;
  left: -10%;
  background: radial-gradient(circle at 36% 30%, #2a4878, #0e1a3a, #060c1e);
}

/* ── 5 planet color variants ── */
.planet-v0 {
  background: radial-gradient(circle at 36% 30%, #2a4878 0%, #0e1a3a 45%, #060c1e 100%);
}
.planet-v1 {
  background: radial-gradient(circle at 36% 30%, #78340a 0%, #3a1404 45%, #160700 100%);
}
.planet-v2 {
  background: radial-gradient(circle at 36% 30%, #6e1010 0%, #2e0606 45%, #120202 100%);
}
.planet-v3 {
  background: radial-gradient(circle at 36% 30%, #0e4a1c 0%, #041e08 45%, #010a02 100%);
}
.planet-v4 {
  background: radial-gradient(circle at 36% 30%, #3c1260 0%, #180528 45%, #080010 100%);
}

/* Atmospheric haze layer – stärker */
.planet-atmo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% -5%, rgba(100, 160, 255, 0.22) 0%, transparent 55%);
  mix-blend-mode: screen;
}

/* Terrain / landmass patches */
.planet-terrain {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
}
.terrain-v0 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 55, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(20, 70, 130, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 24% 11% at 34% 63%, rgba(10, 45, 90, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 65% 36%, rgba(20, 40, 80, 0.45) 0%, transparent 100%);
}
.terrain-v1 {
  background:
    radial-gradient(ellipse 22% 12% at 42% 46%, rgba(120, 60, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 13% 19% at 61% 52%, rgba(100, 40, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 18% 10% at 35% 61%, rgba(80, 30, 8, 0.5) 0%, transparent 100%);
}
.terrain-v2 {
  background:
    radial-gradient(ellipse 18% 14% at 45% 45%, rgba(150, 20, 10, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 14% 18% at 62% 55%, rgba(120, 10, 5, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 20% 10% at 33% 62%, rgba(90, 15, 10, 0.5) 0%, transparent 100%);
}
.terrain-v3 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(15, 80, 25, 0.7) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(10, 65, 20, 0.6) 0%, transparent 100%),
    radial-gradient(ellipse 23% 11% at 34% 63%, rgba(20, 70, 15, 0.5) 0%, transparent 100%),
    radial-gradient(ellipse 11% 16% at 64% 37%, rgba(15, 55, 10, 0.5) 0%, transparent 100%);
}
.terrain-v4 {
  background:
    radial-gradient(ellipse 20% 13% at 44% 44%, rgba(70, 15, 110, 0.65) 0%, transparent 100%),
    radial-gradient(ellipse 14% 20% at 60% 54%, rgba(55, 10, 90, 0.55) 0%, transparent 100%),
    radial-gradient(ellipse 22% 11% at 34% 63%, rgba(80, 20, 100, 0.5) 0%, transparent 100%);
}

/* Wispy cloud streaks */
.planet-cloud {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background:
    radial-gradient(ellipse 35% 5% at 55% 38%, rgba(255, 255, 255, 0.06) 0%, transparent 100%),
    radial-gradient(ellipse 25% 4% at 38% 56%, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
  animation: cloudDrift 22s linear infinite;
}

/* Specular highlight */
.planet-highlight {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 26%, rgba(200, 230, 255, 0.1) 0%, transparent 42%);
}

/* Rim glow – alle Varianten aufgebohrt */
.planet-rim {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border: 1px solid rgba(80, 150, 255, 0.18);
}
.rim-v0 {
  box-shadow:
    inset 0 0 40px rgba(60, 130, 255, 0.28),
    0 0 80px rgba(40, 100, 220, 0.24),
    0 0 160px rgba(30, 70, 180, 0.12);
  border-color: rgba(80, 150, 255, 0.18);
}
.rim-v1 {
  box-shadow:
    inset 0 0 40px rgba(255, 130, 40, 0.28),
    0 0 80px rgba(220, 90, 20, 0.24),
    0 0 160px rgba(180, 60, 10, 0.12);
  border-color: rgba(255, 130, 60, 0.18);
}
.rim-v2 {
  box-shadow:
    inset 0 0 40px rgba(255, 60, 40, 0.3),
    0 0 80px rgba(220, 30, 20, 0.26),
    0 0 160px rgba(180, 10, 10, 0.14);
  border-color: rgba(255, 80, 60, 0.2);
}
.rim-v3 {
  box-shadow:
    inset 0 0 40px rgba(40, 200, 80, 0.28),
    0 0 80px rgba(20, 160, 50, 0.24),
    0 0 160px rgba(10, 120, 30, 0.12);
  border-color: rgba(60, 200, 80, 0.18);
}
.rim-v4 {
  box-shadow:
    inset 0 0 40px rgba(160, 60, 255, 0.3),
    0 0 80px rgba(120, 20, 220, 0.26),
    0 0 160px rgba(80, 0, 180, 0.14);
  border-color: rgba(160, 80, 255, 0.2);
}

/* Large atmospheric halo – größer & stärker */
.planet-halo {
  position: absolute;
  width: 86%;
  aspect-ratio: 1;
  border-radius: 50%;
  bottom: -28%;
  left: -16%;
  pointer-events: none;
  background: transparent;
}
.halo-v0 {
  box-shadow:
    0 0 100px 60px rgba(30, 80, 200, 0.12),
    0 0 200px 110px rgba(20, 60, 180, 0.07),
    0 0 320px 160px rgba(15, 45, 160, 0.04);
}
.halo-v1 {
  box-shadow:
    0 0 100px 60px rgba(200, 80, 20, 0.12),
    0 0 200px 110px rgba(180, 60, 10, 0.07),
    0 0 320px 160px rgba(160, 40, 5, 0.04);
}
.halo-v2 {
  box-shadow:
    0 0 100px 60px rgba(200, 20, 20, 0.14),
    0 0 200px 110px rgba(180, 10, 10, 0.08),
    0 0 320px 160px rgba(160, 5, 5, 0.05);
}
.halo-v3 {
  box-shadow:
    0 0 100px 60px rgba(20, 160, 50, 0.12),
    0 0 200px 110px rgba(10, 140, 30, 0.07),
    0 0 320px 160px rgba(5, 120, 20, 0.04);
}
.halo-v4 {
  box-shadow:
    0 0 100px 60px rgba(120, 30, 220, 0.14),
    0 0 200px 110px rgba(80, 0, 180, 0.08),
    0 0 320px 160px rgba(60, 0, 150, 0.05);
}


/* ═══════════════════════════════════════════
   UNIVERSE ANIMATION OVERLAY
   ═══════════════════════════════════════════ */
.universe-overlay {
  background: #0a0a0f;
  border-radius: 4px;
  overflow: hidden;
}
.universe-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.planet-found-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}
.planet-found-icon {
  font-size: 52px;
  filter: drop-shadow(0 0 20px rgba(100, 165, 255, 0.8));
  animation: planetBob 1.2s ease-in-out infinite;
}
.planet-found-text {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #a0c8ff;
  text-shadow:
    0 0 16px rgba(100, 165, 255, 0.9),
    0 0 32px rgba(100, 165, 255, 0.5);
}
.planet-found-fade-enter-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.planet-found-fade-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(8px);
}

/* ═══════════════════════════════════════════
   BATTLE HEADER
   ═══════════════════════════════════════════ */
.battle-header {
  background: var(--rpg-bg-header);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  box-shadow: 0 4px 12px #00000066;
}
.battle-id-badge {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  color: var(--rpg-text-muted);
}
.last-result--win {
  background: #52b8301f;
  border: 1px solid #52b8304d;
  border-radius: 4px;
  color: var(--rpg-green-top);
}
.last-result--loss {
  background: #cc60501f;
  border: 1px solid #cc60504d;
  border-radius: 4px;
  color: var(--rpg-red);
}
.countdown-badge {
  background: #5b8dd926;
  border: 1px solid #5b8dd94d;
  border-radius: 4px;
  color: var(--rpg-text-muted);
}

/* ═══════════════════════════════════════════
   W/L SESSION BADGE
   ═══════════════════════════════════════════ */
.wl-badge {
  background: #0a0a0a33;
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
}
.wl-win {
  font-size: 11px;
  font-weight: 900;
  color: var(--rpg-green-top);
  text-shadow: 0 0 8px #52b83066;
}
.wl-sep {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.2);
}
.wl-loss {
  font-size: 11px;
  font-weight: 900;
  color: var(--rpg-red);
  text-shadow: 0 0 8px #cc605066;
}

/* ═══════════════════════════════════════════
   RESULT MODAL
   ═══════════════════════════════════════════ */
.result-modal--win {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #52b8304d;
}
.result-modal--loss {
  box-shadow:
    inset 0 0 0 2px var(--rpg-wood-inner),
    inset 0 0 0 4px var(--rpg-wood-mid),
    0 0 30px #cc60504d;
}
.result-text--win {
  color: var(--rpg-green-top);
  text-shadow: 0 0 12px #52b83066;
}
.result-text--loss {
  color: var(--rpg-red);
  text-shadow: 0 0 12px #cc605066;
}
.lp-badge {
  border-radius: 4px;
  border: 1px solid;
}
.lp-badge--pos {
  background: #52b83026;
  border-color: #52b8304d;
  color: var(--rpg-green-top);
}
.lp-badge--neg {
  background: #cc605026;
  border-color: #cc60504d;
  color: var(--rpg-red);
}
.result-btn {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
  border-radius: 4px;
  color: var(--rpg-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.result-btn:hover {
  background: var(--rpg-bg-hover);
  border-color: var(--rpg-wood-mid);
  color: #fff;
  transform: scale(1.03);
}
.result-btn:active {
  transform: scale(0.96);
}
.result-btn--active {
  background: #a87ed826;
  border-color: #a87ed859;
  color: #c4a0ee;
}

/* ═══════════════════════════════════════════
   START SCREEN
   ═══════════════════════════════════════════ */
.start-screen {
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.start-crest {
  font-size: 72px;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
  animation: crestPulse 3s ease-in-out infinite;
}
.start-title {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 6px;
  color: #d4a020;
  text-shadow: 0 0 16px rgba(210, 160, 20, 0.5);
}
.start-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  line-height: 1.7;
  max-width: 340px;
}
.start-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 2px;
  background: linear-gradient(to bottom, #1e2e12, #131e0c);
  border: 2px solid #4a8a28;
  border-radius: 4px;
  color: #6ec040;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow:
    0 0 16px rgba(74, 138, 40, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
.start-btn:hover:not(:disabled) {
  background: linear-gradient(to bottom, #28401a, #1a2a10);
  border-color: #6ec040;
  color: #8ee060;
  box-shadow:
    0 0 28px rgba(82, 184, 48, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transform: scale(1.04);
}
.start-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #3a6a20;
  color: #4a8028;
}
.start-btn-icon {
  font-size: 18px;
}
.start-crest-img {
  width: 250px;
  height: 250px;
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(200, 150, 30, 0.6));
}
.start-btn-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(1.2);
}

/* ═══════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════ */
.start-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.start-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */
@keyframes crestPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 10px rgba(200, 150, 30, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 22px rgba(210, 160, 20, 0.75));
    transform: scale(1.06);
  }
}
@keyframes planetBob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}
@keyframes cloudDrift {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes starfieldTwinkle {
  0%,
  100% {
    opacity: 0.8;
  }
  25% {
    opacity: 1;
  }
  60% {
    opacity: 0.88;
  }
}

/* ─── prefers-reduced-motion ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .universe-overlay,
  .planet-found-icon,
  .start-crest,
  .bzm-ring--outer,
  .bzm-pulse,
  .planet-cloud,
  .starfield {
    animation: none !important;
  }
  .planet-found-fade-enter-active {
    transition: none !important;
  }
}
</style>

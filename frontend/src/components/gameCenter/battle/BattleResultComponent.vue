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
      <!-- Battle Header Bar -->
      <div class="flex items-center justify-between flex-shrink-0 p-3 battle-header">
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
      <div class="flex flex-row flex-1 min-h-0 gap-3">
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

const ANIM_DURATION = 5000 // total ms
const SLOW_AT = 3500 // ms when warp begins to decelerate
const PLANET_TEXT_MS = 3600 // ms to show "Planet gefunden!" text
const STAR_COUNT = 300

const PLANET_PALETTES: Array<[string, string]> = [
  ['#e06030', '#ff5500'], // orange
  ['#3070d8', '#2255ff'], // blue
  ['#c03038', '#ff2020'], // red
  ['#30b060', '#20d060'], // green
  ['#9040c0', '#8000ff'], // purple
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

    // ── Existing state ──────────────────────────────────────────────────────
    const isStarting = ref(false)

    // ── Universe animation state ────────────────────────────────────────────
    const universePhase = ref<'idle' | 'animating'>('idle')
    const showPlanetFound = ref(false)
    const universeCanvas = ref<HTMLCanvasElement | null>(null)

    let rafId: number | null = null
    let planetFoundTimer: ReturnType<typeof setTimeout> | null = null

    // ── Canvas animation core ───────────────────────────────────────────────

    function buildStars(W: number, H: number): Star[] {
      return Array.from({ length: STAR_COUNT }, () => ({
        x: (Math.random() - 0.5) * W * 2,
        y: (Math.random() - 0.5) * H * 2,
        z: Math.random() * W,
        pz: W,
      }))
    }

    function buildPlanets(W: number, H: number): PlanetDef[] {
      const count = 2 + Math.floor(Math.random() * 2) // 2 or 3
      return Array.from({ length: count }, (_, i) => {
        const [color, glow] = PLANET_PALETTES[Math.floor(Math.random() * PLANET_PALETTES.length)]
        const goRight = Math.random() < 0.5 // entry direction
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

          // warp factor: 1.0 → 0.05 in last 1.5 s
          const warp =
            elapsed < SLOW_AT ? 1.0 : 1.0 - ((elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT)) * 0.95

          const speed = warp * 20 + 0.4

          // ── background ────────────────────────────────────────────────
          ctx.fillStyle = '#0a0a0f'
          ctx.fillRect(0, 0, W, H)

          // ── stars (warp streaks / dots) ───────────────────────────────
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
              // warp streak
              ctx.strokeStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.lineWidth = Math.max(0.4, bright * 2.2)
              ctx.beginPath()
              ctx.moveTo(px, py)
              ctx.lineTo(sx, sy)
              ctx.stroke()
            } else {
              // dot when nearly stopped
              ctx.fillStyle = `rgba(${rv},${gv},255,${alpha})`
              ctx.beginPath()
              ctx.arc(sx, sy, Math.max(0.5, bright * 1.8), 0, Math.PI * 2)
              ctx.fill()
            }
          }

          // ── planets ───────────────────────────────────────────────────
          for (const p of planets) {
            if (elapsed < p.startDelay) continue
            const pe = elapsed - p.startDelay
            const px = p.ix + p.vx * pe * warp
            const py = p.iy + p.vy * pe * warp
            p.rot += p.rotSpeed

            if (px < -p.size * 3 || px > W + p.size * 3) continue

            const [gr, gg, gb] = hexToRgb(p.glow)

            // outer glow
            const outerGlow = ctx.createRadialGradient(px, py, p.size * 0.6, px, py, p.size * 2.6)
            outerGlow.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`)
            outerGlow.addColorStop(1, `rgba(${gr},${gg},${gb},0)`)
            ctx.fillStyle = outerGlow
            ctx.beginPath()
            ctx.arc(px, py, p.size * 2.6, 0, Math.PI * 2)
            ctx.fill()

            // planet body
            const bodyGrad = ctx.createRadialGradient(
              px - p.size * 0.32,
              py - p.size * 0.38,
              0,
              px,
              py,
              p.size,
            )
            bodyGrad.addColorStop(0, lighten(p.color, 55))
            bodyGrad.addColorStop(0.5, p.color)
            bodyGrad.addColorStop(1, darken(p.color, 65))
            ctx.fillStyle = bodyGrad
            ctx.beginPath()
            ctx.arc(px, py, p.size, 0, Math.PI * 2)
            ctx.fill()

            // atmosphere band (rotates)
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate(p.rot)
            ctx.fillStyle = 'rgba(0,0,0,0.16)'
            ctx.beginPath()
            ctx.ellipse(0, p.size * 0.16, p.size * 0.94, p.size * 0.13, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()

            // rim glow
            ctx.strokeStyle = `rgba(${gr},${gg},${gb},0.55)`
            ctx.lineWidth = 1.8
            ctx.beginPath()
            ctx.arc(px, py, p.size + 2, 0, Math.PI * 2)
            ctx.stroke()
          }

          // ── slow-down vignette + zoom-in target planet ────────────────
          if (elapsed > SLOW_AT) {
            const t = (elapsed - SLOW_AT) / (ANIM_DURATION - SLOW_AT) // 0→1

            // dark vignette from edges
            const vign = ctx.createRadialGradient(
              CX,
              CY,
              Math.min(W, H) * 0.18,
              CX,
              CY,
              Math.max(W, H) * 0.78,
            )
            vign.addColorStop(0, 'rgba(10,10,15,0)')
            vign.addColorStop(1, `rgba(10,10,15,${t * 0.7})`)
            ctx.fillStyle = vign
            ctx.fillRect(0, 0, W, H)

            // central zoom planet
            const zR = 38 + t * 96 // radius grows 38 → 134
            const zAlpha = t * 0.92

            const zGlow = ctx.createRadialGradient(CX, CY, zR * 0.4, CX, CY, zR * 2.4)
            zGlow.addColorStop(0, `rgba(90,150,255,${zAlpha * 0.45})`)
            zGlow.addColorStop(1, `rgba(90,150,255,0)`)
            ctx.fillStyle = zGlow
            ctx.beginPath()
            ctx.arc(CX, CY, zR * 2.4, 0, Math.PI * 2)
            ctx.fill()

            const zBody = ctx.createRadialGradient(CX - zR * 0.3, CY - zR * 0.35, 0, CX, CY, zR)
            zBody.addColorStop(0, `rgba(135,185,255,${zAlpha})`)
            zBody.addColorStop(0.5, `rgba(55,100,205,${zAlpha})`)
            zBody.addColorStop(1, `rgba(18,38,100,${zAlpha})`)
            ctx.fillStyle = zBody
            ctx.beginPath()
            ctx.arc(CX, CY, zR, 0, Math.PI * 2)
            ctx.fill()

            // rim
            ctx.strokeStyle = `rgba(100,165,255,${zAlpha * 0.75})`
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

    // ── Trigger the 5-second animation ─────────────────────────────────────

    async function triggerUniverseAnimation(): Promise<void> {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      // Guard: don't start a second animation while one is running
      if (universePhase.value === 'animating') return

      universePhase.value = 'animating'
      showPlanetFound.value = false

      await nextTick() // wait for <canvas> to mount

      const canvas = universeCanvas.value
      if (!canvas) {
        universePhase.value = 'idle'
        return
      }

      // Set canvas pixel resolution to match its CSS size
      const parent = canvas.parentElement as HTMLElement
      canvas.width = parent.offsetWidth || 420
      canvas.height = parent.offsetHeight || 320

      // Schedule "Planet gefunden!" overlay text
      planetFoundTimer = setTimeout(() => {
        showPlanetFound.value = true
      }, PLANET_TEXT_MS)

      // Run animation (Promise resolves after ANIM_DURATION)
      await runCanvasAnimation(canvas)

      // Cleanup
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

    // ── Watch: result dismissed (both manual and auto-skip) ────────────────
    watch(
      () => battleStore.showAutoBattleResult,
      (newVal, oldVal) => {
        // Fire whenever the result panel disappears while battle is running
        if (oldVal === true && newVal === false && battleStore.isAutoBattleInitialized) {
          triggerUniverseAnimation()
        }
      },
    )

    onUnmounted(stopAnimation)

    // ── Start battle flow (existing, extended with animation) ───────────────
    const startBattle = async () => {
      if (isStarting.value) return
      isStarting.value = true
      await triggerUniverseAnimation() // 5 s universe anim
      await battleStore.initializePersistentAutoBattle() // init battle loop
      isStarting.value = false
    }

    // ── Existing computed ───────────────────────────────────────────────────
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

/* "Planet gefunden!" text overlay */
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

/* Transition for "Planet gefunden!" appearance */
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
  width: 72px;
  height: 72px;
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

/* ─── prefers-reduced-motion ──────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .universe-overlay,
  .planet-found-icon,
  .start-crest {
    animation: none !important;
  }
  .planet-found-fade-enter-active {
    transition: none !important;
  }
}
</style>

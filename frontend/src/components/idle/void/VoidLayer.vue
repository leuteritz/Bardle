<template>
  <div class="void-layer">
    <!-- EIN Canvas für alle Wesen. Bewusst kein Knoten je Wesen: bei zwei
         Dutzend gleichzeitig wären das hunderte DOM-Elemente mit eigener
         Frame-Schleife, eigenem Layer und eigenem Style-Recalc
         (Performance-Regel 4). `pointer-events: none` ist dabei Pflicht — das
         Canvas deckt die Sonne ab, und ein Klick, der auf ihr landen soll, darf
         hier nicht hängenbleiben. Getroffen wird über einen Capture-Listener,
         siehe unten. -->
    <canvas
      ref="canvasEl"
      class="void-canvas"
      :style="{ display: hasActive ? 'block' : 'none' }"
      aria-hidden="true"
    ></canvas>

    <!-- Ausgang: Funken beim Erlegen, ein Einschlag an der Sonne. Beides hängt
         am Zähler des Stores, damit ein erzwungener Ausgang genauso aussieht
         wie ein erspielter. Als DOM, nicht im Canvas: es ist selten, kurz und
         trägt Text. -->
    <div
      v-if="outcome"
      :key="`vo-${outcome.seq}`"
      class="vo-burst"
      :class="outcome.sealed ? 'vo-burst--sealed' : 'vo-burst--impact'"
      :style="{ left: `${outcome.x}px`, top: `${outcome.y}px` }"
      aria-hidden="true"
    >
      <span
        v-for="p in outcome.particles"
        :key="p.i"
        class="vo-spark"
        :style="{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, background: outcome.color }"
      ></span>
      <span class="vo-label" :style="{ color: outcome.color }">{{ outcome.title }}</span>
      <span class="vo-sub">{{ outcome.sub }}</span>
    </div>

    <!-- Die Schockwelle eines Einschlags — sie geht von der SONNE aus, nicht
         vom Aufschlagpunkt: getroffen wurde sie, nicht die Stelle am Rand. -->
    <div
      v-if="impactWave"
      :key="`vw-${impactWave.seq}`"
      class="vo-wave"
      :class="`vo-wave--${impactWave.severity}`"
      :style="{ '--wave-color': impactWave.color }"
      aria-hidden="true"
    >
      <span class="vo-wave__ring"></span>
      <span class="vo-wave__ring vo-wave__ring--2"></span>
      <span class="vo-wave__flash"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useVoidStore } from '@/stores/world/voidStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import { useActionToast } from '@/composables/ui/useActionToast'
import { useHerald } from '@/composables/ui/useHerald'
import { logVoidRiftSealed, logVoidRiftCollapsed } from '@/config/ui/eventLog'
import { getVoidRift } from '@/config/world/void'
import { hexToRgbTriple } from '@/utils/ui/format'
import { voidPositionAt, voidHitRadius } from '@/utils/orbit/voidPath'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { getVoidSprite, voidSpriteDrawSize } from '@/utils/fx/voidSprite'
import {
  VOID_SEAL_BURST_PARTICLES,
  VOID_SEAL_FX_MS,
  VOID_IMPACT_FX_MS,
  VOID_SEVERITY_COLOR,
  VOID_CONTACT_FLASH_MS,
  VOID_CONTACT_STATE_COLOR,
} from '@/config/constants'
import type { VoidContactState, VoidMonster } from '@/types'
import { gameNow } from '@/utils/game/gameClock'

const voidStore = useVoidStore()
const planetShop = usePlanetShopStore()
const { active, lastOutcome } = storeToRefs(voidStore)
const { isIdleRenderingPaused } = useRenderingPaused()
// Der Header veröffentlicht die Kurve seines Mittelovals — die Wesen reissen
// entlang dieser Kontur auf, nicht auf einer geraden Linie darunter.
const { headerCenterArc } = useHeaderCenterArc()
const { showToast } = useActionToast()
const { announce } = useHerald()

const canvasEl = ref<HTMLCanvasElement>()
const hasActive = computed(() => active.value.length > 0)

// Kein Aufreissen, solange das Bard-Profil oder ein Star Fight den Idle-Layer
// deckt: ein Wesen, das niemand sehen kann, liefe ungesehen bis zur Sonne.
watch(isIdleRenderingPaused, (hidden) => voidStore.setSpawningBlocked(hidden), {
  immediate: true,
})

// ── Zeichnen ────────────────────────────────────────────────────────────────

let frame = 0
let ctx: CanvasRenderingContext2D | null = null
let cssW = 0
let cssH = 0
let dpr = 1
/** Zuletzt gesehene Trefferzahl je Wesen — daraus wird der kurze Aufblitz. */
const lastHits = new Map<number, { hits: number; at: number }>()

/** Welcher Zustand gezeigt wird, wenn mehrere laufen. Die Reihenfolge ist die
 *  Dringlichkeit: festgehalten schlägt stillgelegt schlägt verflucht schlägt
 *  markiert. */
function contactStateOf(m: VoidMonster, now: number): VoidContactState | null {
  if (m.blockedUntil > now) return 'blocked'
  if (m.wardedUntil > now) return 'warded'
  if (m.cursedUntil > now) return 'cursed'
  if (m.focusedUntil > now) return 'focused'
  return null
}

function resize(): void {
  const el = canvasEl.value
  if (!el) return
  dpr = Math.min(2, window.devicePixelRatio || 1)
  cssW = window.innerWidth
  cssH = window.innerHeight
  el.width = Math.round(cssW * dpr)
  el.height = Math.round(cssH * dpr)
  el.style.width = `${cssW}px`
  el.style.height = `${cssH}px`
  ctx = el.getContext('2d')
  // Ab hier wird durchweg in CSS-Pixeln gerechnet; die Pixeldichte steckt
  // allein in dieser Transformation und in der Auflösung der Sprites.
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function draw(): void {
  const el = canvasEl.value
  if (!el || !ctx) {
    frame = requestAnimationFrame(draw)
    return
  }
  // Nicht Sichtbares kostet nichts (Performance-Regel 5): liegt ein Modal
  // darüber, endet der Frame vor dem Zeichnen.
  if (isIdleRenderingPaused.value || active.value.length === 0) {
    frame = requestAnimationFrame(draw)
    return
  }

  const now = gameNow()
  const sunRadius = planetShop.orbitSunRadius

  // Ankunft in DEM Frame abrechnen, in dem sie zu sehen ist. Der Store prüft
  // sie ausserdem im Sekundentakt — der allein reichte aber nicht: das Wesen
  // stand bis zu eine Sekunde sichtbar auf der Sonne, die HUD-Karte zeigte
  // dabei null Sekunden, und genau dieser Moment liest sich wie ein Fehler.
  // Der Tick bleibt der Auffang, wenn ein Modal den Layer deckt und hier gar
  // nicht gezeichnet wird.
  if (active.value.some((m) => now >= m.spawnedAt + m.travelMs)) {
    voidStore.resolveArrivals(now)
    if (active.value.length === 0) {
      ctx.clearRect(0, 0, cssW, cssH)
      frame = requestAnimationFrame(draw)
      return
    }
  }

  ctx.clearRect(0, 0, cssW, cssH)

  // Einmal je Frame, nicht je Wesen: die Messung liest berechnete Stile, und
  // bei zwei Dutzend Wesen wären das 1440 Abfragen je Sekunde.
  const insets = hudFieldMetrics(headerCenterArc.value ?? null)

  // Berührungen im FRAME auflösen, nicht erst im Sekundentakt: Champions und
  // Planeten wandern mit 60 Hz, und ein Kontaktfenster dauert Bruchteile einer
  // Sekunde — bei 1 Hz gingen die meisten schlicht verloren. Der Store prüft
  // trotzdem im Tick mit, das ist der Auffang unter einem offenen Modal. Dass
  // beides zusammen nicht doppelt zündet, sichert die Paar-Sperre in
  // `voidContact`, nicht dieser Aufruf.
  voidStore.resolveOrbitContacts(now)
  if (active.value.length === 0) {
    frame = requestAnimationFrame(draw)
    return
  }

  for (const m of active.value) {
    const def = getVoidRift(m.defId)
    if (!def) continue

    const pos = voidPositionAt(m, def.sizePx, sunRadius, now, cssW, cssH, insets)
    const size = voidSpriteDrawSize(def.sizePx) * pos.scale
    const half = size / 2

    // Ein `drawImage` je Wesen — der ganze Körper samt Aura, Zacken und
    // Bewohner steckt im vorgerenderten Sprite.
    ctx.drawImage(getVoidSprite(def, dpr), pos.x - half, pos.y - half, size, size)

    // Trefferblitz: kurz nach einem Klick liegt ein heller Schleier darüber.
    const hit = lastHits.get(m.uid)
    if (hit && hit.hits !== m.hitsLanded) {
      hit.hits = m.hitsLanded
      hit.at = now
    } else if (!hit) {
      lastHits.set(m.uid, { hits: m.hitsLanded, at: 0 })
    }
    const flashAge = hit ? now - hit.at : Infinity
    if (flashAge < 160) {
      ctx.save()
      ctx.globalAlpha = (1 - flashAge / 160) * 0.55
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(getVoidSprite(def, dpr), pos.x - half, pos.y - half, size, size)
      ctx.restore()
    }

    // Kontaktfunke: ein Orbit-Körper hat es gerade gestreift. Der Store setzt
    // `lastContactAt` nur bei einer WIRKLICH gezündeten Berührung — hier wird
    // also nichts geprüft, nur nachgeleuchtet.
    const contactAge = now - m.lastContactAt
    if (m.lastContactAt > 0 && contactAge < VOID_CONTACT_FLASH_MS) {
      ctx.save()
      ctx.globalAlpha = 1 - contactAge / VOID_CONTACT_FLASH_MS
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = Math.max(2, 4 * pos.scale)
      ctx.strokeStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, (def.sizePx / 2) * pos.scale * 1.05, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Trefferpunkte nur zeichnen, wenn schon etwas fehlt — ein voller Ring an
    // zwei Dutzend Wesen wäre Rauschen, und er kostet je Wesen einen Pfad.
    const hpFrac = m.maxHp > 0 ? m.currentHp / m.maxHp : 0
    if (hpFrac < 0.999) {
      const r = (def.sizePx / 2) * pos.scale * 1.28
      ctx.save()
      ctx.lineWidth = Math.max(2, 3 * pos.scale)
      ctx.strokeStyle = 'rgba(36,21,54,0.85)'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = def.color
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac)
      ctx.stroke()
      ctx.restore()
    }

    // GENAU EIN Zustandsring, in der Farbe der Rolle, die ihn gesetzt hat —
    // vier getrennte Ringe auf zwei Dutzend Wesen wären echte Arbeit, und der
    // oberste sagt ohnehin das Dringlichste. Gezeichnet wird nur, wenn
    // überhaupt ein Zustand läuft.
    const state = contactStateOf(m, now)
    if (state) {
      const r = (def.sizePx / 2) * pos.scale * 1.46
      ctx.save()
      ctx.lineWidth = Math.max(2, 3 * pos.scale)
      ctx.strokeStyle = VOID_CONTACT_STATE_COLOR[state]
      // Gestrichelt: der Zustandsring darf nie mit dem HP-Ring darunter
      // verwechselt werden, und Farbe allein trüge das nicht.
      ctx.setLineDash([6 * pos.scale, 5 * pos.scale])
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  frame = requestAnimationFrame(draw)
}

// ── Treffen ─────────────────────────────────────────────────────────────────
// Der Klick läuft NICHT über das Canvas (das ist `pointer-events: none`,
// sonst käme kein Klick mehr bei der Sonne an), sondern über einen Listener in
// der CAPTURE-Phase: er sieht den Klick vor jedem anderen Handler, prüft, ob
// ein Wesen an dieser Stelle steht, und hält ihn nur dann auf. Trifft er
// nichts, passiert gar nichts und der Klick geht seinen normalen Weg zur Sonne.

/** Das Wesen unter einem Punkt — das VORDERSTE zuerst, denn genau das will man
 *  treffen, wenn zwei sich überlappen. */
function monsterAt(x: number, y: number): number | null {
  if (active.value.length === 0) return null
  const now = gameNow()
  const sunRadius = planetShop.orbitSunRadius
  const insets = hudFieldMetrics(headerCenterArc.value ?? null)
  let bestUid: number | null = null
  let bestT = -1
  for (const m of active.value) {
    const def = getVoidRift(m.defId)
    if (!def) continue
    const pos = voidPositionAt(m, def.sizePx, sunRadius, now, cssW, cssH, insets)
    const r = voidHitRadius(def.sizePx, pos.scale)
    if (Math.hypot(pos.x - x, pos.y - y) > r) continue
    if (pos.t > bestT) {
      bestT = pos.t
      bestUid = m.uid
    }
  }
  return bestUid
}

function onClickCapture(event: MouseEvent): void {
  if (isIdleRenderingPaused.value || active.value.length === 0) return
  const uid = monsterAt(event.clientX, event.clientY)
  if (uid === null) return
  // Nur wenn wirklich getroffen: sonst wäre jeder Klick neben einem Wesen ein
  // verschluckter Sonnenklick.
  event.stopPropagation()
  event.preventDefault()
  voidStore.hitMonster(uid)
}

/** Zeigefinger, wenn der Cursor über einem Wesen steht. Gedrosselt, weil ein
 *  Hit-Test bei jeder Mausbewegung über zwei Dutzend Wesen läuft. */
let hoverCheckAt = 0
let hovering = false
function onMouseMove(event: MouseEvent): void {
  const now = performance.now()
  if (now - hoverCheckAt < 60) return
  hoverCheckAt = now
  const over =
    !isIdleRenderingPaused.value &&
    active.value.length > 0 &&
    monsterAt(event.clientX, event.clientY) !== null
  if (over === hovering) return
  hovering = over
  document.body.classList.toggle('void-target-hover', over)
}

// ── Ausgang ─────────────────────────────────────────────────────────────────

interface OutcomeSpark {
  i: number
  dx: number
  dy: number
}

const outcome = ref<{
  seq: number
  sealed: boolean
  x: number
  y: number
  color: string
  title: string
  sub: string
  particles: OutcomeSpark[]
} | null>(null)
const impactWave = ref<{ seq: number; severity: string; color: string } | null>(null)
let outcomeTimer: ReturnType<typeof setTimeout> | null = null
let waveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => lastOutcome.value.seq,
  () => {
    const result = lastOutcome.value
    const def = getVoidRift(result.defId)
    if (!def) return

    if (result.sealed) {
      showToast(`${def.name} slain — ${def.boonLine}`, 'event')
      logVoidRiftSealed(def.name, def.boonLine)
    } else {
      showToast(`${def.name} reached the sun — ${result.hpLost} HP lost`, 'warning')
      logVoidRiftCollapsed(def.name, result.hpLost)
      impactWave.value = {
        seq: result.seq,
        severity: def.severity,
        color: VOID_SEVERITY_COLOR[def.severity] ?? def.color,
      }
      if (waveTimer) clearTimeout(waveTimer)
      waveTimer = setTimeout(() => {
        impactWave.value = null
        waveTimer = null
      }, VOID_IMPACT_FX_MS)
    }

    // Nur das schwerste Wesen verdient ein Banner. Ein Herald für jedes kleine
    // würde die Meldung entwerten, die für den Warp reserviert ist.
    if (def.severity === 'abyssal') {
      announce({
        kind: 'champion',
        eyebrow: result.sealed ? 'VOID SLAIN' : 'THE VOID BROKE THROUGH',
        headline: def.name,
        subline: result.sealed ? def.boonLine : `The sun took ${result.hpLost} damage`,
        icon: def.icon,
        accent: hexToRgbTriple(def.color),
      })
    }

    const step = (Math.PI * 2) / VOID_SEAL_BURST_PARTICLES
    const base = result.seq * 0.7
    // Beim Erlegen fliegen die Funken nach AUSSEN, beim Einschlag fallen sie
    // nach innen — dieselbe Geometrie, umgekehrtes Vorzeichen, und man sieht
    // auf einen Blick, welcher Ausgang eingetreten ist.
    const dir = result.sealed ? 1 : -1
    outcome.value = {
      seq: result.seq,
      sealed: result.sealed,
      x: result.x,
      y: result.y,
      color: def.color,
      title: result.sealed ? 'SLAIN' : 'BREACH',
      sub: result.sealed ? def.boonLine : `−${result.hpLost} HP`,
      particles: Array.from({ length: VOID_SEAL_BURST_PARTICLES }, (_, i) => {
        const angle = base + step * i
        const dist = def.sizePx * (dir > 0 ? 1.15 : 1.6)
        return { i, dx: Math.cos(angle) * dist * dir, dy: Math.sin(angle) * dist * dir }
      }),
    }
    if (outcomeTimer) clearTimeout(outcomeTimer)
    outcomeTimer = setTimeout(
      () => {
        outcome.value = null
        outcomeTimer = null
      },
      result.sealed ? VOID_SEAL_FX_MS : VOID_IMPACT_FX_MS,
    )
  },
)

// Weggefallene Wesen aus der Blitz-Tabelle räumen, sonst wächst sie über eine
// lange Sitzung mit jedem erlegten Wesen weiter.
watch(active, (list) => {
  if (lastHits.size <= list.length) return
  const live = new Set(list.map((m) => m.uid))
  for (const uid of [...lastHits.keys()]) if (!live.has(uid)) lastHits.delete(uid)
})

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('click', onClickCapture, true)
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  frame = requestAnimationFrame(draw)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  document.removeEventListener('click', onClickCapture, true)
  window.removeEventListener('mousemove', onMouseMove)
  document.body.classList.remove('void-target-hover')
  if (frame) cancelAnimationFrame(frame)
  if (outcomeTimer) clearTimeout(outcomeTimer)
  if (waveTimer) clearTimeout(waveTimer)
})
</script>

<style scoped>
/* Auf derselben Höhe wie der Drifter-Layer: über der Klickfläche der Sonne,
   unter Header, Bottom-Bar und jedem Modal. */
.void-layer {
  position: fixed;
  inset: 0;
  z-index: 42;
  pointer-events: none;
}

.void-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

/* ── Ausgang ── */
.vo-burst {
  position: fixed;
  pointer-events: none;
}

.vo-spark {
  position: absolute;
  top: 0;
  left: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.vo-burst--sealed .vo-spark {
  animation: vo-fly-out 0.72s cubic-bezier(0.18, 0.7, 0.35, 1) forwards;
}

.vo-burst--impact .vo-spark {
  animation: vo-fall-in 0.9s cubic-bezier(0.5, 0, 0.75, 0.2) forwards;
}

@keyframes vo-fly-out {
  0% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.3);
    opacity: 0;
  }
}

@keyframes vo-fall-in {
  0% {
    transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.4);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}

.vo-label {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  font-size: clamp(17px, 1.35vw, 25px);
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow:
    0 0 10px rgba(0, 0, 0, 0.9),
    0 2px 6px rgba(0, 0, 0, 0.9);
  animation: vo-rise 0.9s ease-out forwards;
}

.vo-sub {
  position: absolute;
  left: 50%;
  top: 0;
  white-space: nowrap;
  color: #d8cfae;
  font-size: clamp(11px, 0.85vw, 15px);
  letter-spacing: 0.5px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
  animation: vo-rise-sub 1s ease-out forwards;
}

.vo-burst--impact .vo-sub {
  color: #cc6050;
}

@keyframes vo-rise {
  0% {
    transform: translate(-50%, -8px) scale(0.85);
    opacity: 0;
  }
  22% {
    transform: translate(-50%, -36px) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -64px) scale(1);
    opacity: 0;
  }
}

@keyframes vo-rise-sub {
  0% {
    transform: translate(-50%, -2px);
    opacity: 0;
  }
  30% {
    transform: translate(-50%, -10px);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -32px);
    opacity: 0;
  }
}

/* ── Einschlag an der Sonne ── */
/* Zwei Ringe und ein Blitz, alle aus der Bildmitte. Nur `transform` und
   `opacity` sind animiert; die Ringstärke unterscheidet die Schwere, nicht
   eine zweite Animation. */
.vo-wave {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.vo-wave__ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 220px;
  height: 220px;
  margin: -110px 0 0 -110px;
  border-radius: 50%;
  border: 3px solid var(--wave-color);
  animation: vo-wave-out 1.15s cubic-bezier(0.16, 0.8, 0.3, 1) forwards;
}

.vo-wave__ring--2 {
  animation-delay: 0.16s;
  border-width: 2px;
  opacity: 0.7;
}

.vo-wave--greater .vo-wave__ring {
  border-width: 4px;
}
.vo-wave--abyssal .vo-wave__ring {
  border-width: 6px;
}

.vo-wave__flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 300px;
  margin: -150px 0 0 -150px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--wave-color) 0%, transparent 70%);
  animation: vo-wave-flash 0.5s ease-out forwards;
}

.vo-wave--abyssal .vo-wave__flash {
  width: 520px;
  height: 520px;
  margin: -260px 0 0 -260px;
}

@keyframes vo-wave-out {
  0% {
    transform: scale(0.25);
    opacity: 0.95;
  }
  100% {
    transform: scale(3.4);
    opacity: 0;
  }
}

@keyframes vo-wave-flash {
  0% {
    transform: scale(0.4);
    opacity: 0.75;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vo-spark,
  .vo-wave {
    display: none;
  }
}
</style>

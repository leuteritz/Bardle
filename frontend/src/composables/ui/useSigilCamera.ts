/* ── Die Phasenmaschine des Team-Tabs ─────────────────────────────────────────
   Board ⇄ Detailseite in ZWEI Takten, und die KAMERA fährt zuerst: `aim` rückt
   das Board auf seine Endlage und zoomt auf den Rollencluster, `open` führt
   danach die Seite herein, ohne die Kamera noch einmal zu bewegen. Das
   Schliessen spiegelt das (`leave` → `home`).

   Zwei Taktarten: wo die Bühne fährt, taktet ihr `transitionend` (Timer × NET_MUL
   als Netz); wo sie stillsteht, käme nie eines — dort taktet der Timer selbst.
   Wanduhr: nichts hier ändert Spielzustand. */

import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { TEAM_SIGIL_CAM_NET_MUL, TEAM_SIGIL_OPEN_MS, TEAM_SIGIL_TRAVEL_MS } from '@/config/constants'

export type SigilCamPhase = 'idle' | 'aim' | 'open' | 'travel' | 'leave' | 'home'

export interface SigilCameraOptions {
  /** Die Fahrt ist gerade nicht zu sehen (Ladeschleier deckt) — dann wird
   *  gesetzt statt gefahren, sonst zuckt sie beim Aufdecken nach. */
  covered: () => boolean
}

export interface SigilCamera {
  /** Was die SCHIENE zeigt. Ersetzt das frühere `selectedRole`. */
  role: Ref<number | null>
  /**
   * Worauf die KAMERA blickt — und damit auch, welcher Knoten hervorgehoben ist
   * und wie breit das Board rechnet. Steht ab dem Klick, `role` folgt einen Takt
   * später; beim Schliessen genau umgekehrt.
   */
  cameraRole: Ref<number | null>
  /** Subjekt der Seite. Gleich `role` — ausser beim Schliessen, wo es stehen
   *  bleibt, damit keine leere Platte ausfährt. */
  panelRole: Ref<number | null>
  phase: Ref<SigilCamPhase>
  /** Den Mount halten, bis die Schiene draussen ist. */
  panelHeld: ComputedRef<boolean>
  /** Board friert seine Keyframes ein und dimmt die ungewählten Cluster. */
  flying: ComputedRef<boolean>
  requestRole: (next: number | null) => void
  onStageTransitionEnd: (event: TransitionEvent) => void
  /** Ohne Fahrt setzen — Tabwechsel, Reset, gedeckter Schleier. */
  snap: (next: number | null) => void
}

type Timer = ReturnType<typeof setTimeout> | null

/** Takte, in denen die Bühne wirklich fährt — nur sie warten auf `transitionend`. */
const STAGE_DRIVEN: ReadonlySet<SigilCamPhase> = new Set<SigilCamPhase>(['aim', 'travel', 'home'])

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useSigilCamera(opts: SigilCameraOptions): SigilCamera {
  const role = ref<number | null>(null)
  const cameraRole = ref<number | null>(null)
  const panelRole = ref<number | null>(null)
  const phase = ref<SigilCamPhase>('idle')

  const panelHeld = computed(() => role.value !== null || phase.value === 'leave')
  const flying = computed(() => phase.value !== 'idle')

  let net: Timer = null

  function clear(t: Timer): null {
    if (t !== null) clearTimeout(t)
    return null
  }

  /** Bei fahrender Bühne das Netz (× NET_MUL), sonst der Takt selbst. */
  function armTimer(ms: number): void {
    net = clear(net)
    const factor = STAGE_DRIVEN.has(phase.value) ? TEAM_SIGIL_CAM_NET_MUL : 1
    net = setTimeout(() => {
      net = null
      settle()
    }, ms * factor)
  }

  function settle(): void {
    switch (phase.value) {
      case 'aim':
        // Die Kamera steht. Jetzt erst die Seite: Schiene herein, Mount, Aufdecken.
        phase.value = 'open'
        role.value = cameraRole.value
        panelRole.value = cameraRole.value
        armTimer(TEAM_SIGIL_OPEN_MS)
        return
      case 'leave':
        // Die Seite ist draussen. Jetzt erst das Board zurück auf die volle Breite.
        phase.value = 'home'
        cameraRole.value = null
        armTimer(TEAM_SIGIL_TRAVEL_MS)
        return
      default:
        net = clear(net)
        phase.value = 'idle'
    }
  }

  function snap(next: number | null): void {
    net = clear(net)
    phase.value = 'idle'
    role.value = next
    cameraRole.value = next
    panelRole.value = next
  }

  function requestRole(next: number | null): void {
    if (next === role.value && phase.value === 'idle') return
    if (prefersReducedMotion() || opts.covered()) {
      snap(next)
      return
    }

    if (next !== null && role.value === null) {
      // Takt 1: nur die Kamera. Das Board rückt auf seine Endlage und zoomt auf
      // den Cluster — die Schiene bleibt geparkt, die Seite mountet noch nicht.
      phase.value = 'aim'
      cameraRole.value = next
      armTimer(TEAM_SIGIL_TRAVEL_MS)
      return
    }

    if (next === null) {
      // Takt 1 rückwärts: die Seite fährt hinaus, die Kamera hält ihre Lage.
      // `panelRole` bleibt stehen, damit nichts Leeres ausfährt.
      phase.value = 'leave'
      role.value = null
      armTimer(TEAM_SIGIL_OPEN_MS)
      return
    }

    // Rollenwechsel bei stehender Schiene: nur schwenken.
    phase.value = 'travel'
    role.value = next
    cameraRole.value = next
    panelRole.value = next
    armTimer(TEAM_SIGIL_TRAVEL_MS)
  }

  /** Nur das eigene `transform` der Bühne taktet, und nur, wo sie auch fährt —
   *  die Knoten darin tragen eigene Transitions und meldeten sich sonst als Ende. */
  function onStageTransitionEnd(event: TransitionEvent): void {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    if (!STAGE_DRIVEN.has(phase.value)) return
    settle()
  }

  onScopeDispose(() => {
    net = clear(net)
  })

  return {
    role,
    cameraRole,
    panelRole,
    phase,
    panelHeld,
    flying,
    requestRole,
    onStageTransitionEnd,
    snap,
  }
}

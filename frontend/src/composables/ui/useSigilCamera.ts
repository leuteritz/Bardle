/* ── Die Phasenmaschine des Team-Tabs ─────────────────────────────────────────
   Board ⇄ Detailseite in ZWEI Takten: `open` macht Platz (Schiene herein, Board
   schmaler, Kamera bleibt mittig), `travel` schwenkt auf den Rollencluster.
   Taktgeber ist `transitionend` der Sigil-Bühne, Timer × NET_MUL nur als Netz.
   Wanduhr: nichts hier ändert Spielzustand. */

import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { TEAM_SIGIL_CAM_NET_MUL, TEAM_SIGIL_OPEN_MS, TEAM_SIGIL_TRAVEL_MS } from '@/config/constants'

export type SigilCamPhase = 'idle' | 'open' | 'travel' | 'closing'

export interface SigilCameraOptions {
  /** Die Fahrt ist gerade nicht zu sehen (Ladeschleier deckt) — dann wird
   *  gesetzt statt gefahren, sonst zuckt sie beim Aufdecken nach. */
  covered: () => boolean
}

export interface SigilCamera {
  /** Was Schiene und Seite zeigen. Ersetzt das frühere `selectedRole`. */
  role: Ref<number | null>
  /** Worauf die Kamera blickt — in `open` hinkt sie um einen Takt hinterher. */
  cameraRole: Ref<number | null>
  /**
   * Subjekt der Seite. Gleich `role` — AUSSER beim Schliessen: dort bleibt es
   * stehen, damit keine leere Platte ausfährt.
   *
   * Es war einmal um eine Blende verzögert, damit der teure Re-Patch in den
   * schnellsten Teil der Fahrt fiel. Gemessen kostete das mehr, als es einbrachte
   * (Rollenwechsel 170–200 ms gegen 92–95 ms ohne) — zurückgenommen.
   */
  panelRole: Ref<number | null>
  phase: Ref<SigilCamPhase>
  /** Den Mount halten, auch während `closing`: sonst führe eine leere Platte aus. */
  panelHeld: ComputedRef<boolean>
  /** Board friert seine Keyframes ein und dimmt die ungewählten Cluster. */
  flying: ComputedRef<boolean>
  requestRole: (next: number | null) => void
  onStageTransitionEnd: (event: TransitionEvent) => void
  /** Ohne Fahrt setzen — Tabwechsel, Reset, gedeckter Schleier. */
  snap: (next: number | null) => void
}

type Timer = ReturnType<typeof setTimeout> | null

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useSigilCamera(opts: SigilCameraOptions): SigilCamera {
  const role = ref<number | null>(null)
  const cameraRole = ref<number | null>(null)
  const panelRole = ref<number | null>(null)
  const phase = ref<SigilCamPhase>('idle')

  const panelHeld = computed(() => role.value !== null || phase.value === 'closing')
  const flying = computed(() => phase.value !== 'idle')

  let net: Timer = null

  function clear(t: Timer): null {
    if (t !== null) clearTimeout(t)
    return null
  }

  /** Bleibt der Zielwert der Bühne gleich, kommt nie ein `transitionend`. */
  function armNet(ms: number): void {
    net = clear(net)
    net = setTimeout(() => {
      net = null
      settle()
    }, ms * TEAM_SIGIL_CAM_NET_MUL)
  }

  function settle(): void {
    if (phase.value === 'open') {
      phase.value = 'travel'
      cameraRole.value = role.value
      armNet(TEAM_SIGIL_TRAVEL_MS)
      return
    }
    if (phase.value === 'travel' || phase.value === 'closing') {
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
    if (next === role.value) return
    if (prefersReducedMotion() || opts.covered()) {
      snap(next)
      return
    }
    const prev = role.value
    role.value = next

    if (prev === null && next !== null) {
      // Takt 1: Platz machen. Die Kamera bleibt stehen, die Seite mountet
      // hinter ihrer eigenen Deckkraft, während die Schiene fährt.
      panelRole.value = next
      phase.value = 'open'
      armNet(TEAM_SIGIL_OPEN_MS)
      return
    }

    if (next === null) {
      // Zurück auf die Mitte: Schiene parkt, Board weitet sich, Kamera zoomt
      // aus — ein Zug. `panelRole` bleibt stehen, damit nichts leer ausfährt.
      phase.value = 'closing'
      cameraRole.value = null
      armNet(TEAM_SIGIL_TRAVEL_MS)
      return
    }

    // Rollenwechsel: nur schwenken. Die Kamera trägt ihn, der Inhalt tauscht
    // sofort — ihn hinter eine Blende zu legen war gemessen teurer.
    phase.value = 'travel'
    cameraRole.value = next
    panelRole.value = next
    armNet(TEAM_SIGIL_TRAVEL_MS)
  }

  /** Nur das eigene `transform` der Bühne taktet — die Knoten darin tragen
   *  eigene Transitions und meldeten sich sonst als Ende der Fahrt. */
  function onStageTransitionEnd(event: TransitionEvent): void {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
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

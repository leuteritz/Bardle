// ── Orbit-Spiegelung für den Planeten-Tab ──────────────────────────────────
// Der Idle-Layer zeichnet zwar nicht, während der Tab offen ist, simuliert aber
// weiter (useRenderingPaused → isIdleSimulationPaused). Er ist damit die EINZIGE
// Quelle der Bahnwinkel; der Tab liest sie nur und übersetzt sie in den
// Fortschritt der Keyframe-Animation. Selbst weiterdrehen dürfte er nicht —
// beide Loops zusammen würden den Orbit doppelt so schnell laufen lassen.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { usePlanetShopStore, isPlanetDown } from '@/stores/world/planetShopStore'
import type { PlanetSlot } from '@/stores/world/planetShopStore'
import {
  initialOrbitAngle,
  orbitEclipsePhase,
  orbitTierForSlotIndex,
  planetOrbitPhases,
} from '@/utils/orbit/planetOrbitPhase'
import { playerSlotInForeground } from '@/utils/orbit/foregroundGate'
import { PLANET_TAB_ORBIT_PERIOD_SEC } from '@/config/constants'

function orbitDelayFor(progress: number): string {
  return `-${(progress * PLANET_TAB_ORBIT_PERIOD_SEC).toFixed(3)}s`
}

/**
 * @param selectedSlotId  Aktuell im Tab gewählter Slot.
 * @param getOrbitEl      Liefert das Orbit-Wrapper-Element der Bühne (kann null sein,
 *                        solange die Bühne nicht gerendert ist).
 * @param isActive        Ist der Planeten-Tab gerade zu sehen? Der Tab bleibt nach
 *                        dem ersten Öffnen gemountet (siehe BardProfileMenu) — ohne
 *                        dieses Signal liefe die Schleife für immer weiter und
 *                        schriebe 60-mal pro Sekunde an ein unsichtbares Element.
 */
export function usePlanetTabOrbit(
  selectedSlotId: Ref<string | null>,
  getOrbitEl: () => HTMLElement | null,
  isActive: Ref<boolean>,
) {
  const store = usePlanetShopStore()

  /** Aktiver Planet steht gerade hinter der Sonne — treibt die Eclipse-Darstellung. */
  const orbitBehind = ref(false)

  /**
   * Alle Slots, die gerade hinter der Sonne stehen — treibt die Sidebar-Kacheln.
   * Gefüllt aus derselben rAF-Schleife wie `orbitBehind` und aus derselben
   * Positions-Map wie das Command Panel, damit alle drei Anzeigen im selben Frame
   * umschalten. Ein reaktives Set statt eines Computeds: die Positions-Map ist
   * bewusst nicht reaktiv, und ein Re-Render soll nur beim Zustandswechsel
   * ausgelöst werden, nicht 60-mal pro Sekunde.
   */
  const eclipsedSlotIds = ref<ReadonlySet<string>>(new Set())

  // Reihenfolge und Filter müssen exakt PlanetOrbit.vue entsprechen: der Index in
  // dieser Liste bestimmt, auf welchem Orbit-Tier (und damit welcher Ellipse) der
  // Slot läuft.
  const orbitSlots = computed(() => store.purchasedSlots.filter((s) => s.role !== null))

  function orbitProgressOf(slotId: string | null): number {
    const slots = orbitSlots.value
    const idx = slotId ? slots.findIndex((s) => s.id === slotId) : -1
    if (idx < 0) return 0
    const { ratio, tiltRad } = orbitTierForSlotIndex(idx)
    const angle =
      planetOrbitPhases.get(slots[idx].id)?.angle ?? initialOrbitAngle(idx, slots.length)
    return orbitEclipsePhase(angle, slots[idx].direction, ratio, tiltRad)
  }

  // Wird nur bei Slot-Wechsel neu ausgewertet (die Phasen-Map ist bewusst nicht
  // reaktiv) und gibt dem frisch eingeblendeten Planeten sofort die richtige
  // Bahnposition, bevor der Frame-Loop übernimmt.
  const orbitPhaseStyle = computed(() => ({
    '--orbit-delay': orbitDelayFor(orbitProgressOf(selectedSlotId.value)),
  }))

  /**
   * Zerstört schlägt Eclipse: Ein Wrack ist gar nicht mehr im Orbit, "hinter der
   * Sonne" wäre die falsche Aussage — dieselbe Rangfolge wie auf der Bühne und im
   * Command Panel.
   */
  function isSlotEclipsed(slot: PlanetSlot): boolean {
    return eclipsedSlotIds.value.has(slot.id) && !isPlanetDown(slot)
  }

  function syncEclipsedSlots() {
    const cur = eclipsedSlotIds.value
    const next = new Set<string>()
    for (const slot of store.slots) {
      if (slot.purchased && slot.role && !playerSlotInForeground(slot.id)) next.add(slot.id)
    }
    if (next.size !== cur.size || [...next].some((id) => !cur.has(id))) {
      eclipsedSlotIds.value = next
    }
  }

  let frame = 0

  function tick() {
    const slotId = selectedSlotId.value
    // Direkt aufs Element statt über einen ref: 60 Re-Renders pro Sekunde dieser
    // großen Komponente nur für eine CSS-Variable wären Verschwendung.
    getOrbitEl()?.style.setProperty('--orbit-delay', orbitDelayFor(orbitProgressOf(slotId)))

    // Das Medaillon hängt an EXAKT derselben Quelle wie das im Command Panel —
    // dieselbe Positions-Map, im selben rAF-Takt gelesen. Ein eigener Nachbau der
    // Schwelle würde unweigerlich wieder auseinanderlaufen.
    const behind = slotId !== null && !playerSlotInForeground(slotId)
    if (orbitBehind.value !== behind) orbitBehind.value = behind

    // Im gleichen Frame wie die Bühne — sonst hinkte die Sidebar hinterher.
    syncEclipsedSlots()

    frame = requestAnimationFrame(tick)
  }

  function startLoop() {
    if (frame) return
    frame = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (!frame) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  watch(isActive, (active) => {
    if (active) startLoop()
    else stopLoop()
  })

  onMounted(() => {
    if (isActive.value) startLoop()
  })
  onUnmounted(stopLoop)

  return { orbitBehind, eclipsedSlotIds, isSlotEclipsed, orbitPhaseStyle }
}

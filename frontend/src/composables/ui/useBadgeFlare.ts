import { ref, watch, onMounted, onScopeDispose, type Ref } from 'vue'
import { BADGE_FLARE_MS } from '@/config/constants'

/**
 * Ein Abzeichen, das RUHIG steht und nur EINMAL aufblitzt, wenn seine Zahl steigt.
 *
 * Grund für das Aufblitzen statt eines Dauertakts: eine Marke, die dauerhaft
 * steht, wird zum Hintergrund. Ein Dauerpuls neben den echten Ereignis-Abzeichen
 * wäre Rauschen; das Aufblitzen trägt dagegen eine Nachricht („etwas Neues ist
 * gerade dazugekommen") und kostet im Ruhezustand keinen Frame.
 *
 * Damit das trägt, muss die übergebene Zahl auch WIEDER FALLEN. Beim Shop war
 * das lange nicht so — an „bezahlbar" gehängt hielten die fünf Solar-Kernstrahlen
 * sie für immer über null, und das Aufblitzen feuerte genau einmal je
 * Spielstand. Seit die Marke das Ungesehene zählt (`shopFreshTotal`), geht sie
 * aus, sobald der Spieler durchgesehen hat.
 *
 * Die Rückgabe ist als Klasse am Abzeichen gedacht; die Keyframes dazu stehen in
 * `components/ui/ShopReadyBadge.vue` und müssen zu BADGE_FLARE_MS passen.
 */
export function useBadgeFlare(count: Ref<number> | (() => number)): Ref<boolean> {
  const flare = ref(false)

  /**
   * Scharf erst nach dem Eintreffen des Spielstands.
   *
   * `main.ts` ruft `loadGame()` unmittelbar hinter `app.mount()` — der 0 → N-Sprung
   * daraus ist kein Zuwachs, den der Spieler erarbeitet hat, und darf nicht
   * blitzen. Das Scharfstellen liegt deshalb in einem MAKROTASK: der läuft sicher
   * hinter der Flush-Runde, in der die Wächter des Ladevorgangs feuern. `nextTick`
   * täte es nicht — es ist ein Mikrotask und liefe je nach Reihenfolge davor.
   *
   * Nicht an das erste Feuern des Wächters gebunden: startet der Spieler bei null
   * Chimes, feuert beim Laden gar nichts, und der erste echte Anstieg wäre dann
   * fälschlich als Ladesprung geschluckt.
   */
  let armed = false
  let armTimer: ReturnType<typeof setTimeout> | null = null
  let offTimer: ReturnType<typeof setTimeout> | null = null
  let rafId: number | null = null

  onMounted(() => {
    armTimer = setTimeout(() => {
      armed = true
      armTimer = null
    }, 0)
  })

  watch(count, (now, before) => {
    if (!armed) return
    if (now <= before) return
    // Klasse abräumen und im nächsten Frame neu setzen, sonst läuft eine bereits
    // laufende Keyframe einfach weiter statt neu zu zünden.
    flare.value = false
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = null
      flare.value = true
    })
    if (offTimer !== null) clearTimeout(offTimer)
    // `setTimeout` und nicht `gameTimeout()`: die Verzögerung ist rein visuell und
    // ändert keinen Spielzustand — sie darf nicht mit dem Zeitraffer skalieren.
    offTimer = setTimeout(() => {
      flare.value = false
      offTimer = null
    }, BADGE_FLARE_MS)
  })

  /* `onScopeDispose` und nicht `onUnmounted`: das Composable wird auch MEHRFACH je
     Komponente aufgerufen (die Schienen-Marken im Shop-Tab rufen es je Abteilung
     einmal), und der Abbau muss dann für jede Instanz einzeln greifen. */
  onScopeDispose(() => {
    if (armTimer !== null) clearTimeout(armTimer)
    if (offTimer !== null) clearTimeout(offTimer)
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return flare
}

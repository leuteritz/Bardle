/**
 * Taucht eine Notify-Marke auf, sagt der Herold es einmal kurz an.
 *
 * Die Marken selbst erscheinen stumm — fünf am Header-Bogen, eine an der
 * Shop-Ecktaste. Wer nicht gerade dorthin sieht, verpasst sie; ein gerade
 * bezahlbar gewordenes Star-Forge-Upgrade meldete sich bisher gar nicht. Der
 * `ready`-Herold schliesst die Lücke, ohne den Meilensteinen ihr Gewicht zu
 * nehmen: er läuft in der kompakten Quittungsspur und weicht einer laufenden
 * Zeremonie immer aus (`announceAmbient`, siehe `useHerald.ts`).
 *
 * EIN Aufruf, aus `HeraldOverlay.vue` heraus. WELCHE Marken sich melden, steht
 * in `config/ui/notifyBadges.ts` (`heralds: true`) — hier steht nur noch, WIE.
 *
 * Champions und Codex melden sich bewusst nicht: neue Champions haben in
 * `HeraldOverlay.vue` schon ihr eigenes `NEW CHAMPION`-Banner beim Anflug, und
 * der Codex bannert seine Stufen selbst. Beides hier zu wiederholen hiesse,
 * dasselbe Ereignis zweimal anzukündigen.
 */

import { watch, onMounted, onScopeDispose } from 'vue'
import { useHerald } from '@/composables/ui/useHerald'
import { useUiStore } from '@/stores/core/uiStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { HERALDING_BADGE_KINDS, NOTIFY_BADGE_BY_KIND } from '@/config/ui/notifyBadges'
import { notifyBadgeCounters } from '@/composables/ui/useNotifyBadges'
import { badgeHeraldSuppressedUntil } from '@/utils/game/badgeSeed'
import {
  STAR_PHASE_DATA,
  HERALD_ARM_DELAY_MS,
  BADGE_HERALD_COOLDOWN_MS,
  type NotifyBadgeKind,
} from '@/config/constants'

/** „1 skill" / „2 skills" — die Marken zeigen echte Zahlen, der Text muss mit. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** Alles, was über das Feuern einer einzelnen Kante entscheidet. */
export interface BadgeHeraldGate {
  /** Füllt das Badge Lab gerade? Dann gehört die Kante ihm, nicht dem Spieler. */
  suppressed: boolean
  /** Gnadenfrist nach dem Laden abgelaufen? */
  armed: boolean
  /** Stand die Marke vor dieser Kante schon offen? */
  wasOpen: boolean
  /** Der Zählerstand NACH der Kante. */
  count: number
  nowMs: number
  lastHeraldAtMs: number
  /** Ist der Tab offen, der diese Marke ohnehin zeigt? */
  tabOpen: boolean
  pageVisible: boolean
}

/**
 * Die Regel, nach der eine Marke sich melden darf — als reine Funktion, damit
 * sie einzeln geprüft werden kann statt nur im Zusammenspiel von fünf Stores.
 *
 * Fünf Sperren, jede gegen einen eigenen Fehlerfall, die gröbste zuerst:
 * 0. `suppressed` — das Badge Lab füllt gerade; fünf Kanten in einer Flush-Runde
 *    stünden sonst als fünf Banner übereinander.
 * 1. `armed` — der 0→N-Sprung aus `loadGame()` ist kein Auftauchen.
 * 2. `wasOpen` — nur das AUFTAUCHEN zählt. `shopFreshTotal` klettert weiter,
 *    solange der Spieler nicht hinsieht; 3 → 4 ist keine Nachricht, 0 → 1 ist eine.
 * 3. Sperrfrist — ein Zähler, der um die Null pendelt, bannert sonst dauernd.
 * 4. Sicht — verdeckte Seite: läuft ins Leere. Offener Ziel-Tab: die Marke
 *    steht dem Spieler schon vor Augen, das Banner wäre nur Lärm.
 */
export function shouldHeraldBadge(gate: BadgeHeraldGate): boolean {
  if (gate.suppressed) return false
  if (!gate.armed) return false
  if (gate.wasOpen || gate.count <= 0) return false
  if (gate.nowMs - gate.lastHeraldAtMs < BADGE_HERALD_COOLDOWN_MS) return false
  if (!gate.pageVisible) return false
  if (gate.tabOpen) return false
  return true
}

export function useBadgeHeralds() {
  const { announceAmbient } = useHerald()
  const uiStore = useUiStore()
  const solarStore = useSolarUpgradeStore()
  const counters = notifyBadgeCounters()

  /**
   * Die Unterzeile je Marke — das Einzige, was NICHT in der Registry steht.
   *
   * Sie ist Text mit Logik (die Sonne nennt ihre nächste Phase statt einer
   * Zahl), kein Stammdatum. Alles übrige — Titel, Kopfzeile, Farbe, Sinnbild,
   * Ziel-Reiter — kommt aus `config/ui/notifyBadges.ts`, und die Zahl aus
   * derselben Quelle wie die Marke selbst.
   */
  const sublines: Record<NotifyBadgeKind, (n: number) => string> = {
    shop: (n) => `${plural(n, 'new purchase')} within reach`,
    skill: (n) => `${plural(n, 'skill')} ready to learn`,
    planet: (n) => `${plural(n, 'level-up')} affordable`,
    expedition: (n) => `${plural(n, 'crew')} returned`,
    forge: () => {
      // Gleiche Herleitung wie im Hover-Tooltip: aus dem Kometen führt der Weg
      // zurück auf die erste Phase, sonst eine Stufe weiter.
      const next = solarStore.isCometState
        ? STAR_PHASE_DATA[0]
        : STAR_PHASE_DATA[solarStore.starPhase + 1]
      return next ? `Next phase: ${next.name}` : 'The final phase awaits'
    },
    champions: (n) => plural(n, 'champion'),
    chronicle: (n) => `${plural(n, 'track')} advanced`,
    level: () => '',
  }

  /**
   * Scharf erst nach dem Eintreffen des Spielstands.
   *
   * `loadGame()` spielt den Stand unmittelbar nach `app.mount()` in die Stores
   * zurück; ein Spielstand mit fünf offenen Marken risse dabei fünf Kanten von
   * 0 auf N und feuerte fünf Banner. Dieselbe Gnadenfrist wie die Herolde in
   * `HeraldOverlay.vue`, und beim Scharfstellen wird zusätzlich der DANN
   * geltende Stand als Grundlinie gemerkt — was schon offen ist, ist nicht neu.
   */
  let armed = false
  let armTimer: ReturnType<typeof setTimeout> | null = null
  const wasOpen = new Map<NotifyBadgeKind, boolean>()
  const lastHeraldAt = new Map<NotifyBadgeKind, number>()

  onMounted(() => {
    armTimer = setTimeout(() => {
      for (const kind of HERALDING_BADGE_KINDS) wasOpen.set(kind, counters[kind]() > 0)
      armed = true
      armTimer = null
    }, HERALD_ARM_DELAY_MS)
  })

  for (const kind of HERALDING_BADGE_KINDS) {
    const def = NOTIFY_BADGE_BY_KIND[kind]
    watch(
      () => counters[kind](),
      (now) => {
        const before = wasOpen.get(kind) ?? false
        // Die Kante zuerst fortschreiben, damit ein unterdrückter Herold die
        // Marke trotzdem als „gesehen" verbucht: sonst gälte sie beim nächsten
        // Zählerzucken erneut als frisch aufgetaucht und feuerte verspätet.
        wasOpen.set(kind, now > 0)
        // Wanduhr, nicht `gameNow()` — Begründung an BADGE_HERALD_COOLDOWN_MS.
        // (Die `app/game-clock`-Regel greift hier nicht, sie deckt Stores und
        // utils/orbit ab; die Wahl ist trotzdem eine bewusste.)
        const nowMs = Date.now()
        const pass = shouldHeraldBadge({
          suppressed: nowMs < badgeHeraldSuppressedUntil(),
          armed,
          wasOpen: before,
          count: now,
          nowMs,
          lastHeraldAtMs: lastHeraldAt.get(kind) ?? -Infinity,
          tabOpen: uiStore.bardActiveTab === def.tab,
          pageVisible: document.visibilityState === 'visible',
        })
        if (!pass) return

        lastHeraldAt.set(kind, nowMs)
        announceAmbient({
          kind: 'ready',
          eyebrow: def.heraldEyebrow,
          headline: def.title,
          subline: sublines[kind](now),
          icon: def.icon,
          portraitSrc: def.imageSrc,
          accent: def.accent,
          // Je Marke ein eigener Schlüssel: zwei verschiedene Hinweise stehen
          // nebeneinander, statt sich zu einem `×2` zu verrechnen — sie
          // erzählen verschiedene Dinge.
          mergeKey: `ready/${kind}`,
        })
      },
    )
  }

  onScopeDispose(() => {
    if (armTimer !== null) clearTimeout(armTimer)
  })
}

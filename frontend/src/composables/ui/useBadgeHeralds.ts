import { watch, onMounted, onScopeDispose } from 'vue'
import { useHerald } from '@/composables/ui/useHerald'
import { useUiStore, type BardTabId } from '@/stores/core/uiStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import {
  STAR_PHASE_DATA,
  HEADER_GEM_ICONS,
  HERALD_ARM_DELAY_MS,
  HERALD_AMBIENT_DISPLAY_MS,
  BADGE_HERALD_COOLDOWN_MS,
  BADGE_HERALD_ACCENT_EXPEDITION,
  BADGE_HERALD_ACCENT_SUN,
  BADGE_HERALD_ACCENT_SKILL,
  BADGE_HERALD_ACCENT_PLANET,
  BADGE_HERALD_ACCENT_SHOP,
  NOTIFY_BADGE_TITLE,
  type NotifyBadgeKind,
} from '@/config/constants'

/**
 * Taucht eine Notify-Marke auf, sagt der Herold es einmal kurz an.
 *
 * Die Marken selbst erscheinen stumm — fünf am Header-Bogen, eine an der
 * Shop-Ecktaste. Wer nicht gerade dorthin sieht, verpasst sie; ein gerade
 * bezahlbar gewordenes Star-Forge-Upgrade meldete sich bisher gar nicht. Der
 * `ready`-Herold schließt die Lücke, ohne den Meilensteinen ihr Gewicht zu
 * nehmen: er ist kompakter, steht kürzer und weicht ihnen immer aus
 * (`announceAmbient`, siehe `useHerald.ts`).
 *
 * EIN Aufruf, aus `HeraldOverlay.vue` heraus — dort liegen die übrigen
 * Herold-Auslöser bereits. Eigene Datei, weil das Overlay lang genug ist und
 * diese Tabelle für sich steht.
 *
 * Das Champion-Abzeichen fehlt bewusst: neue Champions haben in
 * `HeraldOverlay.vue` schon ihr eigenes `NEW CHAMPION`-Banner beim Anflug. Es
 * hier zu wiederholen hieße, denselben Champion zweimal anzukündigen.
 */
interface BadgeHeraldSource {
  /** Zugleich Schlüssel in NOTIFY_BADGE_TITLE und Merker für die Sperrfrist. */
  kind: NotifyBadgeKind
  /** Der Tab, der diese Marke zeigt — ist er offen, entfällt der Herold. */
  tab: BardTabId
  eyebrow: string
  accent: string
  icon?: string
  imageSrc?: string
  /** Genau der Getter, den auch die Marke liest — keine zweite Zählquelle. */
  count: () => number
  subline: (n: number) => string
}

/** „1 skill" / „2 skills" — die Marken zeigen echte Zahlen, der Text muss mit. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** Alles, was über das Feuern einer einzelnen Kante entscheidet. */
export interface BadgeHeraldGate {
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
 * Vier Sperren, jede gegen einen eigenen Fehlerfall:
 * 1. `armed` — der 0→N-Sprung aus `loadGame()` ist kein Auftauchen.
 * 2. `wasOpen` — nur das AUFTAUCHEN zählt. `shopReadyTotal` klettert mit jedem
 *    Chime-Zufluss; 3 → 4 ist keine Nachricht, 0 → 1 ist eine.
 * 3. Sperrfrist — ein Zähler, der um die Null pendelt, bannert sonst dauernd.
 * 4. Sicht — verdeckte Seite: läuft ins Leere. Offener Ziel-Tab: die Marke
 *    steht dem Spieler schon vor Augen, das Banner wäre nur Lärm.
 */
export function shouldHeraldBadge(gate: BadgeHeraldGate): boolean {
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
  const forgeStore = useStarForgeStore()
  const solarStore = useSolarUpgradeStore()
  const meepTreeStore = useMeepTreeStore()
  const planetShopStore = usePlanetShopStore()
  const expeditionStore = useExpeditionStore()

  const sources: BadgeHeraldSource[] = [
    {
      kind: 'shop',
      tab: 'shop',
      eyebrow: 'STAR FORGE',
      accent: BADGE_HERALD_ACCENT_SHOP,
      // Dasselbe Zeichen wie die Ecktaste, an der die Marke hängt — der Blick
      // findet vom Banner zum Ziel, ohne dass er es erst suchen muss.
      icon: HEADER_GEM_ICONS.shop,
      count: () => forgeStore.shopReadyTotal,
      subline: (n) => `${plural(n, 'purchase')} within reach`,
    },
    {
      kind: 'forge',
      tab: 'bard',
      eyebrow: 'SOLAR ASCENT',
      accent: BADGE_HERALD_ACCENT_SUN,
      icon: 'game-icons:heraldic-sun',
      // Die ✦-Marke ist ein Ja/Nein, kein Zähler — 1 oder 0 genügt der Kante.
      count: () => (solarStore.canUpgradeStar ? 1 : 0),
      subline: () => {
        // Gleiche Herleitung wie im Hover-Tooltip: aus dem Kometen führt der
        // Weg zurück auf die erste Phase, sonst eine Stufe weiter.
        const next = solarStore.isCometState
          ? STAR_PHASE_DATA[0]
          : STAR_PHASE_DATA[solarStore.starPhase + 1]
        return next ? `Next phase: ${next.name}` : 'The final phase awaits'
      },
    },
    {
      kind: 'skill',
      tab: 'tree',
      eyebrow: 'MEEP PATH',
      accent: BADGE_HERALD_ACCENT_SKILL,
      // Der Meep selbst statt eines Glyphs, wie im Tooltip der Marke. 128er
      // Stufe: das Medaillon zeigt ihn bis 46px (Regel 35–110 → nächstgrößere
      // vorhandene Variante), das Original wäre unnötiger Decode.
      imageSrc: '/img/BardAbilities/BardMeep-128.png',
      count: () => meepTreeStore.unseenBuyableCount,
      subline: (n) => `${plural(n, 'skill')} ready to learn`,
    },
    {
      kind: 'planet',
      tab: 'planets',
      eyebrow: 'ORBIT',
      accent: BADGE_HERALD_ACCENT_PLANET,
      icon: 'game-icons:ringed-planet',
      count: () => planetShopStore.affordableLevelCount,
      subline: (n) => `${plural(n, 'level-up')} affordable`,
    },
    {
      kind: 'expedition',
      tab: 'team',
      eyebrow: 'EXPEDITION',
      accent: BADGE_HERALD_ACCENT_EXPEDITION,
      // Dasselbe Segel wie der Expeditions-Toast und die Expeditions-Providence.
      icon: 'game-icons:caravel',
      count: () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
      subline: (n) => `${plural(n, 'crew')} returned`,
    },
  ]

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
      for (const src of sources) wasOpen.set(src.kind, src.count() > 0)
      armed = true
      armTimer = null
    }, HERALD_ARM_DELAY_MS)
  })

  for (const src of sources) {
    watch(
      () => src.count(),
      (now) => {
        const before = wasOpen.get(src.kind) ?? false
        // Die Kante zuerst fortschreiben, damit ein unterdrückter Herold die
        // Marke trotzdem als „gesehen" verbucht: sonst gälte sie beim nächsten
        // Zählerzucken erneut als frisch aufgetaucht und feuerte verspätet.
        wasOpen.set(src.kind, now > 0)
        // Wanduhr, nicht `gameNow()` — Begründung an BADGE_HERALD_COOLDOWN_MS.
        // (Die `app/game-clock`-Regel greift hier nicht, sie deckt Stores und
        // utils/orbit ab; die Wahl ist trotzdem eine bewusste.)
        const nowMs = Date.now()
        const pass = shouldHeraldBadge({
          armed,
          wasOpen: before,
          count: now,
          nowMs,
          lastHeraldAtMs: lastHeraldAt.get(src.kind) ?? -Infinity,
          tabOpen: uiStore.bardActiveTab === src.tab,
          pageVisible: document.visibilityState === 'visible',
        })
        if (!pass) return

        lastHeraldAt.set(src.kind, nowMs)
        announceAmbient({
          kind: 'ready',
          eyebrow: src.eyebrow,
          headline: NOTIFY_BADGE_TITLE[src.kind],
          subline: src.subline(now),
          icon: src.icon,
          imageSrc: src.imageSrc,
          accent: src.accent,
          round: false,
          holdMs: HERALD_AMBIENT_DISPLAY_MS,
        })
      },
    )
  }

  onScopeDispose(() => {
    if (armTimer !== null) clearTimeout(armTimer)
  })
}

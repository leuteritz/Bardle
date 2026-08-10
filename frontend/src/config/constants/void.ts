// The Void — die Risse, die den Orbit von aussen aufziehen.
//
// Das einzige System in Bardle, das NIMMT statt gibt. Alles andere (Forge,
// Codex, Vorzeichen, Drifter, Vorsehungen) zahlt aus; hier läuft zum ersten
// Mal eine Uhr GEGEN den Spieler, und die einzige andere im Spiel — die
// Enrage-Uhr eines Bosses — hängt an einem Kampf, den man selbst begonnen hat.
//
// Der Riss steht am Rand des Bildes, zieht an einer Achse der laufenden
// Wirtschaft und wächst, solange er offen ist. Geschlossen wird er von dem,
// was ohnehin im Orbit steht: Kader und Turrets feuern von selbst, Klicks
// beschleunigen. Wer ihn stehen lässt, zahlt mit Sonnen-HP und einem
// Nachbeben.
//
// Die Datei zieht ausser ihren eigenen Typen nichts herein und steht damit
// ganz unten in der Themen-Hierarchie — sie kann von überall gelesen werden,
// ohne einen Zyklus zu riskieren.

import type { VoidRiftSeverity } from '@/types'

// ── Freischaltung ───────────────────────────────────────────────────────────

/**
 * Bard-Level, ab dem der erste Riss aufreissen kann.
 *
 * Deutlich später als die Vorzeichen (`OMEN_UNLOCK_LEVEL` = 5), und das ist
 * der Punkt: ein Riss wird von Kader und Turrets geschlossen, nicht vom guten
 * Willen. Wer noch keine drei Rollen besetzt hat, könnte ihn nur wegklicken —
 * dann wäre die Strafe keine Entscheidung, sondern Willkür.
 */
export const VOID_UNLOCK_LEVEL = 12

// ── Spawn ───────────────────────────────────────────────────────────────────

/**
 * Nur EIN Riss gleichzeitig. Zwei offene Risse liessen sich nicht mehr als
 * Entscheidung lesen ("welchen zuerst?" ist keine, wenn beide dieselbe Antwort
 * haben) und verdoppelten die Drossel in einer Phase, in der der Spieler
 * ohnehin schon verliert.
 */
export const VOID_RIFT_MAX_CONCURRENT = 1

/**
 * Eine Uhr JE SCHWERE — [min, max] Sekunden bis zum nächsten Aufreissen.
 * Dasselbe Muster wie bei den Driftern: ein einzelner gewichteter Wurf würde
 * den abyssalen Riss auf einen Erwartungswert schieben, den niemand mehr
 * einplanen kann.
 *
 * Die Abstände sind bewusst weit. Ein Riss ist eine Unterbrechung, und eine
 * Unterbrechung alle zwei Minuten ist keine Bedrohung mehr, sondern eine
 * Beschäftigung.
 */
export const VOID_RIFT_SPAWN_INTERVAL_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [180, 260],
  greater: [430, 600],
  abyssal: [1080, 1500],
}

/** Vorlauf nach Spielstart bzw. nach dem Laden, je Schwere. Gestaffelt, sonst
 *  laufen alle drei Uhren gemeinsam an und die erste Viertelstunde ist leer. */
export const VOID_RIFT_FIRST_DELAY_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [120, 200],
  greater: [380, 520],
  abyssal: [900, 1200],
}

/** Steht bereits ein Riss, wenn eine Uhr abläuft, wartet diese Schwere nur so
 *  lange und versucht es erneut — der fällige Riss geht nicht verloren. */
export const VOID_RIFT_SPAWN_RETRY_SEC = 25

/** Reihenfolge bei gleichzeitig fälligen Uhren: das Schwerste zuerst. Sonst
 *  verdrängt der häufige kleine Riss regelmässig den, auf den es ankommt. */
export const VOID_RIFT_SEVERITY_ORDER: Record<VoidRiftSeverity, number> = {
  lesser: 0,
  greater: 1,
  abyssal: 2,
}

/** Farbe der Schwere — Rahmen und Label der HUD-Karte. Der Akzent bleibt die
 *  Eigenfarbe des Riss-Typs. Violett bis Magenta, damit die Leere sich auf
 *  einen Blick von Gold (Chimes) und Grün (kaufbar) trennt. */
export const VOID_RIFT_SEVERITY_COLOR: Record<VoidRiftSeverity, string> = {
  lesser: '#8a6fd0',
  greater: '#b04fd8',
  abyssal: '#e0409f',
}

/** Was auf der Karte über dem Namen steht. */
export const VOID_RIFT_SEVERITY_LABEL: Record<VoidRiftSeverity, string> = {
  lesser: 'LESSER RIFT',
  greater: 'GREATER RIFT',
  abyssal: 'ABYSSAL RIFT',
}

// ── Zähigkeit ───────────────────────────────────────────────────────────────

/**
 * Grund-Trefferpunkte eines kleinen Risses, in derselben Einheit wie
 * Champion-DPS und Turret-Salve (beide zahlen einmal je Sekunde ein).
 *
 * Der Wert ist gegen die Frist gerechnet: ein Kader, der den Fortschritt
 * seiner Galaxie mitgegangen ist, drückt ihn in gut der Hälfte der Zeit weg.
 * Wer den Kader hat stehen lassen, schafft es nicht mehr allein — genau dort
 * fängt die Entscheidung an.
 */
export const VOID_RIFT_HP_BASE = 850

/** Zuwachs je Galaxie über der ersten. Multiplikativ auf die Grund-HP. */
export const VOID_RIFT_HP_PER_GALAXY = 0.55

/** Wie viel zäher die schwereren Risse sind. */
export const VOID_RIFT_HP_SEVERITY_MULT: Record<VoidRiftSeverity, number> = {
  lesser: 1,
  greater: 2.4,
  abyssal: 5,
}

/** Wie lange ein Riss offen steht, bevor er kollabiert — je Schwere. Die
 *  schwereren geben mehr Zeit, weil sie auch mehr Zähigkeit mitbringen. */
export const VOID_RIFT_LIFETIME_MS: Record<VoidRiftSeverity, number> = {
  lesser: 75_000,
  greater: 110_000,
  abyssal: 160_000,
}

/**
 * Schaden eines Klicks, als Anteil der EIGENEN maximalen Trefferpunkte.
 *
 * Als Anteil und nicht als fester Betrag, damit der Klick in Galaxie 12 nicht
 * zur Geste verkommt. 2,5 % heisst: 40 Klicks schliessen einen Riss im
 * Alleingang — in 75 Sekunden machbar, aber Arbeit. Das ist die Notbremse für
 * einen Kader, der es nicht schafft, und nicht der vorgesehene Weg.
 */
export const VOID_RIFT_CLICK_DAMAGE_PCT = 0.025

// ── Ziehen ──────────────────────────────────────────────────────────────────

/**
 * Wie stark ein frisch geöffneter Riss zieht, als Anteil seiner vollen
 * Wirkung. Von hier läuft er über seine Lebenszeit linear auf 1 hoch.
 *
 * Warum ansteigend und nicht sofort voll: ein Riss, der in der ersten Sekunde
 * die volle Drossel auflegt, bestraft den Spieler dafür, dass er noch keine
 * Zeit hatte zu reagieren. So kostet Zögern zunehmend — und ein Riss, den man
 * zügig schliesst, kostet fast nichts. Genau diese Kurve macht aus der
 * Bedrohung eine Aufforderung.
 */
export const VOID_RIFT_DRAIN_RAMP_MIN = 0.35

// ── Kollaps ─────────────────────────────────────────────────────────────────

/**
 * Sonnen-HP, die ein Kollaps kostet — je Schwere, bei UNBERÜHRTEM Riss.
 * Skaliert mit den verbliebenen Trefferpunkten: wer ihn halb weggedrückt hat,
 * zahlt die Hälfte. Sonst wäre angefangene Arbeit wertlos, und die richtige
 * Antwort auf einen Riss, den man nicht schafft, wäre ihn zu ignorieren.
 *
 * Zum Vergleich: ein Boss-Enrage kostet `PLAYER_HP_LOSS_ON_ENRAGE` (25) von
 * 100. Der kleine Riss bleibt bewusst darunter — er kommt häufiger.
 */
export const VOID_COLLAPSE_HP_LOSS: Record<VoidRiftSeverity, number> = {
  lesser: 10,
  greater: 18,
  abyssal: 30,
}

/** Wie lange das Nachbeben eines Kollaps nachzieht. */
export const VOID_COLLAPSE_AFTERMATH_MS = 60_000

// ── Beute ───────────────────────────────────────────────────────────────────

/** Deckel auf der Chime-Auszahlung: so viele Sekunden Produktion maximal,
 *  unabhängig davon, was der Typ verspricht. Gleiche Begründung wie beim
 *  Drifter — ein einzelner Abschluss darf keine Progression überspringen. */
export const VOID_BOON_CHIME_CAP_SEC = 420

/** Mindest-Auszahlung, damit ein geschlossener Riss in der Frühphase (CPS ≈ 0)
 *  nicht als leere Mühe endet — Vielfaches des aktuellen Klickwerts. */
export const VOID_BOON_CHIME_MIN_CLICKS = 60

// ── Darstellung ─────────────────────────────────────────────────────────────

/** Feld-Ränder in px: unter dem Header, über der Bottom-Bar. Ein Riss darüber
 *  hinaus wäre halb verdeckt und damit nur halb klickbar. */
export const VOID_RIFT_FIELD_TOP_PX = 130
export const VOID_RIFT_FIELD_BOTTOM_PX = 165

/**
 * Wo der Riss aufreisst: Abstand von der Bildmitte als Anteil der halben
 * Bildschirmdiagonale. Die Untergrenze hält ihn von der Sonne fern — dort
 * sitzt die Klickfläche für Chimes, und zwei Klickziele übereinander sind ein
 * Fehlklick, der Chimes kostet statt Schaden zu machen.
 */
export const VOID_RIFT_RADIUS_FRAC_MIN = 0.6
export const VOID_RIFT_RADIUS_FRAC_RANGE = 0.2

/** Klickfläche um den Riss herum (px, allseitig). */
export const VOID_RIFT_HIT_PADDING_PX = 18

/**
 * Sicherheitsabstand zur Oberkante der erhobenen HUD-Panels (Minimap links,
 * Command rechts). Die sind deckend und liegen über dem Riss-Layer — ein Riss
 * dahinter wäre unsichtbar UND unklickbar und damit ein sicherer Kollaps ohne
 * jede Chance. Das ist der eine Ausgang, den dieses System nie erzwingen darf.
 */
export const VOID_RIFT_HUD_MARGIN_PX = 24

/**
 * Wie oft eine Lage gewürfelt wird, bevor eine geklemmte hingenommen wird.
 * Ein geklemmter Riss klebt sichtbar an einer Kante; auf dem Ring ist genug
 * Platz, das zu vermeiden, und ein paar Würfe sind billiger als eine
 * Sonderbehandlung im Layer.
 */
export const VOID_RIFT_PLACEMENT_TRIES = 12

/** Grösse eines frisch geöffneten Risses als Anteil seiner Endgrösse. Das
 *  Wachstum läuft ausschliesslich über `transform: scale()` — Regel 10. */
export const VOID_RIFT_GROWTH_MIN_SCALE = 0.45

/** Zacken des Risses. Ungerade, damit die Silhouette nicht spiegelsymmetrisch
 *  wird und sich als Bruch statt als Ornament liest. */
export const VOID_RIFT_TENDRIL_COUNT = 7

/** Nachlaufzeiten der beiden Ausgänge, bevor der Knoten entfernt wird. */
export const VOID_RIFT_SEAL_FX_MS = 900
export const VOID_RIFT_COLLAPSE_FX_MS = 1400

/** Funken, die beim Schliessen auseinanderfliegen. */
export const VOID_SEAL_BURST_PARTICLES = 12

/**
 * Umfang der Trefferpunkt-Kreislinie um den Riss (2·π·r bei r = 46 im viewBox
 * 0 0 100 100). Der Ring läuft über `stroke-dashoffset` und nicht über einen
 * `conic-gradient` — siehe Performance-Regel 11; dieselbe Zahl steht als
 * `stroke-dasharray` im CSS.
 */
export const VOID_RIFT_RING_CIRCUMFERENCE = 289.03

/** So lange pingt der Bildschirmrand in Richtung des neuen Risses. Ein Riss
 *  steht still — ohne Ping übersieht ihn, wer gerade in den Shop schaut. */
export const VOID_RIFT_WARN_LEAD_MS = 2200

/** Ab diesem Anteil der Frist schlägt die HUD-Karte auf Warnrot um. */
export const VOID_RIFT_URGENT_FRAC = 0.72

/** Taktrate des Countdowns auf der HUD-Karte. Bewusst gröber als ein Frame —
 *  die Karte zeigt Sekunden, ein 60-Hz-Update wäre reine Verschwendung. */
export const VOID_CARD_TICK_MS = 100

/** Wie lange die Karte nach dem Ausgang noch stehen bleibt. */
export const VOID_CARD_RESULT_MS = 3600

/** Kopfzeilen-Icon der HUD-Karte. */
export const VOID_CARD_ICON = 'game-icons:vortex'

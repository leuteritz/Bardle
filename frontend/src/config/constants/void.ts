// The Void — was aus der Leere auf die Sonne zukriecht.
//
// Das einzige System in Bardle, das NIMMT statt gibt. Alles andere (Forge,
// Codex, Vorzeichen, Drifter, Vorsehungen) zahlt aus; hier drängt zum ersten
// Mal etwas GEGEN den Spieler, und die einzige andere Uhr dieser Art im Spiel —
// die Enrage-Uhr eines Bosses — hängt an einem Kampf, den man selbst begonnen
// hat.
//
// Ein Void-Wesen reisst am Bildrand auf und wandert von dort zur Sonne. Es hat
// keine Frist, es hat einen WEG — und der ist die Uhr. Das ist der Unterschied
// zu jedem Countdown im Spiel: die Drohung steht die ganze Zeit sichtbar auf
// dem Schirm und wird mit jedem Meter grösser, statt in einer Zahl zu stecken.
// Erlegt wird es von dem, was ohnehin im Orbit steht (Kader und Turrets feuern
// von selbst), Klicks beschleunigen. Wer es durchlässt, zahlt mit Sonnen-HP.
//
// Die Datei zieht ausser ihren eigenen Typen nichts herein und steht damit
// ganz unten in der Themen-Hierarchie — sie kann von überall gelesen werden,
// ohne einen Zyklus zu riskieren.

import type { VoidRiftSeverity } from '@/types'

// ── Freischaltung ───────────────────────────────────────────────────────────

/**
 * Bard-Level, ab dem das erste Wesen aufreissen kann.
 *
 * Deutlich später als die Vorzeichen (`OMEN_UNLOCK_LEVEL` = 5), und das ist
 * der Punkt: ein Void-Wesen wird von Kader und Turrets erlegt, nicht vom guten
 * Willen. Wer noch keine drei Rollen besetzt hat, könnte es nur wegklicken —
 * dann wäre die Strafe keine Entscheidung, sondern Willkür.
 */
export const VOID_UNLOCK_LEVEL = 12

// ── Spawn ───────────────────────────────────────────────────────────────────

/**
 * Wie viele Wesen gleichzeitig unterwegs sein dürfen.
 *
 * Grosszügig, weil das System von der MENGE lebt: ein einzelner Wanderer ist
 * ein Klick, ein Dutzend gleichzeitig ist eine Lage, die man ordnen muss —
 * welches zuerst, was lässt man durch. Der Renderer trägt das (ein Canvas für
 * alle, siehe Performance-Regel 4); der Deckel steht hier, damit ein
 * gedrosselter Tab nach dem Aufwachen keine Flut nachholt.
 */
export const VOID_MAX_CONCURRENT = 24

/**
 * Eine Uhr JE SCHWERE — [min, max] Sekunden bis zum nächsten Aufreissen.
 * Dasselbe Muster wie bei den Driftern: ein einzelner gewichteter Wurf würde
 * das abyssale Wesen auf einen Erwartungswert schieben, den niemand mehr
 * einplanen kann.
 *
 * Deutlich dichter als bei den Driftern, denn hier soll sich etwas ANSAMMELN:
 * ein kleines Wesen alle halbe Minute heisst, dass zu jedem Zeitpunkt mehrere
 * unterwegs sind, ohne dass ein einzelnes je bedrohlich wäre.
 */
export const VOID_SPAWN_INTERVAL_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [26, 44],
  greater: [95, 150],
  abyssal: [300, 430],
}

/** Vorlauf nach Spielstart bzw. nach dem Laden, je Schwere. Gestaffelt, sonst
 *  laufen alle drei Uhren gemeinsam an und die erste Minute ist ein Schwarm. */
export const VOID_FIRST_DELAY_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [40, 70],
  greater: [140, 200],
  abyssal: [420, 560],
}

/** Ist das Feld voll, wenn eine Uhr abläuft, wartet diese Stufe nur so lange
 *  und versucht es erneut — das fällige Wesen geht nicht verloren. */
export const VOID_SPAWN_RETRY_SEC = 15

/** Reihenfolge bei gleichzeitig fälligen Uhren: das Schwerste zuerst. Sonst
 *  verdrängt das häufige kleine Wesen regelmässig das, auf das es ankommt. */
export const VOID_SEVERITY_ORDER: Record<VoidRiftSeverity, number> = {
  lesser: 0,
  greater: 1,
  abyssal: 2,
}

/** Farbe der Schwere — Rahmen und Label der HUD-Karte. Der Akzent bleibt die
 *  Eigenfarbe des Typs. Violett bis Magenta, damit die Leere sich auf einen
 *  Blick von Gold (Chimes) und Grün (kaufbar) trennt. */
export const VOID_SEVERITY_COLOR: Record<VoidRiftSeverity, string> = {
  lesser: '#8a6fd0',
  greater: '#b04fd8',
  abyssal: '#e0409f',
}

/** Was auf der Karte über dem Namen steht. */
export const VOID_SEVERITY_LABEL: Record<VoidRiftSeverity, string> = {
  lesser: 'LESSER VOID',
  greater: 'GREATER VOID',
  abyssal: 'ABYSSAL VOID',
}

// ── Die Reise ───────────────────────────────────────────────────────────────

/**
 * Wie lange ein Wesen vom Bildrand bis zur Sonne braucht — je Schwere.
 *
 * Die schweren sind LANGSAMER, nicht schneller. Das ist bewusst gegen den
 * ersten Reflex: ein zähes Wesen, das auch noch rast, wäre schlicht unfair,
 * während ein langsames Ungetüm die ganze Zeit sichtbar näher kommt und damit
 * genau den Druck erzeugt, um den es hier geht. Tempo ist die Drohung, Zähigkeit
 * die Arbeit — beides zugleich hochzudrehen macht aus einer Entscheidung eine
 * Strafe.
 */
export const VOID_TRAVEL_MS: Record<VoidRiftSeverity, number> = {
  lesser: 46_000,
  greater: 68_000,
  abyssal: 96_000,
}

/**
 * Wie weit hinter der Bildkante ein Wesen aufreisst — als Anteil seines EIGENEN
 * Radius im Moment des Aufreissens, nicht seiner Endgrösse (es ist dann erst
 * `VOID_SPAWN_SCALE` gross). 0 setzte den Mittelpunkt genau auf die Kante,
 * 1 schöbe ihn um einen ganzen Radius dahinter; dazwischen ragt es angeschnitten
 * herein und kriecht ins Bild, statt darin zu erscheinen.
 *
 * Bezug ist die ECHTE Kante in Anflugrichtung. Vorher stand hier die halbe
 * Bilddiagonale, und die liegt bei einem Anflug von oben eine halbe Bildhöhe
 * über dem Rand: ein Wesen war dann gut die halbe Reise lang unsichtbar,
 * während die HUD-Karte oben links es längst meldete.
 */
export const VOID_SPAWN_EDGE_OFFSET = 0.35

/**
 * Grösse beim Aufreissen, als Anteil der Endgrösse. Das Wesen wächst auf dem
 * Weg — das liest sich als Annäherung und macht die Bedrohung ablesbar, ohne
 * dass irgendwo eine Zahl stehen müsste.
 */
export const VOID_SPAWN_SCALE = 0.32

/**
 * Seitlicher Versatz der Bahn, als Anteil der halben Bildbreite. Ohne ihn
 * laufen alle Wesen exakt radial und der Bildschirm sieht aus wie ein
 * Sternexplosionsdiagramm; mit ihm bekommt jedes eine eigene Kurve.
 */
export const VOID_PATH_DRIFT_MAX = 0.22

/**
 * Ankunft: Anteil des Sonnenradius, ab dem der Einschlag zählt. Etwas INNERHALB
 * der Scheibe, damit das Wesen die Sonne sichtbar berührt und nicht davor
 * verpufft.
 */
export const VOID_ARRIVAL_SUN_FRAC = 0.72

/** Trefferfläche für den Klick, als Vielfaches der halben Körpergrösse. Grosszügig:
 *  die Wesen bewegen sich, und Präzisionsarbeit auf ein wanderndes Ziel ist
 *  keine Spielmechanik, sondern eine Geduldsprobe. */
export const VOID_HIT_RADIUS_SCALE = 0.62

/** Untergrenze der Trefferfläche in px — ein frisch aufgerissenes Wesen ist
 *  klein, anklickbar muss es trotzdem sein. */
export const VOID_HIT_RADIUS_MIN_PX = 26

// ── Zähigkeit ───────────────────────────────────────────────────────────────

/**
 * Grund-Trefferpunkte eines kleinen Wesens, in derselben Einheit wie
 * Champion-DPS und Turret-Salve (beide zahlen einmal je Sekunde ein).
 *
 * Deutlich niedriger als bei einem stehenden Riss, denn der Orbit-Beschuss
 * verteilt sich jetzt auf ALLE Wesen im Feld: bei einem Dutzend gleichzeitig
 * bekommt jedes nur einen Bruchteil ab, und was einzeln trivial wäre, wird in
 * der Menge zur Arbeit.
 */
export const VOID_HP_BASE = 320

/** Zuwachs je Galaxie über der ersten. Multiplikativ auf die Grund-HP. */
export const VOID_HP_PER_GALAXY = 0.55

/** Wie viel zäher die schwereren Wesen sind. */
export const VOID_HP_SEVERITY_MULT: Record<VoidRiftSeverity, number> = {
  lesser: 1,
  greater: 2.6,
  abyssal: 6,
}

/**
 * Schaden eines Klicks, als Anteil der EIGENEN maximalen Trefferpunkte.
 *
 * Als Anteil und nicht als fester Betrag, damit der Klick in Galaxie 12 nicht
 * zur Geste verkommt. 12 % heisst: rund neun Klicks erlegen ein kleines Wesen
 * im Alleingang — schnell genug, dass Eingreifen sich lohnt, langsam genug,
 * dass man bei einem Dutzend gleichzeitig wählen muss.
 */
export const VOID_CLICK_DAMAGE_PCT = 0.12

// ── Ziehen ──────────────────────────────────────────────────────────────────

/**
 * Wie stark ein frisch aufgerissenes Wesen zieht, als Anteil seiner vollen
 * Wirkung. Von hier läuft es über den Weg linear auf 1 hoch.
 *
 * Warum mit der Nähe ansteigend: ein Wesen am Bildrand ist eine Ankündigung,
 * eines kurz vor der Sonne ein Notfall. Dieselbe Kurve macht aus der Drohung
 * eine Aufforderung — und sie erklärt ohne ein Wort, warum man das vorderste
 * zuerst nimmt.
 */
export const VOID_DRAIN_RAMP_MIN = 0.2

/**
 * Deckel auf der Gesamtdrossel je Achse. Bei einem Dutzend Wesen multiplizieren
 * sich die Faktoren sonst gegen null, und der Spieler steht vor einer
 * Wirtschaft, die nichts mehr produziert — das ist kein Druck mehr, das ist
 * ein Abbruch.
 */
export const VOID_DRAIN_FLOOR = 0.25

// ── Einschlag ───────────────────────────────────────────────────────────────

/**
 * Sonnen-HP, die ein Einschlag kostet — je Schwere.
 *
 * Zum Vergleich: ein Boss-Enrage kostet `PLAYER_HP_LOSS_ON_ENRAGE` (25) von
 * 100. Das kleine Wesen bleibt weit darunter, denn es kommen viele; das
 * abyssale liegt darüber, weil es eines ist, das man wirklich aufhalten muss.
 */
export const VOID_IMPACT_HP_LOSS: Record<VoidRiftSeverity, number> = {
  lesser: 6,
  greater: 15,
  abyssal: 32,
}

/** Wie lange das Nachbeben eines Einschlags nachzieht — je Schwere. Der
 *  eigentliche Preis des abyssalen Wesens steht hier, nicht in den HP. */
export const VOID_IMPACT_AFTERMATH_MS: Record<VoidRiftSeverity, number> = {
  lesser: 25_000,
  greater: 50_000,
  abyssal: 110_000,
}

// ── Beute ───────────────────────────────────────────────────────────────────

/** Deckel auf der Chime-Auszahlung: so viele Sekunden Produktion maximal,
 *  unabhängig davon, was der Typ verspricht. Gleiche Begründung wie beim
 *  Drifter — ein einzelner Abschluss darf keine Progression überspringen. */
export const VOID_BOON_CHIME_CAP_SEC = 300

/** Mindest-Auszahlung, damit ein erlegtes Wesen in der Frühphase (CPS ≈ 0)
 *  nicht als leere Mühe endet — Vielfaches des aktuellen Klickwerts. */
export const VOID_BOON_CHIME_MIN_CLICKS = 40

// ── Darstellung ─────────────────────────────────────────────────────────────

/** Feld-Ränder in px: unter dem Header, über der Bottom-Bar. Nur für die
 *  HUD-Karte und den Spawn-Ring — die Bahn selbst zielt auf die Bildmitte und
 *  läuft damit ohnehin von den Rändern weg. */
export const VOID_FIELD_TOP_PX = 130
export const VOID_FIELD_BOTTOM_PX = 165

/** Zacken des Körpers. Ungerade, damit die Silhouette nicht spiegelsymmetrisch
 *  wird und sich als Bruch statt als Ornament liest. */
export const VOID_TENDRIL_COUNT = 7

/** Nachlaufzeiten der beiden Ausgänge, bevor der Effekt endet. */
export const VOID_SEAL_FX_MS = 900
export const VOID_IMPACT_FX_MS = 1600

/** Funken, die beim Erlegen auseinanderfliegen. */
export const VOID_SEAL_BURST_PARTICLES = 12

/** Ab diesem Anteil des Weges gilt ein Wesen als „nah" — die HUD-Karte schlägt
 *  dann auf Warnrot um und der Körper pulst schneller. */
export const VOID_URGENT_FRAC = 0.72

/** Taktrate des Countdowns auf der HUD-Karte. Bewusst gröber als ein Frame —
 *  die Karte zeigt Sekunden, ein 60-Hz-Update wäre reine Verschwendung. */
export const VOID_CARD_TICK_MS = 100

/** Wie lange die Karte nach dem Ausgang noch stehen bleibt. */
export const VOID_CARD_RESULT_MS = 3200

/** Kopfzeilen-Icon der HUD-Karte. */
export const VOID_CARD_ICON = 'game-icons:vortex'

/** Der Stresstest-Knopf im Admin-Panel füllt das Feld bis zum Deckel — mehr
 *  lässt `spawnMonster` ohnehin nicht zu, und ein Knopf, der „×30" verspricht
 *  und 24 liefert, wäre eine Lüge im Werkzeug. */
export const ADMIN_VOID_SWARM_SIZE = VOID_MAX_CONCURRENT

// ── Pause-Overlay ───────────────────────────────────────────────────────────
// Der Void läuft während der Pause WEITER — genau wie Sterne und Bosse, und aus
// demselben Grund: was passiv bekämpft wird (Kader und Turrets feuern auch
// pausiert), darf auch passiv verloren gehen. Nur SPAWNEN tut nichts Neues,
// sonst legte ein Wesen den halben Weg ungesehen zurück.
// Deshalb steht die Lage im Overlay: der Spieler soll entscheiden können, ob er
// zurückkommt — und das kann er nur, wenn er sie sieht.

/** Breite der Void-Karte in der „Awaiting your return"-Reihe. Etwas schmaler
 *  als eine Stern-Karte: sie trägt eine Zeile weniger. */
export const PAUSE_VOID_CARD_WIDTH = 208

/** Ab so vielen Restsekunden bis zum Einschlag schlägt die Karte auf Warnrot
 *  um. Grosszügiger als bei den Sternen (dort 10 s), weil hier nicht ein
 *  Zeitfenster verstreicht, sondern die Sonne getroffen wird. */
export const PAUSE_VOID_URGENT_SECS = 15

/** So viele Wesen zeigt die Karte einzeln als Punktreihe; der Rest steht als
 *  Zahl. Mehr Punkte wären bei zwei Dutzend eine Textur, kein Zählwerk. */
export const PAUSE_VOID_PIPS_MAX = 6

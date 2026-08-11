// Grundwerte, auf die jedes andere Thema zugreifen darf: Zeit-Umrechnung,
// Speicher-Schlüssel, Spieltakt und ein paar geteilte Anzeige-Konventionen.
// Diese Datei importiert bewusst aus keinem anderen Konstanten-Modul — sie ist
// die Wurzel und muss es bleiben.

// ── Zeit-Umrechnung ────────────────────────────────────────────────────────
// Jede Dauer-Anzeige im Spiel zerlegt Sekunden in Tage/Stunden/Minuten. Die
// Zerlegung selbst steht als `splitDuration` in utils/ui/format.ts — hier liegen
// nur die Faktoren, damit auch Stores und Composables sie benennen können.
export const MS_PER_SECOND = 1000
export const SECONDS_PER_MINUTE = 60
export const MINUTES_PER_HOUR = 60
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR
export const HOURS_PER_DAY = 24
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY

/**
 * Obergrenze für Zähler-Badges. Darüber steht `99+` — die Badges sitzen auf
 * dem Header-Bogen und im Profilmenü, wo eine dreistellige Zahl den Kreis
 * sprengen würde. Format über `formatBadgeCount` in utils/ui/format.ts.
 */
export const BADGE_COUNT_CAP = 99

/**
 * Farbstufen einer HP-Leiste in Prozent. Objective-Modal, Rift-Minimap und
 * Team-Spalte zeigen dieselben Kämpfer nebeneinander — laufen die Schwellen
 * auseinander, ist derselbe Champion links gelb und rechts grün.
 * Klasse über `hpStageClass` in utils/ui/format.ts.
 */
export const HP_STAGE_HIGH_PCT = 60
export const HP_STAGE_MID_PCT = 35

/**
 * Fortschrittsring im 0–100er viewBox: Striker-Squad und Boss-Timer zeichnen
 * denselben Kreis. Der Umfang ist vorberechnet, weil `stroke-dasharray` ihn
 * braucht, um aus einem Anteil eine Bogenlänge zu machen. Der Radius steht
 * zusätzlich als `r="44"` im SVG — beide Werte müssen zusammenpassen.
 */
export const PROGRESS_RING_RADIUS = 44
export const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS

// Star background (App.vue)
/**
 * Polling interval for document.hasFocus() — fallback because Chrome does not
 * reliably fire window focus/blur events on multi-monitor setups. Used by
 * useWindowFocus (global) and useStarBackground (loop watchdog).
 */
export const FOCUS_POLL_INTERVAL_MS = 500

/**
 * Referenz-Auflösung, an der die HUD-Maße (Bottom-Bar, Seitenpanels) mit 1.0
 * skalieren. Kleinere Fenster schrumpfen das HUD proportional, größere lassen
 * es stehen — sonst wüchse die Leiste auf 4K ins Absurde.
 */
/** Abstand der beiden Naht-Linien von ihren Bezugskanten in der Bottom-Bar. */
/**
 * Goldener Winkel. Verteilt eine beliebige Anzahl Elemente gleichmäßig auf
 * einem Kreis, ohne dass sich Richtungen wiederholen — deshalb überall dort,
 * wo Deko-Elemente ohne Math.random gestreut werden sollen.
 */
export const GOLDEN_ANGLE_DEG = 137.508
/** Takt des automatischen Speicherns. Bei verstecktem Tab pausiert er. */
export const AUTO_SAVE_INTERVAL_MS = 5000

export const HUD_SCALE_REF_WIDTH_PX = 2560
export const HUD_SCALE_REF_HEIGHT_PX = 1440

// Save / load
export const SAVE_KEY = 'bard-idle-save'
export const SAVE_VERSION = 1

/**
 * Umbenannte Inhalts-IDs, alt → neu. Ein Spielstand speichert gekaufte Knoten,
 * geschmiedete Relikte und gewählte Perks als blanke ID-Strings — wird eine ID
 * im Katalog umbenannt, findet der alte Eintrag nichts mehr und der Fortschritt
 * ist still verloren. `loadGame` schickt deshalb jede geladene ID durch diese
 * Tabelle, bevor sie in einen Store geht; eine unbekannte ID bleibt, wie sie ist.
 *
 * Alle Einträge stammen aus der Musik-Entfernung: Bardle spielt im Kosmos von
 * Bard, dem Wandering Caretaker, und trug an diesen Stellen noch Namen aus dem
 * Vorrat eines Spielmanns. Die Tabelle bleibt dauerhaft stehen — ein Spielstand
 * kann beliebig alt sein.
 */
export const SAVE_ID_RENAMES: Record<string, string> = {
  // Meep Skill Tree: Branch "Melody" → "Vigil"
  melody_1: 'vigil_1',
  melody_2: 'vigil_2',
  melody_3: 'vigil_3',
  melody_4: 'vigil_4',
  melody_5: 'vigil_5',
  // Star Forge: Zweig, Blatt, Relikt
  allegro: 'quickening',
  battleChorus: 'warhost',
  choirOfChampions: 'hostOfChampions',
  // Star Forge: Konstellationen
  percussiveNova: 'shatteringNova',
  bulwarkChoir: 'bulwarkPact',
  prospectorsSong: 'prospectorsCharm',
  eternalCadence: 'eternalOrbit',
  // Star Forge: Cosmic Bargain
  midasCadence: 'midasHour',
  tempoSurge: 'stellarSurge',
  // Champion-Perk
  'warp-cadence': 'warp-rush',
}

/** The game's name, as the crest of the bottom bar renders it. */
export const GAME_TITLE = 'BARDLE'

// Game Loop
export const GAME_TICK_INTERVAL_MS = 1000

/**
 * Zeitraffer. `1` ist das Live-Spiel und muss es bleiben — bei genau diesem Wert
 * verhält sich Bardle bit-identisch zu einem Build ohne Zeitraffer, weil die
 * Spieluhr (`utils/game/gameClock.ts`) dann wörtlich `Date.now()` zurückgibt und
 * der Takt wörtlich `setInterval(tick, 1000)` ist.
 *
 * Der Regler existiert fürs Balancing: die längste Uhr im Spiel ist die
 * Verweildauer der letzten Sonnenphase mit 24 Stunden — ein Durchlauf bis dorthin
 * dauert in Echtzeit länger als ein Arbeitstag, und ohne Zeitraffer wäre jede
 * Balance-Zahl geraten statt gemessen.
 *
 * Werte unter 1 sind erlaubt und gemeint: eine Zeitlupe macht Frame-Effekte
 * sichtbar, die bei vollem Tempo vorbeihuschen.
 */
export const GAME_SPEED_DEFAULT = 1
export const GAME_SPEED_MIN = 0.1
export const GAME_SPEED_MAX = 100
/** Angebot im Admin-Panel. `1` steht dort separat als „back to live". */
export const GAME_SPEED_PRESETS = [2, 5, 10, 25, 50, 100]

/**
 * Untergrenze für den realen Timer-Abstand. Darunter holt der Takt mehrere Ticks
 * je Feuern nach, statt den Timer schneller zu stellen — Browser klemmen kurze
 * Intervalle, und ein geklemmter Timer bricht die Invariante, an der der gesamte
 * Zeitraffer hängt: EIN Tick ist bei jeder Geschwindigkeit genau
 * `GAME_TICK_INTERVAL_MS` Spieluhr-Millisekunden.
 */
export const GAME_TICK_MIN_INTERVAL_MS = 50

// Section navigation
/** Total number of sections in the game */
export const TOTAL_SECTIONS = 10

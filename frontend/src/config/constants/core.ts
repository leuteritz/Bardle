// Grundwerte, auf die jedes andere Thema zugreifen darf: Zeit-Umrechnung,
// Speicher-Schlüssel, Spieltakt und ein paar geteilte Anzeige-Konventionen.
// Diese Datei importiert bewusst aus keinem anderen Konstanten-Modul — sie ist
// die Wurzel und muss es bleiben.

// ── Zeit-Umrechnung ────────────────────────────────────────────────────────
// Jede Dauer-Anzeige im Spiel zerlegt Sekunden in Tage/Stunden/Minuten. Die
// Zerlegung selbst steht als `splitDuration` in utils/format.ts — hier liegen
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
 * sprengen würde. Format über `formatBadgeCount` in utils/format.ts.
 */
export const BADGE_COUNT_CAP = 99

/**
 * Farbstufen einer HP-Leiste in Prozent. Objective-Modal, Rift-Minimap und
 * Team-Spalte zeigen dieselben Kämpfer nebeneinander — laufen die Schwellen
 * auseinander, ist derselbe Champion links gelb und rechts grün.
 * Klasse über `hpStageClass` in utils/format.ts.
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

/** The game's name, as the crest of the bottom bar renders it. */
export const GAME_TITLE = 'BARDLE'

// Game Loop
export const GAME_TICK_INTERVAL_MS = 1000

// Section navigation
/** Total number of sections in the game */
export const TOTAL_SECTIONS = 10

/**
 * Der Firmament-Reiter — die eine Karte, auf der der ganze Weg steht.
 *
 * Drei Zonen teilen sich EIN Budget: `FIRMAMENT_RAIL_W` links, das Kopfband
 * oben (`FIRMAMENT_CREST_BAND_H`) und der Rest ist Buehne. Wer eine der beiden
 * ersten anhebt, nimmt es der Karte — `__tests__/config/firmamentLayout.spec.ts`
 * bindet den Boden.
 */

// ── Zonen ───────────────────────────────────────────────────────────────────
/** Aussenhoehe des Kopfbands. Haengt per `v-bind` am Element, nicht nur im CSS. */
export const FIRMAMENT_CREST_BAND_H = 92
/** Breite der Wappenzone im Kopfband. */
export const FIRMAMENT_CREST_ID_W = 300
export const FIRMAMENT_RAIL_W = 238
export const FIRMAMENT_RAIL_FOLDED_W = 56
/** Unter dieser Reiterbreite klappt die Leiste selbst ein. Gemessen per
 *  `container-type: inline-size` am Reiter, NICHT am Viewport. */
export const FIRMAMENT_RAIL_AUTOFOLD_W = 1080
/** Boden der Buehne auf Full HD — die Spec rechnet dagegen. */
export const FIRMAMENT_STAGE_MIN_W = 700
export const FIRMAMENT_STAGE_MIN_H = 430

// ── Spirale ─────────────────────────────────────────────────────────────────
/** Unbeleuchtete Plaetze vor der laufenden Galaxie: die Bahn muss weitergehen,
 *  sonst endet das Firmament dort, wo der Spieler gerade steht. */
export const FIRMAMENT_UNLIT_AHEAD = 4
/** Volle Umlaeufe vom Kern bis zum Rand. ZWEI, nicht anderthalb: mit 1,55 las
 *  sich die Bahn als Ring mit ein paar Punkten in der Mitte, nicht als Weg. */
export const FIRMAMENT_SPIRAL_TURNS = 2.0
/** Radius des innersten Knotens, normiert auf den Bahnradius. */
export const FIRMAMENT_SPIRAL_R0 = 0.12
/** Radius des aeussersten. UNTER 1, sonst saesse er auf dem Wall. */
export const FIRMAMENT_SPIRAL_R1 = 0.96
/** Unterlinear, aber nicht `sqrt`: bei 0,5 lagen zwei Drittel der Knoten in der
 *  aeusseren Windung und der Kern stand leer. Gemessen bei 40 Knoten und
 *  Full-HD-Buehne — Abstand 29,2 px gegen 26 px Trefferflaeche. */
export const FIRMAMENT_SPIRAL_RADIUS_EXP = 0.58
/** Bezugsradius aller festen Pixelwerte der Platte: bei `box.r` == 300 ist der
 *  Massstab 1. Darueber wachsen Koerper, Linien und Schrift mit, statt
 *  Stecknadeln zu bleiben — dieselbe Mechanik wie `GALAXY_PLATE_REF_W`. */
export const FIRMAMENT_PLATE_REF_R = 300
/** Abstand der Bahn zur Buehnenkante. */
export const FIRMAMENT_MAP_INSET_PX = 30

// ── Knoten ──────────────────────────────────────────────────────────────────
/** Gemalter Grundradius eines Knotens plus Zuschlag je Stern der Galaxie. */
export const FIRMAMENT_NODE_R_BASE = 4.2
export const FIRMAMENT_NODE_R_PER_STAR = 0.82
/** Kantenlaenge der Trefferflaeche — nie kleiner, egal wie klein der Koerper. */
export const FIRMAMENT_NODE_HIT_MIN = 26
/** Ab dieser Knotenzahl faellt die roemische Ziffer unter jedem Knoten weg und
 *  steht nur noch an Auswahl, Hover und den Toren. */
export const FIRMAMENT_LABEL_MAX_NODES = 22
/** Sternpips sitzen auf diesem Vielfachen des Knotenradius. */
export const FIRMAMENT_PIP_ORBIT = 1.85
export const FIRMAMENT_PIP_R = 1.5
/** Landfall-Rauten auf diesem Vielfachen, im Bogen unter dem Koerper. */
export const FIRMAMENT_LANDFALL_ORBIT = 2.5
export const FIRMAMENT_LANDFALL_R = 2.1
/** Mehr Orte als das zeigt kein Knoten — darueber sagt die Hover-Karte die Zahl. */
export const FIRMAMENT_LANDFALL_MAX_MARKS = 4

// ── Zoom und Fahrt ──────────────────────────────────────────────────────────
/** Drei Stufen statt stufenlosem Rad: jede Stufe ist EIN Repaint. */
export const FIRMAMENT_ZOOM_STEPS = [1, 1.6, 2.4] as const
/** Deckel der Rasterflaeche, wie bei der Voyages-Karte. */
export const FIRMAMENT_MAX_BACKING_PX = 2600
export const FIRMAMENT_MAX_DPR = 2

// ── Deko ────────────────────────────────────────────────────────────────────
/** Sterne je 100000 px² Buehnenflaeche — die Dichte folgt der FLAECHE, aber
 *  gedeckelt, damit 4K nicht in Rauschen ertrinkt. */
export const FIRMAMENT_STAR_DENSITY = 26
export const FIRMAMENT_STAR_MAX = 520
/** Seed des Sternfelds. FEST, nicht der `mapSeed`: das Feld ist der Hintergrund
 *  des ganzen Firmaments und darf beim Warp nicht umspringen. */
export const FIRMAMENT_STAR_SEED = 7
/** Boegen des aeusseren Walls. */
export const FIRMAMENT_RIM_ARCS = 190

// ── Farben ──────────────────────────────────────────────────────────────────
/** Befreit — dieselbe Goldkante, die die Reise im ganzen Spiel traegt. */
export const FIRMAMENT_FREED_COLOR = '#e8c040'
/** Hier steht der Bard. */
export const FIRMAMENT_HERE_COLOR = '#9fe062'
/** Noch nicht betreten. */
export const FIRMAMENT_UNLIT_COLOR = '#8a7a52'
/** Ein Ort auf einer Reiseetappe. */
export const FIRMAMENT_LANDFALL_COLOR = '#68c0a8'
/** Ein Universumstor auf der Bahn. */
export const FIRMAMENT_GATE_COLOR = '#7ab8f0'
/** Ein verlorener Stern. */
export const FIRMAMENT_LOST_COLOR = '#cc6050'

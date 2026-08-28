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

// ── Universumsscheibe ───────────────────────────────────────────────────────
/* Ein Universum ist im Firmament eine SCHEIBE, kein Glyph: Kern in der Mitte,
   Galaxienfeld darum, gluehender Wall am Rand. Gerastert wird sie einmal je
   (Universum, Zustand, Groesse, dpr) — `utils/fx/universeDisc.ts`. */

/** Kachel in der Universumsleiste. NICHT groesser: bei 40 rollt die Leiste auf
 *  Full HD, `firmamentLayout.spec.ts` bindet den Haushalt. */
export const UNIVERSE_DISC_RAIL_PX = 34
/** Wappen im Kopfband — dieselbe Scheibe, nur gross. */
export const UNIVERSE_DISC_CREST_PX = 46
export const UNIVERSE_DISC_MAX_DPR = 2
export const UNIVERSE_DISC_CACHE_MAX = 24
/** Galaxien im Feld. Bei 34 px ist darueber kein Fleck mehr zu trennen. */
export const UNIVERSE_DISC_GALAXIES = 18
/** Boegen des Walls. Die grosse Platte nimmt 190 (`FIRMAMENT_RIM_ARCS`); hier
 *  waeren sie ein geschlossener Strich statt eines Geflechts. */
export const UNIVERSE_DISC_RIM_ARCS = 64
/** Anteile des Radius: wo der Wall beginnt und endet. Eng am Rand — mit 0,80
 *  lag ein drei Pixel breites Band aus Boegen um die Scheibe und las sich als
 *  Zackenkranz, nicht als Geflecht. */
export const UNIVERSE_DISC_RIM_INNER = 0.87
export const UNIVERSE_DISC_RIM_OUTER = 0.99
/** Strichstaerke der Boegen als Anteil des Radius. Bewusst unter einem Pixel:
 *  ein Netz ist fein, und was darueber liegt, wird zur Umrandung. */
export const UNIVERSE_DISC_RIM_W_MIN = 0.018
export const UNIVERSE_DISC_RIM_W_MAX = 0.042
/** Reichweite des Staubschleiers und Radius des Kerns. */
export const UNIVERSE_DISC_DUST_R = 0.72
export const UNIVERSE_DISC_CORE_R = 0.09
/** Unterlinear, wie die Bahn selbst: sonst haengen alle Galaxien am Rand. */
export const UNIVERSE_DISC_FIELD_EXP = 0.6

/** Zeilenhoehe der Leiste: Scheibe plus 2x5 Polsterung plus 2 Rahmen.
 *
 *  Die SCHEIBE treibt sie, nicht der Text — dafuer tragen Namenszeile und Notiz
 *  feste Zeilenkaesten (18/14 px). Vorher hing die Hoehe an der Schriftmetrik
 *  von MedievalSharp, war gemessen 53,5 statt der gerechneten 48, und die Liste
 *  rollte auf Full HD, waehrend die Konstante das Gegenteil behauptete. */
export const UNIVERSE_RAIL_ROW_H = UNIVERSE_DISC_RAIL_PX + 12
/** Kopf, Fuss und Listenpolsterung der Leiste — GEMESSEN auf Full HD. */
export const UNIVERSE_RAIL_HEAD_H = 38
export const UNIVERSE_RAIL_CARRY_H = 140
export const UNIVERSE_RAIL_LIST_PAD = 12
export const UNIVERSE_RAIL_ROW_GAP = 4

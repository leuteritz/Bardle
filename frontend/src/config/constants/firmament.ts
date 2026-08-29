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
export const UNIVERSE_DISC_CACHE_MAX = 48
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
/** Der goldene Winkel — die Vogel-Spirale, nach der Sonnenblumenkerne sitzen.
 *
 *  Er ist die EINZIGE Anordnung, die auf einer Scheibe weder Luecken noch
 *  Speichen erzeugt. Davor kam der Winkel aus einer Hash-Folge und klumpte
 *  sichtbar, und der Radius aus `t^0,6` — der zog 32 % der Koerper in den halben
 *  Radius statt der 25 %, die flaechengleich waeren. Beides zusammen war die
 *  gemeldete Ballung. Als ABLEITUNG, nicht als Dezimalzahl. */
export const UNIVERSE_DISC_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// ── Die Wolke: die grosse Scheibe in der Mitte der Buehne ───────────────────
/* Sie hat KEINEN Glutring und KEINE Kante. Der Ring ist braun-orange wie der
   aeussere Karten-Wall — zwei konzentrische Ringe derselben Farbe lasen sich als
   Rahmen um eine Kachel statt als Blick in den Raum. Die Parallaxe, die er trug,
   wandert dafuer in die TIEFE des Feldes: nahe Koerper ueber fernen. */

/** Wie weit die Koerper reichen. UNTER 1: sie muessen im Inkreis des
 *  quadratischen Sprites liegen, sonst wanderte beim Drehen eine Ecke ins Bild. */
export const UNIVERSE_DISC_CLOUD_REACH = 0.92
/** Ab hier loesen sie sich auf. Das ist es, was „randlos" herstellt — nicht das
 *  Fehlen einer Kante, sondern eine Dichte, die vorher endet.
 *
 *  NICHT frueher: bei 0,55 war die aeussere Haelfte der Wolke aufgezehrt und sie
 *  las sich wieder als Fleck in der Mitte — gemessen fiel die Helligkeit schon
 *  auf halbem Radius unter ein Drittel. Der Auslauf soll den RAND nehmen, nicht
 *  das Feld. */
export const UNIVERSE_DISC_CLOUD_FADE_FROM = 0.7
/** Anteil der NAHEN Schicht. Wenige grosse vor vielen kleinen. */
export const UNIVERSE_DISC_CLOUD_NEAR_SHARE = 0.35
/** Nah ist groesser, fern kleiner — beide ueber den vollen Radius. Nah/fern ist
 *  eine Tiefen-, keine Radiusfrage. */
export const UNIVERSE_DISC_CLOUD_NEAR_SCALE = 1.35
export const UNIVERSE_DISC_CLOUD_FAR_SCALE = 0.7
/** Deckkraft der fernen Schicht gegen die nahe. */
export const UNIVERSE_DISC_CLOUD_FAR_ALPHA = 0.62

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

// ── Drehung der Scheibe ─────────────────────────────────────────────────────
/* Feld und Wall drehen GLEICHSINNIG, der Wall mit halbem Tempo. Das Verhaeltnis
   ist die ganze Wirkung: gleich schnell liest sich die Scheibe als Rad, das sich
   dreht — verschieden schnell als Raum mit Tiefe.

   Gedreht wird das FERTIGE Sprite per CSS `rotate()` am Compositor, nicht neu
   gemalt: `paintCount` bleibt bei null, es gibt keine Frame-Schleife. Der
   ❌-Eintrag gegen die driftende Drehung gilt der KARTE und ihrem Neuzeichnen. */

/** Ein Umlauf des Galaxienfeldes.
 *
 *  NICHT die Rate des Entwurfs (0,012 rad/s, also 524 s): der dreht eine Karte
 *  mit Radius 286, hier eine Scheibe mit Radius 17 — dieselbe Winkelrate ergaebe
 *  am Rand 0,17 px/s.
 *
 *  Und NICHT die 210 s, die einmal hier standen. Sie kamen aus einer geschaetzten
 *  Wahrnehmungsschwelle von 0,5 px/s; die war zu niedrig, und der Nutzer meldete
 *  die Scheibe als stillstehend. GEMESSEN gilt: 0,5 px/s sieht niemand, 1,8 px/s
 *  schon — 60 s ergeben 18° in drei Sekunden Hinsehen. Wer die Dauer wieder
 *  hochzieht, macht denselben Fehler; `firmamentLayout.spec.ts` haelt dagegen. */
export const UNIVERSE_DISC_SPIN_SEC = 60
/** Der Wall braucht das Doppelte. Aus dem Entwurf uebernommen (`drift * 0.5`).
 *
 *  Das Verhaeltnis erzeugt PARALLAXE zwischen zwei bewegten Ebenen. Steht das
 *  Feld still (unbetretene Scheibe), gibt es keine zu wahren — dann traegt der
 *  Wall die volle Rate, sonst waere die einzige sichtbare Bewegung halbiert. */
export const UNIVERSE_DISC_RIM_SPIN_RATIO = 2

/** Die Basis der Wurzelregel: `UNIVERSE_DISC_SPIN_SEC` gilt bei
 *  `UNIVERSE_DISC_RAIL_PX`, jede andere Groesse leitet daraus ab
 *  (`universeDiscSpinSec`). Eine feste Dauer fuer alle machte die grosse Scheibe
 *  zum Kreisel (9,4 px/s bei 180 px) und eine feste Randrate die kleine zum
 *  Stillstand (3,4 Grad in drei Sekunden). */

// ── Die Heldenscheibe in der Mitte der Buehne ───────────────────────────────
/* Das beobachtete Universum, gross. Sie ist dieselbe `UniverseDisc` wie in der
   Leiste — kein zweites Zeichenrezept, nur eine andere Kantenlaenge. */

/** Anteil des Bahnradius. 0,286 ergibt 180 px auf Full HD; darueber deckt sie
 *  die zweite Windung mit ab, darunter traegt die Drehung nicht mehr. */
export const UNIVERSE_DISC_HERO_R_RATIO = 0.286
export const UNIVERSE_DISC_HERO_MIN_PX = 140
/** Deckel: auf 4K ergaebe der Anteil 463 px und die Scheibe fraesse die halbe Bahn. */
export const UNIVERSE_DISC_HERO_MAX_PX = 420
/** Stufung der Kantenlaenge. `px` steht im Cache-Schluessel — stufenlos an
 *  `box.r` gehaengt riebe jeder Resize-Frame ein neues Sprite. Dieselbe
 *  Ueberlegung wie `ORBIT_SCALE_QUANTIZE_STEPS`. */
export const UNIVERSE_DISC_HERO_QUANT_PX = 20
/** Deckkraft der Heldenscheibe. Die drei innersten Knoten liegen auf ihr, der
 *  dritte auf Anteil 0,94 — also im warmen Glutring. Gedaempft wird die ganze
 *  Ebene, NICHT per Vignette im Sprite: die muesste aussen daempfen und traefe
 *  den Wall, der die Drehung ueberhaupt sichtbar macht. */
export const UNIVERSE_DISC_HERO_OPACITY = 0.85

// ── Der Wall der Karte ──────────────────────────────────────────────────────
/** Er dreht GEGEN die Heldenscheibe. Er ist nicht der Wall einer Scheibe (dort
 *  gilt weiter gleichsinnig, halbes Tempo), sondern die Grenze des Bekannten um
 *  die ganze Bahn — gleichsinnig verschmolze er mit ihr optisch zu einem Rad. */
export const FIRMAMENT_RIM_SPIN_REVERSE = true
/** Zuschlag der Sprite-Kante ueber `box.r` hinaus: der aeusserste Bogen reicht
 *  bis 1,02 r, dazu die halbe Strichstaerke. */
export const FIRMAMENT_RIM_SPRITE_MARGIN = 1.06
/** Deckel der Wall-Rasterflaeche. EIGEN, nicht `FIRMAMENT_MAX_BACKING_PX`: die
 *  Ebene ist quadratisch und waechst mit dem Zoom, bei 2,4 auf 2K waeren es
 *  sonst 27 MB fuer ein Band aus Haarlinien. Bei Zoom 1 greift er auf keiner
 *  Zielaufloesung — dort steht dpr 2 und das Bild ist das von vorher. */
export const FIRMAMENT_WALL_MAX_BACKING_PX = 2048
/** Dunkle Kontur unter der Bahn, in Referenzpixeln. Sie kreuzt jetzt das
 *  Galaxienfeld der Heldenscheibe; Gold bei Alpha 0,45 verschwand darauf. */
export const FIRMAMENT_ROAD_CASING_W = 2.6
/** Schattenteich unter jedem Knoten, als Vielfaches seines Koerperradius. Ohne
 *  ihn schwimmt der Knoten im Galaxienfeld der Heldenscheibe — dieselbe Lehre
 *  wie `CORE_GATE_POOL_SPAN`: ein Loch in einem Leuchten ist kein Loch. */
export const FIRMAMENT_NODE_POOL_SPAN = 3.4

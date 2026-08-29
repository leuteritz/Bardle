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
/** Zuschlag der Karten-Sprite-Kante ueber `box.r` hinaus.
 *
 *  Die Karte ist ein QUADRATISCHES Sprite um `box.cx/cy`, wie der Wall — sie
 *  dreht mit der Wolke, und buehnenfuellend schwenkte alles, was bei Zoom und
 *  Fahrt ausserhalb der Buehne liegt, als leere Flaeche ins Bild.
 *
 *  Der Teich unter dem groessten Knoten ist der weiteste Zug: 0,96 r plus
 *  `3,4 · 9,94 / 300` sind 1,073 r. `firmamentPlate.spec.ts` bindet die Wand. */
export const FIRMAMENT_PLATE_SPRITE_MARGIN = 1.1
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
/* Ein Knoten ist ein KOERPER DESSELBEN FELDES, kein Zeichen darauf. Er wird
   deshalb gemalt wie die Galaxien der Wolke — eine geneigte Ellipse — nur
   groesser, heller und mit einem Kern. Der leuchtende Punkt mit 2,6-fachem
   runden Halo, der einmal hier stand, las sich daneben als Aufkleber. */

/** Grosse Halbachse als Vielfaches des Knotenradius. */
export const FIRMAMENT_NODE_BODY_RX = 1.15
/** Achsverhaeltnis, je Galaxie aus `jitter()` gezogen. Nie rund und nie flach:
 *  eine Kreisscheibe waere wieder der Punkt, unter 0,4 ein Strich. */
export const FIRMAMENT_NODE_BODY_RATIO_MIN = 0.42
export const FIRMAMENT_NODE_BODY_RATIO_MAX = 0.78
/** Der Schein um den Koerper — ELLIPTISCH und in seiner Neigung, sonst ueberrundet
 *  er die Form, die er umgeben soll. Vielfaches des Knotenradius. */
export const FIRMAMENT_NODE_HALO_SPAN = 2.4
export const FIRMAMENT_NODE_HALO_ALPHA = 0.34
/** Der helle Kern, als Anteil des Knotenradius. Ohne ihn ist die Marke bei zwoelf
 *  Pixeln ein Fleck. */
export const FIRMAMENT_NODE_CORE_R = 0.34

/** Der Sternstand ist EIN Bogen, kein Punktkranz: gold, was gerettet wurde, rot
 *  anschliessend, was verloren ging, der Rest bleibt LEER.
 *
 *  Sieben Pips je Knoten waren bei vierzig Knoten 280 Marken. Ein voll befreiter
 *  Knoten traegt so einen geschlossenen Goldring — und genau der ist die Marke,
 *  die ihn vom Feld abhebt. Eine blasse Restspur gaebe jedem Knoten wieder eine
 *  geschlossene Kontur, also genau das, was verschwinden soll. */
/** Eng am Koerper, fein und gedaempft — sonst ist die Marke eine MEDAILLE.
 *
 *  Gemessen bei 1,95 · 1,9 px · voller Deckkraft: ein satter Goldreif mit
 *  sichtbarer Luecke zum Koerper, sechsundzwanzigmal auf der Karte. Das las sich
 *  als Rahmen um eine Kachel — dieselbe Falle, in die schon der Glutring der
 *  Wolke lief. Dicht am Koerper und fein ist es ein Ring UM eine Galaxie. */
export const FIRMAMENT_STAR_ARC_ORBIT = 1.6
export const FIRMAMENT_STAR_ARC_W = 1.25
export const FIRMAMENT_STAR_ARC_ALPHA = 0.62
/** Verlorenes steht hoeher: es ist selten, und man soll es sehen. */
export const FIRMAMENT_STAR_ARC_LOST_ALPHA = 0.9
/** Landfall-Rauten auf diesem Vielfachen, im Bogen unter dem Koerper. */
export const FIRMAMENT_LANDFALL_ORBIT = 2.5
export const FIRMAMENT_LANDFALL_R = 2.1
/** Mehr Orte als das zeigt kein Knoten — darueber sagt die Hover-Karte die Zahl. */
export const FIRMAMENT_LANDFALL_MAX_MARKS = 4

// ── Der Startpunkt ──────────────────────────────────────────────────────────
/* Die Bahn setzt in der Mitte an — `paintRoad` zieht ihre erste Linie von
   `box.cx/cy` zum ersten Knoten. Der Punkt trug bisher keine Benennung, und ein
   heller Fleck mit einer Linie daran sagt niemandem, dass dort die Strasse
   beginnt.

   Das Label haengt am DOM, nicht am Canvas: dieselbe Begruendung wie bei den
   roemischen Ziffern — ein Hover kostete sonst einen Repaint der ganzen Platte,
   und den Text gaebe es zweimal. Es liegt IN `.fm-layer`, faehrt also mit und
   waechst mit dem Zoom; es beschriftet einen Ort auf der Karte, keine Stelle des
   Bildschirms.

   Unter der Mitte ist Platz: `firmamentPointAt(0)` setzt den ersten Knoten
   senkrecht nach OBEN, und bis rund 0,5 r nach unten liegt weder Knoten noch
   Strasse.                                                                    */

/** Abstand der Label-Oberkante unter der Mitte, als Anteil des Bahnradius.
 *  Der Halo des Kerns misst `2 · box.r · UNIVERSE_DISC_HERO_R_RATIO ·
 *  UNIVERSE_DISC_CLOUD_HALO_R` — auf Full HD 25 px; das Label steht bei 36 und
 *  laesst ihm Luft. */
export const FIRMAMENT_START_LABEL_OFFSET = 0.115
/** Schriftgrad in Referenzpixeln, mit `k` skaliert, samt Boden und Deckel. Auf
 *  Zoomstufe 2,4 waeren es sonst 50 px — die Marke soll gross sein, nicht die
 *  Karte beherrschen. */
export const FIRMAMENT_START_LABEL_PX = 20
export const FIRMAMENT_START_LABEL_MIN_PX = 13
export const FIRMAMENT_START_LABEL_MAX_PX = 34
/** Laenge der Haarlinie vom Kern zum Label, ebenfalls in Referenzpixeln. Sie
 *  bindet die Beschriftung an den Punkt, den sie meint. */
export const FIRMAMENT_START_TICK_PX = 16

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
/** Deckkraft der Sterne. Gedaempft, seit das Universum die ganze Scheibe fuellt:
 *  daneben waeren es zwei konkurrierende Punktfelder.
 *
 *  Gedaempft, nicht AUSGEDUENNT — die Dichte traegt die Tiefe. Weniger, gleich
 *  helle Sterne lesen sich als Luecken; gleich viele, blassere als Ferne. */
export const FIRMAMENT_STAR_ALPHA_MIN = 0.03
export const FIRMAMENT_STAR_ALPHA_MAX = 0.2
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
/** Boegen des Walls. Die grosse Platte webt statt zu streichen
 *  (`FIRMAMENT_WEB_NODES`); hier waere ein Geflecht bei 34 px ein grauer Ring. */
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

/** Kern und Halo der Wolke — ABSOLUT, nicht als Anteil des Radius.
 *
 *  Er markiert „du bist hier" und ist der Nachfolger des entfallenen
 *  `paintOrigin`. Mit `UNIVERSE_DISC_CORE_R` (0,09) mitgewachsen waere er auf
 *  Full HD ein 28-px-Punkt mit 93-px-Halo und auf 4K 71 und 237 — eine Sonne,
 *  die ein Sechstel der Buehne deckt. Die Zahlen reproduzieren den alten
 *  Ursprung: er malte `26 k` Halo und `4,2 k` Punkt bei `k = box.r / 300`, und
 *  die Wolke misst rund `2 box.r`. */
export const UNIVERSE_DISC_CLOUD_CORE_R = 0.0071
export const UNIVERSE_DISC_CLOUD_HALO_R = 0.044
/** Die Wolke traegt DREIMAL so viele Koerper wie die Kachel — und entsprechend
 *  kleinere, die Bedeckung bleibt bei 3,3 %.
 *
 *  Die Grunddichte gilt fuer eine 34-px-Kachel. Ueber die ganze Kartenscheibe
 *  gezogen ergab sie 328 Marken zu 2,3 bis 5,4 px: das las sich als Konfetti,
 *  nicht als Galaxienfeld. Mit dem Faktor sind es 985 zu 1,3 bis 3,1 px. */
export const UNIVERSE_DISC_CLOUD_DENSITY = 3
/** Deckel der Koerperzahl. Auf 4K waeren es sonst 2500 Ellipsen in EINEM
 *  Sprite-Bau — im teuersten Frame des Reiters. */
export const UNIVERSE_DISC_CLOUD_MAX_BODIES = 2000
/** Der Staub der Wolke liegt ueber der ganzen Buehne. Mit den 0,34 der Kachel
 *  toente er alles gruen und schluckte die Knotenfarben — er soll Tiefe geben,
 *  nicht faerben. */
export const UNIVERSE_DISC_CLOUD_DUST_ALPHA = 0.16

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

/** Anteil des Bahnradius.
 *
 *  0,98 — die Wolke IST die Kartenscheibe, nicht ein Koerper darauf. Zusammen
 *  mit `_CLOUD_REACH` enden die Galaxien bei 0,90 r, also genau dort, wo der
 *  Wall beginnt.
 *
 *  Sie stand einmal auf 0,286 (180 px auf Full HD). Das war als Herzstueck
 *  gedacht und las sich als handtellergrosser Fleck in der Mitte, waehrend die
 *  Flaeche, auf der die Bahn liegt, leer blieb. Die Bahn soll IM Universum
 *  liegen, nicht daneben. */
export const UNIVERSE_DISC_HERO_R_RATIO = 0.98
export const UNIVERSE_DISC_HERO_MIN_PX = 140
/** Deckel der Rasterflaeche — NICHT der Kantenlaenge.
 *
 *  Ein Deckel auf `px` machte die Wolke auf grossen Buehnen wieder zum Fleck.
 *  Gedeckelt gehoert der Speicher: auf 4K verlangt sie bei dpr 2 ein
 *  3160er Backing, also 76 MB fuer zwei Ebenen. Bei Full HD und 2K greift er
 *  nicht — dort steht dpr 2. Dieselbe Mechanik wie `FIRMAMENT_WALL_MAX_BACKING_PX`. */
export const UNIVERSE_DISC_CLOUD_MAX_BACKING_PX = 2048
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
/* -- Das Filamentgewebe ------------------------------------------------------
   Der Wall ist ein NETZ, kein Bogenkranz: Knoten, die Straenge tragen, und
   Ranken, die nach innen ausfransen. Vorher lagen 190 einzelne Boegen in einem
   Band von 0,90 bis 0,99 r — jeder fuer sich, keine Kreuzung, zwei harte
   Kanten. Das las sich als Zackenkranz um eine Kachel.                        */

/** Kreuzungen je Schale. Sie tragen ALLES weitere — Straenge, Ranken und
 *  Lichtpunkte haengen an ihnen, die Strichzahl ist ein Vielfaches davon.
 *  FEST, nicht mit dem Radius wachsend: die Strichstaerke skaliert mit `k`, die
 *  Zahl bleibt, sonst kostete ein Zoomschritt auf 4K das Dreifache. */
export const FIRMAMENT_WEB_NODES = 120
/** SCHALEN, und das ist der Kern des Rezepts.
 *
 *  Eine einzige Knotenreihe ergibt keine Masche, sondern eine Zickzacklinie:
 *  jeder Knoten hat genau zwei Nachbarn, es gibt keine Zelle. Erst mehrere
 *  ineinandergreifende Schalen, tangential UND radial verbunden, schliessen
 *  Zellen — und Zellen sind das, was ein kosmisches Netz ausmacht. Drei sind
 *  das Minimum: bei zweien ist die Masche eine Leiter. */
export const FIRMAMENT_WEB_RINGS = 3
/** Wo die Schalen im Band sitzen und wie weit ihr Radius streut. Die Streuung
 *  ist etwas kleiner als ihr Abstand — so greifen sie ineinander, ohne dass
 *  eine als Kreis lesbar wird. */
export const FIRMAMENT_WEB_SHELL_LO = 0.88
export const FIRMAMENT_WEB_SHELL_HI = 0.99
export const FIRMAMENT_WEB_SHELL_JITTER = 0.4
/** Anteile des Radius: wo das Gewebe liegt.
 *
 *  Innen 0,84 — der Saum soll AUSFRANSEN, nicht an einer Kante enden. Die
 *  aeussersten Bahnknoten stehen bei 0,96 r und damit mitten darin; sie bleiben
 *  lesbar, weil die Karte darueber liegt und jeder Knoten seinen Schattenteich
 *  traegt.
 *
 *  Aussen 1,01 — HARTE Grenze: der aeusserste Strang plus halbe Strichstaerke
 *  muss innerhalb `FIRMAMENT_RIM_SPRITE_MARGIN` liegen. Wer sie anhebt, muss die
 *  Margin mitziehen, sonst wandert beim Drehen eine abgeschnittene Kante durchs
 *  Bild — und das sieht man erst nach einer halben Umdrehung. */
export const FIRMAMENT_WEB_INNER = 0.84
export const FIRMAMENT_WEB_OUTER = 1.01
/** Anteil der Knoten, der eine ZWEITE radiale Verbindung zur naechsten Schale
 *  bekommt. Genau diese zweite Strebe schliesst aus einer Leiter ein Netz: sie
 *  macht aus je zwei Vierecken drei Zellen. */
export const FIRMAMENT_WEB_LINK_SHARE = 0.7
/** Anteil der Knoten mit Ranke nach innen, ihre Gabelung und ihre Reichweite
 *  als Anteil des PLATZES bis zum Innenrand — nicht der Bandbreite: eine feste
 *  Laenge liefe bei der Haelfte in die Klemmung, und deren Spitzen laegen dann
 *  alle auf demselben Kreis. Die Ranken haengen an der INNERSTEN Schale und
 *  tragen den Saum: ohne sie endet das Gewebe an einer Linie. */
export const FIRMAMENT_WEB_TENDRIL_SHARE = 0.42
export const FIRMAMENT_WEB_TENDRIL_FORKS = 2
export const FIRMAMENT_WEB_TENDRIL_REACH = 0.9
/** Strichstaerke in Referenzpixeln, mit `k` skaliert. Fein und nahezu gleich —
 *  die Tiefe traegt die HELLIGKEIT, nicht die Staerke; ein Netz aus dickeren
 *  Linien wird zur Umrandung. */
export const FIRMAMENT_WEB_W_MIN = 0.4
export const FIRMAMENT_WEB_W_MAX = 0.95
/** Deckkraft am Innen- und am Aussenrand. Das Gefaelle macht den Auslauf; eine
 *  Vignette darueber waere eine zweite Quelle fuer dieselbe Aussage. */
export const FIRMAMENT_WEB_ALPHA_IN = 0.1
export const FIRMAMENT_WEB_ALPHA_OUT = 0.55
/** Lichtpunkte an den Kreuzungen: Anteil der Knoten und ihr Radius in
 *  Referenzpixeln. Ohne sie ist ein Netz aus Haarlinien nur Griess. */
export const FIRMAMENT_WEB_SPARK_SHARE = 0.22
export const FIRMAMENT_WEB_SPARK_R = 1.1
/** Die Glut UNTER dem Gewebe. Sie steht im STANDBILD, nicht im drehenden
 *  Sprite: ein rotationssymmetrischer Verlauf traegt keine Drehung, und im
 *  Sprite muesste er bis an dessen Kante decken.
 *
 *  KLEIN, und das ist der Punkt: bei 0,14 fuellte sie das ganze Band und der
 *  Wall las sich als brauner Reifen, auf dem das Gewebe kaum noch auffiel. Die
 *  Vorlage ist dunkel — das LICHT kommt aus den Filamenten, nicht aus der
 *  Flaeche hinter ihnen. */
export const FIRMAMENT_WEB_GLOW_ALPHA = 0.05
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

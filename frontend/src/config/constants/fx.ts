import type { Rgb } from '@/utils/fx/spaceBody'

// Rein visuelle Effekte ohne Spielwirkung: Partikelfelder, Sternenhintergrund,
// Hintergrund-Kometen, die Abgangs-Effekte der Sterne, Supernova und der
// Hyperspace-Sprung.

// ── Deko-Partikelfelder (utils/fx/particleField.ts) ───────────────────────────
// Aufsteigende Glut hinter Star-Fight- und Rescue-Overlay sowie die treibenden
// Staubkörner im Pause-Overlay. Alle Werte werden aus dem Partikel-Index
// abgeleitet, nicht gewürfelt: die Felder müssen über einen Re-Render hinweg
// stehenbleiben, sonst springt jedes Korn bei jeder Änderung an eine neue Stelle.
/** Glut: Aufstiegsdauer, gestaffelt über EMBER_DURATION_VARIANTS Stufen. */
export const EMBER_DURATION_BASE_S = 1.8
export const EMBER_DURATION_STEP_S = 0.7
export const EMBER_DURATION_VARIANTS = 6
/** Negativer Startversatz, damit das Feld bereits in Bewegung erscheint. */
export const EMBER_DELAY_STEP_S = -0.35
export const EMBER_DELAY_VARIANTS = 11
/** Korngröße und Deckkraft, ebenfalls aus dem Index gestaffelt. */
export const EMBER_SIZE_BASE_PX = 1.5
export const EMBER_SIZE_VARIANTS = 3
export const EMBER_OPACITY_BASE = 0.4
export const EMBER_OPACITY_STEP = 0.15
export const EMBER_OPACITY_VARIANTS = 4
/**
 * Waagerechter Schritt zwischen zwei Körnern in Prozent. Beide Overlays nutzen
 * eine irrationale Schrittweite, damit sich das Muster nicht wiederholt — und
 * bewusst verschiedene, damit die zwei Felder nicht deckungsgleich aussehen.
 */
export const EMBER_LEFT_STEP_STAR_FIGHT_PCT = 4.55
export const EMBER_LEFT_STEP_RESCUE_PCT = 4.17

/**
 * Pause-Staub: der goldene Winkel (137.5) und der Kehrwert des goldenen
 * Schnitts (61.8) streuen die Körner ohne sichtbare Reihen über die Fläche.
 */
export const PAUSE_DUST_LEFT_STEP_PCT = 137.5
export const PAUSE_DUST_TOP_STEP_PCT = 61.8
export const PAUSE_DUST_TOP_OFFSET_PCT = 13
export const PAUSE_DUST_SIZE_BASE_PX = 1.5
export const PAUSE_DUST_SIZE_VARIANTS = 4
export const PAUSE_DUST_DELAY_STEP_S = 0.45
export const PAUSE_DUST_DELAY_CYCLE_S = 4
export const PAUSE_DUST_DURATION_BASE_S = 4
export const PAUSE_DUST_DURATION_VARIANTS = 6

// ── Stern-Rettung: Lichtblitz beim Einsammeln ─────────────────────────────
export const STAR_RESCUE_BURST_DURATION_MS = 400
export const STAR_RESCUE_BURST_RAY_COUNT = 18
export const STAR_RESCUE_BURST_MAX_ALPHA = 0.65
/** Strahllänge als Anteil der halben Bildschirmdiagonale. */
export const STAR_RESCUE_BURST_RAY_MIN_LEN = 0.18
export const STAR_RESCUE_BURST_RAY_MAX_LEN = 0.42

// ── Universumssprung: „Through the Gate" ──────────────────────────────────
// Kein eigenes Canvas: die Maschine in utils/orbit/universeHop.ts tickt mit
// dem rAF-Delta der Sternfeld-Schleife, ihre Flanken schalten den Store.
// Alle Zeiten Wanduhr; das Netz in UniverseHopVeil ist ×2.
/** Der Aufbruch ist SICHTBAR: der Schleier hebt bei ~450 ms, Schub und Schwenk laufen mit
 *  EINEM Easing bis 1400 — man sieht das Strecken der Sterne, keinen Schnitt. */
export const UNIVERSE_HOP_DEPART_MS = 1400
/** Kürzer als die 5000 der ersten Fassung: das Tor liegt voraus, der Anflug ist ein Sturz darauf zu. */
export const UNIVERSE_HOP_APPROACH_MS = 4200
/** Der Durchflug: Wormhole-Röhre in Kurven, der Wash liegt an seinem AUSGANG. */
export const UNIVERSE_HOP_PASSAGE_MS = 8000
export const UNIVERSE_HOP_EMERGE_MS = 3000
/** DOM-Wash im Zielton an der Schwelle; der Reset liegt unter seinem Peak. */
export const UNIVERSE_HOP_WASH_MS = 420
export const UNIVERSE_HOP_WASH_PEAK = 0.35
export const UNIVERSE_HOP_WASH_ALPHA = 0.92
/** HUD kehrt gestaffelt zurück, gemessen ab Beginn des Ausrollens. */
export const UNIVERSE_HOP_HUD_IN_DELAY_MS = 1000
/** Überlicht: über der Spitze des Galaxien-Warps (WARP_SURGE_PEAK 138) — am Rand rund
 *  160 px je Frame, Striche um 350 px; die Strichbreite ist über WARP_STREAK_WIDTH_SPEED_CAP gedeckelt. */
export const UNIVERSE_HOP_SPEED_PEAK = 140
/** Kurs: volle 360° (das HUD ist im Flug weg, anders als beim Warp), Radius als Anteil der kurzen
 *  Kante — ein kleines Driftband: das Tor IST der Fluchtpunkt und liegt voraus, die Kamera hinter
 *  dem Spieler (16–34 % legten es neben ihn). Der Kurs KURVT: ein zweiter Azimut um BANK Grad
 *  versetzt, der Fokus driftet dorthin — die Kurve erzählen Roll des Feldes und Lehne des Spielers. */
export const UNIVERSE_HOP_COURSE_ARC_DEG = 360
export const UNIVERSE_HOP_FOCUS_FRAC_MIN = 0.03
export const UNIVERSE_HOP_FOCUS_FRAC_MAX = 0.08
export const UNIVERSE_HOP_COURSE_BANK_MIN_DEG = 25
export const UNIVERSE_HOP_COURSE_BANK_MAX_DEG = 70
/** Roll des Feldes am Kurvenscheitel (× Bank-Anteil des Wurfs); unter der Röhren-Bank 0,35. */
export const UNIVERSE_HOP_APPROACH_BANK_MAX_RAD = 0.3
/** Der Spieler steht zwischen Mitte und Tor: playerX = focusX · K — die Lehne der Verfolgerkamera. */
export const UNIVERSE_HOP_APPROACH_LEAN_K = 0.55
/** Spur im Anflug: tiefer als der Warp (0,30), flacher als die Röhre (0,22). */
export const UNIVERSE_HOP_APPROACH_TRAIL_FADE = 0.28
/** Sternen-Schub: nur im Sprung zusätzliche NAHE Sterne (schneller = näher), blenden im Ausrollen aus. */
export const UNIVERSE_HOP_STAR_SURGE_COUNT = 320
export const UNIVERSE_HOP_STAR_SURGE_SPEED_MULT = 1.6
/** Sogwellen: Ringe lösen sich vom Tor und rauschen auf die Kamera zu — Takt beschleunigt mit t. */
export const UNIVERSE_HOP_RIPPLE_COUNT = 5
export const UNIVERSE_HOP_RIPPLE_RATE_HZ = 0.9
export const UNIVERSE_HOP_RIPPLE_RATE_GAIN = 1.5
export const UNIVERSE_HOP_RIPPLE_GROWTH = 2.2
export const UNIVERSE_HOP_RIPPLE_POW = 2.4
export const UNIVERSE_HOP_RIPPLE_ALPHA = 0.35
/** Die Wirbelarme blenden aus, sobald der Ring die Bühne füllt (× kurze Kante) — bei 5× waren sie ein Schmier. */
export const UNIVERSE_HOP_SWIRL_FADE_FROM_FRAC = 0.6
export const UNIVERSE_HOP_SWIRL_FADE_TO_FRAC = 1.2
export const UNIVERSE_HOP_RIPPLE_W_FRAC = 0.012
/** Linse: Sterne im Band d < REACH·R weichen um R²·K/d nach aussen (Deckel 0,6 R); innen sieht man nur HINDURCH. */
export const UNIVERSE_HOP_LENS_K = 0.35
export const UNIVERSE_HOP_LENS_REACH = 2.2
export const UNIVERSE_HOP_LENS_MAX_FRAC = 0.6
/** Die Linse blendet aus, sobald der Ring die Bühne füllt (× kurze Kante) — sonst verschwände beim Passieren jeder Stern. */
export const UNIVERSE_HOP_LENS_FADE_FROM_FRAC = 0.4
export const UNIVERSE_HOP_LENS_FADE_TO_FRAC = 0.6
/** Lichtbogen auf dem Ring: läuft schneller als der Wirbel; ein zweiter gegenüber, sonst ist es eine Nadel. */
export const UNIVERSE_HOP_RIM_ARC_RAD = 1.1
export const UNIVERSE_HOP_RIM_ARC_ALPHA = 0.7
export const UNIVERSE_HOP_RIM_ARC_SPIN_MULT = 1.8
/** Ringradius zu Beginn des Anflugs (× kurze Kante) und beim Passieren (× Eckabstand). */
export const UNIVERSE_HOP_PORTAL_R0_FRAC = 0.05
export const UNIVERSE_HOP_PORTAL_PASS_K = 1.25
/** Wachstum des Rings über den Anflug: t^POW — sichtbar von Anfang an, nicht die echte Hyperbel (die hielt ihn 80 % der Zeit winzig). */
export const UNIVERSE_HOP_PORTAL_GROWTH_POW = 2.6
/** Der Wirbel dreht im Anflug schneller: SPIN · (1 + GAIN · t). */
export const UNIVERSE_HOP_PORTAL_SPIN_APPROACH_GAIN = 2
/** Rippen der Röhre: weltfeste Ringe alle RIB_SPACING R — sie rauschen auf die Kamera zu und um die Ecke. */
export const UNIVERSE_HOP_TUNNEL_RIB_SPACING = 3
export const UNIVERSE_HOP_TUNNEL_RING_ALPHA = 0.12
/** Deckkraft der Röhre (Stränge, Ringe, Körper) — im Durchflug konstant. */
export const UNIVERSE_HOP_WALL_ALPHA = 0.25
/** Im Tunnel längere Schweife (unter WARP_TRAIL_FADE). */
export const UNIVERSE_HOP_TUNNEL_TRAIL_FADE = 0.22
/** Die Bahn (Einheit = Röhrenradius R): Gerade am Einstieg, TURNS Viertelkreise (Radius TURN_RADIUS) um
 *  Hoch- oder Querachse mit Geraden dazwischen, am Ende die lange Gerade zum Ausgang — das Ende liegt
 *  physisch hinter der letzten Ecke. Eine 2D-Röhre zwischen zwei Bildpunkten war die Ursache der „komischen Kamera". */
export const UNIVERSE_HOP_TUNNEL_TURNS_MIN = 3
export const UNIVERSE_HOP_TUNNEL_TURNS_MAX = 4
export const UNIVERSE_HOP_TUNNEL_TURN_RADIUS = 3
export const UNIVERSE_HOP_TUNNEL_ENTRY_LEG = 4
export const UNIVERSE_HOP_TUNNEL_LEG_MIN = 5
export const UNIVERSE_HOP_TUNNEL_LEG_MAX = 8
export const UNIVERSE_HOP_TUNNEL_EXIT_LEG = 12
/** Verfolgerkamera AUF der Bahn: CAM_BACK hinter dem Spieler, Blick auf LOOK_AT vor der Kamera —
 *  LOOK_AT < CAM_BACK, damit sich der Spieler zur Kurveninnenseite lehnt (~5 % der Bildhöhe), nie nach aussen. */
export const UNIVERSE_HOP_CAM_BACK = 2.6
export const UNIVERSE_HOP_CAM_LOOK_AT = 2.3
/** Brennweite × kurze Kante: der Ring am Spieler misst FOCAL_K / CAM_BACK ≈ 0,33 der kurzen Kante. */
export const UNIVERSE_HOP_CAM_FOCAL_K = 0.85
/** Scheiben in exponentieller Tiefe von NEAR bis SIGHT vor der Kamera; hinter Z_NEAR wird nichts gezeichnet. */
export const UNIVERSE_HOP_TUNNEL_NEAR = 0.8
export const UNIVERSE_HOP_TUNNEL_SIGHT = 22
export const UNIVERSE_HOP_TUNNEL_Z_NEAR = 0.05
/** Ein schräg gesehener Ring ist eine Ellipse — nie flacher als SQUASH_MIN, sonst wird er ein Strich. */
export const UNIVERSE_HOP_TUNNEL_SQUASH_MIN = 0.25
/** Bank in Yaw-Ecken: Kamera rollt bis BANK_MAX rad, GAIN gegen den Querkurs des Spielers. */
export const UNIVERSE_HOP_TUNNEL_BANK_MAX_RAD = 0.35
export const UNIVERSE_HOP_TUNNEL_BANK_GAIN = 1.4
/** In der Passage tritt das Kehlenlicht zurück und die Sternstriche werden kürzer — sonst ertrinkt die Röhre. */
export const UNIVERSE_HOP_TUNNEL_MAW_DROP = 0.7
export const UNIVERSE_HOP_TUNNEL_STREAK_GAIN = 0.35
/** Deckkraft der Sterne in der Passage — die Röhre IST dort das Feld; bei 1 lagen weisse Balken über der Wand. */
export const UNIVERSE_HOP_TUNNEL_STAR_GAIN = 0.3
/** Der Warp-Scheinwerfer am Fluchtpunkt ist im Tunnel AUS (er las sich als Ende und als Rauch); er kehrt mit dem Reveal zurück. */
export const UNIVERSE_HOP_TUNNEL_HEADLIGHT_EXIT = 0.5
/** Scheiben je Frame — jede ein Wand-Sprite und ein Stützpunkt je Strand. */
export const UNIVERSE_HOP_TUNNEL_SLICES = 22
/** Lichtstränge: Anzahl, Verdrillung je rad Roll, zwei Pässe (Glow breit/matt, Kern dünn/hell), Fluss zur Kamera. */
export const UNIVERSE_HOP_TUNNEL_STRANDS = 40
export const UNIVERSE_HOP_STRAND_TWIST = 1.2
/** Eigene Spiralneigung je Strand (± rad zur Ferne hin) — sonst sind es Speichen, die Stränge sollen sich kreuzen. */
export const UNIVERSE_HOP_STRAND_SPIN_RAD = 0.15
export const UNIVERSE_HOP_STRAND_CORE_ALPHA = 0.9
export const UNIVERSE_HOP_STRAND_GLOW_ALPHA = 0.4
export const UNIVERSE_HOP_STRAND_DASH_PX = 260
export const UNIVERSE_HOP_STRAND_GAP_PX = 70
export const UNIVERSE_HOP_STRAND_FLOW_PX_S = 900
/** Strichbreiten in px (× Breitenfaktor je Strand) und die Dämpfung der nahen Hälfte. */
export const UNIVERSE_HOP_STRAND_CORE_W_FAR = 1.8
export const UNIVERSE_HOP_STRAND_CORE_W_NEAR = 3.2
export const UNIVERSE_HOP_STRAND_GLOW_W_FAR = 8
export const UNIVERSE_HOP_STRAND_GLOW_W_NEAR = 11
export const UNIVERSE_HOP_STRAND_NEAR_ALPHA_K = 0.6
/** Der dunkle Röhrenkörper: EIN fillRect je Frame, unter der Persistenz-Spur. */
export const UNIVERSE_HOP_TUNNEL_BODY_ALPHA = 0.5
/** Der Ausgang ist die Endscheibe der Bahn (Radius EXIT_R_K × R), perspektivisch wachsend, gedeckelt auf
 *  EXIT_R_MAX_FRAC × kurze Kante; darin das gebackene Zielfeld (Sneak Peek) mit PEEK_ALPHA. */
export const UNIVERSE_HOP_EXIT_R_K = 1
export const UNIVERSE_HOP_EXIT_R_MAX_FRAC = 0.45
export const UNIVERSE_HOP_EXIT_PEEK_ALPHA = 0.85
/** Saum des Ausgangs, von innen nach aussen: fast offen (das Zielfeld liegt darunter) → Ton → hell → weißer Kern am Rand. */
export const UNIVERSE_HOP_EXIT_INNER_ALPHA = 0.12
export const UNIVERSE_HOP_EXIT_MID_STOP = 0.55
export const UNIVERSE_HOP_EXIT_MID_ALPHA = 0.3
export const UNIVERSE_HOP_EXIT_BRIGHT_STOP = 0.85
export const UNIVERSE_HOP_EXIT_BRIGHT_ALPHA = 0.8
export const UNIVERSE_HOP_EXIT_CORE_ALPHA = 0.95
/** Weiter Hof um den Ausgang: eigener weicher Verlauf bei K × Radius, additiv. */
export const UNIVERSE_HOP_EXIT_HALO_K = 2.2
export const UNIVERSE_HOP_EXIT_HALO_ALPHA = 0.35
/** Die Wand als Fläche: EIN gebackener weicher Ring mit Lichtfasern, je Scheibe additiv gezeichnet — fern hell, nah dunkel (der Trichter). */
export const UNIVERSE_HOP_WALL_SPRITE_PX = 512
export const UNIVERSE_HOP_WALL_RING_WIDTH_FRAC = 0.5
export const UNIVERSE_HOP_WALL_FIBERS = 48
export const UNIVERSE_HOP_WALL_ALPHA_FAR = 0.6
export const UNIVERSE_HOP_WALL_ALPHA_NEAR = 0.3
/** Nebel: ab FOG_FROM der Tiefe fällt die Wand auf FOG_END — die Ferne ist ein Schlund, kein heller Ring. */
export const UNIVERSE_HOP_WALL_FOG_FROM = 0.55
export const UNIVERSE_HOP_WALL_FOG_END = 0.35
/** Wormhole-Palette aus dem Zielton: dunkel → Ton → hell → weißer Kern. */
export const WORMHOLE_DEEP_MIX = 0.55
export const WORMHOLE_BRIGHT_LIFT = 0.65
export const WORMHOLE_CORE_LIFT = 0.88
/** Beim Austritt stehen sofort Körper der neuen Welt da, statt leerem Raum. */
export const UNIVERSE_HOP_ARRIVAL_GALAXIES = 3
/** Gebackener Ringdurchmesser; Schlund-Span 1,6× bleibt unter UNIVERSE_MAP_PORTAL_MAX_BACKING_PX. */
export const UNIVERSE_HOP_PORTAL_SPRITE_PX = 512
export const UNIVERSE_HOP_PORTAL_SPIN_RAD_S = 0.9
export const UNIVERSE_HOP_MAW_ALPHA = 0.9
/** Das gebackene Feld blendet mit dem Passieren des Rings aus (× portalR/farCorner) — bei 5× wird es Konfetti. */
export const UNIVERSE_HOP_FIELD_PASS_FADE = 0.8
/** Kehlenlicht im Zielton hinter dem Schlund — das gebackene Feld allein ist bei 5× zu blass. */
export const UNIVERSE_HOP_THROAT_ALPHA_CORE = 0.42
export const UNIVERSE_HOP_THROAT_ALPHA_MID = 0.16
export const UNIVERSE_HOP_THROAT_MID_STOP = 0.55
/** Gate-Phase im Universe: Schleier zu, Profil schliesst darunter, Schleier hebt. */
export const UNIVERSE_HOP_GATE_MS = 260
export const UNIVERSE_HOP_GATE_LIFT_MS = 350
export const UNIVERSE_HOP_GATE_PORTAL_K = 1.8
/** HUD im Flug: alle Flächen auf 0 (OUT), Rückkehr gestaffelt (IN + n·STAGGER), Versatz nach aussen. */
export const UNIVERSE_HOP_HUD_OUT_MS = 140
export const UNIVERSE_HOP_HUD_IN_MS = 280
export const UNIVERSE_HOP_HUD_STAGGER_MS = 60
export const UNIVERSE_HOP_HUD_SHIFT_PX = 8
/**
 * Das Maß des SPIELERKÖRPERS im Flug — er schrumpft deutlich, damit die
 * Prozession vor ihm Platz hat und er nicht mehr der Mittelpunkt ist, um den
 * etwas kreist.
 *
 * Für Planeten und Champions steht hier bewusst NICHTS mehr: ihre Größe führt
 * die Perspektive der Prozession. Das frühere `orbitScale` dehnte die Bahn als
 * schwache Andeutung der Reise — eine zweite, widersprüchliche Bewegung, seit
 * die Körper die Bahn wirklich verlassen. Und ein `bodyScale` an ihnen stünde
 * in `baseSize`, also im `structureKey`: der Flugbeginn hätte jedes Mal einen
 * vollen Vue-Render über alle Körper ausgelöst.
 */
export const FLIGHT_FORMATION = {
  idle: { bodyScale: 1 },
  galaxy: { bodyScale: 0.62 },
  universe: { bodyScale: 0.4 },
} as const

/* ── Die Prozession — die Bühne reist mit ──────────────────────────────────
   Im Flug verlassen Planeten und Champions ihre Bahnen und ordnen sich
   perspektivisch entlang der Flugachse: wer voraus fliegt, steht klein nahe am
   Fluchtpunkt, wer zurückfällt, groß am Rand. Geometrie in
   `utils/orbit/flightProcession.ts`.

   Die zwei BÄNDER sind keine Kosmetik, sondern die Ebenen-Wand: `.planet-orbit-
   front` (z 7) liegt über `.champion-orbit-front` (z 6), und beide sind eigene
   Stapelkontexte. Ein gemischter Zug wäre per z-index am Körper nicht
   sortierbar — also gehören die Planeten ins NAHE Band und die Champions ins
   ferne. Perspektivisch stimmt genau das: näher heißt weiter vorn. */
/** Die gemeinsame Tiefenleiter: 1 = auf der Kamera, FAR = am Fluchtpunkt. */
export const PROCESSION_DEPTH_NEAR = 1
export const PROCESSION_DEPTH_FAR = 4.2
/** Die zwei Bänder als Anteil der Leiter — sie überlappen NIE (siehe oben). */
export const PROCESSION_BAND_PLANET: readonly [number, number] = [0, 0.45]
export const PROCESSION_BAND_CHAMPION: readonly [number, number] = [0.55, 1]
/** Abstand von der Flugachse als Anteil der kurzen Kante, VOR der Teilung durch die Tiefe. */
export const PROCESSION_SPREAD_MIN = 0.2
export const PROCESSION_SPREAD_MAX = 0.46
/** Netz gegen das Wogen: kein Körper weiter als das vom Fluchtpunkt. */
export const PROCESSION_REACH_MAX_FRAC = 0.36
/** Der Fluchtpunkt liegt regelmäßig IM Spielerkörper (Kurs 10–18 % der kurzen
 *  Kante) — ohne diesen Boden steckte der Vorderste in der Korona. Gemessen
 *  gegen die BILDMITTE, dort steht die Sonne, und gegen ihre GEZEICHNETE
 *  Scheibe (`SUN_BG_DISC_RADIUS_FACTOR` 4× der Kernradius), nicht gegen den
 *  Kern: beim Schwarzen Loch reicht die Akkretionsscheibe weit darüber hinaus. */
export const PROCESSION_SUN_CLEAR_K = 1.12
/** Perspektivskala k/Tiefe, geklemmt: sonst verschwindet der Vorderste oder der Letzte sprengt das Bild. */
export const PROCESSION_SCALE_K = 1.3
export const PROCESSION_SCALE_MIN = 0.38
export const PROCESSION_SCALE_MAX = 1.45
/** Das Wogen. Im Reiseflug steht die Achse STILL (`focusX` ist dort konstant) —
 *  ohne diesen Term stünde der ganze Zug acht Sekunden bewegungslos. Die Periode
 *  ist je Körper gestreut, sonst atmen alle im Takt. */
export const PROCESSION_SWELL_AMP = 0.09
export const PROCESSION_SWELL_PHI = 0.05
export const PROCESSION_SWELL_SEC_MIN = 3.4
export const PROCESSION_SWELL_SEC_MAX = 6.1
/** Zwei Schwellen, nicht eine: an EINER zitterte der Ebenenwechsel auf der
 *  easeInOutCubic-Flanke und riss pro Frame einen Vue-Render auf. */
export const PROCESSION_ENTER_T = 0.03
export const PROCESSION_EXIT_T = 0.01
/** Basis des z-index INNERHALB der jeweiligen Ebene — konstant je Körper und Flug. */
export const PROCESSION_Z_BASE = 12

/* ── Schweife ──────────────────────────────────────────────────────────────
   Sie fahren auf dem STERNFELD-Canvas, mit demselben `drawStreakSprite`, das
   auch die Sternstriche zeichnet: keine zwölf neuen Compositor-Ebenen, dieselbe
   Bildsprache, und die Persistenz-Spur verlängert sie gratis. */
/** Länge als Vielfaches des dargestellten Halbmessers, über den Abstand vom Fluchtpunkt. */
export const PROCESSION_TRAIL_LEN_K_MIN = 3.2
export const PROCESSION_TRAIL_LEN_K_MAX = 9
/** Bezugsweite der Länge (Anteil der kurzen Kante) — darüber wächst der Schweif nicht weiter. */
export const PROCESSION_TRAIL_REACH_REF = 0.34
/** Breite als Vielfaches des Halbmessers. Schmal: bei 0,9 las sich der Schweif
 *  als massiver Keil neben dem Körper, nicht als Nachlauf hinter ihm. */
export const PROCESSION_TRAIL_WIDTH_K = 0.4
export const PROCESSION_TRAIL_ALPHA = 0.5
/** Der Spielerkörper zieht den längsten, aber leisesten — er füllt sonst das halbe Bild. */
export const PROCESSION_SUN_TRAIL_LEN_K = 1.1
export const PROCESSION_SUN_TRAIL_ALPHA = 0.3
/** Der Leuchtton einer Galaxie (`utils/fx/galaxyTint.ts`): der dunkle Akzent auf
 *  diesen Spitzenwert normiert und um diesen Anteil nach Weiss gehoben. */
export const GALAXY_GLOW_PEAK = 225
export const GALAXY_GLOW_WHITE_LIFT = 0.22
/**
 * Wie weit der Universumston die Galaxiefarbe zu sich zieht.
 *
 * Gezogen werden FARBTON und Saettigung, die Luminanz jedes Farbwerts bleibt —
 * dieselbe Lehre wie die Penumbra-Tinte (`UNIVERSE_MAP_PENUMBRA_INK_LUMA`): der Ton
 * sagt WELCHES Universum, die Helligkeit bleibt. Voll gemischt hellte der
 * Vollbild-Schleier auf, und der Raum verloere seine Schwaerze.
 *
 * 0,42 ist die Wand: `pickThemeIndex` garantiert zwischen aufeinanderfolgenden
 * Galaxien `MIN_THEME_HUE_DISTANCE` (60 Grad). Der Zug komprimiert Abstaende auf
 * 58 %, aus 60 werden 34,8 — sichtbar verschieden, aber erkennbar verwandt.
 * Hoeher kippen die Galaxien eines Universums zu Varianten EINES Tons.
 */
export const UNIVERSE_TINT_HUE_PULL = 0.42
export const UNIVERSE_TINT_SAT_PULL = 0.3
/** Bisektionsschritte, mit denen die Toenung ihre Luminanz zurueckholt. */
export const UNIVERSE_TINT_LUMA_STEPS = 24
/** Das Universum, das seine Galaxien NICHT toent — der Referenzzustand. */
export const UNIVERSE_TINT_NEUTRAL_ID = 1
/** Ton des Schweifs, wenn ein Körper keine Rollenfarbe trägt (Ally ohne Rolle). */
export const PROCESSION_TRAIL_FALLBACK_COLOR = '#8fa6c8'
/**
 * Abstand zwischen dem Reset (commit-Flanke an der Schwelle) und der
 * Ankunfts-Zeremonie des Herolds. Der Herold (9700) liegt ÜBER dem Sternfeld
 * und wartet nicht auf ein deckendes Overlay, sondern auf das Beruhigen des
 * Ausrollens: nach der letzten HUD-Staffel, rund 1,2 s vor dem Stillstand.
 */
export const HYPERSPACE_ARRIVAL_HERALD_DELAY_MS = 2200

/** Streuung der Chime-Funken um ihren Sollwinkel, als Anteil des Winkelschritts. */
export const CHIME_BURST_ANGLE_JITTER = 0.6
/** Untergrenze der Chime-Popup-Schrift, damit sie bei kleiner Sonne lesbar bleibt. */
export const CHIME_POPUP_FONT_MIN_PX = 22
export const CHIME_POPUP_FONT_SUN_FACTOR = 0.5

export const STAR_COUNT = 400
/** Floor for the area-scaled star count so a small contained instance (Shop) is never empty. */
export const STAR_BG_MIN_STARS = 60
/** Staubflecken und Emissionsnebel im Hintergrund. */
export const DUST_PATCH_COUNT = 7
export const EMISSION_MAX_COUNT = 4
export const EMISSION_SPAWN_MIN = 8_000
export const EMISSION_SPAWN_MAX = 18_000
/** Gesamtwinkel des Kameraschwenks nach der Rollenwahl (Dauer: RESCUE_ROTATION_DURATION_MS). */
export const RESCUE_ROTATION_TOTAL_RAD = Math.PI * 1.5

/**
 * Radiale Staffelung der Flug-Linien um die Sonne: jede Linie bekommt über den
 * Index eine eigene Reichweite, damit kein gleichmäßiger Kranz entsteht.
 */

// Background canvas star speeds
export const STAR_BG_BASE_SPEED_MIN = 1.0 // base speed minimum (doubled from 0.5)
export const STAR_BG_BASE_SPEED_RANGE = 2.0 // base speed random range (doubled from 1.0)
// ── Sternenhaufen im Hintergrund (starBackground/starClusters.ts) ─────────────
// Der Himmel wechselt zwischen Haufen, lockeren Gruppen und echter Leere.
//
// Die Mitgliederzahl ist HERGELEITET, nicht gewählt. Das freie Feld streut
// STAR_COUNT gleichverteilt über Winkel und Distanz; im Ring n ist seine
// Flächendichte rho(n) = STAR_COUNT / (0.85 * 2*PI * n * maxDist^2). Ein Haufen
// mit Winkelmaß h deckt bei n die Fläche PI * (n*maxDist*h)^2, also gilt für
// den Dichtefaktor F am Referenzring n = 0.6 (Full HD, maxDist ~ 1120):
//   m = F * 141 * h^2
// Der Faktor ist NICHT konstant über den Anflug: bei festem Winkelmaß gilt
// F ~ 1/dist^2, ein Haufen durchläuft also ~16x beim Spawn, ~4x in der Mitte,
// ~1.5x im Durchflug. Das ist der Auflösungsbogen eines echten Haufens — von
// fern ein Knoten, nahe einzelne Sterne — und der Grund, warum die Dichte nur
// am Referenzring geprüft werden kann.
export const CLUSTER_MAX_MAJOR = 1
export const CLUSTER_MAX_MINOR = 2
/** Wächter: Summe der Archetyp-Maxima. Früher standen 150–260 Punkte DAUERHAFT. */
export const CLUSTER_POINT_BUDGET = 96
export const CLUSTER_REFERENCE_NORM = 0.6
export const CLUSTER_GAP_SEC: readonly [number, number] = [20, 45]
/** Zweiter Gipfel: ohne ihn entsteht nie eine gefühlte Leere. */
export const CLUSTER_VOID_GAP_SEC: readonly [number, number] = [70, 150]
export const CLUSTER_VOID_CHANCE = 0.3
export const CLUSTER_MAJOR_COOLDOWN_SEC = 70
export const CLUSTER_FIRST_DELAY_SEC: readonly [number, number] = [8, 18]
// Der Gap zählt STRECKE, nicht Zeit: im Kometenzustand erreicht der Faktor ~8,9,
// und ein Sekunden-Gap leerte den Himmel genau dann, wenn man am schnellsten
// fliegt. Der Deckel hält den Warp-Faktor (138) draußen.
export const CLUSTER_GAP_SPEED_CAP = 4
export const CLUSTER_FADE_IN_SEC = 2.5
export const CLUSTER_TWINKLE_RATE = 0.5
/** Goldener Winkel: eigenes Funkeln je Mitglied ohne ein Feld je Mitglied. */
export const CLUSTER_TWINKLE_STAGGER = 2.39996
export const CLUSTER_EDGE_FADE_NORM = 0.88
/** Haufensterne bleiben Hintergrund: etwas kleiner und leiser als das freie Feld. */
export const CLUSTER_SIZE_K = 0.85
export const CLUSTER_ALPHA_K = 0.9
/** Nur die hellsten tragen Kern + Halo — 50 überlappende Halos wären ein Schmier. */
export const CLUSTER_HALO_MIN_BRIGHT = 0.75
/** Die frozen-Instanz (Shop) hat keine Regie und bekommt einen festen Bestand. */
export const CLUSTER_FROZEN_SEED_COUNT = 4
export const CLUSTER_SEED_NORM: readonly [number, number] = [0.25, 0.85]

export const CLUSTER_KIND_WEIGHTS: Readonly<
  Record<'dense' | 'loose' | 'spray' | 'knot' | 'pair', number>
> = { dense: 0.18, loose: 0.26, spray: 0.12, knot: 0.28, pair: 0.16 }

export const CLUSTER_MAJOR_KINDS: readonly (keyof typeof CLUSTER_KIND_WEIGHTS)[] = [
  'dense',
  'loose',
  'spray',
]

/**
 * Bauplan je Archetyp. `spanA` ist das tangentiale, `spanQ` das radiale
 * Winkelmaß — bei runden Haufen gleich, bei `spray` gestreckt. `core` ist der
 * Exponent der Radialverteilung: 0.5 streut flächengleich, größere Werte ziehen
 * die Punkte in den Kern. `spawn` ist der Ring, in dem er auftaucht — unter
 * 0.25 kriecht mit der norm²-Perspektive alles minutenlang.
 */
export const CLUSTER_SHAPES: Readonly<
  Record<
    keyof typeof CLUSTER_KIND_WEIGHTS,
    {
      count: readonly [number, number]
      spanA: number
      spanQ: number
      core: number
      speed: readonly [number, number]
      spawn: readonly [number, number]
      bright: readonly [number, number]
    }
  >
> = {
  dense: {
    count: [40, 56],
    spanA: 0.3,
    spanQ: 0.3,
    core: 1.3,
    speed: [0.55, 0.7],
    spawn: [0.28, 0.36],
    bright: [0.3, 0.55],
  },
  loose: {
    count: [46, 62],
    spanA: 0.42,
    spanQ: 0.42,
    core: 0.5,
    speed: [0.8, 0.95],
    spawn: [0.32, 0.4],
    bright: [0.35, 0.55],
  },
  spray: {
    count: [20, 30],
    spanA: 0.55,
    spanQ: 0.1,
    core: 0.6,
    speed: [0.7, 0.85],
    spawn: [0.28, 0.36],
    bright: [0.3, 0.55],
  },
  knot: {
    count: [8, 13],
    spanA: 0.1,
    spanQ: 0.1,
    core: 1,
    speed: [1.35, 1.65],
    spawn: [0.33, 0.42],
    bright: [0.4, 0.5],
  },
  pair: {
    count: [2, 4],
    spanA: 0.035,
    spanQ: 0.035,
    core: 0.5,
    speed: [1.2, 1.45],
    spawn: [0.35, 0.45],
    bright: [0.8, 0.2],
  },
}

/**
 * Spektralpalette des Sternfelds — fünf Klassen mit je zwei Tönen, zugleich der
 * Schlüsselraum des Sprite-Caches (starSprites.ts), der NIE geleert wird. Eine
 * elfte Farbe wäre eine weitere Offscreen-Fläche je Tiefenstufe; die Vielfalt
 * würfelt deshalb an den GEWICHTEN, nie an den Tönen.
 * Reihenfolge: rot · orange · gelb · weiß · blau-weiß.
 */
export const SPECTRAL_STAR_PALETTE: readonly (readonly Rgb[])[] = [
  [
    [255, 96, 48],
    [255, 69, 0],
  ],
  [
    [255, 179, 71],
    [255, 160, 64],
  ],
  [
    [255, 244, 163],
    [255, 233, 122],
  ],
  [
    [245, 245, 255],
    [255, 255, 255],
  ],
  [
    [176, 200, 255],
    [202, 216, 255],
  ],
]

/**
 * Feldsterne: 15 % farbig, der Rest weiß. Weiß ist die Basis, nicht Blau-Weiß —
 * STAR_BG_FOG_TIERS mischt die ferne Stufe nach STAR_BG_FOG_RGB (blau) und die
 * nahe nach STAR_BG_WARM_RGB; auf blau-weißer Basis war der blaue Mix ein
 * No-op und der warme kämpfte gegen die Basis. Rot ist der seltenste Ton, weil
 * er der lauteste ist.
 */
export const STAR_BG_COLOR_WEIGHTS: readonly number[] = [0.005, 0.025, 0.05, 0.85, 0.07]

/** Alte Haufen warm, junge blau, der Rest wie das Feld. */
export const CLUSTER_COLOR_WEIGHTS: Readonly<
  Record<keyof typeof CLUSTER_KIND_WEIGHTS, readonly number[]>
> = {
  dense: [0.01, 0.05, 0.1, 0.82, 0.02],
  loose: [0, 0.01, 0.03, 0.84, 0.12],
  spray: STAR_BG_COLOR_WEIGHTS,
  knot: [0.005, 0.035, 0.07, 0.84, 0.05],
  pair: STAR_BG_COLOR_WEIGHTS,
}

// Vorgerenderte Stern-Sprites (starBackground/starSprites.ts). Sterne werden per
// drawImage geblittet statt pro Frame als Pfad gefüllt — die Palette hat nur
// 10 Farben, also reichen 10 kleine Offscreen-Canvases.
export const STAR_SPRITE_CORE_R = 8 // Kernradius im Sprite; Zielgröße kommt von drawImage
export const STAR_SPRITE_HALO_SCALE = 2 // Halo-Radius = Kernradius × 2 (wie die alten Fills)
export const STAR_SPRITE_HALO_ALPHA = 0.12 // Halo-Alpha relativ zum Kern (wie die alten Fills)
export const STAR_SPRITE_SUPERSAMPLE = 2 // Sprite in 2× rendern, immer verkleinert zeichnen

// ── Chime-Partikel um die Sonne (SunComponent) ────────────────────────────
// Aufsteigende Chimes, deren Dichte an der Produktion hängt: viel CpS = viele
// Symbole. Die Wurzel dämpft das, sonst wäre der Bildschirm ab dem mittleren
// Spiel dauerhaft zugedeckt.
export const CHIME_PARTICLE_POOL_SIZE = 20
export const CHIME_PARTICLE_MIN_VISIBLE = 2
export const CHIME_PARTICLE_CPS_SCALE = 1.8
/** Spawn-Takt: dieses Fenster wird auf die sichtbaren Partikel aufgeteilt. */
export const CHIME_PARTICLE_SPAWN_WINDOW_MS = 1200
/** Zufällige Streckung des Takts, damit kein Metronom entsteht. */
export const CHIME_PARTICLE_INTERVAL_JITTER_MIN = 0.7
export const CHIME_PARTICLE_INTERVAL_JITTER_RANGE = 0.6
/** Wartezeit bei vollem Feld, als Anteil des normalen Takts. */
export const CHIME_PARTICLE_FULL_RETRY_FRACTION = 0.5
/** Flugstrecke nach außen, als Vielfaches des Sonnenradius. */
export const CHIME_PARTICLE_TRAVEL_MIN_FACTOR = 0.5
export const CHIME_PARTICLE_TRAVEL_RANGE_FACTOR = 0.5
/** Winkelabweichung von der Radialen (rad). */
export const CHIME_PARTICLE_ANGLE_JITTER = 0.6
/** Lebensdauer eines Partikels. */
export const CHIME_PARTICLE_LIFETIME_MIN_MS = 1000
export const CHIME_PARTICLE_LIFETIME_RANGE_MS = 1500
export const CHIME_PARTICLE_DEFAULT_LIFETIME_MS = 1500
/** Größe: folgt dem Sonnenradius, bleibt aber lesbar. */
export const CHIME_PARTICLE_SIZE_SUN_FACTOR = 0.35
export const CHIME_PARTICLE_SIZE_MIN_PX = 14
export const CHIME_PARTICLE_SIZE_DEFAULT_PX = 12
/** Ein- und Ausblenden über die Lebensdauer, plus Deckkraft dazwischen. */
export const CHIME_PARTICLE_FADE_IN_FRACTION = 0.15
export const CHIME_PARTICLE_FADE_OUT_START = 0.8
export const CHIME_PARTICLE_MAX_OPACITY = 0.9
/** Wachstum des Symbols über den Flug. */
export const CHIME_PARTICLE_DRAW_SCALE_BASE = 0.6
export const CHIME_PARTICLE_DRAW_SCALE_SPAN = 0.3
/** Kantenlänge des Partikel-Canvas als Vielfaches des Sonnenradius. */
export const CHIME_PARTICLE_CANVAS_SUN_FACTOR = 6

/** Winkel-Schrittweite, mit der die Bahntangente eines Sterns abgetastet wird. */
export const STAR_FX_TANGENT_PROBE_RAD = 0.05

// ── Star despawn FX (utils/fx/starVanishFx.ts) ──────────────────────────────────
// Ein einziges additiv gezeichnetes Canvas für ALLE Sternabgänge. Gezeichnet
// wird ausschliesslich ein pro Farbe gecachtes Glow-Sprite (drawImage) plus
// wenige arc()-Strokes — deshalb bleiben auch 30 gleichzeitige Effekte im
// Frame-Budget. Der RAF-Loop läuft nur, solange Effekte leben.
export const STAR_FX_Z_INDEX = 50
export const STAR_FX_DPR_MAX = 2
/** Ab so vielen gleichzeitigen Effekten wird die Partikeldichte gesenkt (LOD). */
export const STAR_FX_LOD_THRESHOLD = 8
/** Untergrenze der Partikeldichte bei sehr vielen gleichzeitigen Effekten. */
export const STAR_FX_LOD_MIN_DENSITY = 0.3
/** Hard-Cap gleichzeitiger Effekte — ältester Effekt weicht dem neuen. */
export const STAR_FX_MAX_CONCURRENT = 40
/** Kantenlänge des gecachten Glow-Sprites in px. */
export const STAR_FX_SPRITE_SIZE = 96
/**
 * Untergrenze der Effektgröße (px). Die Sternkugel schrumpft mit kleiner Sonne
 * bis unter 25 px — ein Abgang in dieser Größe geht im Sternenfeld unter, ohne
 * dass der Spieler erkennt, welcher der beiden Fälle eingetreten ist.
 */
export const STAR_FX_MIN_SIZE = 64
/** Zusätzlicher weicher Bloom über dem Kern: Größenfaktor und Deckkraftanteil. */
export const STAR_FX_BLOOM_SCALE = 2.2
export const STAR_FX_BLOOM_ALPHA = 0.4
/** Ringstärke als Anteil der Effektgröße. */
export const STAR_FX_RING_WIDTH_FRACTION = 0.055
/** Maximal gecachte Glow-Sprites (eines pro Sternfarbe). */
export const STAR_FX_SPRITE_CACHE_MAX = 24
/** Ersatzdauer bei `prefers-reduced-motion`: nur ein kurzer Ausblendpuls. */
export const STAR_FX_REDUCED_MOTION_MS = 320

// Rescue — „Nova Bloom": Stern implodiert zu einem Blitz, sein Licht strömt
// als Funkenschweif in die eigene Sonne und lässt sie kurz aufglühen.
export const STAR_RESCUE_FX_DURATION_MS = 1500
export const STAR_RESCUE_FX_FLASH_FRACTION = 0.24 // Anteil der Dauer für Implosion + Blitz
export const STAR_RESCUE_FX_IMPLODE_SCALE = 0.42
export const STAR_RESCUE_FX_FLASH_SCALE = 3.1
export const STAR_RESCUE_FX_RING_COUNT = 2
export const STAR_RESCUE_FX_RING_STAGGER = 0.09 // Anteil der Dauer zwischen den Ringen
export const STAR_RESCUE_FX_RING_LIFE = 0.55 // Anteil der Dauer, den ein Ring lebt
export const STAR_RESCUE_FX_RING_MAX_SCALE = 6.5
export const STAR_RESCUE_FX_MOTE_COUNT = 16
export const STAR_RESCUE_FX_MOTE_DELAY_MS = 130
export const STAR_RESCUE_FX_MOTE_STAGGER_MS = 300
export const STAR_RESCUE_FX_MOTE_TRAVEL_MS = 950
export const STAR_RESCUE_FX_MOTE_SWING = 0.34 // seitlicher Schwung der Flugbahn
export const STAR_RESCUE_FX_MOTE_BLOOM = 0.5 // Ausbeulung nach aussen vor dem Einflug
export const STAR_RESCUE_FX_MOTE_EASE = 1.6 // >1 = zuerst treiben, dann beschleunigen
export const STAR_RESCUE_FX_MOTE_STRETCH = 2.6 // Streckung des Funkens bei Vollgas
export const STAR_RESCUE_FX_MOTE_SIZE = 0.3 // Funkengröße als Anteil der Effektgröße
export const STAR_RESCUE_FX_SUN_GLOW_SCALE = 3.4
/** Warmer Ton, in den die Sternfarbe bei der Rettung gemischt wird. */
export const STAR_RESCUE_FX_WARM_TINT: [number, number, number] = [255, 216, 128]
export const STAR_RESCUE_FX_WARM_MIX = 0.55

// Expire — „Warp-out": der Stern lädt kurz auf und reisst aus der Bahn aus.
export const STAR_EXPIRE_FX_DURATION_MS = 1250
export const STAR_EXPIRE_FX_CHARGE_MS = 300
export const STAR_EXPIRE_FX_SHIVER_PX = 1.6
// Beschleunigung des Ausbruchs. Deutlich >2 wirkt nicht schneller, sondern
// lässt den Stern erst regungslos stehen und dann in wenigen Frames aus dem
// Bild springen — die Bewegung ist dann nicht mehr lesbar.
export const STAR_EXPIRE_FX_LAUNCH_EASE = 1.8
export const STAR_EXPIRE_FX_TRAVEL_FACTOR = 0.85 // Anteil der Bildschirmdiagonale
export const STAR_EXPIRE_FX_STRETCH_MAX = 8
export const STAR_EXPIRE_FX_GHOST_COUNT = 6
export const STAR_EXPIRE_FX_GHOST_SPACING = 0.035 // Zeitabstand der Nachzieher
export const STAR_EXPIRE_FX_TANGENT_MIX = 0.55 // Tangente vs. radial nach aussen
export const STAR_EXPIRE_FX_DUST_COUNT = 12
export const STAR_EXPIRE_FX_DUST_SPEED = 42 // px/s
export const STAR_EXPIRE_FX_DUST_LIFE = 0.8 // Anteil der Dauer
/** Kalter Ton, in den die Sternfarbe beim Ausbruch gemischt wird. */
export const STAR_EXPIRE_FX_COOL_TINT: [number, number, number] = [138, 170, 226]
export const STAR_EXPIRE_FX_COOL_MIX = 0.55

/** Damage float number visibility duration (ms) */
export const DAMAGE_FLOAT_DURATION_MS = 1400

// Projectile system
/** Total travel duration of a projectile shot (ms) */
export const PROJECTILE_SHOT_DURATION_MS = 520

// ── Supernova — the one-shot collapse of Pyre into the black hole ───────────
/** Total length of the transition overlay. Long enough to read as an event,
 *  short enough that nobody waits for it twice. */
export const SUPERNOVA_DURATION_MS = 3400
/** Blinding white flash at the very start, as a fraction of the total. */
export const SUPERNOVA_FLASH_FRACTION = 0.13
/** Expanding shock rings and the ejected shell. */
export const SUPERNOVA_RING_COUNT = 3
export const SUPERNOVA_SHARD_COUNT = 88
/** After the ejecta, everything falls back in — this fraction of the timeline is
 *  the implosion that hands over to the black hole. */
export const SUPERNOVA_COLLAPSE_START = 0.6
/** Ejecta palette: hot core → shocked shell → the ember of the Collapse phase. */
export const SUPERNOVA_CORE_COLOR = '#ffffff'
export const SUPERNOVA_SHELL_COLOR = '#8fd8ff'
export const SUPERNOVA_EJECTA_COLOR = '#ffb464'

// ── Flight Wake ───────────────────────────────────────────────────────────────
/** Camera perspective: the viewer sits BEHIND the player's celestial body,
 *  which flies straight INTO the screen (the background stars spawn at center
 *  and stream radially outward past the viewer). Shed material therefore comes
 *  AT the camera — on the 2D screen it reads as motes/streaks expanding
 *  radially outward, growing and fading, using the same motion language as
 *  the starfield. Active in EVERY phase (comet and all sun phases), tinted in
 *  the current phase color: the player is always in flight. Der Kranz am
 *  Körper ist eine Sprite-Ebene (SUN_WAKE_* in sunSprite.ts). */
/** Radial phase-tinted streaks on the background canvas — they ride the same
 *  center-outward flow as the stars, reinforcing the parallax. */
export const FLIGHT_STREAK_COUNT = 12
/** Streaks run this much faster than regular background stars. */
export const FLIGHT_STREAK_SPEED_MULT = 1.4
/** Streak line length relative to travel per exposure. */
export const FLIGHT_STREAK_LEN_FACTOR = 2.6
/** Belichtungszeit: die Streifenlänge ist Geschwindigkeit × DIESE Spanne, nicht
 *  × Frame-Delta — sonst hängt die sichtbare Länge an der Framerate. */
export const FLIGHT_EXPOSURE_SEC = 1 / 60
/** Sternstriche im Warp, als Vielfaches des Weges je Belichtung. */
export const WARP_STREAK_LEN_FACTOR = 4.4

// ── Galaxien-Warp: Überlichtflug zur nächsten Galaxie ─────────────────────
// (utils/orbit/galaxyWarp.ts + useStarBackground.ts). Der Flug ist ein
// Perspektiv-Tunnel: der Fluchtpunkt wandert zum Kursziel, die Sterne fließen
// radial von dort weg. Kein zweites Canvas — dieselbe Schleife, dieselben Sprites.
/** Höchsttempo als Vielfaches der Ruhe-Strömung (Ende der Anlaufkurve). */
export const WARP_SPEED_PEAK = 120
/**
 * Das Crescendo. Ab diesem Anteil der Reiseflugphase ziehen Schub UND
 * Farbüberblendung gemeinsam an und erreichen ihren Gipfel exakt am Schnitt —
 * eine Bewegung auf einen Moment zu, nicht zwei Effekte nebeneinander. Als
 * ANTEIL, nicht in ms: die Flugzeit ist schon einmal gekürzt worden, und die
 * Dramaturgie soll das überleben.
 */
export const WARP_SURGE_FROM = 0.45
/**
 * Tempo am Schnitt. Bewusst UNTER `UNIVERSE_HOP_SPEED_PEAK` (140): der Sprung
 * durch ein Universum bleibt der schnellste Flug des Spiels — bei 165 wäre der
 * Weg zur Nachbargalaxie schneller gewesen als der durch ein ganzes Universum.
 *
 * Der Zuwachs wirkt als ÄNDERUNG, nicht absolut: bei 120 ist am Bildrand ohnehin
 * nichts mehr aufzulösen. Soll das Crescendo lauter werden, dreht man an dem,
 * was man wirklich sieht — der Tönung und dem Headlight, nicht an dieser Zahl.
 */
export const WARP_SURGE_PEAK = 138
/** Die gesamte HUD-Fläche blendet zu Beginn heraus und nach der Ankunft zurück ein. */
export const GALAXY_WARP_HUD_OUT_MS = 180
export const GALAXY_WARP_HUD_IN_MS = 360
/** Atmen des Reiseflugs: ±Anteil um das Höchsttempo, zwei Perioden. */
export const WARP_CRUISE_SHIMMER = 0.05
export const WARP_CRUISE_SHIMMER_PERIOD_A_SEC = 0.9
export const WARP_CRUISE_SHIMMER_PERIOD_B_SEC = 1.7
/** Kursziel: Versatz des Fluchtpunkts als Anteil der kurzen Kante. */
export const WARP_FOCUS_FRAC_MIN = 0.1
export const WARP_FOCUS_FRAC_MAX = 0.26
/** Bogen um „oben", aus dem der Kurs gezogen wird — nie in die Bottom-Bar. */
export const WARP_COURSE_ARC_DEG = 240
/** Persistenz-Blur: Anteil des Vorbilds, der je Frame gelöscht wird (1 = kein Blur); bleibt über dem Hop-Anflug (0,28). */
export const WARP_TRAIL_FADE = 0.3
// ── Der Aufbruch: Boost um den Spieler beim Klick, dann Überlicht ──────────
/** Der Atemzug: die Sterne treiben auf den Spieler ZU, bevor der Schlag sie hinauswirft. */
export const WARP_INHALE_SPEED = -6
/** Tempo am Ende des Aufbruchs (easeOut vom Atemzug) — der Punch vor dem Anlauf. */
export const WARP_LAUNCH_SPEED = 40
/** Schockringe vom Spielerkörper: additiv mit ROHEM Alpha (wandernd, kein Stationärwert), gestaffelt, Radius als Anteil der kurzen Kante. */
export const WARP_LAUNCH_RING_COUNT = 5
export const WARP_LAUNCH_RING_MS = 1000
export const WARP_LAUNCH_RING_STAGGER = 0.12
export const WARP_LAUNCH_RING_R0_FRAC = 0.05
export const WARP_LAUNCH_RING_R1_FRAC = 0.9
export const WARP_LAUNCH_RING_ALPHA = 0.6
export const WARP_LAUNCH_RING_W_FRAC = 0.03
/** Die Ringe heben ihren Galaxieton Richtung Weiss — sonst gehen sie zwischen den Bahnringen unter. */
export const WARP_LAUNCH_RING_WHITE_LIFT = 0.5
/** Die Bugwelle am Ende des Anlaufs: EIN Ring vom Fluchtpunkt, Headlight-Glocke — der Überlicht-Boost. */
export const WARP_BOW_WAVE_MS = 600
export const WARP_BOW_WAVE_REACH_K = 0.5
export const WARP_BOW_WAVE_ALPHA = 0.45
export const WARP_BOW_WAVE_W_FRAC = 0.02
export const WARP_BOW_WAVE_HEADLIGHT_GAIN = 0.5
/** Sternen-Schub des Warps: so viele wie der Sprung, schneller — sie tragen den Rand. */
export const WARP_STAR_SURGE_COUNT = 320
export const WARP_STAR_SURGE_SPEED_MULT = 2.2
/** Schub-Sterne respawnen im Flug im MITTELRING (Anteil maxDist), nicht am Fokus — sonst ist der Rand leer. */
export const WARP_SURGE_RESPAWN_FRAC: readonly [number, number] = [0.35, 0.75]
/** Feldstern-Deckkraft im Flug (× distAlpha). */
export const WARP_STAR_ALPHA_GAIN = 1.8
// ── Der Kurs: Wegpunkte A→B→C, die Kurve erzählen Roll und Lehne ───────────
/** Etappen im Reiseflug; Wegpunkte = LEGS + 1. */
export const WARP_COURSE_LEGS = 3
/** Etappenlängen aus dem Wurf, normiert auf die Reiseflugstrecke — kurz und scharf, lang und weit. */
export const WARP_LEG_WEIGHT_MIN = 0.7
export const WARP_LEG_WEIGHT_MAX = 1.3
/** Azimut-Sprung je Wegpunkt; MAX ≤ ARC/2, damit immer eine Richtung im Bogen bleibt. */
export const WARP_COURSE_TURN_MIN_DEG = 50
export const WARP_COURSE_TURN_MAX_DEG = 110
/** Roll des Feldes am Kurvenscheitel einer MAX-Kurve; unter dem Hop-Anflug (0,3). */
export const WARP_BANK_MAX_RAD = 0.28
/** Lehne des Spielers: playerX = focusX · K, mit Nachlauf τ — die Kamera holt ihn ein. */
export const WARP_LEAN_K = 0.55
export const WARP_LEAN_TAU_SEC = 0.3
/** Der Körper kippt in die Kurve: bodyRoll = Bank · K (rad). */
export const WARP_BODY_ROLL_K = 0.6
/** Strichbreite: Grundwert + Tempo-Anteil (bei 54× ≈ 4,8 px). */
export const WARP_STREAK_WIDTH_BASE = 1.0
export const WARP_STREAK_WIDTH_PER_SPEED = 0.1
/**
 * Wie weit ein Sternstrich höchstens reichen darf, als Anteil seines ABSTANDS
 * zum Fluchtpunkt. Die Länge wächst linear mit dem Tempo und war ungedeckelt;
 * am Rand überschoss der Schweif damit den Fluchtpunkt und querte ihn schief —
 * aus dem Sog wurde eine Explosion. Der Deckel wandert mit dem Kurs mit.
 */
export const WARP_STREAK_LEN_MAX_FRAC = 0.9
/** Ab hier wächst die Breite nicht mehr mit dem Tempo — beim Universumssprung (140×) wäre sie sonst ein Balken. */
export const WARP_STREAK_WIDTH_SPEED_CAP = 45
/** Doppler: voraus (norm unter AHEAD) blau-weiß, hinten (über BEHIND) warm. */
export const WARP_DOPPLER_AHEAD_NORM = 0.45
export const WARP_DOPPLER_BEHIND_NORM = 0.8
export const WARP_DOPPLER_BLUE_RGB: readonly [number, number, number] = [175, 205, 255]
export const WARP_DOPPLER_BLUE_MIX = 0.55
export const WARP_DOPPLER_RED_RGB: readonly [number, number, number] = [255, 160, 110]
export const WARP_DOPPLER_RED_MIX = 0.5
/** Aufhellung um den Fluchtpunkt („Headlight") — Sichtwert und Radius. */
export const WARP_HEADLIGHT_ALPHA = 0.26
export const WARP_HEADLIGHT_RADIUS_FRAC = 0.34
/** Streak-Sprite (starSprites.ts): Länge × Höhe des Offscreen-Canvas. */
export const WARP_STREAK_SPRITE_LEN_PX = 128
export const WARP_STREAK_SPRITE_H_PX = 16
/* ── Die Farbwelt wandert schon im Flug ────────────────────────────────────
   Die neue Galaxie hat ihre Farbe, bevor man ankommt: ab `WARP_SURGE_FROM`
   blendet der Tunnel von der alten zur neuen Welt. Sichtbar wird das nur, weil
   eine getönte Vollflächen-Ebene über dem Sternfeld liegt — die Sterne selbst
   tragen feste Spektralfarben, und die Theme-Akzente sind für sich zu dunkel. */
/** Deckkraft der Tunnel-Tönung bei vollem `tintGain`. */
export const WARP_TINT_ALPHA = 0.34
/** Reichweite des Schleiers als Vielfaches des Abstands zur fernsten Ecke — er
 *  läuft nach aussen aus, damit die Ecken ihre Schwärze behalten. */
export const WARP_TINT_RADIUS_K = 0.85
/** Anteile Weiss in Kern und Saum des Headlights — es TRÄGT die Weltfarbe,
 *  ersetzt sie nicht: ein gesättigter Kern wäre eine farbige Taschenlampe. */
export const WARP_HEADLIGHT_TINT_CORE = 0.75
export const WARP_HEADLIGHT_TINT_MID = 0.45
/** Blitz in der Akzentfarbe des neuen Themes beim Schnitt (DOM). */
export const WARP_FLASH_MS = 400
/** Tiefenbänder: nah = schneller, heller, breiter. Tiefe kommt aus Bändern,
 *  nicht aus Menge. */
export const FLIGHT_STREAK_BANDS: readonly { speed: number; alpha: number; width: number }[] = [
  { speed: 0.7, alpha: 0.1, width: 0.8 },
  { speed: 1.0, alpha: 0.18, width: 1.2 },
  { speed: 1.5, alpha: 0.28, width: 1.8 },
]
/** Der Kurs lebt: der Fluchtpunkt wandert um diesen Anteil der kurzen Kante,
 *  mit zwei inkommensurablen Perioden — die Sonne steht dabei still, denn die
 *  Kamera hängt am Spieler und nur sein Gieren verschiebt den Fokus. */
export const FLIGHT_DRIFT_AMPLITUDE = 0.03
export const FLIGHT_DRIFT_PERIOD_X_SEC = 47
export const FLIGHT_DRIFT_PERIOD_Y_SEC = 61
export const FLIGHT_DRIFT_EASE_SEC = 1.5
/** Streak bursts: every few seconds a gust of bright, long speed lines rushes
 *  past — a calm→gust→calm rhythm sells the motion far better than a constant
 *  glare would in a game that sits on screen for hours. */
export const FLIGHT_BURST_INTERVAL_MIN_SEC = 6
export const FLIGHT_BURST_INTERVAL_MAX_SEC = 12
/** Streaks per gust. */
export const FLIGHT_BURST_STREAK_MIN = 3
export const FLIGHT_BURST_STREAK_MAX = 6
/** Peak alpha of a burst streak — clearly visible, unlike the ambient ones. */
export const FLIGHT_BURST_ALPHA = 0.4
/** Burst streaks run this much faster than regular background stars. */
export const FLIGHT_BURST_SPEED_MULT = 2.4
/** Burst line length relative to per-frame travel (ambient uses 2.6). */
export const FLIGHT_BURST_LEN_FACTOR = 7
/** Outer stroke width of a burst streak; the hot white core is thinner. */
export const FLIGHT_BURST_WIDTH = 2.5

// ── Background comets ─────────────────────────────────────────────────────────
/** Rare ambient comets streaking diagonally across the star background canvas.
 *  Unlike the radial flight streaks (player motion), these are "environment":
 *  free cartesian flights, deliberately infrequent so they stay special in a
 *  game that idles on screen for hours. */
export const COMET_BG_MAX_COUNT = 5
/** Seconds between comet sky events (randomized within this range). */
export const COMET_BG_INTERVAL_MIN_SEC = 8
export const COMET_BG_INTERVAL_MAX_SEC = 20
/** Comets per sky event — index = count-1. Mostly 1, a 5-comet "meteor
 *  moment" is the rare jackpot. */
export const COMET_BG_COUNT_WEIGHTS = [0.62, 0.24, 0.09, 0.035, 0.015]
/** Extra cooldown per additional comet in an event, so multi-events don't
 *  raise the average comet rate — overall rarity stays constant. */
export const COMET_BG_EVENT_COOLDOWN_BONUS_SEC = 6
/** Max random entry delay (s) per comet in a multi-event — staggered arrivals
 *  read as "the sky comes alive", not a synchronized volley. */
export const COMET_BG_STAGGER_MAX_SEC = 1.8
/** First comet after load appears sooner, so the effect is discoverable. */
export const COMET_BG_FIRST_DELAY_MIN_SEC = 3
export const COMET_BG_FIRST_DELAY_MAX_SEC = 8
/** Head speed in px/s. */
export const COMET_BG_SPEED_MIN = 550
export const COMET_BG_SPEED_MAX = 1100
/** Tail length in px. */
export const COMET_BG_TAIL_MIN = 90
export const COMET_BG_TAIL_MAX = 260
/** Core stroke width of head/tail in px. */
export const COMET_BG_WIDTH_MIN = 1.5
export const COMET_BG_WIDTH_MAX = 3
/** Partial-burn comets live this long — fade in, burn out mid-screen. */
export const COMET_BG_PARTIAL_LIFE_MIN_SEC = 1.2
export const COMET_BG_PARTIAL_LIFE_MAX_SEC = 2.5
/** Behavior variant weights: crossing / partial burn / slow drifter /
 *  fast flash / arc comet. */
export const COMET_BG_VARIANT_WEIGHTS = {
  crossing: 0.4,
  partial: 0.3,
  drifter: 0.12,
  flash: 0.12,
  arc: 0.06,
} as const
/** Twin flourish odds — only on single-comet crossing events. */
export const COMET_BG_TWIN_CHANCE = 0.15
/** Slow drifter: majestic distant comet — slow, long dim tail. */
export const COMET_BG_DRIFTER_SPEED_MIN = 120
export const COMET_BG_DRIFTER_SPEED_MAX = 260
export const COMET_BG_DRIFTER_TAIL_MULT = 1.6
export const COMET_BG_DRIFTER_ALPHA_MULT = 0.7
/** Fast flash: blink-and-miss streak — very fast, thin, bright core. */
export const COMET_BG_FLASH_SPEED_MIN = 1500
export const COMET_BG_FLASH_SPEED_MAX = 2000
export const COMET_BG_FLASH_TAIL_MULT = 0.6
export const COMET_BG_FLASH_ALPHA_MULT = 1.3
/** Arc comet: velocity rotates by this rate (rad/s) → visibly curved path. */
export const COMET_BG_ARC_TURN_RATE_MIN = 0.15
export const COMET_BG_ARC_TURN_RATE_MAX = 0.45
/** Curved paths are longer — lifetime safety margin for arc comets. */
export const COMET_BG_ARC_LIFE_MARGIN = 1.25
/** Share of crossings heading top-left → bottom-right (the signature flight);
 *  the rest picks evenly from the remaining headings. */
export const COMET_BG_DIAGONAL_CHANCE = 0.45
/** Random per-comet deviation from the base heading (radians, ± ≈ 20°). */
export const COMET_BG_ANGLE_JITTER_RAD = 0.35
/** Alpha envelope of partial burns: fade-in / fade-out fractions of life. */
export const COMET_BG_FADE_IN_FRAC = 0.15
export const COMET_BG_FADE_OUT_FRAC = 0.3
/** Peak alpha of the tail's outer (tinted) stroke. */
export const COMET_BG_ALPHA = 0.55
/** Twin companion: perpendicular offset range (px) and size/speed ratio. */
export const COMET_BG_TWIN_OFFSET_MIN = 40
export const COMET_BG_TWIN_OFFSET_MAX = 80
export const COMET_BG_TWIN_SCALE = 0.6
/** White-mix applied to the dark galaxy nebula color → pastel comet tint. */
export const COMET_BG_TINT_WHITE_MIX = 0.55

/* ── Cosmic-background comet variant ──────────────────────────────────────────
 * The flat cosmic backdrop (shop, planets, menus) gets a livelier sky than the
 * idle-orbit backdrop: comet sky events fire more often, start sooner and lean
 * toward bigger multi-comet bursts. Values above are the idle-orbit baseline;
 * these override interval / first-delay / count only for the 'cosmic' variant.
 * The behavior variants (crossing/partial/drifter/flash/arc) stay identical. */
/** Seconds between comet sky events in the cosmic backdrop (more frequent). */
export const COMET_BG_COSMIC_INTERVAL_MIN_SEC = 3
export const COMET_BG_COSMIC_INTERVAL_MAX_SEC = 9
/** First comet in the cosmic backdrop appears almost right away. */
export const COMET_BG_COSMIC_FIRST_DELAY_MIN_SEC = 1
export const COMET_BG_COSMIC_FIRST_DELAY_MAX_SEC = 4
/** More comets may share the sky at once than the idle-orbit cap of 5. */
export const COMET_BG_COSMIC_MAX_COUNT = 8
/** Per-event count weights (index = count-1) — biased toward multi-comet bursts
 *  so the cosmic backdrop regularly shows 2–5 comets, not mostly singles. */
export const COMET_BG_COSMIC_COUNT_WEIGHTS = [0.24, 0.26, 0.2, 0.14, 0.08, 0.05, 0.02, 0.01]

// ── Central Chime click feedback ──────────────────────────────────────────────
// Juicy click response for the central sun chime (IdleGameComponent). Distances
// and sizes are multipliers of planetShopStore.currentSunRadius so the effect
// scales with the sun.
export const CHIME_BURST_COUNT = 5 // mini chimes spawned per click
export const CHIME_BURST_DURATION_MS = 650 // burst fly-out + fade (also cleanup timeout)
export const CHIME_BURST_DIST_MIN_FACTOR = 1.1 // min travel distance (× sun radius)
export const CHIME_BURST_DIST_MAX_FACTOR = 2.0 // max travel distance (× sun radius)
export const CHIME_BURST_SIZE_FACTOR = 0.45 // mini-chime size (× sun radius)

// ── Körper im Sonnenlicht (utils/fx/spaceBody.ts) ───────────────────────────
// Die EINE Werkzeugkiste, mit der Drifter, Landfall und Void ihre Körper
// rastern.
/** Kantenlänge der Rauschkachel, die alle Motive teilen — EINMAL je Sitzung. */
export const SPACE_BODY_NOISE_TILE_PX = 96
/** Über dpr 2 hinaus rastert niemand einen Unterschied, den man sieht — die
 *  Fläche wächst aber quadratisch. */
export const SPACE_BODY_SPRITE_MAX_DPR = 2
/** Stützpunkte einer unrunden Silhouette. */
export const SPACE_BODY_LUMPY_POINTS = 13
/** Kühle Gegenfüllung der Schattenseite: Sternenlicht, kein reines Schwarz. */
export const SPACE_BODY_AMBIENT_RGB = '88, 112, 160'
export const SPACE_BODY_AMBIENT_ALPHA = 0.14

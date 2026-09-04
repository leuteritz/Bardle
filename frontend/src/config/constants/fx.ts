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

// ── Hyperspace-Sprung: Phasenwechsel ──────────────────────────────────────
// Das Vollbild-Overlay und die Minimap zeigen denselben Sprung gleichzeitig.
// Liefen die Marken auseinander, blitzte die eine Ebene, während die andere
// noch beschleunigt — deshalb eine Quelle für beide.
/** Ende der Beschleunigung, Übergang in den weißen Blitz. */
export const HYPERSPACE_FLASH_AT_MS = 2000
/** Beginn des Ausblendens. */
export const HYPERSPACE_FADEOUT_AT_MS = 2500
/** Alles zurück auf Ruhezustand. */
export const HYPERSPACE_END_AT_MS = 3500
/**
 * Abstand zwischen dem Reset (bei HYPERSPACE_ANIM_START_MS) und der
 * Ankunfts-Zeremonie des Herolds.
 *
 * Der Herold liegt auf z-index 9700, dieses Overlay auf 9999 mit deckendem
 * Grund — eine Ansage im Weissblitz laeuft unsichtbar ab. 1000 ms decken die
 * Strecke bis HYPERSPACE_END_AT_MS, die restlichen 400 zeigen die nackte
 * Buehne, bevor die Karte aufgeht.
 */
export const HYPERSPACE_ARRIVAL_HERALD_DELAY_MS = 1400

/** Streuung der Chime-Funken um ihren Sollwinkel, als Anteil des Winkelschritts. */
export const CHIME_BURST_ANGLE_JITTER = 0.6
/** Untergrenze der Chime-Popup-Schrift, damit sie bei kleiner Sonne lesbar bleibt. */
export const CHIME_POPUP_FONT_MIN_PX = 22
export const CHIME_POPUP_FONT_SUN_FACTOR = 0.5

export const STAR_COUNT = 400
/** Floor for the area-scaled star count so a small contained instance (Shop) is never empty. */
export const STAR_BG_MIN_STARS = 60

/**
 * Radiale Staffelung der Flug-Linien um die Sonne: jede Linie bekommt über den
 * Index eine eigene Reichweite, damit kein gleichmäßiger Kranz entsteht.
 */

// Background canvas star speeds
export const STAR_BG_BASE_SPEED_MIN = 1.0 // base speed minimum (doubled from 0.5)
export const STAR_BG_BASE_SPEED_RANGE = 2.0 // base speed random range (doubled from 1.0)
// Probability that a background star gets blue-tinted (more realistic starfield)
export const BACKGROUND_STAR_BLUE_BIAS = 0.9

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

export const HYPERSPACE_ANIM_START_MS = 2500
export const HYPERSPACE_ANIM_END_MS = 3500

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
export const WARP_STREAK_LEN_FACTOR = 2.2
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

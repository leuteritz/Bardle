// Der dauerhafte Rahmen der Oberfläche: Header-Bogen, Bottom-Bar, Minimap,
// Pause- und Offline-Overlay, Tooltips, Ton und die Timings, mit denen das
// alles ein- und ausblendet.

// ── Offline-Minispiel: Ring treffen ───────────────────────────────────────
/** SVG-Einheiten im viewBox `0 0 280 280`. */
export const OFFLINE_MINIGAME_CENTER = 140
export const OFFLINE_MINIGAME_MAX_RADIUS = 126
/** Trefferband als Anteil des Maximalradius — hier zählt der Klick. */
export const OFFLINE_MINIGAME_BAND_MIN = 0.66
export const OFFLINE_MINIGAME_BAND_MAX = 0.86
/** Dauer eines Wellendurchlaufs und wie viele Versuche der Spieler hat. */
export const OFFLINE_MINIGAME_PULSE_MS = 1700
export const OFFLINE_MINIGAME_MAX_PULSES = 6
/** Aufblenden der Welle am Anfang und ihr Verlöschen zum Rand hin. */
export const OFFLINE_MINIGAME_FADE_IN_FRACTION = 0.08
export const OFFLINE_MINIGAME_FADE_OUT_STRENGTH = 0.55
/** Nachlauf, bevor das Ergebnis gemeldet wird — je nach Ausgang verschieden lang. */
export const OFFLINE_MINIGAME_WIN_DELAY_MS = 800
export const OFFLINE_MINIGAME_LOSE_DELAY_MS = 600
export const OFFLINE_MINIGAME_TIMEOUT_DELAY_MS = 400
export const OFFLINE_MINIGAME_SKIP_DELAY_MS = 300

/** Wie lange der Tier-Unlock in der Minimap aufblitzt. */
export const MINIMAP_TIER_FLASH_MS = 2400

// Header materials grid: fixed column count (2 rows × 5 columns = 10 materials).
export const HEADER_MATERIALS_GRID_COLUMNS = 5

/** Dauer, über die die Offline-Bilanz ihre Chime-Summe hochzählt. */
export const OFFLINE_COUNTER_ANIM_MS = 2000
/** Wartezeit, bis das Minispiel nach dem Öffnen der Bilanz erscheint. */
export const OFFLINE_MINIGAME_START_DELAY_MS = 2100

// ── Header-Bogen: Sitzplätze der Badges ───────────────────────────────────
/** Wie weit ein Badge über die Bogenlinie ragt, als Anteil seiner Höhe. */
export const HEADER_BADGE_OVERLAP_FRAC = 0.4
/**
 * Level-Badge-Durchmesser als Vielfaches seiner Überlappung — Umkehrung von
 * HEADER_BADGE_OVERLAP_FRAC, damit aus der gemessenen Überlappung wieder der
 * Radius wird.
 */
export const HEADER_LEVEL_BADGE_DIAMETER_FACTOR = 2.5
/** Rückfallhöhe, solange das Badge noch nicht gemessen werden konnte. */
export const HEADER_LEVEL_BADGE_FALLBACK_H_PX = 50
/** Startgröße des Benachrichtigungs-Badges, bis die Messung greift. */
export const HEADER_NOTIF_BADGE_START_PX = 28
/**
 * Numerische Suche der Badge-Plätze auf der Ellipse: Schrittweite und
 * Endwinkel. Analytisch ist der gleiche Kantenabstand auf einer Ellipse nicht
 * geschlossen lösbar — deshalb wird der Bogen in feinen Schritten abgetastet.
 */
export const HEADER_BADGE_ARC_STEP_RAD = 0.003
export const HEADER_BADGE_ARC_MIN_RAD = 0.02
export const HEADER_BADGE_MAX_COUNT = 3

export const BOTTOM_BAR_SEAM_TOP_OFFSET_PX = 10
export const BOTTOM_BAR_SEAM_BOTTOM_OFFSET_PX = 28

/** Einsammel-Burst: Streuung um den Sollwinkel, als Anteil des Winkelschritts. */
/** Aufblitz-Dauer einer geänderten Admin-Zahl. */
export const ADMIN_FIELD_FLASH_MS = 280
/** Wackeln des Galaxie-Sprung-Panels bei ungültiger Eingabe. */
export const ADMIN_JUMP_SHAKE_MS = 450
/** Schrittweite des Chimes-Reglers im Admin-Panel. */
export const ADMIN_CHIMES_STEP = 100_000
/** Menge je Material, die „alles auffüllen" setzt. */
export const ADMIN_FILL_MATERIAL_AMOUNT = 9999

/** Refresh rate of HUD countdown tickers (buff/respawn timers): the deadline
 *  timestamps are reactive, Date.now() is not — a ref ticks the comparison. */
export const HUD_COUNTDOWN_TICK_MS = 250

/** Pause overlay sun hero — disc diameter band (px) scaled by viewport height so the
 *  paused sun reads large on every desktop resolution without dwarfing the panel. */
export const PAUSE_SUN_MIN_DIAMETER = 160
export const PAUSE_SUN_MAX_DIAMETER = 300
export const PAUSE_SUN_VH_FACTOR = 0.24

/** Pause overlay panel — fixed design surface (px) that useFitScale shrinks on
 *  flat viewports (Full HD) and grows (up to max scale) on 2K/4K. */
export const PAUSE_PANEL_DESIGN_WIDTH = 560
export const PAUSE_PANEL_MAX_SCALE = 1.3

// HUD panel corner arc radius (shared by CommandPanel and MiniMap)
export const HUD_PANEL_ARC_R = 60
// Canonical border-radius for bardProfil cards, containers, and buttons
export const BARD_PROFILE_RADIUS = 4

// ── Bottom Bar Frame strokes ──────────────────────────────────────────────
export const BOTTOM_FRAME_STROKE_SHADOW = 'rgba(30,12,0,0.95)' // dark outer shadow
export const BOTTOM_FRAME_STROKE_WOOD = '#7a4e20' // wood brown — matches --rpg-wood / header border
export const BOTTOM_FRAME_STROKE_GRAIN = 'rgba(160,95,38,0.75)' // lighter wood grain
export const BOTTOM_FRAME_STROKE_SHEEN = 'rgba(190,115,46,0.14)' // subtle warm surface sheen

// ── Bottom Bar v2 (unified silhouette shell) ──────────────────────────────
// Reference geometry at hud-scale 1 (design mock is a 1920×443 layout).
export const BOTTOM_BAR_HEIGHT = 443 // total bar height
export const BOTTOM_BAR_SIDE_W = 440 // raised side panel width (minimap / command)
export const BOTTOM_BAR_CENTER_TOP_Y = 364 // top edge of the low center strip
export const BOTTOM_BAR_NOTCH_R = 26 // inner notch radius where panels meet the strip
export const BOTTOM_BAR_EDGE_INSET = 2 // stroke inset from the viewport edges
// Frame stroke widths (drawn shadow → wood → gold, top edge only)
export const BOTTOM_FRAME_W_SHADOW = 7
export const BOTTOM_FRAME_W_WOOD = 3.5
export const BOTTOM_FRAME_W_GOLD = 1.2
export const BOTTOM_FRAME_STROKE_GOLD = '#c89040' // thin gold highlight line
// Unified background fill: flat header brown — must stay identical across
// all three bottom panels (minimap / scoreboard / command), no deviations
export const BOTTOM_BAR_SEAM_COLOR = 'rgba(122,78,32,0.35)'

/** Star ornament flanking the title in the crest. */
export const CREST_STAR_IMAGE = '/img/star-128.png'
/** Separator between a status and its clock / percentage in the crest. */
export const CREST_SEPARATOR = ' · '

// Minimap travel rendering (static galaxy map)
export const MINIMAP_FLIGHTPATH_BEND = 0.18 // quadratic ctrl-point offset (fraction of leg length)
export const MINIMAP_ROUTE_ARROW_SIZE = 5 // chevron wing length on flown-route segments (live map)
export const MINIMAP_ROUTE_ARROW_GAP = 14 // chevron tip distance before the segment endpoint (clears the star marker)
export const MINIMAP_ROUTE_ARROW_SPREAD = 0.48 // half-opening angle of the chevron in radians (~27°)
export const SNAPSHOT_ROUTE_ARROW_SIZE = 3.5 // chevron wing length in the archive snapshot (smaller canvas)
export const SNAPSHOT_ROUTE_ARROW_GAP = 12 // chevron tip distance before the endpoint in the snapshot
export const MINIMAP_COMET_HEAD_R = 4.5 // player comet head radius (× √zoom)
export const MINIMAP_COMET_TAIL_LEN = 46 // comet tail length in px along the flight curve
export const MINIMAP_COMET_TAIL_SEGMENTS = 14 // tail sample count
export const MINIMAP_IDLE_SUN_R = 11 // player-sun marker when not traveling
export const MINIMAP_TWINKLE_COUNT = 30 // seeded twinkling background stars
// Procedural spiral galaxy (canvas-drawn, replaces the old galaxy-far sprite)
export const MINIMAP_GALAXY_ARMS_MIN = 2 // min seeded spiral arm count
export const MINIMAP_GALAXY_ARMS_MAX = 3 // max seeded spiral arm count
export const MINIMAP_GALAXY_PARTICLES = 1200 // particles across bulge + arms + haze
export const MINIMAP_GALAXY_RADIUS = 0.5 // outer radius in world (0..1) coords
export const MINIMAP_GALAXY_INNER_RADIUS = 0.05 // arms start here (bulge edge)
export const MINIMAP_GALAXY_SWIRL_TURNS = 1.9 // base revolutions from core to rim
export const MINIMAP_GALAXY_SQUASH = 0.62 // base disk squash (inclination illusion)
export const MINIMAP_GALAXY_BULGE_R = 0.11 // gaussian bulge radius
export const MINIMAP_GALAXY_KNOTS = 18 // bright accent-colored knots on the arms
export const MINIMAP_GALAXY_BRIGHT_STARS = 70 // distinct single stars along the arms
export const MINIMAP_GALAXY_CORE_RADIUS = 0.15 // core glow radius in world coords
export const MINIMAP_ZOOM_TRIGGER_MS = 45_000 // zoom-in phase starts this long before arrival
export const MINIMAP_ZOOM_MAX = 5.4 // camera zoom at arrival (target star grows ≈ arrival sun)
export const MINIMAP_ZOOM_LERP = 0.06 // per-frame camera smoothing (zoom-in)
export const MINIMAP_ZOOM_OUT_LERP = 0.03 // slower zoom-out so the near field stays visible a while
export const MINIMAP_DEPARTURE_TRANSITION_MS = 900 // crossfade arrival view → galaxy map
// Zoom acts: galaxy overview → fly-through (arms spread, near field fades in) → arrival view
export const MINIMAP_GALAXY_FADE: readonly [number, number] = [3.4, 5.2] // zoom range: galaxy body fades out
export const MINIMAP_NEARFIELD_FADE: readonly [number, number] = [2.4, 4.2] // zoom range: local star field fades in
export const MINIMAP_NEARFIELD_STARS = 90 // seeded local stars around the destination
export const MINIMAP_NEARFIELD_SPREAD = 0.09 // near-field star spread in world coords
export const MINIMAP_TARGET_BASE_R = 6 // target star radius in the far overview (~1.7× comet head)
export const MINIMAP_TARGET_MAX_R = 12 // target star radius at full zoom (arrival crossfade bridges to the arrival sun)
export const MINIMAP_WAIT_SUN_R = 26 // centered player sun on the role-selection screen

// ── FPS-Zähler (neben der Signatur unten links) ─────────────────────────────
/** Ab hier läuft es rund — der Zähler steht grün. */
export const FPS_GOOD_THRESHOLD = 55
/** Darunter wird es zäh: unter diesem Wert schlägt der Zähler auf Rot um. */
export const FPS_POOR_THRESHOLD = 30

// ── Pause-Overlay: Material-Raster in der Stat-Kachel ──────────────────────
// Die Kachel fasst 4 × 2 Karten; fällt ein neuntes Material, gibt die letzte
// Zelle den Rest als „+N" aus. Die Rasterhöhe ist fest reserviert: klappte die
// zweite Reihe erst beim fünften Material auf, änderte sich die Panelhöhe
// mitten in der Pause — und mit ihr der Fit-Scale des gesamten Overlays.
export const PAUSE_MATERIAL_COLUMNS = 5
export const PAUSE_MATERIAL_ROWS = 2

// ── Pause-Overlay: Vitality-Leiste ─────────────────────────────────────────
/** Ab diesem Anteil gilt die Sonne als unversehrt (grün). */
export const PAUSE_HP_HEALTHY_PERCENT = 50
/** Darunter wird die Leiste rot und pulst. */
export const PAUSE_HP_CRIT_PERCENT = 25

// ── Star-Timer-Bars (Header) — Planeten-Kugeln mit Boss-HP-Füllstand ──────
// Die Bars lesen die Boss-Daten NICHT reaktiv, sondern über einen Snapshot,
// der im Takt von STAR_TIMER_TICK_MS neu gebaut wird. Damit invalidiert das
// Bar-Computed höchstens 5×/s statt bei jedem einzelnen Schadensereignis —
// entscheidend, wenn viele Sterne gleichzeitig unter dem Header hängen.
export const STAR_TIMER_TICK_MS = 200
// HP-Ratio wird auf Stufen gerundet, damit sich der gebundene Style-Wert
// (und damit der DOM-Write) nur bei sichtbarer Änderung überhaupt ändert.
export const STAR_TIMER_HP_STEPS = 20
// Schwellen für den Farbwechsel der Kugelfüllung
export const STAR_TIMER_HP_LOW_RATIO = 0.35
export const STAR_TIMER_HP_CRITICAL_RATIO = 0.15
// Solange der Boss lebt, bleibt mindestens dieser Anteil der Kugel gefüllt —
// bei 2 % HP wäre der Farbstreifen in einer ~11 px großen Kugel sonst unsichtbar.
export const STAR_TIMER_HP_MIN_FILL = 0.2
// Die Prozentzahl neben der Kugel läuft feiner als die Füllung (100 statt 20
// Stufen): sie ist der exakte Wert, die Kugel nur die grobe Silhouette.
export const STAR_TIMER_HP_PCT_STEPS = 100
// Ein lebender Boss zeigt nie "0" — sonst liest sich die Zahl wie "besiegt",
// während der Stern noch steht.
export const STAR_TIMER_HP_MIN_PCT = 1
// Nur der aktiv bekämpfte Planet zeigt seine HP dauerhaft. Jeder andere blendet
// sie ein, sobald er getroffen wird, und nach dieser Zeit ohne weiteren Treffer
// wieder aus — die Bar bleibt ruhig, statt permanent Zahlen zu zeigen.
export const STAR_TIMER_HP_REVEAL_MS = 2000
// Jede Bar endet an der Bogenkante des Header-Ovals auf Höhe ihrer eigenen
// UNTERkante — dort ist das Oval am schmalsten, sodass die senkrechte
// Balkenkante über die restliche Zeilenhöhe hinter dem Oval verschwindet. Diese
// Überlappung schließt zusätzlich den Subpixel-Spalt, den das Antialiasing der
// Rundung genau an der Berührungslinie sonst aufblitzen lässt.
export const STAR_TIMER_CENTER_OVERLAP_PX = 1
// Balkenbreiten werden auf halbe Pixel gerundet: Ohne das schriebe schon das
// Subpixel-Rauschen einer Messung bei jedem Tick neue Grid-Spalten in 30 Zeilen.
export const STAR_TIMER_WIDTH_SNAP_PX = 0.5

// Event log
/** Maximum number of events kept in the live event log before trimming */
export const EVENT_LOG_MAX_SIZE = 12
/** Milliseconds before an event auto-dismisses from the log */
export const EVENT_LOG_DISMISS_MS = 7_000

// Herald — large centered milestone announcements (HeraldOverlay / useHerald)
/** How long a single herald banner stays on screen (ms) */
export const HERALD_DISPLAY_MS = 2_000
/** Max queued heralds; oldest is dropped past this */
export const HERALD_QUEUE_MAX = 3
/** Grace period after mount before heralds arm — swallows the state jumps that
 *  loadGame() causes so a loaded save never fires a spurious warp/rank banner. */
export const HERALD_ARM_DELAY_MS = 1_500
/** Accent color (r,g,b) per herald kind; rank-ups pull from RANK_TIER_COLORS. */
export const HERALD_ACCENT_WARP = '150, 120, 255'
export const HERALD_ACCENT_CHAMPION = '232, 192, 64'

// Offline progress
export const OFFLINE_CPS_RATE = 0.6
export const OFFLINE_MAX_HOURS = 10
export const OFFLINE_MIN_SECONDS = 60

/** Bard Stats "Solar Evolution" — the live sun sits at the centre of the middle
 *  column and the seven phases ride an open orbit around it. Every value is in
 *  the SVG's 100×100 user units, which are also % of the square stage, so the
 *  whole dial scales with the resizable column instead of needing pixel sizes
 *  per resolution. Angles are measured from 12 o'clock, clockwise. */
export const STATS_TAB_ORBIT = {
  /** side of the square viewBox — reference frame for every value below */
  VIEW: 100,
  /** Vertical centre of the dial (% of the stage). Everything the dial says now
   *  lives INSIDE the ring — identity above the sun, the evolve gate on it — so
   *  the ring no longer has to leave a band free at the bottom and sits dead
   *  centre again. */
  CENTER_Y: 50,
  /** Radius of the phase orbit. With no caption block below the arc, the ring
   *  claims the stage — but every marker now carries a permanent tag, and the
   *  one at 12 o'clock puts its tag OUTSIDE the ring, so the ring has to leave
   *  a 10% band at the top for it. */
  RADIUS: 40,
  /** Clear air (% of the stage) between a marker's DISC and its permanent tag —
   *  measured from the disc's edge, not the orbit line, because the markers are
   *  sized to their phase and the collapse disc is nearly five times the width
   *  of the comet speck. Outward where the stage has room, inward on the
   *  flanks, where the stage's edge is right there. */
  TAG_OUT_PCT: 4.5,
  TAG_IN_PCT: 6,
  /** |sin(angle)| above this means the marker sits too far out to the side for
   *  an outward tag — it gets an inward one instead. */
  TAG_FLANK_SIN: 0.75,
  /** Width (% of the stage) of a tag. Fixed, so a long phase name never shifts
   *  the tag off its marker — and so the clearances above can be computed. */
  TAG_WIDTH_PCT: 19,
  /** orbit line thickness */
  STROKE: 1.6,
  /** angle of the first step (the comet), i.e. the lower-left end of the arc */
  START_DEG: -140,
  /** angular length of the open ring — the 80° gap at the bottom carries the
   *  phase caption and dwell clock, and an open arc reads as a progression
   *  instead of a cycle */
  SPAN_DEG: 280,
  /** Top edge (% of the stage) of the identity block above the sun. Sits below
   *  the ring's topmost marker (which reaches ~9.6%) and above the largest sun
   *  disc (whose top edge is at 29%) — the one band inside the ring that no
   *  body ever occupies, at any phase. */
  IDENT_TOP_PCT: 11.5,
  /** Width (% of the stage) of a marker's hover card. It carries four readouts
   *  in a row, so it is wide — which is why the card anchors to whichever edge
   *  keeps it on the stage instead of always centring on its marker. */
  TIP_WIDTH_PCT: 64,
  /** Markers further out than this (or than 100 − this) anchor their card by
   *  the near edge and let it grow toward the middle of the stage. */
  TIP_EDGE_PCT: 34,
  /** dot diameter (% of the stage) = phase radius × this — keeps the orbit dots
   *  true to the in-game sun proportions (1.9%…7%) */
  DOT_PCT_PER_RADIUS: 0.05,
  /** comet dot diameter (% of the stage) — a fixed speck, smaller than any sun */
  COMET_DOT_PCT: 1.5,
  /** sun disc diameter (% of the stage) at the smallest / largest phase radius */
  SUN_PCT_MIN: 26,
  SUN_PCT_MAX: 42,
  /** comet disc diameter (% of the stage) — the origin body, below every sun */
  COMET_SUN_PCT: 17,
  /** Largest rendered stage width (px). Deliberately generous: on 4K the column
   *  offers ~1400px of height, and a dial capped much lower leaves a band of
   *  dead space between the ring and the readouts below it. In practice the
   *  column's own width and height bind first — this is only a ceiling. */
  MAX_PX: 1200,
  /** Compact cap (px) on Full-HD-height viewports. Set above what those
   *  viewports can actually give the dial, so there the HEIGHT decides — the
   *  cap only guards very wide, very flat windows. */
  MAX_PX_COMPACT: 520,
} as const

/** Bard Stats panel deck — user-resizable column widths (px). The two side
 *  columns (Journey / Galaxy Archive) are drag-resized; the middle (Solar
 *  Evolution) flexes to fill the rest and is protected by MIN_MIDDLE. It also
 *  carries the sun dial, so the sides are kept just wide enough for their own
 *  content — on Full HD every pixel they give back widens the dial. */
export const STATS_TAB_DECK_RESIZE = {
  /** initial width of the left (Journey) column — starts fully expanded (= MAX_LEFT) */
  DEFAULT_LEFT: 360,
  /** initial width of the right (Galaxy Archive) column — starts fully expanded (= MAX_RIGHT) */
  DEFAULT_RIGHT: 440,
  /** smallest either side column may shrink to */
  MIN_SIDE: 200,
  /** largest the left column may grow to — measured: the Play-Time odometer
   *  needs ~344px, so this is the tightest the column can be without cutting it */
  MAX_LEFT: 360,
  /** largest the right column may grow to — the archive title needs the width
   *  at the 4K type scale, so this one does NOT give ground to the dial */
  MAX_RIGHT: 440,
  /** the middle (Augments) column never shrinks below this */
  MIN_MIDDLE: 260,
} as const

/** Bard Stats "Journey" progress gauges (Level / Galaxy / Universe). The ring is
 *  drawn as SVG in a square viewBox, so every value below is in user units and
 *  scales automatically with whatever width the resizable column gives it. */
export const STATS_TAB_GAUGE = {
  /** side of the square viewBox — reference frame for all values below */
  VIEW: 100,
  /** ring radius; leaves room for the stroke plus its glow inside the box */
  RADIUS: 41,
  /** ring thickness */
  STROKE: 7,
  /** value font size per length bucket: 1–2 chars, 3, 4, 5+ — longer readouts
   *  (three-digit levels, roman "VIII") shrink so they never touch the ring */
  VALUE_FONT: [40, 32, 26, 21],
  /** largest rendered ring diameter (px); below this the ring scales with the column */
  MAX_PX: 96,
  /** compact ring diameter (px) on Full-HD-height viewports */
  MAX_PX_COMPACT: 78,
} as const

// ── Admin ─────────────────────────────────────────────────────────────────────
/** Max augment selections queued by a single admin level grant (keeps a "+500 levels" from queueing 500 modals) */
export const ADMIN_LEVEL_AUGMENT_QUEUE_MAX = 10

// ── UI Timing ─────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 800

// ── Music ─────────────────────────────────────────────────────────────────────
export const MUSIC_DEFAULT_VOLUME = 0.1
export const MUSIC_FADE_DURATION_MS = 1500
export const MUSIC_STORAGE_KEY = 'bard-music-settings'

// ── SFX ───────────────────────────────────────────────────────────────────────
export const SFX_CHIME_GAIN = 0.1
export const SFX_CHIME_MAIN_FREQ = 130
export const SFX_CHIME_OVERTONE_FREQ = 261
export const SFX_CHIME_MOD_FREQ = 4
export const SFX_CHIME_MOD_DEPTH = 8
export const SFX_CHIME_ATTACK_S = 0.003
export const SFX_CHIME_DECAY_S = 0.4
export const SFX_CHIME_OVERTONE_DELAY_S = 0.01
export const SFX_CHIME_OVERTONE_DECAY_S = 0.32
export const SFX_CHIME_SUB_FREQ = 55
export const SFX_CHIME_SUB_GAIN = 0.18
export const SFX_CHIME_SUB_DECAY_S = 0.22

// ── Admin / Debug ─────────────────────────────────────────────────────────────
export const ADMIN_QUICK_RESOURCE_AMOUNT = 100_000_000_000

/** Kantenlänge der Drifter-Silhouette auf den Spawn-Kacheln des Admin-Panels.
 *  Groß genug, dass Splitter, Sonde und Leviathan auseinanderzuhalten sind,
 *  klein genug für zwei Reihen à vier Kacheln neben den anderen Panels. */
export const ADMIN_DRIFTER_PREVIEW_PX = 34

// ── Notify-badge hover tooltips (RpgBadgeTooltip) ────────────────────────────
// Shared behaviour of every badge tooltip: gap between anchor and panel,
// minimum distance kept to the viewport edges (clamping), and the grace
// period before hiding so the pointer can travel into the panel.
export const BADGE_TOOLTIP_GAP_PX = 8
export const BADGE_TOOLTIP_VIEWPORT_MARGIN_PX = 8
// Short grace period so the pointer can travel from badge into the panel —
// kept tight so leaving a badge closes its tooltip without feeling laggy.
export const BADGE_TOOLTIP_HIDE_DELAY_MS = 80
// Caret is kept at least this far away from the panel's rounded corners.
export const BADGE_TOOLTIP_CARET_INSET_PX = 12
// Ancestor whose lower edge a header tooltip clears instead of its own anchor:
// the header packs its blocks tightly (the material grid alone stacks two rows),
// so a panel hugging its anchor would land on top of a neighbouring block.
export const HEADER_TOOLTIP_CLEAR_SELECTOR = '.header-bar'
// Larger gap for the center-chimes level tooltip: the arc-level badge hangs
// below the chimes box and would otherwise be covered by the panel.
export const CENTER_CHIMES_TOOLTIP_GAP_PX = 40

// The new-champions tooltip colors names + role tags via ROLE_BY_KEY — the
// game-wide role palette (orbit, shop, roster).
// Header notification badges — placed along the center-arc ellipse with a
// UNIFORM edge-to-edge pixel gap between neighbours (level badge at the arc
// apex → forge → champion on the right, expedition mirrored left). Positions
// are solved numerically in AppHeaderComponent from the measured arc size, so
// the visible gap is identical between every pair at every desktop resolution.
// Badge diameter mirror of the .header-notif-badge CSS clamp(20px,1.8vw,36px):
export const HEADER_NOTIF_BADGE_MIN_PX = 20
export const HEADER_NOTIF_BADGE_VW = 0.018
export const HEADER_NOTIF_BADGE_MAX_PX = 36
// Edge gap between neighbouring badges as a fraction of the badge diameter.
export const HEADER_BADGE_EDGE_GAP_FRAC = 0.5

// Header universe block — icon of the "Universe" stat tile (left of Galaxy).
export const HEADER_UNIVERSE_ICON = 'game-icons:over-infinity'

/** Step sizes offered by the team-tab admin level button — plus a MAX press
 *  that asks for CHAMPION_LEVEL_MAX_CAP steps and lands on the cap from any level. */
export const ADMIN_TEAM_LEVEL_STEPS = [1, 5, 10] as const

// ── Encyclopedia (EncyclopediaPanel.vue) ────────────────────────────────────
/** localStorage key for bookmarked codex entries (UI preference, not game state). */
export const ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY = 'bardle-codex-bookmarks'
/** How long the "Copied ✓" feedback stays on a formula copy button. */
export const ENCYCLOPEDIA_COPY_FEEDBACK_MS = 1200
/** Flash-highlight duration after jumping to a related entry. */
export const ENCYCLOPEDIA_FLASH_MS = 1600

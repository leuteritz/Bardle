// Der Team-Tab: das Sigil-Board mit seinen fünf Rollenknoten, Sworn-Plätzen und
// Bank-Bogen, dazu Champion-Picker und Detailspalte. Die Radien sind gegen
// mehrere Randbedingungen gleichzeitig gelöst — einzeln geändert überlappen
// Namensschild, Medaille und Verbindungslinien.

import type { ChampionArtSize, SigilStageDef } from '@/types'
import { ALLIES_PER_ROLE } from '@/config/constants/champions'
import { ROLES } from '@/config/constants/roles'

// ── Sigil-Board: Abstand der Verbindungslinien ────────────────────────────
/**
 * Abstand, den eine Linie von den Bildern hält, die sie verbindet. Ein Sworn-
 * Endpunkt ist keine Scheibe, sondern eine geschnittene Platte: er reicht an
 * den Ecken bis SIGIL_SWORN_SIZE / 2 + SIGIL_SWORN_RIM_PX, die Linie muss also
 * weiter draußen enden, als die Portraitbox allein vermuten ließe.
 */
export const SIGIL_LINK_GAP_MAIN = 54
export const SIGIL_LINK_GAP_SWORN = 28
export const SIGIL_LINK_GAP_BENCH = 22
/** Goldener Winkel — streut die Glutpunkte gleichmäßig ohne Math.random. */
/** Streuung der Sigil-Glut: alles aus dem Index abgeleitet, kein Math.random. */
export const SIGIL_EMBER_RADIUS_STEP = 47
export const SIGIL_EMBER_SIZE_BASE = 3
export const SIGIL_EMBER_SIZE_VARIANTS = 3
export const SIGIL_EMBER_DELAY_STEP_S = 0.37
export const SIGIL_EMBER_DELAY_CYCLE_S = 2.4
export const SIGIL_EMBER_DURATION_BASE_S = 2.2
export const SIGIL_EMBER_DURATION_STEP_S = 0.29
export const SIGIL_EMBER_DURATION_SPREAD_S = 1.8

/** Standout badges a roster card shows before it truncates (TeamRosterPanel) */
export const ROSTER_CARD_MAX_BADGES = 4

/**
 * Corners of the plate behind the level numeral on a roster card. Six, like the
 * first faceted regalia stage — the card's insignia speaks the same geometry as
 * the team tab's medallion without carrying its ornaments (see TeamRosterPanel).
 */
export const ROSTER_LEVEL_PLATE_FACETS = 6

/** Magnifier size (px) of the shared search bar (`ui/RpgSearchBar.vue`), per
 *  size variant. The icon is an Iconify component, so the value has to come
 *  from script — it cannot live in the stylesheet with the rest of the sizing. */
export const SEARCH_BAR_ICON_PX = {
  /** default bar (46px tall) — Champion Shop, Champion Select, Synergies, … */
  md: 18,
  /** compact bar (34px tall) — Bard Stats column headers, Champion Picker */
  sm: 15,
} as const

// ── Battle Sigil (Team tab) ───────────────────────────────────────────────────
// Sigil geometry — the sigil lives on a square stage; the 5 role nodes sit on a
// pentagon (Top at 12 o'clock, ROLES order clockwise), each with a constellation
// arc of ALLIES_PER_ROLE ally satellites placed outward around the role node.
export const SIGIL_STAGE_SIZE = 900
export const SIGIL_PENTAGON_RADIUS = 255
/** Pentagon angles: Top at 12 o'clock, the ROLES order running clockwise. */
export const SIGIL_PENTAGON_START_ANGLE = -90
export const SIGIL_PENTAGON_ANGLE_STEP = 360 / ROLES.length
/**
 * The role cluster is a fan, not a ring: the two sworn allies hug their role node
 * while the bench sits far out on the pentagon's own arc. The whole set below was
 * solved together against seven constraints — the node's regalia frame (63px), the
 * satellites against each other, the sworn pair, the inner rune ring, the
 * neighbouring cluster 72° away, and the stage box the board's fit-scale clips at
 * (SIGIL_STAGE_SIZE / 2). Verified in the browser at all four desktop reference
 * resolutions, with the five longest champion names seated and a role selected
 * (that node scales 1.12): zero overlaps, tightest pair 15.6px at Full HD and
 * 4.2px in the selected state. The bench ends up 1.46× further from the node than
 * the sworn pair — that ratio IS the hierarchy. Do not nudge one value alone.
 */
export const SIGIL_ALLY_RADIUS = 416
/** Total angular span (degrees) of the bench arc, centered on the role's pentagon angle. */
export const SIGIL_ALLY_ARC_DEG = 36
/**
 * Sworn allies are placed in the ROLE NODE's own frame, not on a global ring:
 * SIGIL_SWORN_GAP away from it, SIGIL_SWORN_SPREAD_DEG to either side of the
 * outward radial. That is what lets them sit right against the main while the
 * bench stays out on the arc.
 */
export const SIGIL_SWORN_GAP = 110
export const SIGIL_SWORN_SPREAD_DEG = 58
/** Sworn satellites are drawn larger than the bench ones. */
export const SIGIL_SWORN_SIZE = 42
/**
 * A sworn satellite is a CUT PLATE, the bench a disc — the silhouette alone is
 * what tells the two ranks apart on the board, at any camera scale and without a
 * badge, a second colour or a per-frame cost. It puts the sworn pair in the same
 * family of cut metal as the role node's own regalia plates, with the bench
 * orbiting round around them.
 *
 * `turn = 0.5` seats the hexagon flat-topped (vertices left and right). The
 * portraits are cropped `object-position: top`, so a flat top edge keeps the
 * champion's head intact where a pointed one would shear its corners off.
 *
 * The plate reaches SIGIL_SWORN_RIM_PX past the portrait box on every side, so
 * its widest radius is SIGIL_SWORN_SIZE / 2 + SIGIL_SWORN_RIM_PX = 24px.
 * LINK_GAP_SWORN in SigilSvgLayers.vue trims the connector lines against exactly
 * that radius — raising one without the other makes the lines touch the metal.
 */
export const SIGIL_SWORN_FACETS = 6
export const SIGIL_SWORN_FACET_TURN = 0.5
export const SIGIL_SWORN_RIM_PX = 3
/** Aura behind the plate: a radial fade clipped to a WIDER copy of the same
 *  polygon. Clipped rather than blurred, so it glows without a filter pass — and
 *  shaped rather than box-shadowed, so no circular halo betrays the hexagon. */
export const SIGIL_SWORN_GLOW_PX = 11
/**
 * The name plate is the role node's one decoration seated OUTSIDE the portrait,
 * placed along the node's INWARD radial (the direction pointing at the sigil's
 * core). Every satellite of the role lies outward or lateral — sworn sit
 * ±SIGIL_SWORN_SPREAD_DEG off the OUTWARD radial — so the inward half is the one
 * region that can never collide with them, whatever the role's angle or the
 * champion's name length.
 *
 * It stands alone on that axis: the level medallion that used to answer it on the
 * outward end is gone, and the number now sits INSIDE the portrait, across its
 * foot, where the circle crops it and no radial geometry can be disturbed.
 *
 * The plate carries TWO lines — the champion's name and, under it, the XP
 * the arc around the portrait draws. They share one plate rather than sitting on
 * two anchors: for the four roles whose inward radial runs diagonally, a second
 * chip further down the same radial can never clear a 132px-wide plate (the step
 * along a diagonal buys far too little vertical separation), so the plate would
 * be overlapped for every role but Top.
 *
 * 80 is where the two-line plate (~31px tall) clears the node's regalia frame:
 * the frame reaches 63px from the node centre, the plate starts at 80 − 16 = 64.
 * Inward its far edge lands at pentagon radius 255 − 96 = 159, clear of the
 * centre crest (radius 85). Verified in the browser, idle and with a role
 * selected (that node scales 1.12), at Full HD and 2K.
 */
export const SIGIL_NODE_NAME_OFFSET = 80
/**
 * Name plates truncate rather than sprawl — a long name must not reach a
 * satellite. The bound that actually binds is the CORE, not the satellites: the
 * plate rides the inward radial, so a wider plate walks its far corner toward
 * the crest. The two roles at ±18° are the tightest — their plate centre sits at
 * (166.4, ∓54.1) from the stage centre, so a plate of width W comes within
 * hypot(166.4 − W/2, 37.6) of it. At 146 that is 100.7 px against a crest radius
 * of 85, i.e. ~16 px of air; at 160 it would be 88 and the plate would graze the
 * core. Raised from 132 when the power tab joined the level tab on the plate —
 * without it the two tabs would have left the name 70 px.
 */
export const SIGIL_NODE_NAME_MAX_WIDTH = 146
export const SIGIL_NODE_SIZE = 94
export const SIGIL_ALLY_SIZE = 36
export const SIGIL_CREST_SIZE = 170

/**
 * ── Power core (centre of the sigil) ───────────────────────────────────────
 * The crest is a distribution gauge: a ring inset at the disc's rim, cut into
 * one arc per role, each arc as long as that role's share of the team power
 * printed inside it. Read together with the power tab on every name plate
 * (SIGIL_NODE_POWER_TAB_WIDTH), the middle says what the five nodes add up to
 * and the ring says who carried it.
 *
 * Geometry is in the gauge's own 0–100 viewBox, so it scales with
 * SIGIL_CREST_SIZE and never has to be re-solved when the crest changes size.
 * Everything here is painted once per team change — no animation touches it.
 */
export const SIGIL_CORE_GAUGE_RADIUS = 43
export const SIGIL_CORE_GAUGE_CIRCUMFERENCE = 2 * Math.PI * SIGIL_CORE_GAUGE_RADIUS
/**
 * Band width. It is not a free number: on hover the arcs carry each role's share
 * as a percentage printed INSIDE the band, so the band has to be taller than the
 * digits. 8 units = 13.6 px of the 170 px crest, against ~8.4 px of cap height at
 * SIGIL_CORE_GAUGE_LABEL_PX — 2.6 px of air above and below. Thicker and the
 * ring's inner edge starts cutting into the face, thinner and the figures spill
 * onto the dark disc where dark ink disappears.
 */
export const SIGIL_CORE_GAUGE_STROKE = 8
/** Font size (px, stage units) of the per-arc share labels. */
export const SIGIL_CORE_GAUGE_LABEL_PX = 12
/** Gap between two role arcs, in the same units — keeps the colours from butting. */
export const SIGIL_CORE_GAUGE_GAP = 3.4
/**
 * Shortest arc a role that has ANY power may be drawn at. A single ★1 main next
 * to four full roles is a 1.8 % share, which without a floor would round down to
 * a sliver thinner than the gap beside it and read as absent.
 */
export const SIGIL_CORE_GAUGE_MIN_ARC = 5

/**
 * XP arc traced around a role node, in a 0–100 viewBox so it scales with the
 * node. The circumference is precomputed because stroke-dasharray needs it to
 * turn an XP ratio into an arc length.
 */
export const SIGIL_XP_RING_RADIUS = 46
export const SIGIL_XP_RING_CIRCUMFERENCE = 2 * Math.PI * SIGIL_XP_RING_RADIUS
/** How far the XP ring sits outside the portrait circle, in % of node size. */
export const SIGIL_XP_RING_INSET = -9
/** SVG ring radii (stage coordinates, center = SIGIL_STAGE_SIZE / 2). */
export const SIGIL_RING_OUTER_R = 430
export const SIGIL_RING_RUNE_R = 360
export const SIGIL_RING_INNER_R = 180
export const SIGIL_RING_CORE_R = 120

/** Extra zoom multiplier while a role is focused (camera zoom-in on role + allies). */
export const TEAM_SIGIL_FOCUS_ZOOM = 1.6
/** Camera pan/zoom transition duration (ms) — mirrored in SigilBoardComponent CSS. */
export const TEAM_SIGIL_CAMERA_MS = 450
/**
 * Width (px) of the role details panel — the board's fit-scale subtracts it while
 * a role is selected so open/close resolves in a single camera move. The panel is
 * two-column and carries the whole champion progression (levels, perks, costs)
 * that used to live in a modal, so it is roughly twice the synergies panel.
 */
export const TEAM_SIGIL_DETAILS_PANEL_WIDTH = 900
/** Width (px) of the left (identity + progression) column inside that panel. */
export const TEAM_SIGIL_DETAILS_LEFT_WIDTH = 434
/**
 * Width (px) of the captain card in the details-page roster strip. To its right
 * sit two grow-flex rows — the sworn pair on top, the rest of the bench below —
 * so neither row depends on a column count that has to divide ALLIES_PER_ROLE.
 */
export const TEAM_SIGIL_MAIN_CHIP_WIDTH = 250
/** Width (px) of the captain card's edge-to-edge portrait column. */
export const TEAM_SIGIL_MAIN_PORTRAIT_WIDTH = 92
/**
 * The roster strip folds away — see .sdp-roster-shell in SigilDetailsPanel.
 * Folded it leaves this rail (px) behind rather than nothing: the page still
 * has to say WHICH SEAT it is printing, and switching subject stays one click
 * on a seat dot instead of two on a drawer. Tall enough to carry the seat name
 * at title size, short enough that the fold is worth doing — a fold that buys
 * 40px of the ~180 the strip takes would be theatre.
 */
export const TEAM_SIGIL_ROSTER_RAIL_HEIGHT = 64
/**
 * Seat-dot heights (px) on the folded rail. Size alone carries the three-rank
 * ladder here — no ornament is laid over the portraits — so the steps are even
 * and wide enough to read without comparison: 10px apart, half again from bench
 * to captain. The captain is bounded by the rail's own height, the two below it
 * step down from there.
 */
export const TEAM_SIGIL_ROSTER_DOT_MAIN = 50
export const TEAM_SIGIL_ROSTER_DOT_SWORN = 40
export const TEAM_SIGIL_ROSTER_DOT_ALLY = 30
/** The captain's dot runs landscape — this much wider than tall, so its art gets
 *  a crop instead of a face squeezed into a square. */
export const TEAM_SIGIL_ROSTER_DOT_MAIN_RATIO = 1.35
/** Width (px) of the drawer grip down the strip's right edge — the fold toggle.
 *  The strip pads itself by this much so no card ever runs under the grip. Wide
 *  enough to read as a control from across the panel rather than a seam. */
export const TEAM_SIGIL_ROSTER_GRIP_WIDTH = 44
/** Fold/unfold duration (ms). One-shot, so a height transition is affordable —
 *  the strip's own contents cross-fade on transform/opacity alongside it. */
export const TEAM_SIGIL_ROSTER_FOLD_MS = 240
/** Width (px) of the team synergies panel — the other, narrower side panel. */
export const TEAM_SIGIL_SYNERGIES_PANEL_WIDTH = 460
/**
 * Width (px) of the shop rail. Deliberately the SAME number as the details page:
 * the two open on the same edge from the same board, and a rail that changed
 * width per destination would make the camera travel a different distance every
 * time. At this width the card grid keeps the four columns it had in the old
 * modal — there the grid shared its width with a permanent detail column, here
 * it owns all of it and the detail slides in over it instead.
 */
export const TEAM_SHOP_PANEL_WIDTH = TEAM_SIGIL_DETAILS_PANEL_WIDTH
/** Width (px) of the expeditions rail — same rail, same reason. */
export const TEAM_EXPEDITION_PANEL_WIDTH = TEAM_SIGIL_DETAILS_PANEL_WIDTH
/**
 * Width (px) of the equipment rail. The odd one out on purpose: it is opened
 * FROM the details page and returns to it on close, so it reads as a step inside
 * that page rather than a destination of its own. Its grid is auto-fill at 148px,
 * which lands on four columns here.
 */
export const TEAM_EQUIPMENT_PANEL_WIDTH = 660
/** Height (px) of the details-panel splash header (hero card: name + tier/origin/trait chips). */
export const TEAM_SIGIL_SPLASH_HEIGHT = 292
/**
 * Ceiling the splash may grow to, as a share (%) of the left column's height —
 * a share rather than a pixel cap, so the column fills out just as tightly at 4K
 * as at Full HD.
 *
 * Raised from 52 when the perk path moved to the right column. The old value
 * existed to stop a tall column from becoming one giant portrait over a squeezed
 * ladder; there is no ladder under the portrait any more, only the Level Up block
 * (fixed height) and the equipment row (its own per-tile floor). What the cap
 * still does is keep the crop from going absurdly tall and narrow in a 434px
 * column, and hold something back for the gear below.
 *
 * Never binding at Full HD — there the splash sits on its own
 * TEAM_SIGIL_SPLASH_HEIGHT_COMPACT floor and the column already overflows.
 */
export const TEAM_SIGIL_SPLASH_MAX_SHARE = 62
/** Max camera drag-pan as a fraction of the scaled stage size (rubber-band bound). */
export const TEAM_SIGIL_PAN_MAX_FRACTION = 0.15
/** Pointer travel (px) below which a pointer-down still counts as a click, not a drag. */
export const TEAM_SIGIL_DRAG_THRESHOLD_PX = 5

/**
 * Aufbaustufen des Team-Tabs. Der Tab bringt auf einen Schlag ein Sigil-Board,
 * fünf Rollenknoten, 25 Ally-Satelliten und eine zweispaltige Detailseite mit —
 * in einem einzigen Frame gerechnet, gelayoutet und gerastert ergibt das genau
 * den Ruckler, den man beim Öffnen sieht. Stattdessen wächst der Tab über drei
 * Frames: erst das Board mit den Rollen, dann die Satelliten, dann die
 * Detailseite (die ohnehin hereingleitet und einen Frame Verzug nicht verrät),
 * zuletzt die Regalia-Ornamente der Knoten. Dieselbe Gesamtarbeit, verteilt
 * statt am Stück.
 *
 * Die Ornamente kommen bewusst zum Schluss: Platten, Sweep, Nieten, Halo und
 * Corona sind je Knoten ein halbes Dutzend Ebenen aus clip-path, Kegelverläufen
 * und Masken — die teuersten Rasteroperationen, die es hier gibt, mal fünf
 * Knoten. Sie tragen keine Information, die man in den ersten drei Frames
 * braucht.
 */
export const TEAM_TAB_MOUNT_STAGE_BOARD = 0
export const TEAM_TAB_MOUNT_STAGE_SATELLITES = 1
export const TEAM_TAB_MOUNT_STAGE_PANEL = 2
export const TEAM_TAB_MOUNT_STAGE_ORNAMENTS = 3

/**
 * Der Team-Tab geht MIT bereits gewählter Rolle auf — der Weg über eine
 * Rollenkarte im Command Panel (`requestOpenRolesTab`). Board und Detailspalte
 * fielen dabei in denselben Frame: der Tab-Layer wird von `display: none`
 * sichtbar (rund 900 Elemente durch Style, Layout, Layerize, Paint) UND die
 * zweispaltige Detailseite mountet neu. Gemessen mit voller Besetzung (5 Mains,
 * 25 Allies, 6 belegte Planeten, 4 Sterne), Median über 11 Läufe: zusammen
 * 65 ms für den längsten Einzelframe.
 *
 * Die Spalte deshalb um ein paar Frames nachzuziehen war die falsche Antwort:
 * die Arbeit war zwar verteilt, aber man SAH die Spalte nachklappen — ein
 * zweites Aufgehen kurz nach dem ersten. Stattdessen steht in der Schiene vom
 * ersten Frame an ein Ladeschleier (`SigilDetailsLoader`): er belegt die volle
 * Breite der Spalte, das Board rechnet seine Kamera also sofort mit dem
 * endgültigen Layout, und die Detailseite mountet erst DAHINTER. Der teure
 * Frame liegt damit hinter einer deckenden Fläche, und das Aufdecken ist eine
 * reine Opazitäts-Blende.
 */
/**
 * Frames nach dem letzten Aufbauschritt (TEAM_TAB_MOUNT_STAGE_ORNAMENTS), ab
 * denen das Board als gezeichnet gilt. Beim Wiedereinblenden steht die Stufe
 * längst auf Maximum — dann zählen diese Frames das Sichtbarwerden des
 * Tab-Layers ab, das denselben Ruckler trägt.
 */
export const SIGIL_BOARD_SETTLE_FRAMES = 4
/**
 * Mindeststandzeit des Ladeschleiers. Nicht Kosmetik: ein Schleier, der nach
 * zwei Frames wieder weg ist, liest sich als Blitzer statt als Ladevorgang.
 * Deckt zugleich das Einblenden des Modals (`modal-pop`) ab, sodass die
 * Detailseite in eine bereits stehende Oberfläche aufgedeckt wird.
 */
export const SIGIL_DETAILS_LOADER_MIN_MS = 480
/**
 * Mindeststandzeit, wenn der Tab OHNE gewählte Rolle aufgeht — der Weg über die
 * Tab-Leiste des Bard-Profils. Kürzer als oben, weil dann nur das Board
 * entsteht und keine Detailseite: der Spieler soll nicht länger warten, als
 * tatsächlich gebaut wird.
 */
export const SIGIL_BOARD_LOADER_MIN_MS = 340
/**
 * Akzent des Ladeschleiers, solange keine Rolle gewählt ist. Ohne Rolle gibt es
 * keine Rollenfarbe — dann trägt er das Gold des Sigils selbst.
 */
export const SIGIL_LOADER_NEUTRAL_ACCENT = '#e8c040'
/**
 * Radius der Rollenknoten im Board-Skelett des Ladeschleiers, in Prozent seiner
 * halben Kantenlänge. Kein Nachbau der Sigil-Geometrie — nur die Andeutung
 * „fünf Knoten auf einem Kreis", damit die verdeckte Fläche nicht leer wirkt.
 */
export const SIGIL_SKELETON_NODE_RADIUS_PCT = 38
/** Ally-hover spotlight — hovering an ally row in the details panel mirrors onto
 *  the board: the matching satellite scales up + pings once, its siblings dim. */
export const SIGIL_ALLY_HOVER_SCALE = 1.4
export const SIGIL_ALLY_HOVER_DIM_OPACITY = 0.45
export const SIGIL_ALLY_HOVER_PING_MS = 450
/** The same spotlight in the other direction — hovering a satellite on the board
 *  lights its card in the details roster and dims every other card of the strip.
 *  The dim goes deeper than the board's (0.45): a roster card carries a splash,
 *  a name and a medallion, so it stays legible at an opacity that would make a
 *  bare satellite disappear. The sweep is the one-shot glint across the lit card,
 *  the same gesture the regalia frame gives a role node.
 *  See SigilDetailsPanel.vue → .sdp-chip--dimmed / --highlight. */
export const SIGIL_CHIP_HOVER_DIM_OPACITY = 0.32
export const SIGIL_CHIP_HOVER_SWEEP_MS = 700

/** Bildlose Materialien tragen im Loot-Banner ein Monogramm ihrer Initialen. */
export const LOOT_MONOGRAM_MAX_CHARS = 2

/**
 * Stufe der Rollenkarten im Command Panel (Bottom Bar, ~200 px hoch). Steht
 * hier, weil das Sigil-Board dieselben fünf Champions zeigt und sich an diese
 * Stufe anlehnt, statt eine zweite Datei desselben Motivs zu holen.
 */
export const COMMAND_PANEL_ART_SIZE: ChampionArtSize = 'lg'

// Sigil escalation — the sigil grows more epic with every filled slot:
// each main lights its pentagon vertex + spoke, each ally lights a rune tick,
// each full role (main + all allies) gains a spinning aura; global stages below
// escalate crest/rings/embers by total filled slots (0..SIGIL_TOTAL_SLOTS).
export const SIGIL_TOTAL_SLOTS = ROLES.length * (1 + ALLIES_PER_ROLE)
export const SIGIL_POWER_PER_STAR = 100
export const SIGIL_ALLY_POWER_PER_STAR = 25
/** Pentagram overlay appears once all 5 mains are set. */
export const SIGIL_PENTAGRAM_AT_MAINS = 5
/** Full mandala (all decorations) at a complete team. */
export const SIGIL_MANDALA_AT_FILLED = SIGIL_TOTAL_SLOTS
/** Unlit color for pentagon vertices, spokes and rune ticks. */
export const SIGIL_DIM_COLOR = '#3a2a12'
/**
 * Spoke weight (SVG stroke-width): every spoke starts at BASE and gains up to
 * SHARE more in proportion to that role's share of the team power. The line from
 * a role to the core is literally what the core's gauge is summing, so the
 * heavier line is the role feeding it more. A static attribute — it changes only
 * when a slot changes, never per frame.
 */
export const SIGIL_SPOKE_WIDTH_BASE = 1.5
export const SIGIL_SPOKE_WIDTH_SHARE = 4.5
export const SIGIL_STAGES: SigilStageDef[] = [
  {
    name: 'Dormant',
    minFilled: 0,
    crestColor: '#8a7448',
    ringColor: '#3a2a12',
    pulseSec: 0,
    spinSec: 90,
    emberCount: 0,
    extraRings: 0,
  },
  {
    name: 'Kindled',
    minFilled: 1,
    crestColor: '#c89040',
    ringColor: '#5c3310',
    pulseSec: 4.5,
    spinSec: 70,
    emberCount: 4,
    extraRings: 0,
  },
  {
    name: 'Ascendant',
    minFilled: 5, // all 5 mains set
    crestColor: '#e8c060',
    ringColor: '#7a4e20',
    pulseSec: 3.5,
    spinSec: 50,
    emberCount: 8,
    extraRings: 1,
  },
  {
    name: 'Radiant',
    minFilled: 18,
    crestColor: '#f0d870',
    ringColor: '#c89040',
    pulseSec: 2.5,
    spinSec: 35,
    emberCount: 12,
    extraRings: 2,
  },
  {
    name: 'Eternal',
    minFilled: 30, // full 30/30 team
    crestColor: '#ffe9a0',
    ringColor: '#e8c060',
    pulseSec: 1.8,
    spinSec: 22,
    emberCount: 18,
    extraRings: 2,
  },
]
/** Ember particles orbit between these radii (deterministic golden-angle spread). */
export const SIGIL_EMBER_MIN_R = 130
export const SIGIL_EMBER_R_SPREAD = 190

// Champion level UI
/**
 * Splash height in the role details panel on flat desktops (Full HD class).
 * The stat headline claims fixed space above the scrolling body, so the splash
 * gives some back rather than squeezing abilities, equipment and allies.
 */
export const TEAM_SIGIL_SPLASH_HEIGHT_COMPACT = 226

/** Portrait frame on the sigil board — ring width = stage rim * this + base. */
export const SIGIL_FRAME_RIM_BASE = 1.4
export const SIGIL_FRAME_RIM_STEP = 0.62
/** Rim opacity (%) = this base plus SIGIL_FRAME_RIM_ALPHA_STEP per stage, capped at 100. */
export const SIGIL_FRAME_RIM_ALPHA_BASE = 50
export const SIGIL_FRAME_RIM_ALPHA_STEP = 4.5
/** Portrait frame glow radius = stage glow * this. */
export const SIGIL_FRAME_GLOW_FACTOR = 0.85
/** Rotation period (ms) of the faceted crest plate behind an apex portrait. */
export const SIGIL_FRAME_PLATE_MS = 34000
/**
 * Half-turn of the second plate (deg per facet step) — offsetting it by half a
 * corner is what turns two overlapping polygons into a star silhouette.
 */
export const SIGIL_FRAME_PLATE2_OFFSET = 0.5
/** Angular width (deg) of a single stud on the frame's stud ring. */
export const SIGIL_FRAME_STUD_ARC_DEG = 3.6
/** Travel period (ms) of the highlight sweeping around the frame ring. */
export const SIGIL_FRAME_SWEEP_MS = 5600
/** Breathing period (ms) of the corona behind an Exalted-or-higher frame. */
export const SIGIL_FRAME_HALO_MS = 3800
/** XP arc stroke width = this base plus SIGIL_XP_STROKE_STEP per regalia stage. */
export const SIGIL_XP_STROKE_BASE = 3.2
export const SIGIL_XP_STROKE_STEP = 0.14

/**
 * Champion LEVEL on a role node — a tab struck into the LEFT EDGE of the name
 * plate. It took this seat from the champion TIER, which used to state its star
 * level here as a digit: a number wants a plate with a straight edge and dark
 * ink on lit metal, and the level is the number this slot is about.
 *
 * The tier kept no readout of its own. Nothing is printed across the portrait —
 * two attempts at that failed before (a six-rung ladder, a crown of forged
 * points) because anything drawn over a 94 px portrait competes with the
 * champion's face for the only surface that carries the champion's identity.
 * What the tier still has is the plate AROUND this tab (tint from
 * CROWN_MIN_STAR, glow from AUREOLE_MIN_STAR, a sheen at the apex), the regalia
 * frame on the portrait, and the plate's tooltip.
 *
 * Wide enough for two digits: the cap is 50, and at 17 px (what the tier's
 * single star level needed) a "12" ran straight out of the tab.
 */
export const SIGIL_NODE_LEVEL_TAB_WIDTH = 26

/**
 * Width (px) of the power tab struck into the plate's RIGHT edge — the figure
 * this role contributes to the team power printed in the sigil's core, so the
 * sum in the middle can be read back to the five nodes it came from.
 *
 * Sized against every value the ladder can actually produce, measured in the
 * font rather than estimated: main 0–MAX_STAR_LEVEL stars × SIGIL_POWER_PER_STAR
 * plus ALLIES_PER_ROLE × 0–MAX_STAR_LEVEL × SIGIL_ALLY_POWER_PER_STAR is 54
 * distinct figures, and the widest of them at 16px is "300" at 30.3px — not the
 * cap (1350), which `formatNumberCompact` shortens to a narrow "1.4K" (27px).
 * 36 = 31 + the tab's 2px of padding either side, with a pixel to spare.
 */
export const SIGIL_NODE_POWER_TAB_WIDTH = 36

/** From this star level the plate itself takes the tier's tint and outline. */
export const SIGIL_TIER_CROWN_MIN_STAR = 4
/** From this star level the plate carries a glow in the tier's own colour. */
export const SIGIL_TIER_AUREOLE_MIN_STAR = 5
/** Travel period (ms) of the sheen crossing the apex tier's rank tab. */
export const SIGIL_TIER_AUREOLE_MS = 4200

// ── Board actions (shop / expedition, right edge of the board) ───────────────
/**
 * Below this board width (px) the two right-edge actions step down one size.
 * The board keeps whatever an open rail leaves it — at Full HD that is 340 px,
 * and the full-size column (288 px) would cover both the admin strip and the
 * foot of the sigil. Wider boards — 2K with a rail open, any resolution with
 * none — keep the full size. The trigger is the board, not the viewport, so it
 * has to be a class the component sets rather than a media query.
 */
export const SIGIL_ACTIONS_COMPACT_MAX_W = 520

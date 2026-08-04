// Die Sonne selbst: Radius und Wachstumsstufen, die elf Sternphasen von der
// Kometen-Herkunft bis zum Schwarzen Loch, sowie die Solar-Upgrades.

/** Dauer der Stauch-Rückmeldung beim Klick auf die Sonne. */
export const SUN_CLICK_PUNCH_MS = 260

/** Durchmesser des Klick-Ripples als Vielfaches des Sonnenradius. */
export const SUN_CLICK_RIPPLE_SUN_FACTOR = 2.4

/** Nachlauf der Sonnen-Evolution, bis die neue Phase im Store steht. */
export const SUN_EVOLVE_TRANSITION_MS = 2500

// ── Sonnen-Horizont im Star-Fight-Modal ──────────────────────────────────────
// Die eigene Sonne (= der Spieler) steht als Kreiskalotte am unteren Arena-Rand:
// die Silhouette ist immer ein echter KREISBOGEN, der Mittelpunkt der Scheibe
// liegt je nach Phase auf oder unter dem Arena-Boden. Der Comet ist eine kleine
// exakte Halbkreis-Kuppe, mit jeder Sonnenphase wächst die Breite, bis die
// Finale-Sonne die gesamte Arenabreite füllt und nur noch ihr oberster
// Horizontbogen sichtbar ist. Die Champion-Row sitzt darüber, HP-Leiste dazwischen.
/**
 * Sichtbare HÖHE der Kalotte über dem unteren Arena-Rand (Kammhöhe). Bewusst als
 * geklemmtes PX-Band statt in Prozent: die Info-Plates der Champion-Row sind
 * px-groß, ein prozentuales Band würde auf Full-HD in sie hineinlaufen und auf
 * 4K unnötig viel Platz verschenken. Die Höhe ist der knappe Wert — gewachsen
 * wird über die BREITE (SUN_HORIZON_WIDTH_*).
 */
export const SUN_HORIZON_BAND_MIN_PX = 84
export const SUN_HORIZON_BAND_PCT = 11.5
export const SUN_HORIZON_BAND_MAX_PX = 260
/**
 * Breite der Kalotte in % der Arena-BREITE: der Comet ist die schmalste Kuppe,
 * die Finale-Sonne füllt die volle Breite. Untergrenze ist zusätzlich
 * SUN_HORIZON_DOME_WIDTH_FACTOR × Höhe — schmaler als ein exakter Halbkreis
 * wird die Kuppel nie (sonst stünde eine hohe, spitze Kuppe am Boden).
 */
export const SUN_HORIZON_WIDTH_MIN_PCT = 13
export const SUN_HORIZON_WIDTH_MAX_PCT = 100
export const SUN_HORIZON_DOME_WIDTH_FACTOR = 2
/**
 * Sichtbare Höhe als Faktor auf SUN_HORIZON_BAND_*: der Comet bleibt flacher
 * und gibt der Champion-Row Luft, die Finale-Sonne füllt das ganze Band. Alle
 * Anker (HP-Leiste, Zielscheibe, Bolt-Ziel, Floats) hängen an dieser Höhe.
 */
export const SUN_HORIZON_CREST_MIN_FACTOR = 0.78
export const SUN_HORIZON_CREST_MAX_FACTOR = 1
/**
 * Glutsaum auf der Silhouette und Hotspot in der Kammmitte skalieren mit der
 * Kuppel. Feste px-Werte würden auf der arenabreiten Finale-Sonne wie ein
 * aufgelegter Draht bzw. ein verlorener Fleck wirken.
 */
export const SUN_HORIZON_RIM_FACTOR = 0.09
export const SUN_HORIZON_RIM_MIN_PX = 5
/**
 * Weicher Limbus. Ein geometrisch harter Schnitt ergibt auf der fast waagerechten
 * Silhouette der breiten Phasen zwangsläufig eine sichtbare Treppe: pro Pixelspalte
 * gibt es nur ~1 px Übergang, bei einem Helligkeitssprung von >200 Stufen fällt
 * jede Stufe ins Auge (gemessen: 40 % der Spalten ohne jeden Zwischenwert —
 * unabhängig davon, ob per mask, clip-path oder SVG geschnitten wird).
 *
 * Deshalb läuft die Maske über SUN_HORIZON_SOFT_FACTOR × Saumbreite aus, und die
 * Box ragt um SUN_HORIZON_PAD_FACTOR × Saumbreite über den Kamm hinaus, damit
 * dieser Auslauf auch am Scheitel Platz hat. Zusätzlich sitzt der helle Glutsaum
 * bewusst INNEN — direkt an der Schnittkante liegt die dunkle Saumfarbe, deren
 * Kontrast zum Arena-Hintergrund gering ist.
 */
export const SUN_HORIZON_SOFT_FACTOR = 0.45
export const SUN_HORIZON_SOFT_MIN_PX = 2.5
export const SUN_HORIZON_PAD_FACTOR = 1.4
export const SUN_HORIZON_PAD_MIN_PX = 10
/** Halbe Breite des Glut-Halos, der die Silhouette von außen überstrahlt. */
export const SUN_HORIZON_LIMB_GLOW_FACTOR = 1.8
export const SUN_HORIZON_LIMB_GLOW_MIN_PX = 8
/**
 * Waagerechte Ausdehnung der Kernschattierung, geklemmt auf
 * SUN_HORIZON_BODY_RX_FACTOR × Kammhöhe (nie mehr als die halbe Kuppelbreite).
 * Bei den schmalen Phasen liegt der Verlauf damit konzentrisch zur Kuppel und
 * die Sonne wirkt kugelig; bei den breiten Phasen bleibt der heiße Kern in der
 * Mitte, statt die ganze untere Hälfte flächig weiß auszuwaschen.
 */
export const SUN_HORIZON_BODY_RX_FACTOR = 2.2
export const SUN_HORIZON_HOTSPOT_WIDTH_FACTOR = 0.3
export const SUN_HORIZON_HOTSPOT_HEIGHT_FACTOR = 2.6
/**
 * Korona-Halo: der Schein reicht SUN_HORIZON_GLOW_SPREAD_FACTOR × Kammhöhe über
 * die Kuppelbreite hinaus und GLOW_HEIGHT_FACTOR × Kammhöhe in die Arena.
 * Bewusst an der Höhe statt an der Breite orientiert — sonst würde die
 * Finale-Sonne einen arenaweiten, flächigen Schleier legen.
 */
export const SUN_HORIZON_GLOW_SPREAD_FACTOR = 3.2
export const SUN_HORIZON_GLOW_HEIGHT_FACTOR = 2.2
/**
 * HP-Streifen: wächst mit der Kuppel, bleibt aber ein HUD-Element — bei der
 * arenabreiten Finale-Sonne darf er nicht mitskalieren.
 */
export const SUN_HORIZON_HP_WIDTH_FACTOR = 0.4
export const SUN_HORIZON_HP_MIN_WIDTH_PX = 160
export const SUN_HORIZON_HP_MAX_WIDTH_PX = 420
/** Abstand zwischen Kamm und HP-Streifen (px, auflösungsunabhängig). */
export const SUN_HORIZON_HP_GAP_PX = 10
/** Lebensdauer des Crest-Aufleuchtens, wenn die Sonne getroffen wird (ms). */
export const SUN_HORIZON_HIT_FLASH_MS = 420
/** Lebensdauer eines Schadens-Floats über dem Sonnen-Kamm (ms). */
export const SUN_HORIZON_FLOAT_MS = 1200

/** Visual radius of the sun in pixels. All ORBIT_TIERS dimensions scale relative to this value. */
export const SUN_RADIUS = 80

/**
 * Background idle-scene sun disc diameter as a multiple of the current sun radius.
 * Matches the visible core (~4r) and the chime click target (currentSunRadius * 4),
 * so the shared phase disc stays aligned with the chime button and champion orbits.
 */
export const SUN_BG_DISC_RADIUS_FACTOR = 4

/**
 * Zielscheiben-Durchmesser über der Idle-Orbit-Sonne, wenn der Boss den Spieler
 * mit "Strike" anvisiert — als Vielfaches des Sonnenradius. Bewusst etwas
 * größer als SUN_BG_DISC_RADIUS_FACTOR, damit das Reticle die Sonnenscheibe
 * sichtbar umschließt statt auf ihr zu liegen.
 */
export const SUN_AIM_LOCK_RADIUS_FACTOR = 4.8

export interface SunGrowthStage {
  stage: number
  chimesThreshold: number
  radius: number
  label: string
}

/** Sun growth stages — thresholds match planet slot costs so stage N is met when slot N becomes affordable. */
export const SUN_GROWTH_STAGES: SunGrowthStage[] = [
  { stage: 0, chimesThreshold: 0, radius: 34, label: 'Nascent' },
  { stage: 1, chimesThreshold: 500, radius: 44, label: 'Kindling' },
  { stage: 2, chimesThreshold: 2000, radius: 56, label: 'Radiant' },
  { stage: 3, chimesThreshold: 8000, radius: 72, label: 'Blazing' },
  { stage: 4, chimesThreshold: 35000, radius: 92, label: 'Scorching' },
  { stage: 5, chimesThreshold: 150000, radius: 116, label: 'Stellar' },
  { stage: 6, chimesThreshold: 600000, radius: 144, label: 'Collapse' },
]

// Solar Upgrade Tree
export const SOLAR_STAR_SPEED_BONUS = 0.35
export const SOLAR_FLIGHT_BASE_COST = 200
export const SOLAR_FLIGHT_MULTIPLIER = 1.6
export const SOLAR_HP_BASE_COST = 150
export const SOLAR_HP_MULTIPLIER = 1.5
export const SOLAR_CPC_BASE_COST = 50
export const SOLAR_CPC_MULTIPLIER = 1.5
export const SOLAR_CPS_BASE_COST = 50
export const SOLAR_CPS_MULTIPLIER = 1.5
export const SOLAR_DMG_BASE_COST = 200
export const SOLAR_DMG_MULTIPLIER = 1.6
export const SOLAR_MAX_LEVELS = 6
export const SOLAR_HP_PER_LEVEL = 25
export const SOLAR_CPS_PER_LEVEL = 20
export const SOLAR_CPC_PER_LEVEL = 2
export const SOLAR_CPS_FLIGHT_BONUS = 0.1
export const SOLAR_DMG_BONUS = 0.25

/**
 * Die fünf Kernstrahlen der Sonne — Name, Glyph und Farbe.
 *
 * Sie sind das zweite Tor jeder Sternentwicklung (`branchesReadyForEvolve`
 * verlangt JEDEN Strahl auf mindestens `starPhase + 1`), und genau deshalb
 * stehen sie an zwei Stellen: als Wurzeln im Star-Forge-Baum und als
 * Bedingungsliste im Sternen-Tooltip des Headers. Eine zweite Kopie der Namen
 * würde beim nächsten Umbenennen unweigerlich auseinanderlaufen.
 *
 * Die Winkel der Wurzeln stehen NICHT hier, sondern als
 * `FORGE_ROOT_ANGLES_DEG` in `forge.ts` — sie sind Layout des Baums, keine
 * Eigenschaft des Strahls. Die Reihenfolge hier ist die Lesereihenfolge der
 * Liste, nicht die des Rings.
 */
export const SOLAR_BRANCHES = [
  {
    id: 'flightSpeed',
    name: 'Flight Speed',
    icon: 'game-icons:feathered-wing',
    color: '#e8c040',
    statLabel: 'CpS Mult.',
  },
  {
    id: 'maxHp',
    name: 'Max HP',
    icon: 'game-icons:health-increase',
    color: '#e05050',
    statLabel: 'HP Bonus',
  },
  {
    id: 'chimesPerClick',
    name: 'Chimes / Click',
    icon: 'game-icons:gold-nuggets',
    color: '#52b830',
    statLabel: 'CpC Bonus',
  },
  {
    id: 'chimesPerSecond',
    name: 'Chimes / Sec',
    icon: 'game-icons:metronome',
    color: '#e89840',
    statLabel: 'CpS Bonus',
  },
  {
    id: 'dmgPerClick',
    name: 'DMG / Click',
    icon: 'game-icons:fist',
    color: '#c060a0',
    statLabel: 'Dmg Mult.',
  },
] as const

// Star Evolution Phases (replaces chimes-threshold radius system)
export interface StarPhaseData {
  /** Unique Bardle name — one word, so it always fits the header without truncation */
  name: string
  /** Scientific star-phase term, shown as secondary context (tooltips) */
  astroName: string
  radius: number
  core: string
  mid: string
  edge: string
  glow1: string
  glow2: string
  glow3: string
  phasePrimary: string
  phaseGlow: string
  factor: number
  pulseSpeed: string
}

/** Minimum time (seconds) the sun must spend in each phase before it may evolve
 *  to the next one — index = current starPhase (evolutions 0→1 … 4→5).
 *  Ramp: 10min, 30min, 1.5h, 4h, 24h. Future upgrades can shorten these via
 *  solarUpgradeStore.dwellTimeMultiplier. */
export const STAR_PHASE_MIN_DWELL_SECONDS = [600, 1_800, 5_400, 14_400, 86_400]

export const STAR_PHASE_DATA: StarPhaseData[] = [
  {
    name: 'Spark',
    astroName: 'Protostar',
    radius: 38,
    core: '#fff0e0',
    mid: '#ffd4a3',
    edge: '#cc5500',
    glow1: '#ff8c42',
    glow2: '#cc5500',
    glow3: '#882200',
    phasePrimary: '#ffd4a3',
    phaseGlow: '#ff8c42',
    factor: 0.9,
    pulseSpeed: '4s',
  },
  {
    name: 'Prelude',
    astroName: 'Main Sequence (Young)',
    radius: 50,
    core: '#ffffff',
    mid: '#a8d8ff',
    edge: '#3a70c0',
    glow1: '#7bb8ff',
    glow2: '#4a90d9',
    glow3: '#2050a0',
    phasePrimary: '#a8d8ff',
    phaseGlow: '#7bb8ff',
    factor: 1.0,
    pulseSpeed: '5s',
  },
  {
    name: 'Crescendo',
    astroName: 'Main Sequence (Mature)',
    radius: 64,
    core: '#fffce0',
    mid: '#fff176',
    edge: '#d4a000',
    glow1: '#ffd600',
    glow2: '#cc9900',
    glow3: '#886600',
    phasePrimary: '#fff176',
    phaseGlow: '#ffd600',
    factor: 1.1,
    pulseSpeed: '5s',
  },
  {
    name: 'Swell',
    astroName: 'Subgiant',
    radius: 84,
    core: '#fff0c0',
    mid: '#ffb347',
    edge: '#cc5500',
    glow1: '#ff8c00',
    glow2: '#cc5500',
    glow3: '#882200',
    phasePrimary: '#ffb347',
    phaseGlow: '#ff8c00',
    factor: 1.2,
    pulseSpeed: '4s',
  },
  {
    name: 'Requiem',
    astroName: 'Red Giant',
    radius: 110,
    core: '#ffb0b0',
    mid: '#ff4d4d',
    edge: '#990000',
    glow1: '#cc0000',
    glow2: '#880000',
    glow3: '#440000',
    phasePrimary: '#ff4d4d',
    phaseGlow: '#cc0000',
    factor: 1.35,
    pulseSpeed: '3s',
  },
  {
    // The star does not keep burning — it collapses. Reached through a one-shot
    // supernova (see SUPERNOVA_* below), the sun spends this final phase as a
    // black hole: an opaque event-horizon shadow inside a tilted accretion disc.
    // core/mid/edge describe the DISC, not a plasma body — every renderer that
    // draws the final phase reads BLACK_HOLE_* for the geometry on top of them.
    name: 'Collapse',
    astroName: 'Black Hole',
    radius: 140,
    core: '#ffffff',
    mid: '#c8a2ff',
    edge: '#6a12b8',
    glow1: '#b45cff',
    glow2: '#7412c8',
    glow3: '#2c0655',
    phasePrimary: '#d9b6ff',
    phaseGlow: '#b45cff',
    factor: 1.6,
    pulseSpeed: '1.5s',
  },
]

/** Index of the final star phase — the collapsed one (Black Hole). Everything
 *  that needs to ask "is the sun a black hole?" compares against this instead of
 *  hard-coding 5, so adding a phase later cannot silently split the check. */
export const STAR_PHASE_FINAL_INDEX = STAR_PHASE_DATA.length - 1

// ── Collapse phase geometry (Black Hole) ─────────────────────────────────────
/**
 * The final phase is drawn by BlackHoleDisc.vue (CSS) and by drawBlackHole()
 * (minimap canvas). Both read the SAME fractions from here so the silhouette is
 * identical at 560 px in the idle orbit and at 9 px on the minimap.
 *
 * Every *_FRACTION is a fraction of the rendered box WIDTH (= the diameter the
 * old plasma disc would have had), so the black hole slots into the existing
 * `diameter` contract of PhaseSunDisc / CometDisc without touching any layout.
 *
 * Layer order, outside → in:
 *   jets · lensed halo arc · disc far half · shadow + photon ring · disc near half
 */
/** Opaque event-horizon shadow. Pure black — it is the only fully opaque part,
 *  and the reason a planet passing behind the sun still gets occluded. */
export const BLACK_HOLE_SHADOW_FRACTION = 0.36
/** Photon ring thickness — the light orbiting right at the horizon. Thin on
 *  purpose: it is the brightest thing on screen, a fat ring reads as a donut. */
export const BLACK_HOLE_PHOTON_RING_FRACTION = 0.014
/** Inner edge of the accretion disc. Sits just outside the photon ring so a
 *  sliver of black stays visible between horizon and disc. */
export const BLACK_HOLE_DISC_INNER_FRACTION = 0.46
/** Vertical squash of the disc plane (scaleY). 1 = face-on, 0 = edge-on.
 *  The near half's inner edge crosses the shadow at
 *  `DISC_INNER * TILT / SHADOW` of the shadow's radius — at these values ~74 %,
 *  so the disc sweeps across the lower quarter of the hole. Flatter than this
 *  and it slices the shadow in half instead of orbiting it. */
export const BLACK_HOLE_DISC_TILT = 0.58
/** Seconds for one revolution of the disc's plasma texture. */
export const BLACK_HOLE_DISC_SPIN_SEC = 16
/** Diameter of the lensed halo arc — the far side of the disc, bent up over the
 *  top of the hole (and under the bottom) by gravity. */
export const BLACK_HOLE_HALO_FRACTION = 0.72
/** Relativistic beaming: the disc side rotating TOWARDS the viewer is boosted,
 *  the receding side dimmed. 0 = symmetric, 1 = one side blacked out. */
export const BLACK_HOLE_DOPPLER_STRENGTH = 0.62
/** Polar jets — length measured from the centre, width at their base. */
export const BLACK_HOLE_JET_LENGTH_FRACTION = 0.92
export const BLACK_HOLE_JET_WIDTH_FRACTION = 0.16
export const BLACK_HOLE_JET_PULSE_SEC = 3.4
/** Debris spiralling in. Kept low — this runs in the always-visible idle orbit. */
export const BLACK_HOLE_INSPIRAL_COUNT = 4
export const BLACK_HOLE_INSPIRAL_SEC = 5.5
/**
 * Bridge for renderers that think in BODY RADIUS instead of box width — the
 * minimap draws the plasma sun as `arc(x, y, r)`, while every fraction above is
 * relative to the box the CSS disc lives in. In that CSS disc the opaque plasma
 * body reaches roughly 37 % of the box width, so a body of radius r corresponds
 * to a box of `r * this`. Multiply by it once, then the same fractions apply.
 */
export const BLACK_HOLE_BODY_TO_BOX_FACTOR = 2.7

// ── Sun phase display numbering ──────────────────────────────────────────────
// The Comet counts as display phase 1, so sun phases render as
// starPhase + SUN_PHASE_DISPLAY_OFFSET (Spark = 2 … Collapse = 7).
export const SUN_PHASE_DISPLAY_OFFSET = 2
export const SUN_PHASE_DISPLAY_TOTAL = STAR_PHASE_DATA.length + 1 // comet + sun phases

// ── Comet Origin State (pre-phase before Spark) ──────────────────────────────
/** The player's celestial body BEFORE its first ignition: a wandering comet with
 *  Bard asleep inside. Not part of STAR_PHASE_DATA on purpose — prepending there
 *  would shift every saved starPhase index. solarUpgradeStore.isCometState flags
 *  this origin state instead; the first Star Forge evolve ("Ignition") clears it. */
export const COMET_PHASE_DATA = {
  name: 'Comet',
  astroName: 'Rogue Planetesimal',
  core: '#8a7a68',
  mid: '#6b5d4f',
  edge: '#4a4038',
  crater: '#3a322b',
  /** Accent golds match Bard's UI gold (titles/chimes in the header, #e8c040). */
  glow: '#e8c040',
  accent: '#f0d878',
  dust: '#8a6420',
  tumbleSec: '14s',
  pulseSpeed: '6s',
} as const

/** Minimum drift time (seconds) before the comet may ignite into Spark. */
/** Comet growth per Star Forge core ray at Lv 1+ (index 0..5 = rays kindled).
 *  Radius stays well below Spark's 38 — ignition must feel like a jump. */
export const COMET_STAGE_RADII = [16, 18, 20, 22, 24, 26]

/** Orbit visuals (planet/champion/star orbits, sprites, ring strokes) grow slower
 *  than the sun itself. Up to the anchor radius (largest comet stage) they track
 *  the sun 1:1; above it every extra sun pixel only contributes
 *  ORBIT_SUN_GROWTH_FACTOR pixels of effective orbit radius. Keeps late star
 *  phases from crowding the viewport while orbits still grow every phase. */
export const ORBIT_SUN_SCALE_ANCHOR_RADIUS = COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1]

/** Gold-accent intensity per stage (0 = bare grey rock, 1 = fully gilded). */
export const COMET_STAGE_GOLD = [0, 0.2, 0.4, 0.6, 0.8, 1]

export const COMET_MIN_DWELL_SECONDS = 180

// ── Header star-evolution tooltip ──────────────────────────────────────────
/**
 * Etwas breiter als das Galaxie- und das Meep-Panel: die Lebenslauf-Schiene
 * trägt sieben Kugeln nebeneinander, und unter ~380px rücken deren Nummern so
 * eng zusammen, dass die Kette als Strich statt als Stufenfolge gelesen wird.
 */
export const STAR_EVOLUTION_TOOLTIP_WIDTH = 'clamp(380px, 22vw, 520px)'
/**
 * Marken des Sternen-Panels — jede genau einmal. Die fünf Kernstrahlen bringen
 * ihre eigenen Glyphen mit (`SOLAR_BRANCHES`); hier stehen nur die Dinge, für
 * die es keins gibt. Das Schloss ist ein Bedienzustand und kommt deshalb als
 * einziges aus `lucide` (siehe „Icons" in CLAUDE.md).
 *
 * Bewusst KEIN zweites Sanduhr-Motiv neben `gateTime`: die vier Zeitangaben
 * unterscheiden sich in Zahnrad, Stoppuhr und Uhr-mit-Plus, damit sie in der
 * zweispaltigen Zeilenliste nebeneinander unterscheidbar bleiben.
 */
export const STAR_EVOLUTION_TOOLTIP_ICONS = {
  gateTime: 'game-icons:hourglass',
  gateRays: 'game-icons:sun-radiations',
  ready: 'game-icons:star-swirl',
  blocked: 'lucide:lock',
  timeInPhase: 'game-icons:clockwork',
  totalAsStar: 'game-icons:star-altar',
  cometDrift: 'game-icons:comet-spark',
  longestPhase: 'game-icons:stopwatch',
  dwellPace: 'game-icons:extra-time',
  phasesBehind: 'game-icons:spiral-shell',
} as const
/** Background star drift is boosted by this factor while in comet state, selling
 *  the impression that the comet races through space. */
export const COMET_DRIFT_SPEED_MULT = 2.5
/** Parallax debris rocks streaming past the player on the background canvas. */
export const COMET_DEBRIS_COUNT = 3
export const COMET_DEBRIS_MIN_R = 3
export const COMET_DEBRIS_MAX_R = 9
/** Debris moves this much faster than regular background stars. */
export const COMET_DEBRIS_SPEED_MULT = 1.6

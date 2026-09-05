// Die Sonne selbst: Radius und Wachstumsstufen, die elf Sternphasen von der
// Kometen-Herkunft bis zum Schwarzen Loch, sowie die Solar-Upgrades.

/** Dauer der Stauch-Rückmeldung beim Klick auf die Sonne. */
export const SUN_CLICK_PUNCH_MS = 260
export const SUN_CLICK_TARGET_DIAMETER_FACTOR = 4

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
/** Blitz über der Scheibe im Orbit, wenn ein Treffer den Kurs stösst. */
export const SUN_HIT_FLASH_MS = 380
/** Lebensdauer eines Schadens-Floats über dem Sonnen-Kamm (ms). */
export const SUN_HORIZON_FLOAT_MS = 1200

// ── HP-Leiste über der Idle-Orbit-Sonne ────────────────────────────────
/**
 * Ihre Breite folgt dem Sonnenradius, geklemmt — dieselbe Form wie beim
 * HP-Streifen der Arena darüber, nur mit eigenen Zahlen: dort trägt die Kalotte
 * die Leiste, hier die freie Bühne.
 *
 * Sie steht hier und nicht als `clamp()` im scoped CSS von `PlayerHPBar.vue`,
 * weil die Regen-Schwelle unten an ihr hängt. Zwei Fassungen derselben Rechnung
 * — eine im Stylesheet, eine im Vergleich — laufen beim ersten Nachjustieren
 * auseinander, ohne dass es auffällt.
 */
export const SUN_ORBIT_HP_WIDTH_FACTOR = 3.5
/** Untergrenze: bei kleiner Sonne müssen Emblem, Wert, Trenner und Maximum
 *  nebeneinander IN den Balken passen. */
export const SUN_ORBIT_HP_MIN_WIDTH_PX = 240
export const SUN_ORBIT_HP_MAX_WIDTH_PX = 500
/**
 * Ab dieser Breite trägt die Leiste ihren DRITTEN Wert, die Regeneration.
 *
 * Die Schwelle hängt an der BREITE und nicht am Viewport: die Breite folgt dem
 * Sonnenradius, eine Media Query würde bei kleiner Sonne auf 4K das Falsche
 * messen und den Wert einblenden, wo kein Platz für ihn ist. (Der Profilkopf
 * staffelt umgekehrt — dort ist die Leiste fest breit und der Viewport das
 * einzige, was sich ändert.)
 */
export const SUN_ORBIT_HP_REGEN_MIN_WIDTH_PX = 290

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

/**
 * Sun growth stages.
 *
 * Von dieser Tabelle wird nur noch der RADIUS der letzten Stufe gelesen
 * (`useOrbitScale.ts:8`, als Obergrenze der Orbit-Skalierung). Die
 * `chimesThreshold`-Spalte hat keinen Verbraucher mehr — der Sonnenradius kommt
 * längst aus `STAR_PHASE_DATA` über `planetShopStore.currentSunRadius`.
 *
 * Hier stand einmal „thresholds match planet slot costs so stage N is met when
 * slot N becomes affordable". Das stimmt seit der Senkung der frühen Preise
 * (`PLANET_SLOT_CONFIG`, erster Slot 500 → 100) nicht mehr, und es stimmte auch
 * vorher nur zufällig: die Kopplung war nirgends erzwungen. Wer die Schwellen
 * wieder benutzen will, muss sie neu setzen — nicht an den alten Zahlen
 * ablesen.
 */
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
// Die fuenf Grundpreise wurden zusammen mit CHIMES_PER_CLICK_BASE (20 -> 1) um
// Faktor 5 gesenkt. Sie sind das Erste, worauf ein Spieler spart; blieben sie
// stehen, waere der Einstieg schlagartig zwanzigmal zaeher, ohne dass sich am
// Spiel etwas geaendert haette.
export const SOLAR_FLIGHT_BASE_COST = 40
export const SOLAR_FLIGHT_MULTIPLIER = 1.6
export const SOLAR_HP_BASE_COST = 30
export const SOLAR_HP_MULTIPLIER = 1.5
export const SOLAR_CPC_BASE_COST = 10
export const SOLAR_CPC_MULTIPLIER = 1.5
export const SOLAR_CPS_BASE_COST = 10
export const SOLAR_CPS_MULTIPLIER = 1.5
export const SOLAR_DMG_BASE_COST = 40
export const SOLAR_DMG_MULTIPLIER = 1.6
export const SOLAR_MAX_LEVELS = 6
export const SOLAR_HP_PER_LEVEL = 25
export const SOLAR_CPS_PER_LEVEL = 20
export const SOLAR_CPC_PER_LEVEL = 2
export const SOLAR_CPS_FLIGHT_BONUS = 0.1
export const SOLAR_DMG_BONUS = 0.25

/**
 * Ab welcher STUFE ein Kernstrahl zusätzlich Material verlangt.
 *
 * Die ersten drei Käufe bleiben reine Chime-Sache, und zwar aus zwei Gründen:
 * die Strahlpreise sind das Erste, worauf ein Spieler überhaupt spart
 * (docs/balance.md, „Die Wirtschaft"), und Material fällt erst, wenn ein Kader
 * unterwegs ist — Resource-Sterne spawnen nur bei
 * `championTravelState === 'traveling'`. Eine Materialforderung auf Lv 1 wäre
 * damit kein Preis, sondern eine geschlossene Tür.
 */
export const SOLAR_MATERIAL_FROM_LEVEL = 4

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
 *
 * `material`/`materialQty` sind die Rezeptur ab `SOLAR_MATERIAL_FROM_LEVEL`.
 * Je Strahl ein EIGENES Material, damit die fünf in der Liste als Signatur
 * lesbar bleiben — und nur solche mit Artwork, sonst stünde in der Kostenzeile
 * eine Zahl ohne Träger. `dark_matter` bleibt bewusst frei: es gehört den
 * Blättern. Die Menge steigt linear mit dem Abstand zur Schwelle (1/2/3), die
 * Seltenheit steckt in `materialQty` — gewöhnlich 3, ungewöhnlich 2, selten 1.
 */
export const SOLAR_BRANCHES = [
  {
    id: 'flightSpeed',
    name: 'Flight Speed',
    icon: 'game-icons:feathered-wing',
    color: '#e8c040',
    statLabel: 'CpS Mult.',
    material: 'stardust',
    materialQty: 3,
  },
  {
    id: 'maxHp',
    name: 'Max HP',
    icon: 'game-icons:health-increase',
    color: '#e05050',
    statLabel: 'HP Bonus',
    material: 'moon_crystal',
    materialQty: 3,
  },
  {
    id: 'chimesPerClick',
    name: 'Chimes / Click',
    icon: 'game-icons:gold-nuggets',
    color: '#52b830',
    statLabel: 'CpC Bonus',
    material: 'nebula_quartz',
    materialQty: 2,
  },
  {
    id: 'chimesPerSecond',
    name: 'Chimes / Sec',
    icon: 'game-icons:hourglass',
    color: '#e89840',
    statLabel: 'CpS Bonus',
    material: 'solar_essence',
    materialQty: 1,
  },
  {
    id: 'dmgPerClick',
    name: 'DMG / Click',
    icon: 'game-icons:fist',
    color: '#c060a0',
    statLabel: 'Dmg Mult.',
    material: 'void_shard',
    materialQty: 1,
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
 *  Ramp: 15min, 45min, 3.5h, 12h, 28h. Future upgrades can shorten these via
 *  solarUpgradeStore.dwellTimeMultiplier.
 *
 *  Die Sonne ist die einzige Achse des Spiels, die ehrlich eine UHR ist — hier
 *  kommt Länge aus Zeit, nicht aus Arbeit. Deshalb ist sie auch die einzige
 *  Stelle, an der bewusst nacktes Warten hinzugefügt wird.
 *
 *  Die ersten beiden Tore stehen unverändert: sie fallen in die erste
 *  Spielstunde, und das Frühspiel soll schnell bleiben. Gestreckt wird nur, was
 *  dahinter liegt — Summe 44,5 h nominal statt 21,3.
 *
 *  Warum nicht noch länger: die Achse schaltet Forge-Stufen, Planeten-Slots und
 *  Planeten-Level-Kappen frei. Wäre sie erst am Ende des Durchlaufs fertig,
 *  käme all das zu spät, um noch etwas zu bewirken. Sie soll bei etwa zwei
 *  Dritteln des Weges stehen, nicht am Schluss.
 *
 *  Und sie ist nicht das einzige, was in dieser Zeit läuft: Galaxien und Ladder
 *  laufen parallel darunter weiter, und in jeder Phase geht etwas Neues auf. */
export const STAR_PHASE_MIN_DWELL_SECONDS = [900, 2_700, 12_600, 43_200, 100_800]

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
    name: 'Dawn',
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
    name: 'Zenith',
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
    name: 'Pyre',
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
    // Thermisch wie M87: weissgluehender Innenrand, Gold, Glut am Aussenrand.
    // Identitaet der Phase ist „weissgluehend" — heller als Zenith-Gelb und
    // Swell-Orange, damit die Sieben-Kugel-Leiter unterscheidbar bleibt.
    name: 'Collapse',
    astroName: 'Black Hole',
    radius: 140,
    core: '#ffffff',
    mid: '#ffd08a',
    edge: '#c8461a',
    glow1: '#ffb464',
    glow2: '#a02c10',
    glow3: '#3a0c04',
    phasePrimary: '#fff4e0',
    phaseGlow: '#ffd08a',
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

/** Share of its box the comet's ROCK actually fills — the disc is inset so the
 *  tumbling silhouette has room, which a sun (glow to the very edge) does not
 *  need. Anything that places itself against the body's visible edge has to
 *  account for it, or it leaves a hole where a sun sits tight. Mirrors
 *  `.comet-rock { inset: 12% }` in CometDisc.vue — keep the two in sync. */
export const COMET_DISC_FILL = 0.76

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

// ── Star evolution: tooltip + evolve console ───────────────────────────────
/**
 * Etwas breiter als das Galaxie- und das Meep-Panel: die Lebenslauf-Schiene
 * trägt sieben Kugeln nebeneinander, und unter ~380px rücken deren Nummern so
 * eng zusammen, dass die Kette als Strich statt als Stufenfolge gelesen wird.
 */
export const STAR_EVOLUTION_TOOLTIP_WIDTH = 'clamp(380px, 22vw, 520px)'
/**
 * Marken der Sternentwicklung — jede genau einmal. Die fünf Kernstrahlen bringen
 * ihre eigenen Glyphen mit (`SOLAR_BRANCHES`); hier stehen nur die Dinge, für
 * die es keins gibt. Das Schloss ist ein Bedienzustand und kommt deshalb als
 * einziges aus `lucide` (siehe „Icons" in CLAUDE.md).
 *
 * Bewusst KEIN zweites Sanduhr-Motiv neben `gateTime`: die vier Zeitangaben
 * unterscheiden sich in Zahnrad, Stoppuhr und Uhr-mit-Plus, damit sie in der
 * zweispaltigen Zeilenliste nebeneinander unterscheidbar bleiben.
 *
 * Der Name sagt „Sternentwicklung", nicht „Tooltip": die Glyphen gehören dem
 * Thema, nicht dem Fenster. Die Evolve-Konsole im Bard-Stats-Tab zeigt
 * dieselben zwei Tore, kommt dort aber ohne Glyphen aus — auf ihren 15px
 * zerfallen `game-icons` zu Haarstrichen (siehe „Icons" in CLAUDE.md), und
 * die Wörter „Rays" und „Dwell" sind kürzer zu lesen als das Zeichen zu
 * entziffern. Wer sie dort doch wieder braucht, nimmt DIESE hier.
 */
export const STAR_EVOLUTION_ICONS = {
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

// ── Solar Signature — was der Wächter in die Sonne gesteckt hat, als Bild ────
/*
 * Die Sonne sagte bis hierher genau EINE Sache: in welcher Phase sie steht.
 * Rund 570 gedeckelte Käufe plus unbegrenzte Bough-Stufen liefen an ihr vorbei,
 * ohne eine einzige Bildänderung.
 *
 * Die Leiter darunter folgt `DRIFTER_FX_STAGES` und `CHAMPION_REGALIA_STAGES`:
 * eine Tabelle aus Zahlen und Schaltern, keine Formel im Renderer. Und sie
 * folgt deren Regel — die Eskalation läuft über Geometrie, Menge und
 * Helligkeit, NIE über eine zweite Farbe. Die Phasenfarbe bleibt die Leitfarbe;
 * die fünf Achsenfarben aus SOLAR_BRANCHES setzen nur Akzente. Sonst wird die
 * Sonne bunt statt reicher.
 *
 * Kein Wert hier hängt an einer ELEMENTZAHL. Die Motive wachsen ausschliesslich
 * in Werten, die eine bestehende Ebene mitnimmt (Gradientenstopps, Kachelmass,
 * Wiederholzahl eines statischen `repeating-conic-gradient`) — die Zahl der
 * DOM-Ebenen ist damit unabhängig davon, wie viel gekauft wurde.
 */

/**
 * Ab welchem Scheibendurchmesser (px) die Zierebenen überhaupt entstehen.
 *
 * Vorbild `CHAMPION_REGALIA_ORNAMENT_MIN_SIZE` / `DRIFTER_ORNAMENT_MIN_SIZE`,
 * und der Grund ist derselbe (Performance-Regel 7): eine Ebene, die keine zwei
 * Pixel breit ausfällt, ist unsichtbar und wird trotzdem voll bezahlt.
 *
 * 140 liegt ÜBER dem grössten Orbit-Kometen (26 × 4 = 104) und UNTER der
 * kleinsten Sternphase (Spark, 38 × 4 = 152) — der Komet trägt also nichts,
 * und zwar passend: vor der Zündung sind nur die fünf Strahlen kaufbar.
 * Der Shop liegt mit SHOP_SUN_MIN_DIAMETER (240) immer darüber.
 *
 * Geprüft wird IMMER gegen den autorisierten Durchmesser, nie gegen die
 * Bildschirmgrösse: der Shop skaliert die Bühne per Zoom, und eine Bedingung
 * an der Bildschirmgrösse baute die Ebenen bei jedem Zoomschritt ab und wieder
 * auf — ein Ruckler genau dort, wo der Spieler ohnehin zieht.
 */
export const SOLAR_SIGNATURE_MIN_DIAMETER = 140

/**
 * Sättigungskonstante je Achse: `t = 1 − e^(−levels/K)`.
 *
 * 26 ist an der gedeckelten Tiefe geeicht — eine Achse trägt 6 (Strahl) + 18
 * (Branch) + 15 (Leaf) + 12 (Ward) + 9 (Pact) + 3 (Crown) + 27…42 (Glimmer),
 * also rund 90–105 Stufen. Bei K = 26 steht ein voll ausgebauter Ast damit auf
 * t ≈ 0,97, während die ersten Käufe noch sichtbar etwas bewegen. Ring 7 ist
 * ungedeckelt; ohne diese Kurve stünde die Sonne nach ein paar hundert
 * Bough-Stufen auf einem Wert, den keine Tabelle mehr einholt.
 */
export const SOLAR_SIGNATURE_SATURATION_K = 26

/** Dasselbe für die achslose Grundsignatur — sie speist sich aus deutlich
 *  weniger Ereignissen (60 Relikt-Stufen + 13 Konstellationen + Aufbrüche). */
export const SOLAR_SIGNATURE_BASE_SATURATION_K = 14

export interface SolarSignatureStage {
  /** Ab wie vielen Stufen auf der Achse diese Zeile gilt. */
  minLevels: number
  /** Kernfunken (chimesPerClick): Deckkraft der hellen Punkte im Kern. */
  sparkAlpha: number
  /** Schutzsaum (maxHp): Breite als Anteil der Scheibe, und seine Deckkraft. */
  limbWidth: number
  limbAlpha: number
  /** Korona (maxHp): Deckkraft des dritten, äussersten Rings. */
  coronaAlpha: number
  /** Granulation (chimesPerSecond): Kachelmass in % der Scheibe — KLEINER
   *  heisst DICHTER. Und die Deckkraft der Zellstruktur. */
  granuleSizePct: number
  granuleAlpha: number
  /** Protuberanzen (dmgPerClick): Zahl der Bögen am Rand, ihre Höhe als Anteil
   *  der Scheibe und ihre Deckkraft. Die Zahl steuert die Wiederholung EINES
   *  statischen `repeating-conic-gradient`, nicht die Zahl der Elemente. */
  prominenceArcs: number
  prominenceHeight: number
  prominenceAlpha: number
  /** Sonnenwind (flightSpeed): Zuschlag auf `--line-power` in FlightMotes. */
  wakeBonus: number
}

/**
 * Sieben Stufen je Achse. Die Schwellen fallen so, dass die ersten drei im
 * frühen Spiel erreicht werden (die ersten Strahlen und Branches) und die
 * letzten beiden erst, wenn ein Ast wirklich ausgebaut ist.
 *
 * Stufe 0 ist die NACKTE Sonne: alle Werte auf 0, damit ein frischer Spielstand
 * exakt so aussieht wie vor diesem Feature.
 */
export const SOLAR_SIGNATURE_STAGES: SolarSignatureStage[] = [
  {
    minLevels: 0,
    sparkAlpha: 0,
    limbWidth: 0,
    limbAlpha: 0,
    coronaAlpha: 0,
    granuleSizePct: 0,
    granuleAlpha: 0,
    prominenceArcs: 0,
    prominenceHeight: 0,
    prominenceAlpha: 0,
    wakeBonus: 0,
  },
  {
    minLevels: 3,
    sparkAlpha: 0.14,
    limbWidth: 0.01,
    limbAlpha: 0.16,
    coronaAlpha: 0.06,
    granuleSizePct: 30,
    granuleAlpha: 0.05,
    prominenceArcs: 3,
    prominenceHeight: 0.03,
    prominenceAlpha: 0.14,
    wakeBonus: 0.06,
  },
  {
    minLevels: 9,
    sparkAlpha: 0.22,
    limbWidth: 0.014,
    limbAlpha: 0.22,
    coronaAlpha: 0.1,
    granuleSizePct: 25,
    granuleAlpha: 0.07,
    prominenceArcs: 5,
    prominenceHeight: 0.042,
    prominenceAlpha: 0.19,
    wakeBonus: 0.11,
  },
  {
    minLevels: 20,
    sparkAlpha: 0.3,
    limbWidth: 0.018,
    limbAlpha: 0.28,
    coronaAlpha: 0.14,
    granuleSizePct: 21,
    granuleAlpha: 0.09,
    prominenceArcs: 7,
    prominenceHeight: 0.054,
    prominenceAlpha: 0.24,
    wakeBonus: 0.16,
  },
  {
    minLevels: 36,
    sparkAlpha: 0.38,
    limbWidth: 0.022,
    limbAlpha: 0.34,
    coronaAlpha: 0.18,
    granuleSizePct: 18,
    granuleAlpha: 0.11,
    prominenceArcs: 9,
    prominenceHeight: 0.066,
    prominenceAlpha: 0.29,
    wakeBonus: 0.21,
  },
  {
    minLevels: 58,
    sparkAlpha: 0.46,
    limbWidth: 0.026,
    limbAlpha: 0.4,
    coronaAlpha: 0.22,
    granuleSizePct: 15,
    granuleAlpha: 0.13,
    prominenceArcs: 11,
    prominenceHeight: 0.078,
    prominenceAlpha: 0.34,
    wakeBonus: 0.27,
  },
  {
    minLevels: 86,
    sparkAlpha: 0.55,
    limbWidth: 0.03,
    limbAlpha: 0.46,
    coronaAlpha: 0.27,
    granuleSizePct: 12,
    granuleAlpha: 0.15,
    prominenceArcs: 13,
    prominenceHeight: 0.092,
    prominenceAlpha: 0.4,
    wakeBonus: 0.34,
  },
]

export interface SolarSignatureBaseStage {
  minLevels: number
  /** Wie hell der weisse Kern-Hotspot wird (Anteil, 0 = unverändert). */
  coreLift: number
  /** Zuschlag auf die Korona-Deckkraft. */
  coronaLift: number
  /** Zuschlag auf die Vergoldung des Kometen. */
  cometGoldLift: number
}

/**
 * Die achslose Grundsignatur: Relikte, Konstellationen und Aufbrüche.
 *
 * Sie bekommt bewusst KEINE eigene Ebene. Ein Relikt nennt keinen `parentId`,
 * sondern `requires` — es einer Achse zuzuschlagen wäre geraten, nicht
 * abgeleitet. Also hebt sie zwei Werte, die es ohnehin gibt: den weissen
 * Kern-Hotspot und die Korona. Im Schwarzen Loch fällt sie auf `--bh-core`.
 */
export const SOLAR_SIGNATURE_BASE_STAGES: SolarSignatureBaseStage[] = [
  { minLevels: 0, coreLift: 0, coronaLift: 0, cometGoldLift: 0 },
  { minLevels: 2, coreLift: 0.03, coronaLift: 0.03, cometGoldLift: 0.04 },
  { minLevels: 6, coreLift: 0.06, coronaLift: 0.06, cometGoldLift: 0.08 },
  { minLevels: 14, coreLift: 0.09, coronaLift: 0.09, cometGoldLift: 0.12 },
  { minLevels: 26, coreLift: 0.12, coronaLift: 0.12, cometGoldLift: 0.16 },
  { minLevels: 44, coreLift: 0.15, coronaLift: 0.15, cometGoldLift: 0.2 },
]

/**
 * Wie stark die fünf Achsen das Schwarze Loch verändern.
 *
 * Es bekommt KEINE neue Ebene — jede der fünf hat dort schon eine
 * parametrisierte Custom Property, und die Faktoren hier sind ihr Zuschlag bei
 * t = 1. `BLACK_HOLE_INSPIRAL_COUNT` bleibt ausdrücklich fest: eine an die
 * Signatur gehängte Elementzahl wäre genau die Kosten, die dieses Feature
 * ausschliesst.
 */
export const SOLAR_SIGNATURE_BH_JET_GAIN = 0.45
export const SOLAR_SIGNATURE_BH_RING_GAIN = 0.35
export const SOLAR_SIGNATURE_BH_HALO_GAIN = 0.22
export const SOLAR_SIGNATURE_BH_MOTE_GAIN = 0.4
export const SOLAR_SIGNATURE_BH_INNER_GAIN = 0.28
export const SOLAR_SIGNATURE_BH_DOPPLER_GAIN = 0.3

/**
 * Der Kaufblitz. Übernommen von `FORGE_SUN_FLASH_MS`, das ihn als lokale Sache
 * des Forge-Panels führte — jetzt gehört er der Sonne selbst, damit ihn der
 * Idle-Orbit auch bekommt.
 */
export const SOLAR_SIGNATURE_PULSE_MS = 500

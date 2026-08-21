import type { ForgeBridgeDef, ForgeClusterDef } from '@/types'

// ═════════════════════════════════════════════════════════════════════════════
// STAR FORGE — die KARTE
//
// Wo ein Knoten steht, sagt diese Datei. Was er tut, sagt `starForge.ts`.
//
// Bis zum Umbau stand beides im Katalog: jeder Knoten trug einen `angleDeg`,
// und seine Entfernung folgte aus seinem Ring. Fünfzehn Winkel im 24°-Raster,
// sieben konzentrische Kreise — der Baum war ein Zifferblatt, und er hatte drei
// Fehler, die alle aus derselben Form kamen:
//
//   • Zwischen zwei Ringen blieben 12–13 px Luft, und mehr war nicht zu holen.
//   • Die drei Speichen einer Achse lagen nebeneinander, also trug ein
//     72°-Sektor über alle Ringe genau EINE Aussage. Bei `dmgPerClick` waren
//     das 18 Knoten Kampf, Boss und Ladder am Stück.
//   • Eine Krone verlangte Knoten, die 200 px weiter innen standen — bei
//     Standardzoom nie gleichzeitig im Bild.
//
// ── Was an die Stelle des Rasters tritt ──────────────────────────────────────
//
// **Cluster.** Ein Cluster ist ein ORT mit einem Thema, und die Ketten des
// Baums laufen HINDURCH statt darauf entlang. Er trägt die Sonnenphase, die
// seine Mitte öffnet — aber weil seine Nachbarn in beide Richtungen überlappen,
// entsteht daraus kein Kreis, sondern ein Feld.
//
// **Und er greift über Achsgrenzen.** Das ist der Kern: ein Cluster liegt
// ZWISCHEN zwei Solar Rays und nimmt Knoten von beiden. Damit steht neben dem
// Kampf die Wirtschaft, neben der Bewahrung die Reise — ohne dass ein einziger
// `parentId` sich ändern müsste. Die Durchmischung ist eine Frage der Karte,
// nicht des Katalogs.
//
// **Eine Paarung ist ausgenommen: Chimes/Click neben Chimes/Sec.** Die beiden
// sind im Ring Nachbarn, würden sich also von selbst treffen — und ein Ort, der
// beide Wirtschaftsachsen trägt, liest sich als EIN Knoten statt als zwei Wege.
// Bis Zone 2 hält die Karte sie deshalb auseinander, auch um den Preis, dass
// dort drei Orte nur eine Achse tragen. `FORGE_CHIME_SPLIT_MAX_PHASE` sagt, wie
// weit das reicht und warum nicht weiter.
//
// ── Die fünf Ebenen und ihr Versatz ──────────────────────────────────────────
//
// Fünf Cluster je Zone, und jede Zone steht um rund 34° gegen die darunter
// verdreht. Ein Cluster hat dadurch IMMER zwei Nachbarn in der Zone unter sich
// statt einen darüberliegenden — die Verbindungslinien laufen im Zickzack statt
// radial, und genau das nimmt dem Bild die Speiche.
//
// ── Wovon ein Cluster nur noch die RICHTUNG kennt ────────────────────────────
//
// Hier standen drei weitere Zahlen je Cluster: `dist` (Entfernung), `radius`
// (Streuung) und `shape` (knot/chain/fan). Alle drei sind gefallen, und der
// Grund ist eine Messung: der Median aller Nächster-Nachbar-Abstände lag bei
// exakt 22,0 px — dem Anschlag selbst — während anderswo 112 px frei blieben.
//
// Die Ursache war `radius`. Ein Kreis mit Radius 104 fasst neun Knoten nur,
// wenn sie sich berühren; gleichzeitig belegten die fünf Cluster der ersten
// Zone nur 820 px von 1.885 px Ringumfang. Innen gedrängt, dazwischen leer.
//
// Ein Cluster ist deshalb kein Kreis mehr, sondern ein **RINGABSCHNITT**:
// radial das Band seiner Phase (`FORGE_ZONE_BAND`), tangential sein Anteil am
// Umfang (360° / Cluster dieser Phase, mal `FORGE_CLUSTER_SECTOR_SPREAD`).
// Beides folgt aus Zahlen, die es ohnehin gibt. Übrig bleibt hier `angleDeg` —
// die Richtung, in der ein Cluster liegt, und sonst nichts über seinen Ort.
//
// Gemessen danach: Median 55 px, Minimum 44, Variationskoeffizient 0,13.
//
// ── Was diese Datei NICHT entscheidet ────────────────────────────────────────
//
// Die genaue Position eines einzelnen Knotens. Sie nennt den Cluster, seine
// Richtung und die Reihenfolge darin; `utils/ui/forgeTreeLayout.ts` macht
// daraus Punkte und entspannt sie gegeneinander, bis jede Kante kurz, jedes
// Paar frei und der Abstand überall derselbe ist. Handgesetzte Koordinaten für
// 155 Knoten wären 155 Behauptungen, die niemand nachrechnen kann.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Die fünfundzwanzig Zonen des Netzes, von innen nach aussen.
 *
 * `phase` ist die Sonnenphase, die den Cluster öffnet — die Leiter aus
 * `docs/balance.md` steht unverändert, sie ist nur nicht mehr rund. Die
 * Mitgliederliste ist die EINE Stelle, an der die Zuordnung Knoten → Ort steht;
 * im Knoten geführt wäre sie dieselbe Angabe an 155 Stellen.
 */
export const FORGE_CLUSTERS: readonly ForgeClusterDef[] = [
  // ── Zone 1 · Spark — die Zweige ────────────────────────────────────────────
  // Sie liegen ZWISCHEN zwei Solar Rays und nehmen von beiden — ausser wo die
  // Chime-Trennung dazwischenfährt: `sunlitQuarry` trägt nur Chimes/Click,
  // `tidefall` nur Chimes/Sec, und was dadurch frei wird, fällt an die Nachbarn.
  // Deshalb sind die fünf hier verschieden gross.
  {
    id: 'emberReach',
    title: 'Ember Reach',
    phase: 0,
    angleDeg: 8,
    accent: '#e0784a',
    members: ['aegis', 'wardensVigil', 'regeneration', 'goldenEcho', 'emberTithe', 'vigilSpark'],
  },
  {
    id: 'sunlitQuarry',
    title: 'Sunlit Quarry',
    phase: 0,
    angleDeg: 74,
    accent: '#e8c040',
    members: ['gildedHarvest', 'resonance', 'sunlitDust'],
  },
  {
    id: 'tidefall',
    title: 'Tidefall',
    phase: 0,
    angleDeg: 139,
    accent: '#58c0d0',
    members: [
      'cometMiner',
      'quarryGleam',
      'tidalDrift',
      'tideEcho',
      'quickening',
      'hourGrain',
    ],
  },
  {
    id: 'warmarch',
    title: 'War March',
    phase: 0,
    angleDeg: 212,
    accent: '#c06090',
    members: [
      'warcry',
      'sunderingWake',
      'shatter',
      'marchEmber',
      'solarSails',
      'sailSplinter',
    ],
  },
  {
    id: 'sailward',
    title: 'Sailward',
    phase: 0,
    angleDeg: 286,
    accent: '#88a8e8',
    members: ['wayfindersCache', 'moonOrbit', 'sailGlint', 'moonSilt'],
  },

  // ── Zone 2 · Dawn — die Blätter ────────────────────────────────────────────
  // Um 34° gegen die Zweige versetzt: ein Blatt-Cluster hängt an ZWEI
  // Zweig-Clustern, und die Blätter darin verstärken Zweige verschiedener
  // Achsen. Das Blatt bleibt dabei an SEINEM Zweig — die Verstärker-Mechanik
  // ist unangetastet, nur der Weg dorthin ist kein Speichenstück mehr.
  // Ausnahme ist `deepvein`: es nimmt allein von `tidefall`, weil sonst ein
  // Chimes/Click-Blatt neben den Chimes/Sec-Blättern läge.
  {
    id: 'gladehollow',
    title: 'Glade Hollow',
    phase: 1,
    angleDeg: 42,
    accent: '#7fd048',
    members: [
      'echoingBulwark',
      'starboundCore',
      'sunlitTrove',
      'echoChamber',
      'gladeSpark',
      'hollowGleam',
    ],
  },
  {
    id: 'deepvein',
    title: 'Deep Vein',
    phase: 1,
    angleDeg: 106,
    accent: '#d09848',
    members: ['deepVein', 'tidewake', 'veinGrain', 'wakeEmber'],
  },
  {
    id: 'stormwatch',
    title: 'Storm Watch',
    phase: 1,
    angleDeg: 176,
    accent: '#86d0ff',
    members: ['timeWeaver', 'warhost', 'riftshard', 'stormGlint', 'weftSilt'],
  },
  {
    id: 'duskmarch',
    title: 'Dusk March',
    phase: 1,
    angleDeg: 248,
    accent: '#b070c0',
    members: ['starquake', 'auroraWake', 'wanderersCrest', 'duskSpark', 'crestGleam'],
  },
  {
    id: 'moonwake',
    title: 'Moon Wake',
    phase: 1,
    angleDeg: 320,
    accent: '#90b8f0',
    members: ['midnightTide', 'vitalBloom', 'coinCascade', 'tideGrain', 'bloomEmber'],
  },

  // ── Zone 3 · Zenith — die Wachten ──────────────────────────────────────────
  // Wieder um 34° zurück, also fast über den Zweigen — aber 300 px weiter
  // draussen und mit anderen Nachbarn. Ab hier greift der Baum aus sich heraus:
  // Void-Takt, Drifter, Vorzeichen, Ladder, Bosse, Gebäudepreise.
  {
    id: 'crownfall',
    title: 'Crownfall',
    phase: 2,
    angleDeg: 10,
    accent: '#40c8b0',
    members: ['riftAnchor', 'starwardensLantern', 'merchantsFavor', 'anchorGlint', 'lanternSilt'],
  },
  {
    id: 'emberdeep',
    title: 'Ember Deep',
    phase: 2,
    angleDeg: 78,
    accent: '#e09858',
    members: ['almsOfTheKeeper', 'chimeConduit', 'almsSpark', 'conduitGrain'],
  },
  {
    id: 'ashenreach',
    title: 'Ashen Reach',
    phase: 2,
    angleDeg: 145,
    accent: '#98b0c8',
    members: [
      'kilnSubsidy',
      'omenReader',
      'quarrymastersEye',
      'heraldsFavor',
      'kilnGleam',
      'omenSilt',
    ],
  },
  {
    id: 'hollowgate',
    title: 'Hollow Gate',
    phase: 2,
    angleDeg: 215,
    accent: '#a878c8',
    members: ['hollowCore', 'siegeReckoning', 'pathfindersOath', 'coreEmber', 'oathGlint'],
  },
  {
    id: 'nightsail',
    title: 'Nightsail',
    phase: 2,
    angleDeg: 288,
    accent: '#7898d8',
    members: ['wanderersBeacon', 'dreamersDraw', 'gravityWell', 'beaconSpark', 'wellGrain'],
  },

  // ── Zone 4 · Swell — die Bündnisse ─────────────────────────────────────────
  {
    id: 'vaultward',
    title: 'Vaultward',
    phase: 3,
    angleDeg: 44,
    accent: '#8fa8ff',
    members: [
      'unbrokenPact',
      'wardensPact',
      'hagglersPact',
      'vaultGleam',
      'wardSilt',
      'haggleEmber',
    ],
  },
  {
    id: 'deeploom',
    title: 'Deep Loom',
    phase: 3,
    angleDeg: 112,
    accent: '#a0b0e0',
    members: [
      'merchantsPact',
      'resonantPact',
      'prospectorsPact',
      'loomGlint',
      'chordSpark',
      'lodeGrain',
    ],
  },
  {
    id: 'stormpact',
    title: 'Storm Pact',
    phase: 3,
    angleDeg: 180,
    accent: '#8098d0',
    members: ['foundersPact', 'augursPact', 'honoredPact', 'foundGleam', 'augurSilt', 'honorEmber'],
  },
  {
    id: 'duskpact',
    title: 'Dusk Pact',
    phase: 3,
    angleDeg: 252,
    accent: '#9888d8',
    members: [
      'patientPact',
      'arbitersPact',
      'cartographersPact',
      'patientGlint',
      'arbiterSpark',
      'chartGrain',
    ],
  },
  {
    id: 'moonpact',
    title: 'Moon Pact',
    phase: 3,
    angleDeg: 325,
    accent: '#8ca0e8',
    members: [
      'starroadPact',
      'longVigilPact',
      'hollowPact',
      'roadGleam',
      'vigilSilt',
      'hollowEmber',
    ],
  },

  // ── Zone 5 · Pyre und Collapse — Kronen und endlose Äste ───────────────────
  // Die äusseren fünf tragen ZWEI Phasen: Kronen (Pyre) und Boughs (Collapse)
  // hängen beide an denselben Bündnissen, und sie auseinanderzuziehen hiesse
  // eine Kette künstlich zu strecken. Ein Cluster mit zwei Phasen ist genau das,
  // wofür die Bänder überlappen.
  //
  // **Sie liegen ZWISCHEN Wacht- und Bündnis-Cluster**, nicht dahinter. Das ist
  // die Bedingung, unter der eine Krone ihre Voraussetzungen sehen kann: von
  // hier aus sind beide Zonen darunter in Reichweite, und die Zubringer stehen
  // im selben Bild wie die Krone, die sie fordert.
  {
    id: 'vaultsummit',
    title: 'Vault Summit',
    phase: 4,
    angleDeg: 26,
    accent: '#ffd76a',
    members: [
      'sealedThreshold',
      'stillpoint',
      'reclaimedBargain',
      'darkTithe',
      'kindledVigil',
      'brimmingCart',
      'summitSpark',
      'stillGrain',
      'cartGlint',
    ],
  },
  {
    id: 'loomspire',
    title: 'Loom Spire',
    phase: 4,
    angleDeg: 95,
    accent: '#ffcf5a',
    members: [
      'midasOverflow',
      'sanctumVeil',
      'tirelessQuarry',
      'gildedCascade',
      'deepResonance',
      'rivenLode',
      'spireGleam',
      'veilSilt',
      'quarryEmber',
    ],
  },
  {
    id: 'stormcrown',
    title: 'Storm Crown',
    phase: 4,
    angleDeg: 162,
    accent: '#f0c060',
    members: [
      'tidelessWatch',
      'unfailingSign',
      'steadfastTribute',
      'endlessTide',
      'worldsBounty',
      'eternalHost',
      'watchGlint',
      'signSpark',
      'tributeGrain',
    ],
  },
  {
    id: 'duskcrown',
    title: 'Dusk Crown',
    phase: 4,
    angleDeg: 232,
    accent: '#e8b878',
    members: [
      'sunderersMark',
      'rememberedWound',
      'pilgrimsAccord',
      'rendingArc',
      'undyingWrath',
      'driftersDue',
      'markGleam',
      'woundSilt',
      'accordEmber',
    ],
  },
  {
    id: 'mooncrown',
    title: 'Moon Crown',
    phase: 4,
    angleDeg: 306,
    accent: '#e0c890',
    members: [
      'wanderersGate',
      'homewardSky',
      'wardensReprieve',
      'wayfarersHoard',
      'sleeplessOrbit',
      'adamantCore',
      'gateGlint',
      'skySpark',
      'repriveGrain',
    ],
  },
]

/**
 * Die Wege OHNE Spiellogik.
 *
 * Sie schalten nichts frei und fordern nichts — sie werden gezeichnet und
 * ziehen im Layout wie jede andere Kante. Ohne sie zerfiele das Bild in fünf
 * Sektoren, die einander nie berühren: genau der Eindruck, den das
 * Speichenraster hinterliess. Jede Brücke verbindet zwei benachbarte Cluster
 * DERSELBEN Zone, also Knoten, die gleich weit gekommen sind.
 *
 * Fünf je Zone, einmal rund — die Zone wird dadurch als Ring von Orten lesbar,
 * ohne dass ein Kreis gezeichnet würde.
 */
export const FORGE_BRIDGES: readonly ForgeBridgeDef[] = [
  // Zone 1
  { from: 'goldenEcho', to: 'gildedHarvest' },
  { from: 'resonance', to: 'cometMiner' },
  { from: 'tidalDrift', to: 'warcry' },
  { from: 'solarSails', to: 'wayfindersCache' },
  { from: 'moonOrbit', to: 'aegis' },
  // Zone 2
  { from: 'echoChamber', to: 'deepVein' },
  { from: 'tidewake', to: 'timeWeaver' },
  { from: 'riftshard', to: 'starquake' },
  { from: 'wanderersCrest', to: 'midnightTide' },
  { from: 'coinCascade', to: 'echoingBulwark' },
  // Zone 3
  { from: 'merchantsFavor', to: 'almsOfTheKeeper' },
  { from: 'chimeConduit', to: 'quarrymastersEye' },
  { from: 'heraldsFavor', to: 'hollowCore' },
  { from: 'pathfindersOath', to: 'wanderersBeacon' },
  { from: 'gravityWell', to: 'riftAnchor' },
  // Zone 4
  { from: 'hagglersPact', to: 'merchantsPact' },
  { from: 'prospectorsPact', to: 'foundersPact' },
  { from: 'honoredPact', to: 'patientPact' },
  { from: 'cartographersPact', to: 'starroadPact' },
  { from: 'hollowPact', to: 'unbrokenPact' },
]

const CLUSTER_BY_ID = new Map(FORGE_CLUSTERS.map((c) => [c.id, c]))

/** Der Cluster mit dieser Id, oder `undefined`. */
export function getForgeCluster(id: string): ForgeClusterDef | undefined {
  return CLUSTER_BY_ID.get(id)
}

const CLUSTER_OF_NODE = new Map<string, ForgeClusterDef>()
for (const cluster of FORGE_CLUSTERS) {
  for (const member of cluster.members) CLUSTER_OF_NODE.set(member, cluster)
}

/**
 * In welchem Cluster ein Knoten liegt.
 *
 * Gerechnet EINMAL beim Laden des Moduls, nicht bei jedem Aufruf — die Karte
 * ist statisch, und die Specs fragen das für jedes Knotenpaar ab.
 */
export function forgeClusterOf(nodeId: string): ForgeClusterDef | undefined {
  return CLUSTER_OF_NODE.get(nodeId)
}

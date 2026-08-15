// Star Forge (Sonnen-Baum aus Roots, Branches und Leaves samt Relikten,
// Konstellationen und Schnäppchen) und der Meep Skill Tree.

import type { ForgeRelicRarity, ForgeSectionDef } from '@/types'

// ── Meep Skill Tree: radiales Netz-Layout (SkillTreeComponent) ─────────────
// Ein Startknoten in der Mitte, fünf Pfade strahlen aus; leichter Zickzack pro
// Stufe für den organischen Netz-Look. Die Radien sind so gewählt, dass sich
// Kreise und Labels nie überlappen — einzeln geändert kleben sie aneinander.
/** Grundwinkel der fünf Zweige, gleichmäßig über 360°. */
export const SKILL_TREE_BASE_ANGLES_DEG = [-90, -18, 54, 126, 198]
/** Zickzack-Zuschlag je Stufe, damit die Zweige nicht schnurgerade laufen. */
export const SKILL_TREE_TIER_JITTER_DEG = [0, 10, -9, 10, -8]
/** Abstand der fünf Stufen vom Zentrum. */
export const SKILL_TREE_TIER_RADIUS = [200, 355, 510, 665, 820]
/** Stauchung der y-Achse — das Netz sitzt in einem Breitbild-Rahmen. */
export const SKILL_TREE_Y_SQUASH = 0.85
/** Kreis-Mittelpunkt innerhalb des Node-Wrappers (muss zum CSS passen). */
export const SKILL_TREE_NODE_CENTER = { x: 78, y: 40 }
export const SKILL_TREE_START_CENTER = { x: 80, y: 48 }
/** Einpassung beim Öffnen: Zoom-Clamp, damit das Netz lesbar startet. */
export const SKILL_TREE_FIT_PADDING = 0.06
export const SKILL_TREE_FIT_MIN_ZOOM = 0.62
export const SKILL_TREE_FIT_MAX_ZOOM = 0.9
/**
 * Verzögerung vor `fitView`. Ohne sie kollidiert die Zoom-Animation mit den
 * Mount-Kosten des Netzes und drückt die Framerate sichtbar.
 */
export const SKILL_TREE_FIT_DELAY_MS = 100
/** Strichstärke der Verbindungen, je nach Zustand des Zielknotens. */
export const SKILL_TREE_EDGE_WIDTH_BOUGHT = 3.5
export const SKILL_TREE_EDGE_WIDTH_BUYABLE = 2.75
export const SKILL_TREE_EDGE_WIDTH_LOCKED = 2.25

// ── Star Forge: Baum-Darstellung (ForgeTreePanel) ─────────────────────────
/** Winkel der fünf Wurzeln auf dem Ring, im Uhrzeigersinn ab oben. */
export const FORGE_ROOT_ANGLES_DEG = {
  flightSpeed: 270,
  maxHp: 342,
  chimesPerClick: 54,
  chimesPerSecond: 126,
  dmgPerClick: 198,
} as const
/** Icon-Kantenlänge je Knotenstufe. */
export const FORGE_ICON_SIZE_ROOT = 28
export const FORGE_ICON_SIZE_BRANCH = 22
export const FORGE_ICON_SIZE_LEAF = 18
export const FORGE_ICON_SIZE_BOUGH = 20
/**
 * Luft an JEDER Seite beim Einpassen des Baums.
 *
 * Vorher standen hier 96 px, aber nur oben — Kopfraum für das schwebende
 * Phasen-Dock, unter dem die Bühne zusätzlich um die halbe Höhe nach unten
 * gerückt war. Das Dock sitzt jetzt als Kopfleiste in der Forge-Sidebar, also
 * verteilt sich derselbe Betrag auf beide Seiten: die Bühne steht mittig und
 * bleibt exakt so groß wie zuvor (auf jedem Desktop-Format begrenzt die Höhe,
 * und 780 − 2·48 ist dasselbe wie 780 − 96). Der Baum wird durch den Umzug
 * also weder größer noch kleiner, nur zentriert.
 */
export const FORGE_TREE_FIT_PADDING_PX = 48
/**
 * Wo eine Wurzel-Verbindung ansetzt — am RAND des Körpers, der gerade in der
 * Mitte steht, nicht an einem festen Radius.
 *
 * Vorher stand hier ein fester `FORGE_SUN_EDGE_R = 110`. Der Körper wächst aber
 * mit der Sonnenphase (`SHOP_SUN_MIN_DIAMETER`…`SHOP_SUN_MAX_DIAMETER`, also
 * Radius 85…120), und im Kometenzustand ist der sichtbare Fels nochmals
 * kleiner: die Striche begannen dort rund 45 px NEBEN dem Gestein und schwebten
 * frei im Raum, während sie in der Endphase unter der Scheibe verschwanden.
 *
 * `FORGE_BODY_EDGE_FRACTION` sagt je Körper, welchen Anteil seines Kastens er
 * WIRKLICH ausfüllt — der Komet sitzt als `inset: 12%` in seinem (Anteil 0,76),
 * Plasmascheibe und Schwarzes Loch reichen bis zur Kastenkante.
 */
export const FORGE_BODY_EDGE_FRACTION = { star: 1, comet: 0.76, blackHole: 1 } as const
/**
 * Luft zwischen dem Rand des Körpers und dem Beginn der Wurzel-Äste.
 *
 * Muss den Atem der Scheibe überbieten, sonst leckt sie im Scheitel der
 * Pulsanimation an den Strichen: der stärkste ist `tree-sun-pulse` mit
 * `scale(1.05)`, bei Höchstradius 120 also 6 px. Nach oben begrenzt der
 * Wurzelring: 165 − 28 (halber Knoten) − 128 lässt bei größtem Körper noch
 * einen sichtbaren Stummel stehen.
 */
export const FORGE_SUN_EDGE_GAP = 8

/**
 * Battle Power je gehaltenem Meep. Der Meep-Term dominiert `totalPower` —
 * `abilityPowerBonus` und `tree.powerBonus` sind daneben Beiwerk.
 *
 * Angehoben von 100, als die Meep-Ausbeute auf den Ratschen-Anker umgestellt
 * wurde (`MEEP_RUN_BASE_MIN`/`MEEP_RUN_SHARE`): der Lebenszufluss fiel dabei
 * von rund 7800 auf rund 1250 Meeps, also auf ein Sechstel. Geeicht ist der
 * Faktor am ZUFLUSS-Verhältnis und nicht am Endstand — der Spieler hält fast
 * durchweg Zwischenbestände zwischen zwei Baumkäufen, nicht den Rest am Ende.
 */
export const MEEP_POWER_MULTIPLIER = 600

/**
 * Wie die gefalteten Baum-Effekte im Meep-Panel des Headers gelesen werden.
 * Der Store liefert einen Beutel roher Zahlen (`meepTreeStore.fx`) — welcher
 * Schlüssel welche Beschriftung trägt und in welcher Einheit er steht, weiß
 * nur diese Tabelle. Sie gibt zugleich die Reihenfolge vor: erst was der
 * Spieler dauernd sieht (Produktion, Klick), dann Kampf, Überleben, und zuletzt
 * das, was nur zwischendurch greift (Offline, Expeditionen).
 *
 * `kind` entscheidet die Schreibweise:
 *   mult  — Faktor über 1, als „×1,25" gezeigt
 *   lower — Faktor unter 1, wo klein gut ist (Kosten, Dauer, Schaden) → „−20 %"
 *   pct   — Bruchteil, als Prozent gezeigt
 *   flat / rate / hours — additiv, mit der jeweiligen Einheit
 * Neutral (1 bzw. 0) bleibt ungezeigt — das Panel listet nur, was wirkt.
 */
export type MeepTreeEffectKind = 'mult' | 'lower' | 'pct' | 'flat' | 'rate' | 'hours'

export interface MeepTreeEffectRowDef {
  key: string
  label: string
  kind: MeepTreeEffectKind
}

export const MEEP_TREE_EFFECT_ROWS: readonly MeepTreeEffectRowDef[] = [
  { key: 'cpsMult', label: 'Chimes per second', kind: 'mult' },
  { key: 'cpcMult', label: 'Chimes per click', kind: 'mult' },
  { key: 'doubleClickChance', label: 'Double-strike chance', kind: 'pct' },
  { key: 'cpcFromCpsPct', label: 'Click gains of CpS', kind: 'pct' },
  { key: 'meepCostMult', label: 'Chimes per meep', kind: 'lower' },
  { key: 'meepPowerMult', label: 'Power per meep', kind: 'mult' },
  { key: 'powerBonus', label: 'Flat battle power', kind: 'flat' },
  { key: 'championDpsMult', label: 'Champion orbit DPS', kind: 'mult' },
  { key: 'bossDamageMult', label: 'Damage to planet bosses', kind: 'mult' },
  { key: 'materialDropMult', label: 'Material drop chance', kind: 'mult' },
  { key: 'hpRegenPerSec', label: 'Health regeneration', kind: 'rate' },
  { key: 'damageTakenMult', label: 'Damage taken', kind: 'lower' },
  { key: 'offlineEarningsMult', label: 'Offline earnings', kind: 'mult' },
  { key: 'offlineMaxHoursBonus', label: 'Offline cap', kind: 'hours' },
  { key: 'expeditionRewardMult', label: 'Expedition rewards', kind: 'mult' },
  { key: 'expeditionSpeedMult', label: 'Expedition duration', kind: 'lower' },
] as const

// ── Star Forge (Shop tab) ─────────────────────────────────────────────────────
// Tree geometry — the tree lives on a square stage, nodes placed on 4 polar rings.
/**
 * Gewachsen von 820, als der Bough-Ring dazukam: 490 (Ring 4) plus den halben
 * Knoten (17) sind 507, und 1040/2 = 520 lässt den Rand frei. Die Zahl steht
 * NUR hier — `ForgeTreePanel` setzt sie als CSS-Variable an die Bühne, statt
 * sie im scoped CSS ein zweites Mal auszuschreiben.
 */
export const FORGE_STAGE_SIZE = 1040
export const FORGE_RING_ROOT_R = 165
export const FORGE_RING_BRANCH_R = 285
export const FORGE_RING_LEAF_R = 385
export const FORGE_RING_BOUGH_R = 490

// Ring unlock gating (starPhase index)
export const FORGE_BRANCH_UNLOCK_PHASE = 2
export const FORGE_LEAF_UNLOCK_PHASE = 4
/**
 * Der dritte Zweig je Wurzel geht eine Phase später auf als die beiden ersten —
 * er ist stärker und teurer, und die Ringe sollen sich nicht auf einen Schlag
 * füllen.
 */
export const FORGE_BRANCH_LATE_UNLOCK_PHASE = 3
/** Die Blätter an den späten Zweigen kommen mit dem regulären Blätter-Ring. */
export const FORGE_LEAF_LATE_UNLOCK_PHASE = 4
/**
 * Ring 4 geht in der ENDPHASE auf — genau dann, wenn die Sonnenrampe endet und
 * jeder andere Knoten des Baums seine Obergrenze erreichen kann. Vorher hätte
 * ein Knoten ohne Deckel keine Aufgabe; danach ist er die einzige, die bleibt.
 */
export const FORGE_BOUGH_UNLOCK_PHASE = 5
/** Branch max level at unlock; +1 per phase past the unlock phase, up to the cap
 *  → "old upgrades gain new tiers" with every sun evolution. */
export const FORGE_BRANCH_BASE_MAX_LEVEL = 3
/**
 * Von 5 auf 6 gehoben, und die Blätter von 3 auf 4.
 *
 * Zwei Gründe, die dasselbe verlangen. Erstens war die Codex-Bahn „Sunsmith"
 * dadurch UNERREICHBAR: ihre letzte Stufe verlangt 200 `forgeLevels`, das
 * theoretische Maximum lag bei 10 Branches × 5 + 10 Leaves × 3 + 6 Relikte × 3
 * = 98. Zweitens braucht die verlängerte Sonnenrampe Inhalt: `nodeMaxLevel`
 * staffelt „+1 je Phase über der Freischaltphase", die letzte Branch-Stufe
 * existiert damit erst in der Schlussphase.
 *
 * Neues Maximum: 60 + 40 + 30 = 130. Die Materialkosten skalieren bereits mit
 * der Stufe (`qty × nextLevel`) und ziehen damit am selben Strang wie die
 * Tier-Tore — eine Quelle, mehrere Verbraucher, sechs Slots, eine Entscheidung.
 */
export const FORGE_BRANCH_MAX_LEVEL_CAP = 6
export const FORGE_LEAF_MAX_LEVEL = 4
/** Parent level required before a child node can be bought. */
export const FORGE_BRANCH_PARENT_MIN_LEVEL = 1
export const FORGE_LEAF_PARENT_MIN_LEVEL = 2
/**
 * Ein Bough verlangt einen AUSGEWACHSENEN Zweig unter sich — mehr als das Blatt
 * daneben. Er ist der letzte Knoten der Kette, und wer ihn erreicht, hat den
 * Zweig ohnehin längst hochgezogen; die Hürde sorgt nur dafür, dass Ring 4
 * nicht neben einem halb gewachsenen Ring 2 aufgeht.
 */
export const FORGE_BOUGH_PARENT_MIN_LEVEL = 3

/**
 * Ring 4 kennt keine Obergrenze. Das ist der Punkt: die Sonnenrampe endet nach
 * rund 44 Spielstunden, danach steht im ganzen Baum nur noch „✦ MAX" — und
 * Chimes haben im Spätspiel ausser den Planeten-Leveln keine Senke.
 *
 * Sicher ist das NUR in dieser Kombination, und sie ist keine Geschmacksfrage:
 *
 *   Wirkung je Stufe ADDITIV  (+5 % CpS, nicht ×1,05)
 *   Kosten je Stufe GEOMETRISCH (`FORGE_BOUGH_COST_MULTIPLIER`)
 *
 * Der Ertrag wächst dann linear (`1 + 0,03·n`), der Preis exponentiell
 * (`1,35ⁿ`). Die Amortisationszeit einer Stufe ist `P(n) = P(1)·1,35ⁿ⁻¹` — das
 * Verhältnis `P(n+1)/P(n)` ist 1,35, UNABHÄNGIG von der CpS des Spielers. Ein
 * höheres Einkommen verschiebt die Kette nur nach rechts, es ändert ihre
 * Steigung nicht. Ein Knoten, der die CpS erhöht, mit der er bezahlt wird, kann
 * sich damit NIE selbst tragen. Multiplikativ gestapelt — zehn Boughs zu je
 * ×1,03 — stünde `1,03^(10n)` gegen `1,35ⁿ`, und der Kreis wäre offen:
 * dieselbe Fehlerklasse wie der Overclock-Stapel (docs/balance.md).
 *
 * **Warum 1,35 und nicht flacher.** Der Multiplikator ist der einzige
 * Parameter, der die LÄNGE des endlosen Rings bestimmt; `baseCost` verschiebt
 * nur den Anfang. Weil Boughs kein Material verlangen, bremst sie nichts als
 * die Geometrie: bei 1,22 kaufte ein gesparter Chime-Berg von 1e13 auf einen
 * Schlag 33 Stufen, bei 1,35 sind es 24. Wirkt der Einstieg zu zäh, senke
 * `baseCost` — NIE den Multiplikator.
 *
 * Zweite Bedingung: nur UNGEDECKELTE Achsen. Ausgeschlossen sind nicht nur die
 * harten Kappen (`FORGE_MIN_DAMAGE_TAKEN_MULT`, `FORGE_MIN_DWELL_MULT`,
 * `FORGE_MIN_EXPEDITION_MULT`, `FORGE_MAX_DOUBLE_CLICK_CHANCE`), sondern auch
 * drei Achsen, die STILL sättigen und deshalb genauso ein bezahltes Nichts
 * wären:
 *   • `materialDropMult` — `inventoryStore.tryDropMaterial` vergleicht
 *     `Math.random() > chance`; oberhalb 1 wirkt keine Stufe mehr.
 *   • `championDpsMult` — steckt über `combatStore.fullOrbitDps()` in
 *     `otherDps` und hebt damit die Boss-HP gleich mit (docs/balance.md). Für
 *     KLICKschaden gilt das seit der Zwei-Kanal-Rechnung nicht mehr — er steht
 *     nicht im Schätzer und sättigt daher nicht.
 *   • `extraDropCount` — `addMaterial(id, source, qty)` bucht `qty` roh in den
 *     Bestand; eine Bruchzahl je Stufe hinterliesse Materialien mit
 *     Nachkommastellen.
 */
export const FORGE_BOUGH_COST_MULTIPLIER = 1.35
/** Each leaf level amplifies its parent branch's effect by this fraction. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL = 0.25

export const FORGE_CONSTELLATION_REQUIRED_LEVEL = 3
/** Dieselbe Verstärkung in Prozent — für die Beschreibungstexte im Baum. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT = FORGE_LEAF_AMPLIFY_PER_LEVEL * 100

/**
 * Wirkung der geschmiedeten Konstellationen. Die Zahlen stehen zusätzlich als
 * Prozentangabe im `desc`-Text der jeweiligen Definition in config/progression/starForge.ts
 * — ändert sich eine, muss der Text mitgeführt werden.
 */
export const FORGE_CONSTELLATION_BULWARK_DAMAGE_MULT = 0.9
export const FORGE_CONSTELLATION_STELLAR_WIND_CPS_MULT = 1.18
export const FORGE_CONSTELLATION_GOLDEN_TEMPEST_CPC_MULT = 1.12

/** Obergrenzen, damit gestapelte Forge-Effekte den Spielablauf nicht brechen. */
export const FORGE_MIN_DAMAGE_TAKEN_MULT = 0.25
export const FORGE_MIN_DWELL_MULT = 0.5
export const FORGE_MIN_EXPEDITION_MULT = 0.4
export const FORGE_MAX_DOUBLE_CLICK_CHANCE = 0.8

// ── Detailspalte des Shop-Tabs (StarForgePanel) ───────────────────────────────
/**
 * Die Abteilungen der rechten Spalte, Reihenfolge = Reiterfolge.
 * Gestapelt waren sie ein Endlos-Scroll in einer 440px-Spalte; als Reiter
 * bekommt jede die volle Höhe, und darum darf die Schrift so groß sein, dass
 * man sie liest.
 *
 * `upgrades` steht vorn und ist die Startansicht: Relikte, Konstellationen und
 * der Handel zeigen, was aus dem Baum FOLGT — der Baum selbst war vorher nur
 * als Kreisfeld auf der Leinwand erreichbar, ein Knoten je Tooltip.
 *
 * Sein Glyph ist absichtlich dasselbe wie `STAR_EVOLUTION_ICONS.gateRays`: dort
 * steht es für die Bedingung „alle Strahlen auf Stufe n", hier für die Strahlen
 * selbst — eine Bedeutung, ein Zeichen. Grün, weil Grün im Projekt „kaufbar"
 * heißt; die drei anderen tragen Bernstein, Eisblau und Gold.
 */
export const FORGE_PANEL_SECTIONS: ForgeSectionDef[] = [
  { id: 'upgrades', label: 'Upgrades', icon: 'game-icons:sun-radiations', accent: '#7fd048' },
  { id: 'relics', label: 'Relics', icon: 'game-icons:anvil-impact', accent: '#e8a020' },
  {
    id: 'constellations',
    label: 'Constellations',
    // Das einzige Label, das in keine Rail-Zelle passt — die Trennstelle ist
    // markiert, der Name bleibt derselbe. Siehe `wrapLabel` in types/forge.ts.
    wrapLabel: 'Constel­lations',
    icon: 'game-icons:barbed-star',
    accent: '#86d0ff',
  },
  { id: 'bargain', label: 'Bargain', icon: 'ph:handshake-fill', accent: '#e8c040' },
]

/**
 * Die vier Ringe als Abschnitte der Upgrade-Liste — Lesereihenfolge von innen
 * nach außen, dieselbe, in der sie freigeschaltet werden.
 *
 * Namen und Glyphen sind KEINE freie Wahl: „Solar Rays", „Forge Branches",
 * „Forge Leaves" und „Astral Boughs" stehen samt ihren Zeichen auch im Lexikon
 * (config/encyclopedia/sunAndForge.ts). Derselbe Baum darf nicht an zwei
 * Stellen anders heißen.
 *
 * Die Farben sind nicht die der Knoten (die tragen ihre eigene aus dem
 * Katalog), sondern die des Abschnittsstrichs: Gold für den Kern, Grün für die
 * Zweige, Eisblau für die Blätter, Violett für die Boughs — je weiter außen,
 * desto kühler. Violett ist zugleich die Farbe, die im Projekt „episch/selten"
 * trägt (`FORGE_RELIC_RARITY_COLOR.epic`), und der endlose Ring ist das
 * Seltenste, was der Baum hergibt.
 *
 * Seit die Liste nach Kaufbarkeit gliedert (`FORGE_UPGRADE_BUCKETS`), sind die
 * vier Ringe dort kein Abschnitt mehr, sondern die Filterleiste — daher
 * `shortTitle`. Der lange Name bleibt trotzdem: eine Kopfzeile mit „Rays"
 * stünde im Widerspruch zum Lexikon, ein Chip mit „Solar Rays" passt zu fünft
 * nicht in eine 470px-Spalte.
 */
export const FORGE_UPGRADE_GROUPS = [
  {
    tier: 'root' as const,
    title: 'Solar Rays',
    shortTitle: 'Rays',
    icon: 'game-icons:beam-wake',
    hint: 'The five rays the star grows on',
    accent: '#e8c040',
  },
  {
    tier: 'branch' as const,
    title: 'Forge Branches',
    shortTitle: 'Branches',
    icon: 'game-icons:tree-branch',
    hint: 'Each ray forks in three',
    accent: '#7fd048',
  },
  {
    tier: 'leaf' as const,
    title: 'Forge Leaves',
    shortTitle: 'Leaves',
    icon: 'game-icons:falling-leaf',
    hint: 'Amplify the branch they hang on',
    accent: '#86d0ff',
  },
  {
    tier: 'bough' as const,
    title: 'Astral Boughs',
    shortTitle: 'Boughs',
    icon: 'game-icons:infinity',
    hint: 'No final level — the tree keeps growing',
    accent: '#c9a0ff',
  },
]

/**
 * Leitfarbe des Seltenheits-Chips auf einer Relikt-Karte. Steht hier und nicht
 * in `economy.ts`: `MATERIAL_RARITY_COLOR` und `AUGMENT_RARITY_COLOR` decken
 * andere Skalen ab (vier bzw. vier Stufen) — Relikte kennen nur diese zwei, und
 * die Werte sind die des bisherigen `.rarity-chip`.
 */
export const FORGE_RELIC_RARITY_COLOR: Record<ForgeRelicRarity, string> = {
  rare: '#7bb8ff',
  epic: '#c9a0ff',
}

/** Beschriftung des Tier-Chips — gekürzte Einzahl der Abschnittsnamen oben. */
export const FORGE_UPGRADE_TIER_LABELS = {
  root: 'SOLAR RAY',
  branch: 'BRANCH',
  leaf: 'LEAF',
  bough: 'BOUGH',
} as const

/**
 * Steht überall dort, wo sonst die Höchststufe stünde. Ein gerendertes
 * „Infinity" wäre der rohe JavaScript-Wert; dies ist ein Schriftzeichen wie
 * `✦` oder `→` und damit von der Emoji-Regel nicht erfasst.
 */
export const FORGE_ENDLESS_SYMBOL = '∞'

/**
 * Die Abschnitte der Upgrade-Liste — nicht mehr die vier Ringe, sondern das,
 * was der Spieler mit einem Eintrag anfangen KANN.
 *
 * Vorher gliederte die Liste nach Ring und sortierte darin nach Zustand. Das
 * folgte dem BAUM, nicht dem Spieler: wer im Spätspiel etwas kaufen wollte,
 * kam an vier Überschriften und dutzenden „✦ MAX"-Zeilen vorbei, und
 * ausgerechnet die Astral Boughs — der einzige Ring, der nie fertig wird —
 * standen als vierte Gruppe ganz unten. Jetzt steht Kaufbares oben, gleich aus
 * welchem Ring; der Ring bleibt als Chip auf der Karte und als Filter darüber.
 *
 * Was hier NICHT steht: das Fertige. Es trägt keinen solchen Kopf, sondern
 * eine eingeklappte Schaltzeile am Listenende.
 *
 * Grün für `ready` ist keine freie Wahl — im Projekt trägt Grün durchgehend
 * „kaufbar/aktiv" (die Knopf-Verläufe in CLAUDE.md).
 */
export const FORGE_UPGRADE_BUCKETS = [
  {
    id: 'ready' as const,
    title: 'Ready',
    hint: 'Chimes and materials are there',
    icon: 'ph:lightning-fill',
    accent: '#52b830',
  },
  {
    id: 'reach' as const,
    title: 'Saving up',
    hint: 'Open, but out of reach',
    icon: 'ph:hourglass-medium-fill',
    accent: '#c89040',
  },
  {
    id: 'next' as const,
    title: 'Next up',
    hint: 'What the star opens next',
    icon: 'lucide:lock',
    accent: '#7a4e20',
  },
]

/** Beschriftung der Archiv-Schaltzeile: „▸ 21 grown". */
export const FORGE_UPGRADE_ARCHIVE_LABEL = 'grown'
export const FORGE_UPGRADE_ARCHIVE_HINT = 'Fully grown — nothing left to buy'
export const FORGE_UPGRADE_ARCHIVE_ICON = 'ph:check-circle-fill'
/** Chevron der Schaltzeile. Schriftzeichen wie `✦` und `→`, kein Emoji. */
export const FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED = '▸'
export const FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN = '▾'

/** Der Chip, der die Ringfilterung aufhebt. */
export const FORGE_UPGRADE_FILTER_ALL_LABEL = 'All'

// ── Kopfleiste der Baumspalte (ForgeToolbar) ─────────────────────────────────
/**
 * Suchzeile und Ring-Chips stehen seit dem Umbau ÜBER dem Baum, nicht mehr über
 * der Liste. Zwei Gründe: die Chips hatten in der 470px-Spalte nur 438px und
 * mussten auf 11px Schrift heruntergezogen werden, und der Fortschrittsring je
 * Ring braucht Platz, den es dort nicht gab. Über dem Baum steht das Doppelte
 * zur Verfügung.
 *
 * Die Leiste liegt IM FLUSS, nicht schwebend über der Bühne — dieselbe
 * Entscheidung wie beim Ertrags-Sockel (`FORGE_YIELD_PLINTH_HEIGHT_PX`): ein
 * Knoten unter einer schwebenden Karte läuft weiter, ist aber nicht mehr
 * anklickbar. `fitScale` misst den Viewport darunter und zieht von selbst mit.
 *
 * Eine HÖHE steht hier bewusst nicht: die Leiste bemisst sich an ihrem Inhalt
 * (gemessen 51px bei Full HD, 55px ab 2K), und der Viewport darunter nimmt den
 * Rest. Eine Konstante wäre eine zweite Quelle für eine Zahl, die das Layout
 * ohnehin schon kennt.
 */
/**
 * Radius der Fortschrittslinie auf einem Ring-Chip. Der Umfang steht daneben,
 * weil `stroke-dasharray` ihn braucht — Fortschrittsringe laufen über
 * `stroke-dashoffset` einer SVG-Kreislinie und NIE über `conic-gradient`
 * (Performance-Regel 11, Muster `ABILITY_RING_CIRCUMFERENCE`).
 */
export const FORGE_CHIP_RING_R = 8
export const FORGE_CHIP_RING_CIRCUMFERENCE = 2 * Math.PI * FORGE_CHIP_RING_R
export const FORGE_SEARCH_ICON = 'lucide:search'
/**
 * Platzhalter je einer Zahl in einer Beschriftung — Suchfeld, Sammelkauf-Toast
 * und der Stapelknopf setzen dieselbe Marke ein. Eine Konstante je Text hätte
 * drei Fassungen desselben Zeichens ergeben.
 */
export const FORGE_COUNT_TOKEN = '{n}'
export const FORGE_SEARCH_PLACEHOLDER = `Search ${FORGE_COUNT_TOKEN} upgrades…`
export const FORGE_SEARCH_CLEAR_ICON = 'lucide:x'
export const FORGE_BUY_ALL_LABEL = 'Buy all ready'
export const FORGE_BUY_ALL_ICON = 'ph:lightning-fill'
/** Sammelmeldung des Stapelkaufs — die Marke trägt die Zahl der gewachsenen Knoten. */
export const FORGE_BUY_ALL_TOAST = `Grew ${FORGE_COUNT_TOKEN} upgrades`

/**
 * Die Marke am günstigsten kaufbaren Knoten.
 *
 * „Günstigster" und nicht „stärkster": die Wirkungen des Baums stehen in
 * Prozent, HP, Sekunden und Chimes nebeneinander — es gibt keine gemeinsame
 * Einheit, in der man sie rangieren könnte. Der Preis ist die einzige Zahl, die
 * alle Knoten teilen, und „was kann ich als Nächstes mitnehmen" ist ohnehin die
 * Frage, die der Spieler vor dem Baum hat.
 */
export const FORGE_BEST_BUY_LABEL = 'BEST BUY'

// ── Stapelkauf ───────────────────────────────────────────────────────────────
/**
 * Wie viele Stufen ein einzelner „Buy ×N" höchstens auf einmal nimmt.
 *
 * Nötig ist der Deckel nur wegen Ring 4: ein Bough hat keine Höchststufe, die
 * Vorschau-Schleife liefe also bei genug Chimes ohne Ende weiter. Für alle
 * anderen Ringe greift ihre eigene Obergrenze längst vorher.
 *
 * 25 ist kein Geschmack, sondern die Kurve: bei `FORGE_BOUGH_COST_MULTIPLIER`
 * (1,35) kostet die 25. Stufe das rund 1000-Fache der ersten — ein Vorrat, der
 * fünfundzwanzig Stufen am Stück deckt, deckt praktisch auch die nächsten
 * hundert, und ein Knopf, der ohne Deckel den ganzen Bestand verschluckt, ist
 * kein Knopf mehr, sondern eine Falle.
 */
export const FORGE_BULK_BUY_CAP = 25
/** Beschriftung des Stapelknopfs — die Marke trägt die Zahl der Stufen. */
export const FORGE_BUY_MANY_LABEL = `Buy ×${FORGE_COUNT_TOKEN}`
/** Die Zeile neben dem Preis: „8× affordable right now". */
export const FORGE_AFFORDABLE_SUFFIX = '× affordable right now'

// ── Empfehlungs-Panel der rechten Spalte (ForgeNextUpPanel) ──────────────────
/**
 * Was als Nächstes zu wachsen lohnt — EIN Knoten groß, und zwar immer derselbe,
 * den der Baum links als BEST BUY umringt.
 *
 * Der Kopf war einmal ein Hover-Detail mit Anheftung: er zeigte, worauf der
 * Zeiger zeigte. Das war ein zweiter Weg zu denselben Zahlen, die die Zeile
 * darunter schon trägt — und er stand auch dann da, wenn es gar nichts zu
 * kaufen gab. Jetzt beantwortet er genau eine Frage („was jetzt?") und
 * verschwindet, sobald sie keine Antwort mehr hat: `bestBuyId === null`.
 *
 * Was der Zeiger streift, sagt seitdem das schwebende Kärtchen an der Zeile
 * (`ForgeRowTooltip`) — es liegt außerhalb des Flusses und kann die Liste
 * deshalb nicht verschieben.
 */
export const FORGE_DETAIL_ICON_SIZE = 38
export const FORGE_NEXT_UP_TITLE = 'Next to grow'
export const FORGE_NEXT_UP_HINT = 'cheapest you can afford'
/**
 * Dieselben zwei Glyphen wie die Töpfe der Liste (`FORGE_UPGRADE_BUCKETS`):
 * „kaufbar" ist überall der Blitz, „noch nicht" überall die Sanduhr. Eine
 * Bedeutung, ein Zeichen — auch über Komponentengrenzen hinweg.
 */
export const FORGE_NEXT_UP_ICON = 'ph:lightning-fill'
export const FORGE_NEXT_UP_IDLE_ICON = 'ph:hourglass-medium-fill'

// ── Schwebendes Kärtchen an der Zeile (ForgeRowTooltip) ──────────────────────
/**
 * Was der Zeiger in der Liste streift, GROSS — seit der Kopf darüber nicht mehr
 * dem Zeiger folgt, sondern die Empfehlung zeigt.
 *
 * Es schwebt links NEBEN der Spalte statt in ihr: alles, was im Fluss der Liste
 * läge, verschöbe sie beim Erscheinen unter dem Zeiger, und genau daraus wurde
 * schon einmal ein selbsttragendes Flackern. `position: fixed` kann das nicht.
 */
export const FORGE_ROW_TIP_WIDTH_PX = 250
/**
 * Gemessen von der ZEILE aus, nicht von der Spaltenkante — und größer als der
 * Abstand, den man sehen will: die Zeile sitzt selbst schon 18px innerhalb der
 * Spalte, und ein kleinerer Wert ließe das Kärtchen ihre Kante überlappen.
 */
export const FORGE_ROW_TIP_GAP_PX = 26
/**
 * Nur zu sehen, solange der Zeiger die Liste hält und die letzte kaufbare Sache
 * dabei wegfällt — das Panel wartet dann mit dem Verschwinden, bis er loslässt,
 * statt ihm die Liste unter den Füßen wegzuziehen.
 */
export const FORGE_NEXT_UP_IDLE = 'Nothing ready right now'
/** „Lv 25 · no final level" bzw. „Lv 3 / 6" — der Rest der Metazeile. */
export const FORGE_DETAIL_ENDLESS_META = 'no final level'
export const FORGE_DETAIL_PARENT_PREFIX = 'hangs on '

/**
 * Die Fläche, die das Panel IMMER belegt, SOLANGE es da ist.
 *
 * Ohne diese Klammer war der Kopf inhaltshoch, und jeder Hover schob die Liste
 * darunter um rund 300px. Der Zeiger fiel dabei aus der Liste, der Hover ging
 * aus, der Kopf schrumpfte, die Liste kam zurück unter den Zeiger — ein
 * selbsttragendes Flackern, das erst aufhörte, wenn man die Maus wegnahm. Die
 * Klammer bleibt auch ohne diese Kopplung nötig: der Stapelknopf („Buy ×8")
 * hängt an den Chimes und käme sonst sekündlich dazu und wieder weg.
 *
 * Die Zahlen sind GEMESSEN, nicht geschätzt. Nötig für Kopf, Identität,
 * einzeilige Beschreibung, Now-→-After und den klebenden Kaufblock: 355px auf
 * Full HD (mit der Kompakt-Media-Query), 408px ab 2K. Darauf kommen rund 28px
 * für die Stapelzeile („8× affordable right now" plus zweiter Knopf), die mit
 * den Chimes dazukommt und wieder geht. Bei 300px deckte der Kaufblock auf
 * Full HD die Now-→-After-Zeile ab — also genau die Zahl, wegen der man
 * hinsieht.
 *
 * Was darüber hinausgeht — eine drei Zeilen lange Beschreibung — scrollt im
 * Körper. Das ist der Preis dafür, dass die Liste darunter nie wandert, und er
 * trifft nur Zierrat: Preis und Knopf kleben.
 *
 * `clamp` statt einer festen Zahl, weil Full HD (~950px Bühne) und 4K (~2030px)
 * dieselbe Spalte teilen: auf dem flachsten Viewport bliebe von der Liste sonst
 * nichts übrig, auf dem größten stünde der Kopf verloren. Der Prozentanteil
 * greift, weil `.sf-panel` `height: 100%` trägt und der Elternteil damit eine
 * definite Höhe hat.
 */
export const FORGE_DETAIL_PANEL_MIN_PX = 384
export const FORGE_DETAIL_PANEL_FRACTION = 0.45
export const FORGE_DETAIL_PANEL_MAX_PX = 440

// ── Abteilungs-Rail ganz rechts (ForgeSectionRail) ───────────────────────────
/**
 * Die vier Abteilungen standen als waagerechte Reiterleiste über der Spalte und
 * kosteten dort die volle Breite mal 46px Höhe — auf dem flachsten Viewport
 * (Full HD) der teuerste Platz, den es gibt. Senkrecht kosten sie 78px BREITE,
 * und Breite ist in diesem Layout billig.
 *
 * Der Handel bekommt dabei die Fußkachel statt eines gleichrangigen Reiters: er
 * ist der einzige Abschnitt mit einer laufenden Uhr, und die soll man sehen,
 * ohne ihn zu öffnen.
 */
export const FORGE_RAIL_WIDTH_PX = 78
export const FORGE_RAIL_WIDTH_WIDE_PX = 92
export const FORGE_RAIL_ICON_SIZE = 27
export const FORGE_RAIL_BARGAIN_LABEL = 'restock'

/**
 * Kopfzeile der kompakten Liste. Sagte „click a row to inspect", solange ein
 * Klick die Zeile im Detailkopf anheftete — sie tut es nicht mehr, und ein
 * Hinweis auf eine Geste, die nichts bewirkt, ist schlimmer als keiner.
 */
export const FORGE_QUEUE_HEAD_HINT = 'point at a row to inspect · ＋ to grow'

/** Wie lange die gekaufte Karte aufleuchtet. Rein visuell, daher reale Zeit. */
export const FORGE_CARD_FLASH_MS = 420
/** Dasselbe für den Sonnenblitz im Baum — er quittiert denselben Kauf. */
export const FORGE_SUN_FLASH_MS = 500

// ── Hover-Spotlight zwischen Sternbaum und Upgrade-Liste ─────────────────────
/**
 * Baum links und Liste rechts zeigen denselben Bestand (`useForgeUpgrades`) in
 * zwei Bildern. Der Zeiger auf EINEM von ihnen hebt deshalb beide Fassungen
 * desselben Knotens hervor — dieselbe Mechanik wie `SIGIL_ALLY_HOVER_*` im
 * Team-Tab, und bewusst in denselben Größenordnungen.
 *
 * Der Maßstab liegt über dem bestehenden Zeige-Sprung des Knotens (1,12), weil
 * er beide Gesten bedienen muss: den Zeiger auf dem Kreis UND den Zeiger auf
 * seiner Karte drüben. Zwei Größen für dieselbe Bedeutung wären ein Fehler.
 */
export const FORGE_SPOTLIGHT_NODE_SCALE = 1.22
export const FORGE_SPOTLIGHT_DIM_OPACITY = 0.3
export const FORGE_SPOTLIGHT_PING_MS = 450
/**
 * Sonne → Wurzel → Zweig → Blatt/Bough: vier Glieder trennen den äußersten
 * Knoten vom Sternenrand, seit Ring 4 dazugekommen ist. Zugleich die
 * Abbruchbremse beim Hochlaufen der `parentId`-Kette.
 */
export const FORGE_SPOTLIGHT_MAX_LIMBS = 4
/**
 * Wartezeit, bevor ein Hover am Baum die zugehörige Karte ins Bild rollt. Ein
 * Schwenk über den Baum soll EINEN Rollbefehl absetzen, nicht fünfundzwanzig.
 * Rein visuell, daher reale Zeit.
 */
export const FORGE_SPOTLIGHT_SCROLL_DELAY_MS = 160

// ── Der Ringfilter siebt auch den Baum ───────────────────────────────────────
/**
 * Zwei Dämpfungsstufen stehen hier bewusst nebeneinander, und sie bedeuten
 * VERSCHIEDENES:
 *
 *   • `FORGE_SPOTLIGHT_DIM_OPACITY` (0,3) — „ich zeige gerade woandershin".
 *     Die vierundvierzig anderen bleiben lesbar; der Zeiger wandert weiter.
 *   • `FORGE_SIFT_DIM_OPACITY` (0,14) — „das habe ich weggefiltert".
 *     Eine ABSICHT des Spielers, die stehen bleibt, bis er sie zurücknimmt.
 *
 * Der Abstand zwischen beiden muss deutlich sein: läge das Sieb bei 0,25, wäre
 * ein gefilterter Baum von einem Spotlight nicht zu unterscheiden, und die
 * Chipwahl sähe aus wie ein Hover, der hängengeblieben ist. Gemessen auf Full HD
 * bei Standardzoom — bei 0,2 trägt der Blattring noch erkennbar Farbe.
 *
 * Ausgefiltert heißt NICHT gesperrt: der Knoten bleibt anklickbar, und ein
 * Zeiger darauf nimmt ihm die Klasse wieder ab (`ForgeTreePanel`). Der Filter
 * ist ein Blickfilter.
 */
export const FORGE_SIFT_DIM_OPACITY = 0.14
/**
 * Zusätzlich die Farbe herausnehmen. STATISCHER Zustand, ausdrücklich NICHT in
 * der Transition von `.node-circle` — ein `filter` über Zeit rasterte bis zu
 * fünfundvierzig Kreise samt Schatten in jedem Frame neu (Performance-Regel 2).
 */
export const FORGE_SIFT_SATURATE = 0.35
/** Äste zu einem ausgefilterten Ziel. Tiefer als der Knoten selbst — ein Strich
 *  trägt keine Form, die man wiedererkennt, nur Helligkeit. */
export const FORGE_SIFT_LIMB_OPACITY = 0.12
/** Ringband und Ring-Beschriftung der nicht gewählten Ebenen. */
export const FORGE_SIFT_RING_OPACITY = 0.15

/**
 * Der Trefferzähler IM SUCHFELD.
 *
 * Ohne ihn liest sich ein Baum, in dem kein einziger Knoten hell steht, wie ein
 * Fehler statt wie ein Suchwort ohne Treffer — dieselbe Lücke, die der
 * Leerzustand der Liste mit „Nothing matches that filter" schließt.
 *
 * Warum INNEN im Feld und nicht als eigene Marke daneben: eine Marke von 81px
 * (2K: 159px) hat die Chipreihe der Leiste auf Full HD, WUXGA und 2K in eine
 * zweite Zeile gedrückt und dem Baum darunter 19 bis 41px genommen — gemessen,
 * nicht befürchtet. Bei 663px Spaltenbreite ist die Leiste randvoll; im Feld
 * kostet die Zahl gar nichts, weil sie den Platz des Platzhalters nimmt, der
 * bei getipptem Wort ohnehin weg ist.
 *
 * Warum nur beim SUCHWORT und nicht bei jedem Filter: ein gewählter Ring ist am
 * markierten Chip abzulesen, und dessen Zweitzeile trägt seine Knotenzahl
 * bereits. Die Suche ist der einzige Filter ohne eigene Rückmeldung — und damit
 * der einzige, bei dem ein dunkler Baum unerklärt bliebe.
 */
export const FORGE_SIFT_TOTAL_TOKEN = '{t}'
export const FORGE_SIFT_HITS_TITLE = `${FORGE_COUNT_TOKEN} of ${FORGE_SIFT_TOTAL_TOKEN} nodes match`
export const FORGE_SIFT_NO_HITS_TITLE = 'No node matches'

/**
 * Grund, warum ein Kernstrahl gerade nicht weitergeht: `maxAllowedLevel` lässt
 * ihn nur eine Stufe über den niedrigsten der fünf steigen. Der Zustand hat
 * nichts mit Kosten zu tun, deshalb braucht er einen eigenen Satz statt eines
 * ausgegrauten Knopfes.
 */
export const FORGE_UPGRADE_CAPPED_REASON = 'Raise the other rays to match'

// ── Ertrags-Sockel unter der Sonne (ForgeYieldPlinth) ─────────────────────────
/**
 * Der Sockel steht IM FLUSS unter der Baumbühne, nicht als schwebende Karte
 * darauf. Zwei Gründe, beide zwingend:
 *
 * 1. Die Bühne trägt `transform: scale()` mit Zoom 0,55–2,2. Alles darin
 *    skaliert mit, und eine Ertragszeile in halber Größe ist keine Anzeige mehr.
 * 2. Bei Standardzoom (1,7) ragt die Bühne weit über das Panel hinaus — der
 *    Zweigring liegt dann bei rund 500px vom Zentrum, also genau dort, wo eine
 *    unten zentrierte Karte läge. Ein Knoten hinter dem Sockel liefe weiter,
 *    wäre aber nicht mehr anklickbar.
 *
 * Der Preis ist, dass die Bühne diese Höhe verliert und bei Einpasszoom rund
 * ein Zehntel kleiner rendert. Das ist der ehrliche Preis für eine Anzeige, die
 * nie etwas verdeckt.
 */
export const FORGE_YIELD_PLINTH_HEIGHT_PX = 72
export const FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX = 60
/**
 * Glyphen der Felder. Sanduhr und Goldklumpen sind KEINE freie Wahl — sie
 * stehen in `SOLAR_BRANCHES` bereits für „Chimes/Sek" und „Chimes/Klick", und
 * genau diese beiden Zahlen zeigt der Sockel. Der Chime-Bestand selbst trägt
 * kein Iconify-Zeichen, sondern dasselbe Bild wie jede Kostenzeile.
 */
export const FORGE_YIELD_ICONS = {
  perSecond: 'game-icons:hourglass',
  perClick: 'game-icons:gold-nuggets',
  forgeShare: 'game-icons:anvil-impact',
} as const
/**
 * Chime-Bild der Kostenzeilen — dasselbe Artwork, das Header, Command Panel,
 * Sigil-Panel und Champion-Shop zeigen. Die Forge trug hier lange die
 * Goldmünze (`BardGold`) und war damit der einzige Ort im Spiel, an dem die
 * Währung anders aussah als überall sonst; die gemeinsame Datei ist obendrein
 * ein Cache-Treffer. Größte Anzeige ist 32px, `-128` bleibt die richtige Stufe.
 */
export const FORGE_CHIME_IMAGE = '/img/BardAbilities/BardChime-128.png'

/**
 * Was auf dem Kaufknopf steht, wenn er nicht geht. Ein bloßes `disabled` lässt
 * den Spieler raten, ob die Kasse oder das Lager leer ist — beides steht direkt
 * darüber, aber der Knopf ist die Stelle, auf die er schaut.
 */
export const FORGE_COST_LABEL = 'Cost'
export const FORGE_SHORT_CHIMES_LABEL = 'Not enough Chimes'
export const FORGE_SHORT_MATERIAL_PREFIX = 'Need '
export const FORGE_GROW_LABEL = '✦ Grow'
export const FORGE_GROW_NEXT_PREFIX = 'Grow → Lv '

/** Platzhalter im `desc` einer Forge-Definition, den der Stufenwert ersetzt. */
export const FORGE_DESC_VALUE_TOKEN = '{v}'
/** Derselbe Platzhalter mit Prozentzeichen — daran hängt die Einheit der Werte. */
export const FORGE_DESC_PERCENT_TOKEN = `${FORGE_DESC_VALUE_TOKEN}%`

// Cosmic Bargain
export const FORGE_BARGAIN_RESTOCK_MS = 8 * 3_600_000
/** Steht auf der Karte, solange kein Handel ausliegt — der Händler ist unterwegs. */
export const FORGE_BARGAIN_EMPTY_ICON = 'game-icons:night-sky'
export const FORGE_BARGAIN_REROLL_MATERIAL = 'dark_matter'
export const FORGE_BARGAIN_REROLL_COST = 1

// Tree zoom (wheel + buttons). The default starts zoomed-in on the sun and
// its five core rays; zooming out reveals the branch, leaf and bough rings.
/**
 * Alle vier Werte sind mit der Bühne mitgewachsen (820 → 1040, Faktor 1,268).
 *
 * Die Rechnung dahinter ist nicht die naheliegende. Dargestellt wird
 * `FORGE_STAGE_SIZE × fitScale × zoom`, und weil `fitScale` selbst durch
 * `FORGE_STAGE_SIZE` teilt, kürzt sich die Bühnengröße heraus: die gezeigte
 * Fläche ist schlicht `(Viewport − 2 × Padding) × zoom`. Was durch den vierten
 * Ring KLEINER wird, sind die inneren Ringe im Verhältnis zur Bühne — der
 * Blätterring fällt von 385/820 auf 385/1040. Genau um dieses Verhältnis
 * (Faktor 1,268) muss jeder Zoomwert steigen, das Minimum eingeschlossen.
 *
 * Erst falsch gemacht und im Bild gesehen: das Minimum war stattdessen auf 0,45
 * gesenkt worden, in der Annahme, der grössere Baum brauche mehr Luft. Er stand
 * dann als Briefmarke in der Mitte einer leeren Fläche. Bei 0,70 ist die
 * gezeigte Bühne kleiner als der Viewport, es passt also weiterhin alles ins
 * Bild — nur eben lesbar.
 */
export const FORGE_TREE_ZOOM_MIN = 0.7
export const FORGE_TREE_ZOOM_MAX = 2.8
export const FORGE_TREE_ZOOM_STEP = 0.19
export const FORGE_TREE_ZOOM_DEFAULT = 2.15

// Header universe block — meep counter count-up tween (steps × interval ≈ 320ms)
export const MEEP_COUNTUP_STEPS = 20
export const MEEP_COUNTUP_INTERVAL_MS = 16
// How long the meep counter keeps its "rising" highlight after the tween ends.
export const MEEP_RISING_HOLD_MS = 300
// How long the departure yield next to the stock keeps its acknowledgement
// pulse. Long enough to catch the eye, short enough that it is over before the
// next whole meep can accrue.
export const MEEP_GAIN_PULSE_MS = 520

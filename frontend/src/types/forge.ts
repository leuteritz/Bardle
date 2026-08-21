// Star Forge: Baumknoten, Relikte, Konstellationen, Bargains.

import type { IconPoolKey } from './ui'

// ── Star Forge (Shop tab) ────────────────────────────────────────────────────

/**
 * Welcher Ring — von innen nach aussen, und die Reihenfolge IST die Leiter der
 * Sonnenphasen: `branch` in Spark, `leaf` in Dawn, `ward` in Zenith, `pact` in
 * Swell, `crown` in Pyre, `bough` in Collapse. Ring 1 (`root`) liegt im
 * solarUpgradeStore und gehört dem Kometen.
 *
 * `bough` ist der einzige OHNE Obergrenze — seine Stufen laufen weiter, wenn
 * alles andere im Baum auf MAX steht, und er sitzt deshalb GANZ aussen: er ist
 * das, was übrig bleibt, wenn die Sonne fertig ist. `crown` ist die Gegenfigur
 * dazu: EINE Stufe, und dafür verschiebt jeder Knoten eine Regel statt eine
 * Zahl. Beides zusammen ginge nicht — eine Regel, die man mehrfach kaufen kann,
 * ist wieder eine Zahl.
 *
 * `ward` und `pact` sind die zwei Ringe dazwischen. Sie greifen als einzige aus
 * dem Baum HERAUS: jeder ihrer Knoten sitzt auf einer Zahl, zu der die Forge
 * bisher nichts zu sagen hatte (Void-Takt, Drifter, Vorzeichen, Ladder, Bosse,
 * Gebäudepreise, Bard-Fähigkeiten).
 */
export type ForgeNodeTier = 'branch' | 'leaf' | 'ward' | 'pact' | 'bough' | 'crown' | 'glimmer'

/**
 * Die fuenf Achsen des Baums — dieselben Ids wie die Solar Rays im
 * `solarUpgradeStore`, aber als eigener Union hier im Typmodul.
 *
 * **Warum nicht `SolarBranchId` importiert:** `types/` haengt an keinem Store,
 * und die Richtung `types/ -> stores/` waere eine neue Kopplung fuer eine
 * Zeichenkette. Dass beide Mengen deckungsgleich bleiben, bindet eine Spec —
 * dasselbe Muster wie bei `SAVE_ID_RENAMES`, das auch beidseitig geprueft wird.
 *
 * Ein Knoten NENNT seine Achse nicht: sie folgt aus `parentId`, indem man die
 * Kette bis zu einem Ray zurueckgeht (`forgeNodeAxis()` im Katalog). Ein Feld
 * daneben waere eine zweite Wahrheit, die beim ersten Umhaengen still falsch
 * wird.
 */
export type ForgeAxisId =
  | 'flightSpeed'
  | 'maxHp'
  | 'chimesPerClick'
  | 'chimesPerSecond'
  | 'dmgPerClick'

/**
 * WORAUF ein Knoten wirkt — nicht, an welcher Achse er haengt.
 *
 * Das ist der Unterschied, an dem der alte Baum gescheitert ist: dort trugen
 * die drei Speichen der `dmgPerClick`-Achse ueber alle sechs Ringe
 * ausschliesslich Kampf, Boss und Ladder, und ein ganzer Sektor der Buehne war
 * damit eine einzige Aussage. Die Achse sagt, WO ein Knoten haengt; die Familie
 * sagt, WAS er tut, und erst damit wird „kein Cluster ist monothematisch"
 * ueberhaupt pruefbar (`__tests__/config/forgeMixing.spec.ts`).
 */
export type ForgeEffectFamily =
  | 'travel'
  | 'drifter'
  | 'idle'
  | 'guard'
  | 'void'
  | 'star'
  | 'click'
  | 'market'
  | 'harvest'
  | 'income'
  | 'combat'
  | 'boss'
  | 'ladder'
  | 'fortune'
  | 'ability'

/* Hier stand `ForgeClusterShape` — `knot`, `chain`, `fan`: wie ein Cluster
 * seine Mitglieder um seinen Mittelpunkt auslegt, ein Ring oder eine Kette
 * oder ein Faecher.
 *
 * Drei Formen fuer einen KREIS, und der Kreis ist weg. Ein Cluster ist ein
 * RINGABSCHNITT geworden, und darin gibt es nur eine sinnvolle Auslage: ueber
 * die Breite verteilt, ueber die Tiefe gestaffelt. Was die drei Formen
 * unterschieden — wie stark ein Knaeuel in eine Richtung gestaucht wird — ist
 * damit gegenstandslos.
 */

/**
 * Eine Zone des Netzes — die Form, die an die Stelle des Rings getreten ist.
 *
 * Der Ring war ein Kreis und damit ein Raster: sieben Radien, fuenfzehn
 * Speichen, und jeder Knoten sass auf einem Kreuzungspunkt. Ein Cluster ist
 * dagegen ein ORT mit einem Thema, und die Ketten des Baums laufen HINDURCH
 * statt darauf entlang. Deshalb traegt er eine Phase (die Sonnenphase, die
 * seine Mitte oeffnet), aber seine Mitglieder duerfen aus zwei benachbarten
 * Phasen kommen — sonst waere er wieder ein Ringabschnitt.
 *
 * Die Mitgliedsliste ist die EINE Stelle, an der die Zuordnung Knoten -> Ort
 * steht. Sie im Knoten zu fuehren waere dieselbe Angabe an 155 Stellen.
 */
export interface ForgeClusterDef {
  id: string
  /** Anzeigename — Bards Kosmos, nie musikalisch. */
  title: string
  /** Sonnenphase, die die Mitte dieses Clusters oeffnet. */
  phase: number
  /**
   * Die RICHTUNG des Clusters, in Grad ab 3 Uhr im Uhrzeigersinn — und das
   * einzige, was die Karte noch ueber seinen Ort sagt.
   *
   * Hier stand daneben `dist`, die Entfernung vom Mittelpunkt. Sie ist mit
   * `radius` gefallen und aus demselben Grund: seit ein Cluster ein
   * RINGABSCHNITT ist, kommt seine Entfernung aus dem Band seiner Phase
   * (`FORGE_ZONE_BAND`) und seine Weite aus der Anzahl der Cluster dieser
   * Phase. Beides sind Zahlen, die es ohnehin gibt. Eine dritte danebenzulegen
   * hiesse, zwei Quellen fuer denselben Ort zu fuehren — und die zweite
   * entschied nichts mehr.
   */
  angleDeg: number
  /** Leitfarbe des Zonenscheins. */
  accent: string
  /** Mitglieder in Auslege-Reihenfolge: Knoten-Ids aus `FORGE_NODES`. */
  members: readonly string[]
}

/**
 * Eine Kante OHNE Spiellogik — ein Weg, der zwei Cluster verbindet, damit das
 * Netz zusammenhaengt, wo `parentId` und `requires` nichts zu sagen haben.
 *
 * Sie wird gezeichnet und zieht im Layout wie jede andere Kante, schaltet aber
 * nichts frei. Ohne sie zerfiele das Bild in fuenfzehn Ketten, die einander nie
 * beruehren — genau der Eindruck, den das Speichenraster hinterliess.
 */
export interface ForgeBridgeDef {
  from: string
  to: string
}

/**
 * Ein Vorgänger, den ein Knoten NEBEN seinem Elternteil verlangt.
 *
 * Die Trennung ist inhaltlich und nicht technisch: `parentId` sagt, WO ein
 * Knoten hängt — daran hängen der Ringradius, der gezeichnete Ast und die
 * Scheinwerferkette, und `chronicleReachable.spec.ts` verlangt dafür denselben
 * Winkel wie beim Elternteil. `requires` sagt, WAS er verlangt, und ist von der
 * Geometrie frei: ein Zusammenlauf zieht gerade Knoten von ANDEREN Speichen
 * heran.
 *
 * Genutzt wird es heute nur vom Kronen-Ring (siehe `FORGE_CROWNS`).
 */
export interface ForgeNodeRequirement {
  /** Knoten-Id aus `FORGE_NODES` oder eine `SolarBranchId` (Ring 1). */
  id: string
  /** Mindeststufe dieses Vorgängers. */
  level: number
}

/** A purchasable node on the Forge Tree (rings 2–7 around the sun).
 *  Ring 1 (roots) stays in solarUpgradeStore. */
export interface ForgeNodeDef {
  id: string
  name: string
  /**
   * Der Knoten desselben Winkels auf dem Ring DIREKT INNEN — für Branches also
   * eine `SolarBranchId` aus dem solarUpgradeStore, sonst eine Knoten-Id.
   * Die Kette überspringt keinen Ring mehr: ray → branch → leaf → ward → pact →
   * crown/bough.
   */
  parentId: string
  /**
   * WEITERE Vorgänger, jeder mit eigener Mindeststufe — der Elternteil oben
   * bleibt davon unberührt und wird nicht wiederholt. Fehlt das Feld, ist der
   * Elternteil die einzige Bedingung.
   */
  requires?: readonly ForgeNodeRequirement[]
  tier: ForgeNodeTier
  /** Minimum starPhase at which the node becomes purchasable. */
  phase: number
  icon: string
  color: string
  /**
   * Worauf der Knoten wirkt. Traegt die Durchmischung des Netzes: eine Spec
   * verlangt, dass kein Cluster nur eine Familie fuehrt.
   *
   * Hier stand einmal `angleDeg`, der Polarwinkel auf der Buehne. Er ist mit
   * dem Speichenraster gefallen — wo ein Knoten STEHT, sagt jetzt allein die
   * Karte (`config/progression/starForgeNet.ts`), und der Katalog sagt nur
   * noch, was er TUT. Save-neutral war der Ausbau ohnehin: der Winkel stand in
   * keinem Spielstand.
   */
  family: ForgeEffectFamily
  baseCost: number
  costMultiplier: number
  /**
   * Materials required per purchase, quantities scale with the level bought.
   * Boughs lassen die Rezeptur LEER: die Menge wächst mit `qty × nextLevel`,
   * und bei einem Knoten ohne Obergrenze liefe der Materialbedarf damit ohne
   * Ende linear davon, während das Lager an Drop-Chancen hängt.
   */
  materialCost: Record<string, number>
  /** Effect description template — `{v}` is replaced with the level value. */
  desc: string
  /** Branches, Wards, Pacts und Boughs: Wirkung je Stufe. Leaves: ungenutzt
   *  (fester Verstärker), Crowns: ungenutzt (die Regel steht als Konstante). */
  effectPerLevel: number
  /**
   * NUR bei Glimmers: der Knoten, dessen Wirkung dieser hier hebt.
   *
   * Das ist der Grund, warum sechzig neue Knoten keine sechzig neuen Achsen
   * bedeuten. Ein Glimmer erfindet nichts — er zahlt auf eine Zahl ein, die es
   * schon gibt, und zwar in derselben Einheit. `starForgeStore` addiert ihn
   * dort, wo die Wirkung ohnehin entsteht (`branchEffect`, `ringEffect`,
   * `boughEffect`); die dreissig Getter darüber merken davon nichts.
   *
   * **Das Ziel ist bewusst NICHT der Elternteil.** `parentId` sagt, was den
   * Glimmer aufschliesst, `boosts` sagt, worauf er zahlt — und dass beides
   * auseinanderfällt, ist die Durchmischung: der kleine Knoten hängt am
   * Kampfast und zahlt auf die Wirtschaft.
   *
   * Worauf er NICHT zeigen darf, steht an `FORGE_GLIMMER_MAX_LEVEL`: nichts
   * mit `FORGE_MIN_*`-Boden, sonst wäre seine Stufe tot.
   */
  boosts?: string
}

export type ForgeRelicRarity = 'rare' | 'epic'

export interface ForgeRelicDef {
  id: string
  name: string
  rarity: ForgeRelicRarity
  icon: string
  color: string
  /**
   * ALLE Knoten, die gewachsen sein muessen, bevor das Relikt geschmiedet
   * werden kann — dieselbe Form wie `ForgeNodeDef.requires`.
   *
   * **Ohne `?`, anders als beim Baumknoten.** Dort traegt `parentId` die
   * Grundbedingung und `requires` kommt hinzu; ein Relikt hat keinen
   * Elternteil, seine Liste IST die Bedingung. Ein leeres Array waere ein
   * Relikt, das von Anfang an ausliegt — das soll man schreiben muessen,
   * nicht vergessen koennen.
   */
  requires: readonly ForgeNodeRequirement[]
  maxLevel: number
  goldCost: number
  goldMultiplier: number
  materialCost: Record<string, number>
  desc: string
  effectPerLevel: number
  /** Short provenance line, e.g. "Moon Orbit branch + Void Shards". */
  sourceLabel: string
}

export interface ForgeConstellationDef {
  id: string
  name: string
  icon: string
  color: string
  /**
   * Die Knoten, die diese Konstellation verschmilzt — dieselbe Form wie beim
   * Relikt und beim Baumknoten.
   *
   * Vorher standen hier `nodeA` und `nodeB`, und genau ZWEI passten hinein.
   * Eine Konstellation aus drei Knoten war damit nicht schreibbar, sondern
   * nur durch ein drittes Feld daneben — und drei Felder fuer dieselbe Sache
   * sind drei Stellen, an denen sie auseinanderlaufen kann.
   */
  requires: readonly ForgeNodeRequirement[]
  goldCost: number
  materialCost: Record<string, number>
  desc: string
  /**
   * Kurze Herkunftszeile, z. B. "Solar Sails + Quickening · +18% idle".
   *
   * Hiess einmal `pairLabel`, solange es immer genau zwei Knoten waren. Bei
   * dreien ist es kein Paar mehr; der Name sagt jetzt dasselbe wie beim
   * Relikt, und beide Vault-Arten fuehren damit dasselbe Feld.
   */
  sourceLabel: string
}

/**
 * `voidPurge` und `meeps` sind die zwei Handel, die nicht mit Zahlen bezahlen,
 * sondern mit dem Zustand der Welt: der eine räumt den offenen Riss, der andere
 * kauft anstehende Ausbeute vorzeitig frei. Beide brauchen deshalb einen
 * eigenen Zweig in `starForgeStore.buyBargain()` — ein `materials`-Handel mit
 * Sonderfall wäre eine zweite Bedeutung für dasselbe Wort.
 */
export type ForgeBargainKind =
  | 'buff'
  | 'materials'
  | 'gold'
  | 'dwellSkip'
  | 'heal'
  | 'voidPurge'
  | 'meeps'

/**
 * Die befristeten Handels-Buffs. `dropX2` kam mit der Phase Lantern dazu und
 * ist der erste, der nicht auf die Chime-Rate zielt — er wirkt in
 * `inventoryStore.tryDropMaterial`.
 */
export type ForgeBuffId = 'cpcX2' | 'cpsX2' | 'dropX2'

export interface ForgeBargainDef {
  id: string
  name: string
  /**
   * Motivfamilie statt festem Glyph: der Handel wird bei jedem Restock neu
   * ausgelegt, also trägt er auch jedes Mal ein anderes Zeichen
   * (`starForgeStore.activeDealIcon`).
   */
  iconPool: IconPoolKey
  desc: string
  basePrice: number
  /** 0–1 fraction knocked off basePrice. */
  discountPct: number
  kind: ForgeBargainKind
  buffId?: ForgeBuffId
  durationMs?: number
  materials?: Record<string, number>
  goldReward?: number
  /** Fraction of the remaining phase dwell time skipped. */
  dwellSkipPct?: number
  /** `meeps`: how many pending meeps the caravan hands over at once. */
  meepReward?: number
}

export interface ForgeActiveBuff {
  id: ForgeBuffId
  expiresAt: number
}

// ── Detailspalte des Shop-Tabs (StarForgePanel) ──────────────────────────────

/**
 * Die Abteilungen der Forge-Detailspalte, je ein Reiter.
 *
 * `upgrades` steht bewusst vorn: die drei anderen zeigen, was aus dem Baum
 * FOLGT — dieser zeigt den Baum selbst. Ohne ihn war alles Kaufbare nur als
 * Kreis auf der Leinwand erreichbar, einer nach dem anderen per Tooltip.
 */
export type ForgeSectionId = 'upgrades' | 'relics' | 'constellations' | 'bargain'

export interface ForgeSectionDef {
  id: ForgeSectionId
  label: string
  icon: string
  /** Leitfarbe der Abteilung — Herold-Akzent und Tooltipzeile lesen sie. */
  accent: string
}

/**
 * Eine Kostenposition, wie die Spalte sie zeigt: was verlangt wird UND was im
 * Lager liegt. Ein blankes „×5" beantwortet die Frage nicht, die der Spieler
 * beim Schmieden wirklich hat.
 */
export interface ForgeCostItem {
  id: string
  name: string
  image?: string
  need: number
  have: number
  /** Lager deckt die Position. */
  ok: boolean
}

/**
 * Die Kanten der Zeile, an der das schwebende Kärtchen der Upgrade-Liste hängt
 * (`ForgeRowTooltip`).
 *
 * Gemessen wird beim Hover-Wechsel und nur dort — nie pro Frame. Drei Zahlen
 * statt eines ganzen `DOMRect`, damit klar ist, dass Breite und Höhe der Zeile
 * hier nichts zu suchen haben: das Kärtchen richtet sich an ihrer Ober- oder
 * Unterkante aus und liegt links neben der Spalte.
 */
export interface ForgeRowTipAnchor {
  top: number
  bottom: number
  left: number
}

// ── Kaufbares im Baum: eine Fassung für Wurzeln UND Forge-Knoten ─────────────

/** Welcher Ring — Wurzeln liegen im solarUpgradeStore, der Rest im starForgeStore. */
export type ForgeUpgradeTier = 'root' | ForgeNodeTier

/**
 * Zustand eines Knotens, wie ihn Baum und Liste gleichermaßen lesen.
 *
 * `capped` und `locked` schließen sich gegenseitig aus und gehören je einem
 * Ring: nur Wurzeln kennen die Gleichwuchs-Sperre (`maxAllowedLevel`), nur die
 * Ringe darüber kennen eine Freischaltung über Phase und Elternstufe.
 */
export type ForgeUpgradeState = 'locked' | 'empty' | 'partial' | 'affordable' | 'capped' | 'maxed'

/**
 * Wohin ein Eintrag in der Upgrade-LISTE fällt — nicht zu verwechseln mit
 * seinem `state`, den auch der Baum liest.
 *
 * Der Zustand beschreibt den Knoten, der Topf beschreibt, was der Spieler mit
 * ihm anfangen kann. Deshalb sind es vier statt sechs: `empty`, `partial` und
 * `capped` landen gemeinsam in `reach` — alle drei zeigen eine volle Karte samt
 * Kosten, keiner von ihnen ist kaufbar.
 *
 * `ready` hängt an `canBuy`, nicht an `state === 'affordable'`. Hier stand, der
 * Zustand kenne nur die Chimes — das galt für die fünf Kernstrahlen und war ein
 * Fehler, kein Entwurf; er ist in `rootEntry()` behoben, und beide sagen jetzt
 * dasselbe. `canBuy` bleibt trotzdem der Träger: es ist das Feld, das die Frage
 * BEANTWORTET, während `affordable` nur eine Sprosse der Zustandsleiter ist.
 */
export type ForgeUpgradeBucketId = 'ready' | 'reach' | 'next' | 'grown'

/**
 * Warum ein Knoten zu ist — die drei Gründe, die `lockedFor()` unterscheidet.
 *
 * Sie sind für den Spieler NICHT dasselbe: gegen eine Phasensperre kann er
 * nichts tun ausser warten, eine Elternsperre kann er sofort angehen. Die
 * Upgrade-Liste trennt sie deshalb mit je einem eigenen Trenner. `''` heisst
 * offen.
 *
 * **`'prestige'` steht getrennt, weil die REQ-LISTE sonst luegt.** Ein
 * Kronen-Knoten ohne Aufbruch im Ruecken trägt eine vollständig ERFÜLLTE
 * Vorgaengerliste — und die Weiche „ab zwei Bedingungen zeigt die Liste statt
 * des Satzes“ griff bisher trotzdem. Der Spieler sah lauter Häkchen und
 * erfuhr nie, dass ihm ein Universum fehlt. Der dritte Wert schliesst die
 * Liste aus, genau wie `'phase'` es tut.
 *
 * **Wer hier einen vierten Wert ergänzt, prueft `ForgeUpgradesSection.vue`**:
 * die Gliederung filtert `pots.next` einmal auf `'phase'` und nimmt den REST
 * — zwei Filter, die zusammen nicht vollständig sind, liessen einen neuen
 * Grund aus der Liste verschwinden statt ihn falsch einzuordnen.
 */
export type ForgeLockKind = 'phase' | 'parent' | 'prestige' | ''

/**
 * Ein kaufbarer Knoten, fertig zum Anzeigen — ohne jede Geometrie.
 *
 * Der Baum hängt seine Polarkoordinaten daneben, die Liste nicht. Beide lesen
 * denselben Eintrag, damit ein Kauf auf der einen Seite die andere sofort
 * mitzieht und Kosten, Wirkung und Sperrgrund nirgends ein zweites Mal
 * gerechnet werden.
 */
export interface ForgeUpgradeEntry {
  id: string
  name: string
  icon: string
  color: string
  tier: ForgeUpgradeTier
  /** ROOT / BRANCH / LEAF — die Beschriftung des Tier-Chips. */
  tierLabel: string
  level: number
  /**
   * `Infinity` bei einem Bough — er wird deshalb nie `maxed`, und `level >=
   * maxLevel` bleibt für ihn dauerhaft falsch. Wer die Zahl ANZEIGT oder über
   * sie iteriert, muss sie vorher mit `Number.isFinite` abfangen.
   */
  maxLevel: number
  state: ForgeUpgradeState
  goldCost: number
  goldOk: boolean
  materials: ForgeCostItem[]
  /** Wirkungssatz auf der aktuellen Stufe — der ganze Satz, mit Zahl darin. */
  desc: string
  /** Derselbe Satz mit dem Wert der nächsten Stufe. */
  nextDesc: string
  /** Nur der Wert der aktuellen Stufe — die linke Hälfte der Now-→-After-Zeile. */
  nowText: string
  /** Nur der Wert nach dem Kauf — die rechte Hälfte. */
  nextText: string
  /** Klartext, warum gerade nicht gekauft werden kann — leer, wenn offen. */
  lockReason: string
  /**
   * WORAN die Sperre hängt, als Wert statt als Satz.
   *
   * `lockReason` daneben ist ein fertiger Satz für das Auge; wer danach
   * GRUPPIERT, müsste ihn beschnüffeln. Die Upgrade-Liste tut genau das: sie
   * setzt je Sperrgrund einen eigenen Trenner, weil „warte auf die Sonne" und
   * „lass erst den Elternknoten wachsen" zwei verschiedene Aufgaben sind — die
   * eine kann man nur abwarten, die andere sofort angehen.
   */
  lockKind: ForgeLockKind
  /**
   * Die Sonnenphase, die den Knoten öffnet — `-1`, wenn keine wartet (also bei
   * `lockKind` ≠ `'phase'`). Der Trenner nimmt daraus Name und Tönung; die Zahl
   * ist der INDEX in `STAR_PHASE_DATA`, nicht die angezeigte Phasennummer.
   */
  lockPhase: number
  /** Name des Elternknotens (Wurzel bei Branches, Branch bei Leaves). */
  parentName: string
  /**
   * ALLE Vorgänger dieses Knotens mit Fortschritt — der Elternteil zuerst, dann
   * seine `requires`. Ein Knoten mit nur einer Bedingung trägt hier genau einen
   * Eintrag; erst ab zwei zeigt die Zeile statt des Sperrsatzes eine Liste.
   *
   * Derselbe Typ wie bei den Konstellationen, und das mit Absicht: „Moon Orbit
   * 2/3" ist dieselbe Auskunft, egal ob sie an einem Angebot oder an einer Krone
   * hängt — `ForgeVaultSection` zeigt sie längst so.
   */
  reqs: ForgeOfferReq[]
  /** Fortschritt zur Freischaltung, 0–1 — nur bei `locked` aussagekräftig. */
  unlockProgress: number
  canBuy: boolean
}

// ── Was AUSSERHALB des Baums kaufbar ist: Relikt, Konstellation, Handel ──────
/**
 * Die drei Arten, die es neben dem Sternbaum noch gibt.
 *
 * Sie standen bis zum Umbau hinter je einem Reiter der Abteilungs-Rail und
 * teilen sich seitdem EINEN Streifen über der Upgrade-Liste. Die Art bleibt
 * trotzdem am Eintrag: sie entscheidet über das Verb im Kaufknopf, über den Chip
 * neben dem Namen und darüber, welchen Block das schwebende Kärtchen zeigt.
 */
export type ForgeOfferKind = 'relic' | 'constellation' | 'bargain'

/**
 * Eine Freischaltbedingung mit Fortschritt — „Moon Orbit 2/3".
 *
 * Nur Konstellationen tragen zwei davon; ein Relikt hat genau eine und zeigt sie
 * erst im Archiv, weil es im Streifen ohnehin nur erscheint, wenn sie erfüllt
 * ist.
 */
export interface ForgeOfferReq {
  id: string
  name: string
  have: number
  need: number
  met: boolean
  /** 0–1, für den Balken. */
  progress: number
}

/**
 * Ein Angebot, fertig zum Anzeigen — dieselbe Rolle wie `ForgeUpgradeEntry` für
 * den Baum.
 *
 * Drei Kataloge mit drei verschiedenen Formen werden hier auf EINE gebracht,
 * damit Streifen, Zeile und Kärtchen je einmal existieren statt dreimal. Was
 * eine Art nicht kennt, bleibt leer (`reqs`) oder `null` (`restockMs`) — keine
 * optionalen Felder, deren Fehlen man an drei Stellen abfangen müsste.
 */
export interface ForgeOffer {
  /**
   * Beim Handel die ID des GERADE ausliegenden Angebots, nicht die der
   * Abteilung: sie ist zugleich der Schlüssel, unter dem `acknowledgedShop` sich
   * merkt, dass der Spieler ihn gesehen hat, und ein neuer Bestand soll wieder
   * als neu gelten.
   */
  id: string
  kind: ForgeOfferKind
  name: string
  icon: string
  color: string
  /** `RARE` · `FUSION` · `Timed blessing · 2 h` — der Chip neben dem Namen. */
  tag: string
  /** `Forge` · `Fuse` · `Buy` — das Verb auf dem Kaufknopf. */
  verb: string
  /** Der volle Wirkungssatz, mit eingesetztem Wert. */
  desc: string
  level: number
  /** `0` bei allem Einmaligen (Konstellation, Handel) — dann gibt es keine Pips. */
  maxLevel: number
  /** Wirkung jetzt und nach dem Kauf; leer, wo es keine Stufen gibt. */
  nowText: string
  nextText: string
  gold: number
  goldOk: boolean
  materials: ForgeCostItem[]
  /** Alles bezahlt und alle Bedingungen erfüllt — DIE kaufbare Optik. */
  ready: boolean
  /** Leer außer bei Konstellationen. */
  reqs: ForgeOfferReq[]
  /** Nur der Handel hat eine Uhr; sonst `null`. */
  restockMs: number | null
  /** Nur der Handel: bereits gekauft, wartet auf den nächsten Bestand. */
  sold: boolean
  /** Nur der Handel: `0`, wenn es nichts abzuziehen gibt. */
  discountPct: number
}

/**
 * Was ins Archiv sinkt — ausgebaut oder fusioniert.
 *
 * Eine eigene, flachere Form als `ForgeOffer`: hier ist nichts zu entscheiden,
 * also braucht es weder Kosten noch Verb noch Bedingungen. Übrig bleibt der
 * BELEG — Name, Motiv, Wirkung und die Marke dafür.
 *
 * Sie trug einmal einen zweiten Zustand `'locked'` samt Sperrsatz, Zahlenpaar
 * und Balken: das Archiv führte auch, was der Spieler noch nicht freischalten
 * konnte. Seit die Detailspalte ausschliesslich Freigeschaltetes zeigt, ist
 * dieser Zustand gefallen — der Weg zu einem gesperrten Relikt steht am Baum,
 * wo sein Knoten die Bedingungen ohnehin führt.
 */
export interface ForgeVaultEntry {
  id: string
  kind: ForgeOfferKind
  name: string
  icon: string
  color: string
  desc: string
  /** `✦ MAX` oder `✦ FUSED`. */
  badge: string
}

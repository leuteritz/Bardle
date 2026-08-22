import type { MissionChapterDef, MissionDef, MissionMetricId } from '@/types'
import { MATERIALS } from '@/config/economy/materials'

// ═════════════════════════════════════════════════════════════════════════════
// THE WAYFINDER — die Leiter, an der Bard sich orientiert
//
// Vom ersten Klick bis in die späte Wanderung: immer genau EIN Ziel, immer das
// nächste. Das ist der Unterschied zu allem anderen im Spiel — die Omen legen
// eine Wahl vor, der Codex zählt acht Bahnen nebeneinander, hier steht eine
// Reihenfolge, und sie ist kuratiert.
//
// ── Die eine Regel, die das System trägt ────────────────────────────────────
// Der Wayfinder FÜHRT, also nimmt er nichts und sperrt nichts. Keine Frist,
// kein Einsatz, keine Freischaltung. Jedes Tor im Spiel steht schon in einer
// Konstante (`OMEN_UNLOCK_LEVEL`, `VOID_UNLOCK_LEVEL`, `FORGE_*_UNLOCK_PHASE`,
// die Preise in `PLANET_SLOT_CONFIG`); eine Mission ZEIGT auf ein Tor, sie ist
// nie selbst eines. Wäre sie eines, wäre die Leiter Pflicht statt Angebot — und
// jeder Spielstand, der vor ihr entstanden ist, hätte sein halbes Spiel
// plötzlich hinter ihr.
//
// Daraus folgt der Lohn: Chimes, Meeps, Material. NIE ein Buff (das ist die
// Währung der Omen) und NIE ein Prozentsatz (das ist die des Codex). Ein
// dauerhafter Multiplikator aus einer Anleitung wäre eine vierte Balance-Achse
// neben Forge, Meep-Baum und Solar, und drei sind laut `docs/balance.md` das
// Maximum.
//
// ── Warum absolut gemessen wird ─────────────────────────────────────────────
// `target` steht gegen den LEBENSZEIT-Stand der Metrik, nicht gegen einen bei
// Missionsbeginn eingefrorenen Startwert. Genau umgekehrt zu den Omen, und aus
// dem Grund, der sie unterscheidet: ein Vorzeichen ist eine Aufgabe, ein
// Meilenstein ist eine Stelle auf dem Weg. Wer sie überschritten hat, hat sie
// überschritten. Nur so trägt die Leiter auch einen Spielstand, der älter ist
// als sie — `missionStore.catchUpSilently()` setzt ihn beim ersten Laden ohne
// einen einzigen Banner auf seine wirkliche Position.
//
// ── Lauf-lokale Metriken ────────────────────────────────────────────────────
// `bardLevel` und `shopBuildingLevels` fallen beim Prestige auf null
// (`gameStore.executePrestigeReset`). Sie stehen deshalb NUR in Kapiteln vor
// `firstDeparture`; `missionLadder.spec.ts` bindet das.
//
// ── Zielmengen ──────────────────────────────────────────────────────────────
// Jede ist gegen das gehalten, was zu diesem Zeitpunkt tatsächlich erreichbar
// ist (Level-Kosten aus `chimeThresholdForLevel`, Gebäudepreise aus
// `SHOP_UPGRADE_CATALOG`, Slot-Preise aus `PLANET_SLOT_CONFIG`). Eine Mission,
// die auf ein noch gesperrtes System zeigt, ist eine Sackgasse — schlimmer als
// eine, die fehlt.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Die Kapitel. Das Zahlzeichen folgt aus dem Index, nie handgeschrieben.
 *
 * Die Leitfarbe hängt am Kapitel und nicht an der einzelnen Mission: über 41
 * Stufen gibt das der Leiter einen sichtbaren Bogen — Gold im Anfang, Violett
 * im Aufbruch, kaltes Grau in der langen Wache — statt 41 unabhängiger Töne.
 */
export const MISSION_CHAPTERS: MissionChapterDef[] = [
  { id: 'wakingOrbit', name: 'The Waking Orbit', color: '#e8c040' },
  { id: 'tendingSky', name: 'Tending the Sky', color: '#d0a8f0' },
  { id: 'theCompany', name: 'The Company', color: '#9a6fd0' },
  { id: 'deepField', name: 'The Deep Field', color: '#68c0a8' },
  { id: 'forgeAwakens', name: 'The Forge Awakens', color: '#f08030' },
  { id: 'beyondUniverse', name: 'Beyond the Universe', color: '#7ab8f0' },
  { id: 'longVigil', name: 'The Long Vigil', color: '#b8c4cc' },
]

export const MISSIONS: MissionDef[] = [
  // ══ I — The Waking Orbit ═══════════════════════════════════════════════════
  {
    id: 'firstTouch',
    chapter: 'wakingOrbit',
    name: 'First Touch',
    blurb: 'The sun has been waiting a long while for a hand.',
    objective: 'Strike the sun {n} times',
    icon: 'game-icons:click',
    metric: 'clicks',
    target: 10,
    unit: 'strikes',
    reward: { chimes: { flat: 25 } },
  },
  {
    id: 'firstLight',
    chapter: 'wakingOrbit',
    name: 'First Light',
    blurb: 'Chimes gather where the Caretaker passes.',
    objective: 'Gather {n} chimes',
    icon: 'game-icons:ringing-bell',
    metric: 'chimesEarned',
    // Zehn wäre im selben Takt erfüllt wie „First Touch" (zehn Klicks sind zehn
    // Chimes) und die Karte spränge zweimal ohne Spiel dazwischen. 50 ist die
    // kleinste Zahl, die nach dessen Belohnung noch etwas verlangt.
    target: 50,
    unit: 'chimes',
    reward: { chimes: { flat: 60 } },
  },
  {
    id: 'firstStone',
    chapter: 'wakingOrbit',
    name: 'The First Stone',
    blurb: 'Nothing keeps ringing on its own. Something has to hold the note.',
    objective: 'Raise {n} building in the shop',
    icon: 'game-icons:stone-block',
    // Bell Tower kostet 5 Chimes — nach „First Light" längst bezahlt, die
    // Mission zeigt also auf den Shop, sie sperrt ihn nicht.
    metric: 'shopBuildingLevels',
    target: 1,
    unit: 'buildings',
    reward: { chimes: { flat: 80, clicks: 40 } },
  },
  {
    id: 'standingOrder',
    chapter: 'wakingOrbit',
    name: 'Standing Order',
    blurb: 'A single tower is a curiosity. Ten are a habit.',
    objective: 'Raise {n} building levels in the shop',
    icon: 'game-icons:stone-pile',
    metric: 'shopBuildingLevels',
    target: 10,
    unit: 'buildings',
    reward: { chimes: { cpsSeconds: 60, flat: 250 } },
  },
  {
    id: 'firstAscent',
    chapter: 'wakingOrbit',
    name: 'The First Ascent',
    blurb: 'The cosmos takes note of who keeps showing up.',
    objective: 'Reach Bard level {n}',
    icon: 'game-icons:upgrade',
    metric: 'bardLevel',
    // 2 500 kumulierte Chimes — mit den zehn Gebäudestufen darüber etwa eine
    // Minute Produktion.
    target: 2,
    unit: 'level',
    reward: { chimes: { cpsSeconds: 90, flat: 400 } },
  },

  // ══ II — Tending the Sky ═══════════════════════════════════════════════════
  {
    id: 'firstWorld',
    chapter: 'tendingSky',
    name: 'A World of Your Own',
    blurb: 'Something small is turning out there, and nobody is watching it.',
    objective: 'Claim {n} planet slot in the Planets tab',
    icon: 'game-icons:ringed-planet',
    metric: 'planetSlotsOwned',
    target: 1,
    unit: 'planets',
    reward: { chimes: { cpsSeconds: 120, flat: 600 } },
  },
  {
    id: 'steadyHand',
    chapter: 'tendingSky',
    name: 'Steady Hand',
    blurb: 'The old way still works. It just works slowly.',
    objective: 'Strike the sun {n} times',
    icon: 'game-icons:hand',
    metric: 'clicks',
    target: 250,
    unit: 'strikes',
    reward: { chimes: { cpsSeconds: 120, clicks: 150 } },
  },
  {
    id: 'oneLessDark',
    chapter: 'tendingSky',
    name: 'One Less Dark',
    blurb: 'A light went out nearby. It does not have to stay out.',
    objective: 'Clear every planet at {n} star',
    icon: 'game-icons:star-formation',
    metric: 'starsRescued',
    target: 1,
    unit: 'stars',
    reward: { chimes: { cpsSeconds: 90 }, materials: [{ id: 'stardust', qty: 3 }] },
  },
  {
    id: 'somethingFeeding',
    chapter: 'tendingSky',
    name: 'Something Feeding',
    blurb: 'Not everything in the orbit is asleep.',
    objective: 'Put down {n} planet boss in the orbit',
    icon: 'game-icons:crowned-skull',
    metric: 'bossesDefeated',
    target: 1,
    unit: 'bosses',
    reward: { chimes: { cpsSeconds: 180 }, materials: [{ id: 'moon_crystal', qty: 2 }] },
  },
  {
    id: 'passingThings',
    chapter: 'tendingSky',
    name: 'Passing Things',
    blurb: 'The current carries more than dust.',
    objective: 'Catch {n} drifters crossing the orbit',
    icon: 'game-icons:ufo',
    metric: 'driftersCollected',
    target: 3,
    unit: 'drifters',
    reward: { chimes: { cpsSeconds: 180 }, materials: [{ id: 'comet_ice', qty: 2 }] },
  },
  {
    id: 'skyBeginsToSpeak',
    chapter: 'tendingSky',
    name: 'The Sky Begins to Speak',
    blurb: 'At this height the cosmos starts announcing itself.',
    // Genau `OMEN_UNLOCK_LEVEL`. Die Mission ist kein Tor — sie sagt nur, dass
    // hinter diesem Level eines aufgeht.
    objective: 'Reach Bard level {n}',
    icon: 'game-icons:all-seeing-eye',
    metric: 'bardLevel',
    target: 5,
    unit: 'level',
    reward: { chimes: { cpsSeconds: 240 } },
  },
  {
    id: 'oneWhoAnswered',
    chapter: 'tendingSky',
    name: 'The One Who Answered',
    blurb: 'A boss falls on a home world, and somebody remembers who freed it.',
    objective: 'Recruit {n} champions in the Team tab',
    icon: 'game-icons:three-friends',
    // `ownedChampions` startet mit Bard allein — zwei heißt: einer dazu.
    metric: 'championsRecruited',
    target: 2,
    unit: 'champions',
    reward: { meeps: 1, chimes: { cpsSeconds: 240 } },
  },

  // ══ III — The Company ══════════════════════════════════════════════════════
  {
    id: 'takeTheField',
    chapter: 'theCompany',
    name: 'Take the Field',
    blurb: 'A company that never leaves the shrine is just a crowd.',
    objective: 'Assign {n} champion in the Team tab',
    icon: 'game-icons:knight-banner',
    metric: 'teamSlotsFilled',
    target: 1,
    unit: 'slots',
    reward: { chimes: { cpsSeconds: 300 } },
  },
  {
    id: 'firstVictory',
    chapter: 'theCompany',
    name: 'The First Victory',
    blurb: 'The ladder keeps a record whether you ask it to or not.',
    objective: 'Win {n} ranked battle in the Rift tab',
    icon: 'game-icons:laurels',
    metric: 'battleWins',
    target: 1,
    unit: 'wins',
    reward: { chimes: { cpsSeconds: 300 }, materials: [{ id: 'moon_crystal', qty: 3 }] },
  },
  {
    id: 'growingStronger',
    chapter: 'theCompany',
    name: 'Growing Stronger',
    blurb: 'Nobody arrives finished.',
    objective: 'Raise {n} champion levels in the Team tab',
    icon: 'game-icons:muscle-up',
    metric: 'championLevelsGained',
    target: 10,
    unit: 'levels',
    reward: { chimes: { cpsSeconds: 360 } },
  },
  {
    id: 'debtsSettled',
    chapter: 'theCompany',
    name: 'Debts Settled',
    blurb: 'Old scores are being closed out on the rift.',
    objective: 'Land {n} champion kills',
    icon: 'game-icons:crossed-swords',
    metric: 'championKills',
    target: 25,
    unit: 'kills',
    reward: { materials: [{ id: 'nebula_quartz', qty: 3 }] },
  },
  {
    id: 'theLongRoads',
    chapter: 'theCompany',
    name: 'The Long Roads',
    blurb: 'Some errands take longer than a watch.',
    objective: 'Send {n} expedition from the Team tab',
    icon: 'game-icons:journey',
    metric: 'expeditionsCompleted',
    target: 1,
    unit: 'expeditions',
    reward: { chimes: { cpsSeconds: 420 } },
  },
  {
    id: 'fullRoster',
    chapter: 'theCompany',
    name: 'A Full Roster',
    blurb: 'Five stand in the orbit, and the shrine is quiet behind them.',
    objective: 'Fill all {n} orbit slots in the Team tab',
    icon: 'game-icons:meeple-group',
    metric: 'teamSlotsFilled',
    target: 5,
    unit: 'slots',
    reward: { meeps: 1, chimes: { cpsSeconds: 420 } },
  },

  // ══ IV — The Deep Field ════════════════════════════════════════════════════
  {
    id: 'threeInOrbit',
    chapter: 'deepField',
    name: 'Three in Orbit',
    blurb: 'Three worlds turning is not a system yet, but it is close.',
    objective: 'Hold {n} planet slots in the Planets tab',
    icon: 'game-icons:solar-system',
    // Slot 3 kostet 8 000 Chimes.
    metric: 'planetSlotsOwned',
    target: 3,
    unit: 'planets',
    reward: { chimes: { cpsSeconds: 420 } },
  },
  {
    id: 'wellDefended',
    chapter: 'deepField',
    name: 'Well Defended',
    blurb: 'A world that can hold its own asks less of the Caretaker.',
    objective: 'Raise {n} planet levels in the Planets tab',
    icon: 'game-icons:defensive-wall',
    metric: 'planetLevels',
    target: 20,
    unit: 'levels',
    reward: { materials: [{ id: 'solar_essence', qty: 3 }] },
  },
  {
    id: 'gleaning',
    chapter: 'deepField',
    name: 'Gleaning',
    blurb: 'What the orbit sheds, the orbit can be asked to give back.',
    objective: 'Gather {n} materials from bosses and drops',
    icon: 'game-icons:minerals',
    metric: 'materialsCollected',
    target: 50,
    unit: 'materials',
    reward: { chimes: { cpsSeconds: 480 } },
  },
  {
    id: 'handOnTheKit',
    chapter: 'deepField',
    name: 'Hand on the Kit',
    blurb: 'The Caretaker was never only a witness.',
    objective: 'Cast {n} abilities with Q, W, E or R',
    icon: 'game-icons:magic-swirl',
    metric: 'abilityCasts',
    target: 50,
    unit: 'casts',
    reward: { chimes: { cpsSeconds: 480 } },
  },
  {
    id: 'theTearInThings',
    chapter: 'deepField',
    name: 'The Tear in Things',
    blurb: 'Something on the other side has started pulling.',
    // Zeigt auf `VOID_UNLOCK_LEVEL` 12 — das Tor steht in der Konstante, nicht
    // hier.
    objective: 'Seal {n} void rift out in the orbit',
    icon: 'game-icons:vortex',
    metric: 'riftsSealed',
    target: 1,
    unit: 'rifts',
    reward: { chimes: { cpsSeconds: 540 }, materials: [{ id: 'void_shard', qty: 2 }] },
  },
  {
    id: 'fiveAndTwenty',
    chapter: 'deepField',
    name: 'Five and Twenty',
    blurb: 'The dark is measurably smaller than it was.',
    objective: 'Clear every planet at {n} stars',
    icon: 'game-icons:stars-stack',
    metric: 'starsRescued',
    target: 25,
    unit: 'stars',
    reward: { meeps: 1, chimes: { cpsSeconds: 540 } },
  },

  // ══ V — The Forge Awakens ══════════════════════════════════════════════════
  {
    id: 'firstEmber',
    chapter: 'forgeAwakens',
    name: 'The First Ember',
    blurb: 'The sun turns over, and the forge takes light from it.',
    objective: 'Evolve the sun to phase {n} in Journey',
    icon: 'game-icons:burning-embers',
    metric: 'starPhase',
    target: 1,
    unit: 'phase',
    reward: { chimes: { cpsSeconds: 600 } },
  },
  {
    id: 'tenAtTheAnvil',
    chapter: 'forgeAwakens',
    name: 'Ten at the Anvil',
    blurb: 'Depth is the only thing the forge measures.',
    objective: 'Forge {n} levels in the Star Forge',
    icon: 'game-icons:anvil',
    metric: 'forgeLevels',
    target: 10,
    unit: 'levels',
    reward: { chimes: { cpsSeconds: 600 } },
  },
  {
    id: 'breakingGround',
    chapter: 'forgeAwakens',
    name: 'Breaking Ground',
    blurb: 'Fifteen crowns in the dust, and the worlds notice.',
    objective: 'Put down {n} planet bosses in the orbit',
    icon: 'game-icons:broken-skull',
    metric: 'bossesDefeated',
    target: 15,
    unit: 'bosses',
    reward: { materials: [{ id: 'star_iron', qty: 3 }] },
  },
  {
    id: 'climbingLadder',
    chapter: 'forgeAwakens',
    name: 'Climbing the Ladder',
    blurb: 'Ten clean wins and the bracket stops treating you as new.',
    objective: 'Win {n} ranked battles in the Rift tab',
    icon: 'game-icons:ladder',
    metric: 'battleWins',
    target: 10,
    unit: 'wins',
    reward: { materials: [{ id: 'comet_ice', qty: 4 }] },
  },
  {
    id: 'deeperInTheForge',
    chapter: 'forgeAwakens',
    name: 'Deeper in the Forge',
    blurb: 'The outer rings are lit. The inner ones are asking.',
    objective: 'Forge {n} levels in the Star Forge',
    icon: 'game-icons:gear-hammer',
    metric: 'forgeLevels',
    target: 47,
    unit: 'levels',
    reward: { chimes: { cpsSeconds: 720 } },
  },
  {
    id: 'wardsAndPacts',
    chapter: 'forgeAwakens',
    name: 'Wards and Pacts',
    blurb: 'Two more rings open when the sun stands where it should.',
    objective: 'Evolve the sun to phase {n} in Journey',
    icon: 'game-icons:wax-seal',
    metric: 'starPhase',
    target: 3,
    unit: 'phase',
    reward: { chimes: { cpsSeconds: 720 }, materials: [{ id: 'solar_essence', qty: 4 }] },
  },
  {
    id: 'firstDeparture',
    // Der Aufbruch schließt DIESES Kapitel ab und eröffnet nicht das nächste:
    // das erste Prestige ist es, was die Kronen der Forge aufmacht
    // (`FORGE_CROWN_UNLOCK_PRESTIGES` = 1). „The Forge Awakens" endet also
    // genau hier — und ab der Mission dahinter steht keine lauf-lokale Metrik
    // mehr in der Leiter (siehe Kopf).
    chapter: 'forgeAwakens',
    name: 'The First Departure',
    blurb: 'Everything here can be set down. Very little of it is lost.',
    objective: 'Prestige {n} time from the header',
    icon: 'game-icons:star-gate',
    metric: 'prestiges',
    target: 1,
    unit: 'departures',
    reward: { meeps: 2 },
  },

  // ══ VI — Beyond the Universe ═══════════════════════════════════════════════
  {
    id: 'smallVoicesHeard',
    chapter: 'beyondUniverse',
    name: 'Small Voices Heard',
    blurb: 'The meeps came along, and they have opinions.',
    objective: 'Open {n} nodes in the Tree tab',
    icon: 'game-icons:meeple',
    metric: 'meepNodesBought',
    target: 3,
    unit: 'nodes',
    reward: { chimes: { cpsSeconds: 720 } },
  },
  {
    id: 'aGalaxyFreed',
    chapter: 'beyondUniverse',
    name: 'A Galaxy Freed',
    blurb: 'One whole spiral, and nothing left holding it down.',
    objective: 'Break {n} galaxy warden at the core',
    icon: 'game-icons:galaxy',
    metric: 'galaxiesFreed',
    target: 1,
    unit: 'galaxies',
    reward: { materials: [{ id: 'plasma_core', qty: 3 }] },
  },
  {
    id: 'aWideCompany',
    chapter: 'beyondUniverse',
    name: 'A Wide Company',
    blurb: 'Ten who answered, and the shrine has a sound to it now.',
    objective: 'Recruit {n} champions in the Team tab',
    icon: 'game-icons:meeple-army',
    metric: 'championsRecruited',
    target: 10,
    unit: 'champions',
    reward: { chimes: { cpsSeconds: 840 } },
  },
  {
    id: 'worldsSwept',
    chapter: 'beyondUniverse',
    name: 'Worlds Swept',
    blurb: 'Fifty worlds quiet again, and the count is not slowing.',
    objective: 'Clear {n} planets out in the orbit',
    icon: 'game-icons:planet-conquest',
    metric: 'planetsCleared',
    target: 50,
    unit: 'planets',
    reward: { chimes: { cpsSeconds: 840 } },
  },
  {
    id: 'thriceAway',
    chapter: 'beyondUniverse',
    name: 'Thrice Away',
    blurb: 'Leaving stops being a decision and becomes a rhythm of the work.',
    objective: 'Prestige {n} times from the header',
    icon: 'game-icons:infinity',
    metric: 'prestiges',
    target: 3,
    unit: 'departures',
    reward: { meeps: 3 },
  },

  // ══ VII — The Long Vigil ═══════════════════════════════════════════════════
  {
    id: 'aBillionRings',
    chapter: 'longVigil',
    name: 'A Billion Rings',
    blurb: 'The count stopped meaning anything a long way back.',
    objective: 'Gather {n} chimes',
    icon: 'game-icons:windchimes',
    metric: 'chimesEarned',
    target: 1_000_000_000,
    unit: 'chimes',
    reward: { chimes: { cpsSeconds: 900 } },
  },
  {
    id: 'theTreeInFull',
    chapter: 'longVigil',
    name: 'The Tree in Full',
    blurb: 'Every ring lit, and the forge still has room.',
    objective: 'Forge {n} levels in the Star Forge',
    icon: 'game-icons:tree-growth',
    metric: 'forgeLevels',
    target: 115,
    unit: 'levels',
    reward: { materials: [{ id: 'dark_matter', qty: 4 }] },
  },
  {
    id: 'fiveGalaxies',
    chapter: 'longVigil',
    name: 'Five Galaxies',
    blurb: 'Five wardens down, and the drift runs clear between them.',
    objective: 'Break {n} galaxy wardens at the core',
    icon: 'game-icons:andromeda-chain',
    metric: 'galaxiesFreed',
    target: 5,
    unit: 'galaxies',
    reward: { chimes: { cpsSeconds: 900 }, materials: [{ id: 'plasma_core', qty: 5 }] },
  },
  {
    id: 'theDarkHeldBack',
    chapter: 'longVigil',
    name: 'The Dark Held Back',
    blurb: 'Twenty-five tears closed. It keeps opening them.',
    objective: 'Seal {n} void rifts out in the orbit',
    icon: 'game-icons:black-hole-bolas',
    metric: 'riftsSealed',
    target: 25,
    unit: 'rifts',
    reward: { materials: [{ id: 'aether_dust', qty: 5 }] },
  },
  {
    id: 'theCaretakersWatch',
    chapter: 'longVigil',
    name: "The Caretaker's Watch",
    blurb: 'The sun stands at its last turning, and the watch goes on.',
    objective: 'Evolve the sun to phase {n} in Journey',
    icon: 'game-icons:heraldic-sun',
    // Die letzte Phase, die `STAR_PHASE_DATA` kennt. Als Zahl geschrieben und
    // von `missionLadder.spec.ts` gegen `STAR_PHASE_FINAL_INDEX` gehalten — der
    // Katalog importiert keine Konstanten, sonst stünde die Zielmenge zweimal
    // an zwei Orten.
    metric: 'starPhase',
    target: 5,
    unit: 'phase',
    reward: { meeps: 5 },
  },
]

// ── Abgeleitete Aggregate ────────────────────────────────────────────────────

export const MISSION_COUNT = MISSIONS.length

/** Missions-ID → Position in der Leiter. */
export const MISSION_INDEX: Record<string, number> = Object.fromEntries(
  MISSIONS.map((m, i) => [m.id, i]),
)

/** Eine Mission nach ihrer ID. */
export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id)
}

/** Kapitel-Index (0-basiert) einer Mission — Grundlage ihres Zahlzeichens. */
export function missionChapterIndex(def: MissionDef): number {
  return MISSION_CHAPTERS.findIndex((c) => c.id === def.chapter)
}

/** Kapitel-ID → Position der ersten Mission darin. Der Sprung des Admin-Panels
 *  und der Anker des Stats-Feldes. */
export const MISSION_CHAPTER_STARTS: Record<string, number> = Object.fromEntries(
  MISSION_CHAPTERS.map((c) => [c.id, MISSIONS.findIndex((m) => m.chapter === c.id)]),
)

/** Kapitel-ID → Zahl seiner Missionen. Nenner der Kopfzeile im Stats-Panel. */
export const MISSION_CHAPTER_SIZES: Record<string, number> = Object.fromEntries(
  MISSION_CHAPTERS.map((c) => [c.id, MISSIONS.filter((m) => m.chapter === c.id).length]),
)

/**
 * Die Zähler, die ein Prestige zurückzieht. Die Spec liest sie von hier und
 * hält sie gegen die Position von `firstDeparture` — eine dieser Metriken
 * dahinter stünde nach jedem Aufbruch wieder offen.
 */
export const MISSION_RUN_SCOPED_METRICS: readonly MissionMetricId[] = [
  'bardLevel',
  'shopBuildingLevels',
]

// ── Formatierer ──────────────────────────────────────────────────────────────

const MATERIAL_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m.name]),
)

/** „90s" bzw. „8m" — die Karte verspricht eine DAUER an Produktion, keine
 *  Zahl, die sich unter dem Cursor bewegt. */
function productionSpan(seconds: number): string {
  return seconds < 120 ? `${seconds}s` : `${Math.round(seconds / 60)}m`
}

/**
 * Der Lohn in einer Zeile: „+8m PRODUCTION", „+1 MEEP", „+3 STARDUST".
 *
 * Rein aus der Definition und damit statisch — die tatsächliche Menge rechnet
 * der Store im Moment der Auszahlung und trägt sie in Zeremonie und Log. Steht
 * hier und nicht in Store oder Komponente, weil DREI Stellen sie zeigen: die
 * HUD-Karte, der Tooltip der Vorschauzeile und das Stats-Panel.
 */
export function missionRewardLabel(def: MissionDef): string {
  const parts: string[] = []
  const chimes = def.reward.chimes
  if (chimes) {
    if (chimes.cpsSeconds) parts.push(`+${productionSpan(chimes.cpsSeconds)} PRODUCTION`)
    else if (chimes.flat) parts.push(`+${chimes.flat.toLocaleString()} CHIMES`)
    else if (chimes.clicks) parts.push(`+${chimes.clicks} CLICKS`)
  }
  if (def.reward.meeps) {
    parts.push(`+${def.reward.meeps} ${def.reward.meeps > 1 ? 'MEEPS' : 'MEEP'}`)
  }
  for (const mat of def.reward.materials ?? []) {
    parts.push(`+${mat.qty} ${(MATERIAL_NAME_BY_ID[mat.id] ?? mat.id).toUpperCase()}`)
  }
  return parts.join(' · ')
}

/** Die Aufgabe mit eingesetzter Menge — HUD-Karte und Stats-Panel. */
export function missionObjectiveLine(def: MissionDef): string {
  return def.objective.replace('{n}', def.target.toLocaleString())
}

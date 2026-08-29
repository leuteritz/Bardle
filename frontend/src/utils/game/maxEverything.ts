/**
 * Admin/testing only: bring every system to its end state in one call.
 *
 * Warum eine Datei und kein Composable: die Funktion komponiert Actions aus
 * sechzehn Stores. Ein Composable wäre der falsche Ort (die sind laut CLAUDE.md
 * UI-Helfer), ein Store ebenfalls — sie hält keinen Zustand, sie schreibt
 * fremden.
 *
 * **Die Reihenfolge ist der eigentliche Inhalt.** Falsch sortiert läuft die
 * Funktion glatt durch und maxt trotzdem nichts:
 *   - die Sonnenphase muss VOR der Forge stehen, sonst überspringt
 *     `starForgeStore.adminMaxAll()` jeden Knoten mit `phase > starPhase`
 *   - die Chimes müssen VOR den Planeten stehen, `levelUpPlanetTimes` zahlt echt
 *   - die Galaxie muss VOR den Champions stehen, sie bestimmt `levelCap`
 *   - die Augment-Automatik muss GANZ vorn stehen, sonst legt `adminSetLevel`
 *     ein blockierendes Auswahl-Modal über das Spiel
 *   - der Aufbruch-Nachtrag muss NACH dem Galaxiesprung stehen, seine Tore
 *     sitzen auf den Stempeln, die der Archiv-Nachtrag gerade vergeben hat
 *
 * Bewusst NICHT enthalten: `executePrestigeReset()` (setzt alles zurück — das
 * genaue Gegenteil), Auto-Battle und Auto-Level (laufende Automatiken, die jede
 * Messung verrauschen), jedes Spawnen von Sternen, Driftern oder Void — dafür
 * stehen die eigenen Panels daneben im selben Tab — und die Ortschronik, das
 * Omen und die Bossuhr, die alle drei eine laufende Szene sind, keinen Zustand.
 * Ein Endzustand ist ein Ausgangspunkt, keine laufende Szene.
 */
import { useGameStore } from '@/stores/core/gameStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useSkinStore } from '@/stores/champions/skinStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlanetShopStore, computePlanetMaxHp } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'

import { MATERIALS } from '@/config/economy/materials'
import { AUGMENTS } from '@/config/economy/augments'
import { SHOP_ITEMS, ITEM_SETS } from '@/config/economy/items'
import { SECTIONS } from '@/config/progression/sections'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { perkChoicesFor } from '@/config/champions/championLevels'
import { rollProvidence } from '@/config/progression/providences'
import { getChampionSkins } from '@/utils/game/champions'
import {
  ADMIN_MAX_BARD_LEVEL,
  ADMIN_MAX_CHIMES,
  ADMIN_MAX_GALAXY,
  ADMIN_MAX_MATERIAL_AMOUNT,
  ADMIN_MAX_PLANET_LEVEL,
  ADMIN_MAX_SKILL_POINTS,
  ADMIN_MAX_UNIVERSE,
  ADMIN_PERK_RESOLVE_GUARD,
  ADMIN_PROVIDENCE_ROLL_GUARD,
  ADMIN_RANK_PROMOTE_GUARD,
  ALLIES_PER_ROLE,
  CHAMPION_PERK_INTERVAL,
  ITEM_SLOT_COUNT,
  MAX_ABILITY_LEVEL,
  RESONANCE_MAX_STACKS,
  ROLES,
  RESONANCE_CLICKS_PER_STACK,
  SKIN_ORIGINAL,
  STAR_PHASE_FINAL_INDEX,
  TOTAL_SECTIONS,
  createEmptyAllyRows,
} from '@/config/constants'
import type { ChampionRole, ItemCategory, ShopItem } from '@/types'
import { logger } from '@/utils/logger'

/** Equip a random look: the default (Original) or any bundled alternate skin. */
function assignRandomSkin(name: string) {
  const skinStore = useSkinStore()
  const options = [SKIN_ORIGINAL, ...getChampionSkins(name).filter((s) => s !== SKIN_ORIGINAL)]
  skinStore.setSkin(name, options[Math.floor(Math.random() * options.length)])
}

/**
 * Unlocks the whole roster and seats it: one role-matching main per lane plus a
 * full bench, each champion used once, every seat given a random look.
 *
 * Lebt hier statt in der Komponente, weil zwei Admin-Knöpfe sie brauchen —
 * "Random Team Fill" und "Max Everything". Als Kopie stünde dieselbe Schleife
 * zweimal im Projekt und liefe beim ersten Nachjustieren auseinander.
 */
export function fillTeamWithRandomChampions(): void {
  const battleStore = useBattleStore()
  const planetShopStore = usePlanetShopStore()
  const itemStore = useItemStore()

  battleStore.unlockAllChampions()
  const roles = ROLES.map((r) => r.key) as ChampionRole[]
  const used = new Set<string>()
  const pool = [...battleStore.ownedChampions]
    .filter((c) => c !== 'Bard')
    .sort(() => Math.random() - 0.5)

  battleStore.headerSlots.splice(0, 5, null, null, null, null, null)
  battleStore.secondarySlots = createEmptyAllyRows()
  battleStore.syncTeam1ToSlots()

  // Vor dem Besetzen das Feld räumen: die Slot-Setter lehnen einen Champion ab,
  // der gerade unterwegs ist, und liessen sonst Lücken im Board zurück.
  const expeditionStore = useExpeditionStore()
  for (const mission of [...expeditionStore.activeExpeditions]) {
    expeditionStore.collectExpedition(mission.id)
  }

  roles.forEach((role, slotIndex) => {
    const roleMatch = pool.filter(
      (name) => !used.has(name) && (CHAMPION_ROLES[name] ?? []).includes(role),
    )
    const fallback = pool.filter((name) => !used.has(name))
    const pick =
      roleMatch.length > 0 ? roleMatch[Math.floor(Math.random() * roleMatch.length)] : fallback[0]
    if (!pick) return
    used.add(pick)
    battleStore.setHeaderSlot(slotIndex, pick)
    assignRandomSkin(pick)

    const secondaryPool = pool.filter(
      (name) => !used.has(name) && (CHAMPION_ROLES[name] ?? []).includes(role),
    )
    for (let subIndex = 0; subIndex < ALLIES_PER_ROLE; subIndex++) {
      if (secondaryPool.length === 0) break
      const idx = Math.floor(Math.random() * secondaryPool.length)
      const secondary = secondaryPool.splice(idx, 1)[0]
      used.add(secondary)
      battleStore.setSecondarySlot(slotIndex, subIndex, secondary)
      assignRandomSkin(secondary)
    }
  })

  planetShopStore.adminFillRandomRoles()
  itemStore.adminUnlockAllItems()
  itemStore.adminFillRandomEquipment()
}

/**
 * Settles every open milestone by taking the first still-available perk.
 *
 * Der Abbruchzähler ist Pflicht und kein Gürtel-und-Hosenträger: `choosePerk`
 * gibt bei einer ungültigen Wahl `false` zurück, OHNE den Eintrag aus
 * `pendingPerks` zu nehmen — ohne Zähler wäre das eine Endlosschleife.
 */
function resolvePendingPerks(): number {
  const levelStore = useChampionLevelStore()
  let resolved = 0
  let guard = ADMIN_PERK_RESOLVE_GUARD

  while (levelStore.pendingPerks.length > 0 && guard-- > 0) {
    const pending = levelStore.pendingPerks[0]
    const choices = perkChoicesFor(pending.level, levelStore.perkIdsOf(pending.champion))
    if (choices.length === 0 || !levelStore.choosePerk(pending.champion, choices[0].id)) {
      // Nichts mehr zu holen (alle Perks der Stufe schon vergeben) — der
      // Eintrag muss trotzdem weg, sonst nagt die UI ewig an ihm.
      levelStore.pendingPerks.shift()
      continue
    }
    resolved++
  }
  return resolved
}

/**
 * Puts the strongest COMPLETE item set on all five slots.
 *
 * „Vollständig" ist die eigentliche Bedingung: der Set-Bonus zählt nur, wenn
 * Waffe, Rüstung und Artefakt eines Slots dieselbe `setId` tragen — und ein Set
 * im Katalog führt gar keine Waffe, wäre also nie zu vollenden. Deshalb wird das
 * Beste zur Laufzeit aus dem Katalog bestimmt statt als ID hier festgeschrieben:
 * ein neues Set wirkt damit von selbst mit.
 */
function equipBestItemSet(): void {
  const itemStore = useItemStore()
  const categories: ItemCategory[] = ['weapon', 'armor', 'artefact']

  let best: { parts: ShopItem[]; score: number } | null = null
  for (const set of ITEM_SETS) {
    const parts = categories.map((category) =>
      SHOP_ITEMS.find((item) => item.setId === set.setId && item.category === category),
    )
    if (parts.some((part) => !part)) continue
    const score = (set.bonusEffect.cpsMultiplier ?? 1) * (set.bonusEffect.powerMultiplier ?? 1)
    if (!best || score > best.score) best = { parts: parts as ShopItem[], score }
  }
  if (!best) return

  for (const part of best.parts) {
    itemStore.ownedItems[part.id] = Math.max(itemStore.ownedItems[part.id] ?? 0, ITEM_SLOT_COUNT)
  }
  for (let slot = 0; slot < ITEM_SLOT_COUNT; slot++) {
    for (const part of best.parts) itemStore.equipItem(slot, part.id)
  }
}

export interface MaxEverythingResult {
  champions: number
  perks: number
  rank: string
  galaxy: number
  /** Universen mit einem Lauf im Archiv — die Tore auf der Firmament-Bahn. */
  universes: number
}

export function maxEverything(): MaxEverythingResult {
  const gameStore = useGameStore()
  const sectionStore = useSectionStore()
  const shopStore = useShopStore()
  const inventoryStore = useInventoryStore()
  const augmentStore = useAugmentStore()
  const battleStore = useBattleStore()
  const playerStore = usePlayerStore()
  const levelStore = useChampionLevelStore()
  const galaxyStore = useGalaxyStore()
  const planetShopStore = usePlanetShopStore()
  const solarStore = useSolarUpgradeStore()
  const forgeStore = useStarForgeStore()
  const meepTreeStore = useMeepTreeStore()
  const bardAbilityStore = useBardAbilityStore()
  const achievementStore = useAchievementStore()
  const missionStore = useMissionStore()

  // ① Sonne auf die Endphase — das Gate für Forge UND Planeten-Level, und
  //    zugleich die Zeile, ohne die gar nichts mehr rendert: bei `isCometState`
  //    greift jeder Sonnen-Renderer auf STAR_PHASE_DATA ins Leere.
  //    Kein `supernovaTrigger++` — der Kollaps ist ein einmaliges Vollbild-
  //    Cinematic (dafür steht der Star-Phase-Knopf daneben), kein Zustand.
  solarStore.isCometState = false
  solarStore.starPhase = STAR_PHASE_FINAL_INDEX
  solarStore.phaseEnteredAt = Date.now()
  solarStore.adminSkipDwellTime()

  // ② Ressourcen — die Planeten-Level unten kosten echte Chimes.
  gameStore.chimes = ADMIN_MAX_CHIMES
  gameStore.meeps = ADMIN_MAX_CHIMES
  gameStore.skillPoints = ADMIN_MAX_SKILL_POINTS
  for (const material of MATERIALS) {
    inventoryStore.collectedMaterials[material.id] = ADMIN_MAX_MATERIAL_AMOUNT
  }

  // ③ Bard: Level, alte Meep-Fähigkeiten, Resonance. Die Ränge von Q/W/E/R sind
  //    KEIN State — sie leiten sich aus dem Level ab, R braucht dafür 65.
  gameStore.adminSetLevel(ADMIN_MAX_BARD_LEVEL)
  gameStore.abilityLevels = gameStore.abilityLevels.map(() => MAX_ABILITY_LEVEL)
  bardAbilityStore.resonance = RESONANCE_MAX_STACKS
  bardAbilityStore.resonanceProgress = RESONANCE_CLICKS_PER_STACK - 1
  bardAbilityStore.resetCooldowns()

  // ④ Augments: alle gleichzeitig — und die Auswahl-Warteschlange abräumen, die
  //    `adminSetLevel` gerade gefüllt hat (ein offenes Modal plus bis zu neun
  //    Einträge, ADMIN_LEVEL_AUGMENT_QUEUE_MAX). Das geschieht synchron im selben
  //    Takt, Vue rendert das Modal also nie. Bewusst NICHT über
  //    `setAutoPickAugments(true)`: das ist eine Spielereinstellung, die dieser
  //    Knopf nicht umlegen soll, und sie schickte zehn Toasts hinterher.
  gameStore.pendingAugmentChoice = false
  gameStore.pendingAugmentOptions = []
  gameStore.pendingAugmentSelections = []
  gameStore.activeAugments = AUGMENTS.map((a) => a.id)
  // `registerAugment` ist nicht kosmetisch: es würfelt die Sondereffekte aus
  // (Keyboard Smash), ohne den Aufruf stünde die ID in der Liste, ohne zu wirken.
  for (const augment of AUGMENTS) augmentStore.registerAugment(augment.id, gameStore.activeAugments)

  // ⑤ Welt: Universum, Galaxie, Sections. KEIN executePrestigeReset — das würde
  //    alles zurücksetzen.
  gameStore.currentUniverse = ADMIN_MAX_UNIVERSE
  // Der Zähler muss zum Universum passen. Universum 10 ohne einen einzigen
  // Aufbruch war schon vorher ein Zustand, den kein Spielverlauf hergibt — seit
  // der Kronen-Ring der Forge (`FORGE_CROWN_UNLOCK_PRESTIGES`) daran hängt, ist
  // es zusätzlich ein Loch im Endzustand: Ring 5 bliebe zu, und ausgerechnet
  // der Ring, den es nur ganz am Ende gibt, fehlte im „alles gemaxt".
  //
  // `ADMIN_MAX_UNIVERSE - 1` und nicht die Zahl selbst: der erste Lauf steht in
  // Universum 1, ohne dass irgendetwas zurückgelassen wurde.
  gameStore.totalPrestiges = Math.max(gameStore.totalPrestiges, ADMIN_MAX_UNIVERSE - 1)
  gameStore.prestigeAvailable = true
  // …und die Vorsehung, unter der dieser Lauf steht. Neun Aufbrüche ohne eine
  // einzige gezogene Karte gibt es im Spiel nicht — und `universe` blieb
  // dadurch als einzige der acht erworbenen Herkünfte auf 1 stehen (gemessen
  // am Ertrags-Kopf, den es damals noch gab: „1 unused" nach diesem Knopf).
  //
  // Gewürfelt wird mit der ECHTEN Ziehung, nicht mit einer erfundenen Karte:
  // die Höhen kommen aus `PROVIDENCE_AXES` und sollen es auch hier. Gesucht
  // wird die Ziehung, deren BUFF auf der CpS-Achse liegt — nur dann trägt die
  // Zeile im Band, und ein Endzustand, in dem eine Herkunft nichts beiträgt,
  // ist genau das, was dieser Knopf herstellen soll. Der Abbruchzähler ist
  // Pflicht: `rollProvidence` wählt die Achse zufällig und kann die gesuchte
  // beliebig oft verfehlen.
  const providenceStore = useProvidenceStore()
  if (!providenceStore.active) {
    for (let tries = 0; tries < ADMIN_PROVIDENCE_ROLL_GUARD; tries++) {
      const rolled = rollProvidence('economy')
      if ((rolled.effects.cpsMultiplier ?? 1) > 1) {
        providenceStore.active = rolled
        break
      }
    }
  }
  galaxyStore.adminJumpToGalaxy(ADMIN_MAX_GALAXY)
  // Der Sprung endet in `commitAdvance()` mit einer offenen Rollenwahl, die das
  // Spiel anhält. Für einen Endzustand, der sofort spielbar sein soll, wird sie
  // auf dem regulären Weg beantwortet statt bloß weggeschaltet.
  if (galaxyStore.pendingRoleSelection) galaxyStore.confirmRoleSelection(ROLES[0].key)

  // Die neun Aufbrüche, die der Sprung überspringt. MUSS hier stehen und nicht
  // oben bei `currentUniverse`: die Tore der Firmament-Bahn hängen an den
  // Stempeln, die `adminJumpToGalaxy` eine Zeile darüber vergeben hat. Ohne sie
  // steht das Firmament auf fünfzig Galaxien und NULL Toren — jede Zeile der
  // Universumsleiste ausser der laufenden liest „not yet walked" und ist nicht
  // anklickbar.
  gameStore.adminBackfillUniverseRuns()
  // Die Ziele, die dieses Archiv eröffnet.
  useExpeditionChartStore().adminChartAll()

  sectionStore.highestUnlockedSectionId = TOTAL_SECTIONS
  for (const section of SECTIONS) {
    const progress = sectionStore.sectionProgress[section.id]
    if (!progress) continue
    progress.rescueCount = section.requiredRescues
    progress.completed = true
  }

  // ⑥ Kader — muss vor dem Leveln stehen, die Slots sind der Roster.
  fillTeamWithRandomChampions()

  // ⑦ Champion-Level für ALLE besessenen Champions, nicht nur die dreißig im
  //    Team: `adminLevelUpTeam` liest ausschließlich die Slots, die übrigen
  //    ~136 blieben auf Stufe 1. Die Perks werden gleich mitgesetzt, statt als
  //    hunderte offene Wahlen in `pendingPerks` zu landen.
  const cap = levelStore.levelCap
  let levelledChampions = 0
  for (const name of battleStore.ownedChampions) {
    const progress = levelStore.ensure(name)
    if (!progress) continue
    if (progress.level < cap) {
      levelStore.totalLevelsBought += cap - progress.level
      progress.level = cap
      progress.xp = 0
    }
    for (let lvl = CHAMPION_PERK_INTERVAL; lvl <= cap; lvl += CHAMPION_PERK_INTERVAL) {
      if (progress.perks[lvl]) continue
      const choices = perkChoicesFor(lvl, Object.values(progress.perks))
      if (choices.length > 0) progress.perks[lvl] = choices[0].id
    }
    levelledChampions++
  }
  // Was aus früherem Spiel noch offen lag, wird hier abgeräumt.
  const resolvedPerks = resolvePendingPerks()

  // ⑧ Wirtschaft, Forge, Baum. Die Forge steht bewusst NACH der Sonnenphase (①),
  //    sonst überspringt sie jeden Knoten mit `phase > starPhase`.
  forgeStore.adminMaxAll()
  meepTreeStore.adminUnlockAll()

  // ⑨ Ausrüstung: das beste VOLLSTÄNDIGE Set auf allen fünf Slots statt der
  //    zufälligen Bestückung aus ⑥ — ein Set zählt nur, wenn Waffe, Rüstung und
  //    Artefakt dieselbe `setId` tragen, und `arcane` hat gar keine Waffe.
  //    Der Bestand muss dafür auf die Slotzahl steigen: `adminUnlockAllItems`
  //    legt je Item genau EINES ins Inventar, `availableCount` liefe beim
  //    fünften Slot ins Negative.
  equipBestItemSet()

  // ⑩ Planeten. `adminFillRandomRoles` (in ⑥) kauft die Slots und verteilt
  //    Rollen, lässt aber Level, maxHp UND slotConfig unangetastet — und ohne
  //    Konfiguration produzieren zwei der sechs Rollen schlicht nichts:
  //    ein Harvest Node ohne `materialId` erntet nicht, ein Resonator ohne
  //    `rayId` legt auf nichts zu.
  for (const slot of planetShopStore.slots) {
    if (slot.role === 'harvest_node' && !slot.slotConfig?.materialId) {
      planetShopStore.setSlotConfig(slot.id, { materialId: MATERIALS[0].id })
    }
    if (slot.role === 'resonance_tower' && !slot.slotConfig?.rayId) {
      planetShopStore.setSlotConfig(slot.id, { rayId: 'chimesPerSecond' })
    }
    // Ein zerstörter Planet zählt nirgends mit — die Sperre muss weg.
    slot.downUntilMs = 0
    slot.healingUntilMs = 0
    // Level direkt statt über `levelUpPlanetTimes`: dessen Kostenkurve
    // (PLANET_LEVEL_COST_MULTIPLIER hoch Level) frisst auch 1e15 Chimes lange
    // vor Stufe 60 auf — der Aufruf blieb also irgendwo in der Mitte stehen,
    // und zwar bei jedem Druck woanders. Gratis ist hier ohnehin die Regel:
    // adminMaxBranches, adminMaxAll und adminUnlockAll zahlen auch nichts.
    slot.level = Math.max(slot.level, ADMIN_MAX_PLANET_LEVEL)
    slot.maxHp = computePlanetMaxHp(slot.level)
    slot.currentHp = slot.maxHp
  }

  // ⑪ Astral Codex still auf Vollstand. `evaluate(true)` schickte für jede der
  //    vierzig Stufen ein Herald-Banner über den Bildschirm.
  for (const track of CHRONICLE_TRACKS) achievementStore.stages[track.id] = track.stages.length
  achievementStore.markSeen()
  // …und die zweite stille Leiter. Sie stünde sonst TOT bei Stufe eins: der
  // Wayfinder rückt nur bei erfüllter Metrik vor, und die erste verlangt zehn
  // Klicks, die dieser Knopf nicht tut.
  missionStore.adminCompleteLadder()

  // ⑫ Ladder bis Challenger — adminPromoteRank steigt nur EINE Stufe je Aufruf.
  let rankGuard = ADMIN_RANK_PROMOTE_GUARD
  while (battleStore.currentRank.tier !== 'Challenger' && rankGuard-- > 0) {
    // Verglichen wird Tier UND Division: `promoteRank` klettert zuerst durch die
    // Divisionen (IV→III→II→I), das Tier steht dabei bis zu drei Aufrufe lang
    // still. Nur wenn sich gar nichts mehr rührt, kommt die Schleife auch nicht
    // weiter und liefe sonst bis zum Zähler leer.
    const before = `${battleStore.currentRank.tier}/${battleStore.currentRank.division}`
    battleStore.adminPromoteRank()
    if (`${battleStore.currentRank.tier}/${battleStore.currentRank.division}` === before) break
  }

  // ⑬ Aufräumen: maxHP ist in ⑧ gewachsen (adminMaxBranches und das Relikt
  //    „Heart of the Star" heben es), currentHP nicht — ohne diese
  //    Zeile startet der Endzustand mit einem Bruchteil Leben. CpS/CpC sind
  //    gecacht und gelten sonst erst nach dem nächsten Kauf.
  playerStore.currentHP = playerStore.maxHP
  shopStore.refreshRates()

  // …und die Augment-Automatik einschalten. Das ist KEINE Bequemlichkeit,
  // sondern die Bedingung dafür, dass der Endzustand überhaupt bedienbar ist:
  // die Levelkurve (LEVEL_BASE · Level^2,2) liefert bei den ~2 Mrd. CpS dieses
  // Zustands rund EIN Level je Sekunde, und jedes davon legt sonst ein
  // blockierendes Auswahl-Modal über das Spiel. Bewusst ganz am Schluss: vorn
  // gesetzt hätte sie die zehn Auswahlen aus `adminSetLevel` einzeln
  // durchgewürfelt und ebenso viele Meldungen geschickt.
  gameStore.setAutoPickAugments(true)

  const result: MaxEverythingResult = {
    champions: levelledChampions,
    perks: resolvedPerks,
    rank: battleStore.currentRank.tier,
    galaxy: galaxyStore.currentGalaxy,
    universes: gameStore.universeRuns.length,
  }
  logger.info('System', 'Max Everything applied', result)
  return result
}

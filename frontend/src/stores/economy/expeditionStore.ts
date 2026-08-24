import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { destinationFor, destinationWeight } from '@/config/economy/expeditionDestinations'
import type { ExpeditionDestination } from '@/config/economy/expeditionDestinations'
import { getChampionRoles } from '@/config/champions/championData'
import { getChampionOrigin } from '@/config/champions/championOrigins'
import { pickMaterial } from '@/config/economy/materials'
import { getForgeNode } from '@/config/progression/starForge'
import { useEventLog, type GameEventType } from '@/composables/ui/useEventLog'
import { formatNumber } from '@/config/ui/numberFormat'
import {
  EXPEDITION_POWER_BONUS_CAP,
  EXPEDITION_POWER_BONUS_SCALE,
  EXPEDITION_BASE_SUCCESS_CHANCE,
  EXPEDITION_FAILURE_REWARD_FRACTION,
  BADGE_LAB_EXPEDITION_DURATION_S,
  BADGE_LAB_EXPEDITION_ID_PREFIX,
  EXPEDITION_COLORS,
  EXPEDITION_AVAILABILITY_DURATION_MS,
  EXPEDITION_SPAWN_INTERVAL_MS,
  EXPEDITION_TIERS,
  EXPEDITION_NAME_ADJECTIVES,
  EXPEDITION_NAME_ACTIONS,
  EXPEDITION_DEST_RECENCY_WEIGHT,
  EXPEDITION_ID_RANDOM_MAX,
  CHAMPION_XP_EXPEDITION_PER_MINUTE,
  CHAMPION_XP_EXPEDITION_FAIL_SHARE,
  type ExpeditionTier,
  EXPEDITION_SUCCESS_CHANCE_MIN,
  EXPEDITION_SUCCESS_CHANCE_MAX,
  EXPEDITION_ROLE_MATCH_PENALTY,
  EXPEDITION_POWER_MALUS_CAP,
  EXPEDITION_HAZARDS,
  EXPEDITION_HAZARD_BY_ID,
  EXPEDITION_HAZARD_PENALTY,
  EXPEDITION_HAZARD_STAT_PER_MEMBER,
  EXPEDITION_CREW_POWER_PER_ROLE,
  EXPEDITION_SPOILS,
  EXPEDITION_LEDGER_RANKS,
  EXPEDITION_LEDGER_HISTORY_MAX,
} from '@/config/constants'
import type {
  ExpeditionMission,
  AvailableExpeditionSlot,
  ChampionRole,
  ExpeditionHazardId,
  ExpeditionChanceBreakdown,
  ExpeditionChanceEntry,
  ExpeditionLedgerRankDef,
  ExpeditionSpoilsPayout,
} from '@/types'
import { ICON_POOLS } from '@/config/ui/iconPools'
import { logger } from '@/utils/logger'
import { gameNow } from '@/utils/game/gameClock'

const ROLE_EVENT_TYPE: Record<ChampionRole, GameEventType> = {
  jungle: 'jungle',
  top: 'top',
  mid: 'mid',
  adc: 'adc',
  support: 'support',
}

const EXPEDITION_SUCCESS_MESSAGES: Record<ChampionRole, string[]> = {
  jungle: ['– The jungle answers. Chimes bloom.', '– Enemy camps cleared. Bard wanders on.'],
  top: ['– Tower falls. Victory whispers.', '– Side lane taken. Silence follows.'],
  mid: ['– Lane closed. Echoes of power linger.', '– Roam complete. A spark in the dark.'],
  adc: ['– Precision wins. Chimes follow.', '– Bot lane cleared. Objectives fall.'],
  support: ['– Vision secured. Allies find the path.', '– Wards planted deep. Darkness lifts.'],
}

const EXPEDITION_FAILURE_MESSAGES = [
  '– Lost to the void.',
  '– The expedition did not return…',
  '– Swallowed by darkness.',
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ALL_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

export const useExpeditionStore = defineStore('expedition', {
  state: () => ({
    activeExpeditions: [] as ExpeditionMission[],
    completedExpeditions: [] as ExpeditionMission[],
    availableExpeditions: [] as AvailableExpeditionSlot[],
    nextSpawnAt: 0 as number,
    /** Lifetime counters for the Bard Stats catalog — survive the completed-run list being trimmed. */
    totalExpeditionsStarted: 0,
    totalExpeditionsSucceeded: 0,
    totalExpeditionsFailed: 0,
    /** Chimes ever paid out by resolved expeditions (successes and consolation rewards). */
    totalExpeditionChimes: 0,
    /**
     * Every mission ever resolved, success or not — the ledger rank reads this.
     * Separate from the success/fail tallies because a rank is earned by RUNNING
     * expeditions, not by winning them; a run that goes badly still taught the
     * crew the route.
     */
    ledgerCompleted: 0,
    /**
     * Crew the player has picked for an offer but not sent yet, keyed by slot id.
     * Lives in the store rather than the component so a closed and reopened tab
     * does not throw the lineup away — but it is deliberately NOT persisted:
     * offers expire within minutes, so a draft never outlives a session.
     */
    draftCrews: {} as Record<string, (string | null)[]>,
  }),

  getters: {
    /** Missionen, die zurück sind und auf das Einsammeln warten — die Zahl hinter
     *  jeder Expeditions-Marke. Stand früher wortgleich an sechs Stellen. */
    readyExpeditions(): ExpeditionMission[] {
      return this.activeExpeditions.filter((e) => e.status !== 'active')
    },

    readyExpeditionCount(): number {
      return this.readyExpeditions.length
    },

    championsOnExpedition(): string[] {
      return this.activeExpeditions.flatMap((e) => e.assignedChampions.map((c) => c.name))
    },

    /** Ledger standing — the highest rank whose requirement is met. */
    ledgerRank(): ExpeditionLedgerRankDef {
      let rank = EXPEDITION_LEDGER_RANKS[0]
      for (const r of EXPEDITION_LEDGER_RANKS) {
        if (this.ledgerCompleted >= r.required) rank = r
      }
      return rank
    },

    /** The rank being worked towards, or null once the last one is held. */
    nextLedgerRank(): ExpeditionLedgerRankDef | null {
      return EXPEDITION_LEDGER_RANKS.find((r) => r.required > this.ledgerCompleted) ?? null
    },

    /** Missions that may be in the field at once — widens with ledger rank. */
    maxActiveExpeditions(): number {
      return this.ledgerRank.activeSlots
    },

    /** Contracts that may sit on the board at once — widens with ledger rank. */
    maxAvailableOffers(): number {
      return this.ledgerRank.offerSlots
    },

    /**
     * Der Lohnfaktor einer ERFOLGREICHEN Expedition — die EINE Stelle der Kette.
     * Eine zweite Fassung für die Prognose auf der Karte löge, sobald jemand ein
     * Glied ergänzt. `gameStore.expeditionRewardMultiplier` floss auch vorher
     * nicht ein.
     */
    expeditionRewardMultiplier(): number {
      return (
        usePlanetShopStore().planetExpeditionRewardMultiplier *
        useMeepTreeStore().fx.expeditionRewardMult *
        useProvidenceStore().expeditionRewardMult *
        // Star Forge zahlt hier auf die BEUTE, nicht auf das Tempo —
        // `expeditionSpeedMult` läuft gegen einen Boden, dieser Faktor nicht.
        useStarForgeStore().expeditionRewardMult
      )
    },

    /** Was eine Mission bei Erfolg bzw. Fehlschlag auszahlen würde. */
    projectedRewardFor(): (mission: Pick<ExpeditionMission, 'baseReward'>) => {
      success: number
      failure: number
    } {
      return (mission) => ({
        success: Math.floor(mission.baseReward * this.expeditionRewardMultiplier),
        failure: Math.floor(mission.baseReward * EXPEDITION_FAILURE_REWARD_FRACTION),
      })
    },

    canStartExpedition(): boolean {
      return (
        this.activeExpeditions.filter((e) => e.status === 'active').length <
        this.maxActiveExpeditions
      )
    },
  },

  actions: {
    /**
     * Crew strength: every stat of every member, summed.
     *
     * All four stats count so that levelling ANY champion pays off here, whatever
     * their role grows into — an expedition is not a fight, and a support who is
     * all focus should be worth as much on the road as an adc who is all power.
     * Sworn allies ride along through `effectiveStatsOf`.
     */
    crewPowerOf(names: string[]): number {
      const levelStore = useChampionLevelStore()
      let total = 0
      for (const name of names) {
        const s = levelStore.effectiveStatsOf(name)
        total += s.power + s.vitality + s.focus + s.fortune
      }
      return total
    },

    /** Summed value of ONE stat across the crew — what a stat hazard is measured against. */
    crewStatOf(names: string[], stat: 'power' | 'vitality' | 'focus' | 'fortune'): number {
      const levelStore = useChampionLevelStore()
      return names.reduce((sum, name) => sum + levelStore.effectiveStatsOf(name)[stat], 0)
    },

    /**
     * The success chance, itemised.
     *
     * Every line is signed and additive, so what the player reads on the card is
     * literally the sum the dice use. That is the whole point of the rework: the
     * old formula multiplied a role-synergy factor onto the total, which is not a
     * quantity anyone can reason about while swapping a champion in and out.
     */
    chanceBreakdownFor(
      assignedChampions: { name: string; role: ChampionRole }[],
      slot: Pick<
        AvailableExpeditionSlot,
        'requiredRoles' | 'minPowerThreshold' | 'hazards' | 'hazardThreshold'
      >,
    ): ExpeditionChanceBreakdown {
      const names = assignedChampions.map((c) => c.name)
      const entries: ExpeditionChanceEntry[] = []

      // ── Role cover ──────────────────────────────────────────────────────────
      const allRolesMatched = slot.requiredRoles.every((requiredRole) =>
        assignedChampions.some((champ) => getChampionRoles(champ.name).includes(requiredRole)),
      )
      if (!allRolesMatched) {
        entries.push({
          id: 'roleMatch',
          label: 'Role mismatch',
          icon: 'game-icons:split-arrows',
          value: -EXPEDITION_ROLE_MATCH_PENALTY,
          detail: 'A required role has no champion who plays it',
        })
      }

      // ── Crew strength ───────────────────────────────────────────────────────
      const crewPower = this.crewPowerOf(names)
      const ratio = slot.minPowerThreshold > 0 ? crewPower / slot.minPowerThreshold : 1
      const raw = (ratio - 1) * EXPEDITION_POWER_BONUS_SCALE
      const powerValue = Math.max(
        -EXPEDITION_POWER_MALUS_CAP,
        Math.min(EXPEDITION_POWER_BONUS_CAP, raw),
      )
      entries.push({
        id: 'crewPower',
        label: 'Crew strength',
        icon: 'game-icons:mighty-force',
        value: powerValue,
        detail: `${Math.round(crewPower)} / ${Math.round(slot.minPowerThreshold)} needed`,
      })

      // ── Hazards ─────────────────────────────────────────────────────────────
      for (const hazardId of slot.hazards ?? []) {
        const def = EXPEDITION_HAZARD_BY_ID[hazardId]
        if (!def) continue

        let mitigation = 0
        let detail = ''

        if (def.kind === 'stat' && def.counterStat) {
          const have = this.crewStatOf(names, def.counterStat)
          const need = slot.hazardThreshold
          mitigation = need > 0 ? Math.min(1, have / need) : 1
          detail = `${def.counterStat.toUpperCase()} ${Math.round(have)} / ${Math.round(need)}`
        } else {
          const origins = names.map((n) => getChampionOrigin(n))
          const known = origins.filter((o): o is NonNullable<typeof o> => o !== null)
          if (def.kind === 'kinship') {
            const shared = known.some((o, i) => known.indexOf(o) !== i)
            mitigation = shared ? 1 : 0
            detail = shared ? 'Two of one origin — answered' : 'No two crew share an origin'
          } else {
            const allDistinct = new Set(known).size === names.length
            mitigation = allDistinct ? 1 : 0
            detail = allDistinct ? 'All origins distinct — answered' : 'Two crew share an origin'
          }
        }

        const value = -EXPEDITION_HAZARD_PENALTY * (1 - mitigation)
        entries.push({
          id: `hazard:${hazardId}`,
          label: def.name,
          icon: def.icon,
          value,
          detail,
        })
      }

      // ── Ledger standing ─────────────────────────────────────────────────────
      const rank = this.ledgerRank
      if (rank.chanceBonus > 0) {
        entries.push({
          id: 'ledger',
          // Named by what it is, not by its flavour title — "Pathwarden standing"
          // told a player nothing about where the bonus came from.
          label: 'Expedition rank',
          icon: rank.icon,
          value: rank.chanceBonus,
          detail: `Rank ${rank.tier} of ${EXPEDITION_LEDGER_RANKS.length}`,
        })
      }

      // ── Star Forge: Pathfinder's Oath ───────────────────────────────────────
      // Als eigene Zeile und nicht still auf `base`: die Aufschlüsselung ist die
      // einzige Stelle, an der der Spieler sieht, WOHER seine Chance kommt, und
      // ein Ward, der dort nicht auftaucht, wäre ein Geschenk ohne Absender.
      const oath = useStarForgeStore().expeditionSuccessBonusPct
      if (oath > 0) {
        // Name und Motiv kommen aus dem Katalog statt aus einer zweiten
        // Konstante — steht der Knoten eines Tages anders da, steht er hier
        // gleich mit.
        const oathDef = getForgeNode('pathfindersOath')
        entries.push({
          id: 'forgeOath',
          label: oathDef?.name ?? 'Star Forge',
          icon: oathDef?.icon ?? '',
          value: oath / 100,
          detail: 'Star Forge ward',
        })
      }

      const sum = entries.reduce((acc, e) => acc + e.value, EXPEDITION_BASE_SUCCESS_CHANCE)
      const total = Math.max(
        EXPEDITION_SUCCESS_CHANCE_MIN,
        Math.min(EXPEDITION_SUCCESS_CHANCE_MAX, sum),
      )

      return { base: EXPEDITION_BASE_SUCCESS_CHANCE, entries, total }
    },

    calculateSuccessChance(
      assignedChampions: { name: string; role: ChampionRole }[],
      requiredRoles: ChampionRole[],
      minPowerThreshold: number,
      hazards: ExpeditionHazardId[] = [],
      hazardThreshold = 0,
    ): number {
      return this.chanceBreakdownFor(assignedChampions, {
        requiredRoles,
        minPowerThreshold,
        hazards,
        hazardThreshold,
      }).total
    },

    /**
     * Badge Lab: n abgeschlossene Missionen einhängen.
     *
     * `assignedChampions` bleibt LEER, und zwar nicht aus Bequemlichkeit:
     * `championsOnExpedition` liest daraus, und `eligibleChampions` sperrt jeden
     * dort genannten Namen — eine erfundene Crew nähme dem Spieler echte
     * Champions weg. Leer ist beim Einsammeln ein reiner No-Op.
     *
     * Name, Glyph und Farbe kommen aus denselben Pools wie eine echte Mission,
     * damit sie im Feld nicht anders aussieht. Der ID-Präfix ist der einzige
     * Unterschied — sie landet im Spielstand und muss sich wiederfinden lassen.
     */
    adminSeedResolved(n: number): number {
      const now = gameNow()
      let added = 0
      for (let i = 0; i < Math.max(0, n); i++) {
        const adj = pickRandom(EXPEDITION_NAME_ADJECTIVES)
        const action = pickRandom(EXPEDITION_NAME_ACTIONS)
        // Dasselbe Namensmuster wie eine echte Mission; ohne befreite Galaxie
        // fehlt nur das Ziel darin.
        const dest = this._pickDestination()
        const target = dest?.name ?? 'Uncharted'
        const colorDef = pickRandom(EXPEDITION_COLORS)
        const reward = EXPEDITION_TIERS.common.rewardMin
        this.activeExpeditions.push({
          id: `${BADGE_LAB_EXPEDITION_ID_PREFIX}-${now}-${i}`,
          configId: '',
          name: `${adj} ${target} ${action}`,
          description: 'Badge Lab test mission',
          icon: pickRandom(ICON_POOLS.journey as string[]),
          requiredRoles: [],
          assignedChampions: [],
          durationSeconds: BADGE_LAB_EXPEDITION_DURATION_S,
          startTime: now - BADGE_LAB_EXPEDITION_DURATION_S * 1000,
          baseReward: reward,
          successChance: 100,
          status: 'success',
          reward,
          colorKey: colorDef.key,
          galaxy: dest?.galaxy ?? 1,
          tier: 'common',
          hazards: [],
          spoils: { materials: [], meep: 0 },
        })
        added++
      }
      return added
    },

    /** Gegenstück — nimmt NUR die Missionen mit dem Präfix, echte bleiben. */
    adminClearSeeded(): number {
      const before = this.activeExpeditions.length
      this.activeExpeditions = this.activeExpeditions.filter(
        (e) => !e.id.startsWith(BADGE_LAB_EXPEDITION_ID_PREFIX),
      )
      return before - this.activeExpeditions.length
    },

    /**
     * Wohin der nächste Vertrag führt.
     *
     * Gewichtet zur zuletzt befreiten Galaxie hin, aber nie ausschliesslich:
     * ein hartes Fenster machte jedes frühe Ziel am Tag seiner Befreiung tot,
     * eine Gleichverteilung liesse die Hälfte aller Verträge dorthin laufen, wo
     * der Spieler vor Stunden war.
     */
    _pickDestination(): ExpeditionDestination | null {
      const records = useGalaxyStore().completedGalaxies
      if (!records.length) return null

      const maxFreed = records.reduce((max, r) => Math.max(max, r.galaxy), 0)
      const weights = records.map((r) =>
        destinationWeight(r.galaxy, maxFreed, EXPEDITION_DEST_RECENCY_WEIGHT),
      )
      const total = weights.reduce((sum, w) => sum + w, 0)
      let roll = Math.random() * total
      for (let i = 0; i < records.length; i++) {
        roll -= weights[i]
        if (roll <= 0) return destinationFor(records[i])
      }
      return destinationFor(records[records.length - 1])
    },

    _spawnOneExpedition(now: number) {
      // Ohne befreite Galaxie gibt es kein Ziel und damit keinen Vertrag.
      const dest = this._pickDestination()
      if (!dest) return

      const tier = dest.tier
      const tierDef = EXPEDITION_TIERS[tier]

      // Der Zielname steht IM Missionsnamen — die drei Wortlisten von früher
      // nannten Orte, die es im Spiel nicht gab.
      const adj = pickRandom(EXPEDITION_NAME_ADJECTIVES)
      const action = pickRandom(EXPEDITION_NAME_ACTIONS)
      const name = `${adj} ${dest.name} ${action}`

      // Das Glyph kommt aus der Reise-Motivfamilie und wird EINMAL beim Auslegen
      // gezogen — es steht danach in der Mission und wandert mit ihr durch den
      // Spielstand. Zwei gleichzeitig ausliegende Verträge sehen so gut wie nie
      // gleich aus, weil der Pool deutlich größer ist als die drei Slots.
      const icon = pickRandom(ICON_POOLS.journey as string[])

      const baseReward =
        Math.round((randInt(tierDef.rewardMin, tierDef.rewardMax) * dest.rewardMult) / 10) * 10
      // Solar Sails (Star Forge) + Portal Winds (Meep Tree): expeditions complete faster
      // Swift Relay / Far Wanderer (providence) zieht an derselben Zahl — die
      // Laufzeit steht beim AUSLEGEN fest, ein Wechsel der Vorsehung rührt
      // ausliegende und laufende Missionen also nicht mehr an.
      const speedMult =
        useStarForgeStore().expeditionSpeedMult *
        useMeepTreeStore().fx.expeditionSpeedMult *
        useProvidenceStore().expeditionSpeedMult
      const durationSeconds = Math.max(
        5,
        Math.round((randInt(tierDef.durMin, tierDef.durMax) * dest.durationMult * speedMult) / 5) *
          5,
      )

      // Die Sitzzahl wächst mit der Tiefe des Ziels: eine erste befreite Galaxie
      // verlangt einen Champion, eine späte den vollen Trupp.
      const roleCount = randInt(1, dest.maxRoles)
      const requiredRoles = shuffle(ALL_ROLES).slice(0, roleCount) as ChampionRole[]

      const minPowerThreshold = Math.round(
        EXPEDITION_CREW_POWER_PER_ROLE[tier] * roleCount * dest.powerMult +
          randInt(0, 20 * roleCount),
      )
      const hazardThreshold = Math.round(
        EXPEDITION_HAZARD_STAT_PER_MEMBER[tier] * roleCount * dest.hazardMult,
      )

      // A one-champion crew cannot answer a composition hazard — kinship needs two
      // of a kind and diversity is vacuously true — so those only go on missions
      // that field a real crew.
      const hazardPool =
        roleCount >= 2 ? EXPEDITION_HAZARDS : EXPEDITION_HAZARDS.filter((h) => h.kind === 'stat')
      const hazards = shuffle([...hazardPool])
        .slice(0, Math.min(dest.hazardCount, hazardPool.length))
        .map((h) => h.id)

      const lastKey = this.availableExpeditions.at(-1)?.colorKey
      const colorPool = lastKey
        ? EXPEDITION_COLORS.filter((c) => c.key !== lastKey)
        : EXPEDITION_COLORS
      const colorDef = pickRandom(colorPool)

      const slot: AvailableExpeditionSlot = {
        id: `avail-${tier}-${now}-${Math.floor(Math.random() * EXPEDITION_ID_RANDOM_MAX)}`,
        colorKey: colorDef.key,
        spawnedAt: now,
        availableUntil: now + EXPEDITION_AVAILABILITY_DURATION_MS,
        galaxy: dest.galaxy,
        tier,
        name,
        icon,
        baseReward,
        durationSeconds,
        requiredRoles,
        minPowerThreshold,
        hazards,
        hazardThreshold,
      }
      this.availableExpeditions.push(slot)
    },

    forceSpawn() {
      this._spawnOneExpedition(gameNow())
    },

    checkAvailability() {
      // Ohne befreite Galaxie gibt es keine Ziele — dann liegt auch nichts aus.
      if (!useGalaxyStore().completedGalaxies.length) return
      const now = gameNow()
      /* The Waiting Road (Konstellation): ein Angebot verfaellt nicht mehr, es
         wartet. Nur die Verfallspruefung entfaellt — die Nachschub-Schleife
         darunter bleibt unangetastet, `maxAvailableOffers` deckelt die Auslage
         weiterhin, und der Spieler sitzt nicht auf einem wachsenden Berg. */
      if (!useStarForgeStore().expeditionOffersWait) {
        const expired = this.availableExpeditions.filter((s) => s.availableUntil <= now)
        for (const slot of expired) delete this.draftCrews[slot.id]
        this.availableExpeditions = this.availableExpeditions.filter((s) => s.availableUntil > now)
      }

      while (
        this.availableExpeditions.length < this.maxAvailableOffers &&
        now >= this.nextSpawnAt
      ) {
        this._spawnOneExpedition(now)
        // Cartographer's Pact verkürzt das Fenster zwischen zwei Angeboten.
        this.nextSpawnAt =
          now + EXPEDITION_SPAWN_INTERVAL_MS * useStarForgeStore().expeditionSpawnMult
      }
    },

    /**
     * Champions eligible for a crew seat: owned, not Bard, not on the sigil
     * board, not already in the field. Deliberately NOT filtered by role —
     * putting a mid into a support seat is a legitimate move that costs the
     * role-cover penalty and may still win on raw stats.
     *
     * Der Board-Ausschluss ist die tragende Regel des Systems: wer kämpft,
     * reist nicht. `assignedChampions` deckt Kopfslots UND Verbündete ab.
     */
    eligibleChampions(excluding: string[] = []): string[] {
      const battleStore = useBattleStore()
      const inField = this.championsOnExpedition
      const seated = battleStore.assignedChampions
      return battleStore.ownedChampions.filter(
        (c: string) =>
          c !== 'Bard' && !inField.includes(c) && !seated.includes(c) && !excluding.includes(c),
      )
    },

    /** The lineup quickstart would send — best available champion per required role. */
    autoCrewFor(slot: AvailableExpeditionSlot): (string | null)[] {
      const used: string[] = []
      return slot.requiredRoles.map((role) => {
        const pool = this.eligibleChampions(used).filter((c) => getChampionRoles(c).includes(role))
        if (!pool.length) return null
        // Strongest first, so quickstart is a genuinely good default rather than
        // whoever happens to sit first in the roster.
        const best = pool.reduce((a, b) => (this.crewPowerOf([b]) > this.crewPowerOf([a]) ? b : a))
        used.push(best)
        return best
      })
    },

    /** The crew currently staged for an offer — the draft, or the auto lineup. */
    crewFor(slot: AvailableExpeditionSlot): (string | null)[] {
      const draft = this.draftCrews[slot.id]
      if (!draft || draft.length !== slot.requiredRoles.length) return this.autoCrewFor(slot)
      // A drafted champion can leave for another mission between edits — or be
      // seated on the board, which under the hard split disqualifies them just
      // the same.
      const inField = this.championsOnExpedition
      const seated = useBattleStore().assignedChampions
      return draft.map((name) =>
        name && (inField.includes(name) || seated.includes(name)) ? null : name,
      )
    },

    setCrewMember(slot: AvailableExpeditionSlot, index: number, champion: string | null) {
      const current = [...this.crewFor(slot)]
      if (index < 0 || index >= current.length) return
      // A champion holds one seat at a time — taking a second clears the first.
      if (champion) {
        const previous = current.indexOf(champion)
        if (previous !== -1 && previous !== index) current[previous] = null
      }
      current[index] = champion
      this.draftCrews[slot.id] = current
    },

    resetCrew(slotId: string) {
      delete this.draftCrews[slotId]
    },

    startExpedition(slotId: string, assignedChampions: { name: string; role: ChampionRole }[]) {
      if (
        this.activeExpeditions.filter((e) => e.status === 'active').length >=
        this.maxActiveExpeditions
      )
        return false

      const slotIdx = this.availableExpeditions.findIndex((s) => s.id === slotId)
      if (slotIdx === -1) return false

      const slot = this.availableExpeditions[slotIdx]
      // Dieselbe Regel wie in `checkAvailability`: waehrend die Konstellation
      // steht, ist das Zeitfenster kein Tor mehr. Ohne diese Zeile laege ein
      // Angebot ewig aus und liesse sich trotzdem nicht annehmen.
      if (!useStarForgeStore().expeditionOffersWait && slot.availableUntil < gameNow()) return false

      if (assignedChampions.length !== slot.requiredRoles.length) return false

      const battleStore = useBattleStore()
      const onExpedition = this.championsOnExpedition
      if (assignedChampions.some((c) => onExpedition.includes(c.name))) return false
      // Das Board gewinnt: es speist den Kampf in jedem Frame, eine Expedition
      // die jemanden herunterzöge wäre ein stiller DPS-Verlust.
      if (assignedChampions.some((c) => battleStore.assignedChampions.includes(c.name)))
        return false

      const successChance = this.chanceBreakdownFor(assignedChampions, slot).total

      const expedition: ExpeditionMission = {
        id: `exp-${slot.id}-${gameNow()}`,
        configId: slot.id,
        name: slot.name,
        description: '',
        icon: slot.icon,
        requiredRoles: slot.requiredRoles,
        assignedChampions,
        durationSeconds: slot.durationSeconds,
        startTime: gameNow(),
        baseReward: slot.baseReward,
        successChance,
        status: 'active',
        reward: 0,
        colorKey: slot.colorKey,
        galaxy: slot.galaxy,
        tier: slot.tier,
        hazards: [...slot.hazards],
      }

      this.availableExpeditions.splice(slotIdx, 1)
      delete this.draftCrews[slot.id]
      this.activeExpeditions.push(expedition)
      this.totalExpeditionsStarted += 1
      logger.info('Expedition', `Started: ${slot.name} (${slot.tier})`, {
        champions: assignedChampions.map((c) => c.name),
        successChance,
        colorKey: slot.colorKey,
        galaxy: slot.galaxy,
      })

      // Kein Räumen von Board-Sitzen mehr: wer geschickt werden DARF, sass per
      // Definition nicht auf dem Board.

      return true
    },

    /** Rolls the non-chime haul of a successful run. Failures get none of it. */
    _rollSpoils(tier: ExpeditionTier): ExpeditionSpoilsPayout {
      const def = EXPEDITION_SPOILS[tier]
      const byId: Record<string, number> = {}
      for (let i = 0; i < def.materialRolls; i++) {
        if (Math.random() > def.materialChance) continue
        const material = pickMaterial()
        byId[material.id] = (byId[material.id] ?? 0) + 1
      }
      return {
        materials: Object.entries(byId).map(([id, qty]) => ({ id, qty })),
        meep: def.meep,
      }
    },

    checkExpeditions() {
      const now = gameNow()
      for (const expedition of this.activeExpeditions) {
        if (expedition.status !== 'active') continue
        const elapsed = now - expedition.startTime
        if (elapsed >= expedition.durationSeconds * 1000) {
          const success = Math.random() < expedition.successChance
          expedition.status = success ? 'success' : 'failure'
          const projected = this.projectedRewardFor(expedition)
          expedition.reward = success ? projected.success : projected.failure
          if (success) this.totalExpeditionsSucceeded += 1
          else this.totalExpeditionsFailed += 1
          this.totalExpeditionChimes += expedition.reward
          // Spoils are rolled HERE, not at collect time, so the result card can
          // show what came back before the player touches it — and so a save
          // reloaded between resolve and collect hands over the same haul.
          // Pilgrim's Accord (Star-Forge-Krone): eine GESCHEITERTE Expedition
          // bringt ihre Materialien trotzdem heim.
          //
          // Der Fehlschlag bleibt einer — Zeit, Chime-Lohn und Champion-XP sind
          // weiterhin gekürzt; nur die Rezeptur kommt zurück. Die Meeps bleiben
          // ausdrücklich draussen: sie sind der Lohn des AUFBRUCHS und die
          // Währung des Skill-Trees, und ein Fehlschlag, der sie voll zahlt,
          // machte den Unterschied zwischen Erfolg und Misserfolg zur Nebensache.
          const salvage = !success && useStarForgeStore().failedExpeditionKeepsMaterials
          if (success) {
            expedition.spoils = this._rollSpoils(expedition.tier ?? 'common')
          } else if (salvage) {
            expedition.spoils = {
              materials: this._rollSpoils(expedition.tier ?? 'common').materials,
              meep: 0,
            }
          } else {
            expedition.spoils = { materials: [], meep: 0 }
          }
          // Wanderer's Gate (Star-Forge-Krone): die zurückkehrende Expedition
          // öffnet die nächste Passage sofort, statt die Spawn-Wartezeit
          // abzusitzen. Es wird nur die UHR zurückgesetzt — der Deckel
          // `maxAvailableOffers` in `checkAvailability` bleibt unangetastet,
          // sonst füllte das Tor die Liste über ihre eigene Grenze hinaus.
          if (useStarForgeStore().expeditionInstantRespawn) this.nextSpawnAt = 0
          logger.info(
            'Expedition',
            `Resolved: ${expedition.name} - ${expedition.status.toUpperCase()}`,
            { reward: expedition.reward },
          )
        }
      }
    },

    collectExpedition(expeditionId: string) {
      const idx = this.activeExpeditions.findIndex((e) => e.id === expeditionId)
      if (idx === -1) return

      const expedition = this.activeExpeditions[idx]
      if (expedition.status === 'active') return

      const gameStore = useGameStore()
      gameStore.chimes += expedition.reward
      gameStore.chimesForNextUniverse += expedition.reward
      gameStore.calculateLevel()
      gameStore.checkPrestigeAvailability()

      const { addEvent } = useEventLog()
      const primaryRole = expedition.requiredRoles[0] ?? null
      const eventType: GameEventType = primaryRole ? ROLE_EVENT_TYPE[primaryRole] : 'info'
      const rewardStr = `+${formatNumber(expedition.reward)}`
      let flavor: string
      if (expedition.status === 'success') {
        const pool = primaryRole
          ? EXPEDITION_SUCCESS_MESSAGES[primaryRole]
          : ['– Mission complete.']
        flavor = pool[Math.floor(Math.random() * pool.length)]
      } else {
        flavor =
          EXPEDITION_FAILURE_MESSAGES[
            Math.floor(Math.random() * EXPEDITION_FAILURE_MESSAGES.length)
          ]
      }
      addEvent(`${expedition.name} ${flavor} (${rewardStr})`, eventType)

      // Spoils — the reason to run expeditions at all. Materials are otherwise
      // only farmable from boss kills and drifters, so this is the one place a
      // player can convert idle time into them on purpose.
      const spoils = expedition.spoils
      if (spoils) {
        const inventory = useInventoryStore()
        for (const { id, qty } of spoils.materials) {
          inventory.addMaterial(id, 'expedition', qty)
        }
        gameStore.grantMeeps(spoils.meep)
      }

      // Champion XP — paid per minute in the field, so long missions are worth
      // sending a champion away for. A failed run still teaches something, just
      // less. This is the only XP source that reaches benched champions.
      //
      // This used to read `expedition.champions`, a field that has never existed
      // on the mission: it threw on every single collect, before the splice below
      // could run. The mission stayed in its slot while the chimes above were
      // already paid, so a second click paid them again.
      const levelStore = useChampionLevelStore()
      const minutes = expedition.durationSeconds / 60
      let xp = minutes * CHAMPION_XP_EXPEDITION_PER_MINUTE
      if (expedition.status !== 'success') xp *= CHAMPION_XP_EXPEDITION_FAIL_SHARE
      for (const { name } of expedition.assignedChampions) {
        levelStore.grantXpWithAllies(name, xp)
      }

      // Die Kartografie zählt die REISE, nicht den Erfolg: auch ein Trupp, der
      // schlecht heimkommt, hat den Weg gesehen. Nur der Kartierungspunkt selbst
      // hängt am Erfolg — sonst wäre der Fehlschlag folgenlos.
      const chart = useExpeditionChartStore()
      const galaxy = expedition.galaxy ?? 1
      chart.recordRun(galaxy, expedition.status === 'success' ? 1 : 0)
      chart.prune()

      this.activeExpeditions.splice(idx, 1)
      this.completedExpeditions.unshift(expedition)
      this.ledgerCompleted += 1

      if (this.completedExpeditions.length > EXPEDITION_LEDGER_HISTORY_MAX) {
        this.completedExpeditions = this.completedExpeditions.slice(
          0,
          EXPEDITION_LEDGER_HISTORY_MAX,
        )
      }
    },
  },
})

import { defineStore } from 'pinia'
import type { PlanetBossEvent, PlanetBossRewardSlot, PlanetType } from '@/types'
import {
  BOSS_BASE_HP,
  FORGE_CROWN_BOSS_WOUND_FLOOR,
  BOSS_TARGET_KILL_SECONDS,
  BOSS_HP_PER_GALAXY,
  BOSS_ENRAGE_BASE_SECONDS,
  BOSS_ENRAGE_LEVEL_STEP,
  BOSS_ENRAGE_MAX_SECONDS,
  BOSS_PASSIVE_DPS_FRACTION,
  BOSS_CPS_PENALTY_FRACTION,
  BOSS_CPS_PENALTY_DURATION_MS,
  BOSS_NAMES,
  BOSS_ENRAGE_BONUS_SECONDS_PER_STEP,
  BOSS_ENRAGE_MIN_SECONDS,
  BOSS_REWARD_CHIMES_MAX,
  BOSS_REWARD_MATERIAL_CHANCE,
  BOSS_REMOVAL_DELAY_MS,
  BOSS_REMOVAL_LONG_DELAY_MS,
  BOSS_UNIVERSE_PROGRESS_FRACTION,
  CHAMPION_XP_BOSS_BASE,
  CHAMPION_XP_BOSS_PER_GALAXY,
  CHAMPION_XP_GALAXY_BOSS_MULT,
  CHAMPION_XP_CHAMPION_PLANET_MULT,
  CHAMPION_XP_BOSS_ESCORT_MULT,
  BOSS_REMOVE_DELAY_MS,
} from '@/config/constants'
import { pickMaterial } from '@/config/economy/materials'
import { CHAMPION_HOME_PLANETS } from '@/config/champions/championHomePlanets'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import {
  getChampionStarLevel,
  unlockedChampionTierCount,
  tierSpawnWeights,
} from '@/config/champions/championTiers'
import { activeMidCurse } from '@/utils/orbit/liveState'
import { gameNow, gameTimeout } from '@/utils/game/gameClock'
import { bossClickBudgetHP, bossTargetClicks } from '@/utils/game/bossScaling'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
import { bossPlanetInForeground } from '@/utils/orbit/foregroundGate'
import { prewarmBossSprite } from '@/utils/fx/bossSprite'
import { ROLE_MID_CURSE_DAMAGE_AMP } from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useCombatStore } from '@/stores/battle/combatStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { SECTIONS } from '@/config/progression/sections'
import { logger } from '@/utils/logger'

export const usePlanetBossStore = defineStore('planetBoss', {
  state: () => ({
    activeBosses: [] as PlanetBossEvent[],
    /**
     * Remembered Wound (Star-Forge-Krone): welchen Anteil seiner HP ein
     * ENTKOMMENER Boss behalten hat, je Planet.
     *
     * Ein Anteil und keine absolute Zahl: die Höchst-HP hängen an
     * `totalBossesDefeated` und am Schaden des Spielers, sind beim nächsten
     * Erscheinen also andere. Eine gespeicherte HP-Zahl wäre dann entweder
     * lächerlich klein oder grösser als das neue Maximum.
     *
     * Der Eintrag wird beim nächsten Spawn desselben Planeten VERBRAUCHT — die
     * Wunde ist eine Erinnerung an genau einen entkommenen Kampf, kein
     * Dauerzustand.
     */
    woundedPlanets: {} as Record<string, number>,
    selectedBossId: null as string | null,
    bossModalOpen: false,
    lastBossResult: null as 'victory' | 'defeat' | null,
    cpsPenaltyActive: false,
    cpsPenaltyExpiresAt: 0,
    lastDroppedMaterialId: null as string | null,
    // Monotoner Zähler: inkrementiert bei jeder Turret-Salve (gameStore-Tick) —
    // Idle-Orbit-Schüsse UND Star-Fight-Turret-Battery teilen diesen Takt
    turretVolleyCounter: 0,
    /** Lifetime counters for the Bard Stats catalog. */
    totalBossesDefeated: 0,
    totalBossesLost: 0,
    /** Damage ever dealt to planet bosses, across every fight. */
    totalBossDamage: 0,
    /**
     * Effektiver Schaden des zuletzt über `dealDamageToBoss` gebuchten Treffers.
     *
     * Der Rückkanal für `dealClickDamage()`, damit die Arena die ECHTE
     * Schadenszahl anzeigen kann, ohne die Multiplikatorkette (Fluch, Star
     * Forge, Meep-Baum, Achievements) ein zweites Mal auszurechnen — zwei
     * Rechnungen für dieselbe Zahl laufen auseinander, sobald jemand eine
     * anfasst. Transient, kein Save-Feld.
     */
    lastHitDamage: 0,
  }),

  getters: {
    activeBoss(): PlanetBossEvent | null {
      if (this.selectedBossId) {
        return this.activeBosses.find((b) => b.planetId === this.selectedBossId) ?? null
      }
      return this.activeBosses.find((b) => !b.defeated && !b.expired) ?? null
    },

    isBossActive(): boolean {
      return this.activeBosses.some((b) => !b.defeated && !b.expired)
    },

    bossHPPercent(): number {
      const boss = this.activeBoss
      if (!boss) return 0
      return Math.max(0, (boss.currentHP / boss.maxHP) * 100)
    },

    /**
     * Der Zoll, den ein laufender Bossplanet auf die Chime-Produktion legt.
     *
     * **Sunderer's Mark (Star-Forge-Krone) KIPPT ihn.** Steht der Boss unter
     * `bossTollFlipsBelowPct` seiner HP, wird aus `1 − BRUCH` ein `1 + BRUCH`:
     * derselbe Betrag, andere Richtung. Das ist die einzige Stelle im Spiel, an
     * der eine Strafe zu einem Bonus wird, und sie ist der Grund für die Krone —
     * gegen den Boss-Zoll gab es bis dahin kein Kaufangebot, nur Warten.
     *
     * Gemessen wird am STÄRKSTEN noch lebenden Boss, nicht am ausgewählten:
     * `activeBoss` folgt der Anzeige (`selectedBossId`), und ein Zoll, der davon
     * abhinge, welche Karte der Spieler gerade offen hat, wäre nicht zu
     * erklären. Solange auch nur EIN Boss über der Schwelle steht, gilt der Zoll.
     */
    cpsPenaltyMultiplier(): number {
      if (!this.cpsPenaltyActive) return 1
      const flipBelow = useStarForgeStore().bossTollFlipsBelowPct
      if (flipBelow > 0) {
        const living = this.activeBosses.filter((b) => !b.defeated && !b.expired)
        const allBelow = living.length > 0 && living.every((b) => b.currentHP / b.maxHP < flipBelow)
        if (allBelow) return 1 + BOSS_CPS_PENALTY_FRACTION
      }
      return 1 - BOSS_CPS_PENALTY_FRACTION
    },

    /**
     * Schaden EINES Klicks, bevor situative Verstärker greifen — die eine Zahl,
     * an der sowohl der ausgeteilte Schaden als auch die HP-Erwartung hängen.
     *
     * Alle fünf Quellen liegen hier zusammen, weil dieser Store sie ohnehin
     * schon importiert; sie ein zweites Mal in `gameStore` aufzuzählen wäre eine
     * zweite Quelle für dieselbe Grösse.
     *
     * Der Hexblight-Amp (`ROLE_MID_CURSE_DAMAGE_AMP`, `dealDamageToBoss`) gehört
     * bewusst NICHT dazu: er ist befristet, und die HP eines Bosses dürfen nicht
     * davon abhängen, ob beim Spawn gerade ein Fluch lief.
     *
     * **Gerundet wie beim Buchen, und das ist keine Kosmetik.** Die Erwartung
     * wächst mit der Wurzel, der gebuchte Schaden in ganzen Schritten — rechnete
     * sie mit dem ungerundeten Wert, hübe ein schwaches Upgrade (clickPower 1,4)
     * das Budget um 18 %, während der ausgeteilte Schaden gerundet auf 1 stehen
     * bliebe: der Spieler hätte investiert und bräuchte MEHR Klicks. Mit
     * derselben Rundung auf beiden Seiten kann die Klickzahl nur fallen.
     */
    clickPower(): number {
      return Math.max(
        1,
        Math.round(
          useGameStore().dmgPerClick *
            useSolarUpgradeStore().dmgMultiplier *
            useStarForgeStore().bossDamageMult *
            useMeepTreeStore().fx.bossDamageMult *
            useAchievementStore().bossDamageMult,
        ),
      )
    },
  },

  actions: {
    spawnBoss(
      planetId: string,
      planetType: PlanetType,
      isChampionPlanet = false,
      noEnrage = false,
      isChampionEscort = false,
      opts: { isGalaxyBoss?: boolean; isBossEscort?: boolean } = {},
    ) {
      const gameStore = useGameStore()

      const level = gameStore.level
      const cps = gameStore.chimesPerSecond

      const galaxyStore = useGalaxyStore()
      const sectionStore = useSectionStore()
      const sectionConfig = SECTIONS.find((s) => s.id === sectionStore.activeSectionId)
      const hpSectionMult = sectionConfig?.difficultyMultiplier ?? 1
      const enrageSectionMult = sectionConfig?.enrageMultiplier ?? 1

      const galaxyMult = 1 + galaxyDepth(galaxyStore.currentGalaxy) * BOSS_HP_PER_GALAXY
      const providence = useProvidenceStore()
      const forge = useStarForgeStore()

      // Der Kampf hat seine EIGENE Klickzahl (`gameStore.dmgPerClick`), nicht den
      // Chime-Klickwert. Beides an einem Wert hiess: eine Änderung an der
      // Wirtschaft verschob still die Boss-HP mit — und zwar unsymmetrisch,
      // weil `BOSS_BASE_HP` unten als Boden greift, der Klickschaden aber nicht.
      // Das hier ist der AUSGETEILTE Schaden — in die HP-Schätzung geht er
      // nicht ein, sonst hebt jedes Upgrade die HP gleich mit an (s. unten).
      const clickDamagePerHit = Math.max(1, gameStore.dmgPerClick)
      const passiveDPS = Math.max(0, Math.floor(cps * BOSS_PASSIVE_DPS_FRACTION))

      // Die HP laufen über ZWEI Kanäle, und der Klick gehört bewusst nicht in
      // den ersten:
      //
      //   otherDps — was der Spieler ohne Zutun aufbringt (Passivschaden, die
      //     ganze Turret-Batterie, der Kader im Orbit). Davon so viele Sekunden,
      //     wie der Kampf stehen soll.
      //   clickBudgetHP — die entworfene Klickzahl, umgerechnet über den
      //     ERWARTETEN Klickschaden: das geometrische Mittel aus der Basis und
      //     dem, was der Spieler wirklich austeilt. Steht der volle Klickschaden
      //     stattdessen darin, kürzt er sich gegen den Nenner beim Klicken weg —
      //     dann kostet jeder Boss dieselbe Klickzahl, für immer, und jedes
      //     Klick-Upgrade verpufft. Steht nur die Basis darin, schrumpft der
      //     Kanal seit BOSS_CLICK_DAMAGE_BASE = 1 gegen `otherDps` ins
      //     Bedeutungslose. Die halbe Potenz hält beides offen.
      //
      // Details an BOSS_TARGET_KILL_SECONDS und in `utils/game/bossScaling.ts`.
      const otherDps =
        passiveDPS + usePlanetShopStore().autoAttackDPS + useCombatStore().fullOrbitDps()

      const targetClicks = bossTargetClicks(this.totalBossesDefeated, galaxyStore.currentGalaxy)
      const clickBudgetHP = bossClickBudgetHP(
        this.totalBossesDefeated,
        galaxyStore.currentGalaxy,
        this.clickPower,
      )

      const maxHP = Math.max(
        BOSS_BASE_HP,
        Math.floor(
          // Die Multiplikatoren liegen auf der SUMME: der Klickanteil soll in
          // späteren Galaxien und härteren Sektionen mitwachsen.
          (otherDps * BOSS_TARGET_KILL_SECONDS + clickBudgetHP) *
            hpSectionMult *
            galaxyMult *
            // Warden's Toll (providence): schwerer zu fällen, dafür ergiebiger
            providence.bossHpMult *
            // Hollow Core (Ward): der EINZIGE Weg, an dieser Formel zu drehen,
            // ohne sie zu brechen. Ein Knoten auf den SCHADEN kürzt sich weg,
            // weil `otherDps` oben in derselben Gleichung steht
            // (docs/balance.md); ein Faktor auf das ERGEBNIS verschiebt die
            // entworfene Klickzahl sauber um seinen eigenen Betrag.
            forge.bossHpMult,
        ),
      )

      /* Remembered Wound: ein Boss, der beim letzten Mal entkommen ist, steht
         mit der Wunde wieder auf, die er davongetragen hat.

         Verschoben wird NUR der Startwert. `maxHP` bleibt, wie die Formel oben
         sie rechnet — dieselbe Trennung wie bei `hollowCore`, das am Ergebnis
         dreht und nicht am Schaden. Würde die Wunde stattdessen `maxHP`
         senken, sänke die Beute mit, und ein knapp entkommener Boss wäre beim
         zweiten Mal weniger wert als beim ersten.

         Der Boden verhindert den Gegner, der praktisch tot erscheint: das ist
         kein Kampf mehr, sondern ein Klick. */
      const wound = this.woundedPlanets[planetId]
      delete this.woundedPlanets[planetId]
      const startHP =
        wound === undefined
          ? maxHP
          : Math.max(Math.ceil(maxHP * FORGE_CROWN_BOSS_WOUND_FLOOR), Math.ceil(maxHP * wound))

      const bonusSeconds =
        Math.floor(level / BOSS_ENRAGE_LEVEL_STEP) * BOSS_ENRAGE_BONUS_SECONDS_PER_STEP
      const baseEnrageSec = Math.min(
        BOSS_ENRAGE_BASE_SECONDS + bonusSeconds,
        BOSS_ENRAGE_MAX_SECONDS,
      )
      const enrageSec = Math.max(
        BOSS_ENRAGE_MIN_SECONDS,
        // Pact of Patience streckt die Frist. Sie wird wie die HP beim SPAWN
        // festgeschrieben — eine Uhr, die mitten im Kampf länger wird, wäre für
        // den Spieler nicht dieselbe Uhr.
        Math.floor(baseEnrageSec * enrageSectionMult * forge.bossEnrageMult),
      )
      const enrageTimerMs = enrageSec * 1000

      // Die Beute wird beim SPAWN gewürfelt und im Boss mitgeschrieben — der
      // Faktor gehört deshalb hierher und nicht ans Einsammeln: sonst zeigte die
      // Belohnungsleiste eine Zahl und der Spieler bekäme eine andere.
      const randomChimes = () =>
        Math.max(
          1,
          Math.floor(
            (Math.random() * BOSS_REWARD_CHIMES_MAX + 1) *
              providence.bossRewardMult *
              // Siege Reckoning (Ward) — beim SPAWN, aus demselben Grund wie die
              // Vorsehung daneben: die Belohnungsleiste zeigt diese Zahl.
              forge.bossRewardMult,
          ),
        )
      const randomSlot = (): PlanetBossRewardSlot =>
        Math.random() < BOSS_REWARD_MATERIAL_CHANCE
          ? { type: 'material', materialId: pickMaterial().id }
          : { type: 'chimes', amount: randomChimes() }

      const rewardSlots: PlanetBossRewardSlot[] = [
        { type: 'chimes', amount: randomChimes() },
        randomSlot(),
        randomSlot(),
      ]

      let homePlanetChampion: string | undefined = undefined
      if (isChampionPlanet) {
        const battleStore = useBattleStore()
        const isUnrecruitedUnowned = (name: string) =>
          !battleStore.ownedChampions.includes(name) &&
          !battleStore.recruitableChampions.some((r) => r.name === name)

        // ── Role → tier-weighted → champion ──
        // Role is chosen first (player pick → nextStarRole). Within the eligible
        // champions, group by Champion Tier (1..unlocked) and pick a tier by its
        // current spawn weight, then a uniform champion inside that tier. Empty
        // tiers are dropped and the remaining weights renormalized on the fly.
        const nextRole = galaxyStore.nextStarRole
        const unlocked = unlockedChampionTierCount(galaxyStore.currentGalaxy)
        const weights = tierSpawnWeights(unlocked)

        const pickWeighted = (eligible: typeof CHAMPION_HOME_PLANETS): string | undefined => {
          const byTier = new Map<number, string[]>()
          for (const c of eligible) {
            const star = getChampionStarLevel(c.championName)
            if (star < 1 || star > unlocked)
              continue // only unlocked tiers spawn
            ;(byTier.get(star) ?? byTier.set(star, []).get(star)!).push(c.championName)
          }
          if (byTier.size === 0) return undefined
          // Weighted-pick a present tier over the sum of its weight (renormalized).
          const tiers = [...byTier.keys()]
          const total = tiers.reduce((sum, t) => sum + (weights[t - 1] ?? 0), 0)
          let roll = Math.random() * total
          let chosenTier = tiers[tiers.length - 1]
          for (const t of tiers) {
            roll -= weights[t - 1] ?? 0
            if (roll <= 0) {
              chosenTier = t
              break
            }
          }
          const names = byTier.get(chosenTier)!
          return names[Math.floor(Math.random() * names.length)]
        }

        // 1) selected role ∩ unrecruited, tier-weighted
        let chosen = nextRole
          ? pickWeighted(
              CHAMPION_HOME_PLANETS.filter(
                (c) =>
                  isUnrecruitedUnowned(c.championName) &&
                  CHAMPION_ROLES[c.championName] === nextRole,
              ),
            )
          : undefined
        // 2) any unrecruited (ignore role), still tier-weighted
        if (!chosen) {
          chosen = pickWeighted(
            CHAMPION_HOME_PLANETS.filter((c) => isUnrecruitedUnowned(c.championName)),
          )
        }
        // Es gibt bewusst KEINEN dritten Griff mehr.
        //
        // Hier stand einmal „last resort: any unrecruited at all", damit ein
        // Champion-Stern nie ohne Champion dasteht. Der Gedanke ist
        // nachvollziehbar, die Wirkung war aber, dass die Tier-Sperre gar keine
        // war: sobald die freigeschalteten Tiers leergeräumt sind — und das
        // geht schnell, es kommt ein Champion-Stern je Sternrettung —, verteilte
        // das Spiel die gesperrten Champions trotzdem. Gemessen über 72
        // Spielstunden: der komplette Kader stand nach 6,4 Stunden, obwohl das
        // letzte Tier erst bei Galaxie 48 aufgehen sollte. Eine Sperre, die
        // sich selbst aufhebt, taktet nichts.
        //
        // Ohne den Griff bleibt der Stern nicht leer: sein Boss steht, fällt,
        // zahlt Chimes, Material und Champion-XP wie jeder andere — nur einen
        // NEUEN Champion gibt es erst, wenn das nächste Tier aufgeht. Genau das
        // soll die Sperre bedeuten.
        if (chosen) {
          homePlanetChampion = chosen
          // Do NOT clear nextStarRole here: the role stays selected until the
          // player confirms the next one (requestRoleSelection). If this star's
          // window expires, the follow-up star reuses the same role instead of
          // forcing the role-selection modal open again.
        }
      }

      const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]

      const newBoss: PlanetBossEvent = {
        planetId,
        planetType,
        bossName,
        startTime: gameNow(),
        enrageTimerMs,
        maxHP,
        currentHP: startHP,
        clickDamagePerHit,
        passiveDPS,
        totalDamageDealt: 0,
        rewardSlots,
        defeated: false,
        expired: false,
        ...(noEnrage && { noEnrage: true }),
        ...(homePlanetChampion && { homePlanetChampion }),
        ...(opts.isGalaxyBoss && { isGalaxyBoss: true }),
        ...(opts.isBossEscort && { isBossEscort: true }),
        ...(isChampionPlanet && { isChampionPlanet: true }),
        ...(isChampionEscort && { isChampionEscort: true }),
        sectionId: sectionStore.activeSectionId,
      }

      this.activeBosses.push(newBoss)
      this.selectedBossId = planetId
      // Sprite jetzt dekodieren, nicht erst beim Öffnen des Star-Fight-Modals —
      // dort läge der ~1 MB PNG-Decode sonst im Einblende-Frame.
      prewarmBossSprite(planetId)
      this.lastBossResult = null
      this.lastDroppedMaterialId = null

      logger.info('Planet', `Boss spawned: ${bossName}`, {
        maxHP,
        enrageSec,
        clickDamage: clickDamagePerHit,
        passiveDPS,
        targetClicks,
        slots: rewardSlots.length,
      })
    },

    removeBoss(planetId: string) {
      const idx = this.activeBosses.findIndex((b) => b.planetId === planetId)
      if (idx !== -1) this.activeBosses.splice(idx, 1)
      if (this.selectedBossId === planetId) {
        this.selectedBossId =
          this.activeBosses.find((b) => !b.defeated && !b.expired)?.planetId ?? null
      }
    },

    dealDamage(amount: number): boolean {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return false
      return this.dealDamageToBoss(boss, amount)
    },

    /** Applies damage (incl. curse + Star Forge boss multipliers) to a specific boss. */
    dealDamageToBoss(boss: PlanetBossEvent, amount: number): boolean {
      const banished =
        activeMidCurse.type === 'banishment' && gameNow() < activeMidCurse.activeUntil
      const cursed = banished ? amount * ROLE_MID_CURSE_DAMAGE_AMP : amount
      // EINE Rundung, ganz am Ende der Kette — und ein Boden von 1 wie in
      // `applyPassiveDamage`. Seit die Klick-Basis auf 1 steht, sind die
      // Zwischenwerte des Klick-Pfads Bruchzahlen; würde jeder Schritt für sich
      // aufgerundet, wäre die Rundung der dominante Effekt statt einer
      // Nachkommastelle (Solar-Stufe 1 ergibt 1,1 → aufgerundet 2, also +100 %
      // statt der entworfenen +10 %).
      const effective = Math.max(
        1,
        Math.round(
          cursed *
            useStarForgeStore().bossDamageMult *
            useMeepTreeStore().fx.bossDamageMult *
            useAchievementStore().bossDamageMult,
        ),
      )
      this.lastHitDamage = effective

      boss.currentHP = Math.max(0, boss.currentHP - effective)
      boss.totalDamageDealt += effective
      this.totalBossDamage += effective

      if (boss.currentHP <= 0) {
        boss.currentHP = 0
        boss.defeated = true
        this.grantBossRewards(boss)
        this.bossModalOpen = false
        logger.info('Planet', 'Boss defeated!', { totalDamage: boss.totalDamageDealt })
        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVAL_DELAY_MS)
        return true
      }
      return false
    },

    /**
     * Ein Klick auf den Boss. Gibt den TATSÄCHLICH angerichteten Schaden zurück
     * (0, wenn nichts ankam) — die Arena zeigt genau diese Zahl als Float.
     *
     * Vorher stand dort `boss.clickDamagePerHit`, also der Wert VOR
     * `dmgMultiplier`, Star Forge, Meep-Baum und Achievements; die Anzeige
     * untertrieb systematisch. Bei einer Klick-Basis von 20 fiel das kaum auf,
     * bei 1 stünde dauerhaft „-1" am Sprite, während ein Vielfaches ankommt.
     */
    dealClickDamage(): number {
      const boss = this.activeBoss
      if (!boss || boss.defeated || boss.expired) return 0
      // Vordergrund-Gate: hinter der Sonne ist der Boss unantastbar — auch
      // Spieler-Klicks im Star-Fight-Modal richten dann keinen Schaden an
      if (!bossPlanetInForeground(boss.planetId)) return 0
      const solar = useSolarUpgradeStore()
      // Bewusst OHNE Zwischenrundung — `dealDamageToBoss` rundet einmal am Ende.
      const clickDamage = boss.clickDamagePerHit * solar.dmgMultiplier
      this.dealDamage(clickDamage)
      // Vor dem Splash lesen: der überschreibt `lastHitDamage` sonst mit dem
      // Streuschaden am letzten Nebenziel.
      const dealt = this.lastHitDamage
      // Shattering Nova: clicks splash a fraction of their damage to all other bosses
      const splashPct = useStarForgeStore().clickSplashPct
      if (splashPct > 0) {
        const splash = clickDamage * splashPct
        for (const other of this.activeBosses) {
          if (other === boss || other.defeated || other.expired) continue
          this.dealDamageToBoss(other, splash)
        }
      }
      return dealt
    },

    applyPassiveDamage() {
      const gameStore = useGameStore()
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired || boss.passiveDPS <= 0) continue
        if (gameStore.isGamePaused && boss.isChampionPlanet) continue
        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const effectiveDPS = Math.max(1, boss.passiveDPS)
        boss.currentHP -= effectiveDPS
        boss.totalDamageDealt += effectiveDPS
        this.totalBossDamage += effectiveDPS

        if (boss.currentHP <= 0) {
          boss.currentHP = 0
          boss.defeated = true
          this.grantBossRewards(boss)
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          logger.info('Planet', 'Boss defeated by passive DPS!')
          const planetId = boss.planetId
          gameTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_DELAY_MS)
        }
      }
    },

    checkEnrage() {
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        if (boss.isChampionPlanet) continue
        if (boss.isChampionEscort) continue
        // Endkampf am Galaxiekern kennt kein Enrage: Boss und Eskorten bleiben,
        // bis sie besiegt sind — sonst droht ein Softlock der Galaxie.
        if (boss.isGalaxyBoss || boss.isBossEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = gameNow() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        /* Remembered Wound: was der Spieler diesem Boss abgerungen hat, bleibt
           ihm — als ANTEIL, weil die Höchst-HP beim nächsten Erscheinen andere
           sind. Gebucht an EINER Stelle, obwohl zwei Zweige darunter `expired`
           setzen: beide meinen dasselbe Ereignis (die Frist ist abgelaufen,
           der Boss entkommt), und zwei Buchungen wären zwei Wahrheiten über
           dieselbe Wunde. */
        if (useStarForgeStore().bossKeepsWounds) {
          this.woundedPlanets[boss.planetId] = boss.currentHP / boss.maxHP
        }

        if (boss.noEnrage) {
          boss.expired = true
          this.totalBossesLost += 1
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          gameTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

        boss.expired = true
        this.totalBossesLost += 1
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        this.cpsPenaltyActive = true
        this.cpsPenaltyExpiresAt = gameNow() + BOSS_CPS_PENALTY_DURATION_MS
        const shopStore = useShopStore()
        const gameStore = useGameStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()

        const playerStore = usePlayerStore()
        playerStore.takeDamage()

        logger.info('Planet', 'Boss enraged! CPS penalty applied.')

        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVE_DELAY_MS)
      }
    },

    grantBossRewards(boss: PlanetBossEvent) {
      if (!boss.defeated) return
      this.totalBossesDefeated += 1

      const gameStore = useGameStore()

      const inventoryStore = useInventoryStore()
      const levelStore = useChampionLevelStore()
      // FORTUNE (champion levels) lifts the chime payout and gives every material
      // slot a chance at a second unit — the fractional part of the multiplier.
      const fortune = levelStore.teamFortuneMult
      // Prospector's Pact zahlt auf DIESELBE Bruchzahl ein wie das Team-Fortune:
      // der Nachkommateil ist die Chance auf ein zweites Stück je Fach. Über 1
      // hinaus wäre er verschenkt, deshalb bucht die Schleife unten zusätzlich
      // die ganzen Stücke — anders als die Fallchance sättigt diese Achse damit
      // nicht (docs/balance.md).
      const materialBonus = (fortune - 1 + 1) * useStarForgeStore().bossMaterialMult - 1
      const extraMaterialUnits = Math.floor(materialBonus)
      const extraMaterialChance = materialBonus - extraMaterialUnits
      let totalChimes = 0
      for (const slot of boss.rewardSlots) {
        if (slot.type === 'chimes') {
          totalChimes += slot.amount ?? 0
        } else if (slot.type === 'material' && slot.materialId) {
          inventoryStore.addMaterial(slot.materialId, 'boss')
          for (let i = 0; i < extraMaterialUnits; i++) {
            inventoryStore.addMaterial(slot.materialId, 'boss')
          }
          if (extraMaterialChance > 0 && Math.random() < extraMaterialChance) {
            inventoryStore.addMaterial(slot.materialId, 'boss')
          }
          this.lastDroppedMaterialId = slot.materialId
        }
      }
      totalChimes = Math.round(totalChimes * fortune)
      gameStore.chimes += totalChimes
      gameStore.chimesForNextUniverse += Math.floor(totalChimes * BOSS_UNIVERSE_PROGRESS_FRACTION)
      gameStore.calculateLevel()

      // Auf den Stern buchen, dem der Planet gehört — sein Manifest liest die
      // Summe beim Abgang.
      useStarGroupStore().creditStarChimes(boss.planetId, totalChimes)

      if (boss.homePlanetChampion) {
        const battleStore = useBattleStore()
        const config = CHAMPION_HOME_PLANETS.find((c) => c.championName === boss.homePlanetChampion)
        if (config) {
          battleStore.addRecruitableChampion(
            boss.homePlanetChampion,
            config.materialCost,
            config.chimesPrice,
          )
        }
      }

      if (gameStore.isGamePaused) {
        // Der Galaxieboss zählt nur hier — der Stern, auf dem er sitzt, wird
        // zusätzlich als Rettung gemeldet (starGroupStore).
        if (boss.isGalaxyBoss) gameStore.pauseStats.galaxyBossesFelled++
        else gameStore.pauseStats.planetsCleared++
        for (const slot of boss.rewardSlots) {
          if (slot.type === 'material' && slot.materialId) {
            gameStore.pauseStats.materialsEarned[slot.materialId] =
              (gameStore.pauseStats.materialsEarned[slot.materialId] ?? 0) + 1
          }
        }
      }

      // Champion XP — the whole orbiting roster shares the kill. Galaxy bosses,
      // champion planets and escorts are worth a multiple of a regular boss, so
      // star fights and boss chains are the real level-up moments.
      const galaxy = useGalaxyStore().currentGalaxy
      let xp = CHAMPION_XP_BOSS_BASE + galaxyDepth(galaxy) * CHAMPION_XP_BOSS_PER_GALAXY
      if (boss.isGalaxyBoss) xp *= CHAMPION_XP_GALAXY_BOSS_MULT
      else if (boss.isChampionPlanet) xp *= CHAMPION_XP_CHAMPION_PLANET_MULT
      else if (boss.isBossEscort) xp *= CHAMPION_XP_BOSS_ESCORT_MULT
      levelStore.grantTeamXp(xp)

      this.lastBossResult = 'victory'
      logger.info('Planet', `Rewards granted: +${totalChimes} chimes, +${xp} champion XP`)

      const sectionStore = useSectionStore()
      sectionStore.onBossDefeated()
      // Galaxieboss-Sieg wird NICHT hier gemeldet, sondern in
      // starGroupStore.onBossResult, sobald der ganze Bossstern geräumt ist —
      // der Bossstern hat mehrere Planeten, der Boss-Kill allein reicht nicht.
    },

    openBossModal(planetId?: string) {
      if (planetId) this.selectedBossId = planetId
      this.bossModalOpen = true
    },

    closeBossModal() {
      this.bossModalOpen = false
    },

    forceCheckExpiry() {
      const starGroupStore = useStarGroupStore()
      for (const boss of this.activeBosses) {
        if (boss.defeated || boss.expired) continue

        if (boss.isChampionPlanet) continue
        if (boss.isChampionEscort) continue
        // Endkampf am Galaxiekern kennt kein Enrage: Boss und Eskorten bleiben,
        // bis sie besiegt sind — sonst droht ein Softlock der Galaxie.
        if (boss.isGalaxyBoss || boss.isBossEscort) continue

        if (starGroupStore.starFightModalOpen && boss.planetId !== this.selectedBossId) continue

        const elapsed = gameNow() - boss.startTime
        if (elapsed < boss.enrageTimerMs) continue

        if (boss.noEnrage) {
          boss.expired = true
          this.totalBossesLost += 1
          if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
          const planetId = boss.planetId
          gameTimeout(() => {
            this.removeBoss(planetId)
          }, BOSS_REMOVAL_LONG_DELAY_MS)
          continue
        }

        boss.expired = true
        this.totalBossesLost += 1
        if (this.selectedBossId === boss.planetId) this.bossModalOpen = false
        this.lastBossResult = 'defeat'

        if (boss.isChampionPlanet) {
          const galaxyStore = useGalaxyStore()
          galaxyStore.startChampionTravel()
        }

        const planetId = boss.planetId
        gameTimeout(() => {
          this.removeBoss(planetId)
        }, BOSS_REMOVE_DELAY_MS)
      }
    },

    clearPenalty() {
      this.cpsPenaltyActive = false
      this.cpsPenaltyExpiresAt = 0
      const shopStore = useShopStore()
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      logger.info('Planet', 'CPS penalty expired.')
    },
  },
})

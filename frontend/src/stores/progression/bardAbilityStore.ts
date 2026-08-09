// Bard-Fähigkeiten: Passive „Traveler's Call" und die vier Slots Q/W/E/R.
//
// Der Store hält NUR logischen Zustand. Abklingzeiten stehen als absolute
// Zeitstempel (`cooldownReadyAt`) — genau wie die Drifter-Buffs, damit ein
// gedrosselter Tab, ein Reload oder eine geschlossene Sitzung sie nicht
// desynchronisieren kann. Die Leiste im HUD liest daraus pro Frame ihre Ringe,
// ohne dass hier etwas pro Frame geschrieben würde.
//
// Wirkung und Abklingzeit hängen an zwei Skalen:
//   Rang       — steigt mit dem Bard-Level (ABILITY_LEVELS_PER_RANK)
//   Resonance  — die Passive, aufgebaut durch Klicken auf die Sonne

import { defineStore } from 'pinia'
import type { BardAbilityBuff, BardAbilityId } from '@/types'
import { BARD_ABILITIES, getBardAbility } from '@/config/progression/bardAbilities'
import { formatNumber } from '@/config/ui/numberFormat'
import { logger } from '@/utils/logger'
import {
  GAME_TICK_INTERVAL_MS,
  RESONANCE_CLICKS_PER_STACK,
  RESONANCE_MAX_STACKS,
  RESONANCE_POWER_PER_STACK,
  RESONANCE_CDR_PER_STACK,
  RESONANCE_CLICK_REFUND_MS,
  ABILITY_LEVELS_PER_RANK,
  ABILITY_MAX_RANK,
  ABILITY_RANK_POWER_STEP,
  ABILITY_RANK_CDR_STEP,
  ABILITY_CDR_CAP,
  BINDING_TARGET_COUNT,
  BINDING_DAMAGE_MAX_HP_PCT,
  BINDING_STUN_MS,
  BINDING_EMPTY_CLICK_VALUES,
  SHRINE_HEAL_MAX_HP_PCT,
  SHRINE_BUFF_DURATION_MS,
  SHRINE_CPS_MULT,
  JOURNEY_EXPEDITION_SKIP_SEC,
  JOURNEY_DWELL_SKIP_SEC,
  JOURNEY_STAR_TIME_SEC,
  JOURNEY_BUFF_DURATION_MS,
  JOURNEY_CPC_MULT,
  FATE_STASIS_DURATION_MS,
  FATE_DAMAGE_MULT,
  FATE_FINALE_MAX_HP_PCT,
} from '@/config/constants'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useCpsStore } from '@/stores/core/cpsStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'

/** Leere Abklingzeit-Tafel — alles sofort bereit. */
function freshCooldowns(): Record<BardAbilityId, number> {
  return { q: 0, w: 0, e: 0, r: 0 }
}

export const useBardAbilityStore = defineStore('bardAbility', {
  state: () => ({
    /** Absoluter Zeitpunkt, ab dem die Fähigkeit wieder gewirkt werden darf. */
    cooldownReadyAt: freshCooldowns(),

    // ── Passive ──
    /** Erreichte Resonance-Stufen (Deckel: RESONANCE_MAX_STACKS). */
    resonance: 0,
    /** Klicks seit der letzten Stufe. */
    resonanceProgress: 0,

    /** Laufende Zeiteffekte von W und E. */
    buffs: [] as BardAbilityBuff[],

    /** Ende der Stase aus R — 0, wenn keine läuft. */
    stasisUntil: 0,

    /**
     * Reaktive Uhr für die Getter. Ein rohes Date.now() in einem Getter würde
     * nie neu ausgewertet; die Leiste bekommt ihre feine Auflösung ohnehin aus
     * ihrem eigenen rAF-Lauf und nicht von hier.
     */
    abilityNow: Date.now(),

    /** Zuletzt gewirkt — `seq` zählt hoch, damit zweimal dasselbe erneut meldet. */
    lastCast: { id: '' as BardAbilityId | '', seq: 0, at: 0, summary: '' },

    // ── Lifetime-Zähler (Bard-Stats-Katalog) ──
    totalCasts: 0,
    /** Schaden, den Q und R zusammen an Planeten-Bossen angerichtet haben. */
    totalAbilityDamage: 0,
    /** Von W wiederhergestellte Lebenspunkte. */
    totalAbilityHealing: 0,
  }),

  getters: {
    // ── Passive ─────────────────────────────────────────────────────────────
    /** Klicks bis zur nächsten Resonance-Stufe. */
    resonanceToNext(state): number {
      if (state.resonance >= RESONANCE_MAX_STACKS) return 0
      return Math.max(0, RESONANCE_CLICKS_PER_STACK - state.resonanceProgress)
    },
    /** 0..1 — Füllstand der laufenden Stufe, treibt den Ring der Passiv-Kachel. */
    resonanceFill(state): number {
      if (state.resonance >= RESONANCE_MAX_STACKS) return 1
      return Math.min(1, state.resonanceProgress / RESONANCE_CLICKS_PER_STACK)
    },
    /** Wirkungsfaktor aus der Passive allein. */
    resonancePowerMult(state): number {
      return 1 + state.resonance * RESONANCE_POWER_PER_STACK
    },
    /** Abklingzeit-Reduktion aus der Passive allein (0..1). */
    resonanceCdr(state): number {
      return state.resonance * RESONANCE_CDR_PER_STACK
    },

    // ── Ränge und Freischaltung ─────────────────────────────────────────────
    /**
     * Rang je Fähigkeit: 0 = noch nicht freigeschaltet, sonst 1..ABILITY_MAX_RANK.
     * Er steigt allein mit dem Bard-Level — es gibt im Spiel bereits zwei
     * Punkte-Systeme (Meep Tree, Champion-Perks); ein drittes wäre Reibung,
     * kein Spiel.
     */
    rankOf() {
      return (id: BardAbilityId): number => {
        const def = getBardAbility(id)
        if (!def) return 0
        const level = useGameStore().level
        if (level < def.unlockLevel) return 0
        const steps = Math.floor((level - def.unlockLevel) / ABILITY_LEVELS_PER_RANK)
        return Math.min(ABILITY_MAX_RANK, 1 + steps)
      }
    },

    isUnlocked() {
      return (id: BardAbilityId): boolean => this.rankOf(id) > 0
    },

    /** Gesamter Wirkungsfaktor einer Fähigkeit: Rang × Resonance. */
    powerMultOf() {
      return (id: BardAbilityId): number => {
        const rank = Math.max(1, this.rankOf(id))
        return (1 + (rank - 1) * ABILITY_RANK_POWER_STEP) * this.resonancePowerMult
      }
    },

    /** Abklingzeit in Millisekunden, alle Reduktionen eingerechnet. */
    cooldownMsOf() {
      return (id: BardAbilityId): number => {
        const def = getBardAbility(id)
        if (!def) return 0
        const rank = Math.max(1, this.rankOf(id))
        const cdr = Math.min(
          ABILITY_CDR_CAP,
          (rank - 1) * ABILITY_RANK_CDR_STEP + this.resonanceCdr,
        )
        return Math.round(def.baseCooldownSec * 1000 * (1 - cdr))
      }
    },

    /** Verbleibende Abklingzeit in Millisekunden — 0, wenn bereit. */
    cooldownLeftMsOf(state) {
      return (id: BardAbilityId): number =>
        Math.max(0, (state.cooldownReadyAt[id] ?? 0) - state.abilityNow)
    },

    isReady() {
      return (id: BardAbilityId): boolean =>
        this.isUnlocked(id) && (this.cooldownReadyAt[id] ?? 0) <= this.abilityNow
    },

    // ── Zeiteffekte ─────────────────────────────────────────────────────────
    liveBuffs(state): BardAbilityBuff[] {
      return state.buffs.filter((b) => b.expiresAt > state.abilityNow)
    },

    /** Läuft gerade eine Stase aus R? */
    stasisActive(state): boolean {
      return state.stasisUntil > state.abilityNow
    },

    /** Sekunden, die die Stase noch steht — für das Vollbild-Overlay. */
    stasisSecondsLeft(state): number {
      return Math.max(0, Math.ceil((state.stasisUntil - state.abilityNow) / 1000))
    },

    // ── Einbaustellen (je ein Getter, wie beim Drifter-Store) ───────────────
    /** Faktor auf die gesamte Chime-Produktion (W). */
    cpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.cpsMult ?? 1), 1)
    },
    /** Faktor auf den Klickwert (E). */
    cpcMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.cpcMult ?? 1), 1)
    },
    /** Faktor auf Champion- und Turret-Schaden (R, solange die Stase steht). */
    combatDpsMult(): number {
      const fromBuffs = this.liveBuffs.reduce((m, b) => m * (b.combatDpsMult ?? 1), 1)
      return fromBuffs * (this.stasisActive ? FATE_DAMAGE_MULT : 1)
    },
  },

  actions: {
    // ── Takt ────────────────────────────────────────────────────────────────
    /** Hängt an `gameStore.tick()`: Uhr stellen, Effekte auslaufen lassen,
     *  und die Stase weitertragen. */
    tick(): void {
      this.abilityNow = Date.now()

      const before = this.buffs.length
      this.buffs = this.buffs.filter((b) => b.expiresAt > this.abilityNow)
      // CPS und CPC sind gecacht — ein ausgelaufener Buff muss sie neu rechnen.
      if (this.buffs.length !== before) this.refreshRates()

      if (this.stasisUntil > 0) this.tickStasis()
    },

    /**
     * Stase: Die Uhren der Welt stehen still, die eigene läuft weiter.
     *
     * Umgesetzt wird das, indem jede laufende Frist um genau den Takt
     * vorgeschoben wird — die Enrage-Uhr jedes Bosses (sie rechnet
     * `now − startTime`) und die Standzeit jedes Sterns. Ein Flag, das an
     * jeder ablesenden Stelle geprüft werden müsste, hätte dieselbe Wirkung
     * an vier Stellen erzeugt und wäre bei der nächsten neuen Frist vergessen
     * worden.
     */
    tickStasis(): void {
      if (this.stasisUntil <= this.abilityNow) {
        this.stasisUntil = 0
        this._fateFinale()
        return
      }

      const bossStore = usePlanetBossStore()
      for (const boss of bossStore.activeBosses) {
        if (boss.defeated || boss.expired) continue
        boss.startTime += GAME_TICK_INTERVAL_MS
      }

      const starGroup = useStarGroupStore()
      for (const star of starGroup.activeStars) {
        if (star.durationMs === undefined) continue
        star.durationMs += GAME_TICK_INTERVAL_MS
      }
    },

    /**
     * Passive: ein Klick auf die Sonne. Baut Resonance auf und nimmt von JEDER
     * laufenden Abklingzeit ein Stück — der Grund, überhaupt weiterzuklicken,
     * wenn die Produktion längst von selbst läuft.
     */
    registerClick(): void {
      if (this.resonance < RESONANCE_MAX_STACKS) {
        this.resonanceProgress += 1
        while (
          this.resonanceProgress >= RESONANCE_CLICKS_PER_STACK &&
          this.resonance < RESONANCE_MAX_STACKS
        ) {
          this.resonanceProgress -= RESONANCE_CLICKS_PER_STACK
          this.resonance += 1
        }
        if (this.resonance >= RESONANCE_MAX_STACKS) this.resonanceProgress = 0
      }

      const now = Date.now()
      for (const def of BARD_ABILITIES) {
        const readyAt = this.cooldownReadyAt[def.id]
        if (readyAt > now) {
          this.cooldownReadyAt[def.id] = Math.max(now, readyAt - RESONANCE_CLICK_REFUND_MS)
        }
      }
    },

    // ── Wirken ──────────────────────────────────────────────────────────────
    /** Wirkt eine Fähigkeit, wenn sie freigeschaltet und bereit ist.
     *  @returns true, wenn sie tatsächlich ausgelöst hat. */
    cast(id: BardAbilityId): boolean {
      // Bewusst gegen die echte Uhr und nicht gegen `abilityNow`: die steht bis
      // zu eine Sekunde still, und so lange darf sich kein Druck totlaufen.
      const now = Date.now()
      if (!this.isUnlocked(id)) return false
      if ((this.cooldownReadyAt[id] ?? 0) > now) return false

      let summary = ''
      switch (id) {
        case 'q':
          summary = this._castBinding()
          break
        case 'w':
          summary = this._castShrine()
          break
        case 'e':
          summary = this._castJourney()
          break
        case 'r':
          summary = this._castFate()
          break
      }

      this.cooldownReadyAt[id] = now + this.cooldownMsOf(id)
      this.abilityNow = now
      this.totalCasts += 1
      this.lastCast = { id, seq: this.lastCast.seq + 1, at: now, summary }
      logger.info('BardAbility', `Cast ${getBardAbility(id)?.name}`, { summary })
      return true
    },

    /**
     * Q — Cosmic Binding. Der Blitz schlägt durch bis zu zwei Planeten-Bosse,
     * setzt deren Enrage-Uhr zurück und trifft, falls keiner im Orbit steht,
     * die Sonne selbst: dann fällt ein Schwall Chimes ab.
     */
    _castBinding(): string {
      const bossStore = usePlanetBossStore()
      const power = this.powerMultOf('q')
      // Momentaufnahme: ein Todesstoß plant ein Entfernen ein, und das darf
      // die Liste, über die gerade gelaufen wird, nicht verkürzen.
      const targets = bossStore.activeBosses
        .filter((b) => !b.defeated && !b.expired)
        .slice(0, BINDING_TARGET_COUNT)

      if (targets.length === 0) {
        const gameStore = useGameStore()
        const gain = Math.max(
          1,
          Math.floor(gameStore.chimesPerClick * BINDING_EMPTY_CLICK_VALUES * power),
        )
        gameStore.chimes += gain
        gameStore.chimesForMeep += gain
        gameStore.chimesForNextUniverse += gain
        gameStore.totalChimesEarned += gain
        gameStore.chimesEarnedForLevel += gain
        gameStore.calculateLevel()
        gameStore.addMeep()
        return `Bolt rebounded off the sun · +${formatNumber(gain)} chimes`
      }

      let damage = 0
      let kills = 0
      for (const boss of targets) {
        const amount = Math.max(1, Math.ceil(boss.maxHP * BINDING_DAMAGE_MAX_HP_PCT * power))
        const hpBefore = boss.currentHP
        const defeated = bossStore.dealDamageToBoss(boss, amount)
        // Zurücklesen, was wirklich ankam — Boss-Multiplikatoren heben den Wert,
        // der letzte Treffer deckelt ihn auf die Restlebenspunkte.
        damage += hpBefore - boss.currentHP
        if (defeated) kills++
        // Betäubung: die Enrage-Uhr rechnet `now − startTime`, ein Vorschieben
        // des Starts hält sie genau so lange an.
        else boss.startTime += BINDING_STUN_MS
      }

      this.totalAbilityDamage += damage
      const noun = targets.length === 1 ? 'boss' : 'bosses'
      const killNote = kills > 0 ? ` · ${kills} felled` : ''
      return `${targets.length} ${noun} bound for ${formatNumber(damage)}${killNote}`
    },

    /**
     * W — Caretaker's Shrine. Heilt die Sonne, räumt die CPS-Strafe eines
     * verlorenen Bosses ab und lässt die Produktion nachklingen.
     */
    _castShrine(): string {
      const playerStore = usePlayerStore()
      const bossStore = usePlanetBossStore()
      const power = this.powerMultOf('w')

      const heal = Math.max(1, Math.round(playerStore.maxHP * SHRINE_HEAL_MAX_HP_PCT * power))
      const before = playerStore.currentHP
      playerStore.currentHP = Math.min(playerStore.maxHP, playerStore.currentHP + heal)
      const healed = playerStore.currentHP - before
      playerStore.totalHpRegenerated += healed
      this.totalAbilityHealing += healed

      const hadPenalty = bossStore.cpsPenaltyActive
      if (hadPenalty) bossStore.clearPenalty()

      this._applyBuff({
        sourceId: 'w',
        expiresAt: Date.now() + SHRINE_BUFF_DURATION_MS,
        durationMs: SHRINE_BUFF_DURATION_MS,
        cpsMult: SHRINE_CPS_MULT,
      })

      const penaltyNote = hadPenalty ? ' · penalty lifted' : ''
      return `Shrine restored ${formatNumber(healed)} HP${penaltyNote}`
    },

    /**
     * E — Magical Journey. Der Korridor rafft die eigenen Vorhaben zusammen
     * (Expeditionen, Sonnenphase) und dehnt die Frist der Sterne — Verbündete
     * reisen schneller, das Ziel wartet länger.
     */
    _castJourney(): string {
      const power = this.powerMultOf('e')
      const expeditionSkipMs = Math.round(JOURNEY_EXPEDITION_SKIP_SEC * 1000 * power)
      const dwellSkipSec = Math.round(JOURNEY_DWELL_SKIP_SEC * power)
      const starBonusMs = Math.round(JOURNEY_STAR_TIME_SEC * 1000 * power)

      // Expeditionen: das Zurückdatieren des Starts spult den Fortschritt vor —
      // der Store rechnet `now − startTime` gegen `durationSeconds`. Sein
      // eigener Takt (`checkExpeditions`) löst sie danach ganz normal auf.
      const expeditionStore = useExpeditionStore()
      let missions = 0
      for (const mission of expeditionStore.activeExpeditions) {
        if (mission.status !== 'active') continue
        mission.startTime -= expeditionSkipMs
        missions++
      }
      expeditionStore.checkExpeditions()

      // Sonnenphase: das Zurückdatieren der Phasenuhr ist derselbe Weg, den
      // der Admin-Skip und der Drifter-Lohn gehen.
      const solar = useSolarUpgradeStore()
      solar.phaseEnteredAt -= dwellSkipSec * 1000
      solar.tickDwell()

      const starGroup = useStarGroupStore()
      let stars = 0
      for (const star of starGroup.activeStars) {
        if (star.durationMs === undefined) continue
        star.durationMs += starBonusMs
        stars++
      }

      this._applyBuff({
        sourceId: 'e',
        expiresAt: Date.now() + JOURNEY_BUFF_DURATION_MS,
        durationMs: JOURNEY_BUFF_DURATION_MS,
        cpcMult: JOURNEY_CPC_MULT,
      })

      const parts: string[] = []
      if (missions > 0) parts.push(`${missions} expedition${missions === 1 ? '' : 's'} hastened`)
      if (stars > 0) parts.push(`${stars} star${stars === 1 ? '' : 's'} held longer`)
      parts.push(`${JOURNEY_CPC_MULT}× clicks`)
      return `Corridor open · ${parts.join(' · ')}`
    },

    /**
     * R — Tempered Fate. Alles hält still: Enrage-Uhren und Sternfristen
     * rücken im Takt mit (siehe `tickStasis`), während der eigene Orbit
     * dreifachen Schaden schlägt. Beim Auflösen fällt der Schlussschlag.
     */
    _castFate(): string {
      const now = Date.now()
      this.stasisUntil = now + FATE_STASIS_DURATION_MS
      this.abilityNow = now

      const bossStore = usePlanetBossStore()
      const held = bossStore.activeBosses.filter((b) => !b.defeated && !b.expired).length
      const seconds = Math.round(FATE_STASIS_DURATION_MS / 1000)
      const heldNote = held > 0 ? `${held} held` : 'the orbit stilled'
      return `Fate suspended for ${seconds}s · ${heldNote} · ${FATE_DAMAGE_MULT}× damage`
    },

    /** Der Schlussschlag beim Auflösen der Stase — trifft jeden lebenden Boss. */
    _fateFinale(): void {
      const bossStore = usePlanetBossStore()
      const power = this.powerMultOf('r')
      const targets = bossStore.activeBosses.filter((b) => !b.defeated && !b.expired)
      if (targets.length === 0) return

      let damage = 0
      let kills = 0
      for (const boss of targets) {
        const amount = Math.max(1, Math.ceil(boss.maxHP * FATE_FINALE_MAX_HP_PCT * power))
        const hpBefore = boss.currentHP
        if (bossStore.dealDamageToBoss(boss, amount)) kills++
        damage += hpBefore - boss.currentHP
      }
      this.totalAbilityDamage += damage

      const killNote = kills > 0 ? ` · ${kills} felled` : ''
      this.lastCast = {
        id: 'r',
        seq: this.lastCast.seq + 1,
        at: Date.now(),
        summary: `Stasis broke for ${formatNumber(damage)}${killNote}`,
      }
      logger.info('BardAbility', 'Tempered Fate finale', { damage, kills })
    },

    /** Startet (oder erneuert) einen Zeiteffekt. Zweimal dieselbe Fähigkeit
     *  setzt die Uhr neu, statt einen zweiten Faktor zu stapeln. */
    _applyBuff(buff: BardAbilityBuff): void {
      this.buffs = this.buffs.filter((b) => b.sourceId !== buff.sourceId)
      this.buffs.push(buff)
      this.abilityNow = Date.now()
      this.refreshRates()
    },

    /** CPS und CPC liegen gecacht im gameStore — nach jeder Änderung an einem
     *  Faktor, der sie speist, neu rechnen. Die Rechnung selbst steht dort, wo
     *  gerechnet wird (`shopStore.refreshRates`); hier bleibt der Name stehen,
     *  den die Aufrufer in dieser Datei schon kennen. */
    refreshRates(): void {
      useShopStore().refreshRates()
    },

    /** Admin/Test: alle Abklingzeiten sofort zurücksetzen. */
    resetCooldowns(): void {
      this.cooldownReadyAt = freshCooldowns()
      this.abilityNow = Date.now()
    },
  },
})

import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useHerald } from '@/composables/ui/useHerald'
import { logChronicleRank, logChronicleStage } from '@/config/ui/eventLog'
import { formatPercentValue, toRoman } from '@/utils/ui/format'
import {
  CHRONICLE_TRACKS,
  CHRONICLE_TOTAL_STAGES,
  chronicleRankAt,
} from '@/config/progression/achievements'
import { CHRONICLE_HERALD_ACCENT, CHRONICLE_RANK_ICON } from '@/config/constants'
import type {
  ChronicleBonusKey,
  ChronicleMetricId,
  ChronicleTrackDef,
  ChronicleTrackView,
} from '@/types'
import { logger } from '@/utils/logger'

/**
 * Bonus-Schlüssel → die Bahn, die ihn speist. Die Zuordnung ist 1:1 (jede Bahn
 * genau ein Bonus), also steht sie einmal beim Laden statt in jedem Getter neu
 * gesucht zu werden — die Bonus-Getter laufen an heißen Stellen (CPS-Rechnung,
 * Schadensrechnung, Drop-Wurf).
 */
const TRACK_BY_BONUS = CHRONICLE_TRACKS.reduce(
  (map, track) => {
    map[track.bonus] = track
    return map
  },
  {} as Record<ChronicleBonusKey, ChronicleTrackDef>,
)

/**
 * The Bard's Chronicle — Meilensteine über alle Spielsysteme.
 *
 * Der Store hält NUR, wie weit jede Bahn geschrieben ist; jede Metrik wird bei
 * Bedarf aus dem Store gelesen, dem sie gehört. Damit gibt es keinen zweiten,
 * parallel gepflegten Zähler, der von seinem Original abdriften kann — dieselbe
 * Entscheidung wie beim Stats-Katalog, der aus demselben Grund nur liest.
 *
 * Eine gefallene Stufe bleibt gefallen. Das ist nicht Nachsicht, sondern das,
 * was die Prüfung überhaupt billig macht: sie muss nur aufwärts vergleichen und
 * darf jede Metrik nehmen, auch eine, die ein Prestige zurücksetzt.
 */
export const useAchievementStore = defineStore('achievement', {
  state: () => ({
    /** Bahn-ID → höchste geschriebene Stufe (0 = keine, 5 = ausgereizt). */
    stages: {} as Record<string, number>,
    /**
     * Bahnen mit einer Stufe, die der Spieler im Tab noch nicht gesehen hat —
     * treibt das Abzeichen in der Tab-Leiste. Der stille Nachlauf beim Laden
     * füllt das absichtlich NICHT: ein Spielstand von vor dem Chronicle erfüllt
     * auf einen Schlag halbe Bahnen, und ein Abzeichen mit 20 darauf meldet
     * nichts, es erschlägt nur.
     */
    unseen: [] as string[],
  }),

  getters: {
    /** Wie viele Stufen insgesamt stehen — Zähler der Kopfzeile. */
    unlockedStageCount(state): number {
      return Object.values(state.stages).reduce((sum, s) => sum + s, 0)
    },

    /** Titel zur bisherigen Zahl an Stufen. */
    rankTitle(): string {
      return chronicleRankAt(this.unlockedStageCount).title
    },

    /**
     * Verstärker des erreichten Rangs auf JEDEN Bahn-Bonus. Er greift an genau
     * einer Stelle — in `bonusPct` — und wirkt damit von selbst in allen acht
     * Effekt-Gettern darunter. Wer ihn stattdessen je Getter einbaute, hätte
     * acht Stellen, die auseinanderlaufen können.
     */
    rankMult(): number {
      return chronicleRankAt(this.unlockedStageCount).mult
    },

    /** Alle Stufen geschrieben — die Kopfzeile darf das feiern. */
    isComplete(): boolean {
      return this.unlockedStageCount >= CHRONICLE_TOTAL_STAGES
    },

    /**
     * Der aktuelle Wert einer Metrik. Bewusst eine zurückgegebene Funktion und
     * kein gecachter Getter: sonst hinge dieser eine Wert an den Feldern von
     * sieben Stores gleichzeitig und würde bei jeder ihrer Änderungen neu
     * berechnet — auch wenn niemand hinschaut.
     */
    metricValue(): (metric: ChronicleMetricId) => number {
      return (metric) => {
        switch (metric) {
          case 'lifetimeChimes':
            return useGameStore().totalChimesEarned
          case 'championsRecruited':
            return useBattleStore().ownedChampions.length
          case 'battleWins':
            return useBattleStore().totalWins
          case 'driftersCollected':
            return useDrifterStore().totalDriftersCollected
          case 'forgeLevels': {
            const forge = useStarForgeStore()
            const sum = (levels: Record<string, number>) =>
              Object.values(levels).reduce((total, l) => total + l, 0)
            return sum(forge.branchLevels) + sum(forge.leafLevels) + sum(forge.relicLevels)
          }
          case 'planetLevels':
            return usePlanetShopStore().purchasedSlots.reduce((sum, slot) => sum + slot.level, 0)
          case 'bossesDefeated':
            return usePlanetBossStore().totalBossesDefeated
          case 'starsRescued':
            return useGalaxyStore().totalStarsRescued
        }
      }
    },

    /** Jede Bahn samt Stand — die einzige Quelle, aus der der Tab liest. */
    trackViews(state): ChronicleTrackView[] {
      return CHRONICLE_TRACKS.map((track) => {
        const stage = state.stages[track.id] ?? 0
        const current = this.metricValue(track.metric)
        const maxed = stage >= track.stages.length
        const nextThreshold = maxed ? null : track.stages[stage].threshold
        // Der Balken läuft von der ERREICHTEN Schwelle zur nächsten, nicht von
        // null — sonst steht eine Bahn mit Stufe IV kurz vor V fast am Anfang.
        const floor = stage > 0 ? track.stages[stage - 1].threshold : 0
        const span = nextThreshold === null ? 0 : nextThreshold - floor
        return {
          ...track,
          stage,
          current,
          nextThreshold,
          progress: span > 0 ? Math.min(1, Math.max(0, (current - floor) / span)) : 1,
          value: stage > 0 ? track.stages[stage - 1].value : 0,
        }
      })
    },

    /**
     * Prozentpunkte, die die Bahn hinter einem Bonus gerade beisteuert — bereits
     * mit dem Rang verstärkt. Basis aller acht Getter darunter UND der Anzeige
     * im Panel: beide lesen dieselbe Zahl, sonst zeigte die Karte einen Wert an,
     * den das Spiel nicht rechnet.
     *
     * Auf eine Nachkommastelle gerundet, damit „+15 % × 1.3" überall exakt
     * 19,5 ergibt statt 19,499999999999996.
     */
    bonusPct(state): (key: ChronicleBonusKey) => number {
      return (key) => {
        const track = TRACK_BY_BONUS[key]
        const stage = state.stages[track.id] ?? 0
        if (stage === 0) return 0
        return Math.round(track.stages[stage - 1].value * this.rankMult * 10) / 10
      }
    },

    // ── Effect getters (one per integration point) ───────────────────────────
    // Gleiche Bauart wie im drifterStore: je Einbaustelle genau ein Getter, der
    // dort in das vorhandene Produkt eingereiht wird. Wer eine Bahn umhängt,
    // ändert hier eine Zeile und dort eine Multiplikation.

    /** Multiplier on total chimes per second (shopStore.calculateTotalCPS). */
    cpsMult(): number {
      return 1 + this.bonusPct('cpsMult') / 100
    },
    /** Multiplier on champion XP gains (championLevelStore.addXp). */
    xpMult(): number {
      return 1 + this.bonusPct('xpMult') / 100
    },
    /** Multiplier on LP won from a battle (battleStore.calculateLPChange). */
    lpGainMult(): number {
      return 1 + this.bonusPct('lpGainMult') / 100
    },
    /** Multiplier on how long a drifter buff runs (drifterStore.applyBuff). */
    drifterBuffDurationMult(): number {
      return 1 + this.bonusPct('drifterBuffDurationMult') / 100
    },
    /** Multiplier on Star Forge material costs — below 1, it is a discount. */
    forgeMaterialCostMult(): number {
      return 1 - this.bonusPct('forgeMaterialDiscount') / 100
    },
    /** Multiplier on turret auto-attack damage (planetShopStore.autoAttackDPS). */
    turretDpsMult(): number {
      return 1 + this.bonusPct('turretDpsMult') / 100
    },
    /** Multiplier on damage dealt to bosses (planetBossStore.dealDamageToBoss). */
    bossDamageMult(): number {
      return 1 + this.bonusPct('bossDamageMult') / 100
    },
    /** Multiplier on the material drop chance (inventoryStore.rollForMaterial). */
    materialDropMult(): number {
      return 1 + this.bonusPct('materialDropMult') / 100
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus gameStore.tick(): jede Bahn gegen ihre nächste
     * Schwelle prüfen. Acht Feldzugriffe und zwei kleine Summen — nichts, was
     * einen Takt kostet, und bewusst NICHT pro Frame.
     */
    tick(): void {
      this.evaluate(true)
    },

    /**
     * Stand nachziehen, ohne etwas zu melden. Für den Moment nach dem Laden:
     * ein Spielstand, der älter ist als das Chronicle, erfüllt auf einen Schlag
     * ein halbes Buch — würde das der normale Prüflauf sehen, käme eine Kette
     * von zwanzig Bannern über den Bildschirm, bevor der Spieler geklickt hat.
     */
    syncSilently(): void {
      this.evaluate(false)
    },

    /**
     * Der Prüflauf selbst. `announceStages` trennt den laufenden Takt vom
     * stillen Nachziehen; alles andere ist in beiden Fällen gleich, deshalb
     * steht es hier nur einmal.
     */
    evaluate(announceStages: boolean): void {
      // Ein Takt kann mehrere Stufen derselben Bahn reißen (Offline-Ertrag, ein
      // Boss-Rausch, ein Kauf, der zwanzig Forge-Level bringt). Gemeldet wird
      // dann nur die höchste: vier Banner für eine Bahn sagen viermal dasselbe.
      let ratesTouched = false
      // Der Rang VOR diesem Lauf. Ein Aufstieg verstärkt jeden Bonus des Buches
      // auf einmal — das ist der größere Moment als die Stufe, die ihn ausgelöst
      // hat, und darf deshalb nicht stumm passieren.
      const rankBefore = chronicleRankAt(this.unlockedStageCount)

      for (const track of CHRONICLE_TRACKS) {
        const stage = this.stages[track.id] ?? 0
        if (stage >= track.stages.length) continue

        const value = this.metricValue(track.metric)
        let reached = stage
        while (reached < track.stages.length && value >= track.stages[reached].threshold) {
          reached++
        }
        if (reached === stage) continue

        this.stages[track.id] = reached
        // CpS und CpC sind gecachte Werte — eine Bahn, die einen davon anhebt,
        // wirkt sonst erst beim nächsten Kauf. Dieselbe Falle wie bei einem
        // ablaufenden Drifter-Buff.
        if (track.bonus === 'cpsMult') ratesTouched = true

        if (!announceStages) continue

        const numeral = toRoman(reached)
        // Der Wert, der WIRKT — also mit dem Rang verstärkt, genau wie ihn das
        // Panel zeigt. `bonusPct` ist dieselbe Quelle, aus der auch der
        // Effekt-Getter dieser Bahn liest; eine eigene Rechnung hier hätte im
        // Banner eine andere Zahl stehen lassen als in der Karte.
        const applied = this.bonusPct(track.bonus)
        const effect = track.effect.replace('{v}', formatPercentValue(applied))
        // Wie viel davon der Rang beisteuert. Steht in Banner UND Logzeile,
        // sonst bliebe der Verstärker eine Zahl im Panel, die im Moment seiner
        // Wirkung nirgends auftaucht.
        const share = formatPercentValue(applied - track.stages[reached - 1].value)
        const subline =
          this.rankMult > 1 ? `${effect} — ${share}% of it from ${this.rankTitle}` : effect
        if (!this.unseen.includes(track.id)) this.unseen.push(track.id)
        logChronicleStage(track.name, numeral, subline)
        useHerald().announce({
          kind: 'chronicle',
          eyebrow: 'ASTRAL CODEX',
          headline: `${track.name} ${numeral}`,
          subline,
          icon: track.icon,
          accent: CHRONICLE_HERALD_ACCENT,
        })
        logger.info('Chronicle', `${track.name} ${numeral}`, { track: track.id, stage: reached })
      }

      // Rang-Aufstieg — nach den Bahnen, weil er aus ihrer Summe folgt. Er hebt
      // JEDEN Bonus des Buches zugleich, also auch die sieben, an denen in
      // diesem Takt nichts passiert ist: `ratesTouched` gilt damit immer.
      const rankAfter = chronicleRankAt(this.unlockedStageCount)
      if (rankAfter !== rankBefore) {
        ratesTouched = true
        if (announceStages) {
          // Mit dem alten Faktor davor: „×1.15" allein sagt nicht, ob das ein
          // Sprung war. Der Vergleich macht den Aufstieg zur Zahl.
          const line =
            `Every Codex track bonus ×${rankBefore.mult.toFixed(2)}` +
            ` → ×${rankAfter.mult.toFixed(2)}`
          logChronicleRank(rankAfter.title, line)
          useHerald().announce({
            kind: 'chronicle',
            eyebrow: 'CODEX RANK',
            headline: rankAfter.title,
            subline: line,
            icon: CHRONICLE_RANK_ICON,
            accent: CHRONICLE_HERALD_ACCENT,
          })
          logger.info('Chronicle', `rank ${rankAfter.title}`, { mult: rankAfter.mult })
        }
      }

      if (ratesTouched) useShopStore().refreshRates()
    },

    /** Der Tab wurde gesehen — das Abzeichen in der Tab-Leiste erlischt. */
    markSeen(): void {
      if (this.unseen.length > 0) this.unseen = []
    },
  },
})

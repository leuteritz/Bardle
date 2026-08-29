import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useHerald } from '@/composables/ui/useHerald'
import { logMissionClaimed } from '@/config/ui/eventLog'
import { progressMetricValue } from '@/utils/game/progressMetrics'
import { gameNow } from '@/utils/game/gameClock'
import { toRoman } from '@/utils/ui/format'
import {
  MISSIONS,
  MISSION_CHAPTERS,
  MISSION_COUNT,
  MISSION_CHAPTER_STARTS,
  missionChapterIndex,
  missionRewardLabel,
} from '@/config/progression/missions'
import { MATERIALS } from '@/config/economy/materials'
import { formatNumber } from '@/config/ui/numberFormat'
import { MISSION_CHIME_REWARD_CAP_SEC, MISSION_HERALD_ACCENT } from '@/config/constants'
import type { MissionChapterDef, MissionDef, MissionView } from '@/types'
import { logger } from '@/utils/logger'

/**
 * THE WAYFINDER
 *
 * Die Leiter, an der Bard sich orientiert: immer genau EIN Ziel, und zwar das
 * nächste. Der Store hält davon nur die Position — welche Stufe offen ist und
 * wie viele beim ersten Laden still übersprungen wurden.
 *
 * ── Warum der Fortschritt ABSOLUT gemessen wird ─────────────────────────────
 * Genau umgekehrt zu den Omen, die gegen einen bei der Annahme eingefrorenen
 * Startwert rechnen. Der Grund ist der Unterschied der beiden Systeme: ein
 * Vorzeichen ist eine Aufgabe, ein Meilenstein ist eine Stelle auf dem Weg. Wer
 * sie überschritten hat, hat sie überschritten — und nur so trägt die Leiter
 * auch einen Spielstand, der älter ist als sie.
 *
 * ── Warum es hier keine Uhr gibt ────────────────────────────────────────────
 * Kein `missionNow`, kein Cooldown, keine Frist. Der Wayfinder ist das einzige
 * der drei Fortschrittssysteme ohne Zeitachse — eine Uhr auf einer Anleitung
 * wäre eine Strafe fürs Anfangen. Das macht seinen Takt zugleich billig: ein
 * Feldzugriff und ein Vergleich, solange nichts fällt.
 */
export const useMissionStore = defineStore('mission', {
  state: () => ({
    /** Position in `MISSIONS`. `>= MISSION_COUNT` heißt: Leiter durch. */
    index: 0,
    /**
     * Missionen, die der stille Nachlauf beim ersten Laden übersprungen hat.
     * Reine Anzeige: ohne sie wirkte eine Leiter, die bei Stufe 34 beginnt, wie
     * ein Fehler.
     */
    caughtUp: 0,
    /** Letzte Einlösung. `seq` steigt mit, damit die Karte dasselbe Ereignis
     *  zweimal hintereinander abspielen kann (Admin-Reset). */
    lastClaimed: { defId: '', at: 0, seq: 0 },
    // ── Lifetime counters (Bard Stats catalog) ──
    totalMissionsClaimed: 0,
  }),

  getters: {
    /** Die laufende Mission, oder `null`, wenn die Leiter durch ist. */
    activeDef(state): MissionDef | null {
      return MISSIONS[state.index] ?? null
    },

    /** Leiter vollständig gegangen. */
    isComplete(state): boolean {
      return state.index >= MISSION_COUNT
    },

    /** Das Kapitel einer Mission. */
    chapterOf(): (def: MissionDef) => MissionChapterDef {
      return (def) => MISSION_CHAPTERS[missionChapterIndex(def)] ?? MISSION_CHAPTERS[0]
    },

    /**
     * Die laufende Mission samt Stand — die EINE Quelle, aus der die Karte
     * liest. Sie berührt über `progressMetricValue` genau ein Store-Feld, nicht
     * alle fünfundzwanzig.
     */
    activeView(state): MissionView | null {
      const def = MISSIONS[state.index]
      if (!def) return null
      const chapter = MISSION_CHAPTERS[missionChapterIndex(def)] ?? MISSION_CHAPTERS[0]
      const raw = progressMetricValue(def.metric)
      const progress = Math.min(raw, def.target)
      return {
        ...def,
        color: chapter.color,
        progress,
        ratio: def.target > 0 ? progress / def.target : 0,
        rewardLabel: missionRewardLabel(def),
      }
    },

    /** Wie viele Stufen stehen — Zähler der Kopfzeile im Stats-Panel. */
    claimedCount(state): number {
      return state.index
    },
  },

  actions: {
    /**
     * Einmal pro Takt aus `gameStore.tick()`, zwischen Omen und Chronicle. Der
     * Platz ist begründet: die Leiter misst eine ABSOLUTE Zahl gegen die Zähler
     * oberhalb und muss sie auf dem Endstand dieser Sekunde sehen.
     *
     * HÖCHSTENS EINE Stufe je Takt: die Chime-Belohnung erhöht `chimesEarned`
     * und über `calculateLevel()` auch `bardLevel` — sie kann die nächste Stufe
     * selbst erfüllen. Eine Schleife liefe über halbe Kapitel, während der
     * Herold nur drei Banner behält.
     */
    tick(): void {
      const def = MISSIONS[this.index]
      if (!def) return
      if (progressMetricValue(def.metric) < def.target) return
      this._claim(def)
    },

    /** Auszahlen, weiterrücken, feiern. Ruft NIEMANDEN — die nächste Stufe
     *  gehört dem nächsten Takt, sonst wäre die Kette wieder rekursiv. */
    _claim(def: MissionDef): void {
      const line = this._applyReward(def)
      const chapter = MISSION_CHAPTERS[missionChapterIndex(def)] ?? MISSION_CHAPTERS[0]

      this.index++
      this.totalMissionsClaimed++
      this.lastClaimed = { defId: def.id, at: gameNow(), seq: this.lastClaimed.seq + 1 }

      logMissionClaimed(def.name, line, chapter.name)
      useHerald().announce({
        kind: 'mission',
        eyebrow: `WAYFINDER · ${toRoman(missionChapterIndex(def) + 1)}`,
        headline: def.name,
        subline: line,
        icon: def.icon,
        accent: MISSION_HERALD_ACCENT,
      })
      logger.info('Wayfinder', 'mission claimed', { id: def.id, chapter: chapter.id })
    },

    /**
     * Stand nachziehen, ohne etwas auszuzahlen und ohne einen einzigen Banner.
     * Läuft GENAU EINMAL: beim ersten Laden eines Spielstands, der noch keinen
     * `missions`-Block trägt.
     *
     * Ein Spielstand aus der Zeit vor dem Wayfinder erfüllt auf einen Schlag
     * drei Kapitel. Ohne diesen Lauf bekäme sein Besitzer dreißig Klicks und
     * dreißig Belohnungen für Wege, die er längst gegangen ist — und für die er,
     * hätte es die Leiter gegeben, nur einmal bezahlt worden wäre.
     */
    catchUpSilently(): void {
      let skipped = 0
      while (this.index < MISSION_COUNT) {
        const def = MISSIONS[this.index]
        if (progressMetricValue(def.metric) < def.target) break
        this.index++
        skipped++
      }
      this.caughtUp = skipped
      if (skipped > 0) logger.info('Wayfinder', 'ladder caught up', { skipped })
    },

    /**
     * Eine Mission auszahlen. Reihenfolge wie in `drifterStore._applyReward`:
     * Chimes, Meeps, Material. `_`-Präfix, weil nur `_claim()` sie ruft.
     *
     * KEIN `useShopStore().refreshRates()` am Ende, und das ist Absicht: keine
     * der drei Belohnungen berührt CpS oder CpC. Ein Meep wirkt erst, wenn er im
     * Baum ausgegeben ist, und dieser Kauf ruft selbst.
     *
     * @returns die Zeile für Zeremonie und Log — die ECHTEN Zahlen, nicht das
     *          statische Etikett der Karte.
     */
    _applyReward(def: MissionDef): string {
      const gameStore = useGameStore()
      const parts: string[] = []

      const chimes = def.reward.chimes
      if (chimes) {
        const fromCps = chimes.cpsSeconds
          ? gameStore.chimesPerSecond * Math.min(chimes.cpsSeconds, MISSION_CHIME_REWARD_CAP_SEC)
          : 0
        const fromClicks = chimes.clicks ? gameStore.chimesPerClick * chimes.clicks : 0
        const gain = Math.max(fromCps, fromClicks, chimes.flat ?? 0)
        if (gain > 0) {
          // Die VIER Felder plus calculateLevel() — jede andere Chime-Gutschrift
          // im Projekt macht genau das (gameStore.addChime, tick,
          // claimOfflineReward, drifterStore._applyReward). Wer eines auslässt,
          // verschiebt still entweder den Prestige-Fortschritt oder die
          // Level-Kurve.
          gameStore.chimes += gain
          gameStore.chimesForNextUniverse += gain
          gameStore.totalChimesEarned += gain
          gameStore.chimesEarnedForLevel += gain
          gameStore.calculateLevel()
          // Kurzform, nicht `toLocaleString()`: die Zeremonie klemmt ihre
          // Unterzeile auf EINE Zeile, und dort passt kein `+1.234.567.890`.
          parts.push(`+${formatNumber(gain)} chimes`)
        }
      }

      if (def.reward.meeps) {
        gameStore.grantMeeps(def.reward.meeps)
        parts.push(`+${def.reward.meeps} meep${def.reward.meeps === 1 ? '' : 's'}`)
      }

      for (const mat of def.reward.materials ?? []) {
        // addMaterial statt tryDropMaterial: eine Missionsbelohnung ist kein Wurf.
        useInventoryStore().addMaterial(mat.id, 'mission', mat.qty)
        const name = MATERIALS.find((m) => m.id === mat.id)?.name ?? mat.id
        parts.push(`+${mat.qty} ${name}`)
      }

      return parts.join(' · ')
    },

    /** Admin: die laufende Stufe sofort einlösen, erfüllt oder nicht. */
    adminClaimNow(): void {
      const def = MISSIONS[this.index]
      if (def) this._claim(def)
    },

    /** Admin: an den Anfang eines Kapitels springen, ohne auszuzahlen. */
    adminJumpToChapter(chapterId: string): void {
      const start = MISSION_CHAPTER_STARTS[chapterId]
      if (start === undefined || start < 0) return
      this.index = start
    },

    /** Admin: die Leiter auf Anfang. `caughtUp` fällt mit — sonst behauptet das
     *  Stats-Panel weiter, es habe etwas übersprungen. Die Leiter läuft sich
     *  danach selbst ab, eine Stufe je Takt. */
    adminResetLadder(): void {
      this.index = 0
      this.caughtUp = 0
    },

    /**
     * Admin: die Leiter still auf Vollstand — kein Banner, keine Auszahlung.
     * Dasselbe Muster wie der Astral Codex im selben Knopf, der seine Stufen
     * direkt setzt statt über `evaluate(true)`.
     *
     * `catchUpSilently()` taugt dafür nicht: sie bricht beim ersten
     * unerfüllten Ziel ab, und das ist gleich Stufe eins („zehn Klicks"), die
     * kein Admin-Knopf erfüllt. `caughtUp` bleibt 0 — übersprungen wurde
     * nichts, gesetzt wurde; und weil sie dort ABSOLUT geschrieben wird,
     * schriebe ein zweiter Druck sie ohnehin auf null zurück.
     */
    adminCompleteLadder(): void {
      this.totalMissionsClaimed = Math.max(this.totalMissionsClaimed, MISSION_COUNT)
      this.index = MISSION_COUNT
      this.caughtUp = 0
    },
  },
})

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
import {
  MISSION_PREVIEW_COUNT,
  MISSION_CHIME_REWARD_CAP_SEC,
  MISSION_HERALD_ACCENT,
} from '@/config/constants'
import type { HeraldDelta, MissionChapterDef, MissionDef, MissionPreview, MissionView } from '@/types'
import { logger } from '@/utils/logger'

/**
 * THE WAYFINDER
 *
 * Die Leiter, an der Bard sich orientiert: immer genau EIN Ziel, und zwar das
 * nächste. Der Store hält davon nur die Position — welche Stufe offen ist, ob
 * sie erfüllt darauf wartet, abgeholt zu werden, und wie viele beim ersten
 * Laden still übersprungen wurden.
 *
 * ── Warum der Fortschritt ABSOLUT gemessen wird ─────────────────────────────
 * Genau umgekehrt zu den Omen, die gegen einen bei der Annahme eingefrorenen
 * Startwert rechnen. Der Grund ist der Unterschied der beiden Systeme: ein
 * Vorzeichen ist eine Aufgabe, ein Meilenstein ist eine Stelle auf dem Weg. Wer
 * sie überschritten hat, hat sie überschritten — und nur so trägt die Leiter
 * auch einen Spielstand, der älter ist als sie.
 *
 * ── Warum `claimReady` im State steht und nicht abgeleitet ist ──────────────
 * Zwei Metriken der Leiter sind lauf-lokal (`bardLevel`, `shopBuildingLevels`)
 * und fallen beim Prestige auf null. Ein abgeleitetes „erfüllt" nähme dem
 * Spieler die Belohnung unter dem Cursor wieder weg. Die Latche fällt nur durch
 * `claim()` oder eine Admin-Aktion.
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
    /** Erfüllt und wartet auf den Klick — eine Latche, siehe Kopf. */
    claimReady: false,
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
        ordinal: state.index + 1,
        chapterName: chapter.name,
        chapterNumeral: toRoman(missionChapterIndex(def) + 1),
        color: chapter.color,
        progress,
        ratio: def.target > 0 ? progress / def.target : 0,
        claimReady: state.claimReady,
        rewardLabel: missionRewardLabel(def),
      }
    },

    /** Die nächsten Stufen als Vorschauzeilen — am Ende der Leiter weniger. */
    upcomingViews(state): MissionPreview[] {
      return MISSIONS.slice(state.index + 1, state.index + 1 + MISSION_PREVIEW_COUNT).map((def) => ({
        id: def.id,
        name: def.name,
        icon: def.icon,
        progress: Math.min(progressMetricValue(def.metric), def.target),
        target: def.target,
        unit: def.unit,
      }))
    },

    /** Wie viele Stufen stehen — Zähler der Kopfzeile im Stats-Panel. */
    claimedCount(state): number {
      return state.index
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus `gameStore.tick()`, zwischen Omen und Chronicle.
     * Der Platz ist begründet: die Leiter misst eine ABSOLUTE Zahl gegen die
     * Zähler oberhalb und muss sie auf dem Endstand dieser Sekunde sehen.
     */
    tick(): void {
      if (this.claimReady || this.isComplete) return
      const def = MISSIONS[this.index]
      if (!def) return
      if (progressMetricValue(def.metric) < def.target) return

      this.claimReady = true
      const chapter = MISSION_CHAPTERS[missionChapterIndex(def)] ?? MISSION_CHAPTERS[0]
      useHerald().announce({
        kind: 'mission',
        eyebrow: `WAYFINDER · ${toRoman(missionChapterIndex(def) + 1)}`,
        headline: def.name,
        subline: 'Ready to claim',
        icon: def.icon,
        accent: MISSION_HERALD_ACCENT,
      })
      logger.info('Wayfinder', 'mission ready', { id: def.id, chapter: chapter.id })
    },

    /**
     * Die Karte wurde geklickt: auszahlen, weiterrücken, sofort neu prüfen.
     *
     * Das erneute `tick()` am Ende ist kein Beiwerk — eine Stufe kann bereits
     * erfüllt sein, wenn die vorige fällt (wer vierzig Bosse gefällt hat, hat
     * auch fünfzehn). Der Spieler bekommt sie dann als nächsten Klick, nicht
     * geschenkt: jede Einlösung ist ihr eigener Moment.
     */
    claim(): boolean {
      if (!this.claimReady) return false
      const def = MISSIONS[this.index]
      if (!def) {
        this.claimReady = false
        return false
      }

      const paid = this._applyReward(def)
      const chapter = MISSION_CHAPTERS[missionChapterIndex(def)] ?? MISSION_CHAPTERS[0]

      this.index++
      this.claimReady = false
      this.totalMissionsClaimed++
      this.lastClaimed = { defId: def.id, at: gameNow(), seq: this.lastClaimed.seq + 1 }

      logMissionClaimed(def.name, paid.line, chapter.name)
      useHerald().announceReceipt({
        kind: 'unlock',
        // Namensraum mit SCHRÄGSTRICH, nie mit Doppelpunkt — ein Doppelpunkt
        // hat die Form eines Iconify-Namens und wird vom Icon-Sweep als Verweis
        // auf ein unbekanntes Set gelesen.
        mergeKey: 'wayfinder/claim',
        eyebrow: `WAYFINDER · ${toRoman(missionChapterIndex(def) + 1)}`,
        headline: def.name,
        subline: paid.line,
        icon: def.icon,
        accent: MISSION_HERALD_ACCENT,
        delta: paid.delta,
      })

      this.tick()
      return true
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
      this.claimReady = false
      this.caughtUp = skipped
      if (skipped > 0) logger.info('Wayfinder', 'ladder caught up', { skipped })
    },

    /**
     * Eine Mission auszahlen. Reihenfolge wie in `drifterStore._applyReward`:
     * Chimes, Meeps, Material. `_`-Präfix, weil nur `claim()` sie ruft.
     *
     * KEIN `useShopStore().refreshRates()` am Ende, und das ist Absicht: keine
     * der drei Belohnungen berührt CpS oder CpC. Ein Meep wirkt erst, wenn er im
     * Baum ausgegeben ist, und dieser Kauf ruft selbst.
     *
     * @returns die Zeile für Quittung und Log samt Delta — die ECHTEN Zahlen,
     *          nicht das statische Etikett der Karte.
     */
    _applyReward(def: MissionDef): { line: string; delta?: HeraldDelta } {
      const gameStore = useGameStore()
      const parts: string[] = []
      let delta: HeraldDelta | undefined

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
          parts.push(`+${Math.round(gain).toLocaleString()} chimes`)
          delta = { value: Math.round(gain), unit: 'chimes' }
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

      return { line: parts.join(' · '), delta }
    },

    /** Admin: die laufende Mission sofort einlösbar machen. */
    adminMakeClaimable(): void {
      if (!this.isComplete) this.claimReady = true
    },

    /** Admin: an den Anfang eines Kapitels springen, ohne auszuzahlen. */
    adminJumpToChapter(chapterId: string): void {
      const start = MISSION_CHAPTER_STARTS[chapterId]
      if (start === undefined || start < 0) return
      this.index = start
      this.claimReady = false
    },

    /** Admin: die Leiter auf Anfang. `caughtUp` fällt mit — sonst behauptet das
     *  Stats-Panel weiter, es habe etwas übersprungen. */
    adminResetLadder(): void {
      this.index = 0
      this.claimReady = false
      this.caughtUp = 0
    },
  },
})

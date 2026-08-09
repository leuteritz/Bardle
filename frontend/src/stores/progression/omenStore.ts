import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useHerald } from '@/composables/ui/useHerald'
import { logOmenCompleted } from '@/config/ui/eventLog'
import { omenIcon } from '@/utils/game/rolledIcons'
import { pickDistinctIcons } from '@/config/ui/iconPools'
import { OMENS, getOmen, omenRewardLine } from '@/config/progression/omens'
import {
  OMEN_OFFER_SIZE,
  OMEN_OFFER_DELAY_SEC,
  OMEN_FIRST_OFFER_DELAY_SEC,
  OMEN_UNLOCK_LEVEL,
  OMEN_SWIFT_DURATION_MULT,
  OMEN_MIN_ELIGIBLE_FOR_FILTER,
  OMEN_HERALD_ACCENT,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'
import type {
  ActiveOmen,
  OmenActiveBuff,
  OmenDef,
  OmenMetricId,
  OmenOfferCard,
  OmenView,
} from '@/types'
import { logger } from '@/utils/logger'

/**
 * OMENS OF THE CARETAKER
 *
 * Der Kosmos legt drei Vorzeichen vor, Bard folgt einem. Das System besetzt die
 * Zeitskala zwischen Klick und Chronicle: ein selbstgewähltes Ziel, das über
 * Minuten läuft und danach in ein ANDERES System auszahlt als das, in dem es
 * verdient wurde.
 *
 * ── Warum der Fortschritt eine Differenz ist ────────────────────────────────
 * Bei der Annahme wird der aktuelle Stand der Metrik eingefroren; der
 * Fortschritt ist alles, was seitdem dazugekommen ist. Damit braucht das System
 * KEINEN eigenen Zähler — dieselbe Entscheidung wie bei der Chronicle und aus
 * demselben Grund: ein zweiter, parallel gepflegter Zähler driftet früher oder
 * später von seinem Original ab, und niemand merkt es, weil beide plausibel
 * aussehen. Jede Metrik wird aus dem Store gelesen, dem sie gehört.
 *
 * ── Warum nichts verfällt ───────────────────────────────────────────────────
 * Die Frist entscheidet nur über den Eilbonus auf die Buff-DAUER, nie über den
 * Buff selbst. Ein Idle-Spiel läuft über Nacht weiter; ein Ziel, das den Spieler
 * dafür bestraft, das Fenster zuzumachen, arbeitet gegen die eigene Gattung.
 */
export const useOmenStore = defineStore('omen', {
  state: () => ({
    /** IDs der drei Karten, die gerade zur Wahl stehen. Leer = kein Angebot. */
    offer: [] as string[],
    /**
     * Wie viele Angebote schon ausgelegen haben. Dient allein als Seed für die
     * ausgewürfelten Icons (`omenIcon`) — dieselbe Karte trägt bei jedem neuen
     * Angebot ein anderes Motiv aus der Familie ihrer Domäne.
     */
    offerSeq: 0,
    /** Das Vorzeichen, dem Bard folgt. */
    active: null as ActiveOmen | null,
    /** Laufende Belohnungsbuffs. Mehrere möglich: ein Buff läuft Minuten, in
     *  denen das nächste Vorzeichen längst erfüllt sein kann. */
    buffs: [] as OmenActiveBuff[],
    /** Sekunden bis zum nächsten Angebot. Zählt nur, solange keins steht. */
    offerCooldownSec: OMEN_FIRST_OFFER_DELAY_SEC,
    /**
     * Reaktive Uhr für die Buff- und Fristgetter. Ein rohes `Date.now()` in
     * einem Getter würde nie neu ausgewertet — dieselbe Krücke wie
     * `drifterStore.drifterNow`, im Sekundentakt vom Spiel-Tick gestellt.
     */
    omenNow: Date.now(),
    /** Letzte Erfüllung — treibt Banner und Karte, `seq` erlaubt dasselbe
     *  Vorzeichen zweimal hintereinander. */
    lastCompleted: { defId: '', at: 0, swift: false, seq: 0 },
    // ── Lifetime counters (Bard Stats catalog) ──
    totalOmensCompleted: 0,
    totalOmensSwift: 0,
  }),

  getters: {
    /** Buffs, die gerade wirklich laufen. */
    liveBuffs(state): OmenActiveBuff[] {
      return state.buffs.filter((b) => b.expiresAt > state.omenNow)
    },

    /**
     * Der Wert einer Metrik. Bewusst eine zurückgegebene Funktion statt eines
     * gecachten Getters: als Getter hinge dieser eine Wert an Feldern aus neun
     * Stores und würde bei jeder ihrer Änderungen neu rechnen — auch wenn kein
     * Vorzeichen offen ist und niemand hinsieht.
     */
    metricValue(): (metric: OmenMetricId) => number {
      return (metric) => {
        switch (metric) {
          case 'chimesEarned':
            return useGameStore().totalChimesEarned
          case 'clicks':
            return useGameStore().totalClicks
          case 'meepsEarned':
            return useGameStore().totalMeepsEarned
          case 'driftersCollected':
            return useDrifterStore().totalDriftersCollected
          case 'bossesDefeated':
            return usePlanetBossStore().totalBossesDefeated
          case 'starsRescued':
            return useGalaxyStore().totalStarsRescued
          case 'battleWins':
            return useBattleStore().totalWins
          case 'championKills':
            return useBattleStore().totalKills
          case 'championLevelsGained':
            return useChampionLevelStore().totalLevelsBought
          case 'materialsCollected':
            return useInventoryStore().totalMaterialsCollected
          case 'expeditionsCompleted':
            return useExpeditionStore().totalExpeditionsSucceeded
        }
      }
    },

    /**
     * Die Karten des Angebots samt ihrem für DIESES Angebot gezogenen Glyph.
     * `pickDistinctIcons` sorgt dafür, dass keine zwei der drei Karten dasselbe
     * Motiv tragen — zwei Vorzeichen derselben Domäne ziehen aus demselben Pool.
     */
    offerCards(state): OmenOfferCard[] {
      const defs = state.offer.map((id) => getOmen(id)).filter((d): d is OmenDef => d !== undefined)
      const icons = pickDistinctIcons(
        defs.map((d) => ({ pool: d.iconPool, seed: `${d.id}#${state.offerSeq}` })),
      )
      return defs.map((def, i) => ({ ...def, icon: icons[i] }))
    },

    hasOffer(state): boolean {
      return state.offer.length > 0 && state.active === null
    },

    /**
     * Das laufende Vorzeichen samt Stand — die einzige Quelle, aus der die
     * HUD-Karte liest. Hängt nur an der EINEN Metrik des aktiven Vorzeichens:
     * `metricValue` ist eine Funktion, also wird hier genau ein Store-Feld
     * berührt, nicht alle neun.
     */
    activeView(state): OmenView | null {
      if (!state.active) return null
      const def = getOmen(state.active.defId)
      if (!def) return null
      const target = state.active.target
      const raw = this.metricValue(def.metric) - state.active.startValue
      const progress = Math.min(target, Math.max(0, raw))
      const msLeft = state.active.deadlineAt - state.omenNow
      return {
        ...def,
        icon: state.active.icon ?? omenIcon(def.id, 0),
        target,
        progress,
        ratio: target > 0 ? Math.min(1, progress / target) : 1,
        secondsLeft: Math.max(0, Math.ceil(msLeft / 1000)),
        swiftAvailable: msLeft > 0,
      }
    },

    // ── Effect getters (one per integration point) ────────────────────────────
    // Gleiche Bauart wie im drifterStore, und bewusst dieselben fünf Achsen:
    // damit reiht sich ein Omen-Buff an genau den Stellen ein, die es schon
    // gibt, statt fünf neue aufzumachen.

    /** Multiplier on total chimes per second. */
    cpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpsMult ?? 1), 1)
    },
    /** Multiplier on total chimes per click. */
    cpcMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.cpcMult ?? 1), 1)
    },
    /** Multiplier on orbiting champion DPS and turret volleys. */
    combatDpsMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.combatDpsMult ?? 1), 1)
    },
    /** Multiplier on the material drop chance. */
    materialDropMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.materialDropMult ?? 1), 1)
    },
    /** Multiplier on champion XP gains. */
    xpMult(): number {
      return this.liveBuffs.reduce((m, b) => m * (b.effects.xpMult ?? 1), 1)
    },
  },

  actions: {
    /**
     * Einmal pro Sekunde aus `gameStore.tick()`, unmittelbar vor der Chronicle:
     * Uhr stellen, abgelaufene Buffs räumen, Fortschritt prüfen, sonst die Uhr
     * bis zum nächsten Angebot herunterzählen.
     */
    tick(): void {
      this.omenNow = Date.now()

      const before = this.buffs.length
      this.buffs = this.buffs.filter((b) => b.expiresAt > this.omenNow)
      // Ein gerade abgelaufener Buff kann einen CPS/CPC-Faktor gehalten haben —
      // beide sind gecachte Werte und wirken sonst bis zum nächsten Kauf weiter.
      if (this.buffs.length !== before) useShopStore().refreshRates()

      if (useGameStore().level < OMEN_UNLOCK_LEVEL) return

      if (this.active) {
        this.checkCompletion()
        return
      }
      if (this.offer.length > 0) return

      this.offerCooldownSec -= GAME_TICK_INTERVAL_MS / 1000
      if (this.offerCooldownSec <= 0) this.rollOffer()
    },

    /**
     * Ein neues Trio auslegen — je eine Karte aus DREI verschiedenen Domänen.
     * Ohne diese Spreizung stünde regelmäßig dreimal dieselbe Beschäftigung zur
     * Wahl, und eine Wahl zwischen drei Varianten desselben ist keine.
     */
    rollOffer(): void {
      const eligible = OMENS.filter((def) => this.isEligible(def))
      // Zu wenige Systeme offen: lieber aus dem ganzen Katalog ziehen als ein
      // leeres Angebot zeigen. Ein Ziel, das noch nicht erreichbar ist, kostet
      // den Spieler nichts — es läuft ohne Frist weiter, bis das System aufgeht.
      const pool = eligible.length >= OMEN_MIN_ELIGIBLE_FOR_FILTER ? eligible : [...OMENS]

      const picked: OmenDef[] = []
      const usedDomains = new Set<string>()
      // Zwei Durchgänge: erst je Domäne höchstens einer, dann — falls das nicht
      // reicht, weil zu wenige Domänen offen sind — aufgefüllt ohne die Regel.
      for (const pass of [0, 1]) {
        const remaining = pool.filter((d) => !picked.includes(d))
        for (const def of shuffled(remaining)) {
          if (picked.length >= OMEN_OFFER_SIZE) break
          if (pass === 0 && usedDomains.has(def.domain)) continue
          picked.push(def)
          usedDomains.add(def.domain)
        }
        if (picked.length >= OMEN_OFFER_SIZE) break
      }

      this.offer = picked.map((d) => d.id)
      // Zählt jedes ausgelegte Angebot hoch — er ist der Seed der ausgewürfelten
      // Icons, damit dieselben drei Vorzeichen beim nächsten Mal anders aussehen.
      this.offerSeq++
      logger.info('Omen', `Offer drawn`, { omens: this.offer })
    },

    /**
     * Ob ein Vorzeichen überhaupt sinnvoll angeboten werden kann. Geprüft wird
     * nur, ob das Zielsystem AUFGESCHLOSSEN ist — nicht, wie schnell der Spieler
     * dort vorankommt. Eine Schätzung darüber wäre bei jedem Spielstil falsch.
     */
    isEligible(def: OmenDef): boolean {
      switch (def.metric) {
        case 'battleWins':
        case 'championKills':
          // Ein Kampf braucht ein aufgestelltes Team, nicht nur einen Kader.
          return useBattleStore().headerSlots.some((s) => s !== null)
        case 'championLevelsGained':
          return useBattleStore().ownedChampions.length > 1
        case 'bossesDefeated':
          return usePlanetShopStore().purchasedSlots.length > 0
        case 'expeditionsCompleted':
          return useExpeditionStore().totalExpeditionsStarted > 0
        default:
          // Chimes, Klicks, Meeps, Drifter, Sterne — vom ersten Takt an offen.
          return true
      }
    },

    /**
     * Eine Karte annehmen. Friert Startwert und Zielmenge ein: beides darf sich
     * nicht mehr bewegen, während der Spieler daran arbeitet — ein mitwachsendes
     * Ziel schöbe sich mit jedem Ausbau der Produktion selbst vor sich her.
     */
    accept(defId: string): boolean {
      if (this.active || !this.offer.includes(defId)) return false
      const def = getOmen(defId)
      if (!def) return false

      const now = Date.now()
      this.active = {
        defId,
        startValue: this.metricValue(def.metric),
        target: this.resolveTarget(def),
        acceptedAt: now,
        deadlineAt: now + def.deadlineSec * 1000,
        // Das Glyph wandert mit: die angenommene Karte behält, was im Angebot
        // stand — bis hinauf zum Erfüllt-Banner.
        icon: this.offerCards.find((c) => c.id === defId)?.icon,
      }
      this.offer = []
      this.omenNow = now
      logger.info('Omen', `Accepted ${def.name}`, { target: this.active.target })
      return true
    },

    /**
     * Die Zielmenge dieses Laufs. Für fast alle Vorzeichen ist das die Zahl aus
     * der Definition; nur wo `targetFromCpsSeconds` steht, kommt sie aus der
     * laufenden Produktion — mit der Definitionszahl als Boden, damit ein
     * frischer Spielstand ohne Produktion kein Ziel von null bekommt.
     */
    resolveTarget(def: OmenDef): number {
      if (!def.targetFromCpsSeconds) return def.target
      const fromCps = useGameStore().chimesPerSecond * def.targetFromCpsSeconds
      return Math.max(def.target, Math.ceil(fromCps))
    },

    /**
     * Steht das laufende Vorzeichen? Läuft einmal pro Sekunde.
     *
     * Fängt hier auch den Fall ab, dass die Metrik GEFALLEN ist: ein Prestige
     * setzt manche Zähler zurück, und ohne das Nachziehen bliebe der Startwert
     * über dem aktuellen Stand — das Ziel wäre für den Rest des Laufs
     * unerreichbar, ohne dass irgendwo etwas kaputt aussieht.
     */
    checkCompletion(): void {
      if (!this.active) return
      const def = getOmen(this.active.defId)
      if (!def) {
        // Definition verschwunden (Katalog geändert, alter Spielstand): das
        // Vorzeichen stillschweigend fallen lassen statt ewig offen zu halten.
        this.active = null
        this.offerCooldownSec = OMEN_OFFER_DELAY_SEC
        return
      }

      const current = this.metricValue(def.metric)
      if (current < this.active.startValue) {
        this.active.startValue = current
        return
      }
      if (current - this.active.startValue < this.active.target) return

      this.complete(def)
    },

    /** Auszahlen: Buff starten, melden, Uhr fürs nächste Trio stellen. */
    complete(def: OmenDef): void {
      if (!this.active) return
      const swift = Date.now() < this.active.deadlineAt
      // Vor dem Leeren merken: das Banner soll das Glyph der erfüllten Karte
      // tragen, nicht ein frisch gezogenes.
      const icon = this.active.icon ?? omenIcon(def.id, 0)

      this.applyBuff(def, swift)

      this.totalOmensCompleted++
      if (swift) this.totalOmensSwift++
      this.lastCompleted = {
        defId: def.id,
        at: Date.now(),
        swift,
        seq: this.lastCompleted.seq + 1,
      }
      this.active = null
      this.offerCooldownSec = OMEN_OFFER_DELAY_SEC

      const minutes = Math.round(
        (def.reward.durationSec * (swift ? OMEN_SWIFT_DURATION_MULT : 1)) / 60,
      )
      const effectLine = `${omenRewardLine(def)} for ${minutes} min`
      logOmenCompleted(def.name, effectLine, swift)
      useHerald().announce({
        kind: 'omen',
        eyebrow: swift ? 'SWIFT OMEN FULFILLED' : 'OMEN FULFILLED',
        headline: def.name,
        subline: effectLine,
        icon,
        accent: OMEN_HERALD_ACCENT,
      })
      logger.info('Omen', `Fulfilled ${def.name}`, { swift })
    },

    /**
     * Den Belohnungsbuff starten. Dasselbe Vorzeichen zweimal erfüllt setzt
     * seine Uhr zurück, statt denselben Multiplikator ein zweites Mal zu
     * stapeln; verschiedene Vorzeichen laufen nebeneinander.
     */
    applyBuff(def: OmenDef, swift: boolean): void {
      this.buffs = this.buffs.filter((b) => b.sourceId !== def.id)
      // Die Dauer wird EINMAL berechnet und mitgeschrieben, nicht beim Lesen
      // angewandt: die Leiste zählt gegen `durationMs`, und ein Eilbonus, der
      // erst beim Anzeigen dazukäme, verschöbe die Anzeige gegen das Ende.
      const durationMs = Math.round(
        def.reward.durationSec * 1000 * (swift ? OMEN_SWIFT_DURATION_MULT : 1),
      )
      this.buffs.push({
        sourceId: def.id,
        expiresAt: Date.now() + durationMs,
        durationMs,
        swift,
        // Das Glyph der erfüllten Karte wandert in den Buff-Chip: der Spieler
        // soll dort dasselbe Zeichen wiedererkennen, dem er eben gefolgt ist.
        icon: this.active?.icon ?? omenIcon(def.id, 0),
        effects: { ...def.reward.effects },
      })
      this.omenNow = Date.now()
      useShopStore().refreshRates()
    },

    /** Das laufende Vorzeichen aufgeben — das nächste Trio kommt nach der
     *  üblichen Pause. Kein Verlust außer der investierten Zeit. */
    abandon(): void {
      if (!this.active) return
      logger.info('Omen', `Abandoned ${this.active.defId}`)
      this.active = null
      this.offerCooldownSec = OMEN_OFFER_DELAY_SEC
    },

    /** Admin/Testing: sofort ein Angebot auslegen. */
    forceOffer(): void {
      this.active = null
      this.rollOffer()
    },

    clearAll(): void {
      this.offer = []
      this.active = null
      this.buffs = []
      this.offerCooldownSec = OMEN_FIRST_OFFER_DELAY_SEC
    },
  },
})

/** Kopie in zufälliger Reihenfolge (Fisher-Yates) — die Ziehung darf die
 *  Katalogreihenfolge nicht durchscheinen lassen. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
